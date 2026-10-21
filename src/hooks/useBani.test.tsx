import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchBani, type BaniFetchResult } from '../api/banidb'
import { readBaniOfflineCache, writeBaniOfflineCache } from '../utils/baniOfflineCache'
import { useBani } from './useBani'
import type { SundarGutkaLength } from '../types'

vi.mock('../api/banidb', () => ({
  fetchBani: vi.fn(),
}))

vi.mock('../utils/baniOfflineCache', () => ({
  readBaniOfflineCache: vi.fn(),
  writeBaniOfflineCache: vi.fn(),
}))

const cachedResult: BaniFetchResult = {
  entries: [{
    id: 'bani-2-1-1',
    scripture: 'SGGS',
    source: 'G',
    ang: 1,
    gurmukhi: 'ੴ ਸਤਿ ਨਾਮੁ',
    transliteration: 'ik oankaar sat naam',
    translation_en: 'One Creator. The Name is truth.',
    translation_hi: '',
    translation_pa: '',
    words: [],
  }],
  availableLengths: [],
  resolvedLength: null,
}

const liveResult: BaniFetchResult = {
  ...cachedResult,
  entries: [{ ...cachedResult.entries[0], gurmukhi: 'ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ' }],
}

beforeEach(() => {
  vi.mocked(fetchBani).mockReset()
  vi.mocked(readBaniOfflineCache).mockReset()
  vi.mocked(writeBaniOfflineCache).mockReset()
  vi.mocked(writeBaniOfflineCache).mockResolvedValue(undefined)
})

function exactResult(baniDbId: number, length: SundarGutkaLength | null = null): BaniFetchResult {
  return {
    ...cachedResult,
    entries: [{ ...cachedResult.entries[0], id: `bani-${baniDbId}-1-1` }],
    availableLengths: length ? ['short', 'medium', 'long', 'extralong'] : [],
    resolvedLength: length,
  }
}

