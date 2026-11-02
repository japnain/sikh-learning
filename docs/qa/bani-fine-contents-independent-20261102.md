# Independent review of finer Bani Contents

Reviewed 2026-11-02. Scope: captured source structure, static navigation boundaries and labels. No scripture, runtime application files or browser state were changed by this review.

## Evidence and acceptance rule

The complete source checkpoint is `scripts/qa/fixtures/bani-structure-snapshots-20261101.json.gz`, SHA-256 `f386515ae2d16081857d05f8182345c669d6c97aaccd9fdf5ec6e0e43a1c1256`. It contains 104 reading payloads with original Gurmukhi and structural metadata. Its per-reading `acquiredFileSha256` and provenance identify the captures. IDs below are local to a BaniDB reading, not canonical cross-API verse IDs.

Navigation requires the complete reviewed reading fingerprint. Printed counters, paragraph changes, rahau and provider heading flags are corroborating evidence for offline review; none individually identifies every composition. Labels describe the actual form or quote a source incipit. They must not imply that every numbered stanza is a separate shabad, or inherit an author's attribution across a mixed group.

Primary text was independently consulted at SriGranth Angs 339, 340, 344, 923, 966, 1253, 1429 and 1430; the Punjabi University Sukhmani entry; and the SGPC Ardas page. References are linked below.

## Exceptions that the profiles must preserve

| Reading | Checked evidence | Required treatment |
| --- | --- | --- |
| Siri Raag 55 | First Kabir hymn ends with a second rahau, ID 18675, without a multi-counter terminal. Beni ends 18725 with a single 5; Ravidas ends 18734 with a single 3. ID 18702 is a performance instruction. | Five whole hymns. Do not derive completeness from multi-counter endings or count the performance instruction as another hymn. |
| Gauri 56 | Heading 19129 contains four hymns, starting 19130, 19142, 19150 and 19168. ID 19481 begins a new hymn with rahau and shares provider paragraph 151 with the preceding hymn. Under Ravidas heading 19791, the second hymn starts 19801 inside paragraph 187. | Preserve the hymn starts even where there is no new paragraph or flagged heading; do not skip an opening rahau. |
| Gauri 56 | Bavan Akhari 19506, Thitanti 19674 and weekday Vaar 19748 are structured compositions. The Vaar has seven weekday stanzas and a closing stanza. | Their internal targets are stanzas, salok or weekday landmarks, not additional shabads. The 81 multi-counter terminal rows already include the Vaar terminal 19781: the collection has 80 ordinary hymns plus these three structured compositions, not 81 plus three. |
| Asa 57 | The heading at 20384 spans the Mahalla 5 hymn ending 20394 and following Dhanna hymn 20395–20402. | Avoid presenting the second hymn as authored by Mahalla 5. A neutral group or neutral child labels preserve what the evidence supports. |
| Gond 66 | Printed ghar 2 heading 21334 and adjacent mangals are marked `header=0`. Final hymn 21603–21621 has a cumulative numerical ending followed by `ਜੋੜੁ`. | Promote the checked printed heading explicitly; preserve the twentieth hymn despite the nonnumeric tail. |
| Ramkali 67 | Sadd 21623–21660 has six stanzas; Balvand/Satta Vaar 21662–21750 has eight pauris; the later Bhagat portion contains 18 hymns. The Beni hymn spans provider paragraphs 61–69. Ghar 2 heading 21930 is unflagged. | Six stanza and eight pauri children for the named long works; eighteen ordinary hymn targets. Paragraph boundaries inside Beni do not make separate hymns. |
| Maru 69 | Salok heading 22103 introduces two saloks at 22104 and 22106. The Kabir heading 22139 is unflagged after Jaidev's hymn. The printed composite wording at 22108 is unusual. | Two salok children, not one invented shabad. Promote the actual Kabir heading and retain the exact composite source wording without inventing authorship. |
| Bhairao 71 | Mahalla 5 insertion 22370 ends at 22388; following hymns must not inherit that attribution. Two Kabir ashtpadis form their own group. Namdev hymn 22653–22710 contains 28 numbered stanzas. | Neutral following group, explicit ashtpadi kinds, and one complete 28-stanza hymn. |
| Sarang 73 | Actual one-line Surdas unit 23090 lies between Parmanand's terminal 23089 and printed Mahalla 5/Surdas heading 23091. Later Kabir heading 23099 is also unflagged. | Keep the real single-line unit. It is not a fabricated missing seventh hymn inferred from a skipped counter. Promote the two actual printed headings. |

## Composition profiles

`src/content/baniSections/compositionFineProfiles.ts` was independently checked against every captured anchor and excerpt. All parent/child ranges are ordered and remain within the respective reading. No concrete anchor or label mistake was found.

