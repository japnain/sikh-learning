import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { DEFAULT_EPUB_READER_PREFERENCES, useEpubReaderStore } from '../../store/epubReader'
import { STORY_STATE_STORAGE_KEY, useStoryStore } from '../../store/stories'
import { useLocaleStore } from '../../store/locale'
import { useThemeStore } from '../../store/theme'
import { mockDocumentScroll } from '../../test/documentScroll'
import type { Story, StoryCatalog, StorySummary } from '../../types/stories'
import StoryReader, { StoryReadingView } from './StoryReader'
import StoryDraftPreview from './StoryDraftPreview'

const mocks = vi.hoisted(() => ({
  loadStory: vi.fn(),
  loadStoryCatalog: vi.fn(),
  loadStoryDraftLibrary: vi.fn(),
  settled: new Set<() => void>(),
}))

vi.mock('../../data/storyRepository', () => ({
  loadStory: mocks.loadStory,
  loadStoryCatalog: mocks.loadStoryCatalog,
}))

vi.mock('../../data/storyDraftRepository', () => ({
  loadStoryDraftLibrary: mocks.loadStoryDraftLibrary,
}))

vi.mock('../../utils/appScroll', async importOriginal => {
  const actual = await importOriginal<typeof import('../../utils/appScroll')>()
  return {
    ...actual,
    addAppScrollSettledListener: (callback: () => void) => {
      mocks.settled.add(callback)
      return () => { mocks.settled.delete(callback) }
    },
  }
})

const story: Story = {
  id: 'bowl-of-milk',
  title: 'A bowl with room for more',
  subtitle: 'Guru Nanak and a quiet answer to a crowded city',
  description: 'A traditional account of welcome and belonging.',
  collectionId: 'an-open-door',
  themes: ['Welcome', 'Humility'],
  people: ['Guru Nanak'],
  artwork: 'bowl',
  wordCount: 65,
  readingMinutes: 1,
  revision: 1,
  language: 'en',
  accountType: 'Traditional sakhi',
  paragraphs: [
    { id: 'milk-p01', text: 'At the edge of the city, a bowl of milk arrived, filled almost to the brim.' },
    { id: 'milk-p02', text: 'Guru Nanak placed a flower upon the milk. There was still room for something gentle.' },
    { id: 'milk-p03', text: 'The bowl returned to the city, carrying an answer without a word.' },
  ],
  sources: [{ title: 'The Sikh Religion', author: 'Max Arthur Macauliffe', year: 1909, reference: 'Volume I, account of the visit to Multan.', url: 'https://archive.org/details/sikhreligionits01maca' }],
  accountNote: 'This is a traditional sakhi. Its remembered meaning is not a claim of contemporary documentation.',
  editorialNote: 'An English retelling, without invented dialogue.',
  rights: { status: 'original-retelling', basis: 'public-domain-source', note: 'Original English prose informed by the cited public domain edition.' },
  glossary: [{ term: 'Sakhi', meaning: 'A remembered account or teaching story.' }],
}

const nextStory: StorySummary = {
  id: 'an-open-kitchen', title: 'An open kitchen', subtitle: 'A place at the same table',
  description: 'A story of service.', collectionId: story.collectionId, themes: ['Service'],
  people: ['Mata Khivi'], artwork: 'doorway', wordCount: 600, readingMinutes: 3, revision: 1,
}
const catalog: StoryCatalog = {
  version: 1,
  collections: [{ id: story.collectionId, title: 'An open door', description: 'Stories of welcome.', artwork: 'doorway' }],
  stories: [story, nextStory],
}

let documentScroll: ReturnType<typeof mockDocumentScroll>
let scrollIntoView: ReturnType<typeof vi.spyOn>

