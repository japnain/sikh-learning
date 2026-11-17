import { describe, expect, test, vi } from 'vitest'
import { authenticatePrivateLibrary } from '../../supabase/functions/private-library/auth'
import {
  createPrivateLibraryHandler, parsePrivateRange,
  type PrivateLibraryService,
} from '../../supabase/functions/private-library/handler'
import {
  PRIVATE_RANGE_MAX_BYTES, PRIVATE_STATE_MAX_BYTES,
  type PrivateAsset, type PrivateBookMetadata,
} from '../../supabase/functions/private-library/contract'

const book: PrivateBookMetadata = {
  id: 'example-book', title: 'Private test title', authors: ['Test Author'],
  description: 'Private test description', category: 'test', language: 'en',
  formats: ['pdf'], editionVersion: 'edition-1', renderer: 'pdf', contents: [],
  primaryAssetId: 'asset-1',
}
const asset: PrivateAsset = {
  id: 'asset-1', book_id: book.id, object_key: 'example-book/edition-1/asset-1.pdf',
  content_type: 'application/pdf', size: 10, checksum: 'a'.repeat(64),
}
const identity = { userId: 'verified-owner', sessionId: 'verified-session' }

describe('private JWT verification boundary', () => {
  const issuer = 'https://test.supabase.co/auth/v1'
  const claims = { iss: issuer, aud: 'authenticated', role: 'authenticated', exp: 2000,
    sub: '00000000-0000-4000-8000-000000000001', session_id: '00000000-0000-4000-8000-000000000002' }
  test('requires successful signature verification before using any identity claims', async () => {
    const verifier = vi.fn(async () => ({ claims, error: new Error('Invalid signature') }))
    expect(await authenticatePrivateLibrary('untrusted-token', issuer, verifier, 1000)).toBeNull()
    expect(verifier).toHaveBeenCalledWith('untrusted-token')
    const verified = await authenticatePrivateLibrary('valid-token', issuer, async () => ({ claims }), 1000)
    expect(verified).toEqual({ userId: claims.sub, sessionId: claims.session_id })
  })
  test('rejects wrong project, non-user roles, expiry and missing/malformed session IDs', async () => {
    for (const override of [{ iss: 'https://other.supabase.co/auth/v1' }, { aud: 'service_role' },
      { role: 'service_role' }, { exp: 999 }, { exp: Infinity }, { exp: '2000' },
      { sub: 'not-a-uuid' }, { session_id: undefined }, { session_id: 'not-a-uuid' },
      { nbf: 1001 }, { nbf: '1001' }]) {
      expect(await authenticatePrivateLibrary('token', issuer, async () => ({ claims: { ...claims, ...override } }), 1000)).toBeNull()
    }
  })
})

