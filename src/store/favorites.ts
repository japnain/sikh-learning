import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { queueActivityEvent } from './activityEvents'
import { useSavedFeedbackStore } from './savedFeedback'

export interface FavoriteItem {
  id: string
  title: string
  source: 'G' | 'D' | 'B' | 'A'
  ang: number
  shabadId?: number
  verseId?: number
  type: 'ang' | 'shabad' | 'bani'
  routeMode?: 'canonical' | 'shabad' | 'verse'
  savedAt: string
}

interface FavoritesState {
  favorites: FavoriteItem[]
  addFavorite: (item: Omit<FavoriteItem, 'id' | 'savedAt'>) => void
  removeFavorite: (id: string) => void
  isFavorite: (
    source: FavoriteItem['source'],
    ang: number,
    shabadId?: number,
    verseId?: number,
    routeMode?: FavoriteItem['routeMode']
  ) => boolean
}

function resolveFavoriteRouteMode(
  favorite: Pick<FavoriteItem, 'shabadId' | 'verseId' | 'routeMode'>
) {
  return favorite.routeMode
    ?? (favorite.verseId ? 'verse' : favorite.shabadId ? 'shabad' : 'canonical')
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      addFavorite: (item) => {
        if (get().isFavorite(
          item.source,
          item.ang,
          item.shabadId,
          item.verseId,
          item.routeMode
        )) return
        const favorite = {
          ...item,
          id: `favorite-${Date.now()}`,
          savedAt: new Date().toISOString(),
        }
        set(state => ({
          favorites: [
            ...state.favorites,
            favorite,
          ],
        }))
        useSavedFeedbackStore.getState().recordSaved({
          kind: 'favorite',
          targetId: favorite.id,
          surfacedAt: favorite.savedAt,
        })
        queueActivityEvent('saved-item.favorite.added', {
          favoriteId: favorite.id,
          source: favorite.source,
          ang: favorite.ang,
          shabadId: favorite.shabadId ?? null,
          verseId: favorite.verseId ?? null,
          type: favorite.type,
          routeMode: favorite.routeMode ?? 'canonical',
        }, favorite.savedAt)
      },
      removeFavorite: (id) => {
        const favorite = get().favorites.find(item => item.id === id)
        set(state => ({
          favorites: state.favorites.filter(item => item.id !== id),
        }))
        if (favorite) {
          queueActivityEvent('saved-item.favorite.removed', {
            favoriteId: favorite.id,
            source: favorite.source,
            ang: favorite.ang,
            shabadId: favorite.shabadId ?? null,
            verseId: favorite.verseId ?? null,
            type: favorite.type,
            routeMode: favorite.routeMode ?? 'canonical',
          })
        }
      },
      isFavorite: (source, ang, shabadId, verseId, routeMode) => {
        const requestedRouteMode = resolveFavoriteRouteMode({
          shabadId,
          verseId,
          routeMode,
        })

        return get().favorites.some(item => {
          if (
            item.source !== source
            || item.ang !== ang
            || resolveFavoriteRouteMode(item) !== requestedRouteMode
          ) {
            return false
          }

          if (requestedRouteMode === 'verse') {
            return item.shabadId === shabadId && item.verseId === verseId
          }

          if (requestedRouteMode === 'shabad') {
            return item.shabadId === shabadId
          }

          return true
        })
      },
    }),
    { name: 'sikh-favorites' }
  )
)
