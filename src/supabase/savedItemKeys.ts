import type { CloudBookmarkPayload, CloudFavoritePayload } from './types'

export function buildBookmarkNaturalKey(
  payload: Pick<CloudBookmarkPayload, 'source' | 'ang' | 'shabadId' | 'verseId'>
) {
  return payload.verseId
    ? `bookmark:${payload.source}:${payload.ang}:verse:${payload.verseId}`
    : `bookmark:${payload.source}:${payload.ang}:shabad:${payload.shabadId ?? 'ang'}`
}

export function buildFavoriteNaturalKey(
  payload: Pick<CloudFavoritePayload, 'source' | 'ang' | 'shabadId' | 'verseId' | 'routeMode'>
) {
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
