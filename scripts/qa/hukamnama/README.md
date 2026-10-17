# Hukamnama native sharing QA

This harness imports the current production composer, renderer, styles, fonts,
and 14 original artworks. It adds no production app route or dependency. Its
three state-selected fixtures use the exact ordered Ang 683 reading from
`renderer.test.ts`: 3 Gurmukhi lines (short excerpt), 7 paired lines (medium
excerpt), and the complete 13 paired lines (long). The dated sample is a fixture,
not a claim about today's Hukamnama.

The fixture labels identify excerpts without setting the production
`selectedExcerpt` single-line mode, which would suppress the medium fixture's
meaning layer. Browser checks may use `window.hukamnamaQA.assetIds`,
`fixture(kind)`, and `renderCase({ kind, artworkId, lines })`. `renderCase` returns
the production PNG as base64 plus layout, dimensions, and ordered source IDs;
`artworkId: null` selects plain. Optional `lines`
must be verified text/translation pairs supplied by the check, and allow real
Punjabi or Hindi font checks without modifying the production composer.
`renderTypographySample({ script: 'pa' | 'hi' })` renders explicitly labelled
non-scripture words through the same production exporter and reports its bundled
font loading state. These samples are never presented as Gurbani translations.

The labelled `Interface language` select switches the actual composer's English,
Punjabi, or Hindi interface copy. It defaults to English for the native XCTest
cases. Language and length controls are disabled while the composer is open;
close it before changing either. Interface selection does not fabricate or
replace the fixture's verified English meaning text. Browser checks can select
the control by its accessible name to inspect narrow and enlarged text layouts.
Length selectors are plain action buttons with explicit accessible names; the
live selection text announces the current length. This keeps those fixture
controls queryable in the iOS WebKit accessibility tree used by XCTest.

Use an isolated copy of `ios/`, with its existing Capacitor App target, native
sharing plugin registration, and resolved Swift package dependencies intact.
Never output into this repository's `ios/App/App/public`. A clean runtime must
contain this repository's locked npm dependencies (`npm ci` in that runtime).
The build resolves packages there even when importing production source files.
Although the fixture excludes the large production public directory, it copies
the new Hindi font's public license notice into the isolated app's `licenses/`
folder. The production public-copy step includes that same notice normally.

From the repository root, replace the example temporary paths with the exact
validated paths for your run:

```sh
node scripts/qa/hukamnama/build.mjs --runtime /private/tmp/hukamnama-oct16.4UOC2J --out /private/tmp/hukamnama-native-qa/ios/App/App/public
ruby scripts/qa/hukamnama/setup-native-tests.rb /private/tmp/hukamnama-native-qa/ios/App/App.xcodeproj
xcodebuild build-for-testing -quiet -project /private/tmp/hukamnama-native-qa/ios/App/App.xcodeproj -scheme HukamnamaShareUITests -configuration Debug -destination 'platform=iOS Simulator,id=09C9718C-11B7-49DA-906A-F54F82C3CA40' -derivedDataPath /private/tmp/hukamnama-native-qa/build CODE_SIGNING_ALLOWED=NO
xcrun simctl bootstatus 09C9718C-11B7-49DA-906A-F54F82C3CA40 -b
xcrun simctl install 09C9718C-11B7-49DA-906A-F54F82C3CA40 /private/tmp/hukamnama-native-qa/build/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl privacy 09C9718C-11B7-49DA-906A-F54F82C3CA40 grant photos-add com.naamras.shareqa
xcodebuild test-without-building -quiet -project /private/tmp/hukamnama-native-qa/ios/App/App.xcodeproj -scheme HukamnamaShareUITests -configuration Debug -destination 'platform=iOS Simulator,id=09C9718C-11B7-49DA-906A-F54F82C3CA40' -derivedDataPath /private/tmp/hukamnama-native-qa/build -resultBundlePath /private/tmp/hukamnama-native-qa/length-results.xcresult -skip-testing:HukamnamaShareUITests/NativeShareUITests/testPhotosPermissionDeniedAndSharingRecovery CODE_SIGNING_ALLOWED=NO
xcrun simctl bootstatus 09C9718C-11B7-49DA-906A-F54F82C3CA40 -b
xcrun simctl privacy 09C9718C-11B7-49DA-906A-F54F82C3CA40 revoke photos-add com.naamras.shareqa
xcodebuild test-without-building -quiet -project /private/tmp/hukamnama-native-qa/ios/App/App.xcodeproj -scheme HukamnamaShareUITests -configuration Debug -destination 'platform=iOS Simulator,id=09C9718C-11B7-49DA-906A-F54F82C3CA40' -derivedDataPath /private/tmp/hukamnama-native-qa/build -resultBundlePath /private/tmp/hukamnama-native-qa/denied-results.xcresult -only-testing:HukamnamaShareUITests/NativeShareUITests/testPhotosPermissionDeniedAndSharingRecovery CODE_SIGNING_ALLOWED=NO
```

