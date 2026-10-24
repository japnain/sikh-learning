# Comprehensive audit remediation results

24 October 2026. Implements the authorized follow-up to [the product audit](2026-10-24-comprehensive-product-audit.md). Scope is the current NaamRas web/PWA experience, excluding recitation. Changes are local repository changes; this record is not a deployment or production verification claim. Pre-existing reader, Nitnem and Stories work was preserved.

## Reader-facing changes

- More now offers a personal backup file with a preview and explicit merge/replace choices. The versioned contract covers 22 personal-data domains, including Stories, individual reading places, Nitnem history and practice, vocabulary definitions, and preferences. Credentials and downloaded content are excluded. Validation, write verification and rollback protect restore operations.
- Books can be downloaded by volume or as a complete work. A validated download survives a fresh repository instance and opens without waiting for the network. Failed updates preserve the previous edition. Chapter errors provide Retry and Back to book, and retry on reconnection.
- Saved story text opens independently of catalog metadata. Catalog updates retain the previous downloaded edition until a validated replacement is saved. Removal invalidates late writes; retained editions remain removable.
- Main search shows local book/story results independently of remote scripture requests. Slow sources time out with partial results and Retry. Book results paginate and carry a matching passage query into the reader. Stories collection URLs retain their own filters and return position.
- Rehat Find highlights and navigates matches without removing the chapter. Bani Find supports Devanagari. Vocabulary saves selected, attributed definitions, preserves additional senses and original context, and immediately repeats Again cards.
- More exposes Read/Study mode, names the size slider and meaning selection, and uses the same 16–34 size range as the reader. Setup says Done and explains immediate changes. Nitnem add/remove actions retain keyboard focus. Home no longer treats the tested Todee heading as the verse preview.
- Punjabi/Hindi controls and recovery messages were added to Rehat, Amrit Keertan, Stories and cloud/backup settings while retaining original English source content.
- The reading edition now includes the omitted Volume I reference appendix for 80 episodes. A source-corroborated spacing repair is recorded; individual reference mappings and historical review are not invented. Stories and Panth Prakash have optional introductory reading guidance and contextual links.
- Privacy identifies the SearchGurbani dictionary request. Support offers an editable report that can be copied or downloaded without an account. Session diagnostics use bounded generic failures and omit reading content, search queries and account identifiers.

## Finding-by-finding disposition

“Implemented” means source changes and relevant automated regression coverage exist. Browser acceptance and external editorial/configuration limitations are listed separately.

| Finding | Disposition | Evidence / remaining boundary |
| --- | --- | --- |
| F01 — Portable recovery | Implemented | `PersonalDataPanel`, `personalDataBackup`; real store API round-trip onto clean storage, malformed input and rollback coverage. |
| F02 — Developer-facing cloud panel | Implemented | Local-only, account, pending, offline and error copy; supported cloud scope and backup-file scope stated in en/pa/hi. |
| F03 — Downloaded story hangs | Implemented | Reader fetches story/catalog independently; cached-first repository, request deadlines, atomic replacement and removal guards. |
| F04 — Durable book downloads | Implemented | Versioned CacheStorage package, full/volume controls, validated offline reopening, cancellation/quota coverage. |
| F05 — Remote search blocks local results | Implemented | Concurrent independently bounded result sources and recovery for partial failures. |
| F06 — Truncated/unanchored book search | Implemented | All matching chapters through pagination, consistent phrase matching, highlighted passage navigation. |
| F07 — Rehat filter masquerading as Find | Implemented | Full text remains, with literal highlights, count and previous/next. |
| F08 — Missing Devanagari Find | Implemented | Matching and displayed-script highlights with canonical line navigation. |
| F09 — Stories absent from main search | Implemented | Grouped story results in main Read search; separate Stories shelf state retained. |
| F10 — Answerless vocabulary | Implemented | Attributed definition selection; incomplete legacy cards have a recovery path and do not enter review. |
| F11 — Again falsely finishes review | Implemented | Session queue repeats Again cards immediately. |
| F12 — Lost vocabulary context/senses | Implemented | Context links and distinct additional senses survive saving, backup and compatible cloud snapshots. |
| F13 — Heading in Home preview | Implemented | Narrow heading classification regression; scripture text remains unchanged. |
| F14 — Hidden Read/Study dependency | Implemented | Explicit reading-mode controls and explanation in More. |
| F15 — Unnamed settings controls | Implemented | Labelled range, described values, grouped/pressed meaning controls. |
| F16 — Conflicting size ranges | Implemented | Shared constants and normalization on persisted settings. |
| F17 — Misleading Save | Implemented | Done plus immediate-change explanation. |
| F18 — Secondary interface localization | Implemented for audited surfaces | Rehat, Amrit Keertan, Stories, cloud and new backup controls. This is not a translation of the historical books. |
| F19 — Shallow Stories collection | Partially addressed | Honest collection copy, newcomer doorway and related-reading paths. The three longer existing drafts remain unpublished pending the required actual reviews; no new breadth is claimed. |
| F20 — Independent story review | External editorial work remains | All eight published packages and three longer drafts retain honest pending human-review fields. The exact handoff is linked below. |
| F21 — Book OCR/reference repair | Partially addressed | Original 35-page appendix restored by episode; one verified spacing repair, provenance and v7 revision. Individual reference mapping, remaining OCR review and missing Volume II material remain open. |
| F22 — Beginner direction | Implemented | Optional story starting points, related readings, sourced historical book context and available source notes. |
| F23 — Provider privacy disclosure | Implemented | SearchGurbani request and diagnostic data description reconciled with implementation. |
| F24 — Support/operational feedback | Report flow implemented | Editable/copyable/downloadable report plus generic handled-provider events. A monitored private inbox and remote diagnostics endpoint are not configured or fabricated. |
| F25 — Missing acceptance gates | Implemented; browser run pending | Deterministic fixtures, production Bani/Home/Stories runner, expanded a11y surfaces and CI gates. Local Chromium/server execution is blocked by sandbox permissions. |
| F26 — Incomplete performance budget | Byte budgets implemented | Transitive static JS/CSS graph measured; backend stays lazy; route CSS deferred with cold-route dependency review. Representative device/network latency measurements remain outstanding. |
| F27 — Trapped chapter error | Implemented | Retry, Back to book and reconnect recovery, with focused tests. |
| C01 — Cloud response races | Implemented | Serialized requests, account generation/local revision guards, retained post-export edits, auth subscription, restore isolation and regression tests. |
| C02 — Incomplete personal-data contract | Complete file contract implemented | All audited omitted domains transfer in a personal backup. Automatic cloud sync retains the deployed compatible v3 scope and explicitly lists exclusions; this is not complete cross-device cloud continuity. |
| C03 — Profile hash inconsistency | Implemented | Shared canonical hash including themeMode; unchanged round-trip coverage. |

