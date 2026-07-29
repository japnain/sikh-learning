import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
})
