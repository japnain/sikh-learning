import type {
  LibraryChapterIndexEntry,
  LibraryChapterPayload,
  LibraryEpisodeIndexEntry,
  LibraryManifest,
  LibraryPageIndexEntry,
  LibraryPagePayload,
  LibrarySearchIndex,
  LibraryWork,
  LibraryWorkCatalog,
} from '../types'
import { resolveAppPath } from '../utils/basePath'
import { reportProviderFailure } from '../utils/diagnostics'
import { isLibraryChapter, readDownloadedLibraryResource, readDownloadedLibraryWorks, readLibraryDownload, writeLibraryDownload, removeLibraryDownload, requireLibraryDownloadStorage, resetLibraryDownloadMemory } from './libraryOffline'
export { getLibraryDownloadStatus } from './libraryOffline'
export type { LibraryDownloadStatus } from './libraryOffline'

type LibraryJsonLoader = <T>(path: string, options?: { signal?: AbortSignal }) => Promise<T>

const DEFAULT_MANIFEST_PATH = '/data/library/manifest.json'

function resolveLibraryAssetPath(path: string) {
  return resolveAppPath(path, import.meta.env.BASE_URL)
}

async function defaultFetchJson<T>(path: string, options?: { signal?: AbortSignal }): Promise<T> {
  const response = await fetch(resolveLibraryAssetPath(path), { signal: options?.signal })
  if (!response.ok) {
    throw new Error(`Library repository request failed for ${path}: ${response.status}`)
  }

  return await response.json() as T
}

function createIndexMap<T extends { id: string }>(items: T[]) {
  return Object.fromEntries(items.map(item => [item.id, item] as const)) as Record<string, T>
}

let jsonLoader: LibraryJsonLoader = defaultFetchJson
const REQUEST_TIMEOUT_MS = 15_000

function loadRemoteJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const controller = new AbortController()
    const finish = (complete: () => void) => {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', abort)
      complete()
    }
    const abort = () => { controller.abort(); finish(() => reject(new DOMException('Download cancelled.', 'AbortError'))) }
    const timeout = setTimeout(() => {
      controller.abort()
      finish(() => reject(new Error('The book request timed out. Check your connection and try again.')))
    }, REQUEST_TIMEOUT_MS)
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) { abort(); return }
    jsonLoader<T>(path, { signal: controller.signal }).then(value => finish(() => resolve(value)), error => finish(() => reject(error)))
  }).catch(error => { reportProviderFailure('library', error); throw error })
}

async function loadJson<T>(path: string): Promise<T> {
  // A downloaded book must open without waiting for a weak or hanging connection.
  const downloaded = await readDownloadedLibraryResource<T>(path)
  return downloaded ?? loadRemoteJson<T>(path)
}
let manifestPromise: Promise<LibraryManifest> | null = null
let workCatalogPromise: Promise<LibraryWorkCatalog> | null = null
let discoveryPromise: Promise<LibraryWorkCatalog> | null = null
let discoveryRefreshPromise: Promise<LibraryWorkCatalog> | null = null
let publishedCatalogPromise: Promise<LibraryWorkCatalog> | null = null
let activeDiscovery: LibraryWorkCatalog | null = null
let requestGeneration = 0
const discoveryListeners = new Set<(catalog: LibraryWorkCatalog) => void>()
const searchIndexPromises = new Map<string, Promise<LibrarySearchIndex>>()
const pageIndexPromises = new Map<string, Promise<LibraryPageIndexEntry[]>>()
const episodeIndexPromises = new Map<string, Promise<LibraryEpisodeIndexEntry[]>>()
const pagePromises = new Map<string, Promise<LibraryPagePayload | null>>()
const chapterIndexPromises = new Map<string, Promise<LibraryChapterIndexEntry[]>>()
const chapterPromises = new Map<string, Promise<LibraryChapterPayload | null>>()

function loadCached<K, T>(
  cache: Map<K, Promise<T>>,
  key: K,
  loader: () => Promise<T>
): Promise<T> {
  const cached = cache.get(key)
  if (cached) return cached

  const promise = loader()
  cache.set(key, promise)
  void promise.catch(() => {
    if (cache.get(key) === promise) {
      cache.delete(key)
    }
  })
  return promise
}

