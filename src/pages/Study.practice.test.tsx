import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import Study from './Study'
import type { ScriptureEntry, ScriptureLine, SundarGutkaLength } from '../types'
import * as baniApi from '../api/banidb'
import * as offlineCache from '../utils/baniOfflineCache'
import { mockDocumentScroll } from '../test/documentScroll'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { useProgressStore } from '../store/progress'
import { getExactReadingKey, useReadingPlacesStore } from '../store/readingPlaces'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { buildNitnemStudyPath, getNitnemOption, useNitemStore } from '../store/nitnem'
import { useNitnemPracticeStore } from '../store/nitnemPractice'
import { useNitnemHistoryStore } from '../store/nitnemHistory'
import { useActivityEventsStore } from '../store/activityEvents'

const G_ENTRY = 'bani-21-8-0'
const D_ENTRY = 'bani-21-1386-0'
function line(verseId: number, gurmukhi: string, ang = 8): ScriptureLine {
  return { verseId, shabadId: 0, ang, gurmukhi, transliteration: '', translation_en: '', translations_en: {}, translation_pa: '', translation_hi: '' }
}
function entry(id: string, source: 'G' | 'D', lines: ScriptureLine[]): ScriptureEntry {
  return { id, source, scripture: source === 'G' ? 'SGGS' : 'DG', ang: lines[0].ang, shabadId: 0, lines,
    gurmukhi: lines.map(item => item.gurmukhi).join('\n'), transliteration: '', translation_en: '', translation_pa: '', translation_hi: '', words: [] }
}
const gurmukhi = entry(G_ENTRY, 'G', [
  line(101, 'ਆਰੰਭ ਦੀ ਪੰਕਤੀ ਸਤਿ ਨਾਮੁ ॥'),
  line(102, 'ਮੱਧ ਦੀ ਪੰਕਤੀ ਸੋ ਦਰੁ ਤੇਰਾ ॥'),
  line(103, 'ਅੰਤ ਦੀ ਪੰਕਤੀ ਸਦਾ ਸਹਾਈ ॥'),
])
// The longer reading deliberately puts a different scripture's identical verse ID first.
const dasam = entry(D_ENTRY, 'D', [line(102, 'ਦਸਮ ਗ੍ਰੰਥ ਦੀ ਵੱਖਰੀ ਪੰਕਤੀ ॥', 1386)])
const payload = (length: SundarGutkaLength): baniApi.BaniFetchResult => ({
  entries: length === 'short' ? [gurmukhi] : [dasam, gurmukhi],
  resolvedLength: length, availableLengths: ['short', 'long'], normalizationRevision: 2,
})
let scroll: ReturnType<typeof mockDocumentScroll>
let aligned: string[]

const usualPath = () => buildNitnemStudyPath(getNitnemOption('rehras-sahib')!)
const pathWith = (extra: Record<string, string>) => {
  const params = new URLSearchParams(usualPath().split('?')[1])
  Object.entries(extra).forEach(([key, value]) => params.set(key, value))
  return `/study?${params}`
}
function Probe() {
  const location = useLocation()
  return <><output data-testid="practice-reader-url">{location.pathname}{location.search}</output><output data-testid="practice-reader-origin">{location.state?.readerOrigin}</output></>
}
function open(path = usualPath()) {
  return render(<MemoryRouter initialEntries={[{ pathname: '/study', search: path.split('?')[1] ? `?${path.split('?')[1]}` : '', state: { readerOrigin: '/' } }]}>
    <Routes><Route path="/study" element={<><Study /><Probe /></>} /></Routes>
  </MemoryRouter>)
}
function rect(top: number, height = 140): DOMRect {
  return { x: 0, y: top, top, bottom: top + height, left: 0, right: 390, width: 390, height, toJSON: () => ({}) }
}
function documentTop(element: HTMLElement): number | null {
  const key = element.dataset.readerAnchor
  if (!key) return null
  if (key.startsWith(`${D_ENTRY}:`)) return 200
  const index = Number(key.slice(key.lastIndexOf(':') + 1))
  return [200, 600, 1600][index] + (document.querySelector(`[data-study-entry-id="${D_ENTRY}"]`) ? 500 : 0)
}
async function frames() {
  await act(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))) })
}
async function loaded(count = 3) {
  await waitFor(() => expect(screen.getAllByTestId('study-line')).toHaveLength(count))
  await frames()
}
async function chooser() {
  fireEvent.click(within(screen.getByTestId('study-reader-topbar')).getByTestId('bani-length-control'))
  return screen.findByRole('dialog', { name: 'Bani length' })
}
async function selectLong(remember = false, waitForDestination = true) {
  const sheet = await chooser()
  fireEvent.click(within(sheet).getByRole('radio', { name: /^Long/ }))
  if (remember) fireEvent.click(within(sheet).getByRole('checkbox', { name: 'Use for my Nitnem' }))
  if (waitForDestination) {
    await waitFor(() => expect(within(sheet).getByRole('button', { name: 'Read long', exact: true })).toBeEnabled())
    expect(within(sheet).getByTestId('bani-length-destination')).toHaveTextContent('Continue at the same verse in this length.')
    expect(screen.getByTestId('practice-reader-url')).toHaveTextContent('sgLength=short')
    fireEvent.click(within(sheet).getByRole('button', { name: 'Read long', exact: true }))
  }
}

