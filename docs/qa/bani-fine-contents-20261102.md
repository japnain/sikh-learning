# Finer Bani Contents — implementation and verification

Date: 2026-11-02. The requested finer navigation is implemented for all 20 affected readings: 17 raag collections, Sukhmani Sahib, Raag Maala and Ardaas. Source review, production-normalizer replay, component/integration tests, TypeScript, lint and the production bundle pass. **Live browser validation passed: all 20 readings and 698 Contents rows at 390px, plus representative enlarged-text, desktop, Punjabi/Hindi and keyboard checks. Across the harness runs, 111 sampled navigation checks passed. Physical iPhone/Safari and VoiceOver speech remain outstanding.** The earlier 2026-11-01 browser audit applies to the preceding flat Contents implementation, not these new expandable groups.

## Result

| Reading group | Implemented navigation | Root targets | Child targets | All selectable targets |
| --- | --- | ---: | ---: | ---: |
| 17 raag collections | Individual shabads, with the actual stanza, pauri, salok or ashtpadi form preserved for structured works | 258 | 203 | 461 |
| Sukhmani Sahib | 24 Ashtpadi parents retaining their salok context; eight stanza children each | 24 | 192 | 216 |
| Raag Maala | Opening plus six named raag-family landmarks | 7 | 0 | 7 |
| Ardaas | 14 source-incipit landmarks for the prayer's successive passages | 14 | 0 | 14 |
| Total modified readings | 20 readings | 303 | 395 | 698 |

Across the complete catalog, the 104 exact readings and their 114 supported length versions now have **2,446 root targets and 395 child targets: 2,841 selectable targets**, an increase of 430 over the previous 2,411. The 35 additional roots include recovered printed headings and the finer Raag Maala/Ardaas landmarks. Root/child totals are navigation counts, not a claim about canonical hymn totals. A raag heading already representing one complete hymn remains a direct link without a redundant one-child disclosure.

The affected raag IDs are 55, 56, 57, 58, 59, 60, 64, 65, 66, 67, 69, 70, 71, 72, 73, 74 and 76. These are captured BaniDB selections, not necessarily the entirety of the respective raags in Guru Granth Sahib.

## Interaction and implementation

`BaniContentsSections.tsx` presents separate controls for jumping to a parent and expanding its children. Groups remain compact until opened; the current child's parent opens automatically when Contents is opened. Collapsing that group moves the single visible current-location marker to its parent. Multiple groups can be inspected without moving the scripture or saving a new reading position. Expansion labels and section kinds support English, Punjabi and Hindi; literal source headings retain their Gurmukhi language tag.

The shared resolver accepts at most two levels and checks every target, excerpt, sibling order, parent interval and unique ID. New profiles replace their earlier profile only at the same complete ordered reading fingerprint. Ambiguous replacements, changed text, deleted/interleaved rows, reordering and unreviewed readings cannot acquire an apparently valid fine index. They retain the source-page fallback.

The scripture stream, original pages and source metadata are unchanged. Native HTML document scrolling and the persistent header remain in place. The new component only changes local disclosure state while Contents is mounted; it introduces no active-scroll scan or React update during reading.

## Source review

The complete captured source archive and independently reviewed starts/endings underpin the static profiles. Provider paragraph numbers or header flags alone were not used to infer hymns. Concrete exceptions checked include:

- Sukhmani's sole rahau stays with the first stanza; stanza 2 starts at row 5251, although provider paragraph metadata also includes the preceding rahau.
- Gauri's Bavan Akhari, Thitanti and weekday Vaar use internal stanza/salok landmarks. Ramkali Sadd has six stanza children and the Balvand/Satta Vaar eight pauri children; none becomes an invented set of shabads.
- Unflagged printed headings and mixed-author groups are split explicitly where verified, avoiding a following hymn being attributed to the preceding Mahalla heading.
- Sarang preserves its actual single Surdas line. Long hymns, including the 28-stanza Namdev hymn in Bhairao, remain whole hymns.
- Raag Maala's Deepak landmark begins at the actual transition. Ardaas's fourteen incipits are editorial navigation landmarks, not fourteen canonical numbered paragraphs. Its unprovided prose page/source metadata remains unset.

The independent review found no remaining concrete boundary, interval, excerpt or label issue. Detailed primary references and per-reading inventories are in:

