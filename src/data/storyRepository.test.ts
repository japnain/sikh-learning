import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Story, StoryCatalog, StorySummary } from '../types/stories'
import {
  configureStoryRepositoryLoader, downloadStoryCollection, getOfflineStoryIds, getStoredStoryIds, loadStory,
  loadStoryCatalog, removeOfflineStories, resetStoryRepositoryCache, STORY_CACHE_KEY, STORY_REQUEST_TIMEOUT_MS, StoryStorageError,
} from './storyRepository'
import { parseCatalog, parseStory, sameStorySummary, storyPublicationErrors, storyReplacementErrors, validateStory } from './storyValidation'
import { clearDiagnosticHistory, getDiagnosticHistory } from '../utils/diagnostics'

const first: Story = {
  id: 'a-shared-meal', title: 'A shared meal', subtitle: 'A place for everyone', description: 'A short reading.',
  collectionId: 'everyday-wisdom', themes: ['Equality'], people: ['Guru Nanak'], artwork: 'bowl',
  wordCount: 6, readingMinutes: 1, revision: 1, language: 'en', accountType: 'Traditional sakhi',
  paragraphs: [{ id: 'p1', text: 'People gathered and shared a meal.' }],
  sources: [{ title: 'The Sikh Religion', author: 'M. A. Macauliffe', year: 1909, reference: 'Volume I, chapter 1, pp. 1–4.', url: 'https://archive.org/details/sikhreligionits01macauoft' }],
  accountNote: 'A traditional account, retold with its character as tradition made explicit.',
  editorialNote: 'An original English retelling based on the cited source, without invented dialogue.',
  rights: { status: 'original-retelling', basis: 'public-domain-source', note: 'Original wording based on a 1909 publication.' },
}
const second: Story = { ...first, id: 'an-open-door', title: 'An open door', collectionId: 'courage', artwork: 'doorway' }
function summary(story: Story): StorySummary {
  return {
    id: story.id, title: story.title, subtitle: story.subtitle, description: story.description,
    collectionId: story.collectionId, themes: story.themes, people: story.people, artwork: story.artwork,
    wordCount: story.wordCount, readingMinutes: story.readingMinutes, revision: story.revision,
  }
}
const firstSummary = summary(first)
const secondSummary = summary(second)
const catalog: StoryCatalog = {
  version: 1,
  collections: [
    { id: 'everyday-wisdom', title: 'Everyday wisdom', description: 'Begin here.', artwork: 'bowl' },
    { id: 'courage', title: 'Courage', description: 'Stories of courage.', artwork: 'doorway' },
  ],
  stories: [firstSummary, secondSummary],
}

function installLoader(overrides: Record<string, unknown> = {}) {
  const resources: Record<string, unknown> = {
    '/data/stories/catalog.json': catalog,
    '/data/stories/a-shared-meal.json': first,
    '/data/stories/an-open-door.json': second,
    ...overrides,
  }
  const loader = vi.fn(async (resourcePath: string) => {
    if (!(resourcePath in resources)) throw new Error('Not found')
    return structuredClone(resources[resourcePath])
  })
  configureStoryRepositoryLoader(loader)
  return loader
}

beforeEach(() => {
  localStorage.clear()
  clearDiagnosticHistory()
  installLoader()
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  configureStoryRepositoryLoader(null)
})

