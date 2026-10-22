# Bani reader and Home Nitnem verification

22 October 2026. Final production preview: `http://127.0.0.1:4189/`. All nine implementation workstreams and available browser/PWA software checks are complete. Actual installed-app OS launch and physical iPhone/VoiceOver acceptance remain external checks.

## Delivered behavior

- Shared one-tap length access on Home, the reader header and deep controls. Current and Usual stay distinct; verified opening/ending text and the destination appear before Read applies. Changing the usual length is explicit.
- Validated length changes preserve the exact source and verse when available, otherwise explain the selected version’s saved place or beginning. Failed, cancelled and stale requests preserve readable text. Optional cache writes cannot block opening verified text.
- Intentional local Nitnem practice stays separate from ordinary Study and survives reload/midnight. New daily Begin does not silently adopt an old Study bookmark. Shared links do not change the usual version.
- A first-screen Nitnem entrance, current-bani spotlight and full-height Your Nitnem navigator preserve the artwork-led Home and personal routine order. Availability and saved scripture snippets refer to the exact version/source.
- Completion records the version actually read, preserves daily credit during later exploration and supports targeted Undo. Compatible cloud metadata enriches legacy provenance without reversing later Undo; restoration preserves active local practice.
- Find searches the current bani in Gurmukhi or Roman transliteration. Exploratory Find/Contents jumps retain Return and Continue here. Canonical text, punctuation and order remain unchanged.
- Width changes preserve a semantic reading anchor; height-only changes and scrollbar appearance do not trigger jumps. Resume, font settlement, header reflow and progress tracking share the reading edge. Real reader input cancels pending alignment.
- Optional screen-awake support releases on exit/background. Explicit completion offers the next selected bani and daypart. Finish this reading closes an intentional reread without replacing earlier daily credit.

## Workspace source and automated checks before publication

Final build: `index-Ctwqzq3O.js`, `Study-Cicj6Tbb.js`, `Home-DYaSoeDO.js`, `BaniLengthSheet-3Ixlqiqp.js`. Service-worker cache version: `b206be284470`. Backend code remains lazy and is not preloaded with startup UI.

| Check | Result |
| --- | --- |
| Core: 66 files | 764 tests passed |
| Data: 7 files | 39 tests passed |
| Pages: 16 files | 327 tests passed |
| Components/hooks: 39 files | 345 tests passed |
| Total | 1,475 tests across 128 files passed |
| TypeScript | App and node configurations passed |
| Full ESLint / whitespace | Passed |
| Production build / startup audit / public copy | Passed |
| CSS selector audit | All 18 files passed |

Runs use Vitest `--configLoader runner --cache false --no-file-parallelism` and TypeScript `--noEmit --incremental false` because dependencies are outside the writable checkout. Focused follow-ups overlap these totals.

The earlier Stories scroll-architecture failure is resolved locally through the shared passive scroll-listener utility. Dead first-run/reader CSS was removed; the selector audit recognizes only explicitly handled dynamic Stories artwork variants. Existing Stories/native-wrapper work was otherwise preserved. Architecture assertions cover measured header height and matching page/verse clearance. Independent reviews found no remaining actionable issues in the header/sheet/finish or resume lifecycle changes.

## Rendered inspection and fixes

Earlier actual in-app-browser inspection covered 320×568, 390×844, 430×932 and 1440×1000 layouts, both themes, all three locales, 34px Gurbani, native selection, keyboard focus, Find/Return and multi-page reading. Follow-up inspection used isolated Chrome against the production preview; user storage and the existing in-app-browser tab were untouched.

200% interface text means a measured 32px root font at a 320px CSS viewport, rather than only enlarged Gurbani. This is browser reflow evidence, not physical OS Dynamic Type.

| Reproduced issue | Final behavior |
| --- | --- |
| 200% header squeezed title/length into a narrow centre column | Adaptive rows keep whole labels accessible and publish the measured header height |
| 200% chooser left virtually no space for choices | One bounded form scroller makes every choice, preview, preference, Read and Close reachable in English, Punjabi and Hindi |
| Completion Undo clipped by an ancestor | Status and Undo wrap within the 320px reader |
| Auto-hide removed dock-button keyboard focus | Focused controls remain visible; normal hiding resumes after blur; explicit Hide still works |
| Reopen could save the preceding verse | Tracking matches alignment’s header/gutter geometry, enlarged text and fractional pixels |
| Cold Home Continue could overwrite its verse during late font/header reflow | Requested verse remains authoritative until layout settles; actual reader input still wins |

Axe used WCAG 2 A/AA, 2.1 A/AA and 2.2 AA tags. Home, Your Nitnem, reader, chooser, Find/Contents, completion and reading tools returned zero violations in recorded proper app-theme states. Final-build English/dark/200% reader, chooser, Find and finish also returned zero clipping-probe issues and target-size warnings. Punjabi/Hindi chooser controls were individually focused and scrolled into view at 200%; all were reachable. Tab/Shift+Tab wrapping and Escape/opener restoration were exercised. Axe alone does not establish reflow: the additional probe checks ancestor clipping, collapsed scroll areas and hidden/inert focus.

