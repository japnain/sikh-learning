import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { vi } from 'vitest'
import Home from './Home'
import { getHomeNitnemResume } from '../utils/homeNitnemResume'
import * as hukamnamaHook from '../hooks/useHukamnama'
import * as baniHook from '../hooks/useBani'
import * as baniSelection from '../utils/baniLengthSelection'
import { useBookmarksStore } from '../store/bookmarks'
import { useFavoritesStore } from '../store/favorites'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { buildNitnemStudyPath, DEFAULT_NITNEM_OPTION_IDS, getNitnemOption, useNitemStore } from '../store/nitnem'
import { useNitnemHistoryStore, type NitnemCompletionEvent } from '../store/nitnemHistory'
import { useHomeArtworkStore } from '../store/homeArtwork'
import { useActivityEventsStore } from '../store/activityEvents'
import { useOnboardingStore } from '../store/onboarding'
import { useProgressStore } from '../store/progress'
import { useNitnemPracticeStore } from '../store/nitnemPractice'
import { useReadingPlacesStore } from '../store/readingPlaces'
import { useSavedFeedbackStore } from '../store/savedFeedback'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { useThemeStore } from '../store/theme'
import { useVocabStore } from '../store/vocab'

function renderHome() {
  const view = render(<MemoryRouter><Home /></MemoryRouter>)
  act(() => vi.advanceTimersByTime(20))
  return view
}

function HomeDestinationSpy() {
  const location = useLocation()
  return (
    <div data-testid="home-destination" data-location-state={JSON.stringify(location.state)}>
      {`${location.pathname}${location.search}${location.hash}`}
    </div>
  )
}

function renderHomeRoutes() {
  const view = render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/study" element={<HomeDestinationSpy />} />
        <Route path="/library/:workId/chapters/:chapterId" element={<HomeDestinationSpy />} />
      </Routes>
    </MemoryRouter>
  )
  act(() => vi.advanceTimersByTime(20))
  return view
}

