import { expect, test, vi } from 'vitest'
import {
  BANIDB_MAX_CACHE_BYTES,
  BANIDB_MAX_RATE_LIMIT_ENTRIES,
  BANIDB_MAX_REQUEST_BYTES,
  BANIDB_MAX_SEARCH_PAGE,
  buildBanidbUpstreamUrl,
  createBanidbProxyHandler as createHandler,
  isAllowedBanidbOrigin,
  readBanidbProjectApiKeys,
  type BanidbCacheEntry,
  type BanidbRateLimitEntry,
} from '../../supabase/functions/banidb-proxy/index'

const PROXY_URL = 'https://naamras-functions.example/banidb-proxy'
const PROJECT_KEY = 'sb_publishable_proxy_test'

function createBanidbProxyHandler(options: Parameters<typeof createHandler>[0] = {}) {
  return createHandler({ projectApiKeys: [PROJECT_KEY], ...options })
}

function proxyRequest(
  body: unknown,
  origin = 'https://naamras.xyz',
  method = 'POST',
  clientAddress?: string
) {
  return new Request(PROXY_URL, {
    method,
    headers: {
      'content-type': 'application/json',
      apikey: PROJECT_KEY,
      origin,
      ...(clientAddress ? { 'x-forwarded-for': clientAddress } : {}),
    },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  })
}

function jsonUpstream(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

test('loads only named publishable keys and the legacy anonymous key', () => {
  const env: Record<string, string> = {
    SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({
      default: ` ${PROJECT_KEY} `,
      mobile: 'sb_publishable_mobile',
      invalid: 'sb_secret_not_allowed',
      nonString: 123,
    }),
    SUPABASE_ANON_KEY: ' legacy-anon-jwt ',
    SUPABASE_SERVICE_ROLE_KEY: 'never-read',
  }
  const readEnv = vi.fn((name: string) => env[name])
  expect(readBanidbProjectApiKeys(readEnv)).toEqual([
    PROJECT_KEY, 'sb_publishable_mobile', 'legacy-anon-jwt',
  ])
  expect(readEnv).not.toHaveBeenCalledWith('SUPABASE_SERVICE_ROLE_KEY')
  expect(readBanidbProjectApiKeys(name => name === 'SUPABASE_PUBLISHABLE_KEYS' ? '{malformed' : undefined)).toEqual([])
  expect(readBanidbProjectApiKeys(() => undefined)).toEqual([])
})

test('requires a matching project API key without requiring a guest user session', async () => {
  const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () => jsonUpstream({ banis: [] }))
  const handler = createHandler({
    projectApiKeys: [PROJECT_KEY, 'legacy-anon-jwt'], fetchImpl,
  })
  const missing = proxyRequest({ path: '/v2/banis' })
  missing.headers.delete('apikey')
  missing.headers.set('authorization', `Bearer ${PROJECT_KEY}`)
  expect((await handler(missing)).status).toBe(401)

  const incorrect = proxyRequest({ path: '/v2/banis' })
  incorrect.headers.set('apikey', 'sb_publishable_other_project')
  expect((await handler(incorrect)).status).toBe(401)
  expect(fetchImpl).not.toHaveBeenCalled()

  const accepted = await handler(proxyRequest({ path: '/v2/banis' }))
  expect(accepted.status).toBe(200)
  expect(await accepted.json()).toEqual({ banis: [] })

  const legacy = proxyRequest({ path: '/v2/banis/1' })
  legacy.headers.set('apikey', 'legacy-anon-jwt')
  expect((await handler(legacy)).status).toBe(200)
  expect(fetchImpl).toHaveBeenCalledTimes(2)
})

test('fails closed without project keys while preserving credential-free CORS preflight', async () => {
  const fetchImpl = vi.fn<typeof fetch>()
  const handler = createHandler({ fetchImpl })
  const unavailable = await handler(proxyRequest({ path: '/v2/banis' }))
  expect(unavailable.status).toBe(503)
  expect(await unavailable.json()).toEqual({ error: 'Scripture proxy is not configured.' })

  const options = proxyRequest(null, 'https://naamras.xyz', 'OPTIONS')
  options.headers.delete('apikey')
  const preflight = await handler(options)
  expect(preflight.status).toBe(204)
  expect(preflight.headers.get('access-control-allow-headers')).toContain('apikey')
  expect(preflight.headers.get('access-control-allow-origin')).toBe('https://naamras.xyz')
  expect(fetchImpl).not.toHaveBeenCalled()
})

