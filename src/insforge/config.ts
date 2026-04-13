export interface NaamrasInsforgeConfig {
  enabled: boolean
  baseUrl: string | null
  anonKey?: string
  functionsUrl?: string
  audioBucket?: string
  audioPrefix?: string
  mergeFunctionSlug: string
  studyFunctionSlug: string
  studyEnabled: boolean
}

let cachedConfig: NaamrasInsforgeConfig | null = null

function normalizeOptionalValue(value: string | undefined): string | undefined {
  const next = value?.trim()
  return next ? next : undefined
}

export function getNaamrasInsforgeConfig(): NaamrasInsforgeConfig {
  if (cachedConfig) return cachedConfig

  const baseUrl = normalizeOptionalValue(import.meta.env.VITE_INSFORGE_URL) ?? null
  const studyEnabled = normalizeOptionalValue(import.meta.env.VITE_INSFORGE_ENABLE_STUDY_AI) === 'true'

  cachedConfig = {
    enabled: Boolean(baseUrl),
    baseUrl,
    anonKey: normalizeOptionalValue(import.meta.env.VITE_INSFORGE_ANON_KEY),
    functionsUrl: normalizeOptionalValue(import.meta.env.VITE_INSFORGE_FUNCTIONS_URL),
    audioBucket: normalizeOptionalValue(import.meta.env.VITE_INSFORGE_AUDIO_BUCKET) ?? 'soundscrape',
    audioPrefix: normalizeOptionalValue(import.meta.env.VITE_INSFORGE_AUDIO_PREFIX) ?? 'ambient',
    mergeFunctionSlug: normalizeOptionalValue(import.meta.env.VITE_INSFORGE_MERGE_FUNCTION) ?? 'merge-local-state',
    studyFunctionSlug: normalizeOptionalValue(import.meta.env.VITE_INSFORGE_STUDY_FUNCTION) ?? 'generate-study-response',
    studyEnabled,
  }

  return cachedConfig
}

export function resetNaamrasInsforgeConfigForTests() {
  cachedConfig = null
}
