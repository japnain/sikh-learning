import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate, useLocation } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import Study from './Study'
import { server } from '../test/msw-server'
import { MOCK_BANI_RESPONSE } from '../test/msw-handlers'
import { mockDocumentScroll } from '../test/documentScroll'
import { useBookmarksStore } from '../store/bookmarks'
import { useFavoritesStore } from '../store/favorites'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { useProgressStore } from '../store/progress'
import { useReadingProgressStore } from '../store/readingProgress'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { captureReaderAnchor } from '../utils/readerAnchor'
import * as baniApi from '../api/banidb'
import * as baniOfflineCache from '../utils/baniOfflineCache'
import { getExactReadingKey, useReadingPlacesStore } from '../store/readingPlaces'
import { getHomeNitnemResume } from '../utils/homeNitnemResume'
import { getNitnemOption } from '../store/nitnem'

const LINES_PER_SECTION = 12
const verseIds = Array.from({ length: 7 * LINES_PER_SECTION }, (_, index) => 8100 + index)
const verses = verseIds.map((verseId, index) => ({
  ...MOCK_BANI_RESPONSE.verses[0],
  verseId,
  shabadId: 9100 + Math.floor(index / LINES_PER_SECTION),
  pageNo: 100 + Math.floor(index / LINES_PER_SECTION),
  verse: { unicode: `ਸ਼ਬਦ ${Math.floor(index / LINES_PER_SECTION) + 1} ਪੰਕਤੀ ${index % LINES_PER_SECTION + 1}` },
  larivaar: { unicode: `ਸ਼ਬਦ${Math.floor(index / LINES_PER_SECTION) + 1}ਪੰਕਤੀ${index % LINES_PER_SECTION + 1}` },
  transliteration: { english: `Long reading transliteration ${index + 1}` },
  translation: { en: { bdb: `Long reading meaning ${index + 1}`, ms: `Alternative meaning ${index + 1}` } },
}))
let scroll: ReturnType<typeof mockDocumentScroll> | null = null
let restoreFonts: (() => void) | null = null

function deferFontLayout() {
  const descriptor = Object.getOwnPropertyDescriptor(document, 'fonts')
  let finish: () => void = () => {}
  const fonts = { status: 'loading', ready: new Promise<void>(resolve => { finish = resolve }) }
  Object.defineProperty(document, 'fonts', { configurable: true, value: fonts })
  restoreFonts = () => {
    if (descriptor) Object.defineProperty(document, 'fonts', descriptor)
    else Reflect.deleteProperty(document, 'fonts')
  }
  return () => { fonts.status = 'loaded'; finish() }
}

async function openWithDelayedResumeFont() {
  const finishFonts = deferFontLayout()
  let sourceDocumentTop = 5000
  scroll = mockDocumentScroll({ top: 0, viewportHeight: 800, scrollHeight: 20000 })
  const alignment = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(function (this: HTMLElement) {
    if (this.dataset.verseId === '8172') scroll!.setTop(sourceDocumentTop - 76)
  })
  alignment.mockClear()
  const mounted = renderLongReading('&resumeVerseId=8172')
  const lines = await screen.findAllByTestId('study-line')
  const target = lines.find(line => line.dataset.verseId === '8172')!
  vi.spyOn(target, 'getBoundingClientRect').mockImplementation(() => {
    const top = sourceDocumentTop - scroll!.getTop()
    return { x: 0, y: top, top, bottom: top + 120, left: 0, right: 390, width: 390, height: 120, toJSON: () => ({}) }
  })
  await waitFor(() => expect(alignment).toHaveBeenCalledTimes(1))
  expect(target.getBoundingClientRect().top).toBe(76)
  return { mounted, lines, target, alignment, finishFonts, reflow: () => { sourceDocumentTop = 4785 } }
}

function renderLongReading(search = '') {
  return render(<MemoryRouter initialEntries={[
    `/study?source=G&ang=100&startAng=100&endAng=106&baniDbId=99&exactBani=1&bani=Long%20Reading${search}`,
  ]}><Routes><Route path="/study" element={<Study />} /></Routes></MemoryRouter>)
}

function modelTypographyReflow(lines: HTMLElement[], targetIndex = 40, lateFontOffset = () => 0) {
  const lineHeight = () => {
    const read = document.querySelector<HTMLElement>('[data-testid="page-study"]')?.dataset.readerPresentation === 'read'
    const preferences = useLanguageStore.getState()
    const supportScale = read || preferences.supportTextSize === 'standard' ? 1 : preferences.supportTextSize === 'large' ? 1.15 : 1.3
    return (preferences.fontSize >= 34 ? (read ? 105 : 180) : (read ? 70 : 120)) * supportScale
  }
  scroll = mockDocumentScroll({ top: 200 + targetIndex * lineHeight() - 300, viewportHeight: 800, scrollHeight: 20000 })
  vi.spyOn(screen.getByTestId('study-reader-topbar'), 'getBoundingClientRect').mockImplementation(() => {
    const top = -scroll!.getTop()
    return { x: 0, y: top, top, bottom: top + 64, left: 0, right: 390, width: 390, height: 64, toJSON: () => ({}) }
  })
  lines.forEach((line, index) => vi.spyOn(line, 'getBoundingClientRect').mockImplementation(() => {
    const height = lineHeight()
    const top = 200 + index * height + lateFontOffset() - scroll!.getTop()
    return { x: 0, y: top, top, bottom: top + height, left: 0, right: 390, width: 390, height, toJSON: () => ({}) }
  }))
  return lines[targetIndex]!
}

async function settleReaderFrames() {
  await act(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))) })
}

function ReaderNavigationProbe() {
  const navigate = useNavigate()
  const location = useLocation()
  return <><button data-testid="route-switch" onClick={() => navigate('/study?source=G&ang=100&startAng=100&endAng=106&baniDbId=99&exactBani=1&bani=Another%20Reading')}>Another reading</button><output data-testid="reader-url">{location.search}</output></>
}

it('previews a Study word without opening a dialog and restores its Explore focus after dismissal', async () => {
  renderLongReading()
  const words = (await screen.findAllByTestId('study-gurbani-line'))[0]!.querySelectorAll('[data-reader-word]')
  fireEvent.click(words[0]!)
  const dock = screen.getByTestId('reader-dock')
  expect(dock).toBeVisible()
  expect(within(dock).getByRole('button', { name: 'Explore word' })).toBeInTheDocument()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  within(dock).getByRole('button', { name: 'Explore word' }).focus()
  fireEvent.click(within(dock).getByRole('button', { name: 'Explore word' }))
  expect(await screen.findByRole('dialog')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Close word details' }))
  await settleReaderFrames()
  expect(within(dock).getByRole('button', { name: 'Explore word' })).toHaveFocus()
  expect(dock).toBeVisible()
})

it('Read taps reveal controls without opening word lookup in Devanagari text', async () => {
  renderLongReading()
  await screen.findByTestId('study-entry-list')
  act(() => useLanguageStore.getState().setScriptMode('devanagari'))
  fireEvent.click(screen.getByRole('radio', { name: 'Read', exact: true }))
  await settleReaderFrames()
  const line = screen.getAllByTestId('study-gurbani-line')[0]!
  fireEvent.click(line.querySelector('[data-reader-word]') ?? line)
  expect(screen.getByTestId('page-study')).toHaveAttribute('data-reader-controls', 'hidden')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  fireEvent.click(line.querySelector('[data-reader-word]') ?? line)
  expect(screen.getByTestId('page-study')).toHaveAttribute('data-reader-controls', 'visible')
  expect(screen.queryByRole('button', { name: 'Explore word' })).not.toBeInTheDocument()
})

it('a reading-route change dismisses the previous word and Read again removes the old resume target', async () => {
  render(<MemoryRouter initialEntries={['/study?source=G&ang=100&startAng=100&endAng=106&baniDbId=99&exactBani=1&bani=Long%20Reading&resumeVerseId=8172']}><Routes><Route path="/study" element={<><Study /><ReaderNavigationProbe /></>} /></Routes></MemoryRouter>)
  await screen.findByTestId('study-entry-list')
  fireEvent.click(screen.getByRole('button', { name: 'Read again' }))
  expect(screen.getByTestId('reader-url')).not.toHaveTextContent('resumeVerseId')
  const line = (await screen.findAllByTestId('study-gurbani-line'))[0]!
  fireEvent.click(line.querySelector('[data-reader-word]')!)
  fireEvent.click(within(screen.getByTestId('reader-dock')).getByRole('button', { name: 'Explore word' }))
  expect(await screen.findByRole('dialog')).toBeInTheDocument()
  fireEvent.click(screen.getByTestId('route-switch'))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(screen.queryByRole('button', { name: 'Explore word' })).not.toBeInTheDocument()
})

it('switching to Read in appearance clears the previous Study word', async () => {
  renderLongReading()
  const line = (await screen.findAllByTestId('study-gurbani-line'))[0]!
  fireEvent.click(line.querySelector('[data-reader-word]')!)
  fireEvent.click(within(screen.getByTestId('reader-dock')).getByRole('button', { name: 'Appearance', exact: true }))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('radio', { name: 'Read', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: /close.*reader/i }))
  await settleReaderFrames()
  expect(screen.queryByRole('button', { name: 'Explore word' })).not.toBeInTheDocument()
  expect(screen.getByTestId('page-study')).toHaveAttribute('data-reader-presentation', 'read')
})

