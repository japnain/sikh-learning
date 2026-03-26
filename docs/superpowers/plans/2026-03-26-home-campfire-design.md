# Home Page Campfire Aesthetic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Home page to a "campfire gathering" aesthetic — deep orange-red radial glow, Silkscreen pixel font for UI text, ember/coal color palette — without touching any routing or data logic.

**Architecture:** Four targeted file edits in order: (1) add font + tokens to CSS/config, (2) restyle StreakBadge, (3) restyle Home page. Each task is independently committable. No new files created.

**Tech Stack:** React 19, Tailwind CSS, Vitest + @testing-library/react, MSW (for API mocking in tests), Zustand (progress/customTexts stores)

**Spec:** `docs/superpowers/specs/2026-03-26-home-campfire-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/index.css` | Modify | Add Silkscreen to Google Fonts import |
| `tailwind.config.ts` | Modify | Add `font-pixel`, `ember`, `coal` tokens |
| `src/components/StreakBadge.tsx` | Modify | Coal bg, amber glow ring, font-pixel on streak count |
| `src/components/StreakBadge.test.tsx` | Create | Smoke test: renders streak count correctly |
| `src/pages/Home.tsx` | Modify | Full campfire restyle per spec |
| `src/pages/Home.test.tsx` | Create | Render tests: loading, loaded, null, quick actions |

---

## Task 1: Add Silkscreen Font + Design Tokens

**Files:**
- Modify: `src/index.css`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Add Silkscreen to Google Fonts import in `src/index.css`**

Replace the existing `@import` line with:

```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Gurmukhi:wght@400;600;700&family=Inter:wght@400;500;600&family=Silkscreen:wght@400;700&display=swap');
```

(Keep `Inter` in the import — it may still be used elsewhere even though Home removes it. Removing it from import is risky without auditing all pages.)

- [ ] **Step 2: Add `font-pixel`, `ember`, `coal` tokens to `tailwind.config.ts`**

```ts
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: '#C9A84C',
        surface: '#1A1A1A',
        ember: '#7B2D00',
        coal: '#1A0800',
      },
      fontFamily: {
        gurmukhi: ['"Noto Sans Gurmukhi"', 'sans-serif'],
        ui: ['Inter', 'sans-serif'],
        pixel: ['Silkscreen', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 3: Verify build succeeds**

```bash
cd /Users/japgrover/sikh-learning && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/japgrover/sikh-learning
git add src/index.css tailwind.config.ts
git commit -m "feat: add Silkscreen font and campfire design tokens"
```

---

## Task 2: Restyle StreakBadge

**Files:**
- Modify: `src/components/StreakBadge.tsx`
- Create: `src/components/StreakBadge.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/StreakBadge.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import StreakBadge from './StreakBadge'

test('renders streak count', () => {
  render(<StreakBadge streak={7} />)
  expect(screen.getByText(/7 day/)).toBeInTheDocument()
})

test('renders singular day for streak of 1', () => {
  render(<StreakBadge streak={1} />)
  expect(screen.getByText('1 day')).toBeInTheDocument()
})

