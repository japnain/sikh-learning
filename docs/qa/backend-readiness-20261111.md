# Backend readiness audit — November 11, 2026

## Verdict

The Supabase data layer exists and the scripture services respond, but the production web app is **not yet connected for account backup**. Do not describe the complete backend as production-ready until the remaining sign-in checks pass.

Production inspected: `https://naamras.xyz`, Git commit `b54c6059456e61920a8af18e46d2ddd29c391c22`. Supabase project: `nsewywsansbnbbolsgba`, Canada Central, PostgreSQL 17.11.0.003.

## Verified live

- The production More screen explicitly reports local-only data. Its compiled configuration has no Supabase URL/key.
- Supabase initially reported database hibernation. Normal public-key API requests woke it; subsequent database checks succeeded.
- Eight application tables exist with ownership RLS enabled. Anonymous roles have no table grants. Authenticated mutations enforce `auth.uid() = user_id` for both existing and replacement rows.
- Applied migrations include 001, 002, 003, and 004 access hardening. Merge v2/v3 functions use `SECURITY INVOKER`, a fixed empty search path, and authenticated-only execution.
- All eight app user foreign keys cascade on auth-user deletion.
- Auth health/settings returned HTTP 200. Email is enabled, Apple is disabled, anonymous sign-in is disabled, and email confirmation is required.
- All three expected Edge Functions exist: `banidb-proxy`, `merge-local-state`, and `delete-account`.
- Public-key proxy requests for the bani catalog, a bani, English search, and daily Hukamnama returned HTTP 200 and JSON. An unsupported path was rejected with HTTP 400.
- Merge and account-deletion requests without a user bearer token returned HTTP 401.
- Health advisors reported no issues after wake-up. Security advisor reports leaked-password protection disabled; the app offers email links, not password login. Performance notices are unused-index informational notices.
- No Supabase Storage buckets exist. Ambient audio is bundled locally.

## Repairs included

- Discover enabled sign-in methods from public Auth settings rather than assuming Apple and email are available. Bound discovery to five seconds; do not block reading or existing sync. Hide unverified methods and retry discovery on reconnect.
- Keep native sign-in hidden until Capacitor callbacks are implemented.
- Retry scripture reads directly once after transient proxy network/5xx failures when fallback is enabled. Preserve cancellation, 4xx responses, and rate limits; do not forward project credentials upstream.
- Require an explicitly configured audio bucket before switching from bundled audio.
- Correct provisioning documentation and privacy descriptions.
- Preserve the already-applied access-hardening SQL and a repeatable, rollback-only database test in the repository.

## Validation

- 123 focused backend, sync, auth, deletion, and privacy tests passed; two additional audio configuration regression tests passed (125 total).
- TypeScript, production build, startup bundle budget, story-build validation, and ESLint passed.
- Local interactive preview could not bind its port in this execution environment (`listen EPERM`). Production's existing local-only state was checked in the browser.
- The rollback-only live write test did not execute: Supabase requested a confirmation that expired. Save/restore and cross-user write behavior remain unverified at the live-data layer. Read-only follow-up confirmed zero test users and no unresolved transactions. The SQL is saved for a supervised run; no existing user records were changed.

## Remaining release work

1. Sign in to the Supabase dashboard and verify the Site URL / redirect allowlist and production SMTP setup. Dashboard access currently stops at GitHub sign-in. The connected Supabase tools do not expose these settings.
2. Verify a real magic-link email, callback, user session, Edge Function save, second-device restore, and account deletion using a disposable test account. SQL rollback tests do not establish email delivery or the complete authenticated HTTP flow.
3. Only then enable the public Supabase URL/key in the production web build and redeploy. Vercel's connected account returned HTTP 403 for environment-variable listing, so hosted variable management could not be verified through that connection.
4. For the native app, implement callback/session exchange and complete physical-device/provider tests. Apple sign-in also requires valid provider configuration and token-revocation verification.

AI study generation and a self-hosted scripture corpus are not deployed. Neither is required by the current local-first reading product; keep AI study disabled until implemented.
