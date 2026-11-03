import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import Banis from './Banis'
import * as banidbApi from '../api/banidb'
import { clearGurbaniSearchSessions } from '../utils/gurbaniSearchSession'
import * as appSearch from '../utils/appSearch'
import * as appScroll from '../utils/appScroll'
import { useLocaleStore } from '../store/locale'
import { useLanguageStore } from '../store/language'
import { useRecentSearchStore } from '../store/recentSearch'
import { READ_SEARCH_UI } from '../content/readSearchCopy'
import { SEARCH_INTENT_COPY } from '../content/searchIntentCopy'
import * as libraryRepository from '../data/libraryRepository'

function LocationSpy() {
  const location = useLocation()
  return <output data-testid="search-location">{location.search}</output>
}

function renderSearch(path = '/banis') {
  return render(<MemoryRouter initialEntries={[path]}><Banis /><LocationSpy /></MemoryRouter>)
}

function searchPage(results: banidbApi.SearchResult[], page = 1, nextPage: number | null = null, totalResults = results.length) {
  return { results, page, nextPage, totalResults }
}

beforeEach(() => {
  vi.restoreAllMocks()
  clearGurbaniSearchSessions()
  localStorage.clear()
  useLocaleStore.setState({ locale: 'en' })
  useLanguageStore.setState({ scriptMode: 'gurmukhi', showTransliteration: true, meaningLanguage: 'en' })
  useRecentSearchStore.setState({ recent: [] })
  vi.spyOn(banidbApi, 'fetchBanisIndex').mockResolvedValue([])
  vi.spyOn(banidbApi, 'fetchSearchPage').mockResolvedValue(searchPage([]))
  vi.spyOn(appSearch, 'getLibrarySearchMatches').mockResolvedValue([])
  vi.spyOn(appSearch, 'getStorySearchMatches').mockResolvedValue([])
})

test.each(['__proto__', 'constructor', 'toString'])('invalid mode/source %s fall back without crashing', key => {
  renderSearch(`/banis?mode=${key}&source=${key}`)
  expect(screen.getByRole('searchbox')).toHaveValue('')
  expect(screen.getByText('Auto detect')).toBeInTheDocument()
})

test('restores query, mode, source and scope atomically from a recent search', async () => {
  useRecentSearchStore.getState().addRecent('Bhai Lalo', 'english', 'D', 'stories')
  renderSearch('/banis?scope=books&mode=transliteration&source=G&raag=Asa&matches=36')
  fireEvent.click(screen.getByRole('button', { name: /Bhai Lalo · Stories/ }))
  fireEvent.submit(screen.getByRole('search'))
  await waitFor(() => expect(appSearch.getStorySearchMatches).toHaveBeenCalledWith('Bhai Lalo'))
  expect(appSearch.getLibrarySearchMatches).not.toHaveBeenCalled()
  expect(banidbApi.fetchSearchPage).not.toHaveBeenCalled()
  const params = new URLSearchParams(screen.getByTestId('search-location').textContent!)
  expect(Object.fromEntries(params)).toEqual({ query: 'Bhai Lalo', mode: 'english', source: 'D', scope: 'stories' })
  expect(useRecentSearchStore.getState().recent).toHaveLength(1)
  expect(useRecentSearchStore.getState().recent[0].scope).toBe('stories')
})

test.each(['en', 'pa', 'hi'] as const)('history starts with three entries, expands and keeps pins when cleared (%s)', locale => {
  useLocaleStore.setState({ locale })
  const store = useRecentSearchStore.getState()
  for (let i = 0; i < 5; i++) store.addRecent(`History ${i}`, 'auto-detect', 'all', 'books')
  store.togglePinned('History 0', 'auto-detect', 'all', 'books')
  renderSearch()
  const ui = READ_SEARCH_UI[locale]
  expect(screen.getAllByRole('button', { name: /^History \d ·/ })).toHaveLength(3)
  fireEvent.click(screen.getByRole('button', { name: ui.moreRecent(5) }))
  expect(screen.getAllByRole('button', { name: /^History \d ·/ })).toHaveLength(5)
  fireEvent.click(screen.getByRole('button', { name: ui.fewerRecent }))
  expect(screen.getAllByRole('button', { name: /^History \d ·/ })).toHaveLength(3)
  fireEvent.click(screen.getByRole('button', { name: ui.clearHistory }))
  expect(screen.getAllByRole('button', { name: /^History \d ·/ })).toHaveLength(1)
  expect(screen.getByRole('button', { name: /^History 0 ·/ })).toBeInTheDocument()
})

