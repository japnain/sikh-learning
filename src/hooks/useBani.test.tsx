import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchBani, type BaniFetchResult } from '../api/banidb'
import { readBaniOfflineCache, writeBaniOfflineCache } from '../utils/baniOfflineCache'
import { useBani } from './useBani'

vi.mock('../api/banidb', () => ({
  fetchBani: vi.fn(),
}))

vi.mock('../utils/baniOfflineCache', () => ({
  readBaniOfflineCache: vi.fn(),
  writeBaniOfflineCache: vi.fn(),
}))

const cachedResult: BaniFetchResult = {
  entries: [{
    id: 'G-1-1',
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
})

describe('useBani offline recovery', () => {
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
})