export function configureLibraryRepositoryLoader(loader: LibraryJsonLoader | null) {
  jsonLoader = loader ?? defaultFetchJson
  resetLibraryRepositoryCache()
}

export function resetLibraryRepositoryCache() {
  requestGeneration += 1
  manifestPromise = null
  workCatalogPromise = null
  discoveryPromise = null
  discoveryRefreshPromise = null
  publishedCatalogPromise = null
  activeDiscovery = null
  resetLibraryDownloadMemory()
  searchIndexPromises.clear()
  pageIndexPromises.clear()
  episodeIndexPromises.clear()
  pagePromises.clear()
  chapterIndexPromises.clear()
  chapterPromises.clear()
}

function catalogFromWorks(works: LibraryWork[]): LibraryWorkCatalog {
  return { works, workById: createIndexMap(works) }
}

function mergeWorks(preferred: LibraryWork[], fallback: LibraryWork[]): LibraryWork[] {
  const ids = new Set(preferred.map(work => work.id))
  return [...preferred, ...fallback.filter(work => !ids.has(work.id))]
}

export function subscribeLibraryDiscoveryCatalog(listener: (catalog: LibraryWorkCatalog) => void): () => void {
  discoveryListeners.add(listener)
  return () => { discoveryListeners.delete(listener) }
}

