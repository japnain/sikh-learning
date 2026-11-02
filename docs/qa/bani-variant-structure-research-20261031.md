# Bani variant structure research — 2026-10-31

## Status and scope

This is verified source research for future semantic Bani Contents navigation. It does **not** record implementation of navigation for Jaap, Tav Prasad Savaiye, Chaupai, Rehras, or Sohila. At the time of this note, the live Japji visual gate remains pending. Complete and document that gate before extending navigation to these banis.

No application code was changed to produce this note. The earlier live Japji inspection established 385 API rows and absent `shabadId` fields; data acquisition alone does not establish visual correctness, jump behavior, or accurate active-section tracking.

The evidence below comes from the provider's live JSON retrieved on 2026-10-31, inspected without changing the original text, and the independent sources listed below. All row counts include headers and other included rows; they are not counts of authored verses or stanzas.

## Sources and reproducibility

| Bani | Provider endpoint | Full raw rows |
|---|---|---:|
| Japji (gate fixture only) | https://api.banidb.com/v2/banis/2 | 385 |
| Jaap | https://api.banidb.com/v2/banis/4 | 808 |
| Tav Prasad Savaiye (Sraavag Suddh) | https://api.banidb.com/v2/banis/6 | 43 |
| Benti Chaupai | https://api.banidb.com/v2/banis/9 | 173 |
| Rehras | https://api.banidb.com/v2/banis/21 | 530 |
| Sohila | https://api.banidb.com/v2/banis/23 | 146 |

Lossless parsed responses are in `tmp/reader-live/banidb-{id}.json`. The acquisition record, exact SHA-256 hashes and byte sizes are in `tmp/reader-live/provenance.json`. These are intermediate full fixtures; this document preserves compact structural evidence for resuming work without committing full translation payloads.

The fixtures retain every JSON field and translation, serialized as UTF-8 JSON after parsing the provider JSON returned in a Firecrawl markdown fence. Retrieval used `maxAge: 0`, `formats: ['markdown']`, and `toolDetail: 'compact'`. The recorded acquisition time is `2026-10-31T16:57:05.065851+00:00`; the provider did not expose a precise per-response HTTP Date, so this timestamp is not presented as one.

Independent sources successfully read:

