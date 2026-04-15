import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { vi } from 'vitest'
import Home from './Home'
import * as banidb from '../api/banidb'
import * as learnRepository from '../data/learnRepository'
import * as hukamnamaHook from '../hooks/useHukamnama'
import { useLearningStore } from '../store/learning'
import { useLocaleStore } from '../store/locale'
import { useProgressStore } from '../store/progress'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { useLanguageStore } from '../store/language'
import { DEFAULT_NITNEM_OPTION_IDS, useNitemStore } from '../store/nitnem'
import { useOnboardingStore } from '../store/onboarding'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { useThemeStore } from '../store/theme'
import { getTodayLearnSurface } from '../utils/learnExperience'
import { buildLearnDetailPath } from '../utils/learnRails'
import { buildLearnSearchPath, buildReadSearchPath } from '../utils/searchRoutes'

function renderHome() {
  return render(<MemoryRouter><Home /></MemoryRouter>)
}

function LocationSpy() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

function todayStamp() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

async function getTodaySurface() {
  const catalog = await learnRepository.loadLearnCatalog()
  return getTodayLearnSurface(catalog, todayStamp(), useLearningStore.getState().learnState)
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.documentElement.classList.remove('dark')
})

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date('2026-04-11T09:00:00.000Z'))
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  useThemeStore.setState({ dark: false })
  useScriptureCacheStore.getState().clearAll()
  useProgressStore.setState({ streak: 0, currentSession: null, studied: [], reviewQueue: [], lastStudied: null })
  useNitemStore.setState({
    completedDate: todayStamp(),
    completedIds: [],
    selectedIds: [...DEFAULT_NITNEM_OPTION_IDS],
  })
  useLearningStore.setState({
    masteredSymbols: [],
    completedLessons: [],
    practiceStreak: 0,
    streakCalendar: {},
    longestStreak: 0,
    earnedMilestoneIds: [],
    pendingMilestoneId: null,
    dailyLesson: {
      date: todayStamp(),
      steps: [
        { id: 'one', kind: 'module', title: 'Core Letters', estimatedSeconds: 120, moduleId: 'start-core-letters' },
        { id: 'two', kind: 'quick-connect', title: 'Quick connect', estimatedSeconds: 90 },
      ],
      completedStepIds: ['one'],
      generatedAt: `${todayStamp()}T00:00:00`,
      totalEstimatedSeconds: 210,
    },
    lastPracticedOn: undefined,
    totalPracticeSessions: 0,
    skills: {},
    lessonProgress: {},
    assessmentHistory: [],
    journeys: {},
    activeJourneyId: null,
    activeProgramId: 'start-reading',
    programProgress: {
      'start-reading': { currentModuleId: null, completedModuleIds: [] },
      'build-fluency': { currentModuleId: null, completedModuleIds: [] },
      'understand-gurbani': { currentModuleId: null, completedModuleIds: [] },
      'deep-study': { currentModuleId: null, completedModuleIds: [] },
    },
    queuedReviewModuleIds: [],
    placementResult: null,
    lastLearnActivity: null,
    grammarNotesSeen: [],
    masteredWordFamilyIds: [],
    themePathProgress: {},
    completedThemePathIds: [],
  })
  useLocaleStore.setState({ locale: 'en' })
  useLanguageStore.setState({
    scriptMode: 'gurmukhi',
    showTransliteration: false,
    meaningLanguage: 'en',
    larivaar: false,
    showVishraam: true,
    lineSpacing: 'relaxed',
    textAlign: 'left',
    fontSize: 22,
    englishSource: 'bdb',
  })
  useSundarGutkaLengthStore.setState({
    lengths: {
      'chaupai-sahib': 'short',
      'rehras-sahib': 'short',
      aarti: 'short',
      'kirtan-sohila': 'short',
    },
  })
  useOnboardingStore.setState({
    hasCompletedOnboarding: true,
    presentationMode: 'overlay',
    learningLevel: 'beginner',
    audience: 'adult',
    learningGoal: 'read',
  })
})

test('renders greeting', () => {
  renderHome()
  expect(screen.getByTestId('page-home')).toBeInTheDocument()
  const greeting = screen.getByRole('heading', { level: 1 })
  expect(greeting).toBeInTheDocument()
})

