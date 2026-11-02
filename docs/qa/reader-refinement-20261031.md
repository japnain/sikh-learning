# Reader refinement — 31 October 2026

Follow-up: the [1 November catalog validation](bani-catalog-validation-20261101.md) covers all 104 provider payloads, fixes four real reading-loading failures and records the broader structural research. Visual approval and the all-bani semantic Contents rollout remain pending.

## Implemented

- The shared toolbar keeps its title alongside the actions at ordinary phone text sizes. Full reading context scrolls with the opening content. Enlarged interface text may reflow; the toolbar does not hide or animate its height during scrolling.
- Gurbani keeps Read/Study and Contents in its second toolbar row. Temporary exploration uses the identity slot for Return/Stay instead of adding another row. Bani length is available in the opening and Reading tools.
- Appearance has a text-layout reset that retains language and translation-source choices. The redundant mode selector in Reading tools is removed; the appearance preview retains its useful mode switch.
- Touch readers have visible verse action buttons with reserved space, native text selection and no-scroll focus restoration. Hindi meanings use the existing Devanagari font and language metadata.
- Reading progress uses the measured unobstructed viewport. Story jumps clear the measured header; book, story and Rehat appearance changes preserve their passage anchors.
- Prose readers share Paper/Sepia/Night preferences. Books support Find within Contents. Stories put Find in Contents when sections exist, keeping at most three toolbar actions.
- Rehat saves revision-checked paragraph locations and appears in Continue Reading. Search exploration does not silently replace the saved reading position.
- Missing provider attribution retains the neutral Sundar Gutka label instead of claiming a fallback scripture source.

## Verified composition navigation

Japji has a checked index of its opening salok, 38 pauris and closing salok. Original text, page and verse identities remain unchanged. Metadata and source references are in `src/content/japjiSections.ts`.

The index requires matching bani identity, source, unique opening anchors, expected Angs and the complete ordered numbered conclusions. Synthetic title-only groups may lack attribution but cannot become targets. Incomplete, ambiguous and unsupported readings retain source-page navigation. Other banis, including Sukhmani, do not receive inferred composition labels.

The current section is captured when Contents opens. Building the index and updating its marker add no work during active scrolling.

## Validation

- Integrated reader regression: 18 suites, initially 322 of 323 passed. The remaining source-label regression was fixed, not removed.
- Latest targeted Study and composition rerun: 98 tests passed, including six additional synthetic-header regressions. Across those runs, 329 distinct reader/scroll tests have passing results.
- Separate Read/reader integration: 140 tests passed, including the central scroll architecture and the adapted search-reveal scroll listener.
- TypeScript, scoped ESLint, production Vite build, startup-bundle budget and CSS selector audit passed. Build output is isolated under `tmp/reader-refinement-build`.
- The native document remains the main scroller. Header height-only viewport changes remain excluded from layout work. Progress and persistence regression tests cover settled scrolling and paragraph/verse restoration.

## Live-data follow-up

On 31 October, the live BaniDB Japji endpoint was reached in the browser and its complete response was captured independently. It contains 385 rows and omits `shabadId` throughout. The original navigation validator incorrectly required positive shabad IDs, which would have suppressed the pauri list for this valid reading. That requirement is removed; source, checked opening text, Ang, ordering, unique in-reading verse IDs and complete numbered conclusions are still checked.

The captured response now passes through the production `fetchBani(2)` normalizer in a persistent regression test. All 385 original rows are preserved and all 40 section targets resolve correctly, including Pauri 36 on Ang 7. Truncating the closing salok still falls back to source pages. The fixture removes modern translations and transliterations while retaining all original Gurmukhi and structural metadata, with provenance and hashes alongside it in `src/test/fixtures/bani-sections/`.

The helper and captured-live integration suites pass 31 tests. The combined helper, captured-live, continuous-reader and scroll-architecture run passes 88 tests. TypeScript, scoped ESLint and diff whitespace checks also pass. This verifies actual provider compatibility and automated reader behavior, not browser layout or touch behavior.

Research for the remaining catalog is recorded in `bani-structure-research-20261031.md` and `bani-variant-structure-research-20261031.md`. Expansion remains gated on the user's requested visual check of the updated Japji reader. The catalog contains 104 exact BaniDB readings; composition navigation for those other readings has not been enabled.

After that gate, the implementation sequence is:

1. Add the researched profiles for Sukhmani (24 ashtpadis with preceding saloks), Anand, salok collections, Jaap chhands, savaiyye and the composite daily-prayer variants. Resolve targets against the selected loaded reading; do not infer global IDs from bani-local verse IDs.
2. Inventory the remaining exact catalog payloads and verify profiles for vars, raag/shabad collections, acrostics and other compositions. Do not impose one numbering parser on every structure. Very short, indivisible readings need no artificial subdivisions.
3. Replace the shared "Saloks and pauris" Contents heading with a neutral localized heading when supporting multiple structures. Keep original excerpts and source-page fallback, with the preceding salok grouped with its ashtpadi where appropriate.
4. Validate each distinct normalized length, incomplete payload fallback and exact jump/return behavior. Repeated headings, revisited source pages and mixed sources are valid for some compositions; identities need occurrence context.
5. Keep section calculation tied to payload/variant changes and the current marker tied to opening Contents. Add no active-scroll scans or React updates, and retain the native document scroller and persistent header.

Coverage must distinguish research complete, live anchors checked, automated behavior checked and visual behavior checked. Existing catalog mocks reuse a generic response for most IDs, so they cannot establish structure coverage for all 104 readings.

## Verification limits

The local preview listener was denied with EPERM, including a fresh attempt after the workspace connection recovered. Browser control recovered sufficiently to read the real BaniDB response; this does not make the unserved local app available for visual testing. The browser URL policy rejected the earlier local-file layout probe; no workaround was used. No fresh screenshot of the updated reader or physical iPhone swipe comparison is claimed.

To unblock the visual gate, run `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4199 --strictPort --configLoader runner` from the project in the user's terminal, or supply an accessible preview containing these local changes. Test Japji Contents, current-section marker, exact jumps, Return/Stay, persistent header, text sizing and reading themes before expanding composition navigation.

Before release, verify small phones, long titles, 200% interface text, safe areas and landscape; touch verse targets; long Sukhmani flicks and slow drags; Safari, installed PWA and Capacitor; font loading, appearance sheets, section/search jumps and returning to the prior place. Live Japji data compatibility is now checked as described above; unfamiliar payload variants safely fall back.

No commit, push or deployment was performed by this task. Existing and concurrently edited workspace work was preserved.
