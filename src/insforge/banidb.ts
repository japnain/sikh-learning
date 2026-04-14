import { getNaamrasInsforgeConfig, getNaamrasInsforgeFunctionUrl } from './config'

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

export async function requestBanidb<T>(path: string, query?: BanidbProxyQuery) {
  const config = getNaamrasInsforgeConfig()
  const endpoint = getNaamrasInsforgeFunctionUrl(config.banidbFunctionSlug)

  if (!config.enabled || !config.baseUrl || !endpoint) {
    throw new Error('InsForge is not configured for BaniDB requests.')
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      path,
      query: normalizeQuery(query),
    }),
  })

  const text = await response.text()
  let data = null as T

  if (text) {
    try {
      data = JSON.parse(text) as T
    } catch {
      data = text as T
    }
  }

  return { response, data }
}
