# Finer raag Contents: source review A

Reviewed on 2026-11-02. This change supplies static, fingerprint-guarded navigation for eight captured BaniDB selections. It changes no scripture, source attribution, row ordering or verse IDs. Browser verification of the new hierarchy belongs to the combined rollout; this report records source review and executable replay, not a claim of new visual testing.

## Coverage

| BaniDB ID | Selection | Original rows | Original groups | Reviewed roots | Added children | Leaf units |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 55 | Siri Raag bhagat bani | 74 | 5 | 5 | 0 | 5 |
| 56 | Gauri bhagat bani | 1,130 | 78 | 78 | 78 | 150 |
| 57 | Asa bhagat bani | 584 | 51 | 52 | 2 | 53 |
| 58 | Gujri bhagat bani | 104 | 8 | 8 | 0 | 8 |
| 59 | Sorath bhagat bani | 282 | 6 | 9 | 19 | 23 |
| 60 | Dhanasri bhagat bani | 169 | 7 | 7 | 13 | 17 |
| 64 | Suhi bhagat bani | 133 | 4 | 10 | 0 | 10 |
| 65 | Bilaval bhagat bani | 150 | 16 | 16 | 0 | 16 |
| **Total** | **8 readings** | **2,626** | **175** | **185** | **112** | **282** |

The 185 roots and 112 children provide **297 clickable targets**. Fifteen roots contain children. The leaf count combines **212 complete hymns** with **70 parts of three embedded Gauri compositions**; it must not be reported as 282 shabads. Gauri itself contains 80 ordinary hymns and three long compositions: 83 complete compositions, represented by 150 leaf destinations after the long works are expanded.

All 175 original parent IDs, literal labels, starts and excerpts are retained. Nine verified printed headings become additional roots, and one unheaded hymn receives a neutral root. Single-hymn roots have `kind: shabad` without a redundant child. Grouped hymns have `Shabad 1`, `Shabad 2`, etc. in **parent-local navigation order**, with the original opening line as their excerpt. These ordinals do not claim canonical hymn numbering. Literal scripture headings are not translated or used to invent author metadata.

## Source evidence and decisions

The complete provider corpus is [the captured structural archive](../../scripts/qa/fixtures/bani-structure-snapshots-20261101.json.gz), including original Gurmukhi, header flags, paragraph metadata, selection-local IDs and page numbers. The archive contains source provenance; its SHA-256 is also recorded in [the A boundary ledger](../../scripts/qa/fixtures/raag-fine-boundaries-a-20261102.json). The ledger enumerates every parent range and every leaf's exact opening, ending, excerpt ID and ordered row coordinates. Row coordinates, rather than numeric ID sorting, define intervals.

The review compared primary scripture transcriptions on Sri Granth with the captured provider text. External checks focused on boundaries where provider flags, paragraph breaks or ordinary numbered endings are insufficient:

| Finding | Captured local IDs and decision | Primary transcription checked |
| --- | --- | --- |
| Gauri shared heading contains four hymns | Parent 19129 has bodies 19130, 19142, 19150, 19168; complete hymn endings are 19141, 19149, 19167, 19175. | [Ang 331](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=331&g=1&h=0&r=0&t=0&p=0&k=0) |
| A hymn begins with rahau, inside the same provider paragraph | Parent 19465 contains bodies 19466 and 19481; 19481 is a genuine new hymn, ending at 19485. Paragraph changes cannot identify it. | [Ang 339](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=339&g=1&h=0&r=0&t=0&p=0&k=0) |
| Ravidas shared heading contains two hymns | Parent 19791 contains 19793–19800 and 19801–19814, including the separate Begampura opening. | [Ang 345](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=345&g=1&h=0&r=0&t=0&p=0&k=0) |
| Kabir Bavan Akhri is a numbered composition | Parent 19506 contains 45 stanza children, body 19508 through ending 19672. Exact body stream and all openings match standalone bani 39. | [Ang 340](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=340&g=1&h=0&r=0&t=0&p=0&k=0), [Ang 343](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=343) |
| Kabir Thitanti has an opening salok and 16 stanzas | Parent 19674: opening salok 19676, numbered bodies 19681–19743, final ending 19746. Exact body stream and openings match standalone bani 47. | [Ang 343](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=343), [Ang 344](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=344&g=1&h=0&r=0&t=0&p=0&k=0) |
| Kabir weekday Vaar has eight stanzas, not the salok–pauri Vaar form | Parent 19748 has eight children at 19751, 19755, 19759, 19763, 19767, 19771, 19775, 19778. The two-line rahau 19749–19750 remains visible at the parent opening. All body text matches standalone bani 50. | [Ang 344](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=344&g=1&h=0&r=0&t=0&p=0&k=0), [Ang 345](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=345&g=1&h=0&r=0&t=0&p=0&k=0) |
| Asa has two Ravidas hymns under one heading | Parent 20355 has bodies 20356–20363 and 20364–20371. | [Ang 487](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=487&g=1&h=0&r=0&t=0&p=0&k=0) |
| A later Asa hymn must not inherit the preceding M5 heading | M5 parent 20384 ends with hymn body 20385–20394. The next body 20395–20402 names Dhanna in its ending but has no new printed heading. It is a separate root labelled only localized `Shabad`, with its body excerpt. No editorial author heading is inserted. | [Ang 487](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=487&g=1&h=0&r=0&t=0&p=0&k=0), [Ang 488](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=488&g=1&h=0&r=0&t=0&p=0&k=0) |
| Sorath has three printed headings with `header:0` | Promote 20662, 20698 and 20710 to roots. Their body excerpts are 20663, 20699 and 20711. The preceding groups end before these headings. | [Ang 656](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=656&g=1&h=0&r=0&t=0&p=0&k=0), [Ang 657](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=657&g=1&h=0&r=0&t=0&p=0&k=0) |
| Dhanasri author groups contain several hymns | Parents 20805, 20847 and 20903 contain respectively five, five and three hymn children; four remaining roots are already single hymns. | [Ang 692](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=692&g=1&h=0&r=0&t=0&p=0&k=0), [Ang 694](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=694&g=1&h=0&r=0&t=0&p=0&k=0) |
| Suhi has six printed headings with `header:0` | Promote 21036, 21047, 21065, 21076, 21103 and 21118 to roots, keeping exact literal labels and the following body as excerpt. Its ten hymns are then ten roots, without redundant children. Existing Farid root 21129 is also retained despite its body flag. | [Ang 792](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=792&g=1&h=0&r=0&t=0&p=0&k=0), [Ang 793](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=793&g=1&h=0&r=0&t=0&p=0&k=0), [Ang 794](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=794&g=1&h=0&r=0&t=0&p=0&k=0) |

