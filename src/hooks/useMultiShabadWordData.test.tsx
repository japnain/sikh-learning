import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import * as banidb from '../api/banidb'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { useMultiShabadWordData } from './useMultiShabadWordData'

beforeEach(() => {
  vi.restoreAllMocks()
  useScriptureCacheStore.getState().clearAll()
})

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
    expect(fetchSpy).toHaveBeenNthCalledWith(1, 1)
    expect(fetchSpy).toHaveBeenNthCalledWith(2, 2)
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
})
