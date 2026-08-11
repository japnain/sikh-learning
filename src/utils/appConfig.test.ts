import { describe, expect, it, vi } from 'vitest'
import {
  buildSupportMailto,
  getAppVersion,
  getPublicAppLinks,
  getSupportEmail,
  normalizePublicHttpsUrl,
  normalizeSupportEmail,
} from './appConfig'

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

  it('accepts only a plain verified support email configuration', () => {
    expect(normalizeSupportEmail('support@naamras.example')).toBe('support@naamras.example')
    expect(normalizeSupportEmail('not-an-email')).toBeNull()
    expect(normalizeSupportEmail('support@naamras.example\nBcc:someone@example.com')).toBeNull()

    vi.stubEnv('VITE_SUPPORT_EMAIL', 'help@naamras.example')
    expect(getSupportEmail()).toBe('help@naamras.example')
    vi.unstubAllEnvs()
  })

  it('encodes the support address before placing it in a mailto URL', () => {
    expect(buildSupportMailto('help+reader@naamras.example')).toBe(
      'mailto:help%2Breader@naamras.example?subject=NaamRas%20support',
    )
    expect(buildSupportMailto('help?topic@naamras.example')).toBe(
      'mailto:help%3Ftopic@naamras.example?subject=NaamRas%20support',
    )
    expect(buildSupportMailto('help%0ABcc@naamras.example')).toBe(
      'mailto:help%250ABcc@naamras.example?subject=NaamRas%20support',
    )
    expect(buildSupportMailto('not-an-email')).toBeNull()
  })

  it('sanitizes the public app version', () => {
    vi.stubEnv('VITE_APP_VERSION', ' 1.4.0 (beta) ')
    expect(getAppVersion()).toBe('1.4.0beta')
    vi.unstubAllEnvs()
  })
})
