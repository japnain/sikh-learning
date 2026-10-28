import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import HomeDailyNitnem, { type HomeDailyNitnemProps } from './HomeDailyNitnem'
import { buildNitnemStudyPath, getNitnemOption } from '../store/nitnem'
import { useLanguageStore } from '../store/language'
import { useNitnemOfflineStatusStore } from '../store/nitnemOffline'
import { DEFAULT_SUNDAR_GUTKA_LENGTHS, useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { getExactReadingKey, useReadingPlacesStore } from '../store/readingPlaces'
import type { BaniFetchResult } from '../api/banidb'
import * as offlineCache from '../utils/baniOfflineCache'
import * as lengthSelection from '../utils/baniLengthSelection'
import * as baniHook from '../hooks/useBani'

const option = (id: string) => getNitnemOption(id)!
const selected = ['japji-sahib', 'jaap-sahib', 'tav-prasad-savaiye', 'chaupai-sahib', 'anand-sahib', 'rehras-sahib', 'kirtan-sohila'].map(option)
const defaults: HomeDailyNitnemProps = {
  selected, completed: new Set(), tracking: true, activeId: selected[0].id,
  getResume: () => null, onComplete: vi.fn(), locale: 'en',
}

beforeEach(() => {
  useLanguageStore.setState({ scriptMode: 'gurmukhi' })
  useSundarGutkaLengthStore.setState({ lengths: { ...DEFAULT_SUNDAR_GUTKA_LENGTHS } })
  useReadingPlacesStore.setState({ places: {} })
  useNitnemOfflineStatusStore.setState({ status: 'checking', ready: 0, total: 0, signature: '', retryRevision: 0 })
  vi.clearAllMocks()
})
afterEach(() => vi.restoreAllMocks())

function renderDaily(props: Partial<HomeDailyNitnemProps> = {}) {
  return render(<MemoryRouter><HomeDailyNitnem {...defaults} {...props} /></MemoryRouter>)
}

test('the named index previews every selected reading without starting or completing practice', () => {
  const onRead = vi.fn()
  renderDaily({ onRead })
  const index = screen.getByRole('tablist', { name: 'Your Nitnem' })
  expect(within(index).getAllByRole('tab').map(tab => tab.getAttribute('data-nitnem-id'))).toEqual(selected.map(item => item.id))
  expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Next bani' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('tab', { name: 'Jaap Sahib' }))
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', 'jaap-sahib')
  expect(onRead).not.toHaveBeenCalled()
  expect(defaults.onComplete).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('link', { name: 'Begin reading: Jaap Sahib' }))
  expect(onRead).toHaveBeenCalledExactlyOnceWith(selected[1], buildNitnemStudyPath(selected[1]))
})

test('the index respects personal order, includes completed readings and uses actual bani dayparts', () => {
  const order = [selected[4], selected[2], selected[0], selected[6]]
  renderDaily({ selected: order, activeId: order[0].id, completed: new Set([selected[6].id]) })
  expect(screen.getAllByRole('tab').map(tab => tab.getAttribute('data-nitnem-id'))).toEqual(order.map(item => item.id))
  fireEvent.click(screen.getByRole('tab', { name: 'Kirtan Sohila' }))
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-period', 'Night')
  expect(screen.getByRole('tab', { name: 'Kirtan Sohila' })).toHaveAccessibleDescription('Complete today')
  expect(screen.getByRole('link', { name: 'Read again: Kirtan Sohila' })).toBeInTheDocument()
})

test('all banis keeps personal order and explicit completion while the selected reading stays reachable', () => {
  const customOrder = [selected[5], selected[0], selected[2], selected[4]]
  renderDaily({ selected: customOrder, completed: new Set([selected[0].id]) })
  fireEvent.click(screen.getByRole('button', { name: 'All 4 banis' }))
  const dialog = screen.getByRole('dialog', { name: 'Your Nitnem' })
  const list = within(dialog).getByRole('list', { name: 'Daily Nitnem' })
  expect(within(list).getAllByRole('listitem').map(item => item.getAttribute('data-nitnem-id'))).toEqual(customOrder.map(item => item.id))
  fireEvent.click(within(dialog).getByRole('button', { name: 'Undo completion: Japji Sahib' }))
  expect(defaults.onComplete).toHaveBeenCalledExactlyOnceWith(selected[0])
  expect(dialog).toBeInTheDocument()
})

