# Hukamnama sharing — 16 October verification

Historical record: subsequent explicit user approval authorizes committing and pushing these scoped changes to master. [17 October pre-push verification](2026-10-17-hukamnama-master-handoff.md) supersedes the push-approval gate, records the Capacitor security patch, and keeps the physical-device, recipient-app, language, and artwork gates open.

Date: 2026-10-16, America/Toronto. Changes remain local. No commit, push, publication, or deployment was performed. Local master and origin/master references remain `a044628dc31378724e563a75bb6a2fc78a093b3f`.

## Changes in this follow-up

- Closing the composer, changing its content, or changing its language cancels pending native image encoding and invalidates old action results. An earlier action cannot announce success for the new reading.
- Cancellation extends into Swift file preparation and pending Photos authorization through a per-request identifier. Late preparation/authorization callbacks cannot present an activity sheet or commit a save. Presented system sheets and Photos writes already committed to the OS keep their normal completion.
- Native cancellation remains compatible with an older bridge missing the optional cancel method. Browser Web Share still begins synchronously from the user interaction, and an open native sheet has no artificial timeout.
- An exceptionally tall reading gets specific English/Punjabi/Hindi recovery instructions: turn off the optional support layer, or copy the complete text. Ineffective artwork/retry recovery is suppressed for that height error. The 8192-pixel bound still rejects excessive content without silently truncating Gurbani.
- Photos Settings guidance appears only for a real `PHOTO_PERMISSION` error. Other save failures offer retry or Share recovery without diagnosing a permission problem.
- Hindi text uses a bundled, unmodified Noto Sans Devanagari subset. Export waits for it before measurement/drawing. Existing Gurmukhi and Latin type remain first in their own scripts; metadata and composer controls explicitly include both script fallbacks. Font source, fingerprint, and OFL license are recorded in `src/assets/fonts/`.
- A durable native/browser QA harness now lives in `scripts/qa/hukamnama/`; it imports the production composer, renderer, bundled fonts, and artwork catalog. Verification no longer depends on lost temporary fixture scripts.
- QA evidence refuses reused folders and overlapping input/output paths, including symlink aliases. Browser flags parse explicit booleans and require the selected suite's exact counts; native evidence validates the exact requested Hukamnama test identities, not only an overall green result. Ten Node-based harness regression checks pass.

## Product contract retained

All 14 existing backgrounds remain available, plus No art; their original files were not replaced or edited. The Hukamnama stays over recognisable artwork, with the existing protected placement, art-specific reading veil, and softened edges. First use selects Interior audience and saved choices remain respected.

There is one complete PNG per reading, 1080 pixels wide, with type reduced to its existing readable floor before the image grows taller. No QR, printed URL, promotional footer, page counter, or extra hero artwork was introduced. The preview keeps the actual output shape and delivery waits for the latest decoded image.

## Passing automated and browser checks

- 324 tests across 10 files: sharing renderer/composer/delivery, artwork manifest/direction, ModalSheet, Study, and Home.
- TypeScript, scoped ESLint, the CSS selector audit, production build, and startup bundle audit pass. Backend code remains lazy.
- 90 freshly encoded and decoded PNGs: Chromium and WebKit, each checking three lengths × 15 artwork choices. Every render preserves exactly the ordered fixture IDs in its selection/layout metadata; each PNG decodes and its encoded dimensions match the returned layout. This is not OCR or a claim that source IDs are embedded in the pixels. Heights are 1350, 1697, and 2331 pixels. Medium and long include verified English meanings; short is Gurmukhi only.
- 72 localized layout journeys: two engines × three lengths × English/Punjabi/Hindi × desktop light, phone light, phone dark, and 320-pixel 200% text. No detected accessibility violations, page errors, or horizontal overflow. Image readiness, all 15 artwork choices, Escape, and focus restoration pass. Three additional initial English phone journeys also passed during export checks.
- Both engines render and decode explicit Punjabi/Hindi typography samples with the bundled fonts loaded. These samples are labelled **Not scripture** and contain test words, not fabricated Gurbani translations. This establishes font loading/shaping, not scholarly validation of every translation or glyph sequence.

Browser evidence:

`/Users/japgrover/.codex/visualizations/2026/08/11/019ff31f-9f92-73c3-9f29-24a6f7ed2501/hukamnama-verified-2026-10-16/`

Reports are `chromium/browser-report.json`, `chromium-localized-ui/browser-report.json`, and `webkit/browser-report.json`, each with explicit pass status. Representative Interior audience PNGs, composer screenshots, and labelled typography images are retained; all other matrix exports were encoded/decoded and verified without keeping duplicate image files.

An additional fresh Chromium run retained **all 45** output images in `gallery/` for the new `index.html` evidence viewer (135 PNG exports total across the recorded runs). It includes the three lengths for all 14 original backgrounds and No art, with explicit fixture/excerpt labels and uncropped full-size links. Its three English phone journeys and two font samples also pass. After hardening the runner, `strict-runner-ui/browser-report.json` records another passing 36-journey localized UI suite with explicit expected counts; these repeat existing coverage rather than claim a third browser engine.

## Native verification

The final Swift bridge and production sharing code compile successfully in an isolated iPhone 17 Pro / iOS 26.4.1 Simulator App build with identifier `com.naamras.shareqa`. The installed production app is not replaced.

The final recorded length suite passes **all three** cases: short, medium, and long each wait for the current decoded PNG, present the real iOS activity sheet, dismiss it, verify the cancellation message and recovered actions, then save successfully through the production Photos bridge. The separate **denied Photos permission** case also passes: it receives the actual permission error, retains an available Share action, opens and cancels the real native sheet, and recovers without announcing a false save. These are Simulator results, not physical-device or Instagram results.

