# Text-first Hukamnama sharing — local verification

> Historical iteration. Superseded by [the 9 October verification](2026-10-09-hukamnama-sharing.md).

Date: 2026-10-06 (America/Toronto). Changes remain local; no commit or push.

Revised after the product owner rejected the QR code and the earlier visual
proofs. The current version is the QR-free `hukamnama-quiet-2026-10-06` iteration.

## Current behavior

- The Hukamnama composer uses `exportShareHighlightHukamnamaPng`, which returns
  one complete PNG rather than a multi-image set. Legacy Story APIs remain for
  compatibility but are not used by this composer.
- All 14 existing share artworks remain available, plus No art. No artwork file
  was generated, replaced, cropped, or edited for this change.
- The complete original artwork is drawn once underneath the scripture, at
  restrained opacity. Its displayed size and opacity decrease as text density
  rises. Paper-colored perimeter feathering softens hard picture edges without
  blurring the artwork itself. There is no separate hero, cameo, reading panel,
  or text shadow.
- Exported images have no QR code, URL, app call-to-action, line-count badge,
  or brand footer. Only a small title/date and a quiet source citation remain.
  The source link is still available in the composer and sharing text.
- Output is 1080 pixels wide, with a compact 1350-pixel minimum height. Short
  readings use larger scripture (up to 64 pixels) instead of empty Story space.
  Longer readings use consistent paragraph/translation spacing, fit down to the
  existing 42-pixel Gurmukhi and 32-pixel support-text floors, then grow taller.
  No source words or verse markers are dropped or silently abbreviated.
- A defensive 8192-pixel height limit rejects unreasonable payloads instead of
  encoding a partial reading or exhausting unbounded canvas memory. This is
  not a promise to fit an arbitrarily long document into one image.
- The preview preserves the actual output aspect ratio. Share and Download
  remain disabled until the newest PNG has decoded and painted successfully.
  Decode/draw failures expose retry; stale work is cancelled and decoding is
  time-bounded.
- Only the artwork choice is remembered locally. Scripture, translations, and
  social notes are not stored in that preference.

## Passing checks

- 260 tests across the sharing feature, artwork manifest, ModalSheet, Study,
  and Home (8 test files).
- TypeScript, scoped ESLint, CSS selector audit, production build, and startup
  bundle audit.
- 90 browser exports: 3 reading lengths × 15 artwork choices × with/without a
  share URL in the input. Both input modes now produce the same quiet design.
  Every case produced exactly one PNG with ordered, complete source coverage.
  Result heights were 1350, 1697, or 2331 pixels. PNG dimensions were read from the
  encoded files, not inferred solely from layout metadata.
- 24 composer checks: short/long × English/Punjabi/Hindi × desktop light,
  phone light, phone dark, and 320-pixel-wide enlarged-text layouts. Zero
  automated accessibility violations, horizontal-overflow failures, or browser
  errors. Keyboard artwork selection, Escape, and focus return passed.
- A real browser download produced one unnumbered PNG. Selected artwork
  survived closing and reopening the composer.
- A synthetic 30-line stress fixture (repeated sample, not a real Hukamnama)
  rendered and decoded as one 1080 × 4789 image with No art, landscape art, and
  portrait art, retaining the 42/32-pixel font floors and all 30 test lines.

Browser verification used isolated Chromium/Brave contexts, the actual sharing
components, bundled fonts, and the existing local artwork. Dependencies were
run from a clean temporary runtime matching the lockfile because the workspace
dependency tree contains unavailable cloud-backed files.

## Evidence

Local proof folder:

`/Users/japgrover/.codex/visualizations/2026/08/11/019ff31f-9f92-73c3-9f29-24a6f7ed2501/hukamnama-quiet-2026-10-06/`

It contains the interactive three-reading `index.html` with an artwork selector,
all 90 PNGs, `revised-preview.png`, `matrix-report.json`, `ui/ui-report.json`,
`stress-report.json`, and the downloaded PNG. Earlier `hukamnama-minimal`,
`hukamnama-text-first`, and intermediate `hukamnama-editorial` proofs are
superseded. All 15 selector choices successfully loaded their three images.
Short/medium export proofs are explicitly labelled excerpts of the Ang 683
fixture; the 13-line long export contains the complete fixture.

## Not yet signed off

- Physical iPhone/Android native share-sheet behavior and recipient-app handling
  of tall images, including cropping or compression by messaging/social apps.
- The product owner's visual approval of the text-first artwork treatment.
- The existing artwork provenance/rights and cultural-review release gate in
  `src/assets/share-highlights/PROVENANCE.md`; this layout work does not clear it.
- Lazyweb references/report could not be produced because no Lazyweb tools were
  exposed in this session. This was disclosed rather than replaced with a
  fabricated report.

The baseline UI skill guided restrained presentation and accessible controls;
the browser-automation skill guided isolated, state-based browser verification.
This is a verified local iteration, not a claim of universal perfection or
release approval.