function openAllBanis() {
  fireEvent.click(screen.getByRole('button', { name: /^All \d+ banis$/ }))
  return screen.getByRole('dialog', { name: 'Your Nitnem' })
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
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => (
    globalThis.setTimeout(() => callback(performance.now()), 0) as unknown as number
  ))
  vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(frame => globalThis.clearTimeout(frame))
  localStorage.clear()
  useThemeStore.getState().setDark(false)
  useSavedFeedbackStore.getState().clearSaved()
  useActivityEventsStore.getState().clearPendingEvents()
  useNitnemHistoryStore.setState({ events: [] })
  useHomeArtworkStore.setState({
    mode: 'fixed', selectedId: 'eclipse', visitIndex: -1,
    pendingVisit: false, activeVisitToken: null, lastVisitToken: null,
  })
  useScriptureCacheStore.getState().clearAll()
  useBookmarksStore.setState({ bookmarks: [] })
  useFavoritesStore.setState({ favorites: [] })
  useProgressStore.setState({ streak: 0, currentSession: null, studied: [], reviewQueue: [], lastStudied: null })
  useReadingPlacesStore.setState({ places: {} })
  useNitnemPracticeStore.setState({ active: null })
  useVocabStore.setState({ vocab: [] })
  useNitemStore.setState({
    completedDate: todayStamp(),
    completedIds: [],
    selectedIds: [...DEFAULT_NITNEM_OPTION_IDS],
    completionTrackingEnabled: false,
    weeklyDayGoal: 7,
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
    punjabiSource: 'ss',
    hindiSource: 'ss',
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

function startPractice(optionId: string, verseId?: number) {
  useNitnemPracticeStore.getState().start(optionId, buildNitnemStudyPath(getNitnemOption(optionId)!))
  if (verseId) {
    const params = new URLSearchParams(useNitnemPracticeStore.getState().active!.readingPath.split('?')[1])
    params.set('resumeVerseId', String(verseId))
    useNitnemPracticeStore.getState().updatePath(`/study?${params}`)
  }
}

function historyEvent(date: string, completed = true): NitnemCompletionEvent {
  return {
    id: `completion-${date}-${completed}`,
    optionId: 'japji-sahib',
    date,
    completed,
    occurredAt: `${date}T08:00:00.000Z`,
    source: 'manual',
    wasSelected: true,
  }
}

test('opens reading preferences and exposes the artwork and Nitnem customization controls', () => {
  renderHome()

  expect(screen.getByRole('heading', { level: 1, name: 'NaamRas' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Home artwork' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 2, name: 'Daily Nitnem' })).toBeInTheDocument()
  expect(screen.getByTestId('home-nitnem-manage')).toHaveAttribute('href', '/nitnem/customize')
  fireEvent.click(within(screen.getByTestId('home-hukamnama-card')).getByRole('button', { name: 'Reading preferences' }))
  expect(useOnboardingStore.getState().isOnboardingOpen).toBe(true)
})

test('shows the canonical Hukamnama date, source, Ang and Raag', () => {
  renderHome()

  const hukam = screen.getByTestId('home-hukamnama-card')
  expect(within(hukam).getByRole('heading', { level: 2, name: "Today's Hukamnama" })).toBeInTheDocument()
  expect(within(hukam).getByText('Saturday, April 11, 2026')).toHaveAttribute('datetime', '2026-04-11')
  expect(within(hukam).getByText('Current reading')).toBeInTheDocument()
  expect(within(hukam).getByText('Sri Guru Granth Sahib Ji')).toBeInTheDocument()
  expect(within(hukam).getByText('Ang 12')).toBeInTheDocument()
  expect(within(hukam).getByText('Raag Asa')).toBeInTheDocument()
  expect(within(hukam).getByText('Ego and the Naam cannot live together in the same place.')).toBeInTheDocument()
  expect(within(hukam).queryByText('haumai naavai naal virodh hai dui na vaseh ik thaai')).not.toBeInTheDocument()
  expect(within(hukam).getByRole('link', { name: 'Read Hukamnama' })).toHaveAttribute('href', '/study?hukamnamaDate=2026-04-11')
})

test('opens the exact dated Hukamnama with Home as the reader origin', () => {
  renderHomeRoutes()
  fireEvent.click(screen.getByRole('link', { name: 'Read Hukamnama' }))

  expect(screen.getByTestId('home-destination')).toHaveTextContent('/study?hukamnamaDate=2026-04-11')
  expect(screen.getByTestId('home-destination')).toHaveAttribute('data-location-state', JSON.stringify({ readerOrigin: '/' }))
})

test('respects transliteration and meaning visibility preferences', () => {
  useLanguageStore.setState({ showTransliteration: true, meaningLanguage: 'none' })
  renderHome()

  const hukam = screen.getByTestId('home-hukamnama-card')
  expect(within(hukam).getByText('haumai naavai naal virodh hai dui na vaseh ik thaai')).toBeInTheDocument()
  expect(within(hukam).queryByText('Ego and the Naam cannot live together in the same place.')).not.toBeInTheDocument()
})

test('uses the preferred English meaning source for the preview line', () => {
  const hukam = buildReadyHukamnama()
  hukam.data!.entry.lines![0].translations_en = {
    bdb: 'Ego and the Naam cannot live together in the same place.',
    ms: 'The selected source meaning.',
  }
  vi.mocked(hukamnamaHook.useHukamnama).mockReturnValue(hukam)
  useLanguageStore.setState({ englishSource: 'ms' })
  renderHome()

  expect(screen.getByText('The selected source meaning.')).toBeInTheDocument()
  expect(screen.queryByText('Ego and the Naam cannot live together in the same place.')).not.toBeInTheDocument()
})

test('labels an older cached Hukamnama and refreshes it without changing its date', () => {
  const retry = vi.fn()
  const cached = buildReadyHukamnama()
  cached.data!.date = '2026-04-09'
  vi.mocked(hukamnamaHook.useHukamnama).mockReturnValue({ ...cached, status: 'degraded', isCached: true, isOlder: true, retry })
  renderHome()

  expect(screen.getByRole('heading', { level: 2, name: 'Hukamnama for Thursday, April 9, 2026' })).toBeInTheDocument()
  expect(screen.getByText('Available offline')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Read Hukamnama' })).toHaveAttribute('href', '/study?hukamnamaDate=2026-04-09')
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
  expect(retry).toHaveBeenCalledTimes(1)
})

test('disables refresh while a cached Hukamnama is being refreshed', () => {
  vi.mocked(hukamnamaHook.useHukamnama).mockReturnValue({ ...buildReadyHukamnama(), isCached: true, refreshing: true })
  renderHome()

  expect(screen.getByRole('button', { name: 'Refreshing' })).toBeDisabled()
  expect(screen.getByTestId('home-hukamnama-card')).toHaveAttribute('aria-busy', 'true')
})

test('offers Retry and Read when neither live nor cached Hukamnama is available', () => {
  const retry = vi.fn()
  vi.mocked(hukamnamaHook.useHukamnama).mockReturnValue({
    ...buildReadyHukamnama(), data: null, status: 'degraded',
    issue: { code: 'offline' }, error: 'offline', retry,
  })
  renderHome()

  const error = screen.getByTestId('home-hukamnama-error')
  expect(within(error).getByRole('heading', { level: 2, name: 'Hukamnama unavailable' })).toBeInTheDocument()
  fireEvent.click(within(error).getByRole('button', { name: 'Try again' }))
  expect(retry).toHaveBeenCalledTimes(1)
  expect(within(error).getByRole('link', { name: 'Open Read' })).toHaveAttribute('href', '/banis')
})

test('shows a loading state before any Hukamnama reading is available', () => {
  vi.mocked(hukamnamaHook.useHukamnama).mockReturnValue({ ...buildReadyHukamnama(), data: null, loading: true, status: 'loading' })
  renderHome()

  expect(screen.getByTestId('home-hukamnama-loading')).toHaveAttribute('aria-busy', 'true')
  expect(screen.getByText('Loading the Hukamnama and its source details.')).toBeInTheDocument()
  expect(screen.queryByTestId('home-hukamnama-error')).not.toBeInTheDocument()
})

test('provides an honest artwork failure fallback without removing the reading', () => {
  renderHome()

  fireEvent.error(screen.getByRole('img', { name: /An eclipse above a mountain landscape/ }))
  expect(screen.getByRole('img', { name: /Artwork unavailable/ })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Read Hukamnama' })).toBeInTheDocument()
})

test('explicitly reapplying Eclipse retries its failed image without reloading Home', () => {
  renderHome()
  fireEvent.error(screen.getByTestId('home-hero-artwork'))
  expect(screen.getByTestId('home-hero-art-fallback')).toBeInTheDocument()
  act(() => { useHomeArtworkStore.getState().applyPreferences({ mode: 'fixed', selectedId: 'eclipse' }) })
  expect(screen.getByTestId('home-hero-artwork')).toBeInTheDocument()
  expect(screen.queryByTestId('home-hero-art-fallback')).not.toBeInTheDocument()
})

test('manual completion and undo update today, retained history and the weekly summary', () => {
  useNitemStore.setState({ completionTrackingEnabled: true, weeklyDayGoal: 5 })
  useNitnemHistoryStore.setState({ events: [historyEvent('2026-04-09'), historyEvent('2026-04-10')] })
  renderHome()

  const progress = screen.getByRole('progressbar', { name: 'Daily Nitnem' })
  const week = screen.getByTestId('home-week')
  expect(progress).toHaveAttribute('aria-valuenow', '0')
  expect(within(week).getByRole('link', { name: 'Weekly goal' })).toHaveTextContent('2 / 5 days')

  fireEvent.click(screen.getByRole('button', { name: 'Mark complete: Japji Sahib' }))
  expect(progress).toHaveAttribute('aria-valuenow', '1')
  expect(progress).toHaveAttribute('aria-valuetext', `1 of ${DEFAULT_NITNEM_OPTION_IDS.length} complete today`)
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', 'jaap-sahib')
  expect(within(week).getByRole('link', { name: 'Weekly goal' })).toHaveTextContent('3 / 5 days')
  expect(within(week).getByLabelText('Saturday, April 11: Practice recorded')).toHaveAttribute('datetime', todayStamp())
  expect(useNitnemHistoryStore.getState().events.at(-1)).toMatchObject({ optionId: 'japji-sahib', date: todayStamp(), completed: true, source: 'manual' })

  const navigator = openAllBanis()
  fireEvent.click(within(navigator).getByRole('button', { name: 'Undo completion: Japji Sahib' }))
  fireEvent.click(within(navigator).getByRole('button', { name: 'Close your banis' }))
  expect(progress).toHaveAttribute('aria-valuenow', '0')
  expect(screen.getByRole('button', { name: 'Mark complete: Japji Sahib' })).toHaveAttribute('aria-pressed', 'false')
  expect(within(week).getByRole('link', { name: 'Weekly goal' })).toHaveTextContent('2 / 5 days')
  expect(within(week).queryByLabelText('Saturday, April 11: Practice recorded')).not.toBeInTheDocument()
  expect(useNitnemHistoryStore.getState().events.at(-1)).toMatchObject({ optionId: 'japji-sahib', completed: false })
})

test('a failed Home completion stays uncompleted and retries without duplicate history', () => {
  useNitemStore.setState({ completionTrackingEnabled: true })
  renderHome()
  const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage full') })
  fireEvent.click(screen.getByRole('button', { name: 'Mark complete: Japji Sahib' }))
  expect(screen.getByText('This change could not be saved. Please try again.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Mark complete: Japji Sahib' })).toHaveAttribute('aria-pressed', 'false')
  expect(useNitnemHistoryStore.getState().events).toEqual([])
  expect(useActivityEventsStore.getState().pendingEvents).toEqual([])
  write.mockRestore()
  fireEvent.click(screen.getByRole('button', { name: 'Mark complete: Japji Sahib' }))
  const navigator = openAllBanis()
  expect(within(navigator).getByRole('button', { name: 'Undo completion: Japji Sahib' })).toHaveAttribute('aria-pressed', 'true')
  expect(useNitnemHistoryStore.getState().events).toHaveLength(1)
})

test('derives the week and streak from completion history rather than reading activity', () => {
  useNitemStore.setState({ completionTrackingEnabled: true, weeklyDayGoal: 4 })
  useProgressStore.setState({ streak: 99, lastStudied: todayStamp() })
  useNitnemHistoryStore.setState({ events: [historyEvent('2026-04-09'), historyEvent('2026-04-10')] })
  renderHome()

  const week = screen.getByTestId('home-week')
  expect(within(week).getByRole('link', { name: 'Weekly goal' })).toHaveTextContent('2 / 4 days')
  expect(within(week).getByText('2 day streak')).toBeInTheDocument()
  expect(within(week).queryByText('Best: 2')).not.toBeInTheDocument()
  expect(within(week).queryByText(/99/)).not.toBeInTheDocument()
  expect(screen.getByRole('progressbar', { name: 'Daily Nitnem' })).toHaveAttribute('aria-valuenow', '0')
})

test('keeps completion controls and continuity hidden when tracking is disabled', () => {
  useNitemStore.setState({ completedIds: ['japji-sahib'], completionTrackingEnabled: false })
  useNitnemHistoryStore.setState({ events: [historyEvent('2026-04-10')] })
  renderHome()

  const nitnem = screen.getByTestId('home-nitnem-spotlight')
  expect(within(nitnem).queryByRole('button', { name: /Mark complete:|Undo completion:/ })).not.toBeInTheDocument()
  expect(within(nitnem).queryByRole('progressbar')).not.toBeInTheDocument()
  expect(screen.queryByTestId('home-week')).not.toBeInTheDocument()
  expect(screen.getByTestId('home-nitnem-primary-action')).toHaveTextContent('Begin reading')
  const dialog = openAllBanis()
  expect(within(dialog).queryByRole('button', { name: /Mark complete:|Undo completion:/ })).not.toBeInTheDocument()
  expect(within(dialog).getByRole('link', { name: 'Begin reading: Japji Sahib' })).toBeInTheDocument()
})

test('opening a bani preserves its exact route and does not complete it', () => {
  useNitemStore.setState({ completionTrackingEnabled: true })
  renderHomeRoutes()
  fireEvent.click(screen.getByTestId('home-nitnem-primary-action'))

  const destination = screen.getByTestId('home-destination')
  const params = new URLSearchParams(destination.textContent!.split('?')[1])
  expect(params.get('baniDbId')).toBe('2')
  expect(params.get('baniId')).toBe('japji-sahib')
  expect(destination).toHaveAttribute('data-location-state', JSON.stringify({ readerOrigin: '/' }))
  expect(useNitemStore.getState().completedIds).toEqual([])
  expect(useNitnemHistoryStore.getState().events).toEqual([])
})

test('resumes an explicitly started exact daily bani at its saved verse', () => {
  const option = getNitnemOption('jaap-sahib')!
  const path = buildNitnemStudyPath(option)
  useProgressStore.setState({ currentSession: { scriptureId: 'D-1', resumePath: path, resumeVerseId: 999, updatedAt: new Date().toISOString() } })
  startPractice(option.id, 777)
  renderHomeRoutes()

  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-index', '1')
  expect(screen.getByTestId('home-nitnem-primary-action')).toHaveTextContent('Continue reading')
  fireEvent.click(screen.getByTestId('home-nitnem-primary-action'))
  const params = new URLSearchParams(screen.getByTestId('home-destination').textContent!.split('?')[1])
  expect(params.get('baniDbId')).toBe('4')
  expect(params.get('resumeVerseId')).toBe('777')
})

test.each([
  ['tav-prasad-savaiye', 'tav-prasad-savaiye-dheenan-ki'],
  ['tav-prasad-savaiye-dheenan-ki', 'tav-prasad-savaiye'],
])('does not resume %s from the different exact %s route', (optionId, savedId) => {
  const option = getNitnemOption(optionId)!
  const saved = getNitnemOption(savedId)!
  expect(getHomeNitnemResume(option, { scriptureId: 'D-11', resumePath: buildNitnemStudyPath(saved), resumeVerseId: 123, updatedAt: new Date().toISOString() })).toBeNull()
})

test.each([
  ['short', 'long'],
  ['long', 'short'],
] as const)('does not resume the %s Rehras reading from a saved %s version', (selectedLength, savedLength) => {
  const option = getNitnemOption('rehras-sahib')!
  useSundarGutkaLengthStore.getState().setLength('rehras-sahib', savedLength)
  const savedPath = buildNitnemStudyPath(option)
  useSundarGutkaLengthStore.getState().setLength('rehras-sahib', selectedLength)
  expect(getHomeNitnemResume(option, { scriptureId: 'G-8', resumePath: savedPath, resumeVerseId: 555, updatedAt: new Date().toISOString() })).toBeNull()
})

test('keeps an empty saved area concise with a working exploration link', () => {
  renderHome()

  const empty = screen.getByTestId('home-saved-empty')
  expect(screen.queryByRole('heading', { name: 'Return to reading' })).not.toBeInTheDocument()
  expect(within(empty).getByText('Find a passage to return to.')).toBeInTheDocument()
  expect(within(empty).getByRole('link', { name: 'Explore Gurbani' })).toHaveAttribute('href', '/banis')
})

test('shows the newest saved passage alongside a saved word', () => {
  useBookmarksStore.setState({ bookmarks: [{ id: 'older-bookmark', type: 'bani', title: 'Older reading', source: 'G', ang: 1, savedAt: '2026-04-09T12:00:00.000Z' }] })
  useFavoritesStore.setState({ favorites: [{ id: 'newer-favorite', type: 'bani', routeMode: 'canonical', title: 'Latest reading', source: 'G', ang: 12, savedAt: '2026-04-10T12:00:00.000Z' }] })
  useVocabStore.setState({ vocab: [{ word: 'ਸਤਿ', transliteration: 'sat', meaning_en: 'Truth', meaning_hi: '', meaning_pa: '', scripture: 'Japji Sahib', sourceId: 'G-1', savedAt: '2026-04-11T08:00:00.000Z' }] })
  renderHome()

  const passage = screen.getByTestId('home-saved-preview-passage')
  expect(within(passage).getByText('Latest reading')).toBeInTheDocument()
  expect(within(passage).queryByText('Older reading')).not.toBeInTheDocument()
  expect(passage).toHaveAttribute('href', '/study?source=G&ang=12')
  const word = screen.getByTestId('home-saved-preview-vocab')
  expect(within(word).getByText('ਸਤਿ')).toBeInTheDocument()
  expect(within(word).getByText('Truth')).toBeInTheDocument()
  expect(word).toHaveAttribute('href', '/vocab')
})

test('saved scripture previews localize source units and return to Home from Study', () => {
  useLocaleStore.setState({ locale: 'pa' })
  useBookmarksStore.setState({ bookmarks: [{ id: 'bookmark-vaar', type: 'bani', title: 'Vaar reading', source: 'B', ang: 12, returnPath: '/study?source=B&ang=12', savedAt: '2026-08-10T12:00:00.000Z' }] })
  renderHomeRoutes()

  const preview = screen.getByTestId('home-saved-preview-passage')
  expect(within(preview).getByText('BGV · ਵਾਰ 12')).toBeInTheDocument()
  fireEvent.click(preview)
  expect(screen.getByTestId('home-destination')).toHaveTextContent('/study?source=B&ang=12')
  expect(screen.getByTestId('home-destination')).toHaveAttribute('data-location-state', JSON.stringify({ readerOrigin: '/' }))
})

test('saved scripture shows the actual excerpt and meaning while preserving the exact verse return path', () => {
  const excerpt = 'ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ ॥'
  useFavoritesStore.setState({ favorites: [{
    id: 'saved-verse', type: 'shabad', routeMode: 'verse', title: 'Japji Sahib', source: 'G', ang: 1,
    shabadId: 1, verseId: 2, excerpt, translation_en: 'True Name, the Creator.',
    returnPath: '/study?shabadId=1&verseId=2', savedAt: '2026-04-11T08:00:00.000Z',
  }] })
  renderHomeRoutes()

  const preview = screen.getByTestId('home-saved-preview-passage')
  expect(within(preview).getByText(excerpt)).toHaveAttribute('lang', 'pa-Guru')
  expect(within(preview).getByText('True Name, the Creator.')).toBeInTheDocument()
  expect(within(preview).getByText('Japji Sahib')).toBeInTheDocument()
  expect(within(preview).getByText('SGGS · Ang 1 · Verse 2')).toBeInTheDocument()
  expect(within(preview).getByText('Return to reading')).toBeInTheDocument()
  fireEvent.click(preview)

  expect(screen.getByTestId('home-destination')).toHaveTextContent('/study?shabadId=1&verseId=2')
  expect(screen.getByTestId('home-destination')).toHaveAttribute('data-location-state', JSON.stringify({ readerOrigin: '/' }))
})

test('saved book previews preserve Home as the book reader origin', () => {
  useBookmarksStore.setState({ bookmarks: [{ id: 'bookmark-book', type: 'book', title: 'Panth Prakash · Episode 1', excerpt: 'The Sangat gathered to hear the account.', workId: 'panth-prakash-english', chapterId: 'episode-001', chapterLabel: 'Episode 1', blockId: 'episode-001-p47-b003', returnPath: '/library/panth-prakash-english/chapters/episode-001#episode-001-p47-b003', savedAt: '2026-08-10T12:00:00.000Z' }] })
  renderHomeRoutes()
  const preview = screen.getByTestId('home-saved-preview-passage')
  expect(within(preview).getByText('The Sangat gathered to hear the account.')).toBeInTheDocument()
  expect(within(preview).getByText('Panth Prakash · Episode 1')).toBeInTheDocument()
  fireEvent.click(preview)

  expect(screen.getByTestId('home-destination')).toHaveTextContent('/library/panth-prakash-english/chapters/episode-001#episode-001-p47-b003')
  expect(screen.getByTestId('home-destination')).toHaveAttribute('data-location-state', JSON.stringify({ libraryReaderOrigin: '/' }))
})

test('keeps Home focused on the current reading and two direct links while All banis preserves the full personal order', () => {
  const selectedIds = ['kirtan-sohila', 'japji-sahib', 'jaap-sahib', 'anand-sahib', 'sukhmani-sahib']
  useNitemStore.setState({ selectedIds })
  renderHome()

  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', 'kirtan-sohila')
  const next = screen.getByTestId('home-nitnem-next')
  expect(within(next).getAllByRole('link').map(link => link.getAttribute('aria-label'))).toEqual(['Begin reading: Japji Sahib', 'Begin reading: Jaap Sahib'])
  expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  expect(screen.queryByTestId('home-nitnem-carousel')).not.toBeInTheDocument()

  const dialog = openAllBanis()
  const routine = within(dialog).getByRole('list', { name: 'Daily Nitnem' })
  const entries = within(routine).getAllByRole('listitem')
  expect(entries.map(entry => entry.getAttribute('data-nitnem-id'))).toEqual(selectedIds)
  expect(within(routine).getAllByRole('link')).toHaveLength(selectedIds.length)
  expect(within(routine).getByText('ਸੋਹਿਲਾ ਸਾਹਿਬ')).toBeVisible()
  expect(within(routine).getByText('ਜਪੁਜੀ ਸਾਹਿਬ')).toBeVisible()
  expect(within(routine).getByText('ਜਾਪੁ ਸਾਹਿਬ')).toBeVisible()
  expect(within(routine).queryByRole('radio')).not.toBeInTheDocument()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close your banis' }))
  expect(screen.queryByRole('dialog', { name: 'Your Nitnem' })).not.toBeInTheDocument()
})

test('promotes the next reading after completion and retains undo in the ordered navigator', () => {
  useNitemStore.setState({ selectedIds: ['jaap-sahib', 'japji-sahib', 'kirtan-sohila'], completionTrackingEnabled: true })
  renderHome()
  fireEvent.click(screen.getByRole('button', { name: 'Mark complete: Jaap Sahib' }))
  expect(screen.getByTestId('home-nitnem-primary-action')).toHaveTextContent('Begin reading')
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', 'japji-sahib')
  expect(useNitnemPracticeStore.getState().active).toBeNull()
  act(() => {
    useNitemStore.getState().setSelectedIds(['kirtan-sohila', 'japji-sahib', 'jaap-sahib'])
    vi.advanceTimersByTime(60000)
  })
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', 'japji-sahib')
  expect(screen.getAllByTestId('home-nitnem-reading-panel')).toHaveLength(1)
  const navigator = openAllBanis()
  expect(within(navigator).getByRole('button', { name: 'Undo completion: Jaap Sahib' })).toBeVisible()
})

test('previews a real Hukamnama verse after an unmarked Raag and Mahala heading', () => {
  const hukam = buildReadyHukamnama()
  const verse = hukam.data!.entry.lines![0]
  hukam.data!.entry.lines = [{
    ...verse,
    gurmukhi: 'ਤਿਲੰਗ ਮਹਲਾ ੪ ॥',
    translation_en: 'Tilang, Fourth Guru.',
    transliteration: 'tilang mahalaa 4',
    isHeader: false,
  }, verse]
  vi.mocked(hukamnamaHook.useHukamnama).mockReturnValue(hukam)
  renderHome()

  const preview = screen.getByTestId('home-hukamnama-card')
  expect(within(preview).getByText(verse.gurmukhi)).toHaveAttribute('lang', 'pa-Guru')
  expect(within(preview).getByText(verse.translation_en)).toBeInTheDocument()
  expect(within(preview).queryByText('ਤਿਲੰਗ ਮਹਲਾ ੪ ॥')).not.toBeInTheDocument()
  expect(within(preview).queryByText('Tilang, Fourth Guru.')).not.toBeInTheDocument()
})

test('previews the body after the live Ashtpadi heading and standalone invocation without changing the reading', () => {
  const hukam = buildReadyHukamnama()
  const verse = { ...hukam.data!.entry.lines![0], gurmukhi: 'ਜੋ ਜੋ ਜੂਨੀ ਆਇਓ ਤਿਹ ਤਿਹ ਉਰਝਾਇਓ ਮਾਣਸ ਜਨਮੁ ਸੰਜੋਗਿ ਪਾਇਆ ॥' }
  const lines = [
    { ...verse, gurmukhi: 'ਧਨਾਸਰੀ ਮਃ ੫ ਘਰੁ ੬ ਅਸਟਪਦੀ', translation_en: 'Dhanaasaree, Fifth Mehl, Sixth House, Ashtpadee:', isHeader: false },
    { ...verse, gurmukhi: 'ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥', translation_en: 'One Universal Creator God. By The Grace Of The True Guru:', isHeader: false },
    verse,
  ]
  hukam.data!.entry.lines = lines
  const originalLines = structuredClone(lines)
  vi.mocked(hukamnamaHook.useHukamnama).mockReturnValue(hukam)
  renderHome()

  const preview = screen.getByTestId('home-hukamnama-card')
  expect(within(preview).getByText(verse.gurmukhi)).toHaveAttribute('lang', 'pa-Guru')
  expect(within(preview).getByText(verse.translation_en)).toBeInTheDocument()
  expect(within(preview).queryByText(lines[0].gurmukhi)).not.toBeInTheDocument()
  expect(within(preview).queryByText(lines[1].gurmukhi)).not.toBeInTheDocument()
  expect(hukam.data!.entry.lines).toEqual(originalLines)
})

test('native keyboard navigation goes directly from the current reading to the next bani', async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  renderHomeRoutes()
  screen.getByTestId('home-nitnem-primary-action').focus()
  await user.tab()

  expect(screen.getByRole('link', { name: 'Begin reading: Jaap Sahib' })).toHaveFocus()
  await user.keyboard('{Enter}')
  const destination = screen.getByTestId('home-destination')
  expect(new URLSearchParams(destination.textContent!.split('?')[1]).get('baniDbId')).toBe('4')
  expect(destination).toHaveAttribute('data-location-state', JSON.stringify({ readerOrigin: '/' }))
  expect(useNitemStore.getState().completedIds).toEqual([])
})

test('All banis is a dismissible native dialog and returns keyboard focus to its opener', async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  renderHome()
  const opener = screen.getByRole('button', { name: /^All \d+ banis$/ })
  opener.focus()
  await user.keyboard('{Enter}')
  expect(screen.getByRole('dialog', { name: 'Your Nitnem' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Close your banis' })).toHaveFocus()
  await user.keyboard('{Escape}')
  act(() => vi.advanceTimersByTime(20))

  expect(screen.queryByRole('dialog', { name: 'Your Nitnem' })).not.toBeInTheDocument()
  expect(opener).toHaveFocus()
})

test('the next bani opens its exact reading in one action without completing either reading', () => {
  useNitemStore.setState({ selectedIds: ['japji-sahib', 'jaap-sahib'], completionTrackingEnabled: true })
  renderHomeRoutes()
  fireEvent.click(screen.getByRole('link', { name: 'Begin reading: Jaap Sahib' }))

  const destination = screen.getByTestId('home-destination')
  const params = new URLSearchParams(destination.textContent!.split('?')[1])
  expect(params.get('baniDbId')).toBe('4')
  expect(params.get('baniId')).toBe('jaap-sahib')
  expect(params.get('exactBani')).toBe('1')
  expect(destination).toHaveAttribute('data-location-state', JSON.stringify({ readerOrigin: '/' }))
  expect(useNitemStore.getState().completedIds).toEqual([])
  expect(useNitnemHistoryStore.getState().events).toEqual([])
})

test('All banis supports explicit completion and undo without opening or starting a reading', () => {
  useNitemStore.setState({ selectedIds: ['japji-sahib', 'jaap-sahib'], completionTrackingEnabled: true })
  renderHomeRoutes()
  const dialog = openAllBanis()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Mark complete: Jaap Sahib' }))
  expect(screen.queryByTestId('home-destination')).not.toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: 'Undo completion: Jaap Sahib' })).toHaveAttribute('aria-pressed', 'true')
  expect(useNitemStore.getState().completedIds).toContain('jaap-sahib')
  expect(within(dialog).getByRole('link', { name: 'Read again: Jaap Sahib' })).toBeVisible()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Undo completion: Jaap Sahib' }))
  expect(useNitemStore.getState().completedIds).toEqual([])
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close your banis' }))
  expect(screen.getByRole('progressbar', { name: 'Daily Nitnem' })).toHaveAttribute('aria-valuenow', '0')
})

test('removing the selected bani opens a remaining reading without changing the personal order', () => {
  const jaap = getNitnemOption('jaap-sahib')!
  useProgressStore.setState({ currentSession: { scriptureId: 'D-1', resumePath: buildNitnemStudyPath(jaap), resumeVerseId: 777, updatedAt: new Date().toISOString() } })
  startPractice(jaap.id, 777)
  renderHome()
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', 'jaap-sahib')
  act(() => useNitemStore.getState().setSelectedIds(['kirtan-sohila', 'japji-sahib']))

  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', 'kirtan-sohila')
  expect(screen.getAllByTestId('home-nitnem-reading-panel')).toHaveLength(1)
  const dialog = openAllBanis()
  expect(within(dialog).getAllByRole('listitem').map(item => item.getAttribute('data-nitnem-id'))).toEqual(['kirtan-sohila', 'japji-sahib'])
})

test('a completed reading starts again without reusing its saved verse', () => {
  const option = getNitnemOption('jaap-sahib')!
  useNitemStore.setState({ completionTrackingEnabled: true, completedIds: ['jaap-sahib'] })
  useProgressStore.setState({ currentSession: { scriptureId: 'D-1', resumePath: buildNitnemStudyPath(option), resumeVerseId: 777, updatedAt: new Date().toISOString() } })
  renderHome()
  const dialog = openAllBanis()

  const action = within(dialog).getByRole('link', { name: 'Read again: Jaap Sahib' })
  expect(action).toHaveAccessibleName('Read again: Jaap Sahib')
  const params = new URLSearchParams(action.getAttribute('href')!.split('?')[1])
  expect(params.get('baniDbId')).toBe('4')
  expect(params.has('resumeVerseId')).toBe(false)
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close your banis' }))
  expect(screen.getByRole('progressbar', { name: 'Daily Nitnem' })).toHaveAttribute('aria-valuenow', '1')
})

test('keeps older exact Study places as a secondary action without starting today at an old verse', () => {
  const japji = getNitnemOption('japji-sahib')!
  const jaap = getNitnemOption('jaap-sahib')!
  useReadingPlacesStore.getState().remember({ scriptureId: 'G-1', resumePath: buildNitnemStudyPath(japji), resumeVerseId: 222, updatedAt: '2026-04-10T08:00:00.000Z' })
  useReadingPlacesStore.getState().remember({ scriptureId: 'D-1', resumePath: buildNitnemStudyPath(jaap), resumeVerseId: 777, updatedAt: '2026-04-10T08:30:00.000Z' })
  useProgressStore.setState({ currentSession: { scriptureId: 'G-12', resumePath: '/study?source=G&ang=12', resumeVerseId: 999, updatedAt: new Date().toISOString() } })
  renderHome()
  expect(screen.getByTestId('home-nitnem-primary-action')).toHaveTextContent('Begin reading')
  expect(screen.getByTestId('home-nitnem-primary-action').getAttribute('href')).not.toContain('resumeVerseId')
  expect(screen.getByRole('link', { name: 'Resume saved study' }).getAttribute('href')).toContain('resumeVerseId=222')
  const dialog = openAllBanis()
  expect(within(dialog).getByRole('link', { name: 'Begin reading: Japji Sahib' }).getAttribute('href')).not.toContain('resumeVerseId')
  expect(within(dialog).getByRole('link', { name: 'Begin reading: Jaap Sahib' }).getAttribute('href')).not.toContain('resumeVerseId')
  expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(999)
})

test('a newly retained general Study place cannot take over the daily practice', () => {
  renderHome()
  const jaap = getNitnemOption('jaap-sahib')!
  act(() => useReadingPlacesStore.getState().remember({ scriptureId: 'D-1', resumePath: buildNitnemStudyPath(jaap), resumeVerseId: 777, updatedAt: new Date().toISOString() }))
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', 'japji-sahib')
  expect(screen.getByTestId('home-nitnem-primary-action')).toHaveTextContent('Begin reading')
  expect(screen.getByTestId('home-nitnem-primary-action').getAttribute('href')).not.toContain('resumeVerseId')
  expect(useNitnemPracticeStore.getState().active).toBeNull()
  expect(useProgressStore.getState().currentSession).toBeNull()
})

test('direct reading links preserve the selected length and exact Savaiye variant without reusing incompatible positions', () => {
  const rehras = getNitnemOption('rehras-sahib')!
  useSundarGutkaLengthStore.getState().setLength('rehras-sahib', 'short')
  const savedShort = buildNitnemStudyPath(rehras)
  useSundarGutkaLengthStore.getState().setLength('rehras-sahib', 'long')
  useNitemStore.setState({ selectedIds: ['rehras-sahib', 'tav-prasad-savaiye-dheenan-ki'] })
  useProgressStore.setState({ currentSession: { scriptureId: 'G-8', resumePath: savedShort, resumeVerseId: 555, updatedAt: new Date().toISOString() } })
  renderHome()

  const current = new URLSearchParams(screen.getByTestId('home-nitnem-primary-action').getAttribute('href')!.split('?')[1])
  expect(current.get('baniDbId')).toBe('21')
  expect(current.get('sgLength')).toBe('long')
  expect(current.has('resumeVerseId')).toBe(false)
  expect(screen.getByTestId('home-nitnem-primary-action')).toHaveTextContent('Begin reading')
  const next = within(screen.getByTestId('home-nitnem-next')).getByRole('link')
  const variant = new URLSearchParams(next.getAttribute('href')!.split('?')[1])
  expect(variant.get('baniDbId')).toBe('7')
  expect(variant.get('exactBani')).toBe('1')
  expect(variant.has('resumeVerseId')).toBe(false)
})

test('crossing local midnight resets today while retaining yesterday’s actual practice', () => {
  vi.setSystemTime(new Date(2026, 3, 11, 23, 59, 40))
  useNitemStore.setState({
    selectedIds: ['japji-sahib', 'jaap-sahib'], completionTrackingEnabled: true,
    completedDate: todayStamp(), completedIds: ['japji-sahib'],
  })
  renderHome()
  expect(screen.getByRole('progressbar', { name: 'Daily Nitnem' })).toHaveAttribute('aria-valuenow', '1')
  act(() => vi.advanceTimersByTime(21000))

  expect(todayStamp()).toBe('2026-04-12')
  expect(useNitemStore.getState().completedDate).toBe('2026-04-12')
  expect(useNitemStore.getState().completedIds).toEqual([])
  expect(screen.getByRole('progressbar', { name: 'Daily Nitnem' })).toHaveAttribute('aria-valuenow', '0')
  expect(screen.getByRole('button', { name: 'Mark complete: Japji Sahib' })).toHaveAttribute('aria-pressed', 'false')
  expect(within(screen.getByTestId('home-week')).getByLabelText('Saturday, April 11: Practice recorded')).toHaveAttribute('datetime', '2026-04-11')
  expect(within(screen.getByTestId('home-week')).getByRole('link', { name: 'Weekly goal' })).toHaveTextContent('1 / 7 days')
})

test('keeps the first-day week calm and does not repeat reading readiness or generic bani descriptions', () => {
  useNitemStore.setState({ completionTrackingEnabled: true })
  renderHome()
  const week = screen.getByTestId('home-week')
  expect(week).toHaveAttribute('data-practice-state', 'empty')
  expect(within(week).getByText('One completed bani records a day of practice.')).toBeVisible()
  expect(within(week).queryByText('0 day streak')).not.toBeInTheDocument()
  expect(within(week).queryByText('Best: 0')).not.toBeInTheDocument()
  const panel = screen.getByTestId('home-nitnem-reading-panel')
  expect(within(panel).queryByText('Ready to read')).not.toBeInTheDocument()
  expect(within(panel).queryByText('Morning bani.')).not.toBeInTheDocument()
  expect(within(panel).getByRole('button', { name: 'Mark complete: Japji Sahib' })).toHaveAttribute('aria-pressed', 'false')
  expect(screen.getAllByRole('button', { name: 'Reading preferences' })).toHaveLength(1)
})

test('distinguishes one recorded practice day from completion of every selected bani', () => {
  useNitemStore.setState({ completionTrackingEnabled: true, selectedIds: ['japji-sahib', 'jaap-sahib'] })
  renderHome()
  fireEvent.click(screen.getByRole('button', { name: 'Mark complete: Japji Sahib' }))
  const week = screen.getByTestId('home-week')
  expect(week).toHaveAttribute('data-practice-state', 'in-progress')
  expect(within(week).getByText('Today’s practice is recorded.')).toBeVisible()
  expect(within(week).getByRole('link', { name: 'Weekly goal' })).toHaveTextContent('1 / 7 days')
  expect(within(week).getByLabelText('Saturday, April 11: Practice recorded')).toHaveTextContent('11')
  expect(screen.queryByTestId('home-nitnem-finished')).not.toBeInTheDocument()

  const dialog = openAllBanis()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Mark complete: Jaap Sahib' }))
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close your banis' }))
  expect(screen.getByTestId('home-nitnem-finished')).toHaveTextContent('Your Nitnem is complete.')
  expect(within(week).getByRole('link', { name: 'Weekly goal' })).toHaveTextContent('1 / 7 days')
  expect(within(week).queryByText('Your weekly goal is met.')).not.toBeInTheDocument()
  expect(screen.queryByTestId('home-nitnem-primary-action')).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Read again' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Revisit your banis' })).toBeVisible()
})

test('shows a met weekly goal from retained history without claiming today or the routine is complete', () => {
  useNitemStore.setState({ completionTrackingEnabled: true, weeklyDayGoal: 2 })
  useNitnemHistoryStore.setState({ events: [historyEvent('2026-04-09'), historyEvent('2026-04-10')] })
  renderHome()
  const week = screen.getByTestId('home-week')
  expect(week).toHaveAttribute('data-practice-state', 'goal-met')
  expect(within(week).getByRole('link', { name: 'Weekly goal' })).toHaveTextContent('2 / 2 days')
  expect(within(week).queryByText('Today’s practice is recorded.')).not.toBeInTheDocument()
  expect(screen.queryByTestId('home-nitnem-finished')).not.toBeInTheDocument()
  expect(screen.getByRole('progressbar', { name: 'Daily Nitnem' })).toHaveAttribute('aria-valuenow', '0')
})


test('the first-screen Nitnem entry begins fresh and preserves the exact intentional reader origin', () => {
  const japji = getNitnemOption('japji-sahib')!
  useReadingPlacesStore.getState().remember({ scriptureId: 'G-1', resumePath: buildNitnemStudyPath(japji), resumeVerseId: 999, updatedAt: '2026-04-10T08:00:00.000Z' })
  renderHomeRoutes()
  const entry = screen.getByTestId('home-nitnem-entry')
  expect(entry).toHaveTextContent('Begin Nitnem')
  expect(entry.compareDocumentPosition(screen.getByTestId('home-hero-art-stage')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  fireEvent.click(entry)
  const params = new URLSearchParams(screen.getByTestId('home-destination').textContent!.split('?')[1])
  expect(params.get('baniId')).toBe('japji-sahib')
  expect(params.has('resumeVerseId')).toBe(false)
  expect(params.get('nitnemPractice')).toBe(useNitnemPracticeStore.getState().active?.startedAt)
  expect(useNitemStore.getState().completedIds).toEqual([])
})

test('an unfinished daily reading survives midnight and a usual-length change without changing Continue', () => {
  useNitemStore.setState({ selectedIds: ['rehras-sahib', 'japji-sahib'] })
  startPractice('rehras-sahib', 555)
  const original = useNitnemPracticeStore.getState().active!.readingPath
  renderHome()
  expect(screen.getByTestId('home-nitnem-entry')).toHaveTextContent('Continue Nitnem')
  act(() => {
    useSundarGutkaLengthStore.getState().setLength('rehras-sahib', 'long')
    vi.setSystemTime(new Date('2026-04-12T00:01:00'))
    vi.advanceTimersByTime(60000)
  })
  expect(screen.getByTestId('home-nitnem-primary-action')).toHaveAttribute('href', original)
  expect(screen.getByTestId('home-nitnem-entry')).toHaveAttribute('href', original)
  expect(screen.getByRole('button', { name: 'Rehras Sahib Length: Short' })).toBeInTheDocument()
})

function mockLengthChoices() {
  vi.spyOn(baniHook, 'useBani').mockReturnValue({
    entries: [], availableLengths: ['short', 'long'], resolvedLength: 'short', status: 'ready', issue: null,
    loading: false, refreshing: false, error: null, isCached: false, retry: vi.fn(),
  })
}

async function openHomeLength() {
  fireEvent.click(screen.getByRole('button', { name: 'Rehras Sahib Length: Short' }))
  const sheet = await screen.findByRole('dialog', { name: 'Bani length' })
  fireEvent.click(within(sheet).getByRole('radio', { name: 'Long' }))
  return sheet
}

test('reading a different length changes the active daily reading while preserving the usual Nitnem length', async () => {
  useNitemStore.setState({ selectedIds: ['rehras-sahib'] })
  mockLengthChoices()
  const load = vi.spyOn(baniSelection, 'loadExactBaniReading').mockResolvedValue({ entries: [], availableLengths: ['short', 'long'], resolvedLength: 'long' })
  renderHomeRoutes()
  const sheet = await openHomeLength()
  expect(within(sheet).getByRole('checkbox', { name: 'Use for my Nitnem' })).not.toBeChecked()
  expect(screen.queryByTestId('home-destination')).not.toBeInTheDocument()
  await waitFor(() => expect(within(sheet).getByRole('button', { name: 'Read long' })).toBeEnabled())
  expect(within(sheet).getByTestId('bani-length-destination')).toHaveTextContent('Start this length from its beginning.')
  fireEvent.click(within(sheet).getByRole('button', { name: 'Read long' }))
  await waitFor(() => expect(screen.getByTestId('home-destination')).toBeInTheDocument())
  const params = new URLSearchParams(screen.getByTestId('home-destination').textContent!.split('?')[1])
  expect(params.get('sgLength')).toBe('long')
  expect(params.get('nitnemPractice')).toBe(useNitnemPracticeStore.getState().active?.startedAt)
  expect(useSundarGutkaLengthStore.getState().lengths['rehras-sahib']).toBe('short')
  expect(load).toHaveBeenCalledWith(21, 'long', expect.any(AbortSignal))
})

test('Use for my Nitnem remembers the validated length only after the explicit Read action', async () => {
  useNitemStore.setState({ selectedIds: ['rehras-sahib'] })
  mockLengthChoices()
  vi.spyOn(baniSelection, 'loadExactBaniReading').mockResolvedValue({ entries: [], availableLengths: ['short', 'long'], resolvedLength: 'long' })
  renderHomeRoutes()
  const sheet = await openHomeLength()
  fireEvent.click(within(sheet).getByRole('checkbox', { name: 'Use for my Nitnem' }))
  expect(useSundarGutkaLengthStore.getState().lengths['rehras-sahib']).toBe('short')
  await waitFor(() => expect(within(sheet).getByRole('button', { name: 'Read long' })).toBeEnabled())
  expect(within(sheet).getByTestId('bani-length-destination')).toHaveTextContent('Start this length from its beginning.')
  fireEvent.click(within(sheet).getByRole('button', { name: 'Read long' }))
  await waitFor(() => expect(screen.getByTestId('home-destination')).toBeInTheDocument())
  expect(useSundarGutkaLengthStore.getState().lengths['rehras-sahib']).toBe('long')
})

test('an unavailable length blocks Read and leaves the exact reading and preference unchanged until a successful retry', async () => {
  useNitemStore.setState({ selectedIds: ['rehras-sahib'] })
  startPractice('rehras-sahib', 555)
  const original = useNitnemPracticeStore.getState().active
  mockLengthChoices()
  const load = vi.spyOn(baniSelection, 'loadExactBaniReading').mockRejectedValue(new Error('This length is not available offline.'))
  renderHomeRoutes()
  const sheet = await openHomeLength()
  fireEvent.click(within(sheet).getByRole('checkbox', { name: 'Use for my Nitnem' }))
  await waitFor(() => expect(within(sheet).getByRole('alert')).toHaveTextContent('not available offline'))
  expect(within(sheet).getByRole('button', { name: 'Read long' })).toBeDisabled()
  expect(useNitnemPracticeStore.getState().active).toEqual(original)
  expect(useSundarGutkaLengthStore.getState().lengths['rehras-sahib']).toBe('short')
  expect(screen.queryByTestId('home-destination')).not.toBeInTheDocument()
  expect(within(sheet).getByRole('button', { name: 'Retry' })).toBeEnabled()
  load.mockResolvedValue({ entries: [], availableLengths: ['short', 'long'], resolvedLength: 'long' })
  fireEvent.click(within(sheet).getByRole('button', { name: 'Retry' }))
  await waitFor(() => expect(within(sheet).getByRole('button', { name: 'Read long' })).toBeEnabled())
  expect(within(sheet).getByTestId('bani-length-destination')).toHaveTextContent('Start this length from its beginning.')
  expect(useNitnemPracticeStore.getState().active).toEqual(original)
  expect(useSundarGutkaLengthStore.getState().lengths['rehras-sahib']).toBe('short')
  fireEvent.click(within(sheet).getByRole('button', { name: 'Read long' }))
  await waitFor(() => expect(screen.getByTestId('home-destination')).toBeInTheDocument())
  expect(useSundarGutkaLengthStore.getState().lengths['rehras-sahib']).toBe('long')
})

test('closing during length preflight cancels it without navigating or committing a later response', async () => {
  useNitemStore.setState({ selectedIds: ['rehras-sahib'] })
  mockLengthChoices()
  let finish!: (reading: Awaited<ReturnType<typeof baniSelection.loadExactBaniReading>>) => void
  const load = vi.spyOn(baniSelection, 'loadExactBaniReading').mockImplementation((_id, length) => length === 'short'
    ? Promise.resolve({ entries: [], availableLengths: ['short', 'long'], resolvedLength: 'short' })
    : new Promise(resolve => { finish = resolve }))
  renderHomeRoutes()
  const sheet = await openHomeLength()
  await waitFor(() => expect(load).toHaveBeenCalledWith(21, 'long', expect.any(AbortSignal)))
  const signal = load.mock.calls.find(call => call[1] === 'long')![2]!
  expect(within(sheet).getByRole('button', { name: 'Read long' })).toBeDisabled()
  expect(within(sheet).getByTestId('bani-length-destination')).toHaveTextContent('Checking where this reading will open…')
  fireEvent.click(within(sheet).getByRole('button', { name: 'Close bani length' }))
  expect(signal.aborted).toBe(true)
  await act(async () => finish({ entries: [], availableLengths: ['short', 'long'], resolvedLength: 'long' }))
  expect(useNitnemPracticeStore.getState().active).toBeNull()
  expect(useSundarGutkaLengthStore.getState().lengths['rehras-sahib']).toBe('short')
  expect(screen.queryByTestId('home-destination')).not.toBeInTheDocument()
})

test('the navigator distinguishes the completed version from the currently chosen usual length', () => {
  useNitemStore.setState({ selectedIds: ['rehras-sahib', 'japji-sahib'], completionTrackingEnabled: true })
  renderHome()
  fireEvent.click(screen.getByRole('button', { name: 'Mark complete: Rehras Sahib' }))
  act(() => useSundarGutkaLengthStore.getState().setLength('rehras-sahib', 'long'))
  const navigator = openAllBanis()
  expect(within(navigator).getByText('Evening · Long')).toBeInTheDocument()
  expect(within(navigator).getByText('Recorded today · Short')).toBeInTheDocument()
  fireEvent.click(within(navigator).getByRole('button', { name: 'Undo completion: Rehras Sahib' }))
  expect(useNitnemHistoryStore.getState().events.at(-1)?.readingPath).toContain('sgLength=short')
  expect(useNitemStore.getState().completedIds).toEqual([])
})


test('a completed day keeps an unfinished intentional Long reading visible without rewriting Short completion', () => {
  const option = getNitnemOption('rehras-sahib')!
  useNitemStore.setState({ selectedIds: [option.id], completionTrackingEnabled: true })
  renderHome()
  fireEvent.click(screen.getByRole('button', { name: 'Mark complete: Rehras Sahib' }))
  expect(screen.getByTestId('home-nitnem-finished')).toBeInTheDocument()
  const recorded = useNitnemHistoryStore.getState().events.at(-1)!
  act(() => {
    const params = new URLSearchParams(buildNitnemStudyPath(option).split('?')[1])
    params.set('sgLength', 'long')
    params.set('resumeVerseId', '555')
    useNitnemPracticeStore.getState().start(option.id, `/study?${params}`)
  })
  const activePath = useNitnemPracticeStore.getState().active!.readingPath
  expect(screen.getByTestId('home-nitnem-entry')).toHaveTextContent('Rehras Sahib · Long')
  expect(screen.getByTestId('home-nitnem-entry')).toHaveTextContent('Continue Nitnem')
  expect(screen.getByTestId('home-nitnem-entry')).toHaveAttribute('href', activePath)
  expect(screen.getByTestId('home-nitnem-primary-action')).toHaveTextContent('Continue reading')
  expect(screen.getByTestId('home-nitnem-primary-action')).toHaveAttribute('href', activePath)
  expect(screen.queryByTestId('home-nitnem-finished')).not.toBeInTheDocument()
  expect(screen.getByRole('progressbar', { name: 'Daily Nitnem' })).toHaveAttribute('aria-valuenow', '1')
  expect(screen.getByText('Recorded today · Short')).toBeInTheDocument()
  expect(useNitnemHistoryStore.getState().events.at(-1)).toEqual(recorded)
  fireEvent.click(screen.getByRole('button', { name: 'Your bani' }))
  const navigator = screen.getByRole('dialog', { name: 'Your Nitnem' })
  expect(within(navigator).getByRole('link', { name: 'Continue reading: Rehras Sahib' })).toHaveAttribute('href', activePath)
  expect(within(navigator).getByText('Recorded today · Short')).toBeInTheDocument()
  expect(within(navigator).getByRole('button', { name: 'Undo completion: Rehras Sahib' })).toBeInTheDocument()
})

test('switching a composite Rehras length preserves the resumed verse source independently of the route source', async () => {
  const option = getNitnemOption('rehras-sahib')!
  useNitemStore.setState({ selectedIds: [option.id] })
  const params = new URLSearchParams(buildNitnemStudyPath(option).split('?')[1])
  params.set('ang', '1386')
  params.set('resumeVerseId', '555')
  params.set('resumeSource', 'D')
  useNitnemPracticeStore.getState().start(option.id, `/study?${params}`)
  const startedAt = useNitnemPracticeStore.getState().active!.startedAt
  mockLengthChoices()
  const opening = buildReadyHukamnama().data!.entry
  const openingLine = opening.lines![0]
  vi.spyOn(baniSelection, 'loadExactBaniReading').mockResolvedValue({
    entries: [
      { ...opening, id: 'rehras-g-opening', source: 'G', ang: 8, lines: [{ ...openingLine, verseId: 111, ang: 8 }] },
      { ...opening, id: 'rehras-d-body', source: 'D', scripture: 'Dasam Granth', ang: 1386, lines: [{ ...openingLine, verseId: 555, ang: 1386 }] },
    ],
    availableLengths: ['short', 'long'], resolvedLength: 'long',
  })
  renderHomeRoutes()
  const sheet = await openHomeLength()
  await waitFor(() => expect(within(sheet).getByRole('button', { name: 'Read long' })).toBeEnabled())
  expect(within(sheet).getByTestId('bani-length-destination')).toHaveTextContent('Continue at the same verse in this length.')
  fireEvent.click(within(sheet).getByRole('button', { name: 'Read long' }))
  await waitFor(() => expect(screen.getByTestId('home-destination')).toBeInTheDocument())
  const destination = new URLSearchParams(screen.getByTestId('home-destination').textContent!.split('?')[1])
  expect(destination.get('source')).toBe('G')
  expect(destination.get('sgLength')).toBe('long')
  expect(destination.get('resumeVerseId')).toBe('555')
  expect(destination.get('resumeSource')).toBe('D')
  expect(destination.get('ang')).toBe('1386')
  expect(destination.get('nitnemPractice')).toBe(startedAt)
  expect(useNitnemPracticeStore.getState().active?.startedAt).toBe(startedAt)
  expect(useNitemStore.getState().completedIds).toEqual([])
})
