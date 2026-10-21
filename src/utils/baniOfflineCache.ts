import type { BaniFetchResult } from '../api/banidb'
import type { SundarGutkaLength } from '../types'
import { isExactBaniReading, normalizeCachedBaniReading } from './baniReadingValidation'

const CACHE_NAME = 'naamras-bani-readings-v1'
const CACHE_URL_ORIGIN = 'https://naamras.local'
const LOCAL_STORAGE_PREFIX = 'naamras-bani-reading-v1:'
const LOCAL_STORAGE_INDEX_KEY = 'naamras-bani-reading-index-v1'
const LOCAL_STORAGE_LIMIT = 8
const CACHE_STORAGE_LIMIT = 12
let protectedKeys = new Set<string>()

export interface BaniOfflineReading {
  baniDbId: number
  sgLength?: SundarGutkaLength | null
}

/** The mounted Nitnem preparation hook supplies exact selections without store imports here. */
export function setProtectedBaniOfflineReadings(readings: BaniOfflineReading[]) {
  protectedKeys = new Set(readings.map(reading => getCacheKey(reading.baniDbId, reading.sgLength)))
}

function getCacheKey(baniDbId: number, sgLength?: SundarGutkaLength | null) {
  return `${baniDbId}:${sgLength ?? 'default'}`
}

function getCacheRequest(baniDbId: number, sgLength?: SundarGutkaLength | null) {
  const key = encodeURIComponent(getCacheKey(baniDbId, sgLength))
  return new Request(`${CACHE_URL_ORIGIN}/__naamras-cache/bani/${key}`)
}

function getRequestCacheKey(request: Request): string {
  return decodeURIComponent(new URL(request.url).pathname.split('/').at(-1) ?? '')
}

function evictableKeys(order: string[], baseLimit: number): string[] {
  const limit = Math.max(baseLimit, protectedKeys.size)
  const excess = Math.max(0, order.length - limit)
  return order.filter(key => !protectedKeys.has(key)).slice(0, excess)
}

function readLocalIndex(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_INDEX_KEY) ?? '[]')
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === 'string')
      : []
  } catch {
    return []
  }
}

function readLocalFallback(key: string, baniDbId: number, sgLength?: SundarGutkaLength | null): BaniFetchResult | null {
  if (typeof window === 'undefined') return null

  try {
    const parsed = JSON.parse(window.localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${key}`) ?? 'null')
    return normalizeCachedBaniReading(parsed, baniDbId, sgLength)
  } catch {
    return null
  }
}

function writeLocalFallback(key: string, data: BaniFetchResult) {
  if (typeof window === 'undefined') return

  const existingOrder = readLocalIndex().filter(entry => entry !== key)
  let nextOrder = [...existingOrder, key]

  try {
    const evicted = new Set(evictableKeys(nextOrder, LOCAL_STORAGE_LIMIT))
    for (const oldest of evicted) window.localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${oldest}`)
    nextOrder = nextOrder.filter(entry => !evicted.has(entry))

    if (nextOrder.includes(key)) window.localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${key}`, JSON.stringify(data))
    window.localStorage.setItem(LOCAL_STORAGE_INDEX_KEY, JSON.stringify(nextOrder))
  } catch {
    // Cache Storage is preferred. A restricted or full fallback must not break reading.
  }
}

export async function readBaniOfflineCache(
  baniDbId: number,
  sgLength?: SundarGutkaLength | null
): Promise<BaniFetchResult | null> {
  const key = getCacheKey(baniDbId, sgLength)

  if (typeof globalThis.caches !== 'undefined') {
    try {
      const cache = await globalThis.caches.open(CACHE_NAME)
      const response = await cache.match(getCacheRequest(baniDbId, sgLength))
      if (response) {
        const parsed: unknown = await response.json()
        const reading = normalizeCachedBaniReading(parsed, baniDbId, sgLength)
        if (reading) return reading
      }
    } catch {
      // Fall through to the bounded localStorage compatibility cache.
    }
  }

  return readLocalFallback(key, baniDbId, sgLength)
}

export async function writeBaniOfflineCache(
  baniDbId: number,
  sgLength: SundarGutkaLength | null | undefined,
  data: BaniFetchResult
): Promise<void> {
  if (!isExactBaniReading(data, baniDbId, sgLength)) return

  if (typeof globalThis.caches !== 'undefined') {
    try {
      const cache = await globalThis.caches.open(CACHE_NAME)
      await cache.put(
        getCacheRequest(baniDbId, sgLength),
        new Response(JSON.stringify(data), {
          headers: { 'content-type': 'application/json' },
        })
      )
      const requests = await cache.keys()
      const evicted = new Set(evictableKeys(requests.map(getRequestCacheKey), CACHE_STORAGE_LIMIT))
      for (const request of requests) {
        if (evicted.has(getRequestCacheKey(request))) await cache.delete(request)
      }
      return
    } catch {
      // Fall through to the bounded localStorage compatibility cache.
    }
  }

  writeLocalFallback(getCacheKey(baniDbId, sgLength), data)
}
