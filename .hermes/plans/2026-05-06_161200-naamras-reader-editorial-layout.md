# Plan: NaamRas reader editorial layout + bani-specific copy

## Goal

Make the React + Vite NaamRas `/study` reading mode feel editorial, respectful, and structurally calm instead of card-heavy and generic.

Specific user requirements:

- In today’s Hukamnama mode, remove the duplicated Hukamnama presentation.
- The red/header card should explicitly say: `Daily Hukamnama Sri Harmandir Sahib, Amritsar` and show the Hukamnama date clearly.
- Reader controls should have a fixed, predictable hierarchy and layout instead of one dense block of ungrouped pills.
- For bani routes opened from the `/banis` directory, replace the generic `Comfortable reading first...` copy with researched, historically true, bani-specific editorial copy.
- No generic fallback copy for bani-directory reader intros. Missing copy should be caught by tests or a validation script.

## Context inspected

Screenshots reviewed:

- `/Users/japgrover/Downloads/IMG_7932.jpg`
- `/Users/japgrover/Downloads/IMG_7933.PNG`
- `/Users/japgrover/Downloads/IMG_7934.jpg`

Repo files inspected:

- `/Users/japgrover/Documents/Projects/sikh-learning/src/pages/Study.tsx`
- `/Users/japgrover/Documents/Projects/sikh-learning/src/pages/Study.test.tsx`
- `/Users/japgrover/Documents/Projects/sikh-learning/src/data/banis.ts`
- `/Users/japgrover/Documents/Projects/sikh-learning/src/store/nitnem.ts`
- `/Users/japgrover/Documents/Projects/sikh-learning/src/utils/uiCopy.ts`
- `/Users/japgrover/Documents/Projects/sikh-learning/src/components/NavBar.tsx`
- `/Users/japgrover/Documents/Projects/sikh-learning/src/index.css`
- `/Users/japgrover/Documents/Projects/sikh-learning/src/hooks/useHukamnama.ts`
- `/Users/japgrover/Documents/Projects/sikh-learning/src/api/banidb.ts`

Important current implementation points:

- `Study.tsx` currently builds `readerIntroBody` from generic copy for normal bani routes and from `studyExperienceCopy.hukamnamaBody` for Hukamnama mode.
- `Study.tsx` renders one header card at lines around `1120-1141`.
- It then renders `SoundscapeControls` before reader controls.
- It renders the dense reader controls block around `1231-1465`.
- It renders a second Hukamnama hero/action card around `1494-1515`.
- This is why the screenshots show two Hukamnama cards before the actual text.
- `NavBar.tsx` already measures `.app-nav-stack` and writes `--nav-stack-height`, but screenshots still show lower content/control overlap, so the study reader needs its own safe bottom spacing QA and possibly a route-scoped bottom reserve.
- `src/data/banis.ts` currently contains 105 `exactBani(...)` entries plus browse-only entries for Bhai Gurdas Ji Vaaran and Amrit Keertan. The plan should cover every bani-directory reader entry, not just Nitnem.

## Screenshot diagnosis

### IMG_7932: Today’s Hukamnama screen

Current order is effectively:

1. Top app toolbar.
2. Header card: `TODAY'S HUKAMNAMA / Hukamnama / SGGS · ANG...`.
3. Study Soundscapes card.
4. Reader Controls card.
5. Second `TODAY'S HUKAMNAMA` card with `Hukamnama · date` and `Go to source shabad`.
6. Actual scripture text.

Problems:

- Two separate Hukamnama cards repeat the same concept and body copy.
- The actual Hukamnama text begins too far down.
- The lower Hukamnama card has the useful CTA, while the top card has the stronger heading; the hierarchy is split.
- Soundscapes interrupt the reading flow.
- Bottom nav/content spacing appears unsafe.

### IMG_7933: Reader controls expanded

Problems:

- Controls are too tall and overpower the reading view.
- Most groups are unlabeled.
- Toggle states like `Transliteration Off` and `Larivaar Off` look like inactive choices rather than the current state.
- `Steek` appears in multiple areas without clear group context.
- The collapsed summary wraps awkwardly: `Gurmukhi · English · STTM 2 · Transliteration Off`.
- The lower content is still partially under the bottom nav.

