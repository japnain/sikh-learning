begin;

-- No account identifiers or book inventory belong in a public migration. Seed
-- the sole verified owner through trusted administration after applying this.
create table public.private_library_grants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  request_window timestamptz not null default clock_timestamp(),
  request_count integer not null default 0 check (request_count >= 0),
  created_at timestamptz not null default clock_timestamp()
);
create unique index private_library_single_enabled_owner
  on public.private_library_grants ((enabled)) where enabled;

create table public.private_library_books (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_-]{0,127}$'),
  metadata jsonb not null check (jsonb_typeof(metadata) = 'object'),
  status text not null default 'processing'
    check (status in ('processing', 'needs_review', 'ready')),
  sort_order integer not null default 0,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (metadata->>'id' = id),
  check (octet_length(metadata::text) <= 1048576)
);
create index private_library_books_catalog
  on public.private_library_books (status, sort_order, id);

create table public.private_library_assets (
  id text primary key check (id ~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$'),
  book_id text not null references public.private_library_books(id) on delete cascade,
  object_key text not null unique
    check (object_key ~ '^[a-zA-Z0-9_-]+(/[a-zA-Z0-9_.-]+)+$'
      and object_key !~ '(^|/)\.\.?(/|$)'),
  content_type text not null check (content_type in (
    'application/json', 'application/pdf', 'application/epub+zip',
    'image/jpeg', 'image/png', 'image/webp', 'image/avif'
  )),
  size bigint not null check (size > 0 and size <= 134217728),
  checksum text not null check (checksum ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default clock_timestamp()
);
create index private_library_assets_book on public.private_library_assets (book_id);

create table public.private_library_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null references public.private_library_books(id) on delete cascade,
  edition_version text not null check (edition_version ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$'),
  state jsonb not null default '{}'::jsonb
    check (jsonb_typeof(state) = 'object' and octet_length(state::text) <= 65536),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, book_id, edition_version)
);

-- The gateway is the only client access route, including for the owner. RLS
-- has no permissive client policies. service_role remains server-only.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'private_library_grants', 'private_library_books',
    'private_library_assets', 'private_library_state'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
    execute format('grant all on table public.%I to service_role', table_name);
  end loop;
end;
$$;

-- Called only after the Edge function has cryptographically verified the JWT.
-- Checking the live session closes the unexpired-JWT window after sign-out.
-- No authorization result is cached. The row lock also makes the rate budget
-- shared by all Edge isolates. This is not an app-wide Auth timeout setting.
create function public.authorize_private_library_request(
  requested_user_id uuid, requested_session_id uuid
) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  grant_row public.private_library_grants%rowtype;
  now_at timestamptz := clock_timestamp();
begin
  select g.* into grant_row
  from public.private_library_grants g
  join auth.users u on u.id = g.user_id
  where g.user_id = requested_user_id and g.enabled
    and u.email_confirmed_at is not null
    and not coalesce(u.is_anonymous, false)
    and (u.banned_until is null or u.banned_until <= now_at)
    and exists (
      select 1 from auth.sessions s
      where s.id = requested_session_id and s.user_id = requested_user_id
        and (s.not_after is null or s.not_after > now_at)
    )
  for update of g;
  if not found then return 'denied'; end if;
  if grant_row.request_window <= now_at - interval '1 minute' then
    update public.private_library_grants
      set request_window = now_at, request_count = 1
      where user_id = requested_user_id;
  elsif grant_row.request_count >= 1200 then
    return 'rate_limited';
  else
    update public.private_library_grants set request_count = request_count + 1
      where user_id = requested_user_id;
  end if;
  return 'allowed';
end;
$$;
revoke all on function public.authorize_private_library_request(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.authorize_private_library_request(uuid, uuid)
  to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('naamras-private-books', 'naamras-private-books', false, 134217728,
  array['application/json', 'application/pdf', 'application/epub+zip',
    'image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Restrictive exclusions prevent unrelated broad permissive storage policies
-- from accidentally granting access to this bucket now or in the future.
create policy private_library_no_client_objects on storage.objects
  as restrictive for all to anon, authenticated
  using (bucket_id <> 'naamras-private-books')
  with check (bucket_id <> 'naamras-private-books');
create policy private_library_no_client_bucket on storage.buckets
  as restrictive for all to anon, authenticated
  using (id <> 'naamras-private-books')
  with check (id <> 'naamras-private-books');

commit;
