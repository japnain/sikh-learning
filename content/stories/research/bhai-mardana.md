# Bhai Mardana: pilot evidence dossier

Prepared: 23 October 2026. Draft: `content/stories/drafts/bhai-mardana.json`.

## Decision and scope

This is the explicit fallback pilot in the 22 October expansion plan. Targeted searches did not produce an inspectable English edition of *Parchi Bhai Kanhaiya*. The alternative uses actual passages from Macauliffe's original 1909 *Life of Guru Nanak*, rather than expanding a short encyclopedia entry into an apparently sourced biography. The Kanhaiya acquisition record is separate.

The draft is **1,354 words / 7 minutes**, with six sections. It is a life profile built around separate traditional episodes. The section sequence follows their order in Macauliffe; it is not a newly established travel chronology.

Status: original English draft; separate AI English and history/Gurmat passes completed; human reviews pending. Not added to the public catalog by this work.

## Sources actually inspected

### Narrative basis

Max Arthur Macauliffe, *The Sikh Religion: Its Gurus, Sacred Writings and Authors*, Volume I (Oxford: Clarendon Press, 1909), *Life of Guru Nanak*.

- [Full narrative](https://en.wikisource.org/wiki/The_Sikh_Religion/Volume_1/Life_of_Guru_Nanak).
- [Printed p. 33](https://en.wikisource.org/wiki/The_Sikh_Religion/Volume_1/Life_of_Guru_Nanak#33): Mardana at Sultanpur, hereditary musicianship, shared meals and nightly singing.
- [Printed p. 44](https://en.wikisource.org/wiki/The_Sikh_Religion/Volume_1/Life_of_Guru_Nanak#44): forest hunger, village hospitality, presents and return with bundles; continues on p. 45.
- [Printed p. 80](https://en.wikisource.org/wiki/The_Sikh_Religion/Volume_1/Life_of_Guru_Nanak#80): unfriendly village and compositions; [p. 81](https://en.wikisource.org/wiki/The_Sikh_Religion/Volume_1/Life_of_Guru_Nanak#81): contrasting wishes for two villages and Mardana's question.
- [Printed p. 101](https://en.wikisource.org/wiki/The_Sikh_Religion/Volume_1/Life_of_Guru_Nanak#101) and p. 102: Shaikh Kamal hears the music, learns a couplet and returns to Shaikh Brahm; the subsequent meeting includes Mardana reciting from Asa ki Var on [p. 105](https://en.wikisource.org/wiki/The_Sikh_Religion/Volume_1/Life_of_Guru_Nanak#105).
- [Printed p. 111](https://en.wikisource.org/wiki/The_Sikh_Religion/Volume_1/Life_of_Guru_Nanak#111): captivity at Saiyidpur, work assignments and Mardana's practical objection to playing; [p. 113](https://en.wikisource.org/wiki/The_Sikh_Religion/Volume_1/Life_of_Guru_Nanak#113) and pp. 114–115: wonders, Babur encounter, release and lament.
- [Printed p. 181](https://en.wikisource.org/wiki/The_Sikh_Religion/Volume_1/Life_of_Guru_Nanak#181): Kartarpur, illness and final conversation; [p. 182](https://en.wikisource.org/wiki/The_Sikh_Religion/Volume_1/Life_of_Guru_Nanak#182): final rites and Shahzada. Printed p. 182, footnote 1 (Wikisource endnote 388), records a cremation variant. Printed pp. 180–181 supply the Kartarpur/clothing setting.

Full narrative markdown and corresponding HTML were retrieved. Relevant passages were read directly. Printed-page numbers above were checked against the HTML's transcluded `data-page-number` and original page names, rather than inferred from OCR offsets. The p. 33 transclusion points to [original scan leaf 129](https://en.wikisource.org/wiki/Page:The_Sikh_Religion,_its_gurus,_sacred_writings_and_authors_Vol_1.djvu/129); p. 44 to leaf 140, p. 81 to leaf 177, p. 111 to leaf 207, p. 181 to leaf 277 and p. 182 to leaf 278. **All sixteen selected narrative pages and the original title page have now been visually compared; see the [Mardana scan report](../reviews/2026-10-23-mardana-scan-review.md).** This is not a whole-volume review.

### Context and comparison, not copied narrative

Satbir Singh, [“Mardana Bhai (1459–1534),” Punjabi University's Encyclopaedia of Sikhism](https://eos.learnpunjabi.org/MARDANA%20BHAI%20%281459-1534%29.html). The entry's full text and bibliography were read. It identifies traditions behind the biography and supplies further editions for research. Its web publication date was not established, so no invented publication year was added to the story JSON.

The draft does not reproduce the entry's English or add its distinctive childhood/family details. Its bibliography remains an acquisition route for an independently sourced revision. The entry is a modern secondary overview, and overlap with Macauliffe is not counted as independent confirmation of each episode.

## Claim-to-passage map

| Draft paragraph IDs | Source and locator | Supported content | Treatment |
| --- | --- | --- | --- |
| `sultanpur`, `the-rabab`, `shared-evenings` | Macauliffe I, chapter III, p. 33 | Store work, provisions given to the poor, Mardana coming from Talwandi, hereditary musicianship, rabab, meals and singing | Fresh indirect prose. No invented room, instrument design, mood or dialogue. |
| `companion` | The episodes below collectively | Mardana plays and asks practical questions | Explicit editorial synthesis of the selected episodes. |
| `hunger` through `letting-go` | Chapter IV, pp. 44–45 | Forest hunger, hospitality, later presents, bundles, the Guru's laughter, instruction to discard them and warning about offerings | Two village visits remain distinct. No new encounter or exact place name supplied. |
| `unwelcome` through `the-question` | Chapter VI, pp. 80–81 | Refused shelter and ridicule; next village's welcome; opposing wishes and explanation | Labelled a traditional episode; Mardana's question reported indirectly. The exchange is reported indirectly, without a new historical quotation. |
| `a-song-heard`, `carried-home`, `the-conversation` | Chapter IX, pp. 101–102, 105 | Kamal gathering wood, hearing Mardana, learning and repeating the couplet, welcoming meeting and later call for Asa ki Var | Prose summary, no new Gurbani translation. No invented room, dialogue or private thought. |
| `saiyidpur` through `release` | Chapter IX, pp. 111–115 | Attack, captivity, load/horse assignments, distressed women, call to play, Asa, narrated wonders, release and return | Violence stated without graphic detail. Miracles explicitly attributed. No claim that the hymn's occasion is independently corroborated. Hymns described, not newly translated. |
| `kartarpur` | Chapter XV, pp. 180–181 | Settled community, pilgrim's clothing set aside, singing/prayers | Follows the source; no new itinerary or dates attached. |
| `illness` through `the-river` | Chapter XV, pp. 181–182, printed p. 182 n. 1 (Wikisource endnote 388) | Illness, body/tomb conversation, death, rites and variant | Later traditional dialogue is identified as such. River disposal and cremation variants both disclosed. |
| `shahzada`, `the-place` | Chapter XV, p. 182 | Consolation and invitation for the son to continue in his father's capacity with equal honour | Final image is a prose synthesis of the invitation; no invented performance by Shahzada. |

## Editorial choices and unresolved points

1. **Muslim identity / conversion:** Macauliffe says Mardana had become a Sikh, while the university entry describes Guru Nanak's Muslim companion. The draft does not impose an unsupported binary identity or conversion narrative. Review a range of Sikh historical perspectives before elaborating this subject.
2. **Authorship of saloks:** Macauliffe describes Guru Nanak's saloks dedicated to Mardana; the university entry attributes one to Mardana. No authorship claim or Gurbani quotation from that material is included. A future textual anchor needs a dedicated check of the source heading and interpretation.
3. **Final rites:** Macauliffe's own footnote records another account. The variant is retained in the body because it is directly material to the passage, rather than hidden behind an apparently certain conclusion.
4. **Narrative continuity:** Several stories are selected; no dates, precise elapsed years, invented transition scenes or sequence independent of this source have been added.
5. **Character:** Mardana is presented through skill, companionship and questions. The draft avoids reducing him to the hunger or fear that later stories sometimes give him for comic or didactic effect.
6. **Miraculous claims:** The captivity wonders remain elements of the telling. No neutral-history certification is asserted.
7. **Sources:** This remains one narrative source, although passages are precisely mapped. The modern encyclopedia is context, not a substitute for consulting its bibliography. A source-diversity milestone should be assessed across the wider pilot set, not manufactured inside this draft.

## Rights record

- Narrative basis: Macauliffe's original 1909 Clarendon Press work. A modern translator's wording or an edition's newly added material was not used as the narrative text.
- Retelling: new prose for Naamras, 23 October 2026. No direct historical dialogue or Gurbani translation reproduced.
- Modern university entry: research/comparison only; no copied paragraph or distinctive expanded biography in the draft.
- Artwork: none commissioned or acquired. The draft requests the existing symbolic `journey` artwork.
- A source's historical reliability and rights to its wording are separate questions. The JSON records review as pending, independently of the original-edition rights basis.

## Before publication

- [x] Compare the selected transcriptions with page images, including printed p. 182 n. 1; sixteen narrative pages and the original title page visually inspected.
- Complete an independent English edit and history/Gurmat review. Record actual names/dates/evidence only after a real review.
- Check source-sheet display, section navigation, reading position, offline behavior and the seven-minute metadata with the parent implementation.
- Add to the catalog only through the deliberate editorial publishing decision; this research task does not publish it.

## Follow-up source check — 23 October 2026

The Macauliffe I transcription was retrieved again and compared with the selected episodes, including the Sultanpur music, presents, Shaikh Kamal, captivity and final rites. The source still supports the selected narrative; its traditional character and the final-rites variant remain explicit. The duplicate sentence ending the Kartarpur paragraph was removed in draft reading revision 2; this does not change the episode or its paragraph ID. Automated editing is not the pending independent English or history/Gurmat review. That early check preceded the now-completed visual comparison; see the later scan report.

## Review implementation — 23 October 2026

The current draft is reading revision 3, metadata revision 1: 1,354 words. The separate AI English and history/Gurmat reviews passed after rereading the final prose. Accepted edits shorten repetition and use a neutral transition between episodes; Macauliffe himself describes another Pak Pattan visit, so the prior wording was not a fabricated chronology error. Source metadata now includes printed p. 115 for the lament, p. 180 for Kartarpur, and the printed footnote number separately from Wikisource endnote numbering. Human review remains pending.
