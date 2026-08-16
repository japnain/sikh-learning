import courtMuralSrc from './01-court-mural.jpg'
import quietParchmentSrc from './00-quiet-parchment.jpg'
import interiorAudienceSrc from './02-interior-audience.jpg'
import courtAssemblySrc from './03-court-assembly.jpg'
import fortProcessionSrc from './04-fort-procession.jpg'
import stringAndTablaSrc from './05-string-and-tabla.jpg'
import devotionalInteriorSrc from './06-devotional-interior.jpg'
import watersideTempleSrc from './07-waterside-temple.jpg'
import miniatureCollageSrc from './08-miniature-collage.jpg'
import riderAndAttendantsSrc from './09-rider-and-attendants.jpg'
import falconerOnHorsebackSrc from './10-falconer-on-horseback.jpg'
import floralTeacherMuralSrc from './11-floral-teacher-mural.jpg'
import goldenCourtAssemblySrc from './12-golden-court-assembly.jpg'
import gurmukhiFloralMedallionSrc from './13-gurmukhi-floral-medallion.jpg'
import ceremonialArmsDisplaySrc from './14-ceremonial-arms-display.jpg'
import courtMuralThumbnail from './thumbnails/01-court-mural.jpg'
import quietParchmentThumbnail from './thumbnails/00-quiet-parchment.jpg'
import interiorAudienceThumbnail from './thumbnails/02-interior-audience.jpg'
import courtAssemblyThumbnail from './thumbnails/03-court-assembly.jpg'
import fortProcessionThumbnail from './thumbnails/04-fort-procession.jpg'
import stringAndTablaThumbnail from './thumbnails/05-string-and-tabla.jpg'
import devotionalInteriorThumbnail from './thumbnails/06-devotional-interior.jpg'
import watersideTempleThumbnail from './thumbnails/07-waterside-temple.jpg'
import miniatureCollageThumbnail from './thumbnails/08-miniature-collage.jpg'
import riderAndAttendantsThumbnail from './thumbnails/09-rider-and-attendants.jpg'
import falconerOnHorsebackThumbnail from './thumbnails/10-falconer-on-horseback.jpg'
import floralTeacherMuralThumbnail from './thumbnails/11-floral-teacher-mural.jpg'
import goldenCourtAssemblyThumbnail from './thumbnails/12-golden-court-assembly.jpg'
import gurmukhiFloralMedallionThumbnail from './thumbnails/13-gurmukhi-floral-medallion.jpg'
import ceremonialArmsDisplayThumbnail from './thumbnails/14-ceremonial-arms-display.jpg'

export type ShareHighlightOrientation = 'portrait' | 'landscape' | 'square'

/**
 * The suggested treatment behind overlaid text. Dark variants assume light text;
 * the light variant assumes dark text.
 */
export type ShareHighlightOverlayTone = 'light' | 'dark' | 'warm-dark' | 'cool-dark'

/** Editorial treatment used when an artwork is composed into a 9:16 Story. */
export type ShareHighlightStoryCompositionMode =
  | 'portrait-bleed'
  | 'landscape-hero'
  | 'pattern-frame'

export type ShareHighlightProtectedSubjectIntent = 'keep-visible' | 'keep-clear-of-text'

export interface ShareHighlightStoryProfile {
  mode: ShareHighlightStoryCompositionMode
  /** Story-specific crop anchor, measured against the orientation-corrected image. */
  focalPosition?: {
    x: number
    y: number
  }
  /** Fraction of the 9:16 canvas reserved for artwork in landscape-hero mode. */
  heroHeightFraction?: number
  /** Important subject matter that automatic crops and reading surfaces should respect. */
  protectedSubject?: {
    bounds: {
      x: number
      y: number
      width: number
      height: number
    }
    intent: ShareHighlightProtectedSubjectIntent
  }
}

export interface ShareHighlightAsset {
  id: string
  src: string
  thumbnail: string
  original: {
    width: number
    height: number
    orientation: ShareHighlightOrientation
  }
  normalized: {
    width: number
    height: number
    orientation: ShareHighlightOrientation
  }
  orientationCorrection: 'none' | 'rotate-90-ccw'
  /** Normalized object-position coordinates for cover crops. */
  focalPosition: {
    x: number
    y: number
  }
  /** Suggested normalized rectangle for text placement within the source image. */
  textSafeZone: {
    x: number
    y: number
    width: number
    height: number
  }
  storyProfile: ShareHighlightStoryProfile
  overlayTone: ShareHighlightOverlayTone
  /** Reviewed, semantically neutral work that may accompany an unrelated Hukamnama. */
  hukamnamaUse?: {
    status: 'approved-neutral'
    provenance: string
    createdDate: string
  }
  /** Neutral description of only the content visible in the supplied artwork. */
  description: string
}

