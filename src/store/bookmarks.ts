import { create } from 'zustand'
import { createLocalCollection } from '../utils/localCollection'
import { persistBookmarkToCloud, removeBookmarkFromCloud } from '../supabase/bookmarks'
import { createNaamrasObjectId } from '../supabase/device'
import {
  canUseLegacySavedLocationFallback,
  getSavedReturnIdentity,
  isSafeSavedReturnPath,
} from '../utils/savedRouteIdentity'
import { queueActivityEvent } from './activityEvents'
import { useSavedFeedbackStore } from './savedFeedback'

type ScriptureSource = 'G' | 'D' | 'B' | 'A'

interface BookmarkBase {
  id: string
  title: string
  excerpt?: string
  description?: string
  transliteration?: string
  translation_en?: string
  translation_hi?: string
  translation_pa?: string
  returnPath?: string
  savedAt: string
}

export interface ScriptureBookmark extends BookmarkBase {
  type: 'shabad' | 'bani' | 'verse'
  source: ScriptureSource
  ang: number
  shabadId?: number
  verseId?: number
}

export interface BookBookmark extends BookmarkBase {
  type: 'book'
  workId: string
  chapterId: string
  chapterLabel: string
  blockId?: string
}

export type Bookmark = ScriptureBookmark | BookBookmark
export type NewBookmark = Bookmark extends infer Item
  ? Item extends Bookmark
    ? Omit<Item, 'id' | 'savedAt'>
    : never
  : never

export interface SavedMutationResult<T> {
  item: T | null
  changed: boolean
  persisted: boolean
}

const BOOKMARK_STORAGE_KEY = 'sikh-bookmarks'

export { getSavedReturnIdentity, isSafeSavedReturnPath } from '../utils/savedRouteIdentity'

export function isBookBookmark(bookmark: Bookmark): bookmark is BookBookmark {
  return bookmark.type === 'book'
}

export function isScriptureBookmark(bookmark: Bookmark): bookmark is ScriptureBookmark {
  return bookmark.type !== 'book'
}

function isOptionalString(value: unknown) {
  return value === undefined || typeof value === 'string'
}

function normalizeStoredBookmark(value: unknown): Bookmark | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const candidate = value as Partial<Bookmark> & Record<string, unknown>
  if (
    typeof candidate.id !== 'string'
    || candidate.id.length === 0
    || typeof candidate.title !== 'string'
    || typeof candidate.savedAt !== 'string'
    || !Number.isFinite(Date.parse(candidate.savedAt))
    || !isOptionalString(candidate.excerpt)
    || !isOptionalString(candidate.description)
    || !isOptionalString(candidate.transliteration)
    || !isOptionalString(candidate.translation_en)
    || !isOptionalString(candidate.translation_hi)
    || !isOptionalString(candidate.translation_pa)
  ) {
    return null
  }

  const returnPath = isSafeSavedReturnPath(candidate.returnPath) ? candidate.returnPath : undefined

  if (candidate.type === 'book') {
    if (
      typeof candidate.workId !== 'string'
      || candidate.workId.length === 0
      || typeof candidate.chapterId !== 'string'
      || candidate.chapterId.length === 0
      || typeof candidate.chapterLabel !== 'string'
      || candidate.chapterLabel.length === 0
      || !isOptionalString(candidate.blockId)
    ) {
      return null
    }

    return {
      id: candidate.id,
      type: 'book',
      title: candidate.title,
      workId: candidate.workId,
      chapterId: candidate.chapterId,
      chapterLabel: candidate.chapterLabel,
      blockId: candidate.blockId,
      excerpt: candidate.excerpt,
      description: candidate.description,
      returnPath: returnPath ?? `/library/${candidate.workId}/chapters/${candidate.chapterId}${candidate.blockId ? `#${encodeURIComponent(candidate.blockId)}` : ''}`,
      savedAt: candidate.savedAt,
    }
  }

  if (
    candidate.type !== 'shabad'
    && candidate.type !== 'bani'
    && candidate.type !== 'verse'
  ) {
    return null
  }

  if (
    !['G', 'D', 'B', 'A'].includes(String(candidate.source))
    || !Number.isSafeInteger(candidate.ang)
    || Number(candidate.ang) <= 0
    || (candidate.shabadId !== undefined && (!Number.isSafeInteger(candidate.shabadId) || Number(candidate.shabadId) <= 0))
    || (candidate.verseId !== undefined && (!Number.isSafeInteger(candidate.verseId) || Number(candidate.verseId) <= 0))
  ) {
    return null
  }

  return {
    id: candidate.id,
    type: candidate.type,
    title: candidate.title,
    source: candidate.source as ScriptureSource,
    ang: Number(candidate.ang),
    shabadId: candidate.shabadId,
    verseId: candidate.verseId,
    excerpt: candidate.excerpt,
    description: candidate.description,
    transliteration: candidate.transliteration,
    translation_en: candidate.translation_en,
    translation_hi: candidate.translation_hi,
    translation_pa: candidate.translation_pa,
    returnPath,
    savedAt: candidate.savedAt,
  }
}

