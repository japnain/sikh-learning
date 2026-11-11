-- Run with a database administrator connection / Supabase SQL tool.
-- Uses generated disposable auth users, never existing accounts. Every write
-- is inside one transaction that ends in ROLLBACK. Any failed assertion aborts
-- the transaction. No email is sent and no production record is modified.
begin;
set local statement_timeout = '15s';
set local lock_timeout = '3s';

create temporary table naamras_backend_qa_users (
  label text primary key,
  user_id uuid not null default gen_random_uuid()
) on commit drop;
insert into naamras_backend_qa_users (label) values ('a'), ('b');
insert into auth.users (id, aud, role, email, created_at, updated_at)
select user_id, 'authenticated', 'authenticated',
  'naamras-backend-qa-' || user_id || '@example.invalid', now(), now()
from naamras_backend_qa_users;

create temporary table naamras_backend_qa_results (
  test text primary key,
  passed boolean not null
) on commit drop;
grant select on naamras_backend_qa_users to authenticated, anon;
grant select, insert on naamras_backend_qa_results to authenticated, anon;

set local role authenticated;
do $$
declare
  owner_id uuid := (select user_id from naamras_backend_qa_users where label = 'a');
  t0 timestamptz := '2026-11-11T00:00:00Z';
  event_id text := 'qa-event-' || owner_id;
  records jsonb;
  events jsonb;
  result jsonb;
  changed jsonb;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  if auth.uid() is distinct from owner_id then raise exception 'QA auth context failed'; end if;

  select jsonb_agg(jsonb_build_object(
    'record_type', record_type, 'natural_key', natural_key,
    'record_id', natural_key, 'device_id', 'qa-device-a',
    'client_updated_at', t0, 'base_updated_at', null, 'deleted_at', null,
    'record', payload || jsonb_build_object(
      'id', natural_key, 'deviceId', 'qa-device-a', 'clientUpdatedAt', t0,
      'baseUpdatedAt', null, 'deletedAt', null
    )
  )) into records
  from (values
    ('profile', 'profile', '{"locale":"en","reader":{},"onboarding":{}}'::jsonb),
    ('saved-item', 'bookmark:G:1:verse:1', '{"kind":"bookmark","naturalKey":"bookmark:G:1:verse:1","payload":{"title":"QA bookmark"}}'::jsonb),
    ('vocab-entry', 'qa-word', '{"naturalKey":"qa-word","payload":{"word":"QA word"}}'::jsonb),
    ('learning-progress', 'nitnem-state', '{"scope":"nitnem-state","payload":{"completed":[]}}'::jsonb)
  ) as fixture(record_type, natural_key, payload);
  events := jsonb_build_array(jsonb_build_object(
    'id', event_id, 'deviceId', 'qa-device-a', 'eventType', 'qa-backend-check',
    'occurredAt', t0, 'clientUpdatedAt', t0, 'deletedAt', null, 'payload', '{}'::jsonb
  ));

  result := public.merge_naamras_cloud_snapshot_v3(records, events);
  if result->>'version' <> '3' or result->>'complete' <> 'true'
    or jsonb_array_length(result->'records') <> 4
    or not (result->'acknowledgedEventIds' @> jsonb_build_array(event_id))
    or (select count(*) from public.naamras_sync_records where user_id = owner_id) <> 4
    then raise exception 'QA initial merge failed'; end if;
  insert into naamras_backend_qa_results values ('v3 merge persists four record types and acknowledges events', true);

  result := public.merge_naamras_cloud_snapshot_v3(records, events);
  if (select count(*) from public.activity_events where id = event_id) <> 1
    or jsonb_array_length(result->'acknowledgedEventIds') <> 1
    then raise exception 'QA event replay idempotency failed'; end if;
  insert into naamras_backend_qa_results values ('event replay is idempotent', true);

  result := public.merge_naamras_cloud_snapshot_v3('[]'::jsonb, '[]'::jsonb);
  if jsonb_array_length(result->'records') <> 4
    or exists (select 1 from jsonb_array_elements(result->'records') r where r->>'userId' <> owner_id::text)
    then raise exception 'QA restore failed'; end if;
  insert into naamras_backend_qa_results values ('empty-device restore returns only the owner snapshot', true);

  select r into changed from jsonb_array_elements(records) r where r->>'record_type' = 'saved-item';
  changed := changed || jsonb_build_object('base_updated_at', t0, 'client_updated_at', t0 + interval '2 minutes');
  changed := jsonb_set(changed, '{record,payload,title}', '"QA edited bookmark"'::jsonb);
  perform public.merge_naamras_cloud_snapshot_v3(jsonb_build_array(changed), '[]'::jsonb);
  if (select record_payload #>> '{payload,title}' from public.naamras_sync_records where user_id=owner_id and record_type='saved-item') <> 'QA edited bookmark'
    then raise exception 'QA owner update failed'; end if;
  insert into naamras_backend_qa_results values ('owner can update a previously synced record', true);

  changed := changed || jsonb_build_object('client_updated_at', t0 + interval '1 minute');
  changed := jsonb_set(changed, '{record,payload,title}', '"QA stale overwrite"'::jsonb);
  perform public.merge_naamras_cloud_snapshot_v3(jsonb_build_array(changed), '[]'::jsonb);
  if (select record_payload #>> '{payload,title}' from public.naamras_sync_records where user_id=owner_id and record_type='saved-item') <> 'QA edited bookmark'
    then raise exception 'QA stale update overwrote current state'; end if;
  insert into naamras_backend_qa_results values ('older offline updates do not overwrite newer state', true);

  changed := changed || jsonb_build_object('client_updated_at', t0 + interval '3 minutes', 'deleted_at', t0 + interval '3 minutes');
  changed := jsonb_set(changed, '{record,payload}', 'null'::jsonb);
  result := public.merge_naamras_cloud_snapshot_v3(jsonb_build_array(changed), '[]'::jsonb);
  if not exists (select 1 from jsonb_array_elements(result->'records') r where r->>'recordType'='saved-item' and r->>'deletedAt' is not null and r->'payload'='null'::jsonb)
    then raise exception 'QA tombstone propagation failed'; end if;
  insert into naamras_backend_qa_results values ('deletion tombstones survive snapshot restore', true);
end;
$$;

do $$
declare
  owner_id uuid := (select user_id from naamras_backend_qa_users where label='a');
  other_id uuid := (select user_id from naamras_backend_qa_users where label='b');
  affected integer;
  denied boolean := false;
  result jsonb;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('sub', other_id, 'role', 'authenticated')::text, true);
  if exists (select 1 from public.naamras_sync_records where user_id=owner_id)
    or exists (select 1 from public.activity_events where user_id=owner_id)
    then raise exception 'QA cross-user data exposed'; end if;
  update public.naamras_sync_records set device_id='unauthorized' where user_id=owner_id;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'QA cross-user update allowed'; end if;
  begin
    insert into public.naamras_sync_records (user_id, record_type, natural_key, record_id, device_id, record_payload, client_updated_at)
    values (owner_id, 'profile', 'cross-user-insert', 'qa', 'qa', '{}'::jsonb, now());
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'QA cross-user insert allowed'; end if;
  insert into naamras_backend_qa_results values ('RLS blocks cross-user reads, updates and inserts', true);

  result := public.merge_naamras_cloud_snapshot_v3(jsonb_build_array(jsonb_build_object(
    'record_type','profile', 'natural_key','profile', 'record_id','profile',
    'device_id','qa-device-b', 'client_updated_at',now(), 'base_updated_at',null,
    'deleted_at',null, 'record',jsonb_build_object('locale','en','userId',owner_id)
  )), '[]'::jsonb);
  if jsonb_array_length(result->'records') <> 1 or result #>> '{records,0,userId}' <> other_id::text
    then raise exception 'QA RPC caller ownership failed'; end if;
  insert into naamras_backend_qa_results values ('RPC derives ownership from auth, ignoring payload userId', true);

  denied := false;
  begin
    update public.naamras_sync_records set user_id=owner_id where user_id=other_id;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'QA row ownership transfer allowed'; end if;
  insert into naamras_backend_qa_results values ('RLS blocks transferring owned rows to another user', true);
end;
$$;

set local role anon;
do $$
declare
  denied boolean := false;
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin
    perform public.merge_naamras_cloud_snapshot_v3('[]'::jsonb, '[]'::jsonb);
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'QA anonymous merge allowed'; end if;
  denied := false;
  begin
    perform 1 from public.naamras_sync_records limit 1;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'QA anonymous table read allowed'; end if;
  insert into naamras_backend_qa_results values ('anonymous role cannot call merge or read account records', true);
end;
$$;

reset role;
do $$
declare
  owner_id uuid := (select user_id from naamras_backend_qa_users where label='a');
  other_id uuid := (select user_id from naamras_backend_qa_users where label='b');
  table_name text;
  remaining integer;
begin
  insert into public.profiles(user_id) values (owner_id);
  insert into public.reader_preferences(user_id) values (owner_id);
  insert into public.bookmarks(id,user_id,device_id,reading_id,title,source)
    values ('qa-bookmark-'||owner_id,owner_id,'qa','qa','QA','G');
  insert into public.vocab_entries(id,user_id,device_id,natural_key)
    values ('qa-vocab-'||owner_id,owner_id,'qa','qa');
  insert into public.learning_state(user_id,device_id) values (owner_id,'qa');
  insert into public.reading_progress(id,user_id,device_id,reading_id)
    values ('qa-progress-'||owner_id,owner_id,'qa','qa');
  delete from auth.users where id=owner_id;
  foreach table_name in array array['profiles','reader_preferences','bookmarks','vocab_entries','learning_state','reading_progress','activity_events','naamras_sync_records'] loop
    execute format('select count(*) from public.%I where user_id=$1', table_name) into remaining using owner_id;
    if remaining <> 0 then raise exception 'QA cascade failed for %', table_name; end if;
  end loop;
  if not exists (select 1 from auth.users where id=other_id)
    or (select count(*) from public.naamras_sync_records where user_id=other_id) <> 1
    then raise exception 'QA deleting owner affected another account'; end if;
  insert into naamras_backend_qa_results values ('account deletion cascades all eight app tables and preserves other users', true);
end;
$$;

select test, passed from naamras_backend_qa_results order by test;
rollback;
