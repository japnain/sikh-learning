import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  configureStoryRepositoryLoader,
  downloadStoryCollection,
  getStoredStoryIds,
  getOfflineStoryIds,
} from '../data/storyRepository'
import { useLocaleStore } from '../store/locale'
import { STORY_STATE_STORAGE_KEY, useStoryStore } from '../store/stories'
import type { Story, StoryCatalog, StorySummary } from '../types/stories'
import StoryBrowser from './StoryBrowser'

const summaries: StorySummary[] = [
  {
    id: 'bhai-lalo', title: 'The Bread at Lalo’s Table', subtitle: 'A meal and the work behind it',
    description: 'A carpenter welcomes Guru Nanak.', collectionId: 'seva-and-dignity',
    themes: ['Honest work'], people: ['Guru Nanak', 'Bhai Lalo'], artwork: 'bowl',
    wordCount: 4, readingMinutes: 1, revision: 1,
  },
  {
    id: 'sajjan', title: 'The House That Hid Its Darkness', subtitle: 'A different welcome',
    description: 'A host encounters a searching hymn.', collectionId: 'lives-transformed',
    themes: ['Transformation'], people: ['Shaikh Sajjan'], artwork: 'doorway',
    wordCount: 4, readingMinutes: 1, revision: 1,
  },
  {
    id: 'the-sacred-thread', title: 'A Thread That Would Not Break', subtitle: 'A question of conscience',
    description: 'Young Nanak questions an outward sign.', collectionId: 'courage-and-conscience',
    themes: ['Conscience'], people: ['Guru Nanak', 'Hardial'], artwork: 'thread',
    wordCount: 4, readingMinutes: 1, revision: 1,
  },
]

const catalog: StoryCatalog = {
  version: 1,
  collections: [
    { id: 'seva-and-dignity', title: 'Seva & dignity', description: 'Work and welcome.', artwork: 'bowl' },
    { id: 'lives-transformed', title: 'Lives transformed', description: 'A change in direction.', artwork: 'doorway' },
    { id: 'courage-and-conscience', title: 'Courage & conscience', description: 'Questions worth asking.', artwork: 'thread' },
  ],
  stories: summaries,
}

const stories: Story[] = summaries.map(summary => ({
  ...summary,
  language: 'en', accountType: 'Traditional sakhi',
  paragraphs: [{ id: 'p1', text: 'One complete English story.' }],
  sources: [{
    title: 'The Sikh Religion, Volume I', author: 'Max Arthur Macauliffe', year: 1909,
    reference: 'Life of Guru Nanak, named episode.', url: 'https://en.wikisource.org/wiki/The_Sikh_Religion/Volume_1',
  }],
  accountNote: 'A traditional account.', editorialNote: 'An original retelling.',
  rights: { status: 'original-retelling', basis: 'public-domain-source', note: 'Based on the 1909 original.' },
}))

function fixture(resourcePath: string): StoryCatalog | Story {
  if (resourcePath === '/data/stories/catalog.json') return catalog
  const story = stories.find(item => resourcePath === `/data/stories/${item.id}.json`)
  if (!story) throw new Error(`Unexpected story request: ${resourcePath}`)
  return story
}

function Destination() {
  const location = useLocation()
  return <output data-testid="story-destination">{location.pathname}|{JSON.stringify(location.state)}</output>
}

function open() {
  return render(<MemoryRouter initialEntries={['/banis?collection=stories#shelf']}>
    <Routes>
      <Route path="/banis" element={<StoryBrowser />} />
      <Route path="/stories/:storyId" element={<Destination />} />
    </Routes>
  </MemoryRouter>)
}

function card(title: string) {
  return screen.getByRole('heading', { level: 4, name: title }).closest('article') as HTMLElement
}

beforeEach(() => {
  localStorage.clear()
  useLocaleStore.setState({ locale: 'en' })
  useStoryStore.setState({ saved: {}, positions: {} })
  configureStoryRepositoryLoader(async resourcePath => fixture(resourcePath))
})

afterEach(() => {
  vi.restoreAllMocks()
  configureStoryRepositoryLoader(null)
})