### IMG_7934: Japji Sahib route

Current intro copy:

> Comfortable reading first. Controls stay close, source layers stay tucked away, and the text stays primary.

Problems:

- It describes the app UI, not Japji Sahib.
- It reads like generic product copy.
- It appears under `Japji Sahib / SGGS · ANG 1`, where a bani-specific historical/editorial introduction should be.
- Actual bani text is below multiple cards, so the reader feels like a dashboard instead of a reading experience.

## Proposed reader hierarchy

### For today’s Hukamnama

Use one editorial Hukamnama header card only.

Recommended order:

1. Safe top toolbar:
   - Back
   - Share
   - Favorite/bookmark actions
2. Single Hukamnama editorial card:
   - Eyebrow: `Daily Hukamnama`
   - Title: `Daily Hukamnama Sri Harmandir Sahib, Amritsar`
   - Date: formatted from `hukamnamaResult.data.date`, e.g. `May 6, 2026`
   - Metadata row: `Sri Guru Granth Sahib Ji · Ang 804 · Raag Bilaaval · Guru Arjan Dev Ji`
   - One short editorial note, not repeated elsewhere.
   - CTA: `Open full source shabad` / existing `Go to source shabad`.
3. Compact reader controls bar.
4. Actual Hukamnama/Shabad text immediately.
5. Optional modules lower down or collapsed:
   - Source shabad context if not already in the hero.
   - Soundscapes.
   - On-this-ang/jump tools if relevant.

Important: distinguish daily Hukamnama from random Hukamnama after Ardaas.

- Daily BaniDB Hukamnama route: `Daily Hukamnama Sri Harmandir Sahib, Amritsar`.
- Ardaas/random flow: keep separate language like `Hukamnama after Ardaas`, not `Sri Harmandir Sahib, Amritsar`, unless the source actually is the daily Harmandir Sahib hukamnama.

### For bani-directory routes

Recommended order:

1. Safe top toolbar.
2. Compact bani editorial header:
   - Eyebrow: `Read`
   - Title: bani name, e.g. `Japji Sahib`
   - Source metadata: `Sri Guru Granth Sahib Ji · Ang 1` or `Dasam Granth · Ang ...`
   - Bani-specific editorial intro, 1-3 lines max.
3. Compact reader controls bar.
4. Gurbani text starts in the first viewport whenever possible.
5. Secondary tools after the first text block or inside collapsed sections:
   - `On this Ang`
   - Soundscapes
   - Learn/source context
   - Bookmark form

## Proposed component/data changes

### 1. Add a typed editorial-copy layer for reader intros

Create:

- `src/content/readerEditorialCopy.ts`

Proposed shape:

```ts
export type ReaderEditorialCopy = {
  id: string
  title: string
  dek: string
  historicalNote?: string
  practiceNote?: string
  sourceLine: string
  sourceRefs: Array<{
    label: string
    url?: string
    note: string
  }>
  reviewed: boolean
  reviewedAt?: string
}

export const READER_EDITORIAL_COPY_BY_BANI_ID: Record<string, ReaderEditorialCopy> = {
  'japji-sahib': {
    id: 'japji-sahib',
    title: 'Japji Sahib',
    dek: 'Japji Sahib opens Sri Guru Granth Sahib Ji on Ang 1 and is attributed to Guru Nanak Sahib Ji. It frames Sikh reflection through Ik Oankar, hukam, naam, gurprasad, and truthful living.',
    practiceNote: 'Traditionally recited in the morning as part of Nitnem.',
    sourceLine: 'Sri Guru Granth Sahib Ji · Ang 1',
    sourceRefs: [...],
    reviewed: true,
  },
}
```

Do not put long essays in the reader hero. Keep the on-screen copy concise and put provenance/source notes in the data file or a companion editorial review document.

Coverage requirement:

