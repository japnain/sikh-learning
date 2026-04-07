import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import * as banidb from '../api/banidb'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { useMultiShabadWordData } from './useMultiShabadWordData'

beforeEach(() => {
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
})
