# READ-01 — navigation-only proofreading

The archived Volume I EPUB (`f9f801cc84551a8e895df8f9b812c634f5b9ecaf630e10f58ad5a99e90771768`) contains both reported spellings: `Self- Respecting` at `EPUB/page_119.html` (printed 75), and `Battale` in episode 19 at `EPUB/page_163.html` (printed 119). These are therefore recorded editorial display overrides, not claims that the original publication spells them differently.

The import profile now uses an exact-source-checked override registry, retains the source title in each affected chapter's `source.title`, and records the source hash, location, old/new title and policy in `provenance.json`. Regenerated contents, episodes and search agree. Unknown changed source titles fail import for review.

Validation: the canonical two-volume import and `scripts/library/verify-library.mjs` pass. Compared all 169 chapter payloads with baseline `1f1c042`: pages, blocks, notes, IDs, start positions, word/character counts and previous/next locators are unchanged. Archived EPUB bytes and edition revision are unchanged. The verifier now detects chapter/index/search/episode/provenance title inconsistencies.

Rollback: remove the two display overrides and regenerate metadata; retain all source text and saved locators.
