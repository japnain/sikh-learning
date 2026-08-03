# NaamRas Release Device Sign-off

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