- Every `exactBani(...)` entry in `src/data/banis.ts` must have a reviewed copy entry, or an explicit intentional exception with a non-generic reason.
- Browse-only entries should have page/source-browsing copy where they surface, but if they do not open this exact `/study?baniDbId=...` reader path, they can be handled separately.
- No runtime generic fallback like `Comfortable reading first...` for bani-directory reader intros.

### 2. Add validation for copy coverage

Create one of these:

- `src/content/readerEditorialCopy.test.ts`
- or a script such as `scripts/content/check-reader-editorial-copy.mjs`

Validation should assert:

- Every app-facing exact bani in `BANIS` has a reader editorial entry.
- No entry uses banned generic/product phrases such as:
  - `Comfortable reading first`
  - `source layers`
  - `text stays primary`
  - `controls stay close`
- Every copy item has at least one source/provenance note.
- Every copy item has `reviewed: true` before it is rendered in production.
- On-screen `dek` length stays within a readable limit, e.g. under 220-260 characters unless intentionally allowed.

### 3. Replace `readerIntroBody` logic in `Study.tsx`

Current logic:

```ts
const readerIntroBody = isHukamnamaMode
  ? studyExperienceCopy.hukamnamaBody
  : studyCopy.introBody
```

Replace with a resolver:

```ts
const readerEditorial = resolveReaderEditorialCopy({
  isHukamnamaMode,
  hukamnamaDate: hukamnamaResult.data?.date,
  baniId: baniIdParam,
  baniDbId: baniDbIdParam,
  baniName,
  currentEntry,
  locale,
})
```

Rules:

- Hukamnama gets a dedicated editorial object.
- Bani-directory routes resolve by `baniIdParam` first, then by `baniDbIdParam`, then by canonical `BANIS` metadata.
- Exact shabad/ang/search routes can use a separate minimal contextual line, but not the generic bani-directory fallback.
- If a bani-directory route has no reviewed copy, tests should fail. In development, the UI can show metadata-only with a warning, but production should avoid generic copy.

### 4. Collapse the two Hukamnama cards into one

In `Study.tsx`:

- Convert the existing top reader header into the one true Hukamnama editorial card when `isHukamnamaMode` is true.
- Remove or repurpose the lower `isHukamnamaMode && currentEntry` hero block around `1494-1515`.
- Preserve the source-shabad CTA by moving it into the single header card.
- Update tests that currently expect `Hukamnama · 2026-04-05` to instead expect the new label/date structure.

Suggested test assertion change:

```ts
expect(screen.getByText(/Daily Hukamnama Sri Harmandir Sahib, Amritsar/i)).toBeInTheDocument()
expect(screen.getByText(/April 5, 2026|2026-04-05/i)).toBeInTheDocument()
expect(screen.getByText(/Raag Dhanaasree/i)).toBeInTheDocument()
expect(screen.getByText(/Go to source shabad|Open full source shabad/i)).toBeInTheDocument()
expect(screen.getAllByText(/Daily Hukamnama Sri Harmandir Sahib/i)).toHaveLength(1)
```

### 5. Rework reader controls into a stable, grouped control system

Extract or reorganize from `Study.tsx` into:

- `src/components/reader/ReaderControls.tsx`
- or `src/components/ReaderControls.tsx`

Collapsed state should be a compact toolbar, not a sentence that wraps.

Example collapsed layout:

- Left: `Reader settings`
- Chips:
  - `Gurmukhi`
  - `English`
  - `STTM 2`
  - `Translit Off`
- Right action: `Customize` + chevron

Expanded state should group controls with headings:

1. `Script`
   - Gurmukhi
   - Hindi/Devanagari
2. `Reading layers`
   - Transliteration switch
   - Larivaar switch
   - Vishraam switch
3. `Meaning`
   - Off
   - English
   - Punjabi
   - Hindi
4. `Punjabi teeka/source`
   - Steek
   - Faridkot
   - BaniDB
   - Manmohan Singh
   - PSS
5. `Hindi source`
   - STS
   - STTM
   - iGurbani
   - STTM 2