function paragraphTop(id: string) {
  const sectionParagraphs: Record<string, string> = {
    'story-section-the-beginning': 'milk-p01',
    'story-section-the-answer': 'milk-p02',
    'story-section-coming-home': 'milk-p03',
  }
  const index = story.paragraphs.findIndex(paragraph => paragraph.id === (sectionParagraphs[id] ?? id))
  return index === -1 ? null : 900 + index * 500 * useEpubReaderStore.getState().fontScale - (sectionParagraphs[id] ? 60 : 0)
}

function renderReader({ path = `/stories/${story.id}`, origin }: { path?: string; origin?: string } = {}) {
  const url = new URL(path, 'https://naamras.invalid')
  return render(
    <MemoryRouter initialEntries={[{ pathname: url.pathname, search: url.search, hash: url.hash, state: origin ? { libraryReaderOrigin: origin } : undefined }]}>
      <Routes>
        <Route path="/stories/:storyId" element={<StoryReader />} />
        <Route path="/banis" element={<h1>Stories collection</h1>} />
        <Route path="/saved" element={<h1>Your Saved page</h1>} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  localStorage.clear()
  useLocaleStore.setState({ locale: 'en' })
  mocks.settled.clear()
  mocks.loadStory.mockReset().mockResolvedValue(story)
  mocks.loadStoryCatalog.mockReset().mockResolvedValue(catalog)
  mocks.loadStoryDraftLibrary.mockReset()
  useStoryStore.setState({ saved: {}, positions: {} })
  useEpubReaderStore.setState(DEFAULT_EPUB_READER_PREFERENCES)
  useThemeStore.getState().setMode('light')
  documentScroll = mockDocumentScroll({ scrollHeight: 3600 })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const documentTop = paragraphTop(this.id)
    if (documentTop === null) return { x: 0, y: 0, top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, toJSON: () => ({}) }
    const top = documentTop - documentScroll.getTop()
    return { x: 0, y: top, top, bottom: top + 300, left: 0, right: 600, width: 600, height: 300, toJSON: () => ({}) }
  })
  scrollIntoView = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(function (this: HTMLElement) {
    const top = paragraphTop(this.id)
    if (top !== null) documentScroll.setTop(top - 96)
  })
})

afterEach(() => {
  documentScroll.restore()
  vi.restoreAllMocks()
  useThemeStore.getState().setMode('light')
})

it('opens continuous English prose and reveals the actual sources on demand', async () => {
  const user = userEvent.setup()
  renderReader()
  expect(await screen.findByRole('heading', { name: story.title, level: 1 })).toBeInTheDocument()
  for (const paragraph of story.paragraphs) expect(screen.getByText(paragraph.text)).toBeInTheDocument()
  expect(screen.queryByText(story.accountNote)).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Story contents' })).not.toBeInTheDocument()
  const accountButton = screen.getByRole('button', { name: 'About this account' })
  await user.click(accountButton)
  const dialog = screen.getByRole('dialog', { name: 'About this account' })
  expect(within(dialog).getByText(story.accountNote)).toBeInTheDocument()
  expect(within(dialog).getByText(story.sources[0].title)).toBeInTheDocument()
  expect(within(dialog).getByText(/Volume I, account of the visit to Multan/)).toBeInTheDocument()
  expect(within(dialog).getByRole('link', { name: 'Read source' })).toHaveAttribute('href', story.sources[0].url)
  expect(within(dialog).getByRole('link', { name: 'Read source' })).toHaveAttribute('rel', 'noopener noreferrer')
  await user.keyboard('{Escape}')
  await waitFor(() => expect(accountButton).toHaveFocus())
})

