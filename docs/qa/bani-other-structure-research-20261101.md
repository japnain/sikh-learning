# Remaining Dasam and composite Bani structure research — 2026-11-01

## Status

This note records primary-provider structural evidence for 13 catalog entries beyond the Jaap/Savaiye/Chaupai/Rehras/Sohila research saved on 2026-10-31. It is one bounded part of the all-104-catalog investigation, **not a claim of complete catalog coverage**.

No application code or sacred text was changed. The live Japji visual gate remains pending at the time of writing. Recommendations below describe future navigation, not implemented or visually verified behavior. Coordinate the SGGS families with `reader_consistency`; its acquisition scope excludes these 13 IDs.

The companion note is [bani-variant-structure-research-20261031.md](bani-variant-structure-research-20261031.md). Its cautions about local verse IDs, source attribution, normalized versions and composite text order also apply here.

## Acquisition and provenance

| BaniDB ID | Provider title | Raw rows | Primary source URL |
|---|---|---:|---|
| 5 | ਸ਼ਬਦ ਹਜ਼ਾਰੇ ਪਾਤਿਸ਼ਾਹੀ ੧੦ | 89 | https://api.banidb.com/v2/banis/5 |
| 7 | ਤ੍ਵ ਪ੍ਰਸਾਦਿ ਸਵੱਯੇ (ਦੀਨਨ ਕੀ) | 43 | https://api.banidb.com/v2/banis/7 |
| 8 | ਅਕਾਲ ਉਸਤਤ ਚੌਪਈ | 49 | https://api.banidb.com/v2/banis/8 |
| 12 | ਅਥ ਚੰਡੀਚਰਿਤ੍ਰ | 26 | https://api.banidb.com/v2/banis/12 |
| 13 | ਚੰਡੀ ਦੀ ਵਾਰ | 357 | https://api.banidb.com/v2/banis/13 |
| 19 | ਸ਼ਸਤ੍ਰ ਨਾਮ ਮਾਲਾ | 61 | https://api.banidb.com/v2/banis/19 |
| 22 | ਆਰਤੀ | 256 | https://api.banidb.com/v2/banis/22 |
| 24 | ਅਰਦਾਸ | 29 | https://api.banidb.com/v2/banis/24 |
| 25 | ਸ੍ਰੀ ਭਗਉਤੀ ਅਸਤੋਤ੍ਰ (ਪੰਥ ਪ੍ਰਕਾਸ਼) | 54 | https://api.banidb.com/v2/banis/25 |
| 26 | ਸ੍ਰੀ ਭਗਉਤੀ ਅਸਤੋਤ੍ਰ (ਸ੍ਰੀ ਹਜ਼ੂਰ ਸਾਹਿਬ) | 40 | https://api.banidb.com/v2/banis/26 |
| 28 | ਬਾਰਹ ਮਾਹਾ ਸਵੈਯਾ | 54 | https://api.banidb.com/v2/banis/28 |
| 29 | ਅਕਾਲ ਉਸਤਤ | 1091 | https://api.banidb.com/v2/banis/29 |
| 53 | ਉਗ੍ਰਦੰਤੀ | 308 | https://api.banidb.com/v2/banis/53 |

Each live JSON response was fetched through a bounded Firecrawl interact session using Python `urllib`, in batches of at most three, with 18–22 second per-response timeouts. The session was stopped after retrieval. The provider returns full JSON; the remote code immediately removed inner `translation`, `transliteration`, `larivaar`, and `visraam` fields before returning data. No modern translations were retained in the local projections.

Local structural projections: `tmp/reader-live/banidb-{id}-structure.json`. They retain every row, original Unicode text, headers, source/page metadata, paragraph fields, order and variant flags. They are **not lossless full responses** and must not replace production canonical data.

`tmp/reader-live/provenance-other-20261101.json` records per-response retrieval timestamps, source URLs, full transport byte counts/SHA-256 hashes computed remotely, projection description, retained counts, and local projection byte counts/SHA-256 hashes. All 13 local projections were checked for retained row count and absence of the omitted fields.

