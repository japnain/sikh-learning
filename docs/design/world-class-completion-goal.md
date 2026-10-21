# NaamRas PWA completion goal

> Evidence note: `artifacts/` links and localhost previews in this document refer to preserved local QA records, which are excluded from Git. Historical build results apply only to their named snapshots; the current session-only push scope is recorded in [pre-push readiness](../qa/session-prepush-readiness.md).

Updated October 21, 2026. Status: **v28 navigation replacement implemented and affected PWA acceptance delivered**. The v27 icons were rejected and replaced substantially. Owner approval of the new aesthetics is not assumed. Prior Home/Nitnem/reader acceptance remains preserved below.

## Current navigation extension

The owner rejected the v27 icons as visually inadequate. Passing route, geometry and accessibility checks does not establish design acceptance. Preserve that iteration as evidence, replace the icon family substantially, and inspect the new family at actual navigation size in the full Home context before final packaging. Do not close this goal using v27's passing functional checks or prior delegated aesthetic approval.

The owner requested one redesigned primary navigation bar in its current position, with better artwork-inspired icons for both light and dark mode. Deliver one coherent system using warm stone, midnight ink and antique brass; original architectural, manuscript, ribbon and floral glyphs; readable familiar labels; and a clear active state conveyed by shape as well as color. Preserve all four destinations, route selection rules, the desktop rail and the reader's separate immersive controls. Use the existing safe-area and measured content-reservation behavior.

- [x] Required Lazyweb references and uploaded-screen report completed; design direction recorded in [artwork navigation](artwork-navigation.md).
- [x] One implemented bar and four coherent original icons work in both themes without moving the compact-screen navigation destination.
- [x] Home, Read, Saved, More and nested route behavior, reader isolation and localized labels remain correct.
- [x] Actual narrow, portrait/landscape, desktop and enlarged-text layouts pass target, contrast, focus, safe-area, viewport compensation and content-clearance checks.
- [x] Independent review and meaningful affected regression/lint/type/production checks pass; prior Home/reader/offline behavior remains intact.
- [x] Fresh tested web source, screenshots, package and current handoff agree; browser-proxy limits remain explicit. No native signing/device gate or public deployment is added.

The [v28 navigation delivery](../qa/artwork-navigation-acceptance.md) binds 581 fresh browser assertions across 12 contexts, five accessibility scans with zero violations, 21 final-build offline/reading checks, 42 affected unit tests, full lint and production TypeScript/build/startup checks to the replacement family and verified web package. The new courtyard/pothi/ribbon/jaali icons and capsule-free active state were inspected at actual 1× size after the heavier ribbon and gear-like experiment were corrected. This records completed implementation and software acceptance, not a claim that the owner approved the aesthetics or that test totals prove a subjective “world class” label.

The accepted v25 PWA package and its frozen source are historical baselines for this extension. Completion now requires the navigation criteria above, not another declaration based on the old package.

## Owner-confirmed target and scope

The owner clarified that NaamRas is a web app added to the Home Screen. The current goal is a beautiful, coherent and dependable Home, Daily Nitnem and Gurbani reader in the browser and installed PWA. Native-wrapper builds, Apple signing, mandatory physical-iPhone sessions and the simulator-only routine cleanup are outside this goal. The earlier platform assumptions and their results are preserved below as historical records; they are not current blockers or requirements.

The existing artwork, light/dark, scripture, explicit completion, customization, exact reading-place and accessibility requirements remain. Preserve all user data and canonical source order, punctuation and truthful attribution. Keep all fifteen artworks and the NaamRas wordmark; preserve the artwork-led aesthetic and below-art Hukamnama. No new recitation features, monetization or public deployment is included.

## Current PWA acceptance sequence

1. Verify real production service-worker install/control and cached shell. Close/reopen and reload Home and exact deep reader URLs offline; distinguish an available shell from an available canonical reading. Check truthful unavailable/retry and reconnection behavior.
2. Reproduce interrupted-update and navigation-outage behavior. A failed new worker must preserve a usable earlier offline shell. HTTP server outages must fall back to the usable cached app. Updates must not reload an active reading or discard its place/preferences.
3. Verify standalone viewport integration at full and shortened drawable heights, safe-area spacing, portrait/landscape, large interface text, keyboard focus and pageshow/orientation recovery. Test actual app geometry and reachable controls, not metadata alone.
4. Exercise coarse-touch reader shallow and deep scroll, control hiding/reveal, Back, Location and Appearance. Keep canonical verse position through Read/Study, font changes and supporting layers; no scrolling or navigation auto-completes a bani.
5. Exercise custom routine and variant/length persistence, explicit completion/Undo, independent Home/All/Saved reading places and close/reopen/offline/reconnect without clearing storage. The temporary native simulator routine is unrelated to these PWA records.
6. Run only meaningful affected regressions and production checks for new changes; obtain independent review, record actual browser screenshots/behavior and bind the final web build to its tested source. Preserve parallel feature work and frozen v23 history.

