import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BaniFetchResult } from '../api/banidb'
import { fetchBani } from '../api/banidb'
import { http, HttpResponse } from 'msw'
import { MOCK_REHRAS_BANI_RESPONSE } from '../test/msw-handlers'
import { server } from '../test/msw-server'
import { BANIS } from '../data/banis'
import type { SundarGutkaLength } from '../types'
import { NITNEM_ROUTE_OPTIONS } from '../store/nitnem'
import { readBaniOfflineCache, setProtectedBaniOfflineReadings, writeBaniOfflineCache } from './baniOfflineCache'

function buildResult(id: number, length: SundarGutkaLength | null = null): BaniFetchResult {
  const source = BANIS.find(bani => bani.baniDbId === id)?.source ?? 'G'
  return {
    entries: [{
      id: `bani-${id}-1-1`,
      scripture: { G: 'SGGS', D: 'DG', B: 'BGV', A: 'AK' }[source],
      source,
      ang: 1,
      gurmukhi: `ਪਾਠ ${id}`,
      transliteration: `reading ${id}`,
      translation_en: `Reading ${id}`,
      translation_hi: '',
      translation_pa: '',
      words: [],
    }],
    availableLengths: length ? ['short', 'medium', 'long', 'extralong'] : [],
    resolvedLength: length,
  }
}

beforeEach(() => {
  localStorage.clear()
  setProtectedBaniOfflineReadings([])
  vi.stubGlobal('caches', undefined)
})

