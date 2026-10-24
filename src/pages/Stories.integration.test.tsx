import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as banidbApi from '../api/banidb'
import { configureStoryRepositoryLoader } from '../data/storyRepository'
import { useBookmarksStore } from '../store/bookmarks'
import { useFavoritesStore } from '../store/favorites'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { useProgressStore } from '../store/progress'
import { useReadingProgressStore } from '../store/readingProgress'
import { useRecentSearchStore } from '../store/recentSearch'
import { useSavedFeedbackStore } from '../store/savedFeedback'
import { STORY_STATE_STORAGE_KEY, useStoryStore } from '../store/stories'
import { useVocabStore } from '../store/vocab'
import type { Story, StoryCatalog, StorySummary } from '../types/stories'
import * as appSearch from '../utils/appSearch'
import Banis from './Banis'
import Library from './Library'
import StoryReader from './stories/StoryReader'

const summaries: StorySummary[] = [
  {
    id: 'bhai-lalo', title: 'The Bread at Lalo’s Table', subtitle: 'A meal and the work behind it',
    description: 'A carpenter welcomes Guru Nanak.', collectionId: 'seva-and-dignity',
    themes: ['Honest work'], people: ['Guru Nanak', 'Bhai Lalo'], artwork: 'bowl',
    wordCount: 4, readingMinutes: 1, revision: 1,
  },
  {
    id: 'sajjan', title: 'The House That Hid Its Darkness', subtitle: 'A different welcome',
    description: 'Sajjan encounters a searching hymn.', collectionId: 'lives-transformed',
    themes: ['Accountability'], people: ['Shaikh Sajjan'], artwork: 'doorway',
    wordCount: 4, readingMinutes: 1, revision: 1,
  },
]
const catalog: StoryCatalog = {
  version: 1,
  collections: [
    { id: 'seva-and-dignity', title: 'Seva & dignity', description: 'Work and welcome.', artwork: 'bowl' },
    { id: 'lives-transformed', title: 'Lives transformed', description: 'A change in direction.', artwork: 'doorway' },
  ],
  stories: summaries,
}
const stories: Story[] = summaries.map(summary => ({
  ...summary, language: 'en', accountType: 'Traditional sakhi',
  paragraphs: [{ id: 'p1', text: 'One complete English story.' }],
  sources: [{ title: 'The Sikh Religion, Volume I', author: 'Max Arthur Macauliffe', year: 1909,
    reference: 'Life of Guru Nanak, named episode.', url: 'https://en.wikisource.org/wiki/The_Sikh_Religion/Volume_1' }],
  accountNote: 'A traditional account.', editorialNote: 'An original retelling.',
  rights: { status: 'original-retelling', basis: 'public-domain-source', note: 'Based on the 1909 original.' },
}))

function LocationSpy() {
  const location = useLocation()
  return <output data-testid="integration-location" data-state={JSON.stringify(location.state)}>
    {`${location.pathname}${location.search}${location.hash}`}
  </output>
}

function open(path: string) {
  return render(<MemoryRouter initialEntries={[path]}>
    <LocationSpy />
    <Routes>
      <Route path="/banis" element={<Banis />} />
      <Route path="/saved" element={<Library />} />
      <Route path="/stories/:storyId" element={<StoryReader />} />
    </Routes>
  </MemoryRouter>)
}

function currentUrl() {
  return new URL(screen.getByTestId('integration-location').textContent!, 'https://naamras.invalid')
}

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  useLocaleStore.setState({ locale: 'en' })
  useLanguageStore.setState({ scriptMode: 'gurmukhi', showTransliteration: true, meaningLanguage: 'en' })
  useStoryStore.setState({ saved: {}, positions: {} })
  useBookmarksStore.setState({ bookmarks: [] })
  useFavoritesStore.setState({ favorites: [] })
  useProgressStore.setState({ streak: 0, currentSession: null, studied: [], reviewQueue: [], lastStudied: null })
  useReadingProgressStore.setState({ progress: {} })
  useRecentSearchStore.setState({ recent: [] })
  useSavedFeedbackStore.getState().clearSaved()
  useVocabStore.setState({ vocab: [] })
  vi.spyOn(banidbApi, 'fetchBanisIndex').mockResolvedValue([])
  vi.spyOn(banidbApi, 'fetchSearch').mockResolvedValue([])
  vi.spyOn(appSearch, 'getLibrarySearchMatches').mockResolvedValue([])
  configureStoryRepositoryLoader(async resourcePath => {
    if (resourcePath === '/data/stories/catalog.json') return catalog
    const story = stories.find(candidate => resourcePath === `/data/stories/${candidate.id}.json`)
    if (!story) throw new Error(`Unexpected story resource: ${resourcePath}`)
    return story
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  configureStoryRepositoryLoader(null)
})

