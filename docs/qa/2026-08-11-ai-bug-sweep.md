# NaamRas AI Bug Sweep

Date: 2026-08-11

Environment:
- Local dev server: http://127.0.0.1:4173
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
- PASS: Read smart search degraded state
- PASS: Read smart search empty state
- PASS: Study Hukamnama route
- PASS: Study Hukamnama slow-load state
- PASS: Study ang route
- PASS: Study ang degraded state
- PASS: Study exact-result word popover flow
- PASS: Study word popover Mahankosh degraded state
- PASS: Library desktop route
- PASS: More desktop route
- PASS: More cloud-sync bootstrap degraded state
- PASS: Vocab desktop route
- PASS: Onboarding first-run mobile route
- PASS: Onboarding overlay mobile route
- PASS: Public Support route before onboarding
- PASS: Public Privacy route before onboarding
- PASS: Persistent mobile navigation flow

Findings:
- No blocking issues were detected in this sweep.

Final verification after remediation:
- Vitest: 88 files, 671 tests passed.
- WCAG 2.2 AA sweep: 51 route checks and 3 share-composer checks passed.
- Mobile Lighthouse on `/banis?query=death`: Accessibility 100, Best Practices 100, SEO 100, Agentic Browsing 100.
- Mobile search CLS: 0.013 after late library results were moved below stable Gurbani results.
- Production service worker: app-shell reload passed while Chrome was offline.
- Dependency audit: 0 high-severity production vulnerabilities.

Artifacts:
- Screenshots and logs: `/Users/japgrover/Documents/Projects/sikh-learning/output/qa/2026-08-11`
- Generated report: `/Users/japgrover/Documents/Projects/sikh-learning/docs/qa/2026-08-11-ai-bug-sweep.md`
