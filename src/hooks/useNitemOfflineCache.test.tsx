import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchBani, type BaniFetchResult } from '../api/banidb'
import { useNitemStore } from '../store/nitnem'
import { readBaniOfflineCache, writeBaniOfflineCache } from '../utils/baniOfflineCache'
import { useNitemOfflineCache } from './useNitemOfflineCache'

vi.mock('../api/banidb', () => ({
  fetchBani: vi.fn(),
}))

vi.mock('../utils/baniOfflineCache', () => ({
  readBaniOfflineCache: vi.fn(),
  writeBaniOfflineCache: vi.fn(),
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
  vi.mocked(readBaniOfflineCache).mockReset()
  vi.mocked(writeBaniOfflineCache).mockReset()
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

describe('useNitemOfflineCache', () => {
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
})
