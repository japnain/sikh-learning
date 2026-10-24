# NaamRas comprehensive product audit — October 24, 2026

## Assessment

NaamRas has a coherent visual identity and a substantial reading foundation. Its largest remaining weaknesses concern continuity, discovery, and the usefulness of the surrounding learning tools. People can enter a polished reader, but finding a particular passage, preserving everything across devices, using a downloaded collection on an unreliable connection, and turning saved words into useful practice remain uneven.

The next investment should close those journeys, followed by editorial depth and consistent language/accessibility. Another general visual redesign is not the highest-value next step.

Recitation, audio matching, and recitation coaching are excluded. Current product scope is the web/PWA app, as explicitly recorded in `docs/qa/release-device-signoff.md:5` and `docs/qa/pwa-home-reader-acceptance.md`. Native signing and App Store submission are not current PWA blockers.

## Scope and evidence

- Inspected the current working tree on `codex/home-nitnem-overhaul`, based on commit `10ed97f`, including existing uncommitted reader, Nitnem, and Stories changes. No application source was changed by this audit.
- Five parallel reviews covered content, state/offline behavior, security/privacy, UX/accessibility, and build/test quality.
- Tested the deployed site at `https://naamras.xyz` in an isolated browser context at a 390 × 844 mobile viewport: fresh onboarding, Home, More and expanded controls, Read, Books, Panth Prakash search and chapter entry.
- **Production is a different build.** Observed production entry: `index-ypdVnRtp.js`; current local build: `index-BgezEB-j.js`. Production Read exposed Banis, Sources, and Books, with no Stories tab. Local Stories findings must not be described as live-site reproductions. Different entry hashes do not alone establish which individual fixes have shipped.
- Local browser serving was prevented by environment socket permissions. Automated tests, builds, source review, isolated reproduction harnesses, and separate production browsing provide the evidence below. This is not a fresh full accessibility matrix, physical iPhone session, live cloud-account test, or penetration test.
- Existing historical audits were checked for superseded claims. Their old pass counts and open native gates are not presented as current results.

Evidence labels: **Live** = observed on the deployed browser build; **Reproduced** = exercised against actual current code with isolated transport/data mocks as stated; **Source** = confirmed control/data flow; **Product judgment** = an opportunity or limitation, not a proven runtime defect.

## What to prioritize

| Order | Workstream | Why it matters | Completion test |
| --- | --- | --- | --- |
| 1 | Protect personal data and make offline promises dependable | A reader should trust that saved work is recoverable and downloaded reading opens immediately | Versioned export/restore; downloaded-story open with a hanging network; durable book download and offline reload |
| 2 | Repair search from query to exact passage | Results currently omit content, hide matches, or require the user to search again inside the destination | Independent local/remote results; all book matches accessible; passage anchors; Devanagari and Rehat find |
| 3 | Repair vocabulary and the daily preview | These are concrete broken outcomes in otherwise polished screens | No blank review answers; Again requeues immediately; context return; real opening verse in Home preview |
| 4 | Make controls consistent and accessible | Settings should work predictably in every supported script and language | Named controls, exposed selected state, consistent size ranges, explained Read/Study behavior, localized secondary routes |
| 5 | Deepen and review the content | More sustained value comes from strong, well-contextualized reading | Reviewed longer Stories, broader coverage, verified book corrections and usable references |
| 6 | Strengthen production feedback and release checks | Passing unit tests currently misses several real journeys | Stories/Bani acceptance in CI, deterministic fixtures, safe provider-failure reporting and an ordinary-user support route |

## Current product findings

### F01 — Personal reading data has no portable recovery path

**Priority: high product need. Evidence: Live + Source.** More reports local-only backup in production. There is no user-facing export/import in More or Saved. Internal `exportLocalSnapshot()` is transport infrastructure, not a backup the user can download and restore. Clearing site data or moving devices therefore has no supported way to recover the whole guest experience.

Evidence: `src/components/CloudSyncPanel.tsx:206`, `src/pages/Privacy.tsx:67`, `src/supabase/snapshot.ts:565`. Production explicitly displayed “Local only” and “Not backed up yet.”