test('shows the new hero shell immediately', () => {
  renderHome()
  expect(screen.getByText(/^NaamRas$/)).toBeInTheDocument()
  expect(screen.getByTestId('home-hero')).toBeInTheDocument()
  expect(screen.getByTestId('home-guidance-hero')).toBeInTheDocument()
  expect(screen.getByTestId('home-guidance-skeleton')).toBeInTheDocument()
  expect(screen.getByTestId('home-smart-search')).toBeInTheDocument()
  expect(screen.getByRole('searchbox', { name: /search paths, banis, topics, or angs/i })).toBeInTheDocument()
})

test('renders the same daily guidance item that Learn resolves for the day', async () => {
  const todaySurface = await getTodaySurface()

  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<><Home /><LocationSpy /></>} />
        <Route path="/learn/*" element={<LocationSpy />} />
      </Routes>
    </MemoryRouter>
  )

  expect(await screen.findByRole('heading', { level: 2, name: todaySurface.dailyGuidance.item.title })).toBeInTheDocument()
  expect(screen.getByText(todaySurface.dailyGuidance.item.summary)).toBeInTheDocument()
  expect(screen.getByTestId('home-hukamnama-card')).toBeInTheDocument()

  fireEvent.click(screen.getByTestId('home-hero-primary-action'))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toBe(
      buildLearnDetailPath('daily-guidance', todaySurface.dailyGuidance.item.id, 'today')
    )
  })
})

test('shows in-app matches first on home smart search and routes into learn detail', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<><Home /><LocationSpy /></>} />
        <Route path="/learn/*" element={<LocationSpy />} />
      </Routes>
    </MemoryRouter>
  )

  fireEvent.change(screen.getByTestId('home-smart-search-input'), { target: { value: 'stress' } })

  expect(await screen.findByText(/In the app/i)).toBeInTheDocument()
  const inAppResults = screen.getByTestId('home-smart-search-app-results')
  const [firstResult] = within(inAppResults).getAllByRole('button')
  expect(within(firstResult).getByText(/^When the mind is anxious$/i)).toBeInTheDocument()
  fireEvent.click(firstResult)

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toContain('/learn/topics/topic-anxiety?from=topics')
  })
})

test('highlights the matching home search terms inside surfaced results', async () => {
  renderHome()

  fireEvent.change(screen.getByTestId('home-smart-search-input'), { target: { value: 'stress' } })

  const inAppResults = await screen.findByTestId('home-smart-search-app-results')
  expect(inAppResults.querySelector('[data-search-highlight="true"]')).not.toBeNull()
})

test('routes the secondary quick links to live Learn and Read destinations', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<><Home /><LocationSpy /></>} />
        <Route path="/learn/*" element={<LocationSpy />} />
        <Route path="/banis" element={<LocationSpy />} />
      </Routes>
    </MemoryRouter>
  )

  fireEvent.click(screen.getByTestId('home-open-topics'))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toBe('/learn?tab=topics')
  })
})

test('routes Browse Read from the quick links into the read archive', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<><Home /><LocationSpy /></>} />
        <Route path="/banis" element={<LocationSpy />} />
      </Routes>
    </MemoryRouter>
  )

  fireEvent.click(screen.getByTestId('home-open-read'))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toBe('/banis')
  })
})

test('continues a topical home search into Learn with the same query on enter', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<><Home /><LocationSpy /></>} />
        <Route path="/learn/*" element={<LocationSpy />} />
      </Routes>
    </MemoryRouter>
  )

  fireEvent.change(screen.getByTestId('home-smart-search-input'), { target: { value: 'stress' } })
  fireEvent.keyDown(screen.getByTestId('home-smart-search-input'), { key: 'Enter' })

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toBe(buildLearnSearchPath('stress'))
  })
})

test('shows query carry-over actions and routes read search with the same query', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<><Home /><LocationSpy /></>} />
        <Route path="/banis" element={<LocationSpy />} />
      </Routes>
    </MemoryRouter>
  )

  fireEvent.change(screen.getByTestId('home-smart-search-input'), { target: { value: 'Japji Sahib' } })

  expect(await screen.findByTestId('home-open-read-search')).toBeInTheDocument()
  fireEvent.click(screen.getByTestId('home-open-read-search'))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toBe(buildReadSearchPath({ query: 'Japji Sahib' }))
  })
})

test('shows direct ang targets before broader search results on home', async () => {
  renderHome()

  fireEvent.change(screen.getByTestId('home-smart-search-input'), { target: { value: '12' } })

  expect(await screen.findByText(/Direct ang/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Open SGGS Ang 12/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Open DG Ang 12/i })).toBeInTheDocument()
})

