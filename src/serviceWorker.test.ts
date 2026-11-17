import fs from 'node:fs'
import { createHash, webcrypto } from 'node:crypto'
import path from 'node:path'
import { runInNewContext } from 'node:vm'
import { expect, test, vi } from 'vitest'

const PROJECT_ROOT = process.cwd()
const WORKER_ORIGIN = 'https://naamras.test'
const workerSource = fs.readFileSync(path.join(PROJECT_ROOT, 'public', 'sw.js'), 'utf8')

type CacheRequest = string | { url: string }

function cacheUrl(request: CacheRequest) {
  return new URL(typeof request === 'string' ? request : request.url, WORKER_ORIGIN).href
}

class MemoryCache {
  private responses = new Map<string, Response>()

  async put(request: CacheRequest, response: Response) {
    this.responses.set(cacheUrl(request), response.clone())
  }

  async match(request: CacheRequest) {
    return this.responses.get(cacheUrl(request))?.clone()
  }

  async delete(request: CacheRequest) {
    return this.responses.delete(cacheUrl(request))
  }
}

function createCacheStorage() {
  const stores = new Map<string, MemoryCache>()
  return {
    async open(name: string) {
      let cache = stores.get(name)
      if (!cache) {
        cache = new MemoryCache()
        stores.set(name, cache)
      }
      return cache
    },
    async match(request: CacheRequest) {
      for (const cache of stores.values()) {
        const response = await cache.match(request)
        if (response) return response
      }
    },
    async keys() { return [...stores.keys()] },
    async delete(name: string) { return stores.delete(name) },
  }
}

interface WorkerEvent {
  request?: Request
  data?: unknown
  ports?: { postMessage: (message: unknown) => void }[]
  source?: WorkerClient
  waitUntil?: (promise: Promise<unknown>) => void
  respondWith?: (promise: Promise<Response>) => void
}

interface WorkerClient {
  id: string
  type: string
  url: string
}

const PAGE_CLIENT = { id: 'current-page', type: 'window', url: `${WORKER_ORIGIN}/banis` }

function loadWorker(
  version: string,
  caches: ReturnType<typeof createCacheStorage>,
  fetch: (request: Request) => Promise<Response>,
  assets = [`/assets/app-${version}.js`],
  options: {
    indexHtml?: string
    clients?: () => WorkerClient[]
    registration?: { installing: unknown; waiting: unknown }
  } = {},
) {
  const listeners = new Map<string, (event: WorkerEvent) => void>()
  const skipWaiting = vi.fn(async () => {})
  class AbsoluteRequest extends Request {
    constructor(input: string | Request, init?: RequestInit) {
      super(typeof input === 'string' ? new URL(input, WORKER_ORIGIN).href : input, init)
    }
  }

  runInNewContext(
    workerSource
      .replace('__NAAMRAS_BUILD_VERSION__', version)
      .replace('__NAAMRAS_INDEX_HTML_SHA256__', createHash('sha256').update(options.indexHtml ?? 'installed-shell').digest('hex'))
      .replace('/* __NAAMRAS_PRECACHE_ASSETS__ */ []', JSON.stringify(assets)),
    {
      self: {
        location: { origin: WORKER_ORIGIN },
        registration: options.registration ?? { installing: null, waiting: null },
        clients: { claim: vi.fn(async () => {}), matchAll: vi.fn(async () => options.clients?.() ?? []) },
        skipWaiting,
        addEventListener: (type: string, listener: (event: WorkerEvent) => void) => listeners.set(type, listener),
      },
      caches,
      fetch,
      Request: AbsoluteRequest,
      Response,
      URL,
      crypto: webcrypto,
    },
  )

  return {
    skipWaiting,
    install() {
      let completion: Promise<unknown> | undefined
      listeners.get('install')?.({ waitUntil: promise => { completion = promise } })
      if (!completion) throw new Error('The worker did not handle installation')
      return completion
    },
    activate() {
      let completion: Promise<unknown> | undefined
      listeners.get('activate')?.({ waitUntil: promise => { completion = promise } })
      return completion
    },
    async message(type: string, assets: unknown, source: WorkerClient | undefined = PAGE_CLIENT) {
      let completion: Promise<unknown> | undefined
      const reply = vi.fn()
      listeners.get('message')?.({
        data: { type, assets }, ports: [{ postMessage: reply }], source,
        waitUntil: promise => { completion = promise },
      })
      await completion
      return reply.mock.calls[0]?.[0]
    },
    checkReader(assets: string[]) {
      return this.message('NAAMRAS_CHECK_OFFLINE_READER', assets)
    },
    fetch(request: Request) {
      let response: Promise<Response> | undefined
      listeners.get('fetch')?.({ request, respondWith: promise => { response = promise } })
      return response
    },
  }
}

