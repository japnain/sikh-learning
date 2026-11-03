import { afterEach, describe, expect, test, vi } from 'vitest'
import type { SearchPage, SearchResult } from '../api/banidb'
import type { SearchRequest } from './gurbaniSearchPlan'
import {
  continueGurbaniSearch,
  hasMoreGurbaniSearch,
  runGurbaniSearch,
  type GurbaniSearchEngineOptions,
  type GurbaniSearchSnapshot,
} from './gurbaniSearchEngine'
import { SEARCH_SOURCE_TIMEOUT_MS } from './searchDeadline'

function result(verseId: number, fields: Partial<SearchResult> = {}): SearchResult {
  return {
    verseId, shabadId: 1, source: 'G', pageNo: 1,
    sourceName: 'Sri Guru Granth Sahib Ji', gurmukhi: 'ਹੁਕਮਿ',
    transliteration: 'hukam', translation_en: 'Divine order', raag: 'Jap', writer: 'Guru Nanak Dev Ji',
    ...fields,
  }
}

function request(id: string, fields: Partial<SearchRequest> = {}): SearchRequest {
  return { id, query: id, matchQuery: id, searchType: 3, kind: 'meaning', ...fields }
}

function page(results: SearchResult[], nextPage: number | null = null, pageNumber = 1): SearchPage {
  return { results, nextPage, page: pageNumber, totalResults: results.length }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

function options(fetchPage: GurbaniSearchEngineOptions['fetchPage']): GurbaniSearchEngineOptions {
  return {
    query: 'kindness', mode: 'english', source: 'all',
    signal: new AbortController().signal, fetchPage, deriveRequests: () => [],
  }
}

afterEach(() => vi.useRealTimers())

describe('independent search requests', () => {
  test('keeps same-type requests and their pagination independent, merging overlapping rows in order', async () => {
    const fetchPage = vi.fn(async (descriptor: SearchRequest, current: number) => {
      if (descriptor.id === 'kindness') return current === 1
        ? page([result(1), result(2)], 2)
        : page([result(2, { translation_en: 'Corrected translation' }), result(3)], null, 2)
      return current === 1 ? page([result(10)], 2) : page([result(11)], 3, 2)
    })
    const first = await runGurbaniSearch({
      ...options(fetchPage), requests: [request('kindness'), request('compassion', { related: true })],
    })
    expect(first.requests.map(state => [state.request.id, state.nextPage])).toEqual([
      ['kindness', 2], ['compassion', 2],
    ])
    expect(hasMoreGurbaniSearch(first)).toBe(true)

    const second = await continueGurbaniSearch(first, { ...options(fetchPage), action: 'more' })
    expect(second.requests[0].results.map(row => row.verseId)).toEqual([1, 2, 3])
    expect(second.requests[0].results[1].translation_en).toBe('Corrected translation')
    expect(second.requests[0].nextPage).toBeNull()
    expect(second.requests[1].results.map(row => row.verseId)).toEqual([10, 11])
    expect(second.requests[1].nextPage).toBe(3)
    expect(first.requests[0].results.map(row => row.verseId)).toEqual([1, 2])
    expect(first.requests[0].results[1].translation_en).toBe('Divine order')
    expect(fetchPage.mock.calls.map(([descriptor, current]) => [descriptor.id, current])).toEqual([
      ['kindness', 1], ['compassion', 1], ['kindness', 2], ['compassion', 2],
    ])
  })

  test('publishes usable partial results without changing earlier snapshots', async () => {
    const first = deferred<SearchPage>()
    const second = deferred<SearchPage>()
    const updates: GurbaniSearchSnapshot[] = []
    const partial = deferred<GurbaniSearchSnapshot>()
    const run = runGurbaniSearch({
      ...options(descriptor => descriptor.id === 'first' ? first.promise : second.promise),
      requests: [request('first'), request('second')],
      onChange: snapshot => {
        updates.push(snapshot)
        if (snapshot.requests[0].completed) partial.resolve(snapshot)
      },
    })
    first.resolve(page([result(1)]))
    const afterFirst = await partial.promise
    expect(afterFirst.requests.map(state => state.completed)).toEqual([true, false])
    second.resolve(page([result(2)]))
    const finished = await run
    expect(finished.requests.map(state => state.completed)).toEqual([true, true])
    expect(updates[0].requests.every(state => state.results.length === 0)).toBe(true)
    expect(afterFirst.requests[1].results).toEqual([])
    expect(afterFirst.requests[1].completed).toBe(false)
    expect(JSON.parse(JSON.stringify(finished))).toEqual(finished)
  })

  test('limits providers to three active requests even when a larger concurrency is requested', async () => {
    let active = 0
    let peak = 0
    const fetchPage = vi.fn(async () => {
      active += 1
      peak = Math.max(peak, active)
      await new Promise(resolve => setTimeout(resolve, 1))
      active -= 1
      return page([])
    })
    await runGurbaniSearch({
      ...options(fetchPage), concurrency: 10,
      requests: Array.from({ length: 8 }, (_, index) => request(String(index))),
    })
    expect(peak).toBe(3)
    expect(fetchPage).toHaveBeenCalledTimes(8)
  })
})

describe('failed pages and cancellation', () => {
  test('resumes pending requests without repeating successes, fetching next pages, or retrying failures', async () => {
    const saved: GurbaniSearchSnapshot = {
      failures: 1,
      requests: [
        { request: request('working'), results: [result(1)], completed: true, nextPage: 2, error: false, failedPage: null },
        { request: request('pending'), results: [], completed: false, nextPage: null, error: false, failedPage: null },
        { request: request('failed'), results: [result(3)], completed: true, nextPage: 2, error: true, failedPage: 2, issue: 'offline' },
      ],
    }
    const fetchPage = vi.fn(async () => page([result(2)], 2))
    const resumed = await continueGurbaniSearch(saved, { ...options(fetchPage), action: 'resume' })
    expect(fetchPage.mock.calls).toHaveLength(1)
    expect(fetchPage).toHaveBeenCalledWith(request('pending'), 1, expect.any(AbortSignal))
    expect(resumed.requests[0]).toEqual(saved.requests[0])
    expect(resumed.requests[1]).toMatchObject({ completed: true, error: false, nextPage: 2, results: [result(2)] })
    expect(resumed.requests[2]).toEqual(saved.requests[2])
    expect(resumed.failures).toBe(1)
    expect(saved.requests[1].completed).toBe(false)
  })

  test('an explicit retry also resumes pending requests while preserving completed pages', async () => {
    const saved: GurbaniSearchSnapshot = {
      failures: 1,
      requests: [
        { request: request('working'), results: [result(1)], completed: true, nextPage: 2, error: false, failedPage: null },
        { request: request('pending'), results: [], completed: false, nextPage: null, error: false, failedPage: null },
        { request: request('failed'), results: [result(3)], completed: true, nextPage: 2, error: true, failedPage: 2, issue: 'offline' },
      ],
    }
    const fetchPage = vi.fn(async (descriptor: SearchRequest, current: number) => page([result(descriptor.id === 'pending' ? 2 : 4)], null, current))
    const retried = await continueGurbaniSearch(saved, { ...options(fetchPage), action: 'retry' })
    expect(fetchPage.mock.calls.map(([descriptor, current]) => [descriptor.id, current])).toEqual([['pending', 1], ['failed', 2]])
    expect(retried.requests[0]).toEqual(saved.requests[0])
    expect(retried.requests[1].results.map(row => row.verseId)).toEqual([2])
    expect(retried.requests[2].results.map(row => row.verseId)).toEqual([3, 4])
    expect(retried.failures).toBe(0)
  })

  test.each([
    ['Failed to fetch', 'Error', 'offline'],
    ['Simulated failure', 'QaFaultError', 'qa-fault'],
    ['404 missing page', 'Error', 'missing'],
    ['Service unavailable', 'Error', 'unavailable'],
  ] as const)('preserves the %s issue and clears it after a successful retry', async (message, name, code) => {
    const fetchPage = vi.fn<GurbaniSearchEngineOptions['fetchPage']>()
      .mockRejectedValueOnce(Object.assign(new Error(message), { name }))
      .mockResolvedValueOnce(page([result(1)]))
    const first = await runGurbaniSearch({ ...options(fetchPage), requests: [request('kindness')] })
    expect(first.requests[0].issue).toBe(code)
    const retried = await continueGurbaniSearch(first, { ...options(fetchPage), action: 'retry' })
    expect(retried.requests[0].issue).toBeUndefined()
    expect(retried.requests[0].error).toBe(false)
  })

  test('retries only failed initial requests and retains successful results', async () => {
    let fail = true
    const fetchPage = vi.fn(async (descriptor: SearchRequest) => {
      if (descriptor.id === 'broken' && fail) throw new Error('Unavailable')
      return page([result(descriptor.id === 'broken' ? 2 : 1)])
    })
    const first = await runGurbaniSearch({
      ...options(fetchPage), requests: [request('working'), request('broken')],
    })
    expect(first.failures).toBe(1)
    expect(first.requests[1]).toMatchObject({ error: true, completed: false, failedPage: 1 })
    fail = false
    const retry = await continueGurbaniSearch(first, { ...options(fetchPage), action: 'retry' })
    expect(retry.failures).toBe(0)
    expect(retry.requests.map(state => state.results[0].verseId)).toEqual([1, 2])
    expect(fetchPage.mock.calls.map(([descriptor]) => descriptor.id)).toEqual(['working', 'broken', 'broken'])
    expect(first.requests[1].error).toBe(true)
  })

  test('retains a failed later page and retries that cursor without starting over', async () => {
    let fail = true
    const fetchPage = vi.fn(async (_descriptor: SearchRequest, current: number) => {
      if (current === 2 && fail) throw new Error('Unavailable')
      return current === 1 ? page([result(1)], 2) : page([result(2)], 3, 2)
    })
    const first = await runGurbaniSearch({ ...options(fetchPage), requests: [request('kindness')] })
    const failed = await continueGurbaniSearch(first, { ...options(fetchPage), action: 'more' })
    expect(failed.requests[0]).toMatchObject({ error: true, failedPage: 2, nextPage: 2, completed: true })
    expect(failed.requests[0].results.map(row => row.verseId)).toEqual([1])
    expect(hasMoreGurbaniSearch(failed)).toBe(false)
    fail = false
    const retry = await continueGurbaniSearch(failed, { ...options(fetchPage), action: 'retry' })
    expect(retry.requests[0]).toMatchObject({ error: false, failedPage: null, nextPage: 3 })
    expect(retry.requests[0].results.map(row => row.verseId)).toEqual([1, 2])
    expect(fetchPage.mock.calls.map(([, current]) => current)).toEqual([1, 2, 2])
  })

  test('cancels immediately even when a provider ignores abort, without publishing late results', async () => {
    const controller = new AbortController()
    const pending = deferred<SearchPage>()
    const started = deferred<void>()
    const onChange = vi.fn()
    const run = runGurbaniSearch({
      ...options(() => { started.resolve(); return pending.promise }),
      requests: [request('kindness')], signal: controller.signal, onChange,
    })
    const rejection = expect(run).rejects.toMatchObject({ name: 'AbortError' })
    await started.promise
    controller.abort()
    await rejection
    const publishedBeforeResolution = onChange.mock.calls.length
    pending.resolve(page([result(1)]))
    await Promise.resolve()
    await Promise.resolve()
    expect(onChange).toHaveBeenCalledTimes(publishedBeforeResolution)
  })

  test('times out a stalled provider while keeping independent successful results', async () => {
    vi.useFakeTimers()
    let stalledSignal: AbortSignal | undefined
    const run = runGurbaniSearch({
      ...options(async (descriptor, _current, signal) => {
        if (descriptor.id === 'working') return page([result(1)])
        stalledSignal = signal
        return new Promise(() => {})
      }),
      requests: [request('working'), request('stalled')],
    })
    await vi.advanceTimersByTimeAsync(SEARCH_SOURCE_TIMEOUT_MS)
    const finished = await run
    expect(finished.failures).toBe(1)
    expect(finished.requests[0].results.map(row => row.verseId)).toEqual([1])
    expect(finished.requests[1]).toMatchObject({ error: true, failedPage: 1 })
    expect(stalledSignal?.aborted).toBe(true)
  })
})

describe('phonetic candidate expansion', () => {
  test('registers derived requests once, awaits their results, and pages them independently', async () => {
    const seed = request('seed', { query: 'hukam', searchType: 8, kind: 'transliteration' })
    const expansion = request('anchor', { query: 'hkm', matchQuery: 'hukam', searchType: 6, kind: 'transliteration' })
    const deriveRequests = vi.fn(() => [expansion, expansion])
    const fetchPage = vi.fn(async (descriptor: SearchRequest, current: number) =>
      page([result(descriptor.id === 'seed' ? 1 : current + 10)], descriptor.id === 'anchor' && current === 1 ? 2 : null, current))
    const first = await runGurbaniSearch({
      ...options(fetchPage), query: 'hukam', mode: 'transliteration', source: 'G', deriveRequests,
      requests: [seed],
    })
    expect(deriveRequests).toHaveBeenCalledWith('hukam', 'transliteration', 'G', [result(1)])
    expect(first.requests.map(state => [state.request.id, state.completed])).toEqual([['seed', true], ['anchor', true]])
    expect(first.requests[1].request.matchQuery).toBe('hukam')
    const second = await continueGurbaniSearch(first, { ...options(fetchPage), deriveRequests, action: 'more' })
    expect(second.requests[1].results.map(row => row.verseId)).toEqual([11, 12])
    expect(deriveRequests).toHaveBeenCalledTimes(1)
    expect(fetchPage.mock.calls.map(([descriptor, current]) => [descriptor.id, current])).toEqual([
      ['seed', 1], ['anchor', 1], ['anchor', 2],
    ])
  })

  test('discovers expansions after a failed seed is retried successfully', async () => {
    let fail = true
    const fetchPage = vi.fn(async () => {
      if (fail) throw new Error('Unavailable')
      return page([result(1)])
    })
    const deriveRequests = vi.fn(() => [request('anchor', { searchType: 6, kind: 'transliteration' })])
    const first = await runGurbaniSearch({
      ...options(fetchPage), deriveRequests, requests: [request('seed', { searchType: 8, kind: 'transliteration' })],
    })
    expect(deriveRequests).not.toHaveBeenCalled()
    fail = false
    const retry = await continueGurbaniSearch(first, { ...options(fetchPage), deriveRequests, action: 'retry' })
    expect(retry.failures).toBe(0)
    expect(retry.requests.map(state => state.request.id)).toEqual(['seed', 'anchor'])
    expect(fetchPage).toHaveBeenCalledTimes(3)
  })
})

test('stops malformed cursors and entirely repeated pages, while preserving source-specific identity', async () => {
  const fetchPage = vi.fn(async (_descriptor: SearchRequest, current: number) => page([
    result(1), result(1, { source: 'D' }), result(1, { shabadId: 2 }),
  ], current + 1, current))
  const first = await runGurbaniSearch({ ...options(fetchPage), requests: [request('kindness')] })
  expect(first.requests[0].results).toHaveLength(3)
  const repeated = await continueGurbaniSearch(first, { ...options(fetchPage), action: 'more' })
  expect(repeated.requests[0].results).toHaveLength(3)
  expect(hasMoreGurbaniSearch(repeated)).toBe(false)
  const malformed = await runGurbaniSearch({
    ...options(async () => page([result(1)], 1)), requests: [request('kindness')],
  })
  expect(hasMoreGurbaniSearch(malformed)).toBe(false)
})

test('does not fetch an empty plan or an already-cancelled search', async () => {
  const fetchPage = vi.fn(async () => page([]))
  await expect(runGurbaniSearch({ ...options(fetchPage), requests: [] })).resolves.toEqual({ requests: [], failures: 0 })
  const controller = new AbortController()
  controller.abort()
  await expect(runGurbaniSearch({
    ...options(fetchPage), signal: controller.signal, requests: [request('kindness')],
  })).rejects.toMatchObject({ name: 'AbortError' })
  expect(fetchPage).not.toHaveBeenCalled()
})
