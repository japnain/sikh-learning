# Independent review: Dasam selections and Ardaas — 1 November 2026

Reviewed `src/content/baniDiscoveryDasam.ts`: **15 exact BaniDB entries and the Zafarnama browse entry**. This reviewer did not author the discovery copy.

**Result:** no source-established correction is required in the present names, summaries or details. The existing copy keeps the important excerpt and variant boundaries. This is a separate AI-assisted editorial review, not a named human Gurmat or English-editor sign-off.

## Method

Read every displayed English name, summary and detail. Independently inspected the captured provider metadata, source headings, opening and closing text for all 15 exact entries in `tmp/read-remediation-20261031/bani-provider-1-53.json`. Also inspected the raw selections for IDs 12, 25, 26, 28 and 53, focusing on stanza boundaries, the complete wording differences between 25/26, and the explicit passages supporting the Ugardanti summary. Those captures date to 31 October; they are not represented as new provider downloads on 1 November.

Reviewed source SHA-256: `97d725f0f4f020c950e7d5e1a31153bea228f8eb6c9460055f425f60f266e4ec`.

Fresh external retrieval checked the institutional and scholarly claims against SGPC, Sikh Research Institute and Punjabi University. Search-indexed sections of the current SGPC Rehat Maryada PDF establish the relevant daily and initiation readings. The legacy SGPC HTML chapters returned 502 on direct opening, so they were not treated as successfully loaded documents. iGurbani's rendered web extraction did not expose the full verse text; the actual provider snapshot, not that empty extraction, supplies the stanza evidence.

This review validates the **discovery claims against their stated evidence**. It is not a word-by-word critical edition of every long bani, manuscript comparison, or adjudication of contested Dasam traditions.

## Entry-by-entry result

