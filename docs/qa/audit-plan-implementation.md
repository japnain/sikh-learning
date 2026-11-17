# Audit plan implementation

Implemented from verified `master` `1f1c042cacc507528f999f8072ed970f3d9bedbb` on isolated branch `fix/audit-plan`. The original checkout and its untracked work were preserved. No push, deployment, production account mutation, database migration, or content deletion was performed.

## Issue disposition

| Issue | Candidate change | Status / remaining proof |
| --- | --- | --- |
| SEC-01 | Owner-separated personal state, clocks/events/recovery, explicit idempotent local import, identity-pinned sync/delete requests, stale UI/reader cleanup guards | Implemented; synthetic/local-browser verification. Real sandbox account lifecycle remains open. |
| ENG-01 | One strict versioned contract for all eight reader preferences; legacy migration and transactional owner-bound backups | Implemented; actual browser export/restore/reload plus regression tests. |
| ENG-02 | Removed unused library image selector | Implemented; CSS gate restored. |
| ENG-03 | Private reader and annotations use shared app scrolling; outgoing-owner cleanup cannot save into incoming account | Implemented; architecture, component and synthetic browser checks. |
| ENG-04 | Browser harness follows current controls, actual reachable hit targets and the overview's saved Continue entry | Implemented; repaired checks retain offscreen/occlusion detection. |
| UX-04 | Bookshelf switches to readable full-width cards when narrow, enlarged or sparse | Implemented; three locales, phone/tablet/desktop/landscape, 100/200% text. |
| OFF-01 | Automatic routine readiness requires matching cached reader shell as well as text; actionable partial-readiness retry | Reproduced and fixed; production-build fault check. |
| UX-01 | Manifest and prepaint use an intentional paper launch fallback | Implemented; metadata and icon checks. Actual installed cold-launch appearance remains open. |
| READ-01 | Source-checked display-title overrides for Panth Prakash episodes 014/019, applied through importer | Implemented; original text, identifiers, ordering and edition provenance preserved. |
| READ-L01 | Scroll navigation says Section; paged/PDF navigation says Page | Implemented; explicit component contract and browser coverage. |
| READ-02 | Documented applicable public/private/original-format settings | Scope clarified; no speculative parity or reader redesign. |
| SEC-03 | Bundled missing OFL notices, pinned font/notice hashes, accessible notices page and source/build validation | Packaging fixed; historical download URL provenance for three existing binaries remains incomplete. |
| SEC-02 | Fingerprinted content-rights register and strict release gate | **Blocked:** 2 approved / 106 unresolved decisions across 287 files; no unsupported clearance or asset removal. |
| UX-02 | Portrait directive retained pending installed-host behavior | Device verification required; no unproven accessibility claim. |
| UX-03 | Existing pottery/navigation identity retained | Optional redesign deferred as directed by the plan. |

## Integrity and deployment boundaries

No sacred text, Bani variants, book body paragraphs, source order, EPUB bytes, saved chapter/block identifiers or content-download schema changed. The catalogue importer changes display metadata only and retains the original edition wording in source/provenance fields.

The backend inspection was read-only: all seven migration records including annotations were present; deployed private-library v4's seven source files matched the baseline; fourteen application tables had RLS and the five private tables retained forced RLS/service-role-only access. This verifies configuration/source, not end-to-end authorization. See [backend verification](backend-readonly-verification.md).

The onboarding sheet is lazy-loaded so its additional privacy-notice dependencies do not exceed the unchanged 190 KiB startup budget. The loading state remains accessible and deep links survive onboarding. Owner changes remount the app UI after all registered personal stores finish switching; the route is retained while old forms are dismissed.

## Verification

The coordinated application patch was frozen before the final run. Node **22.23.5** used a fresh `npm ci` installation of the unchanged lockfile. The production build used the project's public client configuration for read-only pack requests; no account/session was supplied. Earlier targeted counts in the linked notes overlap and are not added to these totals.

