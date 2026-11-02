# Bani semantic Contents research — 2026-10-31

Research and fixture acquisition only. This document does not claim that Sukhmani, Anand, or Salok Mahalla 9 semantic Contents has been implemented or visually verified. Broader rollout remains subject to the live Japji navigation gate and each bani's own validated structure.

## Sukhmani: verified structure and proposed experience

[Punjabi University’s Encyclopaedia of Sikhism](https://eos.learnpunjabi.org/SUKHMANI.html), by Gurbachan Singh Talib, describes 24 ashtpadis, each containing eight stanzas and preceded by a salok. It identifies one rahau in the composition. The live [BaniDB bani 31 response](https://api.banidb.com/v2/banis/31), retrieved on 2026-10-31, independently contains 24 ashtpadi headings, 24 preceding saloks, and eight paragraph groups per ashtpadi: 192 body stanzas altogether.

Show **24 top-level Ashtpadi entries**. Each entry should jump to its preceding salok heading so a reader begins the complete unit. An optional disclosure can expose “Salok” and “Stanza 1” through “Stanza 8”; keep the default Contents list compact. Use an original opening line as the excerpt and the salok’s actual Ang as the location. The salok and body can begin on different Angs: Ashtpadi 2’s salok starts on Ang 263, while its body begins on Ang 264.

The repeated canonical salok ending is numbered 1. An interface may show “Ashtpadi 7 · Salok” to express the parent relationship, but should not rewrite that source number to 7. “Ashtpadi” and “Stanza” labels are navigation metadata; scripture text and its displayed sequence remain intact.

### Verified anchors

Every ID below is **bani-local `verse.verseId` from this /banis/31 snapshot**. These are not canonical global SGGS verse IDs and are not shabad IDs. Use the observed text, order, Ang, and terminal numbering to validate runtime anchors, then navigate to the loaded entry/line location. IDs are fixture assertions and payload-scoped identities; do not construct cross-API shabad links from them.

“Jump row / ID” identifies the original salok heading. Rows are zero-based source-array indices, before application normalization. They are not rendered entry indices. “Ang” and “Opening IDs” list salok first, then ashtpadi body.

| Ashtpadi | Preceding salok opening | Body opening | Ang, salok / body | Opening IDs, salok / body | Jump row / ID |
| --- | --- | --- | --- | --- | --- |
| 1 | ਆਦਿ ਗੁਰਏ ਨਮਹ ॥ | ਸਿਮਰਉ ਸਿਮਰਿ ਸਿਮਰਿ ਸੁਖੁ ਪਾਵਉ ॥ | 262 / 262 | 5234 / 5239 | 2 / 5232 |
| 2 | ਦੀਨ ਦਰਦ ਦੁਖ ਭੰਜਨਾ ਘਟਿ ਘਟਿ ਨਾਥ ਅਨਾਥ ॥ | ਜਹ ਮਾਤ ਪਿਤਾ ਸੁਤ ਮੀਤ ਨ ਭਾਈ ॥ | 263 / 264 | 5322 / 5325 | 91 / 5321 |
| 3 | ਬਹੁ ਸਾਸਤ੍ਰ ਬਹੁ ਸਿਮ੍ਰਿਤੀ ਪੇਖੇ ਸਰਬ ਢਢੋਲਿ ॥ | ਜਾਪ ਤਾਪ ਗਿਆਨ ਸਭਿ ਧਿਆਨ ॥ | 265 / 265 | 5406 / 5409 | 175 / 5405 |
| 4 | ਨਿਰਗੁਨੀਆਰ ਇਆਨਿਆ ਸੋ ਪ੍ਰਭੁ ਸਦਾ ਸਮਾਲਿ ॥ | ਰਮਈਆ ਕੇ ਗੁਨ ਚੇਤਿ ਪਰਾਨੀ ॥ | 266 / 266 | 5490 / 5493 | 259 / 5489 |
| 5 | ਦੇਨਹਾਰੁ ਪ੍ਰਭ ਛੋਡਿ ਕੈ ਲਾਗਹਿ ਆਨ ਸੁਆਇ ॥ | ਦਸ ਬਸਤੂ ਲੇ ਪਾਛੈ ਪਾਵੈ ॥ | 268 / 268 | 5573 / 5576 | 342 / 5572 |
| 6 | ਕਾਮ ਕ੍ਰੋਧ ਅਰੁ ਲੋਭ ਮੋਹ ਬਿਨਸਿ ਜਾਇ ਅਹੰਮੇਵ ॥ | ਜਿਹ ਪ੍ਰਸਾਦਿ ਛਤੀਹ ਅੰਮ੍ਰਿਤ ਖਾਹਿ ॥ | 269 / 269 | 5656 / 5659 | 425 / 5655 |
| 7 | ਅਗਮ ਅਗਾਧਿ ਪਾਰਬ੍ਰਹਮੁ ਸੋਇ ॥ | ਸਾਧ ਕੈ ਸੰਗਿ ਮੁਖ ਊਜਲ ਹੋਤ ॥ | 271 / 271 | 5740 / 5744 | 509 / 5739 |
| 8 | ਮਨਿ ਸਾਚਾ ਮੁਖਿ ਸਾਚਾ ਸੋਇ ॥ | ਬ੍ਰਹਮ ਗਿਆਨੀ ਸਦਾ ਨਿਰਲੇਪ ॥ | 272 / 272 | 5825 / 5829 | 594 / 5824 |
| 9 | ਉਰਿ ਧਾਰੈ ਜੋ ਅੰਤਰਿ ਨਾਮੁ ॥ | ਮਿਥਿਆ ਨਾਹੀ ਰਸਨਾ ਪਰਸ ॥ | 274 / 274 | 5910 / 5915 | 679 / 5909 |
| 10 | ਉਸਤਤਿ ਕਰਹਿ ਅਨੇਕ ਜਨ ਅੰਤੁ ਨ ਪਾਰਾਵਾਰ ॥ | ਕਈ ਕੋਟਿ ਹੋਏ ਪੂਜਾਰੀ ॥ | 275 / 275 | 5996 / 5999 | 765 / 5995 |
| 11 | ਕਰਣ ਕਾਰਣ ਪ੍ਰਭੁ ਏਕੁ ਹੈ ਦੂਸਰ ਨਾਹੀ ਕੋਇ ॥ | ਕਰਨ ਕਰਾਵਨ ਕਰਨੈ ਜੋਗੁ ॥ | 276 / 276 | 6080 / 6083 | 849 / 6079 |
| 12 | ਸੁਖੀ ਬਸੈ ਮਸਕੀਨੀਆ ਆਪੁ ਨਿਵਾਰਿ ਤਲੇ ॥ | ਜਿਸ ਕੈ ਅੰਤਰਿ ਰਾਜ ਅਭਿਮਾਨੁ ॥ | 278 / 278 | 6164 / 6167 | 933 / 6163 |
| 13 | ਸੰਤ ਸਰਨਿ ਜੋ ਜਨੁ ਪਰੈ ਸੋ ਜਨੁ ਉਧਰਨਹਾਰ ॥ | ਸੰਤ ਕੈ ਦੂਖਨਿ ਆਰਜਾ ਘਟੈ ॥ | 279 / 279 | 6248 / 6251 | 1017 / 6247 |
| 14 | ਤਜਹੁ ਸਿਆਨਪ ਸੁਰਿ ਜਨਹੁ ਸਿਮਰਹੁ ਹਰਿ ਹਰਿ ਰਾਇ ॥ | ਮਾਨੁਖ ਕੀ ਟੇਕ ਬ੍ਰਿਥੀ ਸਭ ਜਾਨੁ ॥ | 281 / 281 | 6332 / 6335 | 1101 / 6331 |
| 15 | ਸਰਬ ਕਲਾ ਭਰਪੂਰ ਪ੍ਰਭ ਬਿਰਥਾ ਜਾਨਨਹਾਰ ॥ | ਟੂਟੀ ਗਾਢਨਹਾਰ ਗੋੁਪਾਲ ॥ | 282 / 282 | 6416 / 6419 | 1185 / 6415 |
| 16 | ਰੂਪੁ ਨ ਰੇਖ ਨ ਰੰਗੁ ਕਿਛੁ ਤ੍ਰਿਹੁ ਗੁਣ ਤੇ ਪ੍ਰਭ ਭਿੰਨ ॥ | ਅਬਿਨਾਸੀ ਪ੍ਰਭੁ ਮਨ ਮਹਿ ਰਾਖੁ ॥ | 283 / 283 | 6498 / 6501 | 1267 / 6497 |
| 17 | ਆਦਿ ਸਚੁ ਜੁਗਾਦਿ ਸਚੁ ॥ | ਚਰਨ ਸਤਿ ਸਤਿ ਪਰਸਨਹਾਰ ॥ | 285 / 285 | 6581 / 6584 | 1350 / 6580 |
| 18 | ਸਤਿ ਪੁਰਖੁ ਜਿਨਿ ਜਾਨਿਆ ਸਤਿਗੁਰੁ ਤਿਸ ਕਾ ਨਾਉ ॥ | ਸਤਿਗੁਰੁ ਸਿਖ ਕੀ ਕਰੈ ਪ੍ਰਤਿਪਾਲ ॥ | 286 / 286 | 6665 / 6668 | 1434 / 6664 |
| 19 | ਸਾਥਿ ਨ ਚਾਲੈ ਬਿਨੁ ਭਜਨ ਬਿਖਿਆ ਸਗਲੀ ਛਾਰੁ ॥ | ਸੰਤ ਜਨਾ ਮਿਲਿ ਕਰਹੁ ਬੀਚਾਰੁ ॥ | 288 / 288 | 6747 / 6750 | 1516 / 6746 |
| 20 | ਫਿਰਤ ਫਿਰਤ ਪ੍ਰਭ ਆਇਆ ਪਰਿਆ ਤਉ ਸਰਨਾਇ ॥ | ਜਾਚਕ ਜਨੁ ਜਾਚੈ ਪ੍ਰਭ ਦਾਨੁ ॥ | 289 / 289 | 6831 / 6834 | 1600 / 6830 |
| 21 | ਸਰਗੁਨ ਨਿਰਗੁਨ ਨਿਰੰਕਾਰ ਸੁੰਨ ਸਮਾਧੀ ਆਪਿ ॥ | ਜਬ ਅਕਾਰੁ ਇਹੁ ਕਛੁ ਨ ਦ੍ਰਿਸਟੇਤਾ ॥ | 290 / 290 | 6915 / 6918 | 1684 / 6914 |
| 22 | ਜੀਅ ਜੰਤ ਕੇ ਠਾਕੁਰਾ ਆਪੇ ਵਰਤਣਹਾਰ ॥ | ਆਪਿ ਕਥੈ ਆਪਿ ਸੁਨਨੈਹਾਰੁ ॥ | 292 / 292 | 6999 / 7002 | 1768 / 6998 |
| 23 | ਗਿਆਨ ਅੰਜਨੁ ਗੁਰਿ ਦੀਆ ਅਗਿਆਨ ਅੰਧੇਰ ਬਿਨਾਸੁ ॥ | ਸੰਤਸੰਗਿ ਅੰਤਰਿ ਪ੍ਰਭੁ ਡੀਠਾ ॥ | 293 / 293 | 7083 / 7086 | 1852 / 7082 |
| 24 | ਪੂਰਾ ਪ੍ਰਭੁ ਆਰਾਧਿਆ ਪੂਰਾ ਜਾ ਕਾ ਨਾਉ ॥ | ਪੂਰੇ ਗੁਰ ਕਾ ਸੁਨਿ ਉਪਦੇਸੁ ॥ | 295 / 295 | 7167 / 7170 | 1936 / 7166 |

### Provider details that the index must preserve

- The full source has 2,019 rows and spans Ang 262–296. It starts with a mangal (ID 5228), title (5231), salok heading (5232), another mangal (5233), and the salok itself (5234–5237). Thus “heading + one row” does not always locate actual salok text.
- Match exact section-opening prefixes after comparison-only whitespace/Unicode normalization. Display the original provider text. Do not import the punctuation or pronunciation annotations of a secondary santhiya transcription.
- Saloks have different numbers of source rows; some provider rows combine text presented on separate lines elsewhere. Ashtpadi body row counts also vary. Do not assume two salok rows, ten rows per stanza, 80 body rows per ashtpadi, or a uniform row offset.
- The sole rahau appears inside the first ashtpadi’s first provider paragraph group, after its initial numbered stanza text. It is not a ninth stanza. Paragraph metadata corroborates eight stanza groups, but should not replace textual boundary checks.
- This snapshot ends every ashtpadi with the combined terminal pair `॥੮॥<ashtpadi number>॥`. Validate the exact ordered sequence 1–24 and the eight stanza groups per unit.
- Headers, mangals, rahau, and all original rows must remain present and ordered. A navigation index must not rewrite or repartition the scripture to make its target indices fit.

### Corrected research discrepancy: Ashtpadi 16

The secondary [SikhiSeeker santhiya page](https://sikhiseeker.com/sri-sukhmani-sahib-santhiya/) places an 8 marker after “ਗੁਰ ਕੈ ਬਚਨਿ ਪਦਾਰਥ ਲਹੇ” and finishes the unit with a separate 16 marker. This was initially flagged during research, but **the live BaniDB source does not have that pattern**:

- ID 6573: ਗੁਰ ਕੈ ਬਚਨਿ ਪਦਾਰਥ ਲਹੇ ॥
- ID 6579: ਗੁਰ ਪ੍ਰਸਾਦਿ ਨਾਨਕ ਫਲੁ ਪਾਵੈ ॥੮॥੧੬॥

The provider therefore follows the same combined ending pattern as the other 23 ashtpadis. The mirror also adds santhiya punctuation, and must not be used to “correct” provider text or create a special-case parser for Ashtpadi 16. This is a source discrepancy, not an established canonical exception.

## Anand: full reading and shortened selection

[Punjabi University’s Anandu entry](https://eos.learnpunjabi.org/ANANDU.html), by Taran Singh, confirms 40 stanzas and use of a shortened form. [Sikh Research Institute’s Guru Granth Sahib Project introduction](https://gurugranthsahib.io/bani/introduction/50/Introduction) explicitly identifies the shortened reading as the first five pauris and the last pauri, and locates the full composition at Ang 917–922. The [SGPC Sikh Rehat Maryada PDF](https://sgpc.net/wp-content/uploads/2025/06/Sikh-Rehat-Maryada-English-n.pdf) also specifies first five and last in its Anand Karaj instructions; the indexed excerpt was retrieved, while full PDF retrieval exceeded the tool’s 16.7 MB response limit.

The live [BaniDB bani 10 response](https://api.banidb.com/v2/banis/10) contains 211 rows and 40 body paragraph groups. Its first three rows are mangal/title/mangal, followed by the first pauri at ID 1786. The fortieth begins at source row 205, ID 1988, and ends at row 210, ID 1993, with `॥੪੦॥੧॥`.

For the full reading, expose **Pauri 1–40**. If an explicitly selected short-reading context is supported, expose **1, 2, 3, 4, 5, 40** and label the selection clearly; do not relabel 40 as 6, silently remove pauris, or infer the short selection from row flags. All rows in this /10 snapshot have `existsSGPC`, `existsMedium`, and `existsTaksal` set to 1, so those flags do not select the six-pauri form here. A Rehras-embedded selection must be validated against its own source response rather than reusing /10 numeric IDs.

The following IDs are local to /banis/10:

| Pauri | Original opening | Local verse ID | Ang |
| --- | --- | --- | --- |
| 1 | ਅਨੰਦੁ ਭਇਆ ਮੇਰੀ ਮਾਏ ਸਤਿਗੁਰੂ ਮੈ ਪਾਇਆ ॥ | 1786 | 917 |
| 2 | ਏ ਮਨ ਮੇਰਿਆ ਤੂ ਸਦਾ ਰਹੁ ਹਰਿ ਨਾਲੇ ॥ | 1791 | 917 |
| 3 | ਸਾਚੇ ਸਾਹਿਬਾ ਕਿਆ ਨਾਹੀ ਘਰਿ ਤੇਰੈ ॥ | 1796 | 917 |
| 4 | ਸਾਚਾ ਨਾਮੁ ਮੇਰਾ ਆਧਾਰੋ ॥ | 1801 | 917 |
| 5 | ਵਾਜੇ ਪੰਚ ਸਬਦ ਤਿਤੁ ਘਰਿ ਸਭਾਗੈ ॥ | 1807 | 917 |
| 40 | ਅਨਦੁ ਸੁਣਹੁ ਵਡਭਾਗੀਹੋ ਸਗਲ ਮਨੋਰਥ ਪੂਰੇ ॥ | 1988 | 922 |

The ending’s final 1 is a composition-level counter, not an extra pauri or a reset to Pauri 1.

## Salok Mahalla 9

[Punjabi University’s Salok Mahalla 9 entry](https://eos.learnpunjabi.org/SALOK%20MAHALLA%209%20.html), by Ravinder Singh and Surjit Singh Dulai, confirms 57 saloks at Ang 1426–1429. The live [BaniDB bani 30 response](https://api.banidb.com/v2/banis/30) contains 117 rows: 114 body rows in 57 groups, two opening header rows, and a Dohra heading before Salok 53.

Expose **Salok 1–57** with original opening-line excerpts. Keep the Dohra heading attached to the Salok 53 navigation context; do not count it as a 58th salok or reset the ordinal. For the first entry, preserve the opening title/mangal context. Terminal `॥੫੭॥੧॥` closes Salok 57 and the composition.

| Target | Original opening or heading | Local /30 verse ID | Source row | Ang |
| --- | --- | --- | --- | --- |
| Salok 1 | ਗੁਨ ਗੋਬਿੰਦ ਗਾਇਓ ਨਹੀ ਜਨਮੁ ਅਕਾਰਥ ਕੀਨੁ ॥ | 5113 | 2 | 1426 |
| Salok 52 | ਜੋ ਉਪਜਿਓ ਸੋ ਬਿਨਸਿ ਹੈ ਪਰੋ ਆਜੁ ਕੈ ਕਾਲਿ ॥ | 5215 | 104 | 1429 |
| Dohra heading | ਦੋਹਰਾ ॥ | 5217 | 106 | 1429 |
| Salok 53 | ਬਲੁ ਛੁਟਕਿਓ ਬੰਧਨ ਪਰੇ ਕਛੂ ਨ ਹੋਤ ਉਪਾਇ ॥ | 5218 | 107 | 1429 |
| Salok 54 | ਬਲੁ ਹੋਆ ਬੰਧਨ ਛੁਟੇ ਸਭੁ ਕਿਛੁ ਹੋਤ ਉਪਾਇ ॥ | 5220 | 109 | 1429 |
| Salok 55 | ਸੰਗ ਸਖਾ ਸਭਿ ਤਜਿ ਗਏ ਕੋਊ ਨ ਨਿਬਹਿਓ ਸਾਥਿ ॥ | 5222 | 111 | 1429 |
| Salok 56 | ਨਾਮੁ ਰਹਿਓ ਸਾਧੂ ਰਹਿਓ ਰਹਿਓ ਗੁਰੁ ਗੋਬਿੰਦੁ ॥ | 5224 | 113 | 1429 |
| Salok 57 | ਰਾਮ ਨਾਮੁ ਉਰ ਮੈ ਗਹਿਓ ਜਾ ਕੈ ਸਮ ਨਹੀ ਕੋਇ ॥ | 5226 | 115 | 1429 |

## Implementation and acceptance requirements

1. Extend the existing exact-bani semantic index with separate, validated contracts for /31, /10, and /30. Do not apply a generic numeral parser across arbitrary compositions, excerpts, or shabads.
2. Map anchors after the real `fetchBani` normalization. Provider array indices, provider paragraph numbers, normalized entries, and line indices are different concepts. Use the loaded entry/line target and its original text.
3. Validate source attribution, identity, unique openings, Angs, ordered terminal numbers, complete counts, and unambiguous positive source-row IDs. Missing, duplicated, reordered, or unfamiliar source content should retain ordinary source-page navigation.
4. Test complete payloads and corrupted variants. For Sukhmani, assert all 24 paired salok/body anchors, all 192 stanza groups, the first unit’s extra mangal and rahau, the Ang 263→264 transition in unit 2, and the actual unit 16 ending. Confirm every input row is unchanged.
5. Test both full Anand and explicitly selected short Anand contracts, preserving original ordinals and first/last context. Confirm Salok M9’s Dohra does not add or restart a section.
6. Before rollout, verify first/middle/last jumps in the rendered reader at phone width, enlarged text, and alternate language-layer settings. The selected opening must remain visible below the persistent header and current-location feedback must track the right section.

## Fixture provenance

The durable Sukhmani fixture is [sukhmani-live-20261031.json](../../src/test/fixtures/bani-sections/sukhmani-live-20261031.json), with [its provenance record](../../src/test/fixtures/bani-sections/sukhmani-live-20261031.provenance.json). It preserves every source row and all fields except nested `verse.translation`, `verse.transliteration`, `verse.larivaar`, and `verse.visraam`. No scripture text was normalized or corrected.

| Item | Value |
| --- | --- |
| URL | https://api.banidb.com/v2/banis/31 |
| Acquisition record time (UTC) | 2026-10-31T17:02:42.671259+00:00 |
| Full response bytes | 4,159,587 |
| Full response SHA-256 | `2692f9b09c3339ebbd9d23d02dae2057050b93981d184cdf5fd4faba81336a4c` |
| Projected fixture bytes, including final newline | 667,391 |
| Projected fixture SHA-256 | `33db917738613486e8146d78d2a794533f814b9bfcda8340034643a46a1151bc` |
| Rows / ashtpadis / body stanza groups | 2,019 / 24 / 192 |

Acquisition copies for Anand and Salok M9 are in `tmp/reader-live/banidb-10.json` and `banidb-30.json`, with `provenance-10-30.json`. Their saved JSON hashes are respectively `c011fdb4ab5f546a5eb3e71d61aaa4b5b2fde30754761afe7fd121e5338580f1` (643,271 bytes) and `86ead0f7f93369ac13ada9f1a7bb9bf480df5e5685ad2a3e65e155da1de39d69` (346,649 bytes). These are hashes of the saved JSON extracted from the retrieval, not asserted HTTP wire-byte hashes. The acquisition record time is 2026-10-31T16:57:55Z.

A machine-readable extraction of all 24 saloks, headings, body beginnings/endings, and 192 stanza starts is also available as an acquisition intermediate at `tmp/reader-live/sukhmani-verified-anchors.json`. It is derived from the durable /31 fixture; the fixture is the reproducible source of truth.