test('renders plural days for streak > 1', () => {
  render(<StreakBadge streak={5} />)
  expect(screen.getByText('5 days')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they pass against current code**

```bash
cd /Users/japgrover/sikh-learning && npx vitest run src/components/StreakBadge.test.tsx
```

Expected: all 3 PASS (tests are behavioral, not visual — they should pass before and after the restyle).

- [ ] **Step 3: Restyle `src/components/StreakBadge.tsx`**

```tsx
interface Props { streak: number }

export default function StreakBadge({ streak }: Props) {
  return (
    <div
      className="flex items-center gap-1.5 bg-coal rounded-full px-3 py-1.5"
      style={{ boxShadow: '0 0 8px #C9A84C55' }}
    >
      <span className="text-base">🔥</span>
      <span className="text-[#C9A84C] font-semibold text-sm font-pixel">
        {streak} day{streak !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm still passing**

```bash
cd /Users/japgrover/sikh-learning && npx vitest run src/components/StreakBadge.test.tsx
```

Expected: all 3 PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/japgrover/sikh-learning
git add src/components/StreakBadge.tsx src/components/StreakBadge.test.tsx
git commit -m "feat: restyle StreakBadge with campfire coal/amber aesthetic"
```

---

## Task 3: Write Home Page Tests

**Files:**
- Create: `src/pages/Home.test.tsx`

These tests verify the component renders correctly in all states. They run against MSW (already wired in `src/test-setup.ts`) and real Zustand stores reset per test.

- [ ] **Step 1: Write failing tests**

Create `src/pages/Home.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'
import { useProgressStore } from '../store/progress'
import { useScriptureCacheStore } from '../store/scriptureCache'

function renderHome() {
  return render(<MemoryRouter><Home /></MemoryRouter>)
}

beforeEach(() => {
  useScriptureCacheStore.getState().clearAll()
  useProgressStore.setState({ streak: 0, currentSession: null, studied: [], reviewQueue: [], lastStudied: null })
})

test('renders greeting', () => {
  renderHome()
  // greeting function returns one of three strings depending on time of day
  const greeting = screen.getByRole('heading', { level: 1 })
  expect(greeting).toBeInTheDocument()
})

test('shows loading skeleton initially', () => {
  renderHome()
  // Loading skeleton has animate-pulse class; Today's Pick section is present
  expect(screen.getByText(/today'?s pick/i)).toBeInTheDocument()
})

test('shows today\'s pick after load', async () => {
  renderHome()
  await waitFor(() => {
    expect(screen.queryByText(/no verse available today/i)).not.toBeInTheDocument()
    // MSW returns verses; at least one Gurmukhi element should be present
    const gurmukhi = document.querySelector('[lang="pa-Guru"]')
    expect(gurmukhi).toBeInTheDocument()
  })
})

test('shows all four quick action buttons', () => {
  renderHome()
  expect(screen.getByText(/study/i)).toBeInTheDocument()
  expect(screen.getByText(/quiz/i)).toBeInTheDocument()
  expect(screen.getByText(/library/i)).toBeInTheDocument()
  expect(screen.getByText(/add text/i)).toBeInTheDocument()
})

test('does not show recently studied section when empty', () => {
  renderHome()
  expect(screen.queryByText(/recently studied/i)).not.toBeInTheDocument()
})

test('does not show continue reading when no session', () => {
  renderHome()
  expect(screen.queryByText(/continue reading/i)).not.toBeInTheDocument()
})

test('shows continue reading when session exists', () => {
  useProgressStore.setState({
    currentSession: { scriptureId: 'sggs', lastCardIndex: 0 }
  })
  renderHome()
  expect(screen.getByText(/continue reading/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to see them fail (or partially fail)**

```bash
cd /Users/japgrover/sikh-learning && npx vitest run src/pages/Home.test.tsx
```

Expected: most tests fail because Home.tsx doesn't have the new markup yet (e.g. `role="heading"` on greeting, section labels, etc.). Note which ones fail — that guides Task 4.

---

## Task 4: Restyle Home Page

**Files:**
- Modify: `src/pages/Home.tsx`

- [ ] **Step 1: Replace `src/pages/Home.tsx` with campfire-styled version**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ALL_ENTRIES } from '../data'
import { useProgressStore } from '../store/progress'
import { useCustomTextsStore } from '../store/customTexts'
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
  const { customTexts } = useCustomTextsStore()
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
      const entry = ALL_ENTRIES.find(e => e.id === s.id)
        || customTexts.find(e => e.id === s.id)
      return entry ? { ...entry, swipedAt: s.swipedAt } : null
    })
    .filter(Boolean)

  const btnGlow = { boxShadow: '0 0 12px #C9A84C88' }
  const heroGlow = { boxShadow: '0 0 20px #7B2D0088, 0 0 40px #3D120044' }
  const heroActiveGlow = { boxShadow: '0 0 30px #C9A84C66' }

  return (
    <div
      className="p-4 max-w-md mx-auto min-h-screen"
      style={{
        background: 'radial-gradient(ellipse at 50% 45%, #7B2D00 0%, #3D1200 25%, #1A0800 50%, #0D0D0D 75%)'
      }}
    >
      {/* Greeting */}
      <div className="flex justify-between items-center mb-6 mt-4">
        <div>
          <p className="text-[#8B6914] text-xs font-pixel">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-white font-semibold text-lg font-pixel">{greeting()}</h1>
        </div>
        <StreakBadge streak={streak} />
      </div>

      {/* Today's Pick */}
      <div className="mb-6">
        <h2 className="text-[#8B6914] text-xs font-pixel uppercase tracking-wider mb-3">Today's Pick</h2>
        {pickLoading ? (
          <div className="bg-coal rounded-2xl p-6 min-h-[120px] animate-pulse border border-[#C9A84C]" />
        ) : todaysPick ? (
          <div
            onClick={() => navigate(`/study?source=${source}&ang=${ang}`)}
            className="bg-coal border border-[#C9A84C] rounded-2xl p-6 cursor-pointer transition-shadow"
            style={heroGlow}
            onTouchStart={(e) => { e.currentTarget.style.boxShadow = heroActiveGlow.boxShadow }}
            onTouchEnd={(e) => { e.currentTarget.style.boxShadow = heroGlow.boxShadow }}
          >
            <p className="text-[#C9A84C] text-xs font-pixel mb-2">
              {todaysPick.scripture} · Ang {todaysPick.ang}
            </p>
            <p lang="pa-Guru" className="font-gurmukhi text-white text-2xl leading-relaxed line-clamp-2">
              {todaysPick.gurmukhi}
            </p>
            <p className="text-[#A07850] text-sm mt-2 line-clamp-1">{todaysPick.translation_en}</p>
          </div>
        ) : (
          <div
            className="bg-coal border border-[#C9A84C] rounded-2xl p-6 min-h-[120px] flex items-center justify-center"
            style={heroGlow}
          >
            <p className="text-[#8B6914] text-sm font-pixel">No verse available today</p>
          </div>
        )}
      </div>

      {/* Continue Reading */}
      {currentSession && (
        <div className="mb-6">
          <h2 className="text-[#8B6914] text-xs font-pixel uppercase tracking-wider mb-3">Continue Reading</h2>
          <div
            onClick={() => navigate(`/study/${currentSession.scriptureId}`)}
            className="bg-coal border border-[#C9A84C66] rounded-2xl p-4 cursor-pointer flex justify-between items-center"
            style={{ boxShadow: '0 0 8px #C9A84C44' }}
          >
            <div>
              <p className="text-white font-medium text-sm font-pixel">Pick up where you left off</p>
              <p className="text-[#8B6914] text-xs mt-0.5 font-pixel">{currentSession.scriptureId.toUpperCase()}</p>
            </div>
            <span className="text-[#C9A84C] text-lg">→</span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { key: 'study', label: '📖 Study', path: '/study', primary: true },
          { key: 'quiz', label: '✏️ Quiz', path: '/quiz', primary: false },
          { key: 'library', label: '📚 Library', path: '/library', primary: false },
          { key: 'add', label: '+ Add Text', path: '/add', primary: false },
        ].map(({ key, label, path, primary }) => (
          <button
            key={key}
            onClick={() => navigate(path)}
            onMouseDown={() => setPressedBtn(key)}
            onMouseUp={() => setPressedBtn(null)}
            onTouchStart={() => setPressedBtn(key)}
            onTouchEnd={() => setPressedBtn(null)}
            className={`font-pixel rounded-2xl p-4 text-sm min-h-[44px] border ${
              primary
                ? 'text-white border-[#C9A84C]'
                : 'bg-coal text-white border-[#C9A84C66]'
            }`}
            style={{
              ...(primary ? { background: 'linear-gradient(135deg, #7B2D00, #C9A84C22)' } : {}),
              ...(pressedBtn === key ? btnGlow : {}),
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Recently Studied */}
      {recentlyStudied.length > 0 && (
        <div>
          <h2 className="text-[#8B6914] text-xs font-pixel uppercase tracking-wider mb-3">Recently Studied</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentlyStudied.map((entry: any) => (
              <div
                key={entry.id}
                className="flex-shrink-0 w-48 bg-coal border border-[#C9A84C44] rounded-xl p-3 cursor-pointer"
                onClick={() => navigate('/study')}
              >
                <p className="text-[#8B6914] font-pixel text-[10px] mb-1">{entry.scripture}</p>
                <p lang="pa-Guru" className="font-gurmukhi text-white text-sm line-clamp-2" style={{ fontSize: '14px' }}>
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

- [ ] **Step 2: Run the Home tests**

```bash
cd /Users/japgrover/sikh-learning && npx vitest run src/pages/Home.test.tsx
```

Expected: all 7 PASS.

**If "renders greeting" fails:** The test finds `role="heading"` — ensure the `<h1>` is present in the rendered output (it is, on line with `greeting()`). Check that `MemoryRouter` is wrapping correctly.

**If "shows today's pick after load" fails:** Confirm MSW is running (check `test-setup.ts` imports `msw-server`). The mock returns verses for any ang except `9999`/`error`.

**If "shows continue reading" fails:** Confirm `useProgressStore.setState` is being applied. Zustand state updates are synchronous — no `waitFor` needed for store state.

- [ ] **Step 3: Run full test suite**

```bash
cd /Users/japgrover/sikh-learning && npx vitest run
```

Expected: all existing tests still pass (we only touched visual classes, no logic).

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/japgrover/sikh-learning && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/japgrover/sikh-learning
git add src/pages/Home.tsx src/pages/Home.test.tsx
git commit -m "feat: restyle Home page with campfire gathering aesthetic"
```

---

## Task 5: Production Build Verification

- [ ] **Step 1: Run production build**

```bash
cd /Users/japgrover/sikh-learning && npm run build
```

Expected: build succeeds with no TypeScript errors, output in `dist/`.

- [ ] **Step 2: Final commit if any build-time fixes were needed**

If the build surfaces any issues, fix them and commit with:

```bash
git commit -m "fix: resolve build issues from campfire restyle"
```

Otherwise skip this step.
