# Phase 1: Parchment Redesign + New Scripture Sources

**Date:** 2026-03-29
**Status:** Approved
**Scope:** Full visual overhaul from dark campfire theme to "Digital Parchment" aesthetic across all pages, removal of AddText page, and addition of 5 new BaniDB scripture sources.

---

## Overview

Replace the dark campfire aesthetic (coal backgrounds, Silkscreen pixel font, amber glows) with a warm parchment editorial design: cream backgrounds, Noto Serif Gurmukhi for scripture, Plus Jakarta Sans for UI, saffron as primary accent. Add all 5 remaining BaniDB sources (B, N, A, S, R) to Library and Banis pages with SGGS as the primary/most prominent. Remove AddText page entirely.

---

## Feature 1: Design System

### Color Tokens (tailwind.config.ts)

Remove existing tokens: `coal`, `ember`, `surface`, `gold`

Add new tokens:

```ts
parchment: '#fff8ef',        // main page background
'parchment-low': '#fbf3e4',  // section groupings / subtle containers
'parchment-card': '#ffffff', // interactive cards (lift effect)
ink: '#1e1b13',              // all body text (never pure black)
saffron: '#904d00',          // primary actions, headings, active states
'saffron-light': '#f99c45',  // accents, gradients, highlights
sand: '#dbc2b0',             // ghost borders at 15% opacity
```

### Typography (tailwind.config.ts + src/index.css)

**Remove:** Silkscreen font (all `font-pixel` references across codebase)

**Update Google Fonts import (`src/index.css`):**
- Replace `Noto Sans Gurmukhi` with `Noto Serif Gurmukhi` (weights 400, 600, 700) — remove the old import line entirely
- Replace `Inter` with `Plus Jakarta Sans` (weights 400, 500, 600) — remove the old import line entirely

**Tailwind font families:**
```ts
gurmukhi: ['Noto Serif Gurmukhi', 'serif'],  // all scripture text
sans: ['Plus Jakarta Sans', 'sans-serif'],    // all UI labels, nav, buttons
```

Remove `font-pixel` and `font-ui` font families.

### Design Rules

