import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAng } from './useAng'
import { useScriptureCacheStore } from '../store/scriptureCache'

beforeEach(() => { useScriptureCacheStore.getState().clearAll() })

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
})
