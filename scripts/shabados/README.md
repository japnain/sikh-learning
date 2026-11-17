# Shabad OS reviewed reading import

`extract-readings.py` extracts the four additional named readings from the official database release into the current Naamras reader data contract. The full database and generated packs are deployment inputs; do not commit them to the frontend repository.

## Provenance

- Data: official [`v5.0.0-next.0` master.sqlite](https://github.com/shabados/database/releases/download/v5.0.0-next.0/master.sqlite), SHA-256 `517890c7e7c2f3dcef7f21b51d074a581b8eded4ebe14c504b84ea075ff16aeb`.
- Bani definitions: [monorepo commit `157b8dc3749fa6b8789610af8c7cb1c4eff3b35a`](https://github.com/shabados/shabados/tree/157b8dc3749fa6b8789610af8c7cb1c4eff3b35a/database/collections/banis), copied unchanged into `definitions/`.
- The importer verifies that every ordered definition reference equals the release's `bani_lines` list. This verifies assembly order, not that the older release contains every later upstream textual correction. The two revisions remain explicitly separate in every payload.
- Code/data terms and source attribution: [release README](https://github.com/shabados/database/blob/v5.0.0-next.0/README.md), [license](https://github.com/shabados/database/blob/v5.0.0-next.0/LICENSE.md), and [published source bibliography](https://www.shabados.com/docs/database/sources/).

## Reproduce

Use Python 3.11 or later. Download the official SQLite release outside the repository, then run:

```sh
python3 scripts/shabados/extract-readings.py --database /tmp/shabados/master.sqlite --output /tmp/shabados/packs --line-index
python3 -m unittest discover -s scripts/shabados -p 'test_*.py'
node scripts/shabados/verify-import.mjs /tmp/shabados/packs
```

The importer refuses an unexpected database hash, broken SQLite database, changed definition order, missing/duplicate primary line or invalid source Ang. It preserves the primary text verbatim, including its inline pause punctuation, and retains headings as rows. Numeric verse IDs are explicitly local anchors; `providerLineId` holds the original Shabad OS key and `shabadId` remains zero so local anchors cannot become BaniDB lookups.

`verify-import.mjs` loads the actual frontend validator and translation-selection helpers through Vite SSR. It verifies the source revision, payload structure, unique reading anchors and actual English/Punjabi attribution without changing the app or calling backend services.

## Verified source coverage

| Reading | Lines | English DSSK | Punjabi SBMS | Punjabi PSST |
| --- | ---: | ---: | ---: | ---: |
| Alahnia (`ALHN`) | 135 | 135 | 135 | 131 |
| Anand six pauris and Salok (`ANN6`) | 41 | 41 | 41 | 41 |
| Paath Bhog Mundavani (`MDVI`) | 169 | 169 | 169 | 166 |
| Paath Bhog Ragmala (`RGMA`) | 231 | 231 | 169 | 166 |

The release does not supply transliteration or Hindi translations for these readings. Those fields remain empty, rather than being invented or mislabeled. Missing Punjabi layers on individual lines also remain absent. `manifest.json` records asset-specific coverage, source references, opening/ending text, byte sizes and checksums.

English: DSSK = Dr Sant Singh Khalsa; SBMS = Manmohan Singh. Punjabi: PSST = Prof Sahib Singh's Sri Guru Granth Darpan; NKFT = Faridkot Wala Teeka; SBMS = Manmohan Singh. Primary SGGS text: SSA2 = SGPC Shabadaarth. The metadata manifest retains the release's full bibliographic records.

`line-index.jsonl` is optional acquisition output for the independent existing-bani comparison. It records primary text, asset, source, page, printed line, line-group and section context. It is not proof that a BaniDB line matches; correspondence must be independently checked with context and exact reading order.
