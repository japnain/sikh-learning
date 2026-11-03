# Home artwork source-quality follow-up

## Changes

Five Home images now retain their verified full-resolution source bytes. No AI detail generation, sharpening, enlargement, stretching, or crop was applied to these replacements.

| Artwork | Previous source | Current source |
| --- | --- | --- |
| Devotional interior | 832 × 592 | 1951 × 1400 museum-sourced WebP |
| The sarovar, 1854 | 960 × 647 | 3400 × 2290 JPEG |
| Akal Takht, 1864 | 960 × 623 | 2500 × 1623 JPEG |
| Beneath the canopy | 959 × 1280 | 1100 × 1467 JPEG |
| In the shade of the tree | 960 × 720 | 1100 × 825 JPEG |

Source links and limitations are recorded in [the source register](../design/home-artwork-sources-20261102.md). Devotional interior also receives a thumbnail made from the upgraded scan. The legacy share catalog remains intact.

All 19 Home frames use the smaller of their individual composition limit and one third of the actual source width. This keeps a minimum of three source pixels per CSS pixel, including on the largest layout. Existing low-resolution sources are displayed smaller; their underlying detail has not been invented. String and tabla and the full-border Floral teacher mural still lack verified higher-detail replacements. Other source-limited images also benefit from the frame limit.

## Verification

- 93 targeted tests passed across Home, artwork utility, store, hook, and picker suites.
- Application TypeScript check and final production Vite build passed.
- Startup bundle audit passed: 152.3 KiB gzip JavaScript / 190 KiB budget, 12.8 KiB gzip CSS / 36 KiB budget. Larger paintings remain outside the eager startup graph.
- Live browser audit: 19 images × 3 widths (390, 768, 1440px) × 2 themes = 114 cases. All loaded; minimum measured source density was 3.0; no horizontal overflow; every image used contain. Maximum aspect-ratio rounding error was under 0.0002.
- Actual replacement pixels in the browser matched all five source dimensions above. The original artwork preference, theme, and browser viewport were restored after QA.
- Independent source/code review found no blockers. Scoped whitespace checks passed.

Evidence: [resolution matrix](evidence/home-artwork-quality-20261103/resolution-matrix.json), [upgraded interior on Home](evidence/home-artwork-quality-20261103/devotional-light-mobile.jpg).

This report records verification performed before publication. Source pixel density is a display-quality guard, not a guarantee that an unknown upstream photograph was never enlarged. Artwork paint texture, age, cracks, and naturally soft brushwork remain visible.
