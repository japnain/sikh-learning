# NaamRas — UI, UX and brand audit

Date: 15 November 2026. Audit only; no application code, production configuration or master branch was changed.

## Verdict

NaamRas has a distinctive foundation: historical Sikh artwork, an editorial wordmark, warm reading surfaces, and a focused scripture reader. Its best screens feel considered. Its weaker screens expose the accumulated structure of the software: repeated introductions, overlapping controls, inconsistent settings, and different interpretations of saving and downloading.

**Keep the Golden Court direction and the current scripture reader. The next pass should consolidate the experience.** Another wholesale visual reinvention would discard the strongest work without resolving the underlying inconsistencies.

I would not give an unqualified design sign-off yet. The live book reader has a confirmed, severe contrast defect in its Contents and Appearance sheets. The pending offline implementation also needs interaction fixes and its remaining real-browser acceptance check. Most other findings are prioritised improvements, rather than reasons to block the entire app.

| Dimension | Assessment |
| --- | --- |
| Taste | Strong artwork and editorial typography; weaker where repeated cards, tiny labels and multiple accent colours compete. |
| Aesthetics | Attractive individual screens, with visible seams between warm-brown Home/account, blue-black catalogue/settings and independent paper readers. |
| Product vision | Daily practice plus a Sikh reading library is coherent. Discovery and supporting features need a clearer hierarchy around that purpose. |
| Brand | Culturally specific, but the wordmark, icon, navigation artwork, metadata and multilingual descriptions are not yet one consistent family. |
| UX | Strong focused readers and useful source context; excessive steps before catalogue content, repeated continuation, and fragmented downloads/settings. |
| Accessibility | Deliberate foundations, including focus restoration and large controls. A confirmed book-sheet contrast failure and several asynchronous-state gaps remain. |

These are qualitative assessments, not scores from user research.

## What was actually checked

Two different versions were reviewed. Live observations are from `https://naamras.xyz`. Pending implementation findings are from local commit `b6ffca8` on `codex/offline-banis`. The production deployment listing returned master `b9ad1196d93a257427dfd43ae3effeef94fbd646` as READY during the audit; the browser observations describe the rendered session, not a claim that all pending changes are deployed.

The live More and Daily Nitnem editor are older than the compact More and expanded customization already in the pending branch. The new Shabad OS download panel was reviewed in source, not presented as live-tested.

Rendered inspection used measured browser viewports of **390 × 844**, **320 × 740**, and **1200 × 900** CSS pixels, plus the initial desktop panel. This is responsive browser inspection, not a physical iPhone or native iOS test. Light and dark Home were compared; dark mobile catalogue and scripture, paper book/story readers, reader sheets, account, and narrow Punjabi More were inspected.

| Surface or journey | Evidence obtained | Boundary |
| --- | --- | --- |
| Home / Hukamnama / Daily Nitnem | Live mobile and desktop screenshots; light/dark; links and completion controls inspected | Completion was not toggled during this design audit |
| Read / search | Live mobile and desktop; searched “compassion”; inspected results and opened a result | One representative query, not a search-relevance benchmark |
| Search → scripture → full shabad | Live exact result and full-shabad transition | Content correctness remains covered by the separate source audit |
| Scripture settings | Live sheet, controls, Escape dismissal and opener focus restoration | No comprehensive screen-reader or keyboard traversal |
| Saved / vocabulary | Live state with no explicit saves and an automatic reading place; duplicate continuation reproduced | Large populated shelves reviewed in source |
| Daily customization | Live existing editor; pending replacement reviewed in source | No routine or default-length changes saved |
| More | Live older page; pending compact hub and sheets reviewed in source | Pending hub not visually signed off |
| Onboarding | Live two-step setup review overlay; first-run gate reviewed in source | Fresh-install welcome not independently replayed |
| Account | Live signed-out page in dark mode; form structure reviewed | No login, account creation, email or provider flow submitted |
| Books | Live catalogue, detail, first chapter, Contents and Appearance | Download/restart behaviour not exercised in this audit |
| Stories | Live collection, first story and Appearance | Story completion/save/download not mutated |
| Scripture sources | Live source tab and SGGS number browser | Every Ang/Vaar was not opened |
| Rehat / Amrit Keertan | Source and shared interaction review | No rendered route sign-off |
| Support / privacy | Live content and support screenshot | No report was sent or downloaded |
| New offline banis | Source review of download states, list, navigation lifetime, lengths and attribution | New build's browser/offline acceptance remains outstanding |
| Branding | Source typography, palette, copy, artwork metadata and actual 512px icon inspection | No external audience study or brand-recognition testing |