The claims below are based directly on printed headings, original stanza endings, incipits and colophons in those provider responses. They do not make independent historical-authorship or edition-completeness claims beyond what the loaded source says.

## Shared parsing constraints

- IDs below are observed inner `verse.verseId` values. They locate rows inside the specified bani payload; they are **not established global scripture IDs**. Do not use them to fabricate global verse/shabad links.
- Keep the API's array order. For example, the Shabad Hazare collection title has ID 1324 but occurs before IDs 1313–1323. Sorting numeric IDs corrupts reading order.
- The `header` flag is incomplete. Akal Ustat has two printed metre headings with `header: 0`; Panth Prakash Bhagauti Astotr has an unmarked Chaupai heading; Aarti has headerless hymns/excerpts.
- A numeral-ending line can be a stanza, a paired local/global number, or a chapter colophon. A generic numeral parser must distinguish those cases.
- Repeated metre names and repeated scripture text need occurrence-specific anchors.
- Aggregate source attribution is null for IDs 5, 22, 24 and 28. Do not infer a known source for every row from a catalog grouping or fill missing attribution from a neighbouring composition.
- None of these entries should receive generic Pauri labels merely because the reading is named a bani.

## Akal Ustat — 29

The response has 1,091 rows. All four raw length flags retain the same text. It contains 271 sequential numbered stanza endings, followed by two unnumbered closing lines (IDs 5109–5110). Do not invent a numbered stanza 272 for that ending. The unnumbered four-line opening at 4023–4026 belongs before the first numbered Chaupai section.

There are 17 printed metre-section occurrences:

| Printed section heading | Cumulative printed stanza numbers | Heading local ID | Provider header flag |
|---|---:|---:|---:|
| ਆਗੈ ਲਿਖਾਰੀ ਕੇ ਦਸਤਖਤ ॥ ਤ੍ਵ ਪ੍ਰਸਾਦਿ ਚਉਪਈ ॥ | 1–10 | 4027 | 1 |
| ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ ਕਬਿੱਤ ॥ | 11–20 | 4069 | 2 |
| ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ ਸਵੱਯੇ ॥ | 21–30 | 4110 | 2 |
| ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ ਤੋਮਰ ਛੰਦ ॥ | 31–50 | 4151 | 2 |
| ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ ਲਘੁ ਨਿਰਾਜ ਛੰਦ ॥ | 51–70 | 4232 | 2 |
| ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ ਕਬਿੱਤੁ ॥ | 71–90 | 4313 | 2 |
| ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ ਭੁਜੰਗ ਪ੍ਰਯਾਤ ਛੰਦ ॥ | 91–120 | 4394 | 2 |
| ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ ਪਾਧੜੀ ਛੰਦ ॥ | 121–140 | 4515 | 0 |
| ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ ਤੋਟਕ ਛੰਦ ॥ | 141–160 | 4596 | 2 |
| ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ ਨਰਾਜ ਛੰਦ ॥ | 161–180 | 4677 | 2 |
| ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ ਰੂਆਲ ਛੰਦ ॥ | 181–200 | 4758 | 0 |
| ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ ਦੋਹਰਾ ॥ | 201–210 | 4839 | 2 |
| ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ ਦੀਰਘ ਤ੍ਰਿਭੰਗੀ ਛੰਦ ॥ | 211–230 | 4860 | 2 |
| ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ ਪਾਧੜੀ ਛੰਦ ॥ | 231–242 | 4941 | 2 |
| ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ ਸ੍ਵੱਯੇ ॥ | 243–252 | 4990 | 2 |
| ਤ ੍ਵਪ੍ਰਸਾਦਿ ॥ ਕਬਿੱਤ ॥ | 253–266 | 5031 | 2 |
| ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ ਪਾਧੜੀ ਛੰਦ ॥ | 267–271 | 5088 | 2 |

The printed Padhri heading at 4515 and Rual heading at 4758 are both marked as ordinary body rows. A header-only implementation incorrectly merges 121–140 into Bhujang Prayaat and 181–200 into Naraj. Preserve source typography; structural recognition can promote a verified boundary without rewriting the source text.

