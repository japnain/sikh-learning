import type { Bookmark } from '../store/bookmarks'
import type { FavoriteItem } from '../store/favorites'

type SavedStudyItem = Bookmark | FavoriteItem

function getSavedRouteMode(item: SavedStudyItem) {
  if ('routeMode' in item && item.routeMode) {
    return item.routeMode
  }

  if ('type' in item && item.type === 'verse') {
    return 'verse'
  }

  if ('type' in item && item.type === 'shabad' && item.shabadId) {
    return 'shabad'
  }

  return 'canonical'
}

export function buildSavedStudyPath(item: SavedStudyItem): string {
  const routeMode = getSavedRouteMode(item)

  if (routeMode === 'verse' && item.shabadId && 'verseId' in item && item.verseId) {
    return `/study?shabadId=${item.shabadId}&verseId=${item.verseId}`
  }

  if (routeMode === 'shabad' && item.shabadId) {
    return `/study?shabadId=${item.shabadId}`
  }

  return `/study?source=${item.source}&ang=${item.ang}`
}
