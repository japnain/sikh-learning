# NaamRas Comprehensive App Audit

Date: 2026-07-29
Repository: `sikh-learning`
Audit target: the current shared worktree, not the currently deployed website or a signed App Store build

## Decision

The audit found and corrected confirmed source-level defects across scrolling, search, saved/history behavior, sharing, navigation, recovery states, offline reading, cloud-state semantics, and request security. The most visible issue—the Panth Prakash top-edge scroll hitch—now uses one explicit app-wide scroll surface and defers persisted reader work until scrolling settles.

After the residual source review and its two final fixes, no confirmed P0, P1, or P2 source defect remains in the scoped persisted-state, route/recovery, save/share/search, or scroll paths. That conclusion does not cover the physical-device, live-service, dependency-advisory, legal/provider, or App Store owner gates below.

This document is the source of truth for the 2026-07-29 audit. It supersedes the test counts and release claims in the 2026-07-18 readiness record wherever the two differ. It does **not** sign off a release: physical-device behavior, live deployment parity, content rights, provider privacy terms, age rating, signing, and App Store owner actions remain separate gates below.

Evidence rules used in this record:

- A fix is marked **implemented** only when its production path exists in the current worktree.
- A behavior is marked **automatically verified** only when a directly relevant test or QA check passed during this audit.
- Browser emulation is not treated as physical iPhone, VoiceOver, Dynamic Type, background/resume, or signed-build evidence.
- A locally built artifact is not treated as evidence about `naamras.xyz` until live parity is checked after deployment.
- The five `FAIL` entries in the 2026-07-25 AI sweep are not product failures; they are invalid QA-injection runs against a production preview that excluded the QA-only hooks.

## Scope Matrix

