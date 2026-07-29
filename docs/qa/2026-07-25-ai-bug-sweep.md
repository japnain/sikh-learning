# NaamRas AI Bug Sweep

Date: 2026-07-25

> Validation note: the five entries labelled `FAIL` below are invalid failure-injection checks, not confirmed product defects. The sweep was rerun against a production preview, which correctly excludes the QA-only URL injection hooks those scenarios require. All normal-route scenarios passed. These five cases must be rerun in a stable QA build before they can be used as evidence.

Environment:
- Local dev server: http://127.0.0.1:4176
- Fixed in-app clock: 2026-04-11T09:00:00.000Z
- Browser: Google Chrome
- Build baseline: run before sweep
- Vitest baseline: run before sweep

Scenario Summary:
- PASS: Home desktop route
- PASS: Home quiet start without route cards
- PASS: Home Nitnem card opens with a normal click
- PASS: Read desktop route
- PASS: Read auto search includes romanized text
- FAIL: Read smart search degraded state
- FAIL: Read smart search empty state
- PASS: Study Hukamnama route
- PASS: Study Hukamnama slow-load state
- PASS: Study ang route
- FAIL: Study ang degraded state
- PASS: Study exact-result word popover flow
- FAIL: Study word popover Mahankosh degraded state
- PASS: Library desktop route
- PASS: More desktop route
- FAIL: More cloud-sync bootstrap degraded state
- PASS: Vocab desktop route
- PASS: Onboarding first-run mobile route
- PASS: Onboarding overlay mobile route
- PASS: Public Support route before onboarding
- PASS: Public Privacy route before onboarding
- PASS: Persistent mobile navigation flow

Findings:

1. Read smart search degraded state
   - Route: `/banis?qaFail=read-search`
   - Expected: Expected Read smart search to surface a degraded state instead of pretending the result set is empty.
   - Actual: Expected the Read smart-search degraded state ([data-ai-surface="read-smart-search"][data-ai-state="degraded"][data-ai-error="read-search"]) to become visible.
   - Screenshot: [read-search-failure.png](../../output/qa/2026-07-25/read-search-failure.png)
   - Log: [read-search-failure.json](../../output/qa/2026-07-25/read-search-failure.json)

2. Read smart search empty state
   - Route: `/banis?qaEmpty=read-search`
   - Expected: Expected Read smart search to render a deterministic empty state when the search backend returns no results.
   - Actual: Expected the Read smart-search empty state ([data-ai-surface="read-smart-search"][data-ai-state="empty"]) to become visible.
   - Screenshot: [read-search-empty.png](../../output/qa/2026-07-25/read-search-empty.png)
   - Log: [read-search-empty.json](../../output/qa/2026-07-25/read-search-empty.json)

3. Study ang degraded state
   - Route: `/study?source=G&ang=183&qaFail=study-ang`
   - Expected: Expected the ang reader to surface a degraded card instead of a dead-end page error.
   - Actual: Expected the ang degraded state ([data-ai-surface="study-reader"][data-ai-state="degraded"]) to become visible.
   - Screenshot: [study-ang-failure.png](../../output/qa/2026-07-25/study-ang-failure.png)
   - Log: [study-ang-failure.json](../../output/qa/2026-07-25/study-ang-failure.json)

4. Study word popover Mahankosh degraded state
   - Route: `/study?shabadId=544&verseId=7718&qaFail=mahankosh`
   - Expected: Expected Mahankosh lookup failures to stay inside the word popover and render a degraded sub-surface.
   - Actual: Expected the Mahankosh degraded state ([data-ai-surface="mahankosh-popover"][data-ai-state="degraded"]) to become visible.
   - Screenshot: [study-mahankosh-failure.png](../../output/qa/2026-07-25/study-mahankosh-failure.png)
   - Log: [study-mahankosh-failure.json](../../output/qa/2026-07-25/study-mahankosh-failure.json)

5. More cloud-sync bootstrap degraded state
   - Route: `/more?qaFail=supabase-bootstrap`
   - Expected: Expected Supabase bootstrap failures to degrade the cloud-sync panel instead of crashing the route.
   - Actual: Expected the cloud-sync degraded state ([data-ai-surface="cloud-sync-panel"][data-ai-state="degraded"][data-ai-error="supabase-bootstrap"]) to become visible.
   - Screenshot: [more-bootstrap-failure.png](../../output/qa/2026-07-25/more-bootstrap-failure.png)
   - Log: [more-bootstrap-failure.json](../../output/qa/2026-07-25/more-bootstrap-failure.json)

Artifacts:
- Screenshots and logs: `/Users/japgrover/Documents/Projects/sikh-learning/output/qa/2026-07-25`
- Generated report: `/Users/japgrover/Documents/Projects/sikh-learning/docs/qa/2026-07-25-ai-bug-sweep.md`
