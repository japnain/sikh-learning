import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import App from './App'
import { useCloudSyncStore } from './store/cloudSync'
import { useLanguageStore } from './store/language'
import { useOnboardingStore } from './store/onboarding'
import { mockDocumentScroll } from './test/documentScroll'

vi.mock('./hooks/useSupabaseBootstrap', () => ({
  useSupabaseBootstrap: () => undefined,
}))

const APP_TEST_WAIT = { timeout: 30000 }
let documentScroll: ReturnType<typeof mockDocumentScroll> | null = null

beforeEach(() => {
  window.history.replaceState({}, '', '/')
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
    queueMicrotask(() => callback(0))
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
  documentScroll?.restore()
  documentScroll = null
  vi.restoreAllMocks()
  sessionStorage.clear()
})

function advanceFirstRunOnboardingToPreview() {
  for (let step = 0; step < 3; step += 1) {
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))
  }
}

test('shows onboarding above the app shell and lands home after first-run setup', async () => {
  documentScroll = mockDocumentScroll({ top: 320 })
  render(<App />)

  expect(screen.getByTestId('skip-to-content')).toHaveAttribute('href', '/#main-content')
  expect(screen.getByText(/shape how gurbani opens for you/i)).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /^NaamRas$/ })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { level: 1, name: /satshriakaal/i })).not.toBeInTheDocument()
  expect(screen.queryByText(/today.?s path/i)).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /home/i })).not.toBeInTheDocument()

  fireEvent.click(screen.getByTestId('onboarding-intent-understand'))
  advanceFirstRunOnboardingToPreview()
  fireEvent.click(screen.getByTestId('onboarding-preview-primary-action'))

  await waitFor(() => {
    expect(useOnboardingStore.getState().hasCompletedOnboarding).toBe(true)
  }, APP_TEST_WAIT)

  await waitFor(() => {
    expect(window.location.pathname).toBe('/')
  }, APP_TEST_WAIT)

  await waitFor(() => {
    expect(documentScroll?.getTop()).toBe(0)
    expect(screen.getByTestId('main-content')).toHaveFocus()
  }, APP_TEST_WAIT)

  expect(await screen.findByTestId('page-home', undefined, APP_TEST_WAIT)).toBeInTheDocument()
})

test('preserves the originally requested deep link through first-run onboarding', async () => {
  window.history.replaceState({}, '', '/more?from=shared-link#daily-nitnem')
  const scrollIntoView = vi.spyOn(HTMLElement.prototype, 'scrollIntoView')
  render(<App />)

  fireEvent.click(screen.getByTestId('onboarding-intent-understand'))
  advanceFirstRunOnboardingToPreview()
  fireEvent.click(screen.getByTestId('onboarding-preview-primary-action'))

  expect(await screen.findByTestId('page-more', undefined, APP_TEST_WAIT)).toBeInTheDocument()
  expect(window.location.pathname).toBe('/more')
  expect(window.location.search).toBe('?from=shared-link')
  expect(window.location.hash).toBe('#daily-nitnem')
  await waitFor(() => {
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' })
  }, APP_TEST_WAIT)
})

test('preserves a compact Hukamnama link through first-run onboarding before resolving it', async () => {
  window.history.replaceState({}, '', '/h/2026-08-03')
  render(<App />)

  fireEvent.click(screen.getByTestId('onboarding-intent-understand'))
  advanceFirstRunOnboardingToPreview()
  fireEvent.click(screen.getByTestId('onboarding-preview-primary-action'))

  await waitFor(() => {
    expect(window.location.pathname).toBe('/study')
    expect(window.location.search).toBe('?hukamnamaDate=2026-08-03')
  }, APP_TEST_WAIT)
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
  expect(screen.getByTestId('app-shell')).toContainElement(screen.getByTestId('main-content'))
  expect(screen.getByTestId('main-content')).toBeInTheDocument()
  expect(screen.getByTestId('primary-nav')).toBeInTheDocument()
  expect(screen.getByTestId('app-shell')).not.toContainElement(screen.getByTestId('nav-stack'))
  expect(document.querySelector('.app-scroll-viewport')).toBeNull()
})

