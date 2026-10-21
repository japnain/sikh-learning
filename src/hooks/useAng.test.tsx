import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useAng } from './useAng'
import { useScriptureCacheStore } from '../store/scriptureCache'
import * as baniApi from '../api/banidb'
import type { ScriptureEntry } from '../types'

beforeEach(() => { useScriptureCacheStore.getState().clearAll() })
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

const entry: ScriptureEntry = {
  id: 'G-1-50', source: 'G', scripture: 'SGGS', ang: 1, shabadId: 50,
  gurmukhi: 'ੴ ਸਤਿ ਨਾਮੁ', transliteration: 'ik oankaar sat naam',
  translation_en: 'One Creator. The Name is truth.', translation_hi: '', translation_pa: '', words: [],
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

describe('useAng', () => {
  it('starts loading, then returns entries', async () => {
    const { result } = renderHook(() => useAng(1, 'G'))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.entries.length).toBeGreaterThan(0)
    expect(result.current.error).toBeNull()
  })

  it('uses cache on second render — no re-fetch', async () => {
    const { result, rerender } = renderHook(() => useAng(1, 'G'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const first = result.current.entries
    rerender()
    expect(result.current.loading).toBe(false)
    expect(result.current.entries).toEqual(first)
  })

  it('sets error on failed fetch', async () => {
    const { result } = renderHook(() => useAng('error' as unknown as number, 'G'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeTruthy()
    expect(result.current.entries).toEqual([])
  })

  it('fetches a complete provider page instead of treating an unmarked legacy fragment as the Ang', async () => {
    const fragment = [entry]
    useScriptureCacheStore.setState({ angCache: { 'G-1': fragment }, angOrder: ['G-1'] })
    const complete = [entry, { ...entry, id: 'G-1-51', shabadId: 51, gurmukhi: 'ਸਤਿ ਨਾਮੁ' }]
    const fetch = vi.spyOn(baniApi, 'fetchAng').mockResolvedValueOnce(complete)
    const { result } = renderHook(() => useAng(1, 'G'))
    expect(fetch).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(result.current.entries).toBe(complete))
    expect(result.current.entries.map(item => item.shabadId)).toEqual([50, 51])
    expect(result.current.status).toBe('ready')
  })

  it('retains legacy cache bytes offline without presenting a fragment as a complete Ang', async () => {
    const fragment = [entry]
    useScriptureCacheStore.setState({ angCache: { 'G-1': fragment }, angOrder: ['G-1'] })
    const before = localStorage.getItem('sikh-scripture-cache')
    vi.spyOn(baniApi, 'fetchAng').mockRejectedValueOnce(new Error('offline'))
    const { result } = renderHook(() => useAng(1, 'G'))
    await waitFor(() => expect(result.current.status).toBe('degraded'))
    expect(result.current.entries).toEqual([])
    expect(useScriptureCacheStore.getState().getAng('G', 1)).toBe(fragment)
    expect(useScriptureCacheStore.getState().getEntryById(entry.id)).toBe(entry)
    expect(localStorage.getItem('sikh-scripture-cache')).toBe(before)
  })

  it('bounds an uncached held Ang request and retries without accepting its late result', async () => {
    vi.useFakeTimers()
    const held = deferred<ScriptureEntry[]>()
    const fetch = vi.spyOn(baniApi, 'fetchAng').mockReturnValueOnce(held.promise).mockResolvedValueOnce([entry])
    const { result } = renderHook(() => useAng(1, 'G'))
    const signal = (fetch.mock.calls[0] as unknown as [number, string, AbortSignal?])[2]
    await act(async () => { await vi.advanceTimersByTimeAsync(29_999) })
    expect(result.current.status).toBe('loading')
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(result.current.status).toBe('degraded')
    expect(signal?.aborted).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(1)
    await act(async () => { result.current.refetch() })
    expect(result.current.entries).toEqual([entry])
    expect(result.current.error).toBeNull()
    await act(async () => { held.resolve([{ ...entry, gurmukhi: 'ਪੁਰਾਣਾ ਜਵਾਬ' }]) })
    expect(result.current.entries).toEqual([entry])
    expect(useScriptureCacheStore.getState().getAng('G', 1)).toEqual([entry])
  })

  it('settles a hung cached refresh while retaining canonical content and supports explicit Retry', async () => {
    vi.useFakeTimers()
    const cached = [entry]
    useScriptureCacheStore.getState().setAng('G', 1, cached)
    const held = deferred<ScriptureEntry[]>()
    const fresh = [{ ...entry, translation_en: 'Fresh optional meaning' }]
    const fetch = vi.spyOn(baniApi, 'fetchAng').mockReturnValueOnce(held.promise).mockResolvedValueOnce(fresh)
    const { result } = renderHook(() => useAng(1, 'G'))
    act(() => result.current.refetch())
    const signal = (fetch.mock.calls[0] as unknown as [number, string, AbortSignal?])[2]
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(result.current.status).toBe('degraded')
    expect(result.current.entries).toBe(cached)
    expect(signal?.aborted).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(1)
    await act(async () => { result.current.refetch() })
    expect(result.current.status).toBe('ready')
    expect(result.current.entries).toBe(fresh)
    await act(async () => { held.resolve([{ ...entry, gurmukhi: 'ਪੁਰਾਣਾ ਜਵਾਬ' }]) })
    expect(result.current.entries).toBe(fresh)
  })

  it('retains the same cached canonical entries after a refresh failure', async () => {
    const cached = [entry]
    useScriptureCacheStore.getState().setAng('G', 1, cached)
    vi.spyOn(baniApi, 'fetchAng').mockRejectedValueOnce(new Error('offline'))
    const { result } = renderHook(() => useAng(1, 'G'))
    act(() => result.current.refetch())
    await waitFor(() => expect(result.current.status).toBe('degraded'))
    expect(result.current.entries).toBe(cached)
  })

  it('uses a matching cache that arrives after an initial source failure without hiding the failure', async () => {
    const fetch = vi.spyOn(baniApi, 'fetchAng').mockRejectedValueOnce(new Error('offline'))
    const { result } = renderHook(() => useAng(1, 'G'))
    await waitFor(() => expect(result.current.status).toBe('degraded'))
    expect(result.current.entries).toEqual([])
    const recovered = [entry]
    act(() => useScriptureCacheStore.getState().setAng('G', 1, recovered))
    expect(result.current.entries).toBe(recovered)
    expect(result.current.status).toBe('degraded')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('keeps the newer readable response after cache failure and a later failed refresh', async () => {
    const older = [{ ...entry, translation_en: 'Older cached meaning' }]
    const fresh = [entry]
    useScriptureCacheStore.getState().setAng('G', 1, older)
    vi.spyOn(useScriptureCacheStore.getState(), 'setAng').mockImplementation(() => { throw new Error('Cache unavailable') })
    vi.spyOn(baniApi, 'fetchAng').mockResolvedValueOnce(fresh).mockRejectedValueOnce(new Error('offline'))
    const { result } = renderHook(() => useAng(1, 'G'))
    act(() => result.current.refetch())
    await waitFor(() => expect(result.current.entries).toBe(fresh))
    expect(result.current.status).toBe('ready')
    act(() => result.current.refetch())
    await waitFor(() => expect(result.current.status).toBe('degraded'))
    expect(result.current.entries).toBe(fresh)
    expect(useScriptureCacheStore.getState().getAng('G', 1)).toBe(older)
  })

  it('aborts a superseded initial Ang request without caching its late route result', async () => {
    const held = deferred<ScriptureEntry[]>()
    const next = [{ ...entry, id: 'G-2-51', ang: 2, shabadId: 51 }]
    const fetch = vi.spyOn(baniApi, 'fetchAng').mockReturnValueOnce(held.promise).mockResolvedValueOnce(next)
    const { result, rerender } = renderHook(({ ang }) => useAng(ang, 'G'), { initialProps: { ang: 1 } })
    const signal = (fetch.mock.calls[0] as unknown as [number, string, AbortSignal?])[2]
    rerender({ ang: 2 })
    await waitFor(() => expect(result.current.entries).toBe(next))
    await act(async () => { held.resolve([entry]) })
    expect(result.current.entries).toBe(next)
    expect(useScriptureCacheStore.getState().getAng('G', 1)).toBeUndefined()
    expect(signal?.aborted).toBe(true)
  })

  it('ignores a superseded refetch after leaving and returning to the same Ang', async () => {
    useScriptureCacheStore.getState().setAng('G', 1, [entry])
    useScriptureCacheStore.getState().setAng('G', 2, [{ ...entry, id: 'G-2-51', ang: 2, shabadId: 51 }])
    const held = deferred<ScriptureEntry[]>()
    const fresh = [{ ...entry, translation_en: 'Current optional meaning' }]
    const fetch = vi.spyOn(baniApi, 'fetchAng').mockReturnValueOnce(held.promise).mockResolvedValueOnce(fresh)
    const { result, rerender } = renderHook(({ ang }) => useAng(ang, 'G'), { initialProps: { ang: 1 } })
    act(() => result.current.refetch())
    const signal = (fetch.mock.calls[0] as unknown as [number, string, AbortSignal?])[2]
    rerender({ ang: 2 })
    rerender({ ang: 1 })
    act(() => result.current.refetch())
    await waitFor(() => expect(result.current.entries).toBe(fresh))
    await act(async () => { held.resolve([{ ...entry, gurmukhi: 'ਪੁਰਾਣਾ ਜਵਾਬ' }]) })
    expect(result.current.entries).toBe(fresh)
    expect(useScriptureCacheStore.getState().getAng('G', 1)).toBe(fresh)
    expect(signal?.aborted).toBe(true)
  })

  it.each(['initial', 'refresh'] as const)('does not mislabel a good %s scripture response when optional cache persistence fails', async attempt => {
    if (attempt === 'refresh') useScriptureCacheStore.getState().setAng('G', 1, [{ ...entry, translation_en: 'Previous meaning' }])
    vi.spyOn(baniApi, 'fetchAng').mockResolvedValueOnce([entry])
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new DOMException('Storage full', 'QuotaExceededError') })
    const { result } = renderHook(() => useAng(1, 'G'))
    if (attempt === 'refresh') act(() => result.current.refetch())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.entries).toEqual([entry])
    expect(result.current.status).toBe('ready')
    expect(result.current.error).toBeNull()
  })
})