| Entry | Checks and outcome | Evidence |
|---|---|---|
| 4 — Jaap Sahib | Pass. Tenth-Sovereign heading and final numbered stanza 199 support identity/count. Opening attributes support the summary; morning and Amrit Sanchar use are confirmed. | [Selected text](https://api.banidb.com/v2/banis/4); [SGPC code](https://sgpc.net/wp-content/uploads/2025/06/Sikh-Rehat-Maryada-English-n.pdf), Articles IV and XXIV |
| 5 — Shabad Hazare (Patshahi 10) | Pass. The ten-hymn collection and distinct Tenth-Guru identity are supported. SikhRI identifies the sixth hymn as the Beloved Friend composition; its themes fit the copy. | [Selected text](https://api.banidb.com/v2/banis/5); [SikhRI series](https://sikhri.org/tags/sabad-hajare) |
| 6 — Tav Prasad Savaiye (Sraavag Suddh) | Pass. Ten-stanza sequence ending at 30; the love and ritual themes are explicit. The SGPC code specifies this opening for morning recitation. Preserve separation from ID 7. | [Selected text](https://api.banidb.com/v2/banis/6); [SGPC code](https://sgpc.net/wp-content/uploads/2025/06/Sikh-Rehat-Maryada-English-n.pdf), Article IV |
| 7 — Tav Prasad Savaiye (Dheenan Ki) | Pass. Its separate ten-stanza sequence ends at 252. Opening praise and closing criticism of outward religious observances support the context. It is not the same text as ID 6. | [Selected text](https://api.banidb.com/v2/banis/7) |
| 8 — Akal Ustat Chaupai | Pass. Invocations precede chaupai stanzas 1–10. The description properly identifies a section of the longer Akal Ustat instead of treating it as an independent full work. | [Selected text](https://api.banidb.com/v2/banis/8); [parent reading](https://api.banidb.com/v2/banis/29) |
| 9 — Benti Chaupai Sahib | Pass. The prayer's protection/devotion themes fit. SGPC specifies Benti Chaupai in Rehras and initiation. The provider's expanded selection includes surrounding text, so the existing notice about differing opening/closing passages is useful. | [Selected text](https://api.banidb.com/v2/banis/9); [SGPC code](https://sgpc.net/wp-content/uploads/2025/06/Sikh-Rehat-Maryada-English-n.pdf), Articles IV and XXIV |
| 12 — Chandi Charitar Ustat | Pass. Actual markers run from 257 to 262, with an explicit eighth-chapter colophon. Punjabi University distinguishes the second Chandi Charitra's eight cantos/262 verses from the first work. The present title and description correctly identify the closing excerpt. | [Selected text](https://api.banidb.com/v2/banis/12); [Punjabi University](https://eos.learnpunjabi.org/CHANDI%20CHARITRA.html) |
| 13 — Chandi Di Vaar | Pass. Narrative theme, opening used in Ardaas and 55-pauri extent are supported. The full martial ballad stays distinct from the later communal prayer. | [Selected text](https://api.banidb.com/v2/banis/13); [SGPC biography](https://sgpc.net/ten-guru-sahibs/guru-gobind-singh-sahib/); [SGPC Ardaas](https://sgpc.net/ardas/) |
| 19 — Shastar Naam Mala (Opening Chapter) | Pass. The actual selection ends at couplet 27 and identifies its first chapter as Bhagauti Ustat. Weapons/protection imagery is explicit. Keep the opening-chapter qualifier; the selected text is not the whole longer work. | [Selected text](https://api.banidb.com/v2/banis/19) |
| 24 — Ardaas | Pass. The opening Vaar passage, remembrance of Sikh history and prayer for universal welfare are visible. The copy appropriately avoids attributing the entire developed litany solely to the Tenth Guru. | [Selected text](https://api.banidb.com/v2/banis/24); [SGPC Ardaas](https://sgpc.net/ardas/) |
| 25 — Sri Bhagauti Astotr (Panth Prakash) | Pass. Provider naming supports the version label. Full captured text differs from ID 26 and contains the additional concluding chaupai. Sword/courage imagery is explicit. No unsupported fixed pagination or historical dating is claimed. | [Version 25](https://api.banidb.com/v2/banis/25); [version 26](https://api.banidb.com/v2/banis/26) |
| 26 — Sri Bhagauti Astotr (Hazur Sahib) | Pass. Full captured text has different wording and ends with the appeal for Guru Shah Gobind's protection. The extra chaupai of ID 25 is absent. Retain this as a separate version. | [Version 26](https://api.banidb.com/v2/banis/26); [version 25](https://api.banidb.com/v2/banis/25) |
| 28 — Barah Maha Savaiye | Pass. Opening Phagan and final marker 879 agree with the stated 867–879 range. SikhRI's scholarly introduction identifies that exact Krishna Avtar sequence and distinguishes a second one. Seasonal memory/separation is supported by the selected text. | [Selected text](https://api.banidb.com/v2/banis/28); [Guru Granth Sahib Project](https://gurugranthsahib.io/bani/introduction/22/Introduction) |
| 29 — Akal Ustat | Pass. Its heading and SGPC attribution support the name/author. Provider headings identify the opening chaupai and both savaiye passages inside the longer work. The copy claims neither that this excerpt duplicates them nor that a manuscript-complete edition has been established. | [Selected text](https://api.banidb.com/v2/banis/29); [SGPC biography](https://sgpc.net/ten-guru-sahibs/guru-gobind-singh-sahib/) |
| 53 — Ugardanti | Pass. Six numbered Bhagavati sections and closing colophon support the structural description. The full captured text explicitly includes Khalsa Panth, Durga imagery and requests for compassion. Current copy deliberately avoids claiming uncontested authorship or universal canonical placement. | [Selected text](https://api.banidb.com/v2/banis/53) |
| Zafarnama — browse entry | Pass. SGPC's biography explicitly identifies the Persian verse letter to Aurangzeb, its composition at Dina and its criticism of breached assurances after Anandpur. The copy omits disputed exact event dates. This remains a source-browse destination, not a verified standalone provider selection. | [SGPC biography](https://sgpc.net/ten-guru-sahibs/guru-gobind-singh-sahib/) |

## Preserved boundaries

- Do not merge the two Tav Prasad Savaiye selections or the two Bhagauti Astotr versions.
- Do not expand the scope of ID 12 or ID 19 merely because the parent composition is longer.
- Do not describe the whole Ardaas as solely authored by Guru Gobind Singh Ji.
- Do not turn scriptural promises quoted within source texts into app claims of health benefits, guaranteed protection or recitation outcomes.
- Provider labels are evidence for how this catalogue identifies a version; they do not by themselves establish an exhaustive manuscript history.
- No application source was edited during this review.

## Retrieval references

Fresh sources examined on 1 November 2026:

- SGPC biography: paragraphs about Chandi literature, Jaap/Akal Ustat and the letter composed at Dina.
- SGPC Ardaas: published litany opening, historical remembrance and final welfare prayer.
- Current SGPC Rehat Maryada PDF: indexed Article IV morning/Rehras paragraphs and Article XXIV initiation list.
- SikhRI Sabad Hajare series: collection introduction and descriptions of its ten hymns.
- Guru Granth Sahib Project Barah Maha introduction: Krishna Avtar ranges 867–879 and 911–925.
- Punjabi University Encyclopaedia of Sikhism, Chandi Charitra: distinction between the two works, chapter and verse totals.

These checks do not complete the separately requested physical-device testing or replace a named independent human subject-matter review.
