import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface RecentSearchState {
  recent: string[]
  addRecent: (query: string) => void
  clearRecent: () => void
}

export const useRecentSearchStore = create<RecentSearchState>()(
  persist(
    (set, get) => ({
      recent: [],
      addRecent: (query) => {
        const trimmed = query.trim()
        if (!trimmed || trimmed.length < 2) return
        const current = get().recent.filter(q => q !== trimmed)
        set({ recent: [trimmed, ...current].slice(0, 10) })
      },
      clearRecent: () => set({ recent: [] }),
    }),
    { name: 'sikh-recent-search' }
  )
)
