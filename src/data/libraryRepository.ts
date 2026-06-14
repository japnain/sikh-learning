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
let searchIndexPromise: Promise<LibrarySearchIndex> | null = null
const pageIndexPromises = new Map<string, Promise<LibraryPageIndexEntry[]>>()
const episodeIndexPromises = new Map<string, Promise<LibraryEpisodeIndexEntry[]>>()
const pagePromises = new Map<string, Promise<LibraryPagePayload | null>>()
const chapterIndexPromises = new Map<string, Promise<LibraryChapterIndexEntry[]>>()
const chapterPromises = new Map<string, Promise<LibraryChapterPayload | null>>()

export function configureLibraryRepositoryLoader(loader: LibraryJsonLoader | null) {
  jsonLoader = loader ?? defaultFetchJson
  resetLibraryRepositoryCache()
}

export function resetLibraryRepositoryCache() {
  manifestPromise = null
  workCatalogPromise = null
  searchIndexPromise = null
  pageIndexPromises.clear()
  episodeIndexPromises.clear()
  pagePromises.clear()
  chapterIndexPromises.clear()
  chapterPromises.clear()
}

export async function loadLibraryManifest() {
  if (!manifestPromise) {
    manifestPromise = jsonLoader<LibraryManifest>(DEFAULT_MANIFEST_PATH)
  }
  return manifestPromise
}

export async function loadLibraryWorkCatalog() {
  if (!workCatalogPromise) {
    workCatalogPromise = loadLibraryManifest()
      .then(async manifest => {
        const works = await jsonLoader<LibraryWork[]>(manifest.workCatalogPath)
        return {
          works,
          workById: createIndexMap(works),
        } satisfies LibraryWorkCatalog
      })
  }

  return workCatalogPromise
}

export async function loadLibrarySearchIndex() {
  if (!searchIndexPromise) {
    searchIndexPromise = loadLibraryManifest()
      .then(manifest => jsonLoader<LibrarySearchIndex>(manifest.searchIndexPath))
  }

  return searchIndexPromise
}

export async function loadLibraryPageIndex(workId: string) {
  if (!pageIndexPromises.has(workId)) {
    const promise = loadLibraryWorkCatalog()
      .then(async catalog => {
        const work = catalog.workById[workId]
        if (!work?.pageIndexPath) throw new Error(`Unknown page-indexed library work: ${workId}`)
        return jsonLoader<LibraryPageIndexEntry[]>(work.pageIndexPath)
      })
    pageIndexPromises.set(workId, promise)
  }

  return pageIndexPromises.get(workId)!
}

export async function loadLibraryEpisodeIndex(workId: string) {
  if (!episodeIndexPromises.has(workId)) {
    const promise = loadLibraryWorkCatalog()
      .then(async catalog => {
        const work = catalog.workById[workId]
        if (!work?.episodeIndexPath) return []
        return jsonLoader<LibraryEpisodeIndexEntry[]>(work.episodeIndexPath)
      })
    episodeIndexPromises.set(workId, promise)
  }

  return episodeIndexPromises.get(workId)!
}

export async function loadLibraryPage(workId: string, pageNumber: number) {
  const key = `${workId}:${pageNumber}`
  if (!pagePromises.has(key)) {
    const promise = loadLibraryWorkCatalog()
      .then(async catalog => {
        const work = catalog.workById[workId]
        if (!work?.pagePathTemplate) return null
        const pagePath = work.pagePathTemplate.replace(':pageNumber', String(pageNumber))
        return jsonLoader<LibraryPagePayload>(pagePath)
      })
    pagePromises.set(key, promise)
  }

  return pagePromises.get(key)!
}

export async function loadLibraryChapterIndex(workId: string) {
  if (!chapterIndexPromises.has(workId)) {
    const promise = loadLibraryWorkCatalog()
      .then(async catalog => {
        const work = catalog.workById[workId]
        if (!work?.chapterIndexPath) throw new Error(`Unknown chapter-indexed library work: ${workId}`)
        return jsonLoader<LibraryChapterIndexEntry[]>(work.chapterIndexPath)
      })
    chapterIndexPromises.set(workId, promise)
  }

  return chapterIndexPromises.get(workId)!
}

export async function loadLibraryChapter(workId: string, chapterId: string) {
  const key = `${workId}:${chapterId}`
  if (!chapterPromises.has(key)) {
    const promise = loadLibraryWorkCatalog()
      .then(async catalog => {
        const work = catalog.workById[workId]
        if (!work?.chapterPathTemplate) return null
        const chapterPath = work.chapterPathTemplate.replace(':chapterId', chapterId)
        return jsonLoader<LibraryChapterPayload>(chapterPath)
      })
    chapterPromises.set(key, promise)
  }

  return chapterPromises.get(key)!
}
