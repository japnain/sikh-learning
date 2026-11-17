# Existing bani offline payload and Shabad OS mapping audit

12 November 2026. This records acquisition and normalization checks, not public redistribution permission or an assertion of complete Shabad OS equivalence.

## Exact existing readings

Official BaniDB responses for every current exact catalogue entry were acquired to a private working directory. There were 104 successful raw responses, with no acquisition failures. The exporter invokes the application's real `fetchBani` implementation through Vite SSR, replacing only its network response boundary with these raw fixtures. It does not copy or independently reimplement the app's length normalization.

Export result: **104 readings, 118 payloads, 60,074,033 bytes, zero validation failures**. Every bani has a `default` payload. The four variable banis also have each distinct currently supported named length. The four default payloads overlap their selected short variants; this duplication preserves explicit request identity.

| Bani | Short | Medium | Long | Extra Long |
| --- | ---: | ---: | ---: | ---: |
| Chaupai Sahib | 104 | 130 | 173 | Not a distinct fourth version |
| Rehras Sahib | 306 | 337 | 439 | 521 |
| Aarti | 61 | 82 | 230 | Not a distinct fourth version |
| Kirtan Sohila | 54 | 61 | 86 | 145 |

These are normalized row counts, including headers, not counts of authored verses or stanzas. No preference, bookmark or reading-position store is changed by the exporter.

Each manifest variant records its requested/resolved length, availability, payload SHA-256 and byte size, ordered row fingerprint, opening/ending row and counts. Fingerprints retain exact strings, entry and verse identifiers, page/source context, header flags and header levels. Each file is checked after writing. The manifest also records raw response checksums and hashes of the actual normalization source files.

The exporter never publishes files. A publisher must consume a complete successful manifest and verify the matching payload bytes, rather than globbing a working directory that could retain files from a failed earlier run.

## Shabad OS candidate results

Compared the real exported readings with the ready-made assemblies in Shabad OS `v5.0.0-next.0`, master SQLite SHA-256 `517890c7e7c2f3dcef7f21b51d074a581b8eded4ebe14c504b84ea075ff16aeb`. This release is distinct from current upstream main.

There were 47 candidate comparisons, covering 24 existing bani IDs and their relevant default/length requests. Of these, 43 differ in exact ordered text. Source punctuation, heading and edition differences are deliberately not stripped away to manufacture equality.

Four named assemblies reference missing primary lines in this release:

| Assembly | Missing primary line IDs |
| --- | --- |
| Akal Ustat (`AKUS`) | `BUMH` |
| Asa Ki Var (`ASKV`) | `1XXX`, `SEXU` |
| Barah Maha (`BRMH`) | `FUKH` |
| Sukhmani Sahib (`SKMI`) | `SEXD` |

**No existing-reading substitution was approved.** Preserve the exact BaniDB payloads. An equal text sequence alone would still require independent heading, edition and identifier review. In particular, repeated lines cannot establish a unique global identifier mapping.

The remaining 80 existing bani IDs have no selected ready-made assembly in this comparison. That does not mean their scripture is missing from the larger Shabad OS corpus. It means a curated assembly and validated mapping are still needed.

The newly added Shabad OS readings have their own source identities and separate data verification; they are not represented as replacements for these existing versions.

## Reproduction

Run with the exact official raw fixtures and source exports supplied to this audit:

```sh
node scripts/shabados/verify-existing-readings.mjs \
  --raw-dir /tmp/naamras-variants-20261112/raw \
  --out-dir /tmp/naamras-variants-20261112 \
  --source-revision banidb-2026-11-12-normalization-2 \
  --shabados-index /tmp/naamras-shabados-20261112/packs-reviewed/line-index.jsonl \
  --shabados-assemblies /tmp/naamras-shabados-20261112/packs-reviewed/assemblies.json

node --test scripts/shabados/verify-existing-readings.test.mjs
```

The optional `--ids` argument performs a sample export. A sample cannot claim complete catalogue coverage. The script performs no network access and does not use backend credentials.

## Provider terms reviewed

The BaniDB API repository's MIT software license is separate from the API data terms. The current [BaniDB terms](https://www.banidb.com/tos/) apply to API data and describe conditions concerning full-data availability, database-copy refreshes within 90 days, acknowledgment/logo, contributions, NPOSL-3.0 and redistribution permission. This audit does not establish that Naamras has met those conditions. Do not treat successful acquisition or normalization as proof of permission to republish the data. Preserve attribution and resolve the applicable permission/compliance status before public redistribution.

References: [BaniDB API source](https://github.com/KhalisFoundation/banidb-api), [BaniDB terms](https://www.banidb.com/tos/), [Shabad OS release](https://github.com/shabados/database/releases/tag/v5.0.0-next.0).
