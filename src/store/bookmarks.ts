import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Bookmark {
  id: string
  type: 'shabad' | 'bani'
  title: string
  source: 'G' | 'D'
  ang: number
  description?: string
  savedAt: string
}

interface BookmarksState {
  bookmarks: Bookmark[]
  addBookmark: (b: Omit<Bookmark, 'id' | 'savedAt'>) => void
  removeBookmark: (id: string) => void
  hasBookmark: (source: 'G' | 'D', ang: number) => boolean
}

export const useBookmarksStore = create<BookmarksState>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      addBookmark: (b) => {
        if (get().hasBookmark(b.source, b.ang)) return
        set(state => ({
          bookmarks: [...state.bookmarks, {
            ...b,
            id: `bookmark-${Date.now()}`,
            savedAt: new Date().toISOString(),
          }],
        }))
      },
      removeBookmark: (id) => set(state => ({
        bookmarks: state.bookmarks.filter(b => b.id !== id),
      })),
      hasBookmark: (source, ang) =>
        get().bookmarks.some(b => b.source === source && b.ang === ang),
    }),
    { name: 'sikh-bookmarks' }
  )
)
