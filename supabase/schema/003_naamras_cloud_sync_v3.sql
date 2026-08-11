begin;

-- Version 3 gates route-identity and book Saved records away from older v2
-- clients while retaining the proven v2 merge implementation underneath.
create or replace function public.merge_naamras_cloud_snapshot_v3(
  incoming_records jsonb,
  incoming_events jsonb
)
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select jsonb_set(
    public.merge_naamras_cloud_snapshot_v2(incoming_records, incoming_events),
    '{version}',
    '3'::jsonb,
    true
  );
$$;

revoke all on function public.merge_naamras_cloud_snapshot_v3(jsonb, jsonb)
  from public;
revoke all on function public.merge_naamras_cloud_snapshot_v3(jsonb, jsonb)
  from anon;
grant execute on function public.merge_naamras_cloud_snapshot_v3(jsonb, jsonb)
  to authenticated;

commit;
