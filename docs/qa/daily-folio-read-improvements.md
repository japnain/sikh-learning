# Daily Folio and Read improvements

Implementation and release verification for the approved Daily Folio direction and the 15-point Read audit.

## Daily Folio

Home Nitnem uses a single reading pane with a named bani index, a subtle morning/evening/night wash, and a compact completion footer. The index is a keyboard-accessible tablist. Selecting a title previews it; the reading action starts the chosen paath. Completion and Undo keep the selected bani in view.

The implementation retains exact bani versions, adjustable lengths, offline availability, independent saved Study, intentional Nitnem progress, custom ordering, and the complete-bani sheet. Reduced motion, narrow layouts, enlarged text and script typography are accounted for in the component styles.

Main files: `src/components/HomeDailyNitnem.tsx`, `src/hooks/useNitnemIndex.ts`, `src/styles/home-daily-nitnem.css`.

## Audit coverage

| # | Improvement | Implemented behavior | Regression evidence |
|---|---|---|---|
| 1 | Independent book continuity | A durable place per work survives switching to a bani or another source. Changed editions resume safely at chapter start; missing chapters return to the work overview. | `readingPlaces.test.ts`, `progress.test.ts`, `PanthPrakashLibraryHome.test.tsx` |
| 2 | Source return navigation | Source expansion and number pagination live in the URL. Reader Back restores collection, source, scroll and focused link. | `ScriptureSourceBrowser.test.tsx`, `discoveryReturn.test.ts`, `libraryReaderNavigation.test.ts` |
| 3 | Consistent global search | The same search remains available across all collections. Explicit All/Gurbani/Books/Stories scopes are separate from collection navigation. A search can be exited and recovered. | `Banis.test.tsx` |
| 4 | Universal Rehat reader | Chapter routes use the shared header, Contents, Find and appearance controls, with focused app chrome. Directory navigation and source provenance remain available. | `Rehat.test.tsx`, `App.test.tsx` |
| 5 | Direct source lookup | Source-specific Ang/Vaar inputs accept Latin, Gurmukhi and Devanagari digits, validate the source range and return to the matching number page. | `ScriptureSourceBrowser.test.tsx`, `sourceBrowse.test.ts` |
| 6 | Retained directory state | Expanded bani groups and source sections survive reader handoffs and Back navigation. Stable link identities support focus restoration. | `Banis.test.tsx`, `ScriptureSourceBrowser.test.tsx` |
| 7 | Recoverable book loading | Catalog failures show an in-place retry with loading, offline and empty states. | `LibraryBookBrowser.test.tsx` |
| 8 | Honest result counts | Search previews disclose visible and total counts and can expand to all results. All available writer/raag facets are reachable. | `Banis.test.tsx`, `appSearch.test.ts` |
| 9 | Consistent story matching | Discovery and global search share normalized metadata matching across titles, people and themes. | `StoryBrowser.test.tsx`, `appSearch.test.ts` |
| 10 | Shared Continue section | Read offers genuine saved bani/source/book/story places and a specific Japji Sahib starting point for new readers. More places can be expanded. | `ReadContinue.test.tsx` |
| 11 | Localized discovery controls | Source lookup, book discovery, overview and download controls use English, Punjabi and Hindi interface copy. Original book text and metadata retain their language. | Source, book browser, overview and download component tests |
| 12 | Accurate In Progress | Saved uses stored reading routes and locators instead of inferring progress from overlapping Ang coverage. | `Library.test.tsx`, `readingPlaces.test.ts` |
| 13 | Clear collection roles | Collection introductions explain complete compositions, sequential sources, long-form books/guides and curated stories. | `readPageCopy.ts`, `Banis.test.tsx` |
| 14 | Book identity and hierarchy | The book catalog uses the same recognizable cover identity as the work overview, with edition, volume and episode context. | `LibraryBookBrowser.test.tsx` |
| 15 | Maintainable Read structure | Search controls/results and localized copy are extracted from the Read page. New styles are scoped to their components. | `components/read/`, `readPageCopy.ts`, `readSearchCopy.ts`, scoped ESLint and TypeScript |

Backup restoration also rehydrates durable places before migrating the former latest-session shortcut. A real-store replace test reproduces and prevents imported places being overwritten by old in-memory data.

## Verification

Automated checks cover behavior, persistence, localization, routing and keyboard interaction. All test groups were exercised. Initial failures exposed a collection/search synchronization race, an exact-variant omission and integration expectations from the former search behavior; those were corrected and the affected page batch and continuity tests rerun successfully. Final page validation: 18 files / 384 tests. Final continuity validation: 3 files / 36 tests. The other batches passed 496 core, 59 catalog, 16 library-integrity, 325 miscellaneous and 428 component/hook checks; the remaining component case passed in the final continuity rerun.

App and configuration TypeScript checks, scoped ESLint, the CSS selector audit (27 files), whitespace checks and the production Vite build passed. The startup audit measured 151.3 KiB gzipped JavaScript against a 190 KiB budget and 12.7 KiB gzipped CSS against a 36 KiB budget. Published-story verification confirms eight readings with editorial drafts excluded. The browser acceptance script now exercises the actual Folio tab interface and preserves exact-length/customization scenarios.

