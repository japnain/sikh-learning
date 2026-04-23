import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import Library from './Library'
import { useBookmarksStore } from '../store/bookmarks'
import { useFavoritesStore } from '../store/favorites'
import { useProgressStore } from '../store/progress'
import { useLearningStore } from '../store/learning'
import { useSavedFeedbackStore } from '../store/savedFeedback'
import { useVocabStore } from '../store/vocab'

function LocationSpy() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

function renderLibraryRoutes() {
  return render(
    <MemoryRouter initialEntries={['/library']}>
      <Routes>
        <Route path="/library" element={<><Library /><LocationSpy /></>} />
        <Route path="/study" element={<LocationSpy />} />
        <Route path="/library/:workId" element={<LocationSpy />} />
        <Route path="/library/panth-prakash-english/page/:pageNumber" element={<LocationSpy />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Library bookmarks section', () => {
  beforeEach(() => {
    useBookmarksStore.setState({ bookmarks: [] })
    useFavoritesStore.setState({ favorites: [] })
    useProgressStore.setState({ streak: 0, currentSession: null, studied: [], reviewQueue: [], lastStudied: null })
    useSavedFeedbackStore.getState().clearSaved()
    useVocabStore.setState({ vocab: [] })
    useLearningStore.setState(state => ({
      learnState: {
        ...state.learnState,
        savedItemIds: [],
      },
    }))
  })

  test('bookmarks section hidden when no bookmarks', () => {
    render(<MemoryRouter><Library /></MemoryRouter>)
    expect(screen.queryByRole('button', { name: /saved passage/i })).not.toBeInTheDocument()
  })

  test('shows the redesigned saved shelf zero state when nothing has been kept yet', () => {
    render(<MemoryRouter><Library /></MemoryRouter>)

    const zeroState = screen.getByText(/Start the shelf/i).closest('.section-shell-quiet')
    expect(zeroState).not.toBeNull()
    expect(within(zeroState as HTMLElement).getByRole('link', { name: /Open Today/i })).toBeInTheDocument()
    expect(within(zeroState as HTMLElement).getByRole('link', { name: /Browse Read/i })).toBeInTheDocument()
  })

  test('bookmarks section visible when bookmarks exist', () => {
    useBookmarksStore.setState({
      bookmarks: [{
        id: 'bookmark-1', type: 'bani', title: 'Japji Sahib',
        source: 'G', ang: 1, savedAt: new Date().toISOString()
      }]
    })
    render(<MemoryRouter><Library /></MemoryRouter>)
    expect(screen.getByRole('button', { name: /1 saved passage/i })).toBeInTheDocument()
    expect(screen.getByText('Japji Sahib')).toBeInTheDocument()
  })

  test('bookmark card shows scripture reference', () => {
    useBookmarksStore.setState({
      bookmarks: [{
        id: 'bookmark-1', type: 'bani', title: 'Japji Sahib',
        source: 'G', ang: 1, savedAt: new Date().toISOString()
      }]
    })
    render(<MemoryRouter><Library /></MemoryRouter>)
    expect(screen.getByText(/SGGS · Ang 1/)).toBeInTheDocument()
  })

  test('delete button removes bookmark', () => {
    useBookmarksStore.setState({
      bookmarks: [{
        id: 'bookmark-1', type: 'bani', title: 'Japji Sahib',
        source: 'G', ang: 1, savedAt: new Date().toISOString()
      }]
    })
    render(<MemoryRouter><Library /></MemoryRouter>)
    fireEvent.click(screen.getByLabelText('Remove bookmark'))
    expect(useBookmarksStore.getState().bookmarks).toHaveLength(0)
  })

  test('learn saved items appear in the saved shelf and can be removed', async () => {
    useLearningStore.setState(state => ({
      learnState: {
        ...state.learnState,
        savedItemIds: ['topic-anxiety'],
      },
    }))

    render(<MemoryRouter><Library /></MemoryRouter>)

    const learnSavesSection = await screen.findByTestId('library-learn-saves')
    expect(within(learnSavesSection).getByText('Learn Saves')).toBeInTheDocument()
    expect(within(learnSavesSection).getByText('When the mind is anxious')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Remove saved Learn item'))

    expect(useLearningStore.getState().learnState.savedItemIds).toEqual([])
  })

  test('favorites reopen broken partial saved routes on canonical ang paths', async () => {
    useFavoritesStore.setState({
      favorites: [{
        id: 'favorite-1',
        title: 'Ang 2 favorite',
        source: 'G',
        ang: 2,
        shabadId: 50,
        type: 'shabad',
        savedAt: new Date().toISOString(),
      }],
    })

    renderLibraryRoutes()

    fireEvent.click(within(screen.getByTestId('library-favorites')).getByRole('link'))

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/study?source=G&ang=2')
    })
  })

  test('bookmarks reopen broken partial saved routes on canonical ang paths', async () => {
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
      expect(screen.getByTestId('location').textContent).toBe('/study?source=G&ang=2')
    })
  })

  test('library snapshot reflects the latest saved learn item inline', async () => {
    useLearningStore.setState(state => ({
      learnState: {
        ...state.learnState,
        savedItemIds: ['topic-anxiety'],
      },
    }))
    useSavedFeedbackStore.setState({
      lastSaved: {
        kind: 'learn',
        targetId: 'topic-anxiety',
        surfacedAt: '2026-04-11T11:00:00.000Z',
      },
    })

    render(<MemoryRouter><Library /></MemoryRouter>)

    expect(screen.getByRole('status')).toHaveTextContent(/Learn save added to Saved/i)
    const learnMetric = within(screen.getByTestId('library-snapshot')).getByText('1')
    expect(learnMetric.closest('.saved-feedback-highlight')).not.toBeNull()
    expect((await screen.findByText('When the mind is anxious')).closest('.saved-feedback-highlight')).not.toBeNull()
  })
})

