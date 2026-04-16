import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { vi } from 'vitest'
import Home from './Home'
import * as learnRepository from '../data/learnRepository'
import * as hukamnamaHook from '../hooks/useHukamnama'
import { useBookmarksStore } from '../store/bookmarks'
import { useFavoritesStore } from '../store/favorites'
import { useLearningStore } from '../store/learning'
import { useLocaleStore } from '../store/locale'
import { useProgressStore } from '../store/progress'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { useLanguageStore } from '../store/language'
import { DEFAULT_NITNEM_OPTION_IDS, useNitemStore } from '../store/nitnem'
import { useOnboardingStore } from '../store/onboarding'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { useThemeStore } from '../store/theme'
import { useVocabStore } from '../store/vocab'
import { useSavedFeedbackStore } from '../store/savedFeedback'
import { getTodayLearnHomeSurface } from '../utils/learnHomeExperience'
import { buildLearnDetailPath } from '../utils/learnRails'

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
  const catalog = await learnRepository.loadLearnHomeCatalog()
  return getTodayLearnHomeSurface(catalog, todayStamp(), useLearningStore.getState().learnState)
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
  useThemeStore.getState().setThemeMode('light')
  useThemeStore.getState().setMotionMode('system')
  useSavedFeedbackStore.getState().clearSaved()
  useScriptureCacheStore.getState().clearAll()
  useBookmarksStore.setState({ bookmarks: [] })
  useFavoritesStore.setState({ favorites: [] })
  useProgressStore.setState({ streak: 0, currentSession: null, studied: [], reviewQueue: [], lastStudied: null })
  useVocabStore.setState({ vocab: [] })
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
  expect(screen.getByTestId('home-read-today')).toBeInTheDocument()
  expect(screen.queryByTestId('home-smart-search')).not.toBeInTheDocument()
  expect(screen.queryByRole('searchbox', { name: /search paths, banis, topics, or angs/i })).not.toBeInTheDocument()
})

test('puts today’s hukamnama before today’s guidance in the home hero stack', async () => {
  renderHome()

  await waitFor(() => {
    expect(screen.getByTestId('home-hukamnama-card')).toBeInTheDocument()
    expect(screen.getByTestId('home-guidance-hero')).toBeInTheDocument()
  })

  const heroStack = screen.getByTestId('home-hero').querySelector('.grid')
  const [firstCard, secondCard] = Array.from(heroStack?.children ?? [])

  expect(firstCard).toBe(screen.getByTestId('home-hukamnama-card'))
  expect(secondCard).toBe(screen.getByTestId('home-guidance-hero'))
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

  expect(await screen.findByText(todaySurface.dailyGuidance.item.title)).toBeInTheDocument()
  expect(screen.getByText(todaySurface.dailyGuidance.item.summary)).toBeInTheDocument()
  expect(screen.getByTestId('home-hukamnama-card')).toBeInTheDocument()

  fireEvent.click(screen.getByTestId('home-hero-guidance-action'))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toBe(
      buildLearnDetailPath('daily-guidance', todaySurface.dailyGuidance.item.id, 'today')
    )
  })
})

test('keeps today’s guidance action only in the hero flow', async () => {
  renderHome()

  expect(await screen.findByTestId('home-hero-guidance-action')).toBeInTheDocument()
  expect(screen.getAllByText(/open today.?s guidance/i)).toHaveLength(1)
  expect(screen.queryByTestId('home-next-guidance')).not.toBeInTheDocument()
})

test('replaces the lower duplicate cards with one read-today source browser surface', async () => {
  renderHome()

  expect(screen.getByTestId('home-read-today-source-browser-shell')).toBeInTheDocument()
  expect(screen.getByTestId('home-read-today-source-browser')).toBeInTheDocument()
  expect(screen.queryByTestId('home-next-guidance')).not.toBeInTheDocument()
  expect(screen.queryByTestId('home-next-source-browser')).not.toBeInTheDocument()
  expect(screen.queryByTestId('home-next-read')).not.toBeInTheDocument()
  expect(screen.queryByTestId('home-next-library')).not.toBeInTheDocument()
  expect(screen.getByText(/source browsing/i)).toBeInTheDocument()
})

