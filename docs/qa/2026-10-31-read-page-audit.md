# Read page audit — 31 October 2026

This audit reviews the current local working tree of NaamRas, including the Read discovery page at `/banis` and the reading journeys it launches. It is an audit of the implementation available during this session, not a claim that the same version is deployed in production.

Browser review uses a rebuilt local review harness with HashRouter routing and fixture-backed data. Screenshots can establish layout defects in that build, but fixture success is not proof of live provider availability, production deep-link routing, or physical-device behaviour. Record any additional real-provider checks separately in the verification matrix.

The artwork-led composition and introductory content are intentional product preferences. Their presence is not counted as a defect. Preserving the fixed reader scrolling behaviour is a constraint on any follow-up work.

No application fixes were made as part of this audit. The temporary tests described below confirm existing symptoms; passing them means the reported symptom was reproduced, not that it was repaired.

## Evidence and priorities

| Label | Meaning |
| --- | --- |
| Browser reproduced | Observed in the current browser build. The tested surface and conditions should accompany the finding. |
| Targeted test | A focused automated reproduction demonstrates the reported behaviour or a directly implicated helper. |
| Code confirmed | The implementation establishes the behaviour, but the complete interaction has not necessarily been reproduced in a browser. |
| Risk pending measurement | A credible concern that requires device testing, profiling, or additional observations before its user impact can be stated as fact. |

P1 means a material interruption to discovery or reading and should lead the next refinement pass. P2 means a real functional, navigation, or resilience defect. P3 means a usability or consistency improvement. Evidence strength and priority are separate: a code-confirmed risk is not automatically a browser-confirmed failure.

## Findings at a glance

| ID | Priority | Finding | Evidence |
| --- | --- | --- | --- |
| V01 | P2 | Desktop “Browse collections” heading occupies an unintended second column. | Browser reproduced; Code confirmed |
| V02 | P1 | Book card text and Open book are clipped at 320px with doubled interface text. | Browser reproduced; Code confirmed width constraints |
| V03 | P1 | Expanded Sources hides Ang links and pagination at 320px with doubled interface text. | Browser reproduced; Code confirmed sizing risks |
| D01 | P1 | Late search results can request scrolling back to the input after the user has moved into results. | Targeted test of scroll helper; Code confirmed call path |
| D02 | P2 | Recent searches do not retain their Books, Stories, Gurbani, or All scope. | Targeted test; Code confirmed |
| D03 | P2 | A malformed search mode URL can crash Read rendering. | Targeted test; Code confirmed |
| D04 | P2 | Clearing recent searches immediately removes pinned searches too. | Targeted test; Code confirmed |
| D05 | P2 | Amrit Keertan discovery state is lost after leaving for a shabad. | Code confirmed |
| D06 | P2 | Rehat’s Read breadcrumb returns to Banis rather than the Books collection of origin. | Code confirmed |
| D07 | P3 | Books and Stories empty states offer the same Gurbani-specific examples. | Code confirmed |
| D08 | P3 | Continue reading does not cover all reading types offered by Read. | Code confirmed; coverage improvement |
| D09 | P3 | Continue reading has no way to dismiss one unwanted saved place. | Code confirmed; usability improvement |
| R01 | P3 | The mobile Search keyboard action has no deliberate submit/focus behaviour. | Code confirmed; device impact pending |
| R02 | P3 | Broad book search loads and scans a substantial full-text index. | Code confirmed size and call path; Risk pending measurement |
| E01 | Investigate early | Book passage tracking may become stale on wide/short viewports. | Code and standards analysis; browser measurement pending |
| E02 | P2 | Book and Rehat appearance changes lack semantic passage preservation. | Code confirmed; deep-passage browser reproduction pending |
| E03 | P2 | Story jump clearance does not follow the actual sticky-header height. | Code confirmed CSS mismatch |
| E04 | P2 | Most book-reader controls ignore the selected Punjabi/Hindi interface language. | Code confirmed |
| E05 | P3 | Find and prose-size controls differ across readers. | Code confirmed capability gaps |
| O01 | P2 | A downloaded Stories shelf can wait for a hanging network request before appearing. | Code confirmed; slow-network browser test pending |
| O02 | P2 before catalog expansion | Downloaded book metadata hides later online catalog additions. | Code confirmed conditional defect |
| C01 | Editorial priority | All eight published stories still await independent history and English review. | Current content metadata and validation |
| C02 | Editorial priority | The English book retains disclosed OCR and reference limitations. | Current edition metadata |