6. `Layout`
   - Compact
   - Relaxed
   - Left align
   - Center align
7. `Bani length` only when `supportedSundarGutkaBaniId` supports it.

State treatment:

- Do not render `Off` as visually inactive if Off is the active state.
- Switches should show the current state clearly: `Transliteration: Off`, not a button that looks like a disabled option.
- Reserve the saffron/gold gradient for the primary selected segment or primary CTA; use subtler selected states for many repeated controls to reduce visual noise.

Positioning:

- Keep the compact controls directly below the editorial header and above the first `StudyCard`.
- Expanded controls should be a controlled disclosure or bottom sheet that does not permanently push the entire text far below the fold.
- If using a bottom sheet, ensure it is reachable above the tab bar and dismissible with `Done`.
- If using inline disclosure, group it tightly and place secondary source options behind sub-disclosures.

Accessibility:

- Use `fieldset`/`legend` or ARIA group labels for grouped radio controls.
- Use `aria-pressed` only for toggle buttons; use radio semantics for mutually exclusive choices.
- Preserve `aria-expanded` and keyboard reachability.

### 6. Move secondary modules below the reader priority path

In `Study.tsx`, move or collapse:

- `SoundscapeControls context="study" variant="compact"`
- `DisclosureSection` for `On This Ang`

Recommended behavior:

- `On This Ang` stays available, but after compact controls or after the first text block, not between header and reader text unless multiple-entry navigation is critical.
- `SoundscapeControls` should move below the first scripture card or become a small optional chip like `Soundscape: Fireplace Glow` that expands only when tapped.
- The first visible viewport should show the title, editorial context, compact controls, and the beginning of the bani/Hukamnama text.

### 7. Fix bottom nav/content overlap for the study reader

Existing global CSS has `.page-shell` bottom padding and `NavBar.tsx` dynamically sets `--nav-stack-height`, but screenshots still show overlap. Treat this as a real mobile QA bug.

Implementation options:

- Add route-scoped study padding:

```css
.page-shell[data-page='study'] {
  padding-bottom: calc(var(--nav-stack-height) + var(--safe-area-bottom) + 3rem);
  scroll-padding-bottom: calc(var(--nav-stack-height) + var(--safe-area-bottom) + 3rem);
}
```

- Add `.study-entry-list` or final spacer padding if card content still falls under the floating nav.
- Verify after actual browser QA, not only JSDOM.
- Keep the bottom nav visually lighter in reading mode if it continues to compete with scripture text. Consider a route-scoped reduced opacity/height only after verifying it does not regress Home/Read/Learn.

### 8. Use scoped CSS hooks for study reader polish

Avoid broad changes to `.section-shell` or Home/Read classes.

Add scoped classes such as:

- `.study-reader-shell`
- `.study-reader-topbar`
- `.study-reader-hero`
- `.study-reader-hero--hukamnama`
- `.study-reader-hero--bani`
- `.study-reader-controls`
- `.study-reader-controls__summary`
- `.study-reader-controls__panel`
- `.study-reader-controls__group`
- `.study-reader-tools`

This prevents Read/Home regressions from reader-specific layout fixes.

## Editorial research workflow for bani copy

The copy work needs to be handled as content, not quick UI text.

### Source hierarchy

Use stable, checkable sources in this order:

1. App source metadata:
   - `src/data/banis.ts`
   - BaniDB IDs and Ang ranges
   - current `ScriptureEntry` metadata from API responses: scripture, raag, writer, source, ang
2. Primary scripture location:
   - Sri Guru Granth Sahib Ji Ang ranges
   - Dasam Granth source and Ang/page ranges where applicable
3. Established Sikh reference sources:
   - SGPC/Sikh Rehat Maryada where relevant for Nitnem practice context
   - Encyclopaedia of Sikhism / Punjabi University style references where available
   - BaniDB/STTM metadata for ids and source labels
4. Internal editorial review notes:
   - Store the basis for each copy item in `sourceRefs`, even if the on-screen UI only shows the concise text.

### Copy rules