describe('Library removed sections', () => {
  beforeEach(() => {
    useBookmarksStore.setState({ bookmarks: [] })
    useFavoritesStore.setState({ favorites: [] })
    useProgressStore.setState({ streak: 0, currentSession: null, studied: [], reviewQueue: [], lastStudied: null })
    useSavedFeedbackStore.getState().clearSaved()
    useVocabStore.setState({ vocab: [] })
  })

  it('does not show Sarbloh Granth section', () => {
    render(<MemoryRouter><Library /></MemoryRouter>)
    expect(screen.queryByText(/sarbloh/i)).not.toBeInTheDocument()
  })

  it('does not show Custom Texts section', () => {
    render(<MemoryRouter><Library /></MemoryRouter>)
    expect(screen.queryByText(/custom texts/i)).not.toBeInTheDocument()
  })

  it('does not show Add New Book button', () => {
    render(<MemoryRouter><Library /></MemoryRouter>)
    expect(screen.queryByText(/add new/i)).not.toBeInTheDocument()
  })

  it('shows the remaining scripture sections without Amrit Keertan', () => {
    render(<MemoryRouter><Library /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /browse by source/i }))
    expect(screen.getByTestId('library-source-browser-shared')).toHaveAttribute('data-component', 'scripture-source-browser')
    expect(screen.getByText('Sri Guru Granth Sahib Ji')).toBeInTheDocument()
    expect(screen.getByText('Dasam Granth')).toBeInTheDocument()
    expect(screen.getByText('Bhai Gurdas Ji Vaaran')).toBeInTheDocument()
    expect(screen.getByText('Panth Prakash (English)')).toBeInTheDocument()
    expect(screen.queryByText('Amrit Keertan')).not.toBeInTheDocument()
  })

  it('opens Panth Prakash source browsing on the library overview route', async () => {
    renderLibraryRoutes()

    fireEvent.click(screen.getByRole('button', { name: /browse by source/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Panth Prakash (English)' }))
    fireEvent.click(screen.getByRole('link', { name: '1' }))

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/library/panth-prakash-english/page/1')
    })
  })

  it('does not show Panthic Sources or BNL', () => {
    render(<MemoryRouter><Library /></MemoryRouter>)
    expect(screen.queryByText(/Panthic Sources/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Bhai Nand Lal/i)).not.toBeInTheDocument()
  })

  it('shows a readable resume reference instead of the raw internal session id', () => {
    useProgressStore.setState({
      currentSession: {
        scriptureId: 'G-256',
        resumePath: '/study?source=G&ang=256',
        updatedAt: '2026-04-11T09:00:00.000Z',
      },
    })
    render(<MemoryRouter><Library /></MemoryRouter>)
    expect(screen.getByText(/Sri Guru Granth Sahib Ji · Ang 256/i)).toBeInTheDocument()
    expect(screen.queryByText(/^G-256$/i)).not.toBeInTheDocument()
  })
})
