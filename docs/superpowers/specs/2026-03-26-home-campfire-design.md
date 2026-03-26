# Home Page — Campfire Gathering Aesthetic

**Date:** 2026-03-26
**Status:** Approved
**Scope:** Home page (`src/pages/Home.tsx`) visual redesign only — no logic or routing changes

---

## Overview

Transform the Home page from a utilitarian dark dashboard into an immersive "sitting at the campfire" experience. The scripture of the day becomes the fire — the focal point everything else orbits. Dark vignette edges bleed into a deep orange-red core glow at center.

---

## Background

Full-viewport radial gradient fixed behind content:

```
radial-gradient(ellipse at 50% 45%, #7B2D00 0%, #3D1200 25%, #1A0800 50%, #0D0D0D 75%)
```

Applied on the page wrapper div as an inline style or utility class. Content scrolls over it; the glow stays anchored. Body background remains `#0D0D0D`.

---

## Typography

- **Add to Google Fonts import:** `Silkscreen` (weights 400, 700)
- **Add to Tailwind config:** `font-pixel: ['Silkscreen', 'cursive']`
- **Apply `font-pixel` to:** greeting text, date line, all section labels, all button labels
- **Gurmukhi text:** unchanged — stays as `font-gurmukhi` (Noto Sans Gurmukhi)
- **Inter:** removed from UI elements

New Tailwind color tokens:
```ts
ember: '#7B2D00',
coal: '#1A0800',
// existing: gold: '#C9A84C', surface: '#1A1A1A'
```

---

## Layout

Structure unchanged (greeting → hero card → continue reading → quick actions → recently studied). Visual treatment transforms each section.

### Greeting + Streak Badge

- Date line: `font-pixel` text-xs, muted amber (`text-[#8B6914]`)
- Greeting: `font-pixel` text-lg, white
- Streak badge: coal background, amber glow ring (`box-shadow: 0 0 8px #C9A84C55`), fire emoji stays

### Today's Pick — Hero Card

The campfire focal point. Larger presence than current:

- Background: `#1A0800` (coal)
- Border: `border-[#C9A84C]` (full amber, not muted)
- Outer ember glow: `box-shadow: 0 0 20px #7B2D0088, 0 0 40px #3D120044`
- More padding: `p-6` (up from `p-5`)
- Gurmukhi text: `text-2xl` (up from `text-xl` / 22px)
- Scripture/ang label: `font-pixel` text-xs, amber
- Translation: text-sm, warm gray (`text-[#A07850]`)
- Active state: glow intensifies (`box-shadow: 0 0 30px #C9A84C66`)
- Loading skeleton: coal bg with ember-tinted shimmer

### Continue Reading (conditional)

Same structure, less prominent than hero:

- Background: `#1A0800`
- Border: amber but thinner glow (`box-shadow: 0 0 8px #C9A84C44`)
- Text: `font-pixel` for label, warm gray for scripture ID
- Arrow: amber `→`

### Quick Actions Grid

2×2 grid, restyled:

| Button | Background | Border | Text |
|--------|-----------|--------|------|
| Study (primary) | gradient `#7B2D00` → `#C9A84C22` | amber | `font-pixel` white |
| Quiz | `#1A0800` | `#C9A84C66` | `font-pixel` white |
| Library | `#1A0800` | `#C9A84C66` | `font-pixel` white |
| Add Text | `#1A0800` | `#C9A84C66` | `font-pixel` white |

All buttons: `active:box-shadow: 0 0 12px #C9A84C88` tap glow.

### Recently Studied

- Cards: `#1A0800` bg, thin amber border `#C9A84C44`
- Scripture label: `font-pixel` text-[10px], muted amber
- Gurmukhi: unchanged size, white text
- Section label: `font-pixel` uppercase tracking-wider, muted amber

---

## Files to Change

| File | Change |
|------|--------|
| `src/index.css` | Add Silkscreen to Google Fonts import |
| `tailwind.config.ts` | Add `font-pixel`, `ember`, `coal` tokens |
| `src/pages/Home.tsx` | Full visual restyle per design above |
| `src/components/StreakBadge.tsx` | Coal bg + amber glow ring |

---

## Out of Scope

- No changes to routing, data fetching, or state logic
- No changes to other pages (Study, Quiz, Library, Add Text) in this task
- No StudyCard redesign (separate task)
- No gamification mechanics
