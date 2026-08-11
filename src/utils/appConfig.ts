export interface PublicAppLinks {
  supportUrl: string | null
  privacyUrl: string | null
}

export function normalizeSupportEmail(value: string | null | undefined): string | null {
  const candidate = value?.trim()
  if (!candidate || candidate.length > 254 || /[\r\n]/.test(candidate)) return null
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/.test(candidate)
    ? candidate
    : null
}

export function normalizePublicHttpsUrl(value: string | null | undefined): string | null {
  const candidate = value?.trim()
  if (!candidate) return null

  try {
    const url = new URL(candidate)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    return url.toString()
  } catch {
    return null
  }
}

export function getPublicAppLinks(): PublicAppLinks {
  return {
    supportUrl: normalizePublicHttpsUrl(import.meta.env.VITE_SUPPORT_URL),
    privacyUrl: normalizePublicHttpsUrl(import.meta.env.VITE_PRIVACY_URL),
  }
}

export function getDiagnosticsEndpoint(): string | null {
  return normalizePublicHttpsUrl(import.meta.env.VITE_DIAGNOSTICS_ENDPOINT)
}

export function getSupportEmail(): string | null {
  return normalizeSupportEmail(import.meta.env.VITE_SUPPORT_EMAIL)
}

export function buildSupportMailto(value: string | null | undefined): string | null {
  const email = normalizeSupportEmail(value)
  if (!email) return null

  const separatorIndex = email.lastIndexOf('@')
  const localPart = encodeURIComponent(email.slice(0, separatorIndex))
  const domain = encodeURIComponent(email.slice(separatorIndex + 1))
  const subject = encodeURIComponent('NaamRas support')
  return `mailto:${localPart}@${domain}?subject=${subject}`
}

export function getAppVersion(): string {
  const version = import.meta.env.VITE_APP_VERSION?.trim()
  if (!version) return 'unknown'
  return version.replace(/[^a-zA-Z0-9._+-]/g, '').slice(0, 64) || 'unknown'
}