test('shows an inline error when Gurbani home search fails', async () => {
  vi.spyOn(banidb, 'fetchSearch').mockRejectedValue(new Error('offline'))

  renderHome()
  fireEvent.change(screen.getByTestId('home-smart-search-input'), { target: { value: 'tomato' } })

  await waitFor(() => {
    expect(screen.getByTestId('home-smart-search-error')).toBeInTheDocument()
  })
  expect(screen.queryByText(/No in-app or Gurbani matches found yet/i)).not.toBeInTheDocument()
})

test('shows a featured shabad card from Learn inside today’s path', async () => {
  renderHome()
  await waitFor(() => {
    expect(screen.getByTestId('home-todays-path-featured-shabad')).toBeInTheDocument()
    expect(screen.getByTestId('home-open-featured-shabad')).toBeInTheDocument()
  })
})

test('renders nitnem above today’s path and removes the old nitnem progress card', () => {
  renderHome()

  const nitnem = screen.getByTestId('home-nitnem-spotlight')
  const todaysPath = screen.getByTestId('home-todays-path')

  expect(nitnem.compareDocumentPosition(todaysPath) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(screen.queryByTestId('home-nitnem-progress')).not.toBeInTheDocument()
  expect(screen.getByTestId('home-nitnem-carousel')).toBeInTheDocument()
})

test('starts the active nitnem card on Japji Sahib in the default daily order', () => {
  renderHome()

  const activeCard = screen.getByTestId('home-nitnem-active-card')
  expect(within(activeCard).getByText(/Japji Sahib/i)).toBeInTheDocument()
  expect(within(activeCard).queryByText(/Jaap Sahib/i)).not.toBeInTheDocument()
})

test('keeps the active nitnem card on Japji Sahib after marking it complete', () => {
  renderHome()

  const activeCard = screen.getByTestId('home-nitnem-active-card')
  fireEvent.click(within(activeCard).getByRole('button', { name: /mark as complete/i }))

  const updatedActiveCard = screen.getByTestId('home-nitnem-active-card')
  expect(within(updatedActiveCard).getByText(/Japji Sahib/i)).toBeInTheDocument()
  expect(within(updatedActiveCard).getByRole('button', { name: /mark as incomplete/i })).toBeInTheDocument()
})

test('rebuilds today’s path around live reading and real Learn surfaces', () => {
  renderHome()

  expect(screen.getByTestId('home-todays-path')).toBeInTheDocument()
  expect(screen.getByTestId('home-todays-path-featured-shabad')).toBeInTheDocument()
  expect(screen.getByTestId('home-todays-path-learn')).toBeInTheDocument()
  expect(screen.getByTestId('home-open-continue-learning')).toBeInTheDocument()
  expect(screen.getByTestId('home-todays-path-action')).toHaveTextContent(/open today’s hukamnama/i)
  expect(screen.getByText(/today.?s path/i)).toBeInTheDocument()
  expect(screen.queryByText(/core letters/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/steps done/i)).not.toBeInTheDocument()
  expect(screen.queryByTestId('home-share-progress')).not.toBeInTheDocument()
  expect(screen.queryByText(/core actions done/i)).not.toBeInTheDocument()
})

test('keeps the lower home surface saved-only', () => {
  renderHome()

  expect(screen.getByTestId('home-saved-overview')).toBeInTheDocument()
  expect(screen.queryByTestId('home-discovery-history')).not.toBeInTheDocument()
  expect(screen.queryByText(/^In Progress$/i)).not.toBeInTheDocument()
})

test('shows today’s hukamnama action', async () => {
  renderHome()
  await waitFor(() => {
    expect(screen.getAllByRole('button', { name: /open today’s hukamnama/i }).length).toBeGreaterThan(0)
  })
})

test('shows inline fallback copy when hukamnama fails on home', () => {
  vi.spyOn(hukamnamaHook, 'useHukamnama').mockReturnValue({
    data: null,
    status: 'degraded',
    issue: { code: 'offline' },
    loading: false,
    error: 'offline',
  })

  renderHome()

  expect(screen.getByTestId('home-hukamnama-error')).toBeInTheDocument()
  expect(screen.getByText(/Couldn't load today's hukamnama right now/i)).toBeInTheDocument()
})

test('hides preview meanings when meaning language is off', async () => {
  useLanguageStore.setState({ meaningLanguage: 'none' })
  renderHome()
  await waitFor(() => {
    expect(screen.queryByText(/People try to deceive others/i)).not.toBeInTheDocument()
  })
})

test('does not show continue reading when no session', () => {
  renderHome()
  expect(screen.queryByText(/continue reading/i)).not.toBeInTheDocument()
})

test('shows continue reading when session exists', () => {
  useProgressStore.setState({
    currentSession: { scriptureId: 'G-12', lastCardIndex: 0 }
  })
  renderHome()
  expect(screen.getAllByText(/resume reading/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/Open the passage you were already working through/i).length).toBeGreaterThan(0)
})

test('keeps the new hero and search surfaces visible after switching to dark mode', async () => {
  renderHome()
  const toggle = screen.getByLabelText(/switch to dark mode|switch to light mode/i)
  fireEvent.click(toggle)

  await waitFor(() => {
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  expect(screen.getByTestId('home-guidance-hero')).toBeInTheDocument()
  expect(screen.getByTestId('home-smart-search')).toBeInTheDocument()
  expect(screen.getByTestId('home-hukamnama-card')).toBeInTheDocument()
  expect(screen.getByTestId('home-smart-search-input').previousElementSibling).toHaveClass('icon-surface')
  expect(screen.getByRole('button', { name: /customize daily nitnem|hide nitnem options/i }).querySelector('.icon-surface')).not.toBeNull()
})

test('does not embed onboarding inside the home page anymore', () => {
  useOnboardingStore.setState({
    hasCompletedOnboarding: false,
    presentationMode: 'first-run',
    learningLevel: 'beginner',
  })
  renderHome()
  expect(screen.queryByText(/shape how gurbani opens for you/i)).not.toBeInTheDocument()
})

test('opens Nitnem banis through exact BaniDB routes', async () => {
  useNitemStore.setState({
    completedDate: todayStamp(),
    completedIds: [],
    selectedIds: ['rehras-sahib'],
  })

  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<><Home /><LocationSpy /></>} />
        <Route path="/study" element={<LocationSpy />} />
      </Routes>
    </MemoryRouter>
  )

  fireEvent.click(screen.getByTestId('home-nitnem-primary-action'))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toContain('/study?source=G&ang=8&startAng=8&endAng=12&bani=Rehras+Sahib&baniDbId=21&exactBani=1&baniId=rehras-sahib&sgLength=short')
  })
})