test.each(['books', 'stories'] as const)('%s empty states offer examples for that scope', async scope => {
  renderSearch(`/banis?query=nomatch&scope=${scope}`)
  fireEvent.submit(screen.getByRole('search'))
  const examples = await screen.findByRole('group', { name: 'Try an example' })
  expect(within(examples).getAllByRole('button').map(button => button.textContent)).toEqual(READ_SEARCH_UI.en.examples[scope])
  expect(within(examples).queryByRole('button', { name: 'Japji Sahib' })).not.toBeInTheDocument()
  fireEvent.click(within(examples).getAllByRole('button')[0])
  expect(screen.getByTestId('search-location')).toHaveTextContent(`scope=${scope}`)
})

test.each([true, false])('Enter flushes the pending search and handles coarse-pointer focus (%s)', async coarsePointer => {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: coarsePointer } as MediaQueryList)
  renderSearch('/banis?scope=stories')
  const input = screen.getByRole('searchbox')
  input.focus()
  fireEvent.change(input, { target: { value: 'Lalo' } })
  expect(appSearch.getStorySearchMatches).not.toHaveBeenCalled()
  await userEvent.keyboard('{Enter}')
  expect(appSearch.getStorySearchMatches).toHaveBeenCalledTimes(1)
  if (coarsePointer) expect(input).not.toHaveFocus()
  else expect(input).toHaveFocus()
})

function mockRevealLayout() {
  const frames: FrameRequestCallback[] = []
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.push(callback); return frames.length })
  vi.spyOn(appScroll, 'getAppViewportBounds').mockReturnValue({ top: 0, bottom: 500, height: 500 })
  vi.spyOn(appScroll, 'getAppScrollTop').mockReturnValue(0)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const top = this.id === 'banis-search' ? 100 : 700
    return { top, bottom: top + 150, height: 150, left: 0, right: 300, width: 300, x: 0, y: top, toJSON() {} }
  })
  const scroll = vi.spyOn(appScroll, 'scrollAppTo').mockImplementation(() => {})
  return { scroll, flush: () => { while (frames.length) frames.shift()!(0) } }
}

test('one explicit search reveals once even when other providers finish later', async () => {
  const { scroll, flush } = mockRevealLayout()
  const resolvers: Array<(results: ReturnType<typeof searchPage>) => void> = []
  vi.mocked(banidbApi.fetchSearchPage).mockImplementation(() => new Promise(resolve => resolvers.push(resolve)))
  renderSearch('/banis?scope=gurbani')
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'truth' } })
  fireEvent.submit(screen.getByRole('search'))
  await waitFor(() => expect(resolvers.length).toBeGreaterThan(1))
  await act(async () => { resolvers[0](searchPage([])) })
  act(flush)
  expect(scroll).toHaveBeenCalledTimes(1)
  await act(async () => { resolvers.slice(1).forEach(resolve => resolve(searchPage([]))) })
  act(flush)
  expect(scroll).toHaveBeenCalledTimes(1)
})

test.each(['wheel', 'touchmove', 'pointerdown', 'keydown'])('user %s cancels a pending search reveal', async eventType => {
  const { scroll, flush } = mockRevealLayout()
  let resolveSearch!: (results: appSearch.AppSearchMatch[]) => void
  vi.mocked(appSearch.getStorySearchMatches).mockImplementation(() => new Promise(resolve => { resolveSearch = resolve }))
  renderSearch('/banis?scope=stories')
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Lalo' } })
  // Start the debounced provider without submitting, which would claim reveal immediately.
  await waitFor(() => expect(appSearch.getStorySearchMatches).toHaveBeenCalled())
  if (eventType === 'keydown') fireEvent.keyDown(window, { key: 'PageDown' })
  else fireEvent(window, new Event(eventType, { bubbles: true }))
  await act(async () => { resolveSearch([]) })
  act(flush)
  expect(scroll).not.toHaveBeenCalled()
})

test('navigation to an existing search does not claim a fresh automatic reveal', async () => {
  const { scroll, flush } = mockRevealLayout()
  renderSearch('/banis?query=Lalo&scope=stories')
  await screen.findByRole('heading', { name: 'No matches yet' })
  act(flush)
  expect(scroll).not.toHaveBeenCalled()
})

