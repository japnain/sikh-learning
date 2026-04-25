import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { vi } from 'vitest'
import Home from './Home'
import * as learnRepository from '../data/learnRepository'
import * as learnHomeCatalogHook from '../hooks/useLearnHomeCatalog'
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

function buildReadyHukamnama(): ReturnType<typeof hukamnamaHook.useHukamnama> {
  return {
    data: {
      date: '2026-04-11',
      ang: 12,
      source: 'G',
      shabadId: 101,
      entry: {
        id: 'hukamnama-entry-1',
        scripture: 'Sri Guru Granth Sahib Ji',
        ang: 12,
        raag: 'Raag Asa',
        gurmukhi: 'ਹਉਮੈ ਨਾਵੈ ਨਾਲਿ ਵਿਰੋਧੁ ਹੈ ਦੁਇ ਨ ਵਸਹਿ ਇਕ ਠਾਇ ॥',
        transliteration: 'haumai naavai naal virodh hai dui na vaseh ik thaai',
        translation_en: 'Ego and the Naam cannot live together in the same place.',
        translation_hi: 'हउमै और नाम एक ही स्थान में साथ नहीं रह सकते।',
        translation_pa: 'ਹਉਮੈ ਅਤੇ ਨਾਮ ਇਕੋ ਥਾਂ ਇਕੱਠੇ ਨਹੀਂ ਵੱਸਦੇ।',
        words: [],
        lines: [{
          id: 'hukamnama-line-1',
          gurmukhi: 'ਹਉਮੈ ਨਾਵੈ ਨਾਲਿ ਵਿਰੋਧੁ ਹੈ ਦੁਇ ਨ ਵਸਹਿ ਇਕ ਠਾਇ ॥',
          translation_en: 'Ego and the Naam cannot live together in the same place.',
          translation_hi: 'हउमै और नाम एक ही स्थान में साथ नहीं रह सकते।',
          translation_pa: 'ਹਉਮੈ ਅਤੇ ਨਾਮ ਇਕੋ ਥਾਂ ਇਕੱਠੇ ਨਹੀਂ ਵੱਸਦੇ।',
          transliteration: 'haumai naavai naal virodh hai dui na vaseh ik thaai',
          isHeader: false,
        }],
      },
    },
    status: 'ready',
    issue: null,
    loading: false,
    error: null,
  } as unknown as ReturnType<typeof hukamnamaHook.useHukamnama>
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

beforeEach(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date('2026-04-11T09:00:00.000Z'))
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  useThemeStore.setState({ dark: false })
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
    completionTrackingEnabled: false,
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
  const readyLearnHomeCatalog = await learnRepository.loadLearnHomeCatalog()
  vi.spyOn(learnHomeCatalogHook, 'default').mockReturnValue({
    catalog: readyLearnHomeCatalog,
    status: 'ready',
    issue: null,
    loading: false,
    error: null,
  })
  vi.spyOn(hukamnamaHook, 'useHukamnama').mockReturnValue(buildReadyHukamnama())
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
  expect(screen.queryByTestId('home-guidance-skeleton')).not.toBeInTheDocument()
  expect(screen.getByTestId('home-read-today')).toBeInTheDocument()
  expect(screen.queryByTestId('home-smart-search')).not.toBeInTheDocument()
  expect(screen.queryByRole('searchbox', { name: /search paths, banis, topics, or angs/i })).not.toBeInTheDocument()
})

test('composes the daily ritual surface with compact action rail', async () => {
  renderHome()

  const room = screen.getByTestId('home-daily-reading-room')
  const hero = screen.getByTestId('home-hero')
  const rail = within(hero).getByTestId('home-reading-room-path')

  expect(within(hero).getByText(/^NaamRas$/)).toBeInTheDocument()
  expect(within(rail).getByText(/^Read$/i)).toBeInTheDocument()
  expect(within(rail).getByText(/^Learn$/i)).toBeInTheDocument()
  expect(within(rail).getByText(/^Nitnem$/i)).toBeInTheDocument()
  expect(within(room).getByTestId('home-hukamnama-card')).toBeInTheDocument()
  expect(within(room).queryByTestId('home-guidance-hero')).not.toBeInTheDocument()
  expect(screen.getByTestId('home-guidance-hero')).toBeInTheDocument()
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

  const guidanceHero = screen.getByTestId('home-guidance-hero')
  expect(await within(guidanceHero).findByText(todaySurface.dailyGuidance.item.title)).toBeInTheDocument()
  expect(within(guidanceHero).getByText(todaySurface.dailyGuidance.item.summary)).toBeInTheDocument()
  expect(screen.getByTestId('home-hukamnama-card')).toBeInTheDocument()

  fireEvent.click(screen.getByTestId('home-hero-guidance-action'))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toBe(
      buildLearnDetailPath('daily-guidance', todaySurface.dailyGuidance.item.id, 'today')
    )
  })
})

