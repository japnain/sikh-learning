# NaamRas backend and native readiness

The shipping web app and Capacitor `App` target are local first. Supabase supplies optional authentication, PostgreSQL state backup, and a BaniDB proxy. Scripture still comes from BaniDB; this is not a self-hosted scripture corpus. The SwiftUI `NaamRasNative` target is experimental.

## Provisioning order

1. Apply the SQL in `supabase/schema/` in numeric order: core schema 001, atomic sync 002, saved-item contract 003, and access hardening 004. Inspect existing migration history before applying anything to an existing project.
2. Deploy `merge-local-state`, `delete-account`, and `banidb-proxy`. Merge requires `merge_naamras_cloud_snapshot_v3`; a v2-only database cannot serve the current client.
3. Verify user ownership policies, grants, merge round trips, and deletion cascades using `supabase/tests/backend-transaction-smoke.sql`. The test creates isolated fixtures inside a transaction and rolls everything back.
4. Configure Auth's Site URL to `https://naamras.xyz` and allow the actual web callback routes. Verify custom SMTP and a real email magic-link round trip before enabling public sign-in. Supabase's default email service is not a general production mail service.
5. Set the public client URL and publishable key through `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the latter retains its legacy variable name). Never put a secret or service-role key in any `VITE_` variable. Do not enable production backup until step 4 passes.
6. Rebuild and deploy the web client. Verify a disposable account's save, second-device restore, sign-out, and account deletion through the deployed Edge Functions.

The client discovers enabled Apple/email methods from public Auth settings and hides methods that are disabled or cannot be verified. Existing account sync does not wait for that discovery. A failed check is retried on reconnect or page reload.

`banidb-proxy` is public scripture infrastructure: it accepts the project API key without requiring a user session. Transient network/5xx proxy failures can retry BaniDB directly when `VITE_NAAMRAS_BANIDB_DIRECT_FALLBACK` is enabled. Cancellations and 4xx/429 responses are not retried through the fallback.

## Audio and optional features

Leave `VITE_SUPABASE_AUDIO_BUCKET` blank to use bundled ambient audio. Configure it only after the files exist in a public bucket; configuring cloud accounts alone does not switch audio storage.

`generate-study-response` is not deployed. Keep `VITE_SUPABASE_ENABLE_STUDY_AI` disabled unless a separately reviewed implementation is deployed. This is not required for reading or saved-state backup.

## Native release limits

The shipping Capacitor target lacks the OAuth/magic-link deep-link callback integration. Its sign-in methods remain hidden even when the web build is configured. Do not infer native authentication readiness from web tests.

Before enabling native sign-in, implement and test URL handling and session exchange on a physical device, configure provider redirects, verify Apple credentials if Apple sign-in is offered, and verify Apple token revocation on account deletion. Review App Store privacy disclosures for the enabled release. Existing BaniDB first-load, retry, and offline behavior also require physical-device verification.

## Audit record

See `docs/qa/backend-readiness-20261111.md` for observed production state, completed verification, and remaining external setup.