Recommended fix: add a versioned personal-data export/import covering all saved content and continuity, validate restores, and provide a clear merge/replace choice. Do not equate offline caches with personal-data backup. Optional cloud can follow after the conditional defects below are fixed.

### F02 — Backup settings expose unfinished developer configuration

**Priority: medium. Evidence: Live + Source.** The live panel says “Keep NaamRas with you across devices,” but expanding it tells the reader to “Add the Supabase environment variables to enable sign-in and sync.” It also exposes “Public BaniDB fallback ready” and “Offline queue with merge replay.” Ordinary readers cannot act on these instructions, and the headline overstates what this build provides.

Evidence: `src/components/CloudSyncPanel.tsx:14`, `:16`, `:45`, `:50`, `:487`, `:498`. This is separate from whether the underlying local-only design is acceptable.

Recommended fix: show a simple, truthful personal-data section with available backup actions, what is stored on this device, and what cannot yet move across devices. Keep infrastructure diagnostics outside the normal product flow.

### F03 — A downloaded story can hang on a weak connection

**Priority: high. Evidence: Reproduced, local Stories code.** `loadStory()` waits for network-first catalog loading before looking up downloaded story text. The catalog fetch has no deadline. A dead connection that rejects immediately can fall back; a captive portal or hanging mobile request can prevent already-downloaded text from opening.

Evidence: `src/data/storyRepository.ts:56`, `:82`, `:116`. An isolated harness using the actual repository, validation code, and Bhai Lalo data confirmed that offline IDs included `bhai-lalo` while `loadStory()` remained pending behind a never-settling catalog request.

Recommended fix: serve validated downloaded text immediately; refresh metadata in the background with a bounded deadline. Acceptance must test hanging transport as well as explicit offline rejection.

### F04 — Panth Prakash has no durable web download contract

**Priority: medium. Evidence: Live + Source.** Library JSON is fetched and memoized as promises in memory. The service worker caches shell/static resource types, not library JSON fetches, and the build precache excludes those JSON files. Browsing a chapter online does not guarantee it can reopen after an offline reload. HTTP cache can sometimes mask the gap.

Evidence: `src/data/libraryRepository.ts:22`, `public/sw.js:102`, `scripts/copy-public.mjs:45`. Live CacheStorage inspection found no `/data/library/` entries in the app shell, runtime, or reading caches. Reproduction: open episode 1 online, confirm its text and an active controlling worker, emulate offline, then perform an ordinary reload. The app shell opened but the chapter displayed **“Section unavailable.”** A separate hard reload bypassed the shell and is not used as evidence for this finding. Native packaged files are a different case; this finding concerns the web/PWA.

Recommended fix: explicit book/volume download, persistent versioned text storage, verified completion and visible readiness. Test ordinary offline reopen separately from browser hard reload, which can bypass service-worker behavior.

### F05 — External scripture search blocks local book results

**Priority: high for unreliable connections. Evidence: Source.** Read waits for all BaniDB search requests before starting the local library index search. A slow remote service therefore holds up content that could be available locally. Those search transport calls have cancellation but no deadline.

Evidence: `src/pages/Banis.tsx:1326`, `:1348`; `src/supabase/banidb.ts:86`. Immediate local results cover bani routes, not books (`src/utils/appSearch.ts:392`). Other scripture hooks do have timeouts; this is not a claim that all loading is unbounded.

Recommended fix: start local and remote searches concurrently, render each group independently, and allow bounded remote retry without clearing successful groups.

### F06 — Book search hides most matches and loses their location

**Priority: medium. Evidence: Live + Source + corpus counts.** Panth Prakash search finds only the first occurrence per chapter, silently truncates to ten chapters, and links to each chapter's start. There is no total-result count or continuation for the remaining full-text matches.

Evidence: `src/pages/library/PanthPrakashLibraryHome.tsx:148`, `:166`, `:355`. The local index has “Khalsa” in 121 chapters, “Nanak” in 40, “Lahore” in 70, and “Guru” in 136. Live search for “Khalsa” rendered ten chapter links, all without passage anchors. The separate contents list does have Show more; that does not paginate full-text search.