describe('story repository', () => {
  it('deduplicates catalogue and story requests', async () => {
    const loader = installLoader()
    const [a, b] = await Promise.all([loadStory('a-shared-meal'), loadStory('a-shared-meal'), loadStoryCatalog()])
    expect(a).toEqual(first)
    expect(b).toEqual(first)
    expect(loader.mock.calls.map(([path]) => path)).toEqual(['/data/stories/catalog.json', '/data/stories/a-shared-meal.json'])
  })

  it('retries failed catalogue and story requests', async () => {
    const loader = vi.fn()
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce(catalog)
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce(first)
    configureStoryRepositoryLoader(loader)
    await expect(loadStoryCatalog()).rejects.toThrow('Offline')
    await expect(loadStory('a-shared-meal')).rejects.toThrow('Offline')
    await expect(loadStory('a-shared-meal')).resolves.toEqual(first)
    expect(loader).toHaveBeenCalledTimes(4)
  })

  it('downloads only a selected collection, then reads it after a simulated restart without a network', async () => {
    const progress = vi.fn()
    await expect(downloadStoryCollection('everyday-wisdom', progress)).resolves.toEqual({ downloaded: 1, total: 1 })
    expect(progress.mock.calls).toEqual([[0, 1], [1, 1]])
    expect(getOfflineStoryIds()).toEqual(['a-shared-meal'])
    const offline = vi.fn(async () => { throw new Error('Offline') })
    configureStoryRepositoryLoader(offline)
    await expect(loadStoryCatalog()).resolves.toEqual(catalog)
    await expect(loadStory('a-shared-meal')).resolves.toEqual(first)
    expect(offline).toHaveBeenCalledTimes(1)
    await expect(loadStory('an-open-door')).rejects.toThrow('Offline')
  })

  it('uses the app base path for both catalogue and text fetches', async () => {
    vi.stubEnv('BASE_URL', '/naamras/')
    configureStoryRepositoryLoader(null)
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => url.endsWith('catalog.json') ? catalog : first,
    }))
    vi.stubGlobal('fetch', fetchMock)
    await loadStory('a-shared-meal')
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/naamras/data/stories/catalog.json', '/naamras/data/stories/a-shared-meal.json',
    ])
  })

  it('does not request unsafe paths or unknown story ids', async () => {
    const loader = installLoader()
    for (const id of ['../secret', '/a-shared-meal', 'constructor', 'a%2fsecret', 'missing']) {
      await expect(loadStory(id)).resolves.toBeNull()
    }
    expect(loader.mock.calls.map(([path]) => path)).toEqual(['/data/stories/catalog.json'])
  })

  it('rejects malformed metadata, duplicate identifiers and text that differs from its summary', async () => {
    installLoader({ '/data/stories/catalog.json': { ...catalog, stories: [firstSummary, firstSummary] } })
    await expect(loadStoryCatalog()).rejects.toThrow('collection could not be read')
    installLoader({ '/data/stories/a-shared-meal.json': { ...first, paragraphs: [{ id: 'p1', text: 'An uncounted replacement.' }] } })
    await expect(loadStory('a-shared-meal')).rejects.toThrow('story could not be read')
    expect(getOfflineStoryIds()).toEqual([])
  })

  it('ignores corrupt caches and does not treat old revisions as current offline text', async () => {
    localStorage.setItem(STORY_CACHE_KEY, '{broken')
    expect(getOfflineStoryIds()).toEqual([])
    await loadStory('a-shared-meal')
    expect(getOfflineStoryIds()).toEqual(['a-shared-meal'])
    const nextCatalog = { ...catalog, stories: [{ ...firstSummary, revision: 2 }, secondSummary] }
    installLoader({ '/data/stories/catalog.json': nextCatalog })
    await loadStoryCatalog()
    expect(getOfflineStoryIds()).toEqual([])
    expect(JSON.parse(localStorage.getItem(STORY_CACHE_KEY)!).stories[first.id]).toEqual(first)
  })

  it('keeps online reading usable but never claims a download succeeded when storage is blocked', async () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new DOMException('Quota exceeded', 'QuotaExceededError') })
    await expect(loadStory('a-shared-meal')).resolves.toEqual(first)
    expect(getOfflineStoryIds()).toEqual([])
    await expect(downloadStoryCollection()).rejects.toBeInstanceOf(StoryStorageError)
    expect(getOfflineStoryIds()).toEqual([])
  })

  it('detects silent storage write failures too', async () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {})
    await expect(downloadStoryCollection()).rejects.toBeInstanceOf(StoryStorageError)
    expect(getOfflineStoryIds()).toEqual([])
  })

  it('reports only completed files when a collection download is interrupted, and can retry', async () => {
    const loader = installLoader()
    loader.mockImplementation(async (resourcePath: string) => {
      if (resourcePath.endsWith('an-open-door.json')) throw new Error('Connection lost')
      return structuredClone(resourcePath.endsWith('catalog.json') ? catalog : first)
    })
    const progress = vi.fn()
    await expect(downloadStoryCollection(undefined, progress)).rejects.toThrow('Connection lost')
    expect(progress.mock.calls).toEqual([[0, 2], [1, 2]])
    expect(getOfflineStoryIds()).toEqual(['a-shared-meal'])
    installLoader()
    await expect(downloadStoryCollection()).resolves.toEqual({ downloaded: 2, total: 2 })
  })

  it('removes durable text and in-memory copies without touching saved reading state', async () => {
    localStorage.setItem('naamras-story-state-v1', 'saved elsewhere')
    await downloadStoryCollection()
    removeOfflineStories()
    expect(getOfflineStoryIds()).toEqual([])
    expect(localStorage.getItem('naamras-story-state-v1')).toBe('saved elsewhere')
    configureStoryRepositoryLoader(async () => { throw new Error('Offline') })
    await expect(loadStory('a-shared-meal')).rejects.toThrow('Offline')
  })

  it('rejects an unavailable collection before requesting its stories', async () => {
    const loader = installLoader()
    await expect(downloadStoryCollection('missing')).rejects.toThrow('collection could not be found')
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('does not mistake failed cache removal for success', async () => {
    await downloadStoryCollection()
    vi.spyOn(localStorage, 'removeItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError') })
    expect(() => removeOfflineStories()).toThrow(StoryStorageError)
    expect(getOfflineStoryIds()).toHaveLength(2)
    resetStoryRepositoryCache()
  })

  it('does not restore removed downloads when an earlier request finishes later', async () => {
    let finishStory!: (story: Story) => void
    let announceRequest!: () => void
    const enteredStoryRequest = new Promise<void>((resolve) => { announceRequest = resolve })
    configureStoryRepositoryLoader(async (resourcePath) => {
      if (resourcePath.endsWith('catalog.json')) return catalog
      announceRequest()
      return new Promise<Story>((resolve) => { finishStory = resolve })
    })
    const download = downloadStoryCollection('everyday-wisdom')
    await enteredStoryRequest
    removeOfflineStories()
    finishStory(first)
    await expect(download).rejects.toThrow('cancelled')
    expect(getOfflineStoryIds()).toEqual([])
    expect(localStorage.getItem(STORY_CACHE_KEY)).toBeNull()
  })

  it('refreshes metadata-only editions without changing the reading revision or saved positions', async () => {
    await loadStory(first.id)
    const readingState = JSON.stringify({ version: 1, positions: { [first.id]: { paragraphId: 'p1', revision: 1, progress: 0.5 } } })
    localStorage.setItem('naamras-story-state-v1', readingState)
    const revised: Story = { ...first, metadataRevision: 1, editorialNote: 'Updated source notes; unchanged reading paragraphs.' }
    const revisedCatalog = { ...catalog, stories: [{ ...firstSummary, metadataRevision: 1 }, secondSummary] }
    const loader = installLoader({ '/data/stories/catalog.json': revisedCatalog, '/data/stories/a-shared-meal.json': revised })
    // Saved text opens immediately; a completed catalog refresh discovers the
    // new metadata edition for subsequent opens.
    await expect(loadStory(first.id)).resolves.toEqual(first)
    await loadStoryCatalog()
    await vi.waitFor(() => expect(JSON.parse(localStorage.getItem(STORY_CACHE_KEY)!).stories[first.id]).toEqual(revised))
    const result = await loadStory(first.id)
    expect(result).toEqual(revised)
    expect(loader.mock.calls.map(([path]) => path)).toEqual(['/data/stories/catalog.json', '/data/stories/a-shared-meal.json'])
    expect(result?.revision).toBe(1)
    expect(localStorage.getItem('naamras-story-state-v1')).toBe(readingState)
    configureStoryRepositoryLoader(async () => { throw new Error('Offline') })
    await expect(loadStory(first.id)).resolves.toEqual(revised)
  })

  it('opens a downloaded story immediately even while the catalog request hangs', async () => {
    await downloadStoryCollection('everyday-wisdom')
    vi.useFakeTimers()
    configureStoryRepositoryLoader(() => new Promise(() => {}))
    await expect(loadStory(first.id)).resolves.toEqual(first)
    expect(getOfflineStoryIds()).toContain(first.id)
    await vi.advanceTimersByTimeAsync(STORY_REQUEST_TIMEOUT_MS)
    await expect(loadStoryCatalog()).resolves.toEqual(catalog)
  })

  it('bounds a cold request and permits retry after a timeout', async () => {
    vi.useFakeTimers()
    const loader = vi.fn<(path: string, signal?: AbortSignal) => Promise<unknown>>(() => new Promise<unknown>(() => {}))
    configureStoryRepositoryLoader(loader)
    const expected = expect(loadStory(first.id)).rejects.toThrow('timed out')
    await vi.advanceTimersByTimeAsync(STORY_REQUEST_TIMEOUT_MS)
    await expected
    expect(loader.mock.calls[0]?.[1]?.aborted).toBe(true)
    installLoader()
    await expect(loadStory(first.id)).resolves.toEqual(first)
  })

  it('migrates coherent v1 downloads and keeps the previous edition readable while new text hangs', async () => {
    localStorage.setItem(STORY_CACHE_KEY, JSON.stringify({ version: 1, catalog, stories: { [first.id]: first } }))
    const revisedCatalog = { ...catalog, stories: [{ ...firstSummary, revision: 2 }, secondSummary] }
    vi.useFakeTimers()
    const loader = vi.fn(async (resourcePath: string) => resourcePath.endsWith('catalog.json')
      ? revisedCatalog : new Promise<never>(() => {}))
    configureStoryRepositoryLoader(loader)
    await expect(loadStory(first.id)).resolves.toEqual(first)
    await loadStoryCatalog()
    expect(JSON.parse(localStorage.getItem(STORY_CACHE_KEY)!).version).toBe(2)
    expect(getOfflineStoryIds()).toEqual([]) // Previous text is not labelled as the current edition.
    expect(getStoredStoryIds()).toEqual([first.id]) // Cleanup remains available for retained older text.
    await expect(loadStory(first.id)).resolves.toEqual(first)
    await vi.advanceTimersByTimeAsync(STORY_REQUEST_TIMEOUT_MS)
    configureStoryRepositoryLoader(async () => { throw new Error('Offline') })
    await expect(loadStory(first.id)).resolves.toEqual(first)
  })

  it('commits replacement text atomically after validation and keeps other downloads', async () => {
    await downloadStoryCollection()
    const revised = { ...first, revision: 2 }
    const revisedCatalog = { ...catalog, stories: [summary(revised), secondSummary] }
    let finish!: (value: unknown) => void
    configureStoryRepositoryLoader(async resourcePath => resourcePath.endsWith('catalog.json')
      ? revisedCatalog : new Promise(resolve => { finish = resolve }))
    await loadStoryCatalog()
    await expect(loadStory(first.id)).resolves.toEqual(first)
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'))
    expect(JSON.parse(localStorage.getItem(STORY_CACHE_KEY)!).stories[first.id]).toEqual(first)
    finish(revised)
    await vi.waitFor(() => expect(JSON.parse(localStorage.getItem(STORY_CACHE_KEY)!).stories[first.id]).toEqual(revised))
    expect(getOfflineStoryIds()).toEqual([first.id, second.id])
    configureStoryRepositoryLoader(async () => { throw new Error('Offline') })
    await expect(loadStory(first.id)).resolves.toEqual(revised)
    await expect(loadStory(second.id)).resolves.toEqual(second)
  })

  it('does not replace a saved edition with malformed text or report a current download as complete', async () => {
    await downloadStoryCollection('everyday-wisdom')
    installLoader({ '/data/stories/catalog.json': { ...catalog, stories: [{ ...firstSummary, revision: 2 }, secondSummary] },
      '/data/stories/a-shared-meal.json': { ...first, revision: 2, wordCount: 9000 } })
    await loadStoryCatalog()
    await expect(loadStory(first.id)).resolves.toEqual(first)
    await expect(downloadStoryCollection('everyday-wisdom')).rejects.toThrow('story could not be read')
    expect(getDiagnosticHistory()).toEqual([])
    expect(getOfflineStoryIds()).toEqual([])
    expect(JSON.parse(localStorage.getItem(STORY_CACHE_KEY)!).stories[first.id]).toEqual(first)
    configureStoryRepositoryLoader(async () => { throw new Error('Offline') })
    await expect(loadStory(first.id)).resolves.toEqual(first)
  })

  it('preserves the old durable edition if storage refuses a valid update', async () => {
    await downloadStoryCollection('everyday-wisdom')
    const revised = { ...first, revision: 2 }
    installLoader({ '/data/stories/catalog.json': { ...catalog, stories: [summary(revised), secondSummary] }, '/data/stories/a-shared-meal.json': revised })
    await loadStoryCatalog()
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new DOMException('Quota exceeded', 'QuotaExceededError') })
    await expect(downloadStoryCollection('everyday-wisdom')).rejects.toBeInstanceOf(StoryStorageError)
    expect(JSON.parse(localStorage.getItem(STORY_CACHE_KEY)!).stories[first.id]).toEqual(first)
    await expect(loadStory(first.id)).resolves.toEqual(first)
    expect(getOfflineStoryIds()).toEqual([])
  })

  it('records unavailable cold content once without logging a saved-edition refresh failure', async () => {
    configureStoryRepositoryLoader(async () => { throw new Error('private content URL') })
    await expect(loadStory(first.id)).rejects.toThrow()
    expect(getDiagnosticHistory()).toHaveLength(1)
    expect(getDiagnosticHistory()[0].count).toBe(1)
    expect(JSON.stringify(getDiagnosticHistory())).not.toContain('private content URL')
  })

  it('does not restore an old download when a background edition refresh finishes after removal', async () => {
    await downloadStoryCollection('everyday-wisdom')
    const revised = { ...first, revision: 2 }
    let finish!: (value: unknown) => void
    configureStoryRepositoryLoader(async resourcePath => resourcePath.endsWith('catalog.json')
      ? { ...catalog, stories: [summary(revised), secondSummary] } : new Promise(resolve => { finish = resolve }))
    await loadStoryCatalog()
    await loadStory(first.id)
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'))
    removeOfflineStories()
    finish(revised)
    await Promise.resolve()
    await Promise.resolve()
    expect(localStorage.getItem(STORY_CACHE_KEY)).toBeNull()
    expect(getOfflineStoryIds()).toEqual([])
  })

  it('rejects a related story missing from the active published catalog', async () => {
    installLoader({ '/data/stories/a-shared-meal.json': { ...first, relatedStoryIds: ['unpublished-reading'] } })
    await expect(loadStory(first.id)).rejects.toThrow('story could not be read')
    expect(getOfflineStoryIds()).toEqual([])
  })
})