it('saves to the existing Saved flow, persists the save, and removes it again', async () => {
  const user = userEvent.setup()
  const firstView = renderReader({ origin: '/saved' })
  await screen.findByRole('heading', { name: story.title })
  expect(screen.getByRole('link', { name: 'Back to Saved' })).toHaveAttribute('href', '/saved')
  await user.click(screen.getByRole('button', { name: 'Save story' }))
  expect(screen.getByRole('button', { name: 'Remove story from Saved' })).toHaveAttribute('aria-pressed', 'true')
  expect(JSON.parse(localStorage.getItem(STORY_STATE_STORAGE_KEY)!).saved[story.id].title).toBe(story.title)
  firstView.unmount()
  useStoryStore.setState({ saved: {}, positions: {} })
  useStoryStore.getState().hydrateCachedStories()
  renderReader()
  await screen.findByRole('heading', { name: story.title })
  await user.click(screen.getByRole('button', { name: 'Remove story from Saved' }))
  expect(screen.getByRole('button', { name: 'Save story' })).toHaveAttribute('aria-pressed', 'false')
  expect(useStoryStore.getState().saved[story.id]).toBeUndefined()
})

it('offers retry after a failed request and opens the story after recovery', async () => {
  mocks.loadStory.mockRejectedValueOnce(new Error('offline'))
  const user = userEvent.setup()
  renderReader({ origin: '/saved' })
  await screen.findByRole('heading', { name: 'This story could not open' })
  expect(screen.getByRole('link', { name: 'Saved' })).toHaveAttribute('href', '/saved')
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('heading', { name: story.title })).toBeInTheDocument()
  expect(mocks.loadStory).toHaveBeenCalledTimes(2)
})

it('provides a route back to Stories when the story does not exist', async () => {
  mocks.loadStory.mockResolvedValueOnce(null)
  const user = userEvent.setup()
  renderReader({ path: '/stories/missing-story' })
  await screen.findByRole('heading', { name: 'Story not found' })
  await user.click(screen.getByRole('link', { name: 'Browse stories' }))
  expect(screen.getByRole('heading', { name: 'Stories collection' })).toBeInTheDocument()
})

it('uses and updates shared Book preferences and the global app theme', async () => {
  useEpubReaderStore.setState({ fontScale: 1.15, lineHeight: 'spacious', measure: 'narrow' })
  const user = userEvent.setup()
  renderReader()
  await screen.findByRole('heading', { name: story.title })
  const appearanceButton = screen.getByRole('button', { name: 'Reading appearance' })
  await user.click(appearanceButton)
  const dialog = screen.getByRole('dialog', { name: 'Reading appearance' })
  expect(within(dialog).getByRole('slider', { name: 'Text size' })).toHaveValue('1.15')
  await user.click(within(dialog).getByRole('button', { name: 'Increase text size' }))
  await user.click(within(dialog).getByRole('button', { name: 'Natural' }))
  await user.click(within(dialog).getByRole('button', { name: 'Wide' }))
  await user.click(within(dialog).getByRole('button', { name: 'Dark' }))
  expect(useEpubReaderStore.getState()).toMatchObject({ fontScale: 1.2, lineHeight: 'comfortable', measure: 'wide' })
  expect(useThemeStore.getState().mode).toBe('dark')
  await user.keyboard('{Escape}')
  await waitFor(() => expect(appearanceButton).toHaveFocus())
  expect(screen.getByRole('article').parentElement).toHaveAttribute('data-measure', 'wide')
})

it('resumes the saved paragraph and keeps it anchored when type size changes', async () => {
  useStoryStore.getState().savePosition(story.id, { paragraphId: 'milk-p02', progress: 0.4, revision: 1 })
  const user = userEvent.setup()
  renderReader()
  await screen.findByRole('heading', { name: story.title })
  await waitFor(() => expect(documentScroll.getTop()).toBe(1304))
  expect(scrollIntoView.mock.contexts.at(-1)).toBe(document.getElementById('milk-p02'))
  await user.click(screen.getByRole('button', { name: 'Reading appearance' }))
  fireEvent.change(screen.getByRole('slider', { name: 'Text size' }), { target: { value: '1.2' } })
  await user.keyboard('{Escape}')
  await waitFor(() => expect(documentScroll.getTop()).toBe(1404))
  expect(scrollIntoView.mock.contexts.at(-1)).toBe(document.getElementById('milk-p02'))
})

