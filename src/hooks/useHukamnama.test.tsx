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

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
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

test('shows a valid cached reading while the refresh request is unresolved', async () => {
  const cached = buildHukamnama('2026-04-10')
  const refresh = deferred<HukamnamaResult>()
  seedCache(cached)
  vi.mocked(fetchHukamnama).mockReturnValue(refresh.promise)

  const { result } = renderHook(() => useHukamnama())

  expect(result.current.data).toEqual(cached)
  expect(result.current.status).toBe('ready')
  expect(result.current.isCached).toBe(true)
  expect(result.current.isOlder).toBe(true)
  expect(result.current.refreshing).toBe(true)
  expect(result.current.cachedAt).toBe('2026-04-10T16:00:00.000Z')

  const fresh = buildHukamnama('2026-04-11')
  await act(async () => refresh.resolve(fresh))
  expect(result.current.data).toEqual(fresh)
  expect(result.current.isCached).toBe(false)
  expect(result.current.isOlder).toBe(false)
  expect(result.current.refreshing).toBe(false)
})

test('a midnight rerender starts the new undated request without relabeling the previous reading', async () => {
  vi.setSystemTime(new Date(2026, 3, 11, 23, 59, 59))
  const pending = deferred<HukamnamaResult>()
  vi.mocked(fetchHukamnama)
    .mockResolvedValueOnce(buildHukamnama('2026-04-11'))
    .mockReturnValueOnce(pending.promise)
  const { result, rerender } = renderHook(() => useHukamnama())
  await waitFor(() => expect(result.current.status).toBe('ready'))

  act(() => {
    vi.setSystemTime(new Date(2026, 3, 12, 0, 0, 1))
    rerender()
  })

  expect(fetchHukamnama).toHaveBeenCalledTimes(2)
  expect(fetchHukamnama).toHaveBeenLastCalledWith(undefined, { signal: expect.any(AbortSignal) })
  expect(result.current.requestedDate).toBe('2026-04-12')
  expect(result.current.data?.date).toBe('2026-04-11')
  expect(result.current.isCached).toBe(true)
  expect(result.current.isOlder).toBe(true)
  expect(result.current.refreshing).toBe(true)

  await act(async () => pending.resolve(buildHukamnama('2026-04-12')))
  expect(result.current.data?.date).toBe('2026-04-12')
  expect(result.current.isOlder).toBe(false)
})

test('an uncached request that never settles leaves loading with an explicit retry after the deadline', async () => {
  vi.mocked(fetchHukamnama).mockReturnValue(new Promise(() => {}))
  const { result } = renderHook(() => useHukamnama())
  expect(result.current.loading).toBe(true)

  await act(async () => { await vi.advanceTimersByTimeAsync(15_001) })

  expect(result.current.loading).toBe(false)
  expect(result.current.status).toBe('degraded')
  expect(result.current.error).toBe('unavailable')
  expect(result.current.data).toBeNull()
  vi.mocked(fetchHukamnama).mockResolvedValueOnce(buildHukamnama('2026-04-11'))
  await act(async () => result.current.retry())
  expect(result.current.data?.date).toBe('2026-04-11')
  expect(result.current.issue).toBeNull()
})

test('only an exact dated cache can render while its request is pending', () => {
  const cached = buildHukamnama('2026-04-10')
  seedCache(cached)
  vi.mocked(fetchHukamnama).mockReturnValue(new Promise(() => {}))
  const { result, rerender } = renderHook(({ date }) => useHukamnama(date), { initialProps: { date: cached.date } })
  expect(result.current.data).toEqual(cached)
  expect(result.current.isCached).toBe(true)
  expect(result.current.isOlder).toBe(false)

  rerender({ date: '2026-04-09' })
  expect(result.current.data).toBeNull()
  expect(result.current.isCached).toBe(false)
  expect(result.current.status).toBe('loading')
})

test('times out a cached refresh, aborts it, and ignores its late result after successful retry', async () => {
  const cached = buildHukamnama('2026-04-10')
  const oldRequest = deferred<HukamnamaResult>()
  seedCache(cached)
  vi.mocked(fetchHukamnama).mockReturnValueOnce(oldRequest.promise)
  const { result } = renderHook(() => useHukamnama())
  const oldSignal = vi.mocked(fetchHukamnama).mock.calls[0][1]?.signal
  expect(oldSignal?.aborted).toBe(false)

  await act(async () => { await vi.advanceTimersByTimeAsync(15_001) })
  expect(oldSignal?.aborted).toBe(true)
  expect(result.current.data).toEqual(cached)
  expect(result.current.status).toBe('degraded')
  expect(result.current.refreshing).toBe(false)
  expect(result.current.isCached).toBe(true)

  const fresh = buildHukamnama('2026-04-11')
  vi.mocked(fetchHukamnama).mockResolvedValueOnce(fresh)
  await act(async () => result.current.retry())
  await act(async () => oldRequest.resolve({ ...cached, shabadId: 99 }))
  expect(result.current.data).toEqual(fresh)
  expect(JSON.parse(localStorage.getItem(HUKAMNAMA_CACHE_KEY) ?? 'null').data).toEqual(fresh)
  expect(fetchHukamnama).toHaveBeenCalledTimes(2)
})