## Engineering and review details

The startup audit follows static import/export edges and enforces raw and gzip JS/CSS limits. Backend code must remain outside that graph. Reader, catalog, home and settings styles are imported by the routes that need them. An independent dependency scan caught and fixed a cold Read-route style omission and a More loading-state dependency before completion.

CI now installs Chromium, runs nine Bani/Home cases plus published Stories at two themes/two text scales, and runs expanded accessibility checks against the production preview. Browser request interception supplies deterministic BaniDB and dictionary responses, rejects unexpected external requests, and blocks service workers for fixture isolation. Production build validation continues to exclude development-only story drafts.

Independent review also caught and corrected the Stories shelf/global-search conflict, a book-search matching mismatch, stale story-download cleanup visibility, and restore/account timing risks. The future native readiness checker now compares the declared/resolved Capacitor version instead of demanding a stale constant; Edge Function SDK imports are pinned. Native signing/release work remains outside this PWA task.

## Verification

| Check | Result |
| --- | --- |
| Full Vitest suite | 1,630 tests passed across all 138 files in the final batched run. |
| Independent state follow-up | 53 tests across five files passed, including complete real-store restoration, late responses, rollback and legacy size export. |
| Node fixture/bundle tests | 6 passed. |
| TypeScript | Application and Node configs passed. |
| ESLint / whitespace | Repository lint and `git diff --check` passed; final state edits also passed scoped lint. |
| CSS selector audit | Passed for 20 files; independent route dependency review covered 16 page modules. |
| Production build | Vite production build passed with the native config loader. |
| Startup graph | 14 initial assets; JS 481.3 KiB raw / 150.1 KiB gzip, CSS 59.1 KiB raw / 12.7 KiB gzip; all budgets passed, backend lazy. |
| Published content | Library verifier passed; 8 stories / 3 collections / 3,737 words verified. |
| Drafts and production isolation | 3 drafts verified; production build excludes their text and preview modules. |
| Native catalog consistency | Generator produced the expected 103 readings with no tracked catalog change. This is not an Xcode build. |
| Browser matrix | Added to CI; not executable locally because port binding and Chromium launch were denied by the sandbox. |

The final full-suite logs are local verification output; the source tests and CI commands remain the reproducible record. Relevant commands are `npm test`, `npm run lint`, `npm run build`, `npm run qa:css-selectors`, `npm run qa:browser`, `npm run qa:a11y`, and the library/story verifiers. Browser checks and configured-account end-to-end behavior require an environment that can run them; mocked concurrency tests do not establish a production account round-trip.

Environment limitations: the normal Vite bundled config loader attempts to write to a shared dependency directory outside the writable roots. Tests/build therefore use the supported native config loader, disabled Vitest cache and temporary TypeScript build info. Local port binding and Chromium launch are blocked. Fresh npm vulnerability lookup could not reach the registry, so no current dependency-vulnerability clearance is claimed. No production deploy, cloud schema rollout, external support message or native release occurred.

## Remaining editorial and release evidence

- [Editorial handoff](../../content/stories/reviews/2026-10-24-audit-editorial-handoff.md) identifies the three exact longer drafts and review work. The repository's [editing policy](../../content/stories/README.md) says: “Complete the editorial work and actual review, resolve edition/translation rights, then deliberately add a new edition to the published catalog.” No actual human reviewer can be substituted with an AI-generated approval.
- [Panth Prakash source repair record](2026-10-24-panth-prakash-source-repair.md) identifies restored material, exact provenance, unresolved printed artifacts and reference-mapping limits.
- Owner-selected artwork remains. This code change does not establish missing documentary rights evidence, private provider arrangements or human editorial signoff; those historical records must be reconciled with real evidence.
- Production browser/installed-PWA validation, current dependency advisory lookup, representative slow-device measurements and any deployment remain distinct from passing local source checks.