- Be specific to the bani.
- State only defensible facts.
- Avoid unsupported exact historical claims.
- Avoid generic wellness/product language.
- Avoid making the app UI the subject of the intro.
- Avoid implying contested source/author details as certainty when the metadata or tradition is more nuanced.
- Keep the main hero copy short enough that scripture text starts quickly.

### Suggested initial copy targets

Start with the visible and high-traffic set:

1. `japji-sahib`
2. `jaap-sahib`
3. `tav-prasad-savaiye`
4. `chaupai-sahib`
5. `anand-sahib`
6. `rehras-sahib`
7. `kirtan-sohila`
8. `sukhmani-sahib`
9. `asa-di-var`
10. `aarti`
11. `laavan`
12. `salok-mahalla-9`
13. Today’s Hukamnama route

Then complete the remaining `BANIS` exact entries in category batches:

- SGGS Daily Prayers
- SGGS Long Compositions
- SGGS Vars
- SGGS Saloks & Short Banis
- SGGS Raag Sections
- SGGS Swaiye
- DG Daily Prayers
- DG Bir Ras
- DG Major Compositions
- DG Shorter Banis
- DG Supplemental Banis

### Sample direction, not final copy without source review

For Japji Sahib, the tone should be closer to:

> Japji Sahib opens Sri Guru Granth Sahib Ji on Ang 1 and is attributed to Guru Nanak Sahib Ji. It frames Sikh reflection through Ik Oankar, hukam, naam, gurprasad, and truthful living.

For today’s Hukamnama:

> Daily Hukamnama Sri Harmandir Sahib, Amritsar
> May 6, 2026
> Sri Guru Granth Sahib Ji · Ang 804 · Raag Bilaaval · Guru Arjan Dev Ji

The app can include a short line like:

> Read today’s Hukamnama first; open the full source shabad when you want the wider context.

But this should appear only once.

## Implementation steps

### Phase 1: Regression tests for the current problems

1. Add/update `Study.test.tsx` coverage for daily Hukamnama:
   - New title appears exactly once.
   - Date appears in the header card.
   - `Go to source shabad` still appears.
   - Duplicate `Today's Hukamnama`/old duplicate body does not appear twice.
2. Add/update `Study.test.tsx` coverage for Japji Sahib:
   - Generic `Comfortable reading first` copy is absent.
   - Bani-specific copy is present for `japji-sahib` route.
3. Add reader-controls tests:
   - Collapsed summary does not render as one long wrapping sentence.
   - Expanded controls expose group labels: `Script`, `Reading layers`, `Meaning`, `Layout`, etc.
4. Add editorial-copy coverage test:
   - Every exact `BANIS` entry has reviewed copy or a deliberate explicit exception.

### Phase 2: Editorial data and resolver

1. Create `src/content/readerEditorialCopy.ts`.
2. Create resolver helper, either in that file or `src/utils/readerEditorialCopy.ts`:
   - `resolveReaderEditorialCopy(...)`
   - `formatHukamnamaTitle(...)`
   - `formatReaderDate(...)`
3. Add reviewed copy for the initial visible set.
4. Add coverage placeholders only as `reviewed: false` if needed during development, but do not render them as final generic copy.

### Phase 3: Reader header/Hukamnama unification

1. Refactor the existing `study-reader-header` area into a dedicated `ReaderHero` structure.
2. For `isHukamnamaMode`:
   - Render `Daily Hukamnama Sri Harmandir Sahib, Amritsar`.
   - Render formatted date.
   - Render scripture/ang/raag/writer metadata.
   - Render source-shabad CTA in this same hero.
3. Remove the lower duplicate Hukamnama card around `1494-1515` or convert it to a non-duplicative source-context footer only if necessary.
4. Ensure random Hukamnama after Ardaas keeps separate copy.

### Phase 4: Reader controls component

1. Extract controls out of `Study.tsx` into a component.
2. Replace the single long summary string with chips.
3. Add group labels and proper control semantics.
4. Convert transliteration/larivaar/vishraam to clear switches or explicit active segments.
5. Move long source lists behind source-labeled subgroups.
6. Keep compact controls above text and expanded controls safe from bottom nav.

