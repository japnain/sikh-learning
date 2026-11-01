# Read release validation — 1 November 2026

The release was assembled on remote `master` at `fcd080eafb0a015d141dcdab826964d890e89929`, independently of the shared working branch. It contains the Read audit fixes, researched names and context for all 104 provider banis plus Zafarnama, catalogue deduplication, and the 1 November source-review corrections.

## Scope and preservation

- 104 changed files: 52 existing files and 52 additions, including this release record and the audit evidence.
- The entire starting tree was reconstructed and checked against the Git blob hashes from remote master. Every existing file outside the selected Read changes remained identical.
- `Study.tsx`, `StudyCard.tsx`, `ReaderHeader.tsx`, `useReaderHeaderLayout.ts`, `appScroll.ts`, `readerAnchor.ts`, and `persistent-reader-header.css` remained byte-for-byte identical to master. No Bani scroll implementation was replaced.
- Shared files were merged selectively: only Read discovery CSS, the Study test readiness selector, the Shastar opening-selection range correction, and the story-review handoff paragraph were included. Concurrent Study styling and routing changes were excluded.
- Home, backend, native app changes, published story JSON, and bulk book-content changes were excluded. Existing master artwork and introductions were retained.
- An independent scope review found no missing direct imports. A scan of the selected files found no private-key or credential-token patterns.

## Validation of the assembled release

| Check | Result |
| --- | --- |
| Complete Vitest suite, seven sequential batches | 154 files; 1,831 tests passed |
| TypeScript app and node configurations | Passed, no emit and incremental output disabled |
| Full ESLint | Passed |
| Production Vite build | Passed |
| CSS selector audit | Passed, 28 stylesheets |
| Browser-fixture and startup-audit Node tests | 7 passed |
| Startup bundle audit | Passed; initial JavaScript 151.7 KiB gzip, CSS 12.8 KiB gzip |
| Public asset copy and story build verification | Passed; 8 published readings, 3 editorial drafts excluded |

The test runner used the complete repository test inventory with `--configLoader runner --no-cache --maxWorkers=2` and sequential batches. The isolated checkout reused the workspace's installed dependencies; Vite used `--configLoader runner` to support that arrangement.

The [Read remediation report](2026-10-31-read-remediation.md) records the earlier visual and interaction checks. The [source-review follow-up](2026-11-01-read-source-review.md) records the independently reviewed context corrections. Their recorded local test totals and content-review snapshots describe those earlier runs; the table above is the validation of this exact isolated release.

This release validation did not include a fresh browser server session or physical iPhone run: the execution environment could not bind a local server or access the device services. Hosted CI and device verification are separate from the successful checks above.
