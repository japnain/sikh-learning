import { shareHighlightHukamnamaAssets } from '../assets/share-highlights/manifest'
import { getHukamnamaArtDirection } from '../features/shareHighlight/hukamnamaArtDirection'
import type { HomeArtworkAsset } from '../utils/homeArtwork'

export const homeArtworkCatalog: HomeArtworkAsset[] = shareHighlightHukamnamaAssets.map(asset => ({
  id: asset.id,
  src: asset.src,
  thumbnail: asset.thumbnail,
  name: asset.displayName.en,
  displayName: asset.displayName,
  localizedDescription: asset.localizedDescription,
  description: asset.localizedDescription.en,
  width: asset.normalized.width,
  height: asset.normalized.height,
  mat: getHukamnamaArtDirection(asset.id)?.paper ?? '#19252d',
  focalPosition: asset.focalPosition,
  protectedSubject: 'protectedSubject' in asset.storyProfile ? asset.storyProfile.protectedSubject : undefined,
}))
