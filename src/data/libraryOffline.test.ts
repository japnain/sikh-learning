import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { configureLibraryRepositoryLoader, downloadLibraryWork, getLibraryDownloadStatus, loadLibraryChapter, loadLibraryWorkCatalog, loadLibraryDiscoveryCatalog, refreshLibraryDiscoveryCatalog, subscribeLibraryDiscoveryCatalog, removeDownloadedLibraryWork, resetLibraryRepositoryCache } from './libraryRepository'
import { readDownloadedLibraryResource, readLibraryDownload } from './libraryOffline'
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
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); resetLibraryRepositoryCache() })

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

  test('book discovery shows downloaded work immediately while its network refresh hangs', async () => {
    await downloadLibraryWork(WORK, { volume: 1 })
    vi.useFakeTimers()
    configureLibraryRepositoryLoader(() => new Promise<never>(() => {}))
    expect((await loadLibraryDiscoveryCatalog()).works.map(work => work.id)).toEqual([WORK])
    expect((await loadLibraryChapter(WORK, 'episode-001'))?.id).toBe('episode-001')
    await vi.advanceTimersByTimeAsync(15_001)
    expect((await loadLibraryDiscoveryCatalog()).works.map(work => work.id)).toEqual([WORK])
  })

  test('discovers and opens newly published books without relabelling a downloaded reading edition', async () => {
    await downloadLibraryWork(WORK, { volume: 1 })
    const savedChapter = await loadLibraryChapter(WORK, 'episode-001')
    const [oldWork] = await fixture<LibraryWork[]>('/data/library/works.json')
    const added: LibraryWork = JSON.parse(JSON.stringify({ ...oldWork, title: 'A newly published book', shortTitle: 'New book' }).replaceAll(WORK, 'new-book'))
    const published = { ...oldWork, title: 'A newer title', revision: 'test-v2' }
    configureLibraryRepositoryLoader(async <T,>(url: string): Promise<T> => {
      if (url === '/data/library/manifest.json') return { ...await fixture<object>(url), workCatalogPath: '/data/library/next-works.json' } as T
      if (url === '/data/library/next-works.json') return [published, added] as T
      if (url.includes('/new-book/')) return JSON.parse(JSON.stringify(await fixture(url.replace('/new-book/', `/${WORK}/`))).replaceAll(WORK, 'new-book')) as T
      return fixture<T>(url)
    })
    const listener = vi.fn()
    const unsubscribe = subscribeLibraryDiscoveryCatalog(listener)
    try {
      expect((await loadLibraryDiscoveryCatalog()).works.map(work => work.id)).toEqual([WORK])
      const discovered = await refreshLibraryDiscoveryCatalog()
      expect(discovered.works.map(work => work.id)).toEqual([WORK, 'new-book'])
      expect(discovered.workById[WORK].revision).toBe('test-v2')
      expect(listener).toHaveBeenCalledExactlyOnceWith(discovered)
      expect((await loadLibraryWorkCatalog()).workById[WORK]).toMatchObject({ title: oldWork.title, revision: 'test-v1' })
      expect(await loadLibraryChapter(WORK, 'episode-001')).toEqual(savedChapter)
      expect((await loadLibraryChapter('new-book', 'episode-001'))?.workId).toBe('new-book')
    } finally { unsubscribe() }
  })

  test('keeps downloaded discoveries when the current online catalog omits them or is malformed', async () => {
    await downloadLibraryWork(WORK, { volume: 1 })
    configureLibraryRepositoryLoader(async <T,>(url: string): Promise<T> => url.endsWith('works.json') ? [] as T : fixture<T>(url))
    expect((await refreshLibraryDiscoveryCatalog()).works.map(work => work.id)).toEqual([WORK])
    configureLibraryRepositoryLoader(async <T,>(url: string): Promise<T> => url.endsWith('works.json') ? { invalid: true } as T : fixture<T>(url))
    expect((await refreshLibraryDiscoveryCatalog()).works.map(work => work.id)).toEqual([WORK])
  })

  test('does not publish an obsolete discovery request after repository reset', async () => {
    let finish!: (value: unknown) => void
    configureLibraryRepositoryLoader(<T,>() => new Promise<T>(resolve => { finish = resolve as (value: unknown) => void }))
    const listener = vi.fn()
    const unsubscribe = subscribeLibraryDiscoveryCatalog(listener)
    try {
      const pending = refreshLibraryDiscoveryCatalog()
      configureLibraryRepositoryLoader(fixture)
      finish(await fixture('/data/library/manifest.json'))
      await pending
      expect(listener).not.toHaveBeenCalled()
    } finally { unsubscribe() }
  })

  test('parses one unchanged downloaded package once for concurrent metadata, index and chapter reads', async () => {
    await downloadLibraryWork(WORK)
    const parse = vi.spyOn(Response.prototype, 'json')
    await Promise.all([
      readDownloadedLibraryResource('/data/library/manifest.json'),
      readDownloadedLibraryResource('/data/library/works.json'),
      readDownloadedLibraryResource(resource('search-index.json')),
      readDownloadedLibraryResource(resource('chapters/episode-001.json')),
      getLibraryDownloadStatus(WORK),
    ])
    expect(parse).toHaveBeenCalledOnce()
    await getLibraryDownloadStatus(WORK)
    expect(parse).toHaveBeenCalledOnce()
    resetLibraryRepositoryCache()
    await getLibraryDownloadStatus(WORK)
    expect(parse).toHaveBeenCalledTimes(2)
  })

  test('notices another tab replacing or evicting a parsed download', async () => {
    await downloadLibraryWork(WORK)
    const saved = await readLibraryDownload(WORK)
    const key = [...records.keys()][0]
    records.set(key, new Response(JSON.stringify({ ...saved, savedAt: '2026-10-31T12:00:00.000Z' }), { headers: { 'x-naamras-download-token': 'another-tab' } }))
    expect((await readLibraryDownload(WORK))?.savedAt).toBe('2026-10-31T12:00:00.000Z')
    records.delete(key)
    expect(await readLibraryDownload(WORK)).toBeNull()
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

  test('requires updating a partial download before opening a newer remote chapter under old edition metadata', async () => {
    await downloadLibraryWork(WORK, { volume: 1 })
    revision = 'test-v2'
    const loader = vi.fn(fixture)
    configureLibraryRepositoryLoader(loader)
    await expect(loadLibraryChapter(WORK, 'episode-082')).rejects.toMatchObject({ name: 'LibraryEditionUpdateRequiredError' })
    expect(loader.mock.calls.map(([url]) => url)).not.toContain(resource('chapters/episode-082.json'))
    expect((await loadLibraryChapter(WORK, 'episode-001'))?.id).toBe('episode-001')
    expect((await loadLibraryWorkCatalog()).workById[WORK].revision).toBe('test-v1')
    await downloadLibraryWork(WORK, { volume: 2 })
    expect((await loadLibraryChapter(WORK, 'episode-082'))?.id).toBe('episode-082')
    expect((await loadLibraryWorkCatalog()).workById[WORK].revision).toBe('test-v2')
  })

  test('opens uncached chapters of the same published edition, but never skips a failed revision check', async () => {
    await downloadLibraryWork(WORK, { volume: 1 })
    expect((await loadLibraryChapter(WORK, 'episode-082'))?.id).toBe('episode-082')
    const loader = vi.fn(async <T,>(url: string): Promise<T> => {
      if (url.endsWith('works.json')) throw new Error('Catalog unavailable')
      return fixture<T>(url)
    })
    configureLibraryRepositoryLoader(loader)
    await expect(loadLibraryChapter(WORK, 'episode-082')).rejects.toThrow('Catalog unavailable')
    expect(loader.mock.calls.map(([url]) => url)).not.toContain(resource('chapters/episode-082.json'))
    expect((await loadLibraryChapter(WORK, 'episode-001'))?.id).toBe('episode-001')
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
