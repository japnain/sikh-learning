# Home artwork composition — October 21, 2026

> Evidence note: `artifacts/` links and localhost previews in this document refer to preserved local QA records, which are excluded from Git. Historical build results apply only to their named snapshots; the current session-only push scope is recorded in [pre-push readiness](../qa/session-prepush-readiness.md).

The accepted direction preserves the existing NaamRas wordmark and all fifteen complete artworks. The art now follows the masthead in normal document flow. Hukamnama follows the art with 1.5rem of breathing room (24px at the standard interface size, 48px in the 200% root-font simulation). Baseline alignment with the date can move the heading ink 1px lower at standard size. No scripture overlays the artwork.

Landscapes retain their native ratio. Portrait sources sit centered in a square stage with their own existing mat; stage height is capped at 400 CSS pixels. Every image uses centered contain, so the source aspect ratio is preserved and the entire composition, frame and border remain visible. The original cropping/protected-subject metadata is preserved for other uses; Home no longer depends on incomplete protected rectangles. No replacement imagery was necessary after visual review.

| Artwork | Actual pixels | Native W:H | Home stage |
| --- | --- | --- | --- |
| court-mural | 1920 × 1080 | 1.7778 | Native landscape ratio |
| interior-audience | 1080 × 1920 | 0.5625 | Square, centered complete image |
| court-assembly | 1200 × 900 | 1.3333 | Native landscape ratio |
| fort-procession | 1100 × 676 | 1.6272 | Native landscape ratio |
| string-and-tabla | 827 × 565 | 1.4637 | Native landscape ratio |
| devotional-interior | 832 × 592 | 1.4054 | Native landscape ratio |
| waterside-temple | 1024 × 1366 | 0.7496 | Square, centered complete image |
| miniature-collage | 1080 × 1920 | 0.5625 | Square, centered complete image |
| rider-and-attendants | 1200 × 510 | 2.3529 | Native landscape ratio |
| falconer-on-horseback | 1200 × 1517 | 0.7910 | Square, centered complete image |
| floral-teacher-mural | 720 × 823 | 0.8748 | Square, centered complete image |
| golden-court-assembly | 1199 × 1476 | 0.8123 | Square, centered complete image |
| gurmukhi-floral-medallion | 675 × 1200 | 0.5625 | Square, centered complete image |
| ceremonial-arms-display | 1200 × 1500 | 0.8000 | Square, centered complete image |
| eclipse | 1178 × 1280 | 0.9203 | Square, centered complete image |

[Actual ratio audit](../../artifacts/home-artwork-20261021/ratio-audit.json) records the original dimensions and old crop findings. [Final browser matrix](../../artifacts/home-artwork-20261021/artwork-matrix.json) covers all 15 at 320/390/430/1440px in both themes, sixteen English 200% portrait/short-landscape scenes, and four Punjabi/Hindi 200% scenes. All 140 passed, with 50 screenshots, no page errors and actual Apply/Cancel verification. The matrix replays an unmodified official Oct21 payload; the earlier three after captures used the live provider. Enlarged root-font testing is a browser proxy and does not establish native Dynamic Type.

[Light collection board](../../artifacts/home-artwork-20261021/all-artworks-light.jpg) and [dark collection board](../../artifacts/home-artwork-20261021/all-artworks-dark.jpg) show the actual application. [Independent review](../../artifacts/home-artwork-20261021/independent-review.md) found no material issue within its stated scope.

A live-content defect was also corrected: the unmarked Ashtpadi heading was being selected as the Home preview. The heading detector now recognizes that terminal form after valid Raag/Mahala/Ghar metadata. Home skips the exact standalone invocation when a body verse follows; the full reading preserves all scripture, punctuation, source order and invocation. [Official provider proof](../../artifacts/home-artwork-20261021/hukamnama-provider-proof.json).

[Hosted design review](https://www.lazyweb.com/report/lazyweb/4b9852aa-50d1-4267-95d5-f02d2da5eefc/?source=create) was generated from the actual pre-change screen and opened. The free preview limitation and provider notice are recorded in [report metadata](../../artifacts/home-artwork-20261021/lazyweb-report.json). No subscription was purchased.