describe('StoryBrowser', () => {
  it('loads the catalog through the repository and combines person/theme search with collection filtering', async () => {
    const user = userEvent.setup()
    const loader = vi.fn(async (resourcePath: string) => fixture(resourcePath))
    configureStoryRepositoryLoader(loader)
    open()
    await screen.findByTestId('story-browser')
    expect(loader).toHaveBeenCalledWith('/data/stories/catalog.json', expect.any(AbortSignal))
    expect(loader).toHaveBeenCalledTimes(1)

    const search = screen.getByRole('searchbox', { name: /search stories by title, person or theme/i })
    await user.type(search, '  LALO  ')
    expect(screen.getByRole('heading', { level: 4, name: summaries[0].title })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 4, name: summaries[1].title })).not.toBeInTheDocument()

    await user.clear(search)
    await user.type(search, 'transformation')
    expect(screen.getByRole('heading', { level: 4, name: summaries[1].title })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Seva & dignity' }))
    expect(screen.getByText('No stories match this search.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Seva & dignity' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Show all stories' }))
    expect(search).toHaveValue('')
    expect(screen.getByRole('button', { name: 'All stories' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(3)
  })

  it('saves and removes the real story state durably from a story card', async () => {
    const user = userEvent.setup()
    open()
    await screen.findByTestId('story-browser')
    await user.click(screen.getByRole('button', { name: `Save ${summaries[0].title}` }))
    expect(useStoryStore.getState().saved['bhai-lalo']).toMatchObject(summaries[0])
    expect(JSON.parse(localStorage.getItem(STORY_STATE_STORAGE_KEY)!)).toMatchObject({
      saved: { 'bhai-lalo': { title: summaries[0].title } },
    })
    expect(screen.getByRole('button', { name: `Remove ${summaries[0].title} from Saved` })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: `Remove ${summaries[0].title} from Saved` }))
    expect(useStoryStore.getState().saved['bhai-lalo']).toBeUndefined()
    expect(JSON.parse(localStorage.getItem(STORY_STATE_STORAGE_KEY)!)).toMatchObject({ saved: {} })
    expect(screen.getByText(`${summaries[0].title} removed from Saved.`)).toBeInTheDocument()
  })

  it('reports session-only saving when device storage rejects the write', async () => {
    const user = userEvent.setup()
    open()
    await screen.findByTestId('story-browser')
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError')
    })
    await user.click(screen.getByRole('button', { name: `Save ${summaries[0].title}` }))
    expect(useStoryStore.getState().saved['bhai-lalo']).toBeDefined()
    expect(screen.getByText(/this change will last only for this session/i)).toBeInTheDocument()
    expect(screen.queryByText(`${summaries[0].title} added to Saved.`)).not.toBeInTheDocument()
  })

  it('shows actual download progress and announces offline availability only after storage is complete', async () => {
    const user = userEvent.setup()
    let release!: (story: Story) => void
    const pending = new Promise<Story>(resolve => { release = resolve })
    configureStoryRepositoryLoader(async resourcePath => resourcePath === '/data/stories/sajjan.json'
      ? pending : fixture(resourcePath))
    open()
    await screen.findByTestId('story-browser')
    await user.click(screen.getByRole('button', { name: 'Download stories' }))

    expect(await screen.findByRole('button', { name: 'Downloading 1 of 3…' })).toBeDisabled()
    expect(getOfflineStoryIds()).toEqual(['bhai-lalo'])
    expect(screen.queryByRole('button', { name: 'Available offline' })).not.toBeInTheDocument()
    expect(screen.queryByText('3 stories available offline on this device.')).not.toBeInTheDocument()

    await act(async () => { release(stories[1]) })
    expect(await screen.findByRole('button', { name: 'Available offline' })).toBeDisabled()
    expect(getOfflineStoryIds()).toEqual(summaries.map(story => story.id))
    expect(screen.getByText('3 stories available offline on this device.')).toBeInTheDocument()
  })

  it('keeps partial downloads truthful after failure and allows the remaining stories to be retried', async () => {
    const user = userEvent.setup()
    let disconnected = true
    configureStoryRepositoryLoader(async resourcePath => {
      if (disconnected && resourcePath === '/data/stories/sajjan.json') throw new Error('Connection lost while downloading.')
      return fixture(resourcePath)
    })
    open()
    await screen.findByTestId('story-browser')
    await user.click(screen.getByRole('button', { name: 'Download stories' }))
    expect(await screen.findByText('The download could not finish. Check your connection and device storage, then try again.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download stories' })).toBeEnabled()
    expect(getOfflineStoryIds()).toEqual(['bhai-lalo'])
    expect(within(card(summaries[0].title)).getByText(/Offline/)).toBeInTheDocument()
    expect(within(card(summaries[1].title)).queryByText(/Offline/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Available offline' })).not.toBeInTheDocument()

    disconnected = false
    await user.click(screen.getByRole('button', { name: 'Download stories' }))
    expect(await screen.findByRole('button', { name: 'Available offline' })).toBeDisabled()
    expect(getOfflineStoryIds()).toHaveLength(3)
  })

  it('recovers from a catalog failure through its retry action', async () => {
    const user = userEvent.setup()
    let disconnected = true
    configureStoryRepositoryLoader(async resourcePath => {
      if (disconnected) throw new Error('Offline')
      return fixture(resourcePath)
    })
    open()
    expect(await screen.findByRole('alert')).toHaveTextContent(/Stories could not be loaded/i)
    disconnected = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByTestId('story-browser')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('continues the newest unfinished story and preserves the complete originating route', async () => {
    useStoryStore.setState({ positions: {
      'bhai-lalo': { paragraphId: 'p2', progress: 0.2, revision: 1, updatedAt: '2026-10-20T08:00:00Z' },
      sajjan: { paragraphId: 'p4', progress: 0.6, revision: 1, updatedAt: '2026-10-21T08:00:00Z' },
      'the-sacred-thread': { paragraphId: 'p9', progress: 1, revision: 1, updatedAt: '2026-10-21T09:00:00Z', finishedAt: '2026-10-21T09:00:00Z' },
    } })
    const user = userEvent.setup()
    open()
    const link = await screen.findByRole('link', { name: /Continue reading.*The House That Hid Its Darkness.*60% read/i })
    expect(link).toHaveAttribute('href', '/stories/sajjan')
    await user.click(link)
    expect(screen.getByTestId('story-destination')).toHaveTextContent('/stories/sajjan|{"libraryReaderOrigin":"/banis?collection=stories#shelf"}')
  })

  it('offers English reading without audio playback controls', async () => {
    const { container } = open()
    await screen.findByTestId('story-browser')
    expect(screen.getByTestId('story-browser')).toHaveAttribute('lang', 'en')
    expect(container.querySelector('audio')).toBeNull()
    expect(screen.queryByRole('button', { name: /^(play|listen|pause|narrate)\b/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Read the story/ })).toHaveAttribute('href', '/stories/bhai-lalo')
  })

  it('uses the catalog editorial feature and finds a connected series by its title', async () => {
    const series = { id: 'journeys', title: 'A shared journey', order: 2 }
    configureStoryRepositoryLoader(async resourcePath => resourcePath === '/data/stories/catalog.json'
      ? { ...catalog, featuredStoryId: 'sajjan', stories: summaries.map(summary => summary.id === 'sajjan' ? { ...summary, series } : summary) }
      : fixture(resourcePath))
    const user = userEvent.setup()
    open()
    await screen.findByTestId('story-browser')
    expect(screen.getByRole('link', { name: /Read the story/ })).toHaveAttribute('href', '/stories/sajjan')
    expect(within(card(summaries[1].title)).getByText('A shared journey').parentElement).toHaveTextContent('A shared journey · Part 2')
    await user.type(screen.getByRole('searchbox'), 'shared journey')
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent(summaries[1].title)
  })
})

it('offers an optional beginner path and localizes collection recovery controls', async () => {
  useLocaleStore.setState({ locale: 'hi' })
  open()
  const browser = await screen.findByTestId('story-browser')
  expect(browser).toHaveAttribute('lang', 'hi')
  expect(screen.getByRole('searchbox', { name: 'शीर्षक, व्यक्ति या विषय से साखियाँ खोजें' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'साखियाँ डाउनलोड करें' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: summaries[0].title, level: 4 })).toHaveAttribute('lang', 'en')
  await userEvent.click(screen.getByText('सिख साखियाँ पहली बार पढ़ रहे हैं?'))
  expect(screen.getByRole('link', { name: 'ईमानदार मेहनत' })).toHaveAttribute('href', '/stories/bhai-lalo')
})

it('lets readers remove retained downloads even when all editions are older than the catalog', async () => {
  await downloadStoryCollection()
  configureStoryRepositoryLoader(async resourcePath => resourcePath === '/data/stories/catalog.json'
    ? { ...catalog, stories: summaries.map(summary => ({ ...summary, revision: 2 })) }
    : fixture(resourcePath))
  const user = userEvent.setup()
  open()
  await screen.findByTestId('story-browser')
  expect(getOfflineStoryIds()).toEqual([])
  expect(getStoredStoryIds()).toHaveLength(3)
  expect(screen.getByRole('button', { name: 'Download stories' })).toBeEnabled()
  await user.click(screen.getByRole('button', { name: 'Remove downloads' }))
  expect(getStoredStoryIds()).toEqual([])
  expect(screen.queryByRole('button', { name: 'Remove downloads' })).not.toBeInTheDocument()
})

it('matches normalized person and theme tokens in either order', async () => {
  const user = userEvent.setup()
  open()
  await screen.findByTestId('story-browser')
  await user.type(screen.getByRole('searchbox'), 'HONÉST   nanak')
  expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(1)
  expect(screen.getByRole('heading', { level: 4, name: summaries[0].title })).toBeInTheDocument()
})
