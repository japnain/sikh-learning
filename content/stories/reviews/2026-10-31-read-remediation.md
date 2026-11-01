# Read content remediation: bounded AI review

31 October 2026. Reviewer: Codex, AI-assisted implementation review. This addresses the editorial portions of C01/C02 in the [Read audit](../../../docs/qa/2026-10-31-read-page-audit.md). It is not independent human English editing, Sikh history/Gurmat approval, or a new publication decision.

## Result and changes

All 71 paragraphs of the eight public English readings were reread for continuity, attribution, clarity and consistency with their existing source dossiers. Eight retained original-edition page images were opened and read again, one targeted page per reading. No new demonstrable factual or transcription error was established in those checks, so no reading, source JSON, scripture, catalog or imported book text was changed. The README's obsolete statement that all public readings were revision 1/metadata revision 1 was corrected to match the actual packages.

The eight public readings still total 3,737 words. Six centre on Guru Nanak, all eight use Macauliffe as a narrative source, and both human review fields remain pending in every package. The three longer drafts remain unpublished. **C01 remains open for independent review and editorial breadth; C02 remains open for edition proofreading and reference reconciliation.** Repeating an AI pass cannot supply either missing human signoff.

## Current public baselines

SHA-256 values below identify the complete JSON files, including metadata. The earlier 23 October full-package hashes differ after the documented 24 October discovery metadata changes; they must not be described as hashes of today's public packages.

| Story ID | Reading / metadata revision | Words | SHA-256 |
| --- | --- | ---: | --- |
| bhai-lalo | 1 / 2 | 458 | `097ac748b6419e8b050df4aedb6cce30655f61983317ec4448751557506f24ac` |
| guru-amar-das-service | 2 / 2 | 518 | `648942f9ac6fc953f8639e9e73ba4a9b978616e08bb58697a4d248ff32500e8d` |
| mata-khivi | 1 / 2 | 438 | `e2118c8f892367ce46e4953d16841ed45166cfaa6624e50b8878c877f7291a11` |
| sajjan | 1 / 2 | 466 | `d9c96335d8eaf70e2b928be979daa8c966aa43bcda6911ed79ee13014c8d6f08` |
| the-milk-and-the-coin | 1 / 3 | 431 | `25b97a0f64285b520e51af6f85a42bb68731563909e8182f3b0c8005f4ef492f` |
| the-needle | 1 / 2 | 440 | `cf8c344abf0231b70e76bd7645f19139ade17a553ff3f0aa6456e237fd4d05f5` |
| the-sacred-thread | 1 / 2 | 482 | `a294516da17781793df0ee84c4ec0a0ccbfeb0e1b0fe70aa5bd45fe78d004875` |
| water-at-haridwar | 1 / 2 | 504 | `02a74a1b2fbca6318252819b92641aae4c18fe5815ed05713759486406f3a708` |

## Fresh source-image checks

The witnesses are Macauliffe's original 1909 edition, not contemporary evidence for the sixteenth-century events. Local images are retained under `tmp/story-source-scans/acquired/`; their original URLs and hashes are in the [23 October evidence manifest](2026-10-23-review-evidence.json). The broader original comparisons remain in the [Volume I](2026-10-23-public-volume-i-scan-review.md) and [Volume II](2026-10-23-volume-ii-scan-review.md) reports. Today's eight-image sampling does not repeat their full scope.

| Reading and passage | Image opened today | Finding |
| --- | --- | --- |
| Lalo p5–p8 | `v1/p44-n139.jpg`, printed p. 44 | The summons, faqir response, caste objection, two breads and milk/blood account match the witness. The source itself supplies the honest-labour versus oppression explanation. Retain the explicit traditional-account attribution. |
| Sacred thread p9 | `v1/p18-n113.jpg`, printed p. 18 | The source includes women, feet, hands and tongue in its thread discussion. The reading's equality/conduct language is editorial synthesis of that passage, not an authenticated new translation or independently dated speech. |
| Sajjan p8–p10 | `v1/p47-n142.jpg`, printed p. 47 | Confession and reparation lead to retained property being distributed to the poor. The reading correctly avoids claiming return to victims' families and attributes the dharmsal tradition. |
| Haridwar p6–p10 | `v1/p51-n146.jpg`, printed p. 51 | Field-distance challenge, devotion, distracted trade thoughts and cooking-space transition match the witness. The story attributes extraordinary knowledge rather than presenting verification of it. |
| Milk and gold p8–p9 | `v1/p91-n186.jpg`, printed p. 91 | The villager's regret and Brahm's continued question follow the source. Today's page does not itself recheck the earlier four coins or golden basin; those are covered by the existing pp. 84–91 comparison. |
| Needle p1, p3–p8 | `v1/p130-n225.jpg`, printed p. 130 | Wealth flags, wife's objection, needle, direction to feed the poor, seven lakhs and remembrance match. The account note retains the boundary around the omitted wolf/rebirth episode. |
| Amar Das p5–p7 | `v2/p43-n52.jpg`, printed p. 43 | The previously corrected “weavers” is supported. Recovery and a green peg are predictions in this passage; the current wording preserves that distinction. Coins, coconut and Bhai Budha's role are present. |
| Khivi p1/p4 | `v2/p27-n36.jpg`, printed p. 27 | The named distribution of kitchen resources and rice/milk/ghee are present. This does not establish an administrative job title, personal timetable or invented speech for Khivi. |

