-- NaamRas cloud snapshot v2
--
-- Apply after 001_naamras_native_core.sql. The legacy domain tables remain in
-- place for compatibility, while v2 synchronization uses one granular record
-- table so preferences, saved items, vocabulary, and JSON progress payloads
-- share the same conflict and tombstone semantics.

create table if not exists public.naamras_sync_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_type text not null check (
    record_type in ('profile', 'saved-item', 'vocab-entry', 'learning-progress')
  ),
  natural_key text not null check (length(natural_key) > 0),
  record_id text not null check (length(record_id) > 0),
  device_id text not null check (length(device_id) > 0),
  record_payload jsonb not null,
  review_due_at timestamptz,
  base_updated_at timestamptz,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, record_type, natural_key)
);

create index if not exists naamras_sync_records_user_active_idx
  on public.naamras_sync_records(user_id, record_type, natural_key)
  where deleted_at is null;

create index if not exists naamras_sync_records_vocab_due_idx
  on public.naamras_sync_records(user_id, review_due_at)
  where record_type = 'vocab-entry' and deleted_at is null;

drop trigger if exists touch_naamras_sync_records_updated_at
  on public.naamras_sync_records;
create trigger touch_naamras_sync_records_updated_at
before update on public.naamras_sync_records
for each row execute function public.touch_updated_at();

alter table public.naamras_sync_records enable row level security;

drop policy if exists naamras_sync_records_own_rows
  on public.naamras_sync_records;
create policy naamras_sync_records_own_rows
on public.naamras_sync_records
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update on table public.naamras_sync_records
  to authenticated;
grant select, insert on table public.activity_events
  to authenticated;

-- Preserve usable v1 profiles and reader preferences for accounts that were
-- connected before v2. Defaults fill fields that the v1 writer did not store.
with legacy_profiles as (
  select
    profiles.user_id,
    profiles.locale,
    profiles.onboarding as profile_payload,
    profiles.client_updated_at as profile_updated_at,
    profiles.deleted_at,
    reader_preferences.payload as reader_payload,
    reader_preferences.script_mode,
    reader_preferences.meaning_language,
    reader_preferences.client_updated_at as reader_updated_at
  from public.profiles
  left join public.reader_preferences
    on reader_preferences.user_id = profiles.user_id
),
normalized_profiles as (
  select
    user_id,
    coalesce(profile_payload->>'locale', locale, 'en') as resolved_locale,
    case
      when lower(coalesce(profile_payload->>'darkMode', 'false')) = 'true'
        then true
      else false
    end as resolved_dark_mode,
    (
      jsonb_build_object(
        'scriptMode', coalesce(reader_payload->>'scriptMode', script_mode, 'gurmukhi'),
        'showTransliteration', false,
        'meaningLanguage', case
          when coalesce(reader_payload->>'meaningLanguage', meaning_language, 'en') = 'english'
            then 'en'
          else coalesce(reader_payload->>'meaningLanguage', meaning_language, 'en')
        end,
        'larivaar', false,
        'showVishraam', true,
        'lineSpacing', 'relaxed',
        'textAlign', 'left',
        'fontSize', 22,
        'englishSource', 'bdb',
        'punjabiSource', 'ss',
        'hindiSource', 'ss',
        'visraamSource', 'sttm',
        'sundarGutkaLengths', '{}'::jsonb
      )
      || coalesce(reader_payload, '{}'::jsonb)
    ) as resolved_reader,
    (
      jsonb_build_object(
        'hasCompletedOnboarding', false,
        'learningLevel', 'beginner',
        'audience', 'adult',
        'learningGoal', 'read',
        'presentationMode', 'first-run'
      )
      || coalesce(profile_payload->'onboarding', profile_payload, '{}'::jsonb)
    ) as resolved_onboarding,
    greatest(
      profile_updated_at,
      coalesce(reader_updated_at, profile_updated_at)
    ) as resolved_updated_at,
    deleted_at
  from legacy_profiles
)
insert into public.naamras_sync_records (
  user_id,
  record_type,
  natural_key,
  record_id,
  device_id,
  record_payload,
  base_updated_at,
  client_updated_at,
  deleted_at
)
select
  user_id,
  'profile',
  'profile',
  'profile',
  'legacy-profile',
  jsonb_build_object(
    'id', 'profile',
    'userId', user_id::text,
    'deviceId', 'legacy-profile',
    'clientUpdatedAt', resolved_updated_at,
    'baseUpdatedAt', resolved_updated_at,
    'deletedAt', deleted_at,
    'locale', resolved_locale,
    'darkMode', resolved_dark_mode,
    'reader', resolved_reader,
    'onboarding', resolved_onboarding
  ),
  resolved_updated_at,
  resolved_updated_at,
  deleted_at
