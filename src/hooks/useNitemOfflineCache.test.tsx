import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchBani, type BaniFetchResult } from '../api/banidb'
import { useNitemStore } from '../store/nitnem'
import { useNitnemOfflineStatusStore } from '../store/nitnemOffline'
import { readBaniOfflineCache, setProtectedBaniOfflineReadings, writeBaniOfflineCache } from '../utils/baniOfflineCache'
import { DEFAULT_SUNDAR_GUTKA_LENGTHS, useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { useNitemOfflineCache } from './useNitemOfflineCache'

vi.mock('../api/banidb', () => ({
  fetchBani: vi.fn(),
}))

vi.mock('../utils/baniOfflineCache', () => ({
  readBaniOfflineCache: vi.fn(),
  writeBaniOfflineCache: vi.fn(),
  setProtectedBaniOfflineReadings: vi.fn(),
}))

const exactBaniResult: BaniFetchResult = {
  entries: [{
    id: 'G-8-21',
    scripture: 'SGGS',
    source: 'G',
    ang: 8,
    gurmukhi: 'ਸੋ ਦਰੁ',
    transliteration: 'so dhar',
    translation_en: 'That Door',
    translation_hi: '',
    translation_pa: '',
    words: [],
  }],
  availableLengths: ['short', 'long'],
  resolvedLength: 'short',
}

beforeEach(() => {
  localStorage.clear()
  vi.mocked(fetchBani).mockReset()
  vi.mocked(readBaniOfflineCache).mockReset().mockResolvedValue(null)
  vi.mocked(writeBaniOfflineCache).mockReset()
  vi.mocked(setProtectedBaniOfflineReadings).mockReset()
  useNitnemOfflineStatusStore.setState({ ready: 0, total: 0, status: 'checking', signature: '', retryRevision: 0 })
  Object.defineProperty(navigator, 'connection', { configurable: true, value: undefined })
  useSundarGutkaLengthStore.setState({ lengths: { ...DEFAULT_SUNDAR_GUTKA_LENGTHS } })
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
  useNitemStore.setState({
    selectedIds: ['japji-sahib', 'rehras-sahib'],
  })
  Object.defineProperty(window, 'requestIdleCallback', {
    configurable: true,
    value: (callback: IdleRequestCallback) => {
      callback({ didTimeout: false, timeRemaining: () => 50 })
      return 1
    },
  })
  Object.defineProperty(window, 'cancelIdleCallback', {
    configurable: true,
    value: vi.fn(),
  })
})

afterEach(() => vi.useRealTimers())

describe('useNitemOfflineCache', () => {
  it('prepares the new exact length after a saved preference changes', async () => {
    vi.mocked(readBaniOfflineCache).mockResolvedValue(null)
    vi.mocked(fetchBani).mockResolvedValue(exactBaniResult)
    renderHook(() => useNitemOfflineCache())
    await waitFor(() => expect(fetchBani).toHaveBeenCalledWith(21, 'short', expect.any(AbortSignal)))
    act(() => useSundarGutkaLengthStore.getState().setLength('rehras-sahib', 'long'))
    await waitFor(() => expect(fetchBani).toHaveBeenCalledWith(21, 'long', expect.any(AbortSignal)))
    expect(setProtectedBaniOfflineReadings).toHaveBeenLastCalledWith([
      { baniDbId: 2, sgLength: null }, { baniDbId: 21, sgLength: 'long' },
    ])
  })

  it('protects selections even when offline preparation is paused', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    renderHook(() => useNitemOfflineCache())
    expect(setProtectedBaniOfflineReadings).toHaveBeenCalledWith([
      { baniDbId: 2, sgLength: null }, { baniDbId: 21, sgLength: 'short' },
    ])
    expect(fetchBani).not.toHaveBeenCalled()
  })
  it('prefetches only missing selected exact-Bani payloads', async () => {
    vi.mocked(readBaniOfflineCache).mockImplementation(async baniDbId => (
      baniDbId === 2 ? exactBaniResult : null
    ))
    vi.mocked(fetchBani).mockResolvedValue(exactBaniResult)

    renderHook(() => useNitemOfflineCache())

    await waitFor(() => expect(fetchBani).toHaveBeenCalledTimes(1))
    expect(fetchBani).toHaveBeenCalledWith(21, expect.anything(), expect.any(AbortSignal))
    expect(fetchBani).not.toHaveBeenCalledWith(2, expect.anything(), expect.anything())
    expect(writeBaniOfflineCache).toHaveBeenCalledWith(21, expect.anything(), exactBaniResult)
  })

  it('reports verified cached readings ready even without a connection', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    vi.mocked(readBaniOfflineCache).mockResolvedValue(exactBaniResult)
    renderHook(() => useNitemOfflineCache())
    await waitFor(() => expect(useNitnemOfflineStatusStore.getState()).toMatchObject({ ready: 2, total: 2, status: 'ready' }))
    expect(fetchBani).not.toHaveBeenCalled()
  })

  it('does not claim readiness when a successful download could not be stored', async () => {
    vi.mocked(readBaniOfflineCache).mockResolvedValue(null)
    vi.mocked(fetchBani).mockResolvedValue(exactBaniResult)
    vi.mocked(writeBaniOfflineCache).mockResolvedValue(undefined)
    renderHook(() => useNitemOfflineCache())
    await waitFor(() => expect(useNitnemOfflineStatusStore.getState().status).toBe('error'))
    expect(useNitnemOfflineStatusStore.getState().ready).toBe(0)
    expect(writeBaniOfflineCache).toHaveBeenCalled()
  })

  it('keeps verified readings available when another exact reading fails', async () => {
    vi.mocked(readBaniOfflineCache).mockImplementation(async id => id === 2 ? exactBaniResult : null)
    vi.mocked(fetchBani).mockRejectedValue(new Error('network'))
    renderHook(() => useNitemOfflineCache())
    await waitFor(() => expect(useNitnemOfflineStatusStore.getState()).toMatchObject({ ready: 1, total: 2, status: 'partial' }))
  })

  it('does not call a different returned length the saved exact reading', async () => {
    useNitemStore.setState({ selectedIds: ['rehras-sahib'] })
    useSundarGutkaLengthStore.getState().setLength('rehras-sahib', 'long')
    vi.mocked(readBaniOfflineCache).mockResolvedValue(exactBaniResult)
    vi.mocked(fetchBani).mockResolvedValue(exactBaniResult)
    renderHook(() => useNitemOfflineCache())
    await waitFor(() => expect(useNitnemOfflineStatusStore.getState()).toMatchObject({ ready: 0, status: 'error' }))
    expect(writeBaniOfflineCache).not.toHaveBeenCalled()
  })

  it('retries preparation on reconnect and reports ready only after reading the cache back', async () => {
    useNitemStore.setState({ selectedIds: ['rehras-sahib'] })
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    let cached = false
    vi.mocked(readBaniOfflineCache).mockImplementation(async () => cached ? exactBaniResult : null)
    vi.mocked(fetchBani).mockResolvedValue(exactBaniResult)
    vi.mocked(writeBaniOfflineCache).mockImplementation(async () => { cached = true })
    renderHook(() => useNitemOfflineCache())
    await waitFor(() => expect(useNitnemOfflineStatusStore.getState().status).toBe('offline'))
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
    act(() => window.dispatchEvent(new Event('online')))
    await waitFor(() => expect(useNitnemOfflineStatusStore.getState()).toMatchObject({ ready: 1, total: 1, status: 'ready' }))
    expect(fetchBani).toHaveBeenCalledTimes(1)
  })

  it('respects Save Data until preparation is explicitly requested', async () => {
    useNitemStore.setState({ selectedIds: ['rehras-sahib'] })
    Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } })
    let cached = false
    vi.mocked(readBaniOfflineCache).mockImplementation(async () => cached ? exactBaniResult : null)
    vi.mocked(fetchBani).mockResolvedValue(exactBaniResult)
    vi.mocked(writeBaniOfflineCache).mockImplementation(async () => { cached = true })
    renderHook(() => useNitemOfflineCache())
    await waitFor(() => expect(useNitnemOfflineStatusStore.getState().status).toBe('paused'))
    expect(fetchBani).not.toHaveBeenCalled()
    act(() => useNitnemOfflineStatusStore.getState().retry())
    await waitFor(() => expect(useNitnemOfflineStatusStore.getState()).toMatchObject({ ready: 1, status: 'ready' }))
  })

  it('cancels an obsolete routine download before publishing readiness', async () => {
    useNitemStore.setState({ selectedIds: ['rehras-sahib'] })
    let resolveOld!: (value: BaniFetchResult) => void
    vi.mocked(readBaniOfflineCache).mockImplementation(async id => id === 2 ? exactBaniResult : null)
    vi.mocked(fetchBani).mockImplementation(() => new Promise(resolve => { resolveOld = resolve }))
    renderHook(() => useNitemOfflineCache())
    await waitFor(() => expect(fetchBani).toHaveBeenCalledTimes(1))
    const oldSignal = vi.mocked(fetchBani).mock.calls[0][2]
    act(() => useNitemStore.setState({ selectedIds: ['japji-sahib'] }))
    expect(oldSignal?.aborted).toBe(true)
    await waitFor(() => expect(useNitnemOfflineStatusStore.getState()).toMatchObject({ ready: 1, total: 1, status: 'ready', signature: '2:default' }))
    await act(async () => resolveOld(exactBaniResult))
    expect(writeBaniOfflineCache).not.toHaveBeenCalled()
    expect(useNitnemOfflineStatusStore.getState().signature).toBe('2:default')
  })

  it('bounds a hung first download, preserves verified content, prepares later banis and permits explicit Retry', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    useNitemStore.setState({ selectedIds: ['rehras-sahib', 'japji-sahib', 'jaap-sahib'] })
    const verified = { ...exactBaniResult, entries: [{ ...exactBaniResult.entries[0], id: 'bani-2-1-1' }], resolvedLength: null }
    const later = { ...verified, entries: [{ ...verified.entries[0], id: 'bani-4-1-1' }] }
    const cached = new Map<number, BaniFetchResult>([[2, verified]])
    let resolveOld!: (value: BaniFetchResult) => void
    let retryAvailable = false
    vi.mocked(readBaniOfflineCache).mockImplementation(async id => cached.get(id) ?? null)
    vi.mocked(writeBaniOfflineCache).mockImplementation(async (id, _length, data) => { cached.set(id, data) })
    vi.mocked(fetchBani).mockImplementation(async id => id === 4 ? later
      : retryAvailable ? exactBaniResult
        : new Promise(resolve => { resolveOld = resolve }))
    renderHook(() => useNitemOfflineCache())
    await waitFor(() => expect(fetchBani).toHaveBeenCalledTimes(1))
    const oldSignal = vi.mocked(fetchBani).mock.calls[0][2]
    expect(useNitnemOfflineStatusStore.getState()).toMatchObject({ ready: 1, total: 3, status: 'preparing' })

    await act(async () => { await vi.advanceTimersByTimeAsync(30_001) })

    expect(useNitnemOfflineStatusStore.getState()).toMatchObject({ ready: 2, total: 3, status: 'partial' })
    expect(oldSignal?.aborted).toBe(true)
    expect(vi.mocked(fetchBani).mock.calls.map(([id]) => id)).toEqual([21, 4])
    expect(vi.mocked(fetchBani).mock.calls[1][2]?.aborted).toBe(false)
    expect(cached.get(2)).toBe(verified)
    expect(writeBaniOfflineCache).not.toHaveBeenCalledWith(21, expect.anything(), expect.anything())

    retryAvailable = true
    await act(async () => useNitnemOfflineStatusStore.getState().retry())
    expect(useNitnemOfflineStatusStore.getState()).toMatchObject({ ready: 3, total: 3, status: 'ready' })
    await act(async () => resolveOld({ ...exactBaniResult, entries: [{ ...exactBaniResult.entries[0], gurmukhi: 'Late obsolete response' }] }))
    expect(cached.get(21)).toBe(exactBaniResult)
    expect(cached.get(2)).toBe(verified)
    expect(useNitnemOfflineStatusStore.getState()).toMatchObject({ ready: 3, status: 'ready' })
    expect(vi.mocked(fetchBani).mock.calls.map(([id]) => id)).toEqual([21, 4, 21])
  })

  it('exposes an error after a wholly uncached hung preparation and verifies the payload before retry readiness', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    useNitemStore.setState({ selectedIds: ['rehras-sahib'] })
    vi.mocked(fetchBani).mockReturnValueOnce(new Promise(() => {}))
    renderHook(() => useNitemOfflineCache())
    await waitFor(() => expect(fetchBani).toHaveBeenCalledTimes(1))
    await act(async () => { await vi.advanceTimersByTimeAsync(30_001) })
    expect(useNitnemOfflineStatusStore.getState()).toMatchObject({ ready: 0, total: 1, status: 'error' })

    let confirmReadBack!: (value: BaniFetchResult) => void
    vi.mocked(fetchBani).mockResolvedValueOnce(exactBaniResult)
    vi.mocked(readBaniOfflineCache)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockImplementationOnce(() => new Promise(resolve => { confirmReadBack = resolve }))
    await act(async () => useNitnemOfflineStatusStore.getState().retry())
    expect(writeBaniOfflineCache).toHaveBeenCalledExactlyOnceWith(21, 'short', exactBaniResult)
    expect(useNitnemOfflineStatusStore.getState()).toMatchObject({ ready: 0, status: 'preparing' })
    await act(async () => confirmReadBack(exactBaniResult))
    expect(useNitnemOfflineStatusStore.getState()).toMatchObject({ ready: 1, total: 1, status: 'ready' })
  })

  it('aborts the active download and clears its deadline on unmount without late cache or status changes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    useNitemStore.setState({ selectedIds: ['rehras-sahib'] })
    let resolveOld!: (value: BaniFetchResult) => void
    vi.mocked(fetchBani).mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve }))
    const { unmount } = renderHook(() => useNitemOfflineCache())
    await waitFor(() => expect(fetchBani).toHaveBeenCalledTimes(1))
    const signal = vi.mocked(fetchBani).mock.calls[0][2]
    const before = useNitnemOfflineStatusStore.getState()
    unmount()
    expect(signal?.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_001)
      resolveOld(exactBaniResult)
    })
    expect(writeBaniOfflineCache).not.toHaveBeenCalled()
    expect(useNitnemOfflineStatusStore.getState()).toEqual(before)
  })
})
