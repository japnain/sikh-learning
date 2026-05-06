/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_SUPABASE_FUNCTIONS_URL?: string
  readonly VITE_SUPABASE_BANIDB_FUNCTION?: string
  readonly VITE_SUPABASE_MERGE_FUNCTION?: string
  readonly VITE_SUPABASE_STUDY_FUNCTION?: string
  readonly VITE_SUPABASE_ENABLE_STUDY_AI?: string
  readonly VITE_SUPABASE_AUDIO_BUCKET?: string
  readonly VITE_SUPABASE_AUDIO_PREFIX?: string
  readonly VITE_NAAMRAS_BANIDB_MOCK?: string
  readonly VITE_NAAMRAS_BANIDB_DIRECT_FALLBACK?: string
  readonly VITE_NAAMRAS_BANIDB_PUBLIC_ORIGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
