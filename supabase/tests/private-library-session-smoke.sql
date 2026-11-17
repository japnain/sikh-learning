-- Transactional authorization matrix. Run after migration 005 and BEFORE
-- seeding the real owner grant. Refuses to alter an already-enabled owner.
-- Temporary synthetic users/sessions are rolled back; no emails are sent.
begin;
do $$
declare
  owner_id uuid := gen_random_uuid();
  other_id uuid := gen_random_uuid();
  session_id uuid := gen_random_uuid();
  other_session_id uuid := gen_random_uuid();
begin
  if exists (select 1 from public.private_library_grants where enabled) then
    raise exception 'Run fixture matrix before seeding an enabled owner grant';
  end if;
  insert into auth.users (id, aud, role, email, email_confirmed_at, is_anonymous, created_at, updated_at)
  values (owner_id, 'authenticated', 'authenticated', 'private-library-test-' || owner_id || '@example.invalid', now(), false, now(), now()),
    (other_id, 'authenticated', 'authenticated', 'private-library-test-' || other_id || '@example.invalid', now(), false, now(), now());
  insert into auth.sessions (id, user_id, created_at, updated_at, not_after)
    values (session_id, owner_id, now(), now(), now() + interval '1 hour'),
      (other_session_id, other_id, now(), now(), now() + interval '1 hour');
  insert into public.private_library_grants (user_id, enabled) values (owner_id, true);

  if public.authorize_private_library_request(owner_id, session_id) <> 'allowed'
    then raise exception 'Verified owner session was denied'; end if;
  if public.authorize_private_library_request(other_id, other_session_id) <> 'denied'
    then raise exception 'Other account was allowed'; end if;
  if public.authorize_private_library_request(owner_id, other_session_id) <> 'denied'
    then raise exception 'Session/user mismatch was allowed'; end if;
  begin
    insert into public.private_library_grants (user_id, enabled) values (other_id, true);
    raise exception 'A second enabled owner was allowed';
  exception when unique_violation then null;
  end;

  update public.private_library_grants set enabled = false where user_id = owner_id;
  if public.authorize_private_library_request(owner_id, session_id) <> 'denied'
    then raise exception 'Revoked grant was allowed'; end if;
  update public.private_library_grants set enabled = true where user_id = owner_id;
  update auth.users set banned_until = now() + interval '1 hour' where id = owner_id;
  if public.authorize_private_library_request(owner_id, session_id) <> 'denied'
    then raise exception 'Banned owner was allowed'; end if;
  update auth.users set banned_until = null, is_anonymous = true where id = owner_id;
  if public.authorize_private_library_request(owner_id, session_id) <> 'denied'
    then raise exception 'Anonymous owner was allowed'; end if;
  update auth.users set is_anonymous = false, email_confirmed_at = null where id = owner_id;
  if public.authorize_private_library_request(owner_id, session_id) <> 'denied'
    then raise exception 'Unverified owner was allowed'; end if;
  update auth.users set email_confirmed_at = now() where id = owner_id;
  update auth.sessions set not_after = now() - interval '1 second' where id = session_id;
  if public.authorize_private_library_request(owner_id, session_id) <> 'denied'
    then raise exception 'Expired session was allowed'; end if;
  update auth.sessions set not_after = now() + interval '1 hour' where id = session_id;
  update public.private_library_grants set request_count = 1200, request_window = now() where user_id = owner_id;
  if public.authorize_private_library_request(owner_id, session_id) <> 'rate_limited'
    then raise exception 'Request budget was not enforced'; end if;
  update public.private_library_grants set request_count = 0 where user_id = owner_id;
  delete from auth.sessions where id = session_id;
  if public.authorize_private_library_request(owner_id, session_id) <> 'denied'
    then raise exception 'Signed-out session was allowed'; end if;
end;
$$;
rollback;
