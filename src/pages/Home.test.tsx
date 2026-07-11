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
    error: null,
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
  expect(screen.getByText('Reading Profile')).toBeInTheDocument()
  expect(screen.queryByTestId('home-guidance-hero')).not.toBeInTheDocument()
  expect(screen.queryByTestId('home-read-today-featured-shabad')).not.toBeInTheDocument()
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