function navigationRequest(path = '/') {
  const request = new Request(new URL(path, WORKER_ORIGIN).href)
  Object.defineProperty(request, 'mode', { value: 'navigate' })
  return request
}

test('the production service worker provides an offline shell without forcing an in-session reload', () => {
  const worker = fs.readFileSync(path.join(PROJECT_ROOT, 'public', 'sw.js'), 'utf8')
  const registration = fs.readFileSync(path.join(PROJECT_ROOT, 'src', 'utils', 'serviceWorker.ts'), 'utf8')

  expect(worker).toContain('ignoreVary: true')
  expect(worker).toContain("request.mode === 'navigate'")
  expect(worker).toContain("url.origin !== self.location.origin")
  expect(worker).toContain("url.pathname.startsWith('/api/')")
  expect(worker).not.toContain('SKIP_WAITING')
  expect(registration).not.toContain("window.addEventListener('pagehide'")
  expect(registration).not.toContain('SKIP_WAITING')
  expect(registration).toContain("updateViaCache: 'none'")
  expect(registration).not.toContain('window.location.reload')
})

test('a new worker installs only after every required app-shell asset succeeds', () => {
  const worker = fs.readFileSync(path.join(PROJECT_ROOT, 'public', 'sw.js'), 'utf8')

  expect(worker).toContain("const REQUIRED_ASSETS = ['/', ...BUILD_ASSETS]")
  expect(worker).toContain('await Promise.all([...new Set(REQUIRED_ASSETS)]')
  expect(worker).toContain('throw new Error(`Unable to precache required asset: ${path}`)')
  expect(worker).toContain('await Promise.allSettled([...new Set(OPTIONAL_ASSETS)]')
})

test('stable public assets revalidate and participate in the generated cache version', () => {
  const worker = fs.readFileSync(path.join(PROJECT_ROOT, 'public', 'sw.js'), 'utf8')
  const generator = fs.readFileSync(path.join(PROJECT_ROOT, 'scripts', 'copy-public.mjs'), 'utf8')

  expect(worker).toContain('async function networkFirstStableAsset(request)')
  expect(worker).toContain('event.respondWith(networkFirstStableAsset(request))')
  expect(worker).toMatch(/url\.pathname\.startsWith\('\/assets\/'\)[\s\S]{0,160}cacheFirstAsset\(request\)/)
  expect(generator).toContain('.update(JSON.stringify(precacheAssets))')
  expect(generator).toContain('buildHash.update(relativePath)')
  expect(generator).toContain('buildHash.update(fs.readFileSync(stableAssetPath))')

  for (const stableAsset of [
    'manifest.webmanifest',
    'favicon.svg',
    'icons/apple-touch-icon.png',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'share-redirect.js',
  ]) {
    expect(generator).toContain(`'${stableAsset}'`)
  }
})

test('the web manifest remains installable as a standalone application', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(PROJECT_ROOT, 'public', 'manifest.webmanifest'), 'utf8'),
  ) as { display: string; start_url: string; scope: string; icons: unknown[] }

  expect(manifest.display).toBe('standalone')
  expect(manifest.start_url).toBe('/')
  expect(manifest.scope).toBe('/')
  expect(manifest.icons).toHaveLength(2)
})