export function normalizeStoredBookmarks(value: unknown): Bookmark[] {
  const values = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && 'state' in value
      ? (value as { state?: { bookmarks?: unknown } }).state?.bookmarks
      : []

  if (!Array.isArray(values)) return []

  const normalized = values
    .map(normalizeStoredBookmark)
    .filter((bookmark): bookmark is Bookmark => bookmark !== null)
  const ids = new Set<string>()
  return normalized.filter(bookmark => {
    if (ids.has(bookmark.id)) return false
    ids.add(bookmark.id)
    return true
  })
}

const bookmarkCollection = createLocalCollection<Bookmark>({
  storageKey: BOOKMARK_STORAGE_KEY,
  getId: bookmark => bookmark.id,
  normalize: normalizeStoredBookmark,
  readLegacy: raw => normalizeStoredBookmarks(JSON.parse(raw ?? 'null')),
  serializeLegacy: bookmarks => JSON.stringify(bookmarks),
})

function sameBookmarkLocation(left: Bookmark, right: NewBookmark | Bookmark) {
  if (left.type === 'book' || right.type === 'book') {
    return left.type === 'book'
      && right.type === 'book'
      && left.workId === right.workId
      && left.chapterId === right.chapterId
  }

  const leftRouteIdentity = getSavedReturnIdentity(left.returnPath)
  const rightRouteIdentity = getSavedReturnIdentity(right.returnPath)
  if (leftRouteIdentity && rightRouteIdentity) {
    return leftRouteIdentity === rightRouteIdentity
  }
  if (
    (leftRouteIdentity || rightRouteIdentity)
    && !canUseLegacySavedLocationFallback(leftRouteIdentity ? left.returnPath : right.returnPath)
  ) {
    return false
  }

  if (left.source !== right.source || left.ang !== right.ang) return false
  if (right.verseId) return left.verseId === right.verseId
  if (right.shabadId) return !left.verseId && left.shabadId === right.shabadId
  return !left.verseId && !left.shabadId
}

interface BookmarksState {
  bookmarks: Bookmark[]
  hydrateCachedBookmarks: () => void
  replaceBookmarks: (bookmarks: Bookmark[]) => boolean
  addBookmark: (bookmark: NewBookmark) => SavedMutationResult<Bookmark>
  restoreBookmark: (bookmark: Bookmark) => SavedMutationResult<Bookmark>
  removeBookmark: (id: string) => SavedMutationResult<Bookmark>
  hasBookmark: (source: ScriptureSource, ang: number, verseId?: number) => boolean
  getBookBookmark: (workId: string, chapterId: string) => BookBookmark | null
}

function queueBookmarkActivity(eventType: 'added' | 'removed', bookmark: Bookmark, occurredAt?: string) {
  try {
    if (bookmark.type === 'book') {
      queueActivityEvent(`saved-item.bookmark.${eventType}`, {
        bookmarkId: bookmark.id,
        bookmarkType: 'book',
        workId: bookmark.workId,
        chapterId: bookmark.chapterId,
        blockId: bookmark.blockId ?? null,
        returnPath: bookmark.returnPath ?? null,
      }, occurredAt)
      return
    }

    queueActivityEvent(`saved-item.bookmark.${eventType}`, {
      bookmarkId: bookmark.id,
      bookmarkType: bookmark.type,
      source: bookmark.source,
      ang: bookmark.ang,
      verseId: bookmark.verseId ?? null,
      shabadId: bookmark.shabadId ?? null,
      returnPath: bookmark.returnPath ?? null,
    }, occurredAt)
  } catch {
    // The saved mutation already reports local durability separately. A full
    // activity queue must never turn that recoverable state into a crash.
  }
}

