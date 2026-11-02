# Bani Contents implementation contract — 2026-11-01

Status: implementation plan after a read-only audit. This document changes no application behavior. Complete the requested live Japji visual gate before enabling further profiles. Preserve the current native document scroller, persistent header, exact loaded text, and Return/Stay behavior.

**Implementation update:** the parent task subsequently completed the Japji gate and approved a smaller first implementation. The active contract is now `src/content/baniSections/profileTypes.ts` plus `src/utils/baniSectionProfiles.ts`: reviewed flat parent sections, exact positive local IDs, and a versioned dual-32-bit non-security fingerprint computed once in the existing reading memo. There is no new fetch/cache context or asynchronous hash pipeline; the metadata additions and child disclosures proposed below remain deferred. Japji now also requires the complete reviewed 385-row fingerprint before its independent opening/conclusion checks; only already-validated zero-ID synthetic display headings are excluded from that fingerprint. The three profile families are integrated, and actual normalization plus navigation checks pass for all 114 distinct captured readings. Browser validation of the broader catalog is separate and ongoing. The generated browser manifest is `scripts/qa/fixtures/bani-sections-browser-cases-20261101.json`.

## Scope and evidence

`READ_BANIDB_CATALOG_IDS` contains **104 readings**: IDs 1–107 except 20, 37, 54 (`src/data/banis.ts:180`). The three browse-only entries are separate. Every ID needs an explicit coverage record; that does not mean every short reading needs invented subdivisions.

Read alongside:

- [Structure research](bani-structure-research-20261031.md): Sukhmani, Anand, Salok Mahalla 9; sourced openings, numbering, and fixture provenance.
- [Variant research](bani-variant-structure-research-20261031.md): Jaap, Savaiye, Chaupai, Rehras, Sohila; actual provider selections and exceptions.
- [Reader validation](reader-refinement-20261031.md): completed automated checks and the outstanding browser gate.

The current helper supports only Japji. Its captured response passes production normalization and gives 40 exact targets from 385 unchanged rows. The nine acquired readings are 2, 4, 6, 9, 10, 21, 23, 30, 31; the other 95 require their own payload/source audit. Japji and Sukhmani have durable sanitized fixtures; the other seven acquisition copies currently live under `tmp/reader-live`.

## Prerequisites: preserve evidence rather than infer it

Add optional provider context to `ScriptureLine` and reading context to `BaniFetchResult`. Existing fields and consumers remain valid.

```ts
type BaniSource = 'G' | 'D' | 'B' | 'A'

interface BaniRowContext {
  rawOrdinal: number // Original payload position, before length filtering.
  paragraph: number | null // Provider grouping evidence, not a semantic type.
  source: BaniSource | null // Never populated from the catalog fallback.
  sourceOrigin: 'verse' | 'bani' | 'unavailable'
  verseIdScope: 'bani-local'
}

interface BaniReadingContext {
  baniDbId: number
  normalizationRevision: 3
  resolvedLength: SundarGutkaLength | null
  rawLengths: SundarGutkaLength[] // Equivalent raw selections, not UI names.
  contentFingerprint: string
}
```

1. Set row context while raw rows are still available. Keep `originalAng` separate from an inherited display page. Do not add synthetic verse IDs or manufacture source certainty. A bani-local ID is not a canonical `/shabads` or `/angs` identifier.
2. Compute the content fingerprint once during asynchronous normalization from deterministic ordered JSON tuples of local ID, original page, header level, paragraph, explicit/inherited/unknown source, and comparison-normalized original text. Use SHA-256 and version the tuple schema. Omit translations, layout choices, and the requested display band. A missing fingerprint disables profiles needing it; it must not make scripture unreadable.
3. Preserve the selected raw-length membership and fingerprint through `useBani`, prepared readings, retained readings, and offline cache. Use **resolved** length, never merely the URL request. Equal raw texts may share one identity; length names can be reassigned after provider deduplication.
4. Split adjacent entry groups when authoritative source changes; preserve their original order and repeated-page occurrences. Do not globally sort or deduplicate. Review changes to entry IDs against saved-anchor restoration.
5. Revise unknown-attribution validation independently of shabad IDs. Route identity, readable rows, and content checks must not require missing source metadata to imply `shabadId === 0`. Use the full exact-read catalog, with a standalone Ardaas record, for route/fallback handling. Catalog source remains a route hint, not proof of a passage's source.
6. Old cache entries remain readable. Profiles requiring new context fall back to source pages until fresh normalization supplies it. Keep the already validated Japji v2 path working; do not invent row context for old records.