test('keeps saved content out of the home top action area', async () => {
  useLearningStore.setState(state => ({
    ...state,
    learnState: {
      ...state.learnState,
      savedItemIds: ['topic-anxiety'],
    },
  }))

  renderHome()

  expect(await screen.findByTestId('home-hero-guidance-action')).toBeInTheDocument()
  expect(within(screen.getByTestId('home-hero')).queryByText(/when the mind is anxious/i)).not.toBeInTheDocument()
  expect(within(screen.getByTestId('home-hero')).queryByTestId(/home-saved-preview/i)).not.toBeInTheDocument()
  expect(screen.queryByTestId('home-next-best-action')).not.toBeInTheDocument()
})

test('keeps source browsing off home so Read owns the bottom source dropdown', async () => {
  renderHome()

  expect(screen.queryByTestId('home-read-today-source-browser-shell')).not.toBeInTheDocument()
  expect(screen.queryByTestId('home-read-today-source-browser')).not.toBeInTheDocument()
  expect(screen.queryByTestId('home-next-guidance')).not.toBeInTheDocument()
  expect(screen.queryByTestId('home-next-source-browser')).not.toBeInTheDocument()
  expect(screen.queryByTestId('home-next-read')).not.toBeInTheDocument()
  expect(screen.queryByTestId('home-next-library')).not.toBeInTheDocument()
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
  expect(screen.queryByTestId('home-nitnem-carousel')).not.toBeInTheDocument()
  expect(screen.getByTestId('home-nitnem-primary-action')).toBeInTheDocument()
  expect(screen.queryByText(/daily banis complete/i)).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /mark as complete/i })).not.toBeInTheDocument()
})

test('starts the active nitnem card on Japji Sahib in the default daily order', () => {
  renderHome()

  const activeCard = screen.getByTestId('home-nitnem-active-card')
  expect(within(activeCard).getAllByText(/Japji Sahib/i).length).toBeGreaterThan(0)
  expect(screen.getByTestId('home-nitnem-primary-action')).toHaveAttribute('href', expect.stringContaining('bani=Japji+Sahib'))
})

test('keeps Daily Nitnem completion controls out of Home', () => {
  renderHome()

  const activeCard = screen.getByTestId('home-nitnem-active-card')
  expect(within(activeCard).getAllByText(/Japji Sahib/i).length).toBeGreaterThan(0)
  expect(within(activeCard).queryByRole('button', { name: /mark as complete/i })).not.toBeInTheDocument()
  expect(within(activeCard).queryByText(/0 \/ 7/i)).not.toBeInTheDocument()
  expect(screen.getByTestId('home-nitnem-manage')).toHaveAttribute('href', '/more#daily-nitnem')
})