The Sraavag Suddh Savaiye excerpt (BaniDB 6) corresponds to cumulative 21–30. The Dheenan Ki excerpt (BaniDB 7) corresponds to cumulative 243–252. Matching text across endpoints does not make their local IDs interchangeable.

Proposed navigation: the opening, then the 17 source-named sections with ranges. Optionally expose numbered stanzas beneath each section. Preserve the two unnumbered final lines with the final section.

## Tav Prasad Savaiye, Dheenan Ki — 7

43 rows: three introductory/header rows and ten four-line savaiyye. The main Savaiye heading is local ID 1490; first body row is 1491 and last is 1530. Paired printed endings run **1/243 through 10/252**.

Proposed navigation: Savaiyya 1–10 with each opening excerpt. Retain cumulative source numbers 243–252 and distinguish this catalog variant from Sraavag Suddh (1/21 through 10/30).

## Akal Ustat Chaupai — 8

49 rows: five flagged headers, four unnumbered opening lines, and ten four-line Chaupais numbered 1–10. The numbered section's heading is 1539; its body starts at 1540 (ਪ੍ਰਣਵੋ ਆਦਿ ਏਕੰਕਾਰਾ) and ends at 1580. The unnumbered opening begins at 1535 (ਅਕਾਲ ਪੁਰਖ ਕੀ ਰਛਾ ਹਮਨੈ).

This is the opening Chaupai selection, not the entire Akal Ustat. Proposed navigation: opening and Chaupai 1–10. Do not turn the four invocation lines into a numbered stanza.

## Shabad Hazare Patshahi 10 — 5

89 rows, including 13 flagged headers. Ten distinct hymns are identified by their source headings and cumulative closing numbers 1–10:

| Hymn ordinal | Printed heading | Heading local ID | First body line |
|---|---|---:|---|
| 1 | ਰਾਮਕਲੀ ਪਾਤਸਾਹੀ ੧੦ ॥ | 1315 | ਸ਼ਬਦ ਹਜ਼ਾਰੇ ਪਾਤਿਸ਼ਾਹੀ ੧੦ |
| 2 | ਰਾਮਕਲੀ ਪਾਤਿਸਾਹੀ ੧੦ ॥ | 1325 | ਸ਼ਬਦ ਹਜ਼ਾਰੇ ਪਾਤਿਸ਼ਾਹੀ ੧੦ |
| 3 | ਰਾਮਕਲੀ ਪਾਤਿਸਾਹੀ ੧੦ ॥ | 1334 | ਸ਼ਬਦ ਹਜ਼ਾਰੇ ਪਾਤਿਸ਼ਾਹੀ ੧੦ |
| 4 | ਰਾਗੁ ਸੋਰਠਿ ਪਾਤਿਸਾਹੀ ੧੦ ॥ | 1343 | ਸ਼ਬਦ ਹਜ਼ਾਰੇ ਪਾਤਿਸ਼ਾਹੀ ੧੦ |
| 5 | ਰਾਗੁ ਕਲਿਆਣ ਪਾਤਿਸਾਹੀ ੧੦ ॥ | 1352 | ਸ਼ਬਦ ਹਜ਼ਾਰੇ ਪਾਤਿਸ਼ਾਹੀ ੧੦ |
| 6 | ਖਿਆਲ ਪਾਤਿਸਾਹੀ ੧੦ ॥ | 1361 | ਸ਼ਬਦ ਹਜ਼ਾਰੇ ਪਾਤਿਸ਼ਾਹੀ ੧੦ |
| 7 | ਤਿਲੰਗ ਕਾਫੀ ਪਾਤਿਸਾਹੀ ੧੦ ॥ | 1366 | ਸ਼ਬਦ ਹਜ਼ਾਰੇ ਪਾਤਿਸ਼ਾਹੀ ੧੦ |
| 8 | ਰਾਗ ਬਿਲਾਵਲ ਪਾਤਿਸਾਹੀ ੧੦ ॥ | 1375 | ਸ਼ਬਦ ਹਜ਼ਾਰੇ ਪਾਤਿਸ਼ਾਹੀ ੧੦ |
| 9 | ਰਾਗ ਦੇਵਗੰਧਾਰੀ ਪਾਤਿਸਾਹੀ ੧੦ ॥ | 1384 | ਸ਼ਬਦ ਹਜ਼ਾਰੇ ਪਾਤਿਸ਼ਾਹੀ ੧੦ |
| 10 | ਰਾਗ ਦੇਵਗੰਧਾਰੀ ਪਾਤਿਸਾਹੀ ੧੦ ॥ | 1393 | ਸ਼ਬਦ ਹਜ਼ਾਰੇ ਪਾਤਿਸ਼ਾਹੀ ੧੦ |

