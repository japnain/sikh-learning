import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'
import { useDailyFlowStore } from '../store/dailyFlow'
import { useLearningStore } from '../store/learning'
import { useLocaleStore } from '../store/locale'
import { useProgressStore } from '../store/progress'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { useLanguageStore } from '../store/language'
import { useOnboardingStore } from '../store/onboarding'

function renderHome() {
  return render(<MemoryRouter><Home /></MemoryRouter>)
}

beforeEach(() => {
  useScriptureCacheStore.getState().clearAll()
  useProgressStore.setState({ streak: 0, currentSession: null, studied: [], reviewQueue: [], lastStudied: null })
  useDailyFlowStore.setState({ date: '2026-04-06', completedActionIds: [] })
  useLearningStore.setState({
    masteredSymbols: [],
    completedLessons: [],
    practiceStreak: 0,
    lastPracticedOn: undefined,
    totalPracticeSessions: 0,
    skills: {},
    lessonProgress: {},
    assessmentHistory: [],
    journeys: {},
    activeJourneyId: null,
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
  const greeting = screen.getByRole('heading', { level: 1 })
  expect(greeting).toBeInTheDocument()
})

test('shows the new hero shell immediately', () => {
  renderHome()
  expect(screen.getByText(/Read Gurbani daily\. Understand it better\. Grow into it steadily\./i)).toBeInTheDocument()
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
  expect(screen.getAllByRole('button', { name: /continue learn|resume reading|open today’s hukamnama/i }).length).toBeGreaterThan(0)
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
