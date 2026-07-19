# NaamRas App Store Readiness

Status as of 2026-07-18. This document is the launch source of truth.

## Product Decision

- The App Store product is the Capacitor `App` scheme in `ios/App/App.xcodeproj`.
- It packages the same React/Vite production bundle served at `https://naamras.xyz`; the local and live JavaScript and CSS asset hashes were verified identical.
- The separate `NaamRasNative` SwiftUI scheme is experimental and must not be selected for archive or submission.
- No product redesign is part of the launch. The native launch frame uses NaamRas's existing light and dark background colors, then hands off to the unchanged web UI.

## Submission Build

- Display name: `NaamRas`
- Bundle id: `com.naamras.app`
- Marketing version: `1.0`
- Build number: `1`
- Minimum OS: iOS 17.0
- Device family: iPhone only for 1.0
- App Store scheme: `App`
- Capacitor runtime/CLI/Swift package: `8.4.2`, pinned consistently
- Build SDK verified: iOS 26.4
- Architecture verified: arm64
- Signing style: automatic; Apple Team is not configured in the repository
- Export compliance: `ITSAppUsesNonExemptEncryption = false`; the app uses only exempt system transport such as HTTPS
- Tracking: disabled; BaniDB request/server-log data is conservatively declared as collected and linked
- In-app purchases/subscriptions: none

The initial App Store build is local-first. `.env.production` does not configure Supabase or diagnostics, so sign-in, cloud sync, account collection, and diagnostics are not active in the submitted bundle. Direct BaniDB requests still transmit search terms, requested content paths, and an IP address to the provider. Do not add backend environment values without redoing App Privacy answers and deploying/provider-testing account deletion.

## Verified On This Machine

- `npm run build`: passed; the production output matches the currently deployed `naamras.xyz` asset hashes.
- `npm run lint`: passed.
- `npm test`: 418 tests passed in the repository's batched test runner.
- Focused Study/word-flow retest: 67 tests passed.
- `npm run qa:css-selectors`: passed for 9 style files.
- `npm run qa:a11y`: 51 automated WCAG 2.2 AA route checks passed across phone, desktop, and tablet viewports in light and dark appearances.
- `npm run qa:ai-bug-sweep`: 22/22 launch scenarios passed on the final rebuilt candidate, including first-run onboarding, persistent navigation, degraded states, public Support/Privacy, and the accessible word-explorer flow.
- `npm run library:verify`: passed.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.
- Final local `npm run qa:app-store`: 100 release checks passed with 0 failures and 5 explicit owner/release warnings. It must be rerun with `-- --live` after the corrected privacy build is deployed; live parity is intentionally open until then.
- Capacitor sync: passed; `dist` copied into `ios/App/App/public`.
- Debug iPhone simulator build: passed.
- Release iPhone simulator build: passed.
- Final unsigned generic iOS archive on Capacitor 8.4.2: passed; 66 MB archive / 59 MB app bundle, arm64, iOS 17+, bundle `com.naamras.app`, version `1.0 (1)`, built with the iOS 26.4 SDK.
- App privacy manifest: present and conservatively declares BaniDB Search History, Product Interaction, and Other Data Types as linked, used for App Functionality and Analytics, and not used for tracking.
- Capacitor and Cordova privacy manifests: present in the final bundle and declare no tracking, collected data, tracking domains, or required-reason APIs.
- Capacitor and Cordova XCFramework origins: both signatures validate as the official Capacitor publisher, Drifty Co. Team `9YN2HU59K8`.
- Archive dependency audit: only Capacitor, Cordova, and Apple system libraries are linked.
- Archive web audit: every production asset is byte-for-byte identical to `dist`; Capacitor adds only its generated `cordova.js` and `cordova_plugins.js` bridge shims.
- Vercel branch preview: commit `b914a83` reached `READY`; its entry JavaScript, Privacy JavaScript, and CSS SHA-256 values matched the local/iOS bundle, and the corrected July 18 BaniDB disclosure was present. Production promotion remains deliberately pending.
- App icon: 1024 x 1024 PNG, no alpha.
- iPhone screenshot: 1206 x 2622 JPEG, no alpha, which is an accepted 6.3-inch App Store size.
- Live DOM: `https://naamras.xyz/privacy` and `https://naamras.xyz/support` both render their intended standalone documents before onboarding.

## Store Assets

- App icon: `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
- Required iPhone screenshot: `docs/app-store/screenshots/naamras-iphone-6.3-onboarding.jpg`
- Metadata: `docs/app-store/metadata-en-US.md`
- App Store Connect answers: `docs/app-store/app-store-connect-answers.md`
- Content-rights/provider audit: `docs/app-store/content-rights-and-provider-audit.md`
- Age-rating evidence: `docs/app-store/age-rating-evidence.md`
- Final submission checklist: `docs/app-store/submission-checklist.md`

One screenshot is Apple's technical minimum. Additional Home, Read, Reader, Saved, and More screenshots are recommended for conversion, but are not required to create the 1.0 submission.

## External Sign-off Still Required

These items cannot be completed from source control:

1. Add the correct Apple Developer Team in Xcode and confirm the bundle id is registered to that team.
2. Create or select the App Store Connect app record and confirm the legal developer name, SKU, copyright owner, support contact, DSA trader status, tax/banking agreements, territories, and price.
3. Obtain written Panth Prakash redistribution rights and documented BaniDB/Khalis Foundation terms compliance. The exact missing evidence and provider obligations are in `docs/app-store/content-rights-and-provider-audit.md`.
4. Resolve the current conservative `Unrated` age-rating result. The bundled historical text contains detailed torture and dismemberment; written Apple classification guidance or an owner-authorized content change is required before submission. See `docs/app-store/age-rating-evidence.md`.
5. Confirm BaniDB/Khalis Foundation retention, linkage, and IP-use practices, then finalize the conservative App Privacy answers.
6. Deploy the corrected Privacy policy to `naamras.xyz` and restore byte-for-byte live parity with the packaged app.
7. Run the signed Release build on a physical iPhone using `docs/qa/release-device-signoff.md`, including VoiceOver, largest Dynamic Type, offline/retry, background/resume, and clean-install onboarding.
8. Archive with the configured Team, upload through Xcode Organizer, resolve any App Store Connect validation result, attach the build, and submit for review.

## Official Apple References

- App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Submission SDK requirements: https://developer.apple.com/app-store/submitting/
- Screenshot specifications: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
- App privacy details: https://developer.apple.com/app-store/app-privacy-details/
- Age-rating definitions: https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions
- Set an age rating: https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating
- Export compliance: https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations
- Third-party SDK requirements: https://developer.apple.com/support/third-party-SDK-requirements/
- XCFramework origin verification: https://developer.apple.com/documentation/xcode/verifying-the-origin-of-your-xcframeworks