The six body rows of a typical three-stanza hymn are preceded by its refrain, giving eight body rows. Khyal has four body rows and ends with paired/triple numbering 1/1/6; it must not be padded to the other hymns' shape. A generic “three stanzas per hymn” assumption fails here.

Proposed navigation: ten hymns, using the printed raag/Khyal heading plus incipit and ordinal. Preserve internal stanza numbering and Rahao within each hymn. Keep repeated Ramkali and Devgandhari headings distinct.

## Ath Chandi Charitar — 12

26 rows. This catalog endpoint is explicitly the `ਚੰਡੀ ਚਰਿਤ੍ਰ ਉਸਤਤ ਬਰਨਨੰ` section, not all Chandi Charitar.

| Source division | Local heading / body start | Printed stanza endings |
|---|---|---|
| ਭੁਜੰਗ ਪ੍ਰਯਾਤ ਛੰਦ | 2021 / 2022 | 1/257 through 5/261 |
| ਦੋਹਰਾ | 2042 / 2043 | 6/262 |
| Closing chapter colophon | 2045 | chapter 8 |

The first division has 20 body lines, the Dohra has two, and the final colophon is one additional row. Its closing 8 is a chapter number, not a seventh stanza or a continuation after 262.

Proposed navigation: Bhujang Prayaat 257–261 and Dohra 262, keeping the colophon attached to the ending.

## Chandi Di Vaar — 13

357 rows; 55 sequential numbered poetic units. The printed form changes at number 6:

| Printed division | Heading local ID | Printed number range |
|---|---:|---|
| ਪਉੜੀ | 2051 | 1–5 |
| ਦੋਹਰਾ | 2087 | 6 |
| ਪਉੜੀ | 2090 | 7–55 |

The closing unit 55 ends at 2401; the unnumbered colophon is 2402. Source headings and stanza endings support per-unit navigation. Preserve the explicit Dohra label for number 6, rather than flattening every unit into an identical Pauri type. Keep the opening invocations and colophon in their source order.

## Shastar Naam Mala — 19

61 rows. The endpoint contains an unflagged title row, five flagged headers, 27 two-line Dohra units numbered 1–27, and a closing colophon. Heading 2572 is `ਦੋਹਰਾ ॥`; body starts at 2573; number 27 ends at 2626. Colophon 2627 explicitly closes the **first chapter** and ends with 1.

The selection is therefore first-chapter material, not evidence that the entire Shastar Naam Mala has only 27 units. The colophon's 1 must not create a new Dohra 1.

Proposed navigation: Dohra 1–27 within the loaded first-chapter selection, retaining source introduction and colophon.

## Ugardanti — 53

308 rows. The source title says six Bhagauti chhands. Each of the six main sections contains 44 unnumbered body lines; each is followed by a Dohra heading. The first five Dohra groups contain two lines each, while the sixth contains four. A closing Chaupai and colophon follow.

| Main division | Heading local ID | Opening excerpt | Following Dohra heading |
|---|---:|---|---:|
| First chhand (`ਛੰਦ ॥`) | 18358 | ਨਮੋ ਉਗ੍ਰਦੰਤੀ | 18403 |
| ਭਗਵਤੀ ਛੰਦ ਦੂਜਾ | 18406 | ਨਮੋ ਕਾਲਕਾ | 18451 |
| ਭਗਵਤੀ ਛੰਦ ਤੀਜਾ | 18454 | ਤੂਹੀ ਕਲਪ ਬ੍ਰਿਛਣ | 18499 |
| ਭਗਵਤੀ ਛੰਦ ਚੌਥਾ | 18502 | ਤੁਹੀ ਜੋਤ ਜਵਾਲਾ | 18547 |
| ਭਗਵਤੀ ਛੰਦ ਪੰਜਵਾਂ | 18550 | ਨਮੋ ਦੇਵਿਸਾ | 18595 |
| ਭਗਵਤੀ ਛੰਦ ਛੇਵਾਂ | 18598 | ਨਮੋ ਕਸਟ ਹਰਣੀ | 18643 |
| Closing ਚੋਪਈ | 18648 | ਖਟ ਛੰਦ ਭਗਵਤੀ | — |