test('an interrupted update leaves the active install-time shell and assets usable offline', async () => {
  const caches = createCacheStorage()
  let deployment: 'a' | 'b' | 'offline' = 'a'
  const fetch = vi.fn(async (request: Request) => {
    if (deployment === 'offline') throw new TypeError('Network unavailable')
    const pathname = new URL(request.url).pathname
    if (deployment === 'b' && pathname === '/assets/app-b.js') {
      return new Response('Release asset unavailable', { status: 503 })
    }
    return new Response(pathname === '/' ? `shell-${deployment}` : `asset-${deployment}`)
  })
  const activeWorker = loadWorker('a', caches, fetch, undefined, { indexHtml: 'shell-a' })
  await activeWorker.install()

  deployment = 'b'
  const onlineNavigation = await activeWorker.fetch(navigationRequest())
  expect(await onlineNavigation?.text()).toBe('shell-b')
  const failedWorker = loadWorker('b', caches, fetch, undefined, { indexHtml: 'shell-b' })
  await expect(failedWorker.install()).rejects.toThrow('Unable to precache required asset: /assets/app-b.js')
  const activeCache = await caches.open('naamras-app-shell-a')
  const incompleteCache = await caches.open('naamras-app-shell-b')
  expect(await (await activeCache.match('/'))?.text()).toBe('shell-a')
  // Other precache requests may still be finishing after the failed asset rejects installation.
  await vi.waitFor(async () => expect(await (await incompleteCache.match('/'))?.text()).toBe('shell-b'))

  deployment = 'offline'
  const offlineNavigation = await activeWorker.fetch(navigationRequest('/study?bani=japji-sahib'))
  expect(await offlineNavigation?.text()).toBe('shell-a')
  const offlineAsset = await activeWorker.fetch(new Request(`${WORKER_ORIGIN}/assets/app-a.js`))
  expect(await offlineAsset?.text()).toBe('asset-a')
})

test.each(['/', '/study?bani=japji-sahib'])(
  'navigation %s falls back to the installed shell when the server returns 503',
  async pathname => {
    const caches = createCacheStorage()
    const fetch = vi.fn(async () => new Response('installed-shell'))
    const worker = loadWorker('a', caches, fetch)
    await worker.install()
    fetch.mockImplementation(async () => new Response('Gateway unavailable', { status: 503 }))

    const response = await worker.fetch(navigationRequest(pathname))
    expect(response?.status).toBe(200)
    expect(await response?.text()).toBe('installed-shell')
  },
)

test('a navigation server error is retained when this worker has no installed shell', async () => {
  const caches = createCacheStorage()
  await (await caches.open('naamras-app-shell-b')).put('/', new Response('incomplete-newer-shell'))
  const worker = loadWorker('a', caches, async () => new Response('Gateway unavailable', { status: 503 }))

  const response = await worker.fetch(navigationRequest())
  expect(response?.status).toBe(503)
  expect(await response?.text()).toBe('Gateway unavailable')
})

test('a failed navigation never borrows another version\'s shell when its own cache is absent', async () => {
  const caches = createCacheStorage()
  await (await caches.open('naamras-app-shell-b')).put('/', new Response('incomplete-newer-shell'))
  const worker = loadWorker('a', caches, async () => { throw new TypeError('Network unavailable') })

  const response = await worker.fetch(navigationRequest('/study'))
  expect(response?.type).toBe('error')
  expect(response?.status).toBe(0)
})

test.each([200, 404])('a navigation response with status %s reaches the browser without replacing the offline shell', async status => {
  const caches = createCacheStorage()
  const fetch = vi.fn(async () => new Response('installed-shell'))
  const worker = loadWorker('a', caches, fetch)
  await worker.install()
  fetch.mockImplementation(async () => new Response('network-response', { status }))

  const response = await worker.fetch(navigationRequest())
  expect(response?.status).toBe(status)
  expect(await response?.text()).toBe('network-response')
  const cache = await caches.open('naamras-app-shell-a')
  expect(await (await cache.match('/'))?.text()).toBe('installed-shell')
})

test('canonical API, proxy, range, external, and non-GET requests bypass the worker', () => {
  const fetch = vi.fn(async () => new Response('network-response'))
  const worker = loadWorker('a', createCacheStorage(), fetch)
  const requests = [
    navigationRequest('/api/share'),
    navigationRequest('/__banidb/banis/1'),
    navigationRequest('https://api.banidb.com/banis/1'),
    new Request(`${WORKER_ORIGIN}/assets/audio.mp3`, { headers: { range: 'bytes=0-99' } }),
    new Request(`${WORKER_ORIGIN}/api/backup`, { method: 'POST' }),
  ]

  for (const request of requests) expect(worker.fetch(request)).toBeUndefined()
  expect(fetch).not.toHaveBeenCalled()
})

