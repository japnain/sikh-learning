# Fine raag Contents: Gond through Prabhati

Reviewed 2026-11-02. This covers BaniDB selections **66, 67, 69, 70, 71, 72, 73, 74 and 76**, the B half of the 17 raag collections. These are selection-local navigation IDs, not global SGGS verse IDs. A selected raag collection is not necessarily the entire raag in SGGS.

| Selection | Captured rows | Root entries | Child entries | Independently navigable units |
|---|---:|---:|---:|---|
| 66 Gond | 323 | 20 | 0 | 20 shabads |
| 67 Ramkali | 375 | 8 | 29 | 18 shabads, 6 Sadd stanzas, 8 Vaar pauris |
| 69 Maru | 152 | 9 | 11 | 15 shabads, 2 saloks |
| 70 Kedara | 67 | 2 | 6 | 7 shabads |
| 71 Bhairao | 554 | 9 | 29 | 31 shabads, 2 ashtpadis |
| 72 Basant | 181 | 6 | 9 | 13 shabads |
| 73 Sarang | 87 | 5 | 7 | 9 shabad units, including the single Surdas line |
| 74 Malaar | 70 | 5 | 0 | 5 shabads |
| 76 Prabhati | 117 | 9 | 0 | 9 shabads |

Total: **73 root entries, 91 child entries, 145 leaf units, 164 selectable targets**. A parent already representing one complete hymn remains directly selectable without a redundant child. Gond, Malaar and Prabhati therefore need no nested shabad list. These counts describe the captured selected readings, not invented canonical totals for a raag.

The complete ordered reading fingerprints remain exactly those of the existing catalog profiles. The change adds navigation metadata only. It does not change Gurmukhi, original page numbers, header flags, mangals, paragraph grouping, attribution or provider order. Child numbers restart within a parent and are navigation ordinals; they do not replace the printed composition counters.

## Source method and concrete exceptions

The complete original row streams come from `scripts/qa/fixtures/bani-structure-snapshots-20261101.json.gz`, whose capture provenance is recorded in that file and the earlier catalog research. Every body opening and ending was reviewed in provider order and is frozen in `scripts/qa/fixtures/raag-fine-boundaries-b-20261102.json`. The manifest also enumerates every row outside a body interval. Those excluded rows remain visible in the reading and consist of original headings and mangals. A separate independent boundary review confirmed the complete nine-reading coverage, exact opening/closing text, ordered intervals and the exceptions below.

The following primary SGGS text witnesses were opened for structural cross-checks. Their Gurmukhi headings and endings supply the evidence; no translation is inserted into the reader:

1. **Gond:** [Ang 870](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=870&g=1&h=0&r=0&t=0&p=0&k=0) shows a complete third hymn followed by a new printed Ghar 2 heading. The capture mistakenly leaves that heading at `header=0`. Promote actual heading **21334**, with body **21336**, to its own Contents root. [Ang 871](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=871&g=1&h=0&r=0&t=0&p=0&k=0) confirms the ensuing completion and next hymn. The final captured Gond hymn ends at **21621** with count summaries followed by `ਜੋੜੁ`; a numeric-suffix-only detector would miss it.
2. **Ramkali Sadd:** [Ang 923](https://srigurugranth.net/0923.html) opens the named composition, and [Ang 924](https://www.srigurugranth.com/0924.html) ends it with **6/1**. It is one composition with six stanza targets **21625, 21631, 21637, 21643, 21649, 21655**. These are not six shabads.
3. **Ramkali Vaar:** [Ang 967](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=967&g=1&h=0&r=0&t=0&p=0&k=0) and [Ang 968](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=968&g=1&h=0&r=0&t=0&p=0&k=0) show the numbered Vaar progression and completion **8/1**, followed by the separate Bhagat collection. Add eight pauris, not eight shabads. [Ang 973](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=973&g=1&h=0&r=0&t=0&p=0&k=0) also verifies the unflagged printed Ghar 2 heading **21930**, promoted to a root with body **21931**. Beni's nine-stanza hymn **21953–21991** remains one shabad.
4. **Maru:** the salok heading **22103** introduces two saloks, **22104–22105** and **22106–22107**. [Ang 1106](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=1106&g=1&h=0&r=0&t=0&p=0&k=0) explicitly ends Jaidev's hymn before the separate Kabir/Maru heading. Promote the unflagged printed heading **22139** to a root with body **22140**. Kabir's hymn must not appear as a child of the Jaidev heading.
5. **Kedara:** [Ang 1124](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=1124&g=1&h=0&r=0&t=0&p=0&k=0) distinguishes the fifth and sixth Kabir hymns, then the Ravidas heading. The provider combines the two Kabir hymns into one paragraph; their body starts **22208** and **22214** must remain separate Contents targets.
6. **Bhairao:** [Ang 1160](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=1160&g=1&h=0&r=0&t=0&p=0&k=0) shows the Mahalla 5 heading, its hymn completion, and the next hymn without another printed heading. Keep **22370–22388** as a single leaf. Give the six following complete hymns a neutral editorial parent **“Following shabads”** at **22389**, rather than implying that all are under Mahalla 5. This is explicitly an editorial label, not a quoted scripture heading. [Ang 1162](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=1162&g=1&h=0&r=0&t=0&p=0&k=0) prints the Ashtpadi heading and first complete eight-stanza unit; preserve two ashtpadi children **22477–22510** and **22511–22543**. The long Namdev hymn **22653–22710** has 28 stanzas but remains one shabad.
7. **Basant:** [Ang 1194](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=1194&g=1&h=0&r=0&t=0&p=0&k=0) verifies sequential complete Kabir hymns without repeated headings. The Kabir and Namdev groups receive six and three children respectively; the other four headings already identify individual hymns.
8. **Sarang:** [Ang 1253](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=1253&g=1&h=0&r=0&t=0&p=0&k=0) shows Parmanand's completion, the actual standalone Surdas line, the separate Mahalla 5/Surdas heading, and then the separate Kabir heading. The single line **23090** is an explicit one-line unit, not an extra hymn inferred from a skipped counter. Promote printed unflagged headings **23091** and **23099**, with body excerpts **23093** and **23101**, to roots. Keep duplicate provider mangals in place; none becomes a body excerpt or an extra unit.
9. **Malaar and Prabhati:** [Ang 1293](https://www.srigurugranth.com/1293.html) and [Ang 1351](https://www.srigurugranth.com/1351.html) confirm successive complete hymns with printed headings. All five Malaar and nine Prabhati roots already coincide with individual hymns. Refine their semantic kind to `shabad`, preserving their literal heading, target and opening excerpt.

## Reproduction and validation

`python3 scripts/qa/bani-sections/generateRaagFineProfilesB.py` consumes the explicit reviewed boundary manifest and renders `src/content/baniSections/raagFineProfilesB.ts`. It checks exact original openings/closings, parent bounds, non-overlap, preservation of every non-body row and the unchanged catalog fingerprints. It does not infer boundaries by punctuation, author signatures, paragraph numbers or runtime text.

`npx vitest run src/content/baniSections/raagFineProfilesB.test.ts --configLoader runner --no-cache` passed **21 tests**. The tests replay all nine captures through production `fetchBani`, resolve every target in all three UI locales, verify opening and final-row current-section behavior, check all 145 body intervals, preserve each old source heading, assert exceptional boundaries and fail closed when the reading changes or is truncated. Full reader UI validation belongs to the shared integration/browser audit.
