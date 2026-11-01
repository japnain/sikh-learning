# Read remediation — 31 October 2026

**1 November follow-up:** separate AI reviewers completed the source review of all 104 bani entries plus Zafarnama. Six entries received attribution, terminology or selection-scope corrections. Device services prevented physical iPhone testing. See the [follow-up results and precise limits](2026-11-01-read-source-review.md).

This report follows the [original Read audit](2026-10-31-read-page-audit.md) and records the implemented changes in the current local working tree. The original audit contains **23 findings**: three visual, nine discovery, two interaction/performance, five reader, two offline and two editorial findings. It remains the record of the original symptoms; this document records their disposition.

The work preserves the artwork-led Read page, introductory context, exact reading variants and established single-owner reader scrolling. Changes and verification apply to the local working tree; no publication or deployment is implied.

## Original finding status

“Implemented” means the correction is present and has focused code/test evidence. It does not turn a mocked geometry test into physical-device verification. “Scoped” identifies a deliberate improvement that does not cover every originally suggested capability.

| ID | Status | Result and remaining qualification |
|---|---|---|
| V01 | Implemented | Removed obsolete desktop discovery-grid placement. Browse collections remains in the main column; the old hero row span no longer creates the unintended layout. |
| V02 | Implemented | Book cards stack when narrow; cover, prose and Open book action have shrinkable bounds. Browser checks passed for actual text/action rectangles and clipping ancestors at 320px/200%. |
| V03 | Implemented | Source cards use shrinkable tracks, adaptive number grids and wrapping controls. Browser checks passed for Angs 1001–1050, first/last links and Next, including navigation to page 22. |
| D01 | Implemented | A search reveal belongs to one explicit search intent. Later providers cannot reclaim it; wheel, touch, pointer, scroll and navigation keys cancel pending reveal. Regression coverage includes delayed providers and restored searches. |
| D02 | Implemented | Recent-search identity and persistence include All/Gurbani/Books/Stories scope. Query, mode, source and scope restore together; legacy entries migrate safely and backup handling follows the new schema. |
| D03 | Implemented | Mode/source URL validation accepts only own supported keys. Malformed inherited keys such as `__proto__` fall back safely. |
| D04 | Implemented | Clear history preserves pinned searches. History is initially compact with an expansion control. |
| D05 | Implemented | Amrit Keertan query, sorting, English preview, details and visible count survive navigation. Return state retains the full Read origin and selected row for scroll/focus recovery. |
| D06 | Implemented | Rehat list, chapters, Contents and return links carry the originating Books/discovery location. Direct entry has a Books fallback. |
| D07 | Implemented | Empty-state examples match the selected content: book titles/people for Books and available names/themes for Stories. |
| D08 | Scoped improvement | Rehat now persists its latest source-qualified chapter/paragraph and appears in Continue reading. Standalone Ardaas and transient shabad/Hukamnama routes remain excluded; this is not universal route coverage. |
| D09 | Implemented | Individual Continue items can be hidden with Undo or restored together. Saved positions remain intact; a newly updated position reappears. Storage failure preserves usable session behaviour. Successful replacement restore clears stale device-only hiding preferences. |
| R01 | Implemented; device check remains | Search is a real form: submit flushes pending work and deliberately handles focus, including blur on coarse-pointer devices. Actual iPhone keyboard behaviour still needs device confirmation. |
| R02 | Measured and improved; device check remains | Book search avoids repeated full-text normalization and occurrence allocations. Desktop CPU benchmarks show a large reduction; cold network cost and modest-phone responsiveness are not established by these measurements. |
| E01 | Implemented; device check remains | Book passage tracking uses a header-aware semantic block lookup after scrolling settles, replacing the width-dependent percentage observation band. No continuous per-frame layout scan was introduced. |
| E02 | Implemented | Book and Rehat appearance changes preserve a semantic passage plus relative offset, including restoration after modal dismissal. Explicit passage links retain precedence. Geometry/router regressions cover this contract; real-device frame pacing remains separate. |
| E03 | Implemented | Story paragraph and section jump clearance uses the measured shared reader-header height instead of the former fixed five-rem allowance. |
| E04 | Implemented | Book controls, Contents, Find, appearance, progress, loading/errors and navigation follow English/Punjabi/Hindi interface settings. The historical English source remains identified as English. |
| E05 | Scoped improvement | Story Find and Book Find initiation/navigation are available; prose controls now support 200% across Book, Story and Rehat, including backup validation. Rehat has durable automatic resume, but no separate manual bookmark interface was added. |
| O01 | Implemented | A validated cached Stories catalogue renders immediately while refresh proceeds independently. Mounted shelves and search results receive fresh metadata without waiting for a hanging network request. |
| O02 | Implemented, with edition boundary | Online book discovery can add works alongside downloaded editions. Cold direct-entry lookup is supported. Missing chapters from a saved edition are not silently mixed with a different current edition; update guidance is shown. Immutable revision URLs remain a future requirement for stronger cross-publication guarantees. |
| C01 | Review advanced; independent review open | All eight published stories and 71 paragraphs were reread; eight original source-image pages were checked. No new source-proven correction was warranted. Independent history/Gurmat and English review remain pending, and the small catalogue’s breadth has not been represented as complete. |
| C02 | Review advanced; source limits open | Panth Prakash provenance and validation were checked, including the existing targeted OCR repair. Remaining OCR, appendix and reference limitations stay disclosed. This was not a full two-volume proofread or a new critical edition. |

