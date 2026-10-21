import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchShabad } from '../api/banidb'
import type { ScriptureEntry } from '../types'
import { useShabad } from './useShabad'

vi.mock('../api/banidb', () => ({
  fetchShabad: vi.fn(),
}))

const shabad: ScriptureEntry = {
  id: 'G-1-50',
  scripture: 'SGGS',
  source: 'G',
  ang: 1,
  shabadId: 50,
  gurmukhi: 'ੴ ਸਤਿ ਨਾਮੁ',
  transliteration: 'ik oankaar sat naam',
  translation_en: 'One Creator. The Name is truth.',
  translation_hi: '',
  translation_pa: '',
  words: [],
}

beforeEach(() => {
  vi.mocked(fetchShabad).mockReset()
})

afterEach(() => { vi.useRealTimers() })

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

describe('useShabad recovery', () => {
  it('retries a failed exact-shabad request without reloading the app', async () => {
    vi.mocked(fetchShabad)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(shabad)

    const { result } = renderHook(() => useShabad(50))
    await waitFor(() => expect(result.current.status).toBe('degraded'))

    act(() => result.current.retry())

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.entries).toEqual([shabad])
    expect(fetchShabad).toHaveBeenCalledTimes(2)
  })

  it('bounds a hung request, aborts it and lets explicit Retry win over its late response', async () => {
    vi.useFakeTimers()
    const held = deferred<ScriptureEntry | null>()
    const late = { ...shabad, gurmukhi: 'ਪੁਰਾਣਾ ਜਵਾਬ' }
    vi.mocked(fetchShabad).mockReturnValueOnce(held.promise).mockResolvedValueOnce(shabad)
    const { result } = renderHook(() => useShabad(50))
    const signal = (vi.mocked(fetchShabad).mock.calls[0] as unknown as [number, AbortSignal?])[1]

    await act(async () => { await vi.advanceTimersByTimeAsync(29_999) })
    expect(result.current.status).toBe('loading')
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(result.current.status).toBe('degraded')
    expect(signal?.aborted).toBe(true)
    expect(fetchShabad).toHaveBeenCalledTimes(1)

    await act(async () => { result.current.retry() })
    expect(result.current.status).toBe('ready')
    expect(result.current.entries).toEqual([shabad])
    await act(async () => { held.resolve(late) })
    expect(result.current.entries).toEqual([shabad])
    expect(result.current.error).toBeNull()
  })

  it('retains the same canonical entry and order when a loaded shabad refresh fails', async () => {
    vi.mocked(fetchShabad).mockResolvedValueOnce(shabad).mockRejectedValueOnce(new Error('offline'))
    const { result } = renderHook(() => useShabad(50))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    const existing = result.current.entries
    act(() => result.current.retry())
    expect(result.current.entries).toBe(existing)
    await waitFor(() => expect(result.current.status).toBe('degraded'))
    expect(result.current.entries).toBe(existing)
    expect(result.current.entries[0]).toBe(shabad)
  })

  it('aborts a superseded route and ignores its late scripture response', async () => {
    const held = deferred<ScriptureEntry | null>()
    const next = { ...shabad, id: 'G-2-51', ang: 2, shabadId: 51 }
    vi.mocked(fetchShabad).mockReturnValueOnce(held.promise).mockResolvedValueOnce(next)
    const { result, rerender, unmount } = renderHook(({ id }) => useShabad(id), { initialProps: { id: 50 } })
    const oldSignal = (vi.mocked(fetchShabad).mock.calls[0] as unknown as [number, AbortSignal?])[1]
    rerender({ id: 51 })
    await waitFor(() => expect(result.current.entries).toEqual([next]))
    await act(async () => { held.resolve(shabad) })
    expect(result.current.entries).toEqual([next])
    expect(oldSignal?.aborted).toBe(true)
    const currentSignal = (vi.mocked(fetchShabad).mock.calls[1] as unknown as [number, AbortSignal?])[1]
    unmount()
    expect(currentSignal?.aborted).toBe(true)
  })
})
