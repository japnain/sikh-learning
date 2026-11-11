import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import Library from './Library'
import { useBookmarksStore } from '../store/bookmarks'
import { useFavoritesStore } from '../store/favorites'
import { useReadingProgressStore } from '../store/readingProgress'
import { useStoryStore } from '../store/stories'
import { useReadingPlacesStore } from '../store/readingPlaces'
import { useProgressStore } from '../store/progress'
import { useSavedFeedbackStore } from '../store/savedFeedback'
import { useVocabStore } from '../store/vocab'
import { useLocaleStore } from '../store/locale'
import { useLanguageStore } from '../store/language'
import { useReadingVisibilityStore } from '../store/readingVisibility'
import { renderScriptText } from '../utils/readerDisplay'

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
        <Route path="/stories/:storyId" element={<LocationSpy />} />
        <Route path="/library/:workId/chapters/:chapterId" element={<LocationSpy />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Library saved shelf', () => {
  beforeEach(() => {
    useReadingPlacesStore.setState({ places: {} })
    useReadingProgressStore.setState({ progress: {} })
    useStoryStore.setState({ saved: {}, positions: {} })
    localStorage.clear()
    useBookmarksStore.setState({ bookmarks: [] })
    useFavoritesStore.setState({ favorites: [] })
    useProgressStore.setState({ streak: 0, currentSession: null, studied: [], reviewQueue: [], lastStudied: null })
    useSavedFeedbackStore.getState().clearSaved()
    useVocabStore.setState({ vocab: [] })
    useLocaleStore.setState({ locale: 'en' })
    useLanguageStore.setState({ scriptMode: 'gurmukhi', meaningLanguage: 'en', showTransliteration: false })
    useReadingVisibilityStore.setState({ hidden: {} })
  })

  test('search finds favorites by romanization and displayed or full source references', () => {
    useFavoritesStore.setState({ favorites: [{ id: 'favorite-1', type: 'ang', routeMode: 'canonical', title: 'Opening verse', source: 'G', ang: 1, excerpt: 'ਸਤਿ ਨਾਮੁ', transliteration: 'sat naam', savedAt: '2026-01-01T00:00:00Z' }] })
    render(<MemoryRouter><Library /></MemoryRouter>)
    const search = screen.getByRole('searchbox')
    for (const query of ['sat naam', 'SGGS · Ang 1', 'Sri Guru Granth Sahib Ji']) {
      fireEvent.change(search, { target: { value: query } })
      expect(within(screen.getByTestId('library-favorites')).getByRole('link')).toHaveTextContent('Opening verse')
      expect(screen.queryByTestId('library-shortcuts')).not.toBeInTheDocument()
    }
  })

  test('a searched bookmark can collapse and reopens when the query changes', () => {
    useBookmarksStore.setState({ bookmarks: [{ id: 'bookmark-1', type: 'bani', title: 'Japji Sahib', source: 'G', ang: 1, savedAt: '2026-01-01T00:00:00Z' }] })
    render(<MemoryRouter><Library /></MemoryRouter>)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Japji' } })
    const disclosure = screen.getByRole('button', { name: /1 saved passage/ })
    fireEvent.click(disclosure)
    expect(disclosure).toHaveAttribute('aria-expanded', 'false')
    expect(within(screen.getByTestId('library-bookmarks')).queryByRole('link')).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Ang 1' } })
    expect(disclosure).toHaveAttribute('aria-expanded', 'true')
    expect(within(screen.getByTestId('library-bookmarks')).getByRole('link')).toHaveTextContent('Japji Sahib')
  })

  test('saved excerpts and meanings follow reading preferences, including fallback language and off', () => {
    useBookmarksStore.setState({ bookmarks: [{ id: 'bookmark-1', type: 'verse', title: 'Opening verse', source: 'G', ang: 1, excerpt: 'ਸਤਿ ਨਾਮੁ', translation_en: 'True name', translation_hi: 'सच्चा नाम', savedAt: '2026-01-01T00:00:00Z' }] })
    useLanguageStore.setState({ scriptMode: 'devanagari', meaningLanguage: 'hi' })
    const view = render(<MemoryRouter><Library /></MemoryRouter>)
    expect(screen.getByText(renderScriptText('ਸਤਿ ਨਾਮੁ', 'devanagari'))).toHaveAttribute('lang', 'hi')
    expect(screen.getByText('सच्चा नाम')).toHaveAttribute('lang', 'hi')
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: renderScriptText('ਸਤਿ ਨਾਮੁ', 'devanagari') } })
    expect(screen.getByText('Opening verse')).toBeInTheDocument()
    view.unmount()
    useLanguageStore.setState({ meaningLanguage: 'pa' })
    const fallback = render(<MemoryRouter><Library /></MemoryRouter>)
    expect(screen.getByText('True name')).toHaveAttribute('lang', 'en')
    fallback.unmount()
    useLanguageStore.setState({ meaningLanguage: 'none' })
    render(<MemoryRouter><Library /></MemoryRouter>)
    expect(screen.queryByText('True name')).not.toBeInTheDocument()
    expect(screen.queryByText('सच्चा नाम')).not.toBeInTheDocument()
  })

  test('word-only and phrase collections have separate counts, searchable cards and explicit review destinations', () => {
    const word = { word: 'ਨਾਮੁ', transliteration: 'naam', meaning_en: 'Name', meaning_pa: '', meaning_hi: '', scripture: 'SGGS', sourceId: 'G', savedAt: '2026-01-01T00:00:00Z' }
    useVocabStore.setState({ vocab: [word, { ...word, kind: 'phrase', word: 'ਸਤਿ ਨਾਮੁ', transliteration: 'sat naam', meaning_en: 'True name' }] })
    render(<MemoryRouter><Library /></MemoryRouter>)
    const snapshot = screen.getByTestId('library-snapshot')
    expect(within(snapshot).getByText('Words').parentElement).toHaveTextContent('1Words')
    expect(within(snapshot).getByText('Phrases').parentElement).toHaveTextContent('1Phrases')
    expect(screen.getByTestId('library-words')).toBeInTheDocument()
    const phraseLink = within(screen.getByTestId('library-phrases')).getByRole('link')
    const destination = new URL(phraseLink.getAttribute('href')!, 'https://naamras.test')
    expect(destination.searchParams.get('kind')).toBe('phrase')
    expect(destination.searchParams.get('q')).toBe('ਸਤਿ ਨਾਮੁ')
    fireEvent.click(screen.getByRole('button', { name: 'Phrases' }))
    expect(screen.queryByTestId('library-words')).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'sat naam' } })
    expect(screen.getByTestId('library-phrases')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'nothing matches' } })
    expect(screen.getByText('No saved readings match this search.')).toBeInTheDocument()
    expect(screen.queryByTestId('library-shortcuts')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(screen.getByTestId('library-words')).toBeInTheDocument()
  })

  test('Rehat resume uses its saved chapter and can be hidden and restored in Continue reading', () => {
    useProgressStore.getState().updateSession({ scriptureId: 'rehat-1-2', resumePath: '/banis/rehat/1/chapters/2', readerLocator: { href: '/banis/rehat/1/chapters/2', type: 'text/html', title: 'Rehat · Daily practice', locations: { progression: 0.2, totalProgression: 0.2, position: 2 } }, updatedAt: '2026-01-01T00:00:00Z' })
    render(<MemoryRouter><Library /></MemoryRouter>)
    expect(screen.getByTestId('library-resume-reading')).toHaveTextContent('Rehat · Daily practice')
    expect(screen.getByTestId('library-resume-reading')).not.toHaveTextContent('Page 1')
    const reading = screen.getByTestId('library-in-progress')
    fireEvent.click(within(reading).getByRole('button', { name: 'Hide Rehat · Daily practice from Continue reading' }))
    expect(within(reading).queryByRole('link')).not.toBeInTheDocument()
    expect(useProgressStore.getState().currentSession).not.toBeNull()
    fireEvent.click(within(reading).getByRole('button', { name: 'Undo' }))
    expect(within(reading).getByRole('link')).toHaveTextContent('Daily practice')
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

test('Saved only offers actual saved locations, never overlapping bani coverage', () => {
  useReadingPlacesStore.setState({ places: {} })
  useProgressStore.setState({ currentSession: null })
  useLocaleStore.setState({ locale: 'en' })
  useReadingProgressStore.setState({ progress: { 'akal-ustat': [11], 'tav-prasad-savaiye': [11] } })
  useProgressStore.getState().updateSession({ scriptureId: 'D-11',
    resumePath: '/study?source=D&ang=11&startAng=11&endAng=13&baniId=tav-prasad-savaiye&baniDbId=6&exactBani=1',
    resumeVerseId: 74957, updatedAt: '2026-10-27T11:00:00Z' })
  render(<MemoryRouter><Library /></MemoryRouter>)
  const readings = screen.getByTestId('library-in-progress')
  expect(within(readings).queryByText('Akal Ustat')).not.toBeInTheDocument()
  expect(within(readings).getByRole('link', { name: /Tav Prasad Savaiye/ })).toHaveAttribute('href', expect.stringContaining('resumeVerseId=74957'))
  expect(readings).not.toHaveTextContent('%')
})

test('a story reading place returns to Saved after opening the story', async () => {
  useLocaleStore.setState({ locale: 'en' })
  useReadingPlacesStore.setState({ places: {} })
  useProgressStore.setState({ currentSession: null })
  useStoryStore.setState({
    saved: { 'a-shared-meal': { id: 'a-shared-meal', title: 'A shared meal', subtitle: '', description: 'A story of sharing.', collectionId: 'wisdom', themes: [], people: [], artwork: 'bowl', wordCount: 100, readingMinutes: 1, revision: 1, savedAt: '2026-10-27T10:00:00Z' } },
    positions: { 'a-shared-meal': { paragraphId: 'paragraph-two', progress: .3, revision: 1, updatedAt: '2026-10-27T11:00:00Z' } },
  })
  renderLibraryRoutes()
  fireEvent.click(within(screen.getByTestId('library-in-progress')).getByRole('link', { name: /A shared meal/ }))
  expect(await screen.findByTestId('location')).toHaveTextContent('/stories/a-shared-meal')
  expect(screen.getByTestId('location')).toHaveAttribute('data-location-state', JSON.stringify({ libraryReaderOrigin: '/saved' }))
})
