import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import type { BaniFetchResult } from '../api/banidb'
import { loadExactBaniReading } from '../utils/baniLengthSelection'
import { useBaniLengthSelection } from './useBaniLengthSelection'

vi.mock('../utils/baniLengthSelection', () => ({ loadExactBaniReading: vi.fn() }))

const short: BaniFetchResult = { entries: [], availableLengths: ['short', 'long'], resolvedLength: 'short' }
const long: BaniFetchResult = { entries: [], availableLengths: ['short', 'long'], resolvedLength: 'long' }

function deferred() {
  let resolve!: (value: BaniFetchResult) => void
  let reject!: (error: Error) => void
  const promise = new Promise<BaniFetchResult>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}

beforeEach(() => { vi.mocked(loadExactBaniReading).mockReset() })

test('retains the committed reading when preparing a replacement fails', async () => {
  vi.mocked(loadExactBaniReading).mockResolvedValueOnce(short).mockRejectedValueOnce(new Error('Unavailable offline'))
  const { result } = renderHook(() => useBaniLengthSelection('/study?sgLength=short'))
  await act(async () => { await result.current.prepare(21, 'short') })
  expect(result.current.preparedReading).toBe(short)
  await act(async () => { await expect(result.current.prepare(21, 'long')).rejects.toThrow('Unavailable offline') })
  expect(result.current.preparedReading).toBe(short)
  expect(result.current.pending).toBe(false)
})

test('the latest selection wins even when an older transport resolves after its abort', async () => {
  const first = deferred()
  const second = deferred()
  vi.mocked(loadExactBaniReading).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
  const { result } = renderHook(() => useBaniLengthSelection('/study?baniDbId=21'))
  let oldRequest!: Promise<BaniFetchResult>
  let freshRequest!: Promise<BaniFetchResult>
  act(() => { oldRequest = result.current.prepare(21, 'short') })
  const rejectedOld = expect(oldRequest).rejects.toMatchObject({ name: 'AbortError' })
  act(() => { freshRequest = result.current.prepare(21, 'long') })
  expect(vi.mocked(loadExactBaniReading).mock.calls[0][2]?.aborted).toBe(true)
  expect(result.current.pending).toBe(true)
  await act(async () => { second.resolve(long); await freshRequest })
  expect(result.current.preparedReading).toBe(long)
  expect(result.current.pending).toBe(false)
  await act(async () => { first.resolve(short); await rejectedOld })
  expect(result.current.preparedReading).toBe(long)
})

test('an old failure cannot clear a newer request pending state', async () => {
  const first = deferred()
  const second = deferred()
  vi.mocked(loadExactBaniReading).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
  const { result } = renderHook(() => useBaniLengthSelection('/study?baniDbId=21'))
  let oldRequest!: Promise<BaniFetchResult>
  let freshRequest!: Promise<BaniFetchResult>
  act(() => { oldRequest = result.current.prepare(21, 'short') })
  const rejectedOld = expect(oldRequest).rejects.toThrow('Cancelled')
  act(() => { freshRequest = result.current.prepare(21, 'long') })
  await act(async () => { first.reject(new Error('Cancelled')); await rejectedOld })
  expect(result.current.pending).toBe(true)
  await act(async () => { second.resolve(long); await freshRequest })
  expect(result.current.pending).toBe(false)
  expect(result.current.preparedReading).toBe(long)
})

test('route changes immediately cancel pending state and prevent accepting an old route result', async () => {
  const old = deferred()
  vi.mocked(loadExactBaniReading).mockReturnValue(old.promise)
  const { result, rerender } = renderHook(({ route }) => useBaniLengthSelection(route), {
    initialProps: { route: '/study?baniDbId=21' },
  })
  let request!: Promise<BaniFetchResult>
  act(() => { request = result.current.prepare(21, 'long') })
  const rejected = expect(request).rejects.toMatchObject({ name: 'AbortError' })
  expect(result.current.pending).toBe(true)
  rerender({ route: '/study?baniDbId=2' })
  expect(vi.mocked(loadExactBaniReading).mock.calls[0][2]?.aborted).toBe(true)
  expect(result.current.pending).toBe(false)
  await act(async () => { old.resolve(long); await rejected })
  expect(result.current.preparedReading).toBeNull()
})

test('unmount aborts outstanding preparation and rejects its late result', async () => {
  const old = deferred()
  vi.mocked(loadExactBaniReading).mockReturnValue(old.promise)
  const { result, unmount } = renderHook(() => useBaniLengthSelection('/study?baniDbId=21'))
  let request!: Promise<BaniFetchResult>
  act(() => { request = result.current.prepare(21, 'long') })
  const rejected = expect(request).rejects.toMatchObject({ name: 'AbortError' })
  unmount()
  expect(vi.mocked(loadExactBaniReading).mock.calls[0][2]?.aborted).toBe(true)
  await act(async () => { old.resolve(long); await rejected })
})

test('reuses a destination-verified payload without fetching it again, but rejects mismatched prepared identity', async () => {
  const prepared: BaniFetchResult = {
    ...long,
    entries: [{ id: 'bani-21-8', source: 'G', scripture: 'SGGS', ang: 8, gurmukhi: 'ਸਤਿ ਨਾਮੁ ॥',
      transliteration: '', translation_en: '', translation_pa: '', translation_hi: '', words: [] }],
  }
  const { result } = renderHook(() => useBaniLengthSelection('/study?baniDbId=21&sgLength=short'))
  await act(async () => { expect(await result.current.prepare(21, 'long', prepared)).toBe(prepared) })
  expect(loadExactBaniReading).not.toHaveBeenCalled()
  expect(result.current.preparedReading).toBe(prepared)
  vi.mocked(loadExactBaniReading).mockResolvedValue(short)
  await act(async () => { await result.current.prepare(21, 'short', prepared) })
  expect(loadExactBaniReading).toHaveBeenCalledWith(21, 'short', expect.any(AbortSignal))
})
