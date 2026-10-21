# NaamRas PWA acceptance and delivery

> Evidence note: `artifacts/` links and localhost previews in this document refer to preserved local QA records, which are excluded from Git. Historical build results apply only to their named snapshots; the current session-only push scope is recorded in [pre-push readiness](session-prepush-readiness.md).

The latest navigation extension is implemented in **v28**, replacing owner-rejected icons. Use [current navigation delivery](artwork-navigation-acceptance.md) for the live preview, latest web package and actual-size screenshots. The v25 Home/artwork/reader baseline below retains its original provenance; its older navigation screenshots are superseded.

October 21, 2026. Current web candidate: **v25 PWA**. Status: **software acceptance complete within the owner-confirmed PWA scope**. The owner confirmed that the product is a web app added to the Home Screen. Native wrappers, Apple signing and a mandatory physical-device session are outside the agreed completion goal. This record supersedes the older native beta handoff for the current work.

## Product and confirmed fixes

Home retains the NaamRas wordmark, Eclipse and all fourteen original artworks. Complete compositions use their actual image ratios: landscape stages follow the source ratio; portrait sources fit a centered square stage capped at 400 CSS px. Hukamnama starts 24 CSS px below the art at the standard root size, scaling with enlarged interface text. The focused Daily Nitnem, editable routine, explicit completion/Undo and warm light/dark reading palettes remain intact.

The final PWA pass reproduced and fixed three concrete problems:

1. An unsuccessful update could replace the working offline HTML with a newer shell whose required script had failed to download. Each worker now preserves its own install-time shell and assets until the replacement activates.
2. A navigation returning HTTP 503 displayed the server error despite an available saved app. Connection failures and server errors now use that worker's installed shell; healthy responses, 404s and canonical API bypasses retain their behavior.
3. At a shallow touch scroll, Back and Appearance could leave the usable area before the alternate dock became available. Dock eligibility now measures the actual toolbar targets against the resolved safe inset and drawable viewport. It rechecks settled scroll, reveal and viewport changes, retaining document scrolling and the desktop fallback. Measurements after React commits use a cancellable animation frame.

No canonical scripture, punctuation or provider order changed. Scrolling and reaching the end still never complete a bani automatically. Current source includes the parallel Stories feature without removing or rewriting its implementation; this is not a comprehensive Stories acceptance claim.

## Current evidence

| Acceptance area | Result and record |
| --- | --- |
| All artwork and Home composition | **80 production scenes, 1,280 assertions passed**. All fifteen served image files match their candidate source bytes. Portrait/landscape in both themes, enlarged narrow/landscape layouts and Punjabi/Hindi cases passed. Actual Apply, another draft's Cancel, reload persistence and Home → full Hukamnama reader passed. [Matrix](../../artifacts/pwa-acceptance-20261021/artwork/v25-run-1/artwork-matrix.json). |
| Home accessibility | Six automated WCAG A/AA scans found **zero violations**. This is bounded automated evidence, not a claim of complete accessibility or VoiceOver testing. The matrix above retains each result. |
| Standalone layout and reader controls | **81/81 checks across eight cases passed** on the final v25 build: full/short drawable heights, safe-area spacing, enlarged text, keyboard-sized shrink, pageshow/orientation recovery, shallow/deep reader controls, sheets and Back. The complete 2,019-line Sukhmani IDs/text match the unmodified official fixture in order. [Final run](../../artifacts/pwa-acceptance-20261021/standalone/run-3/validation.json), [review and preserved failure](../../artifacts/pwa-acceptance-20261021/standalone/acceptance-review.md). |
| Real worker failure recovery | Both reproduced failures pass with the actual final generated worker: a rejected new installation preserves a usable offline Home; a 503 navigation returns the saved app. [Final lifecycle result](../../artifacts/pwa-acceptance-20261021/candidate-sw-lifecycle.json), [original failures](../../artifacts/pwa-acceptance-20261021/before-sw-lifecycle.json). |
| Offline reading and interruption | **21/21 checks passed** using real worker control and an actually offline browser context. Editor Save and Cancel/Discard, artwork Apply, theme/font changes, exact place, offline Home and deep URL reload, explicit completion/Undo and reopen persistence passed. A successful update waited without reloading or moving the active reading; it activated after the reading page closed. [Journey](../../artifacts/pwa-acceptance-20261021/offline-journey-v25/validation.json). |
| Exact readings and honest recovery | All 337 Medium Rehras IDs/text match between online and offline renderings. The saved verse returns to the viewport after fonts/layout settle. An uncached Long Rehras shows the unavailable/retry state, then loads its correct 439 lines after reconnecting, retaining a separate place and no false completion. Same journey record. |
| Affected regressions and static checks | **89/89 tests across eight files passed**, including worker execution, reader interaction, standalone metrics, exact places and offline reading. Full ESLint and production TypeScript/build/startup checks passed. [Tests](../../artifacts/pwa-acceptance-20261021/affected-tests.json), [lint](../../artifacts/pwa-acceptance-20261021/lint.log), [build manifest](../../artifacts/pwa-acceptance-20261021/candidate-v25/build-manifest.json). Earlier 706-case v23 regression coverage remains historical and is not added to this count. |
| Independent review | No actionable findings in the worker, reader interaction and regression changes, including the final animation-frame follow-up. [Independent source review](../../artifacts/pwa-acceptance-20261021/independent-review.md). |

