import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LibraryChapterReader from './LibraryChapterReader'
import { BOOK_READER_COPY } from './bookReaderCopy'
import {
  DEFAULT_EPUB_READER_PREFERENCES,
  useEpubReaderStore,
} from '../../store/epubReader'
import { buildSessionResumePath, useProgressStore } from '../../store/progress'
import { mockDocumentScroll } from '../../test/documentScroll'
import { useBookmarksStore } from '../../store/bookmarks'
import { useLocaleStore } from '../../store/locale'
import fs from 'node:fs'
import path from 'node:path'
import { configureLibraryRepositoryLoader } from '../../data/libraryRepository'
import { writeLibraryDownload } from '../../data/libraryOffline'
import type { LibraryWork } from '../../types'

const FIRST_EPISODE_PATH = '/library/panth-prakash-english/chapters/episode-001'
let documentScroll: ReturnType<typeof mockDocumentScroll> | null = null

function renderReader(path = FIRST_EPISODE_PATH, state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[state === undefined ? path : { pathname: path, state }]}>
      <Routes>
        <Route path="/library/:workId/chapters/:chapterId" element={<LibraryChapterReader />} />
        <Route path="/library/:workId" element={<h1>Book contents</h1>} />
      </Routes>
    </MemoryRouter>
  )
}


