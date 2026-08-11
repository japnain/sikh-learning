# NaamRas

NaamRas is a mobile-first Gurbani reading companion built around a calm, direct path into the text.

## Product Shape

- `Home`: a daily doorway into the next reading and saved return points
- `Read`: exact BaniDB banis, source-range browsing, search, and reader controls
- `Saved`: bookmarks, vocabulary, and reading progress
- `More`: appearance, language, reading support, privacy, and optional backup

The reader keeps Gurbani primary while making transliteration, meanings, source context, and word lookup available as progressive support.

## Current Focus

- fast first access to scripture on phone and tablet
- honest product states with no placeholder catalog content or dead actions
- accessible dialogs, controls, navigation, and theme behavior
- local-first bookmarks and progress with optional Supabase sync

## Stack

- React, TypeScript, Vite, and Tailwind CSS
- Zustand
- Supabase Auth and Edge Functions
- BaniDB v2
- Capacitor 8 iOS wrapper for the same React/Vite product shipped at `naamras.xyz`
- An experimental SwiftUI target remains in the Xcode project, but it is not the App Store product

## Local Development

```bash
npm ci
npm run dev
```

## Release Configuration

Public Support and Privacy URLs are committed in `.env.production` for web and packaged iOS production builds. Use `.env.example` when configuring another environment:

- `VITE_APP_VERSION`: release version included in anonymous diagnostics
- `VITE_SUPPORT_URL`: verified public HTTPS support page
- `VITE_SUPPORT_EMAIL`: optional verified, monitored public support inbox; omit it until one exists
- `VITE_PRIVACY_URL`: verified public HTTPS privacy policy
- `VITE_DIAGNOSTICS_ENDPOINT`: optional HTTPS endpoint for allow-listed failure events

More falls back to the internal Support and Privacy routes when external URLs are absent. External links accept only credential-free HTTPS values. Diagnostics stay disabled until an endpoint is configured; enabled payloads contain only an event code, source, fatal flag, app version, and pathname without query data. Error messages, stacks, scripture, saved content, account identifiers, and local-storage values are never included.

Any release that enables Supabase sign-in must deploy both `merge-local-state` and `delete-account`. The deletion function validates the caller's session and deletes that same auth user; schema foreign keys cascade deletion through synced NaamRas records.

Saved-item sync v3 has a strict rollout order: first apply `supabase/schema/003_naamras_cloud_sync_v3.sql`, then deploy the updated `merge-local-state` Edge Function, and only then deploy the web/iOS client. The v3 Edge contract intentionally rejects older v2 snapshots so an installed stale client cannot collapse route-specific or book bookmarks; those clients keep their local data and can sync again after updating.

## Quality Checks

```bash
npm run lint
npm run build
npm test
npm run ios:sync
npm run ios:build
npm run qa:app-store -- --live
```

`ios:sync` builds the same production assets served by `naamras.xyz` and copies them into the Capacitor `App` target. `ios:build` requires an installed iOS Simulator platform matching the local Xcode installation.

`qa:app-store` rebuilds the Release app and verifies the shipping target, versions, export and privacy declarations, signed third-party SDK artifacts, icon, screenshot, metadata limits, and web-to-iOS asset parity. Add `-- --live` before upload to compare the bundled entry assets with the current `naamras.xyz` deployment and recheck the public Support and Privacy routes.

For App Store work, use the shared `App` scheme in `ios/App/App.xcodeproj`. The launch configuration is iPhone-only, iOS 17+, bundle id `com.naamras.app`, version `1.0` build `1`.

## Data

Scripture and translation data is sourced from BaniDB-backed lookup flows. Direct production requests disclose search terms or requested content paths and the requesting IP address to BaniDB/Khalis Foundation as described on the Privacy page. NaamRas also bundles its curated local library content and stores guest preferences, bookmarks, vocabulary, and progress on the device.

The App Store release gates for third-party content rights, BaniDB terms/privacy confirmation, and the bundled Panth Prakash age rating are documented in `docs/app-store/content-rights-and-provider-audit.md` and `docs/app-store/age-rating-evidence.md`. Do not submit the binary until those owner/provider decisions are complete.
