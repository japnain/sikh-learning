# Backend readiness audit — November 11, 2026

## Verdict

The production web configuration now enables Supabase email-link sign-in and optional cloud backup. The deployed backend passed authenticated HTTP save/restore, ownership isolation, session, and deletion checks. Native Capacitor sign-in is not release-ready and remains hidden.

Production: `https://naamras.xyz`. Backend repairs were deployed in Git commit `a5814e97176f752d9776601eaf5e55aacb0e1f25`; activation commit `bf0bf9110e511ed9b62b70b8cdf42529330358bc` is deployed to the custom domain (Vercel `dpl_GkyEc23odwCuwzkNjDjbiRyo2aEQ`, READY). Supabase project: `nsewywsansbnbbolsgba`, Canada Central, PostgreSQL 17.11.0.003.

## Verified live

- Eight application tables exist with ownership RLS enabled. Anonymous roles have no table grants. Authenticated mutations enforce `auth.uid() = user_id` for both existing and replacement rows.
- Applied migrations include 001, 002, 003, and 004 access hardening. Merge v2/v3 functions use `SECURITY INVOKER`, a fixed empty search path, and authenticated-only execution.
- All eight application user foreign keys cascade on auth-user deletion.
- Auth settings: email enabled, Apple disabled, anonymous sign-in disabled, email confirmation required.
- Dashboard Site URL is `https://naamras.xyz`. Allowed callbacks include `https://naamras.xyz/more`, `https://www.naamras.xyz/more`, and local development /more routes.
- Custom Resend SMTP was already configured. Real signup and magic-link emails arrived in the connected Gmail inbox from NaamRas at `login@auth.naamras.xyz`, with SPF, DKIM, and DMARC passing.
- One email link was opened on an iPhone and created a confirmed session; fresh links were verified through the public Auth API for isolated backend testing. These checks do not establish native Capacitor callback handling.
- All expected Edge Functions exist: `banidb-proxy`, `merge-local-state`, and `delete-account`.
- Public-key proxy requests for the bani catalog, a bani, English search, and daily Hukamnama returned HTTP 200 and JSON. An unsupported path was rejected with HTTP 400.
- Merge and account-deletion requests without a user bearer token returned HTTP 401.
- Authenticated v3 save returned a complete snapshot containing profile, saved items, vocabulary, and learning progress. Activity events were acknowledged and replayed idempotently.
- An empty snapshot from a second device restored stored state. Newer edits won over older offline edits; deletion tombstones synchronized.
- Forged snapshot ownership was replaced with the authenticated user's identity. A second account could not restore the first account's data. REST RLS blocked cross-user reads, inserts, and ownership reassignment. Anonymous reads were denied.
- Session refresh succeeded; sign-out revoked the refresh session; signing in again worked.
- Account deletion succeeded. The deleted account's old token could neither authenticate nor sync. The other account's data survived, verified after signing in again.
- Both disposable QA accounts were deleted. Read-only SQL confirmed **zero remaining QA accounts, sync records, and activity events**. Existing user records were not used.
- Health advisors reported no issues after wake-up. Leaked-password protection is disabled; the app offers email links rather than password login. Unused-index notices are informational.
- No Supabase Storage buckets exist. Ambient audio is bundled locally.

## Repairs included

- Discover enabled sign-in methods from public Auth settings instead of assuming Apple and email are available. Bound discovery to five seconds; do not block reading or existing sync. Hide unverified methods and retry discovery on reconnect.
- Keep native sign-in hidden until Capacitor callbacks are implemented.
- Retry scripture reads directly once after transient proxy network/5xx failures when fallback is enabled. Preserve cancellation, 4xx responses, and rate limits; do not forward project credentials upstream.
- Require an explicitly configured audio bucket before switching from bundled audio.
- Correct provisioning documentation and privacy descriptions.
- Preserve the already-applied access-hardening SQL and a repeatable, rollback-only database test in the repository.
- Enable the production web client using the public Supabase URL and browser publishable key. No privileged key is included in the client.

## Validation

- 125 focused backend, sync, auth, deletion, privacy, and audio-configuration tests passed for the backend repairs.
- TypeScript, production build, startup bundle budget, story-build validation, and ESLint passed.
- Live checks used disposable accounts through the actual public Auth, REST, and deployed Edge Function endpoints.
- The rollback-only SQL smoke test was not executed because its confirmation expired. It is retained as an optional repeatable check; authenticated HTTP tests subsequently verified the key behaviors directly.
- Local interactive preview could not bind a port in this execution environment (`listen EPERM`). On the deployed `/more` screen, the browser verified Optional cloud backup, the explicit coverage/exclusion list, and an email sign-in form. Apple sign-in was absent as configured. Authenticated persistence tests were performed separately through public HTTP endpoints.
- Vercel environment-variable access through the connected account returned HTTP 403. Public browser identifiers are committed in `.env.production`, so deployment does not depend on changing hosted secrets.

## Remaining release limits

- Native Capacitor authentication still needs callback/session exchange and physical-device tests. Apple sign-in is disabled and must not be advertised until provider configuration and token-revocation verification are complete.
- AI study generation and a self-hosted scripture corpus are not deployed. AI study remains disabled; scripture continues to use BaniDB.
- Cloud backup intentionally covers scripture/book bookmarks, saved scripture passages, vocabulary, reading progress, the most recent reading, selected Nitnem banis and today’s completions, core scripture-reader settings, app language, and theme.
- Story saves/places, earlier Nitnem history, weekly goals, tracking choices, separate bani positions, active Nitnem practice, book/story preferences, reading mode, supporting-text size, artwork, and sound preferences require the complete personal backup file. Downloaded content is separate. The More screen lists these limits explicitly.
