import type { SearchPage, SearchResult } from '../api/banidb'
import type { AsyncIssueCode, SearchMode } from '../types'
import { resolveAsyncIssue } from '../qa/async'
import type { SearchSource } from './appSearch'
import { derivePhoneticRequests, type SearchRequest } from './gurbaniSearchPlan'
import { withSearchDeadline } from './searchDeadline'

export interface GurbaniSearchRequestState {
  request: SearchRequest
  results: SearchResult[]
  nextPage: number | null
  /** Whether this request has successfully returned its first page. */
  completed: boolean
  error: boolean
  issue?: AsyncIssueCode
  failedPage: number | null
}

export interface GurbaniSearchSnapshot {
  requests: GurbaniSearchRequestState[]
  failures: number
}

export interface GurbaniSearchEngineOptions {
  query: string
  mode: SearchMode
  source: SearchSource
  signal: AbortSignal
  fetchPage: (request: SearchRequest, page: number, signal: AbortSignal) => Promise<SearchPage>
  onChange?: (snapshot: GurbaniSearchSnapshot) => void
  concurrency?: number
  /** Override candidate expansion when using another compatible provider. */
  deriveRequests?: typeof derivePhoneticRequests
}

interface SearchJob { id: string; page: number }

const identity = (result: SearchResult) => `${result.source}-${result.shabadId}-${result.verseId}`

function mergeRows(previous: SearchResult[], incoming: SearchResult[]) {
  const rows = new Map(previous.map(result => [identity(result), result]))
  for (const result of incoming) {
    // Preserve the original result position, but accept corrected provider text.
    rows.set(identity(result), result)
  }
  return [...rows.values()]
}

function copyState(state: GurbaniSearchRequestState): GurbaniSearchRequestState {
  return { ...state, request: { ...state.request }, results: [...state.results] }
}

function emptyRequest(request: SearchRequest): GurbaniSearchRequestState {
  return { request: { ...request }, results: [], nextPage: null, completed: false, error: false, failedPage: null }
}

export function hasMoreGurbaniSearch(snapshot: GurbaniSearchSnapshot) {
  return snapshot.requests.some(state => !state.error && state.nextPage !== null)
}

/** Run one page per queued request, with bounded parallelism and independent cursors. */
async function execute(
  initial: GurbaniSearchRequestState[],
  jobs: SearchJob[],
  options: GurbaniSearchEngineOptions,
): Promise<GurbaniSearchSnapshot> {
  options.signal.throwIfAborted()
  const states = new Map(initial.map(state => [state.request.id, copyState(state)]))
  const queue = [...jobs]
  const queued = new Set(jobs.map(job => job.id))
  const concurrency = Math.max(1, Math.min(3, Math.floor(options.concurrency ?? 3) || 3))
  const derive = options.deriveRequests ?? derivePhoneticRequests
  const snapshot = (): GurbaniSearchSnapshot => ({
    requests: [...states.values()].map(copyState),
    failures: [...states.values()].filter(state => state.error).length,
  })
  const publish = () => {
    if (!options.signal.aborted) options.onChange?.(snapshot())
  }
  const register = (request: SearchRequest) => {
    if (states.has(request.id) || queued.has(request.id)) return
    states.set(request.id, emptyRequest(request))
    queued.add(request.id)
    queue.push({ id: request.id, page: 1 })
  }

  const runJob = async ({ id, page: pageNumber }: SearchJob) => {
    const before = states.get(id)!
    let page: SearchPage
    try {
      page = await withSearchDeadline(
        signal => options.fetchPage(before.request, pageNumber, signal),
        options.signal,
      )
    } catch (error) {
      if (options.signal.aborted) return
      states.set(id, { ...before, error: true, issue: resolveAsyncIssue(error).code, failedPage: pageNumber })
      publish()
      return
    }
    if (options.signal.aborted) return
    const results = mergeRows(before.results, page.results)
    // Stop malformed cursors and repeated provider pages rather than exposing
    // an endless load-more loop. Normal overlapping pages still merge safely.
    const advancing = page.results.length > 0
      && (pageNumber === 1 || results.length > before.results.length)
      && Number.isSafeInteger(page.nextPage) && page.nextPage === pageNumber + 1
    const next: GurbaniSearchRequestState = {
      ...before,
      results,
      nextPage: advancing ? page.nextPage : null,
      completed: true,
      error: false,
      failedPage: null,
    }
    delete next.issue
    states.set(id, next)
    if (before.request.searchType === 8 && pageNumber === 1) {
      for (const request of derive(options.query, options.mode, options.source, page.results)) register(request)
    }
    publish()
  }

  publish()
  // A queue allows newly discovered phonetic requests to occupy a free slot
  // while unrelated meaning queries are still in flight.
  await new Promise<void>((resolve, reject) => {
    let active = 0
    let settled = false
    const finish = (error?: unknown) => {
      if (settled) return
      settled = true
      options.signal.removeEventListener('abort', abort)
      if (error) reject(error)
      else resolve()
    }
    const abort = () => finish(new DOMException('Search cancelled', 'AbortError'))
    const pump = () => {
      if (settled) return
      if (options.signal.aborted) { abort(); return }
      while (active < concurrency && queue.length) {
        const job = queue.shift()!
        active += 1
        void runJob(job).then(() => {
          active -= 1
          pump()
        }, error => finish(error))
      }
      if (!active && !queue.length) finish()
    }
    options.signal.addEventListener('abort', abort, { once: true })
    pump()
  })
  options.signal.throwIfAborted()
  return snapshot()
}

export function runGurbaniSearch(
  options: GurbaniSearchEngineOptions & { requests: readonly SearchRequest[] },
): Promise<GurbaniSearchSnapshot> {
  const unique = [...new Map(options.requests.map(request => [request.id, request])).values()]
  return execute(unique.map(emptyRequest), unique.map(request => ({ id: request.id, page: 1 })), options)
}

export function continueGurbaniSearch(
  previous: GurbaniSearchSnapshot,
  options: GurbaniSearchEngineOptions & { action: 'more' | 'retry' | 'resume' },
): Promise<GurbaniSearchSnapshot> {
  const jobs = previous.requests.flatMap((state): SearchJob[] => {
    const pending = !state.completed && !state.error
    if (options.action === 'resume') {
      return pending ? [{ id: state.request.id, page: 1 }] : []
    }
    if (options.action === 'retry') {
      if (state.error && state.failedPage !== null) return [{ id: state.request.id, page: state.failedPage }]
      return pending ? [{ id: state.request.id, page: 1 }] : []
    }
    return !state.error && state.nextPage !== null ? [{ id: state.request.id, page: state.nextPage }] : []
  })
  return execute(previous.requests, jobs, options)
}
