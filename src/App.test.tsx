import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'
import { useLanguageStore } from './store/language'
import { useOnboardingStore } from './store/onboarding'

beforeEach(() => {
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
    learningLevel: 'beginner',
  })
})

afterEach(() => {
  sessionStorage.clear()
})

test('shows onboarding above the app shell and hides nav until setup is saved', async () => {
  render(<App />)

  expect(screen.getByText(/set your reading defaults/i)).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /home/i })).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /save setup/i }))

  await waitFor(() => {
    expect(useOnboardingStore.getState().hasCompletedOnboarding).toBe(true)
  })

  expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
})
