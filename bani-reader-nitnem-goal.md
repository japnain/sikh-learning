# Implement the Bani reader and Home Nitnem plan

Created 22 October 2026 · Status: Browser/PWA software delivery complete; external installed-device acceptance remains open

Deliver all nine workstreams in [the revised implementation plan](bani-reader-nitnem-plan.md), using [the design comparison](bani-reader-nitnem-exploration.html) as the recorded direction. All nine are implemented, reviewed and verified within the NaamRas browser/PWA software scope. Actual installed-app and physical-device acceptance remains separately open below.

## Required outcomes

- [x] Intentional Nitnem continuity: Begin and Continue distinguish fresh daily practice from older Study places; interruptions preserve the active reading.
- [x] Discoverable Bani length: one opening tap from Home, the reader header and deep controls; supported choices explain their verified content and distinguish the open reading from the usual preference.
- [x] Safe version switching: preserve the current exact verse when available; clearly identify any fallback destination; failed/offline requests retain the readable version and its place.
- [x] Truthful completion: retain daily practice credit, record the version actually read, support temporary-version completion and Undo, and preserve provenance through cloud restore.
- [x] A first-screen Nitnem entrance and one focused current-bani composition, with meaningful location and exact-version availability.
- [x] A full-height Your Nitnem navigator within the existing app, preserving personal order and providing direct access to every selected bani.
- [x] Find within the current bani, useful Contents, and Return to previous place after exploratory navigation.
- [x] Comfortable sustained reading, including optional screen-awake behavior where supported, legible Gurmukhi and dependable selection/control interactions.
- [x] Explicit completion and continuation to the next chosen bani, with clear daypart, safe persistence and accessible Undo.

## Preserve

One unified app; the existing artwork-led Home, wordmark, muted light/dark palette and current-bani spotlight; Read/Study behavior; canonical scripture, punctuation, order and attribution; personal routine order; saved places and user history; Customize Save/Cancel; unrelated concurrent project work.

Native-wrapper builds, signing, public deployment, new audio features, automatic scrolling, page effects and additional primary reading modes are outside this goal. These boundaries follow the existing [owner-confirmed browser/PWA scope](docs/design/world-class-completion-goal.md#owner-confirmed-target-and-scope).

## Software completion gate

- [x] All nine outcomes are implemented and their plan checkboxes reflect actual progress.
- [x] All 1,475 tests across 128 files pass, alongside full lint, TypeScript, production build, startup and CSS audits. Independent review findings and the previously reported Stories failure/CSS warnings are resolved.
- [x] Rendered flows are inspected at 320/390/430px and wider layouts, both themes and all three UI locales, including 200% root interface text at 320px. Canonical text, selection, focus and Back behavior pass; axe reports zero violations across Reader, Home, Your Nitnem, chooser, Find, finish and tools.
- [x] Production service-worker checks cover full-network-offline Home and exact reader reopen/reload, cached/uncached versions, interrupted loading, reconnection and waiting-worker activation after the old reader closes. Practice continuity, midnight and cloud restoration retain the active exact reading.
- [x] Current screenshots and QA evidence identify the tested build and include sustained browser reading. Standalone iPhone viewport, 47px/34px safe areas and landscape are emulated; real Wake Lock release/reacquire passes synthetic pagehide/pageshow and actual route exit.
- [x] A final handoff reports implemented behavior, verification and concrete remaining limitations. Passing tests is not a substitute for visual review or owner acceptance of aesthetics.

## External acceptance still open

- [ ] Exercise actual installed-PWA OS launch/relaunch and background/foreground lifecycle. Browser standalone emulation and synthetic lifecycle events do not establish these behaviors.
- [ ] Record sustained physical-iPhone reading, real safe-area behavior and VoiceOver interaction when a device is available. Browser geometry and axe do not establish physical comfort or assistive-technology acceptance.

These external checks remain unverified; the overall installed-device acceptance is not marked complete. Under the [owner-confirmed target](docs/design/world-class-completion-goal.md#owner-confirmed-target-and-scope), their absence does not block the completed browser/PWA software delivery.

## Verification record

See [the dated QA record](docs/design/bani-reader-nitnem-qa-20261022.md) for artifacts and exact observations. Final build D is `index-Ctwqzq3O.js`, service worker `b206be284470`. Actual Chrome MCP forced-offline Home → Continue and three reloads preserve source G, verse2646, Long Rehras, all 439 verse rows and the canonical-text SHA. Cached/uncached switching, reconnect, slow-request cancellation and the waiting-worker update flow pass. Keyboard dock focus and font/resume/scrollbar-gutter races are fixed. No native build, public deployment or actual installed-app OS launch was performed in this work.

## Master publish validation

The reader/Nitnem work was isolated on master `9093860`, excluding unrelated local Stories/native changes. The exact publish set passed 1,427 tests across 122 files, types, lint, production/startup/CSS audits and an unchanged generated native catalog. Publish build: `index-SiOtBBDF.js`; service worker `122f1afb4786`. The earlier 1,475-test workspace result includes unpublished Stories tests. Installed-device acceptance remains open as described above.
