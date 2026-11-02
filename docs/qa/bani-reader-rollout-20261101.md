# Bani reader rollout — 1 November 2026

## Implemented coverage

Semantic Contents is integrated for **104 exact catalog readings, 114 distinct normalized versions, and 2,411 navigation targets across those versions**. Completed 2 November: all **2,411 targets were clicked in the browser**, all **114 versions passed the 320px enlarged-text matrix with 508 exact current-index checks**, and a final **321-jump middle-first recheck** passed after the header-timing fix. Representative screenshot, keyboard, Find, locale and final-build preview evidence is complete in the [deep-audit report](bani-contents-deep-audit-20261101.md), with its precise device and coverage limits.

| Profile family | Catalog readings | Distinct versions | Navigation targets |
| --- | ---: | ---: | ---: |
| Japji, independent checked engine | 1 | 1 | 40 |
| SGGS long compositions, vars and salok collections | 33 | 33 | 1,213 |
| Remaining catalog collections and shorter readings | 52 | 52 | 662 |
| Dasam selections and composite daily prayers | 18 | 28 | 496 |
| **Total** | **104** | **114** | **2,411** |

The four length-configurable readings account for 14 distinct versions: Chaupai 3, Rehras 4, Aarti 3, and Sohila 4. The other 100 readings each have one version. Chaupai and Aarti's extra-long request aliases resolve to their reviewed long version and do not add a distinct text. Three browse-only catalog entries remain outside this exact-reading scope.

The family exports are in `src/content/baniSections/`, assembled by its `index.ts`. Research, source URLs and structural exceptions are documented in the [catalog validation report](bani-catalog-validation-20261101.md) and its linked family research reports.

## Reader behavior and matching

- Contents presents Find, a localized **Sections** index, and source-page navigation. Labels match each reviewed composition: pauris, saloks, ashtpadis, shabads, chhands, savaiyye, printed headings, or a single whole-reading entry where appropriate.
- Sukhmani shows **24 Ashtpadis**. Each jumps to its preceding salok heading; its excerpt comes from the ashtpadi body opening. The first implementation uses a compact flat parent list rather than exposing 192 stanza children.
- Every reading, including Japji, requires a complete ordered normalized-reading fingerprint. Japji additionally retains its independently checked opening salok, 38 pauris and closing salok; only validated zero-ID synthetic display headings are excluded from its fingerprint. Interior deletion, reordering or changed text falls back to source pages. Other readings use reviewed static profiles scoped to exact bani identity.
- The versioned fingerprint uses two 32-bit accumulators over deterministic row serialization: local verse ID, original page, exact Gurmukhi, header flag/level, loaded source and attribution status. It is a non-security identity guard, not proof of authorship or a cryptographic signature. It is computed once during the existing reading memo; no asynchronous fetch/cache hash pipeline was added.
- A profile resolves only if its fingerprint matches uniquely, loaded positive local IDs are unique, section starts are strictly ordered, and every excerpt lies inside its section. Missing, truncated, reordered, conflicting or unfamiliar content retains source-page navigation. No partial semantic index is presented as complete.
- Targets use loaded `entryIndex`/`lineIndex` coordinates. `/banis` verse IDs are scoped to the reading and are never treated as canonical cross-API verse or shabad links. Route names and accepted variant aliases are checked against the exact catalog.
- Unavailable original attribution remains neutral: **Sundar Gutka / Page**, not an asserted SGGS or Dasam source. Semantic targets omit an original page when it is unknown; an inherited display page does not become source evidence. A route-source hint may still support loading without changing that presentation.

The real-data loading failures for Gur Mantar 1, Shabad Hazare 3, Ardaas 24, and Barah Maha Savaiyaa 28 were also corrected. The API and fresh/offline validator now share the complete route-source lookup; all captured fresh readings pass validation while unknown attribution stays neutral.

## Source preservation and scrolling

Navigation metadata does not rewrite scripture, renumber printed stanzas, remove headings/mangals/rahau/colophons, or reorder repeated pages. Every selected provider row survives the real normalizer. The existing normalization policy for length flags and upper mangals remains the source of the selected reading; the profile engine does not introduce another text filter.

The acquisition/replay audit found no internal Gurmukhi change, dropped or reordered selected row, original-page/header mismatch, duplicate normalized entry ID, or metadata-observable source-switch collision. Existing `safeText().trim()` removes one trailing U+0020 from Aarti local row 3510 in long and its alias, and Ardaas local row 3731. These pre-existing edge-whitespace differences are recorded explicitly; no new scripture edits were introduced.

The main scroller remains the native **HTML document**. The header stays persistent without scroll-driven hiding or height animation. Section calculation depends on reading changes; the current section is captured when Contents opens. No new active-scroll scan, scroll listener, progress update or React update was added by semantic navigation. Exact jumps reuse the measured header offset and existing Return/Stay exploration behavior.

## Automated verification

