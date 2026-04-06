import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'
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
    learningLevel: 'beginner',
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
  expect(screen.getByRole('button', { name: /grow/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /review/i })).toBeInTheDocument()
  expect(screen.queryByText(/add text/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/quiz/i)).not.toBeInTheDocument()
})

test('shows today’s hukamnama action', async () => {
  renderHome()
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /open today’s hukamnama/i })).toBeInTheDocument()
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
  expect(screen.getByText(/pick up exactly where you paused/i)).toBeInTheDocument()
})

test('shows dark mode toggle', () => {
  renderHome()
  const toggle = screen.getByLabelText(/switch to dark mode|switch to light mode/i)
  expect(toggle).toBeInTheDocument()
})

test('does not embed onboarding inside the home page anymore', () => {
  useOnboardingStore.setState({
    hasCompletedOnboarding: false,
    learningLevel: 'beginner',
  })
  renderHome()
  expect(screen.queryByText(/set your reading defaults/i)).not.toBeInTheDocument()
})