test('background catalog refresh updates metadata without restarting Gurbani or allowing stale results to overwrite it', async () => {
  const { scroll, flush } = mockRevealLayout()
  let refresh!: Parameters<typeof libraryRepository.subscribeLibraryDiscoveryCatalog>[0]
  vi.spyOn(libraryRepository, 'subscribeLibraryDiscoveryCatalog').mockImplementation(listener => { refresh = listener; return () => {} })
  let resolveOldBooks!: (results: appSearch.AppSearchMatch[]) => void
  vi.mocked(appSearch.getLibrarySearchMatches)
    .mockImplementationOnce(() => new Promise(resolve => { resolveOldBooks = resolve }))
    .mockResolvedValue([{ key: 'new-book', kind: 'library-work', label: 'Fresh Nanak book', detail: 'Book', path: '/library/new-book', score: 90 }])
  renderSearch('/banis?query=Nanak')
  await waitFor(() => expect(appSearch.getLibrarySearchMatches).toHaveBeenCalledTimes(1))
  const gurbaniRequests = vi.mocked(banidbApi.fetchSearchPage).mock.calls.length
  await act(async () => { refresh({ works: [], workById: {} }) })
  expect(await screen.findByRole('button', { name: /Fresh Nanak book/ })).toBeInTheDocument()
  await act(async () => { resolveOldBooks([]) })
  act(flush)
  expect(screen.getByRole('button', { name: /Fresh Nanak book/ })).toBeInTheDocument()
  expect(banidbApi.fetchSearchPage).toHaveBeenCalledTimes(gurbaniRequests)
  expect(scroll).not.toHaveBeenCalled()
})

const MEANING_RESULT: banidbApi.SearchResult = {
  shabadId: 701, verseId: 702, source: 'G', pageNo: 2,
  sourceName: 'Sri Guru Granth Sahib Ji', gurmukhi: 'ਦੁਖੁ ਪਰਹਰਿ ਸੁਖੁ ਘਰਿ ਲੈ ਜਾਇ ॥',
  transliteration: 'dhukh parahar sukh ghar lai jai ||',
  translation_en: 'Your pain shall be sent far away, and peace shall come to your home.',
  raag: 'Jap', writer: 'Guru Nanak Dev Ji',
}
const NEXT_MEANING_RESULT: banidbApi.SearchResult = {
  ...MEANING_RESULT, shabadId: 710, verseId: 711, pageNo: 11,
  gurmukhi: 'ਜਿਨਿ ਹਰਿ ਸੇਵਿਆ ਤਿਨਿ ਸੁਖੁ ਪਾਇਆ ॥',
  transliteration: 'jin har seviaa tin sukh paiaa ||', translation_en: 'Those who serve You find peace.',
}

function submitMeaningSearch() {
  renderSearch('/banis?query=%22peace%22&mode=english&scope=gurbani')
  fireEvent.submit(screen.getByRole('search'))
}

test('loads the next provider page without losing existing matches or duplicating a verse', async () => {
  vi.mocked(banidbApi.fetchSearchPage).mockImplementation(async (_query, _type, _source, _context, _signal, page = 1) => (
    page === 1 ? searchPage([MEANING_RESULT], 1, 2, 2)
      : searchPage([MEANING_RESULT, NEXT_MEANING_RESULT], 2, null, 2)
  ))
  submitMeaningSearch()
  expect(await screen.findByTestId('banis-search-gurbani-results')).toHaveTextContent(MEANING_RESULT.translation_en)
  const more = await screen.findByTestId('search-load-more')
  await waitFor(() => expect(more).toBeEnabled())
  fireEvent.click(more)
  await waitFor(() => expect(screen.getAllByTestId('banis-search-gurbani-result')).toHaveLength(2))
  const results = screen.getByTestId('banis-search-gurbani-results')
  expect(results).toHaveTextContent(MEANING_RESULT.translation_en)
  expect(results).toHaveTextContent(NEXT_MEANING_RESULT.translation_en)
  expect(vi.mocked(banidbApi.fetchSearchPage).mock.calls.some(call => call[5] === 2)).toBe(true)
  expect(screen.queryByTestId('search-load-more')).not.toBeInTheDocument()
})

test('a failed next page keeps matches and retries the same page', async () => {
  let pageTwoAttempts = 0
  vi.mocked(banidbApi.fetchSearchPage).mockImplementation(async (_query, _type, _source, _context, _signal, page = 1) => {
    if (page === 1) return searchPage([MEANING_RESULT], 1, 2, 2)
    pageTwoAttempts += 1
    if (pageTwoAttempts === 1) throw new Error('temporary page failure')
    return searchPage([NEXT_MEANING_RESULT], 2, null, 2)
  })
  submitMeaningSearch()
  const more = await screen.findByTestId('search-load-more')
  await waitFor(() => expect(more).toBeEnabled())
  fireEvent.click(more)
  await waitFor(() => expect(pageTwoAttempts).toBe(1))
  await waitFor(() => expect(screen.getByTestId('search-load-more')).toBeEnabled())
  expect(screen.getByTestId('banis-search-gurbani-results')).toHaveTextContent(MEANING_RESULT.translation_en)
  fireEvent.click(screen.getByTestId('search-load-more'))
  await waitFor(() => expect(screen.getAllByTestId('banis-search-gurbani-result')).toHaveLength(2))
  expect(pageTwoAttempts).toBe(2)
  const requestedPages = vi.mocked(banidbApi.fetchSearchPage).mock.calls.map(call => call[5] ?? 1)
  expect(requestedPages).toEqual([1, 2, 2])
})

