import { afterEach, expect, it, vi } from 'vitest'
import { resolveAmbientSoundSrc } from './audio'
import { resetNaamrasSupabaseConfigForTests } from './config'

afterEach(() => {
  vi.unstubAllEnvs()
  resetNaamrasSupabaseConfigForTests()
})

it('keeps bundled audio when accounts are configured without an audio bucket', () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://naamras-qa.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-test-key')
  vi.stubEnv('VITE_SUPABASE_AUDIO_BUCKET', '')
  resetNaamrasSupabaseConfigForTests()

  expect(resolveAmbientSoundSrc('gentle-rain.mp3')).toBe('/audio/ambient/gentle-rain.mp3')
})

it('uses cloud audio only when its bucket is explicitly configured', () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://naamras-qa.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-test-key')
  vi.stubEnv('VITE_SUPABASE_AUDIO_BUCKET', 'soundscrape')
  vi.stubEnv('VITE_SUPABASE_AUDIO_PREFIX', 'ambient')
  resetNaamrasSupabaseConfigForTests()

  expect(resolveAmbientSoundSrc('gentle-rain.mp3')).toBe(
    'https://naamras-qa.supabase.co/storage/v1/object/public/soundscrape/ambient/gentle-rain.mp3',
  )
})
