import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LibraryChapterReader from './LibraryChapterReader'
import {
  DEFAULT_EPUB_READER_PREFERENCES,
  useEpubReaderStore,
} from '../../store/epubReader'
import { buildSessionResumePath, useProgressStore } from '../../store/progress'

const FIRST_EPISODE_PATH = '/library/panth-prakash-english/chapters/episode-001'

function renderReader(path = FIRST_EPISODE_PATH) {
  return render(
    <MemoryRouter initialEntries={[path]}>
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
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

  test('records the final content block when the document reaches its end', async () => {
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(1200)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800)
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(2000)
    vi.spyOn(document.body, 'scrollHeight', 'get').mockReturnValue(2000)
    renderReader()

    await screen.findByTestId('panth-chapter-reader')
    fireEvent.scroll(window)

    await waitFor(() => {
      expect(useProgressStore.getState().currentSession?.readerLocator?.locations).toEqual(
        expect.objectContaining({
          blockId: 'episode-001-p53-b015',
          progression: 1,
        })
      )
    })
  })

  test('restores and records an exact block locator in the resume URL', async () => {
    const scrollSpy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView')
    const blockId = 'episode-001-p47-b003'
    renderReader(`${FIRST_EPISODE_PATH}#${blockId}`)

    await screen.findByTestId('panth-chapter-reader')
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

    expect(scrollSpy).toHaveBeenCalled()
    expect(buildSessionResumePath(useProgressStore.getState().currentSession)).toBe(
      `${FIRST_EPISODE_PATH}#${blockId}`
    )
  })
})
