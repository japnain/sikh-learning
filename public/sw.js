const CACHE_VERSION = '__NAAMRAS_BUILD_VERSION__'
const APP_SHELL_CACHE = `naamras-app-shell-${CACHE_VERSION}`
const RUNTIME_CACHE = `naamras-runtime-${CACHE_VERSION}`
const CACHE_PREFIXES = ['naamras-app-shell-', 'naamras-runtime-']
const BUILD_ASSETS = /* __NAAMRAS_PRECACHE_ASSETS__ */ []
const REQUIRED_ASSETS = ['/', ...BUILD_ASSETS]
const OPTIONAL_ASSETS = [
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

function isSuccessfulResponse(response) {
  return response && response.ok && (response.type === 'basic' || response.type === 'default')
}

async function fetchAndCache(cache, path) {
  const response = await fetch(new Request(path, { cache: 'reload' }))
  if (!isSuccessfulResponse(response)) {
    throw new Error(`Unable to precache required asset: ${path}`)
  }
  await cache.put(path, response)
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_SHELL_CACHE)
    await Promise.all([...new Set(REQUIRED_ASSETS)].map(path => fetchAndCache(cache, path)))
    await Promise.allSettled([...new Set(OPTIONAL_ASSETS)].map(path => fetchAndCache(cache, path)))
  })())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map(cacheName => {
      const isNaamRasCache = CACHE_PREFIXES.some(prefix => cacheName.startsWith(prefix))
      return isNaamRasCache && cacheName !== APP_SHELL_CACHE && cacheName !== RUNTIME_CACHE
        ? caches.delete(cacheName)
        : Promise.resolve(false)
    }))
    await self.clients.claim()
  })())
})

async function networkFirstNavigation(request, url) {
  try {
    const response = await fetch(request)
    if (url.pathname === '/' && isSuccessfulResponse(response)) {
      const cache = await caches.open(APP_SHELL_CACHE)
      await cache.put('/', response.clone())
    }
    return response
  } catch {
    return (await caches.match(request, { ignoreVary: true }))
      || (await caches.match('/', { ignoreVary: true }))
      || Response.error()
  }
}

async function cacheFirstAsset(request) {
  const cached = await caches.match(request, { ignoreVary: true })
  if (cached) return cached

  const response = await fetch(request)
  if (isSuccessfulResponse(response)) {
    const cache = await caches.open(RUNTIME_CACHE)
    await cache.put(request, response.clone())
  }
  return response
}

async function networkFirstStableAsset(request) {
  const runtimeCache = await caches.open(RUNTIME_CACHE)

  try {
    const response = await fetch(request)
    if (isSuccessfulResponse(response)) {
      await runtimeCache.put(request, response.clone())
      return response
    }

    return (await runtimeCache.match(request, { ignoreVary: true }))
      || (await caches.match(request, { ignoreVary: true }))
      || response
  } catch {
    return (await runtimeCache.match(request, { ignoreVary: true }))
      || (await caches.match(request, { ignoreVary: true }))
      || Response.error()
  }
}

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET' || request.headers.has('range')) return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/__banidb/')) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request, url))
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirstAsset(request))
    return
  }

  const cacheableDestination = ['script', 'style', 'font', 'image', 'manifest'].includes(request.destination)
  if (cacheableDestination) {
    event.respondWith(networkFirstStableAsset(request))
  }
})