## Shared runtime contract

Keep `getBaniSections(entries, options): BaniSection[]` pure and synchronous so existing entry/line navigation remains usable. Extend its options with the validated reading context. Extend the existing section shape as follows; its original `entryIndex`, `lineIndex`, and `excerpt` remain unchanged.

```ts
type BaniSectionKind =
  | 'opening-salok' | 'closing-salok' | 'salok' | 'pauri'
  | 'ashtpadi' | 'stanza' | 'shabad' | 'chhand' | 'savaiyya'
  | 'composition' | 'month' | 'letter' | 'provider-heading'

interface BaniSection {
  id: string // Profile key + variant fingerprint + semantic key + occurrence.
  kind: BaniSectionKind
  number?: number // Reviewed ordinal; never used to rewrite printed numbering.
  label: string
  source: BaniSource | null // Null means unattributed, not assumed SGGS.
  verseId: number // Loaded local ID; zero allowed only for a reviewed heading.
  ang: number | null // Original page when known; omit misleading location labels.
  entryIndex: number
  lineIndex: number
  startOrder: number // Flattened loaded row ordinal, inclusive.
  endOrder: number // Exclusive; enables exact parent/child current-location tests.
  excerpt: string // Original body opening; may differ from a preceding header target.
  children?: readonly BaniSection[] // At most one visible disclosure level.
}
```

- Targets resolve against the current loaded entries. Never pass a raw provider index directly to `jumpToLine`.
- Flatten once per payload/variant change, preserving every header, mangal, rahau, colophon, and body row. Comparison normalization may use NFC and whitespace folding; never mutate displayed scripture.
- Use an occurrence-aware candidate map keyed by checked text and available source/local ID. A repeated heading or verse ID is valid only when the profile declares the occurrence and surrounding section boundaries. Raw ordinal is payload-scoped evidence, not a permanent cross-version identifier.
- Parent intervals contain their children. Top-level intervals are ordered and non-overlapping. Unknown introductory/tail material must be explicitly accounted for by the profile; a partial match does not establish full coverage.
- Runtime profile checks are all-or-nothing **per selected reading**. Missing, duplicated, shifted, or unfamiliar anchors return an empty semantic list. Continue rendering source-page navigation. Keep failure reasons in developer diagnostics/tests, not product implementation copy.
- Do not run DOM queries, update progress, or schedule scroll work inside this helper.

## Checked profile registry

Use small per-bani modules under `src/content/baniSections/` and shared pure resolvers under `src/utils/`. Load only the active profile if the complete registry would materially enlarge the reader bundle. Do not ship full fixture scripture with the production profile registry.

Each profile must declare:

| Field | Contract |
|---|---|
| `baniDbId`, route aliases | Exact reading identity; a name fragment is insufficient. |
| `profileRevision`, evidence links | Reviewed source URLs, acquisition date, fixture hash, and structural rationale. |
| `variants` | Explicit ordered composition membership for each reviewed distinct selected text. No superset assumption. |
| `sourcePolicy` | Known-source expectations by unit, or a specifically reviewed unknown-attribution profile. Explicit conflicting source always rejects. |
| `anchors` | Checked opening text, expected original page where available, expected header/body role, occurrence context, and observed local IDs as corroboration. |
| `conclusions` | Composition-specific end markers/counts, including paired counters and reviewed colophons. |
| `groups` | Semantic labels, parent/child relationships, jump/context target, and original excerpt target. |
| `coverage` | `semantic`, `reviewed-indivisible`, or `pending`; separate automated and visual validation states. |

For unknown attribution, do not globally relax Japji's source requirement. A reviewed composite profile may accept null source only after its complete selected structure, opening/end guards, and ordered row fingerprint match an approved fixture. Its labels continue to show neutral page context. A new fingerprint needs review or source-page fallback; it must not inherit approval from the same display length name.

