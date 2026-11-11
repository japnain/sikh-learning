import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { requestBanidb } from './banidb'
import { resetNaamrasSupabaseConfigForTests } from './config'

const PROXY_URL = 'https://naamras-qa.supabase.co/functions/v1/banidb-proxy'
const PUBLIC_ORIGIN = 'https://api.banidb.com'
const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://naamras-qa.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')
  vi.stubEnv('VITE_SUPABASE_FUNCTIONS_URL', 'https://naamras-qa.supabase.co/functions/v1')
  vi.stubEnv('VITE_NAAMRAS_BANIDB_PUBLIC_ORIGIN', PUBLIC_ORIGIN)
  vi.stubEnv('VITE_NAAMRAS_BANIDB_MOCK', 'false')
  vi.stubEnv('VITE_NAAMRAS_BANIDB_DIRECT_FALLBACK', 'true')
  resetNaamrasSupabaseConfigForTests()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  resetNaamrasSupabaseConfigForTests()
})

describe('BaniDB proxy availability fallback', () => {
  it('uses a successful proxy without an additional public request', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ verses: ['proxy'] }))

    const result = await requestBanidb('/v2/banis/1')

    expect(result.data).toEqual({ verses: ['proxy'] })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe(PROXY_URL)
  })

  it('recovers a 5xx response with the same search and cancellation signal, without forwarding project credentials', async () => {
    const controller = new AbortController()
    fetchMock
      .mockResolvedValueOnce(Response.json({ error: 'Proxy unavailable' }, { status: 502 }))
      .mockResolvedValueOnce(Response.json({ shabads: ['public result'] }))

    const result = await requestBanidb('/v2/search/peace', {
      searchtype: 3, source: 'all', page: 2, omitted: undefined,
    }, { signal: controller.signal })

    expect(result.response.status).toBe(200)
    expect(result.data).toEqual({ shabads: ['public result'] })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1]).toEqual([
      `${PUBLIC_ORIGIN}/v2/search/peace?searchtype=3&source=all&page=2`,
      { signal: controller.signal },
    ])
  })

  it('recovers a fetch network failure', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(Response.json({ verses: ['public'] }))

    expect((await requestBanidb('/v2/banis/1')).data).toEqual({ verses: ['public'] })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('recovers a network failure while reading the proxy response body', async () => {
    const response = new Response()
    vi.spyOn(response, 'text').mockRejectedValueOnce(new TypeError('Connection lost'))
    fetchMock
      .mockResolvedValueOnce(response)
      .mockResolvedValueOnce(Response.json({ verses: ['public'] }))

    expect((await requestBanidb('/v2/banis/1')).data).toEqual({ verses: ['public'] })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it.each([400, 401, 403, 404, 429])('preserves HTTP %i without bypassing the response', async status => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: 'Request rejected' }, { status }))

    const result = await requestBanidb('/v2/banis/1')

    expect(result.response.status).toBe(status)
    expect(result.data).toEqual({ error: 'Request rejected' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('honors explicitly disabled fallback for server and network failures', async () => {
    vi.stubEnv('VITE_NAAMRAS_BANIDB_DIRECT_FALLBACK', 'false')
    resetNaamrasSupabaseConfigForTests()
    const networkError = new TypeError('Failed to fetch')
    fetchMock
      .mockResolvedValueOnce(Response.json({ error: 'Unavailable' }, { status: 503 }))
      .mockRejectedValueOnce(networkError)

    expect((await requestBanidb('/v2/banis/1')).response.status).toBe(503)
    await expect(requestBanidb('/v2/banis/1')).rejects.toBe(networkError)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not start a request after caller cancellation', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(requestBanidb('/v2/banis/1', undefined, { signal: controller.signal }))
      .rejects.toBe(controller.signal.reason)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not fall back when the caller cancels an in-flight proxy request', async () => {
    const controller = new AbortController()
    fetchMock.mockImplementationOnce(async () => {
      controller.abort()
      throw new TypeError('Fetch aborted by caller')
    })

    await expect(requestBanidb('/v2/banis/1', undefined, { signal: controller.signal }))
      .rejects.toBe(controller.signal.reason)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('checks cancellation again before falling back from a server error', async () => {
    const controller = new AbortController()
    const response = new Response(null, { status: 504 })
    vi.spyOn(response, 'text').mockImplementationOnce(async () => {
      controller.abort()
      return ''
    })
    fetchMock.mockResolvedValueOnce(response)

    await expect(requestBanidb('/v2/banis/1', undefined, { signal: controller.signal }))
      .rejects.toMatchObject({ name: 'AbortError' })
    expect(controller.signal.aborted).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not retry unrelated errors or an AbortError', async () => {
    const programmingError = new Error('Unexpected failure')
    const abortError = new DOMException('Aborted', 'AbortError')
    fetchMock.mockRejectedValueOnce(programmingError).mockRejectedValueOnce(abortError)

    await expect(requestBanidb('/v2/banis/1')).rejects.toBe(programmingError)
    await expect(requestBanidb('/v2/banis/1')).rejects.toBe(abortError)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('propagates a failed public request without a retry loop', async () => {
    const error = new TypeError('Public API is also unavailable')
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockRejectedValueOnce(error)

    await expect(requestBanidb('/v2/banis/1')).rejects.toBe(error)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