it('offers deep presentation and Contents from More without duplicating the dock mode controls', async () => {
  renderLongReading()
  await screen.findByTestId('study-entry-list')
  fireEvent.click(screen.getByRole('button', { name: 'Reading tools', exact: true }))
  const tools = screen.getByRole('dialog', { name: 'Reading tools' })
  fireEvent.click(within(tools).getByRole('radio', { name: 'Read', exact: true }))
  expect(screen.getByTestId('page-study')).toHaveAttribute('data-reader-presentation', 'read')
  fireEvent.click(within(tools).getByRole('button', { name: 'Contents', exact: true }))
  expect(await screen.findByRole('dialog', { name: 'Contents' })).toBeInTheDocument()
  expect(screen.queryByRole('dialog', { name: 'Reading tools' })).not.toBeInTheDocument()
  expect(screen.getByTestId('reader-dock').querySelector('fieldset')).not.toBeInTheDocument()
})

beforeEach(() => {
  localStorage.clear()
  useLocaleStore.setState({ locale: 'en' })
  useBookmarksStore.setState({ bookmarks: [] })
  useFavoritesStore.setState({ favorites: [] })
  useScriptureCacheStore.getState().clearAll()
  useProgressStore.setState({ currentSession: null, studied: [], reviewQueue: [], streak: 0, lastStudied: null })
  useReadingPlacesStore.setState({ places: {} })
  useReadingProgressStore.setState({ progress: {} })
  useLanguageStore.setState({
    scriptMode: 'gurmukhi', showTransliteration: true, meaningLanguage: 'en',
    englishSource: 'ms', punjabiSource: 'ss', hindiSource: 'ss',
    larivaar: false, showVishraam: false, visraamSource: 'sttm',
    lineSpacing: 'relaxed', textAlign: 'left', fontSize: 22, supportTextSize: 'standard',
  })
  server.use(http.post('https://naamras-qa.supabase.co/functions/v1/banidb-proxy', async ({ request }) => {
    const body = await request.json() as { path?: string }
    if (body.path === '/v2/banis/99') return HttpResponse.json({ verses })
    if (body.path?.startsWith('/v2/shabads/')) return HttpResponse.json({ verses: [] })
    return HttpResponse.json({ error: 'Unexpected continuous-reader fixture request.' }, { status: 404 })
  }))
})
afterEach(() => {
  scroll?.restore()
  scroll = null
  restoreFonts?.()
  restoreFonts = null
})

it('keeps every long-bani line in source order through enlarged type and both presentations', async () => {
  renderLongReading()
  const reading = await screen.findByTestId('study-entry-list')
  await waitFor(() => expect(within(reading).getAllByTestId('study-line')).toHaveLength(84))
  const actualIds = () => within(reading).getAllByTestId('study-line').map(line => Number(line.dataset.verseId))
  expect(actualIds()).toEqual(verseIds)
  expect(screen.queryByTestId('study-entry-paginator')).not.toBeInTheDocument()
  fireEvent.click(within(screen.getByTestId('study-reader-topbar')).getByRole('button', { name: 'Reading appearance' }))
  fireEvent.change(screen.getByRole('slider', { name: 'Gurbani text size' }), { target: { value: '34' } })
  fireEvent.click(screen.getByRole('button', { name: /close.*reader/i }))
  expect(useLanguageStore.getState().fontSize).toBe(34)
  expect(within(reading).getAllByTestId('study-gurbani-line')[83]).toHaveStyle({ fontSize: '34px' })
  fireEvent.click(screen.getByRole('radio', { name: 'Read' }))
  expect(actualIds()).toEqual(verseIds)
  fireEvent.click(screen.getByRole('radio', { name: 'Study' }))
  expect(actualIds()).toEqual(verseIds)
})

it('remembers Study support preferences while Read offers the same Gurbani without inline support', async () => {
  const mounted = renderLongReading()
  const reading = await screen.findByTestId('study-entry-list')
  expect(await within(reading).findByText('Alternative meaning 84')).toBeInTheDocument()
  expect(within(reading).getByText('Long reading transliteration 84')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('radio', { name: 'Read' }))
  expect(screen.getByTestId('page-study')).toHaveAttribute('data-reader-presentation', 'read')
  expect(within(reading).queryByText('Alternative meaning 84')).not.toBeInTheDocument()
  expect(within(reading).queryByText('Long reading transliteration 84')).not.toBeInTheDocument()
  expect(useLanguageStore.getState()).toMatchObject({ showTransliteration: true, meaningLanguage: 'en', englishSource: 'ms' })
  mounted.unmount()
  renderLongReading()
  const reopened = await screen.findByTestId('study-entry-list')
  expect(screen.getByRole('radio', { name: 'Read' })).toBeChecked()
  fireEvent.click(screen.getByRole('radio', { name: 'Study' }))
  expect(within(reopened).getByText('Alternative meaning 84')).toBeInTheDocument()
  expect(within(reopened).getByText('Long reading transliteration 84')).toBeInTheDocument()
})

it('previews independent Study support sizing while preserving Gurbani size and the contextual verse', async () => {
  renderLongReading()
  const lines = await screen.findAllByTestId('study-line')
  const target = modelTypographyReflow(lines)
  fireEvent.click(within(target).getByRole('button', { name: /open verse actions/i }))
  fireEvent.click(within(screen.getByRole('dialog', { name: /verse actions/i })).getByRole('button', { name: 'Reading appearance' }))
  const appearance = await screen.findByRole('dialog', { name: 'Reading appearance' })
  const preview = within(appearance).getByRole('region', { name: 'Text preview' })
  expect(preview).toHaveTextContent('Long reading transliteration 41')
  expect(preview).toHaveTextContent('Alternative meaning 41')
  fireEvent.click(within(appearance).getByText('Study layers', { exact: true }))
  fireEvent.click(within(appearance).getByRole('button', { name: 'Extra large', exact: true }))
  expect(preview).toHaveAttribute('data-support-text-size', 'extra-large')
  expect(useLanguageStore.getState()).toMatchObject({ fontSize: 22, supportTextSize: 'extra-large' })
  fireEvent.click(within(appearance).getByRole('radio', { name: 'Read', exact: true }))
  expect(within(preview).queryByText('Alternative meaning 41')).not.toBeInTheDocument()
  fireEvent.click(within(appearance).getByRole('radio', { name: 'Study', exact: true }))
  expect(preview).toHaveTextContent('Alternative meaning 41')
  fireEvent.click(within(appearance).getByRole('button', { name: 'Close reader settings' }))
  await settleReaderFrames()
  expect(screen.getByTestId('page-study')).toHaveAttribute('data-support-text-size', 'extra-large')
  expect(target.getBoundingClientRect().top).toBeCloseTo(300, 0)
})

it('retains Find query and its scroller through sheet reopening without moving the reading', async () => {
  renderLongReading()
  await screen.findByTestId('study-entry-list')
  fireEvent.click(screen.getAllByRole('button', { name: 'Contents', exact: true })[0]!)
  let contents = screen.getByRole('dialog', { name: 'Contents' })
  expect(contents.querySelector('.study-reader-sheet__heading h2')).toHaveFocus()
  const input = await within(contents).findByRole('searchbox')
  fireEvent.change(input, { target: { value: 'Long reading transliteration' } })
  const scroller = contents.querySelector<HTMLElement>('.study-reader-sections-sheet__scroll')!
  scroller.scrollTop = 650
  fireEvent.scroll(scroller)
  fireEvent.click(within(contents).getByRole('button', { name: 'Close', exact: true }))
  await settleReaderFrames()
  fireEvent.click(screen.getAllByRole('button', { name: 'Contents', exact: true })[0]!)
  contents = screen.getByRole('dialog', { name: 'Contents' })
  expect(await within(contents).findByRole('searchbox')).toHaveValue('Long reading transliteration')
  await settleReaderFrames()
  expect(contents.querySelector<HTMLElement>('.study-reader-sections-sheet__scroll')!.scrollTop).toBe(650)
  expect(screen.getAllByTestId('study-line').map(line => Number(line.dataset.verseId))).toEqual(verseIds)
})