it('opens a linked paragraph in preference to an older saved place', async () => {
  useStoryStore.getState().savePosition(story.id, { paragraphId: 'milk-p02', progress: 0.4, revision: 1 })
  renderReader({ path: `/stories/${story.id}#milk-p03` })
  await screen.findByRole('heading', { name: story.title })
  await waitFor(() => expect(documentScroll.getTop()).toBe(1804))
  expect(scrollIntoView.mock.contexts.at(-1)).toBe(document.getElementById('milk-p03'))
})

it('starts at the cover when a saved position belongs to an earlier story revision', async () => {
  const revisedStory: Story = { ...story, revision: 2 }
  mocks.loadStory.mockResolvedValue(revisedStory)
  mocks.loadStoryCatalog.mockResolvedValue({ ...catalog, stories: [revisedStory, nextStory] })
  useStoryStore.getState().savePosition(story.id, {
    paragraphId: 'milk-p02', progress: 0.4, revision: 1, finishedAt: new Date().toISOString(),
  })
  renderReader()
  await screen.findByRole('heading', { name: story.title })
  await waitFor(() => expect(screen.getByRole('article')).toHaveFocus())
  expect(documentScroll.getTop()).toBe(0)
  expect(scrollIntoView).not.toHaveBeenCalled()
  expect(screen.getByRole('progressbar', { name: 'Reading progress' })).toHaveAttribute('aria-valuenow', '0')
  expect(screen.getByRole('button', { name: 'Finish story' })).toBeEnabled()
  act(() => {
    documentScroll.setTop(1300)
    mocks.settled.forEach(callback => callback())
  })
  expect(useStoryStore.getState().positions[story.id]).toMatchObject({ paragraphId: 'milk-p02', progress: 0.4, revision: 2 })
  expect(useStoryStore.getState().positions[story.id].finishedAt).toBeUndefined()
})

it('waits for an open appearance sheet before restoring when fonts arrive late', async () => {
  let finishLoadingFonts!: () => void
  const ready = new Promise<void>(resolve => { finishLoadingFonts = resolve })
  const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts')
  Object.defineProperty(document, 'fonts', { configurable: true, value: { ready } })
  useStoryStore.getState().savePosition(story.id, { paragraphId: 'milk-p02', progress: 0.4, revision: 1 })
  const user = userEvent.setup()
  try {
    renderReader()
    await screen.findByRole('heading', { name: story.title })
    await user.click(screen.getByRole('button', { name: 'Reading appearance' }))
    await act(async () => { finishLoadingFonts(); await ready })
    await user.click(screen.getByRole('button', { name: 'Increase text size' }))
    expect(documentScroll.getTop()).toBe(0)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(documentScroll.getTop()).toBe(1329))
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(document.getElementById('milk-p02'))
  } finally {
    if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts)
    else Reflect.deleteProperty(document, 'fonts')
  }
})

it('keeps the opening intact when the reader leaves before starting the prose', async () => {
  const firstView = renderReader()
  await screen.findByRole('heading', { name: story.title })
  await waitFor(() => expect(screen.getByRole('article')).toHaveFocus())
  firstView.unmount()
  expect(useStoryStore.getState().positions[story.id]).toBeUndefined()
  renderReader()
  await screen.findByRole('heading', { name: story.title })
  await waitFor(() => expect(screen.getByRole('article')).toHaveFocus())
  expect(documentScroll.getTop()).toBe(0)
})

