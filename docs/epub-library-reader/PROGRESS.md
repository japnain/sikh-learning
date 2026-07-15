# EPUB Library Reader Progress

## Status

Complete.

## Completed

- Set the active implementation goal.
- Audited the existing importer, repository, reader, tests, and dirty-worktree overlap.
- Inspected both supplied EPUBs, including ZIP integrity, metadata, spine, navigation, XHTML quality, page alternation, and checksums.
- Reviewed the supplied facing-page source screenshot.
- Compared foliate-js, epub.js, and a sanitized first-party reader.
- Chose a safe build-time publication pipeline with a Readium-shaped locator contract.
- Captured product and implementation decisions in research and phase documents.
- Added an additive generic EPUB importer with EPUB 3 nav and EPUB 2 NCX support, semantic plain-text extraction, checksums, provenance, lazy per-work search, and stable routes.
- Imported both supplied volumes as one work with two publications, 169 episodes, 637 readable English source pages, and 7,979 bounded semantic blocks.
- Preserved the exact source EPUB bytes and SHA-256 hashes under the generated work assets.
- Replaced the OCR spread UI with a data-driven book overview and focused reflowable reader.
- Added contents search, volume filtering, lazy full-text search, reading settings, previous/next navigation, and exact block locators.
- Added automatic library discovery in the Read → Books surface so future imported works appear without component changes.
- Normalized duplicate source headings, meter labels, display titles, and typographic footnote markers while retaining the source body wording.
- Added keyboard focus management, modal focus restoration, end-of-document progress clamping, and phone/desktop responsive layouts.

## Verification

- `npm run library:build` and `npm run library:verify`: passed.
- Full Vitest suite: 337 tests passed.
- TypeScript and targeted ESLint: passed.
- Production build: passed.
- Accessibility sweep: 51 WCAG 2.2 AA route checks passed.
- CSS selector audit: 9 files passed.
- Visual and interaction QA: passed at 390×844 and 1280×900 with no overflow, console errors, failed requests, or internal EPUB filename leakage.
- Final progress QA: the last locator remains `episode-001-p53-b015` with chapter progression `1` after observer updates settle.

## Source limitations

- The two EPUBs contain no authentic Unicode Gurmukhi and no scan images.
- Their even main-text pages are failed source OCR, not a usable Punjabi edition.
- Normalization will preserve wording and source locators but will not invent or silently correct missing source text.
- The current upload path is a curated build-time command. Personal in-app file uploads remain a separate future trust, storage, and moderation feature.
