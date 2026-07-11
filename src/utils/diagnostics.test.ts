import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDiagnosticPayload, reportDiagnostic } from './diagnostics'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('privacy-safe diagnostics', () => {
  it('builds an allow-listed payload without query data or error details', () => {
    vi.stubEnv('VITE_APP_VERSION', '2.1.0')

    const payload = createDiagnosticPayload(
      'react_render_failure',
      { source: 'error-boundary', fatal: true },
      '/banis/amrit-keertan/42?private=never-sent',
    )

    expect(payload).toEqual({
      schema: 1,
      code: 'react_render_failure',
      source: 'error-boundary',
      fatal: true,
      path: '/banis/amrit-keertan/:id',
      appVersion: '2.1.0',
    })
    expect(JSON.stringify(payload)).not.toMatch(/message|stack|scripture|account|saved/i)
  })

  it('does not send anything without an explicit HTTPS endpoint', () => {
    vi.stubEnv('VITE_DIAGNOSTICS_ENDPOINT', '')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    expect(reportDiagnostic('unhandled_window_error', { source: 'window-error', fatal: true })).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('uses an anonymous keepalive request when configured', () => {
    vi.stubEnv('VITE_DIAGNOSTICS_ENDPOINT', 'https://errors.naamras.example/events')
    vi.stubEnv('VITE_APP_VERSION', '2.1.0')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 202 }))

    expect(reportDiagnostic('unhandled_promise_rejection', { source: 'unhandled-rejection' })).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://errors.naamras.example/events',
      expect.objectContaining({
        method: 'POST',
        credentials: 'omit',
        keepalive: true,
        referrerPolicy: 'no-referrer',
      }),
    )
  })
})