- **Sukhmani 31:** 24 existing parent targets retain their preceding salok context; eight stanza children per parent give exactly 192 stanza targets. Each child range contains exactly one printed terminal numbered 1–8, and every eighth terminal carries the correct ashtpadi number 1–24. The sole rahau at 5249–5250 stays in the first stanza; stanza 2 starts at 5251. Its provider paragraph alone would give the wrong boundary. Variable stanza lengths are respected.
- **Raag Maala 38:** separate opening at 9216 with body excerpt 9218, then six family landmarks at 9220, 9230, 9240, 9251, 9258 and 9266. Deepak starts at the actual transition 9251, not the preceding Hindol closing line 9250. Repeated printed 1s are not a pauri sequence.
- **Ardaas 24:** 14 literal source-incipit landmarks are a reasonable editorial navigation scheme. Splits at 3720 and 3735 are useful sublandmarks, not a claim that the source has fourteen canonical numbered paragraphs. Continuous petitions 3725–3726, 3729–3730 and 3731–3734 remain together. Source stays unknown throughout; the prose from 3720 onward has null original pages and must not inherit Ang 119 or source D from the preceding invocation.

The separate `compositionFineProfiles.test.ts` also checks all locales, production `fetchBani` normalization, preservation of the complete row stream, and whole-profile rejection after deletion, reordering or text alteration. This independent review did not change or rerun that suite.

## Later raag boundary fixture review

`scripts/qa/fixtures/raag-fine-boundaries-b-20261102.json` was checked independently against the complete archive. Every opening and closing equals its captured text, every unit lies in its group in source order, and all unflagged body rows are covered. Remaining unflagged rows outside unit bodies are the explicitly identified source headings and mangals, still retained in the reader.

| Reading | Verified unit inventory |
| --- | --- |
| 66 Gond | 20 shabads |
| 67 Ramkali | 6 Sadd stanzas, 8 Vaar pauris, 18 shabads |
| 69 Maru | 15 shabads and 2 saloks |
| 70 Kedara | 7 shabads |
| 71 Bhairao | 31 shabads and 2 ashtpadis |
| 72 Basant | 13 shabads |
| 73 Sarang | 9 shabads, including the actual single-line Surdas unit |
| 74 Malar | 5 shabads |
| 76 Prabhati | 9 shabads |

## Earlier raag fixture and generated profile review

The subsequently completed `scripts/qa/fixtures/raag-fine-boundaries-a-20261102.json` and `src/content/baniSections/raagFineProfilesA.ts` also passed the independent opening/closing equality, body coverage, parent/child interval, excerpt and unique-ID checks. Its eight readings cover 2,626 rows, 185 roots and 112 children: 297 clickable targets and 282 leaves.

| Reading | Verified unit inventory |
| --- | --- |
| 55 Siri Raag | 5 shabads |
| 56 Gauri | 80 whole shabads; Bavan Akhari 45 stanzas; Thitanti opening salok and 16 stanzas; weekday Vaar 8 stanzas |
| 57 Asa | 53 shabads |
| 58 Gujri | 8 shabads |
| 59 Sorath | 23 shabads |
| 60 Dhanasri | 17 shabads |
| 64 Suhi | 10 shabads |
| 65 Bilaval | 16 shabads |

All 45 Gauri Bavan Akhari closing numbers are present in order, 1–45. The weekday Vaar's two-line rahau preface remains at the parent, before its first stanza child. Explicit promotions of Sorath and Suhi's unflagged printed headings, and the neutral Dhanna root 20395 after the Mahalla 5 hymn, avoid the earlier attribution traps.

The completed `src/content/baniSections/raagFineProfilesB.ts` passed the same raw-coordinate, excerpt, unique-ID and depth checks: 73 roots, 91 children, 164 clickable targets and 145 leaves. Combined, the 17 raag profiles have 258 roots and 203 children. No concrete source-boundary or interval error remained in either generated module at review time. This is not a claim of browser or final integrated UI verification.

## Primary references

- [Punjabi University, Sukhmani](https://eos.learnpunjabi.org/SUKHMANI.html): 24 ashtpadis, eight stanzas each, preceding saloks, single rahau.
- [SriGranth, Ang 339](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=339&g=1&h=0&r=0&t=0&p=0&k=0): Gauri adjacent hymns and a hymn beginning with rahau.
- [SriGranth, Ang 340](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=340&g=1&h=0&r=0&t=0&p=0&k=0): Bavan Akhari title and numbered internal stanzas.
- [SriGranth, Ang 344](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=344&g=1&h=0&r=0&t=0&p=0&k=0): end of Thitanti, weekday Vaar heading, rahau and weekday openings.
- [SriGranth, Ang 923](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=923&g=1&h=0&r=0&t=0&p=0&k=0): Sadd heading and numbered internal stanzas.
- [SriGranth, Ang 966](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=966&g=1&h=0&r=0&t=0&p=0&k=0): Balvand/Satta Vaar heading and opening pauris.
- [SriGranth, Ang 1253](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=1253&g=1&h=0&r=0&t=0&p=0&k=0): Parmanand, the single-line Surdas unit, Mahalla 5/Surdas and Kabir headings in order.
- [SriGranth, Ang 1429](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=1429&g=1&h=0&r=0&t=0&p=0&k=0) and [Ang 1430](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=1430&g=1&h=0&r=0&t=0&p=0&k=0): Raag Maala's six named family transitions.
- [SGPC, Ardas](https://sgpc.net/ardas/): official prayer sequence corroborates the invocation and prose-petition landmarks; its presentation does not define the application's fourteen navigational labels as canonical sections.