describe('useBani offline recovery', () => {
  it.each([false, true])('settles a hung request after a bounded deadline and retries without accepting its late payload (cached: %s)', async cached => {
    vi.useFakeTimers()
    vi.mocked(readBaniOfflineCache).mockResolvedValueOnce(cached ? cachedResult : null).mockResolvedValue(null)
    let finishOld!: (data: BaniFetchResult) => void
    let oldSignal: AbortSignal | undefined
    vi.mocked(fetchBani)
      .mockImplementationOnce((_id, _length, signal) => {
        oldSignal = signal
        return new Promise(resolve => { finishOld = resolve })
      })
      .mockResolvedValueOnce(liveResult)
    const beforeReplace = vi.fn()
    const { result } = renderHook(() => useBani(2, undefined, beforeReplace))
    await act(async () => { await Promise.resolve() })
    expect(fetchBani).toHaveBeenCalledTimes(1)
    if (cached) expect(result.current.entries).toBe(cachedResult.entries)
    else expect(result.current.entries).toEqual([])
    await act(async () => { await vi.advanceTimersByTimeAsync(29_999) })
    expect(result.current.issue).toBeNull()
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(result.current.loading).toBe(false)
    expect(result.current.refreshing).toBe(false)
    expect(result.current.status).toBe('degraded')
    expect(oldSignal?.aborted).toBe(true)
    expect(result.current.entries).toEqual(cached ? cachedResult.entries : [])
    if (cached) expect(result.current.entries).toBe(cachedResult.entries)
    expect(beforeReplace).not.toHaveBeenCalled()
    if (!cached) await act(async () => { finishOld(liveResult) })
    expect(result.current.status).toBe('degraded')
    expect(result.current.entries).toEqual(cached ? cachedResult.entries : [])
    expect(writeBaniOfflineCache).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
    expect(fetchBani).toHaveBeenCalledTimes(1)
    await act(async () => { result.current.retry(); await Promise.resolve() })
    expect(result.current.status).toBe('ready')
    expect(result.current.entries).toBe(liveResult.entries)
    expect(fetchBani).toHaveBeenCalledTimes(2)
    expect(vi.mocked(fetchBani).mock.calls[1]?.[2]).not.toBe(oldSignal)
    if (cached) await act(async () => { finishOld(cachedResult) })
    expect(result.current.entries).toBe(liveResult.entries)
    expect(result.current.status).toBe('ready')
    expect(writeBaniOfflineCache).toHaveBeenCalledTimes(1)
  })

  it('keeps a cached exact-Bani reading visible when live loading fails, then retries in place', async () => {
    vi.mocked(readBaniOfflineCache).mockResolvedValue(cachedResult)
    vi.mocked(fetchBani)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(liveResult)

    const { result } = renderHook(() => useBani(2))

    await waitFor(() => expect(result.current.status).toBe('degraded'))
    expect(result.current.entries).toEqual(cachedResult.entries)
    expect(result.current.isCached).toBe(true)

    act(() => result.current.retry())

    await waitFor(() => expect(result.current.isCached).toBe(false))
    expect(result.current.status).toBe('ready')
    expect(result.current.entries).toEqual(liveResult.entries)
    expect(fetchBani).toHaveBeenCalledTimes(2)
    expect(writeBaniOfflineCache).toHaveBeenCalledWith(2, undefined, liveResult)
  })

  it('aborts an in-flight live request when the reader unmounts', async () => {
    vi.mocked(readBaniOfflineCache).mockResolvedValue(null)
    let requestSignal: AbortSignal | undefined
    vi.mocked(fetchBani).mockImplementation((_baniDbId, _sgLength, signal) => {
      requestSignal = signal
      return new Promise<BaniFetchResult>(() => {})
    })

    const { unmount } = renderHook(() => useBani(2))
    await waitFor(() => expect(requestSignal).toBeDefined())

    unmount()
    expect(requestSignal?.aborted).toBe(true)
  })

  it('does not flash the previous bani or length while a different request loads', async () => {
    const short = exactResult(21, 'short')
    vi.mocked(readBaniOfflineCache).mockImplementation(async (_id, length) => length === 'short' ? short : null)
    vi.mocked(fetchBani).mockResolvedValueOnce(short).mockImplementation(() => new Promise(() => {}))
    const { result, rerender } = renderHook(({ id, length }) => useBani(id, length), {
      initialProps: { id: 21, length: 'short' as SundarGutkaLength },
    })
    await waitFor(() => expect(result.current.status).toBe('ready'))

    rerender({ id: 21, length: 'long' })
    expect(result.current.entries).toEqual([])
    expect(result.current.status).toBe('loading')
    rerender({ id: 2, length: 'long' })
    expect(result.current.entries).toEqual([])
  })

  it('rejects a cached length mismatch and renders only the matching network response', async () => {
    vi.mocked(readBaniOfflineCache).mockResolvedValue(exactResult(21, 'short'))
    let resolveLive!: (data: BaniFetchResult) => void
    vi.mocked(fetchBani).mockImplementation(() => new Promise(resolve => { resolveLive = resolve }))
    const { result } = renderHook(() => useBani(21, 'long'))
    await waitFor(() => expect(fetchBani).toHaveBeenCalled())
    expect(result.current.entries).toEqual([])

    const exact = exactResult(21, 'long')
    await act(async () => resolveLive(exact))
    expect(result.current.entries).toEqual(exact.entries)
    expect(result.current.resolvedLength).toBe('long')
    expect(result.current.status).toBe('ready')
  })

  it('keeps valid cached content after a mismatched network response and does not cache it', async () => {
    const exact = exactResult(21, 'long')
    vi.mocked(readBaniOfflineCache).mockResolvedValue(exact)
    vi.mocked(fetchBani).mockResolvedValue(exactResult(21, 'short'))
    const { result } = renderHook(() => useBani(21, 'long'))

    await waitFor(() => expect(result.current.status).toBe('degraded'))
    expect(result.current.entries).toEqual(exact.entries)
    expect(result.current.resolvedLength).toBe('long')
    expect(result.current.isCached).toBe(true)
    expect(writeBaniOfflineCache).not.toHaveBeenCalled()
  })

  it.each([
    ['another bani', exactResult(4)],
    ['a wrong canonical source', { ...cachedResult, entries: [{ ...cachedResult.entries[0], source: 'D', scripture: 'DG' }] }],
    ['empty scripture', { ...cachedResult, entries: [] }],
  ])('rejects %s from cache and network with a recoverable issue', async (_label, invalid) => {
    vi.mocked(readBaniOfflineCache).mockResolvedValue(invalid as BaniFetchResult)
    vi.mocked(fetchBani).mockResolvedValue(invalid as BaniFetchResult)
    const { result } = renderHook(() => useBani(2))
    await waitFor(() => expect(result.current.status).toBe('degraded'))
    expect(result.current.entries).toEqual([])
    expect(result.current.error).toBe('unavailable')
    expect(writeBaniOfflineCache).not.toHaveBeenCalled()
  })

  it('allows a requested extra-long alias when BaniDB merges the identical long band', async () => {
    const data: BaniFetchResult = {
      ...exactResult(22, 'long'),
      availableLengths: ['short', 'medium', 'long'],
    }
    vi.mocked(readBaniOfflineCache).mockResolvedValue(data)
    vi.mocked(fetchBani).mockResolvedValue(data)
    const { result } = renderHook(() => useBani(22, 'extralong'))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.entries).toEqual(data.entries)
    expect(result.current.resolvedLength).toBe('long')
  })

  it('continues loading when cache access fails and keeps live content if a retry also fails', async () => {
    vi.mocked(readBaniOfflineCache).mockRejectedValue(new Error('Storage unavailable'))
    vi.mocked(fetchBani).mockResolvedValueOnce(liveResult).mockRejectedValueOnce(new Error('offline'))
    vi.mocked(writeBaniOfflineCache).mockRejectedValue(new Error('Storage full'))
    const { result } = renderHook(() => useBani(2))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    const entries = result.current.entries

    act(() => result.current.retry())
    expect(result.current.entries).toBe(entries)
    await waitFor(() => expect(result.current.status).toBe('degraded'))
    expect(result.current.entries).toBe(entries)
    expect(result.current.isCached).toBe(false)
  })

  it('retains the same cached entry objects after eviction and a failed retry', async () => {
    vi.mocked(readBaniOfflineCache).mockResolvedValueOnce(cachedResult).mockResolvedValueOnce(null)
    vi.mocked(fetchBani).mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useBani(2))
    await waitFor(() => expect(result.current.status).toBe('degraded'))
    const entries = result.current.entries

    act(() => result.current.retry())
    await waitFor(() => expect(fetchBani).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.status).toBe('degraded'))
    expect(result.current.entries).toBe(entries)
    expect(result.current.isCached).toBe(true)
  })

  it('ignores a stale response when the requested length changes', async () => {
    vi.mocked(readBaniOfflineCache).mockResolvedValue(null)
    let resolveOld!: (data: BaniFetchResult) => void
    vi.mocked(fetchBani)
      .mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
      .mockResolvedValueOnce(exactResult(21, 'long'))
    const { result, rerender } = renderHook(({ length }) => useBani(21, length), {
      initialProps: { length: 'short' as SundarGutkaLength },
    })
    await waitFor(() => expect(fetchBani).toHaveBeenCalledTimes(1))
    rerender({ length: 'long' })
    await waitFor(() => expect(result.current.resolvedLength).toBe('long'))
    await act(async () => resolveOld(exactResult(21, 'short')))
    expect(result.current.resolvedLength).toBe('long')
    expect(writeBaniOfflineCache).toHaveBeenCalledTimes(1)
  })

  it('calls the latest continuity callback before replacing visible matching cached content', async () => {
    vi.mocked(readBaniOfflineCache).mockResolvedValue(cachedResult)
    let resolveLive!: (data: BaniFetchResult) => void
    vi.mocked(fetchBani).mockImplementation(() => new Promise(resolve => { resolveLive = resolve }))
    const oldCallback = vi.fn()
    const freshCallback = vi.fn(() => expect(result.current.entries).toBe(cachedResult.entries))
    const { result, rerender } = renderHook(({ onBeforeReplace }) => useBani(2, null, onBeforeReplace), {
      initialProps: { onBeforeReplace: oldCallback },
    })
    await waitFor(() => expect(result.current.isCached).toBe(true))
    rerender({ onBeforeReplace: freshCallback })
    await act(async () => resolveLive(liveResult))

    expect(oldCallback).not.toHaveBeenCalled()
    expect(freshCallback).toHaveBeenCalledTimes(1)
    expect(result.current.entries).toBe(liveResult.entries)
    expect(fetchBani).toHaveBeenCalledTimes(1)
  })

  it('does not call the continuity callback for an initial load or a rejected replacement', async () => {
    vi.mocked(readBaniOfflineCache).mockResolvedValue(null)
    vi.mocked(fetchBani).mockResolvedValueOnce(liveResult).mockResolvedValueOnce(exactResult(4))
    const onBeforeReplace = vi.fn()
    const { result } = renderHook(() => useBani(2, null, onBeforeReplace))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.status).toBe('degraded'))

    expect(onBeforeReplace).not.toHaveBeenCalled()
    expect(result.current.entries).toBe(liveResult.entries)
  })
})