Use local IDs to disambiguate within that reading; verify text and order alongside them. Do not hard-code a numeric ID alone, equate provider paragraphs with stanza counts, or assume global positive-ID uniqueness across all banis. Literal provider headings can be exposed as `provider-heading` only after reviewing their boundaries and usefulness; label them “Headings,” not inferred pauris/ashtpadis. Pending profiles retain source pages.

## Initial implementation batches

| Readings | Top-level Contents | Required special handling |
|---|---|---|
| Japji 2 | Existing two saloks and 38 pauris | Preserve current behavior and Pauri 36's Ang 7 target. |
| Sukhmani 31 | 24 Ashtpadis | Parent jumps to preceding salok heading; body excerpt is separately selected. Optional Salok + Stanzas 1–8 children. Validate 192 stanza groups, first-unit mangal/rahau, unit 2's cross-page start, and unit 16's actual combined ending. |
| Anand 10 | Pauri 1–40 | Final `40 / 1` is not an extra pauri. Embedded Rehras selection is independently checked as 1–5 and 40; do not add a new full-bani length setting. |
| Salok Mahalla 9, 30 | Salok 1–57 | Retain Dohra context at Salok 53; it does not reset numbering. |
| Jaap 4 | 22 chhand occurrences | Ten distinct metre names repeat. Show stanza ranges; optional numbered stanza children. Do not derive 199 stanzas from its 48 paragraph groups. |
| Savaiye 6 | Savaiyya 1–10 | Preserve the paired printed 1–10 / 21–30 counters. ID 7 is a separate profile. |
| Chaupai 9 | Actual printed sections | Three normalized texts; core printed numbers 377–401, extra preceding material in long, and the colophon repeating 405. |
| Rehras 21 | Actual compositions in selected order | Four normalized texts; headerless long opening, mixed/unknown attribution, non-superset extra-long, Anand 1–5/40. |
| Sohila 23 | Five core shabads and selected additions | Four normalized texts; additional saloks and partial Jaap selections retain their printed ranges. |
| Remaining 95 | Per-reading reviewed structure | Audit Aarti, Laavan, Asa Di Var first to finish the 12 featured readings; then vars, raag/shabad sets, salok/savaiye collections, acrostics/calendar forms, Dasam selections, and indivisible readings. Do not derive semantics from catalog categories. |

## Minimal Contents integration

- Replace the shared “Saloks and pauris” heading with localized “Sections.” Keep Find and source pages in the same sheet. Render unknown source as “Page N” only when an original provider page is known; do not pass null to `getSourceReaderUnit` and silently obtain SGGS terminology.
- Render top-level rows with a normal jump button. For children, place a separate disclosure button beside it (`aria-expanded`, `aria-controls`); never nest buttons or overload one tap with both jump and expand. Sukhmani initially shows 24 rows, not 216 children.
- Keep child lists to one visible level. Composite readings can present meaningful groups with the useful immediate targets beneath them; do not reproduce a full scholarly hierarchy in the sheet.
- Add a pure `findCurrentBaniSection(sections, loadedOrder)` helper. On opening Contents, resolve the captured reader anchor to its row ordinal, then return the deepest containing child and its parent. Mark the parent when collapsed and the child when expanded, with one `aria-current="location"` marker. Existing flat `findLast` logic cannot express this reliably.
- Preserve `jumpToLine` and Return/Stay. Header targets already have `data-reader-anchor` in `StudyCard.tsx:537,604`. Revalidate the target if entries/variant change while the sheet is open; close/reset old disclosures and markers rather than jumping with stale indices.
- Section computation depends on entries, validated reading context, active profile, and locale. Current-location calculation stays tied to opening Contents. Add no active-scroll scans, listeners, React updates, or auto-hiding header behavior.

## High-risk gaps found in the current branch

