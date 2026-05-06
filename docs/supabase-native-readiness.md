# NaamRas Supabase Native Readiness

NaamRas now has a Supabase-first native path for the SwiftUI App Store build. InsForge runtime files, scripts, schema, and dependencies have been removed from the active app path; the React app now uses `src/supabase/*` as the reference runtime while the native target reaches parity.

## Apply Supabase Backend

1. Create or select the Supabase project.
2. Run `supabase/schema/001_naamras_native_core.sql`.
3. Deploy these Edge Functions:
   - `supabase/functions/banidb-proxy`
   - `supabase/functions/merge-local-state`
4. Enable Sign in with Apple in Supabase Auth and register bundle id `com.naamras.app`.
5. Set native Xcode build settings:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
6. Set web/reference environment variables from `.env.example`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_FUNCTIONS_URL`
   - `VITE_SUPABASE_BANIDB_FUNCTION`
   - `VITE_SUPABASE_MERGE_FUNCTION`

## Native App Behavior

- Guest mode is fully local and persists onboarding, reader settings, bookmarks, saved Learn items, and reading progress.
- The SwiftUI shell uses five tabs: Home, Read, Learn, Saved, and More, each with its own `NavigationStack`.
- Onboarding is a real five-step setup: intent, script, support density, reader profile, and account/preview.
- Reader flows include script switching, transliteration, meanings, vishraam notes, word lookup sheets, bookmarks, and progress.
- Read and Learn include filter lanes backed by `NativeCatalog.json`, generated from the web product data with `npm run native:generate-catalog`. The current bundle includes 111 reading entries and 470 Learn/library entries, so Nitnem, Banis, Keertan, Rehat, Panth Prakash/library, scripture search, topics, shabads, collections, guidance, and vocab review are reachable without placeholder screens.
- Sign in with Apple uses `AuthenticationServices` and Supabase `signInWithIdToken`.
- Email magic link uses Supabase OTP.
- Sync sends a local snapshot to `merge-local-state`, which upserts profile, reader preferences, bookmarks, learning state, and reading progress under RLS.

## App Review Notes

- No IAP, subscriptions, paid locks, or restore-purchase UI exists in the native target.
- BaniDB remains the scripture source; Supabase only brokers safe read requests and user-owned sync.
- The native privacy manifest declares user id and user content for app functionality and no tracking.
