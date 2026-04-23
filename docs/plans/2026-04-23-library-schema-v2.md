# Library schema v2

Goal
- Define a richer metadata layer for long-form library works without doing a full migration yet.
- Preserve current page-reader behavior while making room for premium source browsing, trust badges, saveable anchors, and starter slices.

Grounded current schema
Current types in `src/types.ts`:
- `LibraryPagePayload`
- `LibraryPageIndexEntry`
- `LibraryWork`
- `LibraryEpisodeIndexEntry`

Current strengths
- page payloads already support `blocks`, `rawBlocks`, `quality`, `review.status`, and optional `episode`
- works already support page index, provenance, page template, and optional episode index

Current gaps
- no first-class starter slice metadata
- no section summaries or trust labels beyond a coarse `review.status`
- no saveable anchor model below whole-page navigation
- no discovery metadata for overview cards, badges, or entry routes
- provenance is too separate and too coarse for UI use
- episode entries are not rich enough to power premium browsing cards

Design principles
1. Keep backward compatibility with current page routes.
2. Separate product discovery metadata from raw OCR/page storage.
3. Make review state explicit and multi-level.
4. Support full page coverage plus premium editorial framing.
5. Add saveable anchors without forcing every save to be whole-page only.

## Proposed v2 shapes

### 1. LibraryWorkV2

```json
{
  "id": "panth-prakash-english",
  "kind": "historical-text",
  "title": "Panth Prakash (English)",
  "shortTitle": "Panth Prakash",
  "language": "en",
  "description": "English translation of Sri Gur Panth Prakash by Rattan Singh Bhangoo.",
  "entryRoute": "/library/panth-prakash-english",
  "pageReaderRouteTemplate": "/library/panth-prakash-english/page/:pageNumber",
  "totalPages": 1417,
  "stats": {
    "volumes": 2,
    "episodes": 169
  },
  "sourcePaths": {
    "pageIndex": "/data/library/works/panth-prakash-english/pages.json",
    "provenance": "/data/library/works/panth-prakash-english/provenance.json",
    "episodeIndex": "/data/library/works/panth-prakash-english/episodes.json",
    "pageTemplate": "/data/library/works/panth-prakash-english/pages/:pageNumber.json"
  },
  "sourceBrowsing": {
    "eyebrow": "Source Browsing",
    "jumpLabel": "Jump to page",
    "supportsEpisodeBrowser": true,
    "supportsContinueReading": true
  },
  "review": {
    "state": "ocr-plus-editorial-slice",
    "badge": "OCR draft with editorial repair",
    "coverage": "full-pages-preserved"
  },
  "provenanceSummary": {
    "sourceType": "verified-archive-translation",
    "translator": "Kulwant Singh",
    "sourceManifestPath": "/scripts/library/sources/panth-prakash-english.sources.json"
  },
  "starterSlices": [
    {
      "id": "khalsa-anandpur-arc-v1",
      "label": "Starter Arc",
      "title": "Khalsa to Anandpur",
      "summary": "Formation, expansion, Anandpur, and the battle pressure that opens toward Chamkaur.",
      "startPage": 128,
      "endPage": 163,
      "entryPage": 128,
      "sectionIds": [
        "pp-v1-e15",
        "pp-v1-e16",
        "pp-v1-e17",
        "pp-v1-e18"
      ],
      "reviewState": "editorially-framed"
    }
  ]
}
```

New fields that matter
- `kind`: lets library distinguish scripture-like works from historical texts, essays, or reference matter
- `entryRoute`: allows overview pages to be first-class front doors
- `stats`: UI-ready counts
- `sourcePaths`: collects file locations in one place
- `sourceBrowsing`: lets overview UI avoid hard-coded copy
- `review`: work-level trust state
- `provenanceSummary`: UI-safe provenance subset
- `starterSlices`: premium curated reading paths

### 2. LibrarySectionV2

This is the missing middle layer between work and page.
Use for episodes, chapters, curated arcs, or reviewed units.

```json
{
  "id": "pp-v1-e15",
  "workId": "panth-prakash-english",
  "kind": "episode",
  "volume": 1,
  "ordinal": 15,
  "title": "Creation of the Khalsa",
  "sourceTitle": "Episode About the Creation the Khalsa Panth",
  "summary": "The Guru initiates the first five beloved ones and frames the Khalsa as a disciplined brotherhood beyond caste distinction.",
  "startPage": 128,
  "endPage": 133,
  "entryPage": 128,
  "review": {
    "state": "editorially-framed",
    "badge": "OCR draft with reviewed framing"
  },
  "provenance": {
    "boundarySource": "episode-index-ocr-headings",
    "confidence": "medium"
  },
  "anchors": [
    {
      "id": "page-128-opening",
      "pageNumber": 128,
      "label": "Episode opening",
      "kind": "episode-start"
    },
    {
      "id": "page-133-bridge",
      "pageNumber": 133,
      "label": "Bridge into expansion",
      "kind": "editorial-bridge"
    }
  ]
}
```

Why this layer is needed
- overview pages should browse sections, not raw page numbers only
- trust and summaries belong to sections more than to works or individual blocks
- starter slices should reference sections directly

### 3. LibraryPagePayloadV2