function sourcedFeature(): Story {
  return {
    ...structuredClone(first), metadataRevision: 1,
    paragraphs: [...first.paragraphs, { id: 'p2', text: 'Another table welcomed the passing travellers.' }],
    wordCount: 12,
    sources: [
      { ...first.sources[0], id: 'macauliffe', role: 'narrative', workDate: '1909', edition: 'Original 1909 edition', locator: { kind: 'chapter', value: 'I, 1' } },
      { id: 'modern-context', title: 'Contextual scholarship', author: 'A researcher', year: 2026, reference: 'Section: The shared meal and its context.', url: 'https://example.org/context', role: 'context' },
      { id: 'textual-anchor', title: 'Primary text', author: 'The original composer', reference: 'Ang 967, third stanza.', url: 'https://example.org/primary-text', role: 'textual-anchor', workDate: 'Sixteenth-century composition', locator: { kind: 'ang', value: '967' } },
    ],
    rights: {
      ...first.rights,
      records: [
        { id: 'source-edition', material: 'source-text', basis: 'public-domain', sourceIds: ['macauliffe'], evidence: 'The original 1909 edition; modern contextual wording is not republished.' },
        { id: 'english-prose', material: 'retelling', basis: 'original', evidence: 'New English prose prepared for this reading.' },
      ],
    },
    sections: [
      { id: 'the-meal', title: 'The meal', startParagraphId: 'p1' },
      { id: 'the-road', title: 'The road', startParagraphId: 'p2' },
    ],
    relatedStoryIds: [second.id],
    editorial: { credit: 'Naamras editorial draft', historyReview: { status: 'pending' }, englishReview: { status: 'pending' } },
  }
}

