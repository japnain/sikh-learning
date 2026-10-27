# Reader and visual polish — 27 October 2026

## Implemented direction

The three web readers now share a persistent header component and control grammar. Tapping text or scrolling does not hide it. The floating bottom dock is removed. Scripture Read/Study selection and Contents remain at the top; word lookup opens a dialog with focus returned to its trigger. Stories and books retain their content-specific text layout and inline end-of-reading actions.

The interface uses the existing Plus Jakarta Sans family with quiet medium-weight headings, neutral actions, solid page backgrounds and fine separators. A direct inspection of Perplexity's public interface confirmed its restrained sans typography; its proprietary `pplxSans` asset was not copied. Gurbani keeps the dedicated script font. Large interface text receives a compact header layout with an accessible Contents icon and no repeated source subtitle.

The reading-position session warning and retry-saving button are removed. Position storage still runs; page suspension retries the current position silently. Explicit user save/completion failures remain truthful and do not create false success state.

## Audit implementation

| Area | Changes |
| --- | --- |
| Home excerpt | Preview-only filtering recognizes the complete SGGS named-Bhagat heading form; retains canonical reader lines, meaningful short verses and ambiguous text. |
| Readers | Universal heading/action slots, persistent controls, no tap-to-hide or bottom dock, direct word dialog, clearer Ang Contents and pause guidance. |
| Nitnem | Consistent saved-study/status spacing, readable metadata, tighter selection list, current-row reveal, short-height sheet scrolling, mandatory native snap and correct per-bani offline readiness updates. |
| Read | Less redundant framing, grouped search refinements, full source names, quieter result metadata, consistent selected actions and an artwork frame that grows with text. |
| Stories/books | Stronger symbolic illustrations without export mattes, readable supporting copy, concise edition introduction and detailed source processing in disclosure. |
| Navigation | Whole labels and fixed-size icons; enlarged text can reflow into two columns. |
| Supporting surfaces | Shared directory palettes, balanced Saved metrics, concise settings, consistent onboarding palette and route-shaped skeletons. |

Artwork, introductions and filters retain the user's preferred order above reading actions.

## Verification

- Home preview/display/Home integration: 86 tests passed.
- Reader changes: 183 tests across six suites passed.
- Nitnem feature audit: 200 distinct tests across thirteen suites passed; see the dedicated carousel record.
- Read/discovery: 69 tests passed.
- Supporting pages/navigation: 95 tests passed.
- These group counts overlap; they are not a combined unique test total.
- Scoped ESLint and non-incremental app/config TypeScript checks passed.
- Production Vite build, startup bundle budget and published-story build checks passed.

The repository's dependency directory is a protected external symlink. Validation used `--configLoader runner` and non-incremental TypeScript rather than writing config/build caches into that directory. No app configuration was changed solely for this environment constraint.

The development server retained stale imported styles during one pass. Final browser acceptance uses a freshly built production preview, not that stale development module graph.

## Browser evidence

**18/18 production browser scenarios passed**, with zero reported browser exceptions. Five fixture contract tests passed. Header action targets remain at least 44px; no tested page has horizontal overflow or a bottom dock. The 320px/200% scripture header measures approximately 170px high after the compact-layout refinement.

The deep-scripture case scrolls 1,496px, then verifies the same visible verse through Read→Study→Read, font size 22→30 and Contents open/close. The normal-size Home integration suite was rerun after the carousel effects landed; its animation-frame mocks are now cleaned up before timer restoration. All 86 Home/display/preview tests pass.

Production acceptance results and screenshots are written to `tmp/reader-nitnem-polish-production/`. The reproducible script is `scripts/qa/reader-nitnem-polish.mjs`. The matrix covers 320px light, 390px dark, 320px dark at 200% root text and 1440px light across scripture, story, book and Nitnem. A separate interaction scenario covers an exact length choice, return to the browsed card, routine reorder and tracking off.

The browser suite uses deterministic provider fixtures. Its optional distinct-length fixture is test-only and does not change canonical scripture or shipped content. It verifies front-end state and routing; live provider availability and native iOS safe-area, Dynamic Type, VoiceOver and physical swipe feel remain device/provider checks.

No commit or deployment was performed. Existing unrelated workspace changes were preserved.