Temporary language and theme changes were restored to English and System. The responsive viewport override was reset. Normal browsing may add recent searches and automatic reading places. No private source was uploaded for this audit.

## Findings requiring attention

Priority meanings: **P1** materially obstructs use; **P2** significant usability or consistency improvement; **P3** polish or maintenance. “Live” means observed in the browser. “Source” means established from the pending implementation. “Judgment” means an editorial/design recommendation, not a broken interaction.

### Reading and accessibility

| ID | Priority / evidence | Finding and consequence | Recommended change |
| --- | --- | --- | --- |
| R1 | **P1 · Live + source** | Book Contents and Reading appearance display near-black text on a dark sheet when the app is dark and the book palette is Paper. The measured primary text/background contrast is **1.07:1**. Chapter titles and settings descriptions are extremely difficult to read. | Let the book's explicit palette own the whole sheet surface. Verify all palettes against both app themes, including source notes. |
| R2 | P2 · Live + source | A dark app opens a default book or story on bright Paper. Prose uses a separate palette store; Rehat shares that model. The appearance sheet explains the separation, but users discover it after the abrupt transition. | Default to “Follow app appearance,” while preserving explicit Paper, Sepia and Night choices. Never overwrite an existing explicit preference. |
| R3 | P2 · Source | Book navigation retains essential labels as small as `.54rem` and chapter names at `.72rem`—about 8.6px and 11.5px at a 16px root. Reading text-size controls do not enlarge those controls. | Raise interface type sizes and allow wrapping. Use hierarchy and space, rather than very small type, to create refinement. |
| R4 | P2 · Source | Initial scripture loading has unlabelled skeletons without an accessible loading status or busy region. Error and empty states remain English even under Punjabi/Hindi interface language. | Localize loading/error/empty states; announce loading once and hide decorative skeletons from assistive technology. |
| R5 | P2 · Source | The scripture reduced-motion rule sets animation duration to `.01ms` but leaves the skeleton's infinite iteration intact. | Disable the pulse under reduced motion instead of shortening its infinite cycle. |
| R6 | P2 · Source | Each scripture line has an ordinary tab stop, including structural lines. Long banis can require hundreds of Tab presses. This is friction, not a demonstrated keyboard trap. | Provide a deliberate keyboard verse-navigation model and a skip-to-end route while retaining access to each line's actions. |
| R7 | P3 · Source | Shared recovery buttons lack the 44px minimum used for most reader controls. The skip link stays English under other locales. | Standardize recovery target sizes and localize the skip link. |

R1 reproduction: set the app to Dark, or System with a dark device; open Books → Panth Prakash → Start reading; leave the book on Paper; open Contents, then Reading appearance. In the live DOM, the sheet background was `rgb(18,29,31)` and primary text `rgb(35,33,29)`. The contents list and title exhibited the defect.

R1 root cause: `src/components/ModalSheet.tsx:80` supplies `dark:bg-dark-card`. Its compiled selector has specificity `0,2,0`, while `src/styles/catalog.css:971` sets the EPUB sheet background with `.epub-reader-panel` at `0,1,0`. The dark background wins while Paper's dark ink remains. `LibraryChapterReader.tsx:779`, `:820` and `:834` use that same shell for Contents, source notes and Appearance. Source notes and Sepia are inferred affected from the shared cascade; they were not separately reproduced. **The Story appearance sheet was checked and is legible**: its more specific palette rule protects the background. Do not apply the defect indiscriminately to every reader.