| Area | Audited surfaces | Disposition | Primary evidence | Remaining gate |
| --- | --- | --- | --- | --- |
| UX/UI and visual design | Home, Read, Study, Saved/Library, Panth Prakash, Vocab, More, onboarding, modal sheets, empty/degraded states | Confirmed interaction defects implemented; responsive and reduced-motion foundations retained | [`src/App.tsx`](../../src/App.tsx), [`src/components/SurfaceStateCard.tsx`](../../src/components/SurfaceStateCard.tsx), [`src/styles`](../../src/styles), route/component tests | Final visual pass on the release candidate and physical accessibility settings |
| App-wide scrolling | Document root, Study reader, Panth Prakash reader, modal locks, hash links, Back/Forward restoration | Permanent single-scroll-surface architecture implemented and automatically guarded | [`src/utils/appScroll.ts`](../../src/utils/appScroll.ts), [`src/hooks/useAppScrollRestoration.ts`](../../src/hooks/useAppScrollRestoration.ts), [`src/scrollArchitecture.test.ts`](../../src/scrollArchitecture.test.ts) | Physical iPhone top-edge and background/resume sign-off |
| Search | In-app routes, Ang lookup, BaniDB multi-mode search, filters, large result sets, retry/partial failure, stale request cancellation | Confirmed truncation, stale-request, invalid-number, and ambiguous-empty defects fixed | [`src/pages/Banis.tsx`](../../src/pages/Banis.tsx), [`src/utils/appSearch.ts`](../../src/utils/appSearch.ts), [`src/api/banidb.ts`](../../src/api/banidb.ts), corresponding tests | Provider availability and physical assistive-technology flow |
| Saved, favorites, history, and resume | Bookmark/favorite identity, malformed local data, study history, reading position, pinned recent search, review kind | Confirmed dead history, identity, validation, cap, and migration defects fixed | [`src/store/progress.ts`](../../src/store/progress.ts), [`src/store/bookmarks.ts`](../../src/store/bookmarks.ts), [`src/store/favorites.ts`](../../src/store/favorites.ts), [`src/store/recentSearch.ts`](../../src/store/recentSearch.ts) | Multi-install cloud integration only if cloud is enabled |
| Sharing | Exact passage routing, canonical source URL, native share, clipboard, download fallback, visible status | Confirmed wrong/generic source-link behavior fixed | [`src/features/shareHighlight/sourceUrl.ts`](../../src/features/shareHighlight/sourceUrl.ts), [`src/features/shareHighlight/ShareHighlightSheet.tsx`](../../src/features/shareHighlight/ShareHighlightSheet.tsx), [`src/pages/Study.tsx`](../../src/pages/Study.tsx) | Real iOS share-sheet and Photos/download behavior |
| Navigation and shell | First-run deep links, 404, reader origin/back label, route titles, focus, lazy hash targets, browser history | Confirmed deep-link loss, generic title, malformed-hash, and restoration gaps fixed | [`src/App.tsx`](../../src/App.tsx), [`src/hooks/useRouteDocumentTitle.ts`](../../src/hooks/useRouteDocumentTitle.ts), [`src/hooks/useAppScrollRestoration.ts`](../../src/hooks/useAppScrollRestoration.ts) | Physical browser/native history and focus pass |
| Accessibility and responsive behavior | Main landmark, skip link, nav state, modal focus/lock, alerts/status, contrast/reduced motion, phone/tablet/desktop CSS | Source semantics and focused regressions implemented; the final automated sweep passed all 51 checks | [`src/App.test.tsx`](../../src/App.test.tsx), [`src/components/ModalSheet.test.tsx`](../../src/components/ModalSheet.test.tsx), [`scripts/qa/accessibility-sweep.mjs`](../../scripts/qa/accessibility-sweep.mjs) | Physical VoiceOver, largest Dynamic Type, Bold Text, Increase Contrast, and Reduce Motion |
| Loading, empty, error, and recovery | Study, Bani, Hukamnama, Amrit Keertan, Rehat, Library, app error boundary, ambient audio | Confirmed dead ends, rejected-promise poisoning, silent failures, and hard-reload recovery gaps fixed; the final 22-scenario QA sweep passed | [`src/pages/Study.tsx`](../../src/pages/Study.tsx), [`src/pages/AmritKeertan.tsx`](../../src/pages/AmritKeertan.tsx), [`src/pages/Rehat.tsx`](../../src/pages/Rehat.tsx), [`src/components/ErrorBoundary.tsx`](../../src/components/ErrorBoundary.tsx) | Physical offline/retry and assistive-technology recovery flow |
| Offline and constrained storage | Selected Nitnem prefetch, exact Bani length, cache fallback/caps, cached reading on live failure, restricted/full storage | Confirmed wrong-payload, unbounded/unconditional prefetch, and cache-failure reading defects fixed | [`src/hooks/useNitemOfflineCache.ts`](../../src/hooks/useNitemOfflineCache.ts), [`src/utils/baniOfflineCache.ts`](../../src/utils/baniOfflineCache.ts), [`src/hooks/useBani.ts`](../../src/hooks/useBani.ts) | Physical airplane-mode relaunch; a full offline web-install shell is not a claimed 1.0 feature |
| Data integrity and sync | Library package, bookmarks/favorites, exact verse identity, tombstones, activity acknowledgements, device ID, schema/RLS | Local validation and cloud snapshot v2 implemented; cloud remains disabled in production | [`src/supabase/snapshot.ts`](../../src/supabase/snapshot.ts), [`supabase/schema/002_naamras_cloud_sync_v2.sql`](../../supabase/schema/002_naamras_cloud_sync_v2.sql), library verifier | Deployed Supabase migration/function integration if cloud is later enabled |
| Performance | Scroll-time work, lazy route content, offline prefetch, startup bundle, cache bounds | Scroll and prefetch work moved off active gestures; the optional backend chunk is now lazy and guarded during every production build | [`src/utils/appScroll.ts`](../../src/utils/appScroll.ts), [`src/hooks/useNitemOfflineCache.ts`](../../src/hooks/useNitemOfflineCache.ts), [`scripts/qa/startup-bundle-audit.mjs`](../../scripts/qa/startup-bundle-audit.mjs) | Physical iPhone smoothness and future production profiling |
| Security and privacy | BaniDB proxy, Supabase merge/delete functions, CORS, request sizes/media/auth, cache/rate bounds, deployment headers | Source hardening implemented and focused tests passed; no cloud functions were deployed | [`supabase/functions/banidb-proxy/index.ts`](../../supabase/functions/banidb-proxy/index.ts), [`supabase/functions/_shared/secure-http.ts`](../../supabase/functions/_shared/secure-http.ts), [`vercel.json`](../../vercel.json) | Network advisory scan, live header check, provider privacy confirmation, and globally distributed rate limiting if proxy scale requires it |
| Code, tests, and release | TypeScript, ESLint, unit/integration tests, CSS audit, library verifier, browser QA, iOS build | All listed final source-level automation passed, including the unsigned Release simulator build | [`package.json`](../../package.json), [`scripts/test-vitest-batches.mjs`](../../scripts/test-vitest-batches.mjs), [`docs/qa/release-device-signoff.md`](release-device-signoff.md) | Signed physical build, live verification, and owner/store gates |

## Confirmed Findings and Fixes

### 1. Panth Prakash and app-wide scroll hitch