test.each(['query', 'mode'] as const)('changing the %s cancels pagination and ignores its late response', async change => {
  let pendingSignal: AbortSignal | undefined
  let resolveOldPage!: (value: ReturnType<typeof searchPage>) => void
  vi.mocked(banidbApi.fetchSearchPage).mockImplementation(async (query, type, _source, _context, signal, page = 1) => {
    if (query !== 'peace' || type !== 3) return searchPage([])
    if (page === 1) return searchPage([MEANING_RESULT], 1, 2, 2)
    pendingSignal = signal
    return new Promise(resolve => { resolveOldPage = resolve })
  })
  submitMeaningSearch()
  const more = await screen.findByTestId('search-load-more')
  await waitFor(() => expect(more).toBeEnabled())
  fireEvent.click(more)
  await waitFor(() => expect(pendingSignal).toBeDefined())
  if (change === 'query') fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'newquery' } })
  else fireEvent.click(screen.getByRole('button', { name: 'Transliteration', exact: true }))
  await waitFor(() => expect(pendingSignal?.aborted).toBe(true))
  await act(async () => { resolveOldPage(searchPage([NEXT_MEANING_RESULT], 2, null, 2)) })
  await screen.findByRole('heading', { name: 'No matches yet' })
  expect(screen.queryByTestId('banis-search-gurbani-result')).not.toBeInTheDocument()
  expect(screen.queryByTestId('search-load-more')).not.toBeInTheDocument()
})

test('changing search intent clears old facets and expanded result count', async () => {
  vi.mocked(banidbApi.fetchSearchPage).mockResolvedValue(searchPage([MEANING_RESULT]))
  renderSearch('/banis?query=peace&mode=english&scope=gurbani&raag=Jap&writer=Guru+Nanak+Dev+Ji&matches=36')
  await screen.findByTestId('banis-search-gurbani-result')
  fireEvent.click(screen.getByRole('button', { name: 'Transliteration', exact: true }))
  await waitFor(() => {
    const params = new URLSearchParams(screen.getByTestId('search-location').textContent!)
    expect(params.get('mode')).toBe('transliteration')
    expect(params.has('raag')).toBe(false)
    expect(params.has('writer')).toBe(false)
    expect(params.has('matches')).toBe(false)
  })
})


test.each(['transliteration', 'auto-detect'] as const)('%s shows the matched transliteration even when reader romanization is hidden', async mode => {
  useLanguageStore.setState({ showTransliteration: false, meaningLanguage: 'none' })
  const result = { ...MEANING_RESULT, transliteration: 'hukam rajaaee chalanaa', translation_en: 'Walk in harmony with the Divine command.' }
  vi.mocked(banidbApi.fetchSearchPage).mockImplementation(async (_query, type) => searchPage(type === 3 ? [] : [result]))
  renderSearch(`/banis?query=hukam&mode=${mode}&scope=gurbani`)
  const results = await screen.findByTestId('banis-search-gurbani-results')
  expect(results).toHaveTextContent('hukam rajaaee chalanaa')
  expect(results.querySelector('mark')).toHaveTextContent('hukam')
})


test('returning from a shabad restores loaded provider pages without dropping the later match', async () => {
  vi.mocked(banidbApi.fetchSearchPage).mockImplementation(async (_query, _type, _source, _context, _signal, page = 1) => (
    page === 1 ? searchPage([MEANING_RESULT], 1, 2, 2)
      : searchPage([NEXT_MEANING_RESULT], 2, null, 2)
  ))
  const view = renderSearch('/banis?query=%22peace%22&mode=english&scope=gurbani')
  const more = await screen.findByTestId('search-load-more')
  await waitFor(() => expect(more).toBeEnabled())
  fireEvent.click(more)
  await waitFor(() => expect(screen.getAllByTestId('banis-search-gurbani-result')).toHaveLength(2))
  const returnPath = `/banis${screen.getByTestId('search-location').textContent}`
  view.unmount()
  renderSearch(returnPath)
  await waitFor(() => expect(screen.getAllByTestId('banis-search-gurbani-result')).toHaveLength(2))
  expect(screen.getByTestId('banis-search-gurbani-results')).toHaveTextContent(NEXT_MEANING_RESULT.translation_en)
  expect(vi.mocked(banidbApi.fetchSearchPage)).toHaveBeenCalledTimes(2)
  expect(screen.queryByTestId('search-load-more')).not.toBeInTheDocument()
})