- [Independent source audit](bani-fine-contents-independent-20261102.md)
- [Sukhmani, Raag Maala and Ardaas source notes](bani-composition-fine-structure-20261102.md)
- [Earlier raag collection source notes](raag-fine-a-structure-review-20261102.md)
- [Later raag collection source notes](bani-raag-fine-b-20261102.md)
- The explicit boundary fixtures `scripts/qa/fixtures/raag-fine-boundaries-a-20261102.json` and `scripts/qa/fixtures/raag-fine-boundaries-b-20261102.json`.

## Completed validation

| Check | Result |
| --- | --- |
| Reader/data/resolver regression suites | 718 tests across 24 files passed |
| Contents component and continuous-reader integration | 75 tests across two files passed: six Contents tests and 69 continuous-reader tests |
| Combined automated total | **793 tests across 26 files passed; zero failures** |
| Full catalog production-normalizer replay | All 104 readings / 114 versions; recursive target, excerpt, bounds and current-path checks |
| New nested integration coverage | Read and Study modes: expansion without background movement or saving; exact child jump, current-parent reveal and Return to the original saved place |
| TypeScript | App and Node configurations passed with incremental output disabled |
| ESLint | 18 implementation/generator files plus both UI test files passed |
| CSS selector audit | 28 files passed |
| Isolated Vite production build | Passed |
| Startup bundle budget | Passed: 151.4 KiB gzipped JavaScript, 12.8 KiB gzipped CSS; backend remains lazy |

The earlier regression/build review hashes were checked against the current files and all matched. The additional UI tests and lint were then run against those same implementation files. The Study lazy chunk is 541.05 kB raw / 99.69 kB gzip and triggers Vite's default 500 kB raw advisory; the initial-load budget is unchanged. The build also reports old Browserslist metadata. These are advisory output, not failed checks.

Machine-readable commands, counts, reviewed hashes and build output are in [fine-code-verification.json](evidence/reader-20261102/fine-code-verification.json). This verification used the isolated Vite build and startup audit; it does not claim a new full app-store, native or deployment build.

## Live verification checkpoint

The live harness ran at **390 × 844 CSS pixels, light theme, Study mode, English UI and 22px Gurmukhi text**. It inspected every collapsed and expanded Contents row in each completed case, then tested the indicated jumps. All completed checks passed; no reader issue was found in that coverage.

| Completed reading | Contents rows inspected | Successful jumps |
| --- | ---: | ---: |
| Sukhmani Sahib | 216 | 33, covering the first 33 preorder targets |
| Ardaas | 14 | 3 |
| Raag Maala | 7 | 3 |
| Siri Raag | 5 | 3 |
| Gauri | 156 | 3 |
| Asa | 54 | 3 |
| Gujri | 8 | 3 |
| Sorath | 28 | 3 |
| Dhanasri | 20 | 3 |
| Suhi | 10 | 3 |
| Bilaval | 16 | 3 |
| Gond | 20 | 3 |
| Ramkali | 37 | 3 |
| Maru | 20 | 3 |
| Kedara | 8 | 3 |
| Bhairao | 38 | 3 |
| Basant | 15 | 3 |
| Sarang | 12 | 3 |
| Malaar | 5 | 3 |
| Prabhati | 9 | 3 |
| Total | **698** | **90** |

The nineteen three-jump cases use the middle, first and last preorder targets. Checks cover exact labels/excerpts, root and child counts, source-label language tags, row/panel overflow, control heights of at least 44px, exact verse focus and header clearance, current-section identity, revealed child groups, and Return to the original reading position. Applicable disclosure checks also preserved background scroll, reading progress and saved places. The later nineteen cases explicitly verify that the current row is visible after Contents reopens; the initial 33 Sukhmani jumps predate that extra assertion. The later narrow and Punjabi Sukhmani cases each passed the assertion on three samples, including the final stanza of Ashtpadi 24.

### Representative layout and locale checks

| Configuration | Readings | Contents rows inspected | Successful jumps |
| --- | --- | ---: | ---: |
| 320 × 740, dark Read, 32px root font and 34px Gurmukhi | Sukhmani, Raag Maala, Ardaas, Ramkali | 274 | 12 |
| 1280 × 900, light Study, 16px root font and 22px Gurmukhi | Ramkali | 37 | 3 |
| 390 × 844, light Study, Punjabi UI | Sukhmani | 216 | 3 |
| 390 × 844, light Study, Hindi UI | Ramkali | 37 | 3 |
| Supplemental total | Seven representative cases | **564** | **21** |