test('shows length detail only for the four adjustable Nitnem banis and keeps the additional group clean', () => {
  renderHome()

  fireEvent.click(screen.getByRole('button', { name: /customize daily nitnem/i }))

  const customizePanel = screen.getByText('Customize Daily Nitnem').closest('.section-shell-quiet')
  expect(customizePanel).not.toBeNull()

  const panel = customizePanel as HTMLElement
  expect(within(panel).getByText('Additional')).toBeInTheDocument()
  expect(within(panel).getAllByText('Length · Short')).toHaveLength(4)
  expect(within(panel).getByText('Salok Mahalla 9')).toBeInTheDocument()
  expect(within(panel).getByText('Aarti')).toBeInTheDocument()
  expect(within(panel).getByRole('button', { name: /Salok Mahalla 9/i }).textContent).not.toMatch(/Length/i)
  expect(within(panel).getByRole('button', { name: /Aarti/i }).textContent).toMatch(/Length · Short/)
  expect(screen.queryByText(/BaniDB|STTM|API/i)).not.toBeInTheDocument()
})

test('falls back to the hukamnama-led hero when Learn fails to load', async () => {
  vi.spyOn(learnRepository, 'loadLearnCatalog').mockRejectedValue(new Error('offline'))

  renderHome()

  await waitFor(() => {
    expect(screen.getByText(/Today’s Learn guidance could not be loaded\./i)).toBeInTheDocument()
  })

  expect(screen.queryByTestId('home-hero-primary-action')).not.toBeInTheDocument()
  expect(screen.getByTestId('home-hukamnama-card')).toBeInTheDocument()
})

test('requires a second tap before resetting Nitnem selections', () => {
  useNitemStore.setState({
    completedDate: todayStamp(),
    completedIds: [],
    selectedIds: ['japji-sahib'],
  })

  renderHome()

  fireEvent.click(screen.getByRole('button', { name: /customize daily nitnem/i }))
  fireEvent.click(screen.getByTestId('home-nitnem-reset'))

  expect(screen.getByRole('button', { name: /tap again to reset/i })).toBeInTheDocument()
  expect(useNitemStore.getState().selectedIds).toEqual(['japji-sahib'])

  fireEvent.click(screen.getByRole('button', { name: /tap again to reset/i }))

  expect(useNitemStore.getState().selectedIds).toEqual([...DEFAULT_NITNEM_OPTION_IDS])
})
