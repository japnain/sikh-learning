import { act, renderHook, waitFor } from '@testing-library/react'
import { READER_WAKE_LOCK_PREFERENCE_KEY, useReaderWakeLock } from './useReaderWakeLock'

class Sentinel extends EventTarget {
  released = false
  release = vi.fn(async () => {
    this.released = true
    this.dispatchEvent(new Event('release'))
  })
}

const request = vi.fn()
let visibility = 'visible'

beforeEach(() => {
  visibility = 'visible'
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } })
  request.mockReset()
  request.mockImplementation(async () => new Sentinel())
})

afterEach(() => { vi.restoreAllMocks() })

function setVisibility(next: 'visible' | 'hidden') {
  act(() => { visibility = next; document.dispatchEvent(new Event('visibilitychange')) })
}

test('starts off and acquires only after the reader opts in; saves that preference', async () => {
  const lock = new Sentinel()
  request.mockResolvedValue(lock)
  const { result, unmount } = renderHook(() => useReaderWakeLock())
  expect(result.current).toMatchObject({ enabled: false, active: false, supported: true, error: null })
  expect(request).not.toHaveBeenCalled()
  act(() => result.current.setEnabled(true))
  await waitFor(() => expect(result.current.active).toBe(true))
  expect(request).toHaveBeenCalledWith('screen')
  expect(localStorage.getItem(READER_WAKE_LOCK_PREFERENCE_KEY)).toBe('true')
  unmount()
  expect(lock.release).toHaveBeenCalledOnce()
})

test('releases in the background and reacquires on returning while still enabled', async () => {
  localStorage.setItem(READER_WAKE_LOCK_PREFERENCE_KEY, 'true')
  const first = new Sentinel()
  const second = new Sentinel()
  request.mockResolvedValueOnce(first).mockResolvedValueOnce(second)
  const { result } = renderHook(() => useReaderWakeLock())
  await waitFor(() => expect(result.current.active).toBe(true))
  setVisibility('hidden')
  expect(first.release).toHaveBeenCalledOnce()
  expect(result.current.active).toBe(false)
  setVisibility('visible')
  await waitFor(() => expect(result.current.active).toBe(true))
  expect(request).toHaveBeenCalledTimes(2)
})

test('pagehide releases even before visibility changes and pageshow restores the reading', async () => {
  localStorage.setItem(READER_WAKE_LOCK_PREFERENCE_KEY, 'true')
  const lock = new Sentinel()
  request.mockResolvedValueOnce(lock)
  const { result } = renderHook(() => useReaderWakeLock())
  await waitFor(() => expect(result.current.active).toBe(true))
  act(() => window.dispatchEvent(new Event('pagehide')))
  expect(lock.release).toHaveBeenCalledOnce()
  expect(result.current.active).toBe(false)
  act(() => document.dispatchEvent(new Event('visibilitychange')))
  expect(request).toHaveBeenCalledTimes(1)
  act(() => window.dispatchEvent(new Event('pageshow')))
  await waitFor(() => expect(result.current.active).toBe(true))
  expect(request).toHaveBeenCalledTimes(2)
})

test.each(['disable', 'unmount', 'hide'] as const)('releases a late acquisition after %s', async action => {
  let resolve!: (sentinel: Sentinel) => void
  request.mockImplementation(() => new Promise<Sentinel>(done => { resolve = done }))
  localStorage.setItem(READER_WAKE_LOCK_PREFERENCE_KEY, 'true')
  const { result, unmount } = renderHook(() => useReaderWakeLock())
  expect(request).toHaveBeenCalledOnce()
  if (action === 'disable') act(() => result.current.setEnabled(false))
  else if (action === 'unmount') unmount()
  else setVisibility('hidden')
  const late = new Sentinel()
  await act(async () => { resolve(late); await Promise.resolve() })
  expect(late.release).toHaveBeenCalledOnce()
  if (action !== 'unmount') expect(result.current.active).toBe(false)
})

