# Bani reader and Home Nitnem refinement

23 October 2026 · Implemented and verified in the browser

Execution checklist and completion criteria: [Implementation goal](2026-10-23-bani-reader-home-nitnem-refinement-goal.md).

## Goal and direction

Make every chosen Nitnem bani easy to reach from Home, then make the reader calmer and easier to navigate during sustained paath. Keep NaamRas one coherent app, using the existing artwork, paper/ink palette, typography, reading modes and exact reading identities.

**Recommended Home direction: a manually scrollable rail of full Bani cards.** On ordinary mobile widths, show one dominant card and a small edge of the next. Every card has its own direct reading action. Preserve the first-screen Begin/Continue shortcut and the full Your Nitnem navigator.

This is a new refinement phase. The previous nine-workstream plan already delivered intentional practice, exact resume, safe length switching, completion provenance, Find/Return and screen-awake support. Reuse those systems. This plan supersedes the earlier single-spotlight presentation decision only where the new carousel requires it; it does not replace the previous behavior guarantees.

The initial planning audit used current source, tests and local project records. The user's later instruction authorized DevTools and Lazyweb, and implementation is now complete with new automated and rendered verification. Actual results and device boundaries are recorded in the [23 October QA record](../qa/bani-reader-home-nitnem-refinement-20261023.md).

## Current findings

| Current behavior | Implication | Evidence |
| --- | --- | --- |
| Home shows one bani and two upcoming links | Later and completed banis need the full-list detour | `src/components/HomeDailyNitnem.tsx`, active/upcoming composition |
| Parent Home advances its selected bani after manual completion | The completed card's Undo leaves the main surface; the transient notice has no Undo | `src/pages/Home.tsx`, `handleCompletion`; `src/pages/Home.test.tsx` |
| Length appears in both the daypart metadata and its control | Repeated information adds visual weight | `src/components/HomeDailyNitnem.tsx`, `details` and `lengthControl` |
| Header, mode/location row and deep dock repeat controls | Revealed controls occupy more of the reading area than necessary | `src/components/ReaderDock.tsx`; `src/styles/reader.css` |
| Contents marks the current section but does not reveal its row on opening | A long bani can open Contents far from the useful location | `src/pages/Study.tsx`, `openReaderSections` and section list |
| Find unmounts when Contents closes | Returning to another match starts from an empty query | `src/components/BaniFindPanel.tsx`; `src/pages/Study.tsx` |
| Next bani is derived only when completion tracking is enabled | Readers who disable tracking lose the routine handoff | `src/components/ReaderFinishPanel.tsx` |
| Gurbani size changes independently of fixed-size Study support layers; preview shows only Gurbani | Larger canonical text can leave meanings and transliteration disproportionately small | `src/pages/Study.tsx`, appearance controls/preview; `src/styles/reader.css` |

## 1. Home: all banis within one focused section

### Card composition

Use the same hierarchy on every card:

1. Daypart and personal-order position.
2. Prominent script title with the Roman title beneath.
3. One length control where supported; truthful exact-version offline availability.
4. Current reading context: exact saved-line excerpt when available; recorded completion/version shown separately.
5. Begin reading, Continue reading or Read again as the primary action.
6. A quieter explicit completion/Undo action when tracking is enabled, with saved Study access kept distinct.

Remove the current two-item Up next block once the rail replaces it. Keep the summary, progress and Customize action compact. Keep Your Nitnem as the fast full-list alternative. Use the existing visual tokens; cards should feel like part of the reading room, without individual cover art, gradients or decorative motion.

### Scrolling and navigation

- Use native horizontal overflow with restrained CSS scroll snapping. No carousel dependency or custom drag handler.
- Keep every selected bani in its saved personal order, including completed banis. Reveal the relevant card initially without rearranging the list.
- Show Previous/Next controls and a visible position count. At either end, stop; do not loop or rotate automatically.
- On narrow or enlarged-text layouts, use the full available card width and reduce/remove the next-card peek. Let content determine height; never clip actions or add a vertical scroller inside a card.
- On desktop, retain a focused leading card with adjacent cards where the actual practice-column width allows it. Arrows and normal trackpad scrolling remain available.
- Preserve vertical page gestures. Tab focus into an offscreen card must reveal that card without dragging the whole page unexpectedly. Arrow-key shortcuts apply only to the focused rail, not to its inputs or controls.
- Give cards unique heading IDs and bani-specific action names. Announce explicit pagination changes concisely, not the entire card on every scroll event. Respect reduced motion.

