import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('requestBanidb', () => {
  it('falls back to the public BaniDB read API when InsForge is not configured', async () => {
    vi.doMock('./config', () => ({
      getNaamrasInsforgeConfig: () => ({
        enabled: false,
        baseUrl: null,
        functionsUrl: undefined,
        banidbMockEnabled: false,
        banidbDirectFallbackEnabled: true,
        banidbPublicOrigin: 'https://api.banidb.com',
        banidbFunctionSlug: 'banidb-proxy',
        mergeFunctionSlug: 'merge-local-state',
        studyFunctionSlug: 'generate-study-response',
        studyEnabled: false,
      }),
      getNaamrasInsforgeFunctionUrl: () => null,
    }))

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ verses: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { requestBanidb } = await import('./banidb')
    const result = await requestBanidb<{ verses: unknown[] }>('/v2/search/death', {
      searchtype: 3,
      source: 'all',
    })

    expect(fetchMock).toHaveBeenCalledWith('https://api.banidb.com/v2/search/death?searchtype=3&source=all')
    expect(result.response.status).toBe(200)
    expect(result.data).toEqual({ verses: [] })
  })

  it('fails loudly when neither InsForge nor the public fallback is enabled', async () => {
    vi.doMock('./config', () => ({
      getNaamrasInsforgeConfig: () => ({
        enabled: false,
        baseUrl: null,
        functionsUrl: undefined,
        banidbMockEnabled: false,
        banidbDirectFallbackEnabled: false,
        banidbPublicOrigin: 'https://api.banidb.com',
        banidbFunctionSlug: 'banidb-proxy',
        mergeFunctionSlug: 'merge-local-state',
        studyFunctionSlug: 'generate-study-response',
        studyEnabled: false,
      }),
      getNaamrasInsforgeFunctionUrl: () => null,
    }))

    const { requestBanidb } = await import('./banidb')

    await expect(requestBanidb('/v2/search/death')).rejects.toThrow(/BaniDB requests need/)
  })
})