## Visual and responsive findings

### V01 — Desktop Browse heading creates an unintended grid column

**Evidence: Browser reproduced; Code confirmed.** The current rebuilt page at a 1200px viewport places “Browse collections” in an orphaned right-hand column beside the hero, while the collection tabs remain beneath the search in the first column.

The cause is a surviving rule from the previous desktop layout:

- `src/styles/reader.css:715–730` assigns every non-hero direct child of `.read-room-stack` to grid column 2 at widths of at least 760px.
- `src/styles/reader.css:802–805` subsequently forces the stack to a one-column grid.
- `src/styles/reader.css:808–812` explicitly returns the hero, tabs, and panels to column 1, but does not include the newly added `.read-browse-heading`.
- The heading is a direct child at `src/pages/Banis.tsx:1440`. Its rule at `src/styles/read-discovery.css:185` sets only margin, padding, and font size.

An item explicitly placed in column 2 creates an implicit second column despite the one-column template. The obsolete `grid-row: 1 / span 8` on the hero at `src/styles/reader.css:736` also survives the newer layout overrides.

**Recommended correction:** remove or correctly scope the old desktop grid rules. A narrow correction must include the Browse heading in the column reset and clear the obsolete hero row span. Verify at 759px, 760px, 1024px, and 1200px, including a long search-results view and large interface text.

### V02 — Enlarged text clips the book card and its primary action

**Evidence: Browser reproduced.** At 320×844 with root text set to 200%, in the dark Books collection, the Panth Prakash description, metadata and Open book action extend off the right edge. This is lost content and access, not merely an unattractive wrap.

`src/styles/library-book-browser.css:6` gives the action a `min-width:9rem`, or 288px at the tested size. The narrow rule sets `width:100%` without removing that minimum. The remaining five-rem cover, one-rem gap and two-rem horizontal padding already consume 256px before the prose column. Reflow this card to one column when its content cannot fit, and remove the action's minimum-width conflict. Preserve full text and a visible action at 320px/200%.

### V03 — Enlarged Sources hides Ang links and pagination

**Evidence: Browser reproduced.** At the same 320×844/200% configuration, `/banis?collection=sources&sourceOpen=sggs&sourcePage-sggs=21` displays only the left portion of the Ang 1001–1050 grid. Other number columns and the Next action fall outside the visible page.

The five-column grid never changes column count (`src/styles/source-browser.css:12`). Its collection grid has an implicit mobile column rather than an explicit shrinkable track (`src/styles/reader.css:1136`), and the source section and jump-form controls lack sufficient minimum-width resets. Ancestor sizing needs measurement during repair; the exact dominant intrinsic-width contribution is not yet isolated. The source card and document clipping hide the result. Correct the parent sizing as well as making the number grid adaptive.

**QA gap:** `scripts/qa/read-discovery-acceptance.mjs:58–60` checks document scroll width only. Clipped descendants can pass. Its collection loop at lines 236–240 does not expand Sources and photographs the tabs rather than the lower book action. Add visible-bounds and clipping checks for the actual number links, pagination, description and Open book control. Do not remove the reader's established scroll constraints as a blanket workaround.

### Visual and interaction refinements

These are design judgments, distinct from the defects above:

