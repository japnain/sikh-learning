import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchShabadosBani } from '../api/shabados'
import { shabadosReadingFixture } from '../test/shabadosFixture'
import { readDownloadedBani } from '../utils/baniDownloads'
import { useShabadosBani } from './useShabadosBani'

vi.mock('../api/shabados', async importOriginal => ({
  ...await importOriginal<typeof import('../api/shabados')>(), fetchShabadosBani: vi.fn(),
}))
vi.mock('../utils/baniDownloads', () => ({ readDownloadedBani: vi.fn() }))

beforeEach(() => {
  vi.mocked(fetchShabadosBani).mockReset()
  vi.mocked(readDownloadedBani).mockReset().mockResolvedValue(null)
})
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

describe('Shabad OS reader loading', () => {
  it('opens a verified downloaded reading in airplane mode without a request', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const saved = shabadosReadingFixture()
    vi.mocked(readDownloadedBani).mockResolvedValue(saved)
    const { result } = renderHook(() => useShabadosBani('ALHN'))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.entries).toBe(saved.entries)
    expect(result.current.isCached).toBe(true)
    expect(result.current.issue).toBeNull()
    expect(fetchShabadosBani).not.toHaveBeenCalled()
    expect(readDownloadedBani).toHaveBeenCalledWith('shabados:ALHN', null, expect.any(Function))
  })

  it('rejects a different downloaded bani even when its local line IDs coincide', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    vi.mocked(readDownloadedBani).mockResolvedValue(shabadosReadingFixture('ANN6'))
    const { result } = renderHook(() => useShabadosBani('ALHN'))
    await waitFor(() => expect(result.current.status).toBe('degraded'))
    expect(result.current.entries).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(fetchShabadosBani).not.toHaveBeenCalled()
  })

  it('retains downloaded text on network failure and retries in place', async () => {
    const saved = shabadosReadingFixture()
    const live = shabadosReadingFixture()
    vi.mocked(readDownloadedBani).mockResolvedValue(saved)
    vi.mocked(fetchShabadosBani).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(live)
    const beforeReplace = vi.fn()
    const { result } = renderHook(() => useShabadosBani('ALHN', beforeReplace))
    await waitFor(() => expect(result.current.status).toBe('degraded'))
    expect(result.current.entries).toBe(saved.entries)
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.isCached).toBe(false))
    expect(result.current.status).toBe('ready')
    expect(result.current.entries).toBe(live.entries)
    expect(beforeReplace).toHaveBeenCalledTimes(1)
  })

  it('never shows an old reading while the route changes or accepts its late response', async () => {
    let finishOld!: (value: ReturnType<typeof shabadosReadingFixture>) => void
    vi.mocked(fetchShabadosBani).mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve }))
      .mockResolvedValueOnce(shabadosReadingFixture('ANN6'))
    const { result, rerender } = renderHook(({ id }) => useShabadosBani(id), { initialProps: { id: 'ALHN' } })
    await waitFor(() => expect(fetchShabadosBani).toHaveBeenCalledTimes(1))
    rerender({ id: 'ANN6' })
    expect(result.current.entries).toEqual([])
    await waitFor(() => expect(result.current.status).toBe('ready'))
    await act(async () => finishOld(shabadosReadingFixture()))
    expect(result.current.entries[0].id).toContain('shabados-ANN6-')
  })

  it('keeps the open live reading and its position during a failed retry instead of swapping in the download', async () => {
    const saved = shabadosReadingFixture()
    const live = shabadosReadingFixture()
    vi.mocked(readDownloadedBani).mockResolvedValueOnce(null).mockResolvedValueOnce(saved)
    vi.mocked(fetchShabadosBani).mockResolvedValueOnce(live).mockRejectedValueOnce(new Error('offline'))
    const beforeReplace = vi.fn()
    const { result } = renderHook(() => useShabadosBani('ALHN', beforeReplace))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.entries).toBe(live.entries)
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.status).toBe('degraded'))
    expect(result.current.entries).toBe(live.entries)
    expect(result.current.isCached).toBe(false)
    expect(beforeReplace).not.toHaveBeenCalled()
  })

  it('keeps downloaded reading metadata after storage is no longer available on retry', async () => {
    const saved = shabadosReadingFixture()
    vi.mocked(readDownloadedBani).mockResolvedValueOnce(saved).mockResolvedValueOnce(null)
    vi.mocked(fetchShabadosBani).mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useShabadosBani('ALHN'))
    await waitFor(() => expect(result.current.status).toBe('degraded'))
    act(() => result.current.retry())
    await waitFor(() => expect(fetchShabadosBani).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.status).toBe('degraded'))
    expect(result.current.entries).toBe(saved.entries)
    expect(result.current.isCached).toBe(true)
  })

  it('settles a stalled request and ignores its late response after timeout', async () => {
    vi.useFakeTimers()
    let finish!: (value: ReturnType<typeof shabadosReadingFixture>) => void
    vi.mocked(fetchShabadosBani).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const { result } = renderHook(() => useShabadosBani('ALHN'))
    await act(async () => { await Promise.resolve() })
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(result.current.status).toBe('degraded')
    expect(vi.mocked(fetchShabadosBani).mock.calls[0][1]?.aborted).toBe(true)
    await act(async () => finish(shabadosReadingFixture()))
    expect(result.current.entries).toEqual([])
  })
})
