import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import Home from './Home'
import * as hukamnamaHook from '../hooks/useHukamnama'
import { useBookmarksStore } from '../store/bookmarks'
import { useFavoritesStore } from '../store/favorites'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { DEFAULT_NITNEM_OPTION_IDS, useNitemStore } from '../store/nitnem'
import { useOnboardingStore } from '../store/onboarding'
import { useProgressStore } from '../store/progress'
import { useSavedFeedbackStore } from '../store/savedFeedback'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { useThemeStore } from '../store/theme'
import { useVocabStore } from '../store/vocab'

function renderHome() {
  return render(<MemoryRouter><Home /></MemoryRouter>)
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
    refreshing: false,
    error: null,
    isCached: false,
    isOlder: false,
    cachedAt: null,
    requestedDate: '2026-04-11',
    retry: vi.fn(),
  } as unknown as ReturnType<typeof hukamnamaHook.useHukamnama>
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.documentElement.classList.remove('dark')
  document.documentElement.removeAttribute('data-theme')
})

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date('2026-04-11T09:00:00.000Z'))
  localStorage.clear()
  useThemeStore.getState().setDark(false)
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
    isOnboardingOpen: false,
    presentationMode: 'overlay',
    learningLevel: 'beginner',
    audience: 'adult',
    learningGoal: 'read',
  })
  vi.spyOn(hukamnamaHook, 'useHukamnama').mockReturnValue(buildReadyHukamnama())
})