test('shows a featured shabad card from Learn inside read today', async () => {
  renderHome()
  await waitFor(() => {
    expect(screen.getByTestId('home-read-today-featured-shabad')).toBeInTheDocument()
    expect(screen.getByTestId('home-open-featured-shabad')).toBeInTheDocument()
  })
})

test('renders nitnem above the unified read today surface', () => {
  renderHome()

  const nitnem = screen.getByTestId('home-nitnem-spotlight')
  const readToday = screen.getByTestId('home-read-today')

  expect(nitnem.compareDocumentPosition(readToday) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
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

test('rebuilds read today around one live reading and discovery surface', () => {
  renderHome()

  expect(screen.getByTestId('home-read-today')).toBeInTheDocument()
  expect(screen.getByTestId('home-read-today-featured-shabad')).toBeInTheDocument()
  expect(screen.getByTestId('home-read-today-source-browser')).toBeInTheDocument()
  expect(screen.getByTestId('home-read-today-action')).toHaveTextContent(/ardaas \+ hukamnama/i)
  expect(screen.queryByText(/today.?s path/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/today in learn/i)).not.toBeInTheDocument()
  expect(screen.queryByTestId('home-open-continue-learning')).not.toBeInTheDocument()
  expect(screen.queryByTestId('home-todays-path-learn')).not.toBeInTheDocument()
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
    expect(screen.getByTestId('home-hero-primary-action')).toHaveTextContent(/open today.?s hukamnama/i)
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

test('uses Ardaas + Hukamnama in read today instead of duplicating the hukamnama CTA when no session exists', async () => {
  renderHome()

  expect(screen.getByTestId('home-read-today-action')).toHaveTextContent(/^Ardaas \+ Hukamnama$/i)
  expect(await screen.findByTestId('home-hero-primary-action')).toHaveTextContent(/open today.?s hukamnama/i)
})

test('opens the Ardaas + Hukamnama devotional flow from read today when no session exists', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<><Home /><LocationSpy /></>} />
        <Route path="/study" element={<LocationSpy />} />
      </Routes>
    </MemoryRouter>
  )

  fireEvent.click(screen.getByTestId('home-read-today-action'))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toBe('/study?baniDbId=24&bani=Ardaas&flow=ardaas-hukamnama')
  })
})

test('shows continue reading when session exists', () => {
  useProgressStore.setState({
    currentSession: {
      scriptureId: 'G-12',
      resumePath: '/study?source=G&ang=12',
      updatedAt: '2026-04-11T09:00:00.000Z',
    }
  })
  renderHome()
  expect(screen.getAllByText(/resume reading/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/Open the passage you were already working through/i).length).toBeGreaterThan(0)
})

test('uses the deep resume path when a saved reader anchor exists', async () => {
  useProgressStore.setState({
    currentSession: {
      scriptureId: 'G-12',
      resumePath: '/study?source=G&ang=12',
      resumeVerseId: 345,
      updatedAt: '2026-04-11T09:00:00.000Z',
    },
  })

  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<><Home /><LocationSpy /></>} />
        <Route path="/study" element={<LocationSpy />} />
      </Routes>
    </MemoryRouter>
  )

  fireEvent.click(screen.getByTestId('home-read-today-action'))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toBe('/study?source=G&ang=12&resumeVerseId=345')
  })
})

test('shows real saved preview rows on home instead of vocab-only counts', async () => {
  useLearningStore.setState(state => ({
    learnState: {
      ...state.learnState,
      savedItemIds: ['topic-anxiety'],
    },
  }))
  useBookmarksStore.setState({
    bookmarks: [{
      id: 'bookmark-1',
      type: 'verse',
      title: 'Japji Sahib',
      source: 'G',
      ang: 1,
      shabadId: 50,
      verseId: 100,
      savedAt: '2026-04-11T10:00:00.000Z',
    }],
  })
  useVocabStore.setState({
    vocab: [{
      word: 'ਸਬਰ',
      transliteration: 'sabar',
      meaning_en: 'patience',
      meaning_hi: 'धैर्य',
      meaning_pa: 'ਸਬਰ',
      scripture: 'SGGS',
      sourceId: 'G-1-100',
      savedAt: '2026-04-11T11:00:00.000Z',
    }],
  })

  renderHome()

  const previewList = await screen.findByTestId('home-saved-preview-list')
  expect(within(previewList).getByText('When the mind is anxious')).toBeInTheDocument()
  expect(within(previewList).getByText('Japji Sahib')).toBeInTheDocument()
  expect(within(previewList).getByText('ਸਬਰ')).toBeInTheDocument()
  expect(screen.getByTestId('home-saved-preview-learn')).toBeInTheDocument()
  expect(screen.getByTestId('home-saved-preview-passage')).toBeInTheDocument()
  expect(screen.getByTestId('home-saved-preview-vocab')).toBeInTheDocument()
  expect(screen.getByTestId('home-saved-metrics')).toHaveTextContent('1')
})