Siri Raag's five hymns, Gujri's eight and Bilaval's sixteen already have separate roots. Their source streams were reviewed without adding duplicate children. Additional primary checks: [Siri Raag Ang 93](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=93&g=1&h=0&r=0&t=0&p=0&k=0), [Gujri Ang 524](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=524), [Bilaval Ang 855](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=855&g=1&h=0&r=0&t=0&p=0&k=0) and [Ang 858](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=858&g=1&h=0&r=0&t=0&p=0&k=0). A single ending counter or a second rahau does not manufacture another hymn. The final Gauri Ravidas eight-stanza work remains one hymn under its printed Gauri Bairagan heading.

Bhikhan's second Sorath hymn uses selection-local IDs 26338–26343 after 20797–20804. These IDs are intentionally retained in provider order. Mangals preceding later headings also stay in their original positions; navigation intervals can include them without treating them as separate units or moving scripture.

## Implementation and verification

- [Static runtime profiles](../../src/content/baniSections/raagFineProfilesA.ts): `RAAG_FINE_PROFILES_A`. Every fingerprint is identical to the already reviewed complete reading in `catalogProfiles.ts`.
- [Build-time reviewed boundary declarations](../../scripts/qa/raag-fine-a-profile-generator.ts): explicit local IDs, nine printed heading promotions, and the one neutral unheaded root. There is no runtime boundary parser.
- [Complete boundary ledger](../../scripts/qa/fixtures/raag-fine-boundaries-a-20261102.json): all 185 root intervals and 282 inclusive leaf body spans, with openings, endings, excerpt IDs, counts and source hash. `navigationRangeLastVerseId` separately records the target interval, which can include following structural rows.
- [Family replay tests](../../src/content/baniSections/raagFineProfilesA.test.ts): **15 passed**, using actual `fetchBani` normalization, all three locales, every child target, exact row preservation, full embedded/standalone body equivalence, the rahau-first case, unflagged headings, neutral Dhanna root, nonmonotonic IDs and changed-reading fallback.
- An independent source audit checked every ledger opening and closing against the raw corpus, every unit's parent interval, ID uniqueness, excerpt bounds and body-row coverage. It confirmed all 2,626 original rows and all 297 targets; the only non-unit rows are retained structural headings, mangals and the explicitly documented weekday rahau preface.

Regenerate only through the opt-in runner; normal app tests never write these files:

```sh
UPDATE_RAAG_FINE_A_PROFILES=1 npx vitest run --config scripts/qa/raag-fine-a.vitest.config.ts --configLoader runner
npx vitest run src/content/baniSections/raagFineProfilesA.test.ts --configLoader runner
```

This review covers the captured 2026-11-01 provider streams. A changed complete reading fails the fingerprint guard and does not receive these reviewed fine-grained links. The new hierarchy's UI, keyboard and responsive checks are recorded by the parent rollout separately; no browser calls were used for this family implementation.