export const useBookmarksStore = create<BookmarksState>()((set, get) => ({
  bookmarks: [],
  hydrateCachedBookmarks: () => {
    const bookmarks = bookmarkCollection.read(get().bookmarks)
    if (JSON.stringify(bookmarks) !== JSON.stringify(get().bookmarks)) set({ bookmarks })
  },
  replaceBookmarks: (bookmarks) => {
    const normalized = normalizeStoredBookmarks(bookmarks)
    const result = bookmarkCollection.replace(normalized, undefined, get().bookmarks)
    if (result.persisted) set({ bookmarks: result.items })
    return result.persisted
  },
  addBookmark: (input) => {
    const current = bookmarkCollection.read(get().bookmarks)
    const existing = current.find(bookmark => sameBookmarkLocation(bookmark, input)) ?? null
    if (existing) {
      const result = bookmarkCollection.put(existing, current)
      set({ bookmarks: result.items })
      return { item: existing, changed: false, persisted: result.persisted }
    }

    const bookmark = {
      ...input,
      id: createNaamrasObjectId('bookmark'),
      savedAt: new Date().toISOString(),
    } as Bookmark
    const result = bookmarkCollection.put(bookmark, current)
    set({ bookmarks: result.items })
    const persisted = result.persisted
    useSavedFeedbackStore.getState().recordSaved({
      kind: 'bookmark',
      targetId: bookmark.id,
      surfacedAt: bookmark.savedAt,
    })
    queueBookmarkActivity('added', bookmark, bookmark.savedAt)
    void persistBookmarkToCloud(bookmark).catch(() => undefined)
    return { item: bookmark, changed: true, persisted }
  },
  restoreBookmark: (bookmark) => {
    const normalized = normalizeStoredBookmark(bookmark)
    if (!normalized) return { item: null, changed: false, persisted: false }
    const current = bookmarkCollection.read(get().bookmarks)
    const existing = current.find(item => sameBookmarkLocation(item, normalized)) ?? null
    if (existing) {
      const result = bookmarkCollection.put(existing, current)
      set({ bookmarks: result.items })
      return { item: existing, changed: false, persisted: result.persisted }
    }
    const result = bookmarkCollection.put(normalized, current)
    set({ bookmarks: result.items })
    const persisted = result.persisted
    queueBookmarkActivity('added', normalized)
    void persistBookmarkToCloud(normalized).catch(() => undefined)
    return { item: normalized, changed: true, persisted }
  },
  removeBookmark: (id) => {
    const current = bookmarkCollection.read(get().bookmarks)
    const bookmark = current.find(item => item.id === id) ?? null
    if (!bookmark) {
      const result = bookmarkCollection.remove(id, current)
      set({ bookmarks: result.items })
      return { item: null, changed: false, persisted: result.persisted }
    }

    const result = bookmarkCollection.remove(id, current)
    set({ bookmarks: result.items })
    const persisted = result.persisted
    queueBookmarkActivity('removed', bookmark)
    void removeBookmarkFromCloud(bookmark).catch(() => undefined)
    return { item: bookmark, changed: true, persisted }
  },
  hasBookmark: (source, ang, verseId) =>
    get().bookmarks.some(bookmark =>
      bookmark.type !== 'book'
      && bookmark.source === source
      && bookmark.ang === ang
      && (verseId ? bookmark.verseId === verseId : !bookmark.verseId)
    ),
  getBookBookmark: (workId, chapterId) => {
    const bookmark = get().bookmarks.find(bookmark => (
    bookmark.type === 'book'
    && bookmark.workId === workId
    && bookmark.chapterId === chapterId
    ))
    return bookmark?.type === 'book' ? bookmark : null
  },
}))

const setMemory = useBookmarksStore.setState
useBookmarksStore.setState = ((...args: Parameters<typeof setMemory>) => {
  bookmarkCollection.clearPending()
  setMemory(...args)
}) as typeof setMemory

const unsubscribeBookmarks = bookmarkCollection.subscribe(bookmarks => {
  if (JSON.stringify(bookmarks) !== JSON.stringify(useBookmarksStore.getState().bookmarks)) {
    setMemory({ bookmarks })
  }
})
if (import.meta.hot) import.meta.hot.dispose(unsubscribeBookmarks)
