-- Run after 007. Real service-only RPCs, temporary fixture book, full rollback.
-- No Auth account/session/credential is created or changed; no content is returned.
begin;
set local statement_timeout='30s';
set local role service_role;
do $$
declare
  owner_id uuid;
  book_id text := 'annotation-smoke-' || replace(gen_random_uuid()::text,'-','');
  base jsonb := '{"index":0,"offset":10,"progress":0,"updatedAt":"2026-11-17T13:10:00.000Z"}';
  note_a jsonb := '{"id":"note-a","kind":"page","index":0,"note":"First note","createdAt":"2026-11-17T12:00:00.000Z","updatedAt":"2026-11-17T12:01:00.000Z"}';
  note_b jsonb;
  result jsonb;
  batch jsonb;
  deletes jsonb;
begin
  select user_id into owner_id from public.private_library_grants where enabled;
  if owner_id is null then raise exception 'A real owner grant is required for this rollback-only fixture'; end if;
  insert into public.private_library_books(id,metadata,status) values(book_id,
    jsonb_build_object('id',book_id,'title','Annotation fixture','authors','[]'::jsonb,'description','','category','','language','en','formats','["epub"]'::jsonb,
      'renderer','chapters','editionVersion','smoke-edition','contents','[{"id":"chapter-1","title":"Test"}]'::jsonb),'ready');

  result := public.write_private_library_state(owner_id,book_id,'smoke-edition',base || jsonb_build_object('annotations',jsonb_build_array(note_a)));
  result := public.write_private_library_state(owner_id,book_id,'smoke-edition',base || '{"offset":20,"updatedAt":"2026-11-17T13:20:00.000Z","annotations":[]}'::jsonb);
  if jsonb_array_length(result->'annotations') <> 1 then raise exception 'Stale empty array erased a note'; end if;
  -- Reversed arrival: older progress remains older, but its independent note still merges.
  note_b := note_a || '{"id":"note-b","note":"Another device"}'::jsonb;
  result := public.write_private_library_state(owner_id,book_id,'smoke-edition',base || '{"offset":15,"updatedAt":"2026-11-17T13:15:00.000Z"}'::jsonb || jsonb_build_object('annotations',jsonb_build_array(note_b)));
  if result->>'offset' <> '20' or jsonb_array_length(result->'annotations') <> 2 then raise exception 'Progress and note revisions were not independent'; end if;
  -- An old deployed client does not include either annotation field.
  result := public.write_private_library_state(owner_id,book_id,'smoke-edition',base || '{"offset":21,"updatedAt":"2026-11-17T13:21:00.000Z"}'::jsonb);
  if jsonb_array_length(result->'annotations') <> 2 then raise exception 'Legacy progress write erased notes'; end if;

  note_a := note_a || '{"note":"Newer edit","updatedAt":"2026-11-17T12:03:00.000Z"}'::jsonb;
  perform public.write_private_library_state(owner_id,book_id,'smoke-edition',base || jsonb_build_object('annotations',jsonb_build_array(note_a)));
  result := public.write_private_library_state(owner_id,book_id,'smoke-edition',base || jsonb_build_object('annotations',jsonb_build_array(note_a || '{"note":"Stale edit","updatedAt":"2026-11-17T12:02:00.000Z"}'::jsonb)));
  if not exists(select 1 from jsonb_array_elements(result->'annotations') n where n->>'id'='note-a' and n->>'note'='Newer edit') then raise exception 'Stale note revision won'; end if;
  perform public.write_private_library_state(owner_id,book_id,'smoke-edition',base || '{"annotationDeletes":[{"id":"note-a","updatedAt":"2026-11-17T12:04:00.000Z"},{"id":"not-yet-created","updatedAt":"2026-11-17T12:04:00.000Z"}]}'::jsonb);
  result := public.write_private_library_state(owner_id,book_id,'smoke-edition',base || jsonb_build_object('annotations',jsonb_build_array(note_a,note_a || '{"id":"not-yet-created"}'::jsonb)));
  if jsonb_array_length(result->'annotations') <> 1 then raise exception 'A stale tab resurrected a deleted note'; end if;
  -- A genuinely newer edit can restore its own note; equal-time deletion wins.
  note_a := note_a || '{"updatedAt":"2026-11-17T12:05:00.000Z"}'::jsonb;
  perform public.write_private_library_state(owner_id,book_id,'smoke-edition',base || jsonb_build_object('annotations',jsonb_build_array(note_a)));
  result := public.write_private_library_state(owner_id,book_id,'smoke-edition',base || '{"annotationDeletes":[{"id":"note-a","updatedAt":"2026-11-17T12:05:00.000Z"}]}'::jsonb);
  result := public.write_private_library_state(owner_id,book_id,'smoke-edition',base || jsonb_build_object('annotations',jsonb_build_array(note_a)));
  if jsonb_array_length(result->'annotations') <> 1 then raise exception 'Equal revision resurrected a note'; end if;
  if result ? 'annotationDeletes' then raise exception 'Internal tombstones escaped the read result'; end if;

  -- Exactly 128 active notes fit; adding one more rolls back progress and notes.
  select jsonb_agg(note_b || jsonb_build_object('id','count-'||n,'note','n')) into batch from generate_series(1,127) n;
  result := public.write_private_library_state(owner_id,book_id,'smoke-edition',base || '{"offset":30,"updatedAt":"2026-11-17T13:30:00.000Z"}'::jsonb || jsonb_build_object('annotations',batch));
  if jsonb_array_length(result->'annotations') <> 128 then raise exception 'Annotation count boundary failed'; end if;
  begin
    perform public.write_private_library_state(owner_id,book_id,'smoke-edition',base || '{"offset":999,"updatedAt":"2026-11-17T13:59:00.000Z"}'::jsonb || jsonb_build_object('annotations',jsonb_build_array(note_b || '{"id":"overflow"}'::jsonb)));
    raise exception 'Expected count capacity rejection';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'private-library-state-capacity' then raise; end if;
  end;
  result := public.get_private_library_state(owner_id,book_id,'smoke-edition');
  if result->>'offset' <> '30' or jsonb_array_length(result->'annotations') <> 128 then raise exception 'Rejected merge changed existing state'; end if;
  select jsonb_agg(jsonb_build_object('id','count-'||n,'updatedAt','2026-11-17T12:06:00.000Z')) into deletes from generate_series(1,127) n;
  perform public.write_private_library_state(owner_id,book_id,'smoke-edition',base || jsonb_build_object('annotationDeletes',deletes));

  -- Each device's batch fits on its own; their merged UTF-8 payload exceeds 48 KiB.
  select jsonb_agg(note_b || jsonb_build_object('id','large-a-'||n,'note',repeat('n',2000))) into batch from generate_series(1,12) n;
  perform public.write_private_library_state(owner_id,book_id,'smoke-edition',base || '{"offset":50,"updatedAt":"2026-11-17T13:50:00.000Z"}'::jsonb || jsonb_build_object('annotations',batch));
  select jsonb_agg(note_b || jsonb_build_object('id','large-b-'||n,'note',repeat('n',2000))) into batch from generate_series(1,12) n;
  begin
    perform public.write_private_library_state(owner_id,book_id,'smoke-edition',base || '{"offset":999,"updatedAt":"2026-11-17T13:59:00.000Z"}'::jsonb || jsonb_build_object('annotations',batch));
    raise exception 'Expected byte capacity rejection';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'private-library-state-capacity' then raise; end if;
  end;
  result := public.get_private_library_state(owner_id,book_id,'smoke-edition');
  if result->>'offset' <> '50' or jsonb_array_length(result->'annotations') <> 13 then raise exception 'Byte overflow was not atomic'; end if;
  if public.get_private_library_state('00000000-0000-4000-8000-000000000000',book_id,'smoke-edition') is not null then raise exception 'State crossed owner scope'; end if;
  begin
    perform public.write_private_library_state(owner_id,book_id,'stale-edition',base);
    raise exception 'Expected edition rejection';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'private-library-edition-changed' then raise; end if;
  end;
  begin
    insert into public.private_library_annotations(user_id,book_id,edition_version,id,annotation,revision)
      values(owner_id,book_id,'missing-state','orphan',note_b || '{"id":"orphan"}'::jsonb,now());
    raise exception 'Expected state foreign-key rejection';
  exception when foreign_key_violation then null;
  end;
end;
$$;
reset role;
do $$
begin
  if has_table_privilege('anon','public.private_library_annotations','SELECT,INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated','public.private_library_annotations','SELECT,INSERT,UPDATE,DELETE')
    or has_function_privilege('anon','public.get_private_library_state(uuid,text,text)','EXECUTE')
    or has_function_privilege('authenticated','public.write_private_library_state(uuid,text,text,jsonb)','EXECUTE') then
    raise exception 'Annotation client access was granted';
  end if;
end;
$$;
rollback;
