# Comprehensive audit remediation

User authorization: October 24, 2026 — “okay fix all of it.”

Implement and verify the findings in `docs/qa/2026-10-24-comprehensive-product-audit.md`, preserving the current PWA, visual identity, canonical scripture, and all pre-existing work. Recitation remains outside scope. A fresh independent human historical/Gurmat review cannot be represented as completed by code or AI review.

## Workstreams

| Workstream | Findings | Implementation owner | Verification |
| --- | --- | --- | --- |
| Personal backup and safe sync | F01–02, C01–03 | State agent | Complete round-trip backup, malformed input, storage rollback, overlapping requests and sign-out |
| Durable books and exact search | F04, F06, F27 | Library agent | Offline restart, partial download, exact passage match, pagination, Retry/Back/reconnect |
| Search and secondary locales | F05, F07–09, F18 | Search agent | Independent result groups, deadline/abort, Rehat next/previous match, Devanagari, Punjabi/Hindi |
| Vocabulary | F10–12 | Vocabulary agent | Attributed answers, immediate Again queue, original context and additional senses |
| Reader/settings refinements | F13–17, Nitnem focus candidate | Root | Heading regression, accessible expanded controls, shared size limits, mode changes, focus handoff |
| Stories and editorial quality | F03, F19–22, Stories part of F18 | Root + editorial agent | Immediate cached reading, bounded refresh, source-verified corrections, honest review status |
| Privacy, support, monitoring | F23–24 | Security agent | Provider disclosure, safe user-reviewed report, bounded diagnostic data |
| Quality and performance | F25–26 | Security/vocabulary agents + root | Deterministic acceptance/CI, byte budgets, production build, regression suite |

## Integration requirements

- New backup UI integrates into More; downloaded content is separate from personal state.
- No authentication tokens, device secrets, or unrestricted storage dumps in backups or diagnostic reports.
- All cold/weak-network states retain recovery and navigation; successful local results are independent of remote requests.
- Content notes distinguish original retelling, historical evidence, editorial correction, and independent human review.
- Existing cloud contract compatibility is retained unless an explicit schema migration is implemented and validated; source changes do not imply deployment.
- Final verification records actual pass counts and browser/environment limits. Original audit remains a dated baseline; completion evidence goes into a separate remediation report.

## Implementation handoff

The implementation and remaining editorial/configuration boundaries are recorded in [the remediation results](../qa/2026-10-24-audit-remediation-results.md). The original audit is retained as the pre-fix baseline. No production deployment or human editorial approval is implied.
