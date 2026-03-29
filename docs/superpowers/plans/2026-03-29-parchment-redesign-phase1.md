# Parchment Redesign Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dark campfire aesthetic with the Digital Parchment design system, add 5 new BaniDB scripture sources, and remove the AddText page.

**Architecture:** Pure visual and data-layer changes — no new routes, no new API calls, no new stores. The design system is token-based (Tailwind custom colors + fonts). New sources reuse the existing `useAng` hook and BaniDB API. Sarbloh Granth static data and the AddText page are deleted entirely.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Zustand, BaniDB API (`api.banidb.com/v2`), Vitest + @testing-library/react

**Spec:** `docs/superpowers/specs/2026-03-29-parchment-redesign-phase1.md`

---

## File Map

| File | Change Type |
|------|------------|
| `tailwind.config.ts` | Rewrite — new color tokens + font families |
| `src/index.css` | Rewrite — new Google Fonts import + body rule |
| `src/types.ts` | Modify — add `sourceId` to `Scripture` interface |
| `src/api/banidb.ts` | Modify — widen `BaniSource` type, extend `toScripture` |
| `src/store/scriptureCache.ts` | Modify — widen local `BaniSource` type |
| `src/store/bookmarks.ts` | Modify — widen `source` field type |
| `src/hooks/useAng.ts` | Modify — widen local `BaniSource` type |
| `src/data/index.ts` | Rewrite — 7-source SCRIPTURES array, remove Sarbloh dead code |
| `src/data/banis.ts` | Modify — add `type?` field, add 5 browse-only entries |
| `src/pages/AddText.tsx` | Delete |
| `src/App.tsx` | Modify — remove AddText route, bg-parchment wrapper |
| `src/components/NavBar.tsx` | Modify — parchment glassmorphism styling |
| `src/components/StreakBadge.tsx` | Modify — parchment styling |
| `src/components/StudyCard.tsx` | Modify — parchment card styling |
| `src/components/WordPopover.tsx` | Modify — parchment popover styling |
| `src/pages/Home.tsx` | Modify — full restyle, 3-button layout, cache lookup for recent |
| `src/pages/Study.tsx` | Modify — parchment styling, new picker, remove static mode |
| `src/pages/Library.tsx` | Modify — parchment styling, 5 new sections, cleanup |
| `src/pages/Banis.tsx` | Modify — parchment styling, 5 new browse sections |
| `src/pages/Vocab.tsx` | Modify — parchment styling |

---