it('keeps Find during a resume-location change but clears it when the reading length changes', async () => {
  function FindRouteControls() {
    const navigate = useNavigate()
    const path = '/study?source=G&ang=100&startAng=100&endAng=106&baniDbId=99&exactBani=1&bani=Long%20Reading'
    return <><button onClick={() => navigate(`${path}&resumeVerseId=8172`)}>Move saved verse</button><button onClick={() => navigate(`${path}&sgLength=long`)}>Other reading length</button></>
  }
  render(<MemoryRouter initialEntries={['/study?source=G&ang=100&startAng=100&endAng=106&baniDbId=99&exactBani=1&bani=Long%20Reading']}><Routes><Route path="/study" element={<><Study /><FindRouteControls /></>} /></Routes></MemoryRouter>)
  await screen.findByTestId('study-entry-list')
  const openContents = async () => {
    fireEvent.click(screen.getAllByRole('button', { name: 'Contents', exact: true })[0]!)
    return within(screen.getByRole('dialog', { name: 'Contents' })).findByRole('searchbox')
  }
  fireEvent.change(await openContents(), { target: { value: 'transliteration' } })
  fireEvent.click(screen.getByRole('button', { name: 'Close', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: 'Move saved verse' }))
  expect(await openContents()).toHaveValue('transliteration')
  fireEvent.click(screen.getByRole('button', { name: 'Close', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: 'Other reading length' }))
  expect(await openContents()).toHaveValue('')
})

it('ordinary Contents opening reveals the marked row inside its own scroller without scrolling scripture', async () => {
  renderLongReading()
  await screen.findByTestId('study-entry-list')
  scroll = mockDocumentScroll({ top: 440, viewportHeight: 800, scrollHeight: 20000 })
  const original = HTMLElement.prototype.getBoundingClientRect
  const measurement = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const top = this.classList.contains('study-reader-sections-sheet__scroll') ? 100 : this.getAttribute('aria-current') === 'location' ? 900 : null
    if (top === null) return original.call(this)
    const height = this.classList.contains('study-reader-sections-sheet__scroll') ? 500 : 80
    return { x: 0, y: top, top, bottom: top + height, left: 0, right: 390, width: 390, height, toJSON: () => ({}) }
  })
  fireEvent.click(screen.getAllByRole('button', { name: 'Contents', exact: true })[0]!)
  const contents = screen.getByRole('dialog', { name: 'Contents' })
  await settleReaderFrames()
  measurement.mockRestore()
  expect(contents.querySelector<HTMLElement>('.study-reader-sections-sheet__scroll')!.scrollTop).toBe(590)
  expect(scroll.getTop()).toBe(440)
})

it('jumps to a later section without removing or replacing the rest of the bani', async () => {
  const jumpedTo: string[] = []
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(function (this: HTMLElement) { jumpedTo.push(this.dataset.verseId ?? this.id) })
  renderLongReading()
  await screen.findByTestId('study-entry-list')
  fireEvent.click(screen.getAllByRole('button', { name: 'Contents' })[0]!)
  const sections = screen.getByRole('dialog', { name: 'Contents' })
  fireEvent.click(within(sections).getByRole('button', { name: /ਸ਼ਬਦ 7 ਪੰਕਤੀ 1/ }))
  await waitFor(() => expect(jumpedTo).toContain('8172'))
  expect(document.getElementById('study-entry-7')).toHaveFocus()
  expect(screen.queryByRole('dialog', { name: 'Contents' })).not.toBeInTheDocument()
  expect(screen.getAllByTestId('study-line').map(line => Number(line.dataset.verseId))).toEqual(verseIds)
})

it('keeps the deliberate Rehras body jump through preceding headers, enlarged text, reflow, and a backwards jump', async () => {
  useLanguageStore.setState({ fontSize: 34 })
  localStorage.setItem('naamras-reader-presentation', 'read')
  const rows = [
    [2796, 12, 0, 'ਸਰਣਿ ਪਰੇ ਕੀ ਰਾਖਹੁ ਸਰਮਾ ॥੨॥੪॥'],
    [2880, null, 2, 'ਪਾਤਿਸ਼ਾਹੀ ੧੦ ॥'],
    [2881, 1386, 1, 'ਕਬਿਯੋ ਬਾਚ ਬੇਨਤੀ ॥'],
    [2882, 1386, 0, 'ਚੌਪਈ ॥'],
    [2883, 1386, 0, 'ਹਮਰੀ ਕਰੋ ਹਾਥ ਦੈ ਰੱਛਾ ॥'],
    [2884, 1386, 0, 'ਪੂਰਨ ਹੋਇ ਚਿੱਤ ਕੀ ਇੱਛਾ ॥'],
  ] as const
  server.use(http.post('https://naamras-qa.supabase.co/functions/v1/banidb-proxy', async ({ request }) => {
    const body = await request.json() as { path?: string }
    if (body.path === '/v2/banis/21') return HttpResponse.json({
      baniInfo: { source: { sourceId: null } },
      verses: rows.map(([verseId, pageNo, header, unicode]) => ({ header, verse: {
        verseId, pageNo, verse: { unicode }, transliteration: { en: 'reading' }, translation: {},
      } })),
    })
  }))
  let position: '12' | '1386' = '12'
  scroll = mockDocumentScroll({ top: 700, viewportHeight: 844, scrollHeight: 8000 })
  const originalRect = HTMLElement.prototype.getBoundingClientRect
  const measure = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains('study-reader-topbar')) return { x: 0, y: 0, top: 0, bottom: 119, left: 0, right: 390, width: 390, height: 119, toJSON: () => ({}) }
    if (this.dataset.testid !== 'study-line') return originalRect.call(this)
    const id = Number(this.dataset.verseId)
    const nativeTop = position === '1386'
      ? ({ 2796: -200, 2880: 130, 2881: 335, 2882: 435, 2883: 538, 2884: 650 } as Record<number, number>)[id]
      : id === 2796 ? 200 : 1000 + rows.findIndex(row => row[0] === id) * 100
    const reflow = (useLanguageStore.getState().fontSize === 34 ? 0 : 150)
      + (document.querySelector<HTMLElement>('[data-testid="page-study"]')?.dataset.readerPresentation === 'study' ? 200 : 0)
    const top = nativeTop + reflow - (scroll!.getTop() - 700)
    return { x: 0, y: top, top, bottom: top + 90, left: 0, right: 390, width: 390, height: 90, toJSON: () => ({}) }
  })
  const jumped: string[] = []
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(function (this: HTMLElement) {
    jumped.push(this.dataset.verseId ?? this.id)
    if (this.dataset.verseId === '2883' || this.id === 'study-entry-2') position = '1386'
    if (this.dataset.verseId === '2796' || this.id === 'study-entry-1') position = '12'
  })
  try {
    render(<MemoryRouter initialEntries={['/study?source=G&ang=12&startAng=8&endAng=12&baniDbId=21&exactBani=1&bani=Rehras%20Sahib&sgLength=short']}><Routes><Route path="/study" element={<Study />} /></Routes></MemoryRouter>)
    await screen.findByTestId('study-entry-list')
    await waitFor(() => expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(2796))
    const sourceOrder = screen.getAllByTestId('study-line').map(line => line.dataset.verseId)
    fireEvent.click(screen.getAllByRole('button', { name: 'Contents', exact: true })[0]!)
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Contents' })).getByRole('button', { name: /ਹਮਰੀ ਕਰੋ/ }))
    await settleReaderFrames()
    act(() => document.dispatchEvent(new Event('scrollend')))
    expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(2796)
    fireEvent.click(within(screen.getByTestId('reader-dock')).getByRole('button', { name: 'Continue here' }))
    await waitFor(() => expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(2883))
    expect(jumped).toContain('2883')
    expect(screen.getByTestId('reader-dock')).toHaveTextContent('Ang 1386')
    expect(new URLSearchParams(useProgressStore.getState().currentSession!.resumePath.split('?')[1]).get('ang')).toBe('1386')
    expect(captureReaderAnchor()?.key).toBe('bani-21-1386-0:2')

    fireEvent.click(within(screen.getByTestId('reader-dock')).getByRole('button', { name: 'Appearance', exact: true }))
    const appearance = screen.getByRole('dialog', { name: 'Reading appearance' })
    fireEvent.change(within(appearance).getByRole('slider', { name: 'Gurbani text size' }), { target: { value: '22' } })
    fireEvent.click(within(appearance).getByRole('radio', { name: 'Study', exact: true }))
    fireEvent.click(within(appearance).getByRole('button', { name: 'Close reader settings' }))
    await settleReaderFrames()
    const bodyLine = screen.getAllByTestId('study-line').find(line => line.dataset.verseId === '2883')!
    expect(bodyLine.getBoundingClientRect().top).toBeCloseTo(538, 0)
    expect(captureReaderAnchor()?.key).toBe('bani-21-1386-0:2')

    fireEvent.click(screen.getAllByRole('button', { name: 'Contents', exact: true })[0]!)
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Contents' })).getByRole('button', { name: /ਸਰਣਿ ਪਰੇ/ }))
    await settleReaderFrames()
    act(() => document.dispatchEvent(new Event('scrollend')))
    expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(2883)
    fireEvent.click(within(screen.getByTestId('reader-dock')).getByRole('button', { name: 'Continue here' }))
    await waitFor(() => expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(2796))
    expect(jumped).toContain('2796')
    expect(screen.getByTestId('reader-dock')).toHaveTextContent('Ang 12')
    expect(screen.getAllByTestId('study-line').map(line => line.dataset.verseId)).toEqual(sourceOrder)
  } finally { measure.mockRestore() }
})