test('a cold offline reader route has its lazy code and local fonts after reopening', async () => {
  const caches = createCacheStorage()
  const assets = ['/assets/app-a.js', '/assets/Study-a.js', '/assets/Banis-a.js', '/assets/BaniLengthSheet-a.js',
    '/assets/BaniFindPanel-a.js', '/assets/app-a.css', '/assets/noto-serif-gurmukhi-a.woff2']
  const fetch = vi.fn(async (request: Request) => new Response(new URL(request.url).pathname === '/' ? 'installed-shell' : request.url))
  const installing = loadWorker('a', caches, fetch, assets)
  await installing.install()
  await installing.activate()
  fetch.mockImplementation(async () => { throw new TypeError('Network unavailable') })
  // A fresh worker instance has no memory of the installation or prior page.
  const reopened = loadWorker('a', caches, fetch, assets)
  expect(await reopened.checkReader(['/assets/app-a.js', '/assets/app-a.css'])).toEqual({ type: 'NAAMRAS_CHECK_OFFLINE_READER', matches: true, ready: true })
  for (const route of ['/banis', '/study?shabadosBani=ALHN', '/study?bani=21&length=long']) {
    expect(await (await reopened.fetch(navigationRequest(route)))?.text()).toBe('installed-shell')
  }
  fetch.mockClear()
  for (const asset of assets) {
    expect(await (await reopened.fetch(new Request(`${WORKER_ORIGIN}${asset}`)))?.text()).toBe(`${WORKER_ORIGIN}${asset}`)
  }
  expect(fetch).not.toHaveBeenCalled()
})

test('reader readiness rejects a different deployment and any missing precached asset', async () => {
  const caches = createCacheStorage()
  const assets = ['/assets/app-a.js', '/assets/Study-a.js', '/assets/gurmukhi-a.woff2']
  const worker = loadWorker('a', caches, async () => new Response('asset'), assets, { indexHtml: 'asset' })
  await worker.install()
  expect(await worker.checkReader(['/assets/app-b.js'])).toEqual({ type: 'NAAMRAS_CHECK_OFFLINE_READER', matches: false, ready: false })
  expect(await worker.checkReader([])).toEqual({ type: 'NAAMRAS_CHECK_OFFLINE_READER', matches: false, ready: false })
  for (const required of ['/', '/assets/Study-a.js', '/assets/gurmukhi-a.woff2']) {
    const cache = await caches.open('naamras-app-shell-a')
    await cache.delete(required)
    expect(await worker.checkReader(['/assets/app-a.js'])).toEqual({ type: 'NAAMRAS_CHECK_OFFLINE_READER', matches: true, ready: false })
    await cache.put(required, new Response('asset'))
  }
})

test('activation and removal of old app caches preserve explicit reading packs', async () => {
  const caches = createCacheStorage()
  const packs = await caches.open('naamras-bani-downloads-v1')
  const request = 'https://naamras.local/__naamras-downloads/packs/shabados%3AALHN'
  await packs.put(request, new Response('all verified reading lengths'))
  await caches.open('naamras-app-shell-old')
  await caches.open('naamras-runtime-old')
  const worker = loadWorker('new', caches, async () => new Response('asset'), undefined, { indexHtml: 'asset' })
  await worker.install()
  await worker.activate()
  expect(await caches.keys()).toEqual(['naamras-bani-downloads-v1', 'naamras-app-shell-new'])
  expect(await (await (await caches.open('naamras-bani-downloads-v1')).match(request))?.text()).toBe('all verified reading lengths')
})