Audit input: the user-provided `ScreenRecording_07-25-2026 09-38-19_1.MP4` (local audit artifact, not committed), HEVC at 886 × 1920, approximately 60 fps, 10.481587 seconds. Frame review showed a repeatable hitch when the reader returned to the top edge.

The fault crossed three layers: the document root and reader could participate in competing scroll/overscroll behavior, sticky reader UI could be composited during iOS rubber-band handoff, and reader progress persistence ran from the scrolling path. The fix is architectural rather than Panth-Prakash-specific:

- `html`, `body`, and `#root` are fixed-height, non-scrolling roots with overscroll disabled.
- `#app-scroll-viewport` is the single vertical application scroll surface with momentum scrolling and no vertical scroll chaining.
- All shared reads, writes, end checks, hash navigation, deferred restoration, settled-scroll work, and nested scroll locks go through [`src/utils/appScroll.ts`](../../src/utils/appScroll.ts).
- [`src/pages/library/LibraryChapterReader.tsx`](../../src/pages/library/LibraryChapterReader.tsx) roots `IntersectionObserver` in the app viewport, tracks the visible block in refs, and commits the locator only at `scrollend`/idle, `pagehide`, hidden visibility, or unmount.
- [`src/pages/Study.tsx`](../../src/pages/Study.tsx) likewise updates resume/history/progress after scrolling settles rather than writing persisted state during every scroll event.
- [`src/hooks/useAppScrollRestoration.ts`](../../src/hooks/useAppScrollRestoration.ts) keeps at most 50 session positions, distinguishes history entries by router key plus path/query/hash, waits for lazy content height, and restores same-path Back/Forward entries.
- [`src/components/ModalSheet.tsx`](../../src/components/ModalSheet.tsx) locks the explicit viewport with a nested-lock counter so opening reader controls does not hand scroll back to the document.

Regression evidence covers the CSS invariant, viewport-routed reads/writes, zero work during active scrolling, lazy-height restoration, delayed hash targets, nested locks, app-viewport observer root, settled Panth Prakash location commits, `pagehide` flushing, and Back/Forward restoration. The architecture test also rejects new production `window`/`document` scroll listeners, direct window scroll reads/writes, and direct `scrollIntoView` calls outside the centralized utility. Physical iPhone smoothness is deliberately still a device gate in [`release-device-signoff.md`](release-device-signoff.md).

### 2. Search correctness, completeness, and recovery

Confirmed defects and resolutions:

- A silent 30-result truncation was removed. Search now retains the full returned set, initially renders 12 results, and exposes **Show More**.
- A filter combination that removes all matches now explains that the filters caused the empty state and provides **Clear filters**.
- A genuinely empty search gives examples plus **Clear search**, and restores focus to the search field.
- Multi-source search uses settled results: successful sources remain visible when another source fails, while an honest partial-search notice is announced.
- Full failure provides an in-place localized **Retry** that preserves the current query and filters.
- Changing the query aborts the preceding network request; the `AbortSignal` reaches the actual BaniDB fetch rather than only suppressing stale React state.
- Direct Ang parsing now accepts ASCII, Gurmukhi, and Devanagari decimal digits while rejecting zero, signed, fractional, exponent, infinite, and mixed text.

Evidence: [`src/pages/Banis.test.tsx`](../../src/pages/Banis.test.tsx), [`src/api/banidb.test.ts`](../../src/api/banidb.test.ts), and [`src/utils/appSearch.test.ts`](../../src/utils/appSearch.test.ts) directly exercise pagination, filtered-empty recovery, partial/full failures, retry, request abort, and localized digit parsing.

### 3. Saved items, history, resume, and review

Confirmed defects and resolutions:

- Reading History was effectively dead because `markStudied` had no production call site. Study now records an entry only after the visible verse changes on settled scroll.
- Non-Ang entries are snapshotted into the scripture cache before history references them, preserving the Saved return path.
- Reading history is capped at the newest 50 records on writes and migration.
- Exact favorites distinguish canonical Ang, shabad, and verse routes; two verses in one shabad no longer collide.
- Bookmark hydration validates every persisted record and drops malformed entries without breaking valid saves or in-memory reading.
- Repeated recent searches retain their pinned state.
- Vocab review passes the entry’s actual `word` or `phrase` kind, avoiding review of a phrase under the wrong identity.
- The v1-to-v2 Sundar Gutka length migration now migrates only persisted data and retains Zustand’s live `setLength`/`reset` actions; length controls no longer become inert for the first launch after migration.
- The pending activity queue is capped at the newest 250 records on append and rehydration.
- Restricted `localStorage` now uses a stable in-memory device identifier instead of breaking object/event creation.

