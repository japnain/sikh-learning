# Editing Naamras stories

Stories remain part of Read, with the same appearance preferences and Saved shelf as the rest of Naamras. The published collection is in `public/data/stories`; working editions and their evidence records live here.

## Current editions

The eight introductory readings have named source roles, original-edition page references, rights records and evidence dossiers in `research/`. Direct Gurbani anchors are identified separately from the traditional setting attached to them. Paragraph IDs are retained. The scan review corrected one relationship in the Amar Das text (reading revision 2); source-only updates use metadata revisions.

Three longer working editions are available in the development reader:

| Draft | Words | Reading time | State |
| --- | ---: | ---: | --- |
| Becoming the Khalsa | 1,452 | 8 minutes | Revision 2; early and later accounts distinguished |
| The Music Beside the Journey — Bhai Mardana | 1,354 | 7 minutes | Revision 3; fallback after Kanhaiya full-text access remained unresolved |
| The Shade of a Shared Table — Mata Khivi | 653 | 4 minutes | Revision 3; replacement candidate for the existing short profile |

Separate AI English and history/Gurmat reviews have passed all eleven current packages after the accepted edits. All 67 relevant Macauliffe narrative pages, the three original title pages and 32 comparison-edition PDF pages were visually inspected. The [review summary](reviews/2026-10-23-review-summary.md) links the reports, corrections and exact version evidence.

Human English editing and Sikh history/Gurmat review remain pending; the JSON review fields are reserved for those human records. AI review and source fidelity do not establish independent historicity or specialist approval. The Kanhaiya acquisition memo records the missing material and next steps; it is not a finished story.

## Preview and validate

Run the usual development server, then open `/stories/drafts` or `/stories/drafts/becoming-the-khalsa`. Drafts render with the actual story reader, including sections, appearance and the account sheet. Preview reading does not write Saved or published reading positions. Appearance remains the shared preference.

The route and JSON imports are behind `import.meta.env.DEV`; production builds exclude these preview modules and draft texts. Do not move an unfinished JSON file into `public/` to make it previewable.

```sh
npm run stories:verify
npm run stories:verify:drafts
npm run qa:stories -- --url=http://127.0.0.1:PORT/ --output=tmp/stories-qa/acceptance.json
```

The acceptance harness expects a current development build with the three drafts. It exercises 320px light/dark and 100/200% text, sources, appearance, contents focus, Saved/resume, cached text and draft isolation. Browser/PWA/native checks remain distinct from editorial review.

## Source packages

Each dossier should identify the actual passages inspected, original work versus edition date, page/folio/verse locators, claim/paragraph mapping, meaningful variants and omissions, and any access or scan-comparison limitations. Preserve bibliographic evidence without copying long passages from a modern translation into this public repository.

Sources retain `title`, `author`, `reference` and HTTPS `url`. Add a stable `id`, its `role`, named `edition`, optional `workDate`, editor/translator and structured `locator`. Use `year` for a known edition/publication year; omit it for an undated digital witness. Do not invent a publication date to satisfy the schema.

`narrative` identifies a source used for the account; `context` and `comparison` identify research; `textual-anchor` identifies a precise teaching or primary-text passage. A modern research citation does not itself imply permission to reproduce or adapt that work's English translation.

Rights records identify the relevant source IDs, material and evidence. Original retellings with explicit records need both the eligible source-text record and a record for the new prose. Licensed editions identify the applicable permission or open licence and attribution. Keep private agreements outside the public repository.

Review status is either `pending` or `completed`. Only enter a completed human review with the actual reviewer, date and evidence. Never populate those fields automatically or infer approval from a source citation. Separate AI review reports belong in `reviews/`, with their scope, baselines, accepted changes and final hashes; they must not silently complete the human review fields.

## Reading identity and publication

- `revision` identifies the reading text and paragraph anchors. Advance it when changing the text; review the effect on existing positions and offline copies.
- `metadataRevision` refreshes sources, credits and other non-text metadata without changing the reading revision. The eight source migrations use `metadataRevision: 1` and retain `revision: 1`.
- Keep each catalog summary identical to its reading, including optional metadata revision and series fields. Set `featuredStoryId` deliberately.
- Sections have unique IDs and begin at existing paragraph IDs in increasing reading order. Series order and related IDs must be explicit and valid.
- Complete the editorial work and actual review, resolve edition/translation rights, then deliberately add a new edition to the published catalog. A replacement draft should advance its existing reading or metadata revision. Validate the new catalog and test reading/resume/offline behavior.

The full source audit and implementation sequence are in `docs/plans/2026-10-22-stories-source-audit-and-expansion-plan.md`; browser acceptance evidence is in `docs/qa/stories-reader-20261023.md`.