test('keeps exact saved routes and length separate from recorded completion', () => {
  const rehras = option('rehras-sahib')
  useSundarGutkaLengthStore.setState({ lengths: { ...DEFAULT_SUNDAR_GUTKA_LENGTHS, 'rehras-sahib': 'long' } })
  const path = `${buildNitnemStudyPath(rehras)}&resumeVerseId=9876`
  renderDaily({ selected: [rehras], activeId: rehras.id, getResume: () => path })
  expect(screen.getByTestId('home-nitnem-primary-action')).toHaveTextContent('Continue reading')
  expect(screen.getByTestId('home-nitnem-primary-action')).toHaveAttribute('href', path)
  expect(screen.getByText('Evening')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Next bani' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Your bani' }))
  expect(within(screen.getByRole('dialog')).getByRole('link', { name: 'Continue reading: Rehras Sahib' })).toHaveAttribute('href', path)
})

test('manual completion holds the reading and focused Undo when the primary practice moves elsewhere', () => {
  const view = renderDaily()
  const complete = screen.getByRole('button', { name: 'Mark complete: Japji Sahib' })
  act(() => complete.focus())
  fireEvent.click(complete)
  view.rerender(<MemoryRouter><HomeDailyNitnem {...defaults} activeId={selected[1].id} completed={new Set([selected[0].id])} /></MemoryRouter>)
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', selected[0].id)
  expect(screen.getByRole('button', { name: 'Undo completion: Japji Sahib' })).toBe(complete)
  expect(complete).toHaveFocus()
  expect(screen.getByRole('link', { name: 'Read again: Japji Sahib' })).toHaveAttribute('href', buildNitnemStudyPath(selected[0]))
})

test('a complete day retains all named readings, one selected reread action, and immediate undo', () => {
  renderDaily({ completed: new Set(selected.map(item => item.id)) })
  expect(screen.getByRole('heading', { name: 'Your Nitnem is complete.' })).toBeInTheDocument()
  expect(screen.getAllByRole('tab')).toHaveLength(7)
  expect(screen.getAllByRole('button', { name: /^Undo completion:/ })).toHaveLength(1)
  expect(screen.getAllByRole('link', { name: /^Read again:/ })).toHaveLength(1)
  expect(screen.getByTestId('home-nitnem-summary')).toHaveTextContent('7 of 7 complete today')
  fireEvent.click(screen.getByRole('tab', { name: 'Jaap Sahib' }))
  expect(screen.getByRole('button', { name: 'Undo completion: Jaap Sahib' })).toBeInTheDocument()
})

test('tracking off removes completion language and still exposes every reading by name', () => {
  renderDaily({ tracking: false, completed: new Set(selected.map(item => item.id)) })
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /completion|complete/ })).not.toBeInTheDocument()
  expect(screen.getAllByRole('tab')).toHaveLength(7)
  expect(screen.queryByText(/complete today/)).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('tab', { name: 'Kirtan Sohila' }))
  expect(screen.getByRole('link', { name: 'Begin reading: Kirtan Sohila' })).toBeInTheDocument()
})

test('empty selection provides one action and no empty index', () => {
  renderDaily({ selected: [], activeId: undefined })
  expect(screen.getByRole('link', { name: 'Choose your banis' })).toHaveAttribute('href', '/nitnem/customize')
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
})