### Browser review completed October 28, 2026

Chrome DevTools loaded the current React source in the local file-compatible review bundle. This uses the real components, stores, styles and bundled library data, with a temporary HashRouter and controlled provider fixtures. Screenshots were inspected in the browser. The review harness is confined to `tmp/daily-folio-review/`; no production routing or scripture content was altered.

Verified in the browser:

- Daily Folio: seven named banis; title selection; End/Home keyboard navigation; completion and Undo; opening/closing the complete list; selecting Medium Rehras and opening that exact route; Back restoring Rehras and its length; custom ordering persisting; turning completion tracking off while keeping all seven readings accessible. The distinct-length case uses the same synthetic fixture adjustment as the existing browser QA suite.
- Read: all four collections fit without horizontal page overflow at 320px light, 390px dark, 320px dark with 200% text, and 1440px desktop light. Collection ArrowRight/Home/End keyboard navigation was also exercised.
- Search: Story search → Story reader → Back preserves query and scope. Changing collections exits search; the previous search can be recovered. All, Gurbani, Books and Stories scopes return the appropriate result groups, and exiting search returns to the selected collection.
- Sources: invalid Ang input shows an error. English, Punjabi and Hindi interfaces accept `123`, `੧੨੩` and `१२३` respectively, open Ang 123, and restore the Sources collection, expanded source, number page 3 and focused Ang 123 link on reader Back.
- Book continuity: a real chapter scroll saved `episode-001-p49-b002`; opening and scrolling a bani preserved that book route and block. Read Continue reopened the block, and browser refresh restored it into view (top approximately 129px at a 320×568 viewport).
- Book recovery: an injected 503 catalog response displayed the localized retry control in English, Punjabi and Hindi. Retrying successfully loaded the book catalog in each locale.
- Rehat: Contents identifies the current chapter; Find highlights the match; appearance controls update the reading size. The 320×568 / 200% text case exposed an oversized Find header and was repaired and rechecked.

### Final correction

At 320×568 with 200% text, Rehat Find originally occupied approximately 479px, leaving only 89px for reading. Previous, Next and Clear now use a single row of 44×44px icon buttons with localized accessible labels. A compact visible count retains the full localized screen-reader status. At enlarged sizes, the redundant source subtitle is omitted from the header; it remains available in Contents. The same browser case now measures approximately 279px for the header and 289px of reading space, with no horizontal overflow. The query text retains its enlarged size.

All 15 focused Rehat tests, scoped ESLint, whitespace checks, both TypeScript projects, the CSS selector audit and the rebuilt production bundle passed after this correction. Startup sizes remain 151.3 KiB gzipped JavaScript and 12.7 KiB gzipped CSS. Published-story verification still confirms eight readings and excludes three editorial drafts. Independent code review found no additional blocking defect.

`scripts/qa/read-discovery-acceptance.mjs` now contains 16 deterministic journeys, including a regression assertion that Rehat Find retains 44px controls and leaves at least 45% of the viewport for reading. It is integrated into `scripts/qa/browser-acceptance.mjs`. Syntax and scoped lint checks passed for both scripts.

### Remaining environment limitation

The production HTTP preview could not bind a localhost port (`listen EPERM`), and a separate CLI Chromium launch was also blocked by the sandbox. Consequently, the full production-preview Playwright suite has **not** run in this environment. The browser results above are actual component/runtime checks in the bundled review harness; they do not certify HTTP serving, service-worker behavior or live provider availability. Production HTTP acceptance is therefore run in GitHub Actions before merging the release.


### Release protection for the existing scroll fix

The release is built on master `4c2fec4e3079adc1cbe8161d95a11d5310b2913f`, including the native document-scrolling header fix. Fifteen scroll-critical runtime files are byte-for-byte unchanged, including the Bani reader, shared header, header measurement, interaction handlers, scroll restoration, viewport metrics and reading anchors. Shared header CSS only adds Rehat to existing selectors; existing Bani declarations are unchanged.

The exact release candidate passed all 1,717 unit tests in 145 files, including 133 focused scroll regressions. These cover bounded long-Bani measurements, height-only viewport resizing, native scroll-end scheduling, touch deferral and cancellation of queued work. Full ESLint, both TypeScript projects, production build, CSS selector audit, startup budget and published-story verification also pass. The candidate measures 151.6 KiB gzipped JavaScript and 12.7 KiB gzipped CSS.

CI runs production Bani/Home and Stories acceptance, all 18 reader/Folio scenarios, the 16 Read discovery journeys, accessibility checks and the full unit suite. The Folio layout check explicitly traverses every named tab with the keyboard and verifies that the selected title, focus and panel remain in view. Off-screen inactive names in the intentionally scrollable index are not treated as clipped controls.

Automated browser checks exercise functional scrolling and anchor restoration in headless Chromium. They do not measure frame times or certify physical iPhone momentum performance. The release preserves the working scroll implementation and requires the regression checks to pass before merge.
