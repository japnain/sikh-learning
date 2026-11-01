import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import Banis from './Banis'
import * as banidbApi from '../api/banidb'
import * as appSearch from '../utils/appSearch'
import * as appScroll from '../utils/appScroll'
import { useLocaleStore } from '../store/locale'
import { useRecentSearchStore } from '../store/recentSearch'
import { READ_SEARCH_UI } from '../content/readSearchCopy'
import * as libraryRepository from '../data/libraryRepository'

function LocationSpy() {
  const location = useLocation()
  return <output data-testid="search-location">{location.search}</output>
}

function renderSearch(path = '/banis') {
  return render(<MemoryRouter initialEntries={[path]}><Banis /><LocationSpy /></MemoryRouter>)
}

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  useLocaleStore.setState({ locale: 'en' })
  useRecentSearchStore.setState({ recent: [] })
  vi.spyOn(banidbApi, 'fetchBanisIndex').mockResolvedValue([])
  vi.spyOn(banidbApi, 'fetchSearch').mockResolvedValue([])
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
  expect(banidbApi.fetchSearch).not.toHaveBeenCalled()
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
  const resolvers: Array<(results: banidbApi.SearchResult[]) => void> = []
  vi.mocked(banidbApi.fetchSearch).mockImplementation(() => new Promise(resolve => resolvers.push(resolve)))
  renderSearch('/banis?scope=gurbani')
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'truth' } })
  fireEvent.submit(screen.getByRole('search'))
  await waitFor(() => expect(resolvers.length).toBeGreaterThan(1))
  await act(async () => { resolvers[0]([]) })
  act(flush)
  expect(scroll).toHaveBeenCalledTimes(1)
  await act(async () => { resolvers.slice(1).forEach(resolve => resolve([])) })
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
  const gurbaniRequests = vi.mocked(banidbApi.fetchSearch).mock.calls.length
  await act(async () => { refresh({ works: [], workById: {} }) })
  expect(await screen.findByRole('button', { name: /Fresh Nanak book/ })).toBeInTheDocument()
  await act(async () => { resolveOldBooks([]) })
  act(flush)
  expect(screen.getByRole('button', { name: /Fresh Nanak book/ })).toBeInTheDocument()
  expect(banidbApi.fetchSearch).toHaveBeenCalledTimes(gurbaniRequests)
  expect(scroll).not.toHaveBeenCalled()
})
