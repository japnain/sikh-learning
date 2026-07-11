# NaamRas Release Device Sign-off

Use this checklist on the final signed native build. Recitation and audio-file behavior are outside this pass.

## Prerequisites

- Connect and trust a physical iPhone supported by the deployment target.
- Install the iOS simulator runtime requested by Xcode and create current iPhone and iPad simulators.
- Configure production-like Supabase values plus verified public Support and Privacy HTTPS URLs.
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
- Check portrait on iPhone and portrait/landscape on iPad for clipping, overlap, horizontal scrolling, and obscured controls.
- Background and foreground the app from Home, Reader, Saved, and an open modal. Focus and reading position must return predictably.
- Relaunch offline after previously opening a reading; local bookmarks, preferences, and progress must remain intact.

## App Store Screenshots

- Use only the final release candidate and the device sizes requested by App Store Connect.
- Capture onboarding, Home, Read, Reader, Saved, and More in Light and Dark appearance where each view materially differs.
- Use realistic local state without private account information, debug UI, loading indicators, clipped text, or temporary content.
- Confirm every screenshot reflects the shipped icon, name, public links, product claims, and source behavior.

## Evidence

For each failed item record the screen, exact steps, expected result, actual result, screenshot or video path, severity, owner, and retest result. Submission is not signed off while any crash, inaccessible core action, data-loss issue, placeholder claim, or visual overlap remains open.
