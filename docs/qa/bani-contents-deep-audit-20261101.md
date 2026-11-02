# Bani Contents deep audit — 1 November 2026

**Complete within the recorded Chromium audit scope:** structural review, all-target and enlarged-text matrices, the final header recheck, representative visual/interaction checks and final code verification. Updated 2 November 2026. The [all-target evidence](evidence/reader-20261101/deep-all-targets.json) covers all **2,411 target clicks**, the [enlarged-text matrix](evidence/reader-20261101/deep-enlarged-text.json) adds **508 exact current-index checks**, and the [final header recheck](evidence/reader-20261101/deep-final-header.json) passes **321 middle-first jumps across all 114 versions** after the timing fix. These supersede the prior sampled baseline. This report does not claim visual inspection of every Contents row or physical-device acceptance; precise limits are recorded below.

## Scope and method

The reviewed corpus contains **104 exact catalog readings, 114 distinct normalized versions and 2,411 semantic navigation targets**. The acquisition source is [the captured structural archive](../../scripts/qa/fixtures/bani-structure-snapshots-20261101.json.gz), which retains original Gurmukhi, local IDs, source/page metadata, headings, paragraph fields, order and variant flags with acquisition provenance. It is test/research data, not replacement runtime scripture.

This pass checked all **2,371 static section specifications** across 113 profiles against their captured reading's ordered rows: target and excerpt existence, excerpt membership within its section, and exclusion of provider-flagged headings from body excerpts. It also checked all **40 Japji anchors** for a unique matching opening, expected source Ang and order. No broken target, out-of-section excerpt, header-only excerpt or unlabelled unknown-kind fallback was found. This pass did not rerun production normalization; complete selected-stream fingerprints and variant normalization are covered by the existing integration tests documented in the [rollout report](bani-reader-rollout-20261101.md).

The structural review compared the family profiles with the [catalog](bani-catalog-structure-research-20261101.md), [SGGS](bani-sggs-structure-research-20261101.md), [Sukhmani/Anand/M9](bani-structure-research-20261031.md), [Dasam/composite](bani-other-structure-research-20261101.md) and [variant](bani-variant-structure-research-20261031.md) reports. These checks establish that the chosen landmarks match the reviewed source; they do not turn coarse printed-heading navigation into an exhaustive hymn index.

## Findings and status