## Production service worker, offline and interruptions

Network emulation genuinely blocked fresh local no-store and unique external requests. Normal service-worker reload was used; hard reload bypasses that worker and is not the offline acceptance action.

- Update: a new worker waited while the old document retained its bundle, text, practice and completion. Closing the last app client allowed activation. A new tab in the same context opened Home and the exact reader with network blocked. Old shell/runtime caches were removed, the Bani cache retained, and new shell/runtime assets stayed paired.
- Exact text: Long Rehras retained 439 rows and the same scripture SHA-256 through updates/offline reopen: `9ca92119840aeb11953a0b70757305859666a9c7ed88221c3eb80f0629f56394`.
- Final cold resume: Home Continue and three subsequent offline reloads retained source G, verse2646, practice marker and length. Target y16.140625 under the scrolling touch header; completion provenance unchanged.
- Versions: cached Short/Long opened offline (306/439 rows). An uncached exact Medium choice showed “This length is not available offline. Your current reading is unchanged.”, disabled Read and retained route/text/usual preference. Reconnection plus Retry prepared Medium; only explicit Read applied 337 rows.
- Offline-flag caveat: Chrome’s network tool left `navigator.onLine=true`; raw BaniDB HTTP cache can also supply an uncached exact version. The exact cache-miss branch therefore deleted only that version’s app-cache/fallback entry and explicitly emulated `navigator.onLine=false` while traffic remained blocked. This override is test setup, not a naturally emitted offline event.
- Interrupted loading: a real BaniDB request bypassed HTTP cache through a unique-query/no-store diagnostic wrapper and Slow 3G. Extra long stayed pending with Read disabled. Closing the sheet and returning Home, then restoring network, preserved practice/preferences/route/completion with no late dialog. Production fetch code was unchanged.

Data came from the real BaniDB provider with mock mode unset. Midnight, cloud restoration, stale payloads, stalled storage, memory-only fallback, completion/Undo and next-bani handoff also have regression coverage. No authenticated cross-device cloud session was created for local QA.

## Standalone and device boundary

The real Screen Wake Lock API acquired a sentinel, released on synthetic pagehide, reacquired on synthetic pageshow and released on actual reader-route exit. This verifies browser API/lifecycle wiring, not physical-phone suspension.

Standalone was explicitly simulated with iPhone user agent/viewport, `navigator.standalone=true` and injected safe areas: 47px top/34px bottom in portrait; side insets and 21px bottom in landscape. The app entered standalone mode, Your Nitnem retained a usable scroll region, actions cleared insets, and probe/axe reported no issues. This is emulation, not an installed iOS launch or WebKit execution.

The tools provide no OS install/launch surface or physical iPhone/VoiceOver. Those remain external acceptance items. Native signing/builds and deployment are outside the owner-confirmed browser/PWA scope and were not performed.

## Saved evidence

Files are under `artifacts/bani-reader-nitnem-20261022/` (local QA artifacts, ignored by git):

- `final-offline-cold-home-continue.json`, `final-offline-repeated-resume.json`: final network/cache/text/place evidence.
- `final-dark-reader-length-320-200.json`: final proper-theme reader/chooser/Find/finish axe and clipping checks.
- `pa-320-200.json`, `hi-320-200.json`, `home-nitnem-320-200.json`: locale, focus, scroll and Home/navigator evidence.
- `interrupted-loading.json`, `offline-uncached-result.json`, `standalone-simulated-landscape.json`: failure/lifecycle cases.
- `reader-320-200-before.webp`, `reader-320-200-after.webp`, `final-reader-320-200-dark.webp`, `finish-320-200-after.webp`, `length-320-200-dark-after.webp`, `standalone-simulated-dark-nitnem.webp`: inspected screenshots.
- `core-tests.log`, `data-tests.log`, `pages-tests.log`, `components-hooks-tests.log`, `build.log`: final checks. Intermediate traces are retained separately and superseded by final passing runs.

Preview port4189 remains available. Browser network emulation is restored online after testing.

## Scoped master publication verification

The owner authorized pushing the reader/Nitnem work to master. A clean checkout of latest master `9093860` received only this work; uncommitted Stories, native iOS and unused artwork files were excluded. Master already contains the first-run CSS cleanup. The local Stories scroll fix remains with its unpublished feature.

The exact publish set passed **1,427 tests across 122 files**, both TypeScript configurations, full ESLint, the production build/startup audit/public copy, and all 17 CSS files. Native catalog regeneration produced no change. The earlier 1,475-test/128-file result includes the concurrent Stories feature; the smaller publish count reflects its exclusion.

Publish build: `index-SiOtBBDF.js`, `Study-DMJCs0Vn.js`, `Home-BipCbvva.js`, `BaniLengthSheet-BTZrODV4.js`; service-worker version `122f1afb4786`. An independent scope review verified all 62 selected files and a 149-file production dependency closure: no missing imports or dependencies on the excluded work. Browser evidence above describes the identical reader/Nitnem source in the full development workspace; no new browser or physical-device claims are made for publication.
