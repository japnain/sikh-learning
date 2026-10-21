# NaamRas experience quality plan

> Evidence note: `artifacts/` links and localhost previews in this document refer to preserved local QA records, which are excluded from Git. Historical build results apply only to their named snapshots; the current session-only push scope is recorded in [pre-push readiness](../qa/session-prepush-readiness.md).

Updated October 18, 2026. This is the active execution plan, superseding the idea that the prior implementation was a finished design. The current candidate is v22; its result and remaining native/physical gates are in the [current handoff](../qa/experience-beta-handoff.md) and final v22 section below. Earlier tables and execution notes retain the stage and build they describe.

## Intent and constraints

- Build an exceptionally aesthetic, coherent daily Gurbani experience for people returning to Hukamnama, Nitnem and sustained reading.
- The artwork is a central part of the identity. Preserve its prominence, Eclipse and all fourteen original choices.
- Preserve exact canonical scripture, source identity, native text selection, accessible controls, existing dictionary, saving and sharing. Recitation/audio work is excluded by the owner’s latest direction.
- Home, routine editing, artwork preferences and the reader must feel authored together in both ivory/cool ink and midnight/pale ink.
- Routine order, lengths, offline status, completion and resume must describe actual state. A page visit or jump never implies completion.
- Work in the existing React/Capacitor app, using existing primitives and local preferences. No new account service, paid dependency or animation framework is needed.
- The user has repeatedly authorized a complete design overhaul and has expressly requested a plan followed by execution; no further direction or confirmation is needed for reversible implementation choices.

## Assumptions

The mobile app is the primary experience; desktop should be deliberately composed as well. Reading must remain comfortable at enlarged text and through full long banis. Existing data volumes and cloud/security boundaries remain in place. Separate local reading places may store only existing route/source/verse metadata, bounded on device. Preserve compatibility with existing progress and cloud snapshots. Prefer transform/opacity feedback with reduced-motion support; no decorative motion during reading. Maintain shared tokens and component ownership so the design stays maintainable.

## Diagnosis

The art/Hukam has a distinctive identity, but the supporting page still resembles a settings list. Selected rows repeat status and generic descriptions. Empty calendar/streak counters and saved-content copy feel utilitarian. The reader repeats context above a very tall opening block. The routine editor has small labels, crowded controls and a prominent sticky footer that need a proper composition pass.

## Chosen direction: an illuminated daily folio

1. **Home composition.** Preserve the art-led opening, use a deliberate handoff into the daily folio, simplify repeated utility text, and align page rhythm and type. Selected, resumed and completed banis must read as different meaningful states. Keep all chosen banis discoverable in custom order.
2. **Supporting Home states.** Treat weekly continuity as a calm record of practice with honest empty/active states. Give saved passages a truthful label and concise entry state. Remove duplicated controls and padding that create dead space.
3. **Routine and artwork editing.** Use readable type, clear section hierarchy, full titles, coherent selected states and concise explanations. Draft selection/order/length remain reversible until Save. Artwork Apply/Cancel stay visible while the full gallery scrolls.
4. **Reader composition.** Reduce duplicated metadata and bulky mode chrome. Establish separate hierarchy for opening invocation, scripture, transliteration and meanings. Keep quiet Read and richer Study, contextual appearance access, exact source, and existing iOS scroll safeguards.
5. **Independent continuity.** Remember a separate semantic verse position for each exact bani/source/range/length. Returning to one bani must not overwrite another's place. Never resume into the wrong length or version.
6. **Critical verification.** Review actual screens after implementation, not just source or automated tests. Validate light/dark, 320/390/768/desktop widths, 200% text, all artwork choices, 0/partial/all completion, empty/populated saves, exact-length changes, offline failures, and the complete Sukhmani reader. Correct remaining hierarchy and spacing defects before delivery.

## Dedicated reader workstream

The reader is a primary product experience. Its scope covers entering from Nitnem, Hukamnama or a shabad; sustained reading; Study; saving or sharing; and finishing or leaving. The completed first cycle below establishes the reading foundation. It does not close the acceptance checks in this section.

