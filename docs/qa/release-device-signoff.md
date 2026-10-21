# NaamRas Release Device Sign-off

> Evidence note: `artifacts/` links and localhost previews in this document refer to preserved local QA records, which are excluded from Git. Historical build results apply only to their named snapshots; the current session-only push scope is recorded in [pre-push readiness](session-prepush-readiness.md).

**Scope correction — October 21, 2026.** The owner confirmed that NaamRas is a web app added to the Home Screen. This native-wrapper checklist is retained for historical reference; it is not a requirement or blocker for the current goal. Current v25 PWA acceptance and web delivery are recorded in [PWA Home/reader acceptance](pwa-home-reader-acceptance.md). No native device or signing item is being relabeled as tested.

## Preserved native-wrapper checklist

Current candidate: **v23, October 21, 2026**. Software/package checks and scoped native Home/artwork/reader/Appearance checks passed. Hands-on native gestures/safe areas, Rehras/routine restoration, physical iPhone acceptance and signing remain open. See the [current beta handoff](experience-beta-handoff.md) and [completion goal](../design/world-class-completion-goal.md). No item below is implicitly signed off by compilation, package integrity or browser scans.

Use this checklist on the final signed Capacitor `App` build. Recitation and audio-file behavior are outside this pass.

## Prerequisites

- Connect and trust a physical iPhone supported by the deployment target.
- Install the iOS simulator runtime requested by Xcode and create a current iPhone simulator.
- Use the committed local-first production configuration plus the verified public Support and Privacy HTTPS URLs. Do not enable Supabase or diagnostics for 1.0 without repeating privacy and account-deletion sign-off.
- Decide whether diagnostics are enabled. If enabled, verify the endpoint stores only the documented allow-listed payload.
- Start from a clean install and retain a second install with representative bookmarks, progress, and vocabulary.

## Physical VoiceOver

Record device model, iOS version, build number, tester, and date with the results.

- Complete first-run onboarding without sighted assistance; every control announces its role, label, value, and selected state.
- Move through Home in reading order. Brand, date, Hukamnama, primary action, Daily Nitnem, and Saved return points must be coherent without duplicate decorative announcements.
- Traverse all four bottom tabs. The active tab must announce its selected state and focus must land on the new page heading.
- Use Read Quick Find, refine search, open a result, and return. Search instructions, results, empty states, and loading states must be announced once.
- Read a Gurbani line, open its word/meaning action, dismiss the modal, and continue from the invoking line.
- Change script, transliteration, meaning, font size, spacing, and alignment. Updated values must be announced without moving focus unexpectedly.
- Add and remove a bookmark or saved item, then confirm Saved communicates the resulting state.
- Open More, change appearance and language, expand Reader Defaults, and inspect Privacy. Disclosure state and external-link behavior must be explicit.
- Trigger offline/degraded states for scripture lookup and optional backup. Recovery actions must remain reachable and accurately named.

## Display And Resume

- Test default, largest accessibility Dynamic Type, Bold Text, Increase Contrast, Reduce Motion, and Light/Dark appearance.
- Check portrait and landscape on iPhone for clipping, overlap, horizontal scrolling, and obscured controls.
- Background and foreground the app from Home, Reader, Saved, and an open modal. Focus and reading position must return predictably.
- Open Panth Prakash Episode 1, repeatedly drag and fling through the first screen and back to the exact top, then open and close Contents and Display. `document.scrollingElement` must remain the sole primary vertical scroller, with no viewport-sized `overflow-y: auto` route container, top-edge hitch, rubber-band handoff, jump, or lost position; Back and Forward must restore the prior document position.
- Add the production site to the iPhone Home Screen, cold-launch it, and compare Home with a regular Safari tab. Record `screen.height`, `innerHeight`, `documentElement.clientHeight`, `data-ios-standalone-viewport`, the measured viewport-loss variable, and the nav rectangle. On affected iOS versions the dock must end within 7 CSS px of WebKit's drawable viewport bottom and must not retain a second 34px safe-area lift.
- Relaunch offline after previously opening a reading; local bookmarks, preferences, and progress must remain intact.

## App Store Screenshots

- Use only the final release candidate and the device sizes requested by App Store Connect.
- Capture onboarding, Home, Read, Reader, Saved, and More in Light and Dark appearance where each view materially differs.
- Use realistic local state without private account information, debug UI, loading indicators, clipped text, or temporary content.
- Confirm every screenshot reflects the shipped icon, name, public links, product claims, and source behavior.

## Evidence

For each failed item record the screen, exact steps, expected result, actual result, screenshot or video path, severity, owner, and retest result. Submission is not signed off while any crash, inaccessible core action, data-loss issue, placeholder claim, or visual overlap remains open.

## Preserved goal candidate: v21

October 18, 2026: final 651/41 affected regression, full lint/types, stylesheet/startup audits, Capacitor sync, both Release builds, CLI installation/launch without data erasure and strict archive integrity passed. See the [current handoff](experience-beta-handoff.md). Native UI awaits owner Mac unlock. The isolated QA simulator retains the temporary Rehras Medium + Kirtan Sohila Short routine; the original seven must be restored through UI and verified after relaunch.

No physical iPhone was discoverable in the preceding inventory (CoreDevice provider unavailable), and there were zero valid signing identities. Physical 30-minute reading, VoiceOver, wrapped selection, display/lock/offline journeys and authorized signing remain required. This is not device sign-off.

## Historical goal candidate: v22

October 18, 2026: final **699 distinct tests across 42 affected files**, full lint/types, 14-file stylesheet audit, production/startup audit, Capacitor sync, both Release targets, CLI installation/launch without erasure and strict archive integrity passed. [Source validation](../../artifacts/goal-quality-v22/final-source-validation.json), [current handoff](experience-beta-handoff.md). V21 observations above remain historical.

Actual native interaction still awaits Mac unlock. The isolated QA simulator is shut down; its last observed routine is Rehras Medium + Kirtan Sohila Short, with original seven restoration/relaunch verification pending. Latest inventory discovered zero physical devices while CoreDevice reported no provider, so hardware absence is not established. There are zero valid signing identities. Physical 30-minute reading, native VoiceOver, wrapped selection, display/accessibility/lock/offline journeys and authorized signing remain required. No item in this checklist is signed off by software/package checks.

Historical v22 goal status: **blocked on native/device access**, following the [third consecutive audit](../../artifacts/goal-quality-v22/blocked-audit-3/audit.json). Software delivery is preserved, and no physical/native checklist item is newly accepted.

## October 21 v23 candidate

Use the [v23 handoff](experience-beta-handoff.md) and [actual runtime ledger](../../artifacts/goal-quality-v23/runtime-results.json). Current software/package and scoped simulator results do not close any physical checklist item above. Native scrolling/selection and the partially scrolled toolbar/status-area observation require hands-on reproduction; exact Rehras variants/places, original seven-bani restoration and interruptions are still queued. Current discovery completed with zero devices and zero valid signing identities; hardware absence is not inferred. The archive remains unsigned and undistributed.