- Preserve the historical artwork, restrained gold accents, serif editorial headings and quiet reading surfaces. The sampled 390px light/dark layouts are coherent, and the story reader has good prose rhythm.
- Recent searches can show all 12 stored entries (`Banis.tsx:1413`, `recentSearch.ts:106`). This can add a long utility list above collection browsing. Show a few recent items with expansion, or reveal history on search focus. This preserves the preferred artwork and introductions.
- The search scope buttons and collection tabs repeat Books/Stories but do different jobs. Make their relationship clearer through grouping and concise labels; selecting a collection currently exits search.
- Continue reading repeats the same cross-collection list in each collection. Preserve the universal shelf, but consider prioritizing the current collection and providing a route to all places. Add per-item dismissal (D09).
- Mobile reader headers use a separate icon row and title row, with a third controls row for Bani. Keep a persistent header, but investigate fitting short titles beside actions and keeping source context out of the main control row where redundant. Preserve 44px targets and stable geometry; do not introduce scroll-triggered collapse or hiding.
- Some secondary metadata and search placeholders look subdued. Measure contrast against actual resolved colors before calling this a conformance failure. This audit did not run a fresh contrast or VoiceOver certification.

## Search and discovery

### D01 — Late search responses can override user scrolling

**Evidence: Targeted test of the scroll helper; Code confirmed call path.** `revealSearchFeedback()` measures the input and first result/feedback anchor and calls `scrollAppTo` when its preferred position differs from the current position (`src/pages/Banis.tsx:651–688`). It is invoked after individual remote providers, book results, story results, and final completion (`src/pages/Banis.tsx:897–925`).

`src/utils/searchReveal.ts:25–33` moves back toward the input when the input is above the visible viewport. There is no focus requirement or user-scroll cancellation in this reveal function. A targeted reproduction with a user scroll position of 900px and an input 600px above the viewport returns a new scroll position of 282px.

**Impact:** after initial results arrive, a reader can scroll down to inspect them; a slower result provider can subsequently request a jump back toward the search field. This is a discovery-page behaviour, distinct from the previously fixed long-reader scroll stutter. The helper reproduction alone does not measure animation smoothness or prove the complete delayed-provider browser interaction.

**Recommended correction:** make automatic reveal belong to the explicit search action, rather than every response. Cancel any pending reveal after user wheel, touch, pointer, or keyboard navigation. Preserve the existing reader scroll architecture.

**Browser verification to add:** delay one search provider, allow another provider to render results, manually scroll below the input, then release the delayed response and inspect scroll position.

### D02 — Recent searches lose their content scope

**Evidence: Targeted test; Code confirmed.** `RecentSearchItem` stores query, mode, source, pinned state, and timestamp, but not All/Gurbani/Books/Stories scope (`src/store/recentSearch.ts:6–11`). The recent-search click restores mode and scripture source only (`src/pages/Banis.tsx:1415–1423`).

**Reproduction:** with a saved “Bhai Lalo” search and Books currently selected, select that recent item. The targeted test confirms that `getLibrarySearchMatches('Bhai Lalo')` runs and the story-search provider does not. A search previously made in Stories is indistinguishable in storage from the same query made in another scope.

**Recommended correction:** store scope as part of the search identity and restore it atomically with query, mode, and source. Show the content scope in each recent item so the user can predict what it will reopen. Migrate existing entries safely.

### D03 — Inherited object keys are accepted as search modes

**Evidence: Targeted test; Code confirmed.** Opening `/banis?mode=__proto__` causes a React rendering error: “Objects are not valid as a React child.”

`src/pages/Banis.tsx:238–243` validates mode and source using `value in OBJECT`, which accepts inherited object properties. `src/components/read/ReadSearchControls.tsx:73` then renders `labels[mode]`, which is an object for this input.

**Recommended correction:** validate against an explicit set or own properties for both mode and source. Invalid URL values should fall back to a supported default. This is a malformed-link resilience issue; it is not evidence of account or data compromise.

### D04 — Clear history also removes pinned searches

