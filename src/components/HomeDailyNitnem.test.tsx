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

test('exposes every selected reading directly without starting or completing practice while browsing', () => {
  const onRead = vi.fn()
  renderDaily({ onRead })
  const carousel = within(screen.getByTestId('home-nitnem-carousel'))
  expect(carousel.getAllByRole('listitem').map(card => card.getAttribute('data-nitnem-id'))).toEqual(selected.map(item => item.id))
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', 'japji-sahib')
  expect(screen.getByRole('button', { name: 'Previous bani' })).toHaveAttribute('aria-disabled', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Next bani' }))
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', 'jaap-sahib')
  expect(onRead).not.toHaveBeenCalled()
  expect(defaults.onComplete).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('link', { name: 'Begin reading: Jaap Sahib' }))
  expect(onRead).toHaveBeenCalledExactlyOnceWith(selected[1], buildNitnemStudyPath(selected[1]))
})

test('pagination respects personal order including completed cards and stops at each end', () => {
  const order = [selected[4], selected[2], selected[0], selected[6]]
  renderDaily({ selected: order, activeId: order[0].id, completed: new Set([selected[6].id]) })
  for (let index = 1; index < order.length; index++) fireEvent.click(screen.getByRole('button', { name: 'Next bani' }))
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', selected[6].id)
  expect(screen.getByRole('button', { name: 'Next bani' })).toHaveAttribute('aria-disabled', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Next bani' }))
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', selected[6].id)
  expect(screen.getByRole('link', { name: 'Read again: Kirtan Sohila' })).toBeInTheDocument()
})

test('all banis keeps personal order and explicit completion while the same rail card remains reachable', () => {
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

test('manual completion holds the card and its focused control when the primary practice moves elsewhere', () => {
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

test('a complete day retains every card for reading again and immediate undo', () => {
  renderDaily({ completed: new Set(selected.map(item => item.id)) })
  expect(screen.getByRole('heading', { name: 'Your Nitnem is complete.' })).toBeInTheDocument()
  expect(screen.getByTestId('home-nitnem-carousel')).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: /^Undo completion:/ })).toHaveLength(7)
  expect(screen.getAllByRole('link', { name: /^Read again:/ })).toHaveLength(7)
  expect(screen.getByRole('progressbar', { name: 'Daily Nitnem' })).toHaveAttribute('aria-valuenow', '7')
})

test('tracking off removes completion language and still exposes every reading', () => {
  renderDaily({ tracking: false, completed: new Set(selected.map(item => item.id)) })
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /completion|complete/ })).not.toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: /^Begin reading:/ })).toHaveLength(7)
})

test('empty selection provides one action and no empty rail', () => {
  renderDaily({ selected: [], activeId: undefined })
  expect(screen.getByRole('link', { name: 'Choose your banis' })).toHaveAttribute('href', '/nitnem/customize')
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  expect(screen.queryByTestId('home-nitnem-carousel')).not.toBeInTheDocument()
})

test('rail keyboard shortcuts and offscreen focus change presentation without consuming control keys', () => {
  renderDaily()
  const list = screen.getByRole('list', { name: 'Daily Nitnem' })
  fireEvent.keyDown(list, { key: 'End' })
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', selected.at(-1)!.id)
  const link = screen.getByRole('link', { name: 'Begin reading: Jaap Sahib' })
  act(() => link.focus())
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', selected[1].id)
  fireEvent.keyDown(link, { key: 'ArrowRight' })
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', selected[1].id)
  expect(defaults.onComplete).not.toHaveBeenCalled()
})

