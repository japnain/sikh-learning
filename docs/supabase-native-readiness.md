# NaamRas Native and Supabase Readiness

The SwiftUI app is local first. BaniDB supplies scripture on demand; Supabase is an optional account and state-backup layer.

## Configure Supabase

1. Create or select the Supabase project.
2. Run `supabase/schema/001_naamras_native_core.sql`.
3. Deploy `supabase/functions/merge-local-state` and `supabase/functions/delete-account`.
4. Enable Sign in with Apple and register bundle id `com.naamras.app`.
5. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the native Xcode build settings.
6. Set the web variables documented in `.env.example` when running the reference app.

## Native App Behavior

- Guest mode persists onboarding, appearance, reader settings, bookmarks, and reading progress on device.
- Four tabs ship: Home, Read, Saved, and More, each with its own `NavigationStack`.
- Onboarding has four steps: intent, script, support, and reader preview.
- The reader supports script switching, transliteration, meaning language, font size, alignment, bookmarks, progress, loading, retry, and unavailable states.
- `NativeCatalog.json` contains 103 unique BaniDB IDs. The app fetches real scripture lines from BaniDB when a reading opens and never maps unsupported library entries to fixture content.
- Sign in with Apple is shown only when Supabase is configured. Native email magic-link UI remains disabled until a complete deep-link callback flow is implemented and verified.
- Sync sends a local snapshot to `merge-local-state`, which upserts user-owned state under RLS.
- Connected users can sign out or confirm permanent account deletion. `delete-account` validates the caller's access token, deletes that same Supabase auth user with the server-side service role, and relies on `on delete cascade` for synced NaamRas rows.

## Release Checks

- No IAP, subscriptions, paid locks, or restore-purchase UI exists in the native target.
- The privacy manifest declares user id and user content for app functionality and no tracking.
- If cloud backup ships enabled, verify account deletion for every enabled provider and confirm Sign in with Apple token revocation behavior before submission. Keep Supabase configuration absent from the release otherwise.
- Verify BaniDB first-load, retry, and offline behavior on a physical device before submission.