**Evidence: Targeted test; Code confirmed.** The Clear button at `src/pages/Banis.tsx:1410` calls `clearRecent`, which empties the entire list at `src/store/recentSearch.ts:116`, including pinned items. The targeted test confirms that a pinned search is removed.

**Recommended correction:** make Clear history preserve pinned searches, or explicitly distinguish clearing history from removing saved searches. An undo would make accidental removal recoverable.

### D07 — Empty-state examples do not match the selected content type

**Evidence: Code confirmed.** The examples are always “Japji Sahib,” “ਵਾਹਿਗੁਰੂ,” and “hukam.” `src/pages/Banis.tsx:1394–1399` renders them for Books and Stories as well as Gurbani. Selecting an example preserves the current scope (`src/pages/Banis.tsx:948–952`).

The supporting sentence changes by scope, but the suggested actions do not. A Stories search can therefore offer examples that do not correspond to the story catalog.

**Recommended correction:** use examples known to produce useful results in the selected collection, such as Panth Prakash for Books and Bhai Lalo or service for Stories.

## Navigation and reading continuity

### D05 — Amrit Keertan drops its search, ordering, and expansion state

**Evidence: Code confirmed.** Amrit Keertan stores query, visible header count, sorting, English preview preference, and expanded metadata only in component state (`src/pages/AmritKeertan.tsx:176–180`). Launching a shabad at `src/pages/AmritKeertan.tsx:297–307` carries the section reference into Study but not this discovery state. Returning after unmount resets these local values. The Read breadcrumb at `src/pages/AmritKeertan.tsx:341` also always targets `/banis`.

**Recommended correction:** preserve the query, ordering, expansion count, selected row, and full Read origin in URL/return state, following the existing main Read discovery pattern. Test both browser Back and the reader’s own return control.

### D06 — Rehat’s Read breadcrumb loses the Books origin

**Evidence: Code confirmed.** Rehat is launched from the Books collection through `src/pages/Banis.tsx:1939–1943`, without origin state. Its Read breadcrumb is hardcoded to `/banis` at `src/pages/Rehat.tsx:83`. Consequently, that breadcrumb opens the default Banis collection instead of returning to the Books collection and location from which the user arrived.

**Recommended correction:** carry the full discovery origin through companion-reader navigation. A direct-entry fallback can use the Books collection. This finding concerns the in-page breadcrumb; browser history may preserve a different return path.

### D08 — Continue reading has deliberate coverage limits

**Evidence: Code confirmed; coverage improvement.** `src/store/readingPlaces.ts:31–46` recognises exact bani routes, whole-source routes, and book chapters. It excludes shabad and Hukamnama routes and does not recognise plain standalone Ardaas or Rehat. Stories are handled separately by `src/hooks/useContinueReadings.ts:95–102`.

The existing implementation does not promise a location for every route it displays. The product consequence is that some reading journeys have a continuation card while others do not.

**Recommended correction:** define continuity rules for Rehat and standalone readings. Do not automatically populate Continue with every short shabad opened during search. Preserve exact bani variant and length identity.

### D09 — Continue reading cannot dismiss one unwanted place

**Evidence: Code confirmed; usability improvement.** `src/components/ReadContinue.tsx:33–40` offers links and Show all/Show fewer, but no per-item removal. The underlying store has a 50-place bound.

**Recommended correction:** provide a quiet per-item hide/remove action with undo, so accidental or abandoned readings need not remain until they age out. Keep this secondary to the main continuation action.

## Reader experience and scroll protection

### E01 — Book passage tracking needs a real-browser geometry test