function buildRehrasResumeResult(): baniApi.BaniFetchResult {
  const makeEntry = (verseId: number, ang: number, gurmukhi: string) => ({
    id: `bani-21-${ang}-0`, scripture: 'Sundar Gutka', source: 'G' as const,
    sourceName: 'Sundar Gutka', sourceMeta: null, sourceAttribution: 'unavailable' as const,
    ang, shabadId: 0, verseIds: [verseId], gurmukhi, transliteration: '',
    translation_en: '', translation_hi: '', translation_pa: '', words: [],
    lines: [{ verseId, shabadId: 0, ang, originalAng: ang, gurmukhi, transliteration: '',
      translation_en: '', translations_en: {}, translation_hi: '', translation_pa: '',
    }],
  })
  return {
    entries: [makeEntry(2650, 8, 'ਸੋ ਦਰੁ ਤੇਰਾ ਕੇਹਾ ਸੋ ਘਰੁ ਕੇਹਾ ਜਿਤੁ ਬਹਿ ਸਰਬ ਸਮਾਲੇ ॥'), makeEntry(2883, 1386, 'ਹਮਰੀ ਕਰੋ ਹਾਥ ਦੈ ਰੱਛਾ ॥')],
    availableLengths: ['short'], resolvedLength: 'short', normalizationRevision: 2,
  }
}

const positionRehrasPath = '/study?source=G&ang=8&startAng=8&endAng=12&bani=Rehras+Sahib&baniId=rehras-sahib&baniDbId=21&exactBani=1&sgLength=short'

function modelRehrasPosition() {
  scroll = mockDocumentScroll({ top: 0, viewportHeight: 844, scrollHeight: 8000 })
  const originalRect = HTMLElement.prototype.getBoundingClientRect
  const measure = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.dataset.testid !== 'study-line') return originalRect.call(this)
    const top = (this.dataset.verseId === '2883' ? 5000 : 200) - scroll!.getTop()
    return { x: 0, y: top, top, bottom: top + 100, left: 0, right: 390, width: 390, height: 100, toJSON: () => ({}) }
  })
  const alignment = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(function (this: HTMLElement) {
    if (this.dataset.verseId === '2883') scroll!.setTop(5000 - 76)
  })
  return { measure, alignment }
}

function PositionResumeProbe() {
  const navigate = useNavigate()
  return <button data-testid="request-deep-position" onClick={() => navigate(`${positionRehrasPath}&resumeVerseId=2883`)}>Open deep place</button>
}

it.each(['sikh-progress', 'naamras-reading-places', 'all'] as const)('keeps reading usable through %s write failure and retries the actual current place once', async failedKey => {
  const cached = buildRehrasResumeResult()
  const cacheRead = vi.spyOn(baniOfflineCache, 'readBaniOfflineCache').mockResolvedValue(cached)
  const network = vi.spyOn(baniApi, 'fetchBani').mockResolvedValue(cached)
  const geometry = modelRehrasPosition()
  const mounted = render(<MemoryRouter initialEntries={[positionRehrasPath]}><Routes><Route path="/study" element={<Study />} /><Route path="/banis" element={<h1>Browse readings</h1>} /></Routes></MemoryRouter>)
  await screen.findByTestId('study-entry-list')
  await settleReaderFrames()
  expect(screen.queryByTestId('study-position-recovery')).not.toBeInTheDocument()
  const originalWrite = localStorage.setItem.bind(localStorage)
  const previousBytes = { progress: localStorage.getItem('sikh-progress'), places: localStorage.getItem('naamras-reading-places') }
  let rejectWrites = true
  const write = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
    if (rejectWrites && (failedKey === 'all' || key === failedKey)) throw new Error('Storage full')
    originalWrite(key, value)
  })
  try {
    scroll!.setTop(5000 - 76)
    act(() => window.dispatchEvent(new Event('pagehide')))
    const recovery = await screen.findByTestId('study-position-recovery')
    expect(recovery).toBeVisible()
    expect(screen.getByTestId('reader-dock')).toBeVisible()
    expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(2883)
    expect(useReadingPlacesStore.getState().places[getExactReadingKey(positionRehrasPath)!]?.resumeVerseId).toBe(2883)
    if (failedKey !== 'naamras-reading-places') expect(localStorage.getItem('sikh-progress')).toBe(previousBytes.progress)
    if (failedKey !== 'sikh-progress') expect(localStorage.getItem('naamras-reading-places')).toBe(previousBytes.places)
    expect(useScriptureCacheStore.getState().getEntryById(cached.entries[1]!.id)?.gurmukhi).toBe(cached.entries[1]!.gurmukhi)
    expect(useScriptureCacheStore.getState().getAng('G', 1386)).toBeUndefined()
    const announcement = screen.getByTestId('study-position-announcement')
    const mutations: MutationRecord[] = []
    const observer = new MutationObserver(records => mutations.push(...records))
    observer.observe(announcement, { childList: true, characterData: true, subtree: true })
    try {
      const writesBeforeRetry = write.mock.calls.length
      fireEvent.click(within(recovery).getByRole('button', { name: 'Retry saving place', exact: true }))
      expect(write.mock.calls.length).toBeGreaterThan(writesBeforeRetry)
      await act(async () => { await Promise.resolve() })
      expect(screen.getByTestId('study-position-recovery')).toBe(recovery)
      expect(mutations).toHaveLength(0)
      rejectWrites = false
      fireEvent.click(within(recovery).getByRole('button', { name: 'Retry saving place', exact: true }))
      expect(screen.queryByTestId('study-position-recovery')).not.toBeInTheDocument()
      expect(announcement).toBeEmptyDOMElement()
      const persisted = JSON.parse(localStorage.getItem('naamras-reading-places')!).state.places
      expect(persisted[getExactReadingKey(positionRehrasPath)!].resumeVerseId).toBe(2883)
      expect(screen.getAllByTestId('study-line').map(line => line.dataset.verseId)).toEqual(['2650', '2883'])
      if (failedKey === 'all') {
        rejectWrites = true
        scroll!.setTop(0)
        fireEvent.click(within(screen.getByTestId('study-reader-topbar')).getByRole('button', { name: 'Back', exact: true }))
        expect(screen.getByRole('heading', { name: 'Browse readings' })).toBeInTheDocument()
        expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(2650)
      }
    } finally {
      observer.disconnect()
    }
  } finally {
    rejectWrites = false
    write.mockRestore(); mounted.unmount()
    geometry.measure.mockRestore(); geometry.alignment.mockRestore(); network.mockRestore(); cacheRead.mockRestore()
  }
})

