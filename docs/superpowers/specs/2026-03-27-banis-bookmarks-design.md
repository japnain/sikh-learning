# Banis Page, Bookmarks & Quiz Removal Design

**Date:** 2026-03-27
**Status:** Approved
**Scope:** Three independent features delivered together: (1) remove Quiz page, (2) new Banis page replacing Quiz in nav, (3) bookmarks with descriptions stored in Library

---

## Overview

- **Remove Quiz:** Delete Quiz page, route, and nav tab entirely.
- **Banis Page:** New `/banis` route, replacing Quiz in the nav. Two top-level scripture sections (SGGS and Dasam Granth), each with subcategories, each bani showing an inline info card before launching Study.
- **Bookmarks:** New Zustand store. Add bookmarks from Study page and Banis page. View/delete in Library page as a collapsible section.

---

## Feature 1: Remove Quiz

### Files to Change

| File | Change |
|------|--------|
| `src/App.tsx` | Remove `/quiz` route and Quiz import |
| `src/components/NavBar.tsx` | Remove Quiz tab, add Banis tab pointing to `/banis` |
| `src/pages/Quiz.tsx` | Delete file |
| `src/utils/quiz.ts` | Delete file |
| `src/utils/quiz.test.ts` | Delete file |

### NavBar After Change

5 tabs: Home · Study · Library · Banis · Vocab

---

## Feature 2: Banis Page

### Route

`/banis` — new page component at `src/pages/Banis.tsx`

### Visual Style

Campfire aesthetic matching Home page:
- Page wrapper: same radial gradient background as `Home.tsx`
- Section headers: `font-pixel uppercase tracking-wider text-[#8B6914]`
- Collapsible scripture sections: coal bg (`bg-coal`), amber border, amber glow
- Subcategory labels: `font-pixel text-xs text-[#8B6914] uppercase`
- Bani row buttons: coal bg, thin amber border `border-[#C9A84C44]`, `font-pixel` text
- Info card (expanded): coal bg, full amber border, ember glow, description text warm gray

### Page Structure

Two top-level collapsible sections. Each expands to show subcategories. Each subcategory shows bani rows. Tapping a bani row expands an inline info card.

```
▼ Sri Guru Granth Sahib Ji
  ▼ Daily Prayers
    › Japji Sahib
      [info card if expanded]
    › Anand Sahib
    ...
  ▼ Long Compositions
    ...
▼ Dasam Granth
  ...
```

### Info Card Content (per bani)

- Bani name (`font-pixel`, white)
- Scripture + ang range displayed as `"SGGS · Ang 262–296"` or `"DG · Ang 1–10"` (`font-pixel text-xs text-[#C9A84C]`)
- Short description (1 sentence, warm gray)
- **Begin Study →** button — navigates to `/study?source=<source>&ang=<startAng>`
- **🔖 Bookmark** button — renders filled/active when `hasBookmark(source, startAng)` is true; tapping (when not bookmarked) opens inline description input (optional), Save button always enabled

### Bani Data

Defined as a static TypeScript array in `src/data/banis.ts`. Each entry:

```ts
interface Bani {
  id: string           // kebab-case unique ID
  name: string         // display name
  scripture: 'SGGS' | 'DG'
  source: 'G' | 'D'   // BaniDB source code
  startAng: number     // navigate here on Begin Study
  endAng: number       // display only (not used for navigation)
  category: string     // subcategory label
  description: string  // 1-sentence description
}
```

**Note on ang ranges:** The ranges below are best estimates. Implementer must verify against BaniDB during development — if a specific ang returns no results, adjust by ±1–2.

### SGGS Banis

**Category: Daily Prayers**
| Name | startAng | endAng |
|------|----------|--------|
| Japji Sahib | 1 | 8 |
| Anand Sahib | 917 | 922 |
| Rehras Sahib | 8 | 12 |
| Kirtan Sohila | 12 | 13 |
| Sodar | 8 | 8 |

**Category: Long Compositions**
| Name | startAng | endAng |
|------|----------|--------|
| Sukhmani Sahib | 262 | 296 |
| Asa Di Var | 462 | 475 |
| Sidh Gosht | 938 | 946 |
| Onkar | 929 | 938 |
| Bavan Akhri | 250 | 262 |
| Barah Maha (Majh) | 133 | 136 |
| Barah Maha (Tukhari) | 1107 | 1110 |
| Pehre | 74 | 78 |
| Ghorian | 573 | 577 |
| Alahanian | 578 | 582 |

**Category: Vars**
| Name | startAng | endAng |
|------|----------|--------|
| Var Majh | 137 | 150 |
| Var Gujri | 508 | 517 |
| Var Vadahans | 585 | 590 |
| Var Sorath | 642 | 647 |
| Var Suhi | 785 | 792 |
| Var Bilaval | 849 | 855 |
| Var Ramkali | 947 | 956 |
| Var Sarang | 1237 | 1244 |
| Var Malhar | 1278 | 1283 |
| Var Maru | 1087 | 1096 |

**Category: Saloks & Short Banis**
| Name | startAng | endAng |
|------|----------|--------|
| Salok Mahalla 9 | 1426 | 1429 |
| Salok Kabir Ji | 1364 | 1377 |
| Salok Sheikh Farid Ji | 1377 | 1384 |
| Salok Sehskritee | 1353 | 1360 |
| Patti | 432 | 435 |
| Laavan | 773 | 774 |
| Shabad Hazare (M.5) | 295 | 296 |
| Mundavani | 1429 | 1429 |
| Ragmala | 1429 | 1430 |
| Gatha | 1360 | 1360 |
| Funhe | 1360 | 1361 |
| Chaubole | 1362 | 1363 |
| Thiiti (Majh) | 296 | 300 |
| Ramkali Sadd | 923 | 924 |
| Aarti | 663 | 663 |
| Swaiyas (M.3) | 1385 | 1389 |
| Swaiyas (M.4) | 1389 | 1396 |
| Swaiyas (M.5) | 1396 | 1409 |
| Dakhne (M.5) | 1096 | 1101 |

