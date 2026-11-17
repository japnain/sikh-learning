import { webcrypto } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BaniFetchResult } from '../api/banidb'
import { fetchHostedBaniReading } from '../api/hostedBani'
import type { SundarGutkaLength } from '../types'
import {
  BANI_DOWNLOADS_CHANGED_EVENT, createBaniDbDownloadSource, downloadBani, listBaniDownloads,
  readDownloadedBani, removeBaniDownload, type BaniDownloadSource,
} from './baniDownloads'
import { readBaniOfflineCache, setProtectedBaniOfflineReadings, writeBaniOfflineCache } from './baniOfflineCache'
import { isExactBaniReading } from './baniReadingValidation'
import { ensureOfflineReaderShell, OfflineReaderShellError } from './offlineReaderShell'

vi.mock('../api/hostedBani', () => ({ fetchHostedBaniReading: vi.fn(), HOSTED_BANI_REVISION: 'test-hosted-revision' }))
vi.mock('./offlineReaderShell', async importOriginal => ({ ...await importOriginal<typeof import('./offlineReaderShell')>(), ensureOfflineReaderShell: vi.fn() }))

const lengths: SundarGutkaLength[] = ['short', 'medium', 'long', 'extralong']

function reading(id = 21, length: SundarGutkaLength | null = 'short', availableLengths = lengths): BaniFetchResult {
  return {
    entries: [{
      id: `bani-${id}-1-0`, source: id === 9 ? 'D' : 'G', scripture: id === 9 ? 'DG' : 'SGGS', ang: 1,
      gurmukhi: `ਬਾਣੀ ${length}`, transliteration: 'bani', translation_en: 'Reading', translation_hi: '', translation_pa: '', words: [],
      lines: [
        { verseId: 31, shabadId: 0, gurmukhi: 'ਸਿਰਲੇਖ', isHeader: true, headerLevel: 1 },
        { verseId: 32, shabadId: 0, gurmukhi: `ਆਰੰਭ ${length}`, translation_en: 'Opening' },
        { verseId: 33, shabadId: 0, gurmukhi: 'ਆਰੰਭ', translation_en: 'Repeated line' },
        { verseId: 34, shabadId: 0, gurmukhi: `ਅੰਤ ${length}`, translation_en: 'Ending' },
      ],
    }],
    availableLengths: length ? [...availableLengths] : [], resolvedLength: length, normalizationRevision: 2,
  }
}

function source(id = 21, availableLengths = lengths): BaniDownloadSource {
  return {
    ...createBaniDbDownloadSource(id, `Bani ${id}`),
    load: vi.fn(async length => reading(id, length ?? availableLengths[0] ?? null, availableLengths)),
  }
}

function memoryCaches() {
  const stores = new Map<string, Map<string, Response>>()
  const apis = new Map<string, {
    put: ReturnType<typeof vi.fn>; match: ReturnType<typeof vi.fn>; keys: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn>;
  }>()
  const open = vi.fn(async (name: string) => {
    if (!stores.has(name)) {
      const store = new Map<string, Response>()
      stores.set(name, store)
      apis.set(name, {
        put: vi.fn(async (request: Request, response: Response) => { store.set(request.url, response.clone()) }),
        match: vi.fn(async (request: Request) => store.get(request.url)?.clone()),
        keys: vi.fn(async () => [...store.keys()].map(url => new Request(url))),
        delete: vi.fn(async (request: Request) => store.delete(request.url)),
      })
    }
    return apis.get(name)!
  })
  return { open, stores, apis }
}