it('keeps a session-only place warning when its Retry is touched while an incoming target is unapplied', async () => {
  const cached = buildRehrasResumeResult()
  const cacheRead = vi.spyOn(baniOfflineCache, 'readBaniOfflineCache').mockResolvedValue(cached)
  const network = vi.spyOn(baniApi, 'fetchBani').mockResolvedValue(cached)
  const geometry = modelRehrasPosition()
  const originalWrite = localStorage.setItem.bind(localStorage)
  let rejectWrites = true
  const write = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
    if (rejectWrites && key === 'sikh-progress') throw new Error('Storage full')
    originalWrite(key, value)
  })
  const mounted = render(<MemoryRouter initialEntries={[positionRehrasPath]}><Routes><Route path="/study" element={<><Study /><PositionResumeProbe /></>} /></Routes></MemoryRouter>)
  let frameId = 0
  const frames = new Map<number, FrameRequestCallback>()
  const queueFrame = (callback: FrameRequestCallback) => { const id = ++frameId; frames.set(id, callback); return id }
  const raf = vi.spyOn(globalThis, 'requestAnimationFrame')
  const windowRaf = vi.spyOn(window, 'requestAnimationFrame')
  try {
    await screen.findByTestId('study-entry-list')
    await screen.findByTestId('study-position-recovery')
    await settleReaderFrames()
    raf.mockImplementation(queueFrame)
    windowRaf.mockImplementation(queueFrame)
    useProgressStore.getState().updateSession({ scriptureId: 'G-1386', resumePath: positionRehrasPath, resumeVerseId: 2883, updatedAt: new Date().toISOString() })
    fireEvent.click(screen.getByTestId('request-deep-position'))
    const retry = screen.getByRole('button', { name: 'Retry saving place', exact: true })
    const writesBeforeRetry = write.mock.calls.length
    fireEvent.pointerDown(retry, { pointerType: 'touch' })
    fireEvent.click(retry)
    expect(write.mock.calls).toHaveLength(writesBeforeRetry)
    expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(2883)
    expect(screen.getByTestId('study-position-recovery')).toBeVisible()
    rejectWrites = false
    for (let round = 0; round < 6; round += 1) await act(async () => {
      const pending = Array.from(frames.values()); frames.clear()
      pending.forEach(callback => callback(performance.now()))
    })
    expect(screen.queryByTestId('study-position-recovery')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('study-line').find(line => line.dataset.verseId === '2883')!.getBoundingClientRect().top).toBe(76)
    expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(2883)
  } finally {
    rejectWrites = false
    mounted.unmount(); write.mockRestore(); windowRaf.mockRestore(); raf.mockRestore()
    geometry.measure.mockRestore(); geometry.alignment.mockRestore(); network.mockRestore(); cacheRead.mockRestore()
  }
})

it.each(['before alignment', 'after manual scroll', 'after user intent'] as const)('keeps the intended Rehras place when a fresh payload replaces cached opening content: %s', async timing => {
  const cached = buildRehrasResumeResult()
  let finishNetwork: (value: baniApi.BaniFetchResult) => void = () => {}
  const cacheRead = vi.spyOn(baniOfflineCache, 'readBaniOfflineCache').mockResolvedValue(cached)
  const network = vi.spyOn(baniApi, 'fetchBani').mockReturnValue(new Promise(resolve => { finishNetwork = resolve }))
  let frameId = 0
  const frames = new Map<number, FrameRequestCallback>()
  const queueFrame = (callback: FrameRequestCallback) => { const id = ++frameId; frames.set(id, callback); return id }
  const cancelFrame = (id: number) => { frames.delete(id) }
  const raf = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(queueFrame)
  const caf = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(cancelFrame)
  const windowRaf = window.requestAnimationFrame === queueFrame ? null : vi.spyOn(window, 'requestAnimationFrame').mockImplementation(queueFrame)
  const windowCaf = window.cancelAnimationFrame === cancelFrame ? null : vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(cancelFrame)
  const flushFrames = async () => {
    for (let round = 0; round < 6; round += 1) await act(async () => {
      const pending = Array.from(frames.values())
      frames.clear()
      pending.forEach(callback => callback(performance.now()))
    })
  }
  scroll = mockDocumentScroll({ top: 0, viewportHeight: 844, scrollHeight: 8000 })
  const originalRect = HTMLElement.prototype.getBoundingClientRect
  const measure = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.dataset.testid !== 'study-line') return originalRect.call(this)
    const savedExcerpt = this.closest<HTMLElement>('[data-study-entry-id]')?.dataset.studyEntryId?.startsWith('saved-')
    const top = (this.dataset.verseId === '2883' && !savedExcerpt ? 5000 : 200) - scroll!.getTop()
    return { x: 0, y: top, top, bottom: top + 100, left: 0, right: 390, width: 390, height: 100, toJSON: () => ({}) }
  })
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(function (this: HTMLElement) {
    if (this.dataset.verseId === '2883') {
      const savedExcerpt = this.closest<HTMLElement>('[data-study-entry-id]')?.dataset.studyEntryId?.startsWith('saved-')
      scroll!.setTop((savedExcerpt ? 200 : 5000) - 76)
    }
  })
  const deep = {
    scriptureId: 'G-1386', resumePath: '/study?source=G&ang=1386&startAng=8&endAng=12&bani=Rehras+Sahib&baniId=rehras-sahib&baniDbId=21&exactBani=1&sgLength=short',
    resumeVerseId: 2883, updatedAt: new Date().toISOString(),
  }
  useReadingPlacesStore.setState({ places: {} })
  useProgressStore.getState().updateSession(deep)
  const path = getHomeNitnemResume(getNitnemOption('rehras-sahib')!, deep, useReadingPlacesStore.getState().places)!
  expect(path).toContain('resumeVerseId=2883')
  let mounted: ReturnType<typeof render> | null = null
  try {
    mounted = render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/study" element={<Study />} /></Routes></MemoryRouter>)
    await screen.findByTestId('study-entry-list')
    expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(2883)
    // Cached opening content is not yet aligned to the authoritative incoming verse.
    act(() => window.dispatchEvent(new Event('pagehide')))
    expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(2883)
    expect(getHomeNitnemResume(getNitnemOption('rehras-sahib')!, null, useReadingPlacesStore.getState().places)).toContain('resumeVerseId=2883')
    if (timing === 'after manual scroll') {
      await flushFrames()
      scroll.setTop(5000 - 76 + 120)
      act(() => document.dispatchEvent(new Event('scrollend')))
      await flushFrames()
    }
    if (timing === 'after user intent') fireEvent.wheel(document)
    await act(async () => { finishNetwork(structuredClone(cached)) })
    await flushFrames()
    act(() => document.dispatchEvent(new Event('scrollend')))
    await flushFrames()
    const target = screen.getAllByTestId('study-line').find(line => line.dataset.verseId === '2883')!
    expect(target.getBoundingClientRect().top).toBe(timing === 'after user intent' ? 5000 : timing === 'after manual scroll' ? -44 : 76)
    const expectedVerseId = timing === 'after user intent' ? 2650 : 2883
    expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(expectedVerseId)
    expect(getHomeNitnemResume(getNitnemOption('rehras-sahib')!, useProgressStore.getState().currentSession, useReadingPlacesStore.getState().places)).toContain(`resumeVerseId=${expectedVerseId}`)
    scroll.setTop(0)
    act(() => document.dispatchEvent(new Event('scrollend')))
    await flushFrames()
    expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(2650)
  } finally {
    mounted?.unmount()
    cacheRead.mockRestore(); network.mockRestore(); measure.mockRestore()
    windowRaf?.mockRestore(); windowCaf?.mockRestore(); raf.mockRestore(); caf.mockRestore()
  }
})

it('releases an unavailable incoming verse so subsequent real reading continues to save normally', async () => {
  renderLongReading('&resumeVerseId=999999')
  await screen.findByTestId('study-entry-list')
  await waitFor(() => expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(8100))
  expect(screen.getByTestId('reader-dock')).toHaveTextContent('Ang 100')
})

