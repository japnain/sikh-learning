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
import { isLibraryChapter, readDownloadedLibraryResource, readLibraryDownload, writeLibraryDownload, removeLibraryDownload, requireLibraryDownloadStorage } from './libraryOffline'
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
  manifestPromise = null
  workCatalogPromise = null
  searchIndexPromises.clear()
  pageIndexPromises.clear()
  episodeIndexPromises.clear()
  pagePromises.clear()
  chapterIndexPromises.clear()
  chapterPromises.clear()
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

  return workCatalogPromise
}

export async function loadLibrarySearchIndex(workId?: string) {
  const key = workId ?? '__catalog__'
  return loadCached(searchIndexPromises, key, () => (
    workId
      ? loadLibraryWorkCatalog().then(catalog => {
          const work = catalog.workById[workId]
          if (!work) throw new Error(`Unknown library work: ${workId}`)
          return loadJson<LibrarySearchIndex>(work.searchIndexPath ?? `/data/library/works/${workId}/search-index.json`)
        })
      : loadLibraryManifest().then(manifest => loadJson<LibrarySearchIndex>(manifest.searchIndexPath))
  ))
}

export async function loadLibraryPageIndex(workId: string) {
  return loadCached(pageIndexPromises, workId, () => (
    loadLibraryWorkCatalog()
      .then(async catalog => {
        const work = catalog.workById[workId]
        if (!work?.pageIndexPath) throw new Error(`Unknown page-indexed library work: ${workId}`)
        return loadJson<LibraryPageIndexEntry[]>(work.pageIndexPath)
      })
  ))
}

export async function loadLibraryEpisodeIndex(workId: string) {
  return loadCached(episodeIndexPromises, workId, () => (
    loadLibraryWorkCatalog()
      .then(async catalog => {
        const work = catalog.workById[workId]
        if (!work?.episodeIndexPath) return []
        return loadJson<LibraryEpisodeIndexEntry[]>(work.episodeIndexPath)
      })
  ))
}

export async function loadLibraryPage(workId: string, pageNumber: number) {
  const key = `${workId}:${pageNumber}`
  return loadCached(pagePromises, key, () => (
    loadLibraryWorkCatalog()
      .then(async catalog => {
        const work = catalog.workById[workId]
        if (!work?.pagePathTemplate) return null
        const pagePath = work.pagePathTemplate.replace(':pageNumber', String(pageNumber))
        return loadJson<LibraryPagePayload>(pagePath)
      })
  ))
}

export async function loadLibraryChapterIndex(workId: string) {
  return loadCached(chapterIndexPromises, workId, () => (
    loadLibraryWorkCatalog()
      .then(async catalog => {
        const work = catalog.workById[workId]
        if (!work?.chapterIndexPath) throw new Error(`Unknown chapter-indexed library work: ${workId}`)
        return loadJson<LibraryChapterIndexEntry[]>(work.chapterIndexPath)
      })
  ))
}

export async function loadLibraryChapter(workId: string, chapterId: string) {
  const key = `${workId}:${chapterId}`
  return loadCached(chapterPromises, key, () => (
    Promise.all([
      loadLibraryWorkCatalog(),
      loadLibraryChapterIndex(workId),
    ])
      .then(async ([catalog, chapters]) => {
        const work = catalog.workById[workId]
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
