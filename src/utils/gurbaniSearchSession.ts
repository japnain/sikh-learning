import type { SearchResult } from '../api/banidb'
import type { GurbaniSearchRequestState, GurbaniSearchSnapshot } from './gurbaniSearchEngine'

interface SearchSession {
  serialized: string
  bytes: number
  savedAt: number
}
interface PackedSnapshot {
  requests: (Omit<GurbaniSearchRequestState, 'results'> & { resultIndexes: number[] })[]
  rows: SearchResult[]
  failures: number
}

export const GURBANI_SEARCH_SESSION_LIFETIME_MS = 5 * 60 * 1000
export const GURBANI_SEARCH_SESSION_MAX_BYTES = 12 * 1024 * 1024
const sessionLimit = 6

// Short-lived, bounded memory keeps a search intact when returning from a shabad.
// No queries or scripture responses are added to persistent browser storage.
const sessions = new Map<string, SearchSession>()
let storedBytes = 0

function removeSession(key: string) {
  const value = sessions.get(key)
  if (value) storedBytes -= value.bytes
  sessions.delete(key)
}

function removeExpired(now: number) {
  for (const [key, value] of sessions) {
    if (now - value.savedAt >= GURBANI_SEARCH_SESSION_LIFETIME_MS) removeSession(key)
  }
}

function packSnapshot(snapshot: GurbaniSearchSnapshot): string {
  const rows: SearchResult[] = []
  const rowIndexes = new Map<string, number>()
  const requests = snapshot.requests.map(({ results, ...state }) => ({
    ...state,
    resultIndexes: results.map(result => {
      // Identical verses commonly overlap meaning and phonetic requests. Compare
      // their full payload so corrected translations or metadata remain intact.
      const serialized = JSON.stringify(result)
      let index = rowIndexes.get(serialized)
      if (index === undefined) {
        index = rows.length
        rows.push(result)
        rowIndexes.set(serialized, index)
      }
      return index
    }),
  }))
  return JSON.stringify({ requests, rows, failures: snapshot.failures } satisfies PackedSnapshot)
}

export function getGurbaniSearchSession(key: string): GurbaniSearchSnapshot | null {
  removeExpired(Date.now())
  const value = sessions.get(key)
  if (!value) return null
  // Access keeps useful sessions ahead of older ones without extending freshness.
  sessions.delete(key)
  sessions.set(key, value)
  const packed = JSON.parse(value.serialized) as PackedSnapshot
  return {
    failures: packed.failures,
    requests: packed.requests.map(({ resultIndexes, ...state }) => ({
      ...state,
      results: resultIndexes.map(index => packed.rows[index]),
    })),
  }
}

export function rememberGurbaniSearchSession(key: string, snapshot: GurbaniSearchSnapshot) {
  // An invalid or oversized update must not restore an older page set.
  removeSession(key)
  const now = Date.now()
  removeExpired(now)
  const failures = snapshot.requests.filter(state => state.error).length
  if (snapshot.failures !== failures || snapshot.requests.some(state => {
    if (state.error) return !Number.isSafeInteger(state.failedPage) || state.failedPage! < 1
    if (state.failedPage !== null) return true
    return !state.completed && (state.nextPage !== null || state.results.length > 0)
  })) return
  // Settled failures retain their exact retry page alongside successful results.
  // Untouched pending requests can resume after Back without repeating successes.
  const serialized = packSnapshot(snapshot)
  // Count UTF-16 code units conservatively, including the caller's cache key.
  const bytes = (serialized.length + key.length) * 2
  if (bytes > GURBANI_SEARCH_SESSION_MAX_BYTES) return
  sessions.set(key, { serialized, bytes, savedAt: now })
  storedBytes += bytes
  while (sessions.size > sessionLimit || storedBytes > GURBANI_SEARCH_SESSION_MAX_BYTES) {
    removeSession(sessions.keys().next().value!)
  }
}

export function clearGurbaniSearchSessions() {
  sessions.clear()
  storedBytes = 0
}
