# Sikh stories: source audit and expansion plan

Date: 22 October 2026. Scope: the current local Naamras English story collection, its publishing model, and sources for substantial future readings.

## Decision

Keep the eight existing readings as a short introductory shelf. Strengthen their evidence and editorial records, then develop three substantial pilots before expanding the catalog. Build a collection of original, carefully edited English narratives using named source editions and independent context. Use licensed English editions where their terms fit. Continue inside Read → Stories and the existing reader.

The immediate weakness is editorial depth and source diversity. A larger feed or another reader would not address it. A well-attributed traditional account and a documented historical profile are both worthwhile; they make different promises to the reader.

## What was audited

- Read all eight JSON texts, catalog entries, source references, account notes, editorial notes, and rights declarations.
- Retrieved the two cited Macauliffe narratives and compared the corresponding passages with the story treatments. Read relevant parts of his introduction to understand his source method.
- Inspected the story types, repository parser, corpus validator, browser, reader, and existing implementation/research documents.
- Ran `npm run stories:verify`: passed for **8 stories, 3 collections, 3,737 words**.
- Checked primary organization/publication pages and university reference entries for the acquisition options below. Rechecked SikhRI's published terms.

This is a content and implementation audit of the working tree. It does not establish what is deployed in production. It is not a fresh browser/device accessibility audit, an independent Sikh history/Gurmat review, a plagiarism certification, or a rights clearance for future editions. No application code or story prose was changed for this audit.

## Where the current eight come from

**Every story cites Max Arthur Macauliffe, *The Sikh Religion: Its Gurus, Sacred Writings and Authors* (1909).** Six use Volume I's *Life of Guru Nanak*; two use Volume II's *Life of Guru Angad*. Each has one citation. The app declares these to be original English retellings/profiles based on the original edition, rather than reproductions of a modern story collection.

