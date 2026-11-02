# Fine Contents: Sukhmani, Raag Maala and Ardaas

This report records reviewed navigation metadata and production-normalizer tests. Registry activation and the live hierarchical Contents interface are owned separately; this report does not claim a browser pass. Scripture text, row order, source attribution and page metadata remain unchanged.

| BaniDB reading | Captured rows | Root entries | Child entries | Total navigation targets |
| --- | ---: | ---: | ---: | ---: |
| 31 Sukhmani Sahib | 2,019 | 24 | 192 | 216 |
| 38 Raag Maala | 62 | 7 | 0 | 7 |
| 24 Ardaas | 29 | 14 | 0 | 14 |
| Total | 2,110 | 45 | 192 | 237 |

All IDs in this report are **bani-local selection-row IDs**. They are not global verse IDs or shabad IDs and must not be used to construct cross-API links.

## Evidence and acquisition

The complete provider source is the existing captured archive `scripts/qa/fixtures/bani-structure-snapshots-20261101.json.gz`. Generation uses its payloads through the real `fetchBani` normalizer, not a second normalization implementation. The provider endpoints are [Sukhmani 31](https://api.banidb.com/v2/banis/31), [Raag Maala 38](https://api.banidb.com/v2/banis/38), and [Ardaas 24](https://api.banidb.com/v2/banis/24). No fresh payload or translation acquisition was needed for this refinement.

Primary/source-text references checked on 2026-11-02:

- [Punjabi University, Encyclopaedia of Sikhism: Sukhmani, Gurbachan Singh Talib](https://eos.learnpunjabi.org/SUKHMANI.html). It specifies 24 ashtpadis, eight stanzas in each, a preceding salok for each, and one rahau in the composition.
- [Sri Granth, SGGS Ang 1430](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=1430&g=1&h=1&k=2&p=&r=1&t=1) and [Ang 1429 source-text view](https://www.srigranth.org/servlet/gurbani.gurbani?Action=KeertanPage&I=22085&K=1429&L=18&Lang=1). The text names the six raag families and their transitions; [the Ang 1430 Gurmukhi view](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=1430&g=2&h=&k=0&p=0&r=0&t=0) independently confirms the Deepak/Siri Raag transition. Displayed reader text remains the captured BaniDB text; punctuation or ordering from alternate presentation views is not imported.
- [SGPC: Ardas](https://sgpc.net/ardas/). Its published prayer distinguishes remembrance of the Gurus, Guru Gobind Singh, Guru Granth Sahib, the beloved ones, sacrifices, institutions, collective petitions and closing prayer. It corroborates the topics of the chosen source incipits; it does not prescribe the 14 navigation labels used here. The SGPC page also displays closing material outside this captured 29-row reading; that material is not added to the reader.

## Sukhmani: retain the salok parents, reveal eight stanzas

The 24 existing parent records are copied exactly from the already reviewed Sukhmani profile, including their IDs, preceding-salok targets, numbers and separate ashtpadi-body excerpts. A parent therefore still starts before stanza 1. The first two title/mangal rows before the first salok stay in the loaded document. Each parent gains eight children labelled Stanza 1–8 using the shared localized `stanza` label; no salok or ninth stanza is fabricated.

The 192 starts and their independent closing-row evidence are recorded in `scripts/qa/bani-sections/compositionFineAnchors.ts`. Every child range has exactly one printed terminal for its ordinal 1–8. Every eighth stanza additionally ends with the corresponding ashtpadi number 1–24. Provider paragraph metadata independently confirms the first body row of each stanza, with one explicitly handled exception:

**Ashtpadi 1:** stanza 1 starts at 5239 and its printed ending is 5248. The rahau is 5249–5250. Stanza 2 starts at **5251**, not 5249. The provider assigns the rahau the same paragraph metadata as stanza 2; it is therefore unsuitable as an unqualified boundary detector. The rahau stays within the first child's navigation interval. The existing research note describing the rahau as part of the first provider paragraph group should be read with this more precise correction: it belongs with stanza 1 for navigation, but raw provider paragraph 8 also contains stanza 2.

Other preserved exceptions include variable stanza row counts, the salok/body Ang 263→264 transition for Ashtpadi 2, and the actual eighth-stanza starts at 6570 in Ashtpadi 16 and 7239 in Ashtpadi 24. No fixed ten-row stride is used.

## Raag Maala: opening plus six named transitions

These are raag-family landmarks, not six numbered pauris. Repeated printed `॥੧॥` markers do not determine the number of menu entries. The opening entry preserves the mangal/title and the two opening body lines before Bhairao. The final summary remains inside the Megh range.

| Landmark | Target | Excerpt | Original Ang |
| --- | ---: | ---: | ---: |
| Opening | 9216 | 9218 | 1429 |
| Raag Bhairao | 9220 | 9220 | 1429 |
| Raag Maalkausak | 9230 | 9230 | 1430 |
| Raag Hindol | 9240 | 9240 | 1430 |
| Raag Deepak | 9251 | 9251 | 1430 |
| Siri Raag | 9258 | 9258 | 1430 |
| Raag Megh | 9266 | 9266 | 1430 |

Deepak begins at the transition line 9251, after Hindol's closing line 9250. The occurrence of a closing numeral on 9251 does not move the landmark back to 9250. English/Punjabi/Hindi labels name only the raag stated by the source.

## Ardaas: source incipits, not canonical section names

Fourteen compact landmarks use literal Gurmukhi incipits across all UI locales. The existing interface marks literal Gurmukhi labels with the appropriate language tag. They are editorial navigation groupings supported by the source, **not a claim that Ardaas has 14 canonical sections or exactly 14 provider paragraphs**.

| Target | Label incipit | Grouping decision |
| ---: | --- | --- |
| 3708 | ੴ ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫਤਹ | Starts at the title; excerpt is invocation 3709, retaining all opening headings. |
| 3714 | ਪ੍ਰਿਥਮ ਭਗੌਤੀ ਸਿਮਰਿ ਕੈ | Preserves the uninterrupted opening verse through 3719. |
| 3720 | ਦਸਵੇਂ ਪਾਤਸ਼ਾਹ | A useful remembrance transition explicitly present in SGPC's text. |
| 3721 | ਦਸਾਂ ਪਾਤਸ਼ਾਹੀਆਂ ਜੀ ਦੀ ਜੋਤ | Distinct Guru Granth Sahib remembrance within the provider's same paragraph. |
| 3722 | ਪੰਜਾ ਪਿਆਰਿਆਂ ਚੌਹਾਂ ਸਾਹਿਬਜ਼ਾਦਿਆਂ | Keeps the complete prose row together. |
| 3723 | ਜਿਨ੍ਹਾਂ ਸਿੰਘਾਂ ਸਿੰਘਣੀਆਂ ਨੇ | Keeps the complete prose row together. |
| 3724 | ਪੰਜਾਂ ਤਖ਼ਤਾਂ ਸਰਬੱਤ ਗੁਰਦੁਆਰਿਆਂ | Keeps the complete prose row together. |
| 3725 | ਪ੍ਰਿਥਮੇ ਸਰਬੱਤ ਖਾਲਸਾ ਜੀ ਕੀ ਅਰਦਾਸ | Includes continued collective petition 3726. |
| 3727 | ਸਿੱਖਾਂ ਨੂੰ ਸਿੱਖੀ ਦਾਨ | Keeps the complete prose row together. |
| 3728 | ਸਿੱਖਾਂ ਦਾ ਮਨ ਨੀਵਾਂ ਮੱਤ ਉੱਚੀ | Keeps the complete prose row together. |
| 3729 | ਹੇ ਅਕਾਲ ਪੁਰਖ | Includes the Nankana Sahib petition at 3730. |
| 3731 | ਹੇ ਨਿਮਾਣਿਆ ਦੇ ਮਾਣ | Includes requests and forgiveness at 3732–3734. The source's occasion placeholder is preserved. |
| 3735 | ਨਾਨਕ ਨਾਮ ਚੜ੍ਹਦੀ ਕਲਾ | A recognizable closing prayer within the provider's longer paragraph. |
| 3736 | ਵਾਹਿਗੁਰੂ ਜੀ ਕਾ ਖਾਲਸਾ | Includes the closing Fateh at 3737. |

The provider does not attribute this reading to a known scripture source. All resolved source values remain null. Only supplied original page values are retained: the opening verse carries page 119, while prose from 3720 onward has null original pages. Neither source D nor Ang 119 is inferred for that prose. The initial title itself also has no original page; its invocation excerpt having page 119 does not give the title an invented location.

## Implementation and checks

- Runtime data: `src/content/baniSections/compositionFineProfiles.ts`, exporting `COMPOSITION_FINE_SECTION_PROFILES`. These are full replacement profiles for IDs 24, 31 and 38, not additive duplicate matches.
- Offline generator: `scripts/qa/bani-sections/generateCompositionFineProfiles.ts`, consuming reviewed static anchors only. It refuses any complete-reading fingerprint other than the three already reviewed identities.
- Fingerprints remain `bani-v1:29:e4ceed9285768686`, `bani-v1:2019:c1b22c8d9185fae1`, and `bani-v1:62:f886d4647af98830` for IDs 24, 31 and 38 respectively.
- Generation/replay tests use the real `fetchBani`, check every resolved target/excerpt in all three locales, compare the entire original row stream, retain all Sukhmani parents, check all 192 printed stanza terminals and independently compare paragraph starts. Interior deletion, reordering and changed text in each reading all fail closed through the production normalizer and full fingerprint guard.
- An independent source audit also checked all 192 child ranges and the Raag Maala/Ardaas target and excerpt intervals; it found no concrete anchor or label issue.
- Coverage summary: `scripts/qa/fixtures/bani-sections-composition-fine-coverage-20261102.json`.

Reproduce generation with `UPDATE_COMPOSITION_FINE_PROFILES=1 node node_modules/vitest/vitest.mjs run --configLoader runner --no-cache --maxWorkers=2 src/content/baniSections/compositionFineProfiles.test.ts`. Without the environment flag, the same test requires checked-in profiles to match generation exactly. No generic punctuation parser runs in the application or the generator.

The family suite passes **16 tests**; the combined fine-profile, shared resolver and existing SGGS suite passes **120 tests**. Live UI/visual verification remains a separate integration step.