The fourth and fifth Dohra endings have no printed numeral. The sixth Dohra group uses 1 and 2, which are internal numbers, not a new sequence of Bhagauti chhands. Closing Chaupai has 12 body lines followed by colophon 18661, whose 6 denotes the completed six-part work.

Proposed navigation: six chhands, each retaining its following Dohra, then the closing Chaupai. Optional Dohra subanchors are possible; do not infer additional numbered stanzas within the 44-line blocks from line count alone.

## Sri Bhagauti Astotr variants — 25 and 26

These are separate catalog variants, not the app's length bands. Preserve each variant's distinct wording and spelling.

| Variant | Rows | Verified divisions |
|---|---:|---|
| Panth Prakash — 25 | 54 | Five flagged headers; 44-line Astotr under Bhujang Prayaat heading 3743; unflagged Chaupai heading 3788; four closing lines 3789–3792 |
| Hazur Sahib — 26 | 40 | Four flagged headers; 36-line Astotr, body 3797–3832; no separately printed closing Chaupai in this response |

Neither payload supplies printed stanza-ending numerals. Do not manufacture numbered stanza groups by splitting every four lines. The Panth Prakash Chaupai is printed in the source but has `header: 0`.

Proposed navigation: Astotr and closing Chaupai for 25; a single Astotr unit for 26. A short reading does not require artificial subdivision. Provider source metadata says Dasam Bani/page 1428; this note records that metadata without using it to settle separate provenance or authorship questions.

## Barah Maha Savaiyaa — 28

54 rows: two headers and thirteen four-line savaiyye with cumulative source endings **867–879**. The Savaiyya heading is 3965; the first body line is 3966; the last ending is 4017.

| Source number | Body start local ID | Opening excerpt |
|---|---:|---|
| 867 | 3966 | ਫਾਗੁਨ ਮੈ ਸਖੀ |
| 868 | 3970 | ਫੂਲਿ ਸੀ ਗ੍ਵਾਰਨਿ |
| 869 | 3974 | ਏਕ ਸਮੈ ਰਹੈ ਕਿੰਸੁਕ |
| 870 | 3978 | ਜੇਠ ਸਮੈ ਸਖੀ |
| 871 | 3982 | ਪਉਨ ਪ੍ਰਚੰਡ ਚਲੈ |
| 872 | 3986 | ਜੋਰਿ ਘਟਾ ਘਟ ਆਏ |
| 873 | 3990 | ਮੇਘ ਪਰੈ ਕਬਹੂੰ |
| 874 | 3994 | ਮਾਸ ਅਸੂ ਹਮ |
| 875 | 3998 | ਕਾਤਿਕ ਕੀ ਸਖੀ |
| 876 | 4002 | ਮਘ੍ਰ ਸਮੈ ਸਬ |
| 877 | 4006 | ਬੀਚ ਸਰਦ ਰਿਤੁ |
| 878 | 4010 | ਮਾਘ ਬਿਖੈ ਮਿਲ |
| 879 | 4014 | ਸ੍ਯਾਮ ਚਿਤਾਰਿ ਸਭੈ |

The displayed sequence begins with Phagun, not Chet, and ends with an additional concluding savaiyya. Several intervening months are not explicitly named in their source incipits. This acquisition has **not** independently established the full twelve-month name-to-stanza mapping. Do not transplant the Majh Barah Maha month order from BaniDB 27 or infer month names solely from ordinal position.

Safe proposed navigation: printed Savaiyya numbers 867–879 plus incipits. Rich month labels require an additional source-backed mapping; 879 should not become a thirteenth month.

