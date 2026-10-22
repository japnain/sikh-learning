import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import HomeDailyNitnem, { type HomeDailyNitnemProps } from './HomeDailyNitnem'
import { buildNitnemStudyPath, getNitnemOption } from '../store/nitnem'
import { useLanguageStore } from '../store/language'
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
  vi.clearAllMocks()
})
afterEach(() => vi.restoreAllMocks())

function Destination() {
  const location = useLocation()
  return <div data-testid="destination" data-origin={location.state?.readerOrigin}>{location.pathname}{location.search}</div>
}

function renderDaily(props: Partial<HomeDailyNitnemProps> = {}) {
  return render(<MemoryRouter><HomeDailyNitnem {...defaults} {...props} /></MemoryRouter>)
}

test('focuses one reading and offers two direct next links without requiring a selection step', () => {
  render(<MemoryRouter><Routes><Route path="/" element={<HomeDailyNitnem {...defaults} />} /><Route path="/study" element={<Destination />} /></Routes></MemoryRouter>)
  expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', 'japji-sahib')
  expect(within(screen.getByTestId('home-nitnem-next')).getAllByRole('link')).toHaveLength(2)
  fireEvent.click(screen.getByRole('link', { name: 'Begin reading: Jaap Sahib' }))
  expect(screen.getByTestId('destination')).toHaveTextContent(buildNitnemStudyPath(option('jaap-sahib')))
  expect(screen.getByTestId('destination')).toHaveAttribute('data-origin', '/')
  expect(defaults.onComplete).not.toHaveBeenCalled()
})

test('next readings respect user order, skip completed banis and wrap only after the current reading', () => {
  renderDaily({ selected: [selected[4], selected[2], selected[0], selected[6]], activeId: selected[0].id, completed: new Set([selected[6].id]) })
  const links = within(screen.getByTestId('home-nitnem-next')).getAllByRole('link')
  expect(links.map(link => link.getAttribute('href'))).toEqual([buildNitnemStudyPath(selected[4]), buildNitnemStudyPath(selected[2])])
})

test('all banis exposes every reading in user order with direct links and explicit completion controls', () => {
  const customOrder = [selected[5], selected[0], selected[2], selected[4]]
  renderDaily({ selected: customOrder, completed: new Set([selected[0].id]) })
  fireEvent.click(screen.getByRole('button', { name: 'All 4 banis' }))
  const dialog = screen.getByRole('dialog', { name: 'Your Nitnem' })
  const list = within(dialog).getByRole('list', { name: 'Daily Nitnem' })
  expect(within(list).getAllByRole('listitem').map(item => item.getAttribute('data-nitnem-id'))).toEqual(customOrder.map(item => item.id))
  expect(within(list).getAllByRole('link')).toHaveLength(4)
  fireEvent.click(within(dialog).getByRole('button', { name: 'Undo completion: Japji Sahib' }))
  expect(defaults.onComplete).toHaveBeenCalledExactlyOnceWith(selected[0])
  expect(dialog).toBeInTheDocument()
})

test('preserves exact saved routes and selected reading lengths in both the focused and all-bani views', () => {
  const rehras = option('rehras-sahib')
  useSundarGutkaLengthStore.setState({ lengths: { ...DEFAULT_SUNDAR_GUTKA_LENGTHS, 'rehras-sahib': 'long' } })
  const path = `${buildNitnemStudyPath(rehras)}&resumeVerseId=9876`
  renderDaily({ selected: [rehras], activeId: rehras.id, getResume: () => path })
  expect(screen.getByTestId('home-nitnem-primary-action')).toHaveTextContent('Continue reading')
  expect(screen.getByTestId('home-nitnem-primary-action')).toHaveAttribute('href', path)
  expect(screen.getByText('Evening · Long')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Your bani' }))
  expect(within(screen.getByRole('dialog')).getByRole('link', { name: 'Continue reading: Rehras Sahib' })).toHaveAttribute('href', path)
})

test('completion is explicit and keeps the current reading available for undo without auto-opening the next bani', () => {
  const view = renderDaily()
  expect(defaults.onComplete).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Mark complete: Japji Sahib' }))
  expect(defaults.onComplete).toHaveBeenCalledExactlyOnceWith(selected[0])
  view.rerender(<MemoryRouter><HomeDailyNitnem {...defaults} completed={new Set([selected[0].id])} /></MemoryRouter>)
  expect(screen.getByTestId('home-nitnem-active-reading')).toHaveAttribute('data-nitnem-id', selected[0].id)
  expect(screen.getByRole('button', { name: 'Undo completion: Japji Sahib' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('link', { name: 'Read again' })).toHaveAttribute('href', buildNitnemStudyPath(selected[0]))
  expect(screen.queryByTestId('home-nitnem-primary-action')).not.toBeInTheDocument()
})

test('a complete day has its own finish state and exposes every completed reading for revisiting or undo', () => {
  renderDaily({ completed: new Set(selected.map(item => item.id)) })
  expect(screen.getByRole('heading', { name: 'Your Nitnem is complete.' })).toBeInTheDocument()
  expect(screen.queryByTestId('home-nitnem-active-reading')).not.toBeInTheDocument()
  expect(screen.queryByTestId('home-nitnem-next')).not.toBeInTheDocument()
  expect(screen.getByRole('progressbar', { name: 'Daily Nitnem' })).toHaveAttribute('aria-valuenow', '7')
  fireEvent.click(screen.getByRole('button', { name: 'Revisit your banis' }))
  const dialog = screen.getByRole('dialog', { name: 'Your Nitnem' })
  expect(within(dialog).getAllByRole('button', { name: /^Undo completion:/ })).toHaveLength(7)
  expect(within(dialog).getAllByRole('link', { name: /^Read again:/ })).toHaveLength(7)
})

test('turning tracking off removes completion language and treats previous completed banis as available readings', () => {
  renderDaily({ tracking: false, completed: new Set(selected.map(item => item.id)) })
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  expect(screen.queryByText('Complete today')).not.toBeInTheDocument()
  expect(screen.getByTestId('home-nitnem-primary-action')).toHaveTextContent('Begin reading')
  fireEvent.click(screen.getByRole('button', { name: 'All 7 banis' }))
  expect(within(screen.getByRole('dialog')).queryByRole('button', { name: /completion|complete/ })).not.toBeInTheDocument()
})

test('empty daily selection provides one useful action and no invented progress', () => {
  renderDaily({ selected: [], activeId: undefined })
  expect(screen.getByRole('link', { name: 'Choose your banis' })).toHaveAttribute('href', '/nitnem/customize')
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  expect(screen.queryByTestId('home-nitnem-active-reading')).not.toBeInTheDocument()
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
