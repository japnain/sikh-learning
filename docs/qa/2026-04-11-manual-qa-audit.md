# NaamRas QA Audit

Date: 2026-04-11

Environment:
- Local dev server at `http://127.0.0.1:4173`
- Manual browser QA in Chrome DevTools
- Mobile sanity pass with emulated `393x852` iPhone viewport

Baseline:
- `npm run build`: passed
- `npx vitest run`: passed, `206/206`
- `npx vitest run` emits repeated Node warnings about `--localstorage-file` using an invalid path
- No blocking console errors seen during route exploration

What was exercised:
- Home
- Read (`/banis`)
- Study (`/study` via Hukamnama, exact search result, resume flow, ang view)
- Learn (`Today`, `Topics`, `Shabads`)
- Saved (`/library`)
- More (`/more`)
- Vocab (`/vocab`)

## Confirmed Functional Bugs

### High

1. Study word taps route back to Home instead of opening word meaning
   - Repro:
     1. Open Read.
     2. Search and open an exact result, for example `/study?shabadId=544&verseId=7718`.
     3. Tap any Gurbani word button in the verse, for example `जन`.
   - Expected:
     - Open word meaning, verse actions, or the vocab/save flow.
   - Actual:
     - App navigates to `/`.
   - Impact:
     - Breaks the core word-study interaction and prevents vocabulary capture.
   - Severity:
     - High

2. Learn search corrupts plain English input
   - Repro:
     1. Open Learn.
     2. Focus `Search the Learn archive`.
     3. Type `anxiety` and submit.
   - Expected:
     - Query stays `anxiety` and resolves directly to the Anxiety topic.
   - Actual:
     - URL becomes `/learn?tab=topics&query=axey&detail=topic`.
     - Both search fields display `axey`.
   - Impact:
     - Makes the primary archive entry point feel untrustworthy and breaks predictable search behavior.
   - Severity:
     - High

### Medium

3. Share action on Study has no observable desktop fallback or confirmation
   - Repro:
     1. Open any Study page.
     2. Click `Share`.
   - Expected:
     - Native share, copied link, toast, or explicit fallback.
   - Actual:
     - No visible change and no confirmation.
   - Impact:
     - Users cannot tell whether share failed or succeeded.
   - Severity:
     - Medium

4. Favorite and bookmark actions save silently
   - Repro:
     1. Open any Study page.
     2. Click `Favorite`.
     3. Click `Bookmark`, optionally save with an empty note.
     4. Open Saved.
   - Expected:
     - Immediate visual state change or toast confirming save.
   - Actual:
     - Saved state does persist, but the interaction gives almost no in-context confirmation.
   - Impact:
     - The action works, but confidence is low and the user has to leave the page to verify it.
   - Severity:
     - Medium

## UX / UI Issues

### Medium

1. Hukamnama route does not feel like a distinct Hukamnama experience
   - `Open Today’s Hukamnama` lands on `/study?hukamnamaDate=2026-04-11`, but the page reads like a long generic Study surface rather than a compact Hukamnama-specific reading flow.
   - The first interaction promise is "today's Hukamnama", while the page experience quickly becomes a long scripture scroll.

2. Study pages are still heavy, especially on ang-based routes
   - `/study?source=G&ang=183` becomes a very long uninterrupted page with repeated verse-action clusters.
   - The page technically works, but the scan depth is exhausting and the section boundaries are weak.

3. Read search defaults are easy to misread as broken
   - The default mode is `First Letters`, but the page copy also promises English meaning and transliteration search.
   - A common query like `jap` produced obscure line-level results rather than an obvious bani hit such as `Japji Sahib`.
   - `Refine` does expose modes, so this is more of a discovery problem than a hard bug.

4. Mobile Learn search placeholder is clipped
   - On the mobile viewport, the search placeholder truncates awkwardly inside the hero input.
   - The screen still works, but the first-search affordance feels cramped.

### Low

5. Saved shelf uses very similar cards for different concepts
   - The same SGGS entry can appear as both a favorite and a bookmark with nearly identical presentation.
   - The distinction is technically there, but the visual difference is weak.

6. Vocab empty state feels disconnected from the rest of the product language
   - `/vocab` is structurally sparse and feels like a utility screen rather than part of the premium reading system.
   - This is amplified by the word-tap bug because the page stays empty even after a reasonable attempt to save vocabulary.

## Localization / Content Consistency Issues

### Medium

1. Punjabi mode mixes new and old product language
   - In `/more`, Punjabi chrome translates correctly, but several sections remain in English, such as `STUDY SOUNDSCAPES`, preset labels, and soundscape helper copy.
   - The Punjabi About copy also reverts to `ਨਿਤਨੇਮ` instead of `NaamRas`, which conflicts with the current brand direction.

2. Vocab screen mixes English and Punjabi labels
   - `/vocab` in the tested state showed `My Vocabulary` with Punjabi `ਸ਼ਬਦ` and Punjabi bottom-nav labels inherited from the active app language.
   - The result feels inconsistent rather than intentionally bilingual.

## Accessibility / SEO Findings

Lighthouse on mobile:
- Home: Accessibility `93`, Best Practices `100`, SEO `82`
- Learn: Accessibility `93`, Best Practices `100`, SEO `82`

Key findings:
- Missing main landmark on Home and Learn
- Low-contrast supporting text on Home and Learn
- Non-descriptive link text flagged for `MORE`
- Visible label / accessible name mismatch on the Home progress button
  - Visible content reads `TODAY IN NAAMRAS ...`
  - Accessible name is `Nitnem progress`
- Read search input triggered an accessibility issue in the console:
  - form field missing `id` or `name`
- `robots.txt` is invalid from Lighthouse's perspective

## Overall Assessment

The app is stable enough to navigate end to end:
- Primary routes load
- Saved state persists
- Build and test checks pass

The biggest problems are concentrated in the most important daily interactions:
- word study is broken
- Learn search mutates user input
- several core actions succeed too quietly to feel trustworthy

Recommended order for the next fix pass:
1. Fix Study word taps so they open meaning/actions instead of routing Home.
2. Fix Learn input handling so English queries remain unchanged.
3. Add immediate confirmation states for share, favorite, and bookmark.
4. Tighten the Hukamnama and ang-reader experience so long study screens feel intentionally segmented.
5. Clean up mixed-language and stale-brand copy in non-English modes.
