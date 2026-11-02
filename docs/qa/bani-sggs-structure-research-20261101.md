# SGGS bani structure research — 2026-11-01

Status: research, provider projections, and navigation contracts only. No application code or semantic-Contents rollout is part of this work. The live Japji preview gate remains pending. This report covers **30 exact provider readings** within the wider 104-item catalog effort: IDs 11, 27, 33, 34, 35, 39, 77, 78, and 86–107. The companion [Sukhmani/Anand/Salok M9 research](bani-structure-research-20261031.md) covers IDs 31, 10, and 30. Other agents own the remaining catalog families.

The useful common model is a verified source range with an explicit opening, ending, and original display text. “Provider paragraph”, “numbered stanza”, “salok”, “pauri”, and “ashtpadi” are not interchangeable. Names of navigation units below are supported by printed source terms or the cited institutional research; thematic headings are not being invented.

## Acquisition and reproducibility

All 30 complete responses were fetched from `https://api.banidb.com/v2/banis/{id}` in bounded Firecrawl interact sessions using Python urllib (12-second request timeout; batches of two or three). Each original response was hashed before parsing. The session was closed after acquisition.

The 30 projections preserve **11,379 rows**, source order, original legacy Gurmukhi and Unicode text, header flags, paragraph numbers, local verse IDs, Angs, line metadata, and all other response fields except nested `verse.translation`, `verse.transliteration`, `verse.larivaar`, and `verse.visraam`. No scripture text was repaired, reordered, normalized, or synthesized.

Files:

- `tmp/reader-live/banidb-{id}-structure.json`: each projected response, 4,112,613 bytes combined.
- `tmp/reader-live/provenance-{id}-20261101.json`: original URL, acquisition time, raw SHA-256/bytes, row count, and explicit projection description.
- `tmp/reader-live/provenance-sggs-families-20261101.json`: consolidated 30-file manifest, additionally recording the projected file hashes and byte counts.
- `tmp/reader-live/sggs-structural-analysis-20261101.json`: pauri heading/body candidates and numbered-ending analysis.
- `tmp/reader-live/sggs-serial-anchors-20261101.json`: all numbered body starts/endings for Laavan, Barah Maha Majh, Sidh Gosht, Onkar, Kabir Bavan Akhri, and the two salok collections.

The analysis file’s `preludeStart` is the mechanical row following the previous pauri’s ending. It is a research boundary candidate, **not a verified UI jump**: a rahau, separator, title, or extra opening salok may require a more specific target. Resolve targets after actual `fetchBani` normalization.

All IDs in this report are the **bani-local `verse.verseId` values supplied by each response**, not asserted canonical global SGGS IDs or shabad IDs. Source row numbers are zero-based and are not application entry indices. Every payload in this scope has unique positive IDs and all rows have `existsSGPC=existsMedium=existsTaksal=1`; those flags do not define shorter readings here.

## The 22 main SGGS vars