from normalized_profiles
where deleted_at is null
on conflict (user_id, record_type, natural_key) do nothing;

-- Migrate v1 bookmarks into the same natural keys emitted by snapshot v2.
with normalized_bookmarks as (
  select
    bookmarks.*,
    (
      'bookmark:'
      || coalesce(bookmarks.payload->>'source', bookmarks.source, 'G')
      || ':'
      || coalesce(bookmarks.payload->>'ang', '0')
      || case
        when nullif(bookmarks.payload->>'verseId', '') is not null
          then ':verse:' || bookmarks.payload->>'verseId'
        when nullif(bookmarks.payload->>'shabadId', '') is not null
          then ':shabad:' || bookmarks.payload->>'shabadId'
        else ':shabad:ang'
      end
    ) as resolved_natural_key
  from public.bookmarks
)
insert into public.naamras_sync_records (
  user_id,
  record_type,
  natural_key,
  record_id,
  device_id,
  record_payload,
  base_updated_at,
  client_updated_at,
  deleted_at
)
select
  user_id,
  'saved-item',
  resolved_natural_key,
  id,
  device_id,
  jsonb_build_object(
    'id', id,
    'userId', user_id::text,
    'deviceId', device_id,
    'clientUpdatedAt', client_updated_at,
    'baseUpdatedAt', client_updated_at,
    'deletedAt', deleted_at,
    'kind', 'bookmark',
    'naturalKey', resolved_natural_key,
    'payload', case when deleted_at is null then payload else 'null'::jsonb end
  ),
  client_updated_at,
  client_updated_at,
  deleted_at
from normalized_bookmarks
on conflict (user_id, record_type, natural_key) do nothing;

