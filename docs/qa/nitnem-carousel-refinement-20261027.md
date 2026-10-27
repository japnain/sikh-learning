# Nitnem carousel refinement — 27 October 2026

The existing Gurmukhi-first Home rail remains a manually browsed list of the person's chosen banis. Browsing never starts a practice, changes a usual length or records completion. This pass refines its presentation and closes an offline-status refresh gap.

## Findings and changes

| Finding | Change |
| --- | --- |
| An optional saved-study link occupied a separate footer on only one card, shifting its main actions relative to neighbours. | When any card offers saved Study, every card reserves the same translated footer footprint. Empty placeholders are hidden and noninteractive. No footer is reserved when no card needs it. |
| Offline availability was rechecked only when the routine's overall status changed. During sequential preparation, the active bani could become available while the status remained `preparing`. | Recheck the active exact cache on signature, status, ready-count and retry changes. Cache results remain tied to their exact reading path and revision; stale responses cannot migrate to another card. |
| All-banis rows used more space than selection required, while several secondary labels were only 12px. | Tightened list spacing and title leading, increased metadata to 13px, retained at least 44px actions and natural height for long names. |
| Opening All banis always began at the first row, even when the seventh card had been browsed. | Reveal the browsed bani inside the list's own scroller. Keep Close focused and the underlying Home scroll untouched. Completion inside the sheet does not repeatedly reposition it. |
| A short viewport can leave little space between the full-screen sheet header and footer. | Below 500px viewport height, the complete sheet becomes one vertical scroller so the list and footer remain reachable. |
| A horizontal gesture could stop between cards with proximity snapping. | Use native mandatory horizontal snapping; no custom swipe interception, looping or automatic advance. |

The options row keeps a stable minimum height while an exact-cache badge becomes available. Customization retains its draft/save interaction and receives the same readable metadata floor; its descriptive weekly-practice copy is 14px.

## Feature coverage

| Feature | Evidence / retained contract |
| --- | --- |
| Arrows, keyboard and swipe | Existing and new component tests cover ordered navigation, both boundaries, rail-only shortcuts, offscreen keyboard focus, native scroll, interrupted smooth navigation and reduced motion. No reading/completion event is produced by browsing. |
| Reorder/removal and reader return | Identity stays attached to the browsed bani; removing it chooses a nearby remaining entry. Home return uses the existing one-return hint. |
| Fresh practice vs saved Study | Exact saved Study routes remain secondary links and do not invoke the daily-practice start handler. An explicitly started practice alone supplies daily Continue. |
| Completion and Undo | Completed cards remain browsable. Focus and card identity survive manual completion, the actual completed version is retained, and storage failures do not produce false completion. |
| All complete / tracking off / one / empty | All-complete retains reread/undo; tracking-off removes completion language and controls; one card has no pagination; an invalid empty selection has a recovery action. |
| Length selection | Exact payload and announced destination are forwarded together. Temporary and usual lengths stay distinct; unavailable lengths retain the current reading and offer retry. |
| Offline preparation | Exact cache validation, bounded sequential requests, read-back verification, data-saver pause, offline/partial states and retry remain intact. This pass corrects the active-card progress refresh. |
| Day/week rollover | Existing store/history tests cover local midnight, daylight-saving/year boundaries, today vs retained history, undo and bounded weekly goals. An unfinished intentional paath does not expire at midnight. |
| Customization | Existing tests cover draft-only reorder/add/remove/restore, minimum one bani, valid lengths, weekly goal/tracking, focus repair, saved readiness vs draft choices, recovery after Back/reload, discard and save-failure rollback. |

## Automated verification

- Eight targeted suites passed: HomeDailyNitnem, NitnemCustomize, nitnem store, nitnem history, nitnem practice store, practice helpers, reading identity and draft recovery: **136 tests**.
- Five additional offline/length suites also passed (the six-suite run including the carousel had 85 tests). Across both runs: **13 distinct suites, 200 distinct tests**, all passing.
- Four new behavior checks cover separate saved Study navigation, in-progress offline readiness, interrupted arrow/swipe navigation and current-row reveal with Close focus retained.
- Focused ESLint passed for the edited component/tests and the audited editor/rail hook.

Run Vitest with `--configLoader runner` in this workspace: its linked dependency directory prevents the default bundled loader from writing `.vite-temp`.

## Visual verification boundary

Parent integration completed a fresh production-browser pass at 320px light, 390px dark, 320px dark with 200% root text and 1440px light. Nitnem navigation, completion/undo, all-banis, exact medium-length routing, reader return, reordered choices and tracking-off passed. The combined reader/carousel suite passed 18/18 scenarios; evidence is in `tmp/reader-nitnem-polish-production/`. Root also inspected the normal phone carousel rendering.

The approximately 130px ordinary-row value is a design target, not a guaranteed height for every name or text scale. Every long localization and native-device swipe, safe-area and Dynamic Type behaviour still needs device coverage. The previous October 26 audit screenshots describe the previous production build; the new evidence is separate.
