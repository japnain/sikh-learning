-- Run after 005, as a trusted database administrator. Read-only assertions;
-- this script never inserts owner IDs, books, auth users or session tokens.
begin;
do $$
declare
  name text;
  role_name text;
begin
  foreach name in array array['private_library_grants', 'private_library_books',
    'private_library_assets', 'private_library_state'] loop
    if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = name and c.relrowsecurity and c.relforcerowsecurity)
      then raise exception 'Private library table lacks forced RLS: %', name; end if;
    foreach role_name in array array['anon', 'authenticated'] loop
      if has_table_privilege(role_name, 'public.' || name, 'SELECT, INSERT, UPDATE, DELETE')
        then raise exception 'Private table has direct client privileges: %, %', name, role_name; end if;
    end loop;
  end loop;
  if has_function_privilege('anon', 'public.authorize_private_library_request(uuid,uuid)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.authorize_private_library_request(uuid,uuid)', 'EXECUTE')
    then raise exception 'Private authorization RPC is client callable'; end if;
  if not has_function_privilege('service_role', 'public.authorize_private_library_request(uuid,uuid)', 'EXECUTE')
    then raise exception 'Gateway cannot call its authorization RPC'; end if;
  if not exists (select 1 from storage.buckets where id = 'naamras-private-books' and not public)
    then raise exception 'Private book bucket is missing or public'; end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'private_library_no_client_objects' and permissive = 'RESTRICTIVE')
    then raise exception 'Direct object route is not restricted'; end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'buckets'
    and policyname = 'private_library_no_client_bucket' and permissive = 'RESTRICTIVE')
    then raise exception 'Direct bucket route is not restricted'; end if;
  if (select count(*) from public.private_library_grants where enabled) > 1
    then raise exception 'More than one private reader is enabled'; end if;
  if public.authorize_private_library_request('00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002') <> 'denied'
    then raise exception 'Unknown account/session was authorized'; end if;
end;
$$;
rollback;