test('denial remains a usable enabled preference with truthful inactive state; visible return retries', async () => {
  request.mockRejectedValueOnce(new DOMException('Power policy', 'NotAllowedError'))
  localStorage.setItem(READER_WAKE_LOCK_PREFERENCE_KEY, 'true')
  const { result } = renderHook(() => useReaderWakeLock())
  await waitFor(() => expect(result.current.error).toBe('unavailable'))
  expect(result.current.enabled).toBe(true)
  expect(result.current.active).toBe(false)
  setVisibility('hidden')
  setVisibility('visible')
  await waitFor(() => expect(result.current.active).toBe(true))
  expect(result.current.error).toBeNull()
})

test('an OS release updates status without continually requesting another lock', async () => {
  const lock = new Sentinel()
  request.mockResolvedValueOnce(lock)
  localStorage.setItem(READER_WAKE_LOCK_PREFERENCE_KEY, 'true')
  const { result } = renderHook(() => useReaderWakeLock())
  await waitFor(() => expect(result.current.active).toBe(true))
  await act(async () => { await lock.release() })
  expect(result.current.active).toBe(false)
  expect(result.current.enabled).toBe(true)
  expect(request).toHaveBeenCalledOnce()
})

test('unsupported browsers do not request or claim an active lock', () => {
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: undefined })
  localStorage.setItem(READER_WAKE_LOCK_PREFERENCE_KEY, 'true')
  const { result } = renderHook(() => useReaderWakeLock())
  expect(result.current).toMatchObject({ enabled: true, active: false, supported: false, error: null })
  expect(request).not.toHaveBeenCalled()
})

test('an inactive reading releases its lock and can resume without altering the preference', async () => {
  const lock = new Sentinel()
  request.mockResolvedValueOnce(lock)
  localStorage.setItem(READER_WAKE_LOCK_PREFERENCE_KEY, 'true')
  const { result, rerender } = renderHook(({ reading }) => useReaderWakeLock(reading), { initialProps: { reading: true } })
  await waitFor(() => expect(result.current.active).toBe(true))
  rerender({ reading: false })
  expect(lock.release).toHaveBeenCalledOnce()
  expect(result.current.active).toBe(false)
  expect(result.current.enabled).toBe(true)
  rerender({ reading: true })
  await waitFor(() => expect(result.current.active).toBe(true))
})

test('blocked preference storage does not prevent use during this reading', async () => {
  vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('blocked') })
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  const { result } = renderHook(() => useReaderWakeLock())
  act(() => result.current.setEnabled(true))
  await waitFor(() => expect(result.current.active).toBe(true))
})

test('does not acquire a persisted preference until the document is visible', async () => {
  visibility = 'hidden'
  localStorage.setItem(READER_WAKE_LOCK_PREFERENCE_KEY, 'true')
  const { result } = renderHook(() => useReaderWakeLock())
  expect(request).not.toHaveBeenCalled()
  setVisibility('visible')
  await waitFor(() => expect(result.current.active).toBe(true))
})

test('a stale hidden acquisition cannot replace a newer visible lock', async () => {
  let resolveOld!: (sentinel: Sentinel) => void
  request.mockImplementationOnce(() => new Promise<Sentinel>(done => { resolveOld = done }))
  const current = new Sentinel()
  request.mockResolvedValueOnce(current)
  localStorage.setItem(READER_WAKE_LOCK_PREFERENCE_KEY, 'true')
  const { result } = renderHook(() => useReaderWakeLock())
  setVisibility('hidden')
  setVisibility('visible')
  await waitFor(() => expect(result.current.active).toBe(true))
  const stale = new Sentinel()
  await act(async () => { resolveOld(stale); await Promise.resolve() })
  expect(stale.release).toHaveBeenCalledOnce()
  expect(current.release).not.toHaveBeenCalled()
  expect(result.current.active).toBe(true)
})
