# Offline readiness and launch metadata — audit implementation

Implemented against the isolated audit branch based on `1f1c042cacc507528f999f8072ed970f3d9bedbb`. No production deployment, migration, account write or sacred-text change was made by this work.

## OFF-01

The regression first reproduced the defect with the actual routine hook and synthetic cached text: rejecting the matching-reader capability still produced `{ready: 2, total: 2, status: 'ready'}`. The initial failure is retained in the implementation workspace's `offline-before.log`. This is a fault-injected unit reproduction, not a claim that a real user encountered it.

The hook now verifies the matching installed reader using the existing `ensureOfflineReaderShell` before publishing ready. It runs once per readiness transition, after text read-back, rather than per reading. The shell module remains dynamically imported. The existing packaged-native and development exceptions stay in that shared helper. No download, cache, source pin, edition mapping or reading-position format changed.

Missing, evicted, failed or wrong-build shells yield `shell-unavailable` with accurate recovery copy and a working Try again action. Cached text is retained and remains usable in the open app. Reconnect, active-worker changes and foreground return recheck readiness. Effect cancellation guards late shell results when routines change or the hook unmounts.

Verification under Node 22:

```sh
node node_modules/vitest/vitest.mjs run \
  src/hooks/useNitemOfflineCache.test.tsx \
  src/utils/offlineReaderShell.test.ts \
  src/utils/baniDownloads.test.ts \
  src/utils/baniOfflineCache.test.ts \
  src/pages/NitnemCustomize.test.tsx \
  src/serviceWorker.test.ts \
  src/launchMetadata.test.ts --configLoader runner
```

Result: **119 tests passed in 7 files**. Coverage includes absent/mismatched shell, pending readiness, retry without replacing cached text, cancellation of obsolete results, foreground recheck, correct offline copy and retry without saving a draft. Existing pack tests also cover interrupted replacement, cancellation, digest corruption, duplicate downloads, quota failure and retained last-good data. These are synthetic fault tests, not operating-system eviction or physical-device proof.

`scripts/qa/offline-shell-acceptance.mjs` adds an isolated production-build Chromium journey with synthetic guest readings and blocked service-worker installation. Root ran it successfully against the candidate build; `offline-shell-browser.log` records:

- `shell-unavailable`, with the saved-text/reopening distinction visible;
- zero service-worker registrations;
- cached synthetic text retained and Try again entering preparing;
- full browser restart offline unable to load a fresh deep link (`ERR_INTERNET_DISCONNECTED`), demonstrating why the readiness claim must remain blocked.

The test blocks external requests and creates/removes only its own temporary profile. It does not read real accounts or books. Run with `QA_SHELL_DIST` to select a production artifact; `QA_SHELL_EXPECT_STATUS=ready` supports reproducing the old archived build's claim. The candidate pass does not imply an actual installed iOS or Android test.

The final configured candidate rerun also passed and completed cleanup in **35.6 seconds** (`work/candidate-shell-fault.log`). A preceding silent runner timeout did not establish a product defect. The runner now logs each step, bounds navigation and retry, scopes Retry to the offline panel, diagnoses visible state on failure, and explicitly closes server connections. The instrumented run observed the expected shell failure after its 30-second capability deadline, then verified Retry, retained text and cold offline failure without a product change.

The routine picker currently excludes entries without a `baniDbId` (`additionalCatalogOptions` in `store/nitnem.ts`); all selectable core and additional options have provider IDs. Unknown persisted selections normalize to supported IDs/defaults. Therefore a Shabad OS-only routine is not currently selectable and cannot reach the suggested zero-reading edge through supported UI/storage hydration. This fix does not add Shabad OS selections to Daily Nitnem; those four readings retain their existing explicit-download path. If that picker expands later, its source-aware readiness adapter must expand with it.

## UX-01 and UX-02

The manifest background and theme colors now intentionally use the existing paper theme `#e5dfd2`, matching the static HTML fallback and light theme token. Existing prepaint logic still selects saved/system light or dark (`#111923`) before rendering. A static installed splash cannot reflect every user's saved theme, so this change establishes a documented fallback, not dynamic splash parity.

The configuration test checks the manifest/HTML/token relationship and validates every declared PNG icon's actual dimensions against its manifest size. Typography, icons and navigation artwork are unchanged.

The portrait directive is unchanged. UX-02 remains an installed-host verification gap because the plan requires actual orientation enforcement and responsive testing before claiming a defect or changing that policy. Real iPhone Safari/PWA, Android installed launches, rotation, physical keyboard, OS cache eviction, installed upgrades and endurance remain unverified. English/Punjabi/Hindi recovery copy exists; no independent linguistic review is claimed.

## Preservation and rollback

There is no data migration. Reverting launch metadata is independent of offline readiness. Keep the shell check or equally accurate text-only messaging when reverting this hook; restoring the old unconditional ready claim would reintroduce OFF-01. Never clear downloaded content as a rollback step.

Root subsequently reran the complete explicit-download journey against the current candidate built with public service configuration: **108 packs / 118 versions passed**, including cold restart, all 14 supported length variants plus four Shabad OS readings, bookmark/contents/resume checks and mobile/desktop light/dark layouts. Candidate evidence is `work/candidate-offline.log` and `candidate-offline/report.json` in the implementation workspace. These new candidate results are separate from the audit's historical run. They verify downloaded-pack integrity and selected rendered-text fidelity; they do not establish original-publication or translation equivalence. Current publication/translation verification and qualified content review remain separate outstanding work.