| Priority | Evidence | Required resolution |
|---|---|---|
| P0 | `banidb.ts:867–884`, `buildLine` at 517 | Preserve per-row source provenance and paragraph/raw ordinal. These are currently discarded. |
| P0 | `banidb.ts:915,929` | Grouping omits source, then attributes an entire group to its first body row. Cover same-page cross-source adjacency before changing it. |
| P0 | `banidb.ts:831`; `baniReadingValidation.ts:7,19` | Smaller `BANIS` map misses read-only extensions and standalone Ardaas. Unknown-source payloads can be mislabeled internally or rejected. |
| P0 | `baniReadingValidation.ts:23–25` | Unknown source wrongly requires zero shabad IDs. Source confidence and ID presence are separate facts. |
| P1 | `banidb.ts:748–785,948`; `useBani.ts:102–104,145–146` | Selected raw membership/content identity is discarded; current code exposes only the display length band. |
| P1 | `banidb.ts:886–900` | Fully page-less payloads remain queued and disappear. This is a conditional code-path risk; obtain an actual affected fixture before choosing page-less rendering behavior. |
| P1 | `Study.tsx:2144–2156,2630–2642` | Options omit resolved variant; output/source/title/current-marker assumptions remain Japji-specific. |
| P1 | `msw-handlers.ts:1024–1029` | Most catalog IDs reuse a generic response, so current catalog tests cannot establish semantic coverage. |

## Acceptance and completion criteria

1. After the live Japji gate, add each profile with a sanitized captured fixture and provenance. Keep source text/order/headers intact. Test the actual `fetchBani` path, not a parallel normalizer.
2. Assert every expected semantic target resolves to the checked loaded line, parent/child interval, and original excerpt. Assert all input rows remain unchanged. Test incomplete response, duplicate/reordered anchors, missing/conflicting attribution, repeated IDs/headings, and variant mismatch where relevant.
3. Test cache and prepared-reading compatibility, missing new metadata fallback, normalized alias lengths, and variant replacement while Contents is open. Verify that section navigation never constructs a global verse/shabad URL from a bani-local ID.
4. Browser-check first/middle/last targets, enlarged text and language layers, header clearance, Return/Stay, current markers, and keyboard disclosure. Verify long Sukhmani scrolling has no extra active-scroll work. Do not call a profile visually verified from data tests alone.
5. Maintain a 104-row coverage manifest with actual variant counts, evidence, automated status, and visual status. “All banis complete” requires every reading to be semantically covered or explicitly reviewed as indivisible, with its distinct variants checked. Pending/source-page-only readings remain an honest incomplete semantic rollout.

Only this plan document was written during this audit. No new tests were needed for the documentation-only change.

## Follow-up: complete provider replay, 2026-11-01

Subsequent acquisition completed all 104 catalog payloads (25,697 raw rows). A temporary audit at `tmp/reader-live/provider-normalization.audit.test.ts` replayed the captured responses through production `fetchBani`, with all four requested length bands plus defaults for the four configurable readings: 120 requests representing 114 distinct readings, including 14 distinct length choices.

The replay found real fresh-reading validation failures for Gur Mantar 1, Shabad Hazare 3, Ardaas 24, and Barah Maha Savaiyaa 28. The parent task corrected the shared route-source lookup to cover the full exact catalog and standalone Ardaas. **After that fix, all 120 fresh responses pass `isExactBaniReading`.** Unknown attribution remains neutral; /28 now has the proper internal D route hint. The incomplete-registry issue above is therefore resolved for this captured corpus.

Every selected row survives normalization with its original ID/order/page/header evidence. The only strict text differences are existing edge-whitespace trimming: one trailing U+0020 at Aarti /22 local ID 3510 in long (and its extra-long alias), and at Ardaas /24 local ID 3731. No internal Gurmukhi change was observed. There are no duplicate normalized entry IDs or metadata-observable source-switch collisions in these captures.

Raw-data checks found no entirely page-less reading and no repeated positive selection-row ID. All 25,697 rows lack per-row source metadata; 10 readings lack bani-level source too (1, 3, 5, 11, 21, 22, 23, 24, 28, 36). Page-less body rows and descending page sequences are real, so neither inherited display pages nor global Ang ordering are valid semantic evidence. Identical source lines across different banis carry different selection-row IDs, confirming that bani ID must scope target identity.

Before/after reports are `tmp/reader-live/normalization-audit-20261101-before-fix.json` and `normalization-audit-20261101-after-fix.json`; each records the exact local input hash. These historical replay checks established provider compatibility and the catalog-loading fix, not semantic Contents support or visual correctness. At that interim stage, Japji produced 40 sections and the other profiles remained gated. That gate was subsequently passed and all 104 catalog readings received reviewed semantic profiles or an indivisible-reading profile; see the [current rollout report](bani-reader-rollout-20261101.md) for the completed implementation and its separately recorded browser evidence.