test('pagination cannot cache away a failed search mode when retrying a partial search', async () => {
  let phoneticAttempts = 0
  vi.mocked(banidbApi.fetchSearchPage).mockImplementation(async (_query, type, _source, _context, _signal, page = 1) => {
    if (type === 8) {
      phoneticAttempts += 1
      if (phoneticAttempts === 1) throw new Error('phonetic search unavailable')
      return searchPage([])
    }
    return page === 1 ? searchPage([MEANING_RESULT], 1, 2, 2) : searchPage([NEXT_MEANING_RESULT], 2, null, 2)
  })
  renderSearch('/banis?query=peace&scope=gurbani')
  const more = await screen.findByTestId('search-load-more')
  await waitFor(() => expect(more).toBeEnabled())
  fireEvent.click(more)
  await waitFor(() => expect(screen.getAllByTestId('banis-search-gurbani-result')).toHaveLength(2))
  fireEvent.click(screen.getByRole('button', { name: 'Retry', exact: true }))
  await waitFor(() => expect(phoneticAttempts).toBe(2))
  await waitFor(() => expect(document.querySelector('.read-search-partial')).toBeNull())
})

test('oversized shared search URLs explain the limit without sending a failing provider request', async () => {
  renderSearch(`/banis?query=${'ਕ'.repeat(161)}&scope=gurbani`)
  expect(await screen.findByRole('alert')).toHaveTextContent('Use up to 160 characters')
  expect(banidbApi.fetchSearchPage).not.toHaveBeenCalled()
  expect(screen.queryByRole('heading', { name: 'No matches yet' })).not.toBeInTheDocument()
  expect(screen.getByRole('searchbox')).toHaveAttribute('maxlength', '160')
})

test('transliteration uses phonetic candidates and excludes unrelated initials even when meanings are hidden', async () => {
  useLanguageStore.setState({ showTransliteration: false, meaningLanguage: 'none' })
  const exact = { ...MEANING_RESULT, transliteration: 'sat naam teraa paraa poorabalaa', translation_en: 'True is Your Name.' }
  const noise = { ...NEXT_MEANING_RESULT, transliteration: 'sat naanak har naam', translation_en: 'O Nanak, the Lord is true.' }
  vi.mocked(banidbApi.fetchSearchPage).mockResolvedValue(searchPage([noise, exact]))
  renderSearch('/banis?query=sat+nam&mode=transliteration&scope=gurbani')
  const result = await screen.findByTestId('banis-search-gurbani-result')
  expect(result).toHaveTextContent(exact.transliteration)
  expect(screen.getAllByTestId('banis-search-gurbani-result')).toHaveLength(1)
  expect(Array.from(result.querySelectorAll('mark')).map(mark => mark.textContent)).toEqual(expect.arrayContaining(['sat', 'naam']))
  expect(vi.mocked(banidbApi.fetchSearchPage).mock.calls.map(call => call[1])).toEqual([8])
})

test('a natural English question discloses related words and can return to its exact words', async () => {
  const literal = { ...MEANING_RESULT, translation_en: 'Anger blinds the mind.' }
  const related = { ...NEXT_MEANING_RESULT, translation_en: 'Wrath has no place in a peaceful heart.' }
  vi.mocked(banidbApi.fetchSearchPage).mockImplementation(async (query, type) => searchPage(
    type !== 3 ? [] : query === 'anger' ? [literal] : query === 'wrath' ? [related] : [],
  ))
  renderSearch(`/banis?query=${encodeURIComponent('What does Gurbani say about anger?')}&scope=gurbani`)
  await waitFor(() => expect(screen.getAllByTestId('banis-search-gurbani-result')).toHaveLength(2))
  expect(screen.getByTestId('search-meaning-plan')).toHaveTextContent('anger · wrath · rage')
  const results = screen.getAllByTestId('banis-search-gurbani-result')
  expect(results[0]).toHaveTextContent(literal.translation_en)
  expect(results[1]).toHaveTextContent('Related meaning · wrath')
  expect(results[1].querySelector('mark')).toHaveTextContent('Wrath')
  expect(vi.mocked(banidbApi.fetchSearchPage).mock.calls.map(call => [call[0], call[1]])).toEqual([
    ['anger', 3], ['wrath', 3], ['rage', 3],
  ])

  fireEvent.click(screen.getByRole('button', { name: 'Exact words only' }))
  await waitFor(() => expect(screen.getAllByTestId('banis-search-gurbani-result')).toHaveLength(1))
  expect(screen.getByRole('searchbox')).toHaveValue('"anger"')
  expect(new URLSearchParams(screen.getByTestId('search-location').textContent!).get('query')).toBe('"anger"')
  expect(screen.queryByText('Related meaning · wrath')).not.toBeInTheDocument()
  expect(vi.mocked(banidbApi.fetchSearchPage).mock.calls.slice(3).map(call => [call[0], call[1]])).toEqual([['anger', 3]])
})

