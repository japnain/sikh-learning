import { resolveAppPath } from '../utils/basePath'

export function isAuthReturnFragment(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  return ['access_token', 'refresh_token', 'error', 'error_code', 'error_description'].some(key => params.has(key))
}

/** Fixed destinations: never accept a redirect URL from a query parameter. */
export function getAuthRedirectUrl(recovery = false) {
  const origin = typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol)
    && !window.location.hostname.endsWith('.vercel.app')
    ? window.location.origin : 'https://naamras.xyz'
  return new URL(resolveAppPath(recovery ? '/auth/recovery' : '/auth/callback', import.meta.env.BASE_URL), origin).href
}

/** Do not display provider descriptions: they can contain private or untrusted text. */
export function hasAuthReturnError(search: string, hash: string) {
  return [search.replace(/^\?/, ''), hash.replace(/^#/, '')].some(value => {
    const params = new URLSearchParams(value)
    return params.has('error') || params.has('error_code') || params.has('error_description')
  })
}
