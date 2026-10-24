# Naamras Sikh Stories

Implemented inside **Read → Stories**, with continuous English reading and the existing Naamras navigation, colours, Saved shelf and Book reading preferences. The starter collection contains eight original English retellings and profiles. No new backend or sign-in is required.

The [research](.lazyweb/design-research/sakhi-stories-2026-10-21/report.html), [visual brainstorm](.lazyweb/design-brainstorm/sakhi-stories-2026-10-21/report.html) and [Matter reference](docs/design/stories-matter-reference.md) record the direction and its sources. Matter's published library/article screens informed title hierarchy, continuous serif prose and quiet controls; the implementation uses Naamras's own design system.

The next content phase is documented in the [22 October source audit and expansion plan](docs/plans/2026-10-22-stories-source-audit-and-expansion-plan.md): provenance for all eight readings, deeper source reservoirs, editorial/model gaps, and a staged pilot-first expansion.

## Content expansion — 23 October

- [x] Migrated the eight source packages with page locators, source roles, primary-text anchors, rights records and individual evidence dossiers. Metadata refreshes retain the first reading revision and its paragraph positions.
- [x] Shared runtime/build validation now supports modern research citations, undated witnesses, explicit rights/review records, sections, series, related readings and catalog featuring.
- [x] Prepared three unpublished pilots: Khalsa (1,539 words), Mardana (1,392), and an expanded Khivi profile (786). The Mardana fallback follows the plan because the full Kanhaiya source was not acquired.
- [x] Added development-only previews in the same reader at `/stories/drafts`, with section navigation and no writes to published Saved/reading state. Production excludes the draft modules and texts.
- [x] Documented the [editorial workflow](content/stories/README.md) and added a browser acceptance harness. Current execution and any remaining checks are recorded in the [QA evidence](docs/qa/stories-reader-20261023.md).
- [ ] Complete independent English and Sikh history/Gurmat reviews, final scan comparisons and any outstanding edition checks before publishing the pilots.

## Delivered

- [x] Dedicated story types, catalog, paragraph identifiers, source locators, retelling notes and corpus validator. Run `npm run stories:verify`.
- [x] Eight source-grounded readings: Lalo and Malik Bhago; Mata Khivi; the sacred thread; Amar Das's service; Sajjan; Haridwar; the needle; the milk and the gold. The original 1909 Macauliffe volumes are the source editions. Each JSON contains a precise passage reference. Sacha Sauda and four other candidates were omitted because the inspected material did not support their planned treatments.
- [x] Three curated collections: Seva & dignity, Courage & conscience, Lives transformed. Search covers titles, people and themes; filters survive opening a story and returning.
- [x] A continuous reader with adjustable size, spacing and width, shared Book preferences, app theme, source/glossary sheet and next-story sequence. Symbolic artwork avoids invented historical scenes.
- [x] Integration into Read, focused reader routes, document titles, navigation and the existing Saved shelf. Saved search and remove/undo include stories.
- [x] Device-local saves and revision-aware paragraph resume, including reload and text-size changes. Existing cloud bookmark formats are unchanged; story state is not included in cloud sync.
- [x] Durable offline text downloads with actual progress, partial failure/retry, revision invalidation and removal. The service worker already caches the built reader code; downloaded text and catalog are stored separately.
- [x] 142 focused and adjacent tests, app TypeScript check, full ESLint, production Vite build, startup bundle audit, story corpus validation and existing library validation. Capacitor asset/plugin sync passed.

## Remaining validation and editorial work

- [ ] Fresh visual checks at 320px, phone and desktop, in light/dark and large text, including source sheet and keyboard focus. The available browser preview served an older archived release; creating a fresh local server was denied by the sandbox. No current-build screenshot or automated visual/accessibility pass is claimed.
- [ ] Native build and device check. Xcode was blocked by access to its caches and Simulator services after Capacitor sync succeeded.
- [ ] Independent English editorial and Sikh history/Gurmat review. These are original sourced drafts, not scholar-approved editions. The account sheets distinguish traditional sakhis from historical profiles and retain the source's miraculous elements as traditional claims. Expand beyond eight only when the source evidence and prose warrant it; do not pad the collection to twelve.

## Content maintenance

Keep catalog summaries identical to their story files. Word counts use whitespace-delimited prose words; reading time is rounded up at 200 words/minute. Increase the revision when changing a reading so old paragraph positions and offline copies are not silently applied to new text. Validate sources and rights for every addition; public availability alone does not grant reuse of a modern translation or adaptation. The modern Panth Prakash translation remains outside this seed corpus.

To reproduce the production check in this sandbox, use Vite's runner config loader and a writable temporary cache, then run the startup audit and `scripts/copy-public.mjs`. TypeScript's incremental output also needs a writable temporary path because the dependency directory is shared and read-only.
