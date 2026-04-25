import { getNaamrasInsforgeConfig, getNaamrasInsforgeFunctionUrl } from './config'
import { getMockBanidbResponse } from './banidbMock'

type BanidbProxyQueryValue = string | number | boolean | null | undefined

export type BanidbProxyQuery = Record<string, BanidbProxyQueryValue>

function normalizeQuery(query?: BanidbProxyQuery) {
  if (!query) return undefined

  const entries = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => [key, String(value)] as const)

  return entries.length > 0
    ? Object.fromEntries(entries)
    : undefined
}

function parseResponseData<T>(text: string) {
  if (!text) return null as T

  try {
    return JSON.parse(text) as T
  } catch {
    return text as T
  }
}

function buildPublicBanidbUrl(origin: string, path: string, query?: Record<string, string>) {
  if (!path.startsWith('/v2/')) {
    throw new Error('Only BaniDB v2 read paths can use the public fallback.')
  }

  const url = new URL(path, origin)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value)
    }
  }

  return url
}

function buildDevProxyBanidbUrl(path: string, query?: Record<string, string>) {
  if (import.meta.env.MODE !== 'development' || typeof window === 'undefined') return null
  if (!path.startsWith('/v2/')) return null

  const url = new URL(`/__banidb${path}`, window.location.origin)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value)
    }
  }

  return url
}

export async function requestBanidb<T>(path: string, query?: BanidbProxyQuery) {
  const config = getNaamrasInsforgeConfig()
  const normalizedQuery = normalizeQuery(query)

  if (config.banidbMockEnabled) {
    const data = getMockBanidbResponse(path, normalizedQuery)
    return {
      response: new Response(JSON.stringify(data ?? { error: 'Not found.' }), {
        status: data ? 200 : 404,
        headers: { 'content-type': 'application/json' },
      }),
      data: data as T,
    }
  }

  const endpoint = getNaamrasInsforgeFunctionUrl(config.banidbFunctionSlug)

  if (!config.enabled || !config.baseUrl || !endpoint) {
    if (!config.banidbDirectFallbackEnabled) {
      throw new Error('BaniDB requests need either InsForge or the public BaniDB fallback enabled.')
    }

    const response = await fetch(
      (buildDevProxyBanidbUrl(path, normalizedQuery) ?? buildPublicBanidbUrl(config.banidbPublicOrigin, path, normalizedQuery)).toString()
    )
    const text = await response.text()
    return {
      response,
      data: parseResponseData<T>(text),
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      path,
      query: normalizedQuery,
    }),
  })

  const text = await response.text()

  return { response, data: parseResponseData<T>(text) }
}