| Final check | Result |
| --- | --- |
| `npm test` | **3,252 / 3,252 tests; 213 files**, all seven batches passed. |
| CI Node script tests | **48 / 48**: credentials, browser fixtures, budgets, environment, web addresses, public artifacts, importer, font notices and rights inventory. |
| `npm run lint`; CSS selectors | Passed; 34 CSS files. Later fault-runner instrumentation also passed targeted lint. |
| `npm run build` | Passed typecheck, bundle, startup, notices, story publication and artifact privacy checks. Initial JS **183.9 / 190 KiB gzip**, CSS **11.4 / 36 KiB**; backend/PDF remain lazy. |
| Production browser suite | Passed 9 Bani/Home surfaces, published Stories, 18 reader/Folio scenarios, **42 Read/Books cases**, 4 Daily/More configurations and 12 navigation route/viewport journeys plus standalone orientation. |
| Automated accessibility | Passed **60 route checks, 33 expanded states and 4 share dialogs**; not a full WCAG certification or physical assistive-technology test. |
| Owner-isolation browser fixture | Passed 4 real-browser-storage/Web Lock journeys, including A→guest→B→A, reload and simultaneous explicit import. Synthetic owners; not real Auth. |
| Backup browser | Actual download/upload/replace/refresh/re-export retained all 8 fields; public reader's supported appearance remained identical. |
| Private-reader browser fixture | 3 configurations × 8 checks: section/page navigation, sheet position, mode continuity, page turn, highlight, note, reload and Escape focus; 320px, 390px/200% text, 844px landscape. Synthetic book/local persistence. |
| Public offline corpus | **108 packs / 118 distinct versions** fetched from the actual public service; integrity/defaults/places preserved. Cold browser restart offline passed all 14 length variants and 4 Shabad OS readings, bookmarks/contents/resume and light/dark phone/desktop checks. |
| Missing-shell fault | Configured production build correctly reported `shell-unavailable`, retained text, offered Retry and failed cold reopening as predicted with zero service workers. Final instrumented runner passed in 35.6s. |
| Catalogue/stories/native catalogue | Library and 8 published stories verified; generated native catalogue remained byte-identical (103 readings). Chapter body/source locators remained unchanged. |
| Source/artifact privacy | 1,155 tracked text files and 325 built text artifacts passed their respective scanners. |
| Rights | Inventory valid: 108 decisions / 287 files. Strict release check **intentionally fails: 106 unresolved decisions**. |

The initial configured missing-shell harness timed out without locating the wait. Bounded navigation, scoped Retry selection, step diagnostics and explicit connection teardown made the same assertions reproducible; no product failure was reproduced in the successful rerun. Exact upstream OFL files retain their original trailing spaces and pinned hashes; implementation whitespace checks exclude those unchanged upstream bytes.

Logs and synthetic evidence are retained under the task workspace's `work/candidate-*` paths; detailed notes identify reproducer scripts. Original audit evidence remains historical and has not been relabelled as candidate verification.

## Recovery and rollback

Account partitions and original unowned local data are retained. Import requires an explicit owner-bound choice; legacy data is never assigned to the next signer automatically. Storage, hydration, concurrent-tab or restore failures keep sync paused. Failed writes and conflicting durable data remain separate until explicit recovery. A successful validated restore may resolve recovery; a failed restore must not clear an earlier recovery hold.

Do not roll back only the partition adapter, namespace, metadata or sync guards: restoring the old shared-key automatic uploader reopens SEC-01. Prefer a forward fix; emergency containment must keep synchronization disabled. Do not flatten account partitions, clear original records, or attempt to infer and rewrite historical cloud ownership. The compatible eight-field preference contract must remain with older reader code to avoid export loss. Display metadata and CSS changes can be reverted independently without changing source text or saved locators.

## Remaining release requirements

- Two controlled synthetic accounts in a dedicated sandbox: login/logout/expiry, concurrent SDK logout, ownership read-back, restore/delete, private access revocation and annotations. No sandbox was available; production users were not used as test fixtures.
- Physical iPhone Safari, installed iOS/Android PWA, VoiceOver/TalkBack, rotation and low-memory/endurance/performance checks. Chromium emulation is not equivalent evidence.
- Resolve the strict content-rights gate, including default Golden Court, public editions/translations/datasets and audio; recover missing historic font provenance. See [rights and fonts](rights-fonts-implementation.md) and [bounded artwork review](wikimedia-artwork-review-20261117.md).
- Authenticated large private EPUB/PDF integration and failure recovery. Synthetic reader tests establish component behavior only.
- Native callback/build/App Store readiness remains outside this web patch; no native readiness is claimed.

## Detailed change notes

[Accounts](account-isolation-implementation.md) · [Backups](backup-schema-implementation.md) · [Reader/scroll](reader-scroll-implementation.md) · [Books browser](books-browser-implementation.md) · [Offline/launch](offline-launch-implementation.md) · [Catalogue metadata](catalogue-metadata-implementation.md)