## Aarti / Aarti-Aarta — 22

256 raw rows form a composite collection, with three distinct length selections. Existing app normalization excludes upper mangals, merges identical signatures, sorts by retained row count, then assigns band names.

| Raw provider flags | Raw rows | After upper-mangal filtering | Normalized app band |
|---|---:|---:|---|
| Taksal | 62 | 61 | short |
| SGPC and Medium, identical | 83 | 82 | medium |
| Buddha Dal | 231 | 230 | long |

The raw names are **not** the app's same-position bands. There is no fourth distinct version. The 230-row version is not the union of the others: some repeated content occurs earlier under different local IDs.

All three contain five SGGS hymns:

| Source anchor | Local heading / body start | Provider page | Structural caveat |
|---|---|---:|---|
| ਧਨਾਸਰੀ ਮਹਲਾ ੧ ਆਰਤੀ; ਗਗਨ ਮੈ ਥਾਲੁ | 3389 / 3391 | 663 | Preserve its mangal placement |
| ਨਾਮੁ ਤੇਰੋ ਆਰਤੀ | body 3404 | 694 | Headerless hymn; closing text identifies Ravidas |
| ਸ੍ਰੀ ਸੈਣੁ; ਧੂਪ ਦੀਪ ਘ੍ਰਿਤ | 3414 / 3415 | 695 | Explicit source heading |
| ਪ੍ਰਭਾਤੀ; ਸੁੰਨ ਸੰਧਿਆ | 3424 / 3425 | 1350 | Use the printed heading and incipit |
| ਧੰਨਾ; ਗੋਪਾਲ ਤੇਰਾ ਆਰਤਾ | 3433 / 3434 | 695 | Explicit source heading |

Short then contains Savaiyya `ਪਾਇ ਗਹੇ` (heading 3457, page 290) and Dohra `ਸਗਲ ਦੁਆਰ` (3462, page 290).

Medium additionally includes source-headed excerpts beginning `ਯਾ ਤੇ ਪ੍ਰਸੰਨ` (3443/page 80), `ਹੇ ਰਵਿ ਹੇ ਸਸਿ` (3452/page 486), and `ਐਸੇ ਚੰਡ ਪ੍ਰਤਾਪ` (3466/page 80), then a headerless **Jaap stanza 199** excerpt at 3546–3549. That final excerpt is not a full Jaap section.

Long begins with Aarti-Aarta title 3282 and numerous Dasam excerpts, including these printed headings/incipits:

| Local heading ID | Printed form / recognizable opening | Provider page |
|---:|---|---:|
| 3284 | Dohra — ਲੋਪ ਚੰਡਕਾ | 80 |
| 3287 | Savaiyya — ਯਾ ਤੇ ਪ੍ਰਸੰਨ | 80 |
| 3296 | Dohra — ਐਸੇ ਚੰਡ ਪ੍ਰਤਾਪ | 80 |
| 3303 | Savaiyya — ਹੇ ਰਵਿ ਹੇ ਸਸਿ | 486 |
| 3308 | Kabitt — ਸੰਕਟ ਹਰਨ | 290 |
| 3313 | Kabitt — ਮਿਲਿ ਕੇ ਸੁ ਦੇਵਨ | 100 |
| 3318 | Savaiyya — ਤਾਰਨ ਲੋਕ | 74 |
| 3323 | Savaiyya — ਕਾਲ ਹੀ ਪਾਇ | 45 |
| 3328 | Savaiyya — ਮੇਰੁ ਕਰੋ ਤ੍ਰਿਣ | 46 |
| 3333 | Savaiyya — ਭਾਜਿ ਗਇਓ ਮਘਵਾ | 100 |
| 3342 | Savaiyya — ਦੇਹਿ ਅਸੀਸ | 100 |
| 3351 | Savaiyya — ਦੇਹ ਸਿਵਾ | 100 |
| 3360 | Dohra — ਗ੍ਰੰਥ ਸਤਿ ਸਇਆ | 100 |
| 3364 | Dohra — ਨਮਸਕਾਰ ਸ੍ਰੀ ਖੜਗ | 39 |
| 3367 / 3368 | Sri Kaal Ji Ki Ustat / Tribhangi — ਖਗ ਖੰਡ | 39 |
| 3381 | Savaiyya — ਪਾਇ ਗਹੇ | 290 |
| 3386 | Dohra — ਸਗਲ ਦੁਆਰ | 290 |