let cacheStorage: ReturnType<typeof memoryCaches>
beforeEach(() => {
  cacheStorage = memoryCaches()
  vi.stubGlobal('caches', cacheStorage)
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal('navigator', { locks: { request: vi.fn(async (_name, _options, callback) => callback()) } })
  localStorage.clear()
  setProtectedBaniOfflineReadings([])
  vi.mocked(fetchHostedBaniReading).mockReset()
  vi.mocked(ensureOfflineReaderShell).mockReset().mockResolvedValue()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('explicit bani downloads', () => {
  it('does not download or replace a saved pack until its offline reader can reopen', async () => {
    await downloadBani(source())
    expect(ensureOfflineReaderShell).toHaveBeenCalledWith(expect.any(AbortSignal), { recover: true })
    const saved = await readDownloadedBani('banidb:21', 'long')
    vi.mocked(ensureOfflineReaderShell).mockRejectedValue(new OfflineReaderShellError())
    const replacement = source()
    await expect(downloadBani(replacement)).rejects.toBeInstanceOf(OfflineReaderShellError)
    expect(replacement.load).not.toHaveBeenCalled()
    expect(await readDownloadedBani('banidb:21', 'long')).toEqual(saved)
  })
  it('obtains every existing-bani version from our hosted snapshots for explicit downloads', async () => {
    vi.mocked(fetchHostedBaniReading).mockImplementation(async (id, length) => reading(id, length ?? 'short'))
    await downloadBani(createBaniDbDownloadSource(21, 'Rehras Sahib'))
    expect(vi.mocked(fetchHostedBaniReading).mock.calls.map(([id, length]) => [id, length])).toEqual([
      [21, undefined], [21, 'medium'], [21, 'long'], [21, 'extralong'],
    ])
    expect(vi.mocked(fetchHostedBaniReading).mock.calls.every(call => call[2] instanceof AbortSignal)).toBe(true)
    expect(await readBaniOfflineCache(21, 'long')).toEqual(reading(21, 'long'))
  })

  it('does not substitute a live upstream reading when the hosted snapshot is unavailable', async () => {
    vi.mocked(fetchHostedBaniReading).mockRejectedValue(new Error('The hosted reading is unavailable.'))
    await expect(downloadBani(createBaniDbDownloadSource(21, 'Rehras Sahib'))).rejects.toThrow('hosted reading is unavailable')
    expect(fetchHostedBaniReading).toHaveBeenCalledTimes(1)
    expect(await listBaniDownloads()).toEqual([])
  })

  it('cannot roll back over another tab\'s completed replacement when a download is cancelled at commit', async () => {
    const queues = new Map<string, Promise<unknown>>()
    vi.stubGlobal('navigator', { locks: {
      request: (key: string, options: { signal?: AbortSignal }, callback: () => Promise<unknown>) => {
        const pending = (queues.get(key) ?? Promise.resolve()).catch(() => {}).then(() => {
          options.signal?.throwIfAborted()
          return callback()
        })
        queues.set(key, pending)
        return pending
      },
    } })
    await downloadBani(source())
    vi.resetModules()
    // A separate module instance models another tab with a different in-memory map.
    const secondTab = await import('./baniDownloads')
    const api = cacheStorage.apis.get('naamras-bani-downloads-v1')!
    const store = cacheStorage.stores.get('naamras-bani-downloads-v1')!
    let atFirstCommit!: () => void
    let releaseFirstCommit!: () => void
    const firstCommitted = new Promise<void>(resolve => { atFirstCommit = resolve })
    const finishCommit = new Promise<void>(resolve => { releaseFirstCommit = resolve })
    api.put.mockImplementation(async (request: Request, response: Response) => {
      store.set(request.url, response.clone())
      if (request.url.includes('/packs/') && (await response.clone().text()).includes('First tab replacement')) {
        atFirstCommit()
        await finishCommit
      }
    })
    const firstSource = source()
    firstSource.title = 'First tab replacement'
    const secondSource = source()
    secondSource.title = 'Second tab replacement'
    const cancellation = new AbortController()
    const first = downloadBani(firstSource, { signal: cancellation.signal })
    const firstRejected = expect(first).rejects.toMatchObject({ name: 'AbortError' })
    await firstCommitted
    const second = secondTab.downloadBani(secondSource)
    expect(secondSource.load).not.toHaveBeenCalled()
    cancellation.abort()
    releaseFirstCommit()
    await firstRejected
    await second
    expect((await listBaniDownloads())[0]?.title).toBe('Second tab replacement')
    expect(store.size).toBe(1)
  })

  it('does not write without cross-tab coordination but can still read an existing verified pack', async () => {
    await downloadBani(source())
    vi.stubGlobal('navigator', {})
    await expect(downloadBani(source())).rejects.toThrow('unavailable in this browser')
    expect(await readDownloadedBani('banidb:21', 'long')).toEqual(reading(21, 'long'))
  })

  it('saves all available lengths without changing a line, heading, preference or saved place', async () => {
    localStorage.setItem('naamras-reading-places', '{"bani:21:long":{"verseId":33}}')
    localStorage.setItem('naamras-sundar-gutka-lengths', '{"rehras-sahib":"long"}')
    const before = { ...localStorage }
    const target = source()
    const onProgress = vi.fn()
    const changed = vi.fn()
    window.addEventListener(BANI_DOWNLOADS_CHANGED_EVENT, changed)
    try {
      const info = await downloadBani(target, { onProgress })
      expect(vi.mocked(target.load).mock.calls.map(call => call[0])).toEqual([undefined, 'medium', 'long', 'extralong'])
      expect(info).toMatchObject({ key: 'banidb:21', provider: 'banidb', availableLengths: lengths })
      expect(info.byteSize).toBeGreaterThan(0)
      for (const length of lengths) {
        expect(await readDownloadedBani('banidb:21', length, target.validate)).toEqual(reading(21, length))
        expect(await readBaniOfflineCache(21, length)).toEqual(reading(21, length))
      }
      expect(await readDownloadedBani('banidb:21')).toEqual(reading())
      expect(await listBaniDownloads()).toEqual([info])
      expect({ ...localStorage }).toEqual(before)
      expect(changed).toHaveBeenCalledTimes(1)
      expect(onProgress).toHaveBeenLastCalledWith({ completed: 4, total: 4, stage: 'saving', length: null })
    } finally {
      window.removeEventListener(BANI_DOWNLOADS_CHANGED_EVENT, changed)
    }
  })

  it('keeps explicit downloads through ordinary cache eviction and supports a cold cache read', async () => {
    await downloadBani(source())
    for (let id = 200; id < 230; id += 1) await writeBaniOfflineCache(id, null, reading(id, null))
    expect(cacheStorage.stores.get('naamras-bani-readings-v1')?.size).toBe(12)
    expect(cacheStorage.stores.get('naamras-bani-downloads-v1')?.size).toBe(1)
    expect(await readBaniOfflineCache(21, 'extralong')).toEqual(reading(21, 'extralong'))
    expect(await readBaniOfflineCache(200)).toBeNull()
  })

  it('keeps the prior complete copy when any one requested length fails', async () => {
    await downloadBani(source())
    const replacement = source()
    replacement.load = vi.fn(async length => {
      if (length === 'medium') throw new Error('Disconnected')
      const updated = reading(21, length ?? 'short')
      updated.entries[0]!.gurmukhi = 'ਨਵੀਂ ਬਾਣੀ'
      return updated
    })
    await expect(downloadBani(replacement)).rejects.toThrow('Disconnected')
    for (const length of lengths) expect(await readDownloadedBani('banidb:21', length)).toEqual(reading(21, length))
    expect(cacheStorage.stores.get('naamras-bani-downloads-v1')?.size).toBe(1)
  })

  it('cancels an uncooperative loader without exposing a partial pack', async () => {
    const target = source()
    const controller = new AbortController()
    let beginSecond!: () => void
    const secondStarted = new Promise<void>(resolve => { beginSecond = resolve })
    target.load = vi.fn(async length => {
      if (length) { beginSecond(); return new Promise<BaniFetchResult>(() => {}) }
      return reading()
    })
    const pending = downloadBani(target, { signal: controller.signal })
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    await secondStarted
    controller.abort()
    await rejected
    expect(await listBaniDownloads()).toEqual([])
    expect(await readDownloadedBani('banidb:21', 'short')).toBeNull()
  })

  it('rolls back a failed final read-back and cleans the staged response', async () => {
    await downloadBani(source())
    const api = cacheStorage.apis.get('naamras-bani-downloads-v1')!
    const store = cacheStorage.stores.get('naamras-bani-downloads-v1')!
    let corruptNextCommit = true
    api.put.mockImplementation(async (request: Request, response: Response) => {
      if (request.url.includes('/packs/') && corruptNextCommit) {
        corruptNextCommit = false
        store.set(request.url, new Response('interrupted storage'))
      } else store.set(request.url, response.clone())
    })
    await expect(downloadBani(source())).rejects.toThrow('could not be verified')
    expect(await readDownloadedBani('banidb:21', 'long')).toEqual(reading(21, 'long'))
    expect(store.size).toBe(1)
  })

  it('does not accept corrupted data or report it as an available download', async () => {
    await downloadBani(source())
    const store = cacheStorage.stores.get('naamras-bani-downloads-v1')!
    const [url, response] = [...store.entries()][0]!
    const bytes = await response.text()
    store.set(url, new Response(bytes.replace('Opening', 'Changed opening')))
    expect(await readDownloadedBani('banidb:21', 'short')).toBeNull()
    expect(await listBaniDownloads()).toEqual([])
  })

  it('reports unreadable device storage instead of returning an empty download list', async () => {
    cacheStorage.open.mockRejectedValueOnce(new DOMException('Storage unavailable', 'SecurityError'))
    await expect(listBaniDownloads()).rejects.toMatchObject({ name: 'SecurityError' })
  })

  it('ignores malformed unrelated cache keys without hiding valid downloaded readings', async () => {
    await downloadBani(source())
    const api = cacheStorage.apis.get('naamras-bani-downloads-v1')!
    await api.put(new Request('https://naamras.local/__naamras-downloads/packs/%E0%A4%A'), new Response('invalid'))
    expect(await listBaniDownloads()).toEqual([expect.objectContaining({ key: 'banidb:21' })])
  })

  it('rejects a changed set of versions during download instead of claiming completeness', async () => {
    const target = source()
    target.load = vi.fn(async length => reading(21, length ?? 'short', length === 'long' ? ['short', 'long'] : lengths))
    await expect(downloadBani(target)).rejects.toThrow('available lengths changed')
    expect(await listBaniDownloads()).toEqual([])
  })

  it('cleans abandoned staging from a closed browser without removing another tab\'s recent write', async () => {
    const api = await cacheStorage.open('naamras-bani-downloads-v1')
    const abandoned = new Request('https://naamras.local/__naamras-downloads/pending/0-abandoned')
    const recent = new Request(`https://naamras.local/__naamras-downloads/pending/${Date.now()}-another-tab`)
    await api.put(abandoned, new Response('unfinished old data'))
    await api.put(recent, new Response('unfinished new data'))
    await downloadBani(source())
    expect(await api.match(abandoned)).toBeUndefined()
    expect(await api.match(recent)).toBeDefined()
    expect(await listBaniDownloads()).toHaveLength(1)
  })

  it('bounds an unresponsive provider request and releases the download lock for retry', async () => {
    vi.useFakeTimers()
    try {
      const target = source()
      target.load = vi.fn(() => new Promise<BaniFetchResult>(() => {}))
      const rejected = expect(downloadBani(target)).rejects.toThrow('timed out')
      await vi.advanceTimersByTimeAsync(30_000)
      await rejected
      vi.useRealTimers()
      await expect(downloadBani(source())).resolves.toMatchObject({ key: 'banidb:21' })
    } finally { vi.useRealTimers() }
  })

  it('stores namespaced Shabad OS readings through their own identity validator', async () => {
    const content = reading(21, null)
    content.entries[0]!.id = 'shabados-ALHN-1'
    const target: BaniDownloadSource = {
      key: 'shabados:ALHN', title: 'Alahnia', provider: 'shabados', sourceRevision: 'pinned-test-revision',
      load: vi.fn(async () => content),
      validate: data => (data as BaniFetchResult)?.entries[0]?.id === 'shabados-ALHN-1',
    }
    const info = await downloadBani(target)
    expect(info).toMatchObject({ provider: 'shabados', sourceRevision: 'pinned-test-revision', availableLengths: [] })
    expect(await readDownloadedBani('shabados:ALHN', null, target.validate)).toEqual(content)
    expect(await readDownloadedBani('shabados:ALHN', null, data => isExactBaniReading(data, 21))).toBeNull()
    expect(await readBaniOfflineCache(21)).toBeNull()
    expect(target.load).toHaveBeenCalledTimes(1)
  })

  it('preserves the existing three-band extra-long alias without inventing another version', async () => {
    const target = source(9, ['short', 'medium', 'long'])
    await downloadBani(target)
    expect(vi.mocked(target.load).mock.calls.map(call => call[0])).toEqual([undefined, 'medium', 'long'])
    expect(await readBaniOfflineCache(9, 'extralong')).toEqual(reading(9, 'long', ['short', 'medium', 'long']))
    expect((await listBaniDownloads())[0]?.availableLengths).toEqual(['short', 'medium', 'long'])
  })

  it('removes a download while retaining personal state and unrelated readings', async () => {
    await downloadBani(source())
    await downloadBani(source(2, []))
    localStorage.setItem('reading-position', 'keep this')
    expect(await removeBaniDownload('banidb:21')).toBe(true)
    expect(await readDownloadedBani('banidb:21')).toBeNull()
    expect(await readDownloadedBani('banidb:2')).toEqual(reading(2, null, []))
    expect(localStorage.getItem('reading-position')).toBe('keep this')
  })

  it('rejects a quota failure without falling back to a falsely complete localStorage copy', async () => {
    const api = await cacheStorage.open('naamras-bani-downloads-v1')
    api.put.mockRejectedValue(new DOMException('Full', 'QuotaExceededError'))
    await expect(downloadBani(source())).rejects.toMatchObject({ name: 'QuotaExceededError' })
    expect(await listBaniDownloads()).toEqual([])
    expect(localStorage.length).toBe(0)
  })

  it('rejects a second concurrent download of the same bani and removal cancels the first', async () => {
    const target = source()
    target.load = vi.fn(() => new Promise<BaniFetchResult>(() => {}))
    const pending = downloadBani(target)
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    await expect(downloadBani(target)).rejects.toThrow('already downloading')
    await removeBaniDownload(target.key)
    await rejected
    expect(await listBaniDownloads()).toEqual([])
  })
})