Recommended fix: index block identity, expose every matching chapter/passage through pagination, preserve query context, and open/highlight the match directly.

### F07 — Rehat's in-chapter search is only a filter

**Priority: medium. Evidence: Source.** “Search inside this chapter” checks whether the query occurs anywhere and either shows the whole chapter unchanged or hides it. There is no match count, highlight, jump, or next-match action. A typo removes the reading instead of helping the reader find their place.

Evidence: `src/pages/Rehat.tsx:388`, `:455`, `:537`.

Recommended fix: keep the chapter visible and implement an accessible find-in-text experience with next/previous match navigation.

### F08 — Devanagari find cannot search the displayed script

**Priority: medium. Evidence: Reproduced.** The reader can display Devanagari, but its Find helper matches only original Gurmukhi and Roman transliteration. For the same line, `ਸਤਿ` and `sat` return a match while `सति` does not.

Evidence: `src/utils/baniFind.ts:99`; displayed results are converted in `src/components/BaniFindPanel.tsx:58`.

Recommended fix: index the displayed Devanagari representation alongside canonical text, retaining canonical line IDs and source text for navigation.

### F09 — Search is split between collections

**Priority: medium product opportunity. Evidence: Source.** The main search includes bani routes/scripture/books, but has no Stories index. The Stories tab hides the main search and uses a separate metadata-only story query. A person/topic search in the main Read screen therefore misses potentially relevant stories.

Evidence: `src/utils/appSearch.ts:392`, `src/pages/Banis.tsx:1578`, `src/components/StoryBrowser.tsx:11`, `:105`.

Recommended fix: one search entry with clearly grouped results and optional collection filters. This is a local-branch integration issue; the live build inspected did not have Stories at all.

### F10 — Saving a looked-up word can create an answerless flashcard

**Priority: high. Evidence: Reproduced.** When the original word object has no translation, successful dictionary definitions are shown in the popover but not copied into the saved vocabulary record. Flashcards then reveal an empty answer.

Evidence: `src/components/StudyCard.tsx:432`, `:467`; `src/components/WordPopover.tsx:132`; `src/pages/Vocab.tsx:303`. An isolated React/jsdom reproduction exercised the actual popover and review UI with successful dictionary fixtures and confirmed empty saved meanings and an empty revealed answer paragraph.

Recommended fix: let the user save an explicitly selected, attributed definition or label the word as awaiting a definition. Do not send incomplete cards into review.

### F11 — Again can falsely finish vocabulary review

**Priority: medium. Evidence: Reproduced.** Again assigns a due time equal to the actual current time, but the UI compares it against a clock refreshed once per minute. A failed card can disappear and the screen says no cards are due until that clock catches up.

Evidence: `src/store/vocab.ts:63`, `src/pages/Vocab.tsx:164`, `:270`, `src/hooks/useCurrentTime.ts:3`. Reproduction mounted at 05:00:01 and rated Again at 05:00:03; the card was immediately due in storage but temporarily missing from the review UI.

Recommended fix: use an explicit session queue that immediately requeues failed cards, rather than letting wall-clock polling determine review-session completion.

### F12 — Saved vocabulary loses useful context

**Priority: medium. Evidence: Source.** Saves retain source-line and verse/shabad metadata, but the Vocab screen provides neither the actual source verse nor a return link. Repeated occurrences of the same word/kind collapse into the first saved meaning/context, even when usage differs.

Evidence: `src/components/WordPopover.tsx:144`, `src/pages/Vocab.tsx:312`, `:386`, `src/store/vocab.ts:105`.

Recommended fix: show the saved line and “Read in context”; preserve additional senses/occurrences. A contextual vocabulary tool is more useful here than an isolated word list.

### F13 — Home can preview a heading instead of the Hukamnama's verse

