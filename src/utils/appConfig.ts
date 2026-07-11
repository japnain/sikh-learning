export interface PublicAppLinks {
  supportUrl: string | null
  privacyUrl: string | null
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

export function getAppVersion(): string {
  const version = import.meta.env.VITE_APP_VERSION?.trim()
  if (!version) return 'unknown'
  return version.replace(/[^a-zA-Z0-9._+-]/g, '').slice(0, 64) || 'unknown'
}