Other evidence: `src/store/epubReader.ts:27`; `src/styles/stories.css:70`; `src/styles/catalog.css:939`, `:1102`, `:1124`; `src/pages/Study.tsx:2479`, `:2508`, `:2539`; `src/styles/reader.css:1849`; `src/components/StudyCard.tsx:541`, `:608`; `src/components/SurfaceStateCard.tsx:55`; `src/App.tsx:278`.

### Discovery, navigation and saved reading

| ID | Priority / evidence | Finding and consequence | Recommended change |
| --- | --- | --- | --- |
| U1 | P2 · Live + source | Read presents hero art, search heading/input, search modes, guidance, examples, result scopes, recent searches, collection tabs, another introduction, continuation and a devotional feature before the directories. On mobile, almost two screens pass before the directory. On desktop, the large hero and search panel dominate the first viewport. | Keep artwork but compress the repeated introductions. Put a useful collection choice and reading entry within the first screen; disclose advanced search controls when needed. |
| U2 | P2 · Live + source | Two adjacent content selector systems behave differently: result scopes filter search, while collection tabs clear the query and browse. “Books” appears in both. | Separate “Search in” from “Browse,” or use a consistent selector whose effect is clear in each mode. Preserve recoverable search state. |
| U3 | P2 · Live + source | Books and Stories show global Continue reading entries such as an SGGS passage. A fresh collection can recommend Japji regardless of the selected collection. | Place global Continue reading above collection tabs, or scope it inside each collection. Use a relevant book/story recommendation for empty collection states. |
| U4 | P2 · Live + source | Saved repeats the same reading in a Resume card and a Continue reading section. An empty Review Bank card also appears prominently with 0 words/0 phrases as soon as there is an automatic reading place. | Keep one authoritative Continue reading block. Promote Review Bank when it has content; otherwise provide a compact secondary explanation. |
| U5 | P2 · Source | A populated Saved page can stack count summaries, another count-bearing filter row, favorites, bookmarks, stories, words, phrases, shortcuts, continuation and history. | Use one count/filter system, bounded section previews and “View all.” Keep the next useful reading near the top. |
| U6 | P2 · Live + source | Save means a story, book section, scripture bookmark or favorite depending on the reader; visibility varies between direct header action and tools menu. | Use content-specific action labels: Save passage, Save chapter, Save story. Explain the purpose of Favorite, or consolidate it within a Save sheet. Preserve existing saved data. |
| U7 | P2 · Source | “Reader defaults” sounds global but edits scripture preferences; prose has its own shared settings. | Label the domains explicitly: Gurbani reading; Books, stories and Rehat. Share base appearance where appropriate and make overrides intentional. |
| U8 | P2 · Live + judgment | Several search actions carry similarly strong emphasis: Back to browsing and Exact words only compete with the results themselves. | Use the strongest button treatment for the primary task. Make escape/filter controls secondary and results visually dominant. |
| U9 | P2 · Live + judgment | Support prepares a report but provides no destination to send it. The page honestly states that no support inbox is configured, yet the help journey ends before a reader can reach anyone. | Provide a project-owned support destination when ready, preserving the anonymous/project identity requirement. Until then, position the page as troubleshooting and report preparation, with no implied delivery. |

Evidence: `src/pages/Banis.tsx:991`, `:1039`, `:1353`, `:1407`, `:1431`, `:1463`; `src/components/read/ReadSearchControls.tsx:82`; `src/components/ReadContinue.tsx:13`; `src/pages/Library.tsx:208`, `:217`, `:289`, `:303`, `:318`; `src/pages/Study.tsx:2588`, `:2651`, `:2662`; `src/pages/stories/StoryReader.tsx:538`; `src/pages/library/LibraryChapterReader.tsx:693`; `src/pages/More.tsx:289`. U9 was read directly on the live Support page. It is a product-support gap, not an accusation that the form secretly sends data.