**Priority: medium, prominent surface. Evidence: Live + Reproduced.** On October 24 the live Home preview displayed `ਟੋਡੀ ਬਾਣੀ ਭਗਤਾਂ ਕੀ` and “Todee, The Word Of The Devotees:”. That is a structural heading, not the opening verse. The actual next content line was `ਕੋਈ ਬੋਲੈ ਨਿਰਵਾ ਕੋਈ ਬੋਲੈ ਦੂਰਿ ॥` after the invocation.

Evidence: live API-derived cache marked all these lines `isHeader: false`. The current `isStructuralGurbaniHeadingLine()` also returns false for that Bhagat heading (`src/utils/readerDisplay.ts:72`). Applying Home's exact selector (`src/pages/Home.tsx:443`) reproduces the incorrect selection. Home then uses the heading for both text and meaning (`:447`, `:507`).

Recommended fix: add narrowly scoped real-world heading fixtures and robust preview selection. Preserve every canonical source line in the full reader; do not broadly strip short or unfamiliar Gurbani lines.

### F14 — Enabling meanings in More may appear to do nothing

**Priority: medium. Evidence: Source.** More can enable meanings/transliteration, but a previously saved Read presentation still hides these layers. The controlling Read/Study choice is elsewhere, and the More copy does not explain the dependency.

Evidence: `src/pages/More.tsx:330`, `:374`; `src/hooks/useReaderPresentation.ts:21`; `src/components/StudyCard.tsx:301`.

Recommended fix: expose the presentation choice beside the support controls, or explicitly state that support appears in Study and offer a direct switch. Preserve deliberate scripture-only reading.

### F15 — Expanded settings omit essential accessibility semantics

**Priority: medium. Evidence: Live + Source + accessible-name check.** The script-size slider has no accessible name. Meaning-language buttons communicate their selection only visually. Live accessibility snapshots showed an unnamed slider and no selected state on those buttons, although nearby source controls correctly announced selection.

Evidence: `src/pages/More.tsx:264`, `:372`. The surrounding `SettingsBlock` is a div, not a label; checking the exact DOM structure returned an empty accessible name and zero associated labels.

Recommended fix: label the range programmatically and use a labelled radio group or equivalent selected-state semantics. Include expanded settings in accessibility checks; collapsed scans cannot catch these controls.

### F16 — The same font-size setting has incompatible ranges

**Priority: low. Evidence: Source.** More offers 16–34 in steps of two; the reader offers 18–34 in steps of one. A value valid in one control can be outside the range or step of the other.

Evidence: `src/pages/More.tsx:264`, `src/pages/Study.tsx:2743`, `src/store/language.ts:66`.

Recommended fix: share one constraint definition and normalize persisted values. This is a consistency defect, not proof of unreadable text at every affected value.

### F17 — Setup's Save button misrepresents immediate edits

**Priority: low. Evidence: Source.** Reopening setup shows a final Save action, but script/meaning choices already mutate global preferences. Dismissing the overlay keeps those changes.

Evidence: `src/components/OnboardingSheet.tsx:125`, `:136`, `:145`, `:170`; `src/App.tsx:384`.

Recommended fix: either use draft values committed by Save or retain immediate application and label the final action Done.

### F18 — Punjabi/Hindi interface support stops at secondary routes

**Priority: medium. Evidence: Source.** Rehat and Amrit Keertan controls and explanatory copy are hardcoded English; Stories controls also remain English. Cloud status metrics contain English implementation terms. Choosing another app language therefore produces inconsistent navigation and recovery copy.

Evidence: `src/pages/Rehat.tsx:446`, `src/pages/AmritKeertan.tsx:357`, `src/components/StoryBrowser.tsx:89`, `src/components/CloudSyncPanel.tsx:498`.

Recommended fix: localize interface controls separately from intentionally English books and stories. English source content itself is not a localization defect.

### F19 — The Stories collection is still shallow

**Priority: medium product/content opportunity. Evidence: corpus inspection.** The local published corpus contains eight stories, 3,737 words total, each 431–518 words and labelled three minutes: approximately 24 minutes by the app's displayed estimates. Six centre on Guru Nanak, one on Mata Khivi, and one on Guru Amar Das. Three longer drafts exist but are excluded from production builds.

