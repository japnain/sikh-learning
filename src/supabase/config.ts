export interface NaamrasSupabaseConfig {
  enabled: boolean
  url: string | null
  anonKey?: string
  functionsUrl?: string
  audioBucket?: string
  audioPrefix?: string
  banidbMockEnabled: boolean
  banidbDirectFallbackEnabled: boolean
  banidbPublicOrigin: string
  banidbFunctionSlug: string
  mergeFunctionSlug: string
  studyFunctionSlug: string
  studyEnabled: boolean
}

let cachedConfig: NaamrasSupabaseConfig | null = null

function normalizeOptionalValue(value: string | undefined): string | undefined {
  const next = value?.trim()
  return next ? next : undefined
}

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, '')
}

function deriveFunctionsUrl(projectUrl: string) {
  const url = new URL(projectUrl)
  return `${trimTrailingSlashes(url.origin)}/functions/v1`
}

export function getNaamrasSupabaseConfig(): NaamrasSupabaseConfig {
  if (cachedConfig) return cachedConfig

  const url = normalizeOptionalValue(import.meta.env.VITE_SUPABASE_URL) ?? null
  const anonKey = normalizeOptionalValue(import.meta.env.VITE_SUPABASE_ANON_KEY)
  const configuredFunctionsUrl = normalizeOptionalValue(import.meta.env.VITE_SUPABASE_FUNCTIONS_URL)
  const banidbMockEnabled = normalizeOptionalValue(import.meta.env.VITE_NAAMRAS_BANIDB_MOCK) === 'true'
  const banidbDirectFallbackEnabled = normalizeOptionalValue(import.meta.env.VITE_NAAMRAS_BANIDB_DIRECT_FALLBACK) !== 'false'

  cachedConfig = {
    enabled: Boolean(url && anonKey),
    url,
    anonKey,
    functionsUrl: configuredFunctionsUrl
      ? trimTrailingSlashes(configuredFunctionsUrl)
      : (url ? deriveFunctionsUrl(url) : undefined),
    audioBucket: normalizeOptionalValue(import.meta.env.VITE_SUPABASE_AUDIO_BUCKET) ?? 'soundscrape',
    audioPrefix: normalizeOptionalValue(import.meta.env.VITE_SUPABASE_AUDIO_PREFIX) ?? 'ambient',
    banidbMockEnabled,
    banidbDirectFallbackEnabled,
    banidbPublicOrigin: trimTrailingSlashes(
      normalizeOptionalValue(import.meta.env.VITE_NAAMRAS_BANIDB_PUBLIC_ORIGIN) ?? 'https://api.banidb.com'
    ),
    banidbFunctionSlug: normalizeOptionalValue(import.meta.env.VITE_SUPABASE_BANIDB_FUNCTION) ?? 'banidb-proxy',
    mergeFunctionSlug: normalizeOptionalValue(import.meta.env.VITE_SUPABASE_MERGE_FUNCTION) ?? 'merge-local-state',
    studyFunctionSlug: normalizeOptionalValue(import.meta.env.VITE_SUPABASE_STUDY_FUNCTION) ?? 'generate-study-response',
    studyEnabled: normalizeOptionalValue(import.meta.env.VITE_SUPABASE_ENABLE_STUDY_AI) === 'true',
  }

  return cachedConfig
}

export function resetNaamrasSupabaseConfigForTests() {
  cachedConfig = null
}

export function getNaamrasSupabaseFunctionUrl(slug: string) {
  const config = getNaamrasSupabaseConfig()
  if (!config.functionsUrl) return null
  return `${trimTrailingSlashes(config.functionsUrl)}/${slug.replace(/^\/+/, '')}`
}