The explicit install makes the simulator know `com.naamras.shareqa` before
changing its Photos permission. Never reuse an existing result-bundle path;
Xcode requires a new path per run. `setup-native-tests.rb`
requires the Ruby `xcodeproj` gem, runs once per isolated copy, and changes only
that copy. It gives the app `com.naamras.shareqa`, creates a UI test target with
`PRODUCT_NAME=$(TARGET_NAME)`, and leaves production project files untouched.

Each case first proves its requested kind and exact line count in the fixture
selection, then checks the production composer's rendered line coverage. A
fixture-button tap alone is not accepted as proof that the selection changed;
one bounded real re-tap is allowed before the mandatory selection assertion.
Each length case then waits for the production PNG to decode and paint, opens the
real iOS activity sheet (verified by its native `Copy` cell), dismisses using
the system's observed `PopoverDismissRegion`, verifies that the popover closes,
then checks the cancellation status and action recovery,
then saves through the production Photos bridge and checks its success status.
The denied case checks the actual permission error and native share recovery.
All screenshots are retained in the `.xcresult`, including passing cases.
The dismissal point is checked against the actual popover bounds. A single
bounded second tap handles a system-presentation tap being swallowed; it never
synthesizes a cancellation callback or bypasses the production bridge. Re-check
the native dismissal element before adapting the test to another device.

Preserve and validate the exact intended native suite in a **new** evidence
directory. The third argument is required: `lengths` expects all three length
cases, `permission-denied` expects the denied-permission recovery case, and
`short` validates only the focused short-reading diagnostic. A short-only result
cannot be passed off as the complete length suite.

```sh
node scripts/qa/hukamnama/native-evidence.mjs /absolute/length-results.xcresult /absolute/fresh-evidence/native-lengths lengths
node scripts/qa/hukamnama/native-evidence.mjs /absolute/denied-results.xcresult /absolute/fresh-evidence/native-permission-denied permission-denied
node --test scripts/qa/hukamnama/qa-utils.test.mjs scripts/qa/hukamnama/native-result.test.mjs
```

This writes raw summaries, test identities, and screenshots, and creates a
verified-suite record only when the exact requested cases all pass. Failed or
incomplete runs remain distinguishable from validated evidence.

## Browser checks

Serve the same isolated built fixture and verify all 45 length/background combinations, one decoded PNG per export, complete ordered IDs, and actual Punjabi/Hindi font samples:

```sh
node scripts/qa/hukamnama/browser-check.mjs --runtime /absolute/locked-runtime --app /isolated/ios/App/App/public --out /absolute/evidence/chromium --ui-all true
PLAYWRIGHT_BROWSERS_PATH=/absolute/browser-runtimes node scripts/qa/hukamnama/browser-check.mjs --runtime /absolute/locked-runtime --app /isolated/ios/App/App/public --out /absolute/evidence/webkit --engine webkit --ui-all true
```

`--ui-all true` adds 36 composer checks: three reading lengths × three interface languages × desktop light, phone light, phone dark, and 320-pixel 200% text. Checks include accessibility, horizontal overflow, readiness, 15 artwork choices, Escape, and focus return. `--ui-only true` runs those journeys without repeating export/font checks. The default Chromium executable is Brave on macOS; pass `--executable /absolute/browser` to select another Chromium build. Safari-engine checks require the matching Playwright WebKit runtime.

The runner writes a JSON report with explicit pass/fail status, keeps representative Interior audience PNGs and clearly labelled non-scripture typography samples, and decodes all other exports without retaining duplicate PNGs. Use `--keep all` when a full image archive is required and disk space permits.

All flags require explicit values. Boolean flags accept only `true` or `false`;
`--ui-only false` still runs exports and font checks. Reports record the chosen
suite and expected counts, then require those exact counts before passing.
Evidence output must be a fresh folder, separate from input bundles (including
symlink aliases); existing evidence is never silently merged or overwritten.

## Longer-layout stress checks

```sh
node scripts/qa/hukamnama/stress-check.mjs --runtime /absolute/locked-runtime --app /isolated/ios/App/App/public --out /absolute/fresh-evidence/stress
```

This Chromium-only suite deliberately repeats the exact verified fixture lines
with unique test IDs: 30 and 40 bilingual lines, plus 40 Gurmukhi-only lines, each
with the 14 original artworks and No art. These are labelled layout stress
fixtures, **not additional real Hukamnamas**. It encodes and decodes 45 single
PNGs, checks ordered IDs, every normalized text section, actual measured widths,
reading bounds, and font floors, then verifies that 300 lines reject without
encoding a partial image. It retains only `stress-report.json`, not images of
the repeated-text fixtures. This establishes longer-layout behavior within the
8192-pixel image bound, not universal support for every possible reading length.

These tests do not establish physical-device behavior, destination-app crop or
compression behavior, artwork permissions, or App Store release approval.
