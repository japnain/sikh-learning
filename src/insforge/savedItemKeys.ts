import type { CloudBookmarkPayload, CloudFavoritePayload } from './types'

export function buildBookmarkNaturalKey(
  payload: Pick<CloudBookmarkPayload, 'source' | 'ang' | 'shabadId' | 'verseId'>
) {
  return payload.verseId
    ? `bookmark:${payload.source}:${payload.ang}:verse:${payload.verseId}`
    : `bookmark:${payload.source}:${payload.ang}:shabad:${payload.shabadId ?? 'ang'}`
}

export function buildFavoriteNaturalKey(
  payload: Pick<CloudFavoritePayload, 'source' | 'ang' | 'shabadId'>
) {
  return `favorite:${payload.source}:${payload.ang}:shabad:${payload.shabadId ?? 'ang'}`
}

export function buildSavedLearnNaturalKey(itemId: string) {
  return `learn:${itemId}`
}