- [x] Production service-worker control, offline Home and deep-reader recovery accepted.
- [x] Interrupted updates and HTTP navigation outages preserve a usable app and active reading.
- [x] Standalone geometry, viewport lifecycle and coarse-touch reader controls accepted within recorded browser scope.
- [x] PWA routine, exact reading-place and preference persistence accepted through reopen/offline/reconnect.
- [x] Any confirmed material findings fixed; affected tests/builds and independent review passed.
- [x] Final web evidence and current handoff reconciled; all remaining limitations stated precisely.

Final evidence is indexed in [PWA acceptance and delivery](../qa/pwa-home-reader-acceptance.md): 80 artwork scenes/1,280 assertions, all fifteen source-image/ratio checks, six accessibility scans with zero violations, 81 standalone checks, 21 offline/update/reading checks, two reproduced worker recovery cases, 89 affected unit tests, full lint and production TypeScript/build/startup checks. Three confirmed PWA defects were fixed and independently reviewed. The final web-only ZIP contains all 299 matching production files, bound to the 603-input source snapshot. Historical totals are not added together. Native/physical/signing work remains outside the owner-confirmed scope, and no public deployment or claim of literal perfection is implied.

Browser standalone/safe-area proxies are labeled as such. They test application logic and geometry and do not pretend to be physical Safari or native VoiceOver. The owner has removed those device/signing acceptance gates; lack of a connected iPhone or Apple identity must not block progress or completion of this PWA goal. Finish when these relevant software acceptance checks pass and no confirmed material issue remains within the agreed scope. “World class” remains a quality aim, not a claim of literal perfection or a guaranteed subscription value.

## Preserved implementation goal and historical evidence

The following earlier goal and chronology document the implementation and prior assumptions. The owner-confirmed PWA scope above takes precedence wherever the legacy text refers to mandatory native/physical/signing acceptance.

### Earlier Home, Nitnem and reader goal

Created October 17, 2026. Status: **Home refinement validated in v23; hands-on native/device acceptance remains open**. This is the master acceptance goal for the final quality pass; earlier plans and beta evidence remain supporting records. It is not a declaration that the current implementation is finished.

## Goal

Deliver a distinctive, beautiful and dependable daily Gurbani experience in which Home, artwork, daily practice, customization and sustained reading feel like one carefully authored product. The visual experience should justify a premium position through restraint, typography, imagery, consistency and ease of use. Its behavior must remain reliable through real reading, difficult data states and interruptions. A subscription price or a claim of literal perfection cannot be established by code or screenshots alone.

Completion requires the criteria below to be exercised and supported by current evidence. A passing build, a good opening screenshot, a generated design report or an enthusiastic review cannot substitute for this acceptance.

## Approved direction and boundaries

- Artwork is central to the identity. Preserve the prominent Eclipse composition and all fourteen original artworks; improve their surrounding composition and legibility without treating the art as expendable decoration.
- Preserve the coherent midnight dark palette and perfect the subdued warm-stone light palette. Avoid glare, weak labels, washed-out controls and arbitrary one-off surfaces.
- Home should offer an authored daily sequence: Hukamnama, the current Nitnem reading, upcoming banis, the full custom order, honest continuity and meaningful return points.
- Read is quiet and scripture-led. Study adds useful support without making prolonged reading crowded or losing the active verse.
- Keep the existing React/Capacitor product and data boundaries. Preserve prior user routines, reading places, completion history, bookmarks, vocabulary and preferences; preserve compatible snapshot behavior.
- Canonical scripture, headings, punctuation and source order are immutable. Source labels must be supported by actual provenance. An unknown corpus source receives a truthful neutral label.
- Completion is explicit and reversible. Opening, scrolling, jumping, visiting the end or refreshing never means a bani was completed.
- Do not add recitation or audio-file features. Keep the existing background soundscapes working.
- Do not introduce a new paywall, account service, monetization flow, analytics collection, public deployment or paid dependency under this goal.

