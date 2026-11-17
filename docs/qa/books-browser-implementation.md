# Books layout and Read discovery fixes

Implementation against `1f1c042cacc507528f999f8072ed970f3d9bedbb` on the isolated audit branch. No deployment or account/backend changes were performed for this batch.

## Implemented

- **UX-04:** the shared public bookshelf uses content-sized `auto-fit` tracks with a 16rem minimum instead of fixed 2/3/4 columns. A narrow or enlarged-text shelf receives the full available width; empty columns no longer reserve half the screen for a sole book. Covers remain bounded, while the complete title and summary remain visible. A sole book uses cover-and-copy columns when its container has at least 32rem; text scaling naturally restores the stacked layout. Summary/action text is 0.875rem and titles 1.4rem.
- **ENG-04:** the acceptance helper tests a visible, hit-tested intersection of tall links, without requiring the complete card to fit in the viewport. Horizontal text clipping checks are preserved. Synthetic probes prove that a tall link really activates and that fully occluded and wholly offscreen links fail. HTML/body overflow is treated as viewport overflow, avoiding false clipping from the translated root rectangle.
- Search is focused before its contextual scope controls are used. Selecting Books is checked through its cleared query and visible query-recovery control, because inactive search is intentionally unmounted there.
- The book-resume journey now uses the actual shelf → overview → Continue reading entry point, verifies the precise block link after visiting a Bani, and verifies the saved block is visible following reload. Narrow/large-text book Open labels receive actual pointer activation, followed by independent keyboard Enter activation and return.
- A supplemental READ-01 browser case verifies the corrected chapter titles in Contents and the same Battle of Chamkaur title in full-text search results. It only checks display metadata; no source text is edited by this batch.

## Verification

Node 22.23.5, desktop Chromium with isolated browser contexts, deterministic providers and blocked unexpected external requests. This is development-server fixture evidence, not physical iPhone/PWA or live authenticated integration proof.

- Existing `LibraryBookBrowser.test.tsx`: **9/9 pass**.
- QA script syntax and targeted ESLint: **pass**.
- CSS selector audit: **34 files pass**, with no allowlist or threshold changes.
- Revised original Read discovery matrix: **17/17 named cases pass**.
- Added shelf matrix: **24/24 named configurations pass**; English/Punjabi/Hindi × 320/390/430px portrait and 844×390px short landscape × 100%/200% text. Each configuration checks both one and four synthetic long-title books, full title/summary horizontal accessibility, usable text measure and reachable Open labels. These are 48 catalogue states, not 48 additional named cases.
- Combined recorded run: **41/41 named cases pass**, evidence at the implementation workspace's `books-read-discovery-final/results.json`. Internal screenshots include narrow phone text/action, multilingual large text and one/multiple landscape shelves.
- The final desktop sole-book refinement and READ-01 supplemental check both **pass (2/2)**, recorded separately in `books-final-supplement/results.json`. The script now contains 42 named cases in a complete unfiltered run.

At 320px, a synthetic sole book uses all **288px** of the normal-text shelf and all **256px** at 200% text. Longer content may scroll vertically; no title/summary is clipped or reduced to satisfy a viewport-height assertion. The short-landscape sole-book layout uses a 796px row with a bounded cover and separate readable copy column.

## Changed files and rollback

- `src/styles/library-book-browser.css`
- `scripts/qa/read-discovery-acceptance.mjs`
- This implementation note

No schema, storage or content migration is required. The layout is independently reversible, although reverting it reintroduces UX-04. Retain the corrected behavioral acceptance checks when adjusting presentation. No real-device accessibility or screen-reader conformance claim is made.
