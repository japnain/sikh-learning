# Bani catalog live-data validation — 1 November 2026

## Result

All 104 exact BaniDB catalog payloads were acquired from the live provider and replayed through production `fetchBani`. The audit covered 120 requests: each default reading and all four requested bands for Chaupai, Rehras, Aarti and Sohila. These represent 114 distinct readings, including 14 distinct selectable variants.

This report records provider compatibility and automated validation. The subsequent semantic Contents implementation and current browser results are documented in the [reader rollout report](bani-reader-rollout-20261101.md); this compatibility audit alone is not visual or physical-phone approval.

## Loading defects fixed

The live responses for Gur Mantar (1), Shabad Hazare (3), Ardaas (24), and Barah Maha Savaiyaa (28) normalized to complete, nonempty readings but failed `isExactBaniReading`. `useBani` uses that gate before displaying fresh responses as well as prepared/offline readings, so this was a loading failure rather than only a cache issue.

The API and validator previously derived fallback route sources from the smaller `BANIS` collection. Both now use `getBaniRouteSource`, covering the complete exact Read catalog and standalone Ardaas. Barah Maha Savaiyaa receives its DG route context. Missing original attribution continues to display the neutral Sundar Gutka label; route context does not establish scripture provenance.

Four captured-response regressions verify complete original row sequences, neutral attribution, fresh-reader acceptance, saved-data acceptance and wrong-bani rejection. The cache test fixture builder now uses the full exact catalog so its DG variants carry valid source context. Cache capacity, eviction, protections and wrong-reading rejection assertions remain intact.

## Audit evidence

| Bani | Distinct normalized row counts |
| --- | --- |
| Chaupai | 104 / 130 / 173 |
| Rehras | 306 / 337 / 439 / 521 |
| Aarti | 61 / 82 / 230 |
| Sohila | 54 / 61 / 86 / 145 |

Rows include structural headings and are not counts of authored stanzas. The normalization audit found no dropped or reordered selected rows, changed internal Gurmukhi, duplicate entry IDs, original-page/header mismatches or observed source-switch collisions. Existing text cleanup trims one trailing U+0020 from Aarti local row 3510 in long (and its extra-long alias), and Ardaas local row 3731. No new scripture editing was introduced.

Before/after replay reports and the temporary Vitest audit harness remain under `tmp/reader-live`. The reusable research checkpoint is `scripts/qa/fixtures/bani-structure-snapshots-20261101.json.gz`:

- 104 payload projections with every original Gurmukhi row and structural field.
- Original acquisition metadata and hashes, including provider URLs and retrieval times.
- Translation, transliteration, larivaar and visraam omitted; this is research/test data, not shipped scripture data.
- Gzip size: 1,287,649 bytes.
- SHA-256: `f386515ae2d16081857d05f8182345c669d6c97aaccd9fdf5ec6e0e43a1c1256`.

The four loading-failure fixtures and their provenance are also preserved uncompressed under `src/test/fixtures/bani-sections/unattributed-banidb-2026-11-01.json`.

## Checks

137 targeted tests passed across API normalization, fresh-reading validation, offline cache, useBani, Japji sections and scroll architecture. TypeScript, scoped ESLint, production build, diff whitespace and CSS selector checks passed. Startup assets remain within budget: 151.4 KiB gzipped JavaScript and 12.8 KiB gzipped CSS. No scroll handlers, header behavior, verse layout or rendering changes were made in this follow-up.

## Structure research

- [Sukhmani, Anand and Salok Mahalla 9](bani-structure-research-20261031.md)
- [Jaap and the daily-prayer variants](bani-variant-structure-research-20261031.md)
- [Vars, acrostics and SGGS salok collections](bani-sggs-structure-research-20261101.md)
- [Remaining raag collections and shorter SGGS readings](bani-catalog-structure-research-20261101.md)
- [Other Dasam selections, Aarti and Ardaas](bani-other-structure-research-20261101.md)
- [Implementation contract and subsequent updates](bani-sections-implementation-20261101.md)

The reports distinguish provider observations, independently sourced structure and unresolved cases. For example, Vaar Manjh's provider response has a separate 17-row Gauri shabad after its concluding pauri. An index must not silently hide those rows or pretend they are another pauri. Provider paragraph counts and numeric header levels are not universal semantic unit definitions.

## Current rollout and browser status

Semantic Contents is integrated for all **104 exact readings and 114 distinct versions**. The superseding [all-target browser baseline](evidence/reader-20261101/deep-all-targets.json) now clicks all **2,411 targets** at 390×844 Study/Light, matching 27,321 normalized rows and every expected target index/ID. All **124 Return sequences** restore scroll with 0px delta and clear exploration state. Document, Contents and literal-label language checks pass.

The [enlarged-text matrix](evidence/reader-20261101/deep-enlarged-text.json) also passes all **114 versions** at 320×740 Dark/Read with 32px root text and 34px Gurbani text. Its **508 exact current-index checks** include all 203 repeated-label targets; all 114 Return sequences restore position and reading-anchor focus. No horizontal overflow or row-layout failure is recorded. The [earlier 321-jump baseline](evidence/reader-20261101/all-final-browser.json) and initial family diagnostics remain historical evidence, superseded by these deeper matrices.

The refreshed [code review](evidence/reader-20261101/deep-code-review.json) records **697 tests across 22 files in one combined run after the final copy change**, plus passing application TypeScript, scoped lint, build and startup budget. [Nine representative screenshot reviews and actual Find/keyboard/locale checks](evidence/reader-20261101/deep-visual-and-keyboard.json) are complete. The final header-timing fix has a passing delayed-ResizeObserver regression and [114-version / 321-jump middle-first browser recheck](evidence/reader-20261101/deep-final-header.json). The localized Contents units are [screenshot-verified in Punjabi/Hindi](evidence/reader-20261101/deep-locale-final.json), and the [final English Sukhmani preview](evidence/reader-20261101/deep-final-preview.json) preserves its expected section, body excerpt and saved place.

The recorded Chromium audit is complete. See the [reader rollout report](bani-reader-rollout-20261101.md) and [deep-audit report](bani-contents-deep-audit-20261101.md) for exact evidence scopes and distinctions between whole-reading singletons, printed-heading groups and a complete hymn index. The matrices do not imply human visual inspection of every reading or physical-iPhone/Safari/PWA/Capacitor approval.