### Offline experience in the pending branch

The source-preserving backend implementation is a separate strength. These findings concern how people discover and manage downloads; they do not overturn the verified exact-version work.

| ID | Priority / evidence | Finding and consequence | Recommended change |
| --- | --- | --- | --- |
| O1 | P2 · Source; related live locations inspected | Banis, stories, books and automatically prepared Daily Nitnem use separate download locations and explanations. There is no single place to answer “what is available on this device?” | Keep contextual actions and add a unified Downloads destination, reachable from More. Distinguish saved reading from downloaded text. |
| O2 | P2 · Source | Download all expands into a list of up to 108 readings with Read and Remove actions, without search or a bounded preview. | Show a short summary in Read and a searchable full manager. Avoid turning the catalogue into a storage administration page. |
| O3 | P2 · Source | Download-all is owned by the catalogue component. Opening a reading unmounts it and aborts the queue, although completed packs survive. The Read buttons remain available while downloading. | Keep the queue at app level, or explicitly explain leaving will pause/cancel the remaining work and provide an obvious resume action. |
| O4 | P2 · Source | A failed initial storage listing can show both an error and “No banis downloaded.” Failure to read storage is not proof that it is empty. | Make loading, unavailable, failed, genuinely empty and ready states mutually exclusive. |
| O5 | P2 · Source | Removing a download removes the focused row without restoring focus or announcing success. | Focus the next/previous item or panel heading and announce the removal, including that bookmarks/progress remain. |
| O6 | P2 · Source | Size appears after download, with no total estimate beside Download all. | Show the estimated transfer/storage size before starting. Avoid presenting the backend's 122 payload bytes as the exact device size: four default/short payloads are duplicates. |
| O7 | P3 · Source | Collapsing downloads hides progress and its live announcements while the queue continues. | Keep a compact progress/completion summary visible when collapsed. |
| O8 | P2 · Live placement + source behaviour | The story download control is below the entire story catalogue and has no cancel action, unlike banis/books. | Move status near the collection heading and use consistent download/progress/cancel/retry language. |
| O9 | P2 · Source | The four new Shabad OS readings cannot be added to Daily Bani because the routine registry uses BaniDB identities. The explicitly named six-pauri Anand is a plausible routine choice. | Extend provider-aware routine identities if these readings are intended to be part of customization. Keep their exact named identities; do not map them to existing Short/Medium/Long labels. |

Evidence: `src/components/BaniDownloadsPanel.tsx:145`, `:202`, `:250`, `:262`, `:277`, `:294`, `:305`, `:306`; `src/pages/Banis.tsx:1478`; `src/components/StoryBrowser.tsx:78`, `:141`; `src/pages/library/PanthPrakashLibraryHome.tsx:344`; `src/components/NitnemCustomizePanel.tsx:268`; `src/store/nitnem.ts:336`, `:362`; `src/data/shabadosBanis.ts:15`.

The existing download design correctly distinguishes text from audio/online dictionary functions, retains all supported lengths, and keeps bookmarks/defaults/progress separate from removal. Preserve those guarantees.

### Onboarding and language

