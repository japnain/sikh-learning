import { create } from 'zustand'
import { createLocalCollection } from '../utils/localCollection'
import { createNaamrasObjectId } from '../supabase/device'
import type { SavedMutationResult } from './bookmarks'
import {
  canUseLegacySavedLocationFallback,
  getSavedReturnIdentity,
  isSafeSavedReturnPath,
} from '../utils/savedRouteIdentity'
import { queueActivityEvent } from './activityEvents'
import { useSavedFeedbackStore } from './savedFeedback'

type ScriptureSource = 'G' | 'D' | 'B' | 'A'
export type FavoriteRouteMode = 'canonical' | 'shabad' | 'verse'

export interface FavoriteItem {
  id: string
  title: string
  source: ScriptureSource
  ang: number
  shabadId?: number
  verseId?: number
  type: 'ang' | 'shabad' | 'bani'
  routeMode: FavoriteRouteMode
  excerpt?: string
  transliteration?: string
  translation_en?: string
  translation_hi?: string
  translation_pa?: string
  returnPath?: string
  savedAt: string
}

export type NewFavoriteItem = Omit<FavoriteItem, 'id' | 'savedAt' | 'routeMode'> & {
  routeMode?: FavoriteRouteMode
}

interface FavoritesState {
  favorites: FavoriteItem[]
  hydrateCachedFavorites: () => void
  replaceFavorites: (favorites: FavoriteItem[]) => boolean
  addFavorite: (item: NewFavoriteItem) => SavedMutationResult<FavoriteItem>
  restoreFavorite: (item: FavoriteItem) => SavedMutationResult<FavoriteItem>
  removeFavorite: (id: string) => SavedMutationResult<FavoriteItem>
  isFavorite: (
    source: FavoriteItem['source'],
    ang: number,
    shabadId?: number,
    verseId?: number,
    routeMode?: FavoriteRouteMode
  ) => boolean
}

const FAVORITES_STORAGE_KEY = 'sikh-favorites'

export function resolveFavoriteRouteMode(
  favorite: Pick<FavoriteItem, 'shabadId' | 'verseId'> & { routeMode?: FavoriteRouteMode }
): FavoriteRouteMode {
  return favorite.routeMode
    ?? (favorite.verseId ? 'verse' : favorite.shabadId ? 'shabad' : 'canonical')
}

function isOptionalString(value: unknown) {
  return value === undefined || typeof value === 'string'
}

function normalizeStoredFavorite(value: unknown): FavoriteItem | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const candidate = value as Partial<FavoriteItem> & Record<string, unknown>
  if (
    typeof candidate.id !== 'string'
    || candidate.id.length === 0
    || typeof candidate.title !== 'string'
    || !['G', 'D', 'B', 'A'].includes(String(candidate.source))
    || !Number.isSafeInteger(candidate.ang)
    || Number(candidate.ang) <= 0
    || !['ang', 'shabad', 'bani'].includes(String(candidate.type))
    || typeof candidate.savedAt !== 'string'
    || !Number.isFinite(Date.parse(candidate.savedAt))
    || (candidate.shabadId !== undefined && (!Number.isSafeInteger(candidate.shabadId) || Number(candidate.shabadId) <= 0))
    || (candidate.verseId !== undefined && (!Number.isSafeInteger(candidate.verseId) || Number(candidate.verseId) <= 0))
    || !isOptionalString(candidate.excerpt)
    || !isOptionalString(candidate.transliteration)
    || !isOptionalString(candidate.translation_en)
    || !isOptionalString(candidate.translation_hi)
    || !isOptionalString(candidate.translation_pa)
  ) {
    return null
  }

  const routeMode = resolveFavoriteRouteMode(candidate)
  if (routeMode === 'verse' && (!candidate.shabadId || !candidate.verseId)) return null
  if (routeMode === 'shabad' && !candidate.shabadId) return null

  return {
    id: candidate.id,
    title: candidate.title,
    source: candidate.source as ScriptureSource,
    ang: Number(candidate.ang),
    shabadId: candidate.shabadId,
    verseId: candidate.verseId,
    type: candidate.type as FavoriteItem['type'],
    routeMode,
    excerpt: candidate.excerpt,
    transliteration: candidate.transliteration,
    translation_en: candidate.translation_en,
    translation_hi: candidate.translation_hi,
    translation_pa: candidate.translation_pa,
    returnPath: isSafeSavedReturnPath(candidate.returnPath) ? candidate.returnPath : undefined,
    savedAt: candidate.savedAt,
  }
}

export function normalizeStoredFavorites(value: unknown): FavoriteItem[] {
  const values = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && 'state' in value
      ? (value as { state?: { favorites?: unknown } }).state?.favorites
      : []

  if (!Array.isArray(values)) return []

  const normalized = values
    .map(normalizeStoredFavorite)
    .filter((favorite): favorite is FavoriteItem => favorite !== null)
  const ids = new Set<string>()
  return normalized.filter(favorite => {
    if (ids.has(favorite.id)) return false
    ids.add(favorite.id)
    return true
  })
}

