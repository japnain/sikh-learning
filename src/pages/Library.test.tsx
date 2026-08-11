import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import Library from './Library'
import { useBookmarksStore } from '../store/bookmarks'
import { useFavoritesStore } from '../store/favorites'
import { useProgressStore } from '../store/progress'
import { useSavedFeedbackStore } from '../store/savedFeedback'
import { useVocabStore } from '../store/vocab'
import { useLocaleStore } from '../store/locale'

function LocationSpy() {
  const location = useLocation()
  return (
    <div data-testid="location" data-location-state={JSON.stringify(location.state)}>
      {`${location.pathname}${location.search}${location.hash}`}
    </div>
  )
}

function renderLibraryRoutes() {
  return render(
    <MemoryRouter initialEntries={['/saved']}>
      <Routes>
        <Route path="/saved" element={<><Library /><LocationSpy /></>} />
        <Route path="/study" element={<LocationSpy />} />
        <Route path="/library/:workId/chapters/:chapterId" element={<LocationSpy />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Library saved shelf', () => {
  beforeEach(() => {
    localStorage.clear()
    useBookmarksStore.setState({ bookmarks: [] })
    useFavoritesStore.setState({ favorites: [] })
    useProgressStore.setState({ streak: 0, currentSession: null, studied: [], reviewQueue: [], lastStudied: null })
    useSavedFeedbackStore.getState().clearSaved()
    useVocabStore.setState({ vocab: [] })
    useLocaleStore.setState({ locale: 'en' })
  })

  test('shows the zero state with reading destinations', () => {
    render(<MemoryRouter><Library /></MemoryRouter>)

    const zeroState = screen.getByText(/Start the shelf/i).closest('.section-shell-quiet')
    expect(zeroState).not.toBeNull()
    expect(within(zeroState as HTMLElement).getByRole('link', { name: /Browse Read/i })).toBeInTheDocument()
    expect(within(zeroState as HTMLElement).getByRole('link', { name: /Review Bank/i })).toBeInTheDocument()
  })

  test('shows and removes saved bookmarks', () => {
    useBookmarksStore.setState({
      bookmarks: [{
        id: 'bookmark-1',
        type: 'bani',
        title: 'Japji Sahib',
        source: 'G',
        ang: 1,
        savedAt: new Date().toISOString(),
      }],
    })

    render(<MemoryRouter><Library /></MemoryRouter>)

    expect(screen.getByRole('button', { name: /1 saved passage/i })).toBeInTheDocument()
    expect(screen.getByText('Japji Sahib')).toBeInTheDocument()
    expect(screen.getByText(/SGGS · Ang 1/)).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Remove bookmark Japji Sahib'))
    expect(useBookmarksStore.getState().bookmarks).toHaveLength(0)
    expect(screen.getByRole('status')).toHaveTextContent(/Japji Sahib removed from Saved/i)
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(useBookmarksStore.getState().bookmarks).toHaveLength(1)
  })

  test('bookmarks reopen the exact saved shabad', async () => {
    useBookmarksStore.setState({
      bookmarks: [{
        id: 'bookmark-1',
        type: 'shabad',
        title: 'Ang 2 bookmark',
        source: 'G',
        ang: 2,
        shabadId: 50,
        savedAt: new Date().toISOString(),
      }],
    })

    renderLibraryRoutes()

    fireEvent.click(within(screen.getByTestId('library-bookmarks')).getByRole('link'))

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/study?shabadId=50')
    })
    expect(screen.getByTestId('location')).toHaveAttribute(
      'data-location-state',
      JSON.stringify({ readerOrigin: '/saved' })
    )
  })

  test('resume links preserve Saved as the reader back destination', async () => {
    useProgressStore.setState({
      currentSession: {
        scriptureId: 'G-1',
        resumePath: '/study?source=G&ang=1',
        updatedAt: '2026-08-10T12:00:00.000Z',
      },
    })

    renderLibraryRoutes()
    fireEvent.click(screen.getByTestId('library-resume-reading'))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/study?source=G&ang=1')
    })
    expect(screen.getByTestId('location')).toHaveAttribute(
      'data-location-state',
      JSON.stringify({ readerOrigin: '/saved' })
    )
  })

  test('bookmark feedback highlights the bookmark metric', () => {
    useSavedFeedbackStore.setState({
      lastSaved: {
        kind: 'bookmark',
        targetId: 'bookmark-1',
        surfacedAt: '2026-04-11T11:00:00.000Z',
      },
    })

    render(<MemoryRouter><Library /></MemoryRouter>)

    expect(screen.getByRole('status')).toHaveTextContent(/Bookmarked passage added to Saved/i)
    const bookmarkMetric = within(screen.getByTestId('library-snapshot')).getByText('Bookmarks').closest('.section-shell-quiet')
    expect(bookmarkMetric).toHaveClass('saved-feedback-highlight')
  })

  test('sorts saved readings newest-first and filters title or excerpt text', () => {
    useBookmarksStore.setState({
      bookmarks: [
        {
          id: 'bookmark-old', type: 'bani', title: 'Older Japji', source: 'G', ang: 1,
          excerpt: 'ਸਤਿ ਨਾਮੁ', savedAt: '2026-08-08T12:00:00.000Z',
        },
        {
          id: 'bookmark-new', type: 'verse', title: 'Newest Rehras', source: 'G', ang: 8,
          excerpt: 'ਸੋ ਦਰੁ', savedAt: '2026-08-10T12:00:00.000Z',
        },
      ],
    })

    render(<MemoryRouter><Library /></MemoryRouter>)

    const bookmarkLinks = within(screen.getByTestId('library-bookmarks')).getAllByRole('link')
    expect(bookmarkLinks[0]).toHaveTextContent('Newest Rehras')
    expect(bookmarkLinks[1]).toHaveTextContent('Older Japji')
    expect(bookmarkLinks[0]).toHaveTextContent('ਸੋ ਦਰੁ')

    fireEvent.change(screen.getByRole('searchbox', { name: /search saved readings/i }), {
      target: { value: 'ਸਤਿ ਨਾਮੁ' },
    })
    expect(screen.getByText('Older Japji')).toBeInTheDocument()
    expect(screen.queryByText('Newest Rehras')).not.toBeInTheDocument()
  })

  test('filters favorites and exposes localized removal labels', () => {
    useFavoritesStore.setState({
      favorites: [{
        id: 'favorite-1', title: 'ਪਿਆਰਾ ਸ਼ਬਦ', source: 'G', ang: 1,
        type: 'ang', routeMode: 'canonical', excerpt: 'ੴ ਸਤਿ ਨਾਮੁ',
        savedAt: '2026-08-10T12:00:00.000Z',
      }],
    })
    useLocaleStore.setState({ locale: 'pa' })

    render(<MemoryRouter><Library /></MemoryRouter>)

    fireEvent.click(screen.getByRole('button', { name: 'ਮਨਪਸੰਦ' }))
    expect(screen.getByLabelText('ਪਿਆਰਾ ਸ਼ਬਦ ਨੂੰ ਮਨਪਸੰਦ ਤੋਂ ਹਟਾਓ')).toBeInTheDocument()
    expect(screen.getByText('ੴ ਸਤਿ ਨਾਮੁ')).toBeInTheDocument()
  })

  test('uses localized source-specific units for saved scripture references', () => {
    useBookmarksStore.setState({
      bookmarks: [{
        id: 'bookmark-vaar', type: 'bani', title: 'Vaar reading', source: 'B', ang: 12,
        savedAt: '2026-08-10T12:00:00.000Z',
      }],
    })
    useFavoritesStore.setState({
      favorites: [{
        id: 'favorite-page', title: 'Keertan page', source: 'A', ang: 44,
        type: 'ang', routeMode: 'canonical', savedAt: '2026-08-10T13:00:00.000Z',
      }],
    })
    useLocaleStore.setState({ locale: 'pa' })

    render(<MemoryRouter><Library /></MemoryRouter>)

    expect(screen.getByText('BGV · ਵਾਰ 12')).toBeInTheDocument()
    expect(screen.getByText('AK · ਸਫ਼ਾ 44')).toBeInTheDocument()
  })

  test('renders a Panth Prakash chapter bookmark with its exact block link', () => {
    useBookmarksStore.setState({
      bookmarks: [{
        id: 'bookmark-book', type: 'book', title: 'Panth Prakash · Episode 1',
        workId: 'panth-prakash-english', chapterId: 'episode-001', chapterLabel: 'Episode 1',
        blockId: 'episode-001-p47-b003', excerpt: 'I bow my head in reverence.',
        returnPath: '/library/panth-prakash-english/chapters/episode-001#episode-001-p47-b003',
        savedAt: '2026-08-10T12:00:00.000Z',
      }],
    })

    renderLibraryRoutes()

    const bookmarkLink = within(screen.getByTestId('library-bookmarks')).getByRole('link')
    expect(bookmarkLink).toHaveAttribute(
      'href',
      '/library/panth-prakash-english/chapters/episode-001#episode-001-p47-b003'
    )
    expect(screen.getByText('I bow my head in reverence.')).toBeInTheDocument()

    fireEvent.click(bookmarkLink)
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/library/panth-prakash-english/chapters/episode-001#episode-001-p47-b003'
    )
    expect(screen.getByTestId('location')).toHaveAttribute(
      'data-location-state',
      JSON.stringify({ libraryReaderOrigin: '/saved' })
    )
  })
})
