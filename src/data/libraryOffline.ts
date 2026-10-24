import type { LibraryChapterIndexEntry, LibraryChapterPayload, LibraryManifest, LibrarySearchIndex, LibraryWork } from '../types'

const CACHE_NAME = 'naamras-library-downloads-v1'
const CACHE_ORIGIN = 'https://naamras.local'
const RESOURCE_PREFIX = '/__naamras-library-downloads/'
const BLOCK_TYPES = new Set(['line', 'heading', 'invocation', 'meter', 'verse', 'paragraph', 'note'])

export interface LibraryDownload {
  schema: 1
  savedAt: string
  manifest: LibraryManifest
  work: LibraryWork
  chapterIndex: LibraryChapterIndexEntry[]
  searchIndex: LibrarySearchIndex
  chapters: Record<string, LibraryChapterPayload>
}

export interface LibraryDownloadStatus {
  workId: string
  revision: string
  downloaded: number
  total: number
  volumes: Array<{ volume: number; downloaded: number; total: number }>
}

const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value))
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const safePath = (value: unknown): value is string => typeof value === 'string' && value.startsWith('/data/library/') && !value.includes('..') && !/[?#\\]/u.test(value)

export function isLibraryChapter(value: unknown, workId: string, chapterId: string): value is LibraryChapterPayload {
  if (!object(value) || value.workId !== workId || value.id !== chapterId || !nonempty(value.title)
    || !Number.isInteger(value.volume) || !Array.isArray(value.pages) || !value.pages.length) return false
  if (value.sourceNotes !== undefined && (!Array.isArray(value.sourceNotes)
    || !value.sourceNotes.every(note => object(note) && Number.isInteger(note.sourcePageNumber) && Number.isInteger(note.printPageNumber)
      && typeof note.sourceHref === 'string' && typeof note.text === 'string'))) return false
  return value.pages.every(page => object(page) && Array.isArray(page.blocks) && page.blocks.every(block => (
    object(block) && nonempty(block.id) && typeof block.type === 'string' && BLOCK_TYPES.has(block.type)
    && typeof block.text === 'string'
    && (block.lines === undefined || (Array.isArray(block.lines) && block.lines.every(line => typeof line === 'string')))
  ))) && value.pages.some(page => (page as { blocks: unknown[] }).blocks.length > 0)
}

export function validateLibraryDownload(value: unknown): value is LibraryDownload {
  if (!object(value) || value.schema !== 1 || !nonempty(value.savedAt) || !Number.isFinite(Date.parse(value.savedAt))
    || !object(value.work) || !object(value.manifest) || !Array.isArray(value.chapterIndex)
    || !object(value.searchIndex) || !object(value.chapters)) return false
  const { work, manifest } = value
  if (!nonempty(work.id) || !/^[a-z0-9-]+$/u.test(work.id) || !nonempty(work.revision)
    || !nonempty(work.title) || !nonempty(work.shortTitle) || typeof work.description !== 'string'
    || !safePath(work.chapterIndexPath) || !safePath(work.chapterPathTemplate) || !safePath(work.searchIndexPath)
    || !safePath(manifest.workCatalogPath) || !safePath(manifest.searchIndexPath) || !nonempty(manifest.version)) return false
  if (work.contributors !== undefined && (!Array.isArray(work.contributors)
    || !work.contributors.every(item => object(item) && nonempty(item.name) && nonempty(item.role)))) return false
  if (work.publications !== undefined && (!Array.isArray(work.publications)
    || !work.publications.every(item => object(item) && nonempty(item.id) && nonempty(item.title) && Number.isInteger(item.volume)
      && (item.episodeRange === undefined || (Array.isArray(item.episodeRange) && item.episodeRange.length === 2 && item.episodeRange.every(Number.isInteger)))))) return false
  if (work.historicalContext !== undefined && typeof work.historicalContext !== 'string') return false
  if (work.historicalContextSources !== undefined && (!Array.isArray(work.historicalContextSources)
    || !work.historicalContextSources.every(item => object(item) && nonempty(item.title) && typeof item.url === 'string' && item.url.startsWith('https://')))) return false
  if (!value.chapterIndex.length || !value.chapterIndex.every(entry => object(entry)
    && nonempty(entry.id) && /^[a-z0-9-]+$/u.test(entry.id) && nonempty(entry.title) && Number.isInteger(entry.volume) && safePath(entry.path))) return false
  if (work.totalChapters !== undefined && work.totalChapters !== value.chapterIndex.length) return false
  const ids = new Set(value.chapterIndex.map(entry => (entry as { id: string }).id))
  if (ids.size !== value.chapterIndex.length) return false
  if (!Array.isArray(value.searchIndex.works) || !Array.isArray(value.searchIndex.chapters)
    || !value.searchIndex.chapters.every(entry => object(entry) && entry.workId === work.id
      && typeof entry.chapterId === 'string' && ids.has(entry.chapterId) && typeof entry.searchText === 'string'
      && typeof entry.title === 'string' && typeof entry.snippet === 'string')) return false
  return Object.entries(value.chapters).every(([id, chapter]) => ids.has(id) && isLibraryChapter(chapter, work.id as string, id)
    && chapter.volume === (value.chapterIndex as LibraryChapterIndexEntry[]).find(entry => entry.id === id)?.volume)
}

function request(workId: string) {
  return new Request(`${CACHE_ORIGIN}${RESOURCE_PREFIX}${encodeURIComponent(workId)}`)
}

export async function requireLibraryDownloadStorage(): Promise<void> {
  if (typeof caches === 'undefined') throw new Error('Downloads are unavailable in this browser. Reading online is still available.')
  try { await caches.open(CACHE_NAME) }
  catch { throw new Error('This browser cannot save downloads right now. Reading online is still available.') }
}

/** Durable reads are always validated. Memory caches may be reset without deleting downloads. */
export async function readLibraryDownload(workId: string): Promise<LibraryDownload | null> {
  if (typeof caches === 'undefined') return null
  try {
    const cache = await caches.open(CACHE_NAME)
    const response = await cache.match(request(workId))
    if (!response) return null
    const value: unknown = await response.json()
    return validateLibraryDownload(value) && value.work.id === workId ? value : null
  } catch { return null }
}

async function readDownloads(): Promise<LibraryDownload[]> {
  if (typeof caches === 'undefined') return []
  try {
    const cache = await caches.open(CACHE_NAME)
    const keys = await cache.keys()
    const downloads = await Promise.all(keys.filter(key => new URL(key.url).pathname.startsWith(RESOURCE_PREFIX))
      .map(key => readLibraryDownload(decodeURIComponent(new URL(key.url).pathname.slice(RESOURCE_PREFIX.length)))))
    return downloads.filter((item): item is LibraryDownload => item !== null)
  } catch { return [] }
}

export async function readDownloadedLibraryResource<T>(path: string): Promise<T | null> {
  const downloads = await readDownloads()
  if (!downloads.length) return null
  if (path === '/data/library/manifest.json') return downloads[0].manifest as T
  if (downloads.some(item => item.manifest.workCatalogPath === path)) return downloads.map(item => item.work) as T
  if (downloads.some(item => item.manifest.searchIndexPath === path)) {
    return { works: downloads.map(item => ({ id: item.work.id, title: item.work.title, aliases: [item.work.shortTitle] })) } as T
  }
  for (const item of downloads) {
    if (path === item.work.chapterIndexPath) return item.chapterIndex as T
    if (path === item.work.searchIndexPath) return item.searchIndex as T
    const chapter = item.chapterIndex.find(entry => entry.path === path
      || item.work.chapterPathTemplate?.replace(':chapterId', entry.id) === path)
    if (chapter && item.chapters[chapter.id]) return item.chapters[chapter.id] as T
  }
  return null
}

/** One atomic cache entry preserves the old download until the replacement is complete. */
export async function writeLibraryDownload(download: LibraryDownload): Promise<void> {
  if (!validateLibraryDownload(download)) throw new Error('The book download could not be verified.')
  if (typeof caches === 'undefined') throw new Error('Downloads are unavailable in this browser. Reading online is still available.')
  try {
    const cache = await caches.open(CACHE_NAME)
    const encoded = JSON.stringify(download)
    await cache.put(request(download.work.id), new Response(encoded, { headers: { 'content-type': 'application/json' } }))
    const persisted = await readLibraryDownload(download.work.id)
    if (!persisted || JSON.stringify(persisted) !== encoded) throw new Error('Verification failed')
  } catch {
    throw new Error('The download could not be saved. Free some device storage and try again.')
  }
}

export async function removeLibraryDownload(workId: string): Promise<void> {
  if (typeof caches === 'undefined') return
  const cache = await caches.open(CACHE_NAME)
  await cache.delete(request(workId))
  if (await cache.match(request(workId))) throw new Error('The download could not be removed. Please try again.')
}

export async function getLibraryDownloadStatus(workId: string): Promise<LibraryDownloadStatus | null> {
  const download = await readLibraryDownload(workId)
  if (!download) return null
  const volumes = [...new Set(download.chapterIndex.map(chapter => chapter.volume))].map(volume => {
    const chapters = download.chapterIndex.filter(chapter => chapter.volume === volume)
    return { volume, total: chapters.length, downloaded: chapters.filter(chapter => download.chapters[chapter.id]).length }
  })
  return { workId, revision: download.work.revision!, downloaded: Object.keys(download.chapters).length, total: download.chapterIndex.length, volumes }
}
