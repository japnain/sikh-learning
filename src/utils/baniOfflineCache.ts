import type { BaniFetchResult } from '../api/banidb'
import type { SundarGutkaLength } from '../types'

const CACHE_NAME = 'naamras-bani-readings-v1'
const CACHE_URL_ORIGIN = 'https://naamras.local'
const LOCAL_STORAGE_PREFIX = 'naamras-bani-reading-v1:'
const LOCAL_STORAGE_INDEX_KEY = 'naamras-bani-reading-index-v1'
const LOCAL_STORAGE_LIMIT = 8
const CACHE_STORAGE_LIMIT = 12

function getCacheKey(baniDbId: number, sgLength?: SundarGutkaLength | null) {
  return `${baniDbId}:${sgLength ?? 'default'}`
}

function getCacheRequest(baniDbId: number, sgLength?: SundarGutkaLength | null) {
  const key = encodeURIComponent(getCacheKey(baniDbId, sgLength))
  return new Request(`${CACHE_URL_ORIGIN}/__naamras-cache/bani/${key}`)
}

function isBaniFetchResult(value: unknown): value is BaniFetchResult {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<BaniFetchResult>
  return Array.isArray(candidate.entries)
    && Array.isArray(candidate.availableLengths)
    && (candidate.resolvedLength === null || typeof candidate.resolvedLength === 'string')
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

function readLocalFallback(key: string): BaniFetchResult | null {
  if (typeof window === 'undefined') return null

  try {
    const parsed = JSON.parse(window.localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${key}`) ?? 'null')
    return isBaniFetchResult(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeLocalFallback(key: string, data: BaniFetchResult) {
  if (typeof window === 'undefined') return

  const existingOrder = readLocalIndex().filter(entry => entry !== key)
  const nextOrder = [...existingOrder, key]

  try {
    while (nextOrder.length > LOCAL_STORAGE_LIMIT) {
      const oldest = nextOrder.shift()
      if (!oldest) break
      window.localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${oldest}`)
    }

    window.localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${key}`, JSON.stringify(data))
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
        if (isBaniFetchResult(parsed)) return parsed
      }
    } catch {
      // Fall through to the bounded localStorage compatibility cache.
    }
  }

  return readLocalFallback(key)
}

export async function writeBaniOfflineCache(
  baniDbId: number,
  sgLength: SundarGutkaLength | null | undefined,
  data: BaniFetchResult
): Promise<void> {
  if (!isBaniFetchResult(data) || data.entries.length === 0) return

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
      for (const oldest of requests.slice(0, Math.max(0, requests.length - CACHE_STORAGE_LIMIT))) {
        await cache.delete(oldest)
      }
      return
    } catch {
      // Fall through to the bounded localStorage compatibility cache.
    }
  }

  writeLocalFallback(getCacheKey(baniDbId, sgLength), data)
}