Validated evidence is retained under `native-ios/lengths/` and `native-ios/permission-denied/`, including raw summaries, exact test identities, screenshots, and `verified-suite.json`. A focused passing short rerun is separately labelled `native-ios/short-recovery/` and is not counted as the complete suite.

Earlier failures are not hidden: the first run stopped at a fixture-only locator (iOS exposes `aria-pressed` controls as toggles), and an app-coordinate backdrop tap left the native sheet open in a later short case. The harness now uses plain fixture buttons and the observed system dismissal region, verifies its point lies outside the sheet, and asserts the native popover has actually closed before testing the app callback. One cold focused rerun failed to observe the activity sheet within its 20-second timeout; its failed summary and attachments are retained separately in `native-ios/failed-short-handoff/` with no verified-suite record. The subsequent focused short run and the final full three-length suite pass. No production sharing behavior was changed merely to silence those test failures. Simulator boot and actual Photos permission setup are explicit in the documented procedure.

## Visual approval

On 16 October, after receiving the fresh 14-background gallery, the user confirmed: “The current balance looks right.” This approves the presented artwork/text balance. It does not authorize a commit, push, deployment, social posting, or certify artwork rights or translation accuracy.

## Final candidate audit

- A fresh machine-readable run passes all 324 app tests in 10 files: `candidate-checks/vitest.json`. TypeScript, scoped ESLint, the nine-file CSS audit, and startup bundle audit were rerun and pass.
- Seventy current code, asset, font, and configuration files match the tested runtime byte-for-byte. `candidate-checks/source-fingerprint.json` records every input and hash, with aggregate SHA-256 `326b8554a7e4d6563bd159f43ffc995eab0874b69e77a63f0621b671181066d2`. All 14 original JPEGs also match their 17 August inventory hashes exactly.
- `candidate-stress/stress-report.json` passes 45 additional real-canvas exports: 30 and 40 bilingual lines, and 40 Gurmukhi-only lines, each across all 15 artwork choices. They repeat verified fixture lines with unique IDs and are explicitly **not additional real Hukamnamas**. Encoded PNGs decode at 1080 × 4789, 1080 × 6271, and 1080 × 3396; exact ordered IDs, normalized source text, reading bounds, body font floors, and actual measured line widths pass. No PNGs of repeated-text fixtures are retained. A 300-line case requires 44531 pixels and correctly rejects at the 8192-pixel bound with zero encoding calls and no partial image.
- The review found that the earlier denied-permission screenshot used a short fixture despite the intended long selection. Its permission recovery result remains genuine, but it is superseded by `native-ios/candidate-lengths/` and `native-ios/candidate-permission-denied/`: all four cases pass with mandatory selected-kind/count and rendered 3/7/13-line coverage checks. The denied case now visibly uses the complete bilingual long fixture. WebKit may split the live selection sentence into separate exact kind/count accessibility texts; the test accepts that observed representation, never a button tap alone. The intermediate full-sentence locator failure is retained in `native-ios/failed-fixture-label-check/` without a verified-suite record.
- The native Swift bridge matches its tested copy (`9e55d27d6eb3e5036aaa853a0f13bbb67d9d9579050166026b8bc141a31316b3`). The final native test source hash is `25f9611b9db46844d733778fdefe4826c417ddb32ca6a63eafb5fbcde4ed3052`; the built fixture JavaScript hash is `93caeeb02475ebf494f513fb98abe8a8760740fcdcea2ec8e9b21f1cc212969e`.
- The new Hindi font notice now ships at `public/licenses/NotoSansDevanagari-OFL.txt`, byte-identical to the preserved source notice. The actual production public-copy step was checked in an isolated notice fixture, and the isolated native package was rebuilt and checked for the same notice. `candidate-checks/font-notice-packaging.json` records this narrow packaging verification. It does not clear the 14 pictures or constitute a full App Store/package audit.

The code-review checklist prompted the source-to-evidence comparison, stronger native fixture assertions, long-layout stress suite, and font-notice packaging check. These establish the local release candidate within its stated image limits. They do **not** establish universal image sharing for arbitrary-length input, native preparation-cancellation races on hardware, full production-app navigation on hardware, or recipient-app behavior. The remaining release gates below stay explicit.

## Remaining release sign-off

- Physical-device and destination-app behavior, particularly Instagram Stories/feed and messaging-app framing/compression for taller images. No social posting was performed.
- The local physical-device inventory returned “No provider was found” / “No devices found”; no usable physical-device target was available through that check. This does not establish whether an unpaired phone is physically connected.
- Human Gurmukhi/translation typography review. The 14 artwork/text treatments have user visual approval as recorded above.
- The existing artwork provenance/rights and cultural-review gate. Font licensing does not clear the 14 pictures.
- Fresh explicit approval before committing, pushing to master, publishing, or deploying.

For the physical-device check, use real short/medium/long readings from the app, confirm the saved PNG matches the preview and includes the first/last source line, then inspect it in Instagram Stories/feed and the intended messaging apps without posting publicly. Record device/iOS/app versions, selected support layer and background, cropping/scaling, readability, and the recipient's saved result. Include Photos access allowed/denied, share cancellation/retry, and an iPad popover check. This procedure is not marked complete by the Simulator evidence.

Baseline UI and browser-automation skills guided accessible controls, script-aware typography, isolated state-based checks, and error recovery. Lazyweb tools were unavailable; no Lazyweb report is claimed. Temporary disk exhaustion interrupted an early build; only a redundant QA build copy was removed, space recovered, and the recorded build/browser checks then passed.