Evidence: `public/data/stories/`, `content/stories/README.md:9`, `src/App.tsx:39`. `src/components/StoryBrowser.tsx:91` promises deeper readings before the longer drafts are available.

Recommended fix: complete a modest, strong batch of longer pieces with broader historical coverage and related-reading paths. Depth and quality matter more than padding the card count.

### F20 — Story provenance is explicit, but independent review remains pending

**Priority: medium editorial need. Evidence: corpus inspection.** All eight narratives draw their narrative source from Macauliffe's 1909 work. All eight record human history/Gurmat and English review as pending. Some also have Gurbani textual anchors or modern context sources; that should not be confused with independently reviewed narrative history.

Evidence: `public/data/stories/bhai-lalo.json:111` and corresponding records; disclosure is rendered in `src/pages/stories/StoryReader.tsx:630`.

Recommended fix: commission/record the relevant human reviews and compare independent sources where justified. Keep traditional-account labels and source-role distinctions. No finding here asserts that a specific narrative is false merely because review is pending.

### F21 — Panth Prakash's reading edition needs editorial repair

**Priority: medium. Evidence: corpus + Source.** The book is structurally complete, but source OCR artifacts remain, including “Delhi Ruler's Version44” and “S ikh” in episode 1. Reference-like numbers are styled as superscripts without usable reference navigation. A heuristic found 934 footnote-like markers against four note blocks; this is not a verified count of missing footnotes.

Evidence: `public/data/library/works/panth-prakash-english/chapters/episode-001.json:193`, `:247`; `src/pages/library/LibraryChapterReader.tsx:116`. The edition honestly discloses OCR limitations in `work.json:65`.

Recommended fix: a source-verified correction layer and reconstructed reference mappings, with explicit correction status. Do not silently rewrite historical wording. Structural package validation cannot establish editorial accuracy.

### F22 — Newcomers receive reading controls but limited direction

**Priority: product judgment.** The short onboarding is useful, and the README intentionally defines a reading companion. Lack of a course or quiz system is therefore not a defect. However, a newcomer receives little help choosing a first historical reading, understanding terminology, or placing Panth Prakash in its historical perspective.

Evidence: `README.md:3`, `src/components/OnboardingSheet.tsx`, `src/pages/library/PanthPrakashLibraryHome.tsx:272`, `src/pages/library/LibraryChapterReader.tsx:605`. Books currently consists of one substantial work: 169 episodes and 637 readable English source pages.

Recommended fix: an optional “Start here” doorway, short sourced context, terminology help, and related passages. Keep immediate reading access and avoid mandatory longer onboarding.

### F23 — Privacy copy misses a provider used by word lookup

**Priority: medium, resolve promptly. Evidence: Source.** Word lookup automatically calls SearchGurbani's Mahan Kosh endpoint with the selected word. Privacy describes BaniDB/Khalis but does not identify SearchGurbani.

Evidence: `src/components/WordPopover.tsx:120`; `src/api/mahankosh.ts:5`, `:56`; `src/pages/Privacy.tsx:47`, `:71`.

Recommended fix: reconcile the provider inventory with actual outgoing requests and clearly describe the word/request information involved. This is a demonstrated disclosure inconsistency, not a legal compliance determination or proof of undisclosed tracking.

### F24 — Support and operational feedback are weak

**Priority: medium. Evidence: Source/committed configuration; product judgment on friction.** GitHub issues are the only configured support contact. That is a poor route for many ordinary readers and for private issues. Diagnostics are disabled without an endpoint, and their allowlist covers render/window/unhandled errors rather than handled provider failures. The committed production configuration provides neither diagnostics endpoint nor app version; deployment-injected values were not inspected.

Evidence: `src/pages/Support.tsx:91`; `src/utils/diagnostics.ts:3`, `:49`; `src/hooks/useHukamnama.ts:132`; `.env.production`.

Recommended fix: a monitored private contact or simple in-app report flow and privacy-preserving failure events for important reading/provider operations. Do not add broad behavioral tracking to solve a reliability problem.

### F25 — Passing CI does not cover several newly important journeys

