import type { CSSProperties } from 'react'
import eclipseSrc from '../assets/home-eclipse/hero-eclipse.avif'
import goldenCourtAssemblySrc from '../assets/share-highlights/12-golden-court-assembly.jpg'
import goldenCourtAssemblyThumbnail from '../assets/share-highlights/thumbnails/12-golden-court-assembly.jpg'
import type { ShareHighlightAsset } from '../assets/share-highlights/manifest'

export interface HomeArtworkAsset {
  id: string
  src: string
  thumbnail: string
  name: string
  description: string
  displayName: ShareHighlightAsset['displayName']
  localizedDescription: ShareHighlightAsset['localizedDescription']
  width: number
  height: number
  mat: string
  focalPosition: { x: number; y: number }
  protectedSubject?: ShareHighlightAsset['storyProfile']['protectedSubject']
  credit?: { label: string; url: string }
}

export const ECLIPSE_ARTWORK: HomeArtworkAsset = {
  id: 'eclipse', src: eclipseSrc, thumbnail: eclipseSrc,
  name: 'Eclipse landscape',
  displayName: { en: 'Eclipse landscape', pa: 'ਗ੍ਰਹਿਣ ਦਾ ਦ੍ਰਿਸ਼', hi: 'ग्रहण का दृश्य' },
  description: 'An eclipse above a mountain landscape, travelers, a fire, and a white domed building.',
  localizedDescription: {
    en: 'An eclipse above a mountain landscape, travelers, a fire, and a white domed building.',
    pa: 'ਪਹਾੜੀ ਦ੍ਰਿਸ਼ ਉੱਪਰ ਗ੍ਰਹਿਣ, ਯਾਤਰੀ, ਅੱਗ ਅਤੇ ਚਿੱਟੇ ਗੁੰਬਦ ਵਾਲੀ ਇਮਾਰਤ।',
    hi: 'पहाड़ी दृश्य के ऊपर ग्रहण, यात्री, आग और सफेद गुंबद वाली इमारत।',
  },
  width: 1178, height: 1280, mat: '#19252d', focalPosition: { x: 0.5, y: 0.19 },
}

// Keep the default immediately available without loading the full gallery.
export const DEFAULT_HOME_ARTWORK: HomeArtworkAsset = {
  id: 'golden-court-assembly', src: goldenCourtAssemblySrc, thumbnail: goldenCourtAssemblyThumbnail,
  name: 'Golden court assembly',
  displayName: { en: 'Golden court assembly', pa: 'ਸੁਨਹਿਰੀ ਦਰਬਾਰੀ ਸਭਾ', hi: 'स्वर्णिम दरबारी सभा' },
  description: 'A symmetrical golden court scene with seated figures and musicians.',
  localizedDescription: {
    en: 'A symmetrical golden court scene with seated figures and musicians.',
    pa: 'ਬੈਠੇ ਪਾਤਰਾਂ ਅਤੇ ਸੰਗੀਤਕਾਰਾਂ ਵਾਲਾ ਸਮਮਿਤ ਸੁਨਹਿਰੀ ਦਰਬਾਰੀ ਦ੍ਰਿਸ਼।',
    hi: 'बैठी आकृतियों और संगीतकारों वाला सममित स्वर्णिम दरबारी दृश्य।',
  },
  width: 1199, height: 1476, mat: '#252219', focalPosition: { x: 0.5, y: 0.56 },
  protectedSubject: { bounds: { x: 0.05, y: 0.2, width: 0.9, height: 0.72 }, intent: 'keep-clear-of-text' },
}

/** Home preserves the complete composition; source and share-story metadata remain untouched. */
export function getHomeArtworkImageStyle(asset: HomeArtworkAsset): CSSProperties {
  return { objectFit: 'contain', objectPosition: '50% 50%', backgroundColor: asset.mat }
}

export function preloadHomeArtwork(asset: HomeArtworkAsset): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const timer = window.setTimeout(() => finish(new Error('Artwork loading timed out.')), 12000)
    const finish = (error?: Error) => {
      window.clearTimeout(timer)
      image.onload = null
      image.onerror = null
      if (error) reject(error)
      else resolve()
    }
    image.onload = () => {
      if (image.decode) void image.decode().then(() => finish(), () => finish(new Error('Artwork could not be displayed.')))
      else finish()
    }
    image.onerror = () => finish(new Error('Artwork could not be loaded.'))
    image.decoding = 'async'
    image.src = asset.src
  })
}
