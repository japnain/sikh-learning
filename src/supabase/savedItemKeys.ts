import type { CloudBookmarkPayload, CloudFavoritePayload } from './types'
import { getSavedReturnIdentity } from '../utils/savedRouteIdentity'

type BookmarkNaturalKeyPayload =
  | Pick<Extract<CloudBookmarkPayload, { type: 'book' }>, 'type' | 'workId' | 'chapterId'>
  | (Pick<Extract<CloudBookmarkPayload, { type: 'shabad' | 'bani' | 'verse' }>, 'source' | 'ang' | 'shabadId' | 'verseId'> & {
      type?: 'shabad' | 'bani' | 'verse'
      returnPath?: string
    })

export function buildBookmarkNaturalKey(
  payload: BookmarkNaturalKeyPayload
) {
  if (payload.type === 'book') {
    return `bookmark:book:${payload.workId}:chapter:${payload.chapterId}`
  }

  const routeIdentity = getSavedReturnIdentity(payload.returnPath)
  if (routeIdentity) return `bookmark:route:${encodeURIComponent(routeIdentity)}`

  return payload.verseId
    ? `bookmark:${payload.source}:${payload.ang}:verse:${payload.verseId}`
    : `bookmark:${payload.source}:${payload.ang}:shabad:${payload.shabadId ?? 'ang'}`
}

export function buildFavoriteNaturalKey(
  payload: Pick<CloudFavoritePayload, 'source' | 'ang' | 'shabadId' | 'verseId'> & {
    routeMode?: CloudFavoritePayload['routeMode']
    returnPath?: string
  }
) {
  const routeIdentity = getSavedReturnIdentity(payload.returnPath)
  if (routeIdentity) return `favorite:route:${encodeURIComponent(routeIdentity)}`

  const routeMode = payload.routeMode
    ?? (payload.verseId ? 'verse' : payload.shabadId ? 'shabad' : 'canonical')

  if (routeMode === 'verse' && payload.verseId) {
    return `favorite:${payload.source}:${payload.ang}:verse:${payload.verseId}`
  }

  if (routeMode === 'shabad' && payload.shabadId) {
    return `favorite:${payload.source}:${payload.ang}:shabad:${payload.shabadId}`
  }

  return `favorite:${payload.source}:${payload.ang}:canonical`
}