describe('baniOfflineCache local fallback', () => {
  it.each(['long', 'extralong'] as const)('requires refreshed provider order for known affected legacy Rehras %s while preserving its cache bytes', async length => {
    const legacy = await fetchBani(21, length)
    legacy.entries = legacy.entries.map(entry => ({
      ...entry, id: `bani-21-${entry.ang}-0`, source: 'G', scripture: 'SGGS', sourceName: 'SGGS',
      sourceMeta: null, shabadId: 0, lines: entry.lines?.map(line => ({ ...line, shabadId: 0 })),
    }))
    const key = `naamras-bani-reading-v1:21:${length}`
    for (const revision of [undefined, 1, '2', null, Number.NaN, Number.POSITIVE_INFINITY]) {
      const bytes = JSON.stringify({ ...legacy, normalizationRevision: revision })
      localStorage.setItem(key, bytes)
      expect(await readBaniOfflineCache(21, length)).toBeNull()
      expect(localStorage.getItem(key)).toBe(bytes)
    }
    localStorage.setItem(key, JSON.stringify({ ...legacy, normalizationRevision: 2 }))
    const refreshed = await readBaniOfflineCache(21, length)
    expect(refreshed?.normalizationRevision).toBe(2)
    expect(refreshed?.entries.flatMap(entry => entry.lines ?? [])).toEqual(legacy.entries.flatMap(entry => entry.lines ?? []))
  })

  it('round-trips real-shape unattributed Rehras without claiming a scripture source', async () => {
    server.use(http.post('https://naamras-qa.supabase.co/functions/v1/banidb-proxy', async ({ request }) => {
      const body = await request.json() as { path?: string }
      if (body.path === '/v2/banis/21') return HttpResponse.json({
        baniInfo: { source: { sourceId: null, english: null, pageNo: null } },
        verses: MOCK_REHRAS_BANI_RESPONSE.verses.map(item => ({ ...item,
          verse: Object.fromEntries(Object.entries(item.verse).filter(([key]) => !['source', 'shabadId'].includes(key))),
        })),
      })
    }))
    const exact = await fetchBani(21, 'short')
    await writeBaniOfflineCache(21, 'short', exact)
    const cached = await readBaniOfflineCache(21, 'short')
    expect(cached).toEqual(exact)
    expect(cached?.entries.every(entry => entry.scripture === 'Sundar Gutka'
      && entry.sourceName === 'Sundar Gutka' && entry.sourceMeta === null
      && entry.sourceAttribution === 'unavailable')).toBe(true)
  })

  it('migrates only unverified legacy metadata and preserves exact cached lines, identity, and length', async () => {
    const legacy = await fetchBani(21, 'short')
    legacy.entries = legacy.entries.map(entry => ({
      ...entry, id: `bani-21-${entry.ang}-0`, source: 'G', scripture: 'SGGS', sourceName: 'SGGS',
      sourceMeta: null, shabadId: 0, lines: entry.lines?.map(line => ({ ...line, shabadId: 0 })),
    }))
    localStorage.setItem('naamras-bani-reading-v1:21:short', JSON.stringify(legacy))
    const cached = await readBaniOfflineCache(21, 'short')
    expect(cached?.entries.every(entry => entry.scripture === 'Sundar Gutka' && entry.sourceAttribution === 'unavailable')).toBe(true)
    expect(cached?.entries.map(entry => [entry.id, entry.source, entry.lines, entry.gurmukhi])).toEqual(
      legacy.entries.map(entry => [entry.id, entry.source, entry.lines, entry.gurmukhi])
    )
    expect(cached?.availableLengths).toEqual(legacy.availableLengths)
    expect(cached?.resolvedLength).toBe('short')
    expect(await readBaniOfflineCache(21, 'long')).toBeNull()
    expect(await readBaniOfflineCache(22, 'short')).toBeNull()

    const wrongIdentity = { ...legacy, entries: legacy.entries.map(entry => ({ ...entry, id: entry.id.replace('bani-21-', 'bani-22-') })) }
    localStorage.setItem('naamras-bani-reading-v1:21:short', JSON.stringify(wrongIdentity))
    expect(await readBaniOfflineCache(21, 'short')).toBeNull()
  })

  it('leaves authoritative legacy source metadata intact', async () => {
    const exact = await fetchBani(21, 'short')
    localStorage.setItem('naamras-bani-reading-v1:21:short', JSON.stringify(exact))
    expect(await readBaniOfflineCache(21, 'short')).toEqual(exact)
  })
  it('round-trips exact reader data and bounds fallback storage', async () => {
    for (let baniDbId = 1; baniDbId <= 9; baniDbId += 1) {
      await writeBaniOfflineCache(baniDbId, null, buildResult(baniDbId))
    }

    expect(await readBaniOfflineCache(1, null)).toBeNull()
    expect(await readBaniOfflineCache(9, null)).toEqual(buildResult(9))
  })

  it('retains all thirteen exact selected readings through unselected fallback churn', async () => {
    const selections = NITNEM_ROUTE_OPTIONS.map(option => ({ baniDbId: option.baniDbId!, sgLength: option.supportsLengthAdjustment ? 'short' as const : null }))
    expect(selections).toHaveLength(13)
    setProtectedBaniOfflineReadings(selections)
    for (const reading of selections) await writeBaniOfflineCache(reading.baniDbId, reading.sgLength, buildResult(reading.baniDbId, reading.sgLength))
    for (let id = 100; id < 115; id += 1) await writeBaniOfflineCache(id, null, buildResult(id))
    for (const reading of selections) expect(await readBaniOfflineCache(reading.baniDbId, reading.sgLength)).toEqual(buildResult(reading.baniDbId, reading.sgLength))
    expect(JSON.parse(localStorage.getItem('naamras-bani-reading-index-v1')!)).toHaveLength(13)
    expect(await readBaniOfflineCache(114, null)).toBeNull()
  })

  it('protects the selected length while allowing older lengths to be evicted', async () => {
    setProtectedBaniOfflineReadings([{ baniDbId: 21, sgLength: 'long' }])
    await writeBaniOfflineCache(21, 'short', buildResult(21, 'short'))
    await writeBaniOfflineCache(21, 'long', buildResult(21, 'long'))
    for (let id = 100; id < 110; id += 1) await writeBaniOfflineCache(id, null, buildResult(id))
    expect(await readBaniOfflineCache(21, 'short')).toBeNull()
    expect(await readBaniOfflineCache(21, 'long')).toEqual(buildResult(21, 'long'))
    expect(JSON.parse(localStorage.getItem('naamras-bani-reading-index-v1')!)).toHaveLength(8)
  })

  it('falls back when Cache Storage rejects a write and tolerates a full fallback', async () => {
    vi.stubGlobal('caches', { open: vi.fn().mockRejectedValue(new DOMException('Full', 'QuotaExceededError')) })
    await writeBaniOfflineCache(21, 'short', buildResult(21, 'short'))
    expect(await readBaniOfflineCache(21, 'short')).toEqual(buildResult(21, 'short'))
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError') })
    await expect(writeBaniOfflineCache(22, null, buildResult(22))).resolves.toBeUndefined()
    setItem.mockRestore()
  })

  it('rejects another bani or a different length stored under a matching cache key', async () => {
    localStorage.setItem('naamras-bani-reading-v1:2:default', JSON.stringify(buildResult(4)))
    localStorage.setItem('naamras-bani-reading-v1:21:long', JSON.stringify(buildResult(21, 'short')))
    expect(await readBaniOfflineCache(2)).toBeNull()
    expect(await readBaniOfflineCache(21, 'long')).toBeNull()
  })

  it('does not overwrite a verified reading with an incompatible response', async () => {
    const exact = buildResult(21, 'long')
    await writeBaniOfflineCache(21, 'long', exact)
    await writeBaniOfflineCache(21, 'long', buildResult(21, 'short'))
    await writeBaniOfflineCache(21, 'long', buildResult(22, 'long'))
    expect(await readBaniOfflineCache(21, 'long')).toEqual(exact)
  })

  it('treats malformed cached entries as missing rather than crashing the reader', async () => {
    localStorage.setItem('naamras-bani-reading-v1:2:default', JSON.stringify({ ...buildResult(2), entries: [null] }))
    expect(await readBaniOfflineCache(2)).toBeNull()
  })
})

