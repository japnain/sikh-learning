import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearDiagnosticHistory, createDiagnosticPayload, getDiagnosticHistory, reportDiagnostic, reportProviderFailure } from './diagnostics'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  clearDiagnosticHistory()
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

  it('redacts reading slugs and arbitrary unknown paths, not only numeric IDs', () => {
    const options = { source: 'banidb' as const }
    expect(createDiagnosticPayload('provider_request_failed', options, '/library/private-book/chapters/private-chapter').path).toBe('/library/:work/chapters/:chapter')
    expect(createDiagnosticPayload('provider_request_failed', options, '/stories/private-title?q=private').path).toBe('/stories/:story')
    expect(createDiagnosticPayload('provider_request_failed', options, '/someone@example.com').path).toBe('/other')
  })

  it('keeps bounded session-only failures without sending query text or exceptions', () => {
    vi.stubEnv('VITE_DIAGNOSTICS_ENDPOINT', '')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem')
    for (let index = 0; index < 30; index += 1) {
      reportProviderFailure(index % 2 ? 'banidb' : 'mahankosh', new Error('private query, account and request URL'))
    }
    expect(getDiagnosticHistory()).toHaveLength(20)
    expect(JSON.stringify(getDiagnosticHistory())).not.toContain('private query')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(storageSpy).not.toHaveBeenCalled()
    const snapshot = getDiagnosticHistory()
    snapshot[0].count = 500
    expect(getDiagnosticHistory()[0].count).toBe(1)
  })

  it('ignores normal cancellation and coalesces repeated failures', () => {
    vi.stubEnv('VITE_DIAGNOSTICS_ENDPOINT', '')
    reportProviderFailure('banidb', new DOMException('Cancelled', 'AbortError'))
    expect(getDiagnosticHistory()).toEqual([])
    reportProviderFailure('banidb')
    reportProviderFailure('banidb')
    expect(getDiagnosticHistory()).toHaveLength(1)
    expect(getDiagnosticHistory()[0].count).toBe(2)
  })
})
