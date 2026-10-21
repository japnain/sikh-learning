import fs from 'node:fs'
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
  waitUntil?: (promise: Promise<unknown>) => void
  respondWith?: (promise: Promise<Response>) => void
}

function loadWorker(
  version: string,
  caches: ReturnType<typeof createCacheStorage>,
  fetch: (request: Request) => Promise<Response>,
  assets = [`/assets/app-${version}.js`],
) {
  const listeners = new Map<string, (event: WorkerEvent) => void>()
  class AbsoluteRequest extends Request {
    constructor(input: string | Request, init?: RequestInit) {
      super(typeof input === 'string' ? new URL(input, WORKER_ORIGIN).href : input, init)
    }
  }

  runInNewContext(
    workerSource
      .replace('__NAAMRAS_BUILD_VERSION__', version)
      .replace('/* __NAAMRAS_PRECACHE_ASSETS__ */ []', JSON.stringify(assets)),
    {
      self: {
        location: { origin: WORKER_ORIGIN },
        clients: { claim: vi.fn(async () => {}) },
        addEventListener: (type: string, listener: (event: WorkerEvent) => void) => listeners.set(type, listener),
      },
      caches,
      fetch,
      Request: AbsoluteRequest,
      Response,
      URL,
    },
  )

  return {
    install() {
      let completion: Promise<unknown> | undefined
      listeners.get('install')?.({ waitUntil: promise => { completion = promise } })
      if (!completion) throw new Error('The worker did not handle installation')
      return completion
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
  expect(worker).not.toContain('skipWaiting')
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
  const activeWorker = loadWorker('a', caches, fetch)
  await activeWorker.install()

  deployment = 'b'
  const onlineNavigation = await activeWorker.fetch(navigationRequest())
  expect(await onlineNavigation?.text()).toBe('shell-b')
  const failedWorker = loadWorker('b', caches, fetch)
  await expect(failedWorker.install()).rejects.toThrow('Unable to precache required asset: /assets/app-b.js')
  const activeCache = await caches.open('naamras-app-shell-a')
  const incompleteCache = await caches.open('naamras-app-shell-b')
  expect(await (await activeCache.match('/'))?.text()).toBe('shell-a')
  expect(await (await incompleteCache.match('/'))?.text()).toBe('shell-b')

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