| Area | Required experience and acceptance | Recorded first-cycle position |
| --- | --- | --- |
| Visual composition and typography | Deliberate Gurmukhi hierarchy, comfortable line lengths and spacing, readable transliteration/meanings, and consistent light/dark surfaces. Inspect opening, middle and final passages in both Read and Study, including long support text, 34px scripture and 200% interface text. Diacritics, punctuation and long lines must remain intact. | Main composition implemented; browser checks cover the major layouts. Complete the explicit state matrix and sustained-device review. |
| Read and Study | Modes must be discoverable and have distinct purposes. Read stays quiet; Study exposes word meaning, transliteration and selected translation sources. Changing script, meaning language or source updates the intended layer without resetting the verse or overwriting saved support preferences. Pause guidance must be explained separately from canonical punctuation. | Core modes, preferences and pause explanation implemented. Explicitly verify every supported language/source combination and unavailable-layer state. |
| Orientation and deep controls | From the middle or end of Sukhmani, the user can reach appearance, location navigation and Back/exit without scrolling to the beginning. Returning to Home or the originating reading list preserves the appropriate place and context. Preserve the touch/WebKit scroll safeguards while resolving this. | Deep appearance and source-boundary navigation implemented. Deep Back/exit reachability is an explicit open acceptance item. |
| Continuous reading and navigation | Preserve the complete ordered source through long banis. Location labels reflect actual source/Ang metadata. Section jumps, manual scrolling, font changes and support-layer changes preserve a stable semantic place. Selecting a different exact length never resumes into an incompatible version. | Implemented and regression-tested, including full Sukhmani and delayed-font/document-clamp cases. Continue verifying native gestures and interruptions. |
| Scripture and provenance | Canonical text, headings and sequence remain unchanged. Identify the actual scripture, Ang and selected meaning source clearly. Keep provenance available in context; show missing content or source failures honestly. | Core source preservation and About controls implemented. Verify each reading entry route and source-failure state explicitly. |
| Selection, understanding and saving | Native selection and handles remain usable. A selected excerpt can be shared; saving a complete verse must remain distinct. Meaning lookup, bookmarks and sharing must preserve source identity. Dismissing each sheet returns focus and the same reading place. | Existing actions retained and key distinctions tested. Complete the touch, narrow-screen, share-cancel and failure flow checks. |
| Recitation | Excluded by the owner. Do not add recitation features or advertise an unavailable recording. | Removed the unavailable reader Listen entry point. Existing background soundscapes remain available in reading tools. |
| Offline and recovery | A cold reader can open the exact cached bani and length. Distinguish cached content, missing translations/audio and a network failure. Retry must preserve the current verse and preferences; a fallback must identify its actual source. | Saved-routine cache readiness is verified. Reader-specific cold offline, partial-layer and retry scenarios need their own acceptance pass. |
| Finishing a bani | Define a calm, useful ending with a route back to the daily routine and a deliberate read-again action. For an eligible selected daily bani, define an explicit completion action that respects tracking settings and exact identity; preserve undo. Opening, jumping or reaching the bottom must never silently mark completion. | Home completion/undo exists. The reader's end-of-bani action composition and connection to daily completion remain planned work. Traversal-based automatic completion is separate. |
| Native accessibility and sustained comfort | On a physical iPhone, complete opening-to-middle-to-end sessions with enlarged type, VoiceOver, touch selection, Back gestures, appearance changes, interruptions and resume after reopening. Controls remain reachable and never obscure the active text. Record visual comfort and navigation friction as well as correctness. | Pending. Browser checks and an iOS build do not establish this acceptance. Native simulator interaction was blocked by the locked Mac during the first cycle. |

### Reader execution order and completion gate

1. Resolve deep Back/exit access and the end-of-bani actions first, retaining the exact source and scroll guarantees.
2. Complete the Read/Study, source/language, selection interaction matrix; repair each observed failure.
3. Complete cold offline, unavailable-layer, retry and interruption scenarios.
4. Review the complete visual state matrix and sustained physical-iPhone sessions. Revise spacing, controls or behaviour where actual reading exposes friction.

The reader workstream remains open until these acceptance items are verified or their concrete external blocker is recorded. The completed first-cycle checks below must not be read as a declaration that the entire reader is finished.

## Alternatives and decision log

| Decision | Alternatives | Reason and objections to resolve |
| --- | --- | --- |
| Focus Home on the current reading, with two upcoming links and an ordered All banis sheet | Expanded ordered folio; carousel; dashboard card grid | The rendered folio still dominated Home as a utility list. The current reading now has its own typographic composition; direct upcoming links and the full ordered sheet preserve access without seven expanding rows. This supersedes the first-cycle folio decision. |
| Preserve dominant art | Reduce hero to prioritise actions | The owner explicitly identifies art as the aesthetic identity. Improve the transition and surrounding hierarchy instead. |
| Reduce reader chrome and repeated context | Add decorative manuscript frames or stronger controls | Scripture and reading comfort carry the reader. Avoid cultural ornament used as generic decoration. |
| Store local exact reading places | One global session; add backend history retrieval now | Existing global resume cannot preserve multiple banis. A bounded compatible local record solves the immediate continuity gap without changing cloud contracts. |
| Keep explicit completion and undo | Infer completion from final page/scroll | Accurate practice state is more important than a convenient but false automatic mark. Full traversal-based completion remains a separate feature. |
| Review real difficult states | Approve from opening screenshots or passing tests | Correctness and visual quality are separate acceptance checks. |