## English assessment and review assignments

The current prose is coherent, uses stable paragraph anchors, and distinguishes source narrative from reflection. No broken sentence, inconsistent participant identity or new scene invented to increase length was found in this pass. The endings sometimes explain an image after the narrative has already conveyed its meaning, especially Lalo p9, Needle p9 and Haridwar p11; this is a discretionary tightening decision, not a demonstrated factual defect. An independent copy editor should also choose a consistent English spelling convention (`recognised` in Amar Das; `recognized` elsewhere) without altering historical names to fit it.

The following assignments remain unfilled; no person has been contacted or represented as a reviewer:

| Assignment | Concrete material to review | Completion evidence required |
| --- | --- | --- |
| Independent Sikh history/Gurmat reviewer | All eight stories plus their dossiers; prioritise sacred-thread p4–p9 and Ang 471, Sajjan p5–p6 and Ang 729, Khivi p1/p4 and Ang 967; assess hymn paraphrase separately from the traditional event setting. | Actual reviewer name, date, exact package hash/revision, scope, findings and accepted changes. |
| Independent English editor | All 71 public paragraphs, account notes and glossary terms; decide ending cuts and spelling convention. | Actual editor name, date, exact package hash/revision, editorial findings and disposition. |
| Historical comparison researcher | Identify and acquire independent, precisely located witnesses beyond Macauliffe for each narrative; prioritise variant chronology, Brahm/Ibrahim identification and miracle attribution. | Edition/recension/date, page or verse locators, claim comparison and access limits. A textual anchor alone does not corroborate the story's setting. |
| Collection editor | Assess the three existing longer drafts after independent review; identify missing people, periods and reading lengths before commissioning further work. | Explicit publication/replacement decision with evidence and rights records; no automatic promotion of drafts. |

The three draft hashes still match the 23 October evidence manifest: Khalsa revision 2 (1,452 words), Mardana revision 3 (1,354), and expanded Khivi revision 3 (653). Their full prose was not freshly reviewed today and their earlier AI results are not new approvals.

## Panth Prakash source and OCR verification

The current reader remains `panth-prakash-english-v7-f9f801cc-243827eb`: 169 episodes, 637 English narrative source pages, and unchanged archived EPUB checksums. The import validation, provenance, source-quality disclosure and [24 October repair report](../../../docs/qa/2026-10-24-panth-prakash-source-repair.md) were inspected. Raw EPUB entries at Volume I source pages 49, 51, 536 and 570 and Volume II page 839 were also inspected. This was a targeted source/integrity review, not a cover-to-cover proofread or a fresh independent print-edition collation.

The focused integrity tests verified that all 106 retained appendix fragments belong to the corresponding actual EPUB pages, spanning all 35 Volume I appendix pages (536–570) across 80 episodes. Shared “No reference” material for Episodes 25/26 is preserved; Episode 39 has no supplied heading; the supplied Volume II has no appendix. This proves faithful extraction from the supplied files, not that their OCR, commentary or individual note associations are correct.

The raw Volume I page 51 still contains `S ikh`, while the generated reader contains the documented page-scoped `Sikh` repair. Page 49 still contains `Version44`; the generated reader preserves it as an unresolved source artifact. The 24 October record reports the same artifact in the same-edition PDF. That PDF comparison was not repeated today, so no broader claim is made and no inferred replacement was introduced.

| Remaining edition task | Starting point | Acceptance condition |
| --- | --- | --- |
| Independent English OCR proofread | Narrative chapters against the actual 2006/2010 editions, followed by all appendix source pages 536–570. | Page-scoped correction ledger with original/replacement/evidence; distinguish OCR errors from printed-source errors. |
| Resolve `Version44` | Episode 1, source p. 49 / printed p. 5, recorded in `provenance.json`. | Authoritative edition evidence or a documented editorial decision; do not remove digits by heuristic. |
| Individual reference mapping | Existing 106 fragments and in-text markers; begin with complete Episode 1 as a bounded pilot. | Every association supported by source evidence, duplicate/ambiguous markers recorded; do not advertise verified links before reconciliation. |
| Missing reference material | Episode 39 heading and any Volume II reference appendix. | Obtain an actual edition/source and establish provenance and reuse basis before adding it. Absence in the supplied file is not proof that no edition contains it. |

No new book correction was justified by the evidence inspected. The existing OCR and reference limitations must remain visible.

## Validation performed

- `npm run stories:verify:drafts` — passed: eight public readings, three collections, 3,737 words and three unpublished pilots.
- `npm run library:verify` — passed: one work, linked payloads and source checksums valid.
- `npx vitest run src/data/panthPrakashLibraryIntegrity.test.ts --configLoader runner --maxWorkers=2 --no-cache` — eight tests passed, including raw source-page/appendix correspondence, checksums, exact repair and preserved artifact. The initial default loader failed to write through the shared dependency symlink; the runner loader completed normally.

These are content and extraction checks. They do not complete independent editorial review, browser/native acceptance, full-book proofreading, a new rights determination or production publication.
