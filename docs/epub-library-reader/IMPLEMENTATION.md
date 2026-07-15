# EPUB Library Reader Implementation Plan

## Phase 1 — Publication model and reusable importer

Deliverables:

- Extend library types with collections/publications, semantic blocks, provenance, and stable locators.
- Add a generic EPUB import core that reads the container, OPF, spine, metadata, and nav/NCX when present.
- Make catalog and search generation merge by work ID instead of overwriting other works.
- Preserve imported EPUB files and checksums under the work directory.
- Add a documented CLI entry point for future curated EPUB additions.

Verification:

- Import fixtures prove that a second work preserves the first catalog entry.
- Generated paths resolve and imported markup is represented only as typed data.

## Phase 2 — Panth Prakash normalization

Deliverables:

- Add the explicit bilingual Internet Archive OCR profile.
- Import the supplied Volume I and II EPUBs as one work with two publications.
- Generate 169 ordered episode TOC entries from English source pages.
- Split episode headings, meter labels, numbered verses, prose, notes, and source-page locators.
- Record excluded source-OCR ranges and an honest quality note in provenance.

Verification:

- All episodes 1–169 exist once and in order.
- No failed source-OCR page is included in the default search or reading payload.
- Episode 1 contains the expected Guru Nanak opening; episode 82 begins the second volume.
- Original source hashes match the supplied files.

## Phase 3 — Collection overview

Deliverables:

- Refactor the Panth-specific overview into a data-driven work page.
- Present the work, translator/edition note, two volumes, continue/start actions, episode browser, and on-demand search.
- Keep `/library/:workId` and the existing chapter deep-link contract.

Verification:

- Overview tests cover both volumes, search, missing work, and resume state.
- No source filename or raw EPUB page-debug UI appears.

## Phase 4 — Focused reader

Deliverables:

- Build focused reader chrome with back, progress, contents, display controls, previous/next, and mobile/desktop layouts.
- Render semantic blocks as accessible headings, verse groups, prose, and notes.
- Persist font size, line height, measure, and reader theme preferences.
- Persist an exact locator (`work`, publication, chapter, block, total progression) and restore it through the resume URL.
- Hide primary navigation on reader routes while preserving existing app-shell changes.

Verification:

- Reader tests cover semantic rendering, TOC, settings persistence, exact resume, navigation, and error states.
- App test proves reader-focus mode hides primary navigation.
- Accessibility checks cover landmarks, button names, focus visibility, reduced motion, and 44px targets.

## Phase 5 — Integration and handoff

Deliverables:

- Update the existing Books entry with accurate metadata using the narrowest possible change.
- Document the future-book import command and profile extension points.
- Run focused tests, full TypeScript, lint on touched files, production build, and visual checks at phone and desktop widths.
- Record known source limitations rather than concealing OCR uncertainty.

Completion criteria:

- The supplied volumes are readable as a polished English edition.
- Catalog, importer, repository, and reader contain no Panth-only assumptions except the isolated normalization profile.
- A future curated EPUB can be added without replacing existing books or changing routes/components.

## Completed outcome

All five phases are implemented. The Panth-specific rules live only in
`scripts/library/profiles/panth-prakash-english.mjs`; the catalog, repository,
Read Books surface, work overview, chapter reader, settings, search, and locator
contracts are work-driven. Future regular EPUBs use `npm run library:import` and
are merged into the existing catalog. The original two Panth Prakash EPUBs are
archived with verified checksums and can be regenerated deterministically with
`npm run library:build`.