test('phonetic search retrieves more than its twenty seed matches and restores the loaded pages', async () => {
  const rows = Array.from({ length: 25 }, (_, index): banidbApi.SearchResult => ({
    ...MEANING_RESULT, shabadId: 2000 + index, verseId: 3000 + index,
    gurmukhi: 'ਹੁਕਮਿ ਰਜਾਈ ਚਲਣਾ ॥', transliteration: 'hukam rajaaee chalanaa ||',
    translation_en: `Follow the Divine command ${index + 1}.`,
  }))
  vi.mocked(banidbApi.fetchSearchPage).mockImplementation(async (query, type, _source, _context, _signal, page = 1) => {
    if (type === 8 && query === 'hukam') return searchPage(rows.slice(0, 20))
    if (type === 6 && query === '*ਹਕਮ*') return page === 1
      ? searchPage(rows.slice(0, 20), 1, 2, 25)
      : searchPage(rows.slice(20), 2, null, 25)
    return searchPage([])
  })
  const view = renderSearch('/banis?query=hukam&mode=transliteration&scope=gurbani')
  await screen.findByRole('button', { name: 'Show more matches' })
  fireEvent.click(screen.getByRole('button', { name: 'Show more matches' }))
  const more = await screen.findByTestId('search-load-more')
  await waitFor(() => expect(more).toBeEnabled())
  expect(screen.getAllByTestId('banis-search-gurbani-result')).toHaveLength(20)
  fireEvent.click(more)
  await waitFor(() => expect(screen.getAllByTestId('banis-search-gurbani-result')).toHaveLength(25))
  expect(screen.queryByTestId('search-load-more')).not.toBeInTheDocument()
  expect(vi.mocked(banidbApi.fetchSearchPage).mock.calls.map(call => [call[0], call[1], call[5] ?? 1])).toEqual([
    ['hukam', 8, 1], ['*ਹਕਮ*', 6, 1], ['*ਹਕਮ*', 6, 2],
  ])
  await waitFor(() => expect(new URLSearchParams(screen.getByTestId('search-location').textContent!).get('matches')).toBe('25'))
  const returnPath = `/banis${screen.getByTestId('search-location').textContent}`
  view.unmount()
  renderSearch(returnPath)
  await waitFor(() => expect(screen.getAllByTestId('banis-search-gurbani-result')).toHaveLength(25))
  expect(vi.mocked(banidbApi.fetchSearchPage)).toHaveBeenCalledTimes(3)
})

test('one related meaning request can retry without losing or refetching another request’s loaded pages', async () => {
  const literal = { ...MEANING_RESULT, translation_en: 'Practice compassion.' }
  const laterLiteral = { ...NEXT_MEANING_RESULT, translation_en: 'Compassion fills the heart.' }
  const related = { ...NEXT_MEANING_RESULT, shabadId: 850, verseId: 851, translation_en: 'Grant us Your mercy.' }
  let mercyAttempts = 0
  vi.mocked(banidbApi.fetchSearchPage).mockImplementation(async (query, _type, _source, _context, _signal, page = 1) => {
    if (query === 'compassion') return page === 1 ? searchPage([literal], 1, 2, 2) : searchPage([laterLiteral], 2, null, 2)
    if (query === 'mercy') {
      mercyAttempts += 1
      if (mercyAttempts === 1) throw new Error('Meaning index temporarily unavailable')
      return searchPage([related])
    }
    return searchPage([])
  })
  renderSearch('/banis?query=compassion&mode=english&scope=gurbani')
  const more = await screen.findByTestId('search-load-more')
  await waitFor(() => expect(more).toBeEnabled())
  fireEvent.click(more)
  await waitFor(() => expect(screen.getAllByTestId('banis-search-gurbani-result')).toHaveLength(2))
  fireEvent.click(screen.getByRole('button', { name: 'Retry', exact: true }))
  await waitFor(() => expect(screen.getAllByTestId('banis-search-gurbani-result')).toHaveLength(3))
  const calls = vi.mocked(banidbApi.fetchSearchPage).mock.calls
  expect(calls.filter(call => call[0] === 'compassion').map(call => call[5] ?? 1)).toEqual([1, 2])
  expect(calls.filter(call => call[0] === 'mercy').map(call => call[5] ?? 1)).toEqual([1, 1])
  expect(calls.filter(call => call[0] === 'kindness')).toHaveLength(1)
  expect(screen.getByTestId('banis-search-gurbani-results')).toHaveTextContent(laterLiteral.translation_en)
  expect(document.querySelector('.read-search-partial')).toBeNull()
})

