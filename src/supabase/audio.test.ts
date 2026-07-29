import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getNaamrasSupabaseConfig } from './config'
import { getLocalAmbientSoundSrc, resolveAmbientSoundSrc } from './audio'

vi.mock('./config', () => ({
  getNaamrasSupabaseConfig: vi.fn(),
}))

const mockedGetConfig = vi.mocked(getNaamrasSupabaseConfig)

describe('ambient audio source resolution', () => {
  beforeEach(() => {
    mockedGetConfig.mockReset()
  })

  it('keeps local audio local when cloud sync is not configured', () => {
    mockedGetConfig.mockReturnValue({
      enabled: false,
      url: null,
      banidbMockEnabled: false,
      banidbDirectFallbackEnabled: true,
      banidbPublicOrigin: 'https://api.banidb.com',
      banidbFunctionSlug: 'banidb-proxy',
      mergeFunctionSlug: 'merge-local-state',
      deleteAccountFunctionSlug: 'delete-account',
      studyFunctionSlug: 'generate-study-response',
      studyEnabled: false,
    })

    expect(getLocalAmbientSoundSrc('/gentle-rain.mp3')).toBe('/audio/ambient/gentle-rain.mp3')
    expect(resolveAmbientSoundSrc('/gentle-rain.mp3')).toBe('/audio/ambient/gentle-rain.mp3')
  })

  it('constructs the same public Storage URL without loading the Supabase client', () => {
    mockedGetConfig.mockReturnValue({
      enabled: true,
      url: 'https://naamras.supabase.co/',
      anonKey: 'public-anon-key',
      audioBucket: '/soundscrape/',
      audioPrefix: '/ambient scenes/',
      banidbMockEnabled: false,
      banidbDirectFallbackEnabled: true,
      banidbPublicOrigin: 'https://api.banidb.com',
      banidbFunctionSlug: 'banidb-proxy',
      mergeFunctionSlug: 'merge-local-state',
      deleteAccountFunctionSlug: 'delete-account',
      studyFunctionSlug: 'generate-study-response',
      studyEnabled: false,
    })

    expect(resolveAmbientSoundSrc('/night meadow.mp3')).toBe(
      'https://naamras.supabase.co/storage/v1/object/public/soundscrape/ambient%20scenes/night%20meadow.mp3'
    )
  })
})
