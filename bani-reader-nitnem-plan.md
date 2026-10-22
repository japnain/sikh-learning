# Bani Reader and Home Nitnem

Revised plan · 22 October 2026 · browser/PWA software delivery complete; external installed-device acceptance remains open

Implementation target and completion criteria: [Bani reader and Nitnem goal](bani-reader-nitnem-goal.md).

Make daily paath effortless within the existing reader: visible content choices, intentional continuity, comfortable long reading and truthful practice history.

Preserve the accepted artwork-led Home, single current-bani composition, Read/Study modes and personal order. Withdraw the earlier inline-expansion proposal: it risks recreating the seven-row Home previously rejected. Alternatives and rationale: `bani-reader-nitnem-exploration.html`.

Three states stay distinct: **usual version**, **open reading**, and **practice completed today**. Opening a link never edits a usual version. Exploring another version never removes credit for completed practice.

## Implementation order

- [x] **1. Intentional practice context:** add a small Nitnem session store, reusing exact identities/places. Home follows deliberately started practice; new daily reading offers Begin; older saved places remain optional. **Check:** yesterday’s final verse and unrelated Study cannot commandeer today’s Continue; an open session survives midnight/restart.
- [x] **2. Visible shared chooser:** add controlled `BaniLengthControl.tsx`/`BaniLengthSheet.tsx` beneath the title, in the deep dock and on Home. Show current/usual choices and verified included sections or boundary excerpts. **Check:** the reading’s chooser changes that reading, with optional Use for my Nitnem; Customize edits usual in its draft. Changed defaults never silently retarget an active Continue.
- [x] **3. Safe transitions:** extract `Study.tsx` switching logic; validate before replacing text. Preserve the current exact verse when present; otherwise state the target saved place/beginning before applying. Preserve `readerOrigin`. **Check:** no percentage mapping, premature preference writes or stale swaps; uncached offline choices retain readable text.
- [x] **4. Practice provenance:** extend `nitnem.ts`, `nitnemHistory.ts` and `src/supabase/snapshot.ts` with completed-reading identity. Count each bani once per day; show Read today · Short separately from Reading Long. **Check:** valid temporary versions remain completion-eligible; exploration preserves credit; Undo targets its event; legacy length stays unknown; recording dates and sync remain stable.
- [x] **5. Focused Home entry:** add a quiet Begin/Continue shortcut within the first mobile screen, preserving artwork scale. Drive the spotlight from practice context; show length, meaningful place and verified availability. **Check:** 390 × 844 access; completed, empty and tracking-off states remain coherent.
- [x] **6. Routine navigator:** replace the constrained All banis view with a full-height Your Nitnem destination in the same app. Preserve order, direct reading links, separate length/completion controls and optional daypart filtering. **Check:** enlarged-text scrolling/focus work; no new bottom tab, forced clock reordering or expanded Home checklist.
- [x] **7. Find and return:** extend Contents with Find within this bani, highlighted current location and Return to previous place after exploratory jumps. Use verified section labels or actual opening lines. **Check:** canonical text stays intact; source-aware matches and exploration preserve the reading thread.
- [x] **8. Sustained comfort:** add optional Keep screen awake with platform-aware release on exit/background. Refine existing control visibility, Gurmukhi shaping/spacing and selection. **Check:** no clipped matras, obscured text, accidental completion or wake lock outside reading.
- [x] **9. Deliberate handoff:** refine `ReaderFinishPanel.tsx`/Home to offer the next chosen bani with its daypart and exact place, plus Undo. **Check:** explicit Complete & continue navigates only after persistence; no automatic opening/completion.

Context/identity precede integration. Chooser and provenance can run independently; comfort work can run alongside them. Defer new primary modes, auto-scroll, page effects and memorization aids until the core flow is validated.

## Final verification

- [x] Software acceptance: all 1,475 tests across 128 files, full lint, TypeScript, production build and startup/CSS audits pass. Rendered 320/390/430px and wider flows, both themes, all three locales, 320px/200% root interface text, selection, keyboard focus, Find/Return and completion pass. Axe reports zero violations across the reader and related Home/Nitnem sheets and tools.
- [x] Production browser/PWA acceptance: actual Chrome MCP forced-offline cold Home → Continue plus three reloads preserve exact source G/verse2646/Long Rehras, all 439 rows and canonical-text SHA. Cached/uncached switching, reconnect, slow-request cancellation and waiting-worker activation after the old reader closes pass. Standalone iPhone viewport/safe areas/landscape are emulated; real Wake Lock release/reacquire passes synthetic lifecycle events and actual route exit.
- [ ] External installed-device acceptance: actual installed-PWA OS launch/relaunch/background lifecycle and physical-iPhone sustained reading, real safe areas and VoiceOver remain unverified. These checks do not block the owner-confirmed browser/PWA software delivery; emulation and axe do not establish them.

Verification: [22 October QA record](docs/design/bani-reader-nitnem-qa-20261022.md), final build D `index-Ctwqzq3O.js`, service worker `b206be284470`. All nine implementation workstreams and browser/PWA software checks are complete. External acceptance remains open as labelled above; no overall hardware acceptance is claimed.

## Master publish validation

The reader/Nitnem work was isolated on master `9093860`, excluding unrelated local Stories/native changes. The exact publish set passed 1,427 tests across 122 files, types, lint, production/startup/CSS audits and an unchanged generated native catalog. Publish build: `index-SiOtBBDF.js`; service worker `122f1afb4786`. The earlier 1,475-test workspace result includes unpublished Stories tests. Installed-device acceptance remains open as described above.
