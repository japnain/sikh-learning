# NaamRas App Store Readiness

This checklist reflects the React/Vite reference app and the SwiftUI App Store target as of 2026-07-11.

## Current Build Status

- `NaamRasNative` is the SwiftUI target in `ios/App/App.xcodeproj`; the React/Vite app remains the product reference.
- The native target uses bundle id `com.naamras.app`, app version `1.0`, build `1`, iOS 17+, and a shared Xcode scheme.
- `PrivacyInfo.xcprivacy` declares user id and user content collection for app functionality, with no tracking.
- Guest reading works without an account. Supabase backup appears only in builds with valid configuration.
- Configured sign-in builds expose sync, sign-out, and confirmed account deletion. The repository includes an authenticated `delete-account` Edge Function; it still must be deployed and provider-tested before cloud backup can ship.
- `NativeCatalog.json` is generated deterministically from product data and contains 103 unique, exact BaniDB reading routes. Scripture lines are fetched on demand; no placeholder catalog lines are bundled.
- System, Light, and Dark appearance modes are user-selectable and persisted.
- The web reference app has optional, privacy-safe release diagnostics. Reporting is off without `VITE_DIAGNOSTICS_ENDPOINT`; enabled events use an allow-listed payload without messages, stacks, scripture, saved content, account identifiers, query strings, or local-storage data.
- Standalone Support and Privacy routes bypass first-run onboarding and app navigation. Production builds use `https://naamras.xyz/support` and `https://naamras.xyz/privacy` from `.env.production`; More keeps same-origin fallbacks for unconfigured builds.
- The canonical domain resolves over HTTPS, but the production deployment inspected on 2026-07-11 still serves the older onboarding flow at both direct document paths. Do not submit these URLs to App Store Connect until the current release candidate is published and the live DOM is reverified.

## Verified On This Machine

- The production web build compiles after extracting authoritative tokens plus focused Home, Reader, Navigation, Catalog, Library, and Settings stylesheets. Dead-rule, hidden-pseudo, and contrast-token consolidation reduced the production CSS asset from 165.72 kB (29.43 kB gzip) to 146.62 kB (26.04 kB gzip), including the responsive end-of-shabad navigator.
- `npm run qa:css-selectors` verifies all nine style modules against source usage, including individual branches in comma-separated selectors; the same audit runs in CI before the build and test gates.
- A 52-check browser matrix covers 13 routes at 320px and 390px phone widths plus 834px tablet in light and dark appearance. It reports no horizontal overflow, unnamed interactive controls, active CSS gradients, route errors, error boundaries, or console errors.
- `npm run qa:a11y` uses Axe 4.12.1 and reports zero automated WCAG 2.2 AA violations across 51 scans: 17 route and reader-detail states at 390px light, 1440px light, and 834px dark. CI runs the sweep after the production build. Five additional light-mode onboarding states pass, and a keyboard pass across 11 core routes confirms that the skip link is the first visible Tab target, moves focus to the main landmark, and continues through named, onscreen controls.
- The isolated AI browser sweep passes all 22 scenarios, including Home Nitnem link activation, loading, empty, degraded, first-run, navigation, and pre-onboarding public-document states.
- ESLint, the production build, `git diff --check`, and all 291 Vitest tests pass on 2026-07-11.
- Amrit Keertan initially mounts 18 of 113 section rows and exposes progressive loading, reducing the tablet document from 15,729px to 1,833px.
- Native catalog generation completes with 103 exact readings, and `xcrun swiftc -parse ios/App/NaamRasNative/*.swift` passes.
- Xcode command-line inspection on 2026-07-11 finds no installed iOS runtime, no eligible iOS simulator, and no connected iPhone. Physical VoiceOver testing and final native screenshots therefore remain external sign-off items.
- `npm run native:build` regenerates the 103-reading native catalog and resolves packages, but stops before compilation because Xcode cannot find an eligible iOS Simulator destination and reports that iOS 26.4 is not installed.

## Store Metadata Draft

- App name: `NaamRas`
- Subtitle: `Gurbani reading companion`
- Primary category: `Reference`
- Secondary category: `Education`
- Promotional text: `Open Gurbani with calm reader controls, save your place, and return to daily reading.`
- Keywords: `gurbani,sikh,naam,nitnem,banis,gutka,scripture,paath,shabad,panjabi`
- Description:

```text
NaamRas is a calm Gurbani reading companion for daily use.

Browse complete banis, choose Gurmukhi or Devanagari display, adjust transliteration and meaning language, save readings, and keep your reading progress on your device.

NaamRas works without an account. Cloud backup is optional when available, and scripture is presented with clear source context.
```

## App Review Notes Draft

```text
NaamRas does not require an account. Reviewers can complete onboarding and begin reading as a guest.

Cloud backup is optional and appears only when the build contains valid Supabase configuration. The app has no subscriptions, in-app purchases, trial prompts, paid locks, or restore-purchase flow.

The native reading catalog contains exact BaniDB routes. Network access is required to load a reading for the first time. Bookmarks, reader preferences, and reading progress are stored locally; configured builds can optionally sync that user-owned state.
```

## Required Before Submission

- Confirm the Apple Developer Team and final bundle id.
- Verify the final icon and launch artwork on physical devices.
- Archive, sign, and upload the native target through Xcode.
- Publish this release candidate to the canonical `naamras.xyz` Vercel project, verify the new standalone Support and Privacy content at the production URLs, and add those same URLs in App Store Connect.
- If Supabase sign-in is enabled, deploy `delete-account`, verify complete auth-user and synced-row deletion for each provider, and confirm Sign in with Apple token revocation. Otherwise ship with Supabase account configuration disabled.
- Complete App Privacy answers after confirming production Supabase, BaniDB, and diagnostics configuration. Declare diagnostics if the endpoint is enabled in the submitted build.
- Install an iOS simulator runtime that matches Xcode, then capture final iPhone and iPad screenshots in both appearance modes.
- Connect a physical iPhone and complete the VoiceOver, Dynamic Type, first-launch, guest onboarding, configured/unconfigured backup, reading load/retry, saved state, offline/degraded behavior, and app-resume pass in `docs/qa/release-device-signoff.md`.

## Screenshot Artifacts

- Existing simulator capture: `docs/app-store/screenshots/naamras-native-onboarding-iphone17.jpg`
- This existing image is reference-only, not a complete submission set.
- Final set still required: onboarding, Home, Read catalog, Reader, Saved, and More in the approved visual direction, captured from the final signed native build.

## Native Commands

- `npm run ios:open`: open the Xcode project
- `npm run native:generate-catalog`: regenerate exact native reading metadata
- `npm run native:build`: compile the SwiftUI target without signing
- `npm run native:test`: run the native unit-test scheme

## Official Apple Checks

- App Review Guideline 2.1 requires final, tested builds without placeholder or temporary content.
- App privacy details and a public privacy policy URL are required in App Store Connect.

Sources:
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/app-store/app-privacy-details/
- https://developer.apple.com/help/app-store-connect/reference/app-privacy/
- https://developer.apple.com/support/offering-account-deletion-in-your-app
