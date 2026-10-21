# Session-only pre-push readiness

October 21, 2026. The Home, artwork, Daily Nitnem, customization, completion, Gurbani reader and artwork-inspired navigation changes are prepared for a source-only master push. **Nothing has been committed or pushed.** The root checkout still preserves parallel Stories and historical native implementation work; publish the isolated candidate, not a blanket staging of the root checkout.

## Scope

The candidate is `/Users/japgrover/.codex/naamras-candidates/20261021-prepush-session-only`, based on `c9538be5a435230b350548b0873d54d3ddb80bd1`. A fresh origin fetch confirmed master at that same commit. Home/reader changes are retained; Stories routes, imports, saved shelves, tab/search integrations, content, styles, tests and verifier script are excluded. Native implementation changes, local design research, generated archives, duplicate configs/worker and unused PNG originals are excluded. Existing artwork dependencies remain in Git. Root Stories work remains intact.

The accompanying [release manifest](session-release-manifest.json) lists the exact selected source and documentation hashes. Only App, NavBar and Library intentionally differ from root because their Stories integration is omitted. The Library contrast correction remains included.

## Verification

| Check | Result |
| --- | --- |
| Full isolated regression | **1,266/1,266 tests in 110 files passed** after the reader action/focus correction. The final text-color-only correction was followed by **123/123 reader/dock tests**; overlapping counts are not additive. |
| Production | TypeScript, production build, startup bundle check and full lint passed. **283 generated web files**; build hashes below bind the final color correction. |
| Styles | All **14 stylesheet files** passed the repository selector audit. Stories' dynamic-selector findings do not enter this candidate. |
| Accessibility | **51 WCAG 2.2 AA route checks and 4 sharing journeys passed**, with zero detected violations. Journeys scan open Tools and Share, exercise reading details, image readiness, reachable actions, Escape and exact opener focus in light, dark, 200% text and deep-reader dock scenes. |
| Deployment theme | **6/6 real-browser bootstrap scenes passed** with the deployed CSP applied and external JavaScript blocked: explicit light/dark, system light/dark and legacy light/dark preferences. Built HTML also matches the CSP hash. |
| Clean PWA shell | **3/3 fresh-worker checks passed** on this exact build: install/control, offline Home document reload with four destinations, and offline deep navigation to settings. |
| Repository | Whitespace diff passed; no credential-pattern findings in selected source; catalog generation leaves its tracked data unchanged. No native build or signing gate is part of this PWA delivery. |
| Dependencies | Production audit: **0 reported vulnerabilities**. The unchanged development toolchain has **23 reported package entries (15 high)**; this is existing maintenance debt, not a security-clean toolchain claim. Dependency versions were not changed. |

## Corrections found during this audit

The deployment CSP hash was updated to permit the revised theme bootstrap. Light-mode supporting copy in Library and Support now meets contrast requirements. Reader Tools no longer dismisses in capture phase before Share/Favorite/Bookmark can run. Sharing remembers the actual topbar or floating-dock opener and returns focus there. Tool labels use the reader's readable theme colors. The accessibility sweep follows the new tools-menu flow and checks the deep-reader return path, instead of targeting the removed always-visible Share action.

## Build binding and evidence

Final index SHA-256: `040a4968d5d3ac6b5ccd62633dcc2009f1fc02ce17456722a1287986b65ef386`. Final worker SHA-256: `3a24fdeddf3dcf211daeae770955d671c41fd8ea6c7f196cafa71898958b463b`.

Detailed logs and immutable prior Home/artwork/reader evidence remain local under `artifacts/`, intentionally excluded from Git. Current audit logs are in `artifacts/prepush-20261021/`; prior v28 navigation and exact-verse/offline journey evidence retains its own source provenance. This audit does not relabel old screenshots or journeys as the session-only build. Browser checks do not imply physical Safari/VoiceOver evidence or owner aesthetic approval. Hosted CI and deployment have not run for this uncommitted candidate.
