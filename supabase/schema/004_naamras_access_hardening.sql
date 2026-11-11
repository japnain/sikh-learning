begin;

-- Apply after 001–003. Keep both sync contracts and the legacy tables intact,
-- while making access independent of project-wide default privileges.
alter function public.touch_updated_at() set search_path = '';
alter function public.merge_naamras_cloud_snapshot_v2(jsonb, jsonb)
  set search_path = '';
alter function public.merge_naamras_cloud_snapshot_v3(jsonb, jsonb)
  set search_path = '';

-- Existing triggers retain access; this helper is not a callable API.
revoke all on function public.touch_updated_at()
  from public, anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'reader_preferences', 'bookmarks', 'vocab_entries',
    'learning_state', 'reading_progress', 'activity_events',
    'naamras_sync_records'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'alter policy %I on public.%I to authenticated '
      || 'using ((select auth.uid()) = user_id) '
      || 'with check ((select auth.uid()) = user_id)',
      table_name || '_own_rows', table_name
    );
    execute format(
      'revoke all on table public.%I from public, anon, authenticated',
      table_name
    );
  end loop;
end;
$$;

grant usage on schema public to authenticated;

-- Sync uses tombstones; deleting individual rows would lose cross-device
-- deletion history. Account removal is handled through auth.users cascades.
grant select, insert, update on table
  public.profiles,
  public.reader_preferences,
  public.bookmarks,
  public.vocab_entries,
  public.learning_state,
  public.reading_progress,
  public.naamras_sync_records
to authenticated;

-- Activity events are append-only, including when the merge RPC retries.
grant select, insert on table public.activity_events to authenticated;

revoke all on function public.merge_naamras_cloud_snapshot_v2(jsonb, jsonb)
  from public, anon;
revoke all on function public.merge_naamras_cloud_snapshot_v3(jsonb, jsonb)
  from public, anon;
grant execute on function public.merge_naamras_cloud_snapshot_v2(jsonb, jsonb)
  to authenticated;
grant execute on function public.merge_naamras_cloud_snapshot_v3(jsonb, jsonb)
  to authenticated;

commit;
