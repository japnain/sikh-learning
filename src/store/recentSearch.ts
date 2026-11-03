import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SearchMode } from '../types'
import { isDirectLookupQuery, type SearchSource } from '../utils/appSearch'
import { SEARCH_SCOPES, type SearchScope } from '../content/readSearchCopy'

export interface RecentSearchItem {
  query: string
  mode: SearchMode
  source: SearchSource
  scope: SearchScope
  pinned: boolean
  savedAt: string
}

export interface RecentSearchState {
  recent: RecentSearchItem[]
  addRecent: (query: string, mode: SearchMode, source: SearchSource, scope?: SearchScope) => void
  togglePinned: (query: string, mode: SearchMode, source: SearchSource, scope?: SearchScope) => void
  clearRecent: () => void
}

const SEARCH_MODES = new Set<SearchMode>([
  'first-letters',
  'first-letters-anywhere',
  'gurmukhi',
  'english',
  'transliteration',
  'ang',
  'auto-detect',
])
const SEARCH_SOURCES = new Set<SearchSource>(['all', 'G', 'D', 'B', 'A'])

function normalizeStoredMode(value: unknown): SearchMode {
  return typeof value === 'string' && SEARCH_MODES.has(value as SearchMode)
    ? value as SearchMode
    : 'auto-detect'
}

function normalizeStoredSource(value: unknown): SearchSource {
  return typeof value === 'string' && SEARCH_SOURCES.has(value as SearchSource)
    ? value as SearchSource
    : 'all'
}

function getRecentIdentity(item: Pick<RecentSearchItem, 'query' | 'mode' | 'source' | 'scope'>) {
  return `${item.query}\u0000${item.mode}\u0000${item.source}\u0000${item.scope}`
}

export function migrateRecentSearchState(persistedState: unknown) {
  const persistedRecent = (
    typeof persistedState === 'object'
    && persistedState !== null
    && Array.isArray((persistedState as { recent?: unknown }).recent)
  )
    ? (persistedState as { recent: unknown[] }).recent
    : []
  const seen = new Set<string>()
  const recent = persistedRecent.flatMap((candidate): RecentSearchItem[] => {
    if (typeof candidate !== 'object' || candidate === null) return []

    const item = candidate as Record<string, unknown>
    const query = typeof item.query === 'string' ? item.query.trim() : ''
    if (!query) return []

    const normalized: RecentSearchItem = {
      query,
      mode: normalizeStoredMode(item.mode),
      source: normalizeStoredSource(item.source),
      scope: SEARCH_SCOPES.includes(item.scope as SearchScope) ? item.scope as SearchScope : 'all',
      pinned: item.pinned === true,
      savedAt: typeof item.savedAt === 'string' && !Number.isNaN(Date.parse(item.savedAt))
        ? item.savedAt
        : new Date(0).toISOString(),
    }
    const identity = getRecentIdentity(normalized)
    if (seen.has(identity)) return []
    seen.add(identity)
    return [normalized]
  })

  return { recent }
}

export const useRecentSearchStore = create<RecentSearchState>()(
  persist(
    (set, get) => ({
      recent: [],
      addRecent: (query, mode, source, scope = 'all') => {
        const trimmed = query.trim()
        const directLookup = mode === 'ang' || (mode === 'auto-detect' && isDirectLookupQuery(trimmed))
        const scriptureSymbol = trimmed === 'ੴ' && (mode === 'auto-detect' || mode === 'gurmukhi')
        if (!trimmed || (!directLookup && !scriptureSymbol && trimmed.length < 2)) return
        const identity = getRecentIdentity({ query: trimmed, mode, source, scope })
        const existing = get().recent.find(item => getRecentIdentity(item) === identity)
        const current = get().recent.filter(item => getRecentIdentity(item) !== identity)
        set({
          recent: [
            {
              query: trimmed,
              mode,
              source,
              scope,
              pinned: existing?.pinned ?? false,
              savedAt: new Date().toISOString(),
            },
            ...current,
          ]
            .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
            .slice(0, 12),
        })
      },
      togglePinned: (query, mode, source, scope = 'all') => set(state => ({
        recent: state.recent
          .map(item =>
            getRecentIdentity(item) === getRecentIdentity({ query, mode, source, scope })
              ? { ...item, pinned: !item.pinned }
              : item
          )
          .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()),
      })),
      clearRecent: () => set(state => ({ recent: state.recent.filter(item => item.pinned) })),
    }),
    {
      name: 'sikh-recent-search',
      version: 2,
      migrate: persistedState => migrateRecentSearchState(persistedState) as RecentSearchState,
    }
  )
)
