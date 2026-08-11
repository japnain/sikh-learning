import { create } from 'zustand'
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

function canUseStorage() {
  if (typeof window === 'undefined') return false

  try {
    return typeof window.localStorage !== 'undefined'
  } catch {
    return false
  }
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

function readCachedFavorites() {
  if (!canUseStorage()) return []

  try {
    return normalizeStoredFavorites(JSON.parse(window.localStorage.getItem(FAVORITES_STORAGE_KEY) ?? 'null'))
  } catch {
    return []
  }
}

function writeCachedFavorites(favorites: FavoriteItem[]) {
  if (!canUseStorage()) return false

  try {
    // Keep Zustand's legacy envelope so existing clients can move between
    // versions without discarding their favorites.
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify({
      state: { favorites },
      version: 1,
    }))
    return true
  } catch {
    return false
  }
}

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

function setFavorites(
  set: (partial: Partial<FavoritesState> | ((state: FavoritesState) => Partial<FavoritesState>)) => void,
  favorites: FavoriteItem[]
) {
  set({ favorites })
  return writeCachedFavorites(favorites)
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
    set({ favorites: readCachedFavorites() })
  },
  replaceFavorites: favorites => {
    const normalized = normalizeStoredFavorites(favorites)
    const persisted = writeCachedFavorites(normalized)
    if (persisted) set({ favorites: normalized })
    return persisted
  },
  addFavorite: input => {
    const existing = get().favorites.find(item => sameFavoriteLocation(item, input)) ?? null
    if (existing) return { item: existing, changed: false, persisted: writeCachedFavorites(get().favorites) }

    const favorite: FavoriteItem = {
      ...input,
      routeMode: resolveFavoriteRouteMode(input),
      id: createNaamrasObjectId('favorite'),
      savedAt: new Date().toISOString(),
    }
    const persisted = setFavorites(set, [...get().favorites, favorite])
    useSavedFeedbackStore.getState().recordSaved({
      kind: 'favorite',
      targetId: favorite.id,
      surfacedAt: favorite.savedAt,
    })
    queueFavoriteActivity('added', favorite, favorite.savedAt)
    return { item: favorite, changed: true, persisted }
  },
  restoreFavorite: favorite => {
    const existing = get().favorites.find(item => sameFavoriteLocation(item, favorite)) ?? null
    if (existing) return { item: existing, changed: false, persisted: writeCachedFavorites(get().favorites) }
    const normalized = normalizeStoredFavorite(favorite)
    if (!normalized) return { item: null, changed: false, persisted: false }
    const persisted = setFavorites(set, [...get().favorites, normalized])
    queueFavoriteActivity('added', normalized)
    return { item: normalized, changed: true, persisted }
  },
  removeFavorite: id => {
    const favorite = get().favorites.find(item => item.id === id) ?? null
    if (!favorite) return { item: null, changed: false, persisted: true }

    const persisted = setFavorites(set, get().favorites.filter(item => item.id !== id))
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