test('slow typing leaves search history clean until the user submits the original query', async () => {
  renderSearch('/banis?mode=english&scope=gurbani')
  const input = screen.getByRole('searchbox')
  for (const query of ['com', 'compa', 'compassion']) {
    fireEvent.change(input, { target: { value: query } })
    await waitFor(() => expect(vi.mocked(banidbApi.fetchSearchPage).mock.calls.some(call => call[0] === query)).toBe(true))
    await screen.findByRole('heading', { name: 'No matches yet' })
    expect(useRecentSearchStore.getState().recent).toEqual([])
  }
  fireEvent.submit(screen.getByRole('search'))
  expect(useRecentSearchStore.getState().recent).toHaveLength(1)
  expect(useRecentSearchStore.getState().recent[0]).toMatchObject({ query: 'compassion', mode: 'english', scope: 'gurbani' })
})

test('opening a Gurbani result records the intentional search even without submitting', async () => {
  vi.mocked(banidbApi.fetchSearchPage).mockImplementation(async (query, type) => searchPage(query === 'peace' && type === 3 ? [MEANING_RESULT] : []))
  renderSearch('/banis?mode=english&scope=gurbani')
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'peace' } })
  const result = await screen.findByTestId('banis-search-gurbani-result')
  expect(useRecentSearchStore.getState().recent).toEqual([])
  fireEvent.click(within(result).getAllByRole('button')[0])
  expect(useRecentSearchStore.getState().recent).toHaveLength(1)
  expect(useRecentSearchStore.getState().recent[0]).toMatchObject({ query: 'peace', mode: 'english', scope: 'gurbani' })
})

test.each(['english', 'transliteration'] as const)('empty-state examples preserve %s intent and source', async mode => {
  renderSearch(`/banis?query=nomatch&mode=${mode}&scope=gurbani&source=D&raag=Jap&matches=36`)
  const examples = await screen.findByRole('group', { name: 'Try an example' })
  const expected = SEARCH_INTENT_COPY.en.modes[mode].examples
  expect(within(examples).getAllByRole('button').map(button => button.textContent)).toEqual(expected)
  fireEvent.click(within(examples).getByRole('button', { name: expected[0], exact: true }))
  await waitFor(() => {
    const params = new URLSearchParams(screen.getByTestId('search-location').textContent!)
    expect(params.get('query')).toBe(expected[0])
    expect(params.get('mode')).toBe(mode)
    expect(params.get('source')).toBe('D')
    expect(params.has('raag')).toBe(false)
    expect(params.has('matches')).toBe(false)
  })
})

test('retrying a metadata failure and a related-meaning failure preserves successful remote pages', async () => {
  const first = { ...MEANING_RESULT, translation_en: 'Practice compassion.' }
  const second = { ...NEXT_MEANING_RESULT, translation_en: 'Keep compassion in your heart.' }
  const related = { ...NEXT_MEANING_RESULT, shabadId: 870, verseId: 871, translation_en: 'The Lord showers mercy.' }
  let mercyAttempts = 0
  vi.mocked(banidbApi.fetchSearchPage).mockImplementation(async (query, _type, _source, _context, _signal, page = 1) => {
    if (query === 'compassion') return page === 1 ? searchPage([first], 1, 2, 2) : searchPage([second], 2, null, 2)
    if (query === 'mercy') {
      if (++mercyAttempts === 1) throw new Error('Meaning search failed')
      return searchPage([related])
    }
    return searchPage([])
  })
  vi.mocked(appSearch.getLibrarySearchMatches).mockRejectedValueOnce(new Error('Books unavailable')).mockResolvedValue([])
  renderSearch('/banis?query=compassion&mode=english')
  const more = await screen.findByTestId('search-load-more')
  await waitFor(() => expect(more).toBeEnabled())
  fireEvent.click(more)
  await waitFor(() => expect(screen.getAllByTestId('banis-search-gurbani-result')).toHaveLength(2))
  expect(document.querySelector('.read-search-partial')).not.toBeNull()
  expect(appSearch.getLibrarySearchMatches).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Retry', exact: true }))
  await waitFor(() => expect(screen.getAllByTestId('banis-search-gurbani-result')).toHaveLength(3))
  await waitFor(() => expect(document.querySelector('.read-search-partial')).toBeNull())
  expect(appSearch.getLibrarySearchMatches).toHaveBeenCalledTimes(2)
  expect(appSearch.getStorySearchMatches).toHaveBeenCalledTimes(1)
  const calls = vi.mocked(banidbApi.fetchSearchPage).mock.calls
  expect(calls.filter(call => call[0] === 'compassion').map(call => call[5] ?? 1)).toEqual([1, 2])
  expect(calls.filter(call => call[0] === 'mercy').map(call => call[5] ?? 1)).toEqual([1, 1])
  expect(calls.filter(call => call[0] === 'kindness')).toHaveLength(1)
  expect(screen.getByTestId('banis-search-gurbani-results')).toHaveTextContent(second.translation_en)
})

