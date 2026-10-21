# NaamRas experience beta handoff

> Evidence note: `artifacts/` links and localhost previews in this document refer to preserved local QA records, which are excluded from Git. Historical build results apply only to their named snapshots; the current session-only push scope is recorded in [pre-push readiness](session-prepush-readiness.md).

**Current delivery — October 21, 2026: v28 PWA.** The owner-rejected v27 icons have been replaced with a new courtyard/pothi/ribbon/jaali family. Same bottom placement, both themes, 581 fresh navigation checks and final offline/reader checks passed. [Current navigation delivery and screenshots](artwork-navigation-acceptance.md). This is a reviewable implementation; owner aesthetic approval is not assumed. No native signing/device gate or public deployment is included.

## Prior v25 Home/reader handoff

**Current handoff — October 21, 2026: v25 PWA.** The owner confirmed an Add to Home Screen web app and removed native-wrapper, signing and mandatory physical-device gates. Current software acceptance is complete; use the [PWA acceptance and web delivery](pwa-home-reader-acceptance.md) and [completion goal](../design/world-class-completion-goal.md). The v23 native beta record below is preserved history and is superseded for the present goal. It must not be read as a current signing/device blocker or current web package.

## Preserved v23 native beta record

Updated October 21, 2026. Current tested candidate: **v23**, Capacitor **App**, **com.naamras.app**, **1.0 (1)**, iPhone iOS **17+**. Home artwork refinement and scoped simulator interaction passed. The full [completion goal](../design/world-class-completion-goal.md) remains **open for hands-on native and physical-device acceptance**. This is a verified beta, not release sign-off or a claim of literal perfection.

## Product result

The NaamRas wordmark is unchanged. Home places each complete artwork after the masthead, then Hukamnama with a 24px standard gap. Landscapes keep their native ratio; portraits use a centered square stage capped at 400px high. All fourteen original artworks plus Eclipse remain selectable, with fixed/daily/visit rules preserved. Full borders and subjects now stay visible across widths. No new image was needed after reviewing all fifteen. [Composition and actual ratios](../design/home-artwork-composition.md).

The focused Daily Nitnem, explicit completion/Undo, real dated history, saved returns and draft-based customization remain. Read/Study retain the complete scripture and supporting layers. The live Ashtpadi heading is now recognized as metadata and Home previews the following body verse; the full reader retains the heading and invocation. No canonical text, punctuation or source order was changed.

## Validation and limits

| Layer | Current evidence |
| --- | --- |
| Regression/static | **706 distinct tests across 42 affected files**, full lint/types and 14-file stylesheet audit passed against the explicit freeze. [Validation](../../artifacts/goal-quality-v23/final-source-validation.json), [tests](../../artifacts/goal-quality-v23/final-regression-results.json), [static](../../artifacts/goal-quality-v23/final-static-checks.json). The 72 focused tests are included, not additional. |
| Artwork/geometry | All 15 × 320/390/430/1440px ×both themes, plus enlarged English/Punjabi/Hindi and short-landscape cases: **140 scenes, 50 screenshots,0 failed checks**. Actual Apply/Cancel passed. The final matrix uses the unmodified official Oct21 payload, not fabricated scripture. [Matrix](../../artifacts/home-artwork-20261021/artwork-matrix.json), [review](../../artifacts/home-artwork-20261021/independent-review.md). |
| Production | **32 additional production scenes**, six accessibility scans with 0 violations, Apply/Cancel and actual Home→Hukamnama reader retaining heading/invocation/body passed. Root-font 200% is a browser proxy, not OS Dynamic Type. [Production record](../../artifacts/goal-quality-v23/production/artwork-matrix.json). |
| Actual views | [Home + Daily Nitnem light/dark](../../artifacts/goal-quality-v23/final-home/home-light-dark-comparison.png), [capture provenance](../../artifacts/goal-quality-v23/final-home/capture-proof.json), [all fifteen light](../../artifacts/home-artwork-20261021/all-artworks-light.jpg), [all fifteen dark](../../artifacts/home-artwork-20261021/all-artworks-dark.jpg). |
| Scoped native | Installed without erasing QA data. Actual Eclipse, artwork sheet, Court mural Apply, light/dark, Hukamnama Study→Read and 34px Appearance verified. Cold process relaunch retained Court mural/Light; fixed Eclipse/Dark restored afterward. [Runtime ledger](../../artifacts/goal-quality-v23/runtime-results.json), [native screenshots](../../artifacts/goal-quality-v23/native-ui/05-hukamnama-read-controls.png), [installed hashes](../../artifacts/goal-quality-v23/installed-build-validation.json). |
| Native limits | Scroll/drag automation did not reliably move the page; no native gesture pass or product scroll failure inferred. A partially scrolled reader toolbar appears near the status/Dynamic Island area in04 and returns below it in05; hands-on reproduction remains required. Rehras lengths/exact places, interruptions, seven-bani restoration and long-session/selection/VoiceOver/display checks remain open. [Independent scoped review](../../artifacts/goal-quality-v23/independent-review.md). |
| Initial startup | First boot delayed WebKit process launch/commit before React; actual Home eventually painted and later cold relaunch worked. This is consistent with an environment delay, not proof of a physical startup speed or a speculative code defect. [Timeline](../../artifacts/goal-quality-v23/native-diagnostic/startup-timeline.json). |
| Release builds/packages | Both Release targets passed. All **283 canonical web files** match simulator, unsigned iPhone archive and ZIPs; identity/privacy/launch/architectures passed. **612 frozen inputs**, fingerprint `357d180a7e3baadb93bf53c06dc487688825489d59d50f864c39b12681e1fd93`. [Built-app review](../../artifacts/goal-quality-v23/prepackage-built-app-review.json), [manifest](../../artifacts/beta-20261021-v23/build-manifest.json), [strict integrity](../../artifacts/beta-20261021-v23/package-integrity-validation.json), [mirrored package proof](../../artifacts/beta-20261021-v23/mirrored-package-validation.json). |
| Physical/signing | Current discovery completed with 0 devices; this does not establish hardware absence. There are 0 valid signing identities. No signed physical install, upload or distribution. [Availability](../../artifacts/goal-quality-v23/availability/availability.json), [device checklist](release-device-signoff.md). |

