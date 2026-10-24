import type { Story, StoryCatalog, StorySummary } from '../types/stories'
import { isStoryId as isId, parseCatalog, parseStory, parseSummary, sameStorySummary as sameSummary, storyCatalogReferenceErrors, storyReplacementErrors } from './storyValidation'
import { resolveAppPath } from '../utils/basePath'
import { reportProviderFailure } from '../utils/diagnostics'

export const STORY_CACHE_KEY = 'naamras-story-content-v1'
export const STORY_REQUEST_TIMEOUT_MS = 12_000

type JsonLoader = (resourcePath: string, signal?: AbortSignal) => Promise<unknown>
interface StoryCache {
  version: 2
  catalog: StoryCatalog
  stories: Record<string, Story>
  /** The validated summary of each saved edition, independent of newer metadata. */
  downloadedSummaries: Record<string, StorySummary>
}

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)

export class StoryStorageError extends Error {
  constructor() {
    super('Stories could not be saved on this device. Free some storage or allow site storage, then try again.')
    this.name = 'StoryStorageError'
  }
}

function readCache(): StoryCache | null {
  try {
    const raw = globalThis.localStorage?.getItem(STORY_CACHE_KEY)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (!isRecord(value) || ![1, 2].includes(value.version as number) || !isRecord(value.stories)) return null
    if (value.version === 2 && !isRecord(value.downloadedSummaries)) return null
    const catalog = parseCatalog(value.catalog)
    if (!catalog) return null
    const stories: Record<string, Story> = {}
    const downloadedSummaries: Record<string, StorySummary> = {}
    for (const [id, rawStory] of Object.entries(value.stories)) {
      if (!isId(id)) continue
      const story = parseStory(rawStory)
      const summary = value.version === 1
        ? catalog.stories.find(item => item.id === id)
        : parseSummary((value.downloadedSummaries as Record<string, unknown>)[id])
      if (!story || story.id !== id || !summary || summary.id !== id || !sameSummary(story, summary)) continue
      // v1 only ever held a single coherent catalog edition. v2 preserves the
      // summary checked at download time when newer catalog metadata arrives.
      if (value.version === 1 && storyCatalogReferenceErrors(catalog, [story]).length) continue
      stories[id] = story
      downloadedSummaries[id] = summary
    }
    return { version: 2, catalog, stories, downloadedSummaries }
  } catch { return null }
}

function persistCache(catalog: StoryCatalog, story?: Story): boolean {
  try {
    const storage = globalThis.localStorage
    if (!storage) return false
    const previous = readCache()
    const stories = { ...previous?.stories }
    const downloadedSummaries = { ...previous?.downloadedSummaries }
    if (story) {
      const summary = catalog.stories.find(item => item.id === story.id)
      if (!summary || storyCatalogReferenceErrors(catalog, [story]).length) return false
      stories[story.id] = story
      downloadedSummaries[story.id] = summary
    }
    // Catalog and a replacement edition commit together in one storage write.
    // Catalog-only refreshes never discard a previously verified download.
    const encoded = JSON.stringify({ version: 2, catalog, stories, downloadedSummaries } satisfies StoryCache)
    storage.setItem(STORY_CACHE_KEY, encoded)
    return storage.getItem(STORY_CACHE_KEY) === encoded
  } catch { return false }
}

const fetchJson: JsonLoader = async (resourcePath, signal) => {
  const response = await fetch(resolveAppPath(resourcePath, import.meta.env.BASE_URL), { signal })
  if (!response.ok) throw new Error(`Could not load stories (${response.status}). Please try again.`)
  return response.json() as Promise<unknown>
}

let jsonLoader: JsonLoader = fetchJson
let catalogPromise: Promise<StoryCatalog> | undefined
let activeCatalog: StoryCatalog | undefined
let requestGeneration = 0
const storyPromises = new Map<string, Promise<Story | null>>()

async function requestJson(resourcePath: string): Promise<unknown> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      jsonLoader(resourcePath, controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('The story request timed out. Please try again.'))
          controller.abort()
        }, STORY_REQUEST_TIMEOUT_MS)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

/** Clear request memory without deleting anything saved on the device. */
export function resetStoryRepositoryCache(): void {
  requestGeneration += 1
  catalogPromise = undefined
  activeCatalog = undefined
  storyPromises.clear()
}

/** Override the transport for local tooling/tests; passing null restores fetch. */
export function configureStoryRepositoryLoader(loader: JsonLoader | null): void {
  jsonLoader = loader ?? fetchJson
  resetStoryRepositoryCache()
}

