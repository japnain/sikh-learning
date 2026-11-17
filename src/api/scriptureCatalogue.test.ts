import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { fetchPublishedScriptureReadingKeys, fetchPublishedScriptureSizes } from './scriptureCatalogue'
import { HOSTED_BANI_REVISION } from './hostedBani'
import { SHABADOS_BANIS, SHABADOS_SOURCE_REVISION } from '../data/shabadosBanis'

const { config } = vi.hoisted(() => ({ config: { enabled: true, url: 'https://scripture.example/', anonKey: 'test-public-key' } }))
vi.mock('../supabase/config', () => ({ getNaamrasSupabaseConfig: () => config }))
const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => { config.enabled = true; vi.stubGlobal('fetch', fetchMock) })
afterEach(() => { vi.unstubAllGlobals(); vi.resetAllMocks() })

test('requests only published default-pack metadata at supported revisions', async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(SHABADOS_BANIS.map(bani => ({ reading_key: `shabados:${bani.id}`, source_revision: SHABADOS_SOURCE_REVISION })))))
  expect(await fetchPublishedScriptureReadingKeys()).toEqual(SHABADOS_BANIS.map(bani => `shabados:${bani.id}`))
  const [input, init] = fetchMock.mock.calls[0]!
  const url = new URL(String(input))
  expect(url.pathname).toBe('/rest/v1/scripture_reading_packs')
  expect(url.searchParams.get('select')).toBe('reading_key,source_revision')
  expect(url.searchParams.get('variant')).toBe('eq.default')
  expect(url.searchParams.get('format_version')).toBe('eq.1')
  expect(url.searchParams.get('source_revision')).toBe(`in.(${HOSTED_BANI_REVISION},${SHABADOS_SOURCE_REVISION})`)
  expect(init?.headers).toEqual({ apikey: 'test-public-key', Accept: 'application/json' })
})

test('only offers recognized keys with their own exact pinned revision and removes duplicates', async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify([
    { reading_key: 'banidb:21', source_revision: HOSTED_BANI_REVISION },
    { reading_key: 'banidb:21', source_revision: HOSTED_BANI_REVISION },
    { reading_key: 'banidb:999999', source_revision: HOSTED_BANI_REVISION },
    { reading_key: 'shabados:ALHN', source_revision: HOSTED_BANI_REVISION },
    { reading_key: 'shabados:ANN6', source_revision: 'unverified-revision' },
    { reading_key: 'shabados:UNKNOWN', source_revision: SHABADOS_SOURCE_REVISION },
    null, false, {}, { reading_key: 'banidb:01', source_revision: HOSTED_BANI_REVISION },
  ])))
  expect(await fetchPublishedScriptureReadingKeys()).toEqual(['banidb:21'])
})

test('allows a genuinely empty published catalogue without guessing availability', async () => {
  fetchMock.mockResolvedValue(new Response('[]'))
  expect(await fetchPublishedScriptureReadingKeys()).toEqual([])
})

test.each([
  new Response('{}'),
  new Response('[]', { status: 503 }),
])('rejects a failed or malformed catalogue response', async response => {
  fetchMock.mockResolvedValue(response)
  await expect(fetchPublishedScriptureReadingKeys()).rejects.toThrow('could not be checked')
})

test('passes cancellation through and avoids starting already cancelled requests', async () => {
  const controller = new AbortController()
  fetchMock.mockResolvedValue(new Response('[]'))
  await fetchPublishedScriptureReadingKeys(controller.signal)
  expect(fetchMock.mock.calls[0]![1]?.signal).toBe(controller.signal)
  controller.abort()
  await expect(fetchPublishedScriptureReadingKeys(controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  expect(fetchMock).toHaveBeenCalledOnce()
})

test('does not fetch from an unconfigured service', async () => {
  config.enabled = false
  await expect(fetchPublishedScriptureReadingKeys()).rejects.toThrow('not configured')
  expect(fetchMock).not.toHaveBeenCalled()
})


test('estimates every named length once, excludes default aliases and ignores unsupported revisions', async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify([
    ...['default', 'short', 'medium', 'long'].map(variant => ({ reading_key: 'banidb:21', source_revision: HOSTED_BANI_REVISION, variant, payload_bytes: 1000 })),
    { reading_key: 'shabados:ALHN', source_revision: SHABADOS_SOURCE_REVISION, variant: 'default', payload_bytes: 500 },
    { reading_key: 'shabados:ANN6', source_revision: 'unverified', variant: 'default', payload_bytes: 8000 },
    { reading_key: 'banidb:21', source_revision: HOSTED_BANI_REVISION, variant: 'invented', payload_bytes: 9000 },
  ])))
  expect(await fetchPublishedScriptureSizes()).toEqual({ 'banidb:21': 3000, 'shabados:ALHN': 500 })
  expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.has('variant')).toBe(false)
})
