import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import App from './App'
import { useCloudSyncStore } from './store/cloudSync'
import { useLanguageStore } from './store/language'
import { useOnboardingStore } from './store/onboarding'

vi.mock('./hooks/useSupabaseBootstrap', () => ({
  useSupabaseBootstrap: () => undefined,
}))

const APP_TEST_WAIT = { timeout: 30000 }

beforeEach(() => {
  window.history.replaceState({}, '', '/')
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
    callback(0)
    return 0
  })
  window.history.replaceState({}, '', '/')
  sessionStorage.setItem('splash-shown', '1')
  useCloudSyncStore.getState().reset()
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
  vi.restoreAllMocks()
  sessionStorage.clear()
})

function advanceFirstRunOnboardingToPreview() {
  for (let step = 0; step < 4; step += 1) {
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))
  }
}

test('shows onboarding above the app shell and lands home after first-run setup', async () => {
  const scrollToSpy = vi.spyOn(window, 'scrollTo')
  render(<App />)

  expect(screen.getByTestId('skip-to-content')).toHaveAttribute('href', '/#main-content')
  expect(screen.getByText(/shape how gurbani opens for you/i)).toBeInTheDocument()
  expect(screen.getByText(/^NaamRas$/)).toBeInTheDocument()
  expect(screen.queryByRole('heading', { level: 1, name: /satshriakaal/i })).not.toBeInTheDocument()
  expect(screen.queryByText(/today.?s path/i)).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /home/i })).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /find peace and clarity/i }))
  advanceFirstRunOnboardingToPreview()
  fireEvent.click(screen.getByRole('button', { name: /open my reader|start today.?s path/i }))

  await waitFor(() => {
    expect(useOnboardingStore.getState().hasCompletedOnboarding).toBe(true)
  }, APP_TEST_WAIT)

  await waitFor(() => {
    expect(window.location.pathname).toBe('/')
  }, APP_TEST_WAIT)

  await waitFor(() => {
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' })
    expect(screen.getByTestId('main-content')).toHaveFocus()
  }, APP_TEST_WAIT)

  expect(await screen.findByTestId('page-home', undefined, APP_TEST_WAIT)).toBeInTheDocument()
})

test('wraps routed content in the main landmark once onboarding is complete', async () => {
  useOnboardingStore.setState({
    hasCompletedOnboarding: true,
    isOnboardingOpen: false,
    presentationMode: 'overlay',
    learningLevel: 'beginner',
    audience: 'adult',
    learningGoal: 'read',
  })

  render(<App />)

  expect(await screen.findByRole('main', undefined, APP_TEST_WAIT)).toBeInTheDocument()
  expect(await screen.findByTestId('page-home', undefined, APP_TEST_WAIT)).toBeInTheDocument()
  expect(screen.getByTestId('main-content')).toBeInTheDocument()
  expect(screen.getByTestId('primary-nav')).toBeInTheDocument()
})

test('keeps the bottom nav visible when the main app shell renders with stale onboarding state', async () => {
  useOnboardingStore.setState({
    hasCompletedOnboarding: false,
    isOnboardingOpen: false,
    presentationMode: 'overlay',
    learningLevel: 'beginner',
    audience: 'adult',
    learningGoal: 'read',
  })

  render(<App />)

  expect(await screen.findByTestId('page-home', undefined, APP_TEST_WAIT)).toBeInTheDocument()
  expect(screen.getByTestId('main-content')).toBeInTheDocument()
  expect(screen.getByTestId('primary-nav')).toBeInTheDocument()
})

test('refreshes the skip link target on each route', async () => {
  const renderAtPath = async (path: string, pageTestId: string) => {
    window.history.replaceState({}, '', path)
    useOnboardingStore.setState({
      hasCompletedOnboarding: true,
      isOnboardingOpen: false,
      presentationMode: 'overlay',
      learningLevel: 'beginner',
      audience: 'adult',
      learningGoal: 'read',
    })
    const view = render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('skip-to-content')).toHaveAttribute('href', `${path}#main-content`)
    }, APP_TEST_WAIT)
    expect(await screen.findByTestId(pageTestId, undefined, APP_TEST_WAIT)).toBeInTheDocument()

    view.unmount()
  }

  await renderAtPath('/', 'page-home')
  await renderAtPath('/banis', 'page-banis')
  await renderAtPath('/library', 'page-library')
  await renderAtPath('/more', 'page-more')
})

test('redirects retired article routes home', async () => {
  window.history.replaceState({}, '', '/learn/topics/old-path')
  useOnboardingStore.setState({
    hasCompletedOnboarding: true,
    isOnboardingOpen: false,
    presentationMode: 'overlay',
    learningLevel: 'beginner',
    audience: 'adult',
    learningGoal: 'read',
  })

  render(<App />)

  await waitFor(() => {
    expect(window.location.pathname).toBe('/')
  }, APP_TEST_WAIT)
})

test('habit onboarding completion returns home after the premium onboarding flow', async () => {
  render(<App />)

  fireEvent.click(screen.getByRole('button', { name: /build a daily reading habit/i }))
  advanceFirstRunOnboardingToPreview()
  fireEvent.click(screen.getByRole('button', { name: /open my reader|start today.?s path/i }))

  await waitFor(() => {
    expect(window.location.pathname).toBe('/')
  }, APP_TEST_WAIT)

  await waitFor(() => {
    expect(screen.getByTestId('page-home')).toBeInTheDocument()
  }, APP_TEST_WAIT)
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

  fireEvent.click(await screen.findByRole('button', { name: /profile & app language/i }, APP_TEST_WAIT))
  fireEvent.click(await screen.findByRole('button', { name: /re-open first setup on home/i }, APP_TEST_WAIT))

  await waitFor(() => {
    expect(screen.getByText(/shape how gurbani opens for you/i)).toBeInTheDocument()
  }, APP_TEST_WAIT)

  expect(screen.getByRole('button', { name: /understand scripture/i })).toHaveAttribute('aria-pressed', 'true')
  expect(useOnboardingStore.getState().learningLevel).toBe('daily-reader')
  expect(useOnboardingStore.getState().audience).toBe('teen')
  expect(useOnboardingStore.getState().learningGoal).toBe('understand')
})
