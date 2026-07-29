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

type LibraryJsonLoader = <T>(path: string) => Promise<T>

const DEFAULT_MANIFEST_PATH = '/data/library/manifest.json'

function resolveLibraryAssetPath(path: string) {
  return resolveAppPath(path, import.meta.env.BASE_URL)
}

async function defaultFetchJson<T>(path: string): Promise<T> {
  const response = await fetch(resolveLibraryAssetPath(path))
  if (!response.ok) {
    throw new Error(`Library repository request failed for ${path}: ${response.status}`)
  }

  return await response.json() as T
}

function createIndexMap<T extends { id: string }>(items: T[]) {
  return Object.fromEntries(items.map(item => [item.id, item] as const)) as Record<string, T>
}

let jsonLoader: LibraryJsonLoader = defaultFetchJson
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
    const promise = jsonLoader<LibraryManifest>(DEFAULT_MANIFEST_PATH)
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
        const works = await jsonLoader<LibraryWork[]>(manifest.workCatalogPath)
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
          return jsonLoader<LibrarySearchIndex>(work.searchIndexPath ?? `/data/library/works/${workId}/search-index.json`)
        })
      : loadLibraryManifest().then(manifest => jsonLoader<LibrarySearchIndex>(manifest.searchIndexPath))
  ))
}

export async function loadLibraryPageIndex(workId: string) {
  return loadCached(pageIndexPromises, workId, () => (
    loadLibraryWorkCatalog()
      .then(async catalog => {
        const work = catalog.workById[workId]
        if (!work?.pageIndexPath) throw new Error(`Unknown page-indexed library work: ${workId}`)
        return jsonLoader<LibraryPageIndexEntry[]>(work.pageIndexPath)
      })
  ))
}

export async function loadLibraryEpisodeIndex(workId: string) {
  return loadCached(episodeIndexPromises, workId, () => (
    loadLibraryWorkCatalog()
      .then(async catalog => {
        const work = catalog.workById[workId]
        if (!work?.episodeIndexPath) return []
        return jsonLoader<LibraryEpisodeIndexEntry[]>(work.episodeIndexPath)
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
        return jsonLoader<LibraryPagePayload>(pagePath)
      })
  ))
}

export async function loadLibraryChapterIndex(workId: string) {
  return loadCached(chapterIndexPromises, workId, () => (
    loadLibraryWorkCatalog()
      .then(async catalog => {
        const work = catalog.workById[workId]
        if (!work?.chapterIndexPath) throw new Error(`Unknown chapter-indexed library work: ${workId}`)
        return jsonLoader<LibraryChapterIndexEntry[]>(work.chapterIndexPath)
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
        return jsonLoader<LibraryChapterPayload>(chapterPath)
      })
  ))
}