- **No solid borders** — depth via background color shifts only
- **Ghost border fallback** — `border-sand/15` (15% opacity `#dbc2b0`) when border needed for accessibility
- **Minimum corner radius** — `rounded-lg` (0.5rem) on all components
- **Transitions** — 300–500ms `ease-in-out` for all color/opacity changes
- **Gurmukhi line-height** — minimum `leading-relaxed` (1.625) on all scripture text
- **No pure black** — always use `text-ink` (#1e1b13)
- **Primary CTA gradient** — `from-saffron to-saffron-light`
- **Glassmorphism** — `backdrop-blur-xl bg-parchment/80` for floating nav/modals

---

## Feature 2: Page Redesigns

### Global

All pages: `bg-parchment min-h-screen` wrapper. Body background `#fff8ef`. Bottom nav parchment/saffron styling.

In `src/index.css`, update the `body` rule: set `background-color: #fff8ef` and `color: #1e1b13` (replacing existing `background-color: #0D0D0D` and `color: #ffffff`).

`App.tsx` root wrapper also sets `bg-parchment` (replacing `bg-[#0D0D0D]`) so the flash of dark background on first paint is eliminated. Both the App-level and page-level `bg-parchment` are intentional — the App wrapper covers any unmounted-component gap.

### NavBar (`src/components/NavBar.tsx`)

5 tabs unchanged: Home · Study · Library · Banis · Vocab

Styling:
- Background: `bg-parchment/80 backdrop-blur-xl` (glassmorphism)
- Border-top: `border-sand/15`
- Active tab: `text-saffron`
- Inactive tab: `text-ink/40`
- Font: `font-sans text-[10px]`

### StreakBadge (`src/components/StreakBadge.tsx`)

- Background: `bg-parchment-low`
- Text: `text-saffron font-sans font-semibold text-sm`
- Remove `boxShadow` amber glow

### Home (`src/pages/Home.tsx`)

Structure (top to bottom):
1. **Top bar** — app name left (`text-saffron font-sans font-bold`), streak badge right
2. **Date line** — `text-ink/50 font-sans text-xs`
3. **Greeting** — `font-sans font-semibold text-lg text-ink`
4. **Hero card** (Today's Pick):
   - Background: `bg-parchment-card` (white lift)
   - No border (tonal contrast with `bg-parchment-low` section wrapper)
   - Gurmukhi: `font-gurmukhi text-2xl leading-relaxed text-ink`
   - Source label: `font-sans text-xs text-saffron uppercase tracking-wide`
   - Translation: `font-sans text-sm text-ink/70`
   - "Read →" button: pill shape, saffron gradient, white text
   - Loading skeleton: `bg-parchment-low animate-pulse`
   - Null state: centered `font-sans text-ink/50` "No verse available today"
5. **Continue Reading** (conditional) — `bg-parchment-low rounded-2xl`, source label + arrow, `text-saffron`
6. **Quick Actions** — 3 buttons (Study, Library, Banis):
   - Study: primary gradient (`from-saffron to-saffron-light`), white text, `rounded-full`
   - Library/Banis: `bg-parchment-low`, `text-ink`, `rounded-full`, ghost border
7. **Recently Studied** — hidden when empty; cards `bg-parchment-card rounded-xl`, Gurmukhi text, `text-saffron text-[10px]` source label

### Study (`src/pages/Study.tsx` + `src/components/StudyCard.tsx`)

- Background: `bg-parchment`
- Top bar: back button (`text-saffron`), progress counter (`text-ink/50 font-sans text-xs`), bookmark icon (`text-saffron` when active)
- Progress bar: `bg-sand/30` track, `bg-saffron` fill
- StudyCard: `bg-parchment-card rounded-2xl` (white lift on parchment)
- Gurmukhi: `font-gurmukhi text-2xl leading-relaxed text-ink`
- Transliteration: `font-sans text-sm text-ink/60 italic`
- Translation: `font-sans text-base text-ink/80`
- Source tag: `font-sans text-xs text-saffron`
- Swipe indicators: saffron (right/known), `text-ink/30` (left/review)
- Word popover: `bg-parchment-card rounded-xl shadow-sm border-sand/15`
- Bookmark form: `bg-parchment-low rounded-xl`, input `bg-parchment-card`
- **Word popover for new sources (B, N, A, S, R):** `parseShabadId` in `Study.tsx` currently only returns a shabad ID for source `G` or `D` — all other sources return `null` and the word popover will never appear. This is acceptable for Phase 1; do **not** fix `parseShabadId`. Word-tap interactivity for new sources is deferred to a future phase.

Scripture picker (no source/ang params):
- Cards: `bg-parchment-card rounded-2xl`, scripture name `text-ink font-sans font-medium`, short name `text-ink/50 text-xs`
- Order: SGGS first, DG second, then B (Bhai Gurdas Ji Vaaran), N (Bhai Nand Lal Ji Vaaran), A (Amrit Keertan), S (Bhai Gurdas Singh Ji Vaaran), R (Panthic Sources)
- Sarbloh Granth (SG) **removed** from SCRIPTURES — it has no BaniDB API source ID and cannot use the standard ang-fetch flow
- Click handler for all picker cards (including new sources): navigate to `/study?source=<sourceId>&ang=1`
- Loading skeleton within Study page (picker not shown): `bg-parchment-low animate-pulse rounded-2xl`
- Scripture picker card skeleton: `bg-parchment-low animate-pulse rounded-2xl` (replaces current `bg-[#1A1A1A]` skeleton)

### Library (`src/pages/Library.tsx`)

- Background: `bg-parchment`
- Section headers: `font-sans font-semibold text-ink uppercase tracking-wider text-xs`
- Toggle arrows: `text-saffron`
- Section wrappers: `bg-parchment-low rounded-2xl`
- Ang buttons: `bg-parchment-card rounded-lg text-ink hover:text-saffron`
- Bookmarks section: at top, `bg-parchment-card rounded-2xl`, title `font-sans font-semibold text-ink`, bookmark cards `bg-parchment-low rounded-xl`
- Bookmark title: `font-sans font-semibold text-sm text-ink`
- Bookmark reference: `font-sans text-[10px] text-saffron` — format: `<shortName> · Ang <ang>`; use a lookup map `{ G: 'SGGS', D: 'DG', B: 'BGV', N: 'BNL', A: 'AK', S: 'BGSV', R: 'PS' }` (replacing the current hardcoded `G → 'SGGS'`, `D → 'DG'` ternary)
- Pagination: `text-saffron`

Scripture section order:
1. Sri Guru Granth Sahib Ji — largest heading (`text-lg`), saffron treatment
2. Dasam Bani — standard heading (`text-base`)
3. Bhai Gurdas Ji Vaaran
4. Bhai Nand Lal Ji Vaaran
5. Amrit Keertan
6. Bhai Gurdas Singh Ji Vaaran
7. Panthic Sources & Codes of Conduct — source R has variable ang count; show a single "Browse →" button (styled as `bg-parchment-card rounded-lg text-saffron font-sans text-sm w-full`) navigating to `/study?source=R&ang=1`, instead of a numbered ang button grid

### Banis (`src/pages/Banis.tsx`)

- Background: `bg-parchment`
- Remove radial gradient background
- SGGS section: `bg-parchment-card rounded-2xl` with saffron header accent, larger treatment
- DG section: `bg-parchment-low rounded-2xl`, standard treatment
- New sources (B, N, A, S, R): `bg-parchment-low rounded-xl`, smaller heading, no subcategory tree — each shows a single "Browse by Ang →" button navigating to `/study?source=<id>&ang=1`
- Category labels: `font-sans text-xs text-ink/50 uppercase tracking-wider`
- Bani rows: `bg-parchment-card rounded-xl text-ink font-sans`
- Info card: `bg-parchment-card rounded-2xl shadow-sm`, Gurmukhi name `font-gurmukhi`, reference `text-saffron text-xs font-sans`
- "Begin Study →" button: saffron gradient, `rounded-full`
- Bookmark button: `border-sand/15 text-ink/50` inactive; `text-saffron border-saffron/30` active

### Vocab (`src/pages/Vocab.tsx`)

- Background: `bg-parchment`
- Search bar: `bg-parchment-card rounded-full` input, `text-ink`, `border-sand/15`
- Filter tabs: pill buttons, active `bg-saffron text-white`, inactive `bg-parchment-low text-ink/60`
- Word cards: `bg-parchment-card rounded-2xl`
- Word text: `font-gurmukhi text-lg text-ink`
- Definition: `font-sans text-sm text-ink/70`
- Source tag: `font-sans text-[10px] text-saffron uppercase`

---

## Feature 3: Remove AddText

### Files to Delete
- `src/pages/AddText.tsx`

### Files to Modify
- `src/App.tsx` — remove AddText import and `/add` route; change body/root background from `bg-[#0D0D0D]` to `bg-parchment`
- `src/pages/Home.tsx` — remove "Add Text" quick action button (grid becomes 3 buttons: Study, Library, Banis; no more 2×2 grid — use 1 primary + 2 secondary)

### Files to Modify (beyond App.tsx and Home.tsx)

**`src/pages/Library.tsx`** — two additional removals required alongside the parchment restyle:
1. Remove the **Sarbloh Granth** collapsible section (the static scripture section driven by `SARBLOH_ENTRIES`)
2. Remove the **Custom Texts** collapsible section (driven by `useCustomTextsStore`)
3. Remove the **"+ Add New Book / Text"** button (currently navigates to `/add` — that route will no longer exist)

After these removals, `useCustomTextsStore` is no longer imported by any file other than `customTexts.ts` itself.

### Known Orphans (no action required)
After the above removals, the following become fully dead code and are intentionally left for a future cleanup pass:
- `src/store/customTexts.ts` — Zustand store for user-added texts; no longer imported by any page
- `CustomText` type — used only within `customTexts.ts`

These will not cause build errors and are explicitly out of scope for Phase 1.

---

## Feature 4: New BaniDB Sources

### New Source IDs

| SourceID | English Name | Short Name |
|----------|-------------|-----------|
| B | Bhai Gurdas Ji Vaaran | BGV |
| N | Bhai Nand Lal Ji Vaaran | BNL |
| A | Amrit Keertan | AK |
| S | Bhai Gurdas Singh Ji Vaaran | BGSV |
| R | Panthic Sources & Codes of Conduct | PS |

### Files to Modify

**`src/data/banis.ts`** — `BANIS` array source field typed as `'G' | 'D'`; widen to `'G' | 'D' | 'B' | 'N' | 'A' | 'S' | 'R'`. Add a `type?: 'browse-only'` optional field to the `Bani` interface. Add 5 entries for new sources with `type: 'browse-only'` (no subcategory tree, just ang browser entry point). The `scripture` field union type must be widened from `'SGGS' | 'DG'` to `'SGGS' | 'DG' | 'BGV' | 'BNL' | 'AK' | 'BGSV' | 'PS'` to accommodate the short names of new sources.

**`src/pages/Study.tsx`** — `source` param type widened from `'G' | 'D'` to `'G' | 'D' | 'B' | 'N' | 'A' | 'S' | 'R'`.

**`src/hooks/useAng.ts`** — `source` param currently typed as `'G' | 'D'`; widen to `'G' | 'D' | 'B' | 'N' | 'A' | 'S' | 'R'` so new sources resolve correctly.

**`src/api/banidb.ts`** — two changes required:
1. Widen local `BaniSource` type from `'G' | 'D'` to `'G' | 'D' | 'B' | 'N' | 'A' | 'S' | 'R'`
2. Extend `toScripture` mapping for new source IDs: `B → 'BGV'`, `N → 'BNL'`, `A → 'AK'`, `S → 'BGSV'`, `R → 'PS'`

**`src/store/scriptureCache.ts`** — widen local `BaniSource` type from `'G' | 'D'` to `'G' | 'D' | 'B' | 'N' | 'A' | 'S' | 'R'` so cache read/write calls for new sources type-check correctly.

**`src/store/bookmarks.ts`** — widen `source` field in the `Bookmark` interface and in `hasBookmark`/`addBookmark` signatures from `'G' | 'D'` to `'G' | 'D' | 'B' | 'N' | 'A' | 'S' | 'R'` so bookmarks can be saved from any new-source ang page.

**`src/types.ts`** — add `sourceId: 'G' | 'D' | 'B' | 'N' | 'A' | 'S' | 'R'` field to the `Scripture` interface. This field is used by the Study scripture picker to navigate to the correct BaniDB source without hardcoded `if/else` branches.

**`src/data/index.ts`** — update SCRIPTURES array: add all 7 BaniDB sources each with a `sourceId` field matching the type above, remove Sarbloh Granth entry. Replace the hardcoded `if/else` navigation in `Study.tsx`'s scripture picker click handler with a data-driven call: `navigate('/study?source=${s.sourceId}&ang=1')`. The following become dead code when Sarbloh Granth is removed and should be deleted from `data/index.ts`: the `sarbloh-granth.json` import, `SARBLOH_ENTRIES`, `ALL_ENTRIES`, and `getEntriesByScripture`. `Study.tsx` currently imports `ALL_ENTRIES` for non-API (static) mode; once Sarbloh Granth is removed from the picker, the static-mode branch (`isApiMode === false`) can be deleted from `Study.tsx` as well since there are no longer any static scripture sources.

**`src/pages/Library.tsx`** — add 5 new collapsible sections using ang counts fetched from BaniDB or hardcoded. Hardcode ang counts for now (avoids extra API call):
- B: 628 angs
- N: 128 angs
- A: 1430 angs (mirrors SGGS)
- S: 284 angs
- R: varies — show "Browse" entry without numbered ang grid

**`src/pages/Banis.tsx`** — add 5 new source sections below DG, each with single "Browse by Ang →" CTA.

---

## Feature 5: Remove `font-pixel` and `font-ui` References

All `font-pixel` and `font-ui` class references removed across the **entire codebase** (every file — not just the list in Feature 2). Replace with `font-sans` for UI text and `font-gurmukhi` for scripture. This includes but is not limited to: Home, Banis, Library, NavBar, StreakBadge, StudyCard, WordPopover, Vocab, and any other file containing these class names. Run a global search (`grep -r "font-pixel\|font-ui" src/`) to find all occurrences before starting.

---

## Files Summary

| File | Action |
|------|--------|
| `src/index.css` | Update Google Fonts: add Noto Serif Gurmukhi + Plus Jakarta Sans, remove Silkscreen |
| `tailwind.config.ts` | Replace dark tokens with parchment tokens; update font families |
| `src/components/NavBar.tsx` | Parchment/glassmorphism styling |
| `src/components/StreakBadge.tsx` | Parchment styling, remove glow |
| `src/components/StudyCard.tsx` | Parchment card styling, Noto Serif scripture |
| `src/components/WordPopover.tsx` | Parchment popover styling |
| `src/pages/Home.tsx` | Full parchment restyle, remove AddText quick action |
| `src/pages/Study.tsx` | Parchment styling, widen source type, update scripture picker order |
| `src/pages/Library.tsx` | Parchment styling, add 5 new scripture sections |
| `src/pages/Banis.tsx` | Parchment styling, add 5 new source browse sections |
| `src/pages/Vocab.tsx` | Parchment styling |
| `src/pages/AddText.tsx` | **Delete** |
| `src/App.tsx` | Remove AddText route/import; update root background to `bg-parchment` |
| `src/data/banis.ts` | Add new source entries; widen `source` and `scripture` union types |
| `src/data/index.ts` | Replace SCRIPTURES array: 7 BaniDB sources (SGGS, DG, B, N, A, S, R); remove Sarbloh Granth |
| `src/hooks/useAng.ts` | Widen `source` param type to include B, N, A, S, R |
| `src/api/banidb.ts` | Widen `BaniSource` type; extend `toScripture` mapping for B, N, A, S, R |
| `src/store/scriptureCache.ts` | Widen `BaniSource` type to include B, N, A, S, R |
| `src/store/bookmarks.ts` | Widen `source` field type in `Bookmark` interface and store signatures |
| `src/types.ts` | Add `sourceId` field to `Scripture` interface |

---

## Out of Scope

- Hukamnama feature (Phase 2)
- Vak laina / ardaas feature (Phase 2)
- Kirtan audio player (Phase 3)
- Journal feature
- User profiles/auth
- Bookmark editing