test('keeps the skip link as the first keyboard target on initial load', async () => {
  const user = userEvent.setup()
  useOnboardingStore.setState({
    hasCompletedOnboarding: true,
    isOnboardingOpen: false,
    presentationMode: 'overlay',
    learningLevel: 'beginner',
    audience: 'adult',
    learningGoal: 'read',
  })

  render(<App />)

  expect(await screen.findByTestId('page-home', undefined, APP_TEST_WAIT)).toBeInTheDocument()
  expect(screen.getByTestId('main-content')).not.toHaveFocus()

  await user.tab()
  expect(screen.getByTestId('skip-to-content')).toHaveFocus()

  await user.keyboard('{Enter}')
  expect(screen.getByTestId('main-content')).toHaveFocus()
  expect(window.location.hash).toBe('#main-content')
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

test('keeps public support and privacy documents available before onboarding', async () => {
  const renderPublicDocument = async (path: string, pageTestId: string) => {
    window.history.replaceState({}, '', path)
    const view = render(<App />)

    expect(await screen.findByTestId(pageTestId, undefined, APP_TEST_WAIT)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByTestId('primary-nav')).not.toBeInTheDocument()

    view.unmount()
  }

  await renderPublicDocument('/support', 'page-support')
  await renderPublicDocument('/privacy', 'page-privacy')
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
  await renderAtPath('/saved', 'page-library')
  await renderAtPath('/more', 'page-more')
})

test('redirects the legacy Saved route to its canonical path', async () => {
  window.history.replaceState({}, '', '/library')
  useOnboardingStore.setState({
    hasCompletedOnboarding: true,
    isOnboardingOpen: false,
    presentationMode: 'overlay',
    learningLevel: 'beginner',
    audience: 'adult',
    learningGoal: 'read',
  })

  render(<App />)

  expect(await screen.findByTestId('page-library', undefined, APP_TEST_WAIT)).toBeInTheDocument()
  await waitFor(() => {
    expect(window.location.pathname).toBe('/saved')
  }, APP_TEST_WAIT)
})

test('redirects a short Hukamnama share link to the exact dated reading', async () => {
  window.history.replaceState({}, '', '/h/2026-08-03')
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
    expect(window.location.pathname).toBe('/study')
    expect(window.location.search).toBe('?hukamnamaDate=2026-08-03')
  }, APP_TEST_WAIT)
})

test('rejects an invalid short Hukamnama date', async () => {
  window.history.replaceState({}, '', '/h/2026-02-30')
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
  expect(await screen.findByTestId('page-home', undefined, APP_TEST_WAIT)).toBeInTheDocument()
})

test('redirects a compact personal Hukamnama link to the exact Ardaas reading', async () => {
  window.history.replaceState({}, '', '/p/2591/680/10101')
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
    expect(window.location.pathname).toBe('/study')
    expect(window.location.search).toBe(
      '?shabadId=2591&flow=ardaas-hukamnama&randomHukamnamaAng=680&resumeVerseId=10101'
    )
  }, APP_TEST_WAIT)
})

test('rejects malformed compact personal Hukamnama identifiers', async () => {
  window.history.replaceState({}, '', '/p/not-a-shabad/680')
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
  expect(await screen.findByTestId('page-home', undefined, APP_TEST_WAIT)).toBeInTheDocument()
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

test('keeps unknown routes visible as an honest not-found state', async () => {
  window.history.replaceState({}, '', '/this-route-does-not-exist')
  useOnboardingStore.setState({
    hasCompletedOnboarding: true,
    isOnboardingOpen: false,
    presentationMode: 'overlay',
    learningLevel: 'beginner',
    audience: 'adult',
    learningGoal: 'read',
  })

  render(<App />)

  expect(await screen.findByTestId('page-not-found', undefined, APP_TEST_WAIT)).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /this path does not exist/i })).toBeInTheDocument()
  expect(window.location.pathname).toBe('/this-route-does-not-exist')
})