## Execution ownership

- Home composition, folio and supporting states: Home reviewer/implementer.
- Reader typography, hierarchy and controls: reader reviewer/implementer.
- Routine and artwork editor composition: routine reviewer/implementer.
- Plan integration, exact reading-place persistence, shared chrome and final verification: lead.

Implementation starts after the scoped reviewers have raised objections and the lead has recorded their resolution. No source-text edits or unreviewed feature expansion are included.

### Review disposition: APPROVED for implementation

The Home review required a visibly distinct active bani, comfortable full titles and targets, a precise distinction between a completed routine and a day with one completion, and reactive exact-place lookup. Accepted in full. The reader review required truthful Ang/source labels, respecting Compact and alignment, source-first appearance preview, ordinary deep-reading access, and retaining all font/anchor/WebKit protections. Accepted in full. The editor review exposed an offscreen Add-bani close control at enlarged text, a buried gallery and unverified offline claims. Accepted: bounded sheet, gallery-first composition and read-back-verified readiness independent of Save. No unresolved objection blocks the chosen design. The next step is parallel implementation followed by actual-state visual review.

## Definition of ready

The primary screens have a consistent hierarchy, readable supporting text, deliberate spacing, and clear state changes. No redundant labels, mislabeled modules, clipped titles, hidden controls, blocked scripture selection or overflow at enlarged text. Exact readings, independent resume, Save/Cancel, artwork changes and completion/undo work under their actual data states. Meaningful tests, accessibility checks and production/iOS builds pass. Actual-device long-session comfort remains a user-validation activity; no automated check can establish perfection or category leadership.

## First implementation cycle — completed

- [x] Reassess current rendered screens and preserve the owner's art direction.
- [x] Write the plan and explicit acceptance criteria.
- [x] Resolve scoped reviewer objections and start implementation.
- [x] Recompose Home and its difficult states.
- [x] Recompose routine/artwork editing.
- [x] Refine reader hierarchy and appearance controls.
- [x] Add independent exact reading places.
- [x] Complete the final cold-load resume boundary correction, then repeat affected checks and build verification.

## Historical first-cycle review and verification

The independent final review initially returned **REVISE** for repeated customization headings, excessive editor chrome, and unexplained pause marks. Those objections were resolved: the editor now has one title/instruction/count, uses a focused shell, protects changed drafts on Back/Cancel and reload, and corrects direct-load footer spacing. Aa exposes pause guidance with an explanation that canonical punctuation remains visible. The final reviewer returned **APPROVED**, with no remaining blocking visual defects in the reviewed screens.

Actual browser reading also exposed first-use Study font drift. Presentation changes now settle the same semantic source anchor after those fonts load, retaining the modal-close coordination and canceling after reading intent. The full Sukhmani reading preserves all 2,019 source lines across 35 sections through mode changes and 34px type.

The final targeted regression run passed **342 tests across 29 files**. Full project lint, whitespace checks, TypeScript/production web build, startup bundle audit, Capacitor sync and the iOS simulator build passed. Native simulator interaction was not validated because the Mac was locked; sustained actual-iPhone reading remains a separate validation activity.

A final cold-load check exposed browser scroll clamping after font reflow near the end of a long reading. The final correction now distinguishes that bounded layout adjustment from actual user movement. Fresh Sukhmani resume to verse 7238 returns to 76.3px after font completion, remains stable, and still cancels after reading intent. Dedicated clamp and cancellation regressions pass; the complete targeted run and build above were repeated after this correction. Trace: `artifacts/experience-v8/cold-resume.json`.

Evidence:

- Home arrival, selected/partial/completed routine, weekly/saved states, light/dark, tablet/desktop and enlarged text: task visualization folder `home-editorial-v8/results.json` (11 contexts).
- Reader opening, appearance, desktop and final Sukhmani source: task visualization folder `reader-v8-qa/`.
- Artwork: `artifacts/customization-final-qa-20261017/results.json` (five contexts; all 14 thumbnails and 15 full originals, Apply/reload/Cancel and failure/retry).
- Final focused editor, Add/discard sheets, native focus, reload guard and enlarged text: `artifacts/routine-cleanup-qa-20261017/results.json` and `before-unload.json` (four contexts).
- Lead's actual app screenshots: `artifacts/experience-v8/`.

The completed first cycle is ready for hands-on review. The dedicated reader workstream above remains open, including deep Back/exit, end-of-bani actions and the remaining interaction/device acceptance checks. This cycle establishes specific design and functional improvements; category leadership, subscription value and lasting reading comfort require actual use and user evidence.


## Reader completion cycle — October 17, 2026

Implemented the approved Home/reader plan in the existing app:

