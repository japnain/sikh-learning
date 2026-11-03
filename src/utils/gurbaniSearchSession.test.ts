import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { SearchResult } from '../api/banidb'
import type { GurbaniSearchSnapshot } from './gurbaniSearchEngine'
import {
  clearGurbaniSearchSessions,
  getGurbaniSearchSession,
  GURBANI_SEARCH_SESSION_LIFETIME_MS,
  GURBANI_SEARCH_SESSION_MAX_BYTES,
  rememberGurbaniSearchSession,
} from './gurbaniSearchSession'

function result(verseId: number, fields: Partial<SearchResult> = {}): SearchResult {
  return {
    verseId, shabadId: 1, source: 'G', pageNo: 1,
    sourceName: 'Sri Guru Granth Sahib Ji', gurmukhi: 'ਹੁਕਮਿ',
    transliteration: 'hukam', translation_en: 'Divine order', raag: 'Jap', writer: 'Guru Nanak Dev Ji',
    ...fields,
  }
}

function snapshot(results = [result(1)]): GurbaniSearchSnapshot {
  return {
    requests: [{
      request: { id: 'meaning', query: 'order', matchQuery: 'order', searchType: 3, kind: 'meaning' },
      results, nextPage: 2, completed: true, error: false, failedPage: null,
    }],
    failures: 0,
  }
}

beforeEach(clearGurbaniSearchSessions)
afterEach(() => { clearGurbaniSearchSessions(); vi.useRealTimers() })