After the five shared SGGS hymns, long adds Sorath heading 3469 (ਭੂਖੇ ਭਗਤਿ, page 656), Salok Mahalla 1 heading 3488 (ਗੁਰੁ ਦਾਤਾ, page 137), headerless selected Saloks numbered 51, 52, 56, 57 at 3491–3498 (page 1429), and Shastar Naam Mala Dohra numbers 3–5 under heading 3499 (page 717). It then includes further headerless material and source headings `ਬਿਜੈ ਛੰਦ` (3528), `ਹੁਕਮ ਸੱਤ` (3535), and `ਦੋਹਰਾ` (3543), before the Jaap 199 ending. Several of these late items have null page/source attribution.

The medium occurrences 3443–3464 and 3466–3468 are absent from long; corresponding text often appears earlier under different IDs. Do not preserve a contents target from one variant when switching to another.

Proposed navigation: exact selected composition/excerpt order, using a printed heading plus incipit where a stronger title has not been established. Headerless Ravidas, selected Saloks, and Jaap 199 need independently recognized boundaries. Preserve attribution uncertainty for the late additions; do not label the whole reading as a single SGGS shabad or a continuous source-page range.

## Ardaas — 24

29 rows: five flagged introductory headers and 24 body rows. The opening six-line unit (3714–3719) ends with printed 1 and matches the opening remembrance from Vaar Sri Bhagauti Ji Ki. The rest is prose/paragraph prayer material, not a numbered stanza sequence.

Useful exact paragraph anchors are:

| Local ID | Opening / function evidenced by the text |
|---:|---|
| 3714 | ਪ੍ਰਿਥਮ ਭਗੌਤੀ — opening remembrance |
| 3720 | ਦਸਵੇਂ ਪਾਤਸ਼ਾਹ — continuation after the initial numbered verse |
| 3722 | ਪੰਜਾ ਪਿਆਰਿਆਂ — remembered community |
| 3725 | ਪ੍ਰਿਥਮੇ ਸਰਬੱਤ ਖਾਲਸਾ ਜੀ ਕੀ ਅਰਦਾਸ |
| 3727 | ਸਿੱਖਾਂ ਨੂੰ ਸਿੱਖੀ ਦਾਨ |
| 3730 | ਸ੍ਰੀ ਨਨਕਾਣਾ ਸਾਹਿਬ — access to separated gurdwaras |
| 3731 | ਹੇ ਨਿਮਾਣਿਆ ਦੇ ਮਾਣ — explicit personal-prayer placeholder in the source |
| 3735 | ਨਾਨਕ ਨਾਮ ਚੜ੍ਹਦੀ ਕਲਾ |
| 3736–3737 | Closing greeting |

These functional descriptions are research explanations, **not source-authored section titles**. Do not invent numbered Pauris, replace the source's placeholder, or claim historical divisions unsupported by the text. For this short prose prayer, one opening target plus optional incipit-based paragraph navigation is safer than fabricated canonical section names.

## Acceptance work after the Japji visual gate

1. Run these compact structural projections through the actual selected-length normalization for structural regression checks; do not assume raw flag names equal app bands. Production reading still uses full canonical responses.
2. Verify each target resolves to its exact selected entry/line while preserving all text and reading order.
3. Cover the known exceptions: Akal Ustat's two unflagged headings and unnumbered ending, Chandi's Dohra 6, chapter-number colophons, Ugardanti's unnumbered Dohra endings, the Astotr variant difference, Barah Maha's 13 source-numbered units, and Aarti's non-monotonic variants/headerless excerpts.
4. Keep undocumented month names, historical attribution and complete-work claims out of the UI until separately sourced.
5. Validate phone and desktop jumps, title clearance, active-section tracking and native document scrolling before stating that these catalog entries have completed semantic navigation.