test('renders the Home reading surface without old guidance cards', () => {
  renderHome()

  expect(screen.getByTestId('page-home')).toBeInTheDocument()
  expect(screen.getByTestId('home-hero')).toBeInTheDocument()
  expect(screen.getByTestId('home-hero-art-stage')).toContainElement(screen.getByTestId('home-hero-artwork'))
  expect(screen.getByRole('heading', { level: 1, name: 'NaamRas' })).toBeInTheDocument()
  expect(screen.getByText('Read. Reflect. Return.')).toBeInTheDocument()
  const readingPreferences = screen.getByRole('button', { name: 'Reading preferences' })
  fireEvent.click(readingPreferences)
  expect(useOnboardingStore.getState().isOnboardingOpen).toBe(true)
  const receiveMarker = screen.getByTestId('home-path-receive')
  const practiceMarker = screen.getByTestId('home-path-practice')
  const keepMarker = screen.getByTestId('home-path-keep')
  expect(within(receiveMarker).getByText('Receive')).toBeInTheDocument()
  expect(within(practiceMarker).getByText('Practice')).toBeInTheDocument()
  expect(within(keepMarker).getByText('Keep')).toBeInTheDocument()
  expect(receiveMarker.compareDocumentPosition(practiceMarker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(practiceMarker.compareDocumentPosition(keepMarker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  const nitnem = screen.getByTestId('home-nitnem-spotlight')
  expect(within(nitnem).getByText(new RegExp(`Bani \\d of ${DEFAULT_NITNEM_OPTION_IDS.length}`))).toBeInTheDocument()
  expect(screen.getByTestId('home-nitnem-carousel-controls')).toHaveClass('home-nitnem-nav')
  expect(screen.getByTestId('home-nitnem-manage')).toHaveTextContent('Customize')
  expect(within(nitnem).queryByRole('progressbar')).not.toBeInTheDocument()
  expect(screen.queryByTestId('home-guidance-hero')).not.toBeInTheDocument()
  expect(screen.queryByTestId('home-read-today-featured-shabad')).not.toBeInTheDocument()
})

test('shows honest Hukamnama date, source, Ang, Raag, and reading preferences', () => {
  renderHome()

  expect(screen.getByRole('heading', { level: 2, name: "Today's Hukamnama" })).toBeInTheDocument()
  expect(screen.getByText('Saturday, April 11, 2026')).toBeInTheDocument()
  expect(screen.getByText('Current reading')).toBeInTheDocument()
  expect(screen.getByText('Sri Guru Granth Sahib Ji')).toBeInTheDocument()
  expect(screen.getByText('Ang 12')).toBeInTheDocument()
  expect(screen.getByText('Raag Asa')).toBeInTheDocument()
  expect(screen.getByText('Ego and the Naam cannot live together in the same place.')).toBeInTheDocument()
  expect(screen.queryByText('haumai naavai naal virodh hai dui na vaseh ik thaai')).not.toBeInTheDocument()
  expect(screen.queryByText(/\b(?:AM|PM)\b/)).not.toBeInTheDocument()
})

test('respects transliteration and meaning preferences in the Hukamnama preview', () => {
  useLanguageStore.setState({
    showTransliteration: true,
    meaningLanguage: 'none',
  })

  renderHome()

  expect(screen.getByText('haumai naavai naal virodh hai dui na vaseh ik thaai')).toBeInTheDocument()
  expect(screen.queryByText('Ego and the Naam cannot live together in the same place.')).not.toBeInTheDocument()
})

test('labels an older cached Hukamnama and lets the reader refresh it', () => {
  const retry = vi.fn()
  const cachedResult = buildReadyHukamnama()
  cachedResult.data!.date = '2026-04-09'
  vi.mocked(hukamnamaHook.useHukamnama).mockReturnValue({
    ...cachedResult,
    status: 'degraded',
    isCached: true,
    isOlder: true,
    retry,
  })

  renderHome()

  expect(screen.getByRole('heading', { level: 2, name: 'Hukamnama for Thursday, April 9, 2026' })).toBeInTheDocument()
  expect(screen.getByText('Available offline')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
  expect(retry).toHaveBeenCalledTimes(1)
})

test('offers Retry and Read routes when no Hukamnama or cached copy is available', () => {
  const retry = vi.fn()
  vi.mocked(hukamnamaHook.useHukamnama).mockReturnValue({
    ...buildReadyHukamnama(),
    data: null,
    status: 'degraded',
    issue: { code: 'network', message: 'offline', retryable: true },
    error: 'network',
    retry,
  } as unknown as ReturnType<typeof hukamnamaHook.useHukamnama>)

  renderHome()

  expect(screen.getByRole('heading', { level: 2, name: 'Hukamnama unavailable' })).toBeInTheDocument()
  fireEvent.click(screen.getByTestId('home-hukamnama-retry'))
  expect(retry).toHaveBeenCalledTimes(1)
  expect(within(screen.getByTestId('home-hukamnama-error')).getByRole('link', { name: 'Open Read' })).toHaveAttribute('href', '/banis')
})

test('keeps artwork semantic and provides an honest image failure fallback', () => {
  renderHome()

  const artwork = screen.getByRole('img', { name: /Painted landscape with an eclipse/ })
  fireEvent.error(artwork)
  expect(screen.getByRole('img', { name: /Artwork unavailable/ })).toBeInTheDocument()
})

test('shows completion progress only when Nitnem tracking is enabled', () => {
  useNitemStore.setState({
    completionTrackingEnabled: true,
    completedDate: todayStamp(),
    completedIds: [DEFAULT_NITNEM_OPTION_IDS[0]],
  })

  renderHome()

  expect(screen.getByText('1 complete')).toBeInTheDocument()
  const progress = screen.getByRole('progressbar', { name: 'Daily Nitnem' })
  expect(progress).toHaveAttribute('aria-valuenow', '1')
  expect(progress).toHaveAttribute('aria-valuetext', `1 of ${DEFAULT_NITNEM_OPTION_IDS.length} daily banis complete`)
})

test('uses a compact empty Saved state without decorative art or zero metrics', () => {
  renderHome()

  const empty = screen.getByTestId('home-saved-empty')
  expect(within(empty).getByText('Nothing saved yet')).toBeInTheDocument()
  expect(within(empty).getByRole('link', { name: /Open Read/ })).toHaveAttribute('href', '/banis')
  expect(screen.queryByTestId('home-saved-layout')).not.toBeInTheDocument()
  expect(screen.queryByTestId('home-saved-art')).not.toBeInTheDocument()
  expect(screen.queryByTestId('home-saved-metrics')).not.toBeInTheDocument()
})

test('saved overview shows only reading, favorites, and review metrics', () => {
  useBookmarksStore.setState({
    bookmarks: [{
      id: 'bookmark-1',
      type: 'bani',
      title: 'Japji Sahib',
      source: 'G',
      ang: 1,
      savedAt: new Date().toISOString(),
    }],
  })

  renderHome()

  const metrics = screen.getByTestId('home-saved-metrics')
  expect(screen.getByTestId('home-saved-layout')).toContainElement(metrics)
  const savedArt = screen.getByTestId('home-saved-art')
  expect(savedArt).toHaveAttribute('href', '/saved')
  expect(savedArt.querySelector('img')).toHaveAttribute('src', expect.stringContaining('saved-mural'))
  expect(within(metrics).getByText('Bookmarks').parentElement).toHaveTextContent('1')
  expect(within(metrics).getByText('Favorites').parentElement).toHaveTextContent('0')
  expect(within(metrics).getByText('Review Bank').parentElement).toHaveTextContent('0')
})

test('keeps ordinary Nitnem clicks separate from carousel drag capture', () => {
  renderHome()

  const carousel = screen.getByTestId('home-nitnem-carousel')
  const setPointerCapture = vi.fn()
  const releasePointerCapture = vi.fn()
  const hasPointerCapture = vi.fn(() => true)
  carousel.setPointerCapture = setPointerCapture
  carousel.releasePointerCapture = releasePointerCapture
  carousel.hasPointerCapture = hasPointerCapture

  fireEvent.pointerDown(carousel, {
    pointerId: 7,
    pointerType: 'mouse',
    button: 0,
    clientX: 220,
    clientY: 100,
  })

  expect(setPointerCapture).not.toHaveBeenCalled()

  fireEvent.pointerMove(carousel, {
    pointerId: 7,
    pointerType: 'mouse',
    clientX: 160,
    clientY: 102,
  })

  expect(setPointerCapture).toHaveBeenCalledWith(7)
})

test('scrolls the desktop Nitnem carousel relative to its first card offset', () => {
  renderHome()

  const carousel = screen.getByTestId('home-nitnem-carousel')
  const cards = Array.from(carousel.querySelectorAll<HTMLElement>('[data-nitnem-index]'))
  Object.defineProperty(cards[0], 'offsetLeft', { configurable: true, value: 420 })
  Object.defineProperty(cards[1], 'offsetLeft', { configurable: true, value: 780 })
  const scrollTo = vi.fn()
  carousel.scrollTo = scrollTo

  fireEvent.click(screen.getByRole('button', { name: 'Next Nitnem bani' }))
  vi.runOnlyPendingTimers()

  expect(scrollTo).toHaveBeenLastCalledWith({ left: 360, behavior: 'smooth' })
  expect(screen.getByTestId('home-nitnem-active-card')).toHaveAttribute('data-nitnem-index', '1')
})