export const shareHighlightAssets = [
  {
    id: 'court-mural',
    src: courtMuralSrc,
    thumbnail: courtMuralThumbnail,
    original: { width: 1080, height: 1920, orientation: 'portrait' },
    normalized: { width: 1920, height: 1080, orientation: 'landscape' },
    orientationCorrection: 'rotate-90-ccw',
    focalPosition: { x: 0.53, y: 0.5 },
    textSafeZone: { x: 0.44, y: 0.25, width: 0.3, height: 0.38 },
    storyProfile: {
      mode: 'landscape-hero',
      focalPosition: { x: 0.53, y: 0.5 },
      heroHeightFraction: 0.35,
      protectedSubject: {
        bounds: { x: 0.03, y: 0.08, width: 0.94, height: 0.86 },
        intent: 'keep-visible',
      },
    },
    overlayTone: 'light',
    description:
      'Ornate painted mural of a rider and a dense procession, framed by red floral borders and smaller scenes.',
  },
  {
    id: 'interior-audience',
    src: interiorAudienceSrc,
    thumbnail: interiorAudienceThumbnail,
    original: { width: 1200, height: 2132, orientation: 'portrait' },
    normalized: { width: 1080, height: 1920, orientation: 'portrait' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.42, y: 0.55 },
    textSafeZone: { x: 0.1, y: 0.63, width: 0.8, height: 0.23 },
    storyProfile: {
      mode: 'portrait-bleed',
      focalPosition: { x: 0.42, y: 0.49 },
      protectedSubject: {
        bounds: { x: 0.02, y: 0.38, width: 0.96, height: 0.34 },
        intent: 'keep-clear-of-text',
      },
    },
    overlayTone: 'warm-dark',
    description:
      'Tall interior painting with a kneeling figure, an audience, and broad areas of maroon canopy and carpet.',
  },
  {
    id: 'court-assembly',
    src: courtAssemblySrc,
    thumbnail: courtAssemblyThumbnail,
    original: { width: 1200, height: 900, orientation: 'landscape' },
    normalized: { width: 1200, height: 900, orientation: 'landscape' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.39, y: 0.46 },
    textSafeZone: { x: 0.13, y: 0.64, width: 0.5, height: 0.3 },
    storyProfile: {
      mode: 'landscape-hero',
      focalPosition: { x: 0.43, y: 0.48 },
      heroHeightFraction: 0.36,
      protectedSubject: {
        bounds: { x: 0.02, y: 0.06, width: 0.94, height: 0.88 },
        intent: 'keep-visible',
      },
    },
    overlayTone: 'warm-dark',
    description:
      'Large painted gathering around a seated figure beneath a gold parasol, with riders, attendants, and a white horse.',
  },
  {
    id: 'fort-procession',
    src: fortProcessionSrc,
    thumbnail: fortProcessionThumbnail,
    original: { width: 1100, height: 676, orientation: 'landscape' },
    normalized: { width: 1100, height: 676, orientation: 'landscape' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.54, y: 0.52 },
    textSafeZone: { x: 0.32, y: 0.05, width: 0.42, height: 0.32 },
    storyProfile: {
      mode: 'landscape-hero',
      focalPosition: { x: 0.52, y: 0.5 },
      heroHeightFraction: 0.34,
      protectedSubject: {
        bounds: { x: 0.03, y: 0.08, width: 0.91, height: 0.84 },
        intent: 'keep-visible',
      },
    },
    overlayTone: 'warm-dark',
    description:
      'Warm-toned procession painting with elephants, mounted riders, and a red sandstone complex.',
  },
  {
    id: 'string-and-tabla',
    src: stringAndTablaSrc,
    thumbnail: stringAndTablaThumbnail,
    original: { width: 827, height: 565, orientation: 'landscape' },
    normalized: { width: 827, height: 565, orientation: 'landscape' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.5, y: 0.52 },
    textSafeZone: { x: 0.39, y: 0.04, width: 0.36, height: 0.34 },
    storyProfile: {
      mode: 'landscape-hero',
      focalPosition: { x: 0.49, y: 0.5 },
      heroHeightFraction: 0.34,
      protectedSubject: {
        bounds: { x: 0.08, y: 0.05, width: 0.84, height: 0.86 },
        intent: 'keep-visible',
      },
    },
    overlayTone: 'cool-dark',
    description:
      'Two seated musicians playing a bowed string instrument and tabla inside a curtained room.',
  },
  {
    id: 'devotional-interior',
    src: devotionalInteriorSrc,
    thumbnail: devotionalInteriorThumbnail,
    original: { width: 832, height: 592, orientation: 'landscape' },
    normalized: { width: 832, height: 592, orientation: 'landscape' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.57, y: 0.57 },
    textSafeZone: { x: 0.39, y: 0.03, width: 0.44, height: 0.31 },
    storyProfile: {
      mode: 'landscape-hero',
      focalPosition: { x: 0.57, y: 0.54 },
      heroHeightFraction: 0.35,
      protectedSubject: {
        bounds: { x: 0.02, y: 0.06, width: 0.96, height: 0.88 },
        intent: 'keep-visible',
      },
    },
    overlayTone: 'warm-dark',
    description:
      'Painted interior congregation seated around a covered platform beneath an ornate canopy.',
  },
  {
    id: 'waterside-temple',
    src: watersideTempleSrc,
    thumbnail: watersideTempleThumbnail,
    original: { width: 1024, height: 1366, orientation: 'portrait' },
    normalized: { width: 1024, height: 1366, orientation: 'portrait' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.49, y: 0.43 },
    textSafeZone: { x: 0.08, y: 0.04, width: 0.84, height: 0.28 },
    storyProfile: {
      mode: 'portrait-bleed',
      focalPosition: { x: 0.49, y: 0.43 },
      protectedSubject: {
        bounds: { x: 0.05, y: 0.03, width: 0.9, height: 0.93 },
        intent: 'keep-clear-of-text',
      },
    },
    overlayTone: 'cool-dark',
    description:
      'Detailed overhead painting of a waterside temple complex surrounded by crowds and scenes of conflict.',
  },
  {
    id: 'miniature-collage',
    src: miniatureCollageSrc,
    thumbnail: miniatureCollageThumbnail,
    original: { width: 1080, height: 1920, orientation: 'portrait' },
    normalized: { width: 1080, height: 1920, orientation: 'portrait' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.51, y: 0.47 },
    textSafeZone: { x: 0.08, y: 0.57, width: 0.84, height: 0.22 },
    storyProfile: {
      mode: 'portrait-bleed',
      focalPosition: { x: 0.51, y: 0.47 },
      protectedSubject: {
        bounds: { x: 0.04, y: 0.03, width: 0.92, height: 0.94 },
        intent: 'keep-clear-of-text',
      },
    },
    overlayTone: 'warm-dark',
    description:
      'Vertical collage of miniature paintings with riders, attendants, a waterside temple, and a domed building.',
  },
  {
    id: 'rider-and-attendants',
    src: riderAndAttendantsSrc,
    thumbnail: riderAndAttendantsThumbnail,
    original: { width: 1200, height: 510, orientation: 'landscape' },
    normalized: { width: 1200, height: 510, orientation: 'landscape' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.53, y: 0.49 },
    textSafeZone: { x: 0.38, y: 0.65, width: 0.3, height: 0.3 },
    storyProfile: {
      mode: 'landscape-hero',
      focalPosition: { x: 0.53, y: 0.49 },
      heroHeightFraction: 0.31,
      protectedSubject: {
        bounds: { x: 0.03, y: 0.04, width: 0.94, height: 0.92 },
        intent: 'keep-visible',
      },
    },
    overlayTone: 'cool-dark',
    description:
      'Miniature painting of a mounted figure with attendants, a white horse, and falcons.',
  },
  {
    id: 'falconer-on-horseback',
    src: falconerOnHorsebackSrc,
    thumbnail: falconerOnHorsebackThumbnail,
    original: { width: 1200, height: 1517, orientation: 'portrait' },
    normalized: { width: 1200, height: 1517, orientation: 'portrait' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.51, y: 0.51 },
    textSafeZone: { x: 0.08, y: 0.68, width: 0.84, height: 0.24 },
    storyProfile: {
      mode: 'portrait-bleed',
      focalPosition: { x: 0.51, y: 0.49 },
      protectedSubject: {
        bounds: { x: 0.07, y: 0.07, width: 0.86, height: 0.8 },
        intent: 'keep-clear-of-text',
      },
    },
    overlayTone: 'warm-dark',
    description:
      'Miniature painting of a green-robed rider holding a falcon on a black-and-white horse beneath a patterned parasol.',
  },
  {
    id: 'floral-teacher-mural',
    src: floralTeacherMuralSrc,
    thumbnail: floralTeacherMuralThumbnail,
    original: { width: 720, height: 823, orientation: 'portrait' },
    normalized: { width: 720, height: 823, orientation: 'portrait' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.5, y: 0.49 },
    textSafeZone: { x: 0.1, y: 0.05, width: 0.8, height: 0.28 },
    storyProfile: {
      mode: 'pattern-frame',
      focalPosition: { x: 0.5, y: 0.49 },
      protectedSubject: {
        bounds: { x: 0.23, y: 0.18, width: 0.55, height: 0.52 },
        intent: 'keep-visible',
      },
    },
    overlayTone: 'light',
    description: 'Floral-framed mural of a seated elder beneath a tree with two attendants.',
  },
  {
    id: 'golden-court-assembly',
    src: goldenCourtAssemblySrc,
    thumbnail: goldenCourtAssemblyThumbnail,
    original: { width: 1199, height: 1476, orientation: 'portrait' },
    normalized: { width: 1199, height: 1476, orientation: 'portrait' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.5, y: 0.56 },
    textSafeZone: { x: 0.08, y: 0.03, width: 0.84, height: 0.3 },
    storyProfile: {
      mode: 'portrait-bleed',
      focalPosition: { x: 0.5, y: 0.51 },
      protectedSubject: {
        bounds: { x: 0.05, y: 0.2, width: 0.9, height: 0.72 },
        intent: 'keep-clear-of-text',
      },
    },
    overlayTone: 'cool-dark',
    description:
      'Symmetrical court painting with a seated elder, musicians, two flanking figures, a golden pavilion, and a sun above.',
  },
  {
    id: 'gurmukhi-floral-medallion',
    src: gurmukhiFloralMedallionSrc,
    thumbnail: gurmukhiFloralMedallionThumbnail,
    original: { width: 675, height: 1200, orientation: 'portrait' },
    normalized: { width: 675, height: 1200, orientation: 'portrait' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.5, y: 0.48 },
    textSafeZone: { x: 0.08, y: 0.15, width: 0.84, height: 0.22 },
    storyProfile: {
      mode: 'pattern-frame',
      focalPosition: { x: 0.5, y: 0.43 },
      protectedSubject: {
        bounds: { x: 0.2, y: 0.19, width: 0.6, height: 0.34 },
        intent: 'keep-visible',
      },
    },
    overlayTone: 'light',
    description:
      'Close view of an orange-and-cream floral pattern surrounding a dark circular Gurmukhi medallion.',
  },
  {
    id: 'ceremonial-arms-display',
    src: ceremonialArmsDisplaySrc,
    thumbnail: ceremonialArmsDisplayThumbnail,
    original: { width: 1200, height: 1500, orientation: 'portrait' },
    normalized: { width: 1200, height: 1500, orientation: 'portrait' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.5, y: 0.51 },
    textSafeZone: { x: 0.08, y: 0.03, width: 0.84, height: 0.28 },
    storyProfile: {
      mode: 'pattern-frame',
      focalPosition: { x: 0.5, y: 0.5 },
      protectedSubject: {
        bounds: { x: 0.22, y: 0.15, width: 0.56, height: 0.75 },
        intent: 'keep-visible',
      },
    },
    overlayTone: 'warm-dark',
    description:
      'Golden-lit display of shields, curved swords, and a framed miniature of a rider on horseback.',
  },
  {
    id: 'quiet-parchment',
    src: quietParchmentSrc,
    thumbnail: quietParchmentThumbnail,
    original: { width: 1080, height: 1920, orientation: 'portrait' },
    normalized: { width: 1080, height: 1920, orientation: 'portrait' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.5, y: 0.5 },
    textSafeZone: { x: 0.08, y: 0.18, width: 0.84, height: 0.62 },
    storyProfile: {
      mode: 'portrait-bleed',
      focalPosition: { x: 0.5, y: 0.5 },
    },
    overlayTone: 'light',
    hukamnamaUse: {
      status: 'approved-neutral',
      provenance: 'Original nonfigurative background generated specifically for NaamRas with OpenAI image generation; no source images were supplied.',
      createdDate: '2026-08-11',
    },
    description:
      'Abstract parchment and watercolor texture in forest green, warm cream, and muted copper, without figures, symbols, or embedded text.',
  },
] as const satisfies readonly ShareHighlightAsset[]

/** Artwork reviewed as neutral enough to accompany an unrelated Hukamnama. */
export const shareHighlightHukamnamaAssets = shareHighlightAssets.filter(
  asset => 'hukamnamaUse' in asset && asset.hukamnamaUse.status === 'approved-neutral'
)
