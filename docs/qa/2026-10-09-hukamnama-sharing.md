# Hukamnama sharing — release-candidate verification

> Historical verification. See the [16 October follow-up](2026-10-16-hukamnama-sharing.md) for cancellation fixes, bundled Hindi typography, and current test results.

Date: 2026-10-09 (America/Toronto). Local changes only; no commit, push, or release approval.

## Product contract

- Exactly the 14 existing artworks, plus an explicit No art option. No generated replacements; original image files are unmodified.
- Hukamnama comes first, over recognisable background artwork. Per-art paper colors, reading veils, protected placements, and feathered edges keep the collection coherent without a separate hero image or reading panel. The ambient extension uses the same artwork, not a replacement asset.
- One complete PNG, 1080 pixels wide. Short readings start at 1350 pixels high. Longer readings reduce type to the 42-pixel Gurmukhi / 32-pixel support floors, then grow taller. Payloads beyond 8192 pixels fail visibly rather than silently losing scripture.
- No QR, printed URL, promotional footer, or page counter. Quiet title, date, and source remain. Companion text and source links stay outside the image.
- First use now selects Interior audience. A saved artwork choice, a saved No art choice, or an explicit initial selection takes precedence. Merely opening the composer does not write a preference.
- Only the artwork preference is persisted. Meaning and pronunciation remain mutually exclusive; Gurmukhi is always included.
- Export actions wait for the newest PNG to decode and paint. Errors allow retry; stale rendering cannot make an old image shareable. The preview preserves the exported aspect ratio.
- Taller-than-Story images carry a quiet notice in the composer to check the complete image before posting. This notice is not printed on the PNG.

## Verified locally

- 303 automated tests across 10 files: renderer, composition, artwork catalog/direction, browser/native delivery, ModalSheet, Study, and Home.
- TypeScript, scoped ESLint, CSS selector audit (9 files), production build, and startup bundle audit pass.
- 180 encoded exports: Chromium and WebKit, each testing 3 reading lengths × 15 artwork choices × with/without a companion URL. Each produces one PNG with complete, ordered fixture line coverage; dimensions verified from the encoded bytes. Representative heights: 1350, 1697, 2331.
- 48 composer journeys: two browser engines × short/long × English/Punjabi/Hindi controls × desktop light, phone light, phone dark, and 320-pixel-wide 200% text. All pass keyboard selection, Escape/focus return, overflow, browser-error, and automated accessibility checks. No detected accessibility violations. This is not a substitute for human screen-reader review.
- An actual browser download produces one unnumbered PNG; the chosen background survives closing/reopening.
- A synthetic 30-line stress fixture produces one 1080 × 4789 PNG for No art, landscape art, and portrait art, retaining all test lines and the font floors. The repeated sample is not represented as a real Hukamnama.

The browser harness imports the actual production sharing components and renderer. It uses bundled fonts and existing artwork. The short/medium visual fixtures are explicitly labelled excerpts of Ang 683; the long fixture includes all 13 source lines. Translated UI controls are tested in all three locales; the export matrix uses Gurmukhi with English support, not a complete multilingual scripture corpus.

The clean temporary dependency runtime and source snapshot avoid unavailable cloud-backed workspace dependencies. WebKit's earlier first-navigation timeout was a cold development-server compilation issue; warming compilation before isolated user journeys yields a clean 24/24 rerun. The fixture's opener restoration was aligned with Study's existing explicit focus restoration.

## Native iOS

The app-local Capacitor bridge is compiled into the App target. It validates PNG payloads and dimensions, prepares private temporary files, opens the system activity sheet, and uses add-only Photos permission. Cancellation is distinct from success; Photos success is announced only after the native completion callback. Existing browser sharing remains unchanged. Android does not use this iOS-specific bridge.

The production Swift bridge and its registration compile successfully for iOS Simulator. The following end-to-end journeys pass on iPhone 17 Pro / iOS 26.4.1 Simulator with the actual composer, renderer, and Swift bridge:

- Short image: open the real system share sheet with the PNG attached, dismiss it, verify cancellation, then save to Photos and verify completion.
- Permission denied: show the save failure without claiming success, keep Share usable, open/dismiss the share sheet, and recover correctly. Only the isolated QA app's permission was changed.
- The actual saved short photo was inspected in simulator Photos storage: PNG, 1080 × 1350, 1,981,552 bytes, created during the passing test.

An isolated QA bundle identifier (`com.naamras.shareqa`) avoids replacing the installed app. Its fixture-only launch control was moved below the system top inset, and its viewport metadata was aligned with production's existing `viewport-fit=cover`. Early native test failures were test-fixture/locator issues: the top launch control, a nonexistent Close action, a non-queryable system container, and the Save Image action being absent when Photos permission was denied. Final successful tests use the available native action cells and the exposed dismissal backdrop. Medium/long native verification is still in progress; physical-device/recipient-app testing remains a separate gate.

## Evidence

Current visual proof folder:

`/Users/japgrover/.codex/visualizations/2026/08/11/019ff31f-9f92-73c3-9f29-24a6f7ed2501/hukamnama-refined-2026-10-09/`

Includes `index.html`, all-backgrounds contact sheet, three-length preview, both browser export matrices/PNGs, both UI reports/screenshots, stress report, and the downloaded PNG. Earlier quiet/minimal/editorial proof folders are historical and do not represent this candidate.

## Release gates still open

1. Physical-device sharing and recipient-app handling: iPhone/Safari, Android/browser sharing, Instagram Stories/feed, and messaging apps. Check image completeness, type readability, color, compression, cancellation/retry, permissions denied, and all long-image framing. No actual social posting was performed.
2. Full real-world length/language coverage and human Gurmukhi typography review; the bounded fixture matrix does not prove every possible passage.
3. Product-owner visual approval of the 14-artwork treatment.
4. Existing provenance/rights and cultural-review gate in `src/assets/share-highlights/PROVENANCE.md`. Technical inclusion does not clear any image for global release.
5. Fresh explicit approval before committing, pushing to master, publishing, or deploying.

Lazyweb tools were unavailable, so no report is claimed. The baseline-ui skill guided restrained controls and accessibility; browser-automation guided isolated state-based checks. This is a tested local candidate, not a claim of universal perfection or global-release approval.