it.each(['empty', 'missing-target excerpt', 'matching-target excerpt', 'manually read excerpt', 'manually read matching excerpt'] as const)('retains incoming resume recovery and deliberate reading through Retry: %s', async recovery => {
  const cacheRead = vi.spyOn(baniOfflineCache, 'readBaniOfflineCache').mockResolvedValue(null)
  const network = vi.spyOn(baniApi, 'fetchBani').mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(buildRehrasResumeResult())
  scroll = mockDocumentScroll({ top: 0, viewportHeight: 844, scrollHeight: 8000 })
  const originalRect = HTMLElement.prototype.getBoundingClientRect
  const measure = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.dataset.testid !== 'study-line') return originalRect.call(this)
    const savedExcerpt = this.closest<HTMLElement>('[data-study-entry-id]')?.dataset.studyEntryId?.startsWith('saved-')
    const top = (this.dataset.verseId === '2883' && !savedExcerpt ? 5000 : 200) - scroll!.getTop()
    return { x: 0, y: top, top, bottom: top + 100, left: 0, right: 390, width: 390, height: 100, toJSON: () => ({}) }
  })
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(function (this: HTMLElement) {
    if (this.dataset.verseId === '2883') {
      const savedExcerpt = this.closest<HTMLElement>('[data-study-entry-id]')?.dataset.studyEntryId?.startsWith('saved-')
      scroll!.setTop((savedExcerpt ? 200 : 5000) - 76)
    }
  })
  const deepPath = '/study?source=G&ang=1386&startAng=8&endAng=12&bani=Rehras+Sahib&baniId=rehras-sahib&baniDbId=21&exactBani=1&sgLength=short'
  useReadingPlacesStore.setState({ places: {} })
  useProgressStore.getState().updateSession({ scriptureId: 'G-1386', resumePath: deepPath, resumeVerseId: 2883, updatedAt: new Date().toISOString() })
  if (recovery !== 'empty') {
    const matching = recovery === 'matching-target excerpt' || recovery === 'manually read matching excerpt'
    useBookmarksStore.setState({ bookmarks: [{
      id: 'rehras-offline-excerpt', type: 'verse', title: 'Rehras Sahib', source: 'G',
      ang: matching ? 1386 : 8, verseId: matching ? 2883 : 2650,
      excerpt: matching ? 'ਹਮਰੀ ਕਰੋ ਹਾਥ ਦੈ ਰੱਛਾ ॥' : 'ਸੋ ਦਰੁ ਤੇਰਾ ਕੇਹਾ ਸੋ ਘਰੁ ਕੇਹਾ ਜਿਤੁ ਬਹਿ ਸਰਬ ਸਮਾਲੇ ॥',
      returnPath: deepPath, savedAt: new Date().toISOString(),
    }] })
  }
  const mounted = render(<MemoryRouter initialEntries={[`${deepPath}&resumeVerseId=2883`]}><Routes><Route path="/study" element={<Study />} /></Routes></MemoryRouter>)
  try {
    const retryName = recovery === 'empty' ? 'Try Again' : 'Try live copy'
    await screen.findByRole('button', { name: retryName, exact: true })
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 220)) })
    expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(2883)
    act(() => window.dispatchEvent(new Event('pagehide')))
    expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(2883)
    if (recovery === 'manually read excerpt' || recovery === 'manually read matching excerpt') {
      fireEvent.wheel(document)
      if (recovery === 'manually read matching excerpt') {
        scroll.setTop(scroll.getTop() + 20)
        act(() => document.dispatchEvent(new Event('scrollend')))
        await settleReaderFrames()
      }
    }
    const retry = screen.getByRole('button', { name: retryName, exact: true })
    fireEvent.pointerDown(retry, { pointerType: 'touch' })
    fireEvent.click(retry)
    await waitFor(() => expect(screen.getAllByTestId('study-line')).toHaveLength(2))
    await settleReaderFrames()
    const target = screen.getAllByTestId('study-line').find(line => line.dataset.verseId === '2883')!
    expect(target.getBoundingClientRect().top).toBe(recovery === 'manually read excerpt' ? 5000 : recovery === 'manually read matching excerpt' ? 56 : 76)
    expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(recovery === 'manually read excerpt' ? 2650 : 2883)
    expect(screen.getAllByTestId('study-line').map(line => Number(line.dataset.verseId))).toEqual([2650, 2883])
  } finally {
    mounted.unmount()
    cacheRead.mockRestore(); network.mockRestore(); measure.mockRestore()
  }
})

it('restores an incoming verse once and then follows later reading without snapping backward', async () => {
  scroll = mockDocumentScroll({ top: 700, viewportHeight: 800, scrollHeight: 6000 })
  const scrollIntoView = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {})
  renderLongReading('&resumeVerseId=8100')
  const lines = await screen.findAllByTestId('study-line')
  await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
  lines.forEach((line, index) => vi.spyOn(line, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: index >= 72 ? 140 + (index - 72) * 100 : -200,
    top: index >= 72 ? 140 + (index - 72) * 100 : -200,
    bottom: index >= 72 ? 220 + (index - 72) * 100 : -100,
    left: 0, right: 390, width: 390, height: 80, toJSON: () => ({}),
  }))
  scrollIntoView.mockClear()
  act(() => document.dispatchEvent(new Event('scrollend')))
  await waitFor(() => expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(8172))
  expect(useProgressStore.getState().currentSession?.resumePath).toContain('baniDbId=99')
  expect(useProgressStore.getState().currentSession?.resumePath).toContain('exactBani=1')
  expect(useProgressStore.getState().currentSession?.scriptureId).toBe('G-106')
  expect(new URLSearchParams(useProgressStore.getState().currentSession!.resumePath.split('?')[1]).get('ang')).toBe('106')
  expect(scrollIntoView).not.toHaveBeenCalled()
})

it('keeps the contextual deep verse in place after changing text size and presentation in appearance', async () => {
  renderLongReading()
  const lines = await screen.findAllByTestId('study-line')
  const target = modelTypographyReflow(lines)
  expect(target.getBoundingClientRect().top).toBe(300)
  fireEvent.click(within(target).getByRole('button', { name: /open verse actions/i }))
  const actions = screen.getByRole('dialog', { name: /verse actions/i })
  fireEvent.click(within(actions).getByRole('button', { name: 'Reading appearance' }))
  const appearance = await screen.findByRole('dialog', { name: 'Reading appearance' })
  fireEvent.change(within(appearance).getByRole('slider', { name: 'Gurbani text size' }), { target: { value: '34' } })
  fireEvent.click(within(appearance).getByRole('radio', { name: 'Read', exact: true }))
  fireEvent.click(within(appearance).getByRole('button', { name: 'Close reader settings' }))
  await settleReaderFrames()
  expect(screen.getByTestId('page-study')).toHaveAttribute('data-reader-presentation', 'read')
  expect(useLanguageStore.getState().fontSize).toBe(34)
  await waitFor(() => expect(target.getBoundingClientRect().top).toBeCloseTo(300, 0))
  expect(screen.getAllByTestId('study-line').map(line => Number(line.dataset.verseId))).toEqual(verseIds)
})

it('opens live appearance at a deep source boundary with the actual passage preview and retained place', async () => {
  renderLongReading()
  const lines = await screen.findAllByTestId('study-line')
  const target = modelTypographyReflow(lines, 36)
  const section = target.closest<HTMLElement>('[data-study-entry-id]')!
  const sourceBefore = lines.map(line => within(line).getByTestId('study-gurbani-line').textContent)
  fireEvent.click(within(section).getByRole('button', { name: 'Reading appearance' }))
  const appearance = await screen.findByRole('dialog', { name: 'Reading appearance' })
  const preview = within(appearance).getByRole('region', { name: 'Text preview' })
  expect(preview).toHaveTextContent('ਸ਼ਬਦ 4 ਪੰਕਤੀ 1')
  expect(preview).toHaveAttribute('tabindex', '0')
  preview.focus()
  expect(preview).toHaveFocus()
  fireEvent.change(within(appearance).getByRole('slider', { name: 'Gurbani text size' }), { target: { value: '34' } })
  fireEvent.click(within(appearance).getByRole('radio', { name: 'Read', exact: true }))
  fireEvent.click(within(appearance).getByRole('button', { name: 'Close reader settings' }))
  await settleReaderFrames()
  expect(target.getBoundingClientRect().top).toBeCloseTo(300, 0)
  expect(screen.getAllByTestId('study-line').map(line => within(line).getByTestId('study-gurbani-line').textContent)).toEqual(sourceBefore)
})

it('opens appearance from a deep native selection and preserves that selected source line through reflow', async () => {
  renderLongReading()
  await screen.findByTestId('study-entry-list')
  fireEvent.click(screen.getByRole('radio', { name: 'Read', exact: true }))
  const target = modelTypographyReflow(screen.getAllByTestId('study-line'))
  const range = document.createRange()
  range.selectNodeContents(within(target).getByTestId('study-gurbani-line'))
  act(() => {
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
  })
  fireEvent.click(screen.getByRole('button', { name: 'More verse actions' }))
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Verse actions' })).getByRole('button', { name: 'Reading appearance' }))
  const appearance = await screen.findByRole('dialog', { name: 'Reading appearance' })
  fireEvent.change(within(appearance).getByRole('slider', { name: 'Gurbani text size' }), { target: { value: '34' } })
  fireEvent.click(within(appearance).getByRole('radio', { name: 'Study', exact: true }))
  fireEvent.click(within(appearance).getByRole('button', { name: 'Close reader settings' }))
  await settleReaderFrames()
  expect(screen.getByTestId('page-study')).toHaveAttribute('data-reader-presentation', 'study')
  await waitFor(() => expect(target.getBoundingClientRect().top).toBeCloseTo(300, 0))
  expect(within(target).getByText('Alternative meaning 41')).toBeInTheDocument()
})