**Priority: medium. Evidence: Source.** CI runs general accessibility checks but not `qa:stories` or Bani reader acceptance. The general accessibility route list omits Stories collection/reader. It also runs against a production preview while setting the mock environment flag only when launching preview, after Vite has embedded build-time environment values. Those provider requests are consequently not made deterministic by that flag.

Evidence: `.github/workflows/quality.yml:22`; `scripts/qa/accessibility-sweep.mjs:18`, `:96`.

Recommended fix: gate relevant acceptance journeys, include expanded controls, intercept deterministic fixture requests in browser tests, and run separate live-provider smoke checks. This identifies a test design issue, not an observed failing CI run.

### F26 — Performance has an incomplete measurement budget

**Priority: low/medium engineering opportunity. Evidence: local production-build measurement.** Initial HTML-linked JS/CSS is approximately 646 KB raw /179 KB gzip, before route chunks, fonts, artwork, and API data. Main CSS is 158 KB raw /29 KB gzip. Default Home artwork is a 338 KB AVIF. The generated service worker is configured to precache 60 code/style/font assets totalling 1.96 MB raw, approximately 702 KB gzip. Actual installation transfers were not measured.

Evidence: generated `dist` assets; `src/main.tsx:3`; `scripts/copy-public.mjs:45`; `public/sw.js:27`; `scripts/qa/startup-bundle-audit.mjs:20`. The startup guard only enforces backend laziness, not size or latency budgets. Unused large source PNGs were not counted as the shipped Home artwork.

Recommended fix: establish mobile cold/warm/offline budgets and measure on representative slow devices/connections before changing the artwork or architecture. These byte counts alone do not prove slow user experience or bad Core Web Vitals.

### F27 — A failed book chapter traps the reader without recovery controls

**Priority: high for the PWA reading journey. Evidence: Live + Source.** The offline chapter reproduction ended on a screen containing only “Section unavailable” and a publication-package explanation. There is no Retry, Back to book, or Home action. The focused-reader shell hides primary navigation. Restoring the network did not recover the screen; a manual browser reload was needed. This is especially problematic in the installed PWA, where browser navigation is not normally visible.

Evidence: `src/pages/library/LibraryChapterReader.tsx:505` returns a `SurfaceStateCard` without actions, before rendering the reader toolbar. The load effect at `:282` is tied to route identity, with no retry generation or reconnect trigger. `src/App.tsx:207` identifies the route as a focused reader and hides primary navigation. Browser snapshots confirmed no recovery controls both offline and after reconnecting.

Recommended fix: supply Retry and Back to book in loading/error states, distinguish unavailable connectivity from a missing chapter, and optionally retry on reconnect. Test a failed fetch on a direct chapter URL in standalone-style navigation.

## Conditional cloud findings — fix before enabling backup

Production More showed local-only operation. These are confirmed client-code risks, not evidence that current production users have lost cloud data.

| ID | Finding and evidence | Required change |
| --- | --- | --- |
| C01 | **High: late sync overwrites newer edits and survives sign-out.** `src/supabase/runtime.ts:234` exports then unconditionally applies a returned snapshot; `snapshot.ts:711` replaces saved stores. Actual runtime harness: font 22 → user changes to 34 during request → response restores 22 and reports ready. Signing out during a request changes state to signed-out, but the late response sets ready with no current user and still applies data. Timers can overlap requests. | Serialize requests; capture account generation/local revision; invalidate on sign-out/deletion/account switch; merge or replay post-export edits; never clear pending state while newer work remains. |
| C02 | **Medium: backup omits continuity domains.** `snapshot.ts:565` omits Stories saves/positions, exact-bani reading places, historical Nitnem history, active practice, weekly goal/tracking settings, and separate book/story display preferences. Device-only status is disclosed for some of these. | Define and test a complete personal-data contract and communicate any intentional exclusions. Test restoration onto a clean device. |
| C03 | **Low/medium: preference conflict metadata is inconsistent.** The exported semantic profile hash includes themeMode (`snapshot.ts:232`); the remote-applied metadata hash does not (`:611`). An unchanged profile becomes dirty on the next export. | Share one canonical serializer and add an unchanged round-trip assertion. |

