# Bani reader and Home Nitnem refinement verification

23 October 2026 · Software implementation and browser verification complete

Goal: [implementation checklist](../plans/2026-10-23-bani-reader-home-nitnem-refinement-goal.md). Specification: [refinement plan](../plans/2026-10-23-bani-reader-home-nitnem-refinement.md).

## Delivered

- Home exposes every chosen bani in a native horizontal rail with adjacent-card affordance, explicit pagination and keyboard access. Personal order and completed cards remain intact. Browsing is separate from intentional practice and the first-screen Continue shortcut.
- Manual completion retains the card, keyboard focus and immediate Undo. Empty, single-bani, completed-day, tracking-disabled, custom-order and active-reread states have regression coverage. Exact-route cache requests reject stale results.
- The deep reader dock uses compact identity/length and action rows, with conditional word/return context. Wide desktop retains one primary header with direct Contents. Read/Study remains available at entry, Appearance and More.
- Contents reveals the current section within its own scroller. Find retains query/results/scroll during the current reading and resets when content identity changes. Display emphasis respects whole graphemes and preserves source-aware line destinations.
- Study support text has independent Standard/Large/Extra large choices and enabled-layer preview. This comfort preference is saved on the device; no cloud snapshot or backend changes were made.
- Tracking-disabled readers can continue through their selected order without completion events. The final selected bani stops rather than wrapping. Tracked completion, provenance, targeted Undo and persistence recovery remain intact.

The existing touch header, document scrolling, semantic anchors, native selection and canonical text order were preserved. Unrelated Stories/native work was not edited for this refinement. No commit, push, public deployment or native build was performed.

## Source and automated checks

Final production entry: `index-BgezEB-j.js`. Service-worker version: `fa71eafa7ed1`. Preview: `http://127.0.0.1:4192/`.

| Full workspace batch | Files | Passing tests |
| --- | ---: | ---: |
| Core stores/API/utilities/content | 45 | 430 |
| Data | 7 | 44 |
| Pages/readers | 16 | 342 |
| Components/hooks/app | 40 | 386 |
| Library integrity | 2 | 14 |
| Other regressions | 20 | 315 |
| Total | 130 | 1,531 |

A final affected rerun passed **284 tests across 12 files** after the last rail and desktop-navigation refinements. This overlaps the full run and is not an additional 284 unique tests. It includes Home, reader modes/anchors/practice, language preferences, dock interactions, Find and ending/navigation identity.

Both TypeScript configurations, full ESLint, whitespace checks, the production Vite build/public copy, startup audit and all 19 CSS audit files passed. The startup audit confirms the backend bundle remains lazy.

Commands use Vitest/Vite `--configLoader runner`, Vitest `--cache false --no-file-parallelism`, and TypeScript `--incremental false`: the checkout's linked dependency directory cannot accept the default temporary build/config writes. No dependency or project script change was needed.

## Actual browser checks

Tests used separate Chrome contexts. The user's existing app storage and tabs were not changed. Production preview used live BaniDB responses with mock mode disabled. The development-server proxy could not resolve the upstream hostname in the execution environment; production browser direct requests returned HTTP 200, including the full Rehras payload. Product fetch behavior was not changed to work around that development-only constraint.

| Surface | Viewport and settings | Result |
| --- | --- | --- |
| Home rail | 390 × 844, light, normal interface text | No layout or axe violations |
| Home rail | 320 × 568, dark, 200% interface text | No layout or axe violations |
| Reader and Contents | 320 × 568, English, dark, 200% | No layout or axe violations |
| Reader, Contents, Appearance | 320 × 568, Punjabi, light, 200%, 34px Gurbani | No layout or axe violations |
| Reader, Find, Appearance | 320 × 568, Hindi/Devanagari, dark, 200%, 34px Gurbani | No layout or axe violations; Devanagari matches emphasized |
| Length chooser | 320 × 568, Hindi, dark, 200% | No layout or axe violations |
| Appearance | 844 × 390 landscape, Hindi, dark, 200% | Usable scrolling body; no layout or axe violations |
| Compact dock | 430 × 932, light | 122px default dock; no layout or axe violations |
| Desktop reader | 1440 × 1000, light, deep reading | Fixed header includes Contents; redundant dock absent; no layout or axe violations |
| Ending without tracking | 320 × 568, normal text | Ordered next action, final-item stop; no layout or axe violations |