## What “world class” means for this work

Assess visual quality and functional acceptance separately. Every area below must have a deliberate answer, with no unresolved material finding from independent review:

| Quality dimension | Required result |
| --- | --- |
| Identity and composition | Recognizable art-led character; intentional transitions, spacing and type; Home and reader belong to the same product. Avoid generic dashboard clutter or decorative framing that competes with scripture. |
| Clarity and ease | The next action and current state are understandable. Essential actions remain reachable in long content, narrow layouts and enlarged text. Controls look and behave consistently. |
| Reading comfort | Inspect openings, long middle passages, section transitions and endings. Gurmukhi, transliteration and selected meanings retain comfortable hierarchy, line length and spacing. No clipped marks or obscured final verses. |
| State craftsmanship | Empty, loading, error, offline, partial, completed, disabled and unavailable states look intentionally designed and describe the truth. |
| Reliability | Exact identities, saved verses, drafts, preferences and source order survive changes and interruptions. No data loss, silent incompatible resume or false completion/readiness. |
| Responsiveness | Measure reading entry, deep navigation, appearance changes and repeated use in a known environment. No repeatable frozen controls, accumulating work or progressive slowdown. Separate network waits and overloaded automation from product latency. |
| Inclusion | Readable contrast and text; appropriate touch targets; keyboard and assistive-technology names, order and focus; meaningful reduced-motion support. |

## Acceptance workstreams

Checked browser/unit criteria below mean their stated behavior has scoped evidence in the [acceptance index](../qa/world-class-acceptance.md). They do not close the separate native/device requirements in C–F. Unchecked compound criteria retain narrower passed observations in the linked ledgers.

### A. Home and shared visual system

- [x] Inspect the whole page, including content below the artwork, in light, dark and System appearance. Verify shared surfaces, dividers, type sizes, emphasis, radii, icons and spacing across Home, artwork, routine editing and reader sheets.
- [x] Inspect Eclipse and every original artwork. Preserve subjects, crop, contrast and legibility; verify the surrounding page remains coherent for bright and dark images.
- [x] Exercise first arrival, unstarted routine, independent saved places, partial completion, all completed, empty routine, tracking off and unavailable/offline Hukamnama.
- [x] Verify the Hukamnama date, source, citation, reading entry and return are truthful. Do not substitute today's date for stale content.
- [x] Verify current reading, Begin/Continue, explicit completion/Undo, upcoming links and All banis remain discoverable in the actual custom order.
- [x] Verify weekly continuity distinguishes a day with a completion from a fully completed routine; goal editing, real dated history and midnight rollover remain truthful.
- [x] Verify empty and populated saved return points, excerpts and exact source links, including the journey back to Home.

### B. Daily Nitnem and artwork preferences

- [ ] Add, remove and reorder banis, including both supported Savaiye variants. Select every supported Chaupai and Rehras length. Preserve the exact canonical selection and order.
- [ ] Verify draft versus committed state, dirty Back/Cancel/discard, Save, direct load, relaunch and compatible existing preferences. Do not lose a draft accidentally or silently commit it.
- [ ] Verify completion and Undo from Home, All banis and eligible reader endings. Repeated actions are idempotent; tracking off removes inappropriate prompts. Local midnight and timezone-sensitive dates update correctly while history is retained.
- [ ] Verify every offline-ready claim by reading back the exact selected payload. A changed draft, missing length or rejected old cache cannot inherit another selection's readiness.
- [x] Verify artwork preview, Apply, Cancel, Keep one, Daily change and Each visit. Choices persist; rotation follows the selected rule and does not change the artwork while remaining on Home.
- [x] Verify all editor/gallery controls remain reachable at narrow widths and enlarged text, including sticky footer clearance, close, Add, restore defaults and destructive-looking reversible choices.

### C. Complete reading and Study

