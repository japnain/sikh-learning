import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SearchMode } from '../types'

export interface RecentSearchItem {
  query: string
  mode: SearchMode
  pinned: boolean
  savedAt: string
}

interface RecentSearchState {
  recent: RecentSearchItem[]
  addRecent: (query: string, mode: SearchMode) => void
  togglePinned: (query: string, mode: SearchMode) => void
  clearRecent: () => void
}

export const useRecentSearchStore = create<RecentSearchState>()(
  persist(
    (set, get) => ({
      recent: [],
      addRecent: (query, mode) => {
        const trimmed = query.trim()
        if (!trimmed || trimmed.length < 2) return
        const current = get().recent.filter(item => !(item.query === trimmed && item.mode === mode))
        set({
          recent: [
            {
              query: trimmed,
              mode,
              pinned: false,
              savedAt: new Date().toISOString(),
            },
            ...current,
          ]
            .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
            .slice(0, 12),
        })
      },
      togglePinned: (query, mode) => set(state => ({
        recent: state.recent
          .map(item =>
            item.query === query && item.mode === mode
              ? { ...item, pinned: !item.pinned }
              : item
          )
          .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()),
      })),
      clearRecent: () => set({ recent: [] }),
    }),
    { name: 'sikh-recent-search' }
  )
)