An additional auth validation candidate remains: `refreshCloudState()` gets a session during bootstrap, but source search found no auth-state subscription. Verify cross-tab/session changes with a real configured account before asserting their full impact.

## Historical release documentation and future native work

These are maintenance/review gaps, not newly imposed permission gates for the current PWA audit.

- Artwork provenance/manifest records mark the 14 legacy share artworks unresolved or blocked, while the picker allows them (`src/assets/share-highlights/manifest.ts:266`, `:301`, `:976`; `PROVENANCE.md:39`). Later PWA scope explicitly preserves the owner-selected artwork. Reconcile approvals and stale review records; do not automatically remove authorized artwork or infer infringement.
- The July content/provider audit records unresolved permission evidence for Panth Prakash and provider arrangements. This audit did not inspect private agreements or recheck current external terms. Record current evidence rather than treating the old document as a new legal determination.
- If native distribution is resumed, the readiness script incorrectly demands Capacitor 8.4.2 even though JS, lockfile, Swift package and resolved package all consistently use 8.4.3 (`scripts/qa/app-store-readiness.mjs:219`). It also hardcodes an old policy date. Repair stale assertions then, without calling native signing an obstacle to this PWA scope.
- Future backend deployments should pin the currently floating `@supabase/supabase-js@2` Edge Function imports. This is reproducibility debt, not a demonstrated active compromise.

## Verification results

| Check | Current result | What it establishes |
| --- | --- | --- |
| Unit/component suite | **1,531 passed across 130 files** | Existing regression suite is healthy |
| Isolated vocabulary defect reproductions | **2/2 passed** | Blank answer and Again timing defects demonstrated; these are evidence tests, not fixes |
| Lint | Passed | Current lint rules |
| TypeScript app and node configurations | Passed | Static type checking |
| Production build | Passed | Buildable working source |
| Startup bundle guard | Passed | Optional backend not eagerly loaded by initial entry |
| Story build validation | Passed: eight published, three drafts excluded | Published/draft packaging |
| Stories, draft, and library integrity | Passed | Structural/corpus integrity, not historical or editorial correctness |
| CSS selector audit | Passed, 19 files | Current selector checks |
| Production browser observations | Onboarding, Home, expanded More, Read/Books, book search/chapter, offline ordinary reload and reconnect | Bounded live observations only |
| Dependency vulnerability audit | **Unavailable: registry DNS lookup failed** | No fresh vulnerability-clearance claim |
| Fresh full axe matrix / physical Safari / live cloud account | Not completed in this audit | Do not substitute previous audit evidence |

The standard build/test launchers initially failed because dependency caches point outside writable roots. Equivalent checks passed using native config loading and temporary caches. These were environment restrictions, not application failures. Reproduction harnesses were kept under temporary audit paths; the application source was not modified.

## Strengths to retain

- A coherent visual identity, direct Nitnem shortcut, and short two-step setup; the inspected mobile pages did not overflow horizontally.
- Explicit completion and Undo, rather than assuming scrolling proves prayer completion.
- Existing exact-bani caches, bounded cache behavior, download verification and several reader request deadlines.
- Source attribution, honest traditional-account/review disclosures, development-only drafts, and structurally complete book packaging.
- Modal/route focus infrastructure, reduced-motion handling, and keyboard-accessible word exploration; the accessibility findings are specific gaps, not absence of an accessibility foundation.
- Defensive sharing/HTML handling and reviewed backend ownership controls. No obvious critical XSS, exposed privileged key, or cross-user authorization flaw was found in the inspected paths. This is not a full security certification.

## Follow-up validation candidates

Keyboard focus may be lost when Nitnem Add/Remove unmounts the invoking control (`src/components/NitnemCustomizePanel.tsx:108`, `:113`). This was not browser-reproduced and should remain a candidate rather than a confirmed accessibility finding. Validate physical Safari/VoiceOver and long-session reading when convenient; those results cannot be inferred from Chromium or unit tests, and they are not reinstated as mandatory gates removed by the owner.