- [ ] Enter from Home/Nitnem, Hukamnama, Read/search and Saved. Maintain the correct source, title, exact bani/length and return origin.
- [ ] Exercise complete long Sukhmani and the supported short/medium/long/extra-long payloads. Compare verse IDs, canonical text and heading flags to provider order. Keep metadata repairs separate from scripture.
- [x] Read opening, middle and ending in Read and Study at default and 34px scripture. Exercise every supported script, meaning language/source, transliteration, spacing, alignment and pause guidance, including missing support.
- [ ] At depth, reach Back, Contents/location, appearance and reading tools without returning to the top. Controls and safe areas never obscure the active or final passage.
- [ ] Jump forward and backward through sections. Displayed source/Ang and saved body verse agree. Font loading, appearance changes, support-layer changes, document clamps and refreshes preserve semantic position and respect subsequent user intent.
- [ ] Alternate multiple banis, variants and lengths. Each maintains its own compatible place. Opening one never overwrites another; changing exact identity never imports an incompatible verse.
- [ ] Exercise compact word preview and full exploration, unavailable dictionary data, bookmarking and complete-verse saving, selected-excerpt sharing, native share cancellation and returning to the same source/focus/place. Native handles must extend across wrapped text.
- [x] Verify the reader ending has calm, reachable Back, Read again and the appropriate explicit completion/Undo/next action. Never infer completion from traversal. V22 removes the reproduced excessive tail; actual short/full 2,019-line maximum-scroll and portrait checks, explicit completion/Undo and settled keyboard Read again passed within browser scope. Native safe areas remain in C4/E7.
- [ ] Complete a sustained physical-iPhone reading session of at least 30 minutes. Assess comfort, friction, scrolling and control access in addition to correctness. Browser stress checks support this but do not establish physical comfort.

### D. Recovery, interruptions and data integrity

- [ ] Exercise cold online and cold exact-cache offline openings; unavailable different lengths; missing optional layers; source failure and Retry without losing usable canonical text.
- [ ] Preserve incoming and manually read verses through cached-to-fresh replacement, empty failure, saved-excerpt fallback and fallback-to-full layout growth. User reading intent remains authoritative.
- [ ] Background/foreground and cold relaunch from Home, deep reader, Saved and an open sheet. Verify preferences, completion, independent places, focus and dismissal behavior.
- [ ] Exercise lock/unlock, offline interruption and reconnection on a supported native environment; repeat critical journeys on a physical iPhone.
- [x] Preserve compatibility with existing local stores and snapshots. Do not repair malformed or mismatched cached scripture by inventing content or provenance. Keep rejected bytes recoverable where already supported.

### E. Accessibility and responsive/native behavior

- [ ] Inspect 320, 390 and 430 CSS-pixel widths, tablet/wide layouts, 200% interface text, 34px scripture, portrait and landscape where supported. No horizontal overflow, clipped controls, trapped scrolling or hidden actions.
- [ ] Check contrast against WCAG 2.2 AA where applicable, visible focus, keyboard order, meaningful names/roles/values, selected tabs, status announcements and dialog focus/return.
- [ ] Use comfortable minimum 44-by-44 CSS-pixel mobile targets for core actions, or provide sufficient equivalent spacing and accessible alternatives where inline scripture interactions need finer granularity.
- [ ] Exercise Reduce Motion, Bold Text, Increase Contrast, System appearance changes and largest supported accessibility text where the environment allows. Do not use motion to convey essential state alone.
- [x] Run scoped automated scans and manual keyboard checks on actual difficult states. Record which checks are automated versus manual.
- [ ] Complete actual native VoiceOver journeys: Home, all tabs, custom routine, reading, word actions, appearance, saved/share dismissal and degraded states. Browser accessibility scans do not count as VoiceOver acceptance.
- [ ] Check native status bars, launch colors, safe-area bottom placement, scrolling ownership and reachable deep controls. Do not infer gestures from unreliable simulator input injection.
- [ ] Check bounded long-reader responsiveness and repeated opening/closing of heavy Study tools, with unused test contexts closed. Record representative timings and memory behavior where observable; assess sustained frame and touch comfort on the physical iPhone.

### F. Final validation and delivery