Evidence: [`src/store/progress.test.ts`](../../src/store/progress.test.ts), [`src/pages/Study.test.tsx`](../../src/pages/Study.test.tsx), [`src/store/favorites.test.ts`](../../src/store/favorites.test.ts), [`src/store/bookmarks.test.ts`](../../src/store/bookmarks.test.ts), [`src/store/recentSearch.test.ts`](../../src/store/recentSearch.test.ts), [`src/pages/Vocab.test.tsx`](../../src/pages/Vocab.test.tsx), [`src/store/sundarGutkaLength.test.ts`](../../src/store/sundarGutkaLength.test.ts), [`src/store/activityEvents.test.ts`](../../src/store/activityEvents.test.ts), and [`src/supabase/device.test.ts`](../../src/supabase/device.test.ts).

### 4. Share fidelity and safety

Confirmed defects and resolutions:

- A shared line now points to its exact `/study?shabadId=…&verseId=…` route rather than a generic or current reader page.
- Full Hukamnama sharing preserves the exact active reading route.
- Native share and clipboard text both include the canonical NaamRas source URL, with visible success/fallback status.
- Source URLs are constrained to `https://naamras.xyz`; external or malformed paths fall back to the canonical home URL.
- Image sharing retains native Web Share when supported and uses a download fallback otherwise; user cancellation is not reported as a product error.

Evidence: [`src/pages/Study.test.tsx`](../../src/pages/Study.test.tsx), [`src/features/shareHighlight/ShareHighlightSheet.test.tsx`](../../src/features/shareHighlight/ShareHighlightSheet.test.tsx), and [`src/features/shareHighlight/share.test.ts`](../../src/features/shareHighlight/share.test.ts).

### 5. Navigation, focus, and shell recovery

Confirmed defects and resolutions:

- First-run onboarding retains the originally requested pathname, query, and hash instead of forcing shared/deep links to Home.
- Public Support and Privacy remain reachable before onboarding.
- Unknown paths render an honest 404 state with Home and Read recovery actions.
- Route-specific document titles now identify Reader, Read, Saved, book, Vocab, More, Support, Privacy, and not-found pages.
- Reader-origin state preserves a meaningful return destination for Saved, Read, and book flows.
- Malformed URI hashes fail safely; lazy hash targets are watched until their content appears.
- Route changes focus the main landmark without scrolling it unexpectedly.
- The app error boundary uses the same app viewport and main landmark, offers a real full **Reload app** for a rejected lazy/render tree, and retains a Home escape.

Evidence: [`src/App.test.tsx`](../../src/App.test.tsx), [`src/hooks/useRouteDocumentTitle.test.ts`](../../src/hooks/useRouteDocumentTitle.test.ts), [`src/utils/appScroll.test.ts`](../../src/utils/appScroll.test.ts), and [`src/components/ErrorBoundary.test.tsx`](../../src/components/ErrorBoundary.test.tsx).

### 6. Loading, empty, degraded, audio, and retry states

Confirmed defects and resolutions:

- Rejected Library manifest/index promises are evicted from memoized caches so reconnecting can actually retry.
- Panth Prakash home, Amrit Keertan header/section, and Rehat list/chapter failures expose in-place retries instead of caching a failure as empty content.
- Rehat route identifiers require positive safe integers; malformed routes render a clear error rather than issuing ambiguous requests.
- Study selects the correct recovery method for Hukamnama, exact shabad, exact Bani, or Ang and no longer requires a hard page reload.
- Cached Hukamnama remains readable through a live outage and can refresh in place.
- `useShabad` and `useBani` expose retry controls; `useAng` exposes refetch.
- A transient multi-shabad word-data failure is no longer persisted as a successful empty cache entry; a later mount can fetch and cache the recovered word data.
- The ambient audio engine reports terminal source exhaustion back to the visible store, stops the false “playing” state, and exposes an unavailable message.

Evidence: [`src/data/libraryRepository.test.ts`](../../src/data/libraryRepository.test.ts), [`src/pages/library/PanthPrakashLibraryHome.test.tsx`](../../src/pages/library/PanthPrakashLibraryHome.test.tsx), [`src/pages/AmritKeertan.test.tsx`](../../src/pages/AmritKeertan.test.tsx), [`src/pages/Rehat.test.tsx`](../../src/pages/Rehat.test.tsx), [`src/hooks/useShabad.test.tsx`](../../src/hooks/useShabad.test.tsx), [`src/hooks/useBani.test.tsx`](../../src/hooks/useBani.test.tsx), [`src/hooks/useMultiShabadWordData.test.tsx`](../../src/hooks/useMultiShabadWordData.test.tsx), [`src/pages/Study.test.tsx`](../../src/pages/Study.test.tsx), and [`src/components/MusicControllerBridge.test.tsx`](../../src/components/MusicControllerBridge.test.tsx).