describe('shared story validation', () => {
  it('accepts modern research citations and honestly undated textual anchors independently of retelling rights', () => {
    const story = sourcedFeature()
    expect(validateStory(story)).toEqual({ data: story, errors: [] })
    expect(parseStory(first)).toEqual(first)
  })

  it('preserves sections, provenance and review status through download and offline restart', async () => {
    const story = sourcedFeature()
    const featureSummary = { ...firstSummary, wordCount: story.wordCount, metadataRevision: 1 }
    installLoader({ '/data/stories/catalog.json': { ...catalog, featuredStoryId: first.id, stories: [featureSummary, secondSummary] }, '/data/stories/a-shared-meal.json': story })
    await downloadStoryCollection('everyday-wisdom')
    configureStoryRepositoryLoader(async () => { throw new Error('Offline') })
    await expect(loadStory(first.id)).resolves.toEqual(story)
    expect((await loadStoryCatalog()).featuredStoryId).toBe(first.id)
  })

  it('rejects unresolved rights references and unsupported rights declarations', () => {
    const unresolved = sourcedFeature()
    unresolved.rights.records![0].sourceIds = ['not-a-source']
    expect(validateStory(unresolved).errors.join(' ')).toContain('reference named sources')
    const noSourceEvidence = sourcedFeature()
    noSourceEvidence.rights.records = noSourceEvidence.rights.records!.slice(1)
    expect(validateStory(noSourceEvidence).errors.join(' ')).toContain('source-text public-domain evidence')
    expect(parseStory({ ...first, rights: { status: 'licensed-text', basis: 'permission', note: 'Available online.' } })).toBeNull()
  })

  it('requires a specific text permission or open licence rather than an artwork-only licence', () => {
    const story = sourcedFeature()
    story.rights = { status: 'licensed-text', basis: 'open-license', note: 'Test licence fixture.', records: [{ id: 'licensed-translation', material: 'translation', basis: 'open-license', sourceIds: ['macauliffe'], evidence: 'Test fixture evidence.', url: 'https://example.org/license', license: 'CC BY 4.0', attribution: 'Translation by the fixture translator.' }] }
    expect(parseStory(story)?.rights).toEqual(story.rights)
    const missingCredit = structuredClone(story)
    delete missingCredit.rights.records![0].attribution
    expect(parseStory(missingCredit)).toBeNull()
    story.rights.records![0].material = 'artwork'
    expect(validateStory(story).errors.join(' ')).toContain('matching text permission/licence')
  })

  it('does not accept completed review claims without evidence or reviewer details on a pending review', () => {
    const pendingWithReviewer = { ...sourcedFeature(), editorial: { credit: 'A draft', historyReview: { status: 'pending', reviewer: 'Unconfirmed reviewer' }, englishReview: { status: 'pending' } } }
    expect(validateStory(pendingWithReviewer).errors.join(' ')).toContain('pending review cannot claim')
    const completedWithoutEvidence = { ...sourcedFeature(), editorial: { credit: 'A draft', historyReview: { status: 'completed', reviewer: 'Test fixture reviewer', date: '2026-01-01' }, englishReview: { status: 'pending' } } }
    expect(validateStory(completedWithoutEvidence).errors.join(' ')).toContain('completed review requires evidence')
    expect(parseStory({ ...first, scholarApproved: true })).toBeNull()
  })

  it('checks section anchors and order, unique source ids, source years and safe URLs', () => {
    const unordered = sourcedFeature()
    unordered.sections!.reverse()
    expect(parseStory(unordered)).toBeNull()
    const missingAnchor = sourcedFeature()
    missingAnchor.sections![0].startParagraphId = 'missing-paragraph'
    expect(parseStory(missingAnchor)).toBeNull()
    const collision = sourcedFeature()
    collision.sections![0].id = 'p1'
    expect(parseStory(collision)).toBeNull()
    const duplicate = sourcedFeature()
    duplicate.sources[1].id = 'macauliffe'
    expect(parseStory(duplicate)).toBeNull()
    for (const invalidSource of [
      { ...first.sources[0], year: new Date().getFullYear() + 1 },
      { ...first.sources[0], year: 0 },
      { ...first.sources[0], url: 'https://user:secret@example.org/source' },
      { ...first.sources[0], url: 'javascript:alert(1)' },
    ]) expect(parseStory({ ...first, sources: [invalidSource] })).toBeNull()
    expect(parseStory({ ...first, paragraphs: [{ id: 'p1', text: '<script>alert(1)</script>' }] })).toBeNull()
  })

  it('checks featured-story references and consistent unique positions in each series', () => {
    expect(parseCatalog({ ...catalog, featuredStoryId: 'missing' })).toBeNull()
    const part = { id: 'shared-road', title: 'A shared road', order: 1 }
    expect(parseCatalog({ ...catalog, stories: [{ ...firstSummary, series: part }, { ...secondSummary, series: part }] })).toBeNull()
    const withSeries = { ...catalog, featuredStoryId: first.id, stories: [{ ...firstSummary, series: part }, { ...secondSummary, series: { ...part, order: 2 } }] }
    expect(parseCatalog(withSeries)).toEqual(withSeries)
  })

  it('compares equivalent series metadata independently of JSON property order', () => {
    const story = { ...firstSummary, series: { id: 'shared-road', title: 'A shared road', order: 1 } }
    const summary = { ...firstSummary, series: { order: 1, title: 'A shared road', id: 'shared-road' } }
    expect(sameStorySummary(story, summary)).toBe(true)
    expect(sameStorySummary(story, { ...summary, series: { ...summary.series, order: 2 } })).toBe(false)
  })

  it('requires changed text and paragraph anchors to advance the reading revision', () => {
    const metadataOnly = { ...first, metadataRevision: 1, editorialNote: 'More precise source references.' }
    expect(storyReplacementErrors(first, metadataOnly)).toEqual([])
    const changedText = { ...metadataOnly, paragraphs: [{ id: 'p1', text: 'The replacement has different reading text.' }] }
    expect(storyReplacementErrors(first, changedText).join(' ')).toContain('must advance the reading revision')
    const changedAnchor = { ...metadataOnly, paragraphs: [{ ...first.paragraphs[0], id: 'new-anchor' }] }
    expect(storyReplacementErrors(first, changedAnchor).join(' ')).toContain('must advance the reading revision')
    expect(storyReplacementErrors(first, { ...changedText, revision: 2 })).toEqual([])
    expect(storyReplacementErrors({ ...first, revision: 2 }, metadataOnly).join(' ')).toContain('cannot decrease')
    expect(storyReplacementErrors(first, first).join(' ')).toContain('must advance')
  })

  it('keeps legacy offline editions readable while requiring explicit evidence for new packages', () => {
    expect(parseStory(first)).toEqual(first)
    expect(storyPublicationErrors(first)).toHaveLength(3)
    const publication = sourcedFeature()
    publication.sources[1].edition = 'Research edition, 2026'
    publication.sources[2].edition = 'Undated primary-text witness'
    expect(storyPublicationErrors(publication)).toEqual([])
  })
})