it('commits the visible paragraph when scrolling settles without moving keyboard focus', async () => {
  const user = userEvent.setup()
  renderReader()
  await screen.findByRole('heading', { name: story.title })
  await waitFor(() => expect(screen.getByRole('article')).toHaveFocus())
  await user.tab()
  const focusedElement = document.activeElement
  act(() => {
    documentScroll.setTop(1300)
    fireEvent.scroll(window)
    mocks.settled.forEach(callback => callback())
  })
  expect(useStoryStore.getState().positions[story.id]).toMatchObject({ paragraphId: 'milk-p02', progress: 0.4, revision: 1 })
  expect(document.activeElement).toBe(focusedElement)
  expect(screen.getByRole('progressbar', { name: 'Reading progress' })).toHaveAttribute('aria-valuenow', '40')
  const savedAt = useStoryStore.getState().positions[story.id].updatedAt
  act(() => { mocks.settled.forEach(callback => callback()) })
  expect(useStoryStore.getState().positions[story.id].updatedAt).toBe(savedAt)
  act(() => {
    documentScroll.setTop(1800)
    fireEvent(window, new Event('pagehide'))
  })
  expect(useStoryStore.getState().positions[story.id]).toMatchObject({ paragraphId: 'milk-p03', progress: 1 })
})

it('restores a paragraph from durable reading state after a fresh mount', async () => {
  const firstView = renderReader()
  await screen.findByRole('heading', { name: story.title })
  await waitFor(() => expect(screen.getByRole('article')).toHaveFocus())
  act(() => {
    documentScroll.setTop(1300)
    mocks.settled.forEach(callback => callback())
  })
  firstView.unmount()
  useStoryStore.setState({ saved: {}, positions: {} })
  useStoryStore.getState().hydrateCachedStories()
  documentScroll.setTop(0)
  renderReader()
  await screen.findByRole('heading', { name: story.title })
  await waitFor(() => expect(documentScroll.getTop()).toBe(1304))
  expect(scrollIntoView.mock.contexts.at(-1)).toBe(document.getElementById('milk-p02'))
})

it('marks completion explicitly and recommends another story inside the same app', async () => {
  const user = userEvent.setup()
  renderReader({ origin: '/saved' })
  await screen.findByRole('heading', { name: story.title })
  await user.click(screen.getByRole('button', { name: 'Finish story' }))
  expect(useStoryStore.getState().positions[story.id]).toMatchObject({ paragraphId: 'milk-p03', progress: 1, finishedAt: expect.any(String) })
  expect(screen.getByRole('button', { name: 'Finished' })).toBeDisabled()
  const nextLink = screen.getByRole('link', { name: /Read next: An open kitchen/ })
  expect(nextLink).toHaveAttribute('href', `/stories/${nextStory.id}`)
  expect(screen.getByRole('link', { name: 'Return to Saved' })).toHaveAttribute('href', '/saved')
  await user.click(screen.getByRole('link', { name: 'Return to Saved' }))
  expect(screen.getByRole('heading', { name: 'Your Saved page' })).toBeInTheDocument()
})

it('continues in curated order and skips finished accounts before cycling to earlier stories', async () => {
  const earlier: StorySummary = { ...nextStory, id: 'first-welcome', title: 'The first welcome' }
  const following: StorySummary = { ...nextStory, id: 'a-helping-hand', title: 'A helping hand' }
  mocks.loadStoryCatalog.mockResolvedValue({ ...catalog, stories: [earlier, story, nextStory, following] })
  useStoryStore.getState().savePosition(nextStory.id, { paragraphId: 'kitchen-p01', progress: 1, revision: 1, finishedAt: new Date().toISOString() })
  renderReader()
  await screen.findByRole('heading', { name: story.title })
  expect(screen.getByRole('link', { name: /Read next: A helping hand/ })).toHaveAttribute('href', '/stories/a-helping-hand')
})

