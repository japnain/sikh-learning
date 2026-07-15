import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { fetchHukamnama, type HukamnamaResult } from '../api/banidb'
import { useHukamnama } from './useHukamnama'

vi.mock('../api/banidb', () => ({
  fetchHukamnama: vi.fn(),
}))

const HUKAMNAMA_CACHE_KEY = 'naamras-hukamnama-cache-v1'

function buildHukamnama(date: string): HukamnamaResult {
  return {
    date,
    ang: 12,
    source: 'G',
    shabadId: 101,
    entry: {
      id: `hukamnama-${date}`,
      scripture: 'Sri Guru Granth Sahib Ji',
      ang: 12,
      sourceName: 'Sri Guru Granth Sahib Ji',
      raag: 'Raag Asa',
      gurmukhi: 'ਹਉਮੈ ਨਾਵੈ ਨਾਲਿ ਵਿਰੋਧੁ ਹੈ ॥',
      transliteration: 'haumai naavai naal virodh hai',
      translation_en: 'Ego and the Naam are opposed.',
      translation_hi: '',
      translation_pa: '',
      words: [],
    },
  }
}

function seedCache(data: HukamnamaResult) {
  localStorage.setItem(HUKAMNAMA_CACHE_KEY, JSON.stringify({
    data,
    cachedAt: '2026-04-10T16:00:00.000Z',
  }))
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date('2026-04-11T09:00:00.000Z'))
  localStorage.clear()
  vi.mocked(fetchHukamnama).mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

test('caches a successful Hukamnama response', async () => {
  const fresh = buildHukamnama('2026-04-11')
  vi.mocked(fetchHukamnama).mockResolvedValue(fresh)

  const { result } = renderHook(() => useHukamnama())

  await waitFor(() => expect(result.current.status).toBe('ready'))
  expect(result.current.data).toEqual(fresh)
  expect(result.current.isCached).toBe(false)
  expect(JSON.parse(localStorage.getItem(HUKAMNAMA_CACHE_KEY) ?? 'null')).toMatchObject({
    data: fresh,
    cachedAt: expect.any(String),
  })
})

test('falls back to an older cached reading and labels it as cached and older', async () => {
  const cached = buildHukamnama('2026-04-10')
  seedCache(cached)
  vi.mocked(fetchHukamnama).mockRejectedValue(new Error('offline'))

  const { result } = renderHook(() => useHukamnama())

  await waitFor(() => expect(result.current.status).toBe('degraded'))
  expect(result.current.data).toEqual(cached)
  expect(result.current.isCached).toBe(true)
  expect(result.current.isOlder).toBe(true)
  expect(result.current.cachedAt).toBe('2026-04-10T16:00:00.000Z')
})

test('does not substitute an unrelated cache entry for a requested historical date', async () => {
  seedCache(buildHukamnama('2026-04-10'))
  vi.mocked(fetchHukamnama).mockRejectedValue(new Error('offline'))

  const { result } = renderHook(() => useHukamnama('2026-04-09'))

  await waitFor(() => expect(result.current.status).toBe('degraded'))
  expect(result.current.data).toBeNull()
  expect(result.current.isCached).toBe(false)
})

test('retries after a failed request', async () => {
  const fresh = buildHukamnama('2026-04-11')
  vi.mocked(fetchHukamnama)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(fresh)

  const { result } = renderHook(() => useHukamnama())
  await waitFor(() => expect(result.current.status).toBe('degraded'))

  act(() => result.current.retry())

  await waitFor(() => expect(result.current.status).toBe('ready'))
  expect(result.current.data).toEqual(fresh)
  expect(fetchHukamnama).toHaveBeenCalledTimes(2)
})
