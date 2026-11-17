import { describe, expect, test, vi } from 'vitest'
import { createPrivatePdfRangeLoader, privatePdfCanvasRatio } from './privatePdfRendering'

const MIB = 1024 * 1024

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

async function flushQueue() {
  // Let both the source promise and the loader's completion/finally handlers run.
  for (let index = 0; index < 8; index++) await Promise.resolve()
}

describe('protected PDF range loading', () => {
  test('bounds a burst beyond the gateway stream limit to two active requests', async () => {
    const controller = new AbortController()
    const transfers = new Map<number, ReturnType<typeof deferred<ArrayBuffer>>>()
    let active = 0
    let peak = 0
    const fetchRange = vi.fn((begin: number, end: number) => {
      expect(end - begin).toBe(16)
      active++
      peak = Math.max(peak, active)
      const transfer = deferred<ArrayBuffer>()
      transfers.set(begin, transfer)
      return transfer.promise.finally(() => { active-- })
    })
    const load = createPrivatePdfRangeLoader(1000, controller.signal, fetchRange)
    const requested = Array.from({ length: 12 }, (_, index) => load(index * 16, (index + 1) * 16))
    const finished = Promise.all(requested)
    expect(fetchRange).toHaveBeenCalledTimes(2)

    for (let index = 0; index < requested.length; index++) {
      expect(transfers.has(index * 16)).toBe(true)
      transfers.get(index * 16)!.resolve(new Uint8Array(16).fill(index).buffer)
      await flushQueue()
      expect(active).toBeLessThanOrEqual(2)
    }

    const bytes = await finished
    expect(peak).toBe(2)
    expect(fetchRange).toHaveBeenCalledTimes(12)
    bytes.forEach((range, index) => expect([...range]).toEqual(Array(16).fill(index)))
    expect(fetchRange.mock.calls.every(([, end]) => Number.isFinite(end))).toBe(true)
  })

  test('splits an oversized unaligned request and reassembles its bytes in source order', async () => {
    const controller = new AbortController()
    const begin = 313
    const end = begin + 2 * MIB + 17
    const fetchRange = vi.fn(async (start: number, stop: number, signal: AbortSignal) => {
      expect(signal).toBe(controller.signal)
      expect(stop - start).toBeLessThanOrEqual(MIB)
      const bytes = new Uint8Array(stop - start)
      for (let index = 0; index < bytes.length; index++) bytes[index] = (start + index) % 251
      return bytes.buffer
    })
    const load = createPrivatePdfRangeLoader(end + 50, controller.signal, fetchRange)
    const result = await load(begin, end)
    expect(fetchRange.mock.calls.map(([start, stop]) => [start, stop])).toEqual([
      [begin, begin + MIB], [begin + MIB, begin + 2 * MIB], [begin + 2 * MIB, end],
    ])
    expect(result).toHaveLength(end - begin)
    for (const offset of [0, 1, MIB - 1, MIB, MIB + 1, 2 * MIB - 1, 2 * MIB, result.length - 1]) {
      expect(result[offset]).toBe((begin + offset) % 251)
    }
  })

  test('aborting rejects queued work without starting another fetch or returning late bytes', async () => {
    const controller = new AbortController()
    const activeTransfers = [deferred<ArrayBuffer>(), deferred<ArrayBuffer>()]
    const fetchRange = vi.fn((_begin: number, _end: number, signal: AbortSignal) => {
      expect(signal).toBe(controller.signal)
      return activeTransfers[fetchRange.mock.calls.length - 1].promise
    })
    const load = createPrivatePdfRangeLoader(200, controller.signal, fetchRange)
    const requests = Array.from({ length: 10 }, (_, index) => load(index * 10, index * 10 + 10))
    const finished = Promise.allSettled(requests)
    const queuedResults = Promise.allSettled(requests.slice(2))
    expect(fetchRange).toHaveBeenCalledTimes(2)
    controller.abort()
    expect((await queuedResults).every(result => result.status === 'rejected' && result.reason.name === 'AbortError')).toBe(true)
    activeTransfers.forEach(transfer => transfer.resolve(new ArrayBuffer(10)))
    expect((await finished).every(result => result.status === 'rejected' && result.reason.name === 'AbortError')).toBe(true)
    expect(fetchRange).toHaveBeenCalledTimes(2)
    await expect(load(0, 10)).rejects.toHaveProperty('name', 'AbortError')
    expect(fetchRange).toHaveBeenCalledTimes(2)
  })

  test.each([
    [-1, 10], [0, 0], [10, 5], [0.5, 10], [0, 10.5], [0, 101], [NaN, 10], [0, Infinity],
  ])('rejects invalid bounds %s–%s before requesting bytes', async (begin, end) => {
    const fetchRange = vi.fn()
    const load = createPrivatePdfRangeLoader(100, new AbortController().signal, fetchRange)
    await expect(load(begin, end)).rejects.toThrow('Invalid PDF range')
    expect(fetchRange).not.toHaveBeenCalled()
  })

  test('rejects a truncated chunk and lets another queued request complete', async () => {
    const fetchRange = vi.fn(async (begin: number, end: number) => new ArrayBuffer(end - begin - (begin === MIB ? 1 : 0)))
    const load = createPrivatePdfRangeLoader(4 * MIB, new AbortController().signal, fetchRange)
    const results = await Promise.allSettled([load(0, MIB + 20), load(3 * MIB, 3 * MIB + 40)])
    expect(results[0]).toMatchObject({ status: 'rejected', reason: expect.objectContaining({ message: 'Incomplete PDF range.' }) })
    expect(results[1]).toMatchObject({ status: 'fulfilled', value: expect.any(Uint8Array) })
    if (results[1].status === 'fulfilled') expect(results[1].value).toHaveLength(40)
  })
})

describe('PDF canvas resolution budget', () => {
  test('keeps normal pages sharp without allocating a 3x retina canvas', () => {
    expect(privatePdfCanvasRatio(390, 590, 1)).toBe(1)
    expect(privatePdfCanvasRatio(390, 590, 3)).toBe(2)
  })

  test.each([
    [2320, 3480], [900, 30_000], [30_000, 900], [16_000, 16_000],
  ])('bounds a %s×%s CSS page without changing its requested zoom dimensions', (width, height) => {
    const cssSize = { width, height }
    const ratio = privatePdfCanvasRatio(cssSize.width, cssSize.height, 3)
    expect(ratio).toBeGreaterThan(0)
    expect(width * ratio).toBeLessThanOrEqual(8192)
    expect(height * ratio).toBeLessThanOrEqual(8192)
    expect(width * height * ratio * ratio).toBeLessThanOrEqual(6 * MIB + 0.001)
    expect(cssSize).toEqual({ width, height })
    expect(ratio).toBeLessThan(1)
  })
})
