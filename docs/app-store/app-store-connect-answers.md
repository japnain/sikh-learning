# NaamRas App Store Connect Answers

These answers describe the initial iPhone 1.0 `App` build produced from the committed `.env.production`. Reassess every answer if Supabase, diagnostics, advertising, analytics, or new SDKs are enabled.

## App Review Information

### Review notes

```text
NaamRas is a local-first Gurbani reading companion. No account or demo credentials are required.

Review path:
1. Launch the app.
2. Complete the four-step onboarding flow.
3. Use the persistent navigation to open Home, Read, Saved, and More.
4. Open a reading from Read. A network connection may be required for the first scripture lookup.
5. Public Support and Privacy documents are available at https://naamras.xyz/support and https://naamras.xyz/privacy.

Version 1.0 does not configure cloud sign-in, diagnostics, subscriptions, in-app purchases, advertising, or paid content. Preferences, bookmarks, vocabulary, and reading progress remain on the device. Scripture and search requests are sent to BaniDB as described in the public privacy policy.

The submitted target is the Capacitor `App` scheme, which packages the same production interface served at naamras.xyz.
```

### Sign-in required

`No`

### In-app purchases

`No`

### Advertising

`No`

## App Privacy

Conservative 1.0 response: `Data Collected`.

Declare the following data types:

| Data type | Linked to user | Tracking | Purposes | Evidence |
| --- | --- | --- | --- | --- |
| Search History | Yes | No | App Functionality; Analytics | Search terms are transmitted in BaniDB API requests; Khalis Foundation says requested pages are recorded in server logs. |
| Product Interaction | Yes | No | App Functionality; Analytics | Requested scripture, reader, Kosh, Rehat, and related API paths disclose content interactions and may be recorded. |
| Other Data Types | Yes | No | App Functionality; Analytics | Khalis Foundation expressly says server logs record IP addresses; Apple has no generic IP-address category and says to classify IP use by purpose. No narrower verified use is available. |

Use `Yes` for linkage because Khalis Foundation does not state that these logs are deidentified before collection and says information may be combined with information from partners. Use `No` for tracking because no evidence indicates advertising linkage, advertising measurement, data-broker sharing, or another Apple-defined tracking purpose.

The app privacy manifest declares the same three data types, purposes, linkage, and tracking choices. The user-facing Privacy page discloses the direct BaniDB request and published server-log practice.

The following remain local and are not declared as collected: guest preferences, bookmarks, vocabulary, progress, onboarding choices, and the local device id. No Supabase values or diagnostics endpoint are present in `.env.production`, and no advertising or analytics SDK is configured.

Before submission, obtain BaniDB/Khalis Foundation confirmation of its API retention, linkage, IP use, and tracking practices. If it confirms that IP addresses are used to infer location or identify a device, also declare Coarse Location or Device ID as directed by the verified use. If it confirms qualifying deidentification before collection, linkage may be changed to `No`. Keep the conservative answers above until written evidence supports a narrower declaration.

## Export Compliance

- Uses encryption: `Yes`, through Apple's operating-system HTTPS/TLS APIs.
- Uses non-exempt or proprietary encryption: `No`.
- Export compliance documentation required: `No` for this build.
- Build setting: `ITSAppUsesNonExemptEncryption = NO`.

## Content Rights

- Contains or accesses third-party content: `Yes`.
- Required owner action: complete every gate in `content-rights-and-provider-audit.md` and retain written evidence that the app may display and redistribute BaniDB-backed scripture/translations, the complete transformed Panth Prakash reader, and both bundled EPUB files.
- Current status: permission evidence is absent, BaniDB's logo/contribution/whole-corpus requirements are not evidenced, and the declaration must not be submitted.

## Age Rating

Current conservative result: `Unrated — not eligible for App Store publication`.

The 169-episode Panth Prakash corpus contains frequent realistic violence and weapons plus detailed executions, torture, scalping, dismemberment, and other graphic injury. The evidence and draft questionnaire are in `age-rating-evidence.md`. At least an Infrequent answer for Prolonged Graphic or Sadistic Realistic Violence is supportable under Apple's definition, and either Infrequent or Frequent generates `Unrated`.

Do not submit a `None` answer for that descriptor without written guidance from Apple covering this exact text-only historical content. To obtain an eligible rating, the owner must secure that classification guidance or authorize removal of the disqualifying material from the App Store build. If Apple confirms it belongs only under Realistic Violence, use `Frequent` Realistic Violence and expect 18+.

## Accessibility Nutrition Labels

Do not publish voluntary accessibility claims until the physical-device sign-off is complete. The automated candidate currently supports VoiceOver-friendly landmarks and names, sufficient contrast, Reduce Motion-aware web behavior, and adjustable reader text, but Apple expects a claimed feature to work across all common tasks.

## Business and Availability

Account owner must choose or confirm:

- DSA trader/non-trader status
- Free price tier
- Release territories
- Manual or automatic release after review
- Legal developer name and copyright owner
- App Review contact name, email, and phone
- SKU
- Tax, banking, and agreements status