| Finding | Evidence | Status |
| --- | --- | --- |
| Stay → another jump → Return could lose an accepted final-section destination | At the document end, the viewport anchor can still belong to an earlier section. `Study.tsx` now stores the accepted destination separately from the Return viewport anchor and restores both, subject to route, reading and element validation. | Implemented. The live nested-Return regression retained verse **3789**, the **Chaupai** current marker and scroll position **4025px** after the round trip. |
| Literal Gurmukhi section labels inherited the wrong language in English/Hindi UI | `Study.tsx` now adds `lang="pa-Guru"` to labels containing Gurmukhi; translated labels retain the UI language. There are **250 literal Gurmukhi labels across 25 profiles**. Excerpts already identify their script language. | Implemented. English/Hindi component regressions cover the label behavior. The completed all-target browser baseline checks all **250 literal labels across 25 profiles**, with no language failures. |
| Tab after an exact Contents jump could return to earlier page controls | Exact jumps now focus the target reading line with `tabindex="-1"` and `preventScroll`, rather than focusing its surrounding source-page section. This does not add an extra Tab stop. | Implemented. Actual browser Enter/Tab events at Japji Pauri 38 retained verse **383** and scroll position **52666px**; before the fix Tab moved to earlier Ang 8 controls at **49410px**. |
| Escape could close Contents while an input method was composing | `ModalSheet` now prevents Escape dismissal when the keyboard event reports `isComposing`; ordinary Escape resumes after composition ends. | Implemented. Component tests and simulated browser composition/Escape events show Contents stays open during composition, then closes and restores focus normally. This is not physical-device IME validation. |
| Return restored scroll position without a stable keyboard continuation point | Return now focuses the restored reading line, or the validated accepted destination when one is retained, with `preventScroll`. Stale route/reading/deferred-jump guards remain in place. | Implemented. Component regressions cover both mid-reading and accepted clamped origins, saved body identity, and the next Tab without scroll movement. The enlarged-text matrix verifies returned reading-line focus, **0px** scroll delta and cleared exploration state for **all 114 versions**. |
| The first jump could use stale header height before ResizeObserver delivered the Return/Stay layout change | `hasExploration` is now included in the header layout revision, so opening or closing exploration causes measurement before the deferred jump. A delayed-ResizeObserver regression reproduced an **80px** reservation for an **87px** header before this change. | Implemented. The regression passes for first jumps and jumps after Stay. The final **114-version / 321-jump** delayed middle-first browser recheck also passes, with stable header clearance, exact markers, focus and Return. |
| Source-page Contents units remained English in Punjabi/Hindi UI | Contents now uses the existing localized source-unit helper for attributed semantic and source-page rows, and retains the localized neutral Page label when attribution is unavailable. | Implemented and screenshot-verified: Punjabi Ardaas shows **ਪੰਨਾ 119** without English Page; Hindi Ramkali shows **अंग 923** in both semantic and source-page rows. English output is unchanged; global header/share helpers were not changed. |
| Jaitsri 61 was misattributed to Jaidev in the research | [Captured BaniDB reading 61](https://api.banidb.com/v2/banis/61), local row **20985**: “ਕਹਿ ਰਵਿਦਾਸ ਕਹਾ ਕੈਸੇ ਕੀਜੈ ॥”. Writer metadata is unavailable, but the body signature explicitly names Ravidas. | Corrected in the catalog research report. Runtime Contents already used the neutral label `ਰਾਗੁ ਜੈਤਸਰੀ`, so its displayed author did not need correction. |

[deep-regressions.json](evidence/reader-20261101/deep-regressions.json) records the live exact-jump keyboard, simulated IME and nested-Return checks. The language sweep and Return-focus results are recorded in the matrix artifacts linked above; [deep-locale-final.json](evidence/reader-20261101/deep-locale-final.json) records the final Contents-unit correction. Their coverage limits are explicit below.

The focused tests in `src/pages/Study.continuous-reader.test.tsx` cover literal-label language, exact-line focus, nested accepted destinations, Return focus and delayed header measurement. `src/components/ModalSheet.test.tsx` covers composition-aware Escape and dismissal focus. The latest focused header regression run passed **102 tests across four files**: continuous reader, header layout, reader anchors and reader presentation. Its saved log was inspected. The final combined run below supersedes that focused count and the earlier 91-test Return run; neither is added again.

## Final code verification

[deep-code-review.json](evidence/reader-20261101/deep-code-review.json) records the latest read-only code review, source hashes and validation logs. The six reviewed application/test file hashes were independently matched to the current files, with no mismatch. The recorded review found no additional material issue.

| Check | Result |
| --- | --- |
| Final combined API/profile/reader/anchor-caller run | **697 tests passed across 22 files in one run**, including the final header-timing regression |
| TypeScript | Application project passed, incremental compilation disabled |
| ESLint | Passed for the six reviewed application/test files; no full-repository lint claim |
| Production build and startup budget | Passed; **151.4 KiB JavaScript gzip / 12.8 KiB CSS gzip** |
| CSS selectors | Root task confirmed checks passed for **28 files** |

The final **697-test run was repeated after the Contents-unit copy change**, and the combined test log, successful build log and current source hashes were inspected. The final Study chunk is **433.67 kB raw / 86.50 kB gzip**. Application TypeScript and changed-file lint passed after that copy change; the other five reviewed lint files retain their passing hashes. The earlier 696-test result has been superseded. These code checks complement the live matrices; they do not replace visual or physical-device verification.

## Completed all-target browser baseline

The saved [baseline results](evidence/reader-20261101/deep-all-targets.json) were independently compared with the [complete target manifest](../../scripts/qa/fixtures/bani-sections-all-targets-20261101.json) and the earlier [route/sample manifest](../../scripts/qa/fixtures/bani-sections-browser-cases-20261101.json). The two manifests agree on reading identity, fingerprint, row/section counts and sampled targets. Every version appears exactly once, and every section index from zero through its reading's last section was clicked exactly once with the expected local verse ID.

| Check | Independently verified result |
| --- | --- |
| Reading/version coverage | **104 readings / 114 versions**, no missing, extra or duplicate keys |
| Loaded rows and Contents entries | **27,321 rows / 2,411 entries**, all matching the manifests |
| Actual target clicks | **2,411 / 2,411**, with the expected target ID, visible line and line focus |
| Header clearance | Every target clears the persistent header; minimum measured clearance **16.156px** |
| Current marker | Exactly one marker with the expected label after each click; duplicate-label index disambiguation is completed in the second matrix below |
| Return restoration | **124 sequences**, each with **0px** scroll delta and cleared exploration state |
| Document and Contents layout | No recorded document, sheet or panel overflow; no row-layout failures or empty excerpts |
| Target dimensions | Minimum Contents row height **85.734px**; minimum close-button dimensions **44×44px** |
| Literal-label language | All **250 labels across 25 profiles** checked, with no language failures |
| Reader state and scroller | Every version ready in Study presentation; native HTML scroller retained |

These measurements used **390×844, device scale factor 2, mobile/touch emulation, Study/Light, English UI and 22px Gurbani text**. They are automated DOM/geometry observations, not screenshot review of every row or assistive-technology validation.

The first **80 versions** ran before the additional Return-focus fix; the remaining **34** ran afterward. Other navigation behavior was unchanged. All 124 Return sequences verify scroll restoration and state clearing, while only the later **44 sequences** record the returned focus verse. The baseline alone does not establish post-fix Return focus for the earlier 80 versions; the completed second matrix covers all 114 versions after the fix.

The baseline also checks the current marker's count and label, not its exact list index. **203 targets** belong to repeated-label groups, so the same label alone cannot disambiguate those markers. The independently calculated union of all repeated-label targets and each reading's distinct first/middle/last targets contains **508 checks**. The completed second matrix adds exact marker-index assertions for this union.

## Completed enlarged-text and repeated-heading matrix

The [second matrix](evidence/reader-20261101/deep-enlarged-text.json) covers all **104 readings / 114 versions** at **320×740, device scale factor 2, mobile/touch emulation, Dark/Read, English UI, 32px root text and 34px Gurbani text**. The 32px root-font override exercises 200% interface text; it is not a claim of browser zoom or native operating-system text scaling.

Independent comparison with both manifests found no missing, extra or duplicate version or target-index checks. All **508 expected targets** passed, including **every one of the 203 targets with repeated labels**. Each measured current marker has the exact expected list index, label and local verse ID; every jump focuses a visible line below the header. The minimum measured clearance is **31.703px**.

Every version again matches its expected row/section counts, retains the native HTML scroller and reaches ready state. No document, sheet or panel overflow, row-layout failure, empty excerpt or literal-label language failure was recorded. Minimum row height is **172.141px**, and close controls remain at least **44×44px**. All **250 literal Gurmukhi labels across 25 profiles** were checked again.

All **114 Return sequences** restore scroll position with **0px delta**, clear exploration state and leave focus on a reading anchor. The browser harness verifies that returned focus is on `[data-reader-anchor]` and records its verse ID. Exact equality to a captured origin focus key and the subsequent Tab behavior are covered by the focused mid-reading/clamped-origin component regressions, not asserted for every route by this matrix. These are separate evidence scopes.

## Single-entry readings

Exactly **nine readings** have a single Contents entry. Their targets and excerpts exist in the correct order; none is an accidental empty fallback.

| ID | Reading | Captured rows | Target → body excerpt |
| ---: | --- | ---: | --- |
| 1 | Gur Mantar | 11 | 1 → 3 |
| 14 | Kuchji | 19 | 2404 → 2407 |
| 15 | Suchji | 11 | 2423 → 2424 |
| 16 | Gunvanti | 14 | 2434 → 2435 |
| 24 | Ardaas | 29 | 3708 → 3714 |
| 26 | Sri Bhagauti Astotr (Hazur Sahib) | 40 | 3795 → 3797 |
| 38 | Raag Maala | 62 | 9216 → 9218 |
| 61 | Raag Jaitsri | 16 | 20971 → 20974 |
| 75 | Raag Kanara | 9 | 23182 → 23185 |

Kuchji, Suchji and Gunvanti each contain one composition; their terminal numbers 1, 2 and 3 are not counts of included compositions. Jaitsri and Kanara each contain one shabad despite internal stanza numbering. Hazur Sahib Astotr is a continuous 36-line Astotr body; it lacks the separate closing Chaupai present in the Panth Prakash variant, ID 25. Its target starts at title 3795, after invocations 3793–3794, which remain in the reading. Whether a single-entry jump should include those invocations is a navigation preference, not missing source content.

Three singletons have possible richer landmarks that need editorial decisions:

- **Raag Maala 38:** six raag-family landmarks at 9220, 9230, 9240, 9251, 9258 and 9266. The existing research deliberately deferred an internal landmark index; repeated printed 1s must not become invented numbered pauris.
- **Ardaas 24:** the prose prayer supports paragraph incipits after its opening verse. New labels should follow reviewed text rather than invented canonical section names.
- **Gur Mantar 1:** a mixed selection includes the printed “ਫ਼ੁਰਮਾਨ ਦਸਮੇਸ਼ ਜੀ ਦਾ” heading at 5 and Sarbloh attribution at 11. A second landmark is possible, while the present whole-selection entry remains structurally defensible.

Ath Chandi Charitar **12 is not a singleton**: its two entries distinguish Bhujang Prayaat 257–261 at 2021 and Dohra 262 at 2042. Closing colophon 2045 does not create another stanza.

## Printed-heading groups

These **17 raag collections expose 242 source-heading landmarks**. They are useful printed-heading navigation, not a claim that every group is one shabad or one author's complete contribution. Literal Gurmukhi labels are preserved across UI locales where a translation has not been reviewed.

| ID | Collection | Heading entries |
| ---: | --- | ---: |
| 55 | Siri Raag | 5 |
| 56 | Gauri | 78 |
| 57 | Asa | 51 |
| 58 | Gujri | 8 |
| 59 | Sorath | 6 |
| 60 | Dhanasri | 7 |
| 64 | Suhi | 4 |
| 65 | Bilaval | 16 |
| 66 | Gond | 19 |
| 67 | Ramkali | 7 |
| 69 | Maru | 8 |
| 70 | Kedara | 2 |
| 71 | Bhairao | 8 |
| 72 | Basant | 6 |
| 73 | Sarang | 3 |
| 74 | Malaar | 5 |
| 76 | Prabhati | 9 |
| **Total** | | **242** |

Vaar Manjh **87** adds a separate literal-heading entry outside this table for its provider's 17-row Gauri tail. Its 27 pauris remain distinct; the additional entry preserves the printed title rather than hiding the tail or inventing a 28th pauri. The source's reason for including the tail remains unresolved.

Coarse groups such as Kedara's two entries and Ramkali's seven heterogeneous landmarks can be expanded only after checking internal hymn boundaries, numbering resets and refrains. Presenting the current 242 entries as a complete shabad index would overstate the evidence.

## Attribution and structural exceptions

The captured readings for **1, 3, 5, 11, 21, 22, 23, 24, 28 and 36** lack authoritative source IDs. The normalizer marks attribution unavailable; the profile resolver returns neutral source metadata and the Contents renderer uses **Page**, not an asserted SGGS/Dasam Ang. An inherited display page does not become original source evidence. This remains especially relevant to mixed daily prayers and Gur Mantar.

The reviewed profiles retain the known exceptions: Sukhmani's 24 preceding salok targets with separate ashtpadi body excerpts; 471 pauris across the 22 major vars; Asa's intervening chhants; Majh's additional Gauri tail; Bavan M5's opening/closing saloks around 55 pauris; Birhade's three cycles; Ruti's eight salok/chhant groups; Thiti M5's 17 salok/pauri pairs; the three Sorathe within Savaiye M5; and unflagged metre headings in Akal Ustat. Local IDs are read in provider order rather than numerically sorted. Refrains, colophons and cumulative totals do not become fabricated units.

## Visual stress cases for the deeper pass

Character counts below are Unicode text lengths, not measured visual widths. Both geometry matrices are complete; these remain reference cases for screenshot review and interaction spot checks.

| Reading | Exact stress case | What to inspect |
| --- | --- | --- |
| **57 Asa** | Target **20127**, 68-character literal heading beginning “ਬਾਈਸ ਚਉਪਦੇ ਤਥਾ ਪੰਚਪਦੇ…” | Long Gurmukhi label, language identification, wrapping beside page metadata and enlarged interface text. |
| **43 Patti Likhi** | Excerpt **9595**, 103 characters in the combined stanza-33 row | Multi-line excerpt remains readable and the whole button remains reachable. |
| **77 Salok Kabir** | **243 entries**, the largest Contents | Sheet scrolling, focus, Find interaction and correct first/interior/final current markers. |
| **78 Salok Farid** | **130 entries** and short final section | Final destination remains current when the document cannot align it to the header; nested jumps and Return retain the original place. |
| **56 Gauri** | **78 literal-heading entries**, including embedded Bavan Akhri/Thitanti/weekday Vaar | Repeated headings remain distinguishable by excerpts; no false uniform pauri/shabad implication. |
| **23 Sohila extra-long** | Target **3695**, “Jaap excerpt · Bhujang Prayaat · 197–199” | Longest English label, partial-composition wording and neutral page attribution. |
| **87 Vaar Manjh** | Gauri-tail target **26089**, excerpt **10997** | Separate printed-heading item, complete tail, source-page transition and exact Return. |
| **67 Ramkali** | Sadd, Rai Balvand/Satta Vaar and Bhagat heading groups | Mixed-form labels and long literal title at **21662**. |
| **31 Sukhmani** | **Ashtpadi 2**, target **5321** on Ang 263; excerpt **5325** on Ang 264 | Page metadata describes the salok jump, while the excerpt identifies the following ashtpadi body. |
| **90 Asa Di Vaar** | **24 pauri units** with preceding chhants/saloks | Context is retained and the displayed target page is not confused with the excerpt's page. |
| **38 Raag Maala / 24 Ardaas / 75 Kanara** | One-entry Contents in different reading lengths | The lone landmark, Find and source-page navigation remain useful without implying missing sections. |

## Completed representative visual, keyboard and Find checks

[deep-visual-and-keyboard.json](evidence/reader-20261101/deep-visual-and-keyboard.json) records **nine screenshot reviews across seven readings**, plus actual keyboard and Find flows. Screenshots were reviewed inline by the root task; no screenshot files are claimed because browser file-path output had been denied. The following is a record of those reviews, separate from the automated geometry matrices.

| Reading | Recorded screenshot review |
| --- | --- |
| Asa 57 | Long 68-character Gurmukhi heading at index 22 / target 20127; 320×740 Dark/Read, 32px root text and 34px Gurbani text |
| Patti Likhi 43 | Two views: final stanza 35 and the long combined stanza-33 excerpt; 320×740 Dark with 32px root text |
| Sohila extra-long 23 | Longest English Contents label at index 15, Jaap 197–199; 320×740 Dark/Read, 32px root text and 34px Gurbani text |
| Salok Kabir 77 | Final Salok 243 in the 243-entry list; 320×740 Dark with 32px root text |
| Ramkali 67 | Hindi UI and Devanagari excerpts alongside preserved Gurmukhi headings explicitly marked `pa-Guru`; 390×844 Light/Study |
| Ardaas 24 | Punjabi UI with its one semantic entry and separate source-page navigation; 390×844 |
| Vaar Manjh 87 | Two views: the separate Gauri tail at 1280×800 and a 740×360 landscape viewport; the latter retains a 44px close control |

No visual failure was reported in these nine reviews. This does not establish visual inspection of all 104 readings. The original Punjabi Ardaas snapshot exposed an English **Page** unit in the source-page list. That copy inconsistency was corrected locally within Contents and rechecked in the final locale evidence below; neutral attribution was preserved.

**Actual keyboard round trip:** in Sukhmani, Ashtpadi 2 was accepted at local target **5321** with saved body verse **5322** and scroll position **11902px**. Actual browser Enter/Enter navigation explored Ashtpadi 13 at **6247** and returned to **5321**. Return preserved the saved body **5322**, restored **11902px** and focused **5321**. Actual Tab then focused that line's verse-action control without changing the scroll position or reading line. This live spot check supplements the broader component regressions; it is not a next-Tab test of every route.

**Actual Find:** Gurmukhi query `ਸਿਮਰਉ` and Roman query `simar` both selected source verse **5239** through Enter. The target was below the header (**123.078px** top versus **112.344px** header bottom). Return restored the accepted **5321** origin with **0px delta**. Reopening Contents preserved each query, and clearing it restored all **24 Ashtpadi entries**. The source target and saved place were preserved across both script-query forms.

## Completed final header-timing recheck

The [final header evidence](evidence/reader-20261101/deep-final-header.json) was independently compared with the manifest after the one-line header layout revision. All **114 unique versions / 104 readings** pass, with no missing, extra or duplicate cases. Each version starts with its middle section, then its remaining distinct first/last targets, allowing **four animation frames plus 250ms** after each jump. All **321 checks** occur in that exact order and match their target ID, current index/label, line focus and visibility. Minimum header clearance is **16.172px**.

All **114 Return sequences** have **0px delta**, cleared exploration state and returned reading-anchor focus. Row/section counts, native HTML scrolling, document/sheet geometry and all 250 literal-label language checks pass. Conditions are **390×844 Study/Light, English UI, 16px root text and 22px Gurbani text**. This targeted run confirms first-jump timing after the final header change; it does not pretend that all 2,411 targets were reclicked on that last revision.

## Final locale and preview confirmation

The subsequent Contents-unit copy change keeps English rendering and navigation unchanged. [Final locale evidence](evidence/reader-20261101/deep-locale-final.json) records two actual screenshot reviews: Punjabi Ardaas retains one semantic section, displays **ਪੰਨਾ119 / ਪੰਨਾ 119** in source-page badge/subtitle, contains no English Page in Contents and has no overflow; Hindi Ramkali retains seven sections and displays **अंग 923** in both semantic and source-page rows, also without overflow. The correction is confined to Contents; attribution, header/share helpers and scripture are unchanged.

The [final English Sukhmani preview](evidence/reader-20261101/deep-final-preview.json) was also screenshot-reviewed on the final build: **24 sections**, exact current index **1**, **Ashtpadi 2 / Ang 263**, the correct ashtpadi body excerpt, and saved body verse **5322** after Stay. It retains **390×844 Study/Light, English UI, 16px root text and 22px Gurbani text**, with no horizontal overflow. The root task reported no console errors or warnings in that final preview.

No known defect remains in the audited scope. Limits remain explicit: the 2,411-target baseline and later sampled matrices have different revision/condition scopes; automated geometry is separate from representative screenshot review; returned-anchor focus is separate from per-route next-Tab testing. No physical iPhone, Safari, installed PWA, Capacitor, screen-reader speech output or every-locale/script combination pass is claimed.