test('explicit preparation repairs evicted reader assets and verifies the complete shell before activation', async () => {
  const caches = createCacheStorage()
  const assets = ['/assets/app-a.js', '/assets/Study-a.js', '/assets/gurmukhi-a.woff2']
  const fetch = vi.fn(async (request: Request) => new Response(new URL(request.url).pathname === '/' ? 'installed-shell' : 'asset'))
  const worker = loadWorker('a', caches, fetch, assets)
  await worker.install()
  expect(worker.skipWaiting).not.toHaveBeenCalled()
  const shell = await caches.open('naamras-app-shell-a')
  for (const asset of ['/', '/assets/Study-a.js', '/assets/gurmukhi-a.woff2']) await shell.delete(asset)
  fetch.mockClear()

  expect(await worker.checkReader(['/assets/app-a.js'])).toMatchObject({ matches: true, ready: false })
  expect(await worker.message('NAAMRAS_ACTIVATE_OFFLINE_READER', ['/assets/app-a.js']))
    .toMatchObject({ matches: true, ready: false, activated: false })
  expect(fetch).not.toHaveBeenCalled()
  expect(worker.skipWaiting).not.toHaveBeenCalled()

  expect(await worker.message('NAAMRAS_PREPARE_OFFLINE_READER', ['/assets/app-a.js']))
    .toEqual({ type: 'NAAMRAS_PREPARE_OFFLINE_READER', matches: true, ready: true })
  expect(fetch.mock.calls.map(([request]) => new URL(request.url).pathname).sort())
    .toEqual(['/', '/assets/Study-a.js', '/assets/gurmukhi-a.woff2'])
  expect(worker.skipWaiting).not.toHaveBeenCalled()
  expect(await worker.message('NAAMRAS_ACTIVATE_OFFLINE_READER', ['/assets/app-a.js']))
    .toEqual({ type: 'NAAMRAS_ACTIVATE_OFFLINE_READER', matches: true, ready: true, activated: true })
  expect(worker.skipWaiting).toHaveBeenCalledTimes(1)

  fetch.mockClear()
  expect(await worker.message('NAAMRAS_PREPARE_OFFLINE_READER', ['/assets/app-a.js'])).toMatchObject({ ready: true })
  expect(fetch).not.toHaveBeenCalled()
})

test.each(['NAAMRAS_PREPARE_OFFLINE_READER', 'NAAMRAS_ACTIVATE_OFFLINE_READER'])(
  '%s rejects another deployment without opening caches, fetching assets, or activating', async type => {
    const caches = createCacheStorage()
    const fetch = vi.fn(async () => new Response('installed-shell'))
    const worker = loadWorker('a', caches, fetch)
    for (const assets of [[], ['/assets/app-b.js'], ['/assets/app-a.js', '/assets/app-b.js'], [123], null]) {
      expect(await worker.message(type, assets)).toMatchObject({ type, matches: false, ready: false })
    }
    expect(await caches.keys()).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
    expect(worker.skipWaiting).not.toHaveBeenCalled()
  },
)

test.each(['NAAMRAS_PREPARE_OFFLINE_READER', 'NAAMRAS_ACTIVATE_OFFLINE_READER'])(
  '%s accepts mutation requests only from a same-origin window', async type => {
    const caches = createCacheStorage()
    const fetch = vi.fn(async () => new Response('installed-shell'))
    const worker = loadWorker('a', caches, fetch)
    for (const source of [
      { ...PAGE_CLIENT, url: 'https://other.test/banis' },
      { ...PAGE_CLIENT, type: 'worker' },
      { ...PAGE_CLIENT, id: '' },
      { ...PAGE_CLIENT, url: 'not-a-url' },
    ]) {
      expect(await worker.message(type, ['/assets/app-a.js'], source)).toMatchObject({ matches: true, ready: false })
    }
    expect(await caches.keys()).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
    expect(worker.skipWaiting).not.toHaveBeenCalled()
  },
)

test.each([
  ['unavailable', () => new Response('unavailable', { status: 503 })],
  ['HTML fallback', () => new Response('<html>new deployment</html>', { headers: { 'content-type': 'text/html; charset=utf-8' } })],
] as const)('a %s response cannot complete an evicted JavaScript asset', async (_label, response) => {
  const caches = createCacheStorage()
  const fetch = vi.fn(async () => new Response('installed-shell'))
  const worker = loadWorker('a', caches, fetch)
  await worker.install()
  const shell = await caches.open('naamras-app-shell-a')
  await shell.delete('/assets/app-a.js')
  fetch.mockImplementation(async () => response())

  expect(await worker.message('NAAMRAS_PREPARE_OFFLINE_READER', ['/assets/app-a.js'])).toMatchObject({ matches: true, ready: false })
  expect(await shell.match('/assets/app-a.js')).toBeUndefined()
  expect(await worker.message('NAAMRAS_ACTIVATE_OFFLINE_READER', ['/assets/app-a.js'])).toMatchObject({ ready: false, activated: false })
  expect(worker.skipWaiting).not.toHaveBeenCalled()
})

