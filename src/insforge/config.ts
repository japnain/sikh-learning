export interface NaamrasInsforgeConfig {
  enabled: boolean
  baseUrl: string | null
  anonKey?: string
  functionsUrl?: string
  audioBucket?: string
  audioPrefix?: string
  banidbFunctionSlug: string
  mergeFunctionSlug: string
  studyFunctionSlug: string
  studyEnabled: boolean
}

let cachedConfig: NaamrasInsforgeConfig | null = null

function normalizeOptionalValue(value: string | undefined): string | undefined {
  const next = value?.trim()
  return next ? next : undefined
}

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, '')
}

function deriveFunctionsUrl(baseUrl: string) {
  const url = new URL(baseUrl)

  if (url.hostname.includes('.functions.insforge.app')) {
    return trimTrailingSlashes(url.origin)
  }

  const [appKey] = url.hostname.split('.')
  if (!appKey) return undefined

  return `https://${appKey}.functions.insforge.app`
}

export function getNaamrasInsforgeConfig(): NaamrasInsforgeConfig {
  if (cachedConfig) return cachedConfig

  const baseUrl = normalizeOptionalValue(import.meta.env.VITE_INSFORGE_URL) ?? null
  const configuredFunctionsUrl = normalizeOptionalValue(import.meta.env.VITE_INSFORGE_FUNCTIONS_URL)
  const studyEnabled = normalizeOptionalValue(import.meta.env.VITE_INSFORGE_ENABLE_STUDY_AI) === 'true'

  cachedConfig = {
    enabled: Boolean(baseUrl),
    baseUrl,
    anonKey: normalizeOptionalValue(import.meta.env.VITE_INSFORGE_ANON_KEY),
    functionsUrl: configuredFunctionsUrl
      ? trimTrailingSlashes(configuredFunctionsUrl)
      : (baseUrl ? deriveFunctionsUrl(baseUrl) : undefined),
    audioBucket: normalizeOptionalValue(import.meta.env.VITE_INSFORGE_AUDIO_BUCKET) ?? 'soundscrape',
    audioPrefix: normalizeOptionalValue(import.meta.env.VITE_INSFORGE_AUDIO_PREFIX) ?? 'ambient',
    banidbFunctionSlug: normalizeOptionalValue(import.meta.env.VITE_INSFORGE_BANIDB_FUNCTION) ?? 'banidb-proxy',
    mergeFunctionSlug: normalizeOptionalValue(import.meta.env.VITE_INSFORGE_MERGE_FUNCTION) ?? 'merge-local-state',
    studyFunctionSlug: normalizeOptionalValue(import.meta.env.VITE_INSFORGE_STUDY_FUNCTION) ?? 'generate-study-response',
    studyEnabled,
  }

  return cachedConfig
}

export function resetNaamrasInsforgeConfigForTests() {
  cachedConfig = null
}

export function getNaamrasInsforgeFunctionUrl(slug: string) {
  const config = getNaamrasInsforgeConfig()
  if (!config.functionsUrl) return null
  return `${trimTrailingSlashes(config.functionsUrl)}/${slug.replace(/^\/+/, '')}`
}