-- Vocab and phrase review retain review.dueAt verbatim. v1's accidental
-- nextReviewAt lookup is intentionally not carried forward.
insert into public.naamras_sync_records (
  user_id,
  record_type,
  natural_key,
  record_id,
  device_id,
  record_payload,
  review_due_at,
  base_updated_at,
  client_updated_at,
  deleted_at
)
select
  user_id,
  'vocab-entry',
  natural_key,
  id,
  device_id,
  jsonb_build_object(
    'id', id,
    'userId', user_id::text,
    'deviceId', device_id,
    'clientUpdatedAt', client_updated_at,
    'baseUpdatedAt', client_updated_at,
    'deletedAt', deleted_at,
    'naturalKey', natural_key,
    'payload', case when deleted_at is null then payload else 'null'::jsonb end
  ),
  coalesce(
    nullif(payload #>> '{review,dueAt}', '')::timestamptz,
    review_due_at
  ),
  client_updated_at,
  client_updated_at,
  deleted_at
from public.vocab_entries
on conflict (user_id, record_type, natural_key) do nothing;

create or replace function public.merge_naamras_cloud_snapshot_v2(
  incoming_records jsonb,
  incoming_events jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  merged_at timestamptz := clock_timestamp();
  remote_records jsonb := '[]'::jsonb;
  acknowledged_event_ids jsonb := '[]'::jsonb;
begin
  if current_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'An authenticated user is required for cloud sync.';
  end if;

  if jsonb_typeof(incoming_records) <> 'array' then
    raise exception using
      errcode = '22023',
      message = 'incoming_records must be a JSON array.';
  end if;

  if jsonb_typeof(incoming_events) <> 'array' then
    raise exception using
      errcode = '22023',
      message = 'incoming_events must be a JSON array.';
  end if;

  insert into public.naamras_sync_records as existing (
    user_id,
    record_type,
    natural_key,
    record_id,
    device_id,
    record_payload,
    review_due_at,
    base_updated_at,
    client_updated_at,
    deleted_at
  )
  select
    current_user_id,
    incoming.record_type,
    incoming.natural_key,
    incoming.record_id,
    incoming.device_id,
    incoming.record,
    incoming.review_due_at,
    incoming.base_updated_at,
    incoming.client_updated_at,
    incoming.deleted_at
  from jsonb_to_recordset(incoming_records) as incoming (
    record_type text,
    natural_key text,
    record_id text,
    device_id text,
    record jsonb,
    review_due_at timestamptz,
    base_updated_at timestamptz,
    client_updated_at timestamptz,
    deleted_at timestamptz
  )
  on conflict (user_id, record_type, natural_key)
  do update set
    record_id = excluded.record_id,
    device_id = excluded.device_id,
    record_payload = excluded.record_payload,
    review_due_at = excluded.review_due_at,
    base_updated_at = excluded.base_updated_at,
    client_updated_at = excluded.client_updated_at,
    deleted_at = excluded.deleted_at
  where
    excluded.base_updated_at is not null
    and (
      excluded.client_updated_at > existing.client_updated_at
      or (
        excluded.client_updated_at = existing.client_updated_at
        and (
          (excluded.deleted_at is not null and existing.deleted_at is null)
          or (
            (excluded.deleted_at is null) = (existing.deleted_at is null)
            and excluded.device_id > existing.device_id
          )
        )
      )
    );

  insert into public.activity_events (
    id,
    user_id,
    device_id,
    event_type,
    occurred_at,
    payload,
    client_updated_at,
    deleted_at
  )
  select
    incoming.id,
    current_user_id,
    incoming."deviceId",
    incoming."eventType",
    incoming."occurredAt",
    incoming.payload,
    incoming."clientUpdatedAt",
    incoming."deletedAt"
  from jsonb_to_recordset(incoming_events) as incoming (
    id text,
    "userId" text,
    "deviceId" text,
    "eventType" text,
    "occurredAt" timestamptz,
    "clientUpdatedAt" timestamptz,
    "deletedAt" timestamptz,
    payload jsonb
  )
  on conflict (id) do nothing;

  select coalesce(jsonb_agg(acknowledged.id order by acknowledged.id), '[]'::jsonb)
  into acknowledged_event_ids
  from (
    select distinct incoming.id
    from jsonb_to_recordset(incoming_events) as incoming (id text)
    join public.activity_events
      on activity_events.id = incoming.id
      and activity_events.user_id = current_user_id
  ) as acknowledged;

  select coalesce(
    jsonb_agg(
      sync_record.record_payload
      || jsonb_build_object(
        'recordType', sync_record.record_type,
        'userId', sync_record.user_id::text,
        'deviceId', sync_record.device_id,
        'clientUpdatedAt', sync_record.client_updated_at,
        'baseUpdatedAt', sync_record.client_updated_at,
        'deletedAt', sync_record.deleted_at
      )
      order by sync_record.record_type, sync_record.natural_key
    ),
    '[]'::jsonb
  )
  into remote_records
  from public.naamras_sync_records as sync_record
  where sync_record.user_id = current_user_id;

  return jsonb_build_object(
    'version', 2,
    'complete', true,
    'mergedAt', merged_at,
    'records', remote_records,
    'acknowledgedEventIds', acknowledged_event_ids
  );
end;
$$;

revoke all on function public.merge_naamras_cloud_snapshot_v2(jsonb, jsonb)
  from public;
revoke all on function public.merge_naamras_cloud_snapshot_v2(jsonb, jsonb)
  from anon;
grant execute on function public.merge_naamras_cloud_snapshot_v2(jsonb, jsonb)
  to authenticated;