- [Guru Granth Sahib Project — Sohila](https://gurugranthsahib.io/bani/Sohila): the introduction identifies five shabads on Angs 12–13 and supplies their openings, raags, and Mahalla headings. Use that introduction for the Mahalla assignments.
- [Sikh Missionary Society — reproduction of Sikh Rehat Maryada, Chapter II, Article IV](https://www.sikhmissionarysociety.org/sms/smspublications/rehatmaryada/chapter2.html): confirms the standard Rehras components, including nine SGGS hymns, Benti Chaupai, the Savaiyya and Dohra, Anand's first five and final pauri, Mundavani, and the following Salok. It also identifies the ten Sawayyas beginning Sraavag Suddh in the morning recitation. This is a reproduction of the primary code, not an SGPC-hosted copy.

The SGPC-hosted English PDF was too large for the retrieval tool and was **not** read. It is not evidence for this note.

## How existing length normalization affects the evidence

The current `src/api/banidb.ts` implementation first excludes rows with `mangalPosition === 'above'`, then applies a raw provider flag. It constructs signatures from retained row identity/text, deduplicates identical signatures, sorts distinct versions by row count, and assigns the app bands `short`, `medium`, `long`, `extralong` in that order.

Therefore an app band is not inherently the raw provider label of the same ordinal. Chaupai demonstrates the difference. Current raw flag order is `existsSGPC`, `existsMedium`, `existsTaksal`, `existsBuddhaDal`.

| Bani | Raw flag counts (SGPC / Medium / Taksal / Buddha Dal) | Counts after excluding upper mangals | Distinct normalized versions |
|---|---|---|---|
| Jaap | 808 / 808 / 808 / 808 | 808 / 808 / 808 / 808 | One identical text; 808 rows |
| Tav Prasad Savaiye | 43 / 43 / 43 / 43 | 43 / 43 / 43 / 43 | One identical text; 43 rows |
| Chaupai | 104 / 104 / 130 / 173 | 104 / 104 / 130 / 173 | short 104; medium 130; long 173 |
| Rehras | 309 / 340 / 442 / 524 | 306 / 337 / 439 / 521 | short 306; medium 337; long 439; extralong 521 |
| Sohila | 55 / 62 / 87 / 146 | 54 / 61 / 86 / 145 | short 54; medium 61; long 86; extralong 145 |

For Chaupai, raw SGPC and Medium signatures are identical. The app's medium resolves to the Taksal version and long to Buddha Dal; there is no fourth distinct version. For Jaap and Savaiye this table establishes identical provider text, not a request to expose a length selector.

Future regression tests must pass the stored raw payload through the real `fetchBani` normalization and then inspect the selected output. A parallel test-only normalizer could miss precisely these behaviors.

## Anchor identity and attribution rules

All IDs in the tables below are the observed inner `verse.verseId` values from the indicated bani endpoint. Treat them as **bani-local fixture locators**, not proven global scripture verse IDs. Revalidate against the loaded text before using them. Never fabricate a global verse URL or fetch another source solely from these numbers.

The responses commonly omit `shabadId`; the normalizer represents absence as zero. Rehras and Sohila also have null aggregate source attribution and generally lack per-row source metadata. These are valid loaded compositions, so semantic navigation cannot require a positive shabad ID or `source.id === 'G'`.

Use exact loaded entry/line identity for navigation. Retain the provider's header and original page evidence, but do not upgrade unknown source attribution to certainty. Pages shown below are the provider's printed page/Ang context; composite collections do not form one continuous SGGS Ang range. Some header pages are null and normalization associates them with a nearby known page.

## Jaap — BaniDB 4

The 808-row payload contains 199 sequential numbered stanza endings, 1 through 199. There are 22 **occurrences** of chhand headings representing ten distinct metre names. Repeated names are distinct sections, not duplicates to merge. The provider's paragraph field has only 48 groups and cannot represent all stanza boundaries.

| Printed chhand heading | Stanza range | Header local ID | Provider page |
|---|---:|---:|---:|
| ਛਪੈ ਛੰਦ ॥ ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ | 1 | 508 | 1 |
| ਭੁਜੰਗ ਪ੍ਰਯਾਤ ਛੰਦ ॥ | 2–28 | 515 | 1 |
| ਚਾਚਰੀ ਛੰਦ ॥ ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ | 29–43 | 624 | 2 |
| ਭੁਜੰਗ ਪ੍ਰਯਾਤ ਛੰਦ ॥ | 44–61 | 685 | 3 |
| ਚਾਚਰੀ ਛੰਦ ॥ | 62–63 | 743 | 4 |
| ਭੁਜੰਗ ਪ੍ਰਯਾਤ ਛੰਦ ॥ | 64–73 | 752 | 4 |
| ਚਰਪਟ ਛੰਦ ॥ ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ | 74–78 | 792 | 4 |
| ਰੂਆਲ ਛੰਦ ॥ ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ | 79–86 | 813 | 4 |
| ਮਧੁਭਾਰ ਛੰਦ ॥ ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ | 87–93 | 846 | 5 |
| ਚਾਚਰੀ ਛੰਦ ॥ ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ | 94–95 | 875 | 6 |
| ਭੁਜੰਗ ਪ੍ਰਯਾਤ ਛੰਦ ॥ | 96–98 | 884 | 6 |
| ਚਾਚਰੀ ਛੰਦ ॥ | 99–102 | 897 | 6 |
| ਭਗਵਤੀ ਛੰਦ ॥ ਤ੍ਵ ਪ੍ਰਸਾਦਿ ਕਥਤੇ ॥ | 103–132 | 914 | 6 |
| ਚਾਚਰੀ ਛੰਦ ॥ | 133–141 | 1035 | 7 |
| ਚਰਪਟ ਛੰਦ ॥ ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ | 142–144 | 1072 | 8 |
| ਰਸਾਵਲ ਛੰਦ ॥ ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ | 145–149 | 1085 | 8 |
| ਭਗਵਤੀ ਛੰਦ ॥ ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ | 150–160 | 1106 | 8 |
| ਮਧੁਭਾਰ ਛੰਦ ॥ ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ | 161–170 | 1151 | 9 |
| ਹਰਿਬੋਲਮਨਾ ਛੰਦ ॥ ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥ | 171–184 | 1192 | 9 |
| ਭੁਜੰਗ ਪ੍ਰਯਾਤ ਛੰਦ ॥ | 185–188 | 1249 | 10 |
| ਏਕ ਅਛਰੀ ਛੰਦ ॥ | 189–196 | 1266 | 10 |
| ਭੁਜੰਗ ਪ੍ਰਯਾਤ ਛੰਦ ॥ | 197–199 | 1299 | 10 |

The additional heading `ਤੇਰਾ ਜੋਰੁ ॥` is local ID 742, immediately before the Chachri section beginning at stanza 62. Preserve this invocation/context with that section; do not count it as a separate numbered stanza or an additional chhand.

Proposed Contents: 22 chhand sections with their stanza ranges, optionally expandable to numbered stanzas. A repeated chhand name must have an occurrence-specific anchor and a visible range. Do not call the stanzas pauris, or describe 22 distinct metres.

## Tav Prasad Savaiye — BaniDB 6

This is the Sraavag Suddh composition; do not conflate it with the separate Dheenan Ki Savaiye catalog entry. The payload has three header rows and 40 body rows, arranged as ten four-line savaiyye. The main heading is local ID 1404, provider page 12.

| Local Savaiyya | Body local IDs | Printed ending numbers | Opening excerpt |
|---|---|---|---|
| 1 | 1405–1408 | 1 / 21 | ਸ੍ਰਾਵਗ ਸੁੱਧ ਸਮੂਹ ਸਿਧਾਨ |
| 2 | 1409–1412 | 2 / 22 | ਮਾਤੇ ਮਤੰਗ ਜਰੇ ਜਰ ਸੰਗ |
| 3 | 1413–1416 | 3 / 23 | ਜੀਤ ਫਿਰੈ ਸਭ ਦੇਸ ਦਿਸਾਨ |
| 4 | 1417–1420 | 4 / 24 | ਤੀਰਥ ਨਾਨ ਦਇਆ ਦਮ ਦਾਨ |
| 5 | 1421–1424 | 5 / 25 | ਸੱੁਧ ਸਿਪਾਹ ਦੁਰੰਤ ਦੁਬਾਹ |
| 6 | 1425–1428 | 6 / 26 | ਬੀਰ ਅਪਾਰ ਬਡੇ ਬਰਿਆਰ |
| 7 | 1429–1432 | 7 / 27 | ਦਾਨਵ ਦੇਵ ਫਨਿੰਦ ਨਿਸਾਚਰ |
| 8 | 1433–1436 | 8 / 28 | ਮਾਨਵ ਇੰਦ੍ਰ ਗਜਿੰਦ੍ਰ ਨਰਾਧਪ |
| 9 | 1437–1440 | 9 / 29 | ਕਹਾ ਭਯੋ ਜੋ ਦੋਊ ਲੋਚਨ |
| 10 | 1441–1444 | 10 / 30 | ਕਾਹੂ ਲੈ ਪਾਹਨ ਪੂਜ ਧਰਯੋ |

The fifth opening deliberately retains the provider's Unicode ordering. Research/navigation code must not silently “correct” canonical text.

Proposed Contents: Savaiyya 1–10 plus an opening excerpt. Preserve the paired printed numbering in the reading text; do not replace 21–30 with a new sequence or use a generic Pauri label.

## Benti Chaupai — BaniDB 9

The short form has four introductory/header rows followed by the core 25 stanzas, whose **printed numbers are 377–401**. The Benti heading is local ID 1625, Chaupai heading 1626, and first body line 1627. The last core line is local ID 1726. Calling these printed stanzas 1–25 would change their source numbering.

| Present from normalized version | Structural anchor | Local ID | Provider page / printed numbering |
|---|---|---:|---|
| short | ਕਬਿਯੋ ਬਾਚ ਬੇਨਤੀ; ਚੌਪਈ; opening ਹਮਰੀ ਕਰੋ | 1625 / 1626 / 1627 | 1386; core 377–401 |
| medium | ਕ੍ਰਿਪਾ ਕਰੀ ਹਮ ਪਰ ਜਗਮਾਤਾ | 1727 | stanza 402 |
| medium | ਸ੍ਰੀ ਅਸਿਧੁਜ ਜਬ ਭਏ ਦਯਾਲਾ | 1731 | stanza 403 |
| medium | ਅੜਿਲ | 1735 | 1388; stanza 404 |
| medium | ਚੌਪਈ; opening ਸੰਬਤ ਸਤ੍ਰਹ | 1740 / 1741 | 1388; stanza 405 |
| medium | ਸਵੈਯਾ; opening ਪਾਇ ਗਹੇ | 1746 / 1747 | 290; ending 863 |
| medium | ਦੋਹਰਾ; opening ਸਗਲ ਦੁਆਰ | 1751 / 1752 | 290; ending 864 |
| long | preceding ਦੋਹਰਾ; opening ਮਹਾ ਕਾਲ | 1581 / 1582 | 1385; stanzas 366–367 |
| long | preceding ਚੌਪਈ; opening ਦੁਸਟ ਦੈਤ | 1586 / 1587 | 1385; stanzas 368–376 |

The long-only preceding sections appear **before** Benti Chaupai; the table's “present from” column is not reading order.

Long also includes the colophon at local ID 1745 after the stanza ending at 1744. Its text repeats 405 and includes 7558; it is not another stanza 405. A parser that treats every numeral-ending row as a new numbered stanza will misclassify it.

Proposed Contents: the actual named sections, with optional source-numbered stanzas. Distinguish a locally displayed ordinal from printed source numbering if an ordinal is added.

## Rehras — BaniDB 21

Rehras is a composite sequence. The short version's nine SGGS hymns are followed by Benti Chaupai, Savaiyya, Dohra, selected Anand pauris, Mundavani and a Salok. This composition order is independently corroborated by Article IV of the reproduced Rehat Maryada.

| Core component | Header local ID | Provider page | Opening excerpt |
|---|---:|---:|---|
| So Dar; Asa Mahalla 1 | 2648 | 8 | ਸੋ ਦਰੁ ਤੇਰਾ ਕੇਹਾ |
| Asa Mahalla 1 | 2672 | 9 | ਸੁਣਿ ਵਡਾ ਆਖੈ |
| Asa Mahalla 1 | 2691 | 9 | ਆਖਾ ਜੀਵਾ ਵਿਸਰੈ |
| Gujri Mahalla 4 | 2710 | 10 | ਹਰਿ ਕੇ ਜਨ ਸਤਿਗੁਰ |
| Gujri Mahalla 5 | 2721 | 10 | ਕਾਹੇ ਰੇ ਮਨ ਚਿਤਵਹਿ |
| So Purakh | 2733 | 10 | ਸੋ ਪੁਰਖੁ ਨਿਰੰਜਨੁ |
| Asa Mahalla 4 | 2760 | 11 | ਤੂੰ ਕਰਤਾ ਸਚਿਆਰੁ |
| Asa Mahalla 1 | 2779 | 12 | ਤਿਤੁ ਸਰਵਰੜੈ ਭਈਲੇ |
| Asa Mahalla 5 | 2786 | 12 | ਭਈ ਪਰਾਪਤਿ ਮਾਨੁਖ |
| Benti Chaupai | 2881 / 2882 | 1386 | ਹਮਰੀ ਕਰੋ |
| Savaiyya | 3204 | 290 | ਪਾਇ ਗਹੇ |
| Dohra | 3209 | 290 | ਸਗਲ ਦੁਆਰ |
| Anand | 3214 | 917 | ਅਨੰਦੁ ਭਇਆ |
| Mundavani Mahalla 5 | 3248 | 1429 | ਥਾਲ ਵਿਚਿ ਤਿੰਨਿ ਵਸਤੂ |
| Salok Mahalla 5 | 3254 | 1429 | ਤੇਰਾ ਕੀਤਾ ਜਾਤੋ ਨਾਹੀ |

The Anand excerpt has pauris **1–5 and 40**. Its sixth included pauri is not pauri 6.

Important variant anchors and exceptions:

- Medium prepends Dukh Daru: heading 2639, page 469; first line 2640. It adds closing Pauri 3259/page 961 (ਤਿਥੈ ਤੂ ਸਮਰਥੁ), Salok Mahalla 5 at 3268/page 517 (ਅੰਤਰਿ ਗੁਰੁ ਆਰਾਧਣਾ), and Mahalla 5 at 3274/page 517 (ਰਖੇ ਰਖਣਹਾਰਿ), continuing onto 518.
- Long begins, after the bani title, with **headerless** local line 2635 (ਹਰਿ ਜੁਗੁ ਜੁਗੁ ਭਗਤ ਉਪਾਇਆ). A header-only parser misses this composition.
- Long includes additional Dasam extracts before and after Benti. One preceding Chaupai heading is 2842, opening ਪੁਨਿ ਰਾਛਸ. Use the actual printed heading plus the opening line when a stronger authored title has not been established.
- Extra-long begins with additional Saloks at page 1291 (headers 2629 and 2632) and contains expanded excerpts.
- **Extra-long is not a strict superset of long.** Taksal-only rows 2802, 2803, 2841, 3156, 3157 and 3158 are absent from the Buddha Dal selection. This includes the section headed ਕਬਿਬਾਚ ॥ ਦੋਹਰਾ ॥ at 3156, not just redundant mangals.

Proposed Contents: actual composition groups with optional expansion of the nine hymns and selected Anand pauris. Derive membership/order from the chosen normalized output. Do not present one uninterrupted SGGS page range, assume every unit is a pauri, or produce the longest version by appending static sections.

## Sohila — BaniDB 23

The short form comprises these five shabads. The Guru Granth Sahib Project introduction independently verifies the five openings and their raag/Mahalla sequence on Angs 12–13.

| Core shabad | Heading local ID | Provider page | Opening excerpt |
|---|---:|---:|---|
| Gauri Deepaki, Mahalla 1 | 3594 | 12 | ਜੈ ਘਰਿ ਕੀਰਤਿ |
| Asa, Mahalla 1 | 3606 | 12 | ਛਿਅ ਘਰ ਛਿਅ ਗੁਰ |
| Dhanasari, Mahalla 1 | 3614 | 13 | ਗਗਨ ਮੈ ਥਾਲੁ |
| Gauri Purbi, Mahalla 4 | 3627 | 13 | ਕਾਮਿ ਕਰੋਧਿ ਨਗਰੁ |
| Gauri Purbi, Mahalla 5 | 3638 | 13 | ਕਰਉ ਬੇਨੰਤੀ |

Medium adds Japji's closing Salok at heading 3652/page 8, opening ਪਵਣੁ ਗੁਰੂ ਪਾਣੀ ਪਿਤਾ. Long preserves that ending and prepends:

| Added heading | Local ID | Provider page | Opening excerpt |
|---|---:|---:|---|
| Sorath Mahalla 5 | 3551 | 626 | ਗੁਰ ਕਾ ਸਬਦੁ ਰਖਵਾਰੇ |
| Bilaval Mahalla 5 | 3562 | 819 | ਤਾਤੀ ਵਾਉ ਨ ਲਗਈ |
| Salok | 3569 | 256 | ਜਹ ਸਾਧੂ ਗੋਬਿਦ ਭਜਨੁ |
| Salok Mahalla 5 | 3572 | 519 | ਮਨ ਮਹਿ ਚਿਤਵਉ ਚਿਤਵਨੀ |

Extra-long also includes Pauri 3575/page 652 (ਰੈਣਿ ਦਿਨਸੁ ਪਰਭਾਤਿ), then after the core Sohila includes Mool Mantar/Japji's opening Salok, Japji's closing Salok, and selected Jaap stanzas:

| Jaap excerpt heading within Sohila | Local ID | Original printed stanza numbers |
|---|---:|---|
| Chhapai | 3662 | 1 |
| Bhujang Prayaat | 3669 | 2–5 |
| Chachri | 3686 | 94–95 |
| Bhujang Prayaat | 3695 | 197–199 |

These are **extracts**, not complete Japji or Jaap. The small numeral 1 at the Japji opening Salok is not evidence that a numbered Japji pauri is included.

Proposed Contents: the five Sohila shabads, identified by opening excerpt and raag/Mahalla; then actual additional compositions/extracts in their selected reading order. Distinguish the core five from added material without hiding any loaded text.

## Work to complete after the Japji visual gate

1. Verify Japji navigation visually against live loaded text, including first/last targets, target clearance, active-section behavior, browser history, and the reader's native document scrolling.
2. Build structural recognition against real normalized fixtures, using the observed source headings/numbering and exact loaded anchors. Treat this note as evidence, not a hard-coded substitute for validating the selected payload.
3. Ensure every supported length resolves only to present targets, preserves text/order and headers, and never produces empty or fabricated divisions.
4. Verify repeated Jaap chhand names, Chaupai's duplicate colophon numeral, Rehras's headerless beginning and non-superset versions, Anand's 1–5/40 excerpt, and Sohila's partial Jaap selections.
5. Perform phone and desktop visual checks before claiming all-bani semantic navigation complete. Keep source uncertainty visible and preserve native scrolling, text selection and sacred text fidelity.