export function loadStoryCatalog(): Promise<StoryCatalog> {
  if (!catalogPromise) {
    const generation = requestGeneration
    catalogPromise = (async () => {
      try {
        const catalog = parseCatalog(await requestJson('/data/stories/catalog.json'))
        if (!catalog) throw new Error('The story collection could not be read. Please try again later.')
        if (generation === requestGeneration) {
          activeCatalog = catalog
          persistCache(catalog)
        }
        return catalog
      } catch (error) {
        const cached = readCache()
        if (cached) {
          if (generation === requestGeneration) activeCatalog = cached.catalog
          return cached.catalog
        }
        throw error
      }
    })().catch((error: unknown) => {
      if (generation === requestGeneration) {
        catalogPromise = undefined
        reportProviderFailure('stories', error)
      }
      throw error
    })
  }
  return catalogPromise
}

function loadCurrentStory(id: string, catalog: StoryCatalog, generation: number): Promise<Story | null> {
  if (generation !== requestGeneration) return Promise.reject(new Error('The offline story request was cancelled.'))
  const summary = catalog.stories.find(item => item.id === id)
  if (!summary) return Promise.resolve(null)
  const cached = readCache()?.stories[id]
  if (cached && sameSummary(cached, summary)) return Promise.resolve(cached)
  const pending = storyPromises.get(id)
  if (pending) return pending
  const promise = (async () => {
    const story = parseStory(await requestJson(`/data/stories/${id}.json`))
    if (!story || storyCatalogReferenceErrors(catalog, [story]).length) throw new Error('This story could not be read. Please try again later.')
    if (cached && storyReplacementErrors(cached, story).length) throw new Error('The updated story edition could not be verified. Your downloaded edition is still available.')
    if (generation === requestGeneration) persistCache(catalog, story)
    return story
  })().catch((error: unknown) => {
    if (generation === requestGeneration) {
      storyPromises.delete(id)
      if (!cached) reportProviderFailure('stories', error)
    }
    throw error
  })
  storyPromises.set(id, promise)
  return promise
}

export function loadStory(id: string): Promise<Story | null> {
  if (!isId(id)) return Promise.resolve(null)
  const generation = requestGeneration
  const downloaded = readCache()?.stories[id]
  if (downloaded) {
    // Previously verified editions open immediately, even after discovering a
    // new catalog. Failed, malformed or timed-out updates leave them untouched.
    void loadStoryCatalog().then(catalog => generation === requestGeneration
      ? loadCurrentStory(id, catalog, generation) : null).catch(() => {})
    return Promise.resolve(downloaded)
  }
  return loadStoryCatalog().then(catalog => loadCurrentStory(id, catalog, generation))
}

/** All verified saved editions, including previous editions retained during refresh. */
export function getStoredStoryIds(): string[] {
  return Object.keys(readCache()?.stories ?? {})
}

/** Current catalog editions verified in durable device storage. */
export function getOfflineStoryIds(): string[] {
  const cached = readCache()
  if (!cached) return []
  return (activeCatalog ?? cached.catalog).stories
    .filter((summary) => cached.stories[summary.id] && sameSummary(cached.stories[summary.id], summary))
    .map((summary) => summary.id)
}

export async function downloadStoryCollection(
  collectionId?: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<{ downloaded: number; total: number }> {
  const generation = requestGeneration
  const ensureActive = () => {
    if (generation !== requestGeneration) throw new Error('The offline story download was cancelled.')
  }
  const catalog = await loadStoryCatalog()
  ensureActive()
  if (collectionId !== undefined && !catalog.collections.some((collection) => collection.id === collectionId)) {
    throw new Error('This story collection could not be found.')
  }
  const summaries = catalog.stories.filter((story) => collectionId === undefined || story.collectionId === collectionId)
  let downloaded = 0
  onProgress?.(downloaded, summaries.length)
  if (!persistCache(catalog)) throw new StoryStorageError()
  for (const summary of summaries) {
    const story = await loadCurrentStory(summary.id, catalog, generation)
    ensureActive()
    if (!story || !persistCache(catalog, story)) throw new StoryStorageError()
    downloaded += 1
    onProgress?.(downloaded, summaries.length)
  }
  const stored = readCache()
  if (!stored || summaries.some((summary) => !stored.stories[summary.id] || !sameSummary(stored.stories[summary.id], summary))) {
    throw new StoryStorageError()
  }
  return { downloaded, total: summaries.length }
}

export function removeOfflineStories(): void {
  try {
    const storage = globalThis.localStorage
    if (!storage) throw new StoryStorageError()
    storage.removeItem(STORY_CACHE_KEY)
    if (storage.getItem(STORY_CACHE_KEY) !== null) throw new StoryStorageError()
    resetStoryRepositoryCache()
  } catch { throw new StoryStorageError() }
}
