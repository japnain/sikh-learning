# Private reader reliability implementation

Base: `1f1c042cacc507528f999f8072ed970f3d9bedbb`. Implements ENG-02, ENG-03 and READ-L01 from the November 16 audit. No publication, production migration or private user content was involved.

- Removed the sole unused `.read-collection-intro--library img` rule after checking source, native files, public files and scripts. Current artwork markup/crop rules remain unchanged.
- Routed private reader restore, appearance reflow, references, bookmark jumps, position capture and scroll subscriptions through `appScroll`. Visible viewport dimensions now come from the same abstraction.
- Notebook highlight overlays subscribe through the shared utility, including nested table/overflow scrolling. The utility's optional capture flag preserves ordinary document-only consumers and removes the exact registered listener.
- Reader chrome now requires an explicit location unit. Reflowable Scroll uses Section/Previous section/Next section and matching scrubber text. Paginated text, original-page images and PDF use Page labels.
- Captured the personal-data owner generation per private reader session. A previous session cannot flush or export a departure snapshot, update reading state, or begin annotation persistence after ownership changes, even before the private-access epoch observer catches up. Delayed accepted save responses also check both guards.

## Verification

Before edits, `scrollArchitecture.test.ts` reproduced exactly two offenders: PrivateBookReader and PrivateReaderNotebook. `qa:css-selectors` reproduced the orphan selector. An initial test attempt could not write through the shared dependency symlink; the writable dependency copy resolved that environment issue.

All 10 reader/scroll test files pass **137/137 tests under Node 22.23.5**, including the final ownership regression. Added tests cover three-section navigation and scrubber vocabulary, page vocabulary for paginated prose, semantic source blocks and image waits through the shared scroll API, the visual viewport height in progress calculations, highlight repaint/cleanup, nested scroll capture, and cleanup during an owner change.

Existing reader tests also exercise source notes, poems/lists/tables, denied access, rejected position loading, protected search, original-image/PDF navigation, zoom, source restoration after reflow, sheet coordination, note retry, exact selected quotes, annotation byte limits, inert source text, gesture restrictions, pagination and locator ranges.

`scripts/qa/private-reader-acceptance.mjs` passed **3/3 Chromium configurations**, each with all eight checks: section navigation, appearance-sheet position preservation, semantic resume on Scroll→Pages, deliberate page turn, exact-text highlight creation, note saving, reload persistence, and Escape/focus restoration. Configurations were 320×568 at 100% text, 390×844 at 200% text (including after reload), and short landscape 844×390 at 100%. All three had zero page errors, console errors or external requests. The 320px screenshot was visually inspected for readable measure and reachable unclipped controls.

The fixture imports the actual production reader components and styles into a Vite development entry. Book/access modules are intercepted with original synthetic prose and a local persistence adapter; annotation limits are read from the production module. It verifies browser rendering and component interaction, not actual authentication, RLS, gateway persistence, or private PDF integration. No real account or private book is opened. A 500ms bounded assertion allows the shared sheet's documented animation-frame cleanup to restore focus; it still requires the exact persistent opener. The initial fixture failures (missing mocked constants and premature focus sampling) were harness defects, corrected without weakening the user-visible assertions.

Run with `QA_PRIVATE_BASE_URL=http://127.0.0.1:4328 node scripts/qa/private-reader-acceptance.mjs` against an already-running Vite server. Exact results and screenshots are in `artifacts/private-reader-acceptance/report.json` and `reader-320-100.png`, `reader-390-200.png`, `reader-844-100.png`; root execution log is `../private-reader-browser-final3.log`.

## Limits and rollback

No authenticated backend, deployed annotation policies, actual iPhone/PWA, VoiceOver, physical on-screen keyboard, or device endurance result is claimed. Chromium fixture persistence is deliberately separate from live service proof. Candidate-wide build, lint and release results are recorded in the overall implementation handoff.

No storage schema or sacred text changed. The visual/scroll changes can be reverted independently without deleting saved anchors, bookmarks or notes. Retain the owner-generation guards when rolling back cosmetic changes; never restore an outgoing-account cleanup writer.