it('navigates long readings by section, moves focus into the prose and preserves the selected place through appearance changes and remount', async () => {
  const sectionedStory: Story = {
    ...story,
    sections: [
      { id: 'the-beginning', title: 'The beginning', startParagraphId: 'milk-p01' },
      { id: 'the-answer', title: 'An unexpected answer', startParagraphId: 'milk-p02' },
      { id: 'coming-home', title: 'Coming home', startParagraphId: 'milk-p03' },
    ],
  }
  mocks.loadStory.mockResolvedValue(sectionedStory)
  const user = userEvent.setup()
  const view = renderReader()
  await screen.findByRole('heading', { name: story.title })
  await waitFor(() => expect(screen.getByRole('article')).toHaveFocus())
  expect(document.getElementById('milk-p02')).toHaveTextContent(story.paragraphs[1].text)
  const contentsButton = screen.getByRole('button', { name: 'Story contents' })
  await user.click(contentsButton)
  const contents = screen.getByRole('dialog', { name: 'In this story' })
  expect(within(contents).getByRole('button', { name: 'The beginning' })).toHaveAttribute('aria-current', 'location')
  await user.keyboard('{Escape}')
  await waitFor(() => expect(contentsButton).toHaveFocus())

  await user.click(contentsButton)
  await user.click(screen.getByRole('button', { name: 'An unexpected answer' }))
  await waitFor(() => expect(screen.getByRole('heading', { name: 'An unexpected answer' })).toHaveFocus())
  expect(documentScroll.getTop()).toBe(1244)
  expect(useStoryStore.getState().positions[story.id]).toMatchObject({ paragraphId: 'milk-p02', revision: 1 })

  await user.click(screen.getByRole('button', { name: 'Reading appearance' }))
  fireEvent.change(screen.getByRole('slider', { name: 'Text size' }), { target: { value: '1.2' } })
  await user.keyboard('{Escape}')
  await waitFor(() => expect(documentScroll.getTop()).toBe(1344))
  view.unmount()
  documentScroll.setTop(0)
  renderReader()
  await screen.findByRole('heading', { name: story.title })
  await waitFor(() => expect(documentScroll.getTop()).toBe(1344))
  expect(scrollIntoView.mock.contexts.at(-1)).toBe(document.getElementById('story-section-the-answer'))
})

it('identifies modern context, edition details and actual review status in the account sheet', async () => {
  mocks.loadStory.mockResolvedValue({
    ...story,
    sources: [{
      ...story.sources[0], id: 'context-study', role: 'context', year: 2026,
      workDate: 'An early Sikh account', edition: 'A named research edition',
      translator: 'A credited translator', editor: 'A credited editor',
      locator: { kind: 'chapter', value: '4, pp. 20–24' },
    }],
    editorial: {
      credit: 'Original English reading prepared for Naamras.',
      historyReview: { status: 'pending' },
      englishReview: { status: 'pending' },
    },
  } satisfies Story)
  const user = userEvent.setup()
  renderReader()
  await user.click(await screen.findByRole('button', { name: 'About this account' }))
  const dialog = screen.getByRole('dialog', { name: 'About this account' })
  expect(within(dialog).getByText('Historical context')).toBeInTheDocument()
  expect(within(dialog).getByText('A named research edition')).toBeInTheDocument()
  expect(within(dialog).getByText('A credited translator').closest('p')).toHaveTextContent('Translation: A credited translator')
  expect(within(dialog).getByText('A credited editor').closest('p')).toHaveTextContent('Edition editor: A credited editor')
  expect(within(dialog).getByText('Chapter 4, pp. 20–24')).toBeInTheDocument()
  expect(within(dialog).getAllByText('Independent review pending.')).toHaveLength(2)
  expect(within(dialog).queryByText(/approved|certified/i)).not.toBeInTheDocument()
})

