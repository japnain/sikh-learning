# NaamRas App Store Readiness

This checklist reflects the current React/Vite app and the App Store guidance checked on 2026-05-04.

## Current Build Status

- Product shell: React/Vite remains as the product reference, and `NaamRasNative` is now the parallel SwiftUI App Store target in `ios/App/App.xcodeproj`.
- Native project: `NaamRasNative` uses SwiftUI, Supabase Swift, bundle id `com.naamras.app`, app version `1.0`, build `1`, iOS 17+, and a shared Xcode scheme.
- Native privacy file: `ios/App/NaamRasNative/PrivacyInfo.xcprivacy` declares user id and user content collection for app functionality, with no tracking.
- Ready in-app behavior: guest mode works without login, Supabase sync is optional, no paywall is presented, recitation playback is not marketed as live, and native More exposes privacy/source behavior.
- Native catalog: `ios/App/NaamRasNative/NativeCatalog.json` is generated from the product data and currently bundles 111 reading entries plus 470 Learn/library entries for the SwiftUI target.
- Lazyweb design reference: mobile patterns checked on 2026-05-04 favored five-tab reading/library shells, optional Apple/email account backup, progress-led onboarding, and clean reader controls rather than paywall-first meditation screens.

## Store Metadata Draft

- App name: `NaamRas`
- Subtitle: `Gurbani reading companion`
- Primary category: `Reference`
- Secondary category: `Education`
- Promotional text: `Read daily Nitnem, open Hukamnama, save passages, and learn Gurbani with calm reader controls.`
- Keywords: `gurbani,sikh,naam,nitnem,banis,hukamnama,gutka,scripture,paath,shabad,panjabi`
- Description:

```text
NaamRas is a calm Gurbani reading and learning companion for daily use.

Open Nitnem, Hukamnama, scripture search, saved passages, vocabulary review, and guided Learn paths from one mobile-first app. Reader controls let you choose Gurmukhi or Devanagari display, transliteration, meaning language, translation source, line spacing, and vishraam support.

NaamRas is designed for honest use: guest reading works without an account, cloud backup is optional, saved progress remains user-owned, and recitation features appear only when a real working source is available.
```

## App Review Notes Draft

```text
NaamRas does not require an account. Reviewers can use Continue as Guest during onboarding.

Supabase sync is optional and is only shown as a backup choice. The app currently has no subscriptions, in-app purchases, trial prompts, paid locks, or restore-purchase flow.

Ambient sound controls are for focus soundscapes only. The app does not claim to provide Gurbani recitation playback until a real audio source is available.

Scripture and translation content is shown with source context in reader flows. Network access is used for BaniDB scripture lookup and optional Supabase sync.
```

## Required Before Submission

- Confirm the final Apple Developer Team and bundle id. `com.naamras.app` is used by the native target until App Store Connect availability is confirmed.
- Review the generated Light Manuscript icon/launch artwork and replace it only if final brand direction changes.
- Archive/sign the iOS target in Xcode with the Apple Developer account and upload the build to App Store Connect.
- Provide a public Privacy Policy URL in App Store Connect; the app already includes an in-app `/privacy` route for privacy/source behavior.
- Provide a public Support URL in App Store Connect.
- Complete App Privacy answers for optional Supabase sync, account identifiers, user content, diagnostics, and third-party services after confirming Supabase/BaniDB runtime behavior.
- Capture App Store screenshots from real iPhone sizes after `NaamRasNative` is running on simulator/device.
- Run device testing for first launch, guest onboarding, optional sign-in, scripture search, reader controls, saved data, offline/degraded states, and app resume.

## Screenshot Artifacts

- First verified native simulator capture: `docs/app-store/screenshots/naamras-native-onboarding-iphone17.jpg`
- Remaining App Store screenshots should be captured after final signing against the same Light Manuscript direction: onboarding, Home, Read catalog, Reader controls, Learn, Saved, and More/account.

## Native Commands

- Sync the latest production web build into iOS: `npm run ios:sync`
- Open the project in Xcode: `npm run ios:open`
- Compile a simulator debug build without signing: `npm run ios:build`
- Compile the native SwiftUI target without signing: `npm run native:build`
- Run the native unit test scheme: `npm run native:test`
- Regenerate the bundled native product catalog: `npm run native:generate-catalog`

## Official Apple Checks

- App Review Guideline 2.1 requires final, tested builds with no placeholder text, empty websites, or temporary content.
- Apple requires app privacy details in App Store Connect before new apps and updates can be submitted.
- Apple requires a publicly accessible privacy policy URL for App Store privacy metadata.

Sources:
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/app-store/app-privacy-details/
- https://developer.apple.com/help/app-store-connect/reference/app-privacy/