- [x] Maintain one evidence index identifying build/source revision, route/state, viewport/device/runtime, inputs, expected/actual behavior, screenshots and pass/fail/blocker.
- [x] Obtain independent visual, interaction, accessibility and scripture/continuity reviews. The v22 four-file correction and actual browser evidence passed independent review with no unresolved material finding in that scope. Resolve every crash, data-loss issue, incorrect source/order, inaccessible core action, material visual inconsistency, overlap and navigation failure. Record lesser remaining risks rather than concealing them; native and physical acceptance remains separately open.
- [x] Run meaningful affected regression tests, lint, TypeScript, production/startup audits, Capacitor sync and both Release targets after final source changes. Final v22 passed 699 distinct tests across 42 affected files, full lint/types, the 14-file stylesheet audit and all production/native build checks on the explicit 612-input freeze. Do not add trivial tests merely to inflate totals.
- [ ] Exercise final native builds after installing them without erasing representative existing data. Retain a separate clean-install path.
- [x] Verify all canonical bundled production asset hashes, package identity, privacy/launch assets and ZIP CRC/SHA checks. Final v22 verifies all 283 canonical web files across both native apps/ZIPs, source freeze and exact runtime-ledger binding. V21 remains preserved. Generated conflict copies were safely quarantined; integrity gates remain intact.
- [x] Update the acceptance plan, current handoff, release checklist, screenshots, runtime results, package manifest and remaining risks consistently. The six-document independent v22 consistency review and local-link check passed against final 699/42 regression, 612-input freeze, 283-file package maps and the byte-identical runtime copy. Prior failures and superseding results remain identified; native and physical acceptance stays open.
- [ ] Complete physical-iPhone validation and signing when the owner's device and authorized signing assets are available. No credential bypass, unauthorized account change, distribution or upload is implied.

## Execution order and ownership

1. Lock the goal and approved direction; run the required Lazyweb reference/report review against the implemented screen. Root owns the master plan and evidence integration.
2. In parallel, audit Home/customization/artwork; long-reader/recovery behavior; and independent visual/accessibility quality. Review concrete findings before implementing changes. The approved existing design is the starting point, not an excuse to stop reviewing it.
3. Implement prioritized corrections in clearly owned files, with realistic regressions for behavior and actual screenshots for appearance. Avoid concurrent edits to the same reader or shared primitives.
4. Root exercises native flows, alternate lengths, interruptions, text selection and available assistive technology. Agents may exercise isolated browser fixtures but do not mutate the native QA app.
5. Repeat only checks affected by new changes or unresolved evidence. Build and package after source freeze, then retest the actual final native candidate.
6. Close criteria only with evidence; maintain explicit external blockers while continuing all useful independent work.

## Completion and blocker policy

The goal remains active while any meaningful authorized work can progress. It is achieved only when the acceptance workstreams have current evidence, independent reviews have no unresolved material findings, final artifacts match the tested source, and required physical/assistive-technology acceptance is complete. Do not substitute a numerical score, generated report, test count or simulated session for actual acceptance.

A missing physical iPhone, Apple signing identity or usable assistive-technology environment is an external blocker, not a pass. Record the exact unavailable item and the precise remaining journey; do not request repeated permission for already authorized reversible work. Do not mark the whole goal complete because that blocker exists while other work is available. Goal status follows the app's goal-tool rules, including its repeated-blocker threshold.

## Starting position

At goal creation, v19 was the verified beta, with 216 unique focused tests, both Release targets, exact Home Rehras warm/cold reopening and restored seven-bani persistence verified. These establish specific behavior, not the entire quality goal. See [current beta handoff](../qa/experience-beta-handoff.md), [supporting execution history](experience-quality-plan.md) and [physical release checklist](../qa/release-device-signoff.md). Remaining unchecked work above must now be assessed against actual evidence and completed where feasible.

## Required reference/report review