### Browsing is separate from reading

Introduce a local `browsedId` independent of the active practice identity. Swiping, pagination and keyboard focus only change presentation. They never start a session, edit a usual length, move a saved verse, record completion or retarget the first-screen Continue shortcut.

Keep the existing single unfinished intentional practice. Only its matching card gets the daily-practice Continue action. Other cards use Begin/Read again and may expose a separate saved Study link. Explicitly opening another bani retains the current store's behavior; per-reading saved places remain intact.

On a fresh Home entry, reveal the active practice, otherwise the first incomplete bani in personal order. Once someone browses, ordinary state refreshes do not seize the rail. Preserve the relevant card on reader return using lightweight navigation/session context; do not add a persisted preference or migrate practice data for a browsing position.

After a manual completion, keep that card visible with Read again and Undo. The first-screen practice shortcut may identify the next incomplete bani independently. Advance the rail only through a deliberate pagination or reading action. If a selected bani is removed, choose the nearest remaining valid card; reordering preserves the browsed bani by ID.

## 2. Reader: smaller, consistent controls

Keep document scrolling, native text selection and the measured-header/semantic-anchor architecture.

- Tighten the entry header's spacing and metadata so the title, visible length choice, Read/Study and Contents remain easy to find without a large opening stack.
- Replace the deep dock's stacked title, length, location, mode and action rows with a compact default: a reflowing identity/length row and Back, Contents, Appearance and More actions. Keep direct length access. Read/Study remains visible at entry and available in Appearance and More during deep reading.
- Use one Contents entry in the dock rather than two location triggers. Keep source Ang/reference as secondary context; use a verified section name or opening line when useful.
- Show word meaning and Return/Continue here only when relevant. They expand above the compact dock and dismiss back to it; they do not turn every control reveal into the expanded layout.
- On desktop, avoid presenting two complete control surfaces simultaneously when the fixed header is already usable. Retain a contextual word/return surface when required.
- Retain the existing hide/reveal behavior, focus protections and native long-press selection. Do not intercept scripture swipes or introduce another reading mode.

At standard phone text sizes the default dock should use two compact rows rather than the current multi-row stack. At enlarged sizes it must reflow freely; accessibility takes precedence over a fixed height. Revealing controls must not obscure the active passage or overwrite its saved location.

## 3. Contents and Find: clearer orientation

- Rename the visible navigation action consistently to Contents; the sheet visibly separates Contents and Find within this bani.
- On ordinary Contents opening, reveal the current section inside the sheet's own scroller. Do not jump the underlying reading or force focus away from the sheet controls.
- Prefer verified section labels; use actual opening text where a reliable name is unavailable. Do not invent pauri labels or treat composite source Ang numbers as a linear bani sequence.
- Preserve the query, results and result-list position during the current exact reading. Clear them when bani/source/variant/length identity changes; closing and reopening the sheet alone should retain them. Reopening an active search restores its results rather than overriding them with the Contents current-row reveal.
- Highlight matched display text safely without modifying canonical strings or breaking Gurmukhi graphemes. Keep source and location visible when identical lines appear more than once.
- Preserve the existing exploratory Return to previous place and Continue here behavior across repeated result/section jumps. Keep search text local to the reading session.

## 4. Typography and reading comfort

Refine the existing controls and layout rather than adding a new settings system:

- Make script title, canonical Gurbani, transliteration, meanings and provenance have a consistent, clear hierarchy in light and dark themes.
- Tune width, line spacing and section spacing for the available viewport and chosen font size. Preserve Gurmukhi matras, punctuation, Larivaar and supported scripts without rewriting text.
- Keep Read visually focused on canonical text; keep Study layers legible without competing with it. Preserve existing meaning-source and fallback disclosures.
- Add an independent support-text size choice inside the existing Study layers settings, preserving the current default. Include enabled transliteration/meaning layers in the appearance preview so the result is reviewable before returning to the text. Keep Gurbani size independent and preserve the exact reading anchor when either size changes.
- Preserve the exact semantic reading anchor through appearance, mode, orientation and length changes. Existing version validation, font settlement and incoming-resume safeguards stay authoritative.
- Keep screen-awake behavior and native selection working with the smaller dock. Do not add automatic scrolling, page-turn effects, audio work or memorization modes in this pass.

