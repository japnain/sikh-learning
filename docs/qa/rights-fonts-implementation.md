# SEC-02 / SEC-03 implementation

Candidate base: `1f1c042cacc507528f999f8072ed970f3d9bedbb`. Work performed 16 November 2026 Toronto / 17 November UTC. No production changes or rights-holder messages.

## Font notice repair

The four application WOFF2 files are unchanged. `public/licenses/fonts.json` records their SHA-256, embedded version, embedded copyright, official upstream family source, exact downloaded notice hash and notice URL. Names/version/license links were read directly from the WOFF2 name tables using FontTools; that inspection dependency is temporary and is not an application dependency.

| Family | Embedded version | Notice |
|---|---|---|
| Cormorant Garamond | 4.001 | `public/licenses/CormorantGaramond-OFL.txt` |
| Noto Serif Gurmukhi | 2.004 | `public/licenses/NotoSerifGurmukhi-OFL.txt` |
| Plus Jakarta Sans | 2.071; gftools 0.9.30 | `public/licenses/PlusJakartaSans-OFL.txt` |
| Noto Sans Devanagari | 2.006 | `public/licenses/NotoSansDevanagari-OFL.txt` |

The first three complete license files were retrieved from their official Google Fonts family directories, preserving each family's copyright notice. The existing Devanagari notice is byte-identical to the current upstream notice. All four use OFL-1.1; no font binary, weight declaration, size, layout or family name was changed. Cormorant's embedded copyright capitalizes “The”; the upstream notice uses “the”; both are preserved in the manifest rather than rewriting either source.

Privacy & Sources links to a static accessible credits page with four notice links. `qa:font-notices` rejects a new unregistered application font, a changed hash, missing provenance fields, an incomplete/missing notice or a mismatched notice hash. `--built` additionally checks the emitted WOFF2 bytes, copied notices, manifest and notice index. The production build runs that artifact check after public files are copied.

**Provenance limit:** the first three fonts were bundled in `8909d7f3`, replacing a Google Fonts CSS import. Their original exact subset download URLs were not retained. Current Google Fonts CSS (both discrete weight and variable range requests) produces different byte hashes, so those downloads are not represented as exact matches. Embedded versions, family copyrights and family licenses are verified; the historical acquisition URLs remain an explicit traceability gap. Devanagari has an exact retained Google Fonts v30 URL and matching hash in its existing source record. SEC-03 notice packaging is repaired, while the strongest original-download-chain requirement is partial for three files.

## Public-content release gate

`docs/content-rights-register.json` records **108 decisions covering 287 file fingerprints**: each source artwork and derivative, public artwork/icons/audio, both translated Panth Prakash source editions, their derived chapter/index files, each public story, and the BaniDB/Shabad OS providers and definitions. Font notices are tracked separately. PDF.js vendor licenses remain under the existing vendor packaging workflow.

This is intentionally conservative. It includes source art that may be tree-shaken from a particular build. `unresolved` means the evidence needed for a distribution decision has not been inspected or recorded; it is not a claim of infringement. The fourteen legacy originals have individual entries plus their thumbnails. A follow-up source check approves the separate `nanak-bala-mardana` Home original and thumbnail on a documented Commons public-domain basis; see `wikimedia-artwork-review-20261117.md`. It does not clear any of the fourteen legacy originals. Assets 05 and 07 retain `blocked` status from the existing provenance record. Known source leads and creator identifications are preserved without treating identification as permission.

`qa:rights-inventory` checks completeness, duplicate coverage and changed bytes. It passes with unresolved records and explicitly says this is not distribution approval. **`qa:release-rights` fails closed while any decision is unresolved/blocked, or any asserted approval lacks source, creator, license, evidence, review date, attribution and web/offline/transformation scope.** A `withheld` label cannot bypass it while files remain in the candidate. No user data, sacred text, book content or selected home artwork was deleted or silently replaced.

### Concrete withholding decision

The implemented safe withholding boundary is the **whole candidate release**: do not publish it until the strict command passes and the other release gates pass. Current deployed content is not removed by this local patch. This avoids making the catalogue, cached versions or saved places inconsistent while rights evidence is missing.

If approvals cannot be obtained, an independently reviewable content-withholding patch must do all of the following before marking affected entries resolved:

1. Remove the exact legacy originals **and thumbnail imports** from `src/assets/share-highlights/manifest.ts`, `src/data/homeArtworkCatalog.ts` and `src/data/homeArtworkAdditions.ts` and every actual consumer, including the saved Golden Court ID fallback. Supply an independently cleared replacement with composition/cultural review; preserve stored selection IDs for restoration. Merely filtering a visible list does not prevent Vite from emitting imported images.
2. For Panth Prakash, withhold `public/data/library/works/panth-prakash-english/` (EPUBs, chapter text and indexes) together with its entries in `works.json`, `manifest.json` and top-level search index; present honest unavailability without erasing private libraries, bookmarks or reading progress. Coordinate cache revision and an explicit retention/re-download policy before deployment. Hiding the Books card alone does not remove public downloads.
3. For unapproved ambient recordings, remove public MP3s **and hosted-bucket references** from their playback entries. For icons/other art, replace exact binaries and update fingerprints only after provenance review.
4. Review BaniDB and Shabad OS text/translation layers independently from code licenses and underlying scripture. Resolve attribution, offline copies, transformations and source-update obligations. Do not rewrite primary Gurbani as a permission workaround.

These are next changes requiring actual source/permission evidence and product impact decisions, not changes claimed as performed. No private correspondence belongs in this public register.

## Validation and rollback

- Source font inventory: **4/4 passed**.
- Rights inventory: **108 entries / 287 files passed**.
- Strict rights release command: **expected failure**, 106 unresolved/blocked decisions after bounded Wikimedia follow-up. This is a remaining release blocker.
- Gate regressions: **9/9 passed** across source/built font fingerprints, new fonts, missing notices/index, new/changed content, incomplete approvals, removed providers and false withholding labels.
- Existing Privacy tests: **5/5 passed**. Root records final candidate build/lint/full suite and emitted-notice results.

No data/schema migration. Added font notices may safely remain on rollback. Never remove a required notice while its font is shipped. Do not bypass the rights command by changing unresolved records to approved without evidence; production remains unchanged by this task.
