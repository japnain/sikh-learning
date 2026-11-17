import { webcrypto, createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchScripturePack } from './scripturePacks'
import { fetchHostedBaniReading, HOSTED_BANI_REVISION } from './hostedBani'
import { fetchShabadosBani, isShabadosBaniReading, SHABADOS_LINE_ID_BASE } from './shabados'
import { SHABADOS_SOURCE_REVISION } from '../data/shabadosBanis'

vi.mock('../supabase/config', () => ({
  getNaamrasSupabaseConfig: () => ({ enabled: true, url: 'https://scripture.example', anonKey: 'test-public-key' }),
}))

const fetchMock = vi.fn<typeof fetch>()
const line = {
  providerLineId: 'AB12', verseId: SHABADOS_LINE_ID_BASE + parseInt('AB12', 36), shabadId: 0, ang: 1,
  gurmukhi: 'ਸਤਿ ਨਾਮੁ', transliteration: 'sat naam', translation_en: '', translations_en: {}, translation_hi: '', translation_pa: '',
}
const reading = {
  entries: [{
    id: 'shabados-ALHN-0-1', source: 'G', scripture: 'SGGS', shabadId: 0, ang: 1,
    gurmukhi: line.gurmukhi, transliteration: line.transliteration, translation_en: '', translation_hi: '', translation_pa: '',
    words: [], lines: [line],
  }],
  availableLengths: [], resolvedLength: null, normalizationRevision: 2,
  provenance: { provider: 'shabados', readingId: 'ALHN', sourceRevision: SHABADOS_SOURCE_REVISION, formatVersion: 1, assets: ['SSA2'] },
}

function serve(payload: unknown, override: Record<string, unknown> = {}) {
  const text = JSON.stringify(payload)
  fetchMock.mockResolvedValue(new Response(JSON.stringify([{
    payload_json: text, payload_bytes: new TextEncoder().encode(text).byteLength,
    payload_sha256: createHash('sha256').update(text).digest('hex'), ...override,
  }]), { status: 200 }))
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('crypto', webcrypto)
})
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks() })

describe('hosted scripture integrity and identity', () => {
  it('loads a checksum-verified Shabad OS reading from the pinned backend revision', async () => {
    serve(reading)
    expect(await fetchShabadosBani('ALHN')).toEqual(reading)
    const [url, init] = fetchMock.mock.calls[0]!
    const requested = new URL(String(url))
    expect(requested.pathname).toBe('/rest/v1/scripture_reading_packs')
    expect(requested.searchParams.get('reading_key')).toBe('eq.shabados:ALHN')
    expect(requested.searchParams.get('source_revision')).toBe(`eq.${SHABADOS_SOURCE_REVISION}`)
    expect(init?.headers).toEqual({ apikey: 'test-public-key', Accept: 'application/json' })
  })

  it('rejects changed bytes even if their JSON structure is valid', async () => {
    serve(reading, { payload_sha256: '0'.repeat(64) })
    await expect(fetchShabadosBani('ALHN')).rejects.toThrow('integrity check')
  })

  it('rejects a truncated or incorrectly sized reading before accepting it', async () => {
    serve(reading, { payload_bytes: 3 })
    await expect(fetchShabadosBani('ALHN')).rejects.toThrow('verified download')
  })

  it('does not substitute another bani when a valid payload was returned under the wrong route', async () => {
    serve(reading)
    await expect(fetchShabadosBani('ANN6')).rejects.toThrow('did not match')
  })

  it('rejects BaniDB identifiers masquerading as local Shabad OS line anchors', () => {
    const wrong = structuredClone(reading)
    wrong.entries[0]!.lines[0]!.verseId = 123
    expect(isShabadosBaniReading(wrong, 'ALHN')).toBe(false)
    const wrongShabad = structuredClone(reading)
    wrongShabad.entries[0]!.shabadId = 123
    expect(isShabadosBaniReading(wrongShabad, 'ALHN')).toBe(false)
  })

  it('rejects unknown catalogue IDs without making a request', async () => {
    await expect(fetchShabadosBani('UNKNOWN')).rejects.toThrow('not in the catalogue')
    await expect(fetchHostedBaniReading(999999)).rejects.toThrow('Unknown bani')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps existing bani payloads exactly as hosted and pins their corpus revision', async () => {
    const existing = {
      entries: [{ ...reading.entries[0], id: 'bani-2-1-0', sourceMeta: { sourceId: 'G' } }],
      availableLengths: [], resolvedLength: null, normalizationRevision: 2,
    }
    serve(existing)
    expect(await fetchHostedBaniReading(2)).toEqual(existing)
    const request = new URL(String(fetchMock.mock.calls[0]![0]))
    expect(request.searchParams.get('source_revision')).toBe(`eq.${HOSTED_BANI_REVISION}`)
    expect(request.searchParams.get('variant')).toBe('eq.default')
  })

  it('never accepts the wrong existing length or requests live upstream as a fallback', async () => {
    const existing = {
      entries: [{ ...reading.entries[0], id: 'bani-21-1-0', sourceMeta: { sourceId: 'G' } }],
      availableLengths: ['short', 'long'], resolvedLength: 'short', normalizationRevision: 2,
    }
    serve(existing)
    await expect(fetchHostedBaniReading(21, 'long')).rejects.toThrow('bani and length')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not begin a cancelled download', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(fetchScripturePack({ key: 'shabados:ALHN', revision: SHABADOS_SOURCE_REVISION }, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('handles unpublished or missing packs without inventing content', async () => {
    fetchMock.mockResolvedValue(new Response('[]', { status: 200 }))
    await expect(fetchShabadosBani('ALHN')).rejects.toThrow('not available')
  })
})
