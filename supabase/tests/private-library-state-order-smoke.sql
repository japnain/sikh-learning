-- Rollback-only ordering checks. No application, Auth, or Storage rows change.
begin;
create temporary table private_state_order_probe (
  user_id text, book_id text, edition_version text, state jsonb,
  primary key (user_id, book_id, edition_version)
) on commit drop;

do $$
declare
  older jsonb := '{"index":2,"updatedAt":"2026-11-17T12:00:00.001Z"}';
  newer jsonb := '{"index":3,"updatedAt":"2026-11-17T12:00:00.002Z"}';
begin
  -- The newest request arrives first; a delayed initial insert must do nothing.
  insert into private_state_order_probe values ('owner','book','edition',newer)
    on conflict (user_id,book_id,edition_version) do nothing;
  insert into private_state_order_probe values ('owner','book','edition',older)
    on conflict (user_id,book_id,edition_version) do nothing;
  update private_state_order_probe set state=older
    where user_id='owner' and book_id='book' and edition_version='edition'
      and (state->>'updatedAt' is null or state->>'updatedAt' < older->>'updatedAt');
  if (select state from private_state_order_probe where user_id='owner') <> newer then
    raise exception 'Delayed old save replaced the latest state';
  end if;

  -- Equal revisions remain idempotent, even when their content differs.
  update private_state_order_probe set state=newer || '{"index":99}'::jsonb
    where user_id='owner' and book_id='book' and edition_version='edition'
      and (state->>'updatedAt' is null or state->>'updatedAt' < newer->>'updatedAt');
  if (select state->>'index' from private_state_order_probe where user_id='owner') <> '3' then
    raise exception 'Equal revision replaced existing state';
  end if;

  -- A missing old timestamp can be upgraded; unrelated owners remain intact.
  insert into private_state_order_probe values ('legacy','book','edition','{"index":1}');
  update private_state_order_probe set state=newer
    where user_id='legacy' and book_id='book' and edition_version='edition'
      and (state->>'updatedAt' is null or state->>'updatedAt' < newer->>'updatedAt');
  if (select count(*) from private_state_order_probe where state=newer) <> 2 then
    raise exception 'Legacy revision upgrade failed';
  end if;
end;
$$;
rollback;