test('a stale metadata rejection cannot replace a successful refreshed catalog with an error', async () => {
  let refresh!: Parameters<typeof libraryRepository.subscribeLibraryDiscoveryCatalog>[0]
  vi.spyOn(libraryRepository, 'subscribeLibraryDiscoveryCatalog').mockImplementation(listener => { refresh = listener; return () => {} })
  let rejectOldBooks!: (reason: Error) => void
  vi.mocked(appSearch.getLibrarySearchMatches)
    .mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOldBooks = reject }))
    .mockResolvedValue([{ key: 'fresh-nanak-book', kind: 'library-work', label: 'Fresh Nanak book', detail: 'Book', path: '/library/new-book', score: 90 }])
  renderSearch('/banis?query=Nanak')
  await waitFor(() => expect(appSearch.getLibrarySearchMatches).toHaveBeenCalledTimes(1))
  await act(async () => { refresh({ works: [], workById: {} }) })
  expect(await screen.findByRole('button', { name: /Fresh Nanak book/ })).toBeInTheDocument()
  await act(async () => { rejectOldBooks(new Error('Late stale failure')) })
  expect(screen.getByRole('button', { name: /Fresh Nanak book/ })).toBeInTheDocument()
  expect(document.querySelector('.read-search-partial')).toBeNull()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'No matches yet' })).not.toBeInTheDocument()
})

test('returning during an unfinished search preserves arrived matches and resumes only the pending request', async () => {
  const literal = { ...MEANING_RESULT, translation_en: 'Practice compassion.' }
  const related = { ...NEXT_MEANING_RESULT, translation_en: 'The Lord showers mercy.' }
  const stale = { ...NEXT_MEANING_RESULT, shabadId: 990, verseId: 991, translation_en: 'Stale mercy response.' }
  const pendingMercy: Array<(page: ReturnType<typeof searchPage>) => void> = []
  vi.mocked(banidbApi.fetchSearchPage).mockImplementation(async query => {
    if (query === 'compassion') return searchPage([literal])
    if (query === 'mercy') return new Promise(resolve => { pendingMercy.push(resolve) })
    return searchPage([])
  })
  const path = '/banis?query=compassion&mode=english&scope=gurbani'
  const view = renderSearch(path)
  expect(await screen.findByTestId('banis-search-gurbani-result')).toHaveTextContent(literal.translation_en)
  await waitFor(() => expect(vi.mocked(banidbApi.fetchSearchPage).mock.calls.some(call => call[0] === 'kindness')).toBe(true))
  view.unmount()
  renderSearch(path)
  await waitFor(() => expect(pendingMercy).toHaveLength(2))
  expect(screen.getByTestId('banis-search-gurbani-result')).toHaveTextContent(literal.translation_en)
  expect(vi.mocked(banidbApi.fetchSearchPage).mock.calls.filter(call => call[0] === 'compassion')).toHaveLength(1)
  expect(vi.mocked(banidbApi.fetchSearchPage).mock.calls.filter(call => call[0] === 'kindness')).toHaveLength(1)
  await act(async () => { pendingMercy[1](searchPage([related])) })
  await waitFor(() => expect(screen.getAllByTestId('banis-search-gurbani-result')).toHaveLength(2))
  await act(async () => { pendingMercy[0](searchPage([stale])) })
  expect(screen.getAllByTestId('banis-search-gurbani-result')).toHaveLength(2)
  expect(screen.getByTestId('banis-search-gurbani-results')).toHaveTextContent(related.translation_en)
  expect(screen.queryByText(stale.translation_en)).not.toBeInTheDocument()
})

test.each(['auto-detect', 'gurmukhi'] as const)('the complete one-character ੴ symbol is searchable in %s mode', async mode => {
  const symbol = { ...MEANING_RESULT, shabadId: 1, verseId: 1, gurmukhi: 'ੴ', transliteration: 'ikOankaar', translation_en: 'One Universal Creator God.' }
  vi.mocked(banidbApi.fetchSearchPage).mockImplementation(async (query, type) => searchPage(query === 'ੴ' && type === 2 ? [symbol] : []))
  renderSearch(`/banis?mode=${mode}&scope=gurbani`)
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ੴ' } })
  expect(await screen.findByTestId('banis-search-gurbani-result')).toHaveTextContent(symbol.gurmukhi)
  expect(screen.getByRole('searchbox')).toHaveValue('ੴ')
  expect(vi.mocked(banidbApi.fetchSearchPage).mock.calls.some(call => call[0] === 'ੴ' && call[1] === 2)).toBe(true)
  expect(screen.queryByRole('heading', { name: 'No matches yet' })).not.toBeInTheDocument()
})