All seven cases passed exact target/current-section identity, target focus and header clearance, reopened-current-row visibility, row geometry and Return checks. Controls were at least 44 CSS pixels high, no document horizontal overflow was found, and Return restored the original scroll position with zero measured displacement. The 564 row inspections repeat targets in additional configurations; they are not 564 newly added targets. Together with the baseline, these are **111 harness sample jumps**, not an exhaustive click-through of every target in every configuration.

The narrow configuration doubles the root font from 16px to 32px and separately sets Gurmukhi text to 34px. It is a text-enlargement simulation, not browser zoom, uniform 200% text scaling, iOS Dynamic Type or a physical-device test. The Punjabi/Hindi checks disable English label equality while retaining exact Gurmukhi excerpt, literal-label language-tag, geometry and navigation checks. They verify representative localized UI function and layout, not linguistic expert certification.

Raw results are retained as `fine-narrow-31.json`, `fine-narrow-38.json`, `fine-narrow-24.json`, `fine-narrow-67.json`, `fine-desktop-67.json`, `fine-punjabi-31.json` and `fine-hindi-67.json` in the evidence directory.

### Keyboard and visual checks

A separate desktop Ramkali keyboard scenario passed actual Tab navigation through Close, search, the parent link and disclosure; Space to collapse; Enter to expand; Tab to stanza 2; and Enter to jump to the exact verse 21631. The verse received focus below the header. Enter on Return restored the original scroll position and focus, and Escape closed Contents and returned focus to its opener. The Contents trigger and Return button were focused programmatically as entry points; navigation inside Contents used actual keyboard events. This scenario is separate from the 111 harness samples.

Saved reading coordinates remained unchanged. Return refreshed the saved-place `updatedAt` timestamp, so the raw `placesUnchanged: false` on that step does not mean the reading position changed. The full event record is [fine-keyboard.json](evidence/reader-20261102/fine-keyboard.json).

Visual review covered narrow dark Raag Maala, desktop light Ramkali with focused Stanza 2, phone-width English/Punjabi Sukhmani, and phone-width Hindi Ramkali. The Punjabi view clearly displayed the expanded Ashtpadi and its eight stanza labels; Hindi Ramkali displayed the six Sadd stanza labels. Literal headings and excerpts remained in Gurmukhi. Screenshots were displayed and reviewed in the browser-tool responses but were not persisted as image files. An earlier fallback-browser Ardaas observation is not counted toward the current-build desktop pass.

[fine-browser-checkpoint.json](evidence/reader-20261102/fine-browser-checkpoint.json) distinguishes stored raw evidence from transcript-recovered summaries. [fine-browser-mobile-partial.json](evidence/reader-20261102/fine-browser-mobile-partial.json) retains the full 30-jump Sukhmani batch. The preceding three Sukhmani jumps and nine completed reading cases were returned successfully by the tools, but their full raw objects were lost when the tool store reset. Their completed summaries are recorded without inventing missing per-target measurements.

The subsequent ten cases retain full raw results in `fine-mobile-56.json`, `fine-mobile-57.json`, `fine-mobile-67.json`, `fine-mobile-69.json`, `fine-mobile-70.json`, `fine-mobile-71.json`, `fine-mobile-72.json`, `fine-mobile-73.json`, `fine-mobile-74.json` and `fine-mobile-76.json` under `docs/qa/evidence/reader-20261102/`. These add 354 inspected Contents rows and thirty successful jumps.

Browser timeouts, a module-reload interruption and a workspace disconnection delayed the audit. The interrupted Sukhmani batches and the earlier interrupted Ramkali/Maru/Kedara/Bhairao batch receive no pass credit; the later completed cases are counted from their own results. The previous connection problems, including an unreachable local port from the execution environment despite a confirmed listener, are historical blockers rather than evidence that the preview server or reader failed.

No affected reading remains uninspected at 390px, and the representative layout, locale and keyboard checks are complete. Only physical iPhone/Safari and VoiceOver speech checks remain outstanding in this audit. No code issue was found and no application change was needed during live validation.

The browser was restored to English, light Study mode, a 16px root font and 22px Gurmukhi text; the latter was explicitly rechecked in Reading appearance. All viewport emulation and the fallback browser viewport were reset. The final Sukhmani view loaded 2,019 scripture rows, with no console warnings or errors observed.

The reusable `scripts/qa/bani-fine-contents-browser-audit.mjs` and `scripts/qa/fixtures/bani-fine-sections-browser-20261102.json` support continuation. The manifest contains all 114 versions, recursive trees and 2,841 preorder targets, including expected deepest current-section IDs when parent and first child share an anchor. Historical 2026-11-01 evidence remains unchanged.

No commit, push or deployment was performed for this verification.
