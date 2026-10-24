import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { configureLibraryRepositoryLoader, downloadLibraryWork, getLibraryDownloadStatus, loadLibraryChapter, loadLibraryWorkCatalog, removeDownloadedLibraryWork, resetLibraryRepositoryCache } from './libraryRepository'
import { readLibraryDownload } from './libraryOffline'
import type { LibraryChapterIndexEntry, LibrarySearchIndex, LibraryWork } from '../types'

const WORK = 'panth-prakash-english'
const read = <T,>(resource: string): T => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', resource), 'utf8')) as T
const resource = (name: string) => `/data/library/works/${WORK}/${name}`
let records: Map<string, Response>
let failWrites = false
let revision = 'test-v1'

async function fixture<T>(url: string): Promise<T> {
  if (url === '/data/library/works.json') {
    const works = read<LibraryWork[]>(url)
    return works.map(work => ({ ...work, totalChapters: 3, revision })) as T
  }
  if (url === resource('chapters.json')) return read<LibraryChapterIndexEntry[]>(url).filter(entry => ['episode-001', 'episode-002', 'episode-082'].includes(entry.id)) as T
  if (url === resource('search-index.json')) {
    const index = read<LibrarySearchIndex>(url)
    return { ...index, chapters: index.chapters?.filter(entry => ['episode-001', 'episode-002', 'episode-082'].includes(entry.chapterId)) } as T
  }
  return read<T>(url)
}

beforeEach(() => {
  records = new Map()
  failWrites = false
  revision = 'test-v1'
  vi.stubGlobal('caches', { open: vi.fn(async () => ({
    match: async (request: Request) => records.get(request.url)?.clone(),
    put: async (request: Request, response: Response) => {
      if (failWrites) throw new DOMException('Full', 'QuotaExceededError')
      records.set(request.url, response.clone())
    },
    keys: async () => [...records.keys()].map(url => new Request(url)),
    delete: async (request: Request) => records.delete(request.url),
  })) })
  configureLibraryRepositoryLoader(fixture)
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); resetLibraryRepositoryCache() })

describe('verified book downloads', () => {
  test('a downloaded volume opens after request-cache reset without touching a hanging network', async () => {
    const progress = vi.fn()
    await downloadLibraryWork(WORK, { volume: 1, onProgress: progress })
    expect(progress).toHaveBeenLastCalledWith(2, 2)
    expect(await getLibraryDownloadStatus(WORK)).toMatchObject({ downloaded: 2, total: 3, volumes: [{ volume: 1, downloaded: 2, total: 2 }, { volume: 2, downloaded: 0, total: 1 }] })
    vi.resetModules()
    const reloaded = await import('./libraryRepository')
    const offline = vi.fn(() => new Promise<never>(() => {}))
    reloaded.configureLibraryRepositoryLoader(offline)
    expect((await reloaded.loadLibraryWorkCatalog()).workById[WORK].revision).toBe('test-v1')
    expect(await reloaded.loadLibraryChapterIndex(WORK)).toHaveLength(3)
    expect((await reloaded.loadLibrarySearchIndex(WORK)).chapters).toHaveLength(3)
    const reopened = await reloaded.loadLibraryChapter(WORK, 'episode-001')
    expect(reopened?.id).toBe('episode-001')
    expect(reopened?.sourceNotes).toEqual(read<{ sourceNotes?: unknown }>(resource('chapters/episode-001.json')).sourceNotes)
    expect(offline).not.toHaveBeenCalled()
  })

  test('a complete-book download is read back before marking every volume ready', async () => {
    await downloadLibraryWork(WORK)
    expect(await getLibraryDownloadStatus(WORK)).toMatchObject({ downloaded: 3, total: 3 })
    expect((await getLibraryDownloadStatus(WORK))?.volumes.every(volume => volume.downloaded === volume.total)).toBe(true)
  })

  test('a failed update or cancelled download keeps the previous verified book', async () => {
    await downloadLibraryWork(WORK, { volume: 1 })
    failWrites = true
    await expect(downloadLibraryWork(WORK)).rejects.toThrow(/device storage/i)
    expect((await getLibraryDownloadStatus(WORK))?.downloaded).toBe(2)
    failWrites = false
    const controller = new AbortController()
    await expect(downloadLibraryWork(WORK, { signal: controller.signal, onProgress: loaded => { if (loaded === 1) controller.abort() } })).rejects.toMatchObject({ name: 'AbortError' })
    expect((await getLibraryDownloadStatus(WORK))?.downloaded).toBe(2)
  })

  test('a new revision refreshes previously downloaded volumes instead of silently discarding them', async () => {
    await downloadLibraryWork(WORK, { volume: 1 })
    revision = 'test-v2'
    await downloadLibraryWork(WORK, { volume: 2 })
    expect(await getLibraryDownloadStatus(WORK)).toMatchObject({ revision: 'test-v2', downloaded: 3, total: 3 })
  })

  test('corrupt cached sections are never advertised or rendered as downloaded', async () => {
    await downloadLibraryWork(WORK)
    const key = [...records.keys()][0]
    const value = await records.get(key)!.json()
    value.chapters['episode-001'].pages[0].blocks[0].text = 123
    records.set(key, new Response(JSON.stringify(value)))
    expect(await readLibraryDownload(WORK)).toBeNull()
    expect(await getLibraryDownloadStatus(WORK)).toBeNull()
  })

  test('removal clears durable text and all request caches while preserving personal storage', async () => {
    localStorage.setItem('test-bookmark', 'kept')
    await downloadLibraryWork(WORK)
    await loadLibraryChapter(WORK, 'episode-001')
    await removeDownloadedLibraryWork(WORK)
    expect(await getLibraryDownloadStatus(WORK)).toBeNull()
    expect(localStorage.getItem('test-bookmark')).toBe('kept')
    configureLibraryRepositoryLoader(async () => { throw new Error('offline') })
    await expect(loadLibraryChapter(WORK, 'episode-001')).rejects.toThrow('offline')
  })

  test('a hanging uncached request has a deadline and can retry after reconnecting', async () => {
    vi.useFakeTimers()
    configureLibraryRepositoryLoader(() => new Promise<never>(() => {}))
    const pending = loadLibraryWorkCatalog()
    const expectation = expect(pending).rejects.toThrow(/timed out/i)
    await vi.advanceTimersByTimeAsync(15_001)
    await expectation
    configureLibraryRepositoryLoader(fixture)
    expect((await loadLibraryWorkCatalog()).works).toHaveLength(1)
  })
})