it('continues in series order before unrelated catalog items and offers other selected readings', async () => {
  const series = { id: 'shared-lives', title: 'Shared lives', order: 1 }
  const partTwo: StorySummary = { ...nextStory, id: 'second-part', title: 'The next part', series: { ...series, order: 2 } }
  const partThree: StorySummary = { ...nextStory, id: 'third-part', title: 'The third part', series: { ...series, order: 3 } }
  const related: StorySummary = { ...nextStory, id: 'a-related-life', title: 'A related life' }
  mocks.loadStory.mockResolvedValue({ ...story, series, relatedStoryIds: [related.id] })
  mocks.loadStoryCatalog.mockResolvedValue({ ...catalog, stories: [story, nextStory, partThree, related, partTwo] })
  renderReader()
  await screen.findByRole('heading', { name: story.title })
  expect(screen.getByText(/Part 1/).closest('p')).toHaveTextContent('Shared lives')
  expect(screen.getByRole('link', { name: /Read next: The next part/ })).toHaveAttribute('href', '/stories/second-part')
  expect(within(screen.getByRole('navigation', { name: 'Related readings' })).getByRole('link', { name: /A related life/ })).toHaveAttribute('href', '/stories/a-related-life')
})

it('uses editorial related order when there is no following series part', async () => {
  const related: StorySummary = { ...nextStory, id: 'a-related-life', title: 'A related life' }
  mocks.loadStory.mockResolvedValue({ ...story, relatedStoryIds: [related.id] })
  mocks.loadStoryCatalog.mockResolvedValue({ ...catalog, stories: [story, nextStory, related] })
  renderReader()
  await screen.findByRole('heading', { name: story.title })
  expect(screen.getByRole('link', { name: /Read next: A related life/ })).toHaveAttribute('href', '/stories/a-related-life')
})

it.each([0.9, 1])('previews drafts without inheriting or changing a saved reading position at %s progress', async progress => {
  useStoryStore.getState().saveStory(story)
  useStoryStore.getState().savePosition(story.id, { paragraphId: 'milk-p03', progress, revision: 1, ...(progress === 1 ? { finishedAt: new Date().toISOString() } : {}) })
  const initialState = localStorage.getItem(STORY_STATE_STORAGE_KEY)
  const view = render(<MemoryRouter><StoryReadingView story={story} catalog={catalog} backTo="/stories/drafts" hash="" preview /></MemoryRouter>)
  await waitFor(() => expect(screen.getByRole('article')).toHaveFocus())
  expect(documentScroll.getTop()).toBe(0)
  expect(screen.getByRole('progressbar', { name: 'Reading progress' })).toHaveAttribute('aria-valuenow', '0')
  expect(screen.queryByRole('button', { name: /save story|story from Saved|finish story/i })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Reading appearance' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Read next:/ })).toHaveAttribute('href', '/stories/drafts/an-open-kitchen')
  act(() => {
    documentScroll.setTop(1800)
    mocks.settled.forEach(callback => callback())
    fireEvent(window, new Event('pagehide'))
  })
  view.unmount()
  expect(localStorage.getItem(STORY_STATE_STORAGE_KEY)).toBe(initialState)
})

it('keeps a contents choice when initial fonts finish loading after the choice', async () => {
  let finishLoadingFonts!: () => void
  const ready = new Promise<void>(resolve => { finishLoadingFonts = resolve })
  const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts')
  Object.defineProperty(document, 'fonts', { configurable: true, value: { ready } })
  mocks.loadStory.mockResolvedValue({
    ...story,
    sections: [
      { id: 'the-beginning', title: 'The beginning', startParagraphId: 'milk-p01' },
      { id: 'the-answer', title: 'An unexpected answer', startParagraphId: 'milk-p02' },
    ],
  } satisfies Story)
  const user = userEvent.setup()
  try {
    renderReader()
    await user.click(await screen.findByRole('button', { name: 'Story contents' }))
    await user.click(screen.getByRole('button', { name: 'An unexpected answer' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'An unexpected answer' })).toHaveFocus())
    expect(documentScroll.getTop()).toBe(1244)
    await act(async () => { finishLoadingFonts(); await ready })
    await waitFor(() => expect(useStoryStore.getState().positions[story.id]?.paragraphId).toBe('milk-p02'))
    expect(documentScroll.getTop()).toBe(1244)
  } finally {
    finishLoadingFonts()
    if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts)
    else Reflect.deleteProperty(document, 'fonts')
  }
})

