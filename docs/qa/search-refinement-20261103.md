# Search refinement — 3 November 2026

## Research and implementation

Primary sources checked against the live BaniDB API:

- [Search operators](https://github.com/KhalisFoundation/banidb-api/blob/dev/api/lib/searchOperators.js): legacy type 4 converts Romanized words to initials. It is unsuitable as the ordinary transliteration search.
- [Omni search](https://github.com/KhalisFoundation/banidb-api/blob/dev/api/controllers/omni.js): type 8 searches phonetic text and English translations but also includes initial-letter matches. It supplies a shortlist of 20 candidates, not exhaustive transliteration pagination.
- [Phonetic normalization](https://github.com/KhalisFoundation/banidb-api/blob/dev/api/controllers/phonetic.js): basis for search-only spelling normalization. Original scripture, transliteration, and translation text remain unchanged.
- [Search controller](https://github.com/KhalisFoundation/banidb-api/blob/dev/api/controllers/shabads.js): English type 3 provides paginated results.

Automatic Latin search combines types 3 and 8. Explicit English meaning uses type 3; explicit transliteration uses type 8 with local phonetic phrase filtering. Gurmukhi phrases use type 2; compact unmarked letters can additionally search initials. Explicit start/anywhere initials and numeric Ang/Vaar routes remain available.

The search engine ranks exact phrases ahead of other word matches, removes unrelated phonetic/initials candidates, selects the English translation that matched when available, and deduplicates by source, shabad, and verse. Romanization variants such as `sat nam`/`sat naam` and `waheguru`/`vaahiguroo` match without rewriting displayed text. Highlights preserve complete Gurmukhi graphemes.

Search controls expose all four main intents, mode-specific guidance, keyboard submission, source/scope filters, and a 160-character bound. Oversized shared URLs receive a useful validation message. Query changes cancel stale work. Internal URL writes cannot overwrite more recent typing when a mode changes. Pagination cannot cache an incomplete initial search and suppress a needed retry.

## Verification

- 277 tests passed across 11 search, page, API, proxy, history, and highlight suites.
- TypeScript app and build configurations passed with build metadata directed to `tmp/` (the dependency directory is outside the writable sandbox).
- Production Vite build passed. Startup audit passed: 182.2 KiB compressed JavaScript, 12.9 KiB compressed CSS, within existing budgets.
- Live mobile browser checks (390 × 844 requested viewport; final rendered DOM reported 325 CSS-pixel width with no horizontal overflow): `hukam` finds the expected opening verse; `sat nam` produces five relevant passages and excludes `sat naanak`; the first passage opens shabad 3794, verse 46273 on Ang 1083. Returning restores query and intent.
- Live Gurmukhi `ਸਤਿ ਨਾਮੁ` search returned matching scripture, including the Mool Mantar on Ang 1, with additional pages available.
- Live English `compassion` search: initial 19 grouped passages, then 39 after loading the second provider page. A failed page preserves existing results and can retry successfully.
- Fast mode switching followed immediately by typing preserves the newest query; automated coverage also exercises real BrowserRouter transitions and browser history.

The production `banidb-proxy` was updated from version 1 to version 2. Comparison against the deployed function confirmed that only bounded pagination and encoded-path length validation changed; existing API-key verification, origin checks, and rate limits were retained. Frontend changes remain in the working tree and have not been pushed.

## Limits

This is search over supplied scripture text, transliterations, and translations, not generated semantic interpretation. The phonetic provider returns its best 20 candidates, so transliteration results are labelled as closest matches and users can narrow them with more words. English results support additional pages. Physical iPhone/Safari testing was not performed; the mobile check used a browser viewport.

## Completion pass

This pass extends the first-pass behavior and limits described above. English intent planning now recognizes **24 curated lexical themes**, with at most three English retrieval queries per search. Recognized question wrappers and an explicit spelling-correction allowlist improve retrieval; related terms are disclosed, with a literal-query option. These are searchable word alternatives, not AI semantic interpretation, generated answers, or assertions that the terms have identical theological meanings. Quoted phrases, negation, unfamiliar topics, and mixed-script input avoid inferred topic expansion.

Provider requests now have independent identities, pagination cursors, and failure state. The engine publishes results progressively, limits concurrent requests to three, cancels stale work, and retries failed requests while preserving successful results. Restored searches retain their request state within the bounded, temporary in-memory cache.

Live production checks on 3 November confirmed the following retrieval spellings. The original user query remains the matching/display context; canonical aliases must also be understood by the local matcher.

| User spelling | Verified retrieval spelling | Live finding |
| --- | --- | --- |
| `satnam` | `sat naam` | Both retrieve useful matches; the spaced response also contains unrelated `sat naanak` candidates that require filtering. |
| `wahe guru` | `waheguru` | The spaced shortlist lacked `vaahiguroo`; the joined query retrieved it. |
| `ek onkar`, `ik oankaar` | `ikoankaar` | Joined queries return the opening Mool Mantar; spaced queries miss the symbol. The app also requests paginated type 2 `ੴ` directly. |
| `kirpa` | `kirapaa` | `kirpa` mainly retrieved historical Kirpa/Kirpal references; `kirapaa` returned the intended Romanized word. |
| `simran` | `simaran` | `simran` mostly retrieved English mentions; `simaran` returned the actual Romanized word. |

BaniDB represents `ੴ` as the single Roman token `ikOankaar`. Its direct type 2 query returned 646 candidates. These checks used the [official search endpoint](https://api.banidb.com/v2/api-docs/) and the provider's [Omni implementation](https://github.com/KhalisFoundation/banidb-api/blob/dev/api/controllers/omni.js). Supplying `results=100` or `page=2` still left Omni at its first 20 candidates.

Transliteration can now continue beyond that shortlist: confidently aligned seed words supply an observed Gurmukhi phrase, reduced using the [official main-letter rules](https://github.com/KhalisFoundation/anvaad-js/blob/master/src/mainLetters.js), then retrieved through paginated type 6. The query uses explicit wildcards between words, for example `*ਸਤ*ਨਮ*`; the [operator implementation](https://github.com/KhalisFoundation/banidb-api/blob/dev/api/lib/searchOperators.js) otherwise removes spaces. This wildcard path also avoids observed coverage gaps in the tokenized index: plain `ਹਕਮ` returned no Dasam candidates, while `*ਹਕਮ*` returned 31. Live all-source wildcard counts were 597 for `*ਹਕਮ*`, 665 for `*ਸਤ*ਨਮ*`, and 94 for `*ਵਹਗਰ*`.

Those counts are **candidates, not exact transliteration matches**. Wildcards permit intervening words and consonant collisions, so every result must still pass the original phonetic phrase filter. The reduction preserves independent-letter distinctions such as `ਓ` versus `ੳ`, removes the verified subjoined ਰ/ਹ forms, and does not assume universal dotted-consonant simplification. Uncertain word alignment adds no derived request. Isolated one- or two-letter main-letter anchors are skipped because broad queries such as `*ਨਮ*` can time out; longer phrases may retain short component words.

Expansion remains dependent on useful initial seeds and the observed spellings they contain. It does not constitute a complete local corpus index. A future independent index could use the [official STTM/BaniDB Realm distribution](https://banidb.blob.core.windows.net/database/sttmdesktop-evergreen-v2.zip), whose [desktop integration](https://github.com/KhalisFoundation/sttm-desktop/blob/dev/www/main/banidb/realm-search.js) retains BaniDB verse and shabad identifiers; no corpus was downloaded during this pass.

Production `banidb-proxy` **version 3 was deployed**. Its only additive capability change was allowing search type 6; `verify_jwt` was unchanged. Final completion-pass test totals and browser verification are recorded below when finished.

### Completion verification

- Final combined search regression run: 15 files, 468 tests passed. A subsequent joined `ikoankaar` retrieval correction added one planner case; the updated planner suite passed 41/41, bringing the current verified cases to 469.
- App and Node TypeScript checks passed. Focused search ESLint passed. Production Vite build passed; existing bundle-size advisory remains for large lazy chunks.
- Startup audit passed: JavaScript 182.2 KiB gzip / 190 KiB budget; CSS 12.9 KiB gzip / 36 KiB budget. Supabase remains lazy.
- Live preview: `kirpa` returned 32 grouped passages with additional pages; `wahe guru` returned 25, then 30 after paging. Opening verse 59390 correctly reached shabad 5428 / Ang 1402; Back restored all 30 results and the loaded-page state.
- Live English question `what does Gurbani say about anxiety?` returned 56 grouped passages and disclosed `anxiety · worry · anxious`. Exact words only changed the input to `"anxiety"` and returned 19 initial grouped matches.
- Live source selection restricted `wahe guru` to four grouped SGGS passages; every displayed result belonged to that source.
- Browser viewport 390 × 844: no horizontal overflow (document width 386 px). Screenshot visually checked; browser console had no errors. Viewport override reset after verification. A physical iPhone was not tested.
- Search snapshots retain loaded results, separate cursors, failed-page descriptors, and resumable pending requests. Tests cover Back during partial loading, independent retries, mixed catalog/provider failures, stale responses, and queries that change during pagination.
- Search history records explicit submissions and opened results, avoiding slow-typing prefix noise. Empty-state examples retain the current intent/source. Only one expansion/pagination action is shown at a time.
- Frontend changes remain in the working tree/local preview. The required additive proxy type-6 support is deployed as version 3; no frontend push or release was performed.

### Release finalization

- Prepared a clean release against GitHub master `d936759d2f52eeffc5b24f0caa1592a857468323`. All 1,076 baseline file blobs were verified against the remote tree before applying the search changes.
- Release-scoped verification: 472 tests in 15 files passed; app/node TypeScript, full ESLint, CSS selector audit, and seven browser-fixture/startup-budget unit checks passed.
- Production build and published-story asset verification passed. Current-master startup JavaScript is 152.0 KiB gzip against the 190 KiB budget; CSS is 12.7 KiB gzip against 36 KiB.
- Final polish records valid single-glyph ੴ queries in recent history and removes an unused refinement-button CSS rule.
- Independent review found no missing relative dependencies or unrelated file changes. The release preserves the public API-key validation already running in proxy version 3.