**Evidence: Code and standards analysis; impact pending measurement.** `LibraryChapterReader.tsx:495–505` observes blocks with `rootMargin: '-18% 0px -65% 0px'`. The [W3C Intersection Observer specification](https://www.w3.org/TR/intersection-observer/#intersectionobserver-interface) resolves these percentages against the root's width. At 1440×900 the total vertical inset is approximately 1195px, so the observation region can collapse. The saved block can remain stale except for the explicit document-bottom fallback.

The callback also chooses only among the entries that changed in that notification, rather than all blocks currently at the reading edge. Verify `rootBounds` and actual saved blocks at wide desktop, landscape mobile and portrait mobile sizes. Use a header-aware passage anchor or a correctly measured observation band, preserving settled-scroll persistence. This audit does not claim a measured frequency of lost book positions.

### E02 — Appearance changes should preserve a passage, not a pixel offset

**Evidence: Code confirmed; full browser reproduction pending.** Book size/spacing/width changes directly update preferences (`LibraryChapterReader.tsx:774–806`), and Rehat does likewise (`RehatReaderHeader.tsx:68–70`). Neither captures and restores a semantic paragraph anchor. Modal dismissal restores the earlier pixel offset (`appScroll.ts:406–440`), which need not identify the same passage after text reflows. Story and Bani already have semantic preservation logic. Apply that contract to Books and Rehat, with a deep-chapter resize/close/reopen check.

### E03 — Story resume offsets use the former header size

**Evidence: Code confirmed CSS mismatch.** `stories.css:84,86` reserves `5rem + safe area` for paragraph and section jumps. The shared header wraps into two rows below 440px and grows with title/text size (`persistent-reader-header.css:67–72`). Story resume and jumps call `scrollIntoView` (`StoryReader.tsx:266,332,355`). A target can begin underneath the taller header. Use the measured `--reader-header-height` as Books/Rehat do, then check real restored targets with long titles and doubled text. The normal mobile story header was visually reviewed; all jump combinations were not.

### E04 — Book interface localisation is incomplete

**Evidence: Code confirmed.** Book content is intentionally English, but Contents, appearance controls, progress, search, loading/error states and chapter navigation are also hardcoded English (`LibraryChapterReader.tsx:545–567,634–635,652–664,684–813`). Bookmark copy alone follows locale. Translate the interface consistently while retaining the original English work.

### E05 — Reading tools and sizing have inconsistent capability

- Bani can find text through Contents; Rehat provides a direct Find action. Books can navigate matches arriving through a `?find=` search route but cannot initiate a new body search inside the reader. Stories have no in-story Find. These are capability gaps, not broken buttons.
- Story, Book and Rehat prose controls top out at 130% (`epubReader.ts:30–32`). A larger supported app range would help readers who need it. This ceiling alone does not establish a WCAG failure, since browser enlargement is separate.
- Rehat has no durable paragraph resume/bookmark integration. Add it deliberately alongside D08 rather than filling Continue with every short search result.

**Verified strengths:** Bani progress work is largely deferred until scrolling settles; verse lookup uses binary search; height-only browser-chrome resize avoids header relayout; shared headers retain 44px controls. The sampled Bani Read/Study switch and appearance sheet rendered and operated in the review bundle. Its synthetic two-verse content is unsuitable for assessing long-reader frame pacing.

Any implementation following this audit should retain the established single scroll owner and avoid adding per-scroll layout measurement, repeated React state updates, or show/hide header animation without a measured need. The discovery search-reveal finding above should not be described as proof that the old reader stutter has returned.

## Offline and failure recovery

Code inspection establishes useful existing recovery behaviour:

- Search cancels stale requests and uses bounded provider deadlines.
- Fulfilled providers can remain visible when another provider fails; partial results have a distinct explanation and retry action.
- Sundar Gutka catalog failures have an explicit in-place retry.
- The book catalog has separate loading, empty, offline/error, and retry states.
- Stories expose download status, errors, and removal controls.
- Book continuation validates edition revisions before using an exact saved passage; an unvalidated edition can fall back to its overview/chapter.

### O01 — Downloaded Stories shelf still waits on the network

`StoryBrowser.tsx:44` waits for `loadStoryCatalog`. That loader requests the network first and only returns a durable cached catalog after failure (`storyRepository.ts:120–138`), with a 12-second timeout. A hanging connection can therefore delay the already-downloaded shelf, even though downloaded story bodies open immediately. Render a validated cached catalog first and refresh it independently. This was identified in code, not by an offline service-worker browser run.

### O02 — Downloaded metadata can freeze book discovery

`libraryRepository.ts:61–64` prefers downloaded resources for all requests, including the global manifest/catalog. `libraryOffline.ts:106–116` supplies only downloaded works for that catalog. Once a user downloads Panth Prakash, later online additions can remain absent. There is currently one work, so this is a conditional expansion defect. Keep downloaded content fast while refreshing and merging the discovery catalog independently.

**Performance risk:** offline resource reads can repeatedly parse and validate whole downloaded works (`libraryOffline.ts:95`). The current chapter payload is approximately 4.35MB plus the 1.41MB search index. Profile cold mobile opening before choosing memoization or resource-level storage. No current latency number was measured.

## Content and localisation

The discovery audit identifies scope-specific empty examples (D07) and uneven continuation coverage (D08). The code also separates scripture sources from the book catalog, preserves reviewed exact bani variants, and avoids numeric Amrit Keertan routes unsupported by its provider.

### C01 — Stories need editorial completion and broader coverage

The published catalog has eight stories in three collections, 3,737 words total, all labelled as approximately three-minute readings. Six centre on Guru Nanak, and all eight use Macauliffe as a narrative source. Three longer drafts remain unpublished.

All eight packages still mark both independent history/Gurmat review and English review as pending (for example `public/data/stories/bhai-lalo.json:111`). The reader honestly discloses this in Sources. Finish those reviews, strengthen cross-source verification and expand periods, people and reading lengths. The present collection is a small introduction, not yet a broad historical library. Do not remove the traditional-account distinctions or imply that schema validation establishes historical truth.

### C02 — The book has disclosed source and OCR limits

The current English library contains one work, Panth Prakash, with 169 episodes across two volumes. Its `work.json` discloses remaining OCR issues and reference limitations, including unreviewed Volume I appendix material, absent verified individual note links, no Episode 39 appendix heading and no Volume II references appendix. Address these through edition review and proofreading, preserving provenance and transparent notes.

Discovery and source-jump interface localisation is substantially better covered than the book reader. English source texts and proper titles should remain distinct from the user's selected interface language.

## Risks requiring further measurement

### R01 — Mobile Search key behaviour needs an explicit interaction decision

**Evidence: Code confirmed; device impact pending.** `src/components/read/ReadSearchControls.tsx:58–65` wraps the search input in a div and sets `enterKeyHint="search"`, but handles only `onChange`. There is no form submission, Enter handler, debounce flush, or deliberate focus transfer/dismissal. Searches run after a 300ms debounce (`src/pages/Banis.tsx:883–927`).

**Recommendation:** verify the interaction on an actual iPhone. Decide whether the keyboard Search action should immediately settle pending search and dismiss the keyboard or focus the result region. Browser-native keyboard dismissal varies, so this audit does not claim that the keyboard is trapped.

### R02 — Full-text book search should be profiled as the catalog grows

**Evidence: Code confirmed size and call path; Risk pending measurement.** The Panth Prakash search index is 1,410,266 bytes uncompressed. `src/utils/appSearch.ts:435–460` loads each work’s full-text index and scans its chapters for each search. The repository caches fetched indexes; this does not mean 1.4MB is downloaded again for every keystroke.

**Recommendation:** measure cold search latency, main-thread cost, and interaction latency on a modest phone before deciding whether to pre-normalise text, reduce index payload, move scanning into a worker, or change indexing strategy. No measured search stutter or frame-rate regression is asserted here.

## Strengths to preserve

- Most main Read collection, expansion, search facet, result expansion, and source-page state is encoded in URLs.
- Source jumps validate their permitted range and accept Punjabi numerals.
- Exact bani variants and selected lengths are preserved in routing and continuation identity.
- Discovery return state is captured at an actual reading handoff rather than on every scroll.
- Return restoration cancels when the user begins an interaction.
- Book edition revisions protect against resuming at an invalid old passage.
- Story search describes its title/person/theme scope rather than implying unrestricted full-text search.
- Artwork failures show a descriptive fallback.

## Verification record

### Focused symptom reproductions

Command:

```sh
npx vitest run --configLoader runner --config tmp/read-audit-20261031/audit-repros.config.ts
```

Result: **4 tests passed, 1 test file passed**, 2.38 seconds in the recorded run.

| Reproduction | What it establishes | What it does not establish |
| --- | --- | --- |
| Recent search selected while Books is active | The saved query runs against the current Books scope, not an original Stories scope. | Correct scope restoration; the test intentionally confirms the omission. |
| Clear after pinning a recent search | Pinned items are erased by the current clear action. | A repaired history/pin interaction. |
| Render `/banis?mode=__proto__` | The malformed mode triggers the React child-object rendering error. | A corrected URL validator. |
| Late-reveal scroll-helper geometry | The helper requests a jump from 900px to 282px for the tested scrolled layout. | A full browser delayed-provider reproduction or physical-device performance result. |

The first attempt to start Vitest used the default config bundling path and hit a filesystem permission error under the symlinked dependency directory. `--configLoader runner` avoided that temporary bundle write. One initial test selector expected “Auto detect” rather than the displayed spelling; the selector was corrected and the four-test rerun passed. These were harness issues, not additional app failures.

Temporary reproduction files are in `tmp/read-audit-20261031/`. No application source file was changed.

### Broader suite and browser matrix

**Existing tests:** 16 files / 216 tests passed in this audit: 9 files / 135 discovery, story, library, offline and continuation tests; 7 files / 81 reader, header, presentation and scroll-architecture tests. The four symptom reproductions are additional and intentionally assert the present defects. Story and library corpus validation passed (8 stories; 1 work).

**Browser review:** current source rebuilt into the existing local file review bundle; desktop at a 1200px window, mobile responsive viewport 390×844 in light/dark, and 320×844 dark with 200% root text. Viewed Banis, Books, Stories, Sources, a story reader, Bani Read/Study and its appearance sheet. The enlarged-text checks specifically reached the lower book card/action and expanded Ang 1001–1050 grid. Screenshots were inspected during the session. Test corpus and pre-existing local QA reading places were used; displayed fixture verses/counts are not claims about the production scripture corpus.

**Limits:** local HTTP server startup failed with `listen EPERM`; the DevTools connector had a profile lock. Native Chrome UI allowed review of the rebuilt file-compatible bundle instead. This does not verify production HTTP routing, real provider responses, service-worker/offline delivery, authenticated cross-device sync, VoiceOver, physical iPhone momentum scrolling, or measured Core Web Vitals. No fresh full production build, whole-repository lint, exhaustive test suite or live deployment check is claimed. Existing geometry tests use jsdom/mocks; passing them does not certify every responsive layout.

## Suggested implementation order

1. Fix enlarged-text clipping and add assertions for visible controls; correct the desktop Browse heading placement.
2. Stop delayed search scroll overrides; validate malformed URL parameters; restore complete recent-search intent and preserve pinned searches.
3. Reproduce and fix book passage tracking, then unify appearance anchoring, Story header clearance and Amrit Keertan/Rehat return behaviour.
4. Repair offline catalog freshness/latency and book interface localisation; define Rehat continuation and consistent Find behaviour.
5. Complete content reviews and source proofreading. Improve history density, empty-state examples and continuation controls while retaining the artwork-led direction.
6. Profile real-device cold search/book opening before performance refactoring. Require a real iPhone long-bani scroll check before any release touching reader layout or scroll logic.
