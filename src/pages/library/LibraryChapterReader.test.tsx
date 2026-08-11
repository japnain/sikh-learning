import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LibraryChapterReader from './LibraryChapterReader'
import {
  DEFAULT_EPUB_READER_PREFERENCES,
  useEpubReaderStore,
} from '../../store/epubReader'
import { buildSessionResumePath, useProgressStore } from '../../store/progress'
import { mockDocumentScroll } from '../../test/documentScroll'
import { useBookmarksStore } from '../../store/bookmarks'

const FIRST_EPISODE_PATH = '/library/panth-prakash-english/chapters/episode-001'
let documentScroll: ReturnType<typeof mockDocumentScroll> | null = null

function renderReader(path = FIRST_EPISODE_PATH, state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[state === undefined ? path : { pathname: path, state }]}>
      <Routes>
        <Route path="/library/:workId/chapters/:chapterId" element={<LibraryChapterReader />} />
      </Routes>
    </MemoryRouter>
  )
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
  })

  afterEach(() => {
    documentScroll?.restore()
    documentScroll = null
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
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
    await user.click(screen.getByRole('button', { name: /open reading settings/i }))
    const settings = screen.getByRole('dialog', { name: /reading settings/i })
    await user.click(within(settings).getByRole('button', { name: 'Sepia' }))

    expect(reader).toHaveAttribute('data-palette', 'sepia')
    expect(useEpubReaderStore.getState().palette).toBe('sepia')
    expect(JSON.parse(localStorage.getItem('sikh-epub-reader-preferences') ?? '{}')).toEqual(
      expect.objectContaining({ state: expect.objectContaining({ palette: 'sepia' }) })
    )

    await user.click(within(settings).getByRole('button', { name: /close reading settings/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /open reading settings/i })).toHaveFocus())
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

  test('observes reader blocks against the native document viewport', async () => {
    const observedRoots: Array<Element | Document | null> = []
    class CapturingIntersectionObserver {
      constructor(_callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        observedRoots.push(options?.root ?? null)
      }
      disconnect() {}
      observe() {}
      unobserve() {}
      takeRecords() { return [] }
    }
    vi.stubGlobal('IntersectionObserver', CapturingIntersectionObserver)

    renderReader()
    await screen.findByTestId('panth-chapter-reader')

    expect(observedRoots).toContain(null)
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
