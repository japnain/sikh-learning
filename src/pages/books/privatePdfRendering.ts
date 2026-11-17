const RANGE_CHUNK_BYTES = 1024 * 1024
const MAX_ACTIVE_RANGES = 2

/** PDF.js may request large or concurrent ranges; stay below the protected gateway limits. */
export function createPrivatePdfRangeLoader(
  size: number,
  signal: AbortSignal,
  fetchRange: (begin: number, end: number, signal: AbortSignal) => Promise<ArrayBuffer>,
) {
  type Job = { begin: number; end: number; resolve: (bytes: Uint8Array) => void; reject: (error: unknown) => void }
  const jobs: Job[] = []
  let active = 0
  const cancelled = () => new DOMException('Page loading was cancelled.', 'AbortError')
  signal.addEventListener('abort', () => { for (const job of jobs.splice(0)) job.reject(cancelled()) }, { once: true })
  const pump = () => {
    while (active < MAX_ACTIVE_RANGES && jobs.length && !signal.aborted) {
      const job = jobs.shift()!
      active++
      void (async () => {
        const bytes = new Uint8Array(job.end - job.begin)
        for (let begin = job.begin; begin < job.end; begin += RANGE_CHUNK_BYTES) {
          if (signal.aborted) throw cancelled()
          const end = Math.min(job.end, begin + RANGE_CHUNK_BYTES)
          const chunk = await fetchRange(begin, end, signal)
          if (signal.aborted) throw cancelled()
          if (chunk.byteLength !== end - begin) throw new Error('Incomplete PDF range.')
          bytes.set(new Uint8Array(chunk), begin - job.begin)
        }
        return bytes
      })().then(job.resolve, job.reject).finally(() => { active--; pump() })
    }
  }
  return (begin: number, end: number) => new Promise<Uint8Array>((resolve, reject) => {
    if (signal.aborted) { reject(cancelled()); return }
    if (!Number.isSafeInteger(begin) || !Number.isSafeInteger(end) || begin < 0 || end <= begin || end > size) {
      reject(new Error('Invalid PDF range.')); return
    }
    jobs.push({ begin, end, resolve, reject }); pump()
  })
}

/** Preserve CSS zoom while bounding the backing canvas on memory-constrained phones. */
export function privatePdfCanvasRatio(width: number, height: number, devicePixelRatio: number) {
  if (!(width > 0) || !(height > 0)) return 1
  return Math.min(Math.max(1, Math.min(2, devicePixelRatio || 1)),
    Math.sqrt(6 * 1024 * 1024 / (width * height)), 8192 / width, 8192 / height)
}
