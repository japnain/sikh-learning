import { create } from 'zustand'
import { persistBookmarkToCloud, removeBookmarkFromCloud } from '../insforge/bookmarks'
import { queueActivityEvent } from './activityEvents'
import { useSavedFeedbackStore } from './savedFeedback'

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

const BOOKMARK_STORAGE_KEY = 'sikh-bookmarks'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function normalizeStoredBookmarks(value: unknown): Bookmark[] {
  if (Array.isArray(value)) {
    return value as Bookmark[]
  }

  if (value && typeof value === 'object' && 'state' in value) {
    const state = (value as { state?: { bookmarks?: unknown } }).state
    if (Array.isArray(state?.bookmarks)) {
      return state.bookmarks as Bookmark[]
    }
  }

  return []
}

function readCachedBookmarks() {
  if (!canUseStorage()) return []

  try {
    return normalizeStoredBookmarks(JSON.parse(window.localStorage.getItem(BOOKMARK_STORAGE_KEY) ?? 'null'))
  } catch {
    return []
  }
}

function writeCachedBookmarks(bookmarks: Bookmark[]) {
  if (!canUseStorage()) return

  try {
    window.localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks))
  } catch {
    // Ignore cache write failures and keep the in-memory store responsive.
  }
}

interface BookmarksState {
  bookmarks: Bookmark[]
  hydrateCachedBookmarks: () => void
  replaceBookmarks: (bookmarks: Bookmark[]) => void
  addBookmark: (b: Omit<Bookmark, 'id' | 'savedAt'>) => void
  removeBookmark: (id: string) => void
  hasBookmark: (source: 'G' | 'D' | 'B' | 'A', ang: number, verseId?: number) => boolean
}

function setBookmarks(
  set: (partial: Partial<BookmarksState> | ((state: BookmarksState) => Partial<BookmarksState>)) => void,
  bookmarks: Bookmark[]
) {
  set({ bookmarks })
  writeCachedBookmarks(bookmarks)
}

export const useBookmarksStore = create<BookmarksState>()((set, get) => ({
  bookmarks: [],
  hydrateCachedBookmarks: () => {
    set({ bookmarks: readCachedBookmarks() })
  },
  replaceBookmarks: (bookmarks) => {
    setBookmarks(set, bookmarks)
  },
  addBookmark: (b) => {
    if (get().hasBookmark(b.source, b.ang, b.verseId)) return

    const bookmark = {
      ...b,
      id: `bookmark-${Date.now()}`,
      savedAt: new Date().toISOString(),
    }

    setBookmarks(set, [...get().bookmarks, bookmark])
    useSavedFeedbackStore.getState().recordSaved({
      kind: 'bookmark',
      targetId: bookmark.id,
      surfacedAt: bookmark.savedAt,
    })

    queueActivityEvent('saved-item.bookmark.added', {
      bookmarkId: bookmark.id,
      source: bookmark.source,
      ang: bookmark.ang,
      verseId: bookmark.verseId ?? null,
      shabadId: bookmark.shabadId ?? null,
    }, bookmark.savedAt)

    void persistBookmarkToCloud(bookmark).catch(() => undefined)
  },
  removeBookmark: (id) => {
    const bookmark = get().bookmarks.find(item => item.id === id)
    setBookmarks(set, get().bookmarks.filter(b => b.id !== id))

    if (!bookmark) return

    queueActivityEvent('saved-item.bookmark.removed', {
      bookmarkId: bookmark.id,
      source: bookmark.source,
      ang: bookmark.ang,
      verseId: bookmark.verseId ?? null,
      shabadId: bookmark.shabadId ?? null,
    })

    void removeBookmarkFromCloud(bookmark).catch(() => undefined)
  },
  hasBookmark: (source, ang, verseId) =>
    get().bookmarks.some(b =>
      b.source === source
      && b.ang === ang
      && (verseId ? b.verseId === verseId : !b.verseId)
    ),
}))