test('index keyboard navigation selects and focuses names without consuming reading-control keys', () => {
  renderDaily()
  const first = screen.getByRole('tab', { name: 'Japji Sahib' })
  fireEvent.keyDown(first, { key: 'End' })
  const last = screen.getByRole('tab', { name: 'Kirtan Sohila' })
  expect(last).toHaveFocus()
  expect(last).toHaveAttribute('aria-selected', 'true')
  fireEvent.keyDown(last, { key: 'ArrowRight' })
  expect(last).toHaveFocus()
  fireEvent.keyDown(last, { key: 'Home' })
  expect(first).toHaveFocus()
  fireEvent.keyDown(first, { key: 'ArrowRight' })
  expect(screen.getByRole('tab', { name: 'Jaap Sahib' })).toHaveFocus()
  expect(screen.getByRole('tab', { name: 'Jaap Sahib' })).toHaveAttribute('tabindex', '0')
  expect(first).toHaveAttribute('tabindex', '-1')
  fireEvent.keyDown(screen.getByRole('link', { name: 'Begin reading: Jaap Sahib' }), { key: 'ArrowRight' })
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', selected[1].id)
  expect(defaults.onComplete).not.toHaveBeenCalled()
})

test('reordering preserves the browsed ID and removal chooses a nearby reading', () => {
  const view = renderDaily({ selected: selected.slice(0, 3) })
  fireEvent.click(screen.getByRole('tab', { name: 'Jaap Sahib' }))
  view.rerender(<MemoryRouter><HomeDailyNitnem {...defaults} selected={[selected[2], selected[0], selected[1]]} /></MemoryRouter>)
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', selected[1].id)
  view.rerender(<MemoryRouter><HomeDailyNitnem {...defaults} selected={[selected[2], selected[0]]} /></MemoryRouter>)
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', selected[0].id)
})

function readingFixture(): BaniFetchResult {
  return { availableLengths: ['short', 'long'], resolvedLength: 'long', entries: (['G', 'D'] as const).map(source => ({
    id: `bani-21-${source}-400`, source, scripture: source === 'G' ? 'SGGS' : 'DG', ang: source === 'G' ? 8 : 1386,
    gurmukhi: `${source} saved line`, transliteration: '', translation_en: '', translation_pa: '', translation_hi: '', words: [],
    lines: [400, 500].map(verseId => ({ verseId, shabadId: 1, ang: source === 'G' ? 8 : 1386,
      gurmukhi: `${source} saved line ${verseId}`, transliteration: '', translation_en: '', translation_pa: '', translation_hi: '' })),
  })) }
}

test('the saved-line preview uses the recorded scripture source when verse IDs repeat', async () => {
  vi.spyOn(offlineCache, 'readBaniOfflineCache').mockResolvedValue(readingFixture())
  const rehras = option('rehras-sahib')
  const path = `${buildNitnemStudyPath(rehras)}&resumeVerseId=400&resumeSource=D`
  renderDaily({ selected: [rehras], activeId: rehras.id, getResume: () => path })
  expect(await screen.findByText('D saved line 400')).toBeInTheDocument()
  expect(screen.queryByText('G saved line 400')).not.toBeInTheDocument()
})

