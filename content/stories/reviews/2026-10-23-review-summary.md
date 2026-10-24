# Stories: completed AI reviews and source-image comparison

23 October 2026. Scope: the eight public English readings and three unpublished pilot packages in Naamras.

Two fresh, separately delegated AI reviewers completed English and history/Gurmat source assessments. They reread accepted prose changes and recorded final verdicts and version hashes. All eleven current packages pass those bounded AI assessments after the corrections below. These are separate AI passes, not human reviewers, institutional approval or historical certification. Human review fields remain pending.

## Visual evidence

Four scan reviewers read the actual original Macauliffe page images, rather than relying on OCR or the Wikisource transcription. The implementing editor inspected the original title pages and rendered the comparison PDF into readable page images.

| Witness | Pages visually inspected | Record |
| --- | --- | --- |
| Macauliffe I, 1909 | 36 distinct narrative pages, plus original title page | [Six short sakhis](2026-10-23-public-volume-i-scan-review.md); [Mardana](2026-10-23-mardana-scan-review.md) |
| Macauliffe II, 1909 | 16 narrative pages, plus original title page | [Khivi and Amar Das](2026-10-23-volume-ii-scan-review.md) |
| Macauliffe V, 1909 | 15 narrative pages, plus original title page | [Khalsa](2026-10-23-khalsa-scan-review.md) |
| Sri Gur Sobha, Kulwant Singh's 2014 edition | 32 PDF pages, including title/imprint/contents and selected comparison passages | [Comparison edition](2026-10-23-sri-gur-sobha-scan-review.md) |

Total: **67 original narrative pages, three original title pages and 32 comparison-PDF pages**. These are targeted source checks, not cover-to-cover reviews of four books. Macauliffe I pp. 44–45 were inspected by two reviewers but counted once.

The original title leaves confirm Oxford, Clarendon Press, 1909 and the respective volume: Archive zero-based n8 for Volume I, n4 for II and n6 for V. Printed-page numbers, Archive's zero-based image indices and Wikisource's one-based leaves are distinguished in the reports. The [evidence manifest](2026-10-23-review-evidence.json) retains source URLs, image/PDF hashes, exact inspected pages and final package hashes without distributing source images through the app.

## Accepted changes

- **Amar Das:** the source says the weavers brought the woman; the public p6 now uses that wording instead of inferring her family. The note distinguishes predicted recovery and growth of the peg from a reported fulfilment. Reading revision 2, 518 words; paragraph IDs retained.
- **Milk and gold:** the citation now includes pp. 84–91 so it supports the setting and Brahm/Ibrahim identification as well as the milk/basin episode. Text unchanged; metadata revision 2 preserves reading identity.
- **Mardana:** the citation now includes p. 115 for the lament, p. 180 for Kartarpur, and printed p. 182 n. 1 separately from Wikisource endnote 388. Repeated explanation was cut and an episode transition made neutral. The previous wording followed Macauliffe's another-visit sequence; it was not a fabricated historical error.
- **Khalsa:** the scene at the volunteers' reappearance now stays in narrative voice. Repeated explanations were shortened. The earlier poem and later ceremony account remain distinct; no unseen action, disputed crowd total or contributor identity was supplied.
- **Expanded Khivi:** repeated food/community explanation was cut. The direct textual anchor, household passages, credited modern interpretation and Amro's separate contribution remain.
- **Sri Gur Sobha locators:** the report records a duplicated local stanza number on p. 64 and mismatched English global numbers on p. 113. Chapter-local numbers, original global numbers and printed pages locate the intended passages.

The remaining optional stylistic changes to the public short texts were not necessary to pass the reviews. No extra scenes, conversations or private thoughts were added to increase length. Traditional miraculous elements remain attributed; the image comparison establishes fidelity to the selected source, not independent proof of the events.

## Current pilot versions

| Pilot | Reading revision | Words | Reading time | Result |
| --- | ---: | ---: | ---: | --- |
| Becoming the Khalsa | 2 | 1,452 | 8 min | Separate AI English/history passes; narrative and comparison images checked |
| The Music Beside the Journey | 3 | 1,354 | 7 min | Separate AI English/history passes; 16 narrative images and title checked |
| The Shade of a Shared Table | 3 | 653 | 4 min | Separate AI English/history passes; cited Macauliffe images checked |

The [English report](2026-10-23-english-ai-review.md) and [history/Gurmat report](2026-10-23-history-gurmat-ai-review.md) preserve their initial findings, accepted/declined suggestions, follow-up reads and exact versions. The scan correction to Amar Das is explicit in the follow-up; it is not hidden behind the earlier broad pass.

## Verification and remaining scope

Public/draft corpus validation passed. Six focused content/repository/reader/shelf/store test files passed **73 tests**. Final app/tooling TypeScript, production build, startup bundle audit and built-story/draft-exclusion checks passed. All eleven final package hashes match the evidence manifest. The app QA file records exact verification scope; browser/native acceptance was not repeated for this prose-and-citation pass.

The catalog still has eight public readings. The three pilots remain outside production; completing an AI review did not silently publish them or manufacture human signoff. Human English and Sikh history/Gurmat reviews, wider recension/historical corroboration and the Kanhaiya full-text acquisition remain distinct work. No publisher or reviewer was contacted, and no modern translation was cleared for republication by this task.