### 7. Offline reading and storage pressure

Confirmed defects and resolutions:

- Nitnem prefetch previously fetched every option and could cache the wrong first-Ang payload. It now defers work, processes only selected readings sequentially, and keys the exact Bani plus selected length.
- Prefetch skips offline and `saveData` connections and aborts on unmount.
- Cache Storage retains at most 12 exact readings; the compatibility `localStorage` fallback retains at most 8.
- Exact Bani reading loads a saved copy first, keeps it visible if the live request fails, labels the saved-copy state honestly, and retries live data in place.
- Cache Storage or `localStorage` read/write/removal failures are contained and cannot make an otherwise available reading fail.

Evidence: [`src/hooks/useNitemOfflineCache.test.tsx`](../../src/hooks/useNitemOfflineCache.test.tsx), [`src/utils/baniOfflineCache.test.ts`](../../src/utils/baniOfflineCache.test.ts), and [`src/hooks/useBani.test.tsx`](../../src/hooks/useBani.test.tsx).

### 8. Local and cloud data integrity

Cloud snapshot v2 now carries profile/preferences, bookmarks, favorites, vocab and review metadata, reading progress, and pending activity. Saved items use natural keys that preserve canonical/shabad/verse identity. Deletes produce tombstones, conflict ordering is deterministic, and a remote tombstone is not resurrected by an older local item.

The runtime rejects an incomplete merge response and acknowledges pending activity only after every local event is acknowledged and the complete remote snapshot applies successfully. The schema applies RLS, user ownership, migration of v1 bookmarks, shared conflict/tombstone semantics, and explicit function grants.

This is source readiness, not live readiness. `.env.production` contains no Supabase URL or anonymous key, so sign-in, cloud sync, account collection, account deletion, and the BaniDB proxy are dormant in the current 1.0 configuration. The app continues to use the direct BaniDB fallback.

Evidence: [`src/supabase/snapshot.test.ts`](../../src/supabase/snapshot.test.ts), [`src/supabase/runtime.test.ts`](../../src/supabase/runtime.test.ts), [`src/supabase/savedItemKeys.test.ts`](../../src/supabase/savedItemKeys.test.ts), [`src/supabase/mergeContract.test.ts`](../../src/supabase/mergeContract.test.ts), and [`supabase/schema/002_naamras_cloud_sync_v2.sql`](../../supabase/schema/002_naamras_cloud_sync_v2.sql).

Library package integrity is separately enforced by [`scripts/library/verify-library.mjs`](../../scripts/library/verify-library.mjs): unique work/chapter/block IDs, linked previous/next chapters, non-empty supported blocks, unsafe-markup rejection, source metadata, EPUB checksums, 1,413 raw source pages, 637 readable English pages, and 169 ordered Panth Prakash episodes.

### 9. Performance and startup work

The scroll fix removes persisted store writes and React state churn from the active gesture path. Reader progress uses direct DOM updates after scrolling settles. Nitnem prefetch is deferred and sequential, avoids metered connections, and is bounded. Library rejected-promise eviction avoids poisoned caches without removing successful memoization.

The production build audit also found that the optional Supabase backend vendor chunk was still module-preloaded even though cloud bootstrap used a dynamic import. The actual causes were a static Supabase-client dependency in the always-loaded ambient-audio URL resolver and recursive dependency capture in the backend vendor chunk group. [`src/supabase/audio.ts`](../../src/supabase/audio.ts) now constructs the identical public Storage URL without loading the client, and [`vite.config.ts`](../../vite.config.ts) keeps shared initial helpers outside the lazy backend group.

[`scripts/qa/startup-bundle-audit.mjs`](../../scripts/qa/startup-bundle-audit.mjs) enforces the invariant during every `npm run build`: the backend vendor chunk must still exist for optional cloud use, must not be module-preloaded by `dist/index.html`, and must not be statically imported by the entry chunk. A fresh build passed with `vendor-backend-CW9moily.js` remaining lazy (189.96 kB, 48.49 kB gzip); 34 focused tests across audio, runtime, cloud-sync UI, ambient playback, More, and bootstrap also passed.

### 10. Request security, edge functions, and deployment headers

The BaniDB proxy now enforces:

- exact app-used route and query allowlists;
- exact production/local/Capacitor/Ionic origins;
- `POST`/`OPTIONS` and JSON media type;
- 4 KiB requests, 8 MiB upstream responses, JSON response validation, and a 12-second upstream timeout;
- a five-minute cache capped at 200 entries, 32 MiB aggregate, and 8 MiB per response;
- 120 requests per client per 60 seconds, bounded to 2,000 tracked clients plus a shared overflow bucket;
- rate accounting before method/media validation so malformed floods consume quota;
- `429`, `Retry-After`, and exposed rate-limit headers.

Merge and delete functions share bounded streaming JSON parsing, strict bearer/media/method checks, exact CORS, `no-store`, and controlled public errors. Merge accepts at most 2 MiB; delete accepts at most 1 KiB and always resolves the authenticated user rather than accepting a caller-selected user ID. Database details, auth internals, unacknowledged identifiers, and top-level user IDs are not reflected to callers.

[`vercel.json`](../../vercel.json) adds Content Security Policy, one-year HSTS with subdomains, `nosniff`, clickjacking protection, no-referrer, a restrictive Permissions Policy, and same-origin resource policy. Focused proxy, cloud-edge, and header tests passed.

Residual boundary: the in-memory proxy quota is per warm serverless isolate, not globally atomic. A shared external rate-limit store is required if a future enabled proxy needs a globally enforced quota.

### 11. Accessibility, responsiveness, and design assurance

The current source retains a skip link, one main landmark, route-change focus, selected navigation state, semantic loading/status/error surfaces, accessible modal title/description/focus behavior, visible `:focus-visible` treatment, 44 px reader controls where applicable, narrow-phone rules, desktop navigation, increased-contrast rules, and reduced-motion overrides.

The automated accessibility script covers 17 routes in phone-light, desktop-light, and tablet-dark modes—51 WCAG 2.2 AA checks, including the Panth Prakash chapter reader. The deterministic final command, `QA_A11Y_CONCURRENCY=1 npm run qa:a11y`, passed all 51 checks with zero violations. Serial mode was used because concurrent Chrome/Vite navigation attempts were transport-aborted before completing; those aborted attempts did not report Axe violations. Automated checks still cannot replace the physical VoiceOver and Dynamic Type checklist.

A hosted design-research report was generated during this audit at <https://www.lazyweb.com/report/lazyweb/44e14a81-ae9a-4f3f-b52e-094f56471009/?source=create>. The report content could not be inspected in this environment, so no finding or completion claim in this record is derived from it.

## Reconciliation With the 2026-04-11 Manual Audit

The earlier manual audit remains useful discovery history, but its findings are not assumed to describe the current product:

| Earlier finding | Current disposition and evidence |
| --- | --- |
| Word taps navigated Study to Home | Fixed. Word taps keep the Study route stable and open word, Mahankosh, and BaniDB Kosh context. See [`src/pages/Study.test.tsx`](../../src/pages/Study.test.tsx) and [`src/components/StudyCard.test.tsx`](../../src/components/StudyCard.test.tsx). |
| Learn search changed `anxiety` to `axey`; mobile Learn placeholder clipped | The Learn archive no longer ships. [`src/App.tsx`](../../src/App.tsx) explicitly retires `/learn/*` to Home, so the old input and placeholder are not current surfaces. |
| Share had no visible desktop fallback | Fixed by the share composer, status, clipboard text, Web Share, and download fallback described above. |
| Favorite and bookmark saves were silent | Fixed. Study announces bookmark/favorite add and remove states, and Saved feedback is retained for the Home saved shelf. See [`src/pages/Study.test.tsx`](../../src/pages/Study.test.tsx) and [`src/store/savedFeedback.test.ts`](../../src/store/savedFeedback.test.ts). |
| Hukamnama/Ang Study felt generic and excessively long | Superseded by the focused reader shell, persistent compact navigation, paginated long entries, settings/actions sheets, and reading progress. Current behavior has automated coverage, while final human/device UX remains a gate. |
| Read default looked inconsistent with its search promise | Fixed by search-first auto detection, direct route matching, explicit Refine controls, URL-hydrated queries, and English meaning/romanized coverage. |
| Saved cards and Vocab empty state felt visually weak | Both surfaces have since been redesigned; current structural tests cover useful empty actions and content, but final visual judgment remains in the human release-candidate pass. |
| Punjabi/Hindi surfaces mixed stale English and brand copy | Current Vocab, Study, search, settings, and soundscape copy define English, Punjabi, and Hindi variants. Final human linguistic review remains open because tests cannot judge translation quality. |
| Missing main landmark; Read input missing `id`/`name`; invalid `robots.txt` | Fixed in the current shell/input/public file. Main-landmark and search-attribute regressions are tested, and the final 51-check accessibility sweep passed. |
| Low contrast and accessible-name concerns | Focus, contrast, labels, and names have been revised, and the final 51-check automated sweep passed with zero violations. Physical accessibility sign-off remains mandatory. |