describe('Stories in the shared reading and Saved pages', () => {
  it('opens a deep Stories collection URL, preserves separate searches, and returns from the real reader to the same shelf', async () => {
    open('/banis?collection=stories&query=mercy&mode=english&storyQuery=Lalo&storyCollection=seva-and-dignity')
    await screen.findByTestId('story-browser')
    expect(screen.getByRole('tab', { name: 'Stories' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Stories' })).toBeInTheDocument()
    const search = screen.getByRole('searchbox', { name: /search stories by title, person or theme/i })
    expect(search).toHaveValue('Lalo')
    expect(screen.getByRole('button', { name: 'Seva & dignity' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.querySelector('#banis-search')).toBeNull()
    expect(banidbApi.fetchBanisIndex).not.toHaveBeenCalled()
    expect(banidbApi.fetchSearch).not.toHaveBeenCalled()

    fireEvent.change(search, { target: { value: 'Sajjan' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lives transformed' }))
    await waitFor(() => {
      expect(currentUrl().searchParams.get('storyQuery')).toBe('Sajjan')
      expect(currentUrl().searchParams.get('storyCollection')).toBe('lives-transformed')
      expect(currentUrl().searchParams.get('query')).toBe('mercy')
      expect(currentUrl().searchParams.get('mode')).toBe('english')
    })
    const origin = `${currentUrl().pathname}${currentUrl().search}`
    const card = screen.getByRole('heading', { level: 4, name: summaries[1].title }).closest('article')!
    fireEvent.click(within(card).getByRole('link'))
    await screen.findByRole('heading', { level: 1, name: summaries[1].title })
    expect(currentUrl().pathname).toBe('/stories/sajjan')
    expect(screen.getByTestId('integration-location')).toHaveAttribute('data-state', JSON.stringify({ libraryReaderOrigin: origin }))

    fireEvent.click(screen.getByRole('link', { name: 'Back to stories' }))
    await screen.findByTestId('story-browser')
    expect(screen.getByRole('searchbox', { name: /search stories by title, person or theme/i })).toHaveValue('Sajjan')
    expect(screen.getByRole('button', { name: 'Lives transformed' })).toHaveAttribute('aria-pressed', 'true')
    expect(currentUrl().searchParams.get('query')).toBe('mercy')
    expect(screen.queryByRole('heading', { level: 4, name: summaries[0].title })).not.toBeInTheDocument()
  })

  it('restores scripture search when switching tabs and cancels a queued scripture request on return to Stories', async () => {
    open('/banis?collection=stories&query=grace&mode=english&storyQuery=Lalo&storyCollection=seva-and-dignity')
    await screen.findByTestId('story-browser')
    expect(banidbApi.fetchBanisIndex).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('tab', { name: 'Banis' }))
    const scriptureSearch = document.querySelector('#banis-search') as HTMLInputElement
    expect(scriptureSearch).toHaveValue('grace')
    await waitFor(() => expect(banidbApi.fetchSearch).toHaveBeenCalled())
    expect(vi.mocked(banidbApi.fetchSearch).mock.calls.every(([query]) => query === 'grace')).toBe(true)
    expect(banidbApi.fetchBanisIndex).toHaveBeenCalledTimes(1)

    fireEvent.change(scriptureSearch, { target: { value: 'kindness' } })
    fireEvent.click(screen.getByRole('tab', { name: 'Stories' }))
    await screen.findByTestId('story-browser')
    // Wait past the real debounce: a queued scripture search must not run behind Stories.
    await act(async () => { await new Promise(resolve => window.setTimeout(resolve, 350)) })
    expect(vi.mocked(banidbApi.fetchSearch).mock.calls.some(([query]) => query === 'kindness')).toBe(false)
    expect(screen.getByRole('searchbox', { name: /search stories by title, person or theme/i })).toHaveValue('Lalo')
    expect(screen.getByRole('button', { name: 'Seva & dignity' })).toHaveAttribute('aria-pressed', 'true')
    expect(currentUrl().searchParams.get('query')).toBe('kindness')
    expect(currentUrl().searchParams.get('storyQuery')).toBe('Lalo')
    expect(currentUrl().searchParams.get('storyCollection')).toBe('seva-and-dignity')
  })

  it('counts stories as real Saved content and applies the shared search, remove and undo flow', async () => {
    useStoryStore.getState().saveStory(summaries[0])
    useStoryStore.getState().saveStory(summaries[1])
    useStoryStore.getState().savePosition('sajjan', { paragraphId: 'p1', progress: 0.4, revision: 1 })
    open('/saved')
    expect(screen.queryByText('Start the shelf')).not.toBeInTheDocument()
    const search = screen.getByRole('searchbox', { name: 'Search saved readings' })
    const storyShelf = screen.getByRole('region', { name: 'Saved stories' })
    expect(search.compareDocumentPosition(storyShelf) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(storyShelf).getAllByRole('link')).toHaveLength(2)

    fireEvent.change(search, { target: { value: 'Accountability' } })
    expect(within(storyShelf).getByRole('link', { name: /The House That Hid Its Darkness/ })).toHaveTextContent('In progress')
    expect(within(storyShelf).queryByRole('link', { name: /The Bread at Lalo’s Table/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: `Remove ${summaries[1].title} from Saved` }))
    expect(useStoryStore.getState().saved.sajjan).toBeUndefined()
    expect(screen.getByText('No saved readings match this search.')).toBeInTheDocument()
    expect(screen.queryByText('Start the shelf')).not.toBeInTheDocument()
    expect(useStoryStore.getState().positions.sajjan.progress).toBe(0.4)

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(within(storyShelf).getByRole('link', { name: /The House That Hid Its Darkness/ })).toHaveAttribute('href', '/stories/sajjan')
    expect(screen.queryByText('No saved readings match this search.')).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(STORY_STATE_STORAGE_KEY)!)).toMatchObject({
      saved: { sajjan: { title: summaries[1].title } }, positions: { sajjan: { progress: 0.4 } },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Favorites', exact: true }))
    expect(within(storyShelf).queryByRole('link')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Bookmarks', exact: true }))
    expect(within(storyShelf).getByRole('link', { name: /The House That Hid Its Darkness/ })).toBeInTheDocument()
  })
})