test('allows only the BaniDB routes and search query values used by the app', () => {
  const readPaths = [
    '/v2/angs/1/G',
    '/v2/shabads/2591',
    '/v2/banis',
    '/v2/banis/24',
    '/v2/amritkeertan',
    '/v2/amritkeertan/index/1',
    '/v2/hukamnamas',
    '/v2/hukamnamas/2026/07/25',
    '/v2/kosh/%E0%A9%B4',
    '/v2/kosh/search/%E0%A9%B4',
    '/v2/rehats',
    '/v2/rehats/1',
    '/v2/rehats/1/chapters/11',
  ]
  for (const path of readPaths) {
    expect(buildBanidbUpstreamUrl(path, undefined).pathname).toBe(path)
  }

  const searchUrl = buildBanidbUpstreamUrl('/v2/search/death', {
    searchtype: '8',
    source: 'all',
  })
  expect(searchUrl.search).toBe('?searchtype=8&source=all')

  expect(() => buildBanidbUpstreamUrl('/v2/admin', undefined)).toThrow()
  expect(() => buildBanidbUpstreamUrl('/v2/shabads/-1', undefined)).toThrow()
  expect(() => buildBanidbUpstreamUrl('/v2/banis/24', { extra: 'true' })).toThrow()
  expect(() => buildBanidbUpstreamUrl('/v2/search/death', {
    searchtype: '9',
    source: 'all',
  })).toThrow()
  expect(() => buildBanidbUpstreamUrl('/v2/hukamnamas/2026/02/31', undefined)).toThrow()
})

test('restricts CORS while allowing production, local development, and mobile webviews', async () => {
  expect(isAllowedBanidbOrigin('https://naamras.xyz')).toBe(true)
  expect(isAllowedBanidbOrigin('http://127.0.0.1:4173')).toBe(true)
  expect(isAllowedBanidbOrigin('capacitor://localhost')).toBe(true)
  expect(isAllowedBanidbOrigin('ionic://localhost')).toBe(true)
  expect(isAllowedBanidbOrigin('https://attacker.example')).toBe(false)

  const handler = createBanidbProxyHandler()
  const rejected = await handler(proxyRequest(
    { path: '/v2/banis' },
    'https://attacker.example'
  ))
  expect(rejected.status).toBe(403)
  expect(rejected.headers.has('access-control-allow-origin')).toBe(false)

  const preflight = await handler(proxyRequest(
    null,
    'capacitor://localhost',
    'OPTIONS'
  ))
  expect(preflight.status).toBe(204)
  expect(preflight.headers.get('access-control-allow-origin')).toBe('capacitor://localhost')
})

test('forwards search pages and caches each page independently', async () => {
  const cache = new Map<string, BanidbCacheEntry>()
  const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async input => {
    const page = Number(new URL(String(input)).searchParams.get('page') ?? '1')
    return jsonUpstream({ verses: [{ verseId: page }], resultsInfo: { pages: { page } } })
  })
  const handler = createBanidbProxyHandler({ cache, fetchImpl })
  const firstPage = { path: '/v2/search/peace', query: { searchtype: '3', source: 'all' } }
  const secondPage = { path: firstPage.path, query: { ...firstPage.query, page: '2' } }

  const first = await handler(proxyRequest(firstPage))
  const second = await handler(proxyRequest(secondPage))
  expect(first.status).toBe(200)
  expect(second.status).toBe(200)
  expect(await first.json()).toMatchObject({ verses: [{ verseId: 1 }] })
  expect(await second.json()).toMatchObject({ verses: [{ verseId: 2 }] })
  expect(String(fetchImpl.mock.calls[1]?.[0])).toBe('https://api.banidb.com/v2/search/peace?page=2&searchtype=3&source=all')

  const cachedSecond = await handler(proxyRequest({
    path: secondPage.path, query: { page: '2', source: 'all', searchtype: '3' },
  }))
  expect(cachedSecond.headers.get('x-cache')).toBe('HIT')
  expect(await cachedSecond.json()).toMatchObject({ verses: [{ verseId: 2 }] })

  const explicitFirst = await handler(proxyRequest({
    path: firstPage.path, query: { ...firstPage.query, page: '1' },
  }))
  expect(explicitFirst.headers.get('x-cache')).toBe('HIT')
  expect(await explicitFirst.json()).toMatchObject({ verses: [{ verseId: 1 }] })
  expect(cache.size).toBe(2)
  expect(fetchImpl).toHaveBeenCalledTimes(2)
})