test('uses links and shared focus styling for home navigation surfaces', async () => {
  useLearningStore.setState(state => ({
    learnState: {
      ...state.learnState,
      savedItemIds: ['topic-anxiety'],
    },
  }))

  renderHome()

  const heroAction = await screen.findByTestId('home-hero-primary-action')
  const guidanceAction = screen.getByTestId('home-hero-guidance-action')
  const readTodayAction = screen.getByTestId('home-read-today-action')
  const featuredShabadAction = await screen.findByTestId('home-open-featured-shabad')
  const savedPreview = await screen.findByTestId('home-saved-preview-learn')

  expect(heroAction.tagName).toBe('A')
  expect(guidanceAction.tagName).toBe('A')
  expect(readTodayAction.tagName).toBe('A')
  expect(featuredShabadAction.tagName).toBe('A')
  expect(savedPreview.tagName).toBe('A')
  expect(heroAction).toHaveClass('interactive-focus', 'interactive-pill-link')
  expect(guidanceAction).toHaveClass('interactive-focus', 'interactive-pill-link')
  expect(readTodayAction).toHaveClass('interactive-focus', 'interactive-pill-link')
  expect(featuredShabadAction).toHaveClass('interactive-focus', 'interactive-pill-link')
  expect(savedPreview).toHaveClass('interactive-focus', 'interactive-card-link')
})

test('restores a direct light-dark toggle on the home header', () => {
  renderHome()

  const toggle = screen.getByTestId('home-theme-toggle')
  expect(useThemeStore.getState().themeMode).toBe('light')

  fireEvent.click(toggle)
  expect(useThemeStore.getState().themeMode).toBe('dark')

  fireEvent.click(screen.getByTestId('home-theme-toggle'))
  expect(useThemeStore.getState().themeMode).toBe('light')
})

test('highlights the matching saved preview row after a recent save', async () => {
  useLearningStore.setState(state => ({
    learnState: {
      ...state.learnState,
      savedItemIds: ['topic-anxiety'],
    },
  }))
  useSavedFeedbackStore.setState({
    lastSaved: {
      kind: 'learn',
      targetId: 'topic-anxiety',
      surfacedAt: '2026-04-11T11:00:00.000Z',
    },
  })

  renderHome()

  const previewRow = await screen.findByTestId('home-saved-preview-learn')

  expect(previewRow).toHaveClass('saved-feedback-highlight')
  expect(within(previewRow).getByText(/Saved just now/i)).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent(/Learn save added to the shelf/i)
})

test('keeps the new hero and read-today surfaces visible in dark mode', async () => {
  useThemeStore.getState().setThemeMode('dark')
  renderHome()

  await waitFor(() => {
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  expect(screen.getByTestId('home-guidance-hero')).toBeInTheDocument()
  expect(screen.getByTestId('home-read-today')).toBeInTheDocument()
  expect(screen.getByTestId('home-theme-toggle')).toBeInTheDocument()
  expect(screen.getByTestId('home-hukamnama-card')).toBeInTheDocument()
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
  vi.spyOn(learnRepository, 'loadLearnHomeCatalog').mockRejectedValue(new Error('offline'))

  renderHome()

  await waitFor(() => {
    expect(screen.getByText(/Today’s Learn guidance could not be loaded\./i)).toBeInTheDocument()
  })

  expect(screen.getByTestId('home-hukamnama-card')).toBeInTheDocument()
  expect(screen.getByTestId('home-hero-primary-action')).toBeInTheDocument()
  expect(screen.queryByTestId('home-hero-guidance-action')).not.toBeInTheDocument()
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