## Task 1: Design System Tokens + Fonts

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/index.css`

- [ ] **Step 1: Rewrite `tailwind.config.ts`**

Replace the entire file:

```ts
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        parchment: '#fff8ef',
        'parchment-low': '#fbf3e4',
        'parchment-card': '#ffffff',
        ink: '#1e1b13',
        saffron: '#904d00',
        'saffron-light': '#f99c45',
        sand: '#dbc2b0',
      },
      fontFamily: {
        gurmukhi: ['Noto Serif Gurmukhi', 'serif'],
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Rewrite `src/index.css`**

Replace the entire file:

```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Gurmukhi:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #fff8ef;
  color: #1e1b13;
  font-family: 'Plus Jakarta Sans', sans-serif;
}
```

- [ ] **Step 3: Verify build passes**

```bash
cd /Users/japgrover/sikh-learning && npm run build
```

Expected: clean build, no errors about unknown color tokens or missing fonts.

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts src/index.css
git commit -m "feat: replace campfire design tokens with Digital Parchment system"
```

---

## Task 2: TypeScript Source Type Widening

**Files:**
- Modify: `src/types.ts`
- Modify: `src/api/banidb.ts`
- Modify: `src/store/scriptureCache.ts`
- Modify: `src/store/bookmarks.ts`
- Modify: `src/hooks/useAng.ts`

**Note:** These are pure TypeScript changes. No runtime behavior changes. Verify with `npm run build` — all 5 files must compile cleanly together.

- [ ] **Step 1: Add `sourceId` to `Scripture` interface in `src/types.ts`**

The `Scripture` interface is at line 44. Change it from:
```ts
export interface Scripture {
  id: string
  name: string
  shortName: string
}
```
to:
```ts
export interface Scripture {
  id: string
  name: string
  shortName: string
  sourceId: 'G' | 'D' | 'B' | 'N' | 'A' | 'S' | 'R'
}
```

- [ ] **Step 2: Widen `BaniSource` and extend `toScripture` in `src/api/banidb.ts`**

Change line 5:
```ts
// before
type BaniSource = 'G' | 'D'
// after
type BaniSource = 'G' | 'D' | 'B' | 'N' | 'A' | 'S' | 'R'
```

Change `toScripture` (lines 26–28):
```ts
// before
function toScripture(source: BaniSource): string {
  return source === 'G' ? 'SGGS' : 'DG'
}
// after
function toScripture(source: BaniSource): string {
  const map: Record<BaniSource, string> = {
    G: 'SGGS', D: 'DG', B: 'BGV', N: 'BNL', A: 'AK', S: 'BGSV', R: 'PS',
  }
  return map[source]
}
```

- [ ] **Step 3: Widen `BaniSource` in `src/store/scriptureCache.ts`**

Change line 5:
```ts
// before
type BaniSource = 'G' | 'D'
// after
type BaniSource = 'G' | 'D' | 'B' | 'N' | 'A' | 'S' | 'R'
```

No other changes needed — `angKey` is a string concat, the store methods work for any source.

- [ ] **Step 4: Widen `source` field in `src/store/bookmarks.ts`**

Change the `Bookmark` interface `source` field (line 7):
```ts
// before
source: 'G' | 'D'
// after
source: 'G' | 'D' | 'B' | 'N' | 'A' | 'S' | 'R'
```

Change `hasBookmark` signature (line 17):
```ts
// before
hasBookmark: (source: 'G' | 'D', ang: number) => boolean
// after
hasBookmark: (source: 'G' | 'D' | 'B' | 'N' | 'A' | 'S' | 'R', ang: number) => boolean
```

- [ ] **Step 5: Widen `BaniSource` in `src/hooks/useAng.ts`**

Change line 6:
```ts
// before
type BaniSource = 'G' | 'D'
// after
type BaniSource = 'G' | 'D' | 'B' | 'N' | 'A' | 'S' | 'R'
```

- [ ] **Step 6: Verify build passes**

```bash
cd /Users/japgrover/sikh-learning && npm run build
```

Expected: zero TypeScript errors.

- [ ] **Step 7: Run existing tests**

```bash
cd /Users/japgrover/sikh-learning && npm test -- --run
```

Expected: all existing tests pass (no logic changed).

- [ ] **Step 8: Commit**

```bash
git add src/types.ts src/api/banidb.ts src/store/scriptureCache.ts src/store/bookmarks.ts src/hooks/useAng.ts
git commit -m "feat: widen BaniSource type to include B, N, A, S, R across all layers"
```

---

## Task 3: Data Layer — SCRIPTURES + Banis

**Files:**
- Modify: `src/data/index.ts`
- Modify: `src/data/banis.ts`
- Test: `src/data/index.test.ts` (create)

- [ ] **Step 1: Write failing test for new SCRIPTURES array**

Create `src/data/index.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { SCRIPTURES } from './index'

describe('SCRIPTURES', () => {
  it('has exactly 7 BaniDB sources', () => {
    expect(SCRIPTURES).toHaveLength(7)
  })

  it('does not contain Sarbloh Granth', () => {
    expect(SCRIPTURES.find(s => s.shortName === 'SG')).toBeUndefined()
  })

  it('every entry has a sourceId', () => {
    const ids = SCRIPTURES.map(s => s.sourceId)
    expect(ids).toEqual(['G', 'D', 'B', 'N', 'A', 'S', 'R'])
  })

  it('SGGS is first, DG is second', () => {
    expect(SCRIPTURES[0].shortName).toBe('SGGS')
    expect(SCRIPTURES[1].shortName).toBe('DG')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/japgrover/sikh-learning && npm test -- --run src/data/index.test.ts
```

Expected: FAIL — SCRIPTURES has only 3 entries, includes SG, no sourceId field.

- [ ] **Step 3: Rewrite `src/data/index.ts`**

Replace the entire file:

```ts
import type { Scripture } from '../types'

export const SCRIPTURES: Scripture[] = [
  { id: 'sggs', name: 'Sri Guru Granth Sahib Ji', shortName: 'SGGS', sourceId: 'G' },
  { id: 'dasam-granth', name: 'Dasam Granth', shortName: 'DG', sourceId: 'D' },
  { id: 'bhai-gurdas-vaaran', name: 'Bhai Gurdas Ji Vaaran', shortName: 'BGV', sourceId: 'B' },
  { id: 'bhai-nand-lal-vaaran', name: 'Bhai Nand Lal Ji Vaaran', shortName: 'BNL', sourceId: 'N' },
  { id: 'amrit-keertan', name: 'Amrit Keertan', shortName: 'AK', sourceId: 'A' },
  { id: 'bhai-gurdas-singh-vaaran', name: 'Bhai Gurdas Singh Ji Vaaran', shortName: 'BGSV', sourceId: 'S' },
  { id: 'panthic-sources', name: 'Panthic Sources & Codes of Conduct', shortName: 'PS', sourceId: 'R' },
]
```

Note: `ALL_ENTRIES`, `SARBLOH_ENTRIES`, `getEntriesByScripture`, and the `sarbloh-granth.json` import are intentionally removed — Sarbloh Granth is no longer a browsable source.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/japgrover/sikh-learning && npm test -- --run src/data/index.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Update `src/data/banis.ts` — add `type?` field and 5 browse-only entries**

Change the `Bani` interface (lines 1–10): add `type?: 'browse-only'` and widen `source` and `scripture` unions:

```ts
export interface Bani {
  id: string
  name: string
  scripture: 'SGGS' | 'DG' | 'BGV' | 'BNL' | 'AK' | 'BGSV' | 'PS'
  source: 'G' | 'D' | 'B' | 'N' | 'A' | 'S' | 'R'
  startAng: number
  endAng: number
  category: string
  description: string
  type?: 'browse-only'
}
```

Append these 5 entries at the end of the `BANIS` array (before the closing `]`):

```ts
  // ── Browse-Only Sources ────────────────────────────────────────────────────
  { id: 'bhai-gurdas-vaaran', name: 'Bhai Gurdas Ji Vaaran', scripture: 'BGV', source: 'B', startAng: 1, endAng: 628, category: 'Vars', description: 'Poetic vars by Bhai Gurdas Ji elucidating Sikh philosophy and history.', type: 'browse-only' },
  { id: 'bhai-nand-lal-vaaran', name: 'Bhai Nand Lal Ji Vaaran', scripture: 'BNL', source: 'N', startAng: 1, endAng: 128, category: 'Vars', description: 'Persian and Punjabi poetry by Bhai Nand Lal Ji, devoted Sikh of Guru Gobind Singh Ji.', type: 'browse-only' },
  { id: 'amrit-keertan', name: 'Amrit Keertan', scripture: 'AK', source: 'A', startAng: 1, endAng: 1430, category: 'Keertan', description: 'Compilation of shabads from various scriptures selected for congregational singing.', type: 'browse-only' },
  { id: 'bhai-gurdas-singh-vaaran', name: 'Bhai Gurdas Singh Ji Vaaran', scripture: 'BGSV', source: 'S', startAng: 1, endAng: 284, category: 'Vars', description: 'Vars by Bhai Gurdas Singh Ji expanding on Sikh teachings and history.', type: 'browse-only' },
  { id: 'panthic-sources', name: 'Panthic Sources & Codes of Conduct', scripture: 'PS', source: 'R', startAng: 1, endAng: 1, category: 'Panthic', description: 'Rehatnames, tankhanamas, and authoritative Panthic documents.', type: 'browse-only' },
```

- [ ] **Step 6: Verify build passes**

```bash
cd /Users/japgrover/sikh-learning && npm run build
```

Expected: TypeScript compiles cleanly — `ALL_ENTRIES` usages in Home.tsx and Study.tsx will now produce errors; those are fixed in Tasks 6 and 7.

If the build fails only because of `ALL_ENTRIES` references in Home.tsx and Study.tsx, that is expected and will be resolved in Tasks 6 and 7. For now, note the errors and proceed.

- [ ] **Step 7: Run all tests**

```bash
cd /Users/japgrover/sikh-learning && npm test -- --run
```

Expected: data tests pass; any test failures caused only by files edited in later tasks are acceptable at this stage.

- [ ] **Step 8: Commit**

```bash
git add src/data/index.ts src/data/banis.ts src/data/index.test.ts
git commit -m "feat: replace SCRIPTURES with 7 BaniDB sources; add browse-only banis"
```

---

## Task 4: Remove AddText + Update App.tsx

**Files:**
- Delete: `src/pages/AddText.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Delete `src/pages/AddText.tsx`**

```bash
rm /Users/japgrover/sikh-learning/src/pages/AddText.tsx
```

- [ ] **Step 2: Rewrite `src/App.tsx`**

Replace the entire file:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar'
import Home from './pages/Home'
import Study from './pages/Study'
import Library from './pages/Library'
import Banis from './pages/Banis'
import Vocab from './pages/Vocab'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-parchment pb-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/study" element={<Study />} />
          <Route path="/study/:scriptureId" element={<Study />} />
          <Route path="/library" element={<Library />} />
          <Route path="/banis" element={<Banis />} />
          <Route path="/vocab" element={<Vocab />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <NavBar />
      </div>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: Verify build passes**

```bash
cd /Users/japgrover/sikh-learning && npm run build 2>&1 | grep -v "ALL_ENTRIES"
```

Expected: only `ALL_ENTRIES`-related errors remain (from Home.tsx and Study.tsx — fixed in Tasks 6 and 7).

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git rm src/pages/AddText.tsx
git commit -m "feat: remove AddText page and /add route; wrap app in bg-parchment"
```

---

## Task 5: Global Components Restyle

**Files:**
- Modify: `src/components/NavBar.tsx`
- Modify: `src/components/StreakBadge.tsx`
- Modify: `src/components/StudyCard.tsx`
- Modify: `src/components/WordPopover.tsx`
- Test: `src/components/NavBar.test.tsx` (update)

- [ ] **Step 1: Rewrite `src/components/NavBar.tsx`**

```tsx
import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/library', label: 'Library', icon: '📚' },
  { to: '/study', label: 'Study', icon: '📖' },
  { to: '/banis', label: 'Banis', icon: '🙏' },
  { to: '/vocab', label: 'Vocab', icon: '💬' },
]

export default function NavBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-parchment/80 backdrop-blur-xl border-t border-sand/15 flex justify-around items-center h-16 px-2 z-50">
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl min-w-[44px] min-h-[44px] justify-center transition-colors duration-300 ease-in-out ${
              isActive ? 'text-saffron' : 'text-ink/40'
            }`
          }
        >
          <span className="text-lg">{tab.icon}</span>
          <span className="font-sans text-[10px]">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Run NavBar tests**

```bash
cd /Users/japgrover/sikh-learning && npm test -- --run src/components/NavBar.test.tsx
```

Expected: all pass (tabs are unchanged: Home, Library, Study, Banis, Vocab).

- [ ] **Step 3: Rewrite `src/components/StreakBadge.tsx`**

```tsx
interface Props { streak: number }

export default function StreakBadge({ streak }: Props) {
  return (
    <div className="flex items-center gap-1.5 bg-parchment-low rounded-full px-3 py-1.5">
      <span className="text-base">🔥</span>
      <span className="font-sans font-semibold text-sm text-saffron">
        {streak} day{streak !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
```

- [ ] **Step 4: Rewrite `src/components/StudyCard.tsx`**

```tsx
import { useState } from 'react'
import type { ScriptureEntry, Word } from '../types'
import WordPopover from './WordPopover'
import { useVocabStore } from '../store/vocab'

interface Props {
  entry: ScriptureEntry
  wordData?: Word[] | null
  onSwipeRight: () => void
  onSwipeLeft: () => void
}

export default function StudyCard({ entry, wordData, onSwipeRight, onSwipeLeft }: Props) {
  const [flipped, setFlipped] = useState(false)
  const [activeWord, setActiveWord] = useState<Word | null>(null)
  const [lang, setLang] = useState<'en' | 'pa'>('en')
  const addWord = useVocabStore(s => s.addWord)

  const handleWordTap = (wordText: string) => {
    const wordsToSearch = wordData ?? entry.words ?? []
    if (!wordsToSearch.length) return
    const found = wordsToSearch.find(w => wordText.includes(w.gurmukhi))
    if (found) setActiveWord(found)
  }

  const handleSaveVocab = (word: Word) => {
    addWord({
      word: word.gurmukhi,
      transliteration: word.transliteration,
      meaning_en: word.meaning_en,
      meaning_pa: word.meaning_pa,
      scripture: entry.scripture,
      sourceId: entry.id,
      savedAt: new Date().toISOString().split('T')[0],
    })
  }

  return (
    <>
      <div
        data-testid="study-card"
        onClick={() => setFlipped(f => !f)}
        className="bg-parchment-card rounded-2xl p-6 min-h-[300px] flex flex-col justify-between cursor-pointer select-none border border-sand/15 active:border-saffron/30 transition-colors duration-300 ease-in-out"
      >
        {!flipped ? (
          <div className="flex-1 flex flex-col justify-center">
            <p className="font-sans text-xs text-saffron uppercase tracking-wide mb-3">
              {entry.scripture} · Ang {entry.ang}
            </p>
            <div className="flex flex-wrap gap-2">
              {entry.gurmukhi.split(' ').map((word, i) => (
                <span
                  key={i}
                  lang="pa-Guru"
                  className="font-gurmukhi text-2xl text-ink leading-relaxed cursor-pointer hover:text-saffron transition-colors duration-300"
                  style={{ fontSize: '22px', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}
                  onClick={(e) => { e.stopPropagation(); handleWordTap(word) }}
                >
                  {word}
                </span>
              ))}
            </div>
            <p className="font-sans text-ink/40 text-xs mt-4">Tap card to see translation · Tap word for meaning</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center gap-3">
            <p className="font-sans text-sm text-ink/60 italic">{entry.transliteration}</p>
            <div className="flex gap-2 mb-2">
              <button
                onClick={e => { e.stopPropagation(); setLang('en') }}
                className={`font-sans text-xs px-3 py-1 rounded-full transition-colors duration-300 ${lang === 'en' ? 'bg-saffron text-white' : 'bg-parchment-low text-ink/60'}`}
              >EN</button>
              <button
                onClick={e => { e.stopPropagation(); setLang('pa') }}
                className={`font-sans text-xs px-3 py-1 rounded-full transition-colors duration-300 ${lang === 'pa' ? 'bg-saffron text-white' : 'bg-parchment-low text-ink/60'}`}
              >PA</button>
            </div>
            {lang === 'en'
              ? <p className="font-sans text-base text-ink/80 leading-relaxed">{entry.translation_en}</p>
              : <p lang="pa-Guru" className="font-gurmukhi text-base text-ink/80 leading-relaxed">{entry.translation_pa}</p>
            }
          </div>
        )}

        <div className="flex justify-between mt-4 pt-4 border-t border-sand/15">
          <button
            onClick={e => { e.stopPropagation(); onSwipeLeft() }}
            className="flex-1 mr-2 py-2 rounded-xl bg-parchment-low text-ink/60 font-sans text-sm font-medium min-h-[44px] transition-colors duration-300"
          >← Review Later</button>
          <button
            onClick={e => { e.stopPropagation(); onSwipeRight() }}
            className="flex-1 ml-2 py-2 rounded-full bg-gradient-to-r from-saffron to-saffron-light text-white font-sans text-sm font-semibold min-h-[44px] transition-colors duration-300"
          >Got It →</button>
        </div>
      </div>

      {activeWord && (
        <WordPopover
          word={activeWord}
          onSave={handleSaveVocab}
          onClose={() => setActiveWord(null)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 5: Rewrite `src/components/WordPopover.tsx`**

```tsx
import type { Word } from '../types'

interface Props {
  word: Word
  onSave: (word: Word) => void
  onClose: () => void
}

export default function WordPopover({ word, onSave, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-parchment-card border border-sand/15 rounded-t-2xl p-6 w-full max-w-md mb-0 shadow-sm"
        onClick={e => e.stopPropagation()}
      >
        <p lang="pa-Guru" className="font-gurmukhi text-3xl text-ink mb-1">{word.gurmukhi}</p>
        <p className="font-sans text-ink/60 text-sm mb-1">{word.transliteration}</p>
        <p className="font-sans text-ink font-medium mb-1">{word.meaning_en}</p>
        <p lang="pa-Guru" className="font-gurmukhi text-ink/70 text-sm mb-4">{word.meaning_pa}</p>
        <button
          onClick={() => { onSave(word); onClose() }}
          className="w-full py-3 rounded-full bg-gradient-to-r from-saffron to-saffron-light text-white font-sans font-semibold text-sm min-h-[44px] transition-colors duration-300"
        >
          Save to Vocab
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Run all tests**

```bash
cd /Users/japgrover/sikh-learning && npm test -- --run
```

Expected: all existing tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/NavBar.tsx src/components/StreakBadge.tsx src/components/StudyCard.tsx src/components/WordPopover.tsx
git commit -m "feat: restyle NavBar, StreakBadge, StudyCard, WordPopover to parchment theme"
```

---

## Task 6: Home Page Restyle

**Files:**
- Modify: `src/pages/Home.tsx`
- Test: `src/pages/Home.test.tsx` (update)

**Key logic changes:**
- Remove `ALL_ENTRIES` and `useCustomTextsStore` imports
- Look up recently studied entries from `useScriptureCacheStore` instead
- Remove glow inline styles
- Change 3-button layout (Study primary, Library + Banis secondary)
- Full parchment restyle

- [ ] **Step 1: Check and update existing Home tests**

Open `src/pages/Home.test.tsx`. Find any test asserting:
- `Add Text` button is present — change to assert it is NOT present
- `ALL_ENTRIES` or `customTexts` references — remove them

Add test: the 3 quick action buttons are Study, Library, and Banis.

The test file should include at minimum:
```tsx
it('shows Study, Library, and Banis quick action buttons', async () => {
  render(<Home />, { wrapper: RouterWrapper })
  expect(screen.getByText(/study/i)).toBeInTheDocument()
  expect(screen.getByText(/library/i)).toBeInTheDocument()
  expect(screen.getByText(/banis/i)).toBeInTheDocument()
  expect(screen.queryByText(/add text/i)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run Home tests to confirm current state**

```bash
cd /Users/japgrover/sikh-learning && npm test -- --run src/pages/Home.test.tsx
```

- [ ] **Step 3: Rewrite `src/pages/Home.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgressStore } from '../store/progress'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { getDailyPickAng } from '../utils/dailyPick'
import { useAng } from '../hooks/useAng'
import StreakBadge from '../components/StreakBadge'
import type { StudiedEntry } from '../types'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Sat Sri Akaal 🙏'
  if (h < 17) return 'Waheguru Ji 🙏'
  return 'Waheguru Ji Ka Khalsa 🙏'
}

export default function Home() {
  const navigate = useNavigate()
  const { streak, currentSession, studied } = useProgressStore()
  const { getEntryById } = useScriptureCacheStore()
  const { source, ang } = getDailyPickAng()
  const { entries: pickEntries, loading: pickLoading } = useAng(ang, source)
  const todaysPick = pickEntries[0] ?? null

  const [pressedBtn, setPressedBtn] = useState<string | null>(null)

  const recentlyStudied = [...studied]
    .sort((a: StudiedEntry, b: StudiedEntry) =>
      new Date(b.swipedAt).getTime() - new Date(a.swipedAt).getTime()
    )
    .slice(0, 6)
    .map((s: StudiedEntry) => {
      const entry = getEntryById(s.id)
      return entry ? { ...entry, swipedAt: s.swipedAt } : null
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)

  const actions = [
    { key: 'study', label: '📖 Study', path: '/study', primary: true },
    { key: 'library', label: '📚 Library', path: '/library', primary: false },
    { key: 'banis', label: '🙏 Banis', path: '/banis', primary: false },
  ]

  return (
    <div className="p-4 max-w-md mx-auto min-h-screen bg-parchment">
      {/* Top bar */}
      <div className="flex justify-between items-center mb-2 mt-4">
        <span className="font-sans font-bold text-saffron text-base">Nitnem</span>
        <StreakBadge streak={streak} />
      </div>

      {/* Date + Greeting */}
      <p className="font-sans text-xs text-ink/50 mb-1">
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>
      <h1 className="font-sans font-semibold text-lg text-ink mb-6">{greeting()}</h1>

      {/* Today's Pick */}
      <div className="bg-parchment-low rounded-2xl p-4 mb-6">
        <p className="font-sans text-xs text-saffron uppercase tracking-wide mb-3">Today's Pick</p>
        {pickLoading ? (
          <div className="bg-parchment-low rounded-2xl p-6 min-h-[120px] animate-pulse" />
        ) : todaysPick ? (
          <div
            onClick={() => navigate(`/study?source=${source}&ang=${ang}`)}
            className="bg-parchment-card rounded-2xl p-6 cursor-pointer transition-shadow duration-300"
          >
            <p className="font-sans text-xs text-saffron uppercase tracking-wide mb-2">
              {todaysPick.scripture} · Ang {todaysPick.ang}
            </p>
            <p lang="pa-Guru" className="font-gurmukhi text-2xl text-ink leading-relaxed line-clamp-2">
              {todaysPick.gurmukhi}
            </p>
            <p className="font-sans text-sm text-ink/70 mt-2 line-clamp-1">{todaysPick.translation_en}</p>
            <div className="mt-4 flex justify-end">
              <button className="font-sans text-sm font-semibold bg-gradient-to-r from-saffron to-saffron-light text-white px-5 py-2 rounded-full transition-colors duration-300">
                Read →
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-parchment-card rounded-2xl p-6 min-h-[120px] flex items-center justify-center">
            <p className="font-sans text-ink/50 text-sm">No verse available today</p>
          </div>
        )}
      </div>

      {/* Continue Reading */}
      {currentSession && (
        <div className="mb-6">
          <div
            onClick={() => navigate(`/study/${currentSession.scriptureId}`)}
            className="bg-parchment-low rounded-2xl p-4 cursor-pointer flex justify-between items-center transition-colors duration-300"
          >
            <div>
              <p className="font-sans font-medium text-ink text-sm">Pick up where you left off</p>
              <p className="font-sans text-saffron text-xs mt-0.5">{currentSession.scriptureId.toUpperCase()}</p>
            </div>
            <span className="text-saffron text-lg">→</span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-col gap-3 mb-6">
        {actions.map(({ key, label, path, primary }) => (
          <button
            key={key}
            onClick={() => navigate(path)}
            onMouseDown={() => setPressedBtn(key)}
            onMouseUp={() => setPressedBtn(null)}
            onTouchStart={() => setPressedBtn(key)}
            onTouchEnd={() => setPressedBtn(null)}
            className={`font-sans rounded-full p-4 text-sm font-semibold min-h-[44px] transition-all duration-300 ${
              primary
                ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                : 'bg-parchment-low text-ink border border-sand/15'
            } ${pressedBtn === key ? 'opacity-80' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Recently Studied */}
      {recentlyStudied.length > 0 && (
        <div>
          <p className="font-sans text-xs text-ink/50 uppercase tracking-wider mb-3">Recently Studied</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentlyStudied.map((entry) => (
              <div
                key={entry.id}
                className="flex-shrink-0 w-48 bg-parchment-card rounded-xl p-3 cursor-pointer"
                onClick={() => navigate('/study')}
              >
                <p className="font-sans text-saffron text-[10px] mb-1 uppercase tracking-wide">{entry.scripture}</p>
                <p lang="pa-Guru" className="font-gurmukhi text-ink text-sm leading-relaxed line-clamp-2">
                  {entry.gurmukhi}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run Home tests**

```bash
cd /Users/japgrover/sikh-learning && npm test -- --run src/pages/Home.test.tsx
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Home.tsx src/pages/Home.test.tsx
git commit -m "feat: restyle Home page to Digital Parchment; 3-button layout; remove campfire theme"
```

---

## Task 7: Study Page Restyle + Static Mode Removal

**Files:**
- Modify: `src/pages/Study.tsx`
- Test: `src/pages/Study.test.tsx` (update)

**Key logic changes:**
- Remove `ALL_ENTRIES` import + `staticEntries` variable
- Remove static mode branch (the `!isApiMode && entries.length === 0` early return)
- Widen `source` cast to include all 7 sources
- Update scripture picker to be data-driven (use `s.sourceId`, remove `if/else` branches)
- Full parchment restyle

- [ ] **Step 1: Update Study tests**

Open `src/pages/Study.test.tsx`. Add/update these tests:

```tsx
it('scripture picker shows 7 sources', async () => {
  // render Study with no params
  render(<Study />, { wrapper: RouterWrapper })
  expect(screen.getByText('Sri Guru Granth Sahib Ji')).toBeInTheDocument()
  expect(screen.getByText('Dasam Granth')).toBeInTheDocument()
  expect(screen.getByText('Bhai Gurdas Ji Vaaran')).toBeInTheDocument()
  expect(screen.queryByText('Sarbloh Granth')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run Study tests to confirm baseline**

```bash
cd /Users/japgrover/sikh-learning && npm test -- --run src/pages/Study.test.tsx
```

- [ ] **Step 3: Rewrite `src/pages/Study.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SCRIPTURES } from '../data'
import { useProgressStore } from '../store/progress'
import { useAng } from '../hooks/useAng'
import { useWordData } from '../hooks/useWordData'
import StudyCard from '../components/StudyCard'
import type { ScriptureEntry } from '../types'
import { useBookmarksStore } from '../store/bookmarks'

function parseShabadId(entryId: string): number | null {
  const parts = entryId.split('-')
  if (parts.length === 3 && (parts[0] === 'G' || parts[0] === 'D')) {
    return Number(parts[2])
  }
  // Note: word popover not supported for sources B, N, A, S, R (deferred)
  return null
}

export default function Study() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const source = (searchParams.get('source') as 'G' | 'D' | 'B' | 'N' | 'A' | 'S' | 'R' | null) ?? null
  const angParam = Number(searchParams.get('ang')) || null

  const { studied, reviewQueue, markStudied, addToReview, updateSession, clearSession, recordSwipeToday } = useProgressStore()

  const { entries: angEntries, loading: angLoading } = useAng(
    angParam ?? 1,
    source ?? 'G'
  )
  const isApiMode = source !== null && angParam !== null

  const entries: ScriptureEntry[] = isApiMode ? angEntries : []

  const studiedIds = new Set(studied.map(s => s.id))
  const unseenEntries = entries.filter(e => !studiedIds.has(e.id) && !reviewQueue.includes(e.id))
  const allUnseen = unseenEntries.length === 0

  const [index, setIndex] = useState(0)

  const { addBookmark, hasBookmark } = useBookmarksStore()
  const [showBookmarkForm, setShowBookmarkForm] = useState(false)
  const [bookmarkText, setBookmarkText] = useState('')

  const isBookmarked = isApiMode && source !== null && angParam !== null
    ? hasBookmark(source, angParam)
    : false

  const handleSaveBookmark = () => {
    if (!source || !angParam || !currentEntry) return
    addBookmark({
      type: 'shabad',
      title: `${currentEntry.scripture} · Ang ${angParam}`,
      source,
      ang: angParam,
      description: bookmarkText || undefined,
    })
    setShowBookmarkForm(false)
    setBookmarkText('')
  }

  const displayEntries = allUnseen ? entries : unseenEntries
  const total = displayEntries.length
  const currentEntry = displayEntries[index % Math.max(total, 1)]

  const currentShabadId = currentEntry ? parseShabadId(currentEntry.id) : null
  const { words: wordData } = useWordData(isApiMode ? currentShabadId : null)

  useEffect(() => {
    if (currentEntry && isApiMode) {
      updateSession({ scriptureId: `${source}-${angParam}`, lastCardIndex: index })
    }
  }, [index, isApiMode, currentEntry])

  const handleSwipeRight = () => {
    markStudied(currentEntry.id)
    recordSwipeToday()
    if (index + 1 >= total) {
      clearSession()
      setIndex(0)
    } else {
      setIndex(i => i + 1)
    }
  }

  const handleSwipeLeft = () => {
    addToReview(currentEntry.id)
    recordSwipeToday()
    const nextIndex = index + 1
    if (nextIndex >= total) {
      setIndex(0)
    } else {
      setIndex(nextIndex)
    }
  }

  // Loading state
  if (isApiMode && angLoading) {
    return (
      <div className="p-4 max-w-md mx-auto mt-4 bg-parchment min-h-screen">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="text-saffron font-sans text-sm min-h-[44px] min-w-[44px]">← Back</button>
        </div>
        <div className="bg-parchment-low rounded-2xl p-6 min-h-[300px] animate-pulse">
          <div className="h-3 bg-sand/30 rounded w-1/4 mb-4" />
          <div className="h-8 bg-sand/30 rounded w-full mb-3" />
          <div className="h-8 bg-sand/30 rounded w-4/5 mb-3" />
          <div className="h-4 bg-sand/30 rounded w-2/3" />
        </div>
      </div>
    )
  }

  // Scripture picker (no params)
  if (!isApiMode) {
    return (
      <div className="p-4 max-w-md mx-auto mt-4 bg-parchment min-h-screen">
        <h1 className="font-sans font-semibold text-lg text-ink mb-4">Choose a Scripture</h1>
        {SCRIPTURES.map(s => (
          <button
            key={s.id}
            onClick={() => navigate(`/study?source=${s.sourceId}&ang=1`)}
            className="w-full bg-parchment-card rounded-2xl p-4 mb-3 text-left min-h-[44px] border border-sand/15 transition-colors duration-300"
          >
            <p className="font-sans text-ink font-medium">{s.name}</p>
            <p className="font-sans text-ink/50 text-xs mt-0.5">{s.shortName}</p>
          </button>
        ))}
      </div>
    )
  }

  if (isApiMode && entries.length === 0) {
    return (
      <div className="p-4 max-w-md mx-auto text-center mt-20 bg-parchment min-h-screen">
        <p className="font-sans text-ink/60">No verses found for this ang.</p>
        <button onClick={() => navigate(-1)} className="font-sans text-saffron mt-4 block">← Back</button>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-md mx-auto mt-4 bg-parchment min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="font-sans text-saffron text-sm min-h-[44px] min-w-[44px]">← Back</button>
        <p className="font-sans text-ink/50 text-xs">{index + 1} / {total}</p>
        {isApiMode && entries.length > 0 && (
          <button
            onClick={() => { if (!isBookmarked) setShowBookmarkForm(v => !v) }}
            className={`text-xl min-h-[44px] min-w-[44px] transition-colors duration-300 ${isBookmarked ? 'text-saffron' : 'text-ink/30'}`}
          >
            🔖
          </button>
        )}
      </div>

      {isApiMode && entries.length > 0 && showBookmarkForm && (
        <div className="mb-4 bg-parchment-low rounded-xl p-4">
          <input
            type="text"
            value={bookmarkText}
            onChange={e => setBookmarkText(e.target.value)}
            placeholder="Add a note..."
            className="w-full bg-parchment-card border border-sand/15 rounded-xl px-3 py-2 font-sans text-ink text-sm mb-2 outline-none focus:border-saffron/30 transition-colors duration-300"
          />
          <button
            onClick={handleSaveBookmark}
            className="w-full bg-gradient-to-r from-saffron to-saffron-light rounded-xl py-2 text-white font-sans font-semibold text-sm min-h-[44px] transition-colors duration-300"
          >
            Save Bookmark
          </button>
        </div>
      )}

      <div className="w-full bg-sand/30 rounded-full h-1 mb-6">
        <div className="bg-saffron h-1 rounded-full transition-all duration-500" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>

      {allUnseen && (
        <p className="font-sans text-ink/50 text-xs text-center mb-3">All caught up! Reviewing from the beginning.</p>
      )}

      <StudyCard
        key={currentEntry.id}
        entry={currentEntry}
        wordData={wordData}
        onSwipeRight={handleSwipeRight}
        onSwipeLeft={handleSwipeLeft}
      />
    </div>
  )
}
```

- [ ] **Step 4: Run Study tests**

```bash
cd /Users/japgrover/sikh-learning && npm test -- --run src/pages/Study.test.tsx
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Study.tsx src/pages/Study.test.tsx
git commit -m "feat: restyle Study page; remove static mode; data-driven scripture picker with 7 sources"
```

---

## Task 8: Library Page Restyle + New Sources

**Files:**
- Modify: `src/pages/Library.tsx`
- Test: `src/pages/Library.test.tsx` (update)

**Key logic changes:**
- Remove `useCustomTextsStore` import + usage
- Remove `sarblohCustom`, `otherCustom` variables + their sections
- Remove the "+ Add New Book / Text" button
- Fix bookmark reference label (source → shortName lookup map)
- Add 5 new collapsible sections for B (628), N (128), A (1430), S (284), R (Browse button only)
- Full parchment restyle

- [ ] **Step 1: Update Library tests**

Open `src/pages/Library.test.tsx`. Update/add:

```tsx
it('does not show Sarbloh Granth section', () => {
  render(<Library />, { wrapper: RouterWrapper })
  expect(screen.queryByText(/sarbloh/i)).not.toBeInTheDocument()
})

it('does not show Custom Texts section', () => {
  render(<Library />, { wrapper: RouterWrapper })
  expect(screen.queryByText(/custom texts/i)).not.toBeInTheDocument()
})

it('does not show Add New Book button', () => {
  render(<Library />, { wrapper: RouterWrapper })
  expect(screen.queryByText(/add new/i)).not.toBeInTheDocument()
})

it('shows all 5 new source sections', () => {
  render(<Library />, { wrapper: RouterWrapper })
  expect(screen.getByText('Bhai Gurdas Ji Vaaran')).toBeInTheDocument()
  expect(screen.getByText('Bhai Nand Lal Ji Vaaran')).toBeInTheDocument()
  expect(screen.getByText('Amrit Keertan')).toBeInTheDocument()
  expect(screen.getByText('Bhai Gurdas Singh Ji Vaaran')).toBeInTheDocument()
  expect(screen.getByText('Panthic Sources & Codes of Conduct')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run Library tests to confirm baseline**

```bash
cd /Users/japgrover/sikh-learning && npm test -- --run src/pages/Library.test.tsx
```

- [ ] **Step 3: Rewrite `src/pages/Library.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBookmarksStore, type Bookmark } from '../store/bookmarks'
import { SGGS_ANG_COUNT, DG_ANG_COUNT } from '../utils/dailyPick'

const SOURCE_SHORT_NAME: Record<string, string> = {
  G: 'SGGS', D: 'DG', B: 'BGV', N: 'BNL', A: 'AK', S: 'BGSV', R: 'PS',
}

function AngBrowser({ source, totalAngs }: { source: string; totalAngs: number }) {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50
  const start = page * PAGE_SIZE + 1
  const end = Math.min(start + PAGE_SIZE - 1, totalAngs)

  return (
    <div>
      <div className="grid grid-cols-5 gap-2 mb-4">
        {Array.from({ length: end - start + 1 }, (_, i) => start + i).map(ang => (
          <button
            key={ang}
            onClick={() => navigate(`/study?source=${source}&ang=${ang}`)}
            className="bg-parchment-card rounded-lg py-2 font-sans text-sm text-ink hover:text-saffron border border-sand/15 transition-colors duration-300 min-h-[44px]"
          >
            {ang}
          </button>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="font-sans text-saffron text-sm disabled:opacity-30 min-h-[44px] px-3"
        >← Prev</button>
        <span className="font-sans text-ink/50 text-xs">Ang {start}–{end} of {totalAngs}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={end >= totalAngs}
          className="font-sans text-saffron text-sm disabled:opacity-30 min-h-[44px] px-3"
        >Next →</button>
      </div>
    </div>
  )
}

interface Section {
  id: string
  name: string
  source: string
  totalAngs: number
  browseOnly?: boolean
}

const SECTIONS: Section[] = [
  { id: 'sggs', name: 'Sri Guru Granth Sahib Ji', source: 'G', totalAngs: SGGS_ANG_COUNT },
  { id: 'dasam-granth', name: 'Dasam Granth', source: 'D', totalAngs: DG_ANG_COUNT },
  { id: 'bhai-gurdas-vaaran', name: 'Bhai Gurdas Ji Vaaran', source: 'B', totalAngs: 628 },
  { id: 'bhai-nand-lal-vaaran', name: 'Bhai Nand Lal Ji Vaaran', source: 'N', totalAngs: 128 },
  { id: 'amrit-keertan', name: 'Amrit Keertan', source: 'A', totalAngs: 1430 },
  { id: 'bhai-gurdas-singh-vaaran', name: 'Bhai Gurdas Singh Ji Vaaran', source: 'S', totalAngs: 284 },
  { id: 'panthic-sources', name: 'Panthic Sources & Codes of Conduct', source: 'R', totalAngs: 0, browseOnly: true },
]

export default function Library() {
  const navigate = useNavigate()
  const { bookmarks, removeBookmark } = useBookmarksStore()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => ({
    bookmarks: bookmarks.length > 0,
  }))

  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }))

  return (
    <div className="p-4 max-w-md mx-auto mt-4 bg-parchment min-h-screen">
      <h1 className="font-sans font-semibold text-lg text-ink mb-6">Library</h1>

      {/* Bookmarks */}
      {bookmarks.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => toggle('bookmarks')}
            className="w-full flex justify-between items-center bg-parchment-card rounded-2xl p-4 min-h-[44px] border border-sand/15"
          >
            <div className="text-left">
              <p className="font-sans font-semibold text-ink">🔖 Bookmarks</p>
              <p className="font-sans text-ink/50 text-xs">{bookmarks.length} saved</p>
            </div>
            <span className="font-sans text-saffron text-sm">{collapsed['bookmarks'] ? '▲' : '▼'}</span>
          </button>
          {collapsed['bookmarks'] && (
            <div className="mt-2 ml-2 flex flex-col gap-2">
              {bookmarks.map((bookmark: Bookmark) => (
                <div
                  key={bookmark.id}
                  className="bg-parchment-low rounded-xl p-3 relative"
                >
                  <button
                    onClick={() => removeBookmark(bookmark.id)}
                    className="absolute top-2 right-2 font-sans text-ink/40 text-xs min-h-[24px] min-w-[24px] flex items-center justify-center"
                    aria-label="Remove bookmark"
                  >
                    ✕
                  </button>
                  <button
                    onClick={() => navigate(`/study?source=${bookmark.source}&ang=${bookmark.ang}`)}
                    className="text-left w-full pr-6"
                  >
                    <p className="font-sans font-semibold text-sm text-ink">{bookmark.title}</p>
                    {bookmark.description && (
                      <p className="font-sans text-xs text-ink/60 italic mt-0.5">{bookmark.description}</p>
                    )}
                    <p className="font-sans text-[10px] text-saffron mt-1">
                      {SOURCE_SHORT_NAME[bookmark.source] ?? bookmark.source} · Ang {bookmark.ang}
                    </p>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scripture Sections */}
      {SECTIONS.map((section, i) => {
        const isOpen = collapsed[section.id]
        const isLarge = i === 0 // SGGS gets largest heading

        return (
          <div key={section.id} className="mb-4">
            <button
              onClick={() => toggle(section.id)}
              className="w-full flex justify-between items-center bg-parchment-low rounded-2xl p-4 min-h-[44px]"
            >
              <p className={`font-sans font-semibold text-ink uppercase tracking-wider ${isLarge ? 'text-base' : 'text-xs'}`}>
                {section.name}
              </p>
              <span className="font-sans text-saffron text-sm">{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <div className="mt-2 ml-2 p-3 bg-parchment-low rounded-2xl">
                {section.browseOnly ? (
                  <button
                    onClick={() => navigate(`/study?source=${section.source}&ang=1`)}
                    className="w-full bg-parchment-card rounded-lg font-sans text-sm text-saffron py-3 min-h-[44px] border border-sand/15 transition-colors duration-300"
                  >
                    Browse →
                  </button>
                ) : (
                  <AngBrowser source={section.source} totalAngs={section.totalAngs} />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run Library tests**

```bash
cd /Users/japgrover/sikh-learning && npm test -- --run src/pages/Library.test.tsx
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Library.tsx src/pages/Library.test.tsx
git commit -m "feat: restyle Library; remove Sarbloh/CustomTexts/AddText; add 5 new scripture sections"
```

---

## Task 9: Banis Page Restyle + New Browse Sections

**Files:**
- Modify: `src/pages/Banis.tsx`
- Test: `src/pages/Banis.test.tsx` (update)

**Key changes:**
- Remove the radial gradient background inline style
- SGGS section: `bg-parchment-card` with saffron accent header, `text-lg` heading
- DG section: `bg-parchment-low`, standard heading
- Add 5 new browse-only sections below DG (one per new source)
- Replace all campfire classes with parchment equivalents

- [ ] **Step 1: Update Banis tests**

Open `src/pages/Banis.test.tsx`. Add:

```tsx
it('shows browse buttons for all 5 new sources', () => {
  render(<Banis />, { wrapper: RouterWrapper })
  // New source sections should be visible
  expect(screen.getByText('Bhai Gurdas Ji Vaaran')).toBeInTheDocument()
  expect(screen.getByText('Bhai Nand Lal Ji Vaaran')).toBeInTheDocument()
  expect(screen.getByText('Amrit Keertan')).toBeInTheDocument()
  expect(screen.getByText('Bhai Gurdas Singh Ji Vaaran')).toBeInTheDocument()
  expect(screen.getByText('Panthic Sources & Codes of Conduct')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run Banis tests to confirm baseline**

```bash
cd /Users/japgrover/sikh-learning && npm test -- --run src/pages/Banis.test.tsx
```

- [ ] **Step 3: Read current Banis.tsx to see full JSX**

```bash
cat /Users/japgrover/sikh-learning/src/pages/Banis.tsx
```

You need to see the full render of bani rows and info cards to replace all campfire classes.

- [ ] **Step 4: Restyle `src/pages/Banis.tsx`**

Apply these changes throughout the file:

**Page wrapper** — remove `style={{ background: 'radial-gradient(...)' }}`, change className to `"p-4 max-w-md mx-auto min-h-screen bg-parchment"`.

**Page heading** — `text-white font-pixel text-lg` → `font-sans font-semibold text-lg text-ink`

**SGGS section button** — `bg-coal border border-[#C9A84C44]` → `bg-parchment-card border border-sand/15`. Section label `text-white font-pixel text-sm` → `font-sans font-semibold text-base text-saffron`. Bani count `text-[#8B6914] font-pixel text-[10px]` → `font-sans text-ink/50 text-xs`. Remove `boxShadow` style. Toggle arrow `text-[#C9A84C] font-pixel text-sm` → `text-saffron font-sans text-sm`.

**DG section button** — same changes as SGGS but heading uses `text-ink` instead of `text-saffron`, and wrapper uses `bg-parchment-low` instead of `bg-parchment-card`.

**Category labels** — `text-[#8B6914] font-pixel text-xs uppercase` → `font-sans text-xs text-ink/50 uppercase tracking-wider`

**Bani rows** — `bg-coal border border-[#C9A84C33]` → `bg-parchment-card border border-sand/15`. Text: `text-white font-pixel` → `font-sans text-ink`.

**Info card** — `bg-coal border border-[#C9A84C]` + glow → `bg-parchment-card rounded-2xl shadow-sm border border-sand/15`. Gurmukhi name: `font-pixel text-white` → `font-gurmukhi text-ink`. Reference label: `text-[#C9A84C] font-pixel text-xs` → `font-sans text-xs text-saffron`. Description: any `text-gray-400` → `font-sans text-sm text-ink/70`. Begin Study button: `bg-[#C9A84C] text-black` → `bg-gradient-to-r from-saffron to-saffron-light text-white rounded-full`. Bookmark button inactive: replace amber classes → `border border-sand/15 text-ink/50`. Bookmark button active: → `text-saffron border border-saffron/30`.

**Add 5 new source sections** below the DG section (outside the `(['SGGS', 'DG'] as Scripture[]).map()` call). Import `BANIS` from `'../data/banis'` (already imported). Use the 5 browse-only entries:

```tsx
{/* New Sources */}
{BANIS.filter(b => b.type === 'browse-only').map(source => (
  <div key={source.id} className="mb-4">
    <div className="bg-parchment-low rounded-xl p-4">
      <p className="font-sans font-semibold text-sm text-ink mb-1">{source.name}</p>
      <p className="font-sans text-xs text-ink/50 mb-3">{source.description}</p>
      <button
        onClick={() => navigate(`/study?source=${source.source}&ang=1`)}
        className="w-full bg-parchment-card border border-sand/15 rounded-xl font-sans text-sm text-saffron py-3 min-h-[44px] transition-colors duration-300"
      >
        Browse by Ang →
      </button>
    </div>
  </div>
))}
```

- [ ] **Step 5: Run Banis tests**

```bash
cd /Users/japgrover/sikh-learning && npm test -- --run src/pages/Banis.test.tsx
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Banis.tsx src/pages/Banis.test.tsx
git commit -m "feat: restyle Banis page to parchment; add 5 new browse-only source sections"
```

---

## Task 10: Vocab Page Restyle

**Files:**
- Modify: `src/pages/Vocab.tsx`

**Note:** No logic changes. Pure styling swap.

- [ ] **Step 1: Restyle `src/pages/Vocab.tsx`**

Apply these class replacements throughout the file:

**Page wrapper** — add `bg-parchment` to existing `p-4 max-w-md mx-auto mt-4`.

**Page heading** — `text-white font-semibold text-lg` → `font-sans font-semibold text-lg text-ink`.

**Search input** — `bg-[#1A1A1A] border border-[#2a2a2a] ... text-white ... focus:border-[#C9A84C]` → `bg-parchment-card border border-sand/15 font-sans text-ink ... focus:border-saffron/30 transition-colors duration-300 rounded-full`.

**"All" filter button** — active: `bg-[#C9A84C] text-black` → `bg-saffron text-white`. Inactive: `bg-[#1A1A1A] text-gray-400 border border-[#2a2a2a]` → `bg-parchment-low text-ink/60`.

**SCRIPTURES filter buttons** — same active/inactive treatment as "All".

**Empty state text** — `text-gray-500` → `font-sans text-ink/50`.

**Word cards** — `bg-[#1A1A1A] border border-[#2a2a2a]` → `bg-parchment-card border border-sand/15 rounded-2xl`. Word text: `font-gurmukhi text-white` → `font-gurmukhi text-lg text-ink`. Transliteration: `text-gray-400 text-xs` → `font-sans text-ink/60 text-xs`. Definition: `text-gray-500 text-xs` → `font-sans text-ink/70 text-xs`. Scripture label: `text-gray-600 text-xs` → `font-sans text-[10px] text-saffron uppercase`.

**Detail modal** — outer `bg-[#1A1A1A] border border-[#2a2a2a]` → `bg-parchment-card border border-sand/15`. Gurmukhi word: `text-white` → `text-ink`. Transliteration: `text-gray-400` → `font-sans text-ink/60`. Meaning: `text-white font-medium` → `font-sans text-ink font-medium`. Gurmukhi meaning: `text-gray-300` → `text-ink/70`. Source/date: `text-gray-600` → `font-sans text-ink/40`. Remove button: keep red border, change text `text-red-400` → keep as-is (delete is destructive, red is appropriate).

- [ ] **Step 2: Run all tests**

```bash
cd /Users/japgrover/sikh-learning && npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 3: Run full build**

```bash
cd /Users/japgrover/sikh-learning && npm run build
```

Expected: zero errors.

- [ ] **Step 4: Verify no `font-pixel` or `font-ui` references remain**

```bash
grep -r "font-pixel\|font-ui" /Users/japgrover/sikh-learning/src/
```

Expected: no output. If any remain, replace with `font-sans` (UI text) or `font-gurmukhi` (scripture).

- [ ] **Step 5: Commit**

```bash
git add src/pages/Vocab.tsx
git commit -m "feat: restyle Vocab page to Digital Parchment theme"
```

---

## Final Verification

- [ ] **Run full test suite**

```bash
cd /Users/japgrover/sikh-learning && npm test -- --run
```

Expected: all tests pass, 0 failures.

- [ ] **Run production build**

```bash
cd /Users/japgrover/sikh-learning && npm run build
```

Expected: zero TypeScript errors, zero warnings about undefined tokens.

- [ ] **Verify no campfire classes remain**

```bash
grep -r "coal\|ember\|#0D0D0D\|#1A0800\|#7B2D00\|#C9A84C\|#1A1A1A\|#2a2a2a\|Silkscreen\|font-pixel\|font-ui" /Users/japgrover/sikh-learning/src/ --include="*.tsx" --include="*.ts" --include="*.css" -l
```

Expected: no matches in `src/` (only potentially in test files or comments).
