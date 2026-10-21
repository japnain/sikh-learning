# NaamRas artwork navigation — v28

> Evidence note: `artifacts/` links and localhost previews in this document refer to preserved local QA records, which are excluded from Git. Historical build results apply only to their named snapshots; the current session-only push scope is recorded in [pre-push readiness](session-prepush-readiness.md).

October 21, 2026. The replacement navigation is implemented and its affected PWA checks passed. The owner-rejected v27 visuals are preserved history. This is a reviewable delivery; owner approval and literal perfection are not implied.

The new family uses a courtyard facade, bound pothi, folded ribbon and four arched jaali panels. Broad inked forms replace thin decorative inserts. The selected capsule is removed; familiar labels, the underline and theme-aware brass remain. The compact bar stays in its current bottom position; desktop and immersive-reader policies remain. [Design rationale](../design/artwork-navigation.md).

| Final check | Result |
| --- | --- |
| Navigation | **581/581 assertions across 12 fresh contexts**, no interruptions/page errors. Four real destinations, nested routes, Tab/Enter, 44px targets, active shape, content clearance, full/short standalone safe areas, 320px, landscape, desktop and 200% Punjabi/Hindi. [Record](../../artifacts/navigation-20261021/production/run-3/validation.json), [review](../../artifacts/navigation-20261021/production/run-3/review.md). |
| Accessibility | Five scans, **zero violations**. The discovered More introduction contrast failure was corrected with the existing muted-text token. |
| Reader and offline | **21/21 final-build checks**: real worker control, exact verse and all 337 Medium Rehras lines, offline Home/deep-reader reopen, saved preferences/routine, Save/Cancel, explicit completion/Undo, waiting update and 439-line Long Rehras reconnection. [Journey](../../artifacts/navigation-20261021/offline-journey-v28/validation.json). Immersive reader isolation and shallow controls also passed in the navigation matrix. |
| Tests/build | **42/42 current NavBar/App/More tests**, full ESLint, TypeScript/production build and startup audit passed. [Tests](../../artifacts/navigation-20261021/revised-nav-tests.json), [lint](../../artifacts/navigation-20261021/revised-lint.log), [build](../../artifacts/navigation-20261021/candidate-v28/build-manifest.json). Unchanged earlier PWA regressions retain their own provenance and are not added to this count. |
| Independent review | No further concrete visual/source correction identified after actual 1× inspection. [Review](../../artifacts/navigation-20261021/independent-review.md), [source binding](../../artifacts/navigation-20261021/v28-independent-source-proof.json). No owner approval is inferred. |
| Package | All **604 source inputs**, **299 web files** and every ZIP entry verified. No environment files included. [Integrity proof](../../artifacts/navigation-20261021/candidate-v28/final-snapshot-proof.json). |

The literal CSS scanner retains only the three documented dynamic Story motif false positives, with no navigation finding. [Analysis](../../artifacts/navigation-20261021/css-analysis.json). Parallel Story work was preserved.

Actual final 1× captures: [light bar](../../artifacts/navigation-20261021/production/run-3/bar-light.png), [dark bar](../../artifacts/navigation-20261021/production/run-3/bar-dark.png), [light Home/Nitnem](../../artifacts/navigation-20261021/production/run-3/phone-full-light-home.png), [dark Home/Nitnem](../../artifacts/navigation-20261021/production/run-3/phone-full-dark-home.png), [light More](../../artifacts/navigation-20261021/production/run-3/phone-full-light-more.png), [dark More](../../artifacts/navigation-20261021/production/run-3/phone-full-dark-more.png). The same folder preserves Read and Saved in both themes.

[Local production preview](http://127.0.0.1:5198) · [Verified web ZIP](../../artifacts/navigation-20261021/candidate-v28/naamras-v28-pwa-web.zip).

The exact source is `/Users/japgrover/.codex/naamras-candidates/20261021-v28-pwa`; fingerprint `7788315796a8dc6ecb242f393e8180667db953f4bc08dfaa26a1a285cfdf496d`. Index SHA-256 `e1c8c44c6c94d7fbca5169f78d09fa2d209fe77efbdb8899a34d14e455360884`; worker SHA-256 `449cb4d0934908d99d2f719bee215bb18b6b546b71bf90f8b98e9e3c6bbbbe1e`, cache version `d60d56716741`. ZIP SHA-256 `44f16ba3d37f94c900ead962952b260a9661ae407e99e0eedac85c7c3edcaac1`, 55,447,599 bytes. [Source manifest](../../artifacts/navigation-20261021/candidate-v28/source-manifest.json) and [delta from rejected v27](../../artifacts/navigation-20261021/candidate-v28/delta-from-v27.json).

Safe-area/standalone/root-font scenes are controlled Chromium proxies, not physical Safari, OS keyboards, Dynamic Type or VoiceOver. Real service workers, offline contexts and CacheStorage were used separately. Official fixtures were replayed unmodified; optional unavailable requests were recorded. The owner's aesthetic feedback remains authoritative. No native build, signing gate or public deployment was added. Earlier Home/artwork/reader evidence remains in [PWA Home/reader acceptance](pwa-home-reader-acceptance.md) with its actual v25 provenance.