### Phase 5: Reorder secondary tools

1. Move `SoundscapeControls` below the first `StudyCard` or into a collapsed `Study tools` section.
2. Keep `On This Ang` available but prevent it from delaying the first text too much.
3. Make sure bookmark/source/action notices do not create top clutter.

### Phase 6: CSS polish and safe areas

1. Add study-scoped CSS hooks in `src/index.css`.
2. Add route-scoped bottom padding if browser QA confirms nav overlap.
3. Make the top toolbar safe-area aware and visually separated from iOS status icons.
4. Reduce card overuse: fewer full boxed panels before scripture, more editorial header + reader text.

### Phase 7: Full copy coverage batch

1. Complete `readerEditorialCopy.ts` for all exact `BANIS` entries.
2. Source-review each copy item.
3. Keep copy concise but specific.
4. Run coverage test until no bani-directory route depends on generic copy.

## Files likely to change

Code/data:

- `src/pages/Study.tsx`
- `src/pages/Study.test.tsx`
- `src/content/readerEditorialCopy.ts` (new)
- `src/content/readerEditorialCopy.test.ts` (new) or equivalent validation script
- `src/components/reader/ReaderControls.tsx` (new) or `src/components/ReaderControls.tsx` (new)
- `src/components/reader/ReaderHero.tsx` (optional new)
- `src/utils/uiCopy.ts` (remove or stop using generic reader intro for bani routes)
- `src/index.css`
- `src/types.ts` if shared types are added

Documentation/editorial review:

- `docs/editorial/reader-bani-copy.md` (optional but recommended)
- `docs/editorial/hukamnama-reader.md` (optional if source/copy decisions need a review record)

## Validation plan

Run targeted tests first:

```bash
npm test -- src/pages/Study.test.tsx
npm test -- src/content/readerEditorialCopy.test.ts
```

Then broader checks:

```bash
npm run typecheck
npm run build
```

If full lint/build has unrelated noise, isolate changed files with scoped checks, but do not skip final build.

Browser/mobile QA is mandatory:

1. Start local Vite preview/dev server.
2. Open today’s Hukamnama route, e.g. `/study?hukamnamaDate=2026-05-06`.
3. Open Japji Sahib from `/banis` or direct route.
4. Check mobile viewport around iPhone size, e.g. 393x852 or actual device screenshot dimensions.
5. Verify:
   - Only one daily Hukamnama card appears.
   - The red/header card says `Daily Hukamnama Sri Harmandir Sahib, Amritsar` and shows date.
   - First scripture text appears much sooner.
   - Reader controls are grouped and no longer look like a messy wall of pills.
   - Expanded controls do not hide behind bottom nav.
   - Bottom nav never covers scripture text or controls.
   - Dark mode remains readable.
   - Gurmukhi/Devanagari text does not clip.

## Risks and tradeoffs

- Full researched copy for all `BANIS` entries is a content project, not a quick string replacement. Doing it properly should be batched and reviewed.
- Some DG/Dasam Granth entries may need careful wording around source and attribution. Avoid overclaiming.
- Moving controls into a bottom sheet may feel more polished but requires careful mobile accessibility and focus handling. Inline disclosure is safer for a first pass.
- Moving Soundscapes down improves reading hierarchy but may reduce discoverability. A small collapsed chip can preserve access without interrupting reading.
- Existing tests may assert old copy and old order; update them to assert the new editorial hierarchy, not just new strings.

## Definition of done

- Hukamnama mode has one editorial Hukamnama card, not two.
- The card title reads `Daily Hukamnama Sri Harmandir Sahib, Amritsar` and displays the date.
- Reader controls have a clear collapsed summary and grouped expanded state.
- Japji Sahib and other bani-directory routes no longer show generic UI/product copy.
- Coverage validation prevents generic or missing copy for bani-directory entries.
- Mobile browser QA confirms no bottom nav overlap and the actual scripture text appears earlier.
- Typecheck/build/tests pass.
- No commit or push happens until explicitly approved.