async function seedDownloadedSection() {
  const records = new Map<string, Response>()
  vi.stubGlobal('caches', { open: async () => ({
    match: async (request: Request) => records.get(request.url)?.clone(),
    put: async (request: Request, response: Response) => { records.set(request.url, response.clone()) },
    keys: async () => [...records.keys()].map(url => new Request(url)),
  }) })
  const read = (resource: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', resource), 'utf8'))
  const work = { ...read('/data/library/works.json')[0], revision: 'test-v1' } as LibraryWork
  const chapter = read('/data/library/works/panth-prakash-english/chapters/episode-001.json')
  await writeLibraryDownload({
    schema: 1, savedAt: new Date().toISOString(), work,
    manifest: read('/data/library/manifest.json'),
    chapterIndex: read(work.chapterIndexPath!), searchIndex: read(work.searchIndexPath!),
    chapters: { [chapter.id]: chapter },
  })
  return { work, read }
}

describe('LibraryChapterReader', () => {
  beforeEach(() => {
    localStorage.clear()
    useProgressStore.setState({
      streak: 0,
      currentSession: null,
      studied: [],
      reviewQueue: [],
      lastStudied: null,
    })
    useEpubReaderStore.setState(DEFAULT_EPUB_READER_PREFERENCES)
    useBookmarksStore.setState({ bookmarks: [] })
    useLocaleStore.setState({ locale: 'en' })
  })

  afterEach(() => {
    documentScroll?.restore()
    documentScroll = null
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  test('failed direct chapter loads offer Retry and Back, and reconnect retries automatically', async () => {
    let offline = true
    configureLibraryRepositoryLoader(async resource => {
      if (offline) throw new Error('offline')
      return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', resource), 'utf8'))
    })
    renderReader()
    await screen.findByRole('heading', { name: 'Section unavailable' })
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to book' })).toBeInTheDocument()
    offline = false
    fireEvent(window, new Event('online'))
    expect(await screen.findByTestId('panth-chapter-reader')).toBeInTheDocument()
  })

  test('a cold direct link opens a newly published work alongside an older download', async () => {
    const { work, read } = await seedDownloadedSection()
    const added: LibraryWork = JSON.parse(JSON.stringify({ ...work, title: 'A new book', shortTitle: 'New book' }).replaceAll(work.id, 'new-book'))
    configureLibraryRepositoryLoader(async resource => {
      if (resource === '/data/library/works.json') return [work, added]
      if (resource.includes('/new-book/')) return JSON.parse(JSON.stringify(read(resource.replace('/new-book/', `/${work.id}/`))).replaceAll(work.id, 'new-book'))
      return read(resource)
    })
    renderReader('/library/new-book/chapters/episode-001')
    expect(await screen.findByTestId('panth-chapter-reader')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to New book' })).toHaveAttribute('href', '/library/new-book')
    expect(screen.getByRole('heading', { level: 1, name: /Origin of the Khalsa/i })).toBeInTheDocument()
  })

  test('an uncached section from a newer edition offers localized update guidance instead of mixing editions', async () => {
    const { work, read } = await seedDownloadedSection()
    const requested: string[] = []
    configureLibraryRepositoryLoader(async resource => {
      requested.push(resource)
      return resource === '/data/library/works.json' ? [{ ...work, revision: 'test-v2' }] : read(resource)
    })
    useLocaleStore.setState({ locale: 'hi' })
    renderReader('/library/panth-prakash-english/chapters/episode-082')
    expect(await screen.findByText(BOOK_READER_COPY.hi.editionChanged)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: BOOK_READER_COPY.hi.backBook })).toBeInTheDocument()
    expect(requested).not.toContain('/data/library/works/panth-prakash-english/chapters/episode-082.json')
  })

  test('a missing chapter still offers an escape to the book', async () => {
    const user = userEvent.setup()
    renderReader('/library/panth-prakash-english/chapters/not-a-section')
    await screen.findByRole('heading', { name: 'Section unavailable' })
    expect(screen.getByText(/not in the current book/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back to book' }))
    expect(await screen.findByRole('heading', { name: 'Book contents' })).toBeInTheDocument()
  })

  test('search opens and highlights the actual matching passage and navigates additional passages', async () => {
    const user = userEvent.setup()
    const { container } = renderReader(`${FIRST_EPISODE_PATH}?find=Khalsa`)
    await screen.findByTestId('panth-chapter-reader')
    await waitFor(() => expect(document.activeElement).toHaveAttribute('data-reader-match', 'true'))
    expect(container.querySelectorAll('mark.epub-search-highlight').length).toBeGreaterThan(1)
    expect(screen.getByRole('status')).toHaveTextContent(/Passage 1 of/)
    await user.click(screen.getByRole('button', { name: 'Next match' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Passage 2 of/))
    expect(document.activeElement).toHaveAttribute('data-reader-match', 'true')
    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(container.querySelector('mark.epub-search-highlight')).toBeNull()
  })

  test('finds section text from Contents without leaving the reader and handles no results', async () => {
    const user = userEvent.setup()
    const { container } = renderReader()
    await screen.findByTestId('panth-chapter-reader')
    await user.click(screen.getByRole('button', { name: 'Open contents' }))
    const contents = screen.getByRole('dialog', { name: 'Contents' })
    await user.type(within(contents).getByRole('searchbox', { name: 'Search section text' }), 'Khalsa')
    await user.click(within(contents).getByRole('button', { name: 'Find passage' }))
    await waitFor(() => expect(document.activeElement).toHaveAttribute('data-reader-match', 'true'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/Passage 1 of/)
    expect(container.querySelectorAll('mark.epub-search-highlight').length).toBeGreaterThan(1)
    expect(screen.getByRole('button', { name: 'Previous match' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Edit search' }))
    const input = screen.getByRole('searchbox', { name: 'Search section text' })
    await user.clear(input)
    await user.type(input, 'zzzz-no-such-passage')
    await user.click(screen.getByRole('button', { name: 'Find passage' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/No text passage matches/))
    expect(screen.getByRole('button', { name: 'Next match' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous match' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(screen.queryByRole('region', { name: 'Find in this section' })).not.toBeInTheDocument()
    expect(container.querySelector('mark.epub-search-highlight')).toBeNull()
  })

  test('localizes Find and exposes book progress to assistive technology', async () => {
    useLocaleStore.setState({ locale: 'pa' })
    const user = userEvent.setup()
    renderReader()
    await screen.findByTestId('panth-chapter-reader')
    expect(screen.getByRole('progressbar', { name: 'ਕਿਤਾਬ ਪੜ੍ਹਨ ਦੀ ਤਰੱਕੀ' })).toHaveAttribute('aria-valuenow', '0')
    await user.click(screen.getByRole('button', { name: 'ਵਿਸ਼ਾ-ਸੂਚੀ ਖੋਲ੍ਹੋ' }))
    expect(screen.getByRole('searchbox', { name: 'ਭਾਗ ਦੇ ਪਾਠ ਵਿੱਚ ਖੋਜੋ' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ਪੈਰਾ ਲੱਭੋ' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.getByRole('button', { name: 'ਵਿਸ਼ਾ-ਸੂਚੀ ਖੋਲ੍ਹੋ' })).toHaveFocus())
  })

  test('preserves the visible point within a block after changing appearance and dismissing the sheet', async () => {
    documentScroll = mockDocumentScroll({ top: 800, viewportHeight: 800, scrollHeight: 5000 })
    const blockId = 'episode-001-p47-b003'
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const changed = useEpubReaderStore.getState().fontScale > 1
      const blocks = Array.from(document.querySelectorAll('[data-reader-block]'))
      const index = blocks.indexOf(this)
      const targetIndex = blocks.findIndex(block => block.id === blockId)
      const targetTop = changed ? 90 : 50
      const targetHeight = changed ? 300 : 200
      const scrollDelta = (documentScroll?.getTop() ?? 800) - 800
      const top = index >= 0 ? targetTop + (index - targetIndex) * targetHeight - scrollDelta : 0
      const height = this.classList.contains('epub-reader-topbar') ? 64 : index >= 0 ? targetHeight : 0
      return { x: 0, y: top, left: 0, right: 390, width: 390, top, bottom: top + height, height, toJSON: () => ({}) }
    })
    const user = userEvent.setup()
    renderReader()
    await screen.findByTestId('panth-chapter-reader')
    documentScroll.setTop(800)
    await user.click(screen.getByRole('button', { name: 'Reading appearance' }))
    fireEvent.change(screen.getByRole('slider', { name: 'Reading text size' }), { target: { value: '1.1' } })
    await user.click(screen.getByRole('button', { name: 'Spacious' }))
    await user.click(screen.getByRole('button', { name: 'Narrow' }))
    await user.click(screen.getByRole('button', { name: 'Sepia' }))
    // Progress callbacks while the page is covered must not replace the place.
    documentScroll.setTop(4200)
    fireEvent(document, new Event('scrollend'))
    expect(useProgressStore.getState().currentSession?.readerLocator?.locations.blockId).toBe(blockId)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(documentScroll?.getTop()).toBe(855))
    const restoredBlock = document.getElementById(blockId)!.getBoundingClientRect()
    expect(restoredBlock.top + restoredBlock.height * 0.15).toBe(80)
    expect(screen.getByRole('button', { name: 'Reading appearance' })).toHaveFocus()
    expect(useProgressStore.getState().currentSession?.readerLocator?.locations.blockId).toBe(blockId)
  })

  test('available episode references open preserved source notes and restore the invoking link', async () => {
    const user = userEvent.setup()
    configureLibraryRepositoryLoader(async resource => {
      const value = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', resource), 'utf8'))
      if (resource.endsWith('/chapters/episode-001.json')) {
        value.pages[0].blocks.push({ id: 'test-reference', type: 'paragraph', text: 'A reference3' })
        value.sourceNotes = [{ sourcePageNumber: 536, printPageNumber: 520, sourceHref: 'source-notes.xhtml', text: 'Original appendix wording.\nSecond source line.' }]
      }
      return value
    })
    renderReader()
    await screen.findByTestId('panth-chapter-reader')
    const reference = screen.getAllByRole('link', { name: 'Open source notes, reference 3' }).at(-1)!
    await user.click(reference)
    const sheet = screen.getByRole('dialog', { name: 'Source notes' })
    expect(sheet).toHaveTextContent('Original appendix wording.')
    expect(sheet).toHaveTextContent('reference numbers are not individually verified')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(reference).toHaveFocus())
  })

  test('renders the cleaned EPUB as semantic verse without exposing source internals', async () => {
    const { container } = renderReader()

    const reader = await screen.findByTestId('panth-chapter-reader')
    expect(screen.getByRole('heading', { level: 1, name: /Origin of the Khalsa/i })).toBeInTheDocument()
    expect(reader).toHaveTextContent(/Episode 1/i)

    const firstVerse = container.querySelector('.epub-reading-verse')
    expect(firstVerse).toBeInTheDocument()
    expect(firstVerse?.querySelectorAll(':scope > div > span')).toHaveLength(4)
    expect(firstVerse?.querySelector('.epub-reading-verse__number')).toHaveTextContent('1')
    expect(firstVerse).toHaveTextContent(/I bow my head in reverence at the lotus feet of Guru Nanak/i)
    expect(container.querySelector('.epub-reading-invocation')).toHaveTextContent(
      'Ik Onkar Satguru Prasad Sri Waheguru ji ki Fateh'
    )
    expect(container.querySelector('.epub-reading-meter')).toHaveTextContent(/^Dohra:$/)
    expect(screen.queryByRole('heading', { level: 2, name: /Now Sri Gur Panth Prakash Granth/i })).not.toBeInTheDocument()
    expect(container.querySelector('.epub-reading-footnote-marker')).toBeInTheDocument()

    expect(reader).not.toHaveTextContent(/EPUB page/i)
    expect(reader).not.toHaveTextContent(/page_47\.html/i)
    expect(reader).not.toHaveTextContent(/volume-1\.epub/i)
    expect(screen.queryByTestId('panth-chapter-provenance')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /next.*episode 2/i })).toHaveAttribute(
      'href',
      '/library/panth-prakash-english/chapters/episode-002'
    )
  })

  test('opens the complete TOC and persists reading settings', async () => {
    const user = userEvent.setup()
    renderReader()

    const reader = await screen.findByTestId('panth-chapter-reader')
    await user.click(screen.getByRole('button', { name: /open contents/i }))

    const contents = screen.getByRole('dialog', { name: /contents/i })
    expect(contents).toHaveTextContent(/169 sections across 2 volumes/i)
    await user.type(within(contents).getByLabelText(/search contents/i), 'Bunga S. Sham Singh')
    expect(within(contents).getByRole('link', { name: /Bunga S\. Sham Singh/i })).toHaveAttribute(
      'href',
      '/library/panth-prakash-english/chapters/episode-169'
    )

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.getByRole('button', { name: /open contents/i })).toHaveFocus())
    await user.click(screen.getByRole('button', { name: /reading appearance/i }))
    const settings = screen.getByRole('dialog', { name: /reading appearance/i })
    await user.click(within(settings).getByRole('button', { name: 'Sepia' }))

    expect(reader).toHaveAttribute('data-palette', 'sepia')
    expect(useEpubReaderStore.getState().palette).toBe('sepia')
    expect(JSON.parse(localStorage.getItem('sikh-epub-reader-preferences') ?? '{}')).toEqual(
      expect.objectContaining({ state: expect.objectContaining({ palette: 'sepia' }) })
    )

    await user.click(within(settings).getByRole('button', { name: /close reading appearance/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /reading appearance/i })).toHaveFocus())
  })

  test('places fresh keyboard navigation at the reader toolbar', async () => {
    const user = userEvent.setup()
    renderReader()

    const reader = await screen.findByTestId('panth-chapter-reader')
    await waitFor(() => expect(reader).toHaveFocus())

    await user.tab()
    expect(screen.getByRole('link', { name: /back to panth prakash/i })).toHaveFocus()
  })

  test('preserves Saved as the reader origin across chapter navigation', async () => {
    const user = userEvent.setup()
    renderReader(FIRST_EPISODE_PATH, { libraryReaderOrigin: '/saved' })

    expect(await screen.findByRole('link', { name: /back to saved/i })).toHaveAttribute('href', '/saved')
    await user.click(screen.getByRole('link', { name: /next.*episode 2/i }))

    expect(await screen.findByRole('link', { name: /back to saved/i })).toHaveAttribute('href', '/saved')
  })

  test('saves and removes the current Panth Prakash chapter with an exact block return', async () => {
    renderReader()
    await screen.findByTestId('panth-chapter-reader')

    fireEvent.click(screen.getByRole('button', { name: /save this book section/i }))

    expect(useBookmarksStore.getState().bookmarks).toEqual([
      expect.objectContaining({
        type: 'book',
        workId: 'panth-prakash-english',
        chapterId: 'episode-001',
        chapterLabel: 'Episode 1',
        excerpt: expect.stringMatching(/\S/),
        returnPath: expect.stringMatching(/^\/library\/panth-prakash-english\/chapters\/episode-001#/),
      }),
    ])
    expect(screen.getByText('Book section saved.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /remove this saved book section/i }))
    expect(useBookmarksStore.getState().bookmarks).toHaveLength(0)
    expect(screen.getByText('Book section removed from Saved.')).toBeInTheDocument()
  })

  test('preserves an exact Read search origin', async () => {
    renderReader(FIRST_EPISODE_PATH, {
      libraryReaderOrigin: '/banis?collection=books&query=khalsa',
    })

    expect(await screen.findByRole('link', { name: /back to read/i })).toHaveAttribute(
      'href',
      '/banis?collection=books&query=khalsa'
    )
  })

  test('does not crash when the block hash is malformed', async () => {
    renderReader(`${FIRST_EPISODE_PATH}#%E0%A4%A`)

    expect(await screen.findByTestId('panth-chapter-reader')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: /Origin of the Khalsa/i })).toBeInTheDocument()
  })

  test('saves the passage below the actual header on a wide, short viewport only after scrolling settles', async () => {
    documentScroll = mockDocumentScroll({ top: 800, viewportHeight: 400, scrollHeight: 20000 })
    let passageIndex = 4
    const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const index = Array.from(document.querySelectorAll('[data-reader-block]')).indexOf(this)
      const top = index >= 0 ? 100 + (index - passageIndex) * 150 : 0
      const height = this.hasAttribute('data-reader-header') ? 104 : index >= 0 ? 150 : 0
      return { x: 0, y: top, left: 0, right: 1440, width: 1440, top, bottom: top + height, height, toJSON: () => ({}) }
    })
    renderReader()
    await screen.findByTestId('panth-chapter-reader')
    await waitFor(() => expect(screen.getByTestId('panth-chapter-reader')).toHaveFocus())
    const blocks = document.querySelectorAll('[data-reader-block]')
    rectSpy.mockClear()
    fireEvent.scroll(document)
    fireEvent.scroll(document)
    expect(rectSpy).not.toHaveBeenCalled()
    expect(useProgressStore.getState().currentSession).toBeNull()
    fireEvent(document, new Event('scrollend'))
    await waitFor(() => expect(useProgressStore.getState().currentSession?.readerLocator?.locations.blockId).toBe(blocks[4].id))
    expect(rectSpy.mock.calls.length).toBeLessThan(15)
    passageIndex = 12
    fireEvent(document, new Event('scrollend'))
    await waitFor(() => expect(useProgressStore.getState().currentSession?.readerLocator?.locations.blockId).toBe(blocks[12].id))
    expect(buildSessionResumePath(useProgressStore.getState().currentSession)).toBe(`${FIRST_EPISODE_PATH}#${blocks[12].id}`)
  })

  test.each(['pa', 'hi'] as const)('localizes the %s interface while keeping English source text intact', async locale => {
    useLocaleStore.setState({ locale })
    const copy = BOOK_READER_COPY[locale]
    const user = userEvent.setup()
    renderReader()
    const reader = await screen.findByTestId('panth-chapter-reader')
    expect(reader).toHaveAttribute('lang', locale)
    expect(screen.getByRole('heading', { level: 1, name: /Origin of the Khalsa/i })).toHaveAttribute('lang', 'en')
    expect(screen.getByTestId('panth-chapter-text')).toHaveAttribute('lang', 'en')
    expect(reader).toHaveTextContent(copy.episode(1))
    expect(screen.getByRole('navigation', { name: copy.sectionNavigation })).toHaveTextContent(copy.nextSection)
    await user.click(screen.getByRole('button', { name: copy.openContents }))
    const contents = screen.getByRole('dialog', { name: copy.contents })
    expect(contents).toHaveTextContent(copy.contentsDescription(169, 2))
    expect(within(contents).getByLabelText(copy.searchContents)).toHaveAttribute('placeholder', copy.contentsPlaceholder)
    await user.click(within(contents).getByRole('button', { name: copy.closeContents }))
    await user.click(screen.getByRole('button', { name: copy.appearance }))
    const appearance = screen.getByRole('dialog', { name: copy.appearance })
    expect(within(appearance).getByRole('slider', { name: copy.readingTextSize })).toHaveAttribute('max', '2')
    expect(within(appearance).getByRole('group', { name: copy.lineSpacing })).toHaveTextContent(copy.comfortable)
    expect(within(appearance).getByRole('group', { name: copy.textWidth })).toHaveTextContent(copy.standard)
    expect(within(appearance).getByRole('button', { name: copy.reset })).toBeInTheDocument()
    await user.click(within(appearance).getByRole('button', { name: copy.closeAppearance }))
  })

  test('records the final content block only after document scrolling settles', async () => {
    documentScroll = mockDocumentScroll({
      top: 1200,
      viewportHeight: 800,
      scrollHeight: 2000,
    })
    renderReader()
    await screen.findByTestId('panth-chapter-reader')

    fireEvent.scroll(window)
    fireEvent.scroll(window)
    expect(useProgressStore.getState().currentSession).toBeNull()

    fireEvent(document, new Event('scrollend'))

    await waitFor(() => {
      expect(useProgressStore.getState().currentSession?.readerLocator?.locations).toEqual(
        expect.objectContaining({
          blockId: 'episode-001-p53-b015',
          progression: 1,
        })
      )
    })
  })

  test('restores an exact block and flushes its locator on pagehide', async () => {
    const scrollSpy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView')
    const blockId = 'episode-001-p47-b003'
    renderReader(`${FIRST_EPISODE_PATH}#${blockId}`)

    await screen.findByTestId('panth-chapter-reader')
    await waitFor(() => expect(scrollSpy).toHaveBeenCalled())
    expect(useProgressStore.getState().currentSession).toBeNull()

    fireEvent(window, new Event('pagehide'))
    await waitFor(() => {
      expect(useProgressStore.getState().currentSession).toEqual(expect.objectContaining({
        scriptureId: 'panth-prakash-english-episode-001',
        resumePath: FIRST_EPISODE_PATH,
        readerLocator: expect.objectContaining({
          href: FIRST_EPISODE_PATH,
          locations: expect.objectContaining({ blockId }),
        }),
      }))
    })

    expect(buildSessionResumePath(useProgressStore.getState().currentSession)).toBe(
      `${FIRST_EPISODE_PATH}#${blockId}`
    )
  })
})