| ID | Priority / evidence | Finding and consequence | Recommended change |
| --- | --- | --- | --- |
| L1 | P2 · Source; setup overlay inspected live | New installs default to English UI. Script and translation choices are offered, but app-language selection is only available later in More. | Put English / ਪੰਜਾਬੀ / हिन्दी on the welcome screen. Keep interface language, scripture script and translation language separate. |
| L2 | P2 · Source | “Begin reading” starts two compulsory preference steps, including for a first-time shared reading link. | Offer Read now with sensible defaults and optional Personalize reading. Retain the shared destination. |
| L3 | P2 · Live + source | English and Punjabi About describe different generations of the product. English includes stories and books; Punjabi describes older reading/saved/settings scope. Other localized introductions also drift. | Maintain one complete content schema and translate the same product promise. Have fluent reviewers check the resulting language. |
| L4 | P3 · Judgment supported by source/live copy | Some copy sounds like internal product architecture: “canonical study,” “Exact destinations first,” “chapter-level reading,” and “Open each source in its own structure.” | Prefer direct outcomes: “Go to an Ang,” “Read a complete bani,” “Browse Rehat chapters,” “Continue reading.” |

Evidence: `src/store/locale.ts:13`; `src/components/OnboardingSheet.tsx:115`, `:149`, `:195`; `src/content/welcomeCopy.ts:4`; `src/App.tsx:204`, `:305`; `src/pages/More.tsx:259`, `:603`; `src/utils/uiCopy.ts:549`, `:743`; `src/content/readPageCopy.ts:116`, `:130`, `:140`, `:173`, `:182`, `:220`, `:324`.

At a measured 320px width, the inspected Punjabi More page wrapped without whole-page horizontal overflow. That does not establish correct wrapping on every translated screen. Account has working dark overrides; it is **not** part of a “dark mode missing” finding.

### Taste, visual system and brand

| ID | Priority / evidence | Finding and consequence | Recommended change |
| --- | --- | --- | --- |
| B1 | P2 · Source | Pending More uses `var(--font-display, Georgia, serif)`, but the variable is only declared within EPUB shells. It therefore falls back to Georgia instead of the intended Cormorant. | Declare typography roles globally. Use the same display role across Home, catalogues, More and sheets, with appropriate script fallbacks. |
| B2 | P2 · Live + judgment | Home/account/setup use warm brown; other dark screens use blue-black; navigation has its own pottery palette; prose has three more palettes. On desktop Home the warm artwork side and cool Nitnem side visibly differ. | Establish one stable app paper/ink/accent foundation. Let artwork colour its framed area; retain deliberate reader palette overrides. Avoid unrelated colour changes for ordinary controls. |
| B3 | P2 · Source + icon inspection | Home's italic serif wordmark, setup's sans wordmark, tracked uppercase splash, and green/brown Ik Oankar app icon are not one defined family. | Define one primary wordmark, one compact mark and one app-icon treatment. The current local app icon is not the previously discussed Darbar Sahib miniature direction. |
| B4 | P2 · Live + source + judgment | Blue/yellow raster navigation icons feel different from the delicate editorial type and small vector reader controls. CSS explicitly uses pixelated rendering. | Keep the culturally specific navigation idea if desired, but standardize silhouette, scale and edge quality. Do not replace all character with generic icons; make the treatments intentionally related. |
| B5 | P2 · Live + source | Golden Court is labelled generically with little editorial context; its default metadata has no credit. | Add a discreet About this artwork view with verified identification, source and uncertainty where necessary. Do not invent an artist, scene or date. |
| B6 | P2 · Live + source + judgment | Small labels, fine rules, tracked uppercase eyebrows and repeated nested cards are being used as substitutes for hierarchy. Some supporting text is 10–13px. | Keep editorial headings, but increase useful support copy, remove redundant eyebrows, and use space plus clear action ranking. |
| B7 | P2 · Source + judgment | Shape and surface rules vary across 8px controls, 12/16px cards, gradients, shadows and later CSS that cancels earlier decoration. | Establish a small set of surface roles and radii. Keep reading pages flat; reserve framing for artwork and discovery. Consolidate superseded CSS after visual parity is proven. |
| B8 | P2 · Source + judgment | Search/install metadata calls the free app “premium” and foregrounds “canonical study,” while the actual experience is broader and more welcoming. | Say what people can do. Suggested description: “Gurbani, daily Nitnem, Sikh stories and books—a quiet place to read and return.” State free access plainly if it is the enduring policy. |
| B9 | P2 · Live + judgment | Book details expose a large technical OCR/provenance paragraph near the start. Transparency is valuable, but the page spends too much visual weight on processing details. | Keep a short visible edition-quality summary and put the full preservation/OCR detail in an explicit expandable source section. Retain important historical context and attribution. |

