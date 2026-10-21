import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import * as banidb from '../api/banidb'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { useMultiShabadWordData } from './useMultiShabadWordData'

beforeEach(() => {
  vi.restoreAllMocks()
  useScriptureCacheStore.getState().clearAll()
})

afterEach(() => vi.useRealTimers())

const wordsFor = (text: string) => [{
  gurmukhi: text, transliteration: 'naam', meaning_en: 'Name', meaning_hi: 'नाम', meaning_pa: 'ਨਾਮ',
}]

describe('useMultiShabadWordData', () => {
  it('ignores null and non-positive shabad ids', async () => {
    const fetchSpy = vi.spyOn(banidb, 'fetchShabadWords')

    const { result } = renderHook(() => useMultiShabadWordData([null, 0, -2]))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.current.wordDataMap).toEqual({})
  })

  it('fetches valid shabad ids only', async () => {
    const fetchSpy = vi.spyOn(banidb, 'fetchShabadWords')

    const { result } = renderHook(() => useMultiShabadWordData([null, 1, 0, 2]))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(Object.keys(result.current.wordDataMap)).toHaveLength(2)
    })

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(fetchSpy).toHaveBeenNthCalledWith(1, 1, expect.any(AbortSignal))
    expect(fetchSpy).toHaveBeenNthCalledWith(2, 2, expect.any(AbortSignal))
  })

  it('does not persist a failed request as an empty successful response', async () => {
    const words = [{
      gurmukhi: 'ਨਾਮ',
      transliteration: 'naam',
      meaning_en: 'Name',
      meaning_hi: 'नाम',
      meaning_pa: 'ਨਾਮ',
    }]
    const fetchSpy = vi.spyOn(banidb, 'fetchShabadWords')
      .mockRejectedValueOnce(new Error('temporary failure'))

    const firstRender = renderHook(() => useMultiShabadWordData([42]))

    await waitFor(() => {
      expect(firstRender.result.current.loading).toBe(false)
    })

    expect(firstRender.result.current.wordDataMap).toEqual({})
    expect(useScriptureCacheStore.getState().getWords(42)).toBeUndefined()
    firstRender.unmount()

    fetchSpy.mockResolvedValueOnce(words)
    const secondRender = renderHook(() => useMultiShabadWordData([42]))

    await waitFor(() => {
      expect(secondRender.result.current.wordDataMap[42]).toEqual(words)
    })

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(useScriptureCacheStore.getState().getWords(42)).toEqual(words)
  })

  it('settles a held lookup after 30 seconds while retaining other successful and already cached words', async () => {
    vi.useFakeTimers()
    const cached = wordsFor('ਪਹਿਲਾਂ')
    const successful = wordsFor('ਨਾਮ')
    const late = wordsFor('ਦੇਰ')
    useScriptureCacheStore.getState().setWords(73, cached)
    let resolveHeld!: (value: typeof late) => void
    const fetchSpy = vi.spyOn(banidb, 'fetchShabadWords').mockImplementation(id => id === 71
      ? new Promise(resolve => { resolveHeld = resolve })
      : Promise.resolve(successful))
    const { result } = renderHook(() => useMultiShabadWordData([71, 72, 73]))
    await act(async () => { await Promise.resolve() })
    expect(result.current.loading).toBe(true)
    expect(result.current.wordDataMap).toEqual({ 72: successful, 73: cached })
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(result.current.loading).toBe(false)
    expect(result.current.wordDataMap).toEqual({ 72: successful, 73: cached })
    expect(useScriptureCacheStore.getState().getWords(71)).toBeUndefined()
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    await act(async () => { resolveHeld(late); await Promise.resolve() })
    expect(result.current.wordDataMap).toEqual({ 72: successful, 73: cached })
    expect(useScriptureCacheStore.getState().getWords(71)).toBeUndefined()
  })

  it('keeps every fetched word usable when full storage rejects the optional cache write', async () => {
    const first = wordsFor('ਨਾਮ')
    const second = wordsFor('ਸਚੁ')
    const originalSetItem = localStorage.setItem.bind(localStorage)
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === 'sikh-scripture-cache') throw new DOMException('Storage full', 'QuotaExceededError')
      return originalSetItem(key, value)
    })
    vi.spyOn(banidb, 'fetchShabadWords').mockImplementation(id => Promise.resolve(id === 81 ? first : second))
    const { result } = renderHook(() => useMultiShabadWordData([81, 82]))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.wordDataMap).toEqual({ 81: first, 82: second })
    })
  })

  it('returns without phantom loading when a previously pending set is now fully cached', async () => {
    const first = wordsFor('ਨਾਮ')
    const second = wordsFor('ਸਚੁ')
    const fetchSpy = vi.spyOn(banidb, 'fetchShabadWords').mockImplementation(id => id === 111
      ? Promise.resolve(first)
      : new Promise(() => {}))
    const { result, rerender } = renderHook(({ ids }) => useMultiShabadWordData(ids), { initialProps: { ids: [111, 112] } })
    await waitFor(() => expect(result.current.wordDataMap[111]).toEqual(first))
    expect(result.current.loading).toBe(true)
    rerender({ ids: [] })
    act(() => useScriptureCacheStore.getState().setWords(112, second))
    rerender({ ids: [111, 112] })
    expect(result.current.wordDataMap).toEqual({ 111: first, 112: second })
    expect(result.current.loading).toBe(false)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('aborts an unmounted pending request and never caches its late words', async () => {
    const late = wordsFor('ਦੇਰ')
    let resolveHeld!: (value: typeof late) => void
    let requestSignal: AbortSignal | undefined
    vi.spyOn(banidb, 'fetchShabadWords').mockImplementation((_id, signal) => {
      requestSignal = signal
      return new Promise(resolve => { resolveHeld = resolve })
    })
    const view = renderHook(() => useMultiShabadWordData([101]))
    await act(async () => { await Promise.resolve() })
    view.unmount()
    expect(requestSignal?.aborted).toBe(true)
    await act(async () => { resolveHeld(late); await Promise.resolve() })
    expect(useScriptureCacheStore.getState().getWords(101)).toBeUndefined()
  })

  it('ignores late word data after the active shabad IDs change', async () => {
    const oldWords = wordsFor('ਪੁਰਾਣਾ')
    const currentWords = wordsFor('ਨਵਾਂ')
    let resolveOld!: (value: typeof oldWords) => void
    vi.spyOn(banidb, 'fetchShabadWords').mockImplementation(id => id === 91
      ? new Promise(resolve => { resolveOld = resolve })
      : Promise.resolve(currentWords))
    const { result, rerender } = renderHook(({ ids }) => useMultiShabadWordData(ids), { initialProps: { ids: [91] } })
    rerender({ ids: [92] })
    await waitFor(() => expect(result.current.wordDataMap).toEqual({ 92: currentWords }))
    await act(async () => { resolveOld(oldWords); await Promise.resolve() })
    expect(result.current.loading).toBe(false)
    expect(result.current.wordDataMap).toEqual({ 92: currentWords })
    expect(useScriptureCacheStore.getState().getWords(91)).toBeUndefined()
  })

})
