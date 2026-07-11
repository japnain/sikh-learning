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
- SwiftUI native iOS target

## Local Development

```bash
npm ci
npm run dev
```

## Release Configuration

Public Support and Privacy URLs are committed in `.env.production` for web and native production builds. Use `.env.example` when configuring another environment:

- `VITE_APP_VERSION`: release version included in anonymous diagnostics
- `VITE_SUPPORT_URL`: verified public HTTPS support page
- `VITE_PRIVACY_URL`: verified public HTTPS privacy policy
- `VITE_DIAGNOSTICS_ENDPOINT`: optional HTTPS endpoint for allow-listed failure events

More falls back to the internal Support and Privacy routes when external URLs are absent. External links accept only credential-free HTTPS values. Diagnostics stay disabled until an endpoint is configured; enabled payloads contain only an event code, source, fatal flag, app version, and pathname without query data. Error messages, stacks, scripture, saved content, account identifiers, and local-storage values are never included.

Any release that enables Supabase sign-in must deploy both `merge-local-state` and `delete-account`. The deletion function validates the caller's session and deletes that same auth user; schema foreign keys cascade deletion through synced NaamRas records.

## Quality Checks

```bash
npm run lint
npm run build
npm test
npm run native:generate-catalog
npm run native:build
```

`native:build` requires an installed iOS Simulator platform matching the local Xcode installation.

## Data

Scripture and translation data is sourced from BaniDB. The native catalog contains metadata for 103 unique BaniDB readings and loads their scripture lines on demand; it does not bundle synthetic catalog lines.