Evidence: `src/styles/more.css:9`, `:40`; `src/styles/catalog.css:18`, `:648`; `src/styles/tokens.css:70`; `src/styles/onboarding.css:3`; `src/styles/account.css:1`, `:51`; `src/styles/navigation.css:31`, `:51`, `:104`; `src/components/NavigationGlyphs.tsx:2`; `src/pages/Home.tsx:490`, `:505`; `src/components/SplashScreen.tsx:42`; `src/components/HomeArtworkSettings.tsx:141`; `src/styles/home.css:19`; `src/styles/library.css:60`; `src/content/editorialCopy.ts`; `index.html:16`; `public/manifest.webmanifest:4`; `public/icons/icon-512.png`. B9 is a rendered observation of the book detail page, not a request to alter source text.

## What should stay

- **Golden Court as the default Home anchor.** Its symmetry, architectural frame and gold/blue/rose palette are distinctive. The full composition is respected on Home; retain that care.
- **The quiet scripture reader.** Compact persistent header, Read/Study, accessible appearance controls, contents, and the absence of bottom navigation support concentration. Keep its line order, headings, opening, ending, lengths and saved positions intact.
- **The story reading treatment.** The inspected story has a confident title, restrained line illustration, readable body and a clear account/source entry. It is one of the strongest expressions of the brand.
- **Cormorant / Jakarta / explicit Gurmukhi and Devanagari fonts.** The combination can carry both editorial warmth and clear controls when its roles are consistently applied.
- **Four primary destinations.** Home, Read, Saved and More are understandable. Downloads can be a secondary destination without adding another bottom-nav item.
- **Optional accounts and contextual sources.** Guest access, visible edition context and honest distinctions between a traditional account and verified documentation support trust.
- **Pending compact More and improved Daily Bani customization.** Build on those improvements. Do not recreate the live long settings page.
- **Existing focus and touch foundations.** In the live scripture sheet, Escape closed the dialog and focus returned to Reading appearance. Source review shows deliberate safe-area handling, 44px core controls and large-text header/navigation reflow.

The core solid colour tokens are not generally poor: calculated muted-text/background contrast is 5.80:1 light and 7.74:1 dark; accent/background is 5.07:1 and 7.90:1. Those are token calculations, not an app-wide accessibility certification. The book defect is a specific conflicting surface rule.

## Recommended brand direction

**A living Sikh reading room, centred on Gurbani and daily practice.** Historical artwork establishes place and cultural memory. The interface then makes room for reading, understanding and returning.

The personality should be composed, welcoming, culturally specific and careful with sources. “Read. Reflect. Return.” is a useful short signature. It needs plain explanatory copy beside it for someone meeting the app for the first time.

| Design decision | Working rule |
| --- | --- |
| Visual priority | Scripture and reading content first; next action second; context third; decoration last. |
| Artwork | One strong framed artwork per discovery moment. Preserve meaningful composition; avoid multiple competing hero banners. Provide context on demand. |
| App colour | One semantic light/dark pair, with restrained antique-gold accents. Artwork can supply richer blue, green and rose. Palette details should be chosen from actual side-by-side screens. |
| Type | Editorial display face for major headings; clear sans for controls; explicit script families. Ordinary explanatory copy roughly 14–16px; action labels roughly 14px or larger. Test Gurmukhi/Devanagari at their actual visual size. |
| Shapes | A small consistent scale for controls, cards and sheets. Prefer subtle separators to a card around every paragraph. |
| Actions | One obvious primary action in each local section. Secondary filters, reset, back and management actions use quieter treatments. |
| Saving | Save passage / Save chapter / Save story. Automatic reading position is Continue reading. Offline files are Downloads. These are different user concepts. |
| Voice | Direct, humane and specific: “Choose your banis,” “Continue reading,” “Downloaded on this device.” Avoid luxury claims and internal architecture language. |
| Brand mark | A related wordmark/icon family that remains recognizable at app-icon size, browser title, splash and page header. |
| Cultural care | Accurate text, source context and artwork identification are part of the design quality. Never fabricate provenance or silently rewrite preserved source content for polish. |