[Punjabi University’s Vār entry](https://eos.learnpunjabi.org/VAR.html), by Dharam Singh, identifies 22 vars in SGGS and explains that a var comprises pauris of variable length. Except for Basant and the Ramkali var of Balvand/Satta, saloks of varying number and authorship precede the pauris.

**Navigation proposal:** expose “Pauri 1”, “Pauri 2”, etc., each beginning at the first associated salok/prelude. Offer an optional direct body jump. Preserve the preceding saloks’ own numbering and attribution. Do not attach those saloks to the pauri that came before them. Basant and Balvand/Satta need only the numbered pauri bodies.

The live snapshots contain **471 pauris across these 22 vars**. The table records individual contracts, not a rule that infers every work named “Vaar” has this structure. In particular, catalog IDs 50 and 51 are weekday compositions and require their own analysis.

“First / last body ID” identifies body openings, not the recommended prelude jump. The Ang column is the loaded positive-Ang range, not a promise that the source is contiguous or belongs entirely to the titled var.

| API ID | Var | Loaded rows | Pauris | Loaded Ang range | First / last body ID | Required distinction |
| --- | --- | --- | --- | --- | --- | --- |
| [86](https://api.banidb.com/v2/banis/86) | Sri Raag M4 | 377 | 21 | 83–91 | 9988 / 10346 | Pauri 3 heading is header:0 |
| [87](https://api.banidb.com/v2/banis/87) | Majh | 661 | 27 | 137–151 | 10381 / 10987 | 4 ਪਵੜੀ headings; unrelated trailing shabad |
| [88](https://api.banidb.com/v2/banis/88) | Gauri M4 | 672 | 33 | 300–317 | 11026 / 11678 | Paired prelude/body index |
| [89](https://api.banidb.com/v2/banis/89) | Gauri M5 | 273 | 21 | 318–323 | 11698 / 11951 | Paired prelude/body index |
| [90](https://api.banidb.com/v2/banis/90) | Asa | 758 | 24 | 448–475 | 24921 / 25742 | 24 interleaved chhants; null-Ang separators |
| [91](https://api.banidb.com/v2/banis/91) | Gujari M3 | 379 | 22 | 508–517 | 11970 / 12330 | Paired prelude/body index |
| [92](https://api.banidb.com/v2/banis/92) | Gujari M5 | 334 | 21 | 517–524 | 12353 / 12661 | Pauri 6 heading is header:0 |
| [93](https://api.banidb.com/v2/banis/93) | Bihagara M4 | 348 | 21 | 548–556 | 12682 / 13013 | Paired prelude/body index |
| [94](https://api.banidb.com/v2/banis/94) | Vadahans M4 | 367 | 21 | 585–594 | 13033 / 13380 | Paired prelude/body index |
| [95](https://api.banidb.com/v2/banis/95) | Sorath M4 | 494 | 29 | 642–654 | 13404 / 13874 | Pauri 15 heading is header:0 |
| [96](https://api.banidb.com/v2/banis/96) | Jaitsri M5 | 224 | 20 | 705–710 | 13888 / 14098 | Paired prelude/body index |
| [97](https://api.banidb.com/v2/banis/97) | Suhi M3 | 328 | 20 | 785–792 | 14118 / 14426 | Paired prelude/body index |
| [98](https://api.banidb.com/v2/banis/98) | Bilaval M4 | 238 | 13 | 849–855 | 14448 / 14665 | Paired prelude/body index |
| [99](https://api.banidb.com/v2/banis/99) | Ramkali M3 | 491 | 21 | 947–956 | 14694 / 15156 | Paired prelude/body index |
| [100](https://api.banidb.com/v2/banis/100) | Ramkali M5 | 454 | 22 | 957–966 | 15175 / 15607 | Paired prelude/body index |
| [101](https://api.banidb.com/v2/banis/101) | Ramkali · Balvand and Satta | 90 | 8 | 966–968 | 15618 / 15696 | No salok preludes or pauri heading rows |
| [102](https://api.banidb.com/v2/banis/102) | Maru M3 | 347 | 22 | 1086–1094 | 15719 / 16046 | Paired prelude/body index |
| [103](https://api.banidb.com/v2/banis/103) | Maru M5 · Dakhane | 418 | 23 | 1094–1102 | 16064 / 16462 | Pauri 10 uses ਪਵੜੀ |
| [104](https://api.banidb.com/v2/banis/104) | Basant M5 | 18 | 3 | 1193–1193 | 16473 / 16483 | No salok preludes or pauri heading rows |
| [105](https://api.banidb.com/v2/banis/105) | Sarang M4 | 672 | 36 | 1237–1251 | 16514 / 17155 | Paired prelude/body index |
| [106](https://api.banidb.com/v2/banis/106) | Mallar M1 | 606 | 28 | 1278–1291 | 17178 / 17757 | Paired prelude/body index |
| [107](https://api.banidb.com/v2/banis/107) | Kanara M4 | 234 | 15 | 1312–1318 | 17780 / 17995 | Paired prelude/body index |

### Heading and terminal validation

- Accept only the checked printed heading forms for the relevant bani. Both **ਪਉੜੀ** and **ਪਵੜੀ** occur. Majh uses ਪਵੜੀ for Pauris 4, 9, 10, and 11; Maru M5 uses it for Pauri 10. Bavan Akhri M5 also uses both forms.
- Header flags are useful metadata but not sufficient boundaries. Actual ਪਉੜੀ headings are marked `header:0` at /86 ID 10013, /92 ID 12429, and /95 ID 13647. The /92 author heading “ਮਃ ੫ ॥” at ID 12456 is also unflagged. Keep them as printed rather than inventing replacements.
- Each checked body must terminate with its own expected ordinal. Additional composition counters and source colophons such as “ਸੁਧੁ” or “ਸੁਧੁ ਕੀਚੇ” must remain in place. They are not extra pauris.
- Do not assume a fixed number of saloks, lines, or provider paragraphs per pauri. For example, [Punjabi University’s Majh entry](https://eos.learnpunjabi.org/VAR%20MAJH%20KI.html) describes 27 pauris with unequal prelude counts. All 27 body endings are present in the captured source.

### Asa Di Var (/90): preserve the liturgical sequence

[Punjabi University’s Asa Ki Var entry](https://eos.learnpunjabi.org/ASA%20KI%20VAR.html) confirms 24 pauris and discusses the preceding Guru Ram Das quatrains used during recitation. The live /90 reading has 24 chhant paragraph groups at Ang 448–451 interleaved before its saloks/pauris at Ang 462–475.

Use 24 pauri units whose initial jump includes the preceding chhant and saloks in this supplied reading. A disclosure may offer “Chhant”, “Saloks”, and “Pauri” targets where validated. Do not reorder the reading by Ang or silently remove these passages.

The source contains 24 decorative “❁” rows with `pageNo:null`. These are not Ang 0 and not new compositions. Its title/direction at ID 24908 is also `header:0`. First chhant opening: ID 24890, Ang 448; first salok opening: 24910, Ang 462; first pauri body: 24921, Ang 463. The catalog’s 462–475 span alone is inadequate to validate this payload’s entire reading.

### Majh (/87): explicit unresolved tail

The 27th pauri ends at source row 643, ID 10994, Ang 150:

> ਨਾਨਕ ਸਚੁ ਸਾਲਾਹਿ ਪੂਰਾ ਪਾਇਆ ॥੨੭॥ ਸੁਧੁ

Rows 644–660 then contain a mangal, a new Gauri heading, another mangal, and the separate shabad opening “ਭਉ ਮੁਚੁ ਭਾਰਾ ਵਡਾ ਤੋਲੁ ॥” (ID 10997, Ang 151), ending “ਅੰਧਾ ਅਖਰੁ ਵਾਉ ਦੁਆਉ ॥੩॥੧॥” (11010).

This 17-row tail is demonstrably beyond the var’s numbered conclusion. It is retained unchanged in the acquisition fixture. The implemented profile explicitly indexes the supplied mixed reading: 27 pauri groups followed by the separately printed Gauri heading. It does not relabel that tail as Pauri 28 or claim that it belongs to the var. Its full-reading fingerprint includes all 661 rows, and an unfamiliar provider scope falls back to source pages. The reason for the provider's extra shabad remains unresolved.

### Vars without salok preludes

[Basant Ki Var](https://eos.learnpunjabi.org/BASANT%20KI%20VAR.html) has three pauris and no prefixed saloks. The /104 source has 18 rows: three title/mangal rows and 15 body rows. The Ramkali Balvand/Satta var (/101) has eight numbered body groups and likewise no salok preludes. Neither response prints a separate ਪਉੜੀ heading before each body; requiring such a heading would wrongly omit both works.

## Laavan (/11)

[Sikh Research Institute’s Guru Granth Sahib Project](https://gurugranthsahib.io/compositions/bani/SuhiM) identifies the four stanzas of the second Suhi chant at Ang 773–774 as the traditional Laavan composition. The live source has 26 rows, two header rows, and four six-row body groups.

Use **Laav 1–4** with the original opening lines; preserve the printed last counter `॥੪॥੨॥`. The final 2 refers to the enclosing chant sequence, not an additional laav.

| Laav | Original body opening | Local ID | Ang |
| --- | --- | --- | --- |
| 1 | ਹਰਿ ਪਹਿਲੜੀ ਲਾਵ ਪਰਵਿਰਤੀ ਕਰਮ ਦ੍ਰਿੜਾਇਆ ਬਲਿ ਰਾਮ ਜੀਉ ॥ | 1996 | 773 |
| 2 | ਹਰਿ ਦੂਜੜੀ ਲਾਵ ਸਤਿਗੁਰੁ ਪੁਰਖੁ ਮਿਲਾਇਆ ਬਲਿ ਰਾਮ ਜੀਉ ॥ | 2002 | 774 |
| 3 | ਹਰਿ ਤੀਜੜੀ ਲਾਵ ਮਨਿ ਚਾਉ ਭਇਆ ਬੈਰਾਗੀਆ ਬਲਿ ਰਾਮ ਜੀਉ ॥ | 2008 | 774 |
| 4 | ਹਰਿ ਚਉਥੜੀ ਲਾਵ ਮਨਿ ਸਹਜੁ ਭਇਆ ਹਰਿ ਪਾਇਆ ਬਲਿ ਰਾਮ ਜੀਉ ॥ | 2014 | 774 |

## Barah Maha Majh (/27)

[Punjabi University’s Barah Maha entry](https://eos.learnpunjabi.org/BARAH%20MAHA.html) distinguishes the opening, twelve month stanzas, and conclusion. [The Guru Granth Sahib Project](https://gurugranthsahib.io/bani/Barahmaha) confirms 14 stanzas for Guru Arjan’s Majh composition and 17 for the separate Guru Nanak Tukhari composition.

The /27 source has 130 rows and an exact 1–14 numbered sequence. Use **Opening, the twelve named months, Closing**, retaining canonical stanza numbers in secondary metadata. A reader should not lose the opening and conclusion when choosing a month. Do not infer month boundaries from the first word alone: Jeth’s stanza opens with “ਹਰਿ ਜੇਠਿ”.

| Stanza | Navigation name | Original opening | Local ID | Ang |
| --- | --- | --- | --- | --- |
| 1 | Opening | ਕਿਰਤਿ ਕਰਮ ਕੇ ਵੀਛੁੜੇ ਕਰਿ ਕਿਰਪਾ ਮੇਲਹੁ ਰਾਮ ॥ | 3836 | 133 |
| 2 | Chet | ਚੇਤਿ ਗੋਵਿੰਦੁ ਅਰਾਧੀਐ ਹੋਵੈ ਅਨੰਦੁ ਘਣਾ ॥ | 3846 | 133 |
| 3 | Vaisakh | ਵੈਸਾਖਿ ਧੀਰਨਿ ਕਿਉ ਵਾਢੀਆ ਜਿਨਾ ਪ੍ਰੇਮ ਬਿਛੋਹੁ ॥ | 3855 | 133 |
| 4 | Jeth | ਹਰਿ ਜੇਠਿ ਜੁੜੰਦਾ ਲੋੜੀਐ ਜਿਸੁ ਅਗੈ ਸਭਿ ਨਿਵੰਨਿ ॥ | 3864 | 134 |
| 5 | Asarh | ਆਸਾੜੁ ਤਪੰਦਾ ਤਿਸੁ ਲਗੈ ਹਰਿ ਨਾਹੁ ਨ ਜਿੰਨਾ ਪਾਸਿ ॥ | 3873 | 134 |
| 6 | Sawan | ਸਾਵਣਿ ਸਰਸੀ ਕਾਮਣੀ ਚਰਨ ਕਮਲ ਸਿਉ ਪਿਆਰੁ ॥ | 3882 | 134 |
| 7 | Bhadon | ਭਾਦੁਇ ਭਰਮਿ ਭੁਲਾਣੀਆ ਦੂਜੈ ਲਗਾ ਹੇਤੁ ॥ | 3891 | 134 |
| 8 | Assu | ਅਸੁਨਿ ਪ੍ਰੇਮ ਉਮਾਹੜਾ ਕਿਉ ਮਿਲੀਐ ਹਰਿ ਜਾਇ ॥ | 3900 | 134 |
| 9 | Kattak | ਕਤਿਕਿ ਕਰਮ ਕਮਾਵਣੇ ਦੋਸੁ ਨ ਕਾਹੂ ਜੋਗੁ ॥ | 3909 | 135 |
| 10 | Maghar | ਮੰਘਿਰਿ ਮਾਹਿ ਸੋਹੰਦੀਆ ਹਰਿ ਪਿਰ ਸੰਗਿ ਬੈਠੜੀਆਹ ॥ | 3918 | 135 |
| 11 | Poh | ਪੋਖਿ ਤੁਖਾਰੁ ਨ ਵਿਆਪਈ ਕੰਠਿ ਮਿਲਿਆ ਹਰਿ ਨਾਹੁ ॥ | 3927 | 135 |
| 12 | Magh | ਮਾਘਿ ਮਜਨੁ ਸੰਗਿ ਸਾਧੂਆ ਧੂੜੀ ਕਰਿ ਇਸਨਾਨੁ ॥ | 3936 | 135 |
| 13 | Phagun | ਫਲਗੁਣਿ ਅਨੰਦ ਉਪਾਰਜਨਾ ਹਰਿ ਸਜਣ ਪ੍ਰਗਟੇ ਆਇ ॥ | 3945 | 136 |
| 14 | Closing | ਜਿਨਿ ਜਿਨਿ ਨਾਮੁ ਧਿਆਇਆ ਤਿਨ ਕੇ ਕਾਜ ਸਰੇ ॥ | 3955 | 136 |

Tukhari is a distinct 17-stanza work at Ang 1107–1110; it is not the /27 Majh reading. This audit found no separate Tukhari exact-bani entry in the current catalog. Do not invent an endpoint, reuse /27 anchors, or conflate it with the DG Barah Maha Savaiyaa (/28).

## Bavan Akhri M5 (/33)

[Punjabi University’s Bavan Akhari entry](https://eos.learnpunjabi.org/BAVAN%20AKHARI.html) establishes **55 pauris**, associated saloks, the initial salok repeated at the end, and a refrain after the first pauri. The same article distinguishes Kabir’s 45-stanza work. “Bavan” does not justify a manufactured list of 52 alphabet sections.

The live /33 source has 674 rows and 114 body paragraph groups. Its 55 pauri headings (ਪਉੜੀ or ਪਵੜੀ) lead to the full ordered 1–55 terminal sequence. Recommended top-level navigation: **Opening salok, Pauri 1–55, Closing salok**, with each pauri jump including its associated salok and an optional direct body target.

Keep the two initial saloks distinct: the long opening begins ID 7738; the salok immediately before Pauri 1 begins 7748; Pauri 1 begins 7751. The rahau is at IDs 7759–7760 and belongs after Pauri 1, not in the count of pauris or as the opening of Pauri 2.

Pauri 55 starts ID 8390, Ang 261 and ends 8397, Ang 262. Closing salok starts 8399 and repeats the opening text. Preserve final instruction ID 8408, “ਏਹੁ ਸਲੋਕੁ ਆਦਿ ਅੰਤਿ ਪੜਣਾ ॥”; it is neither a 56th pauri nor disposable empty content. Some salok headings use ਸਲੋਕ and others ਸਲੋਕੁ, so exact string equality to just one spelling is insufficient.

## Numbered long works and salok collections

Use explicit composition-specific count/sequence contracts. The table’s middle IDs provide useful manual verification targets; all starts and endings are recorded in the serial-anchor intermediate.

| API ID | Numbered units | First body ID | Middle unit: body ID | Last body ID |
| --- | --- | --- | --- | --- |
| 34 | 73 | 8413 | 37: 8595 | 8810 |
| 35 | 54 | 8819 | 28: 9011 | 9212 |
| 39 | 45 | 9281 | 23: 9357 | 9438 |
| 77 | 243 | 23312 | 122: 23554 | 23801 |
| 78 | 130 | 23806 | 66: 23951 | 26316 |

### Sidh Gosht (/34): 73 stanzas

[Punjabi University’s Sidh Gosht entry](https://eos.learnpunjabi.org/SIDH.html) confirms 73 stanzas and a rahau after the first. The provider has 406 rows and **74 body paragraph groups** because the rahau is separate.

Use “Stanza 1–73” as neutral navigation labels, optionally a direct “Rahau” jump. Keep the refrain after Stanza 1; Stanza 2 starts ID 8419. The final `॥੭੩॥੧॥` has a composition counter, not a new stanza. Do not fabricate “Question” and “Answer” sections: the dialogue’s speakers and transitions require their own verified textual/editorial mapping.

### Dakhni Onkar (/35): 54 stanzas

[Punjabi University’s Oankaru entry](https://eos.learnpunjabi.org/OANKARU.html) explains its acrostic form and the opening followed by rahau. The live /35 source independently supplies the exact **1–54** sequence in 400 rows, with 55 body paragraph groups.

Use “Stanza 1–54”, retaining each opening prefix. The rahau is IDs 8827–8828 after Stanza 1; Stanza 2 starts 8829. Final `॥੫੪॥੧॥` closes the work. Do not present a complete modern alphabet and fill imagined gaps or force repeated letters into unique groups.

### Bavan Akhri Kabir (/39): 45 stanzas

The university’s Bavan Akhari article confirms 45 stanzas and an introductory sequence before the acrostic. The live /39 source contains 168 rows and the exact 1–45 sequence. Use “Stanza 1–45” with opening excerpts. Preserve the actual repeated or nonalphabetic openings rather than making a 52-letter navigation list. This work does not share /33’s salok-plus-pauri contract.

### Salok Bhagat Kabir (/77): 243 numbered collection entries

The live /77 source contains 494 rows and all **243** salok endings in order, but only 29 body paragraph groups. Use “Salok 1–243” and jump to each unit’s actual opening; never turn the 29 paragraphs into 29 saloks.

[Punjabi University’s Kabir entry](https://eos.learnpunjabi.org/KABIR.html) reports 237 saloks authored by Kabir, which is an authorship count rather than this collection’s terminal ordinal. The captured collection includes explicit Mahalla headings interspersed in its sequence. Keep them with their corresponding saloks and do not attribute every entry to Kabir merely because it is under the collection title. Do not strip these entries to force the interface total to 237.

### Salok Sheikh Farid (/78): 130 numbered collection entries

The live /78 source contains 298 rows and the full **1–130** salok sequence in only 17 body paragraph groups. Salok 1 spans eight source rows, illustrating why fixed two-row splitting is invalid.

[Punjabi University’s Farid entry](https://eos.learnpunjabi.org/FARID%20SHAIKH%20%28569-664%20AH%20OR%20AD%201173-1265%29.html) describes Farid’s 112 saloks and the Gurus’ continuations within the collection. Use the printed collection sequence “Salok 1–130”, preserving author headings and surrounding context. First opening ID 23806; last opening ID 26316. The jump in numeric IDs is real provider data; never generate missing IDs by arithmetic.

## Release conditions for these contracts

1. Establish source/variant identity and complete observed scope before exposing semantic Contents. Rows missing an Ang solely because they are a known decorative separator are not scripture at Ang 0; genuinely unrecognized source gaps still need fallback.
2. Validate ordered openings and endings against these exact-source contracts, including all stanza counters, permitted heading spellings, source colophons, and author/prelude context. Repeated salok counters cannot be treated as the pauri sequence.
3. Run each projection through actual `fetchBani`, resolve loaded entry/line targets, and verify every original scripture row and text remains unchanged. A generic “header is true” or “one paragraph is one section” parser will fail these fixtures.
4. Keep Majh’s unexplained trailing shabad visible and separately labelled under its printed heading. Validate the complete supplied mixed reading; do not claim a pure 27-unit exact-var payload.
5. After the existing live Japji gate passes, verify representative first/middle/last jumps, prelude/body jumps, enlarged type, narrow screens, translation layers, and resume location. Source research alone does not establish rendered-reader behavior.

No application code was changed by this research. Original payload integrity, projected hashes, all 30 row counts, all 22 var pauri counts (471 total), and the serial numbered sequences were checked locally. Application-normalization compatibility is being audited separately.
