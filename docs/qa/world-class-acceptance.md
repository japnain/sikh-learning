# Home, Nitnem and reader acceptance

> Evidence note: `artifacts/` links and localhost previews in this document refer to preserved local QA records, which are excluded from Git. Historical build results apply only to their named snapshots; the current session-only push scope is recorded in [pre-push readiness](session-prepush-readiness.md).

**Latest extension — v28:** the owner-rejected navigation icons were replaced substantially; implementation and affected PWA checks passed. [Current navigation evidence](artwork-navigation-acceptance.md). Owner aesthetic approval is not implied by software checks or the preserved prior records below.

**Current acceptance — October 21, 2026: v25 PWA passed the owner-confirmed web-app scope.** See the [current PWA evidence and delivery](pwa-home-reader-acceptance.md). Native wrappers, Apple signing and mandatory physical-device sessions are outside this goal. All native-blocked status and candidate totals below are preserved historical records, not current blockers or final PWA claims.

## Historical acceptance chronology

Current update — October 21: v23 supersedes the historical candidate status below. The full-art Home composition, 140-scene ratio matrix, 706 regression tests, production checks, both Release targets and scoped native UI have current evidence in the [v23 handoff](experience-beta-handoff.md). The exact tested source is isolated from concurrent story work. Hands-on native gestures/safe areas, physical-device acceptance and signing remain open. Earlier rows keep their actual build/scope labels.

Preserved cycle: October 17–18, 2026. Master requirement: [completion goal](../design/world-class-completion-goal.md). Status: **blocked on native/device access; v22 software/package checks passed; native/physical acceptance remains open**. This is an evidence index, not release approval or a claim of literal perfection.

## Product result and scope

Home uses the approved prominent Eclipse or one of fourteen original artworks, a dated Hukamnama, one focused daily reading, direct upcoming readings, the complete custom order, explicit completion/Undo, real weekly history and Saved return points. Warm-stone light and midnight dark share the same composition and controls. The former carousel has been replaced by this deliberate daily sequence.

Daily Nitnem supports the existing canonical choices and Savaiye variants, supported lengths, order, tracking and weekly goal. Changes remain drafts until Save. The editor and artwork gallery share readable controls and reachable actions. Artwork can stay fixed, change daily or rotate on each visit without changing while the user remains on Home.

Read is quiet and scripture-led. Study exposes supporting languages, transliteration, word exploration, saved verses and sharing. Deep controls, Contents, explicit endings and independent exact reading places support complete long readings. Canonical scripture, punctuation and source order remain unchanged; unverified provenance is labelled truthfully.

The goal includes physical reading comfort and assistive technology. Browser scans, source review and simulator compilation cannot close those requirements.

## Historical v20–v22 evidence