```json
{
  "workId": "panth-prakash-english",
  "pageNumber": 133,
  "volume": 1,
  "sourcePageNumber": 88,
  "title": "Creation of the Khalsa",
  "displayTitle": "Creation of the Khalsa",
  "blocks": [
    {
      "id": "manual-133-1",
      "type": "paragraph",
      "text": "The Guru and the initiated five mirror one another in a new exchange of authority..."
    }
  ],
  "rawBlocks": [
    {
      "id": "raw-line-8",
      "type": "line",
      "text": "piyo pahul gur bachan nivari..."
    }
  ],
  "quality": "readable",
  "review": {
    "state": "editorial-summary",
    "badge": "Repaired page",
    "notes": [
      "Manual summary used because OCR was fragmentary."
    ]
  },
  "section": {
    "id": "pp-v1-e15",
    "kind": "episode",
    "ordinal": 15,
    "title": "Creation of the Khalsa",
    "startPage": 128,
    "endPage": 133
  },
  "anchors": [
    {
      "id": "block-manual-133-1",
      "kind": "summary",
      "label": "Guru and Panj mutual authority",
      "blockId": "manual-133-1",
      "savePath": "/library/panth-prakash-english/page/133#block-manual-133-1",
      "preview": "The Guru and the initiated five mirror one another in a new exchange of authority..."
    }
  ],
  "discovery": {
    "starterSliceIds": ["khalsa-anandpur-arc-v1"],
    "isStarterSliceBoundary": true,
    "isEditorialBridge": true,
    "nextRecommendedPage": 134
  },
  "provenance": {
    "sourceFile": "scripts/library/raw/.../v1-ocr-hocr-html.html",
    "sourceManifestPath": "/scripts/library/sources/panth-prakash-english.sources.json",
    "derivation": "ocr-plus-manual-summary"
  }
}
```

New fields that matter
- `displayTitle`: lets UI show cleaned titles while keeping source title elsewhere
- `review.state` and `badge`: finer than `ocr` vs `reviewed`
- `section`: page-to-section join without re-parsing episode index everywhere
- `anchors`: enables saveable block-level entry points
- `discovery`: page-level product hints
- `provenance`: page-local trust details for UI/tooling

## Review states

### Work-level review.state
- `ocr-only`
- `ocr-plus-editorial-slice`
- `section-reviewed`
- `fully-reviewed`

### Section-level review.state
- `ocr-indexed`
- `editorially-framed`
- `reviewed`

### Page-level review.state
- `ocr`
- `editorial-summary`
- `reviewed`

Keep current `quality` as the readability condition:
- `clean`
- `readable`
- `fragment`
- `unreadable`

Review state and quality should stay separate.
- `quality` answers: how readable is the page text?
- `review.state` answers: how much editorial trust/review has been applied?

## Saveable anchors

Anchor goals
- allow saving specific editorial moments, not just entire pages
- support future “saved section” or “saved passage” behavior in library works

Minimum anchor fields
- `id`
- `kind` (`heading`, `paragraph`, `summary`, `episode-start`, `editorial-bridge`)
- `label`
- `blockId`
- `savePath`
- `preview`
- optional `sectionId`

Recommended default save path format
- `/library/<workId>/page/<pageNumber>#block-<blockId>`

## Discovery fields

Needed because premium library browsing should not be rebuilt from raw page OCR.

Work-level discovery needs
- `starterSlices`
- overview summary
- trust chips
- entry route

Section-level discovery needs
- summary
- review badge
- page range
- slice membership

Page-level discovery needs
- `isStarterSliceBoundary`
- `isEditorialBridge`
- `nextRecommendedPage`
- anchor previews

## Migration constraints

1. Do not break current routes
- Keep `/library/:workId`
- Keep `/library/:workId/page/:pageNumber`

2. Do not force a big-bang data rewrite
- v2 can be additive
- current v1 fields should remain readable by existing components

3. Keep current files loadable
- existing `work.json`, `pages.json`, `episodes.json`, and page payloads should continue to work
- new v2 fields should be optional first

4. Prefer deriving old UI from v2, not the other way around
- once v2 exists, overview cards and trust chips should come from metadata rather than hard-coded strings

5. Preserve source honesty
- never upgrade trust badges globally just because a starter slice was reviewed
- work-level review state must still distinguish reviewed slices from the rest of the corpus

## Concrete first migration for Panth Prakash

Phase A
- add optional v2 fields to `LibraryWork`:
  - `entryRoute`
  - `stats`
  - `review`
  - `provenanceSummary`
  - `starterSlices`
  - `sourceBrowsing`

Phase B
- add optional `section` and `anchors` to page payloads
- add richer `review.state` and `badge` to repaired pages first

Phase C
- publish a `sections.json` for Panth Prakash episodes with summaries and review badges
- make `/library/panth-prakash-english` consume section metadata instead of raw episode entries only

## Minimal TS changes required later

Likely additions in `src/types.ts`
- `LibraryReviewState`
- `LibraryWorkReviewMeta`
- `LibrarySectionKind`
- `LibrarySectionEntry`
- `LibraryAnchor`
- `LibraryStarterSlice`
- `LibraryDiscoveryMeta`
- optional v2 fields on `LibraryWork` and `LibraryPagePayload`

## Definition of done
- The schema can represent:
  - a premium Panth Prakash front door
  - section summaries and trust markers
  - a reviewed starter slice
  - saveable page/block anchors
  - backward-compatible page reading
- None of this requires a full corpus migration before the next implementation pass.