test('habit onboarding completion returns home after the premium onboarding flow', async () => {
  render(<App />)

  fireEvent.click(screen.getByTestId('onboarding-intent-habit'))
  advanceFirstRunOnboardingToPreview()
  fireEvent.click(screen.getByTestId('onboarding-preview-primary-action'))

  await waitFor(() => {
    expect(window.location.pathname).toBe('/')
  }, APP_TEST_WAIT)

  await waitFor(() => {
    expect(screen.getByTestId('page-home')).toBeInTheDocument()
  }, APP_TEST_WAIT)
})

test('reopening onboarding from more keeps the saved reading intent', async () => {
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

  await screen.findByTestId('page-more', undefined, APP_TEST_WAIT)
  fireEvent.click(screen.getByTestId('more-open-onboarding'))

  await waitFor(() => {
    expect(screen.getByRole('dialog', { name: /shape how gurbani opens for you/i })).toBeInTheDocument()
  }, APP_TEST_WAIT)

  expect(screen.getByRole('button', { name: /i want to understand/i })).toHaveAttribute('aria-pressed', 'true')
  expect(useOnboardingStore.getState().learningGoal).toBe('understand')
})

test('uses the focused shell and hides primary navigation on an EPUB chapter route', async () => {
  window.history.replaceState({}, '', '/library/panth-prakash-english/chapters/episode-001')
  useOnboardingStore.setState({
    hasCompletedOnboarding: true,
    isOnboardingOpen: false,
    presentationMode: 'overlay',
    learningLevel: 'beginner',
    audience: 'adult',
    learningGoal: 'read',
  })

  render(<App />)

  expect(await screen.findByTestId('panth-chapter-reader', undefined, APP_TEST_WAIT)).toBeInTheDocument()
  expect(screen.getByTestId('app-shell')).toHaveAttribute('data-reader-focus', 'true')
  expect(screen.getByTestId('app-shell')).not.toHaveAttribute('data-navigation')
  expect(screen.queryByTestId('primary-nav')).not.toBeInTheDocument()
})

test('restores document positions through browser Back and Forward navigation', async () => {
  useOnboardingStore.setState({
    hasCompletedOnboarding: true,
    isOnboardingOpen: false,
    presentationMode: 'overlay',
    learningLevel: 'beginner',
    audience: 'adult',
    learningGoal: 'read',
  })

  render(<App />)
  expect(await screen.findByTestId('page-home', undefined, APP_TEST_WAIT)).toBeInTheDocument()

  documentScroll = mockDocumentScroll({
    viewportHeight: 800,
    scrollHeight: 2400,
  })

  documentScroll.setTop(640)
  fireEvent.click(screen.getByTestId('nav-tab-more'))

  expect(await screen.findByTestId('page-more', undefined, APP_TEST_WAIT)).toBeInTheDocument()
  await waitFor(() => expect(documentScroll?.getTop()).toBe(0), APP_TEST_WAIT)

  documentScroll.setTop(280)
  window.history.back()

  expect(await screen.findByTestId('page-home', undefined, APP_TEST_WAIT)).toBeInTheDocument()
  await waitFor(() => expect(documentScroll?.getTop()).toBe(640), APP_TEST_WAIT)

  window.history.forward()

  expect(await screen.findByTestId('page-more', undefined, APP_TEST_WAIT)).toBeInTheDocument()
  await waitFor(() => expect(documentScroll?.getTop()).toBe(280), APP_TEST_WAIT)
})

test('finds a lazy-rendered hash target on a direct book deep link', async () => {
  window.history.replaceState({}, '', '/library/panth-prakash-english#contents')
  useOnboardingStore.setState({
    hasCompletedOnboarding: true,
    isOnboardingOpen: false,
    presentationMode: 'overlay',
    learningLevel: 'beginner',
    audience: 'adult',
    learningGoal: 'read',
  })
  const scrollIntoView = vi.spyOn(HTMLElement.prototype, 'scrollIntoView')

  render(<App />)

  const contents = await screen.findByTestId('panth-chapter-browser', undefined, APP_TEST_WAIT)
  await waitFor(() => {
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' })
  }, APP_TEST_WAIT)
  expect(contents).toHaveAttribute('id', 'contents')
})