The technical changes are supported by focused tests around search intent, persistence, navigation, semantic anchors, source browsing, localization, offline discovery and edition mismatch. Individual batch counts overlap with broader runs and must not be added together as separate coverage totals.

## Complete Bani discovery and duplicate handling

The follow-up catalogue request covers **all 104 current BaniDB entries**, with an English display name, visible contextual summary, further explanation and source references for each. Gurmukhi/Hindi source names are bundled from the real provider index; English names and context remain visible when reader transliteration or translation preferences are off. Hindi uses the verified title rather than mechanically converting the Gurmukhi string. All 104 names in both scripts are searchable offline, with exact variant aliases kept separate. An optional live title refresh no longer blocks the usable catalogue or return-focus restoration.

| Discovery home | Exact BaniDB readings |
|---|---:|
| Sundar Gutka | 18 |
| Remaining SGGS directory | 76 |
| Remaining Dasam directory | 10 |
| **Total** | **104** |

Zafarnama has separate researched context and a source-browse route. It is additional to the 104 exact provider entries and is not advertised as a verified standalone BaniDB slice.

Duplicate removal concerns repeated discovery placement: each exact reading has one catalogue home. The real provider audit found **no identical full-text hash groups** and no identical Unicode-name groups among its 104 entries. Similar titles, shared verses and anthology overlap are not evidence that two readings can be deleted. Both Tav Prasad Savaiye sets, both Bhagauti Astotr variants, the different Bavan Akhri/Patti/Thiti compositions and the two Sri Mukhbaak groups remain distinct. Reader length choices and exact continuation identities remain preserved.

The research also corrects material context errors: Bhatt Savaiye praise the named Gurus rather than being authored by those Gurus; Thiti ID 49 is in Gauri; the apparent raag entries are selected Bhagat collections, with the Ramkali entry explicitly including Sadd and Satta/Balvand’s Vaar. Sukhmana remains distinct from Sukhmani. Anthologies are explained as gathered readings rather than a single continuous Ang range.

Evidence is retained in [the provider provenance register](bani-discovery-2026-10-31/provider-provenance.json), [full-text identity hashes](bani-discovery-2026-10-31/provider-text-hashes.json), [SGGS entry research](2026-10-31-sggs-bani-discovery-research.md), [Vaar research](bani-discovery-2026-10-31/vaar-research.md), [Vaar claim register](bani-discovery-2026-10-31/vaar-claims.json) and [Dasam research](bani-discovery-2026-10-31/dasam-research.md). These are AI-assisted contextual research records, not independent human editorial sign-off. Scripture text was not rewritten for the discovery copy.

## Performance evidence

The [recorded benchmark](bani-discovery-2026-10-31/read-search-benchmark.json) uses the actual 169-chapter Panth Prakash index: 1,410,266 bytes, with a 4,842,288-byte downloaded package. Fifteen desktop runs measured cold search medians of 2.37–2.81ms and warm medians of 0.70–1.10ms across the recorded queries. In the implementation comparison, the common query “the” changed from 42.18ms to 2.37ms cold and 41.05ms to 0.70ms warm. Eight resource reads from the same package took a median 20.14ms with memoization versus 95.44ms on the legacy path.

These are local desktop CPU/cache measurements, not mobile network timing, Core Web Vitals or a frame-rate guarantee. Versioned downloaded packages can be parsed once with presence/token checks and invalidation; legacy unversioned packages continue to revalidate until updated.

## Verification record