const favoriteCollection = createLocalCollection<FavoriteItem>({
  storageKey: FAVORITES_STORAGE_KEY,
  getId: favorite => favorite.id,
  normalize: normalizeStoredFavorite,
  readLegacy: raw => normalizeStoredFavorites(JSON.parse(raw ?? 'null')),
  // Preserve the existing envelope for older clients and portable backups.
  serializeLegacy: favorites => JSON.stringify({ state: { favorites }, version: 1 }),
})

function sameFavoriteLocation(left: FavoriteItem, right: NewFavoriteItem | FavoriteItem) {
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

  const leftMode = resolveFavoriteRouteMode(left)
  const rightMode = resolveFavoriteRouteMode(right)
  if (left.source !== right.source || left.ang !== right.ang || leftMode !== rightMode) return false
  if (rightMode === 'verse') return left.shabadId === right.shabadId && left.verseId === right.verseId
  if (rightMode === 'shabad') return left.shabadId === right.shabadId
  return true
}

function queueFavoriteActivity(eventType: 'added' | 'removed', favorite: FavoriteItem, occurredAt?: string) {
  try {
    queueActivityEvent(`saved-item.favorite.${eventType}`, {
      favoriteId: favorite.id,
      source: favorite.source,
      ang: favorite.ang,
      shabadId: favorite.shabadId ?? null,
      verseId: favorite.verseId ?? null,
      type: favorite.type,
      routeMode: favorite.routeMode,
      returnPath: favorite.returnPath ?? null,
    }, occurredAt)
  } catch {
    // Saved actions stay usable when the optional sync activity queue cannot
    // grow because device storage is full or restricted.
  }
}

export const useFavoritesStore = create<FavoritesState>()((set, get) => ({
  favorites: [],
  hydrateCachedFavorites: () => {
    const favorites = favoriteCollection.read(get().favorites)
    if (JSON.stringify(favorites) !== JSON.stringify(get().favorites)) set({ favorites })
  },
  replaceFavorites: favorites => {
    const normalized = normalizeStoredFavorites(favorites)
    const result = favoriteCollection.replace(normalized, undefined, get().favorites)
    if (result.persisted) set({ favorites: result.items })
    return result.persisted
  },
  addFavorite: input => {
    const current = favoriteCollection.read(get().favorites)
    const existing = current.find(item => sameFavoriteLocation(item, input)) ?? null
    if (existing) {
      const result = favoriteCollection.put(existing, current)
      set({ favorites: result.items })
      return { item: existing, changed: false, persisted: result.persisted }
    }

    const favorite: FavoriteItem = {
      ...input,
      routeMode: resolveFavoriteRouteMode(input),
      id: createNaamrasObjectId('favorite'),
      savedAt: new Date().toISOString(),
    }
    const result = favoriteCollection.put(favorite, current)
    set({ favorites: result.items })
    const persisted = result.persisted
    useSavedFeedbackStore.getState().recordSaved({
      kind: 'favorite',
      targetId: favorite.id,
      surfacedAt: favorite.savedAt,
    })
    queueFavoriteActivity('added', favorite, favorite.savedAt)
    return { item: favorite, changed: true, persisted }
  },
  restoreFavorite: favorite => {
    const current = favoriteCollection.read(get().favorites)
    const existing = current.find(item => sameFavoriteLocation(item, favorite)) ?? null
    if (existing) {
      const result = favoriteCollection.put(existing, current)
      set({ favorites: result.items })
      return { item: existing, changed: false, persisted: result.persisted }
    }
    const normalized = normalizeStoredFavorite(favorite)
    if (!normalized) return { item: null, changed: false, persisted: false }
    const result = favoriteCollection.put(normalized, current)
    set({ favorites: result.items })
    const persisted = result.persisted
    queueFavoriteActivity('added', normalized)
    return { item: normalized, changed: true, persisted }
  },
  removeFavorite: id => {
    const current = favoriteCollection.read(get().favorites)
    const favorite = current.find(item => item.id === id) ?? null
    if (!favorite) {
      const result = favoriteCollection.remove(id, current)
      set({ favorites: result.items })
      return { item: null, changed: false, persisted: result.persisted }
    }

    const result = favoriteCollection.remove(id, current)
    set({ favorites: result.items })
    const persisted = result.persisted
    queueFavoriteActivity('removed', favorite)
    return { item: favorite, changed: true, persisted }
  },
  isFavorite: (source, ang, shabadId, verseId, routeMode) => {
    const requestedRouteMode = resolveFavoriteRouteMode({ shabadId, verseId, routeMode })
    return get().favorites.some(item => sameFavoriteLocation(item, {
      title: '',
      type: 'ang',
      source,
      ang,
      shabadId,
      verseId,
      routeMode: requestedRouteMode,
    }))
  },
}))

const setMemory = useFavoritesStore.setState
useFavoritesStore.setState = ((...args: Parameters<typeof setMemory>) => {
  favoriteCollection.clearPending()
  setMemory(...args)
}) as typeof setMemory

const unsubscribeFavorites = favoriteCollection.subscribe(favorites => {
  if (JSON.stringify(favorites) !== JSON.stringify(useFavoritesStore.getState().favorites)) {
    setMemory({ favorites })
  }
})
if (import.meta.hot) import.meta.hot.dispose(unsubscribeFavorites)
