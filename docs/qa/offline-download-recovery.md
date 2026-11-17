# Bani download recovery

Existing installations could receive the latest online page while an older service worker still controlled the app. That worker correctly rejected the newer page's assets, but downloads had no way to activate the matching waiting update. A missing required cache entry also blocked downloads indefinitely because readiness checks did not repair it.

An explicit bani download now verifies the current worker, repairs a matching incomplete shell, or prepares and activates the matching waiting update. It waits for activation and page control before allowing the text download. Passive readiness checks do not trigger updates or repairs. Recovery is cancellable and bounded; a slow current worker gets a longer retry after waiting updates are considered.

The worker verifies the generated HTML fingerprint before installation or repair, rejects successful HTML fallbacks for missing assets, and refuses activation for mismatched or incomplete builds. Old app caches remain while older tabs need them. Cleanup preserves installing/waiting updates and resumes safely after worker restarts. Downloaded scripture packs use a separate cache and are not removed by app updates.

## Verification

- 109 focused tests passed across worker lifecycle, download storage, controls, and routine readiness.
- Production build, startup budget, font notices, story artifacts, and public artifact privacy checks passed.
- The real catalogue acceptance run downloaded 108 readings / 118 distinct versions and verified their checksums, available lengths, and existing preferences.
- After a full browser restart offline, all 14 named length variants and four Shabad OS readings matched the downloaded source line for line. Bookmark, contents, resume, and mobile/desktop light/dark checks passed.
- The two-build upgrade run kept an old tab open, reproduced the older worker rejecting the newer page, and recovered through the real Download button. It repaired an evicted reader module and HTML document, preserved the existing download byte for byte, and loaded the old tab's lazy reader offline.
- The upgrade run then stopped its HTTP server and completely restarted the temporary browser offline. Seven length variants, Shabad OS, and the pre-update Japji download remained readable with all source rows and saved defaults preserved.

Browser acceptance uses Chromium with a mobile viewport and isolated guest profiles, actual public reading requests, and no account mutations. It does not constitute a physical iPhone Safari or Home Screen installation test.

## Reproduction

Keep an earlier production `dist` directory before building the candidate. The upgrade runner serves both builds on the same temporary origin and owns its isolated browser profile:

```sh
QA_OLD_DIST=/absolute/path/to/previous-dist \
QA_NEW_DIST=dist \
QA_OUTPUT_DIR=/absolute/path/to/private-qa-output \
node scripts/qa/offline-upgrade-acceptance.mjs
```

For the complete catalogue journey, serve the candidate production build and run:

```sh
QA_BASE_URL=http://127.0.0.1:4187 \
QA_OUTPUT_DIR=/absolute/path/to/private-qa-output \
node scripts/qa/offline-bani-acceptance.mjs
```

Both runners produce a JSON report and screenshots. Keep generated browser profiles and evidence out of the public repository.