- Tap-to-reveal deep controls live in an independent portal. The document-attached touch header and single scripture scroller remain intact. Deliberate wheel/touch/keyboard scrolling hides controls; semantic restoration does not. A newer tap wins over pending scroll settlement.
- Study word taps show one compact contextual preview, with full dictionary expansion. Read-mode taps reveal controls in both scripts. Punctuation is never mistaken for a dictionary word; partial token matches cannot attach an unrelated definition.
- Native selection suppresses competing controls. Clearing the selection clears its toolbar. Dictionary text selection cannot erase the retained reader preview. Expanded sheets restore focus after their locks release; pending focus work is canceled on route changes.
- All mode entry points clear stale word context. A different reading dismisses the previous reading’s sheets. Read again removes the old resume parameter while preserving the exact identity and origin.
- The finish panel offers explicit daily completion, Undo, the next incomplete bani in personal order with its own exact resume, routine return and Read again. Eligibility includes source, variant, range and selected length; saved fallback excerpts cannot complete a bani. Tracking-off and unrelated readings omit completion.
- Failed completion writes roll back routine, history and queued activity. Home uses the same safe completion action. Day rollover, duplicate actions, changed lengths and tracking settings are checked at action time.
- Exact offline payload validation rejects incompatible identities and lengths, preserving the known BaniDB extra-long aliases. Failed refreshes retain the current content. A pre-replacement callback captures the old semantic anchor before valid refreshed text commits.
- Chaupai passage attribution derives from its first body verse instead of a default-source introductory header. Canonical text and order are unchanged.
- Dictionary references retry independently without closing the reader or losing another loaded reference. Word sheets use the shared restrained reader surfaces. Study discloses missing support and preferred-provider fallbacks once per passage; verse actions identify the actual translation source, including single-source English entries. Read remains quiet.
- Home and customization use readable supporting labels and 16px native inputs. Narrow enlarged footer actions stack. Reader controls also stack at narrow enlarged sizes; the appearance sheet keeps Close reachable and its full settings scrollable.
- Background soundscapes are available through reading tools, allowing the finish panel to remain the reading’s ending.

The independent review raised gesture, focus, source, mode, selection and route-state defects. Each was corrected and covered by interaction or browser checks.

Evidence is in `artifacts/reader-v9/` (screenshots, `matrix.json`, `long-reading.json`) and `artifacts/home-final-polish-20261017/` (Home/customization screenshots, results and accessibility checks). The reader matrix covers 390px light/dark, 320px with 200% text in both themes, tablet and desktop. It exercises word expansion, focus, selection, completion and Undo. Sukhmani preserves all 2,019 lines / 35 sections through Study and 34px text, and opens from exact saved content with external requests blocked while bundled app assets remain available.