Suggested page hierarchy:

- **Home:** next daily reading, Golden Court/Hukamnama, routine and a compact return area. Keep the quick Nitnem entry so the artwork does not slow a habitual reader.
- **Read:** compact artwork/header, one search entry, collections and immediately useful content. Advanced search unfolds when requested. Global Continue reading sits above the collections, or continuation is filtered inside them.
- **Saved:** one Continue reading area, one search/filter system, bounded previews of actual saves. Empty categories explain themselves without occupying the page as promotional cards.
- **More:** compact preference hub with clear scripture/prose settings, Downloads, account/backup, support and About. Detailed controls open focused sheets.
- **Readers:** preserve their respective strong layouts. Unify control naming, modal behaviour, saving and appearance defaults rather than making every type of content look identical.

## Implementation order and acceptance criteria

| Pass | Work | Done when |
| --- | --- | --- |
| 1 — Legibility and truthful states | Fix book-sheet palette precedence; storage-failure/empty contradiction; removal focus; loading/localization and reduced-motion gaps | Contents, Appearance and Notes remain legible in Paper/Sepia/Night under app Light/Dark; failed storage is never reported as empty; keyboard focus survives removal; reduced motion stops the pulse |
| 2 — Core journeys | Remove duplicate continuation; shorten Read's repeated introductions; make scope vs collection clearer; label reader preference domains | A known bani is easy to reach; Saved shows each continuation once; collection switches have predictable effects; users know which reading settings apply |
| 3 — Offline management | Unified destination, bounded/searchable list, visible progress, size estimate and intentional navigation behaviour | 108 readings do not create an unmanageable catalogue; leaving the page has documented/predictable download behaviour; cancelling/retrying/removing preserves prior downloads and personal data |
| 4 — Visual and editorial system | Global font roles, shared colour/shape/action rules, mark family, artwork context, complete localized copy | Home, Read, Saved, More, account and readers look related in one side-by-side review; no unintentional Georgia fallback; UI copy describes the same product in all supported languages |
| 5 — Release verification | Exercise the actual pending build, not just production's older screens | New downloads and compact More/customizer pass responsive, keyboard and offline acceptance; preserve exact bani contents, all lengths, default length and reading position |

A final release check should cover 320/390px phones, tablet, desktop, short landscape, enlarged text/200% and 400% zoom, keyboard-only use, VoiceOver/TalkBack, reduced motion and every app-theme/prose-palette combination. Include long titles, no saves, many saves, no downloads, full downloads, interrupted downloads, unavailable storage, stale content, network loss and a cold offline restart.

## Remaining boundaries

This was a broad visual, interaction and source audit, not a claim that every route, input, accessibility technology or device passed. Native Safari/PWA storage, actual screen-reader use, full zoom coverage, authentication return flows and new-build offline cold starts remain unverified here.

The previous code-only preview upload was blocked by automatic approval review. This audit used the public app and local source; it did not retry or bypass that block. The separate offline checkpoint records the passed 122-payload HTTP/hash verification and the still-unrun browser acceptance script. See `docs/qa/offline-banis-20261115.md`.

No design fixes or source-text changes are claimed as completed by this report. The immediate design blocker is R1; the broader goal is to make the already good individual screens feel like one dependable NaamRas experience.