beforeEach(() => {
  localStorage.clear()
  useLocaleStore.setState({ locale: 'en' })
  useLanguageStore.setState({ scriptMode: 'gurmukhi', showTransliteration: false, meaningLanguage: 'none', larivaar: false,
    showVishraam: false, fontSize: 22, lineSpacing: 'relaxed', textAlign: 'left' })
  localStorage.setItem('naamras-reader-presentation', 'read')
  useSundarGutkaLengthStore.setState({ lengths: { 'rehras-sahib': 'short', 'chaupai-sahib': 'short', aarti: 'short', 'kirtan-sohila': 'short' } })
  useProgressStore.setState({ currentSession: null, studied: [], reviewQueue: [], streak: 0, lastStudied: null })
  useReadingPlacesStore.setState({ places: {} })
  useNitnemPracticeStore.setState({ active: null })
  useNitnemHistoryStore.setState({ events: [], remoteDays: {} })
  useActivityEventsStore.setState({ pendingEvents: [] })
  useNitemStore.setState({ selectedIds: ['rehras-sahib'], completedIds: [], completedDate: '', completionTrackingEnabled: true })
  useScriptureCacheStore.getState().clearAll()
  vi.spyOn(offlineCache, 'readBaniOfflineCache').mockResolvedValue(null)
  vi.spyOn(offlineCache, 'writeBaniOfflineCache').mockResolvedValue(undefined)
  vi.spyOn(baniApi, 'fetchBani').mockImplementation(async (_id, length) => payload(length ?? 'short'))
  scroll = mockDocumentScroll({ top: 0, viewportHeight: 844, scrollHeight: 6000 })
  aligned = []
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains('study-reader-topbar')) return rect(0, 64)
    const top = documentTop(this)
    return top === null ? rect(0, 0) : rect(top - scroll.getTop())
  })
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(function (this: HTMLElement) {
    const top = documentTop(this)
    if (top !== null) { aligned.push(this.dataset.readerAnchor!); scroll.setTop(top - 76) }
  })
})
afterEach(() => { scroll.restore(); vi.restoreAllMocks() })

test('an explicit shared Long URL opens Long without changing the saved usual Short version', async () => {
  open(pathWith({ sgLength: 'long' }))
  await loaded(4)
  expect(within(screen.getByTestId('study-reader-topbar')).getByTestId('bani-length-control')).toHaveAccessibleName('Change bani length: Long')
  expect(useSundarGutkaLengthStore.getState().lengths['rehras-sahib']).toBe('short')
  expect(screen.getByTestId('practice-reader-url')).toHaveTextContent('sgLength=long')
})

test('temporary length switching preserves the same source/verse despite reversed duplicate IDs; remembering is explicit', async () => {
  open(pathWith({ resumeVerseId: '102', resumeSource: 'G' }))
  await loaded()
  await waitFor(() => expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(102))
  await selectLong()
  await loaded(4)
  await waitFor(() => expect(aligned.at(-1)).toBe(`${G_ENTRY}:1`))
  expect(screen.getByTestId('practice-reader-url')).toHaveTextContent('sgLength=long')
  expect(screen.getByTestId('practice-reader-url')).toHaveTextContent('resumeVerseId=102')
  expect(screen.getByTestId('practice-reader-url')).toHaveTextContent('resumeSource=G')
  expect(useProgressStore.getState().currentSession?.scriptureId).toBe('G-8')
  expect(new URLSearchParams(useProgressStore.getState().currentSession!.resumePath.split('?')[1]).get('resumeSource')).toBe('G')
  expect(useSundarGutkaLengthStore.getState().lengths['rehras-sahib']).toBe('short')
  const sheet = await chooser()
  fireEvent.click(within(sheet).getByRole('checkbox', { name: 'Use for my Nitnem' }))
  await waitFor(() => expect(within(sheet).getByRole('button', { name: 'Read long', exact: true })).toBeEnabled())
  fireEvent.click(within(sheet).getByRole('button', { name: 'Read long', exact: true }))
  await waitFor(() => expect(useSundarGutkaLengthStore.getState().lengths['rehras-sahib']).toBe('long'))
  expect(screen.getByTestId('practice-reader-origin')).toHaveTextContent('/')
})