| Area | Evidence and limits |
| --- | --- |
| Home, editor and artwork | [Scoped acceptance index](home-world-class-acceptance.md), [browser summary](../../artifacts/home-release-acceptance-20261018/acceptance-summary.json), [loaded light](../../artifacts/home-release-acceptance-20261018/loaded-light-partial-saved-full.png), [loaded dark](../../artifacts/home-release-acceptance-20261018/loaded-dark-partial-saved-full.png). All fifteen artwork Apply/reload choices, fourteen-original visit rotation, daily rollover, actual Back/reload draft recovery and en/pa/hi enlarged layouts were exercised in isolated browser contexts. Scripture fixtures in screenshots are controlled QA content, not a representation of today's live Hukamnama. |
| Independent visual/accessibility review | [Review](../../artifacts/premium-acceptance-a11y/acceptance-review.md), [100 baseline states](../../artifacts/premium-acceptance-a11y/matrix.json), [final bounded checks](../../artifacts/premium-acceptance-a11y/final-bounded.json). Includes 320/390/430/1440px, light/dark, 200% interface text, 40 exact dialog focus returns, keyboard controls and selected localized word flows. Actual VoiceOver and native text handles remain separate. |
| Complete long reading | [Sukhmani record](../../artifacts/reader-acceptance-v20/idle-reader-browser.json): 2,019 ordered lines, 35 sections, deep pagehide/place/reopen, enlarged Study and unchanged canonical fingerprint. Those initial viewport-after-load offsets were superseded by a clean [frozen-production cold test](../../artifacts/reader-acceptance-v20/cold-production/validation.json): viewport fixed before navigation, no prior reading cache, all 2,019 lines, verse 6208 at 76.2px through first entry/reload/Saved reopen; actual reading saved 6215 and reopened at 76.3px. Different hash serializations across the records must not be equated. Browser roundtrip timings are not INP, frame-rate or physical comfort measurements; heap data was unavailable. |
| Canonical source and lengths | [Eight live-payload comparisons](../../artifacts/native-beta-v12/source-normalization-validation.json) retain provider verse IDs/text/header order. Previous Rehras order/provenance and cached-to-fresh exact-resume repairs remain covered by affected tests. Full current native alternate-length/order journeys remain in the live runtime ledger. |
| Historical native observations | [Goal runtime ledger](../../artifacts/goal-quality-v22/runtime-results.json). V22 installed/launched without erasing existing data; final UI acceptance is blocked by the locked Mac. Earlier passed Chaupai observations explicitly belong to v19. [Earlier exact warm/cold resume evidence](../../artifacts/native-beta-v18/runtime-results.json) remains historical support, not proof of untested current native changes. |
| Goal/reference review | [Screenshot-grounded hosted preview](https://www.lazyweb.com/report/lazyweb/899ccd2e-6122-4d04-96ed-ccfd39c46dd7/?source=create), generated and opened under the required Lazyweb workflow. The provider returned a free preview; no paid upgrade was purchased. The master goal preserves the provider's notice. |

## Concrete findings closed in this cycle

These are implementation fixes with failure evidence and scoped retests. Final integrated/native results below determine the candidate status.

- An explicit Apply of the same recovered artwork now retries its failed image without advancing rotation or creating an automatic retry loop.
- A bounded tab-session draft restores unsaved routine edits through browser Back/Forward/reload. Validation binds it to the unchanged committed baseline and supported canonical choices; memory-only recovery is labelled honestly when session storage fails. This does not promise unsaved draft survival after OS process eviction or app termination.
- Cached Hukamnama becomes visible immediately with its actual date; local midnight requests the new day. A stalled request aborts after 15 seconds and exposes Retry while retaining valid canonical cached content. Malformed cache data is rejected rather than rendered as scripture.
- The enlarged font-size range remains usable at 320px/200%; the maximum-size text preview receives keyboard focus, scrolls and has a visible focus ring.
- Word details prefer the chosen meaning language, identify actual English fallback and tag the rendered language correctly. Selected Punjabi script is respected; unavailable study support does not conceal separate dictionary material.
- Word and verse saves distinguish useful session memory from actual device persistence. A failed save remains retryable after reopening; successful retries preserve original context/review and avoid duplicate entries.
- Automatic position/progress writes cannot interrupt canonical reading when storage is full or restricted. Global and exact-reading places are attempted independently; their existing persisted envelopes and migrations remain compatible. The quiet notice/guarded Retry passed at 390 light and 320px/200% dark without losing the verse or unmounting scripture; all-write failure also covers optional cache/history writes. The preserved v20 600-case union passed afterward; the superseding v21 result is recorded below.
- Leaving during an unsettled touch/scroll now flushes the existing guarded visible verse on Back, pagehide and hidden visibility. Pending incoming resumes remain protected from cached opening-content writes.
- Exact reading requests settle after 30 seconds, retaining valid cached canonical content and exposing live-copy Retry. [Actual bounded reader checks](../../artifacts/reader-acceptance-v20/browser-recovery-validation.json) retained the same 15 rendered canonical excerpt IDs/text; the controlled excerpt does not establish complete-bani offline acceptance. Offline preparation aborts only the stalled download, proceeds to later selected banis and exposes Retry. [Actual partial/retry check](../../artifacts/home-release-acceptance-20261018/offline-preparation-browser.json) reached 3/3 ready only after exact cache read-back.

## Preserved v20 candidate checks

The preserved v20 frozen-source regression passed **600 distinct tests across 37 affected files**. Full source lint, TypeScript, the 14-file stylesheet audit, production/startup audit and Capacitor sync passed. [Source validation](../../artifacts/goal-quality-v20/final-source-validation.json), [full test report](../../artifacts/goal-quality-v20/final-regression-results.json) and [prebuild freeze](../../artifacts/beta-20261018-v20/source-freeze.json) record the evidence; 612 product/build inputs are bound to fingerprint `53d3b5d66da737f7b8ce7088a66f1fc6e1c23ca0ba47ca9db8e1557b2f4d7776`. Earlier overlapping totals are not additive. Both v20 Release targets, CLI installation/launch and strict [archive verification](../../artifacts/beta-20261018-v20/package-integrity-validation.json) passed. All 283 canonical web files match both native apps and both ZIPs, with source freeze and runtime-ledger hashes bound. Final native UI testing is blocked by the locked Mac. Existing v19 ZIPs in `artifacts/beta-20261017/` precede the current source corrections and must not be presented as the final goal candidate.

## Acceptance still required

- V22 installation/launch is complete without erasing representative data. Unlock the Mac for actual final native retests, restore the temporary QA routine and verify relaunch persistence.
- Finish feasible native alternate-length, exact-place, sheet, artwork, completion and interruption journeys, recording tooling limitations separately from product defects.
- Complete a supported physical-iPhone session of at least 30 minutes, wrapped-text selection-handle extension, actual VoiceOver journeys, display/accessibility settings, reliable touch/scroll, lock/offline/reconnection and cold-relaunch acceptance.
- Obtain an available trusted iPhone and the owner's authorized Apple signing setup for a signed install. The last inventory could not discover a physical iPhone (CoreDevice provider unavailable) and found zero valid signing identities. A device/setup question is already pending; no signing, account or distribution authorization is inferred.

The [physical release checklist](release-device-signoff.md) and [beta handoff](experience-beta-handoff.md) remain open. No upload, TestFlight distribution, release certification or subscription-price validation has occurred.

All 15 artworks in both themes have a [per-art visual acceptance record](../../artifacts/home-release-acceptance-20261018/artwork-visual-390/visual-acceptance.json), thirty actual loaded 390px screenshots and independent dark review. No material crop, central subject/text loss, overlap or nearby-control legibility defect was found within that scope. Native/physical display acceptance remains separate.

## Superseding v21 recovery corrections

V20 remains a preserved, verified historical candidate. Ang/Shabad and optional-word lifecycle failures were closed for v21; the v20 freeze remains historical. API cancellation forwarding reproduced three failures before its narrow fix and now passes all 39 API cases. Hook deadlines, late-result protection, retained canonical text and independent optional-cache handling passed final independent review. The final v21 freeze, affected regression, both Release builds and package integrity are recorded below. Native UI remains pending Mac unlock; physical-iPhone and signing availability remain unanswered.

The v21 source-integrity review also confirmed that Bani/exact-shabad progress could seed or append a fragment into the whole-Ang cache. The additive correction separates recent Study entries from verified full pages, bounds both stores and retains legacy entry lookup. Legacy unmarked page arrays are preserved but require successful live refresh before full-page display; they cannot establish a complete offline Ang. A separate red integration case confirms pagehide must save the visible verse while retained scripture is being refreshed.

## Historical v21 software and package result

**651 tests across 41 affected files passed** after final source changes. Full lint/types, the 14-file stylesheet audit, production/startup audit, Capacitor sync, both Release targets, CLI installation/launch and strict package integrity passed. [Source validation](../../artifacts/goal-quality-v21/final-source-validation.json), [independent review](../../artifacts/goal-quality-v21/independent-review.json), [production recovery](../../artifacts/reader-acceptance-v21/primary-browser/validation.json), [manifest](../../artifacts/beta-20261018-v21/build-manifest.json) and [integrity proof](../../artifacts/beta-20261018-v21/package-integrity-validation.json) bind the candidate. All 283 canonical web files match both native bundles and ZIPs. Earlier test counts overlap and are not added.

The final production browser recovered the full 23-line/three-shabad Ang from an intentionally partial legacy seed, verified exact provider text/order, aborted a stalled shabad after 30.007 seconds, recovered eight lines through Retry, canceled a request through actual Back and retained the complete Ang offline. Four viewport images and provenance are beside the validation record. This is browser evidence, with its explicit limitations.

The current runtime retains the temporary two-bani QA state and exact remaining native checks. The preceding Mac-lock tool observation is preserved under its actual build; v21 CLI installation is not relabelled as native interaction. Physical comfort, VoiceOver, wrapped selection, display/lock/offline journeys and owner signing remain required. The goal remains active.

Historical v21 612-input source fingerprint: `6910ddaa103a3c84198a017d9eb765189c902e9cb466dcd89ea610e6ad4e2400`.

## Historical continuation: landscape correction for v22

An evidence audit identified a feasible missing lower-control check at short landscape height/200% interface text. The actual production gallery failed: its selected-status column collapsed beside the 19rem action row, footer height crowded out the body and focus wrapping clipped Close. [Failure image](../../artifacts/goal-quality-v21/landscape-200/failure.png). The approved fix and independent review are in progress; final software/package gates reopen for v22. Current native availability remains blocked, documented separately in the [fresh availability audit](../../artifacts/goal-quality-v21/availability-audit-2/availability.json). No frozen v21 source/package/runtime record was changed.

## Historical v22 result

The four-file v22 correction closes enlarged landscape gallery/editor/Add layout/focus defects and the excessive reader tail. Final **699/42** regression, full lint/types, 14-file CSS audit, production/startup, sync, both Release builds, CLI install/launch and strict archive verification passed on fingerprint `88c1dff5f8dec774e2116c3020a27db37b49a280ebb5b7269876a93479ae524c` (**612 inputs / 283 canonical web files**). [Final validation](../../artifacts/goal-quality-v22/final-source-validation.json), [independent review](../../artifacts/goal-quality-v22/independent-review.json), [manifest](../../artifacts/beta-20261018-v22/build-manifest.json), [integrity proof](../../artifacts/beta-20261018-v22/package-integrity-validation.json). Earlier v20/v21 counts and candidate wording above are historical; overlapping totals are not added.

[Post-tail proof](../../artifacts/goal-quality-v22/post-tail-fix/acceptance-summary.json) closes the reproduced blank true-bottom state for short/full 2,019-line readings and normal portrait, plus expanded English/Punjabi artwork cadence. [Four reader chains](../../artifacts/reader-acceptance-v22/browser-closure/validation.json) and their [requirement map](../../artifacts/reader-acceptance-v22/browser-closure/requirement-evidence-map.md) cover remote/local search, 320px/200% dark excerpt dismissal, open-sheet document reloads and five warmed full-reader tool cycles. Those chains retain pre-tail-fix provenance; [final production binding](../../artifacts/goal-quality-v22/final-production-evidence-binding.json) records the exact final index match for post-tail scenes. Native UI, process/lock interruptions, actual VoiceOver/handles/physical comfort and signing remain unverified.

The [current runtime](../../artifacts/goal-quality-v22/runtime-results.json) is byte-identical to its packaged copy. Fresh [native UI](../../artifacts/goal-quality-v22/native-ui-blocker.md) and [availability](../../artifacts/goal-quality-v22/availability/availability.json) observations retain the locked Mac, zero discoverable devices with provider unavailable and zero signing identities. Hardware absence is not inferred. The [current handoff](experience-beta-handoff.md) lists exact remaining journeys and last observed temporary QA routine. The goal remains active.

## Historical v22 blocker status

The [third-turn audit](../../artifacts/goal-quality-v22/blocked-audit-3/audit.json) freshly confirms the same external native/device/signing condition and no additional concrete software/browser work. The goal is blocked, not achieved. Prior active-at-delivery wording and immutable runtime/package evidence remain historical; all native/physical acceptance gates stay open.
