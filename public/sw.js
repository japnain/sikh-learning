const CACHE_VERSION = '__NAAMRAS_BUILD_VERSION__'
const INDEX_HTML_SHA256 = '__NAAMRAS_INDEX_HTML_SHA256__'
const APP_SHELL_CACHE = `naamras-app-shell-${CACHE_VERSION}`
const ACTIVATION_MARKER = `/__naamras-offline-shell__/activated/${CACHE_VERSION}`
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
const confirmedClients = new Set()
let hasActivated = false

function isSuccessfulResponse(response) {
  return response && response.ok && (response.type === 'basic' || response.type === 'default')
}

async function isValidRequiredResponse(path, response) {
  if (!isSuccessfulResponse(response)) return false
  if (path === '/') {
    // A repair during a deployment must not pair newer HTML with this build's assets.
    const digest = await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer())
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
    return hash === INDEX_HTML_SHA256
  }
  // SPA fallbacks can return successful HTML for a deleted JavaScript/font asset.
  return !BUILD_ASSETS.includes(path) || !/^text\/html(?:;|$)/i.test(response.headers.get('content-type') || '')
}

async function fetchAndCache(cache, path) {
  const response = await fetch(new Request(path, { cache: 'reload' }))
  if (!await isValidRequiredResponse(path, response)) {
    throw new Error(`Unable to precache required asset: ${path}`)
  }
  await cache.put(path, response)
}

async function isShellReady(cache) {
  const valid = await Promise.all([...new Set(REQUIRED_ASSETS)].map(async path =>
    isValidRequiredResponse(path, await cache.match(path, { ignoreVary: true }))))
  return valid.every(Boolean)
}

async function prepareShell(cache) {
  await Promise.all([...new Set(REQUIRED_ASSETS)].map(async path => {
    const cached = await cache.match(path, { ignoreVary: true })
    if (!await isValidRequiredResponse(path, cached)) await fetchAndCache(cache, path)
  }))
}

function isSameOriginWindow(source) {
  try {
    return source?.type === 'window' && typeof source.id === 'string' && source.id.length > 0
      && new URL(source.url).origin === self.location.origin
  } catch {
    return false
  }
}

async function removeUnusedAppCaches() {
  // The next build precaches before activation. An active worker must not
  // mistake that installing/waiting build for an unused older cache.
  if (self.registration.installing || self.registration.waiting) return
  // Legacy/open tabs may still need old lazy chunks. Retain their caches until all
  // windows are known to use this build; explicit downloaded reading packs are separate.
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  if (windows.some(client => !confirmedClients.has(client.id))) return
  const cacheNames = await caches.keys()
  // An update may have begun while the asynchronous cache/client reads ran.
  if (self.registration.installing || self.registration.waiting) return
  await Promise.all(cacheNames.map(cacheName => {
    const isNaamRasCache = CACHE_PREFIXES.some(prefix => cacheName.startsWith(prefix))
    return isNaamRasCache && cacheName !== APP_SHELL_CACHE && cacheName !== RUNTIME_CACHE
      ? caches.delete(cacheName)
      : Promise.resolve(false)
  }))
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_SHELL_CACHE)
    // A rollback may reuse a cache from a past activation. This new installation
    // must wait for its own activation before it can remove the active build.
    await cache.delete(ACTIVATION_MARKER)
    await Promise.all([...new Set(REQUIRED_ASSETS)].map(path => fetchAndCache(cache, path)))
    await Promise.allSettled([...new Set(OPTIONAL_ASSETS)].map(path => fetchAndCache(cache, path)))
  })())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    hasActivated = true
    const cache = await caches.open(APP_SHELL_CACHE)
    await cache.put(ACTIVATION_MARKER, new Response(CACHE_VERSION)).catch(() => {})
    await removeUnusedAppCaches().catch(() => {})
    await self.clients.claim()
  })())
})

self.addEventListener('message', event => {
  const type = event.data?.type
  if (!['NAAMRAS_CHECK_OFFLINE_READER', 'NAAMRAS_PREPARE_OFFLINE_READER', 'NAAMRAS_ACTIVATE_OFFLINE_READER'].includes(type)
    || !event.ports?.[0]) return
  const port = event.ports[0]
  event.waitUntil((async () => {
    let matches = false
    let ready = false
    let activated = false
    try {
      const assets = event.data.assets
      // An older active worker must not approve a page from a newer deployment.
      matches = Array.isArray(assets) && assets.length > 0
        && assets.every(path => typeof path === 'string' && BUILD_ASSETS.includes(path))
      const trustedClient = isSameOriginWindow(event.source)
      if (matches && (type === 'NAAMRAS_CHECK_OFFLINE_READER' || trustedClient)) {
        const cache = await caches.open(APP_SHELL_CACHE)
        if (type === 'NAAMRAS_PREPARE_OFFLINE_READER') await prepareShell(cache)
        ready = await isShellReady(cache)
        if (ready && trustedClient) confirmedClients.add(event.source.id)
        if (ready && type === 'NAAMRAS_ACTIVATE_OFFLINE_READER') {
          await self.skipWaiting()
          activated = true
        }
        if (ready && !hasActivated) {
          const marker = await cache.match(ACTIVATION_MARKER)
          hasActivated = isSuccessfulResponse(marker) && await marker.text() === CACHE_VERSION
        }
        if (ready && hasActivated) await removeUnusedAppCaches().catch(() => {})
      }
    } catch {
      // Missing or evicted shell assets must never be presented as offline-ready.
    }
    port.postMessage({ type, matches, ready, ...(type === 'NAAMRAS_ACTIVATE_OFFLINE_READER' ? { activated } : {}) })
  })())
})

async function networkFirstNavigation(request) {
  let response
  try {
    response = await fetch(request)
    if (response.status < 500) return response
  } catch {
    // A failed connection can still use this worker's installed shell.
  }

  // Keep the install-time shell paired with its assets until a new worker activates.
  const cache = await caches.open(APP_SHELL_CACHE)
  return (await cache.match(request, { ignoreVary: true }))
    || (await cache.match('/', { ignoreVary: true }))
    || response
    || Response.error()
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
  if (request.method !== 'GET' || request.headers.has('range') || request.headers.has('authorization')) return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/__banidb/')
    || url.pathname.startsWith('/books/private/') || url.pathname.includes('/private-library')) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
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
