# Curated EPUB pipeline

The library keeps original EPUB files for provenance, but the app reads generated,
safe JSON. An importer removes executable markup, emits stable chapter and block
identifiers, and adds or replaces only its own work in the shared catalog.

## Add a regular EPUB

```sh
npm run library:import -- \
  --epub /path/to/book.epub \
  --work-id stable-book-id \
  --title "Book title" \
  --short-title "Short title" \
  --description "Catalog description"
```

The generic importer follows the EPUB spine, uses EPUB 3 navigation or EPUB 2
NCX labels when available, and preserves headings, prose, quotations/notes, and
verse as inert plain-text blocks. It creates one reader section for each
non-empty HTML document, archives the source at
`public/data/library/works/<work-id>/assets/`, records a SHA-256 checksum, writes
a per-work search index, and merges the work into `works.json` without removing
other works.

## Rebuild Sri Gur Panth Prakash

```sh
npm run library:build
npm run library:verify
```

Panth Prakash uses an isolated profile because the supplied files are bilingual
OCR exports with an empty EPUB table of contents. The profile keeps the 637
readable English-facing source pages, splits the in-body headings into Episodes
1–169, and represents headings, poetic meters, numbered verses, notes, and prose
as semantic blocks. It preserves the OCR wording and records every selection and
transformation rule in `provenance.json`.

`library:verify` checks catalog paths, navigation links, block safety, EPUB
checksums, stable Panth Prakash episode IDs, and the expected source counts.
