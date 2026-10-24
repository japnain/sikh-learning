/** Bound each search source independently; a stalled provider must not hold local results. */
export const SEARCH_SOURCE_TIMEOUT_MS = 12000

export function withSearchDeadline<T>(
  task: (signal: AbortSignal) => Promise<T>,
  signal: AbortSignal,
  timeoutMs = SEARCH_SOURCE_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController()
  return new Promise<T>((resolve, reject) => {
    let finished = false
    const finish = (callback: () => void) => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      callback()
    }
    const abort = () => finish(() => {
      controller.abort()
      reject(new DOMException('Search cancelled', 'AbortError'))
    })
    const timer = setTimeout(() => finish(() => {
      controller.abort()
      reject(new Error('Search timed out'))
    }), timeoutMs)
    if (signal.aborted) { abort(); return }
    signal.addEventListener('abort', abort, { once: true })
    Promise.resolve().then(() => task(controller.signal)).then(
      value => finish(() => resolve(value)),
      error => finish(() => reject(error)),
    )
  })
}