it.each([false, true])('settles first-use support fonts after a presentation change, respecting subsequent intent: %s', async userIntendsToScroll => {
  renderLongReading()
  const lines = await screen.findAllByTestId('study-line')
  fireEvent.click(screen.getByRole('radio', { name: 'Read', exact: true }))
  await settleReaderFrames()
  let fontOffset = 0
  const target = modelTypographyReflow(lines, 40, () => fontOffset)
  fireEvent.click(within(target).getByRole('button', { name: /open verse actions/i }))
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Verse actions' })).getByRole('button', { name: 'Reading appearance' }))
  const appearance = await screen.findByRole('dialog', { name: 'Reading appearance' })
  const finishFonts = deferFontLayout()
  fireEvent.click(within(appearance).getByRole('radio', { name: 'Study', exact: true }))
  const close = within(appearance).getByRole('button', { name: 'Close reader settings' })
  fireEvent.pointerDown(close, { pointerType: 'touch' })
  fireEvent.click(close)
  await settleReaderFrames()
  expect(target.getBoundingClientRect().top).toBeCloseTo(300, 0)
  fontOffset = -215
  expect(target.getBoundingClientRect().top).toBeCloseTo(85, 0)
  if (userIntendsToScroll) fireEvent.wheel(document)
  await act(async () => finishFonts())
  await settleReaderFrames()
  expect(target.getBoundingClientRect().top).toBeCloseTo(userIntendsToScroll ? 85 : 300, 0)
})

it('makes pause guidance understandable and available in Read without opening specialist options', async () => {
  renderLongReading()
  const reading = await screen.findByTestId('study-entry-list')
  fireEvent.click(screen.getByRole('radio', { name: 'Read', exact: true }))
  const originalSource = within(reading).getAllByTestId('study-gurbani-line').map(line => line.textContent)
  fireEvent.click(within(screen.getByTestId('study-reader-topbar')).getByRole('button', { name: 'Reading appearance', exact: true }))
  const appearance = await screen.findByRole('dialog', { name: 'Reading appearance' })
  const marks = within(appearance).getByRole('group', { name: 'Pause marks' })
  expect(marks.closest('details')).toBeNull()
  expect(marks).toHaveTextContent('Visual pause guidance; scripture punctuation stays visible.')
  const toggle = within(marks).getByRole('button', { name: 'Show pause guidance: Off' })
  expect(toggle).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(toggle)
  expect(useLanguageStore.getState().showVishraam).toBe(true)
  expect(within(marks).getByRole('button', { name: 'Show pause guidance: On' })).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(within(appearance).getByRole('button', { name: 'Close reader settings' }))
  expect(within(reading).getAllByTestId('study-gurbani-line').map(line => line.textContent)).toEqual(originalSource)
})

it.each(['pagehide', 'hidden'] as const)('saves the currently visible verse when %s interrupts an unfinished reading gesture', async interruption => {
  renderLongReading()
  const lines = await screen.findAllByTestId('study-line')
  modelTypographyReflow(lines)
  await settleReaderFrames()
  const previousPlace = useProgressStore.getState().currentSession?.resumeVerseId
  expect(previousPlace).not.toBe(8170)

  act(() => {
    fireEvent.touchStart(document)
    scroll!.setTop(200 + 70 * 120 - 12)
    fireEvent.scroll(window)
    document.dispatchEvent(new Event('scrollend'))
  })
  await settleReaderFrames()
  // A held touch has not emitted the settled-scroll persistence callback yet.
  expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(previousPlace)
  let visibility: ReturnType<typeof vi.spyOn> | null = null
  if (interruption === 'hidden') {
    visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
  } else {
    act(() => window.dispatchEvent(new Event('pagehide')))
  }
  // Suspension can pause timers and animation frames; saving must be immediate.
  try {
    expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(8170)
    expect(useProgressStore.getState().currentSession?.resumePath).toContain('ang=105')
  } finally {
    visibility?.mockRestore()
  }
})

it('saves manual retained Ang reading on pagehide while an explicit live Retry is still held', async () => {
  const entry = (await baniApi.fetchBani(99)).entries[0]!
  const fetch = vi.spyOn(baniApi, 'fetchAng')
    .mockRejectedValueOnce(new Error('offline'))
    .mockReturnValueOnce(new Promise(() => {}))
  const mounted = render(<MemoryRouter initialEntries={['/study?source=G&ang=100']}><Routes>
    <Route path="/study" element={<Study />} />
  </Routes></MemoryRouter>)
  try {
    await screen.findByRole('heading', { name: 'This reading couldn’t be loaded.' })
    act(() => useScriptureCacheStore.getState().setAng('G', 100, [entry]))
    const lines = await screen.findAllByTestId('study-line')
    expect(lines).toHaveLength(LINES_PER_SECTION)
    const canonicalText = screen.getAllByTestId('study-gurbani-line').map(line => line.textContent)
    modelTypographyReflow(lines, 0)
    scroll!.setTop(0)
    await settleReaderFrames()
    expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(8100)

    fireEvent.click(screen.getByRole('button', { name: 'Try live copy' }))
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('study-entry-list')).toBeInTheDocument()
    act(() => {
      fireEvent.touchStart(document)
      scroll!.setTop(200 + 8 * 120 - 12)
      fireEvent.scroll(window)
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(useProgressStore.getState().currentSession).toMatchObject({
      scriptureId: 'G-100', resumeVerseId: 8108,
    })
    expect(useProgressStore.getState().currentSession?.resumePath).toContain('source=G&ang=100')
    expect(JSON.parse(localStorage.getItem('sikh-progress')!).state.currentSession.resumeVerseId).toBe(8108)
    expect(screen.getAllByTestId('study-gurbani-line').map(line => line.textContent)).toEqual(canonicalText)
  } finally {
    mounted.unmount()
    fetch.mockRestore()
  }
})

it('keeps Bani reading history separate from whole Ang pages without losing recent entry lookup', async () => {
  const normalized = await baniApi.fetchBani(99)
  const fullPage = [{ ...normalized.entries[1]!, id: 'G-101-9101' }]
  useScriptureCacheStore.getState().setAng('G', 101, fullPage)
  renderLongReading()
  const lines = await screen.findAllByTestId('study-line')
  const canonicalText = screen.getAllByTestId('study-gurbani-line').map(line => line.textContent)
  modelTypographyReflow(lines, 0)
  scroll!.setTop(0)
  await settleReaderFrames()
  act(() => {
    scroll!.setTop(200 + 12 * 120 - 12)
    window.dispatchEvent(new Event('pagehide'))
  })
  const firstId = lines[12]!.closest<HTMLElement>('[data-study-entry-id]')!.dataset.studyEntryId!
  expect(useScriptureCacheStore.getState().getAng('G', 101)).toBe(fullPage)
  expect(useScriptureCacheStore.getState().getEntryById(firstId)?.lines?.map(line => line.verseId))
    .toEqual(verseIds.slice(12, 24))
  act(() => {
    scroll!.setTop(200 + 24 * 120 - 12)
    window.dispatchEvent(new Event('pagehide'))
  })
  const secondId = lines[24]!.closest<HTMLElement>('[data-study-entry-id]')!.dataset.studyEntryId!
  expect(useScriptureCacheStore.getState().getAng('G', 102)).toBeUndefined()
  expect(useScriptureCacheStore.getState().getEntryById(secondId)?.lines?.map(line => line.verseId))
    .toEqual(verseIds.slice(24, 36))
  expect(screen.getAllByTestId('study-gurbani-line').map(line => line.textContent)).toEqual(canonicalText)
})

it('ignores a visible-state transition and flushes only the current exact reading place before suspension', async () => {
  const cached = buildRehrasResumeResult()
  const cacheRead = vi.spyOn(baniOfflineCache, 'readBaniOfflineCache').mockResolvedValue(cached)
  const network = vi.spyOn(baniApi, 'fetchBani').mockResolvedValue(cached)
  const path = '/study?source=G&ang=8&startAng=8&endAng=12&bani=Rehras+Sahib&baniId=rehras-sahib&baniDbId=21&exactBani=1&sgLength=short'
  const otherPath = path.replace('sgLength=short', 'sgLength=medium')
  const other = { scriptureId: 'G-11', resumePath: otherPath, resumeVerseId: 2800, updatedAt: new Date().toISOString() }
  useReadingPlacesStore.setState({ places: { [getExactReadingKey(otherPath)!]: other } })
  scroll = mockDocumentScroll({ top: 0, viewportHeight: 844, scrollHeight: 8000 })
  const originalRect = HTMLElement.prototype.getBoundingClientRect
  const measure = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.dataset.testid !== 'study-line') return originalRect.call(this)
    const top = (this.dataset.verseId === '2883' ? 5000 : 200) - scroll!.getTop()
    return { x: 0, y: top, top, bottom: top + 100, left: 0, right: 390, width: 390, height: 100, toJSON: () => ({}) }
  })
  const mounted = render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/study" element={<Study />} /></Routes></MemoryRouter>)
  let visibility: ReturnType<typeof vi.spyOn> | null = null
  try {
    await screen.findByTestId('study-entry-list')
    await settleReaderFrames()
    expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(2650)
    scroll.setTop(5000 - 76)
    visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(2650)
    act(() => window.dispatchEvent(new Event('pagehide')))
    const places = useReadingPlacesStore.getState().places
    expect(places[getExactReadingKey(path)!]).toMatchObject({ scriptureId: 'G-1386', resumeVerseId: 2883 })
    expect(places[getExactReadingKey(otherPath)!]).toEqual(other)
    const persisted = JSON.parse(localStorage.getItem('naamras-reading-places')!).state.places
    expect(persisted[getExactReadingKey(path)!].resumeVerseId).toBe(2883)
    expect(persisted[getExactReadingKey(otherPath)!]).toEqual(other)
  } finally {
    mounted.unmount()
    visibility?.mockRestore(); measure.mockRestore(); network.mockRestore(); cacheRead.mockRestore()
  }
})

