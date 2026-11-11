import { Capacitor } from '@capacitor/core'
import type { NaamrasSupabaseConfig } from './config'

export type CloudAuthProvider = 'apple' | 'email'
export const AUTH_SETTINGS_TIMEOUT_MS = 5000

/** Public settings describe enabled providers; a URL/key alone does not. */
export async function discoverAuthProviders(
  config: Pick<NaamrasSupabaseConfig, 'enabled' | 'url' | 'anonKey'>,
  signal?: AbortSignal,
): Promise<CloudAuthProvider[]> {
  // The shipping Capacitor target does not yet handle OAuth/magic-link callbacks.
  if (!config.enabled || !config.url || !config.anonKey || Capacitor.isNativePlatform() || signal?.aborted) return []

  const controller = new AbortController()
  let timeout: ReturnType<typeof setTimeout> | undefined
  let onAbort: () => void = () => undefined
  const canceled = new Promise<CloudAuthProvider[]>(resolve => {
    onAbort = () => { controller.abort(); resolve([]) }
    signal?.addEventListener('abort', onAbort, { once: true })
    timeout = setTimeout(onAbort, AUTH_SETTINGS_TIMEOUT_MS)
  })

  const request = (async (): Promise<CloudAuthProvider[]> => {
    try {
      const response = await fetch(`${config.url!.replace(/\/+$/, '')}/auth/v1/settings`, {
        headers: { apikey: config.anonKey! },
        credentials: 'omit',
        signal: controller.signal,
      })
      if (!response.ok) return []
      const settings: unknown = await response.json()
      if (!settings || typeof settings !== 'object' || !('external' in settings)) return []
      const external = settings.external
      if (!external || typeof external !== 'object') return []
      return (['apple', 'email'] as const).filter(provider => (
        provider in external && (external as Record<string, unknown>)[provider] === true
      ))
    } catch {
      // Unavailable settings must not advertise an unverified sign-in option.
      return []
    }
  })()

  try {
    return await Promise.race([request, canceled])
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', onAbort)
  }
}