test.each(['0', '-1', '1.5', '2e2', '+2', '02', ' 2', '2 ', '', 'NaN', 'Infinity', String(BANIDB_MAX_SEARCH_PAGE + 1), '9007199254740992', 2, null])(
  'rejects invalid search page %j before fetching upstream', async page => {
    const fetchImpl = vi.fn<typeof fetch>()
    const handler = createBanidbProxyHandler({ fetchImpl })
    const response = await handler(proxyRequest({
      path: '/v2/search/peace', query: { searchtype: '3', source: 'all', page },
    }))
    expect(response.status).toBe(400)
    expect(fetchImpl).not.toHaveBeenCalled()
  }
)

test('forwards a paginated Gurmukhi main-letter search', async () => {
  const path = `/v2/search/${encodeURIComponent('ਹਕਮ')}`
  const payload = { verses: [{ verseId: 21 }], resultsInfo: { pages: { page: 2 } } }
  const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonUpstream(payload))
  const handler = createBanidbProxyHandler({ fetchImpl })

  const response = await handler(proxyRequest({
    path, query: { searchtype: '6', source: 'G', page: '2' },
  }))

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual(payload)
  expect(String(fetchImpl.mock.calls[0]?.[0])).toBe(`https://api.banidb.com${path}?page=2&searchtype=6&source=G`)
  expect(fetchImpl).toHaveBeenCalledTimes(1)
})

test('bounds pagination to search routes with their required mode and source', () => {
  const maximumPage = buildBanidbUpstreamUrl('/v2/search/peace', {
    searchtype: '3', source: 'G', page: String(BANIDB_MAX_SEARCH_PAGE),
  })
  expect(maximumPage.searchParams.get('page')).toBe(String(BANIDB_MAX_SEARCH_PAGE))
  expect(() => buildBanidbUpstreamUrl('/v2/banis', { page: '2' })).toThrow()
  expect(() => buildBanidbUpstreamUrl('/v2/search/peace', { searchtype: '3', page: '2' })).toThrow()
  expect(() => buildBanidbUpstreamUrl('/v2/search/peace', { source: 'all', page: '2' })).toThrow()
  expect(() => buildBanidbUpstreamUrl('/v2/search/peace', {
    searchtype: '3', source: 'all', page: '2', results: '1000',
  })).toThrow()
})

test('accepts long encoded Gurmukhi passages within the decoded search limit', async () => {
  const passage = 'ਸਤਿ ਨਾਮੁ '.repeat(12).trim()
  const path = `/v2/search/${encodeURIComponent(passage)}`
  expect(passage.length).toBeLessThanOrEqual(160)
  expect(path.length).toBeGreaterThan(512)
  const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonUpstream({ verses: [] }))
  const handler = createBanidbProxyHandler({ fetchImpl })

  const accepted = await handler(proxyRequest({ path, query: { searchtype: '2', source: 'all' } }))
  expect(accepted.status).toBe(200)
  expect(new URL(String(fetchImpl.mock.calls[0]?.[0])).pathname).toBe(path)

  const rejected = await handler(proxyRequest({
    path: `/v2/search/${encodeURIComponent('ਅ'.repeat(161))}`,
    query: { searchtype: '2', source: 'all' },
  }))
  expect(rejected.status).toBe(400)
  expect(fetchImpl).toHaveBeenCalledTimes(1)
})

