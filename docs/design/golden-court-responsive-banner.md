# Golden Court responsive Home banner

Created 17 November 2026 for the requested wider, screen-responsive Home artwork.

## Image provenance

- Original: `src/assets/share-highlights/12-golden-court-assembly.jpg`, 1199 × 1476. Its creator, acquisition source and date remain unverified. A bounded search did not establish a matching higher-resolution or landscape reproduction.
- Wide adaptation: `src/assets/home-artwork/golden-court-assembly-wide.jpg`, 1774 × 887. Generated with OpenAI image generation using the original portrait as the reference, requesting a 2:1 landscape continuation of the courtyard, gardens and sky without additional figures.
- This is a generated adaptation, not a recovered historical original, archival restoration or pixel-identical extension. The model also re-rendered details within the central scene. The original file remains unchanged and is used on narrow screens, in the gallery, for sharing and in onboarding.
- The generated PNG was encoded as JPEG at quality 90 for web delivery. Dimensions were retained; no crop, stretch, sharpening or upscaling was applied during encoding.
- The wide presentation is disclosed in the artwork's About information. Neither generation nor format conversion establishes rights in the underlying reference; its register entry retains the existing unresolved source status.

## Layout

Golden Court uses the available phone width with the original portrait ratio. Tablet and desktop widths select the complete 2:1 adaptation. The Home arrival section uses the available page width on desktop, followed by the reading and practice content. Other artwork selections retain their previous composition rules and source files.

The browser selects the responsive source. A failed wide-image request falls back to the original portrait. The saved artwork ID and personal reading state remain unchanged.

## Verification

- 94 focused Home/artwork tests passed, including wide-source failure, original fallback, explicit reapply retry and localized adaptation disclosure.
- TypeScript, targeted ESLint, the 34-file CSS selector audit, the complete production build and content-rights inventory check passed. The strict rights release gate remains unresolved; the inventory now contains 109 entries / 288 files / 107 unresolved entries.
- The production preview selected the original on a 390px viewport (354 × 436 rendered pixels) and the wide asset at 768px (732 × 366), 1280px (1140 × 570) and 1440px (1300 × 650). No horizontal document overflow was measured; the image uses contain and retains its selected source ratio. Phone and desktop screenshots were visually inspected.
- The previous 1280px layout rendered the portrait at approximately 309 × 380 pixels. The wider layout now uses the available Home width. The full artwork can extend below the initial viewport; ordinary page scrolling exposes it.
- These are local production-preview and emulated viewport checks, not physical-device certification. No push or deployment was performed.