| Check | Result |
| --- | --- |
| Final combined API/profile/reader/anchor-caller run | **697 tests passed across 22 files in one run**, including the last header-timing regression |
| Application TypeScript and scoped ESLint | Passed; lint covers the six reviewed application/test files |
| Production build and startup budget | Passed; **151.4 KiB JS gzip / 12.8 KiB CSS gzip** |

The [latest code-review record](evidence/reader-20261101/deep-code-review.json) records that combined run repeated after all fixes, including the final Contents-unit copy change. It supersedes the earlier 646- and 696-test results; focused intermediate counts are not added again. The shared integration suite replays all 114 distinct readings through production `fetchBani` and integrated `getBaniSections`, checking targets, excerpt boundaries, source/page treatment, selected row streams, fallback guards and the two extra-long aliases. Reader regressions also cover clamped destinations, accepted Stay destinations, exact-line/returned-line focus, next Tab, language tags, IME Escape and delayed ResizeObserver header measurement. The current production Study chunk is **433.67 kB raw / 86.50 kB gzip**; startup remains within budget. CSS selector checks passed for 28 files.

Reproducible artifacts:

- `scripts/qa/fixtures/bani-structure-snapshots-20261101.json.gz`: all 104 captured structural projections with acquisition provenance; test/research data, not runtime scripture.
- `scripts/qa/fixtures/bani-sections-browser-cases-20261101.json`: all 114 route cases, normalized row/section counts and fingerprints, plus exact first/middle/last targets and excerpts.
- `scripts/qa/fixtures/bani-sections-all-targets-20261101.json`: every reviewed target and index for all 114 versions.
- `scripts/qa/fixtures/bani-sections-{sggs,catalog,dasam-composite}-coverage-20261101.json`: family coverage records.
- `src/utils/baniSectionProfiles.catalog.test.ts`: actual-normalizer integration and opt-in browser-manifest generator.

## Live browser checks completed

The browser checks used the HTTP preview at `http://127.0.0.1:4199`; the earlier connection-refused/server gate was resolved.

**Japji:** the root task completed the live gate at 320px and 390px widths, in Read and Study, light and dark themes, and 200% interface text. That check exposed 18px of horizontal overflow. The per-page appearance header now wraps; Contents uses adaptive padding and stacks source-page rows at enlarged interface text. The follow-up gate passed with those fixes.

**Sukhmani:** the real reading loaded all **2,019 rows and 24 sections**. First, middle and last section jumps reached the preceding salok headings at local IDs **5232, 6247 and 7166**. Each target cleared the persistent header, the current marker identified Ashtpadi 1, 13 or 24, and Return restored the prior location with measured **0px delta** and cleared exploration state. Read/Dark and Study/Light were checked at 390×844; 320×740 with the largest 34px Gurbani font was also checked. No horizontal overflow was observed and the primary scroller was HTML.

Sukhmani measurements and limitations are in [sukhmani-visual.json](evidence/reader-20261101/sukhmani-visual.json). The browser screenshots were visually inspected during the session but were not saved because the browser tool rejected the requested workspace output path. This report does not present a screenshot archive that does not exist.

**Length controls:** Chaupai, Rehras, Aarti and Sohila passed the actual Reading tools → Bani length → Short to Long flow. The verified destination was available before applying the selection, the optional usual-Nitnem checkbox stayed unchecked, and the resulting reading and Contents counts matched the chosen version. Rehras was checked at 320px width; the other three at 390px. No horizontal overflow was observed. See [length-switching.json](evidence/reader-20261101/length-switching.json).

**Final-section location and Stay:** the initial catalog pass exposed six current-marker errors when the browser reached its maximum scroll position before a short final section could reach the header. The selected destination is now retained while its route, loaded reading, connected target and settled position remain valid. Return still restores a separate original anchor. Stay saves the first actual body line at or after the chosen target, including when the target is a heading; subsequent unchanged saves retain that line. Natural scrolling or a different reading discards the preference. The existing settled-scroll path is reused, with no new scroll listener.

Live checks of Sri Bhagauti Astotr, Salok Mahalla 9 and Salok Sheikh Farid Ji passed this complete Stay flow. Removing Return/Stay shortened the final scroll position by 6–7px; the correct body verse survived that clamp and subsequent scrollend/pagehide saves. Scrolling upward 500px then saved the newly visible verse. Evidence: [stay-browser.json](evidence/reader-20261101/stay-browser.json).

## Superseding deep browser coverage — 2 November

The [all-target baseline](evidence/reader-20261101/deep-all-targets.json) independently matches all **114 versions / 104 readings**, **27,321 rows** and **2,411 Contents entries**, with every expected target index clicked once. At **390×844 Study/Light**, all 2,411 target IDs, line-focus, visibility, expected current-label and geometry checks pass. All **124 Return sequences** restore the prior scroll position with **0px delta** and clear exploration state. All **250 literal Gurmukhi labels** have the correct language metadata.