it('saves the visible verse when Back follows touch release before the settled-scroll frame', async () => {
  render(<MemoryRouter initialEntries={['/study?source=G&ang=100&startAng=100&endAng=106&baniDbId=99&exactBani=1&bani=Long%20Reading']}><Routes>
    <Route path="/study" element={<Study />} />
    <Route path="/banis" element={<h1>Browse readings</h1>} />
  </Routes></MemoryRouter>)
  const lines = await screen.findAllByTestId('study-line')
  modelTypographyReflow(lines)
  await settleReaderFrames()
  const back = within(screen.getByTestId('study-reader-topbar')).getByRole('button', { name: 'Back', exact: true })
  act(() => {
    fireEvent.touchStart(document)
    scroll!.setTop(200 + 70 * 120 - 12)
    fireEvent.scroll(window)
    document.dispatchEvent(new Event('scrollend'))
    fireEvent.touchEnd(document, { touches: [] })
    fireEvent.click(back)
  })
  expect(screen.getByRole('heading', { name: 'Browse readings' })).toBeInTheDocument()
  expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(8170)
})

it.each(['header', 'dock', 'finish'] as const)('keeps the authoritative incoming verse when %s Back is touched before cached content aligns', async control => {
  const cached = buildRehrasResumeResult()
  const cacheRead = vi.spyOn(baniOfflineCache, 'readBaniOfflineCache').mockResolvedValue(cached)
  const network = vi.spyOn(baniApi, 'fetchBani').mockResolvedValue(cached)
  const raf = vi.spyOn(globalThis, 'requestAnimationFrame').mockReturnValue(0)
  const windowRaf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(0)
  scroll = mockDocumentScroll({ top: 700, viewportHeight: 844, scrollHeight: 8000 })
  const path = '/study?source=G&ang=1386&startAng=8&endAng=12&bani=Rehras+Sahib&baniId=rehras-sahib&baniDbId=21&exactBani=1&sgLength=short'
  useProgressStore.getState().updateSession({ scriptureId: 'G-1386', resumePath: path, resumeVerseId: 2883, updatedAt: new Date().toISOString() })
  const mounted = render(<MemoryRouter initialEntries={[`${path}&resumeVerseId=2883`]}><Routes>
    <Route path="/study" element={<Study />} />
    <Route path="/banis" element={<h1>Browse readings</h1>} />
    <Route path="/" element={<h1>Browse readings</h1>} />
  </Routes></MemoryRouter>)
  try {
    await screen.findByTestId('study-entry-list')
    expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(2883)
    const back = control === 'header'
      ? within(screen.getByTestId('study-reader-topbar')).getByRole('button', { name: 'Back', exact: true })
      : control === 'dock'
        ? within(screen.getByTestId('reader-dock')).getByRole('button', { name: 'Return to previous screen', exact: true })
        : screen.getByRole('button', { name: 'Return to today’s Nitnem', exact: true })
    expect(back).toHaveAttribute('data-reader-back', 'true')
    fireEvent.pointerDown(back, { pointerType: 'touch' })
    fireEvent.click(back)
    expect(screen.getByRole('heading', { name: 'Browse readings' })).toBeInTheDocument()
    expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(2883)
  } finally {
    mounted.unmount()
    windowRaf.mockRestore(); raf.mockRestore(); network.mockRestore(); cacheRead.mockRestore()
  }
})

it('settles an incoming resume after delayed font/header layout and never snaps back during later reading', async () => {
  const { lines, target, alignment, finishFonts, reflow } = await openWithDelayedResumeFont()
  reflow()
  expect(target.getBoundingClientRect().top).toBe(-139)
  await act(async () => { finishFonts() })
  await waitFor(() => expect(alignment).toHaveBeenCalledTimes(3))
  expect(target.getBoundingClientRect().top).toBe(76)
  for (const [index, line] of lines.entries()) {
    vi.spyOn(line, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: index >= 80 ? 140 + (index - 80) * 100 : -200,
      top: index >= 80 ? 140 + (index - 80) * 100 : -200,
      bottom: index >= 80 ? 220 + (index - 80) * 100 : -100,
      left: 0, right: 390, width: 390, height: 80, toJSON: () => ({}),
    })
  }
  act(() => document.dispatchEvent(new Event('scrollend')))
  await waitFor(() => expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(8180))
  await settleReaderFrames()
  expect(alignment).toHaveBeenCalledTimes(3)
})

it.each([false, true])('handles a late-font document-end clamp without mistaking it for user scroll: %s', async userInteracts => {
  const { target, alignment, finishFonts, reflow } = await openWithDelayedResumeFont()
  const clampedTop = scroll!.getTop() - 13
  reflow()
  scroll!.setScrollHeight(clampedTop + 800)
  scroll!.setTop(clampedTop)
  expect(target.getBoundingClientRect().top).toBe(-126)
  if (userInteracts) fireEvent.wheel(document)
  await act(async () => finishFonts())
  await settleReaderFrames()
  await waitFor(() => expect(alignment).toHaveBeenCalledTimes(userInteracts ? 1 : 3))
  expect(target.getBoundingClientRect().top).toBe(userInteracts ? -126 : 76)
})

it.each(['wheel', 'touch', 'pointer', 'keyboard'])('leaves reading untouched after %s intent while the resume font is loading', async intent => {
  const { alignment, finishFonts, reflow } = await openWithDelayedResumeFont()
  if (intent === 'wheel') fireEvent.wheel(document)
  if (intent === 'touch') fireEvent.touchStart(document)
  if (intent === 'pointer') fireEvent.pointerDown(document, { pointerType: 'touch' })
  if (intent === 'keyboard') fireEvent.keyDown(document, { key: 'PageDown' })
  reflow()
  await act(async () => { finishFonts() })
  await settleReaderFrames()
  expect(alignment).toHaveBeenCalledTimes(1)
})

it('keeps the requested verse through automatic scroll and font reflow before resume settles', async () => {
  const { target, alignment, finishFonts, reflow } = await openWithDelayedResumeFont()
  scroll!.setTop(scroll!.getTop() + 120)
  const automaticPosition = scroll!.getTop()
  reflow()
  act(() => document.dispatchEvent(new Event('scrollend')))
  expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(8172)
  await act(async () => { finishFonts() })
  await waitFor(() => expect(alignment).toHaveBeenCalledTimes(3))
  expect(target.getBoundingClientRect().top).toBe(76)
  expect(scroll!.getTop()).not.toBe(automaticPosition)
  expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(8172)
})

it('cancels delayed font realignment when the reader unmounts', async () => {
  const { mounted, alignment, finishFonts, reflow } = await openWithDelayedResumeFont()
  mounted.unmount()
  reflow()
  await act(async () => { finishFonts() })
  await settleReaderFrames()
  expect(alignment).toHaveBeenCalledTimes(1)
})
