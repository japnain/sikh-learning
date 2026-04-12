import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { queueActivityEvent } from './activityEvents'

export interface Bookmark {
  id: string
  type: 'shabad' | 'bani' | 'verse'
  title: string
  source: 'G' | 'D' | 'B' | 'A'
  ang: number
  shabadId?: number
  verseId?: number
  excerpt?: string
  description?: string
  savedAt: string
}

interface BookmarksState {
  bookmarks: Bookmark[]
  addBookmark: (b: Omit<Bookmark, 'id' | 'savedAt'>) => void
  removeBookmark: (id: string) => void
  hasBookmark: (source: 'G' | 'D' | 'B' | 'A', ang: number, verseId?: number) => boolean
}

export const useBookmarksStore = create<BookmarksState>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      addBookmark: (b) => {
        if (get().hasBookmark(b.source, b.ang, b.verseId)) return
        const bookmark = {
          ...b,
          id: `bookmark-${Date.now()}`,
          savedAt: new Date().toISOString(),
        }
        set(state => ({
          bookmarks: [...state.bookmarks, bookmark],
        }))
        queueActivityEvent('saved-item.bookmark.added', {
          bookmarkId: bookmark.id,
          source: bookmark.source,
          ang: bookmark.ang,
          verseId: bookmark.verseId ?? null,
          shabadId: bookmark.shabadId ?? null,
        }, bookmark.savedAt)
      },
      removeBookmark: (id) => {
        const bookmark = get().bookmarks.find(item => item.id === id)
        set(state => ({
          bookmarks: state.bookmarks.filter(b => b.id !== id),
        }))
        if (bookmark) {
          queueActivityEvent('saved-item.bookmark.removed', {
            bookmarkId: bookmark.id,
            source: bookmark.source,
            ang: bookmark.ang,
            verseId: bookmark.verseId ?? null,
            shabadId: bookmark.shabadId ?? null,
          })
        }
      },
      hasBookmark: (source, ang, verseId) =>
        get().bookmarks.some(b =>
          b.source === source
          && b.ang === ang
          && (verseId ? b.verseId === verseId : !b.verseId)
        ),
    }),
    { name: 'sikh-bookmarks' }
  )
)