test('repair never puts another deployment HTML into this worker shell or replaces a valid installed shell', async () => {
  const caches = createCacheStorage()
  const fetch = vi.fn(async () => new Response('installed-shell'))
  const worker = loadWorker('a', caches, fetch)
  await worker.install()
  const shell = await caches.open('naamras-app-shell-a')
  fetch.mockImplementation(async () => new Response('newer-deployment-shell'))
  fetch.mockClear()
  expect(await worker.message('NAAMRAS_PREPARE_OFFLINE_READER', ['/assets/app-a.js'])).toMatchObject({ ready: true })
  expect(fetch).not.toHaveBeenCalled()
  expect(await (await shell.match('/'))?.text()).toBe('installed-shell')

  await shell.delete('/')
  expect(await worker.message('NAAMRAS_PREPARE_OFFLINE_READER', ['/assets/app-a.js'])).toMatchObject({ matches: true, ready: false })
  expect(await shell.match('/')).toBeUndefined()
  expect(await worker.checkReader(['/assets/app-a.js'])).toMatchObject({ ready: false })
})

test('installation rejects HTML from a different deployment', async () => {
  const caches = createCacheStorage()
  const worker = loadWorker('a', caches, async () => new Response('newer-deployment-shell'))
  await expect(worker.install()).rejects.toThrow('Unable to precache required asset: /')
  expect(await (await caches.open('naamras-app-shell-a')).match('/')).toBeUndefined()
  expect(worker.skipWaiting).not.toHaveBeenCalled()
})

test('readiness detects an incorrect cached shell even when every required URL exists', async () => {
  const caches = createCacheStorage()
  const worker = loadWorker('a', caches, async () => new Response('installed-shell'))
  await worker.install()
  await (await caches.open('naamras-app-shell-a')).put('/', new Response('wrong-deployment-shell'))
  expect(await worker.checkReader(['/assets/app-a.js'])).toMatchObject({ matches: true, ready: false })
  expect(await worker.message('NAAMRAS_PREPARE_OFFLINE_READER', ['/assets/app-a.js'])).toMatchObject({ ready: true })
})

test('activation retains caches needed by open legacy tabs and prunes them once only confirmed current tabs remain', async () => {
  const caches = createCacheStorage()
  const legacyPage = { ...PAGE_CLIENT, id: 'legacy-page' }
  let windows = [PAGE_CLIENT, legacyPage]
  await (await caches.open('naamras-app-shell-old')).put('/assets/old-reader.js', new Response('old reader code'))
  await (await caches.open('naamras-runtime-old')).put('/assets/old-font.woff2', new Response('old font'))
  await (await caches.open('naamras-library-downloads-v1')).put('/reading-pack', new Response('saved reading'))
  const fetch = vi.fn(async () => new Response('installed-shell'))
  const worker = loadWorker('a', caches, fetch, undefined, { clients: () => windows })
  await worker.install()
  expect(await worker.message('NAAMRAS_PREPARE_OFFLINE_READER', ['/assets/app-a.js'])).toMatchObject({ ready: true })
  expect(await worker.message('NAAMRAS_ACTIVATE_OFFLINE_READER', ['/assets/app-a.js'])).toMatchObject({ activated: true })
  await worker.activate()
  expect(await caches.keys()).toContain('naamras-app-shell-old')
  expect(await caches.keys()).toContain('naamras-runtime-old')

  fetch.mockImplementation(async () => { throw new TypeError('Offline') })
  expect(await (await worker.fetch(new Request(`${WORKER_ORIGIN}/assets/old-reader.js`)))?.text()).toBe('old reader code')
  expect(await (await worker.fetch(new Request(`${WORKER_ORIGIN}/assets/old-font.woff2`)))?.text()).toBe('old font')

  windows = [PAGE_CLIENT]
  expect(await worker.checkReader(['/assets/app-a.js'])).toMatchObject({ ready: true })
  expect(await caches.keys()).toEqual(['naamras-library-downloads-v1', 'naamras-app-shell-a'])
})

