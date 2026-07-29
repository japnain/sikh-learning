import { create } from 'zustand'
import { persistBookmarkToCloud, removeBookmarkFromCloud } from '../supabase/bookmarks'
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
  if (typeof window === 'undefined') return false

  try {
    return typeof window.localStorage !== 'undefined'
  } catch {
    return false
  }
}

function isStoredBookmark(value: unknown): value is Bookmark {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  const candidate = value as Partial<Bookmark>
  return typeof candidate.id === 'string'
    && candidate.id.length > 0
    && ['shabad', 'bani', 'verse'].includes(candidate.type ?? '')
    && typeof candidate.title === 'string'
    && ['G', 'D', 'B', 'A'].includes(candidate.source ?? '')
    && Number.isSafeInteger(candidate.ang)
    && Number(candidate.ang) > 0
    && (candidate.shabadId === undefined || (Number.isSafeInteger(candidate.shabadId) && Number(candidate.shabadId) > 0))
    && (candidate.verseId === undefined || (Number.isSafeInteger(candidate.verseId) && Number(candidate.verseId) > 0))
    && (candidate.excerpt === undefined || typeof candidate.excerpt === 'string')
    && (candidate.description === undefined || typeof candidate.description === 'string')
    && typeof candidate.savedAt === 'string'
    && Number.isFinite(Date.parse(candidate.savedAt))
}

function normalizeStoredBookmarks(value: unknown): Bookmark[] {
  if (Array.isArray(value)) {
    return value.filter(isStoredBookmark)
  }

  if (value && typeof value === 'object' && 'state' in value) {
    const state = (value as { state?: { bookmarks?: unknown } }).state
    if (Array.isArray(state?.bookmarks)) {
      return state.bookmarks.filter(isStoredBookmark)
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
    const alreadySaved = get().bookmarks.some(bookmark => {
      if (bookmark.source !== b.source || bookmark.ang !== b.ang) return false
      if (b.verseId) return bookmark.verseId === b.verseId
      if (b.shabadId) return !bookmark.verseId && bookmark.shabadId === b.shabadId
      return !bookmark.verseId && !bookmark.shabadId
    })
    if (alreadySaved) return

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
