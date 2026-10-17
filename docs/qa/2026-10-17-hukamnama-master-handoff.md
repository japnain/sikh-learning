# Hukamnama sharing — 17 October master handoff

Date: 2026-10-17, America/Toronto. This follows the user's approval of the artwork/text balance and explicit instruction to “push to master when done.” That authorizes the scoped Git handoff; it does not certify a global or App Store release. The 16 October reports remain historical records of the earlier local candidate.

## Scope retained

- The 14 existing original artworks, plus No art. No replacement or generated artwork, QR code, printed URL, promotional footer, or page counter was added to Hukamnama exports.
- One complete PNG for short, medium, and long readings. Scripture remains first, over recognisable artwork. Readable font floors precede increased image height; content exceeding 8192 pixels is rejected with recovery guidance, never silently truncated.
- The approved composition is unchanged. This follow-up changes the security runtime and adds a default export to the isolated QA harness component to satisfy repository lint; the rebuilt fixture JavaScript remains byte-identical.
- Unrelated `artifacts/` and the three untracked home hero PNGs are excluded from the commit.

## Security patch

The pre-push dependency audit identified the existing Capacitor iOS 8.4.2 runtime as affected by [GHSA-rvm3-566m-v7fv / CVE-2026-103922](https://github.com/advisories/GHSA-rvm3-566m-v7fv). The advisory identifies 8.4.3 as a patched version and requires rebuilding the native application.

The minimal patch pins npm `@capacitor/core`, `@capacitor/ios`, and `@capacitor/cli` to **8.4.3**, with matching lockfile checksums. Swift PM pins `capacitor-swift-pm` to exact **8.4.3**, revision `89e0d8ec2321025f549ddb19259a717467943b97`; all seven other resolved package versions remain unchanged. Resolution uses the resolver-generated origin hash, not a hand-invented value.

After a fresh isolated `npm ci --ignore-scripts`, the actual installed package versions are all 8.4.3. Production `npm audit --omit=dev --json` reports **zero vulnerabilities**. The all-dependency audit still reports **22 existing development-tool findings (14 high, 8 moderate, zero critical)**. No broad dependency upgrade or `audit fix --force` was performed or implied; this is not a claim that the entire development toolchain is vulnerability-free.

## Fresh evidence

Evidence root: `/Users/japgrover/.codex/visualizations/2026/08/11/019ff31f-9f92-73c3-9f29-24a6f7ed2501/hukamnama-verified-2026-10-17/`.

- Chromium and WebKit each pass **45 complete encoded/decoded PNGs, 36 localized composer journeys, and two bundled-font samples**. The matrices cover short/medium/long × all 14 originals and No art. The localized journeys cover English/Punjabi/Hindi across desktop, light/dark phone, and narrow 200% text layouts. Source ordering, singleton output, dimensions, readiness, accessibility, overflow, Escape, and focus restoration are checked. This is not OCR or scholarly translation review.
- The fresh Chromium stress suite passes **45 further complete exports** using explicitly labelled repeated verified fixture lines: 30/40 bilingual lines and 40 Gurmukhi-only lines across all 15 choices. It also passes the oversized rejection without encoding a partial image. These are layout stress fixtures, not additional actual Hukamnamas.
- The production build includes all **198 public files**; the startup bundle audit passes, and the generated service-worker placeholders are replaced. Native catalog regeneration in the isolated runtime produces 103 readings and a byte-identical 28,299-byte catalog, SHA-256 `c2211975c83d0057f8380ccfb927ffa4edf8602d61374b0ce60356b661c83ddb`.
- Repository-wide source lint passes for **271 files with zero errors/warnings**, including the existing API and Supabase function sources copied into the complete isolated snapshot. The isolated runtime's unrelated `native/` build/cache subtree is excluded from this source check; its six vendored generated `native-bridge.js` copies are not repository source or staged files. The earlier unfiltered runtime-only lint failure is retained, not presented as a pass.
- Native 8.4.3 build-for-testing succeeds. The resolved, derived, and embedded Capacitor frameworks match SHA-256 `cd0321b6f4530b04317eeea4cb3196ba15a7a2b116ee6e1403aff984aa9ccca2`, different from the prior 8.4.2 build. This confirms the native patch is actually rebuilt, not merely changed in a manifest.
- The QA-only lint change rebuilds to the exact same `index-DGaaeX3O.js`, SHA-256 `93caeeb02475ebf494f513fb98abe8a8760740fcdcea2ec8e9b21f1cc212969e`. The final QA entrypoint source hash is `dd15c87edba9cd497cfa23688a746a49c2de8477b2193d84c2e6c887db39a4b0`.
- Ninety-three current sharing/asset/font/configuration/QA inputs match the tested runtime byte-for-byte, aggregate SHA-256 `641d2e3ede56272fff35f40f04b009f395db7ee61fb1398af2c865e088ce6c55`. The native bridge and package pins match their isolated copies. All 14 original JPEG fingerprints still match the 17 August inventory. `candidate-checks/source-fingerprint.json` records the complete comparison.
- The app-wide production-preview accessibility sweep passes **51 WCAG 2.2 AA route checks and three open Hukamnama sharing-composer checks**. The first concurrent run ended with a closed-browser error and is retained as `a11y-initial-failure.json`; the separate serial rerun passes and is retained in `a11y-serial.log`. No production UI was changed to bypass the first failure.
- Fresh focused app tests pass **324/324 across 10 files**; the harness's ten Node tests, TypeScript build, and nine-file CSS selector audit also pass.
- The final complete-snapshot **`npm test` passes 824/824 tests in 92 files across seven batches, exit 0**. An earlier partial-snapshot run passed 800 tests but could not load three suites because existing Supabase sources were missing from the temporary copy; its failure is retained separately. Restoring the original inputs resolved those load failures without changing production code. Exact commands, versions, logs, and results are indexed by `candidate-checks/summary.json`.
- Staged source whitespace and scope checks pass. The only two full-diff whitespace warnings are the same trailing space on line 21 of the two byte-identical, unmodified upstream OFL notices; their exact licensed source bytes and SHA-256 `a216f6f8d85c7228093e0ee5e258d9d377e6671f68acb4db1930b29583d0f331` are intentionally preserved. Forty-five staged files contain only sharing, native bridge/security pins, font/licensing, QA source, and dated QA records; no captured test results or unrelated home assets are staged.

## Native verification and retained failures

The first fresh 8.4.3 length suite is retained under `native-ios/failed-initial-lengths/`: short passes real native presentation, dismissal, cancellation recovery, and Photos save. Long renders the complete 13-line image and presents the real activity sheet, but the observed backdrop taps do not close it; its final screenshot still shows the OS sheet. Medium renders the correct seven-line image, but the recorded Share tap does not produce an observed native sheet. Those failed cases remain failed evidence, with `failed-suite.json`, raw summaries, activities, event recordings, and screenshots. No denied-permission run is substituted for the length cases.

The retained synthesized events establish that the two long dismissal interactions were 50-millisecond touches at `(201, 174.8)`, above the actual native sheet at `y=498…864.7`; the medium Share interaction was a 50-millisecond touch at `(112, 739)`, inside the observed button frame `x=26…197, y=716…761`. The first long fixture-selector tap was also lost, before its existing bounded re-tap confirmed the correct selection. These observations support investigating test-event delivery, but do not prove host load caused the failures.

One controlled comparison was then run after the other browser/test jobs finished, using the **same unchanged test source, compiled tests, production sharing JavaScript, and rebuilt Capacitor 8.4.3 app**. All **three length cases pass, zero failures/skips**, in 82.5 seconds. Each proves selected kind/count, rendered 3/7/13-line coverage, real OS sheet presentation, real first-touch dismissal, the production cancellation callback, recovered actions, and the actual successful Photos callback. Strict passing evidence is in `native-ios/lengths/`; no source change, test-assertion weakening, or synthetic callback was needed. The earlier failures are not erased or claimed as passes, and the quieter-run comparison does not establish load causality or physical-device reliability.

The separately run **Photos-denied recovery case also passes (one case, zero failures/skips)** with the complete 13-line fixture. Actual add-only permission denial produces the recoverable not-saved message; native sharing still opens and cancels normally, and actions recover. Evidence is in `native-ios/permission-denied/`. Permission setup is scoped to the isolated `com.naamras.shareqa` simulator app and is restored afterward. Together these are four fresh passing required cases on the patched binary, not a physical-device or recipient-app certification.

## Scoped Git handoff

The user-authorized handoff contains the 45 reviewed files only. Local master and refreshed origin/master were aligned at `a044628dc31378724e563a75bb6a2fc78a093b3f` before committing. Staged secret/scope checks found no secret patterns or unexpected files. The pre-push audit prompted the critical native runtime patch, clean isolated rebuild, broader full-suite checks, source/evidence comparisons, and preservation of unsuccessful runs. The commit/push result is verified separately against the remote; this dated record does not replace that remote confirmation.

## Release boundaries

Physical iPhone/iPad checks, Instagram/messaging framing and compression, human Gurmukhi/translation review, and artwork provenance/rights/cultural sign-off remain open as documented in the [16 October report](2026-10-16-hukamnama-sharing.md) and [artwork provenance](../../src/assets/share-highlights/PROVENANCE.md). Simulator and browser tests do not clear these gates. No public social post, manual production deployment, or App Store publication is part of this handoff. A master push can trigger the repository's configured CI/hosting integration; no separate manual deployment is requested.
