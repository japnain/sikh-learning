# Home and Nitnem overhaul — implementation slice

The approved art-led Home direction is implemented in the React/Capacitor app. The light palette uses ivory surfaces and cooler ink; dark uses a continuous midnight canvas. The artwork retains its emotional scale. The production Scripture reader now supports continuous Read and Study presentations.

## Implemented

- Immersive Hukamnama with the actual date, source and availability; the excerpt skips standalone scripture headings without altering the source text.
- An ordered Nitnem folio replaces the carousel: every selected bani is visible in its saved order, with native selection and one expanded reading region. Exact BaniDB/length-aware resume, per-bani completion and undo remain separate actions. Reading percentages are not inferred from opening pages.
- Retained local completion/undo history, truthful Monday–Sunday continuity and streaks, and a weekly day goal. Removing a bani does not delete its history.
- Draft routine editing with Save/Cancel, ordering, add/remove and API-supported length choices. Offline preparation observes length changes and protects every selected exact payload. Saved-routine readiness is reported only after cache read-back, with incomplete/error/offline and retry states; unsaved drafts never inherit that readiness claim.
- Eclipse plus the existing 14 originals in a separate artwork preference: keep one, daily change, or each visit. Apply stays outside the scrollable gallery; original image files and protected subjects are preserved.
- Light/Dark/System appearance, including startup, OS changes and compatible cloud profile settings.

## Continuous reader

The production reader renders the complete ordered reading rather than replacing longer compositions with individual pages. Read hides support layers without overwriting Study preferences; Study restores the selected meanings and transliteration. Stable source-line anchors preserve reading position during presentation and typography changes. A section sheet jumps within the same reading.

The compact header exposes presentation, appearance and contextual tools. Canonical scripture, source-specific routes, source choices, dictionary lookup, bookmarks and sharing remain available. Recitation is an explicitly selected player so scrolling does not switch its recording. Read avoids unnecessary word wrappers; visible-section tracking uses intersection observation and settled scrolling.

Saved-verse navigation takes priority over cached page offsets. A one-time alignment after the mounted scripture font loads corrects initial layout drift; user input, scrolling, route changes and unmount cancel that correction.

Each exact bani/source/range/length now retains its own bounded local reading place. Switching banis or lengths and returning restores the matching verse instead of relying on a single global session. The global session remains compatible with existing cloud snapshots.

## Verification — October 17, 2026

The latest targeted run passed 342 tests across 29 files; lint, whitespace checks, the production web build, startup bundle audit, Capacitor sync and the iOS simulator build passed. Browser checks cover light/dark, narrow and enlarged text, native keyboard controls, artwork Apply/Cancel, completion/undo, and the complete 2,019-line Sukhmani reading. A final cold-load regression covers font-induced document clamping; the requested verse settles at 76.3px after font completion without overriding user reading intent. Latest evidence and review decisions are linked in `experience-quality-plan.md`.

## Remaining work

- Viewport coverage, followed by automatic completion only after a full eligible traversal. Opening, restoring, skipping or jumping must never count as completion.
- Durable historical cloud event retrieval/reconciliation. This slice retains history locally and reflects authoritative current-day snapshots; it does not claim recovery of the full ledger on a fresh device.
- Validate the final experience with sustained real-device reading sessions and users. Automated and browser checks establish specific behavior, not a claim that the product is first in its category or that users will pay for it.