### Dasam Granth Banis

**Category: Daily Prayers**
| Name | startAng | endAng |
|------|----------|--------|
| Jaap Sahib | 1 | 10 |
| Tav Prasad Savaiye | 10 | 10 |
| Chaupai Sahib | 201 | 205 |

**Category: Bir Ras**
| Name | startAng | endAng |
|------|----------|--------|
| Chandi Charitar 1 | 65 | 82 |
| Chandi Charitar 2 | 83 | 95 |
| Chandi Di Var | 95 | 98 |
| Ugardanti | 55 | 64 |
| Ram Avtar | 296 | 338 |
| Krishna Avtar | 154 | 296 |

**Category: Major Compositions**
| Name | startAng | endAng |
|------|----------|--------|
| Akal Ustat | 11 | 41 |
| Bachitra Natak | 94 | 151 |
| Gyan Parbodh | 339 | 358 |
| Zafarnama | 393 | 404 |
| Chaubis Avtar | 41 | 153 |
| Brahm Avtar | 339 | 344 |
| Rudra Avtar | 344 | 358 |

**Category: Shorter Banis**
| Name | startAng | endAng |
|------|----------|--------|
| Shabad Hazare Patshahi 10 | 134 | 136 |
| Swaiyas Patshahi 10 | 13 | 18 |
| Sastra Naam Mala | 358 | 393 |

---

## Feature 3: Bookmarks

### Store

New file: `src/store/bookmarks.ts`

```ts
interface Bookmark {
  id: string              // `bookmark-${Date.now()}`
  type: 'shabad' | 'bani'
  title: string           // auto-filled: bani name or "${scripture} · Ang ${ang}"
  source: 'G' | 'D'
  ang: number             // startAng for banis
  description?: string    // user-written, optional — Library card omits row when absent
  savedAt: string         // ISO timestamp
}

interface BookmarksState {
  bookmarks: Bookmark[]
  addBookmark: (b: Omit<Bookmark, 'id' | 'savedAt'>) => void
  removeBookmark: (id: string) => void
  hasBookmark: (source: 'G' | 'D', ang: number) => boolean
}
```

`addBookmark` is a no-op if a bookmark with the same `source + ang` already exists (no duplicates). `hasBookmark(source, ang)` returns true if such a bookmark exists — used to show the bookmark button in an active/filled state.

Persisted to localStorage via Zustand `persist` middleware (key: `'sikh-bookmarks'`).

### Adding a Bookmark

**From Study page (`src/pages/Study.tsx`):**
- Bookmark button is only rendered when `isApiMode === true` and `entries.length > 0` (not during loading skeleton or scripture picker state)
- Add a 🔖 icon button in the top-right header area; renders filled/active when `hasBookmark(source, ang)` is true
- Tapping it (when not yet bookmarked) reveals an inline text input: "Add a note..." with a **Save** button; Save is enabled even with empty input (description is optional)
- On save: calls `addBookmark` with `type: 'shabad'`, current `source`, current `ang`, `title: "${scripture} · Ang ${ang}"`, user's description (may be empty)

**From Banis page (`src/pages/Banis.tsx`):**
- Each expanded info card has a **🔖 Bookmark** button
- Same inline description input pattern
- On save: calls `addBookmark` with `type: 'bani'`, bani's `source`, `startAng`, `title: bani.name`, user's description

### Viewing Bookmarks (Library page)

New collapsible section added at the top of `src/pages/Library.tsx`, above SGGS/DG sections:

```
▼ Bookmarks (3)
  [bookmark card]
  [bookmark card]
```

Each bookmark card shows:
- Title (`font-pixel`, white)
- Description (warm gray, italic)
- Scripture + ang reference (`font-pixel text-xs text-[#C9A84C]`)
- Tapping navigates to `/study?source=<source>&ang=<ang>`
- A ✕ delete button (top-right of card) calls `removeBookmark`

Section hidden when `bookmarks.length === 0`.

**Collapsed state default:** Bookmarks section defaults to expanded (`collapsed['bookmarks'] = true`) when first rendered with bookmarks present — matching the existing Library convention where `collapsed[id] = true` means open (the variable name is inverted; true = open, false = closed). Implementer must follow this same inverted convention.

---

## Files Summary

| File | Action |
|------|--------|
| `src/pages/Quiz.tsx` | Delete |
| `src/utils/quiz.ts` | Delete |
| `src/utils/quiz.test.ts` | Delete |
| `src/App.tsx` | Remove Quiz route/import, add Banis route |
| `src/components/NavBar.tsx` | Replace Quiz tab with Banis tab |
| `src/data/banis.ts` | Create — static bani definitions array |
| `src/pages/Banis.tsx` | Create — full Banis page component |
| `src/pages/Banis.test.tsx` | Create — render tests |
| `src/store/bookmarks.ts` | Create — Zustand bookmarks store |
| `src/store/bookmarks.test.ts` | Create — store unit tests |
| `src/pages/Study.tsx` | Modify — add bookmark button + inline form |
| `src/pages/Library.tsx` | Modify — add Bookmarks section at top |

---

## Out of Scope

- No changes to BaniDB fetching logic
- No multi-ang sequential study mode (Begin Study navigates to startAng only)
- No bookmark editing (delete and re-add)
- No bookmark categories or sorting