test('rebuilds read today around one live reading and discovery surface', () => {
  renderHome()

  expect(screen.getByTestId('home-read-today')).toBeInTheDocument()
  expect(screen.getByTestId('home-read-today-featured-shabad')).toBeInTheDocument()
  expect(screen.queryByTestId('home-read-today-source-browser')).not.toBeInTheDocument()
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
  expect(screen.getByTestId('home-hukamnama-card')).toBeInTheDocument()
  expect(screen.getByTestId('home-hero-primary-action')).toHaveTextContent(/open today.?s hukamnama/i)
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

test('does not show a resume reading card when a session exists', async () => {
  useProgressStore.setState({
    currentSession: {
      scriptureId: 'G-12',
      resumePath: '/study?source=G&ang=12',
      updatedAt: '2026-04-11T09:00:00.000Z',
    }
  })

  renderHome()

  expect(screen.queryByRole('heading', { name: /resume reading/i })).not.toBeInTheDocument()
  expect(screen.queryByText(/Open the passage you were already working through/i)).not.toBeInTheDocument()
})

test('keeps review items out of the top action area while preserving the saved shelf', async () => {
  useLearningStore.setState(state => ({
    ...state,
    learnState: {
      ...state.learnState,
      savedItemIds: [],
    },
  }))
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

  expect(screen.queryByTestId('home-next-best-action')).not.toBeInTheDocument()
  expect(await screen.findByTestId('home-saved-overview')).toBeInTheDocument()
  expect(screen.getByTestId('home-saved-preview-vocab')).toHaveAttribute('href', '/vocab')
})

test('does not promote saved revisits into the top home surface', async () => {
  useLearningStore.setState(state => ({
    ...state,
    learnState: {
      ...state.learnState,
      savedItemIds: ['topic-anxiety'],
    },
  }))
  useVocabStore.setState({ vocab: [] })

  renderHome()

  expect(screen.queryByTestId('home-next-best-action')).not.toBeInTheDocument()
  const savedPreview = await screen.findByTestId('home-saved-preview-learn')
  expect(savedPreview).toHaveTextContent(/when the mind is anxious/i)
  expect(savedPreview.getAttribute('href')).toMatch(/\/learn\/topics\/topic-anxiety\?from=saved/)
})

test('keeps guidance singular when it would otherwise duplicate the hero on home', async () => {
  useLearningStore.setState(state => ({
    ...state,
    learnState: {
      ...state.learnState,
      savedItemIds: [],
    },
  }))
  useVocabStore.setState({ vocab: [] })

  const todaySurface = await getTodaySurface()

  renderHome()

  expect(screen.queryByTestId('home-next-best-action')).not.toBeInTheDocument()
  const guidanceHero = await screen.findByTestId('home-guidance-hero')
  expect(within(guidanceHero).getByText(todaySurface.dailyGuidance.item.title)).toBeInTheDocument()
  expect(screen.getAllByTestId('home-hero-guidance-action')).toHaveLength(1)
})

test('uses Ardaas + Hukamnama in read today instead of duplicating the hukamnama CTA when no session exists', async () => {
  renderHome()

  expect(screen.getByTestId('home-read-today-action')).toHaveTextContent(/^Ardaas \+ Hukamnama$/i)
  expect(screen.getByTestId('home-hero-primary-action')).toHaveTextContent(/open today.?s hukamnama/i)
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

test('keeps Ardaas + Hukamnama in read today even when a session exists', async () => {
  useProgressStore.setState({
    currentSession: {
      scriptureId: 'G-12',
      resumePath: '/study?source=G&ang=12',
      updatedAt: '2026-04-11T09:00:00.000Z',
    }
  })
  renderHome()
  expect(screen.getByTestId('home-read-today-action')).toHaveTextContent(/^Ardaas \+ Hukamnama$/i)
  expect(screen.queryByRole('heading', { name: /resume reading/i })).not.toBeInTheDocument()
  expect(screen.queryByText(/Open the passage you were already working through/i)).not.toBeInTheDocument()
})

test('opens the Ardaas + Hukamnama devotional flow from read today even when a session exists', async () => {
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
    expect(screen.getByTestId('location').textContent).toBe('/study?baniDbId=24&bani=Ardaas&flow=ardaas-hukamnama')
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

test('home saved passage preview reopens broken partial bookmark routes on canonical ang paths', async () => {
  useBookmarksStore.setState({
    bookmarks: [{
      id: 'bookmark-1',
      type: 'shabad',
      title: 'Ang 2 bookmark',
      source: 'G',
      ang: 2,
      shabadId: 50,
      savedAt: '2026-04-11T10:00:00.000Z',
    }],
  })

  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<><Home /><LocationSpy /></>} />
        <Route path="/study" element={<LocationSpy />} />
      </Routes>
    </MemoryRouter>
  )

  fireEvent.click(await screen.findByTestId('home-saved-preview-passage'))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toBe('/study?source=G&ang=2')
  })
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
  expect(useThemeStore.getState().dark).toBe(false)

  fireEvent.click(toggle)
  expect(useThemeStore.getState().dark).toBe(true)

  fireEvent.click(screen.getByTestId('home-theme-toggle'))
  expect(useThemeStore.getState().dark).toBe(false)
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
  useThemeStore.getState().toggle()
  renderHome()

  await waitFor(() => {
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  expect(screen.getByTestId('home-guidance-hero')).toBeInTheDocument()
  expect(screen.getByTestId('home-read-today')).toBeInTheDocument()
  expect(screen.getByTestId('home-theme-toggle')).toBeInTheDocument()
  expect(screen.getByTestId('home-hukamnama-card')).toBeInTheDocument()
  expect(screen.getByTestId('home-nitnem-manage')).toBeInTheDocument()
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

test('moves Daily Nitnem customization out of Home', () => {
  renderHome()

  expect(screen.getByTestId('home-nitnem-manage')).toHaveAttribute('href', '/more#daily-nitnem')
  expect(document.querySelector('#home-nitnem-panel')).toBeNull()
  expect(screen.queryByTestId('home-nitnem-reset')).not.toBeInTheDocument()
  expect(screen.queryByText(/BaniDB|STTM|API/i)).not.toBeInTheDocument()
})

test('falls back to the hukamnama-led hero when Learn fails to load', async () => {
  vi.spyOn(learnHomeCatalogHook, 'default').mockReturnValue({
    catalog: null,
    status: 'degraded',
    issue: { code: 'offline', detail: 'offline' },
    loading: false,
    error: 'offline',
  })

  renderHome()

  await waitFor(() => {
    expect(screen.getByText(/Today’s Learn guidance could not be loaded\./i)).toBeInTheDocument()
  })

  expect(screen.getByTestId('home-hukamnama-card')).toBeInTheDocument()
  expect(screen.getByTestId('home-hero-primary-action')).toBeInTheDocument()
  expect(screen.queryByTestId('home-hero-guidance-action')).not.toBeInTheDocument()
})

test('Home does not own Daily Nitnem reset controls', () => {
  useNitemStore.setState({
    completedDate: todayStamp(),
    completedIds: [],
    selectedIds: ['japji-sahib'],
  })

  renderHome()

  expect(screen.queryByTestId('home-nitnem-reset')).not.toBeInTheDocument()
  expect(screen.getByTestId('home-nitnem-manage')).toBeInTheDocument()
  expect(useNitemStore.getState().selectedIds).toEqual(['japji-sahib'])
})