The quick mobile daily-practice Home reference search completed. The [hosted Lazyweb quality review](https://www.lazyweb.com/report/lazyweb/899ccd2e-6122-4d04-96ed-ccfd39c46dd7/?source=create) was generated from the actual V19 native Home screenshot and opened in the default browser. The provider returned a free preview rather than full report access, so this supports the independent product review and does not establish complete design acceptance. No upgrade was purchased.

Provider notice, retained verbatim:

> This free report includes a preview. Lazyweb Individual unlocks the complete report and full toolkit for $39/month.
>
> Upgrade securely: https://www.lazyweb.com/plans/checkout?plan=individual&source=mcp_upgrade

## Historical v22 execution ledger

This ledger records the October 18 candidate. The October 21 section below and current v23 handoff supersede its then-current status.

| Workstream | Owner | Current status |
| --- | --- | --- |
| Home, Nitnem and artwork | Home reviewer/implementer | All thirty artwork/theme views, System/recovery/state flows and v22 short-landscape editor/gallery/Add/cadence checks passed within browser scope; native retest remains |
| Reader, long content and recovery | Reader reviewer/implementer | Long Sukhmani, display/recovery axes, actual remote/local search, enlarged share dismissal, three sheet reloads, five warm tool cycles and corrected true-max endings passed within browser scope; native/physical gates remain |
| Independent visual and accessibility | Independent reviewer | 100 baseline states, focus/keyboard/localized save-retry checks reviewed; material fixes independently reviewed, including final cache and lifecycle corrections; physical VoiceOver remains open |
| Native validation and integration | Root | Final v22: 699/42 regression, full lint/types, stylesheet/startup audits, both Release builds, CLI install/launch without erasure and strict package integrity passed. Actual native UI waits for Mac unlock; physical gates remain |
| Physical iPhone and signing | Root, owner environment | No iPhone discoverable in the preceding inventory (CoreDevice provider unavailable); zero valid signing identities; owner availability question pending |


The current cross-workstream evidence and exact limitations are indexed in [world-class acceptance](../qa/world-class-acceptance.md). Compound checkboxes above remain open wherever a required native or physical portion is unverified; narrower passed observations are recorded in that index and its linked ledgers.

Historical v20 software regression: **600 distinct tests across 37 affected files passed** on that frozen candidate. [Validation record](../../artifacts/goal-quality-v20/final-source-validation.json) binds the result to the 612-input prebuild source fingerprint. All 15 artworks were reviewed in both themes at 390px ([per-art record](../../artifacts/home-release-acceptance-20261018/artwork-visual-390/visual-acceptance.json)). This does not close native or physical acceptance.

A clean frozen-production Sukhmani run closed the earlier inconclusive cold-entry setup: 2,019 ordered lines, first entry/reload/Saved return at verse 6208≈76.2px, then actual reading/pagehide and verse 6215≈76.3px ([record](../../artifacts/reader-acceptance-v20/cold-production/validation.json)). This remains browser evidence. V20 installed/launched through the deployment CLI; the native UI tool then reported a locked Mac and could not unlock it. Owner unlock was requested. Final native journeys and the temporary two-bani routine restoration remain pending; no historical v19 pass is relabelled as v20.

A final entry-point recovery review reproduced additional material cases outside the Nitnem hook: indefinite Ang/Shabad waits, older Ang refreshes overwriting newer responses, failed Shabad retry clearing usable text, and an optional word request/cache failure blocking other Study results. These fixes completed independent review and are included in the verified final v21 freeze; the verified v20 package is preserved. System appearance and all supported reader display axes have scoped browser evidence. The final v21 checks and package result are recorded below.

The same review confirmed a completeness issue: progress through a Bani could write its partial entry into the whole-Ang cache. The v21 correction separates recent Study entries from verified complete page payloads. Existing cached bytes and entry lookup remain available; unverified legacy arrays must be refreshed before being presented as a complete Ang. This source-integrity fix is included in the final v21 freeze and passing regression.

## Historical final v21 software result; goal remains active

The final source passed **651 distinct tests across 41 affected files**, full lint and TypeScript, the 14-file stylesheet audit, production/startup audit, Capacitor sync, both Release targets and strict package verification. The final app installed and launched through the deployment CLI without erasing QA data; the isolated simulator was shut down afterward. This establishes software/package readiness within the recorded scope.

The [current handoff](../qa/experience-beta-handoff.md), [source validation](../../artifacts/goal-quality-v21/final-source-validation.json), [production recovery](../../artifacts/reader-acceptance-v21/primary-browser/validation.json) and [runtime ledger](../../artifacts/goal-quality-v21/runtime-results.json) supersede interim v21 progress notes above. The initial lint failure, its reviewed fixes and earlier passing results remain preserved; overlapping test totals are not additive.

Final native interaction, restoration of the original seven-bani QA routine, physical-iPhone reading/selection/VoiceOver/display/interruptions and authorized signing remain open. The last native UI tool reported a locked Mac, and the owner availability questions remain unanswered. These are acceptance gates, not passes. The goal is active and no literal perfection, subscription value or full release acceptance is claimed.

Frozen fingerprint: `6910ddaa103a3c84198a017d9eb765189c902e9cb466dcd89ea610e6ad4e2400`; 612 product/build inputs and all 283 canonical web files verified across both native apps and ZIPs.

## Historical reopened check: short landscape at 200% text

The continuation audit found that earlier landscape evidence exercised Close and the font slider but did not cover every lower sheet control. A bounded production check at 844×390/200% reproduced a material artwork-gallery failure: the desktop footer action minimum starved the selected status into a narrow column, making the footer too tall; keyboard focus wrapping clipped the heading and Close. [Failure screenshot](../../artifacts/goal-quality-v21/landscape-200/failure.png).

The approved narrow correction preserves all enlarged labels and 44px targets, reflows the footer by actual available width and allows natural dialog scrolling at short heights. Independent review and the remaining landscape editor/reader journey are required before a new v22 freeze/build/package. V21 remains historical verified software evidence, not proof that this newly discovered state passed. Native access was rechecked and remains locked; no iPhone was discoverable and signing identities remain zero. [Availability audit](../../artifacts/goal-quality-v21/availability-audit-2/availability.json).

The same bounded short-height journey also reproduced a sticky editor footer covering Restore seven, an Add Bani list reduced to zero visible height, and programmatic focus wrapping to an off-screen Close control. The approved v22 corrections remain scoped to adaptive artwork/editor styles and local Add-sheet boundary visibility. Existing large-text labels, targets, draft behavior and shared modal focus policy are preserved; actual browser retests and independent review remain required.

The evidence audit also identified four feasible browser checks to complete before claiming only external blockers remain: an actual Read/search/result/Back origin chain; the unfinished 320px/200% dark excerpt/share dismissal chain; reload while a reader sheet is open with usable scroll and persisted place/preferences afterward; and bounded repeated tool use within one complete long Sukhmani context. These are being prepared and run sequentially to avoid resource pressure. Existing compatibility/migration evidence closes D5 within software scope; native interruptions and physical assistive-technology acceptance remain separate.

Independent review then confirmed a distinct reader-ending defect: at 844×390 and 200% interface text, the unconditional 15rem reader bottom reserve plus the ending margin creates about 544px of empty tail. At actual maximum scroll, the whole ending is above the viewport. Individual action reachability and manually positioning the final verse do not accept that composition. The approved correction removes only the excessive late override, restoring the existing safe-area-aware reader padding. Actual short/full-reading maximum-scroll and portrait checks must pass on the rebuilt production bundle before C8 closes.

## Final v22 software result; native and physical gates remain open

The [current handoff](../qa/experience-beta-handoff.md) supersedes the historical v21 current-candidate wording above. Final **699 distinct tests across 42 affected files**, full lint/types, the 14-file stylesheet audit, production/startup audit, Capacitor sync, both Release targets, CLI installation/launch without erasure and strict package verification passed. [Source validation](../../artifacts/goal-quality-v22/final-source-validation.json), [independent review](../../artifacts/goal-quality-v22/independent-review.json), [production binding](../../artifacts/goal-quality-v22/final-production-evidence-binding.json), [manifest](../../artifacts/beta-20261018-v22/build-manifest.json) and [integrity proof](../../artifacts/beta-20261018-v22/package-integrity-validation.json) bind the result to **612 inputs**, fingerprint `88c1dff5f8dec774e2116c3020a27db37b49a280ebb5b7269876a93479ae524c`, and **283 canonical web files**.

The v22 landscape fixes passed actual gallery/editor/Add focus checks. The distinct reader-tail defect is now closed by short/full 2,019-line actual maximum-scroll and portrait proof; completion/Undo stays explicit and settled Read again returns keyboard focus to MAIN. Expanded English/Punjabi cadence options and Cancel passed. [Ending/cadence proof](../../artifacts/goal-quality-v22/post-tail-fix/acceptance-summary.json). The earlier four reader chains retain their correctly labelled pre-tail-fix preview provenance; [requirement map](../../artifacts/reader-acceptance-v22/browser-closure/requirement-evidence-map.md). Browser automation and root-font proxies do not establish native accessibility, physical touch/frame comfort or a subscription price.

The supported native tool was rechecked and still reports a locked Mac; the latest device inventory discovered zero with an unavailable CoreDevice provider, and signing identities remain zero. [Runtime](../../artifacts/goal-quality-v22/runtime-results.json), [UI blocker](../../artifacts/goal-quality-v22/native-ui-blocker.md), [availability](../../artifacts/goal-quality-v22/availability/availability.json). The simulator is shut down after CLI launch. Native interaction, original seven-bani restoration, physical-iPhone reading/VoiceOver/selection/display/interruptions and authorized signing remain open. Existing owner questions are unanswered. The goal is active and is not marked achieved.

## External blocker audit: third consecutive goal turn

The preceding turn made concrete v22 software/delivery progress. This fresh continuation revalidated the supported native UI tool, physical-device discovery, signing inventory, unchanged source freeze/runtime and the remaining requirement evidence. The Mac still reports locked; no iPhone was discoverable while CoreDevice reported no provider, and there are zero valid signing identities. Hardware absence is not inferred. Independent read-only review found no additional concrete software/browser work to complete. [Fresh audit](../../artifacts/goal-quality-v22/blocked-audit-3/audit.json), [availability](../../artifacts/goal-quality-v22/blocked-audit-3/availability.json).

The same external condition has persisted across three consecutive goal turns. The goal is **blocked**, not complete. Native interaction, original seven-bani QA restoration/relaunch, physical reading/selection/VoiceOver/display/interruptions and owner-authorized signing remain required. Resume when native access/device availability changes. Existing owner questions remain pending; no repeated approval request or unlock bypass is implied. The frozen source, verified ZIPs and packaged runtime remain unchanged; their active-at-packaging status is historical.

## October 21: artwork ratios and Hukamnama composition

The owner resumed work and requested every Home background and its specific aspect ratio be checked, the existing NaamRas font retained, and Hukamnama placed slightly below the artwork. Brainstorming selected an editorial art area in normal document flow: preserve each complete original, let landscapes retain their native ratio, and present portraits in a square area capped at 400 CSS px. Give Hukamnama a modest 16–24px visual separation at ordinary interface size, with sufficient enlarged-text spacing. The wordmark retains Cormorant Garamond, its italic Ras and existing proportions. New imagery is authorized if useful; all fourteen originals and Eclipse remain available.

The audit confirmed real clipping in the floral teacher mural and lower medallion ring; approximate protected rectangles are insufficient to preserve these complete works. [All fifteen source ratios and crop audit](../../artifacts/home-artwork-20261021/ratio-audit.json). The new [screenshot-grounded Lazyweb improvement report](https://www.lazyweb.com/report/lazyweb/4b9852aa-50d1-4267-95d5-f02d2da5eefc/?source=create) was generated and opened for this composition; its free-preview notice was shared and is preserved in [report metadata](../../artifacts/home-artwork-20261021/lazyweb-report.json). It supports design review without substituting for actual app proof.

Acceptance for this workstream:

- [x] Inspect actual pixel dimensions and rendered fit of Eclipse and all fourteen original artworks at 320, 390 and 430px, plus wide layouts, in light and dark appearances. Retain complete borders, figures, inscriptions and medallion rings; preserve natural image proportions with no stretch or destructive source edit.
- [x] Put the art stage and Hukamnama in normal flow with a clear, modest gap and no scripture over important subjects. Maintain a deliberate stage size across portrait and landscape compositions, visible wordmark/controls and readable Hukamnama/source/date/actions.
- [x] Preserve the exact NaamRas font and brand treatment, subdued light/dark coherence, fixed/daily/visit artwork rules, Apply/Cancel, loading/error/fallback and existing user preferences.
- [x] Inspect narrow/enlarged and short-landscape layouts; no horizontal overflow, clipped essential controls, or overlap. Review actual screenshots and all-art geometry rather than trusting source aspect metadata alone.
- [x] Run meaningful affected tests, lint/types and production/startup checks; obtain independent review and update current source/build evidence without altering frozen v22 history. Build a new candidate if source changes.
- [x] Show the resulting composition and share the hosted design review when available; record remaining native/physical checks honestly.

The earlier blocker audits and immutable v22 runtime remain historical. This user-authorized refinement is new available software work; physical iPhone/signing is deferred while available work proceeds.

The October 21 refinement passed 706 tests across 42 files, static checks, 140-artwork browser scenes and 32 production scenes (six accessibility scans, 0 violations). Both Release targets and strict package gates passed with the original 612-input freeze. Actual native Home/artwork/appearance/Hukamnama opening and cold artwork/theme persistence now have scoped proof. [Current handoff](../qa/experience-beta-handoff.md), [independent review](../../artifacts/goal-quality-v23/independent-review.md), [light/dark composition](../../artifacts/goal-quality-v23/final-home/home-light-dark-comparison.png).

Parallel story files appeared in the shared checkout after the build. The exact tested source was preserved and verified in a separate legitimate checkout; no freeze refresh, source-policy exclusion or removal of concurrent work was used. [Isolation proof](../../artifacts/goal-quality-v23/source-isolation.json). Native scroll/selection automation remains unreliable; a toolbar/status-area observation needs hands-on reproduction, as do exact Rehras variants, routine restoration and interruption chains. Physical iPhone, VoiceOver/extended reading and signing remain open. This validates the scoped refinement and does not complete the broad goal.