test('reordering preserves the browsed ID and removal chooses a nearby card', () => {
  const view = renderDaily({ selected: selected.slice(0, 3) })
  fireEvent.click(screen.getByRole('button', { name: 'Next bani' }))
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

test('native scrolling updates the visible card without a reading or completion action', () => {
  const onRead = vi.fn()
  renderDaily({ onRead })
  const list = screen.getByRole('list', { name: 'Daily Nitnem' })
  Object.defineProperty(list, 'clientWidth', { configurable: true, value: 340 })
  within(list).getAllByRole('listitem').forEach((card, index) => {
    Object.defineProperty(card, 'offsetLeft', { configurable: true, value: index * 320 })
  })
  fireEvent(window, new Event('resize'))
  list.scrollLeft = 640
  fireEvent.scroll(list)
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', selected[2].id)
  expect(screen.getByRole('button', { name: 'Next bani' })).toHaveAttribute('aria-disabled', 'false')
  expect(onRead).not.toHaveBeenCalled()
  expect(defaults.onComplete).not.toHaveBeenCalled()
})

test('resizing preserves the browsed bani at its new horizontal position and respects reduced motion', () => {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
  renderDaily()
  const list = screen.getByRole('list', { name: 'Daily Nitnem' })
  const scroll = vi.fn()
  Object.defineProperty(list, 'scrollTo', { configurable: true, value: scroll })
  Object.defineProperty(list, 'clientWidth', { configurable: true, value: 340 })
  const cards = within(list).getAllByRole('listitem')
  cards.forEach((card, index) => Object.defineProperty(card, 'offsetLeft', { configurable: true, value: index * 320 }))
  fireEvent.click(screen.getByRole('button', { name: 'Next bani' }))
  expect(scroll).toHaveBeenLastCalledWith({ left: 320, behavior: 'instant' })
  cards.forEach((card, index) => Object.defineProperty(card, 'offsetLeft', { configurable: true, value: index * 560 }))
  Object.defineProperty(list, 'clientWidth', { configurable: true, value: 580 })
  fireEvent.scroll(list)
  fireEvent(window, new Event('resize'))
  expect(scroll).toHaveBeenLastCalledWith({ left: 560, behavior: 'instant' })
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', selected[1].id)
})

test('a cache response from a card left behind cannot show its snippet or offline badge on another bani', async () => {
  const pending: Array<(reading: BaniFetchResult | null) => void> = []
  const cache = vi.spyOn(offlineCache, 'readBaniOfflineCache').mockImplementation(() => new Promise(resolve => pending.push(resolve)))
  const rehras = option('rehras-sahib')
  const path = `${buildNitnemStudyPath(rehras)}&resumeVerseId=400&resumeSource=D`
  renderDaily({ selected: [rehras, selected[0]], activeId: rehras.id, getResume: item => item.id === rehras.id ? path : null })
  expect(cache).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Next bani' }))
  expect(cache).toHaveBeenCalledTimes(2)
  await act(async () => { pending[0](readingFixture()); pending[1](null) })
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', selected[0].id)
  expect(screen.queryByText('D saved line 400')).not.toBeInTheDocument()
  expect(screen.queryByText('Available offline')).not.toBeInTheDocument()
})

test('rapid pagination keeps its intended destination through intermediate smooth-scroll events', () => {
  renderDaily()
  const list = screen.getByRole('list', { name: 'Daily Nitnem' })
  Object.defineProperty(list, 'clientWidth', { configurable: true, value: 340 })
  within(list).getAllByRole('listitem').forEach((card, index) => Object.defineProperty(card, 'offsetLeft', { configurable: true, value: index * 320 }))
  Object.defineProperty(list, 'scrollTo', { configurable: true, value: vi.fn() })
  fireEvent.click(screen.getByRole('button', { name: 'Next bani' }))
  list.scrollLeft = 100
  fireEvent.scroll(list)
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', selected[1].id)
  fireEvent.click(screen.getByRole('button', { name: 'Next bani' }))
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', selected[2].id)
  list.scrollLeft = 640
  fireEvent.scroll(list)
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', selected[2].id)
})

test('pointer focus on a peeking reading link does not reposition it before its click', () => {
  const onRead = vi.fn()
  renderDaily({ onRead })
  const list = screen.getByRole('list', { name: 'Daily Nitnem' })
  const scroll = vi.fn()
  Object.defineProperty(list, 'scrollTo', { configurable: true, value: scroll })
  const link = screen.getByRole('link', { name: 'Begin reading: Jaap Sahib' })
  fireEvent.pointerDown(link)
  act(() => link.focus())
  expect(scroll).not.toHaveBeenCalled()
  fireEvent.pointerUp(link)
  fireEvent.click(link)
  expect(onRead).toHaveBeenCalledExactlyOnceWith(selected[1], buildNitnemStudyPath(selected[1]))
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

test('a direct swipe can interrupt a pending arrow animation without keeping a stale card selected', () => {
  renderDaily()
  const list = screen.getByRole('list', { name: 'Daily Nitnem' })
  Object.defineProperty(list, 'clientWidth', { configurable: true, value: 340 })
  within(list).getAllByRole('listitem').forEach((card, index) => Object.defineProperty(card, 'offsetLeft', { configurable: true, value: index * 320 }))
  Object.defineProperty(list, 'scrollTo', { configurable: true, value: vi.fn() })
  fireEvent.click(screen.getByRole('button', { name: 'Next bani' }))
  fireEvent.pointerDown(list)
  list.scrollLeft = 960
  fireEvent.scroll(list)
  fireEvent.pointerUp(list)
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', selected[3].id)
  expect(defaults.onComplete).not.toHaveBeenCalled()
})

test('opening All banis reveals the browsed row within the list without moving focus from Close', async () => {
  const frames: FrameRequestCallback[] = []
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.push(callback); return frames.length })
  renderDaily()
  fireEvent.keyDown(screen.getByRole('list', { name: 'Daily Nitnem' }), { key: 'End' })
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