| Check | Recorded result |
|---|---|
| Final script-name integration | **122 tests passed** across Banis, Banis.search, appSearch and readBaniCatalog after the final corrections. Includes all 104 Gurmukhi/Hindi names and distinct variant searches; application no-emit TypeScript and scoped ESLint passed. [Test log](bani-discovery-2026-10-31/final-script-name-tests.log). |
| Editorial/corpus checks | Story draft verification and library verification passed; Panth Prakash integrity tests passed (8 tests). The editorial evidence does not upgrade pending human review statuses. |
| Static and content checks | Application/node no-emit TypeScript, whole-repository lint excluding temporary files, and the 28-file CSS audit passed. The final search alias correction also passed scoped lint and application TypeScript. |
| Complete application regression suite | **158 files / 1,871 tests passed.** `node tmp/read-remediation-20261031/run-tests.mjs` runs the repository's complete source-test batches with sandbox-safe `--configLoader runner --maxWorkers=2 --no-cache`. The final script-name correction subsequently passed the separate focused rerun above. [Test log](bani-discovery-2026-10-31/application-tests.log). |
| QA tooling tests | **17 tests passed** with Node's test runner, covering startup bundle auditing, browser fixtures and Hukamnama QA utilities/results. [Test log](bani-discovery-2026-10-31/qa-tool-tests.log). |
| Final production build and bundle checks | **Passed after the final alias/Hindi correction:** `npx vite build --configLoader runner`, startup bundle audit, public-data copying and story-build verification. Startup JavaScript **151.4 / 190 KiB gzip**, startup CSS **12.8 / 36 KiB gzip**; backend code remains lazy. Eight published stories included; three editorial drafts excluded. |
| Catalogue browser acceptance | **Passed in the local harness:** 105 unique rows, 104 source-script names and no missing context. All 976 checked text/control nodes fit their clipping ancestors at 390px light/dark, 320px with 200% text in light mode, and 1200px light, including expanded About sections. Enter opens About; keyboard Close returns focus to its summary without changing the route. |
| Original responsive defects | **Passed in the local harness:** 1200px desktop Browse heading, tabs and panel occupy the intended 1044px main column. At 320px/200% in dark mode, book descriptions and Open book fit; expanded Sources exposes all 50 Ang links and Next successfully advances from page 21 to 22. |
| Story Find and header clearance | **Passed in the local harness at 320px/200%:** all four header actions retain 44px targets; “bread” returns five matches across three passages. Choosing passage 8 closes Find, focuses the passage and places its top at 208.3px, below the measured 159.6px header. |

The [browser evidence record](bani-discovery-2026-10-31/browser-verification.json) includes the viewport matrix and sampled contrast: context text 6.12:1 light / 7.05:1 dark; About disclosure text 5.35:1 light / 7.20:1 dark. These are resolved-color checks for the sampled tokens, not a blanket accessibility certification. Screenshots: [390px dark](assets/read-remediation-2026-10-31/bani-context-390-dark.png), [390px light expanded](assets/read-remediation-2026-10-31/bani-context-390-light-expanded.png), [1200px light](assets/read-remediation-2026-10-31/bani-context-1200-light.png).

The [Hindi browser check](bani-discovery-2026-10-31/hindi-browser-verification.json) confirms that all 104 rendered Hindi titles exactly match the real provider index. Its 320px/200% pass also checked all 976 expanded context/control nodes without horizontal clipping.

In the final rebuilt harness, searching `ਕੁਚਜੀ` rendered the English Kuchji title and context. Opening it navigated to the exact reading with `baniDbId=14`, `baniId=kuchji` and `exactBani=1`. Fixture scripture search matches are not evidence of real-provider search quality.

Browser review uses a rebuilt local file-compatible **HashRouter harness with fixtures**. Its layout and interaction evidence applies to that build. Separately, the actual public BaniDB index and all 104 per-entry responses were fetched and audited, with full captured Unicode text hashes. The live catalogue audit does not make fixture-based reader interactions a production HTTP routing, service-worker or live-provider end-to-end test.

No physical iPhone momentum/keyboard check, VoiceOver certification, production deep-link deployment check or authenticated cross-device synchronization certification is claimed here. The browser checks inspect clipping ancestors as well as document bounds. A whole-tree `git diff --check` did not complete and was stopped; it is not counted as a passed check.

## Remaining editorial work

[The detailed editorial handoff](../../content/stories/reviews/2026-10-31-read-remediation.md) records the source pages, content hashes and acceptance criteria. A named independent history/Gurmat reviewer and English editor still need to review the eight published stories. The three longer drafts remain unpublished. Wider periods, people, source traditions and reading lengths require a separate editorial expansion rather than invented or prematurely approved material.

Panth Prakash still needs source-led proofreading and resolution of the disclosed appendix/reference gaps. The new Bani summaries likewise need independent subject and English editorial review; their source-backed metadata research must not be relabelled as that human approval.