test('Apply forwards the verified payload and the announced destination despite a later saved-place update', async () => {
  const rehras = option('rehras-sahib')
  const current = `${buildNitnemStudyPath(rehras)}&resumeVerseId=999&resumeSource=G`
  const target = current.replace('sgLength=short', 'sgLength=long')
  const key = getExactReadingKey(target)!
  const saved = { scriptureId: 'G-8', resumePath: `${target}&resumeSource=G`, resumeVerseId: 400, updatedAt: new Date().toISOString() }
  useReadingPlacesStore.setState({ places: { [key]: saved } })
  vi.spyOn(offlineCache, 'readBaniOfflineCache').mockResolvedValue(null)
  const prepared = readingFixture()
  vi.spyOn(lengthSelection, 'loadExactBaniReading').mockResolvedValue(prepared)
  vi.spyOn(baniHook, 'useBani').mockReturnValue({ entries: [], availableLengths: ['short', 'long'], resolvedLength: 'short',
    status: 'ready', issue: null, loading: false, refreshing: false, error: null, isCached: false, retry: vi.fn() })
  const onLengthChange = vi.fn().mockResolvedValue(undefined)
  renderDaily({ selected: [rehras], activeId: rehras.id, getResume: () => current, onLengthChange })
  fireEvent.click(screen.getByRole('button', { name: 'Rehras Sahib Length: Short' }))
  const sheet = await screen.findByRole('dialog', { name: 'Bani length' })
  fireEvent.click(within(sheet).getByRole('radio', { name: 'Long' }))
  await waitFor(() => expect(within(sheet).getByRole('button', { name: 'Read long' })).toBeEnabled())
  expect(within(sheet).getByTestId('bani-length-destination')).toHaveTextContent('saved place')
  act(() => useReadingPlacesStore.setState({ places: { [key]: { ...saved, resumeVerseId: 500 } } }))
  fireEvent.click(within(sheet).getByRole('button', { name: 'Read long' }))
  await waitFor(() => expect(onLengthChange).toHaveBeenCalledOnce())
  const args = onLengthChange.mock.calls[0]
  expect(args.slice(0, 4)).toEqual([rehras, 'long', false, expect.any(AbortSignal)])
  expect(args[4]).toBe(prepared)
  expect(args[5].destination).toBe('saved-place')
  expect(new URLSearchParams(args[5].path.split('?')[1]).get('resumeVerseId')).toBe('400')
  expect(new URLSearchParams(args[5].path.split('?')[1]).get('resumeSource')).toBe('G')
})

test('scrolling the named index never changes the displayed reading or starts practice', () => {
  const onRead = vi.fn()
  renderDaily({ onRead })
  const index = screen.getByRole('tablist')
  index.scrollLeft = 640
  fireEvent.scroll(index)
  expect(screen.getByRole('tab', { name: 'Japji Sahib' })).toHaveAttribute('aria-selected', 'true')
  expect(onRead).not.toHaveBeenCalled()
  expect(defaults.onComplete).not.toHaveBeenCalled()
})

test('resizing reveals the selected name within the index without scrolling Home or stealing focus', () => {
  const view = renderDaily()
  const index = screen.getByRole('tablist')
  const tab = screen.getByRole('tab', { name: 'Kirtan Sohila' })
  Object.defineProperties(index, { clientWidth: { configurable: true, value: 300 }, scrollWidth: { configurable: true, value: 1200 } })
  vi.spyOn(index, 'getBoundingClientRect').mockReturnValue({ left: 20, right: 320 } as DOMRect)
  vi.spyOn(tab, 'getBoundingClientRect').mockReturnValue({ left: 900, right: 1100 } as DOMRect)
  const scrollHome = vi.spyOn(window, 'scrollTo')
  fireEvent.click(tab)
  expect(index.scrollLeft).toBe(784)
  const complete = screen.getByRole('button', { name: 'Mark complete: Kirtan Sohila' })
  act(() => complete.focus())
  index.scrollLeft = 0
  fireEvent(window, new Event('resize'))
  expect(index.scrollLeft).toBe(784)
  expect(complete).toHaveFocus()
  expect(scrollHome).not.toHaveBeenCalled()
  index.scrollLeft = 0
  view.rerender(<MemoryRouter><HomeDailyNitnem {...defaults} tracking={false} /></MemoryRouter>)
  // A user may scroll the index to explore another name without selecting it.
  // Unrelated state updates must not pull those names away under the pointer.
  expect(index.scrollLeft).toBe(0)
  expect(screen.getByRole('tab', { name: 'Kirtan Sohila' })).toHaveAttribute('aria-selected', 'true')
})