The [enlarged-text matrix](evidence/reader-20261101/deep-enlarged-text.json) passes all **114 versions** at **320×740 Dark/Read**, **32px root text (200% interface text)** and **34px Gurbani text**. Its **508 checks** include all **203 repeated-label targets** plus distinct first/middle/last targets; every exact current index, label, target ID and line-focus assertion passes. No horizontal overflow or row-layout failure is recorded. All **114 Return sequences** have **0px delta**, cleared exploration state and returned reading-anchor focus.

The baseline's first 80 versions preceded the additional Return-focus fix; the second matrix covers every version after it. Browser returned-focus checks identify a reading anchor; focused regressions separately verify the exact saved origin and next Tab behavior. [Nine screenshot reviews and actual keyboard/Find/locale flows](evidence/reader-20261101/deep-visual-and-keyboard.json) are complete. Sukhmani's live keyboard round trip preserved target 5321, saved body 5322 and its position; both Gurmukhi and Roman Find queries reached 5239, preserved their query and returned correctly. The source-page unit found untranslated in Punjabi was corrected within Contents and [screenshot-verified in Punjabi and Hindi](evidence/reader-20261101/deep-locale-final.json). See the [deep-audit report](bani-contents-deep-audit-20261101.md) for conditions, structural singletons and printed-heading groups. No all-catalog human visual inspection is claimed.

The header fix includes exploration state in explicit layout measurement. Its delayed-ResizeObserver regression now reserves the actual 87px header instead of a stale 80px before first jumps, including after Stay. The [final 114-version / 321-jump middle-first sweep](evidence/reader-20261101/deep-final-header.json) passes after four animation frames plus 250ms per jump: exact target/current index, focus, header clearance and all 114 Returns are correct, with 0px Return delta. The subsequent copy-only localization preserves English behavior; the [final English Sukhmani preview](evidence/reader-20261101/deep-final-preview.json) confirms 24 sections, Ashtpadi 2 / Ang 263, saved body 5322 and no overflow on the refreshed build. The recorded Chromium audit is complete; physical-device and exhaustive human-visual acceptance remain outside its scope.

## Historical sampled catalog browser coverage — 1 November

The [earlier sampled browser evidence](evidence/reader-20261101/all-final-browser.json), retained as historical baseline evidence, was independently compared with all 114 cases in the browser manifest. Every `(bani ID, requested length)` key appears exactly once, with no missing or unexpected cases. All readings reached the ready state and matched the expected **27,321 normalized rows and 2,411 Contents sections**.

| Browser family | Catalog readings | Versions passed | Observed rows | Contents sections | Sampled jumps |
| --- | ---: | ---: | ---: | ---: | ---: |
| Japji | 1 | 1 / 1 | 385 | 40 | 3 |
| SGGS long compositions, vars and salok collections | 33 | 33 / 33 | 13,726 | 1,213 | 99 |
| Remaining catalog collections and shorter readings | 52 | 52 / 52 | 7,429 | 662 | 141 |
| Dasam selections and composite daily prayers | 18 | 28 / 28 | 5,781 | 496 | 78 |
| **Total** | **104** | **114 / 114** | **27,321** | **2,411** | **321** |

The final run used Chromium at **390×844 with mobile/touch emulation, Study presentation and the light theme**. Every distinct first/middle/last sample matched its expected section label and verse ID, remained visible below the persistent header, and showed exactly one correct current marker. All 321 Return checks restored the prior position with **0px delta** and cleared exploration state. Document and Contents measurements showed no horizontal overflow; every case retained the native HTML scroller.

The run operated actual Contents buttons after standard History API/popstate route transitions in the live app. It resumed from the saved 60-case checkpoint after a workspace disconnection; no app source changed between the two segments. The reproducible harness is `scripts/qa/bani-reader-browser-audit.mjs`.

The initial [catalog](evidence/reader-20261101/catalog-browser.json), [SGGS](evidence/reader-20261101/sggs-browser.json), [Dasam/composite](evidence/reader-20261101/dasam-composite-browser.json) and [Japji](evidence/reader-20261101/japji-browser.json) family files remain as **superseded diagnostic evidence** from full-page loads. They recorded 105 passes, six final-section current-marker errors and three interrupted loads during a temporary local-server outage. The final rerun above covers every case after the fixes and successful reloads; none of those nine cases remains failed or incomplete.

That historical run sampled **321 jumps**. The deeper matrices above now cover all 2,411 baseline target clicks and all versions at enlarged interface/Gurbani text. Automated DOM/geometry coverage still does not imply screenshot review of every reading, every locale/script combination, or physical-device validation. Future provider changes must still pass the captured fingerprint guard.

No physical iPhone, Safari, installed PWA or Capacitor validation is claimed here. Chromium device emulation does not establish native-device scroll performance; those native-device checks remain outside this completed browser audit.

No commit, push or deployment is recorded by this report. Existing workspace work was preserved.
