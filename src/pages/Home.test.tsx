import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import Home from './Home'
import { useDailyFlowStore } from '../store/dailyFlow'
import { useLearningStore } from '../store/learning'
import { useLocaleStore } from '../store/locale'
import { useProgressStore } from '../store/progress'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { useLanguageStore } from '../store/language'
import { DEFAULT_NITNEM_OPTION_IDS, useNitemStore } from '../store/nitnem'
import { useOnboardingStore } from '../store/onboarding'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'

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

beforeEach(() => {
  localStorage.clear()
  useScriptureCacheStore.getState().clearAll()
  useProgressStore.setState({ streak: 0, currentSession: null, studied: [], reviewQueue: [], lastStudied: null })
  useDailyFlowStore.setState({ date: todayStamp(), completedActionIds: [] })
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
  expect(screen.getByText(/A deliberate daily space for Gurbani, meaning, and return\./i)).toBeInTheDocument()
  expect(screen.getByTestId('home-smart-search')).toBeInTheDocument()
  expect(screen.getByRole('searchbox', { name: /search paths, banis, topics, or angs/i })).toBeInTheDocument()
})

test('routes the compact learn quick link into learn', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<><Home /><LocationSpy /></>} />
        <Route path="/learn" element={<LocationSpy />} />
      </Routes>
    </MemoryRouter>
  )

  fireEvent.click(screen.getByTestId('home-open-learn'))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toBe('/learn')
  })
})

test('shows in-app matches first on home smart search and routes into learn detail', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<><Home /><LocationSpy /></>} />
        <Route path="/learn" element={<LocationSpy />} />
      </Routes>
    </MemoryRouter>
  )

  fireEvent.change(screen.getByTestId('home-smart-search-input'), { target: { value: 'stress' } })

  expect(await screen.findByText(/In the app/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /When the mind is anxious/i }))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toContain('/learn?tab=topics&topic=topic-anxiety&detail=topic')
  })
})

test('shows direct ang targets before broader search results on home', async () => {
  renderHome()

  fireEvent.change(screen.getByTestId('home-smart-search-input'), { target: { value: '12' } })

  expect(await screen.findByText(/Direct ang/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Open SGGS Ang 12/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Open DG Ang 12/i })).toBeInTheDocument()
})

test('shows today\'s pick after load', async () => {
  renderHome()
  await waitFor(() => {
    expect(screen.queryByText(/no verse available today/i)).not.toBeInTheDocument()
    const gurmukhi = document.querySelector('[lang="pa-Guru"]')
    expect(gurmukhi).toBeInTheDocument()
  })
})

test('shows the new daily actions', () => {
  renderHome()
  expect(screen.getByTestId('home-todays-path')).toBeInTheDocument()
  expect(screen.getByTestId('home-todays-path-lesson-summary')).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: /continue learn|resume reading|open today’s hukamnama/i }).length).toBeGreaterThan(0)
  expect(screen.getByText(/1 of 2 steps done/i)).toBeInTheDocument()
  expect(screen.getByText(/today.?s path/i)).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: /grow/i }).length).toBeGreaterThan(0)
  expect(screen.getAllByRole('button', { name: /review/i }).length).toBeGreaterThan(0)
  expect(screen.queryByText(/add text/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/quiz/i)).not.toBeInTheDocument()
})

test('shows active journey recommendations on home', () => {
  useLearningStore.setState({
    journeys: {
      'journey-japji-opening': {
        startedAt: new Date().toISOString(),
        completedStepIds: ['japji-foundation'],
        lastTouchedAt: new Date().toISOString(),
      },
    },
    activeJourneyId: 'journey-japji-opening',
  })

  renderHome()
  expect(screen.getAllByText(/Japji Opening Flow/i).length).toBeGreaterThan(0)
})

test('shows today’s hukamnama action', async () => {
  renderHome()
  await waitFor(() => {
    expect(screen.getAllByRole('button', { name: /open today’s hukamnama/i }).length).toBeGreaterThan(0)
  })
})

test('hides preview meanings when meaning language is off', async () => {
  useLanguageStore.setState({ meaningLanguage: 'none' })
  renderHome()
  await waitFor(() => {
    expect(screen.queryByText(/People try to deceive others/i)).not.toBeInTheDocument()
  })
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
    currentSession: { scriptureId: 'G-12', lastCardIndex: 0 }
  })
  renderHome()
  expect(screen.getAllByText(/pick up exactly where you paused/i).length).toBeGreaterThan(0)
})

test('shows dark mode toggle', () => {
  renderHome()
  const toggle = screen.getByLabelText(/switch to dark mode|switch to light mode/i)
  expect(toggle).toBeInTheDocument()
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
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<><Home /><LocationSpy /></>} />
        <Route path="/study" element={<LocationSpy />} />
      </Routes>
    </MemoryRouter>
  )

  fireEvent.click(screen.getAllByRole('button', { name: /nitnem progress/i })[0]!)
  fireEvent.click(screen.getByText('Rehras Sahib'))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toContain('/study?source=G&ang=8&startAng=8&endAng=12&bani=Rehras+Sahib&baniDbId=21&exactBani=1&baniId=rehras-sahib&sgLength=short')
  })
})

test('shows adjustable STTM length detail for supported Nitnem banis', () => {
  renderHome()

  fireEvent.click(screen.getByRole('button', { name: /customize/i }))

  expect(screen.getAllByRole('button', { name: /Rehras Sahib Adjustable length · currently Short/i }).length).toBeGreaterThan(0)
  expect(screen.getAllByRole('button', { name: /Benati Chaupai Sahib Adjustable length · currently Short/i }).length).toBeGreaterThan(0)
  expect(screen.queryByText(/BaniDB|STTM|API/i)).not.toBeInTheDocument()
})