test('cancelling a pending length request retains the old route and scripture even when the server resolves late', async () => {
  let resolveLong!: (result: baniApi.BaniFetchResult) => void
  vi.mocked(baniApi.fetchBani).mockImplementation(async (_id, length) => length === 'long'
    ? new Promise(done => { resolveLong = done }) : payload('short'))
  open()
  await loaded()
  await selectLong(false, false)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Read long', exact: true })).toBeDisabled())
  expect(screen.getByTestId('bani-length-destination')).toHaveTextContent('Checking where this reading will open')
  fireEvent.click(screen.getByRole('button', { name: 'Close bani length' }))
  await act(async () => { resolveLong(payload('long')); await Promise.resolve() })
  await frames()
  expect(screen.getByTestId('practice-reader-url')).toHaveTextContent('sgLength=short')
  expect(screen.queryByText('ਦਸਮ ਗ੍ਰੰਥ ਦੀ ਵੱਖਰੀ ਪੰਕਤੀ ॥')).not.toBeInTheDocument()
  expect(useSundarGutkaLengthStore.getState().lengths['rehras-sahib']).toBe('short')
})

test('Find exploration preserves the reading place; Return restores it and Continue here deliberately changes it', async () => {
  const path = pathWith({ resumeVerseId: '102', resumeSource: 'G' })
  open(path)
  await loaded()
  const key = getExactReadingKey(path)!
  await waitFor(() => expect(useReadingPlacesStore.getState().places[key]?.resumeVerseId).toBe(102))
  const findEnding = async () => {
    fireEvent.click(screen.getAllByRole('button', { name: 'Contents', exact: true })[0]!)
    const sections = await screen.findByRole('dialog', { name: 'Contents' })
    fireEvent.change(await within(sections).findByRole('searchbox'), { target: { value: 'ਸਦਾ ਸਹਾਈ' } })
    aligned.length = 0
    fireEvent.click(within(sections).getByRole('button', { name: /ਅੰਤ ਦੀ ਪੰਕਤੀ ਸਦਾ ਸਹਾਈ/ }))
    await waitFor(() => expect(aligned.at(-1)).toBe(`${G_ENTRY}:2`))
    await act(async () => { document.dispatchEvent(new Event('scrollend')) })
  }
  await findEnding()
  expect(useReadingPlacesStore.getState().places[key]?.resumeVerseId).toBe(102)
  fireEvent.click(screen.getByRole('button', { name: 'Return to previous place' }))
  await frames()
  expect(scroll.getTop()).toBe(524)
  expect(useReadingPlacesStore.getState().places[key]?.resumeVerseId).toBe(102)
  await findEnding()
  fireEvent.click(screen.getByRole('button', { name: 'Continue here', exact: true }))
  await waitFor(() => expect(useReadingPlacesStore.getState().places[key]?.resumeVerseId).toBe(103))
})

test('tagged practice saves its exact current verse while ordinary Study of the same bani cannot take it over', async () => {
  useNitnemPracticeStore.getState().start('rehras-sahib', usualPath())
  const practicePath = useNitnemPracticeStore.getState().active!.readingPath
  const mounted = open(practicePath)
  await loaded()
  await act(async () => { scroll.setTop(1524); document.dispatchEvent(new Event('scrollend')) })
  await waitFor(() => expect(useNitnemPracticeStore.getState().active!.readingPath).toContain('resumeVerseId=103'))
  const savedPractice = useNitnemPracticeStore.getState().active!.readingPath
  mounted.unmount()
  scroll.setTop(0)
  open(usualPath())
  await loaded()
  await act(async () => { scroll.setTop(524); document.dispatchEvent(new Event('scrollend')) })
  await waitFor(() => expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(102))
  expect(useNitnemPracticeStore.getState().active!.readingPath).toBe(savedPractice)
})

test.each(['fixed', 'absolute'] as const)('reopening exact practice repeatedly retains its requested verse with a %s header and contiguous rows', async (position) => {
  const contiguousTop = (element: HTMLElement) => {
    const key = element.dataset.readerAnchor
    if (!key?.startsWith(`${G_ENTRY}:`)) return null
    return 200 + Number(key.slice(key.lastIndexOf(':') + 1)) * 140
  }
  vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains('study-reader-topbar')) return rect(position === 'absolute' ? -scroll.getTop() : 0, 64)
    const top = contiguousTop(this)
    return top === null ? rect(0, 0) : rect(top - scroll.getTop())
  })
  vi.mocked(HTMLElement.prototype.scrollIntoView).mockImplementation(function (this: HTMLElement) {
    const top = contiguousTop(this)
    if (top !== null) scroll.setTop(top - 80)
  })
  useNitnemPracticeStore.getState().start('rehras-sahib', pathWith({ resumeVerseId: '102', resumeSource: 'G' }))

  for (let reopen = 0; reopen < 3; reopen += 1) {
    const mounted = open(useNitnemPracticeStore.getState().active!.readingPath)
    screen.getByTestId('study-reader-topbar').style.position = position
    await loaded()
    await act(async () => { document.dispatchEvent(new Event('scrollend')) })
    expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(102)
    expect(new URLSearchParams(useNitnemPracticeStore.getState().active!.readingPath.split('?')[1]).get('resumeVerseId')).toBe('102')
    expect(useReadingPlacesStore.getState().places[getExactReadingKey(usualPath())!]?.resumeVerseId).toBe(102)
    expect(screen.getAllByTestId('study-line')[1].getBoundingClientRect().top).toBe(position === 'absolute' ? 16 : 80)
    mounted.unmount()
    scroll.setTop(0)
  }
})