## Verification Ledger

### Passed during the 2026-07-29 audit

| Check | Result | What it supports |
| --- | --- | --- |
| Focused scroll regression set covering App, app-scroll utility, modal, Panth Prakash reader, onboarding, and the architecture guard | 43/43 tests passed | Single viewport, settled work, observer root, restoration, locks, and prevention of direct scroll APIs |
| Focused feature-recovery set | 132 tests passed across 8 files | Saved/history, offline, retry, degraded states |
| Focused search/API rerun | 68 tests passed across 2 files | Pagination, partial/full failure, retry, abort propagation |
| BaniDB proxy focused suite | 12/12 tests passed | Allowlist, CORS, cache/size/rate bounds |
| Cloud edge-function focused suite | 12/12 tests passed | CORS, auth/media/method, bounded bodies, controlled errors |
| Deno type check for the hardened functions | Passed | Edge-function module integrity |
| `npm run lint` | Passed on the final frozen source with 0 findings | ESLint |
| `npx tsc -b --pretty false` | Passed on the final frozen source with 0 diagnostics | TypeScript project graph |
| `npm test` | 79 test files / 535 tests passed across 7 isolated batches | Full repository unit/integration regression |
| `npm run build` | Passed on the final frozen source; Vite built 281 modules and public copy exited 0 | TypeScript and production bundling |
| `npm run qa:startup-bundle` as part of the fresh production build | Passed; `vendor-backend-CW9moily.js` remains lazy and is not module-preloaded | Optional Supabase code is absent from the startup preload graph |
| Focused startup/backend split set | 34 tests passed across 6 files | Public audio URL parity and optional-cloud behavior |
| Focused residual migration/word-cache set | 62 tests passed across 4 files | Live Zustand actions survive migration; transient word failures are retryable |
| `npm run library:verify` | Passed on the final frozen source for 1 work | Panth Prakash package integrity |
| `npm run qa:css-selectors` | Passed on the final frozen source for 9 CSS files | No unmatched audited selectors |
| `QA_A11Y_CONCURRENCY=1 npm run qa:a11y` | 51/51 WCAG 2.2 AA route checks passed with zero violations | 17 routes across phone-light, desktop-light, and tablet-dark |
| `npm run qa:ai-bug-sweep` | 22/22 scenarios passed with 0 failures | Normal routes plus degraded, empty, slow, onboarding, public-document, and persistent-navigation flows |
| `npm run ios:build:release` | Passed with exit 0: rebuilt 281 web modules, passed the startup lazy-backend audit, synced Capacitor in 2.843 seconds, and finished Xcode with `** BUILD SUCCEEDED **` | Unsigned `App` Release build for generic iOS Simulator, iOS 17.0, arm64 + x86_64, bundle `com.naamras.app`, using Xcode 26.4.1 and `CODE_SIGNING_ALLOWED=NO` |
| Final post-harness lint, Node syntax, and QA-script diff checks | Passed | The release/QA harness itself remained clean after the final run |

Focused totals overlap and must not be added together as a repository-wide test count.

### Final integration checks

| Check | Current status | Release interpretation |
| --- | --- | --- |
| `npm audit --omit=dev --audit-level=high` | Unverified; sandbox network access/escalation was unavailable | Do not reuse the historical 2026-07-18 “0 vulnerabilities” result as current evidence |
| Signed build on a physical iPhone | Not run | Required for release, scroll, accessibility, offline, and resume sign-off |
| Live deployment/header/parity check | Not run; no production deployment was authorized | Required only after an authorized deployment |

## Invalid Historical QA Evidence

[`docs/qa/2026-07-25-ai-bug-sweep.md`](2026-07-25-ai-bug-sweep.md) lists five `FAIL` scenarios:

1. Read search degraded state
2. Read search empty state
3. Study Ang degraded state
4. Mahankosh degraded state
5. Cloud bootstrap degraded state

Those checks were run against a production preview while using `qaFail`/`qaEmpty` URLs. Production builds correctly exclude those QA-only injection hooks. The absence of injected states therefore does not demonstrate five product defects, and the five entries must not be counted as regressions or passes. The normal-route scenarios in that run passed. Valid injection evidence requires the default QA development server started by [`scripts/qa/ai-bug-sweep.mjs`](../../scripts/qa/ai-bug-sweep.mjs), or another explicitly QA-enabled build.