Design research: [Lazyweb reader preview report](https://www.lazyweb.com/report/lazyweb/e638600e-19aa-4a4b-a5d7-4223addcb281/?source=create), opened in the default browser. No paid upgrade was performed.

Physical-iPhone long-session comfort, native selection handles, VoiceOver and native Back gestures remain unverified. Native UI access was checked again and the Mac remains locked. Web evidence and a successful iOS build do not establish those checks.

Final verification for this cycle: **445 tests across 30 files passed**, full project lint passed, and the production build/startup audit, Capacitor sync and iOS simulator build passed. Home/customization covered 30 browser scenarios; the reader covered six viewport/theme/text-size scenarios with no horizontal overflow, page errors or scoped accessibility violations. The full Sukhmani and cold exact-cache check also passed.

A final controlled-availability browser check removed the preferred English provider and transliteration from the response while retaining canonical text. Light/dark Study correctly disclosed the fallback/missing layers; word expansion, source reading, focus, selection, completion and Undo still passed. Evidence: `artifacts/reader-v9-source-fixture/`.

## Home composition revision — October 17, 2026

The owner accepted the reader's direction and rejected the rest of Home. Reviewing the complete rendered page confirmed the mismatch: seven expanding Nitnem rows dominated the lower page, the week appeared appended, and saved items omitted their actual excerpts. Passing the previous checks did not establish the requested visual quality.

The revision replaces that folio with one open reading composition: a prominent current Gurmukhi title, direct Begin/Continue and explicit completion/Undo, two direct-open upcoming banis, and an All banis sheet containing the complete personal order. Exact source, variant, selected length, per-bani resume and Home origin remain intact. Completing a bani keeps Undo available; a finished routine has its own quiet state. Empty and tracking-off routines remain supported.

The lower page now uses the same light/dark ink, paper, typography and spacing as the reader. Weekly continuity is a compact dated band with the true day goal and recorded-day state. Saved shows the stored scripture or book excerpt, selected available meaning, exact source and return route. The text follows the selected script without modifying canonical stored content. An empty Saved area becomes a quiet Explore link. The artwork and Hukamnama remain prominent, with a single material transition into the lower page; all original artwork settings are preserved.

An actual browser check exposed an early Strict Mode cleanup restoring focus before the sheet's portal had mounted, causing the real dismissal to skip restoration. Queued cleanup now yields to a newer open effect and checks the live portal before restoring focus. The shared sheet also ignores internal controls and Radix focus guards when capturing the external opener, retaining its existing scroll lock, initial focus and route-dismissal protections.

Design research: [Lazyweb Home preview report](https://www.lazyweb.com/report/lazyweb/5ae5438a-2e07-40d1-95d3-fb00c39233d6/?source=create), generated from the current full Home screenshot and opened in the default browser. No paid upgrade was performed.

Visual evidence: `artifacts/home-v10/` and `artifacts/home-focused-20261017/`. These include light/dark, unfinished/partly completed/finished routines, actual saved excerpt examples, the full ordered sheet, desktop and 320px with 200% interface text. The reader was left unchanged in this revision. Physical-device and sustained reading validation retain the limits recorded above; this revision is not a declaration of perfection or category leadership.

Final verification: **466 tests across 32 files passed**. Full project lint, production build, startup bundle audit, Capacitor sync and iOS simulator build passed after the focus correction. The lead's 15 browser scenarios passed exact ordered-list access, saved excerpts, close-to-opener focus, no page errors, no horizontal overflow and no scoped WCAG violations. Six further real-browser mouse/touch/keyboard Close/Escape scenarios restored the exact opener. Component/integration tests also cover empty and single-bani routines, tracking off, custom order, variant/length compatibility, exact resume, explicit completion/Undo, persistence failure and day rollover.

## Softer light appearance — October 17, 2026

The owner found light mode too bright. Shared light surfaces now use muted warm stone (`#e5dfd2`) instead of near-white (`#f8f6f0`), with quieter raised surfaces. Supporting labels and bronze accents were deepened alongside the background so small text keeps sufficient contrast. Status and focus colors were adjusted to match. Dark theme tokens remain unchanged.

The initial page background and browser theme color match the new palette before React loads, avoiding a bright startup flash. Reader word/translation cards and dictionary chips/footer use shared surface tokens in place of literal white while retaining their existing dark overrides. Layout, artwork and reading behavior are unchanged.

Verification: **97 affected tests across five files passed**, targeted lint and whitespace checks passed, and the production build/startup audit plus Capacitor sync passed. Fifteen Home scenarios and two reader interaction scenarios passed with no horizontal overflow, page errors or scoped accessibility violations. The reader checks include word expansion, appearance, native DOM selection, completion/Undo and focus restoration. Evidence: `artifacts/home-light-v11/` and `artifacts/home-light-v11-reader/`.

The screenshot-grounded [Lazyweb light-mode preview](https://www.lazyweb.com/report/lazyweb/13c60aad-ea67-4b39-af72-dceda65cb9da/?source=create) completed without degraded output and was opened in the default browser. The free report is a preview; no paid upgrade was performed.

## Native beta preparation — October 17, 2026

The owner authorized native validation and beta handoff. The initial Release simulator app (arm64 and x86_64) and unsigned arm64 iPhone archive compiled successfully with the Capacitor `App` scheme, version 1.0 (1), bundle `com.naamras.app`, iOS 17+. That initial package verified 284 production web files per artifact, three privacy manifests and a compiled launch screen. This packaging pass was superseded by the corrected v15 artifacts recorded below.

Preparation found that the native launch asset still used older colors and the initial WebView used the system background. The launch asset, storyboard fallback and WebView now use the approved light/dark backgrounds. Source-to-asset color validation and both final native compilations pass; the visual startup transition remains part of the pending device check.

The native UI tool was checked at the start and again after packaging: the Mac remains locked. A request to unlock it was sent to the owner. No native interaction, selection-handle, VoiceOver, gesture, background/resume or sustained-reading result is claimed. No physical iPhone was discoverable. Xcode has no configured Apple Developer Team and the current signing inventory has no usable identity or provisioning profile, so the iPhone archive is explicitly unsigned and cannot be installed or distributed as-is. Nothing was uploaded.

Handoff: `docs/qa/experience-beta-handoff.md`. Packages: `artifacts/beta-20261017/NaamRas-iPhone-Simulator.zip` and `NaamRas-iOS-unsigned.xcarchive.zip`. Native validation resumes once desktop access is available; signed physical-device delivery also needs the owner's Team/signing setup and a connected trusted iPhone.

## Native simulator validation and v13 corrections — October 17, 2026

Following the locked-desktop preparation above, actual UI validation became available on an isolated iPhone 17 simulator running iOS 26.4.1 (23E254a). This is simulator evidence, not physical-iPhone sign-off. The chronological observations and screenshots are recorded in `artifacts/native-beta-v12/runtime-results.json`.

Clean four-step onboarding, Home with a real dated Hukamnama, ordered All banis access through rows 5–7, explicit completion/Undo and retention of onboarding completion after an upgrade/relaunch were observed working. Japji Study rendered, and native long-press selected one Gurmukhi word with handles/custom actions. The appearance sheet/native text menu appeared. Artwork preview/Cancel preserved Eclipse; Apply displayed Court mural. These observations do not establish selection-handle extension, native sharing, complete appearance interaction, every artwork mode or relaunch persistence.

The native pass exposed three concrete issues. Composite Rehras needed an exact route-identity correction; the weekly-goal Unicode arrow rendered as a blue emoji and was replaced with the existing SVG; Chaupai short failed strict source validation because live per-verse source metadata was omitted. API normalization now uses the authoritative `baniInfo.source` fallback and normalizes `id`/`sourceId`. Real Chaupai short/medium/long payload checks and canonical short text/order checks passed. Canonical scripture was not edited.

Rehras short opened, section 6 jumped to Ang 1386, and Back returned Home. Exact native reopen still needs confirmation. Investigation confirmed that the live payload's per-passage source IDs are all null; the observed section/page must not be treated as verified passage provenance. The narrow truthful display correction is implemented: retain known bani route identity while exposing neutral “Sundar Gutka” attribution when scripture is unverified. Exact-bani share routing and neutral saved-phrase attribution are covered. The attribution repair itself does not edit canonical text or reading identity; a subsequently discovered ordering/cache defect is recorded below.

The broad pre-API-fix regression passed **468 tests across 32 files**. After the normalization correction, **89 overlapping affected tests (87 + 2)** passed, along with targeted lint and TypeScript checks. The subsequent attribution correction passed **122 integrated reader tests across four files** and lint. V13 and v14 native Release builds succeeded. The v13 simulator app was installed and launched, but the Mac relocked before the Chaupai native retest; an unlock request remains pending. Existing screenshots predate the newest API build where applicable, and the recorded Chaupai error is the original failure, not a passed retest.

A real-data audit then found that the old global page/shabad Map reordered Rehras long (439 verses) and extra-long (521 verses) when a page was revisited. Short (306) and medium (337) matched the provider sequence. The correction is implemented: normalization builds sequential contiguous groups, adds a unique suffix only for repeated group IDs, and preserves verse IDs and resume identity. A `normalizationRevision: 2` marker and cache guard reject known-bad legacy long/extra-long zero-shabad payloads until refreshed; stored bytes are not deleted. Short/medium legacy caches retain metadata-only repair. All eight live-payload checks match raw verse IDs, text and header flags exactly; evidence is in `artifacts/native-beta-v12/source-normalization-validation.json`.

The final frozen-source affected checks passed **98 API/cache/hook tests across five files** and a rerun of **122 reader tests across four files**, totaling **220 tests across nine files**. Targeted lint and TypeScript checks passed. These supersede earlier affected-run results for the normalization and ordering corrections; the historical 468-test suite is overlapping and was run before the latest fixes. Final v15 web sync, Release simulator build and unsigned device archive passed. The v15 simulator app was installed and launched, with further native UI retests still blocked by the relocked Mac.

The final packages were regenerated from frozen source. Both contain **283 web files** verified hash-identical to `dist`, three privacy manifests and a compiled launch screen. The manifest fingerprints **390 product source files**, including uncommitted work, with SHA-256 `629de1b7d570ce386eb7c34e2afbdfb10fabd051f35eae8962ce17cae005e998`. The simulator ZIP is **56,955,057 bytes**; the unsigned device archive ZIP is **58,987,568 bytes**. Both ZIPs passed CRC and SHA validation. Persistent evidence is in `artifacts/beta-20261017/build-manifest.json`, `SHA256SUMS.txt`, `package-integrity-validation.json`, the build/sync logs and the packaged `simulator-runtime-results.json`.

Remaining native work includes Chaupai reopen/Retry, the SVG correction, exact Rehras resume, truthful attribution and corrected order, selection-handle extension and share cancellation, light/dark interaction, routine Save/Cancel, artwork modes and relaunch persistence, deep/enlarged Sukhmani, offline/interruption recovery, VoiceOver and sustained physical-iPhone comfort. No complete native journey or physical-device acceptance is claimed. No physical iPhone is discoverable, signing remains unavailable, and nothing has been uploaded or distributed. The source and packaged artifacts are frozen; remaining native UI and physical-device sign-off retain their pending status. The current handoff status is maintained in `docs/qa/experience-beta-handoff.md`.

## Unlocked native retry and v17 location correction — October 17–18, 2026

Native access became available again after the v15 packaging record above. The additional observations are in `artifacts/native-beta-v16/runtime-results.json`; its `previousEvidence` link retains the earlier v12 report. The screenshots record the v15 Release candidate on the same isolated iPhone 17 / iOS 26.4.1 simulator.

Chaupai short now opened from Read search with live text, Study layers and Sri Dasam Granth Sahib Ji attribution. The weekly goal rendered the corrected SVG. Settled light Home showed dark clock/icons and dark appearance showed white; the earlier mid-scroll white-on-paper capture did not establish a persistent status-bar defect. Dark appearance and 34px Read worked, with reachable sheet Close and retained settings on opening Rehras. The Rehras opening visibly used neutral “Sundar Gutka” attribution. A selected Gurmukhi word produced an excerpt-only share preview, opened the native share sheet, and cancelled back to the same enlarged passage without sending or saving externally.

Court mural remained selected after update/relaunch, and one actual Home swipe reached lower Nitnem/week content. Other injected drags were unreliable. Native one-word selection showed handles/menu and app actions, but an attempted handle drag cleared the selection instead of proving extension. Injected deep Back coordinates opened Contents; isolated browser hit-testing found distinct nonoverlapping controls, so this remains ambiguous and establishes neither a native Back pass nor an app defect. Sustained gestures and handle extension remain unverified.

The retry did expose a reproducible location defect: jumping to Rehras section 6 displayed its Ang 1386 body while a preceding Ang 12 heading kept the dock and saved location at 12. The correction tracks the passage body anchor rather than that preceding header. It is implemented and frozen, with **135 reader tests across five files**, targeted lint and TypeScript passing. Together with the unchanged **98 API/cache/hook tests across five files**, the current affected verification is **233 tests across ten files**. The earlier test totals are historical and overlapping; they are not additive.

V17 web sync, the Release simulator build and unsigned arm64 device archive passed. The updated simulator app was installed and launched, but the Mac relocked before the corrected anchor UI retest; the unlock request has no reply yet. Package regeneration succeeded. Each native bundle verifies **283 web files** hash-identical to frozen `dist`; the final manifest fingerprints **390 product source files** with SHA-256 `d214239e4ae08abf1831e8ac799c1629266abd091c03d7fd0c0b3ad6271ab9f9`. The simulator ZIP is **56,955,118 bytes** and the unsigned archive ZIP is **58,987,631 bytes**. Both ZIPs passed CRC and manifest SHA checks in `artifacts/beta-20261017/package-integrity-validation.json`. The package contains the current v16 runtime report and retains its v12 previous-evidence link, alongside the v17 build/sync logs. These artifacts supersede the v15 package record above; all app source is frozen. Native retesting of the corrected jump, exact Home/cold reopen and alternate lengths/order remains required. The source report’s original failed observation remains historical evidence of the defect, not a passed corrected-build retest.

All compound native journey boxes remain unchecked. Full routine Save/Cancel, all artwork rotation modes, deep/enlarged Sukhmani, native offline/interruption recovery, VoiceOver and sustained physical-iPhone comfort remain pending. No physical iPhone is discoverable; Team/signing/profile inventory is unchanged, the device archive remains unsigned, and no upload or distribution occurred.

## Native v17 retest and exact-reopen regression — October 18, 2026

The next unlocked native session is recorded in `artifacts/native-beta-v18/runtime-results.json`, retaining previous v16/v12 evidence. On v17, Cancel/Discard preserved the original seven-bani routine. A temporary two-bani Rehras/Sohila routine then saved successfully to exercise reopening. The original seven-bani routine was subsequently restored and persisted after relaunch on v19, recorded below. These observations establish the exercised actions, not every routine/order/length journey.

The corrected Contents jump reached the Hamri body at verse 2883 and the dock correctly showed Ang 1386. Deep Back returned Home. These actual observations supersede the previous lock-blocked anchor retest and ambiguous Back status; sustained gestures and selection-handle extension remain unverified.

Exact reopening failed on v17. Home → All banis → Rehras → Your saved place returned to Ang 8 rather than the saved Ang 1386 body, and SQLite confirmed verse 2883 was overwritten by 2650 during reopen. The cached-to-fresh payload and incoming-resume timing correction is implemented and frozen following independent review. It includes a real 200px fallback becoming a 5,000px reading, exact incoming resume, and failed-empty-load Retry coverage that preserves a deliberate manual reading offset. Final checks passed **132 reader tests across five files** and **98 source/cache/hook tests across five files**; subtracting the 14 overlapping `useBani` tests gives **216 unique tests across nine files**. Targeted lint and TypeScript passed. Earlier affected totals overlap and are not additive. The v17 packages and their integrity proof remain valid for their source, but precede this correction.

Final v19 web sync, Release simulator build and unsigned device archive passed. The corrected app was installed as an update preserving QA data and launched. Actual native Home → All 2 → Rehras → Your saved place returned to body verse 2883 and dock Ang 1386, retaining 34px Study/dark; deep Back returned Home. Full termination/relaunch followed by the same route again reached 2883. Screenshots `08-v19-home-reopen-correct-saved-verse.png` and `09-v19-cold-relaunch-exact-saved-verse.png` record these passes. The original failure remains as `previousFailureEvidence`; cold relaunch does not establish offline or lock/unlock acceptance.

Native Customize → Restore seven daily banis → Save then returned Home to 0 of 7 / All 7. Another terminate/relaunch retained the seven-bani routine, Eclipse and dark appearance; screenshots 10/11 record the restoration. The temporary two-bani QA routine is no longer active.

Final v19 packaging passed after the strict asset gate safely stopped on 67 unreferenced generated numeric clash copies in `dist`. Those copies were preserved in quarantine without changing canonical source/assets or weakening the gate. All **283 canonical web files** then hash-matched both native bundles. `artifacts/beta-20261017/generated-output-validation.json` records the generated-output validation. The regenerated simulator ZIP is **56,955,492 bytes**, and the unsigned arm64 archive ZIP is **58,988,004 bytes**. Both passed CRC and manifest SHA checks in `package-integrity-validation.json`. The final manifest fingerprints **390 product source files** with SHA-256 `b157140804173c9c905352259e8e884fb35c1d48d1b7887c3a1faea6db54e976`, superseding earlier package records. No app source changed during packaging.

The package includes the v19 build/sync logs, current v18 runtime report with matching hash, `package-candidate.py` and `verify-package-integrity.py`. Its manifest derives exact-reopen and routine-restoration statuses from the same runtime snapshot, retaining previous evidence and the original v17 failure. The current recorded statuses are partial native acceptance with exact reopen passed and original routine restoration passed. All compound journey boxes stay unchecked; alternate lengths/order navigation, wrapped selection handles, sustained gestures/full large-text Sukhmani, offline/lock recovery, VoiceOver and physical-iPhone acceptance remain pending. Signing and distribution limits are unchanged.

## Historical October 18 goal cycle: v21

The active [completion goal](world-class-completion-goal.md) covers Home, Nitnem, artwork, Read/Study, integrity, recovery, inclusion and final acceptance. V20 visual, artwork, System appearance, long-Sukhmani, display-axis and accessibility evidence remains explicitly scoped. V21 closes primary Ang/Shabad deadline/cancellation/stale-response cases, retained Retry pagehide, optional word recovery and full-Ang cache integrity.

Final 651/41 regression and all software/build/package gates passed on the frozen source; see the [current handoff](../qa/experience-beta-handoff.md). Native UI awaits Mac unlock. Physical-iPhone acceptance and signing remain open. Historical passes retain their actual build labels.

## October 18 v22 continuation and final software delivery

The bounded short-landscape/200% audit reproduced real gallery/footer, Restore seven, zero-height Add list and off-screen focus-wrap failures, then a distinct 544px reader tail leaving the terminal viewport blank. Four narrowly scoped files correct them. Actual production checks passed corrected short/full 2,019-line endings, portrait, explicit completion/Undo, settled keyboard Read again and expanded English/Punjabi cadence. The four additional reader chains cover actual remote/local search return, enlarged dark excerpt dismissal, three open-sheet document reloads and five warmed full-reader tool cycles; their pre-tail-fix provenance and infrastructure limitations remain explicit.

Final **699/42** regression, full lint/types, CSS/startup/production audits, Capacitor sync, both Release targets, CLI install/launch without erasure and strict package verification passed. The final **612-input** fingerprint is `88c1dff5f8dec774e2116c3020a27db37b49a280ebb5b7269876a93479ae524c`; all **283 canonical web files** match both apps/ZIPs, including the final browser-tested production index. [Current handoff](../qa/experience-beta-handoff.md), [source validation](../../artifacts/goal-quality-v22/final-source-validation.json), [independent review](../../artifacts/goal-quality-v22/independent-review.json). Historical v21 packages/evidence remain preserved.

The supported native tool still reports the Mac locked. Zero devices were discoverable with CoreDevice provider unavailable; zero valid signing identities were found. Final native interaction, original seven-bani QA restoration, required physical-iPhone comfort/VoiceOver/selection/display/interruptions and authorized signing remain open. The simulator was shut down after CLI launch. The [goal](world-class-completion-goal.md) remains active and is not achieved by compilation or browser acceptance alone.

## Third-turn external blocker audit

The preceding v22 turn completed concrete software/delivery progress. Fresh native/device/signing and requirement-evidence revalidation now confirms an external impasse; the [goal](world-class-completion-goal.md) is blocked, not achieved. [Audit](../../artifacts/goal-quality-v22/blocked-audit-3/audit.json). Existing active-at-delivery history, source freeze, verified packages and packaged runtime remain preserved; actual native and physical acceptance is still required.