it('resumes the same paragraph after a metadata-only edition refresh', async () => {
  useStoryStore.getState().savePosition(story.id, { paragraphId: 'milk-p02', progress: 0.4, revision: 1 })
  mocks.loadStory.mockResolvedValue({ ...story, metadataRevision: 2, editorialNote: 'A more specific edition reference.' } satisfies Story)
  renderReader()
  await screen.findByRole('heading', { name: story.title })
  await waitFor(() => expect(documentScroll.getTop()).toBe(1304))
  expect(useStoryStore.getState().positions[story.id]).toMatchObject({ paragraphId: 'milk-p02', revision: 1 })
})

it('opens, follows and leaves editorial drafts through their real wrapper without entering published story routes', async () => {
  const secondDraft: Story = { ...story, ...nextStory }
  mocks.loadStoryDraftLibrary.mockResolvedValue({ catalog, stories: [story, secondDraft] })
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={[`/stories/drafts/${story.id}`]}>
    <Routes>
      <Route path="/stories/drafts" element={<StoryDraftPreview />} />
      <Route path="/stories/drafts/:storyId" element={<StoryDraftPreview />} />
      <Route path="/stories/:storyId" element={<h1>Published route</h1>} />
    </Routes>
  </MemoryRouter>)
  await screen.findByRole('heading', { name: story.title })
  expect(screen.getByRole('complementary', { name: 'Editorial preview' })).toHaveTextContent('Unpublished reading')
  const next = screen.getByRole('link', { name: /Read next: An open kitchen/ })
  expect(next).toHaveAttribute('href', '/stories/drafts/an-open-kitchen')
  await user.click(next)
  await screen.findByRole('heading', { name: nextStory.title })
  expect(screen.queryByRole('heading', { name: 'Published route' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('link', { name: 'Return to stories' }))
  expect(await screen.findByRole('heading', { name: 'Read the next editions' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: new RegExp(story.title) })).toHaveAttribute('href', `/stories/drafts/${story.id}`)
  expect(useStoryStore.getState().saved).toEqual({})
  expect(useStoryStore.getState().positions).toEqual({})
})

it('opens story text while optional catalog metadata is still pending', async () => {
  let resolveCatalog!: (value: StoryCatalog) => void
  mocks.loadStoryCatalog.mockReturnValue(new Promise<StoryCatalog>(resolve => { resolveCatalog = resolve }))
  renderReader()
  expect(await screen.findByRole('heading', { name: story.title, level: 1 })).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /Read next:/ })).not.toBeInTheDocument()
  await act(async () => resolveCatalog(catalog))
  expect(screen.getByRole('link', { name: /Read next:/ })).toBeInTheDocument()
})

it('localizes reader controls while keeping original English prose identified', async () => {
  useLocaleStore.setState({ locale: 'pa' })
  const user = userEvent.setup()
  renderReader()
  const heading = await screen.findByRole('heading', { name: story.title, level: 1 })
  expect(heading.closest('article')).toHaveAttribute('lang', 'en')
  await user.click(screen.getByRole('button', { name: 'ਪਾਠ ਦੀ ਦਿੱਖ' }))
  expect(screen.getByRole('slider', { name: 'ਲਿਖਤ ਦਾ ਆਕਾਰ' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'ਗੂੜ੍ਹਾ' })).toBeInTheDocument()
})

it('identifies an older downloaded edition without swapping the active text', async () => {
  mocks.loadStoryCatalog.mockResolvedValue({ ...catalog, stories: [{ ...story, revision: story.revision + 1 }, nextStory] })
  renderReader()
  expect(await screen.findByRole('heading', { name: story.title, level: 1 })).toBeInTheDocument()
  expect(screen.getByText('You are reading a downloaded edition. A newer edition will be used after it downloads and you reopen this story.')).toBeInTheDocument()
  expect(screen.getByText(story.paragraphs[0].text)).toBeInTheDocument()
})
