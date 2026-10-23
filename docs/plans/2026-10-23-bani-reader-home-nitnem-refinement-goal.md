# Goal: implement the Bani reader and Home Nitnem refinement

Created 23 October 2026 · Status: Complete · Software implementation and browser verification

Implement the complete [Bani reader and Home Nitnem refinement plan](2026-10-23-bani-reader-home-nitnem-refinement.md). Deliver a swipeable, accessible Nitnem section and a calmer reader within the existing NaamRas app, preserving exact reading continuity and truthful practice history.

The user has authorized implementation and the use of DevTools and Lazyweb as needed. Carry out routine implementation choices, reversible edits and necessary verification without asking for repeated confirmation. The latest authorization supersedes the earlier tool exclusions. Record actual evidence before marking outcomes complete.

## Required outcomes

- [x] **All chosen banis accessible on Home.** Replace the spotlight/two-upcoming composition with a native horizontal card rail in personal order. Provide direct reading actions, Previous/Next, position feedback, a mobile next-card peek where space allows, and the full Your Nitnem alternative. Support touch, trackpad, keyboard and reduced motion without interfering with vertical scrolling.
- [x] **Browsing independent of practice.** Keep browsed-card state separate from active paath. Swiping/focus/pagination must not alter practice, saved verses, usual lengths, completion or the first-screen Continue shortcut. Only the exact intentional practice receives Continue, including an unfinished reread after daily completion. Preserve the relevant card on reader return and handle reorder/removal deterministically.
- [x] **Stable completion and immediate Undo.** Keep a manually completed card visible with Read again and Undo. Retain completed cards when the full routine is done. Show recorded version and current reading separately, including completed Short with active Long. Handle empty, single-bani, tracking-disabled and persistence-failure states honestly.
- [x] **Compact, consistent reader controls.** Reduce header/dock repetition, retain direct Back/Contents/Appearance/More and length access, and expand word/return context only when needed. Keep Read/Study discoverable and avoid redundant desktop toolbars. Preserve focus, native text selection, document scrolling and active-passage clearance.
- [x] **Better Contents and repeated Find.** Reveal the current section on ordinary Contents opening. Retain search query, results and result position within the current exact reading; clear them on reading-identity change. Emphasize safe display matches, preserve source identity and keep Return to previous place / Continue here dependable.
- [x] **Comfortable Read and Study typography.** Refine spacing, width and layer hierarchy in both themes and supported scripts. Add independent Study support-text sizing with enabled-layer preview. Preserve canonical text, matras, punctuation, Larivaar, meaning-source disclosures, semantic anchors and screen-awake behavior.
- [x] **Next-bani navigation with tracking disabled.** Offer the next selected bani in personal order without recording completion. With tracking enabled, preserve next-incomplete selection, explicit completion, targeted Undo and save-before-navigation. Stop gracefully at the end of the routine.
- [x] **Complete integration and quality pass.** Verify Home → any bani → Contents/Find/appearance → completion or next → Home/return. Resolve defects introduced by this work and record actual checks and remaining limitations.

## Execution order

1. Establish the browsing/practice contract and integrated completion/Undo coverage.
2. Implement the Home rail, card hierarchy, exact-cache context and return behavior.
3. Refine reader header/dock and conditional context.
4. Improve Contents/Find and Study typography/settings preview.
5. Finish tracking-independent next-bani navigation and integrated Home return.
6. Run the quality gates, fix regressions and update this checklist with evidence.

Home and reader component work may proceed independently when file ownership is clear. Changes to shared reader state and `Study.tsx` must be coordinated. Reuse existing stores and exact-route utilities; avoid broad rewrites.

## Preserve and scope

- One unified app, the artwork-led Home, shared palette/type system, personal routine order and Customize Save/Cancel.
- Exact source/variant/length/verse resume, safe length switching, usual preferences, intentional practice across midnight/reload, history provenance, shared links and offline recovery.
- Existing source fallback disclosures, selection, focus restoration and document/semantic-anchor architecture.
- All unrelated local Stories, native iOS and other concurrent changes; the previous completed reader/Nitnem goal remains a historical record.

This goal covers application implementation and verification. It does not add backend/schema work, autoplay, automatic scrolling, new audio or memorization modes, public deployment or a Git push.

## Completion gates

- [x] Every required outcome is implemented; checklist status matches the source and evidence.
- [x] Regression coverage proves browsing has no practice side effects, completion retains immediate Undo, return preserves exact reading context, and tracking-disabled next navigation creates no completion events.
- [x] Existing continuity, length-switching, provenance, midnight, offline, persistence-failure, selection and focus tests remain passing.
- [x] Exact-route cache/snippet requests cancel or ignore stale responses; another card's excerpt or offline availability cannot appear. Completion/Undo preserves keyboard focus and rail position.
- [x] New search retention, current-section reveal and support-text sizing preserve exact anchors and canonical content.
- [x] Focused behavioral tests and the appropriate regression suite pass. TypeScript, lint, production build and startup/CSS audits pass for the resulting changes; unrelated failures are investigated and identified explicitly.
- [x] Layout/accessibility checks cover narrow phones, enlarged interface text, desktop/landscape, English/Punjabi/Hindi, both themes and reduced motion. The intentional rail is the only horizontal scrolling surface; titles, matras, focus and actions remain reachable.
- [x] Final handoff identifies implemented behavior, tests actually run and any rendered/device checks not performed. Prior QA records are not presented as validation of this iteration. Do not claim visual or physical-device acceptance from source/tests alone.

All software/browser outcomes and completion gates are satisfied. Evidence and physical-device limits: [23 October QA record](../qa/bani-reader-home-nitnem-refinement-20261023.md). Physical iPhone/VoiceOver and installed OS lifecycle are not included in this completion claim.

## Progress record

- 23 October 2026: Goal established from the approved refinement plan. No application code changed and no new implementation checks run during goal setup.
- 23 October 2026: Implementation started with explicit authorization for DevTools/Lazyweb as useful; Home, reader and completion workstreams assigned in parallel.

- 23 October 2026: Implementation complete. Full workspace regression: 1,531 tests across 130 files; final affected rerun: 284 tests across 12 files. TypeScript, lint, build, startup/CSS audits and new production-browser layout/axe/continuity/offline checks pass. Final entry `index-BgezEB-j.js`, worker `fa71eafa7ed1`. No push or deployment.
