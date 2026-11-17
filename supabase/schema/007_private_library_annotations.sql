-- Private annotation revisions are independent of reading-position revisions.
-- Old tabs can save progress without erasing notes created on another device.
begin;

create table public.private_library_annotations (
  user_id uuid not null,
  book_id text not null,
  edition_version text not null,
  id text not null check (id ~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$'),
  annotation jsonb,
  deleted boolean not null default false,
  revision timestamptz not null,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, book_id, edition_version, id),
  foreign key (user_id, book_id, edition_version)
    references public.private_library_state (user_id, book_id, edition_version) on delete cascade,
  check ((deleted and annotation is null) or
    (not deleted and annotation is not null and jsonb_typeof(annotation) = 'object' and annotation ? 'id' and annotation->>'id' = id
      and octet_length(annotation::text) <= 16384))
);
alter table public.private_library_annotations enable row level security;
alter table public.private_library_annotations force row level security;
revoke all on public.private_library_annotations from public, anon, authenticated;
grant all on public.private_library_annotations to service_role;

-- Preserve any annotations written by a transitional client before this migration.
insert into public.private_library_annotations(user_id,book_id,edition_version,id,annotation,revision)
select s.user_id,s.book_id,s.edition_version,a->>'id',a,(a->>'updatedAt')::timestamptz
from public.private_library_state s
cross join lateral jsonb_array_elements(case when jsonb_typeof(s.state->'annotations')='array'
  then s.state->'annotations' else '[]'::jsonb end) a;

create function public.get_private_library_state(
  requested_user_id uuid, requested_book_id text, requested_edition_version text
) returns jsonb
language sql stable security invoker set search_path = ''
as $$
  select (s.state - 'annotations' - 'annotationDeletes') || jsonb_build_object('annotations',coalesce((
    select jsonb_agg(a.annotation order by a.annotation->>'createdAt',a.id)
    from public.private_library_annotations a
    where a.user_id=s.user_id and a.book_id=s.book_id and a.edition_version=s.edition_version and not a.deleted
  ),'[]'::jsonb))
  from public.private_library_state s
  where s.user_id=requested_user_id and s.book_id=requested_book_id and s.edition_version=requested_edition_version
$$;
revoke all on function public.get_private_library_state(uuid,text,text) from public,anon,authenticated;
grant execute on function public.get_private_library_state(uuid,text,text) to service_role;

create function public.write_private_library_state(
  requested_user_id uuid, requested_book_id text, requested_edition_version text, requested_state jsonb
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  stored_state jsonb;
  incoming_progress jsonb;
  item jsonb;
  merged_state jsonb;
begin
  if jsonb_typeof(requested_state) is distinct from 'object'
    or jsonb_typeof(requested_state->'updatedAt') is distinct from 'string'
    or requested_state->>'updatedAt' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'
    or (requested_state ? 'annotations' and jsonb_typeof(requested_state->'annotations') <> 'array')
    or (requested_state ? 'annotationDeletes' and jsonb_typeof(requested_state->'annotationDeletes') <> 'array') then
    raise exception using errcode='22023',message='private-library-invalid-state';
  end if;
  if jsonb_array_length(coalesce(requested_state->'annotations','[]'::jsonb)) > 128
    or jsonb_array_length(coalesce(requested_state->'annotationDeletes','[]'::jsonb)) > 128 then
    raise exception using errcode='22023',message='private-library-invalid-state';
  end if;
  -- Keep edition changes and state writes in a consistent lock order.
  perform 1 from public.private_library_books b
    where b.id=requested_book_id and b.status='ready' and b.metadata->>'editionVersion'=requested_edition_version
    for share;
  if not found then raise exception using errcode='P0001',message='private-library-edition-changed'; end if;

  incoming_progress := requested_state - 'annotations' - 'annotationDeletes';
  insert into public.private_library_state(user_id,book_id,edition_version,state)
    values(requested_user_id,requested_book_id,requested_edition_version,incoming_progress)
    on conflict (user_id,book_id,edition_version) do nothing;
  select s.state into stored_state from public.private_library_state s
    where s.user_id=requested_user_id and s.book_id=requested_book_id and s.edition_version=requested_edition_version
    for update;
  -- The row lock serializes note merges and capacity checks for this edition.
  if stored_state->>'updatedAt' is null or stored_state->>'updatedAt' < incoming_progress->>'updatedAt' then
    update public.private_library_state set state=incoming_progress,updated_at=clock_timestamp()
      where user_id=requested_user_id and book_id=requested_book_id and edition_version=requested_edition_version;
  end if;

  for item in select value from jsonb_array_elements(coalesce(requested_state->'annotations','[]'::jsonb)) loop
    insert into public.private_library_annotations as existing(user_id,book_id,edition_version,id,annotation,deleted,revision)
      values(requested_user_id,requested_book_id,requested_edition_version,item->>'id',item,false,(item->>'updatedAt')::timestamptz)
      on conflict(user_id,book_id,edition_version,id) do update
        set annotation=excluded.annotation,deleted=false,revision=excluded.revision,updated_at=clock_timestamp()
        where excluded.revision > existing.revision;
  end loop;
  for item in select value from jsonb_array_elements(coalesce(requested_state->'annotationDeletes','[]'::jsonb)) loop
    insert into public.private_library_annotations as existing(user_id,book_id,edition_version,id,annotation,deleted,revision)
      values(requested_user_id,requested_book_id,requested_edition_version,item->>'id',null,true,(item->>'updatedAt')::timestamptz)
      on conflict(user_id,book_id,edition_version,id) do update
        set annotation=null,deleted=true,revision=excluded.revision,updated_at=clock_timestamp()
        where excluded.revision > existing.revision or (excluded.revision = existing.revision and not existing.deleted);
  end loop;

  merged_state := public.get_private_library_state(requested_user_id,requested_book_id,requested_edition_version);
  if jsonb_array_length(merged_state->'annotations') > 128
    or octet_length(jsonb_build_object('state',merged_state)::text) > 49152 then
    -- An exception rolls back progress, annotation changes and tombstones together.
    raise exception using errcode='P0001',message='private-library-state-capacity';
  end if;
  return merged_state;
end;
$$;
revoke all on function public.write_private_library_state(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.write_private_library_state(uuid,text,text,jsonb) to service_role;

commit;
