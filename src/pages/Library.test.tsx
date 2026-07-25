import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import Library from './Library'
import { useBookmarksStore } from '../store/bookmarks'
import { useFavoritesStore } from '../store/favorites'
import { useProgressStore } from '../store/progress'
import { useSavedFeedbackStore } from '../store/savedFeedback'
import { useVocabStore } from '../store/vocab'

function LocationSpy() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

function renderLibraryRoutes() {
  return render(
    <MemoryRouter initialEntries={['/saved']}>
      <Routes>
        <Route path="/saved" element={<><Library /><LocationSpy /></>} />
        <Route path="/study" element={<LocationSpy />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Library saved shelf', () => {
  beforeEach(() => {
    useBookmarksStore.setState({ bookmarks: [] })
    useFavoritesStore.setState({ favorites: [] })
    useProgressStore.setState({ streak: 0, currentSession: null, studied: [], reviewQueue: [], lastStudied: null })
    useSavedFeedbackStore.getState().clearSaved()
    useVocabStore.setState({ vocab: [] })
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

    fireEvent.click(screen.getByLabelText('Remove bookmark'))
    expect(useBookmarksStore.getState().bookmarks).toHaveLength(0)
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
})
