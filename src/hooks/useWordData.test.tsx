import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useWordData } from './useWordData'
import { useScriptureCacheStore } from '../store/scriptureCache'

beforeEach(() => { useScriptureCacheStore.getState().clearAll() })

describe('useWordData', () => {
  it('starts with null words, fetches when shabadId provided', async () => {
    const { result } = renderHook(() => useWordData(1))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.words).not.toBeNull()
    expect(result.current.words!.length).toBeGreaterThan(0)
  })

  it('returns null when shabadId is null (no tap yet)', () => {
    const { result } = renderHook(() => useWordData(null))
    expect(result.current.words).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('uses cache on second call for same shabadId', async () => {
    const { result, rerender } = renderHook(() => useWordData(1))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const first = result.current.words
    rerender()
    expect(result.current.words).toEqual(first)
  })
})