## Build identity and delivery

The exact source is isolated at `/Users/japgrover/.codex/naamras-candidates/20261021-v25-pwa`. The snapshot includes 603 web source/build inputs, with fingerprint `da6c2e4c939b9f8511f9093466972fab955ece455bb9dc7aa36e864f6869becb`. Neither v23 nor v24 was overwritten.

- Production index SHA-256: `85d55974eacd8cd334cad887f41037cec540007209ec46b8645d22b154fdfe9e`.
- Generated worker SHA-256: `58ff9212af664cfe9e7eb199dd39e9029819a9ef3ec07de78c94e030effb2e41`; cache version `0e865b7789f8`.
- [Local production preview](http://127.0.0.1:5194). This is a local review preview; no public deployment was performed.
- [Web-only ZIP](../../artifacts/pwa-acceptance-20261021/candidate-v25/naamras-v25-pwa-web.zip), 55,447,047 bytes; SHA-256 `7b4e3c7edeaea06d01be6d0d7c8dcd00655bb955fc950655ddff4afacf773369`. All 299 extracted files match the tested build.
- [Source manifest](../../artifacts/pwa-acceptance-20261021/candidate-v25/source-manifest.json), [build manifest](../../artifacts/pwa-acceptance-20261021/candidate-v25/build-manifest.json), [strict package proof](../../artifacts/pwa-acceptance-20261021/candidate-v25/final-snapshot-proof.json) and [package notes](../../artifacts/pwa-acceptance-20261021/candidate-v25/README.md) preserve file-by-file identity and delivery instructions.

## Screenshots

Actual final production captures include the full Home and Daily Nitnem below the artwork/Hukamnama:

- [Eclipse light](../../artifacts/pwa-acceptance-20261021/artwork/v25-screens-final/home-eclipse-light-390x844.png) and [dark](../../artifacts/pwa-acceptance-20261021/artwork/v25-screens-final/home-eclipse-dark-390x844.png).
- [Portrait medallion light](../../artifacts/pwa-acceptance-20261021/artwork/v25-screens-final/home-gurmukhi-floral-medallion-light-390x844.png) and [dark](../../artifacts/pwa-acceptance-20261021/artwork/v25-screens-final/home-gurmukhi-floral-medallion-dark-390x844.png).
- [Wide court light](../../artifacts/pwa-acceptance-20261021/artwork/v25-screens-final/home-court-mural-light-390x844.png) and [dark](../../artifacts/pwa-acceptance-20261021/artwork/v25-screens-final/home-court-mural-dark-390x844.png).
- [Light reader shallow controls](../../artifacts/pwa-acceptance-20261021/standalone/run-3/reader-full-light-hukamnama-shallow-revealed.png), [dark reader shallow controls](../../artifacts/pwa-acceptance-20261021/standalone/run-3/reader-short-dark-sukhmani-shallow-revealed.png), [offline exact resume](../../artifacts/pwa-acceptance-20261021/offline-journey-v25/offline-deep-resume.png).

## Precise limits

These runs use real Chromium rendering, document scrolling, service workers and CacheStorage. Supplied `navigator.standalone`, screen dimensions, safe-area tokens and enlarged root fonts are explicitly labeled browser proxies. They do not reproduce physical Safari status bars, OS text handles, VoiceOver, an OS keyboard or a real device's compositor and long-session comfort. The owner removed those device/signing acceptance gates; they are not reasons to hold this PWA goal open.

Official full provider payloads were replayed unmodified for deterministic browser checks; optional unavailable requests were deliberately aborted and recorded. The worker does not cache API responses indiscriminately. Canonical readings use the existing validated exact-reading cache. Art that is not available in a newly activated worker's runtime cache can show the existing honest unavailable fallback offline; this is not a claim that every artwork is precached.

The global literal CSS-selector scanner reports three supported dynamic Story motif classes (`river`, `journey`, `bowl`) as missing. Independent review confirmed `StoryArtwork` emits those typed classes at runtime. This is a scanner limitation, not three missing product styles; the parallel Story implementation was preserved. All artwork/reader changes have passing runtime geometry and affected checks.

The software acceptance supports a polished PWA handoff. It does not establish literal perfection, guarantee subscription value or authorize public deployment.