test.each([false, true])('cold practice resume keeps its verse through late font/header reflow unless the reader moves deliberately (intent=%s)', async (intent) => {
  const fontsDescriptor = Object.getOwnPropertyDescriptor(document, 'fonts')
  let finishFonts!: () => void
  const fontsReady = new Promise<void>(resolve => { finishFonts = resolve })
  const fonts = Object.assign(new EventTarget(), { ready: fontsReady })
  Object.defineProperty(document, 'fonts', { configurable: true, value: fonts })
  let reflowed = false
  const currentTop = (element: HTMLElement) => {
    const key = element.dataset.readerAnchor
    if (!key?.startsWith(`${G_ENTRY}:`)) return null
    return 200 + Number(key.slice(key.lastIndexOf(':') + 1)) * 140 - (reflowed ? 80 : 0)
  }
  vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains('study-reader-topbar')) return rect(-scroll.getTop(), reflowed ? 108 : 78)
    const top = currentTop(this)
    return top === null ? rect(0, 0) : rect(top - scroll.getTop())
  })
  vi.mocked(HTMLElement.prototype.scrollIntoView).mockImplementation(function (this: HTMLElement) {
    const top = currentTop(this)
    if (top !== null) scroll.setTop(top - 94)
  })
  useNitnemPracticeStore.getState().start('rehras-sahib', pathWith({ resumeVerseId: '102', resumeSource: 'G' }))
  const mounted = open(useNitnemPracticeStore.getState().active!.readingPath)
  screen.getByTestId('study-reader-topbar').style.position = 'absolute'
  try {
    await loaded()
    expect(screen.getAllByTestId('study-line')[1].getBoundingClientRect().top).toBe(16)
    await act(async () => {
      reflowed = true
      // A header-anchor restoration is programmatic and is not reading intent.
      scroll.setTop(scroll.getTop() + 80)
      if (intent) window.dispatchEvent(new WheelEvent('wheel'))
      document.dispatchEvent(new Event('scrollend'))
    })
    expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(intent ? 103 : 102)
    expect(new URLSearchParams(useNitnemPracticeStore.getState().active!.readingPath.split('?')[1]).get('resumeVerseId')).toBe(intent ? '103' : '102')
    await act(async () => { finishFonts(); await fontsReady })
    await frames()
    await act(async () => { document.dispatchEvent(new Event('scrollend')) })
    expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(intent ? 103 : 102)
    expect(new URLSearchParams(useNitnemPracticeStore.getState().active!.readingPath.split('?')[1]).get('resumeVerseId')).toBe(intent ? '103' : '102')
    if (!intent) expect(screen.getAllByTestId('study-line')[1].getBoundingClientRect().top).toBe(16)
  } finally {
    mounted.unmount()
    if (fontsDescriptor) Object.defineProperty(document, 'fonts', fontsDescriptor)
    else Reflect.deleteProperty(document, 'fonts')
  }
})

test('Read again after intentional practice completion creates a fresh practice marker without erasing today’s credit', async () => {
  useNitnemPracticeStore.getState().start('rehras-sahib', usualPath())
  const original = useNitnemPracticeStore.getState().active!
  open(original.readingPath)
  await loaded()
  fireEvent.click(screen.getByRole('button', { name: 'Mark complete for today' }))
  expect(useNitnemPracticeStore.getState().active?.completed).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Read again', exact: true }))
  await waitFor(() => expect(useNitnemPracticeStore.getState().active?.startedAt).not.toBe(original.startedAt))
  expect(useNitnemPracticeStore.getState().active?.completed).toBe(false)
  expect(new URLSearchParams(screen.getByTestId('practice-reader-url').textContent!.split('?')[1]).get('nitnemPractice')).toBe(useNitnemPracticeStore.getState().active?.startedAt)
  expect(useNitemStore.getState().isComplete('rehras-sahib')).toBe(true)
})