The accessible source transcriptions are [Volume I](https://en.wikisource.org/wiki/The_Sikh_Religion/Volume_1/Life_of_Guru_Nanak) and [Volume II](https://en.wikisource.org/wiki/The_Sikh_Religion/Volume_2/Life_of_Guru_Angad,_The_Second_Guru).

| App reading / file ID | Words | Classification | Current source locator | Editorial action |
| --- | ---: | --- | --- | --- |
| The Bread at Lalo's Table / `bhai-lalo` | 458 | Traditional sakhi | I, chapter IV: Lalo's hospitality, Malik Bhago's feast, bread comparison | Keep concise. Trace the underlying account and retain the distinction between traditional miracle and independent corroboration. |
| The Shade of a Shared Table / `mata-khivi` | 438 | Historical profile | II, chapters I, III–V: family, kitchen, Satta/Balwand, Bibi Amro | Add the direct Guru Granth Sahib locator, Ang 967, and independent context. Develop her leadership without invented kitchen scenes. |
| A Thread That Would Not Break / `the-sacred-thread` | 482 | Traditional sakhi | I, chapter II: janeu ceremony and responses | Keep the ceremonial setting attributed to the tradition. Verify a direct Gurbani locator separately from the setting. |
| The Water He Carried / `guru-amar-das-service` | 518 | Traditional sakhi | II, chapters V and VII: Bibi Amro, service, storm, succession | Preserve the sequence; explain the source tradition and its miraculous elements. Potential for a related longer profile rather than padded prose. |
| The House That Hid Its Darkness / `sajjan` | 466 | Traditional sakhi | I, chapter IV: lodging, hymn, confession and restitution | Preserve restitution as well as transformation. Verify any linked shabad and do not turn the dialogue into historical quotations. |
| Water Turned West / `water-at-haridwar` | 504 | Traditional sakhi | I, chapter IV: water, rosary, thoughts of trade, cooking space | Keep the three exchanges identifiable as one source's sequence; avoid generalizing the encounter to all Hindu practice. |
| A Needle for the Next World / `the-needle` | 440 | Traditional sakhi | I, chapter XI: Duni Chand, needle, wife, distribution of wealth | Keep short. Continue to disclose that the preceding rebirth episode was omitted. |
| The Milk and the Gold / `the-milk-and-the-coin` | 431 | Traditional sakhi | I, chapter VII: Shaikh Brahm, milk, coins, transformed basin | Keep explicitly traditional. Retain the distinction between Shaikh Brahm/Ibrahim and the earlier Shaikh Farid. |

All are revision 1 and display **3 minutes**, calculated by rounding up at 200 words/minute. The mean is **467 words**. Six center Guru Nanak; the other two concern Guru Angad's household and Amar Das's service. The collection has little chronological breadth and only one woman as its principal subject.

### Findings

**The citations are real and relevant.** The compared passages support the principal narrative sequences. The notes disclose condensation, omitted episodes, paraphrased dialogue, and miraculous elements. This is a useful foundation. It does not establish the independent historicity of every detail.

**The entire shelf inherits one interpreter's selection.** Macauliffe is a later synthesis of Sikh sources and traditions. In his [introduction](https://en.wikisource.org/wiki/The_Sikh_Religion/Volume_1/Introduction), he explains that he uses a Janamsakhi base supplemented by other accounts. Eight citations to this work are not eight independent witnesses. We should trace important episodes further when possible and consult later scholarship.

**The source locators are usable but could be substantially better.** Chapters and episode descriptions are present; printed page/scan links, underlying recension, edition/translation distinctions, and claim-level evidence are absent. The two links open very long texts. Wikisource's [work index](https://en.wikisource.org/wiki/The_Sikh_Religion) also marks the overall transcription incomplete. Compare selected passages with scans before preparing new editions; do not assume all six volumes have complete, proofread web text.

**The content is introductory.** Every reading has almost the same length. Some episodes deserve that brevity. Longer work needs additional supported context, developed lives, or a connected historical arc, rather than extra description around the same short episode. Several existing endings explain their meaning explicitly; the English edit should assess whether the final action or image can carry more of that work.

**The review process is still unfinished.** The earlier implementation plan explicitly leaves independent English editing and Sikh history/Gurmat review open. There are no named writer/editor/reviewer records in the story model. Do not infer specialist approval from successful validation or a source citation.

**The publishing model limits responsible expansion.** `StorySource` has title, author, year, reference, and URL, but no source role or edition detail. Rights accept only `original-retelling` / `public-domain-source`. The build validator applies a moving publication-year cutoff to every citation; in 2026 it rejects sources newer than 1930. This would reject a modern research citation even when its prose is not being republished. The runtime parser does not apply the same cutoff. A year threshold is not an edition-specific rights assessment.

**The reading foundation can be extended.** The code already supports continuous text, appearance preferences, source/glossary sheets, local saves, revision-aware resume, offline text, and next-story navigation. The model currently has paragraphs without sections, per-paragraph citations, series, or publication-stage metadata. Featured selection is hardcoded to `bhai-lalo`. These are bounded changes once the pilots establish what is necessary.

## Where to obtain more substantial material

Source value has two separate dimensions: what a work can tell us, and what English text/assets we may distribute. An early text can be important without being neutral reportage. A modern translation may be useful for research without being available for republication. Two websites hosting the same work remain one source.

| Source / access route | Best use | Reliability and access limits | Recommended route |
| --- | --- | --- | --- |
| Guru Granth Sahib; Bhai Gurdas's Varan in named editions | Direct textual anchors, early Sikh vocabulary and teachings | A teaching does not by itself establish a later narrative setting. Varan are distinct from Guru Granth Sahib. English translations have their own attribution and terms. | Cite exact Ang or Vaar/Pauri; use a verified permitted translation or reviewed original explanation. |
| [Macauliffe's six-volume work](https://en.wikisource.org/wiki/The_Sikh_Religion) and original scans | Immediately accessible English narrative material beyond the current selection | Later synthesis; dated editorial perspective; transcription completeness varies. | Use selected original-edition passages, compare scans, cross-check context, and write fresh prose. Avoid relying on him alone for the whole collection. |
| Named Janamsakhi recensions, especially Puratan and B40 | Guru Nanak narratives and comparison of tellings | Identify recension, manuscript/edition, editor and translator. Do not silently merge variants or assume eyewitness authorship. | Use the [Punjabi University overview and bibliography](https://eos.learnpunjabi.org/JANAM%20SAKHI%20.html) to locate editions. Acquire and read the exact passage before drafting. |
| [Sri Gur Sobha](https://eos.learnpunjabi.org/SRI%20GUR%20SOBHA.html), Sainapati; [SikhRI introduction](https://sikhri.org/videos/sri-gur-sobha) | Khalsa formation, ideals, Anandpur and Guru Gobind Singh's period | An early work, usually dated to completion around 1711, with a history of composition discussed in the university entry. It is poetry combining praise and historical narrative. | Prioritize chapters 5–7 for a first Khalsa feature; record the edition and obtain a suitable English translation. These chapters are identified by the reference entry, not newly translated or fully audited here. |
| [Parchi Bhai Kanhaiya](https://eos.learnpunjabi.org/PARCHI%20BHAI%20KANHAIYA.html), Bhai Sahaj Ram | A life of service beyond the single familiar battlefield episode | University entry identifies **20 sakhis**, composition between **1728 and 1740**, and a 1966 edited publication. Its spiritual purpose is explicit. Full text and an eligible English edition have not been inspected here. | High-priority acquisition lead for a substantial Bhai Kanhaiya profile and possible later selections. Locate the source first; source count is not publishable inventory. |
| [Parchian Seva Das](https://eos.learnpunjabi.org/PARCHIAN%20SEVA%20DAS.html) | Further traditional anecdotes, especially Guru Gobind Singh | University entry identifies **50 anecdotes**, 38 concerning the tenth Guru, and an Udasi perspective. It characterizes the work as hagiographical. Full collection and English translation availability remain unverified. | Research and select individually, retain tradition context, and compare with other witnesses. Do not equate overlap with independent confirmation. |
| [Sri Gur Panth Prakash: Volume I archive](https://archive.org/details/SriGurPanthPrakashVolume1episodes1To81); existing Naamras Books edition | Extended Khalsa and eighteenth-century arcs | Later retrospective chronicle. Local metadata identifies Kulwant Singh's English volumes, Institute of Sikh Studies, **2006/2010**, and OCR limitations. The existing app indexes **169 chapters**. The eight sakhis do not use this translation. | Reuse research and navigation infrastructure, not assumed rights. Verify the selected source text and translation authorization before republishing/adapting its English or expanding distribution. |
| [Suraj Prakash in English](https://gurupurshotam.com/history-of-the-gurus/), Jaswinder Singh Sehmbi | Extensive traditional narratives across the Gurus' lives | The site describes a full translation and identifies its Sampradaic perspective, translator, and supporting references. A sample opening was inspected; completeness and quality of every chapter were not audited. No blanket adaptation/distribution grant was established. | Strong depth/partnership prospect. Select exact chapters, compare with source and context, and establish the terms for any reused or adapted English. |
| [SikhRI](https://sikhri.org/articles), Sojhi and university scholarship | Modern interpretation, thematic selection, source criticism and editorial partnerships | Individual pieces differ. Many sakhi-series pages are audio descriptions rather than complete written narratives. | Prioritize written, referenced work. A useful example is Santbir Singh's [Guru Angad feature](https://sikhri.org/articles/guru-angad-sahib-cultivating-the-sikh-mind-body-and-community), which includes the Mata Khivi passage at Ang 967 and contextual references. |
| [Sikh Research Journal](https://sikhresearchjournal.org/index.php/srj/about); histories by J. S. Grewal, Ganda Singh and other named historians | Context, chronology, bibliography and conflicting interpretations | SRJ describes an open-access peer-review process. Open access is not one uniform reuse licence; evaluate articles and arguments individually. Other named books are acquisition leads, not fully reviewed in this audit. | Use for research and original synthesis, following references back to the works used. Record each article's actual licence for any text reuse. |
| [Sikh Missionary Society publications](https://www.sikhmissionarysociety.org/sms/smspublications/) and [Discover Sikhism's English catalog](https://www.discoversikhism.com/sikh_library/english.html) | Complete English stories, topic selection, and locating books | Examples include *The Guru's Way*, *In the Guru's Footsteps*, and the *Stories from Sikh History* series. Tone often targets younger readers; source apparatus varies. The first two explicitly carry a copyright notice. | Useful editorial/acquisition leads; inspect each book's author, evidence and rights. Do not substitute a download link for permission or scholarly verification. |
| [Panjab Digital Library](https://www.panjabdigilib.org/) | Manuscripts, scans, edition evidence, and less-circulated works | Archive access is not a blanket export or republication licence. Homepage/catalog access was verified; no specific manuscript text was fully examined here. | Use item records and page/folio locators for research. Check individual reproduction conditions before using scans or assets. |

SikhBookClub, SikhiWiki, SikhNet and general sakhi sites can help discovery. They should not be the sole evidence for an important historical claim. SikhNet's family/audio offering also differs from the English reading experience requested here.

SikhRI's [current terms](https://sikhri.org/terms-of-use) permit non-commercial use with citation and require prior written permission for commercial use. This is a useful published route. Before distributing a specific adaptation, translation, illustration or offline package, record which material and uses the terms actually cover. No outreach or agreement is implied by this audit.

## Editorial product

Offer three scales of reading as editorial guidance, not minimum word counts:

| Form | Indicative length | Shape |
| --- | --- | --- |
| Short sakhi | 450–900 words | One supported episode, told with precision |
| Feature / life profile | 1,200–2,000 words | A developed life, historical context, several clearly attributed episodes |
| Connected series | 3–5 parts, roughly 1,000–1,800 words each where warranted | A substantial arc with a deliberate sequence and an ending |

Depth means clear motivations as supported by sources, consequential choices, historical setting, Sikh concepts explained naturally, and careful treatment of variants. It does not require invented conversations, scenery, inner thoughts, or an obligatory moral after every story. Preserve traditional miraculous elements with accurate attribution; do not automatically remove them or present them as independently documented events.

Keep source scholarship available through the existing account sheet. Label historical narrative, traditional account, and contemporary reflection accurately. Verify any Gurbani link and its translation separately; a related teaching is not evidence that it was uttered at the narrated event.

## Implementation sequence

### 1. Strengthen the current eight

- Create a concise evidence dossier per reading: exact edition/passage, scan or stable locator, claims supported, editorial omissions, meaningful variants, and rights basis.
- Add a direct Ang 967 reference for Mata Khivi after verifying the chosen primary text/translation. Check the sacred-thread and Sajjan Gurbani references independently.
- Trace a second source or independent contextual discussion where useful. When only one narrative witness is available, state that rather than manufacturing corroboration.
- Complete an English edit and independent history/Gurmat review. Maintain actual review records; do not fabricate reviewer names, credentials or dates.
- Keep the short texts where that form fits. Increment revisions for changed prose or locator-affecting changes, and refresh catalog metadata together.

Deliverable: eight traceable revised reading packages, with review status recorded honestly. A review dependency need not prevent research, drafting, or technical preparation.

### 2. Separate evidence, rights, and review in the content model

Edit `src/types/stories.ts`, `src/data/storyRepository.ts`, and `scripts/stories/verify-stories.mjs` together:

- Give sources stable IDs and roles such as narrative basis, contextual scholarship, textual anchor, or comparison. Record original work date separately from edition/publication year; support approximate/unknown original dates.
- Record translator/editor, edition, and structured page/folio/chapter/verse locators when available. Distinguish the source work from the website hosting it.
- Replace the citation-wide age cutoff with explicit, edition-specific records for text actually being distributed. Allow modern research citations without implying rights to republish those works.
- Support both original retellings based on eligible sources and specifically licensed English material; preserve attribution and any use restrictions. Keep private agreements outside the public repository.
- Track author/editor credit and genuine review status. Keep the existing prohibition against an automated process claiming expert certification. Human review records require evidence of an actual review.
- Keep draft evidence/dossiers outside the public story catalog. A catalog entry remains a deliberate publication decision. Build checks should validate required evidence and references without pretending to evaluate historical truth.
- Migrate the eight existing packages with backwards-compatible defaults/cache handling. Define when a schema/cache version changes versus a story revision; do not silently invalidate reading positions unnecessarily.

Deliverable: one consistent parser/validator contract and an editorial checklist that can accommodate modern scholarship and licensed material.

### 3. Produce three pilots

| Pilot | Treatment | Evidence route | Entry condition |
| --- | --- | --- | --- |
| **Bhai Kanhaiya: service without an enemy** | Substantial profile, provisionally 1,200–1,800 words; go beyond repeating one moral anecdote | University biography and *Parchi Bhai Kanhaiya* bibliography; acquire exact source passages and suitable contextual research | Inspect the underlying text and resolve English access first. If insufficient, write a shorter honest piece or use the Mardana fallback. |
| **Becoming the Khalsa** | Feature of roughly 1,600–2,200 words, potentially opening a connected series | *Sri Gur Sobha*, chapters 5–7; compare later *Panth Prakash* treatment and modern history | Read and document the named editions. Do not import later dramatic details into an earlier source without attribution. |
| **Mata Khivi and the community she sustained** | Revise the existing profile; expand only as far as evidence allows | Ang 967, Macauliffe II, Santbir Singh's referenced discussion and its underlying sources | Separate directly attested praise, supported institutional context and later reconstruction. A short strong profile is acceptable. |

Fallback/new fourth candidate: **Bhai Mardana and the shared journey**. The [university biography](https://eos.learnpunjabi.org/MARDANA%20BHAI%20%281459-1534%29.html) provides a bibliography and identifies several source traditions. Develop his role as musician and companion, distinguishing separate anecdotes and variants rather than inventing a continuous travel scene.

The word ranges are estimates to guide editing. These are proposals with research dependencies, not completed manuscripts or cleared editions.

### 4. Extend the present reader only where the pilots need it

- Add optional section headings and an unobtrusive contents control for substantial readings. Keep existing paragraph IDs/resume semantics stable.
- Add optional series ID/order and explicit related readings. Retain the existing Saved shelf, Book appearance settings, routes, app shell and offline behavior.
- Keep source details, version/reteller credits, variants and glossary in the current account sheet. Public explanatory copy should stay brief; editorial workflow fields do not belong in the reading flow.
- Make featured reading an editorial catalog choice instead of a hardcoded story ID. Use a small deliberate selection for the first expansion.
- Add a verified route from an eligible story to an existing Books chapter when it offers useful depth and its edition is appropriate to distribute. Avoid duplicating an entire book in Stories.

No new backend is necessary for the first expansion. Static validated content is sufficient for this scale. Further reader features should follow an observed need in the edited pilots.

### 5. Expand in researched batches

After the pilots establish the standard, research the following in order of source readiness and balance. These are candidate subjects, not promises that every familiar detail will survive source review:

1. Bhai Mardana and Bebe Nanaki: early companionship, music and support; named Janamsakhi material and contextual biographies.
2. Bibi Amro and Amar Das: the transmission of a hymn and a developed life of service; Macauliffe II plus earlier/contextual sources.
3. Mai Bhago and Muktsar: read the relevant *Sri Gur Sobha* and later accounts, identifying what each actually records about individuals.
4. Guru Hargobind and release from Gwalior: distinguish detention/release evidence from the specific later Bandi Chhor narrative details.
5. Guru Har Krishan in Delhi: separate recorded events from later devotional elaboration.
6. Guru Arjan and the compilation of the Adi Granth: institutional history with strong bibliography, handled as a researched feature.
7. Bhai Mani Singh and Bhai Taru Singh: later Sikh history through a selected *Panth Prakash* passage and independent historical context; assess sensitive detail.
8. Further selected *Parchian Seva Das* and *Suraj Prakash* accounts, including women and less-familiar community lives when the evidence supports a worthwhile reading.

Publish roughly three or four finished pieces per batch. A useful first milestone is **12–16 excellent readings in total**, with a meaningful mix of short pieces, features and periods; the number is a capacity target, not a reason to publish weak material.

### 6. Verify and publish

- Run the corpus validator, relevant repository/store/reader/browser tests, TypeScript and lint checks for implementation changes, and the production build.
- Test one long feature end-to-end: open → change appearance → leave → resume → finish → open related story; repeat with offline text and a revised edition.
- Check light/dark, narrow mobile, large text, source-sheet focus and section navigation. Complete a native/device check before claiming iOS readiness.
- Require specific source locators, truthful classification, credited permissible English text, and actual editorial review status for each published package.
- Record corrections and revisions. Existing tests establish behavior; neither tests nor a checkbox certify historical accuracy.

## First executable work package

1. Establish the evidence/rights/review schema and create the eight source dossiers.
2. Improve the Mata Khivi source package and acquire the exact Khalsa and Bhai Kanhaiya source passages.
3. Draft the three pilots inside the existing content system; record unresolved review or source issues explicitly.
4. Implement the smallest reader additions demonstrated by those drafts, then run the stated verification.

The remaining external dependency is access to suitable editions and independent editorial/history review. Research and implementation can proceed without contacting anyone. No messages, permission requests to publishers, app deployment, or additional story publication were performed as part of this audit and plan.

## Repository evidence

- `public/data/stories/catalog.json` and the eight story JSON files
- `src/types/stories.ts`
- `src/data/storyRepository.ts`
- `scripts/stories/verify-stories.mjs`
- `src/components/StoryBrowser.tsx`
- `src/pages/stories/StoryReader.tsx`
- `sakhi-stories-plan.md`
- `docs/design/stories-matter-reference.md`
- `.lazyweb/design-research/sakhi-stories-2026-10-21/report.html`
- `public/data/library/works/panth-prakash-english/work.json`

Web sources are linked alongside the claims they support. Catalog/encyclopedia entries establish acquisition leads and descriptions, not a full audit of the works they describe. Reviewed 22 October 2026.

## Implementation progress — 23 October 2026

The first executable work package is implemented. The public eight have richer source packages and evidence dossiers, while a separate metadata revision preserves existing paragraph positions. Runtime and CLI share validation for sources, rights, real review records, sections, series and related readings.

Three unpublished pilots are available in the same reader through the development-only `/stories/drafts` shelf: Khalsa (1,452 words), Mardana (1,354), and the Khivi replacement profile (653). Mardana is the planned fallback because the full Kanhaiya source was not acquired. Its acquisition gap is recorded in `content/stories/research/bhai-kanhaiya.md`.

Production builds exclude the draft modules and texts. Preview reading does not write published Saved or reading positions. Separate AI reviews and the cited-page image checks are complete; human English/history reviews remain pending before public inclusion. The later 12–16-reading milestone follows those edited pilots.

The publishing workflow is documented in `content/stories/README.md`. Current verification evidence, including the browser matrix and fixes, is maintained in `docs/qa/stories-reader-20261023.md`.

### Resume audit and verification

The resumed pass rechecked the complete saved implementation and source packages. It corrected a missing Khivi page reference and repeated Mardana prose, normalized series metadata comparisons, and prevented replacement drafts from changing text or paragraph anchors without advancing the reading revision. Source and production validators now require explicit edition, rights and editorial records while retaining compatibility with legacy offline texts.

Fresh checks passed for 111 tests across 11 focused/adjacent files, app/tooling TypeScript, full ESLint, source/draft validation, the production build and startup audit, and production draft exclusion. The mobile/desktop browser matrix passed all eight cases (48 captured surfaces) with no layout issues, axe violations or browser exceptions. See the QA record for exact scope and remaining acceptance. The eight-reading public catalog is unchanged; the three working editions remain available for editorial preview only.

### Editorial and image review completion

At the user's request, two fresh AI reviewers separately assessed all eight public readings and all three pilots. The accepted draft edits were reread and passed. Four additional scan reviewers compared the Macauliffe passages; the implementing editor visually checked the comparison-edition PDF and original title pages. The bounded visual coverage is 67 Macauliffe narrative pages, three title pages and 32 Sri Gur Sobha PDF pages. Page mappings, source URLs, file hashes and precise findings are recorded in `content/stories/reviews/`.

The image check corrected Amar Das p6 from an inferred family relationship to the source's weavers, and distinguished predictions of recovery/green growth from fulfilment in the notes. The milk story's citation now includes pp. 84–91; Mardana's includes pp. 111–115, 180–182 and printed p. 182 n. 1 separately from Wikisource endnote 388. Two Sri Gur Sobha numbering inconsistencies are documented. These changes complete the separate AI and scan passes, without inventing human reviewer credentials or claiming that a later source independently authenticates each event. Human review and the later catalog-expansion milestone remain distinct.
