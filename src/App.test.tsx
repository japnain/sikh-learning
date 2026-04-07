import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'
import { useLanguageStore } from './store/language'
import { useOnboardingStore } from './store/onboarding'

beforeEach(() => {
  window.history.replaceState({}, '', '/')
  sessionStorage.setItem('splash-shown', '1')
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
    hasCompletedOnboarding: false,
    isOnboardingOpen: true,
    presentationMode: 'first-run',
    learningLevel: 'beginner',
    audience: 'adult',
    learningGoal: 'read',
  })
})

afterEach(() => {
  sessionStorage.clear()
})

test('shows onboarding above the app shell and hides nav until setup is saved', async () => {
  render(<App />)

  expect(screen.getByText(/shape how gurbani opens for you/i)).toBeInTheDocument()
  expect(screen.queryByRole('heading', { level: 1, name: /satshriakaal/i })).not.toBeInTheDocument()
  expect(screen.queryByText(/today.?s path/i)).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /home/i })).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /i want to read/i }))
  fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))
  fireEvent.click(screen.getByRole('button', { name: /open my reader/i }))

  await waitFor(() => {
    expect(useOnboardingStore.getState().hasCompletedOnboarding).toBe(true)
  })

  await waitFor(() => {
    expect(window.location.pathname).toBe('/study')
  })
})

test('habit onboarding completion returns home and highlights today’s path', async () => {
  render(<App />)

  fireEvent.click(screen.getByRole('button', { name: /i want to build habit/i }))
  fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))
  fireEvent.click(screen.getByRole('button', { name: /start today.?s path/i }))

  await waitFor(() => {
    expect(window.location.pathname).toBe('/')
  })

  expect(screen.getByText(/today.?s path/i)).toBeInTheDocument()
})

test('reopening onboarding from more keeps the saved profile selections', async () => {
  window.history.replaceState({}, '', '/more')
  useOnboardingStore.setState({
    hasCompletedOnboarding: true,
    isOnboardingOpen: false,
    presentationMode: 'overlay',
    learningLevel: 'daily-reader',
    audience: 'teen',
    learningGoal: 'understand',
  })

  render(<App />)

  fireEvent.click(screen.getByRole('button', { name: /re-open first setup on home/i }))

  await waitFor(() => {
    expect(screen.getByText(/shape how gurbani opens for you/i)).toBeInTheDocument()
  })

  expect(screen.getByRole('button', { name: /i want to understand/i })).toHaveAttribute('aria-pressed', 'true')
  expect(useOnboardingStore.getState().learningLevel).toBe('daily-reader')
  expect(useOnboardingStore.getState().audience).toBe('teen')
  expect(useOnboardingStore.getState().learningGoal).toBe('understand')
})
