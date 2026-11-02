# Captured Bani structure

`bani-structure-snapshots-20261101.json.gz` is a research checkpoint for all 104 exact BaniDB catalog readings, acquired on 31 October and 1 November 2026. It is not imported by the app or used as replacement scripture.

Decompress as UTF-8 JSON. `readings` contains `{ baniDbId, acquiredFile, acquiredFileSha256, payload }` records. `provenance` preserves the acquisition records. Every original Gurmukhi row and its remaining structural metadata is retained. Translation, transliteration, larivaar and visraam are omitted, including from the earlier full captures. Consequently `acquiredFileSha256` identifies the captured input before this final projection, not a serialized payload inside this archive.

See `docs/qa/bani-catalog-validation-20261101.md` for the checksum, normalization audit, four loading defects and remaining visual-validation gate. Do not treat paragraph counts, numeric header levels or catalog categories as verified semantic labels. Bani-local verse IDs are not global shabad identifiers.
