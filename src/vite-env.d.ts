/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INSFORGE_URL?: string
  readonly VITE_INSFORGE_ANON_KEY?: string
  readonly VITE_INSFORGE_FUNCTIONS_URL?: string
  readonly VITE_INSFORGE_BANIDB_FUNCTION?: string
  readonly VITE_INSFORGE_MERGE_FUNCTION?: string
  readonly VITE_INSFORGE_STUDY_FUNCTION?: string
  readonly VITE_INSFORGE_ENABLE_STUDY_AI?: string
  readonly VITE_INSFORGE_AUDIO_BUCKET?: string
  readonly VITE_INSFORGE_AUDIO_PREFIX?: string
  readonly VITE_NAAMRAS_BANIDB_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