test('a cache response from a card left behind cannot show its snippet or offline badge on another bani', async () => {
  const pending: Array<(reading: BaniFetchResult | null) => void> = []
  const cache = vi.spyOn(offlineCache, 'readBaniOfflineCache').mockImplementation(() => new Promise(resolve => pending.push(resolve)))
  const rehras = option('rehras-sahib')
  const path = `${buildNitnemStudyPath(rehras)}&resumeVerseId=400&resumeSource=D`
  renderDaily({ selected: [rehras, selected[0]], activeId: rehras.id, getResume: item => item.id === rehras.id ? path : null })
  expect(cache).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('tab', { name: 'Japji Sahib' }))
  expect(cache).toHaveBeenCalledTimes(2)
  await act(async () => { pending[0](readingFixture()); pending[1](null) })
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', selected[0].id)
  expect(screen.queryByText('D saved line 400')).not.toBeInTheDocument()
  expect(screen.queryByText('Available offline')).not.toBeInTheDocument()
})

test('rapid named selection preserves the latest choice through index scroll events', () => {
  renderDaily()
  fireEvent.click(screen.getByRole('tab', { name: 'Jaap Sahib' }))
  fireEvent.click(screen.getByRole('tab', { name: selected[2].romanizedTitle }))
  fireEvent.scroll(screen.getByRole('tablist'))
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', selected[2].id)
  expect(defaults.onComplete).not.toHaveBeenCalled()
})

test('a saved Study link keeps its exact destination separate from fresh daily practice', () => {
  const saved = `${buildNitnemStudyPath(selected[0])}&resumeVerseId=42&resumeSource=G`
  const onRead = vi.fn()
  renderDaily({ getSavedStudy: item => item.id === selected[0].id ? saved : null, onRead })
  expect(screen.getByRole('link', { name: 'Begin reading: Japji Sahib' })).toHaveAttribute('href', buildNitnemStudyPath(selected[0]))
  const study = screen.getByRole('link', { name: 'Resume saved study: Japji Sahib' })
  expect(study).toHaveAttribute('href', saved)
  fireEvent.click(study)
  expect(onRead).not.toHaveBeenCalled()
  expect(defaults.onComplete).not.toHaveBeenCalled()
})

test('download progress refreshes exact offline availability before the whole routine is ready', async () => {
  useNitnemOfflineStatusStore.setState({ status: 'preparing', ready: 0, total: 7, signature: 'routine' })
  const cache = vi.spyOn(offlineCache, 'readBaniOfflineCache').mockResolvedValueOnce(null).mockResolvedValueOnce(readingFixture())
  renderDaily()
  await waitFor(() => expect(cache).toHaveBeenCalledOnce())
  expect(screen.queryByText('Available offline')).not.toBeInTheDocument()
  act(() => useNitnemOfflineStatusStore.setState({ ready: 1 }))
  expect(await screen.findByText('Available offline')).toBeInTheDocument()
  expect(cache).toHaveBeenCalledTimes(2)
  expect(useNitnemOfflineStatusStore.getState().status).toBe('preparing')
})

test('opening All banis reveals the browsed row within the list without moving focus from Close', async () => {
  const frames: FrameRequestCallback[] = []
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.push(callback); return frames.length })
  renderDaily()
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Japji Sahib' }), { key: 'End' })
  fireEvent.click(screen.getByRole('button', { name: 'All 7 banis' }))
  const dialog = screen.getByRole('dialog', { name: 'Your Nitnem' })
  const list = within(dialog).getByRole('list')
  const last = within(list).getAllByRole('listitem').at(-1)!
  Object.defineProperties(list, { clientHeight: { configurable: true, value: 500 }, scrollHeight: { configurable: true, value: 1000 } })
  vi.spyOn(list, 'getBoundingClientRect').mockReturnValue({ top: 100, bottom: 600 } as DOMRect)
  vi.spyOn(last, 'getBoundingClientRect').mockReturnValue({ top: 850, bottom: 980 } as DOMRect)
  act(() => { frames.splice(0).forEach(callback => callback(0)) })
  expect(list.scrollTop).toBe(742)
  expect(within(dialog).getByRole('button', { name: 'Close your banis' })).toHaveFocus()
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', selected[6].id)
})