## Exact tested source and parallel work

The shared checkout acquired unrelated story implementation/data after the build. Its strict freeze check correctly failed. All 612 original frozen files were still unchanged and were copied with individual hash verification into a legitimate separate checkout at `/Users/japgrover/.codex/naamras-candidates/20261021-v23`, using the same actual branch/base commit. The original freeze bytes and source-policy gates were preserved. The isolated source/dist/native/ZIP checks passed before and after packaging. New story files and the numbered native config copy remain untouched in the shared checkout.

[Isolation proof](../../artifacts/goal-quality-v23/source-isolation.json), [preserved shared-checkout failure](../../artifacts/goal-quality-v23/prepackage-built-app-review-shared-workspace.json), [source changes from v22](../../artifacts/goal-quality-v23/source-delta.json). This candidate includes the nine recorded Home/helper/test files changed from v22; it does not claim to validate the later story feature. Run [verify-frozen-candidate.py](../../artifacts/beta-20261021-v23/verify-frozen-candidate.py) to exercise unchanged strict gates in the exact checkout and validate the mirrored deliverables. The original generic verifier correctly rejects newer inputs in the active shared checkout.

## Packages

| Artifact | Verified record |
| --- | --- |
| [Simulator ZIP](../../artifacts/beta-20261021-v23/NaamRas-iPhone-Simulator.zip) | 56,963,671 bytes; Release arm64/x86_64; SHA256 `7a487773ca0b11ba4fc25002354ecc6f3ec37690a20996fc035aed344a855799`. |
| [Unsigned iPhone archive](../../artifacts/beta-20261021-v23/NaamRas-iOS-unsigned.xcarchive.zip) | 58,996,004 bytes; Release arm64; SHA256 `06115218531cb7f1517c006733b0c4cbc9b19ffeebc0752fb1f1664c175c5975`. Owner-authorized signing required. |
| [Candidate notes](../../artifacts/beta-20261021-v23/README.md) | Runtime evidence and exact verification-workspace instructions. |

## Remaining acceptance and QA state

Only the isolated NaamRas Beta QA simulator was shut down after checks; the default user simulator was left untouched. QA artwork is fixed Eclipse and theme Dark. Reader is now Read after the explicit mode test, with 34px retained. The last visually committed routine before this continuation was Rehras Medium + Kirtan Sohila Short; it was not changed or visually reconfirmed in this v23 pass. Restore the original seven through actual UI, review lengths, Save and verify a cold relaunch.

Complete the runtime ledger's native journeys and at least 30 minutes on a physical iPhone, including reliable scroll/touch, wrapped selection and native share cancellation, VoiceOver/largest text/Bold Text/Increase Contrast, lock/offline/reconnect and exact reading-place reopening. These remain required; browser screenshots and compilation do not close them.

The [previous v22 handoff](../../artifacts/goal-quality-v23/previous-v22-beta-handoff.md) and all prior frozen packages remain historical and unchanged. Earlier native results retain their actual build labels. No public deployment, paid service, signing-account change or distribution was performed.