test('a stale day response is aborted and cannot replace or cache the new daily reading', async () => {
  vi.setSystemTime(new Date(2026, 3, 11, 23, 59, 59))
  const oldRequest = deferred<HukamnamaResult>()
  const nextRequest = deferred<HukamnamaResult>()
  vi.mocked(fetchHukamnama).mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(nextRequest.promise)
  const { result, rerender } = renderHook(() => useHukamnama())
  const oldSignal = vi.mocked(fetchHukamnama).mock.calls[0][1]?.signal
  act(() => {
    vi.setSystemTime(new Date(2026, 3, 12, 0, 0, 1))
    rerender()
  })
  expect(oldSignal?.aborted).toBe(true)
  await act(async () => oldRequest.resolve(buildHukamnama('2026-04-11')))
  expect(result.current.data).toBeNull()
  expect(localStorage.getItem(HUKAMNAMA_CACHE_KEY)).toBeNull()
  await act(async () => nextRequest.resolve(buildHukamnama('2026-04-12')))
  expect(result.current.data?.date).toBe('2026-04-12')
})

test('disabled and unmounted requests do not expose cached data or late results', async () => {
  seedCache(buildHukamnama('2026-04-10'))
  const pending = deferred<HukamnamaResult>()
  vi.mocked(fetchHukamnama).mockReturnValue(pending.promise)
  const { result, rerender, unmount } = renderHook(({ enabled }) => useHukamnama(undefined, enabled), { initialProps: { enabled: false } })
  expect(result.current.status).toBe('empty')
  expect(result.current.data).toBeNull()
  expect(result.current.isCached).toBe(false)
  expect(fetchHukamnama).not.toHaveBeenCalled()
  rerender({ enabled: true })
  const signal = vi.mocked(fetchHukamnama).mock.calls[0][1]?.signal
  unmount()
  expect(signal?.aborted).toBe(true)
  await act(async () => pending.resolve(buildHukamnama('2026-04-11')))
  expect(JSON.parse(localStorage.getItem(HUKAMNAMA_CACHE_KEY) ?? 'null').data.date).toBe('2026-04-10')
})

test.each([
  { entry: {} },
  { date: '2026-02-30' },
  { ang: 0 },
  { ang: Number.POSITIVE_INFINITY },
  { source: 'unknown' },
  { source: ['G'] },
  { shabadId: -1 },
  { entry: { ...buildHukamnama('2026-04-10').entry, gurmukhi: '' } },
  { entry: { ...buildHukamnama('2026-04-10').entry, lines: [{}] } },
  { entry: { ...buildHukamnama('2026-04-10').entry, words: [{}] } },
  { entry: { ...buildHukamnama('2026-04-10').entry, lines: [{
    verseId: 1, shabadId: 101, ang: 12,
    gurmukhi: 'ਹਉਮੈ ਨਾਵੈ ਨਾਲਿ ਵਿਰੋਧੁ ਹੈ ॥', transliteration: '', translation_en: '', translation_pa: '', translation_hi: '',
    visraam: { sttm: 'bad' },
  }] } },
])('rejects malformed cache before exposing it during refresh %#', patch => {
  localStorage.setItem(HUKAMNAMA_CACHE_KEY, JSON.stringify({
    data: { ...buildHukamnama('2026-04-10'), ...patch }, cachedAt: '2026-04-10T16:00:00.000Z',
  }))
  vi.mocked(fetchHukamnama).mockReturnValue(new Promise(() => {}))
  const { result } = renderHook(() => useHukamnama())
  expect(result.current.data).toBeNull()
  expect(result.current.isCached).toBe(false)
  expect(result.current.status).toBe('loading')
})

test('keeps compatible v1 line text, source strings and optional provider metadata intact', () => {
  const cached = buildHukamnama('2026-04-10')
  cached.entry.lines = [{
    verseId: 1, shabadId: 101, ang: 12,
    gurmukhi: cached.entry.gurmukhi, transliteration: '', translation_en: '', translation_pa: '', translation_hi: '',
    translations_en: { bdb: 'Preserved text.' },
    visraam: { sttm: [{ p: 1, t: 'v' }] },
  }]
  seedCache(cached)
  vi.mocked(fetchHukamnama).mockReturnValue(new Promise(() => {}))
  const { result } = renderHook(() => useHukamnama())
  expect(result.current.data).toEqual(cached)
  expect(result.current.data?.entry.scripture).toBe('Sri Guru Granth Sahib Ji')
})