function loadPublishedLibraryCatalog(): Promise<LibraryWorkCatalog> {
  if (!publishedCatalogPromise) {
    const promise = (async () => {
      const manifest = await loadRemoteJson<LibraryManifest>(DEFAULT_MANIFEST_PATH)
      if (!manifest || typeof manifest.workCatalogPath !== 'string' || !/^\/data\/library\/[^?#\\]+$/u.test(manifest.workCatalogPath)
        || manifest.workCatalogPath.includes('..')) throw new Error('The book catalog could not be read.')
      const works = await loadRemoteJson<LibraryWork[]>(manifest.workCatalogPath)
      if (!Array.isArray(works) || !works.every(work => work && typeof work.id === 'string' && /^[a-z0-9-]+$/u.test(work.id)
        && typeof work.title === 'string' && typeof work.shortTitle === 'string'
        && typeof work.description === 'string' && typeof work.language === 'string')
        || new Set(works.map(work => work.id)).size !== works.length) throw new Error('The book catalog could not be read.')
      return catalogFromWorks(works)
    })()
    publishedCatalogPromise = promise
    void promise.catch(() => { if (publishedCatalogPromise === promise) publishedCatalogPromise = null })
  }
  return publishedCatalogPromise
}

/** Discovery is independent of the metadata pinned to an offline reading edition. */
export function refreshLibraryDiscoveryCatalog(): Promise<LibraryWorkCatalog> {
  if (!discoveryRefreshPromise) {
    const generation = requestGeneration
    const promise = (async () => {
      const { works } = await loadPublishedLibraryCatalog()
      const catalog = catalogFromWorks(mergeWorks(works, await readDownloadedLibraryWorks()))
      if (generation === requestGeneration) {
        activeDiscovery = catalog
        discoveryPromise = Promise.resolve(catalog)
        discoveryListeners.forEach(listener => listener(catalog))
      }
      return catalog
    })().catch(async error => {
      const downloaded = await readDownloadedLibraryWorks()
      if (generation === requestGeneration) discoveryRefreshPromise = null
      if (downloaded.length) return catalogFromWorks(mergeWorks(activeDiscovery?.works ?? [], downloaded))
      throw error
    })
    discoveryRefreshPromise = promise
  }
  return discoveryRefreshPromise
}

export function loadLibraryDiscoveryCatalog(): Promise<LibraryWorkCatalog> {
  if (!discoveryPromise) {
    const generation = requestGeneration
    const promise = readDownloadedLibraryWorks().then(works => {
      if (generation !== requestGeneration) throw new Error('The book catalog request was cancelled.')
      if (works.length) {
        void refreshLibraryDiscoveryCatalog().catch(() => {})
        return activeDiscovery ?? catalogFromWorks(works)
      }
      return refreshLibraryDiscoveryCatalog()
    })
    discoveryPromise = promise
    void promise.catch(() => { if (discoveryPromise === promise) discoveryPromise = null })
  }
  return discoveryPromise
}

export async function loadLibraryManifest() {
  if (!manifestPromise) {
    const promise = loadJson<LibraryManifest>(DEFAULT_MANIFEST_PATH)
    manifestPromise = promise
    void promise.catch(() => {
      if (manifestPromise === promise) {
        manifestPromise = null
      }
    })
  }
  return manifestPromise
}

export async function loadLibraryWorkCatalog() {
  if (!workCatalogPromise) {
    const promise = loadLibraryManifest()
      .then(async manifest => {
        const works = await loadJson<LibraryWork[]>(manifest.workCatalogPath)
        return {
          works,
          workById: createIndexMap(works),
        } satisfies LibraryWorkCatalog
      })
    workCatalogPromise = promise
    void promise.catch(() => {
      if (workCatalogPromise === promise) {
        workCatalogPromise = null
      }
    })
  }

  const catalog = await workCatalogPromise
  // Readers retain the downloaded edition's metadata, while newly discovered
  // works remain reachable without making cached book opening wait on network.
  return activeDiscovery ? catalogFromWorks(mergeWorks(catalog.works, activeDiscovery.works)) : catalog
}

export async function loadLibraryWork(workId: string): Promise<LibraryWork | undefined> {
  return (await loadLibraryWorkCatalog()).workById[workId]
    ?? (await refreshLibraryDiscoveryCatalog()).workById[workId]
}

export class LibraryEditionUpdateRequiredError extends Error {
  constructor() {
    super('A newer edition of this book is available. Update the downloaded book to open this section. Your saved sections are still available.')
    this.name = 'LibraryEditionUpdateRequiredError'
  }
}

export async function loadLibrarySearchIndex(workId?: string) {
  const key = workId ?? '__catalog__'
  return loadCached(searchIndexPromises, key, () => (
    workId
      ? loadLibraryWork(workId).then(work => {
          if (!work) throw new Error(`Unknown library work: ${workId}`)
          return loadJson<LibrarySearchIndex>(work.searchIndexPath ?? `/data/library/works/${workId}/search-index.json`)
        })
      : loadLibraryManifest().then(manifest => loadJson<LibrarySearchIndex>(manifest.searchIndexPath))
  ))
}

export async function loadLibraryPageIndex(workId: string) {
  return loadCached(pageIndexPromises, workId, () => (
    loadLibraryWork(workId)
      .then(async work => {
        if (!work?.pageIndexPath) throw new Error(`Unknown page-indexed library work: ${workId}`)
        return loadJson<LibraryPageIndexEntry[]>(work.pageIndexPath)
      })
  ))
}

export async function loadLibraryEpisodeIndex(workId: string) {
  return loadCached(episodeIndexPromises, workId, () => (
    loadLibraryWork(workId)
      .then(async work => {
        if (!work?.episodeIndexPath) return []
        return loadJson<LibraryEpisodeIndexEntry[]>(work.episodeIndexPath)
      })
  ))
}

export async function loadLibraryPage(workId: string, pageNumber: number) {
  const key = `${workId}:${pageNumber}`
  return loadCached(pagePromises, key, () => (
    loadLibraryWork(workId)
      .then(async work => {
        if (!work?.pagePathTemplate) return null
        const pagePath = work.pagePathTemplate.replace(':pageNumber', String(pageNumber))
        return loadJson<LibraryPagePayload>(pagePath)
      })
  ))
}

export async function loadLibraryChapterIndex(workId: string) {
  return loadCached(chapterIndexPromises, workId, () => (
    loadLibraryWork(workId)
      .then(async work => {
        if (!work?.chapterIndexPath) throw new Error(`Unknown chapter-indexed library work: ${workId}`)
        return loadJson<LibraryChapterIndexEntry[]>(work.chapterIndexPath)
      })
  ))
}

export async function loadLibraryChapter(workId: string, chapterId: string) {
  const key = `${workId}:${chapterId}`
  return loadCached(chapterPromises, key, () => (
    Promise.all([
      loadLibraryWork(workId),
      loadLibraryChapterIndex(workId),
    ])
      .then(async ([work, chapters]) => {
        if (!work?.chapterPathTemplate) return null

        const exactChapter = chapters.find(chapter => chapter.id === chapterId)
        const legacyEpisodeNumber = chapterId.match(/^episode-(\d{1,3})(?:-|$)/)?.[1]
        const legacyChapter = legacyEpisodeNumber
          ? chapters.find(chapter => chapter.episodeNumber === Number(legacyEpisodeNumber))
          : null
        const retiredFrontMatterVolume = chapterId.match(/^vol-(\d+)-front-matter$/)?.[1]
        const firstPublicationChapter = retiredFrontMatterVolume
          ? chapters.find(chapter => chapter.volume === Number(retiredFrontMatterVolume) && chapter.kind === 'episode')
          : null
        const resolvedChapter = exactChapter ?? legacyChapter ?? firstPublicationChapter

        if (!resolvedChapter) return null
        const chapterPath = work.chapterPathTemplate.replace(':chapterId', resolvedChapter.id)
        const downloaded = await readLibraryDownload(workId)
        if (downloaded && !downloaded.chapters[resolvedChapter.id]) {
          // An uncached chapter URL can now serve a different edition. Verify
          // the published revision before attaching downloaded metadata to it.
          // A failed catalog check must not silently fall back to old metadata.
          const published = (await loadPublishedLibraryCatalog()).workById[workId]
          if (!published || published.revision !== downloaded.work.revision) throw new LibraryEditionUpdateRequiredError()
        }
        const chapter = await loadJson<LibraryChapterPayload>(chapterPath)
        if (!isLibraryChapter(chapter, workId, resolvedChapter.id)) throw new Error('This book section could not be verified. Please try again.')
        return chapter
      })
  ))
}

export async function downloadLibraryWork(workId: string, options: {
  volume?: number
  signal?: AbortSignal
  onProgress?: (downloaded: number, total: number) => void
} = {}) {
  await requireLibraryDownloadStorage()
  const manifest = await loadRemoteJson<LibraryManifest>(DEFAULT_MANIFEST_PATH, options.signal)
  const works = await loadRemoteJson<LibraryWork[]>(manifest.workCatalogPath, options.signal)
  const work = works.find(item => item.id === workId)
  if (!work?.revision || !work.chapterIndexPath || !work.searchIndexPath || !work.chapterPathTemplate) {
    throw new Error('This book does not currently support downloads.')
  }
  const [chapterIndex, searchIndex, previous] = await Promise.all([
    loadRemoteJson<LibraryChapterIndexEntry[]>(work.chapterIndexPath, options.signal),
    loadRemoteJson<LibrarySearchIndex>(work.searchIndexPath, options.signal),
    readLibraryDownload(workId),
  ])
  const requested = chapterIndex.filter(chapter => options.volume === undefined || chapter.volume === options.volume
    || (previous?.work.revision !== work.revision && previous?.chapters[chapter.id]))
  if (!requested.length) throw new Error('This volume is not available.')
  const chapters: Record<string, LibraryChapterPayload> = previous?.work.revision === work.revision ? { ...previous.chapters } : {}
  options.onProgress?.(0, requested.length)
  for (const [index, chapter] of requested.entries()) {
    options.signal?.throwIfAborted()
    const payload = await loadRemoteJson<LibraryChapterPayload>(work.chapterPathTemplate.replace(':chapterId', chapter.id), options.signal)
    if (!isLibraryChapter(payload, workId, chapter.id)) throw new Error('A section could not be verified. The previous download has been kept.')
    chapters[chapter.id] = payload
    options.onProgress?.(index + 1, requested.length)
  }
  options.signal?.throwIfAborted()
  const latest = await readLibraryDownload(workId)
  const mergedChapters = latest?.work.revision === work.revision ? { ...latest.chapters, ...chapters } : chapters
  options.signal?.throwIfAborted()
  await writeLibraryDownload({ schema: 1, savedAt: new Date().toISOString(), manifest, work, chapterIndex, searchIndex, chapters: mergedChapters })
  resetLibraryRepositoryCache()
}

export async function removeDownloadedLibraryWork(workId: string) {
  await removeLibraryDownload(workId)
  resetLibraryRepositoryCache()
}
