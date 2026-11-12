import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { Capacitor } from '@capacitor/core'
import { AUTH_SETTINGS_TIMEOUT_MS, discoverAuthProviders } from './authProviders'

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: vi.fn(() => false) } }))

const config = { enabled: true, url: 'https://naamras-qa.supabase.co', anonKey: 'public-test-key' }

beforeEach(() => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
})

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

describe('enabled authentication providers', () => {
  test('shows only enabled providers implemented by the app', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      external: { email: true, apple: false, google: true },
    })))
    await expect(discoverAuthProviders(config)).resolves.toEqual(['google', 'email'])
    expect(fetcher).toHaveBeenCalledWith(`${config.url}/auth/v1/settings`, expect.objectContaining({
      headers: { apikey: config.anonKey }, credentials: 'omit', signal: expect.any(AbortSignal),
    }))
  })

  test('requires literal boolean provider settings', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      external: { apple: true, email: 'true' },
    })))
    await expect(discoverAuthProviders(config)).resolves.toEqual(['apple'])
  })

  test.each([
    new Response('unavailable', { status: 503 }),
    new Response('not-json'),
    new Response(JSON.stringify({ external: null })),
  ])('offers no unverified providers for invalid/unavailable settings', async response => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)
    await expect(discoverAuthProviders(config)).resolves.toEqual([])
  })

  test('handles network failures without failing cloud bootstrap', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network unavailable'))
    await expect(discoverAuthProviders(config)).resolves.toEqual([])
  })

  test('bounds even a stalled transport and aborts its request', async () => {
    vi.useFakeTimers()
    const fetcher = vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))
    const discovery = discoverAuthProviders(config)
    await vi.advanceTimersByTimeAsync(AUTH_SETTINGS_TIMEOUT_MS)
    await expect(discovery).resolves.toEqual([])
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true)
  })

  test('cancels discovery when its runtime is discarded', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))
    const controller = new AbortController()
    const discovery = discoverAuthProviders(config, controller.signal)
    controller.abort()
    await expect(discovery).resolves.toEqual([])
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true)
  })

  test('does not advertise native sign-in without a callback integration', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    const fetcher = vi.spyOn(globalThis, 'fetch')
    await expect(discoverAuthProviders(config)).resolves.toEqual([])
    expect(fetcher).not.toHaveBeenCalled()
  })

  test('does not contact Auth when cloud is disabled', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch')
    await expect(discoverAuthProviders({ ...config, enabled: false })).resolves.toEqual([])
    expect(fetcher).not.toHaveBeenCalled()
  })
})