That valid rerun is now recorded in [`docs/qa/2026-07-29-ai-bug-sweep.md`](2026-07-29-ai-bug-sweep.md): all 22 scenarios passed with zero failures, including Read degraded/empty, Study Ang degraded, Mahankosh degraded, cloud-bootstrap degraded, ordinary Home Nitnem navigation, and both onboarding presentations. The harness supplies a non-secret local QA anonymous key, ignores only expected same-origin Vite `/src/` module cancellations, and waits for each onboarding step transition before continuing.

## Remaining Gates

### Physical device and human review

- Run the exact Panth Prakash Episode 1 top-edge drag/fling sequence on the final signed iPhone build. Confirm no hitch, rubber-band handoff, jump, or lost position before and after opening Contents and Display.
- Complete VoiceOver reading order, labels, values, selected states, modal focus return, search announcements, bookmark feedback, and degraded-state recovery.
- Test largest accessibility Dynamic Type, Bold Text, Increase Contrast, Reduce Motion, Light/Dark, portrait/landscape, and narrow layouts.
- Verify background/foreground and relaunch position from Home, Study, Saved, Panth Prakash, and an open modal.
- Verify clean install, existing local data migration, airplane-mode relaunch, cached Bani reading, retry after reconnect, ambient audio source failure, native share sheet, clipboard, and image save/download.

The executable checklist is [`docs/qa/release-device-signoff.md`](release-device-signoff.md).

### Deployment and optional cloud

- No production deployment was performed or authorized during this audit.
- `.env.production` has no Supabase or diagnostics configuration. Do not silently enable either.
- If Supabase is enabled later, apply both schemas, deploy the hardened functions, verify RLS and complete-snapshot behavior with two devices, test account deletion for every provider, and repeat privacy review.
- The BaniDB proxy is dormant while Supabase is absent and the direct fallback is enabled. Enabling it changes request routing and operational/privacy obligations.
- Verify CSP/HSTS/other headers and byte-for-byte web/native asset parity only after the authorized release candidate is deployed.

### Legal, content, privacy, and App Store owner actions

- Obtain written Panth Prakash redistribution rights covering the translation, transformed reader edition, bundled EPUB files, territories, App Store distribution, and updates.
- Obtain written BaniDB/Khalis Foundation terms compliance and confirm log retention, linkage, IP use, coarse-location/device inference, sharing, advertising, and tracking practices.
- Resolve the conservative `Unrated` age-rating result caused by detailed historical torture/dismemberment text through written Apple classification guidance or an owner-authorized content change.
- Configure the Apple Developer Team and bundle registration.
- Create/select the App Store Connect record and complete the legal name, SKU, copyright, support contact, DSA trader status, tax/banking, territories, price, privacy answers, screenshots, archive, upload, validation, and review submission.

Details and retained-evidence requirements remain in [`docs/app-store/content-rights-and-provider-audit.md`](../app-store/content-rights-and-provider-audit.md), [`docs/app-store/age-rating-evidence.md`](../app-store/age-rating-evidence.md), and [`docs/app-store-readiness.md`](../app-store-readiness.md).

## Residual Technical Risk and Product Boundaries

- Serverless BaniDB rate limiting is isolate-local. It protects a warm instance and bounds memory, but it is not a globally atomic abuse quota.
- Scripture caches are bounded by record count and contain storage failures, but long-term growth telemetry may justify moving large persistent scripture data to IndexedDB.
- The app provides selected-reading offline cache plus a bundled Capacitor shell; it does not claim a separately installable, fully offline web PWA.
- Automated route tests and axe scans do not measure iOS compositor smoothness, assistive-technology speech quality, human translation/content accuracy, or visual polish under every accessibility setting.
- Production dependency advisory status is unknown until the network-backed audit is rerun.
- Historical build, App Store, live-parity, and test counts in the 2026-07-18 readiness document remain historical; changed source requires current reruns.

## Source-Control Completion

The final production build, startup-bundle invariant, full test suite, lint, CSS audit, library verifier, valid AI bug sweep, automated accessibility sweep, and unsigned Release simulator build all passed against the final audited source. No unresolved P0, P1, or P2 source defect remains in the scoped persisted-state, route/recovery, save/share/search, or scroll paths.

Release sign-off remains separate and requires the physical-device, live-deployment, legal/provider, age-rating, signing, and App Store owner gates above.