function request(action = 'catalog', options: {
  token?: string | null; method?: string; range?: string; origin?: string;
  body?: unknown; bookId?: string; assetId?: string; edition?: string; extra?: Record<string, string>;
} = {}) {
  const params = new URLSearchParams({ action, bookId: options.bookId ?? book.id, assetId: options.assetId ?? asset.id,
    editionVersion: options.edition ?? book.editionVersion })
  return new Request(`https://test.supabase.co/functions/v1/private-library?${params}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.token !== null ? { authorization: `Bearer ${options.token ?? 'header.payload.signature'}` } : {}),
      origin: options.origin ?? 'https://naamras.xyz',
      ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(options.range ? { range: options.range } : {}), ...options.extra,
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  })
}

function setup(overrides: Partial<PrivateLibraryService> = {}) {
  const service: PrivateLibraryService = {
    authenticate: vi.fn(async () => identity),
    authorize: vi.fn(async () => 'allowed' as const),
    listBooks: vi.fn(async () => [book]),
    getBook: vi.fn(async () => book),
    getAsset: vi.fn(async () => asset),
    fetchAsset: vi.fn(async (_asset, range) => {
      const parsed = parsePrivateRange(range, asset.size)
      const start = parsed ? parsed.start : 0
      const end = parsed ? parsed.end : 9
      return new Response('0123456789'.slice(start, end + 1), {
        status: parsed ? 206 : 200,
        headers: { 'content-length': String(end - start + 1),
          ...(parsed ? { 'content-range': `bytes ${start}-${end}/10` } : {}),
          'cache-control': 'public, max-age=3600', location: 'https://storage.example/private-object',
        },
      })
    }),
    getState: vi.fn(async () => null), putState: vi.fn(async () => {}), ...overrides,
  }
  const createService = vi.fn(() => service)
  const handler = createPrivateLibraryHandler({
    readEnv: name => ({ SUPABASE_URL: 'https://test.supabase.co', SUPABASE_ANON_KEY: 'test-public-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key' })[name], createService,
  })
  return { service, handler, createService }
}

describe('private library gateway authorization', () => {
  test('rejects absent/malformed/invalid authentication before any private lookup', async () => {
    const { handler, service } = setup({ authenticate: vi.fn(async () => null) })
    for (const token of [null, 'malformed token', 'header.payload.signature']) {
      for (const action of ['catalog', 'book', 'asset', 'state']) {
        const response = await handler(request(action, { token }))
        expect(response.status).toBe(401)
        expect(await response.text()).not.toContain(book.title)
        expect(response.headers.get('cache-control')).toBe('private, no-store')
      }
    }
    expect(service.authorize).not.toHaveBeenCalled()
    expect(service.listBooks).not.toHaveBeenCalled()
    expect(service.getBook).not.toHaveBeenCalled()
  })

  test('denies ordinary accounts, other admins and revoked sessions for every data operation', async () => {
    const { handler, service } = setup({ authorize: vi.fn(async () => 'denied') })
    const requests = [request('catalog'), request('book'), request('state'), request('asset'),
      request('asset', { method: 'HEAD' }), request('asset', { range: 'bytes=0-3' }),
      request('state', { method: 'PUT', body: { state: { page: 3 } } }),
      request('asset', { extra: { 'if-none-match': '*', 'if-modified-since': new Date().toUTCString() } })]
    for (const req of requests) {
      const response = await handler(req)
      expect(response.status).toBe(403)
      expect(response.headers.has('content-range')).toBe(false)
      expect(response.headers.has('content-length')).toBe(false)
      expect(await response.text()).not.toContain(book.title)
    }
    const capability = await handler(request('capability'))
    expect(await capability.json()).toEqual({ allowed: false })
    expect(service.getBook).not.toHaveBeenCalled()
    expect(service.fetchAsset).not.toHaveBeenCalled()
    expect(service.putState).not.toHaveBeenCalled()
  })

  test('rechecks session and grant on repeated requests rather than caching an allowed result', async () => {
    const authorize = vi.fn<PrivateLibraryService['authorize']>().mockResolvedValueOnce('allowed').mockResolvedValue('denied')
    const { handler, service } = setup({ authorize })
    expect((await handler(request('catalog'))).status).toBe(200)
    expect((await handler(request('catalog'))).status).toBe(403)
    expect((await handler(request('asset', { range: 'bytes=0-2' }))).status).toBe(403)
    expect(authorize).toHaveBeenCalledTimes(3)
    expect(authorize).toHaveBeenLastCalledWith(identity)
    expect(service.listBooks).toHaveBeenCalledOnce()
  })

  test('fails closed and redacts internal authentication and database errors', async () => {
    for (const method of ['authenticate', 'authorize', 'listBooks'] as const) {
      const { handler } = setup({ [method]: vi.fn(async () => { throw new Error(`secret diagnostics ${asset.object_key}`) }) })
      const response = await handler(request())
      expect(response.status).toBe(503)
      expect(await response.json()).toEqual({ error: 'private-library-unavailable' })
    }
  })

  test('restricts cross-origin access and handles preflight without private data', async () => {
    const { handler, createService } = setup()
    const denied = await handler(request('catalog', { origin: 'https://naamras.xyz.attacker.example' }))
    expect(denied.status).toBe(403)
    expect(denied.headers.has('access-control-allow-origin')).toBe(false)
    const preflight = await handler(request('asset', { method: 'OPTIONS', token: null }))
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('access-control-allow-headers')).toContain('range')
    expect(preflight.headers.get('cache-control')).toBe('private, no-store')
    expect(createService).not.toHaveBeenCalled()
  })
})

describe('private library data boundaries', () => {
  test('whitelists metadata fields and never emits storage keys or importer diagnostics', async () => {
    const contaminated = { ...book, object_key: asset.object_key, sourceFileName: 'private-file.epub', ownerEmail: 'private@example.invalid' }
    const { handler } = setup({ listBooks: async () => [contaminated], getBook: async () => contaminated })
    for (const action of ['catalog', 'book']) {
      const response = await handler(request(action))
      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toContain(book.title)
      expect(text).not.toContain(asset.object_key)
      expect(text).not.toContain('private-file')
      expect(text).not.toContain('ownerEmail')
    }
  })

  test('rejects asset-to-book mismatches and traversal metadata before any service-key fetch', async () => {
    for (const invalid of [{ ...asset, book_id: 'other-book' }, { ...asset, id: 'another-asset' },
      { ...asset, object_key: 'book/../secret' }, { ...asset, object_key: 'https://attacker.example/asset' },
      { ...asset, content_type: 'text/html' }, { ...asset, size: Infinity }]) {
      const { handler, service } = setup({ getAsset: async () => invalid })
      expect((await handler(request('asset'))).status).toBe(503)
      expect(service.fetchAsset).not.toHaveBeenCalled()
    }
    const { handler, service } = setup()
    expect((await handler(request('asset', { assetId: '../secret' }))).status).toBe(404)
    expect(service.getAsset).not.toHaveBeenCalled()
  })

  test('never serves an unavailable/not-ready book even if its asset exists', async () => {
    const { handler, service } = setup({ getBook: async () => null })
    expect((await handler(request('asset'))).status).toBe(404)
    expect(service.getAsset).not.toHaveBeenCalled()
  })

  test('binds state writes to the verified owner and current edition, and retains old-edition reads', async () => {
    const { handler, service } = setup()
    const saved = await handler(request('state', { method: 'PUT', body: { state: { locator: { page: 3 }, bookmarks: [], updatedAt: '2026-11-17T12:00:00.000Z' } } }))
    expect(saved.status).toBe(200)
    expect(service.putState).toHaveBeenCalledWith(identity.userId, book.id, book.editionVersion, { locator: { page: 3 }, bookmarks: [], updatedAt: '2026-11-17T12:00:00.000Z' })
    expect((await handler(request('state', { method: 'PUT', edition: 'old-edition', body: { state: {} } }))).status).toBe(409)
    expect((await handler(request('state', { edition: 'old-edition' }))).status).toBe(200)
    expect(service.getState).toHaveBeenLastCalledWith(identity.userId, book.id, 'old-edition')
    expect((await handler(request('state', { method: 'PUT', body: { state: {}, userId: 'attacker-id' } }))).status).toBe(400)
    expect(service.putState).toHaveBeenCalledOnce()
  })

  test('bounds state bodies and rejects unsafe/deep structures', async () => {
    const { handler, service } = setup()
    expect((await handler(request('state', { method: 'PUT', body: { state: { text: 'x'.repeat(PRIVATE_STATE_MAX_BYTES) } } }))).status).toBe(413)
    const poisoned = JSON.parse('{"__proto__":{"admin":true}}')
    expect((await handler(request('state', { method: 'PUT', body: { state: poisoned } }))).status).toBe(400)
    let nested: unknown = {}
    for (let i = 0; i < 20; i++) nested = { child: nested }
    expect((await handler(request('state', { method: 'PUT', body: { state: nested } }))).status).toBe(400)
    expect(service.putState).not.toHaveBeenCalled()
  })

  test('requires a canonical timestamp before accepting a state revision', async () => {
    const { handler, service } = setup()
    for (const updatedAt of [undefined, 'invalid', '2026-11-17T12:00:00Z', '2026-02-30T00:00:00.000Z']) {
      expect((await handler(request('state', { method: 'PUT', body: { state: { index: 2, updatedAt } } }))).status).toBe(400)
    }
    expect(service.putState).not.toHaveBeenCalled()
  })
})

describe('private asset streaming', () => {
  test('supports authorized HEAD and single byte ranges without forwarding upstream cache headers', async () => {
    const { handler, service } = setup()
    const head = await handler(request('asset', { method: 'HEAD' }))
    expect(head.status).toBe(200)
    expect(head.headers.get('content-length')).toBe('10')
    expect(await head.text()).toBe('')
    expect(service.fetchAsset).not.toHaveBeenCalled()
    const response = await handler(request('asset', { range: 'bytes=2-5' }))
    expect(response.status).toBe(206)
    expect(await response.text()).toBe('2345')
    expect(response.headers.get('content-range')).toBe('bytes 2-5/10')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.has('location')).toBe(false)
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  })

  test('validates range syntax, sizes and suffixes', async () => {
    expect(parsePrivateRange('bytes=-3', 10)).toEqual({ start: 7, end: 9 })
    expect(parsePrivateRange('bytes=2-', 10)).toEqual({ start: 2, end: 9 })
    expect(parsePrivateRange('bytes=0-', 10 * PRIVATE_RANGE_MAX_BYTES)).toEqual({ start: 0, end: PRIVATE_RANGE_MAX_BYTES - 1 })
    for (const range of ['bytes=3-1', 'bytes=99-100', 'bytes=0-1,4-6', 'bytes=-0', 'bytes=-', 'items=0-5', 'bytes=0-99999999999999999']) {
      const { handler, service } = setup()
      const response = await handler(request('asset', { range }))
      expect(response.status, range).toBe(416)
      expect(service.fetchAsset).not.toHaveBeenCalled()
    }
    expect(parsePrivateRange(`bytes=0-${PRIVATE_RANGE_MAX_BYTES}`, PRIVATE_RANGE_MAX_BYTES * 2)).toBe(false)
  })

  test('rejects redirects, ignored ranges, inconsistent byte counts and truncated streams', async () => {
    for (const remote of [new Response(null, { status: 302, headers: { location: 'https://storage.example/file' } }),
      new Response('0123456789', { status: 200 }),
      new Response('2345', { status: 206, headers: { 'content-range': 'bytes 2-6/10', 'content-length': '4' } }),
      new Response('2345', { status: 206, headers: { 'content-range': 'bytes 2-5/10', 'content-length': '8' } })]) {
      const { handler } = setup({ fetchAsset: async () => remote })
      expect((await handler(request('asset', { range: 'bytes=2-5' }))).status).toBe(502)
    }
    const { handler } = setup({ fetchAsset: async () => new Response('short', { status: 200 }) })
    const response = await handler(request('asset'))
    await expect(response.text()).rejects.toThrow('Private asset transfer interrupted')
  })

  test('honors the database rate limit before content lookups', async () => {
    const { handler, service } = setup({ authorize: async () => 'rate_limited' })
    const response = await handler(request('asset'))
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('60')
    expect(service.getBook).not.toHaveBeenCalled()
  })
})
