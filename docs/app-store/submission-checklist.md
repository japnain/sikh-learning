# NaamRas 1.0 Submission Checklist

## Source and Build — Complete

- [x] App Store target is the Capacitor `App` scheme, matching `naamras.xyz` without a redesign.
- [x] Bundle id is `com.naamras.app`.
- [x] Version/build are `1.0 (1)`.
- [x] Minimum OS is iOS 17.0.
- [x] Version 1.0 is iPhone-only.
- [x] Capacitor core, iOS, CLI, and Swift package are pinned to `8.4.2`.
- [x] Built with iOS 26.4 SDK.
- [x] Debug and Release simulator builds pass.
- [x] Unsigned arm64 device archive passes.
- [x] Export-compliance plist key is present.
- [x] Privacy manifest is present and conservatively declares BaniDB Search History, Product Interaction, and Other Data Types collection with no tracking.
- [x] Capacitor and Cordova privacy manifests are bundled and their official publisher signatures validate.
- [x] Stock Capacitor launch branding is no longer displayed.
- [x] App icon is 1024 x 1024 with no alpha.
- [x] Required 1206 x 2622 iPhone screenshot is JPEG with no alpha.
- [ ] Deploy the corrected July 18 Privacy policy to `naamras.xyz` and verify the live document matches the App Store build.
- [ ] Run `npm run qa:app-store -- --live` after that deployment and resolve every failure.
- [x] Build, lint, tests, accessibility, browser scenarios, content verification, selector audit, and production dependency audit pass.

## Apple Account — Owner Required

- [ ] Add the correct Apple Developer Team to the `App` target.
- [ ] Confirm `com.naamras.app` is registered and available to that Team.
- [ ] Create/select the App Store Connect app record and enter SKU.
- [ ] Accept all pending Apple agreements; confirm tax and banking status.
- [ ] Enter legal App Review contact name, email, and phone.
- [ ] Enter the exact legal copyright owner.
- [ ] Complete DSA trader/non-trader status.
- [ ] Complete `content-rights-and-provider-audit.md`; retain written Panth Prakash redistribution permission.
- [ ] Obtain BaniDB/Khalis Foundation permission or partner confirmation, satisfy its logo/corpus/contribution requirements, and retain the evidence.
- [ ] Resolve the `Unrated` finding in `age-rating-evidence.md` through written Apple classification guidance or an owner-authorized content change.
- [ ] Complete the final age-rating questionnaire only after that resolution.
- [ ] Obtain BaniDB/Khalis Foundation retention/linkage/IP-use confirmation and finalize the conservative App Privacy answers.
- [ ] Paste metadata from `metadata-en-US.md`.
- [ ] Upload `screenshots/naamras-iphone-6.3-onboarding.jpg` to the 6.3-inch iPhone screenshot slot.
- [ ] Select free pricing, territories, and release method.

## Device and Upload — Owner Required

- [ ] Run `docs/qa/release-device-signoff.md` on a physical iPhone with the signed Release build.
- [ ] In Xcode, select the `App` scheme and `Any iOS Device (arm64)`.
- [ ] Product → Archive.
- [ ] Validate the signed archive in Organizer.
- [ ] Upload to App Store Connect.
- [ ] Wait for processing and resolve every validation, privacy-manifest, or export-compliance warning.
- [ ] Attach build `1` to version `1.0`.
- [ ] Paste the review notes from `app-store-connect-answers.md`.
- [ ] Submit for App Review only after every checkbox above is complete. Do not submit while the content-rights or `Unrated` gates remain open.