describe('search return sessions', () => {
  test('restores descriptors, all loaded pages and independent cursors', () => {
    const rows = Array.from({ length: 1200 }, (_, index) => result(index))
    const saved = snapshot(rows)
    saved.requests[0].nextPage = 13
    saved.requests.push({
      ...saved.requests[0],
      request: { id: 'related', query: 'command', matchQuery: 'command', searchType: 3, kind: 'meaning', related: true },
      results: rows.slice(600), nextPage: 7,
    })
    rememberGurbaniSearchSession('query', saved)
    expect(getGurbaniSearchSession('query')).toEqual(saved)
  })

  test('isolates the stored snapshot from mutations before and after retrieval', () => {
    const saved = snapshot([result(1, { translations_en: { bdb: 'Original' }, writerMeta: { english: 'Original writer' } })])
    rememberGurbaniSearchSession('query', saved)
    saved.requests[0].request.query = 'changed'
    saved.requests[0].results[0].translations_en!.bdb = 'changed'
    saved.requests[0].nextPage = 99
    const restored = getGurbaniSearchSession('query')!
    expect(restored.requests[0].request.query).toBe('order')
    expect(restored.requests[0].results[0].translations_en!.bdb).toBe('Original')
    expect(restored.requests[0].nextPage).toBe(2)
    restored.requests[0].results[0].writerMeta!.english = 'changed again'
    restored.requests.splice(0)
    expect(getGurbaniSearchSession('query')!.requests[0].results[0].writerMeta!.english).toBe('Original writer')
  })

  test('shares repeated payloads within its budget without collapsing different verse metadata', () => {
    const large = result(1, { translation_en: 'x'.repeat(GURBANI_SEARCH_SESSION_MAX_BYTES / 5) })
    const saved = snapshot([large])
    saved.requests.push(...Array.from({ length: 3 }, (_, index) => ({
      ...saved.requests[0],
      request: { ...saved.requests[0].request, id: `related-${index}` },
      results: [{ ...large }],
      nextPage: index + 3,
    })))
    saved.requests[3].results.push(result(1, { translation_en: 'Corrected translation', translations_en: { ms: 'Different source text' } }))
    rememberGurbaniSearchSession('query', saved)
    const restored = getGurbaniSearchSession('query')!
    expect(restored.requests).toHaveLength(4)
    expect(restored.requests.map(state => state.nextPage)).toEqual([2, 3, 4, 5])
    expect(restored.requests[2].results[0].translation_en).toHaveLength(large.translation_en.length)
    expect(restored.requests[3].results[1].translations_en).toEqual({ ms: 'Different source text' })
  })

  test('expires five minutes after save even if the session was recently read', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    rememberGurbaniSearchSession('query', snapshot())
    vi.advanceTimersByTime(GURBANI_SEARCH_SESSION_LIFETIME_MS - 1)
    expect(getGurbaniSearchSession('query')).not.toBeNull()
    vi.advanceTimersByTime(1)
    expect(getGurbaniSearchSession('query')).toBeNull()
  })

  test('keeps at most six sessions and evicts the least recently used', () => {
    for (let index = 0; index < 6; index += 1) rememberGurbaniSearchSession(String(index), snapshot())
    expect(getGurbaniSearchSession('0')).not.toBeNull()
    rememberGurbaniSearchSession('6', snapshot())
    expect(getGurbaniSearchSession('1')).toBeNull()
    expect(getGurbaniSearchSession('0')).not.toBeNull()
    expect(getGurbaniSearchSession('6')).not.toBeNull()
  })

  test('enforces a shared byte budget across sessions and retains the latest full snapshot', () => {
    const large = snapshot([result(1, { translation_en: 'x'.repeat(GURBANI_SEARCH_SESSION_MAX_BYTES / 5) })])
    rememberGurbaniSearchSession('first', large)
    rememberGurbaniSearchSession('second', large)
    rememberGurbaniSearchSession('third', large)
    expect(getGurbaniSearchSession('first')).toBeNull()
    expect(getGurbaniSearchSession('second')).not.toBeNull()
    expect(getGurbaniSearchSession('third')).not.toBeNull()
  })

  test('an oversized replacement removes stale earlier pages without evicting unrelated sessions', () => {
    rememberGurbaniSearchSession('query', snapshot())
    rememberGurbaniSearchSession('other', snapshot())
    rememberGurbaniSearchSession('query', snapshot([result(1, { translation_en: 'x'.repeat(GURBANI_SEARCH_SESSION_MAX_BYTES / 2) })]))
    expect(getGurbaniSearchSession('query')).toBeNull()
    expect(getGurbaniSearchSession('other')).not.toBeNull()
  })

  test('restores settled failures with successful pages and exact retry cursors', () => {
    const saved = snapshot([result(1), result(2)])
    saved.requests[0] = { ...saved.requests[0], nextPage: 3, error: true, issue: 'offline', failedPage: 3 }
    saved.requests.push({
      ...snapshot().requests[0],
      request: { ...saved.requests[0].request, id: 'related', query: 'command', related: true },
    }, {
      ...snapshot([]).requests[0],
      request: { ...saved.requests[0].request, id: 'seed', searchType: 8, kind: 'transliteration' },
      completed: false, error: true, issue: 'qa-fault', failedPage: 1, nextPage: null,
    })
    saved.failures = 2
    rememberGurbaniSearchSession('query', snapshot())
    rememberGurbaniSearchSession('query', saved)
    expect(getGurbaniSearchSession('query')).toEqual(saved)
  })

  test('retains retry state even when every initial request failed', () => {
    const saved = snapshot([])
    saved.requests[0] = { ...saved.requests[0], completed: false, error: true, failedPage: 1, nextPage: null, issue: 'unavailable' }
    saved.failures = 1
    rememberGurbaniSearchSession('query', saved)
    expect(getGurbaniSearchSession('query')).toEqual(saved)
  })

  test('preserves pending requests alongside already available results for resuming after Back', () => {
    const saved = snapshot()
    saved.requests.push({
      ...snapshot([]).requests[0],
      request: { ...saved.requests[0].request, id: 'pending' },
      completed: false, nextPage: null,
    })
    rememberGurbaniSearchSession('query', saved)
    expect(getGurbaniSearchSession('query')).toEqual(saved)
  })

  test('allows an entirely pending snapshot to resume all initial requests', () => {
    const saved = snapshot([])
    saved.requests[0] = { ...saved.requests[0], completed: false, nextPage: null }
    rememberGurbaniSearchSession('query', saved)
    expect(getGurbaniSearchSession('query')).toEqual(saved)
  })

  test.each(['aggregate', 'missing-retry-page', 'invalid-retry-page', 'failed-page', 'pending-results', 'pending-cursor'] as const)('rejects %s state and removes stale replacements', kind => {
    rememberGurbaniSearchSession('query', snapshot())
    const failed = snapshot()
    if (kind === 'aggregate') failed.failures = 1
    if (kind === 'missing-retry-page' || kind === 'invalid-retry-page') {
      failed.requests[0].error = true
      failed.requests[0].failedPage = kind === 'invalid-retry-page' ? 0 : null
      failed.failures = 1
    }
    if (kind === 'failed-page') failed.requests[0].failedPage = 2
    if (kind === 'pending-results') {
      failed.requests[0].completed = false
      failed.requests[0].nextPage = null
    }
    if (kind === 'pending-cursor') {
      failed.requests[0].completed = false
      failed.requests[0].results = []
    }
    rememberGurbaniSearchSession('query', failed)
    expect(getGurbaniSearchSession('query')).toBeNull()
  })

  test('clearing and replacing sessions releases the byte budget', () => {
    const large = snapshot([result(1, { translation_en: 'x'.repeat(GURBANI_SEARCH_SESSION_MAX_BYTES / 5) })])
    rememberGurbaniSearchSession('query', large)
    rememberGurbaniSearchSession('query', large)
    rememberGurbaniSearchSession('other', large)
    expect(getGurbaniSearchSession('query')).not.toBeNull()
    clearGurbaniSearchSessions()
    expect(getGurbaniSearchSession('query')).toBeNull()
    rememberGurbaniSearchSession('first', large)
    rememberGurbaniSearchSession('second', large)
    expect(getGurbaniSearchSession('first')).not.toBeNull()
    expect(getGurbaniSearchSession('second')).not.toBeNull()
  })
})
