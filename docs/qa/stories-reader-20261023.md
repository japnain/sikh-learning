# Stories reader acceptance — 23 October 2026

## Scope

The story flow is Read → Stories → published reading → source/appearance sheets → Saved/resume and downloaded text. Substantial unpublished pilots use the same reader at the development-only `/stories/drafts/:storyId` route, with section navigation and without writing published Saved or reading-position state.

## Automated acceptance harness

`scripts/qa/stories-reader-acceptance.mjs` runs an isolated temporary Chromium profile and checks light/dark, each at 100% and 200% root text size. The default viewport is 320 × 568; `--width` and `--height` also support the desktop matrix. It records screenshots, DOM layout measurements, axe WCAG A/AA violations and browser exceptions in a JSON report.

It exercises:

- Published catalog/shelf parity, with the eight-reading starter shelf distinct from unpublished drafts.
- Source roles, edition information and truthful pending review metadata in the account sheet.
- Focus restoration after dismissing account and appearance sheets.
- Durable text download, Saved state and paragraph resume after leaving and reopening a published reading.
- Content-cache fallback after reload with story JSON transport blocked. This is a text-cache test, not a claim that an installed PWA or native app works fully offline.
- Semantic section selection and heading focus in a substantial pilot.
- Appearance changes in the pilot, with no writes to the published Saved/reading-position record.
- Horizontal document overflow, clipped controls and sheets outside the viewport.

Run against a current development build:

```sh
node scripts/qa/stories-reader-acceptance.mjs --url=http://127.0.0.1:4191/ --output=tmp/stories-qa/acceptance.json
node scripts/qa/stories-reader-acceptance.mjs --url=http://127.0.0.1:4191/ --width=1280 --height=900 --output=tmp/stories-qa/desktop/acceptance.json
```

The longest available sectioned local pilot is chosen automatically; `--draft-id=becoming-the-khalsa` can choose a specific draft. The browser must be able to open the development build because drafts are intentionally absent from production.

## Execution evidence

| Matrix | Cases | Captured surfaces | Layout issues | Axe violations | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| 320 × 568, light/dark, 100/200% text | 4 | 24 | 0 | 0 | Passed |
| 1280 × 900, light/dark, 100/200% text | 4 | 24 | 0 | 0 | Passed |

All eight cases completed the functional source, contents, appearance and preview-isolation checks with no unhandled browser exceptions. The normal-text light case at each viewport also verified all eight downloads, Saved persistence, paragraph resume (`p5`) after leaving/reopening, and rendering from cached story text after blocking story JSON transport on reload.

The matrix exposed two large-text defects which were fixed and retested: modal headers/bodies could exceed the viewport, and an implicit shelf grid track could expand cards beyond the content width. Sheets now constrain their height and scroll internally; their close targets remain visible. Explicit shrinkable grid tracks and wrapping headings keep cards and Save targets inside the shelf.

The final machine-readable results are `tmp/stories-qa/acceptance.json` and `tmp/stories-qa/desktop/acceptance.json`, each with `status: passed` and `failureCount: 0`. Screenshots cover browse, published reader, source sheet, pilot reader, contents and appearance. Desktop light reading, narrow dark reading and the 200% source/contents sheets were also visually inspected.

The original acceptance run used a production preview at port 4190 and an editorial artifact at port 4191. The resumed acceptance run used the actual Vite development server at `http://127.0.0.1:4191/`; its draft route is not the production deliverable. The shell environment blocks local server/Chromium access; the completed matrices ran through the available Node execution tool with isolated temporary Chromium profiles.

## Original supporting checks

- 11 focused and adjacent test files: **107 tests passed**.
- App and tooling TypeScript checks: passed.
- Full ESLint and CSS selector audit: passed.
- Corpus validation: **8 published readings / 3,737 words**, plus all three unpublished pilots passed.
- Production Vite build and startup bundle audit: passed.
- `stories:verify:build`: passed; built catalog/text match the source eight, while draft modules, unique prose and preview routes are excluded. This check is part of the normal build command.
- Capacitor iOS web-asset/plugin sync: passed after the final build.
- `git diff --check`: passed.

## Resumed implementation audit

The saved work was rechecked after reconnection. The resumed pass fixed two publishing-model gaps: semantically identical series metadata now compares independently of JSON field order, and replacement drafts cannot decrease the reading revision or change prose/paragraph IDs through a metadata-only update. Both the source CLI and production artifact checks require explicit source roles/editions, rights records and editorial status; the runtime still accepts legacy offline editions.

Fresh source checks corrected the omitted printed p. 3 locator in Khivi's replacement draft and removed a repeated Kartarpur transition from Mardana (now 1,383 words). Independent review statuses remain pending. A nullable toolbar-style guard in the shared Bani hook was also made explicit to unblock the app-wide TypeScript check; the hook's tests pass.

- **111 tests passed across 11 files**: repository, draft loader, actual corpus, reader, shelf, Saved integration, story persistence, shared reader interaction and navigation/scroll helpers.
- App and tooling TypeScript, full ESLint, source/draft validation, production Vite build, startup bundle audit, production story validation/draft exclusion and `git diff --check`: passed.
- The CSS selector audit reported three unused selector branches in the concurrently edited Home Nitnem stylesheet; no story selectors were reported.
- Fresh browser evidence is in `tmp/stories-qa/resume/mobile/acceptance.json` and `tmp/stories-qa/resume/desktop/acceptance.json`: **8 cases / 48 surfaces, 0 failures, 0 layout issues, 0 axe violations, 0 browser exceptions**. Saved/resume, blocked-transport text fallback, sources, section focus, shared appearance and draft isolation passed. Desktop light reading and the narrow dark 200% contents sheet were visually inspected.

The external dependency cache is read-only from the shell. Vitest used `--configLoader native --cache=false` (or `--configLoader runner`); TypeScript build info was redirected into `tmp/`, and Vite used `--configLoader native`. The production build ran all normal build stages with those cache-path adjustments. Native sync/build acceptance was not repeated in this pass.

## Editorial and scan follow-up

After the requested separate AI English/history reviews and source-image comparison, the accepted corrections were reread by the reviewers. The complete editorial disposition, page coverage and final hashes are in `content/stories/reviews/2026-10-23-review-summary.md` and its linked evidence manifest. The human review fields remain pending.

The final reviewed packages passed source/draft corpus validation and **73 tests across six focused files** (actual corpus, repository, draft loader, reader, browser shelf and story store). Both app and tooling TypeScript checks passed with project-local build-info paths. The final production Vite build, startup bundle audit and built-story validation passed: eight public readings match source, and all three pilots remain excluded. `git diff --check` and the final eleven-package SHA-256 consistency check passed.

This pass changed prose/citations and editorial records; it did not repeat or expand the browser, native-device or VoiceOver acceptance matrix. The earlier browser results retain their stated scope.

## Remaining acceptance

Physical iPhone, VoiceOver, a new native binary build and installed native/PWA offline acceptance remain separate checks. The subsequent separate AI English/history reviews and cited-page visual comparisons are documented in `content/stories/reviews/2026-10-23-review-summary.md`; they are not outcomes of browser tests. Human English and Sikh history/Gurmat reviews remain pending before the pilots enter the public catalog. No new book-wide edition authentication or permission to reproduce the modern comparison translation is claimed.