describe('baniOfflineCache Cache Storage', () => {
  it('requires a refreshed order revision for zero-shabad legacy Rehras long in Cache Storage', async () => {
    const legacy = await fetchBani(21, 'long')
    legacy.entries = legacy.entries.map(entry => ({ ...entry, id: `bani-21-${entry.ang}-0`, shabadId: 0,
      lines: entry.lines?.map(line => ({ ...line, shabadId: 0 })),
    }))
    const bytes = JSON.stringify({ ...legacy, normalizationRevision: undefined })
    const cache = { match: vi.fn(async () => new Response(bytes)), delete: vi.fn(), put: vi.fn() }
    vi.stubGlobal('caches', { open: vi.fn(async () => cache) })
    expect(await readBaniOfflineCache(21, 'long')).toBeNull()
    expect(cache.delete).not.toHaveBeenCalled()
    expect(cache.put).not.toHaveBeenCalled()
  })

  it('applies the same metadata-only migration to legacy Cache Storage readings', async () => {
    const legacy = await fetchBani(21, 'short')
    legacy.entries = legacy.entries.map(entry => ({
      ...entry, id: `bani-21-${entry.ang}-0`, source: 'G', scripture: 'SGGS', sourceName: 'SGGS',
      sourceMeta: null, shabadId: 0, lines: entry.lines?.map(line => ({ ...line, shabadId: 0 })),
    }))
    vi.stubGlobal('caches', { open: vi.fn(async () => ({
      match: vi.fn(async () => new Response(JSON.stringify(legacy))),
    })) })
    const cached = await readBaniOfflineCache(21, 'short')
    expect(cached?.entries.every(entry => entry.scripture === 'Sundar Gutka' && entry.sourceAttribution === 'unavailable')).toBe(true)
    expect(cached?.entries.flatMap(entry => entry.lines ?? [])).toEqual(legacy.entries.flatMap(entry => entry.lines ?? []))
    expect(await readBaniOfflineCache(21, 'long')).toBeNull()
  })
  it('falls back to a verified local reading when Cache Storage has incompatible content', async () => {
    const exact = buildResult(21, 'long')
    localStorage.setItem('naamras-bani-reading-v1:21:long', JSON.stringify(exact))
    vi.stubGlobal('caches', { open: vi.fn(async () => ({
      match: vi.fn(async () => new Response(JSON.stringify(buildResult(21, 'short')))),
    })) })
    expect(await readBaniOfflineCache(21, 'long')).toEqual(exact)
  })

  it('retains thirteen selected readings, evicts unselected entries, and remains bounded', async () => {
    const entries = new Map<string, Response>()
    const cache = {
      put: vi.fn(async (request: Request, response: Response) => { entries.set(request.url, response.clone()) }),
      match: vi.fn(async (request: Request) => entries.get(request.url)?.clone()),
      keys: vi.fn(async () => [...entries.keys()].map(url => new Request(url))),
      delete: vi.fn(async (request: Request) => entries.delete(request.url)),
    }
    vi.stubGlobal('caches', { open: vi.fn(async () => cache) })
    const selections = NITNEM_ROUTE_OPTIONS.map(option => ({ baniDbId: option.baniDbId!, sgLength: option.supportsLengthAdjustment ? 'short' as const : null }))
    setProtectedBaniOfflineReadings(selections)
    for (const reading of selections) await writeBaniOfflineCache(reading.baniDbId, reading.sgLength, buildResult(reading.baniDbId, reading.sgLength))
    for (let id = 100; id < 115; id += 1) await writeBaniOfflineCache(id, null, buildResult(id))
    for (const reading of selections) expect(await readBaniOfflineCache(reading.baniDbId, reading.sgLength)).toEqual(buildResult(reading.baniDbId, reading.sgLength))
    expect(entries.size).toBe(13)
    expect(localStorage.length).toBe(0)

    setProtectedBaniOfflineReadings([])
    await writeBaniOfflineCache(200, null, buildResult(200))
    expect(entries.size).toBe(12)
    expect(await readBaniOfflineCache(200, null)).toEqual(buildResult(200))
  })
})
