import { afterEach, expect, test, vi } from 'vitest'
import { withSearchDeadline } from './searchDeadline'

afterEach(() => vi.useRealTimers())

test('a stalled source times out and aborts without holding successful independent work', async () => {
  vi.useFakeTimers()
  let requestSignal: AbortSignal | undefined
  const parent = new AbortController()
  const stalled = withSearchDeadline(signal => { requestSignal = signal; return new Promise(() => {}) }, parent.signal, 100)
  const rejected = expect(stalled).rejects.toThrow('Search timed out')
  await expect(withSearchDeadline(async () => ['local result'], parent.signal, 100)).resolves.toEqual(['local result'])
  await vi.advanceTimersByTimeAsync(100)
  await rejected
  expect(requestSignal?.aborted).toBe(true)
  expect(parent.signal.aborted).toBe(false)
})

test('cancelling a search also settles a source that ignores abort', async () => {
  const parent = new AbortController()
  const request = withSearchDeadline(() => new Promise(() => {}), parent.signal)
  const rejected = expect(request).rejects.toMatchObject({ name: 'AbortError' })
  parent.abort()
  await rejected
})
