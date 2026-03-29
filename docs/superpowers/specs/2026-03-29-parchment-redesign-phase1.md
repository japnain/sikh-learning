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

**Add to Google Fonts import:**
- `Noto Serif Gurmukhi` (weights 400, 600, 700) — replaces Noto Sans Gurmukhi
- `Plus Jakarta Sans` (weights 400, 500, 600) — replaces Inter

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

Scripture picker (no source/ang params):
- Cards: `bg-parchment-card rounded-2xl`, scripture name `text-ink font-sans font-medium`, short name `text-ink/50 text-xs`
- Order: SGGS first, DG second, then B (Bhai Gurdas Ji Vaaran), N (Bhai Nand Lal Ji Vaaran), A (Amrit Keertan), S (Bhai Gurdas Singh Ji Vaaran), R (Panthic Sources)

### Library (`src/pages/Library.tsx`)

- Background: `bg-parchment`
- Section headers: `font-sans font-semibold text-ink uppercase tracking-wider text-xs`
- Toggle arrows: `text-saffron`
- Section wrappers: `bg-parchment-low rounded-2xl`
- Ang buttons: `bg-parchment-card rounded-lg text-ink hover:text-saffron`
- Bookmarks section: at top, `bg-parchment-card rounded-2xl`, title `font-sans font-semibold text-ink`, bookmark cards `bg-parchment-low rounded-xl`
- Bookmark title: `font-sans font-semibold text-sm text-ink`
- Bookmark reference: `font-sans text-[10px] text-saffron`
- Pagination: `text-saffron`

Scripture section order:
1. Sri Guru Granth Sahib Ji — largest heading (`text-lg`), saffron treatment
2. Dasam Bani — standard heading (`text-base`)
3. Bhai Gurdas Ji Vaaran
4. Bhai Nand Lal Ji Vaaran
5. Amrit Keertan
6. Bhai Gurdas Singh Ji Vaaran
7. Panthic Sources & Codes of Conduct — source R has variable ang count; show a single "Browse" link entry (no numbered ang grid) instead of a full ang button grid

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

### Known Orphans (no action required)
After deleting `AddText.tsx`, the following become dead code but are intentionally left for a future cleanup pass:
- `src/store/customTexts.ts` — Zustand store for user-added texts
- `CustomText` type — used only by `customTexts.ts` and `AddText.tsx`

These will not cause build errors (they are not imported anywhere else) and are explicitly out of scope for Phase 1.

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

**`src/data/banis.ts`** — `BANIS` array source field typed as `'G' | 'D'`; widen to `'G' | 'D' | 'B' | 'N' | 'A' | 'S' | 'R'`. Add entries for new sources with `type: 'browse-only'` flag (no subcategory tree, just ang browser entry point). The `scripture` field union type must be widened from `'SGGS' | 'DG'` to `'SGGS' | 'DG' | 'BGV' | 'BNL' | 'AK' | 'BGSV' | 'PS'` to accommodate the short names of new sources.

**`src/pages/Study.tsx`** — `source` param type widened from `'G' | 'D'` to `'G' | 'D' | 'B' | 'N' | 'A' | 'S' | 'R'`.

**`src/hooks/useAng.ts`** — `source` param currently typed as `'G' | 'D'`; widen to `'G' | 'D' | 'B' | 'N' | 'A' | 'S' | 'R'` so new sources resolve correctly.

**`src/pages/Library.tsx`** — add 5 new collapsible sections using ang counts fetched from BaniDB or hardcoded. Hardcode ang counts for now (avoids extra API call):
- B: 628 angs
- N: 128 angs
- A: 1430 angs (mirrors SGGS)
- S: 284 angs
- R: varies — show "Browse" entry without numbered ang grid

**`src/pages/Banis.tsx`** — add 5 new source sections below DG, each with single "Browse by Ang →" CTA.

**`src/data/index.ts` or `src/data/scriptures.ts`** — update SCRIPTURES array with all 7 sources for scripture picker in Study page.

---

## Feature 5: Remove `font-pixel` References

All `font-pixel` class references removed across the entire codebase (Home, Banis, Library, NavBar, StreakBadge, StudyCard). Replace with `font-sans` for UI text and `font-gurmukhi` for scripture.

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
| `src/data/index.ts` | Add all 7 sources to SCRIPTURES array for Study scripture picker |
| `src/hooks/useAng.ts` | Widen `source` param type to include B, N, A, S, R |

---

## Out of Scope

- Hukamnama feature (Phase 2)
- Vak laina / ardaas feature (Phase 2)
- Kirtan audio player (Phase 3)
- Journal feature
- User profiles/auth
- Bookmark editing
