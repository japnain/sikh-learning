# Panth Prakash: source repair and reference recovery

24 October 2026. Reader profile `panth-prakash-english-v7`; source assets are unchanged: Volume I SHA-256 `f9f801cc84551a8e895df8f9b812c634f5b9ecaf630e10f58ad5a99e90771768`, Volume II `243827ebbb3a4152b1252834b5d9a1620bdf52478ce3021f3d1cdbd35d73d5bf`.

## Verified repair

Episode 1, Volume I EPUB `EPUB/page_51.html`, printed page 7, verse 15, contains `between the S ikh Gurus and the Mughals`. The [same-edition PDF](https://library.gurmat.info/download/sri-gur-panth-prakash-volume-1-history-of-the-10-gurus-rattan-singh-bhangoo-translation-kulwant-singh.pdf#page=52) text extraction has `Sikh` without the internal space. The import profile applies exactly this page-scoped spacing repair and fails if its original source text changes. It makes no broad spelling, historical or sacred-text substitutions. The correction and supporting locator are retained in `provenance.json`.

The apparent `Delhi Ruler's Version44` artifact on EPUB source page 49 is also present in the same-edition PDF at printed page 5. It is retained and recorded as an unresolved printed-source artifact. Removing the number or supplying a new reference would require an editorial decision that this source check cannot establish. PDF text was compared; no independent print-edition collation or specialist review is claimed.

## Recovered appendix

The first EPUB contains a References appendix on source pages 536–570, printed pages 492–526. The previous importer stopped its English reading selection at source page 535 and omitted the entire appendix. The revised importer preserves the appendix separately in chapter `sourceNotes`, retaining the source page, printed page, source href and unchanged OCR text for each episode slice. The chapter reader can open these notes without leaving the reading place.

The appendix supplies explicit headings for 80 episodes including several `No reference` entries. `Episode 25 & 26` is a shared no-reference heading. There is no separate Episode 39 heading, so no note section is invented for it. An inline cross-reference to Episode 9 in the Episode 13 notes is kept within Episode 13, not treated as a new boundary. The provided Volume II EPUB ends at narrative source page 839 and contains no reference appendix to restore.

Notes are grouped by source episode; individual superscript-to-note-number mappings are **not verified**. Source explanations may contain historical, translation or OCR errors and remain the edition's commentary, not new app-authored fact-checking. The four existing semantic `note` blocks in the narrative and the audit's 934 heuristic superscript matches were never a reliable count of the appendix's notes. No complete footnote reconciliation is claimed.

Notes stay out of the lightweight chapter index and narrative word counts. All 169 chapter IDs and 637 readable source pages remain. The single spacing correction changes word counts/positions after the affected passage; the work revision changes from v6 to v7 so downloaded editions can refresh coherently. Archived source assets remain byte-for-byte identical.

## Historical orientation

Work metadata now introduces the nineteenth-century Punjabi chronicle, its earlier written and family-tradition sources, and its focus on Sikh political emergence. It distinguishes a historical author's perspective from contemporary documentation and identifies the English translation. The source is Punjabi University's [Encyclopaedia of Sikhism entry on Prachin Panth Prakash](https://eos.learnpunjabi.org/PRACHIN%20PANTH%20PRAKASH.html), consulted on 24 October 2026. The copy does not impose a precise composition year where scholarship differs.

## Verification and remaining work

The importer regenerated manifests, chapters, search index and provenance successfully. The focused corpus tests verify all archived checksums, all narrative page boundaries, every recovered appendix fragment against its actual EPUB page, coverage of all 35 appendix pages, the shared no-reference heading, the missing-heading/Volume II limits, lightweight chapter indexes, the exact spacing repair and the retained source artifact. Public/draft story corpus checks are separate from this book repair.

Remaining editorial work: independent review of appendix OCR and historical explanations; a verified individual reference map; authoritative resolution of the printed `Version44` artifact; acquisition and rights/provenance assessment for any missing Volume II reference material. This repair records no human review completion or new republication permission.
