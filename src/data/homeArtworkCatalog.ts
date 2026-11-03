import { shareHighlightHukamnamaAssets } from '../assets/share-highlights/manifest'
import { getHukamnamaArtDirection } from '../features/shareHighlight/hukamnamaArtDirection'
import type { HomeArtworkAsset } from '../utils/homeArtwork'
import { homeArtworkAdditions } from './homeArtworkAdditions'
import devotionalInterior from '../assets/home-artwork/devotional-interior.webp'
import devotionalInteriorThumb from '../assets/home-artwork/devotional-interior-thumb.jpg'

// Keep the legacy share catalog intact; Home uses the verified museum scan.
const homeSourceUpgrades: Partial<Record<string, Pick<HomeArtworkAsset, 'src' | 'thumbnail' | 'width' | 'height' | 'credit'>>> = {
  'devotional-interior': {
    src: devotionalInterior, thumbnail: devotionalInteriorThumb, width: 1951, height: 1400,
    credit: {
      label: 'William Carpenter · V&A · 1854',
      url: 'https://commons.wikimedia.org/wiki/File:Watercolour_painting_of_the_interior_of_the_Golden_Temple_in_Amritsar,_by_William_Carpenter,_circa_1854.webp',
    },
  },
}

export const homeArtworkCatalog: HomeArtworkAsset[] = [...shareHighlightHukamnamaAssets.map(asset => ({
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
  ...homeSourceUpgrades[asset.id],
})), ...homeArtworkAdditions]
