import { describe, expect, it, vi } from 'vitest'
import { getAppVersion, getPublicAppLinks, normalizePublicHttpsUrl } from './appConfig'

describe('public app configuration', () => {
  it('accepts only credential-free HTTPS URLs', () => {
    expect(normalizePublicHttpsUrl('https://naamras.example/support')).toBe('https://naamras.example/support')
    expect(normalizePublicHttpsUrl('http://naamras.example/support')).toBeNull()
    expect(normalizePublicHttpsUrl('javascript:alert(1)')).toBeNull()
    expect(normalizePublicHttpsUrl('https://user:secret@naamras.example/support')).toBeNull()
  })

  it('does not invent release links when they are not configured', () => {
    vi.stubEnv('VITE_SUPPORT_URL', '')
    vi.stubEnv('VITE_PRIVACY_URL', '')

    expect(getPublicAppLinks()).toEqual({ supportUrl: null, privacyUrl: null })

    vi.unstubAllEnvs()
  })

  it('sanitizes the public app version', () => {
    vi.stubEnv('VITE_APP_VERSION', ' 1.4.0 (beta) ')
    expect(getAppVersion()).toBe('1.4.0beta')
    vi.unstubAllEnvs()
  })
})
