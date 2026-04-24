declare const Deno:
  | {
      env?: {
        get: (name: string) => string | undefined
      }
    }
  | undefined

const UPSTREAM_ORIGIN = 'https://api.banidb.com'
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000
const MAX_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const CACHED_HEADERS = ['content-type', 'cache-control', 'etag'] as const

type ProxyRequestBody = {
  path?: unknown
  query?: unknown
}

type CacheEntry = {
  body: string
  expiresAt: number
  headers: Record<string, string>
  status: number
}

const responseCache = new Map<string, CacheEntry>()

function buildCorsHeaders(origin: string | null) {
  const headers = new Headers({
    'access-control-allow-headers': 'Content-Type, Authorization',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-origin': origin ?? '*',
  })

  if (origin) {
    headers.set('vary', 'Origin')
  }

  return headers
}

function jsonResponse(payload: unknown, status: number, origin: string | null) {
  const headers = buildCorsHeaders(origin)
  headers.set('content-type', 'application/json; charset=utf-8')

  return new Response(JSON.stringify(payload), {
    status,
    headers,
  })
}

function readEnv(name: string) {
  if (typeof Deno !== 'undefined' && typeof Deno.env?.get === 'function') {
    return Deno.env.get(name) ?? undefined
  }

  if (typeof process !== 'undefined') {
    return process.env[name]
  }

  return undefined
}

function normalizeOptionalString(value: string | undefined | null) {
  const next = value?.trim()
  return next ? next : undefined
}

function resolveUpstreamOrigin() {
  return normalizeOptionalString(readEnv('BANIDB_API_ORIGIN')) ?? UPSTREAM_ORIGIN
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function parseCacheTtl(cacheControl: string | null) {
  const maxAgeMatch = cacheControl?.match(/max-age=(\d+)/i)
  if (!maxAgeMatch) return DEFAULT_CACHE_TTL_MS

  const seconds = Number(maxAgeMatch[1])
  if (!Number.isFinite(seconds) || seconds < 0) return DEFAULT_CACHE_TTL_MS

  return Math.min(seconds * 1000, MAX_CACHE_TTL_MS)
}

function buildUpstreamUrl(path: string, query: Record<string, unknown> | null) {
  const upstreamOrigin = resolveUpstreamOrigin()
  const url = new URL(path, upstreamOrigin)

  if (url.origin !== upstreamOrigin || !url.pathname.startsWith('/v2/')) {
    throw new Error('Only BaniDB v2 read paths are allowed.')
  }

  if (!query) return url

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      throw new Error(`Unsupported query value for "${key}".`)
    }

    url.searchParams.set(key, String(value))
  }

  return url
}

function pruneExpiredCache() {
  const now = Date.now()

  for (const [key, entry] of responseCache.entries()) {
    if (entry.expiresAt <= now) {
      responseCache.delete(key)
    }
  }
}

function buildResponseHeaders(origin: string | null, sourceHeaders?: Record<string, string>) {
  const headers = buildCorsHeaders(origin)

  for (const [key, value] of Object.entries(sourceHeaders ?? {})) {
    headers.set(key, value)
  }

  return headers
}

function toCachedHeaders(response: Response) {
  const headers: Record<string, string> = {}

  for (const header of CACHED_HEADERS) {
    const value = response.headers.get(header)
    if (value) {
      headers[header] = value
    }
  }

  return headers
}

export default async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get('origin')

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: buildCorsHeaders(origin),
    })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405, origin)
  }

  let body: ProxyRequestBody
  try {
    body = await request.json() as ProxyRequestBody
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400, origin)
  }

  const payload = asRecord(body)
  const path = typeof payload?.path === 'string' ? payload.path : null
  const query = payload?.query !== undefined ? asRecord(payload.query) : null

  if (!path) {
    return jsonResponse({ error: 'Request body must include a string path.' }, 400, origin)
  }

  if (payload?.query !== undefined && !query) {
    return jsonResponse({ error: 'Query must be an object of primitive values.' }, 400, origin)
  }

  let upstreamUrl: URL
  try {
    upstreamUrl = buildUpstreamUrl(path, query)
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Invalid BaniDB proxy request.' }, 400, origin)
  }

  pruneExpiredCache()

  const cacheKey = upstreamUrl.toString()
  const cached = responseCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return new Response(cached.body, {
      status: cached.status,
      headers: buildResponseHeaders(origin, cached.headers),
    })
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      headers: {
        accept: 'application/json',
      },
      method: 'GET',
    })

    const responseBody = await upstreamResponse.text()
    const cachedHeaders = toCachedHeaders(upstreamResponse)

    if (upstreamResponse.ok) {
      responseCache.set(cacheKey, {
        body: responseBody,
        expiresAt: Date.now() + parseCacheTtl(upstreamResponse.headers.get('cache-control')),
        headers: cachedHeaders,
        status: upstreamResponse.status,
      })
    }

    return new Response(responseBody, {
      status: upstreamResponse.status,
      headers: buildResponseHeaders(origin, cachedHeaders),
    })
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Unable to reach BaniDB.',
    }, 502, origin)
  }
}