The layout probe excludes intentionally offscreen rail cards; navigation/focus reveals their content separately. It now checks the Contents scrolling body as well as the existing choosers/settings. Axe used WCAG 2 A/AA, 2.1 A/AA and 2.2 AA tags. Thirty reachable Appearance controls were individually focused with both disclosures open at 320px/200% Hindi; none were clipped. Screenshot inspection supplements these probes.

Observed journey results:

- Traversing all seven rail cards retained the exact personal order without writes to practice, routine, usual-length or reading-place storage. Manual completion/Undo retained the browsed card and exact button focus.
- Rehras Short rendered 306 rows. Find returned 20 matches for `naam`; a result jump reopened with the same query/results. Return restored the original reading location and cleared exploratory context.
- Extra large support text appeared in both preview and body at 19.968px with ordinary 16px interface sizing. The Short display text SHA remained `3a73db54d0584b7df269456a85b423e0f2d1d2effa08ec8209cff193d0039606`. DOM scripture selection remained available.
- An explicit Short → Long choice announced the same-verse destination, retained verse/source in the reading route and left the usual preference unchanged. The settled Long reader rendered 439 rows. Transient retained Short text during application was not treated as settled Long output.
- Tracking off, a custom Rehras → Kirtan Sohila routine navigated in that order without any change to the actual `naamras-nitnem-history` value. The final bani had no next action. Home return revealed Kirtan Sohila. The isolated QA routine was subsequently restored to seven banis with tracking enabled.
- With network emulation Offline, normal service-worker reload retained the exact Long route identity `G` / verse `2628`, all 439 rows and display SHA `81bb0482501f331e6dec2153fa0124086b989536c5bb87bc61aead236625ad38`. The worker controlled the page before and after reload; the reader remained ready. Network emulation was restored afterward.

## Evidence and limits

Local evidence is under `artifacts/bani-refinement-20261023/`: batch test logs, final affected log, build log, layout/axe JSON reports, focus results, length transition and offline before/after records, and inspected screenshots. UI references and their adaptation notes are in `.lazyweb/design-improve/bani-reader-nitnem-2026-10-23/report.html`. The inspected Headspace frame illustrates card hierarchy, not horizontal scrolling; Creed illustrates current-location emphasis. References are not substituted for app verification.

The browser evidence is new for this build. Physical iPhone comfort, VoiceOver, native selection handles and actual installed-app OS launch/background lifecycle were not exercised. Browser viewport/landscape emulation and DOM selection do not establish those behaviors. These are outside this software/browser delivery; no physical-device acceptance or universal aesthetic perfection is claimed.

## Master publish readiness

A fresh isolated checkout of current master `be2162834f5e60c587e26dc49559ed742b8ce954` received exactly the 32 reader/Nitnem refinement files. Independent review verified a 150-file production dependency closure and 166-file source/test/QA closure, with no missing imports, omitted changed dependencies or Stories/native paths. The original mixed workspace was preserved.

The exact publish candidate passed **1,453 tests across 122 files**, both TypeScript configurations, full ESLint, production build, startup/public-copy/CSS checks and whitespace checks. Its entry is `index-ypdVnRtp.js`; service worker `664430becec4`. The earlier 1,531-test workspace run includes excluded Stories work. Browser results above cover the same reader/Home source in the full workspace; no additional candidate-browser or device checks are claimed.

The 32-file candidate is staged in an isolated checkout for a future scoped commit/push. No commit, push or deployment has been performed. Logs are under `artifacts/bani-refinement-20261023/publish-ready/`; the local preparation receipt is `/tmp/naamras-refinement-ready.json`.