test('a waiting worker does not prune active caches even after every open page matches its build', async () => {
  const caches = createCacheStorage()
  await caches.open('naamras-app-shell-old')
  const worker = loadWorker('a', caches, async () => new Response('installed-shell'), undefined, { clients: () => [PAGE_CLIENT] })
  await worker.install()
  expect(await worker.message('NAAMRAS_PREPARE_OFFLINE_READER', ['/assets/app-a.js'])).toMatchObject({ ready: true })
  expect(await caches.keys()).toContain('naamras-app-shell-old')
  await worker.activate()
  expect(await caches.keys()).toEqual(['naamras-app-shell-a'])
})

test('an activated worker can prune closed legacy tabs after its process restarts', async () => {
  const caches = createCacheStorage()
  let windows = [PAGE_CLIENT, { ...PAGE_CLIENT, id: 'legacy-page' }]
  await caches.open('naamras-app-shell-old')
  await caches.open('naamras-runtime-old')
  const fetch = vi.fn(async () => new Response('installed-shell'))
  const original = loadWorker('a', caches, fetch, undefined, { clients: () => windows })
  await original.install()
  await original.activate()
  expect(await caches.keys()).toContain('naamras-app-shell-old')

  windows = [PAGE_CLIENT]
  const restarted = loadWorker('a', caches, fetch, undefined, { clients: () => windows })
  expect(await restarted.checkReader(['/assets/app-a.js'])).toMatchObject({ ready: true })
  expect(await caches.keys()).toEqual(['naamras-app-shell-a'])
})

test('a waiting rollback cannot use its previous activation marker to prune the current build', async () => {
  const caches = createCacheStorage()
  const fetch = vi.fn(async () => new Response('installed-shell'))
  const original = loadWorker('a', caches, fetch)
  await original.install()
  await original.activate()
  await caches.open('naamras-app-shell-b')
  await caches.open('naamras-runtime-b')

  const rollback = loadWorker('a', caches, fetch, undefined, { clients: () => [PAGE_CLIENT] })
  await rollback.install()
  expect(await rollback.message('NAAMRAS_PREPARE_OFFLINE_READER', ['/assets/app-a.js'])).toMatchObject({ ready: true })
  expect(await caches.keys()).toEqual(['naamras-app-shell-a', 'naamras-app-shell-b', 'naamras-runtime-b'])
  await rollback.activate()
  expect(await caches.keys()).toEqual(['naamras-app-shell-a'])
})

test.each(['installing', 'waiting'] as const)(
  'active readiness does not delete an %s update shell before it can naturally activate', async state => {
    const caches = createCacheStorage()
    const registration = { installing: null as unknown, waiting: null as unknown }
    const fetch = vi.fn(async () => new Response('installed-shell'))
    let windows = [PAGE_CLIENT]
    const active = loadWorker('a', caches, fetch, undefined, { registration, clients: () => windows })
    await active.install()
    await active.activate()

    const update = loadWorker('b', caches, fetch, undefined, { registration, clients: () => windows })
    registration[state] = update
    await update.install()
    expect(await active.checkReader(['/assets/app-a.js'])).toMatchObject({ ready: true })
    expect(await caches.keys()).toContain('naamras-app-shell-b')

    // Once old tabs close, the update can activate naturally and still boot offline.
    registration[state] = null
    windows = []
    await update.activate()
    fetch.mockImplementation(async () => { throw new TypeError('Offline') })
    const restarted = loadWorker('b', caches, fetch)
    expect(await restarted.checkReader(['/assets/app-b.js'])).toMatchObject({ ready: true })
    expect(await (await restarted.fetch(navigationRequest('/study?bani=japji-sahib')))?.text()).toBe('installed-shell')
    expect(await (await restarted.fetch(new Request(`${WORKER_ORIGIN}/assets/app-b.js`)))?.text()).toBe('installed-shell')
  },
)