## 5. Completion and the next reading

- Keep explicit completion and targeted Undo, including the version actually completed.
- Offer next-bani navigation even with tracking disabled. In that state, derive the next item from personal order and offer Continue to [bani] without completion language or history writes. Stop at the end of the selected routine and offer Home/Read again.
- With tracking enabled, preserve the next-incomplete behavior and save-before-navigation semantics. Reaching the end of the text never completes a bani automatically.
- Keep one clear primary ending action, the next bani's identity and quieter Home/Read again choices. Existing persistence errors remain retryable without losing the current text.
- On returning Home, reveal the relevant rail card and retain truthful completion/reread state. A successful complete-and-continue intentionally opens the next reader; manual completion alone does not.

## Required states

| State | Expected result |
| --- | --- |
| Fresh routine | First incomplete card; Begin |
| Active practice | Exact card/version/source/verse; Continue |
| Browsing another card | Card changes; active paath and top Continue do not |
| Completed card | Read again and immediate Undo remain reachable |
| All complete | Quiet completion summary above browsable cards |
| Tracking disabled | Reading/navigation work; no progress or completion controls |
| One bani | Full-width card; no pagination controls |
| Empty routine | Choose your banis; no empty carousel |
| Short completed, Long being read | Both states remain distinct; daily credit survives |
| Offline | Badge reflects verified exact cache; unavailable length keeps current text |
| Routine reorder/removal | Stable browsed ID or deterministic nearby fallback |
| Midnight/reload/return | Existing practice rules and exact place survive |
| Storage failure | Honest retry/session feedback; no false completion or lost text |

## Implementation sequence and ownership

1. **Home interaction contract and regression coverage.** Separate browsed state from practice; cover manual completion/Undo in the integrated Home flow. Update tests that explicitly prohibit a carousel or expect the old two-link composition.
2. **Nitnem rail and card hierarchy.** Implement native scrolling, explicit navigation, reflow, full-list access and return context. Adapt the current exact-route snippet/cache loader to the visible card; cancel stale results and avoid fetching all bani payloads for Home.
3. **Compact reader chrome.** Refine header/dock and conditional context without changing scroll ownership or exact-anchor utilities unnecessarily.
4. **Contents/Find refinements.** Add current-section reveal, session query retention and safe match emphasis.
5. **Ending/navigation refinements.** Add tracking-disabled next-bani handoff and align Home return with the rail.
6. **Integrated quality pass.** Refine shared typography/spacing and resolve regressions across the complete Home → reader → next/return journey.

Primary files: `HomeDailyNitnem.tsx`, `Home.tsx`, `home-daily-nitnem.css`, `ReaderDock.tsx`, `Study.tsx`, `reader.css`, `BaniFindPanel.tsx`, `ReaderFinishPanel.tsx`, associated finish/find styles and meaningful component/integration tests. Extract focused presentational components where helpful; keep state transitions with their existing owners. Avoid unrelated Stories/native work and broad CSS or store rewrites. No backend/schema changes are expected.

## Acceptance and verification

- Browse the complete rail without any change to practice, usual lengths, stored places or completion history.
- Direct-open every selected bani and preserve exact variant/length/source/verse through return and reload. Preserve shared-link behavior and existing first-screen access.
- Manual completion leaves visible Undo, stable focus and stable rail position. Completion and next-reader actions still handle persistence failures safely.
- Tracking-disabled readers can move through their chosen order without creating completion events.
- Contents reveals the current row; repeated Find jumps retain query, source identity and a working Return path.
- No page-wide horizontal overflow; the intentional rail remains the only horizontal scroller. No clipped titles, matras, focus rings or unreachable actions at 320/390/430px, landscape, desktop and 200% interface text; cover English, Punjabi and Hindi, both themes and reduced motion.
- Run focused behavioral tests, then the affected regression suite, TypeScript, lint, production build and existing startup/CSS audits. Add tests for state transitions and actual regressions, not markup snapshots that mirror the implementation.
- The user's latest instruction authorizes DevTools and Lazyweb as needed without routine permission questions. Existing browser/device QA records are historical evidence, not validation of this new design. Report any rendered/device checks not performed separately; automated tests alone do not establish visual perfection or physical-phone comfort.

The outcome is a complete, navigable Nitnem section and a quieter reader with dependable continuity. Completion means the specified behavior and checks pass; aesthetic claims must remain proportional to the visual evidence actually gathered.