test('returns validated JSON with controlled headers and errors', async () => {
  const fetchImpl = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(jsonUpstream({ page: [] }))
    .mockResolvedValueOnce(new Response('<html>upstream error</html>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    }))
    .mockResolvedValueOnce(new Response('not-json', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
  const handler = createBanidbProxyHandler({ fetchImpl })

  const valid = await handler(proxyRequest({ path: '/v2/angs/1/G' }))
  expect(valid.status).toBe(200)
  expect(valid.headers.get('access-control-allow-origin')).toBe('https://naamras.xyz')
  expect(valid.headers.get('access-control-expose-headers')).toContain('retry-after')
  expect(valid.headers.get('x-content-type-options')).toBe('nosniff')
  expect(await valid.json()).toEqual({ page: [] })

  const invalidType = await handler(proxyRequest({ path: '/v2/angs/2/G' }))
  expect(invalidType.status).toBe(502)
  expect(await invalidType.json()).toEqual({ error: 'BaniDB returned an invalid response.' })

  const invalidJson = await handler(proxyRequest({ path: '/v2/angs/3/G' }))
  expect(invalidJson.status).toBe(502)
  expect(await invalidJson.json()).toEqual({ error: 'BaniDB returned invalid JSON.' })
})

test('bounds cache growth, retains recent entries, and expires stale entries', async () => {
  let now = 1_000
  const cache = new Map<string, BanidbCacheEntry>()
  const fetchImpl = vi.fn<typeof fetch>()
    .mockImplementation(async input => jsonUpstream({ url: String(input) }))
  const handler = createBanidbProxyHandler({
    cache,
    cacheTtlMs: 100,
    fetchImpl,
    maxCacheEntries: 2,
    now: () => now,
  })

  await handler(proxyRequest({ path: '/v2/shabads/1' }))
  await handler(proxyRequest({ path: '/v2/shabads/2' }))
  await handler(proxyRequest({ path: '/v2/shabads/3' }))

  expect(cache).toHaveLength(2)
  expect(Array.from(cache.keys()).some(key => key.endsWith('/v2/shabads/1'))).toBe(false)

  const cached = await handler(proxyRequest({ path: '/v2/shabads/2' }))
  expect(cached.headers.get('x-cache')).toBe('HIT')
  expect(fetchImpl).toHaveBeenCalledTimes(3)

  now += 101
  const refreshed = await handler(proxyRequest({ path: '/v2/shabads/2' }))
  expect(refreshed.headers.get('x-cache')).toBe('MISS')
  expect(fetchImpl).toHaveBeenCalledTimes(4)
})

test('bounds aggregate cache bytes as well as entry count', async () => {
  const cache = new Map<string, BanidbCacheEntry>()
  const fetchImpl = vi.fn<typeof fetch>()
    .mockImplementation(async input => jsonUpstream({
      url: String(input),
      value: 'x'.repeat(48),
    }))
  const handler = createBanidbProxyHandler({
    cache,
    fetchImpl,
    maxCacheBytes: 150,
    maxCacheEntries: 10,
  })

  await handler(proxyRequest({ path: '/v2/shabads/1' }))
  await handler(proxyRequest({ path: '/v2/shabads/2' }))
  await handler(proxyRequest({ path: '/v2/shabads/3' }))

  const cachedBytes = Array.from(cache.values())
    .reduce((total, entry) => total + new TextEncoder().encode(entry.body).byteLength, 0)
  expect(cachedBytes).toBeLessThanOrEqual(150)
  expect(cachedBytes).toBeLessThanOrEqual(BANIDB_MAX_CACHE_BYTES)
  expect(cache.size).toBeLessThan(3)
})

test('rejects oversized and unsupported proxy requests before fetching upstream', async () => {
  const fetchImpl = vi.fn<typeof fetch>()
  const handler = createBanidbProxyHandler({ fetchImpl })
  const oversized = 'x'.repeat(BANIDB_MAX_REQUEST_BYTES)

  const oversizedResponse = await handler(proxyRequest({
    path: '/v2/search/test',
    query: { searchtype: '0', source: 'all' },
    oversized,
  }))
  expect(oversizedResponse.status).toBe(413)

  const unsupported = await handler(proxyRequest({ path: '/v2/private/export' }))
  expect(unsupported.status).toBe(400)
  expect(await unsupported.json()).toEqual({ error: 'Unsupported BaniDB request.' })
  expect(fetchImpl).not.toHaveBeenCalled()
})

test('requires an exact JSON request media type', async () => {
  const fetchImpl = vi.fn<typeof fetch>()
  const handler = createBanidbProxyHandler({ fetchImpl })
  const missing = new Request(PROXY_URL, {
    method: 'POST',
    headers: { origin: 'https://naamras.xyz', apikey: PROJECT_KEY },
    body: JSON.stringify({ path: '/v2/banis' }),
  })
  const misleading = new Request(PROXY_URL, {
    method: 'POST',
    headers: {
      'content-type': 'text/plain; profile=application/json',
      apikey: PROJECT_KEY,
      origin: 'https://naamras.xyz',
    },
    body: JSON.stringify({ path: '/v2/banis' }),
  })

  expect((await handler(missing)).status).toBe(415)
  expect((await handler(misleading)).status).toBe(415)
  expect(fetchImpl).not.toHaveBeenCalled()
})

test('rate limits invalid methods and media types before their validation exits', async () => {
  const fetchImpl = vi.fn<typeof fetch>()
  const handler = createBanidbProxyHandler({
    fetchImpl,
    rateLimitRequests: 2,
    rateLimitWindowMs: 60_000,
  })
  const clientAddress = '203.0.113.20'

  const invalidMethod = await handler(proxyRequest(
    null,
    'https://naamras.xyz',
    'GET',
    clientAddress
  ))
  expect(invalidMethod.status).toBe(405)
  expect(invalidMethod.headers.get('x-ratelimit-remaining')).toBe('1')

  const invalidMedia = () => new Request(PROXY_URL, {
    method: 'POST',
    headers: {
      'content-type': 'text/plain',
      apikey: PROJECT_KEY,
      origin: 'https://naamras.xyz',
      'x-forwarded-for': clientAddress,
    },
    body: JSON.stringify({ path: '/v2/banis' }),
  })
  const rejectedMedia = await handler(invalidMedia())
  expect(rejectedMedia.status).toBe(415)
  expect(rejectedMedia.headers.get('x-ratelimit-remaining')).toBe('0')

  const blockedBeforeMediaValidation = await handler(invalidMedia())
  expect(blockedBeforeMediaValidation.status).toBe(429)
  expect(blockedBeforeMediaValidation.headers.get('retry-after')).toBe('60')
  expect(fetchImpl).not.toHaveBeenCalled()
})

test('rate limits each client before body parsing and resets deterministically', async () => {
  let now = 1_000
  const fetchImpl = vi.fn<typeof fetch>()
    .mockResolvedValue(jsonUpstream({ banis: [] }))
  const handler = createBanidbProxyHandler({
    fetchImpl,
    now: () => now,
    rateLimitRequests: 2,
    rateLimitWindowMs: 1_000,
  })

  const first = await handler(proxyRequest(
    { path: '/v2/banis' },
    'https://naamras.xyz',
    'POST',
    '203.0.113.10'
  ))
  expect(first.status).toBe(200)
  expect(first.headers.get('x-ratelimit-limit')).toBe('2')
  expect(first.headers.get('x-ratelimit-remaining')).toBe('1')

  const second = await handler(proxyRequest(
    { path: '/v2/banis' },
    'https://naamras.xyz',
    'POST',
    '203.0.113.10'
  ))
  expect(second.status).toBe(200)
  expect(second.headers.get('x-ratelimit-remaining')).toBe('0')

  const blocked = await handler(proxyRequest(
    { malformed: true },
    'https://naamras.xyz',
    'POST',
    '203.0.113.10'
  ))
  expect(blocked.status).toBe(429)
  expect(blocked.headers.get('retry-after')).toBe('1')
  expect(await blocked.json()).toEqual({
    error: 'Too many BaniDB requests. Please try again later.',
  })
  expect(fetchImpl).toHaveBeenCalledTimes(1)

  now += 1_001
  const reset = await handler(proxyRequest(
    { path: '/v2/banis' },
    'https://naamras.xyz',
    'POST',
    '203.0.113.10'
  ))
  expect(reset.status).toBe(200)
  expect(reset.headers.get('x-ratelimit-remaining')).toBe('1')
})

test('bounds per-client rate-limit state and uses a shared overflow bucket', async () => {
  const rateLimits = new Map<string, BanidbRateLimitEntry>()
  const fetchImpl = vi.fn<typeof fetch>()
    .mockResolvedValue(jsonUpstream({ banis: [] }))
  const handler = createBanidbProxyHandler({
    fetchImpl,
    maxRateLimitEntries: 2,
    rateLimitRequests: 1,
    rateLimitWindowMs: 60_000,
    rateLimits,
  })

  for (const address of ['203.0.113.1', '203.0.113.2', '203.0.113.3']) {
    const response = await handler(proxyRequest(
      { path: '/v2/banis' },
      'https://naamras.xyz',
      'POST',
      address
    ))
    expect(response.status).toBe(200)
  }

  expect(rateLimits).toHaveLength(2)
  expect(rateLimits.size).toBeLessThanOrEqual(BANIDB_MAX_RATE_LIMIT_ENTRIES)

  const overflowBlocked = await handler(proxyRequest(
    { path: '/v2/banis' },
    'https://naamras.xyz',
    'POST',
    '203.0.113.4'
  ))
  expect(overflowBlocked.status).toBe(429)

  const originalClientStillTracked = await handler(proxyRequest(
    { path: '/v2/banis' },
    'https://naamras.xyz',
    'POST',
    '203.0.113.1'
  ))
  expect(originalClientStillTracked.status).toBe(429)
  expect(rateLimits).toHaveLength(2)
})
