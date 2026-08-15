import quietParchmentSrc from './00-quiet-parchment.jpg'
import courtMuralSrc from './01-court-mural.jpg'
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
import emeraldMistSrc from './15-emerald-mist.jpg'
import indigoRainSrc from './16-indigo-rain.jpg'
import roseDawnSrc from './17-rose-dawn.jpg'
import copperEarthSrc from './18-copper-earth.jpg'
import riverStoneSrc from './19-river-stone.jpg'
import nightGoldSrc from './20-night-gold.jpg'
import sageCanopySrc from './21-sage-canopy.jpg'
import monsoonBlueSrc from './22-monsoon-blue.jpg'
import sandstoneLightSrc from './23-sandstone-light.jpg'
import plumInkSrc from './24-plum-ink.jpg'
import silverDuskSrc from './25-silver-dusk.jpg'
import quietParchmentThumbnail from './thumbnails/00-quiet-parchment.jpg'
import courtMuralThumbnail from './thumbnails/01-court-mural.jpg'
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
import emeraldMistThumbnail from './thumbnails/15-emerald-mist.jpg'
import indigoRainThumbnail from './thumbnails/16-indigo-rain.jpg'
import roseDawnThumbnail from './thumbnails/17-rose-dawn.jpg'
import copperEarthThumbnail from './thumbnails/18-copper-earth.jpg'
import riverStoneThumbnail from './thumbnails/19-river-stone.jpg'
import nightGoldThumbnail from './thumbnails/20-night-gold.jpg'
import sageCanopyThumbnail from './thumbnails/21-sage-canopy.jpg'
import monsoonBlueThumbnail from './thumbnails/22-monsoon-blue.jpg'
import sandstoneLightThumbnail from './thumbnails/23-sandstone-light.jpg'
import plumInkThumbnail from './thumbnails/24-plum-ink.jpg'
import silverDuskThumbnail from './thumbnails/25-silver-dusk.jpg'

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
  /** Reviewed use as the outer mat behind a protected long-form manuscript. */
  manuscriptTreatment?: 'art-frame'
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
    displayName: {
      en: string
      pa: string
      hi: string
    }
    /** Concise, localized visual description announced separately from the name. */
    description: {
      en: string
      pa: string
      hi: string
    }
  }
  /** Neutral description of only the content visible in the supplied artwork. */
  description: string
}

interface GeneratedHukamnamaAssetInput {
  id: string
  src: string
  thumbnail: string
  createdDate: string
  displayName: NonNullable<ShareHighlightAsset['hukamnamaUse']>['displayName']
  localizedDescription: NonNullable<ShareHighlightAsset['hukamnamaUse']>['description']
  description: string
}

const GENERATED_HUKAMNAMA_PROVENANCE =
  'Original nonfigurative background generated specifically for NaamRas with OpenAI image generation; no source images were supplied.'

function makeGeneratedHukamnamaAsset({
  id,
  src,
  thumbnail,
  createdDate,
  displayName,
  localizedDescription,
  description,
}: GeneratedHukamnamaAssetInput): ShareHighlightAsset {
  return {
    id,
    src,
    thumbnail,
    original: { width: 1080, height: 1920, orientation: 'portrait' },
    normalized: { width: 1080, height: 1920, orientation: 'portrait' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.5, y: 0.5 },
    textSafeZone: { x: 0.08, y: 0.18, width: 0.84, height: 0.62 },
    storyProfile: {
      mode: 'portrait-bleed',
      focalPosition: { x: 0.5, y: 0.5 },
      manuscriptTreatment: 'art-frame',
    },
    overlayTone: 'light',
    hukamnamaUse: {
      status: 'approved-neutral',
      provenance: GENERATED_HUKAMNAMA_PROVENANCE,
      createdDate,
      displayName,
      description: localizedDescription,
    },
    description,
  }
}

const shareHighlightNarrativeAssets: readonly ShareHighlightAsset[] = [
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
]

const generatedHukamnamaAssets: readonly ShareHighlightAsset[] = [
  makeGeneratedHukamnamaAsset({
    id: 'quiet-parchment',
    src: quietParchmentSrc,
    thumbnail: quietParchmentThumbnail,
    createdDate: '2026-08-11',
    displayName: {
      en: 'Quiet Parchment',
      pa: 'ਸ਼ਾਂਤ ਕਾਗਜ਼',
      hi: 'शांत काग़ज़',
    },
    localizedDescription: {
      en: 'Forest-green and warm-cream watercolor parchment with muted copper edges.',
      pa: 'ਗੂੜ੍ਹੇ ਹਰੇ, ਗਰਮ ਕਰੀਮੀ ਅਤੇ ਹਲਕੇ ਤਾਂਬੀ ਕਿਨਾਰਿਆਂ ਵਾਲਾ ਜਲਰੰਗੀ ਕਾਗਜ਼।',
      hi: 'गहरे हरे, गरम क्रीम और हल्के तांबे के किनारों वाला जलरंगी काग़ज़।',
    },
    description:
      'Abstract parchment and watercolor texture in forest green, warm cream, and muted copper, without figures, symbols, or embedded text.',
  }),
  makeGeneratedHukamnamaAsset({
    id: 'emerald-mist',
    src: emeraldMistSrc,
    thumbnail: emeraldMistThumbnail,
    createdDate: '2026-08-15',
    displayName: {
      en: 'Emerald Mist',
      pa: 'ਪੰਨਾ ਧੁੰਦ',
      hi: 'पन्ना धुंध',
    },
    localizedDescription: {
      en: 'Ivory paper with emerald-green mist and light mineral speckles at the edges.',
      pa: 'ਹਾਥੀਦੰਦ ਰੰਗ ਦੇ ਕਾਗਜ਼ ਉੱਤੇ ਪੰਨਾ-ਹਰੀ ਧੁੰਦ ਅਤੇ ਕਿਨਾਰਿਆਂ ਕੋਲ ਹਲਕੇ ਖਣਿਜ ਬਿੰਦੂ।',
      hi: 'हाथीदाँत-रंग काग़ज़ पर पन्ना-हरी धुंध और किनारों पर हल्के खनिज बिंदु।',
    },
    description:
      'Ivory paper with forest-green ink mist and restrained mineral speckles around a quiet center.',
  }),
  makeGeneratedHukamnamaAsset({
    id: 'indigo-rain',
    src: indigoRainSrc,
    thumbnail: indigoRainThumbnail,
    createdDate: '2026-08-15',
    displayName: {
      en: 'Indigo Rain',
      pa: 'ਨੀਲੀ ਵਰਖਾ',
      hi: 'नीली वर्षा',
    },
    localizedDescription: {
      en: 'Pearl paper framed by indigo and blue-grey ink streaks.',
      pa: 'ਮੋਤੀਲੇ ਕਾਗਜ਼ ਦੇ ਕਿਨਾਰਿਆਂ ਉੱਤੇ ਨੀਲੀ ਅਤੇ ਸਲੇਟੀ-ਨੀਲੀ ਸਿਆਹੀ ਦੀਆਂ ਧਾਰੀਆਂ।',
      hi: 'मोती-जैसे काग़ज़ के किनारों पर नील और धूसर-नीली स्याही की धारियाँ।',
    },
    description:
      'Warm pearl paper with indigo and blue-grey fiber-like ink textures framing a calm center.',
  }),
  makeGeneratedHukamnamaAsset({
    id: 'rose-dawn',
    src: roseDawnSrc,
    thumbnail: roseDawnThumbnail,
    createdDate: '2026-08-15',
    displayName: {
      en: 'Rose Dawn',
      pa: 'ਗੁਲਾਬੀ ਸਵੇਰ',
      hi: 'गुलाबी भोर',
    },
    localizedDescription: {
      en: 'Pale sand paper edged with dusty rose, muted coral, and ochre.',
      pa: 'ਫਿੱਕੇ ਰੇਤਲੇ ਕਾਗਜ਼ ਦੇ ਕਿਨਾਰਿਆਂ ਉੱਤੇ ਧੂੜਲੇ ਗੁਲਾਬੀ, ਮੂੰਗੀਆ ਅਤੇ ਗੇਰੂ ਰੰਗ।',
      hi: 'हल्के रेतीले काग़ज़ के किनारों पर धूल-गुलाबी, मूँगा और गेरुए रंग।',
    },
    description:
      'Pale sand paper with dusty-rose, muted coral, and ochre pigment blooms around the edges.',
  }),
  makeGeneratedHukamnamaAsset({
    id: 'copper-earth',
    src: copperEarthSrc,
    thumbnail: copperEarthThumbnail,
    createdDate: '2026-08-15',
    displayName: {
      en: 'Copper Earth',
      pa: 'ਤਾਂਬੀ ਧਰਤੀ',
      hi: 'तांबे-सी धरती',
    },
    localizedDescription: {
      en: 'Warm cream paper with terracotta, umber, and copper-green mineral edges.',
      pa: 'ਗਰਮ ਕਰੀਮੀ ਕਾਗਜ਼ ਉੱਤੇ ਮਿੱਟੀਲੇ, ਭੂਰੇ ਅਤੇ ਤਾਂਬੀ-ਹਰੇ ਖਣਿਜ ਕਿਨਾਰੇ।',
      hi: 'गरम क्रीम काग़ज़ पर मिट्टी, गहरे भूरे और तांबा-हरे खनिज किनारे।',
    },
    description:
      'Warm cream paper with terracotta, umber, oxidized-copper, and mineral textures at the edges.',
  }),
  makeGeneratedHukamnamaAsset({
    id: 'river-stone',
    src: riverStoneSrc,
    thumbnail: riverStoneThumbnail,
    createdDate: '2026-08-15',
    displayName: {
      en: 'River Stone',
      pa: 'ਦਰਿਆਈ ਪੱਥਰ',
      hi: 'नदी का पत्थर',
    },
    localizedDescription: {
      en: 'Pearl paper with slate-grey and faint blue-green marbling at the edges.',
      pa: 'ਮੋਤੀਲੇ ਕਾਗਜ਼ ਦੇ ਕਿਨਾਰਿਆਂ ਉੱਤੇ ਸਲੇਟੀ ਅਤੇ ਹਲਕੇ ਨੀਲ-ਹਰੇ ਸੰਗਮਰਮਰੀ ਰੰਗ।',
      hi: 'मोती-जैसे काग़ज़ के किनारों पर स्लेटी और हल्के नीले-हरे संगमरमरी रंग।',
    },
    description:
      'Pearl and limestone paper with slate-grey and faint teal organic marbling around the edges.',
  }),
  makeGeneratedHukamnamaAsset({
    id: 'night-gold',
    src: nightGoldSrc,
    thumbnail: nightGoldThumbnail,
    createdDate: '2026-08-15',
    displayName: {
      en: 'Night Gold',
      pa: 'ਰਾਤ ਦਾ ਸੋਨਾ',
      hi: 'रात का सोना',
    },
    localizedDescription: {
      en: 'Pale warm parchment edged with charcoal ink and restrained antique gold.',
      pa: 'ਫਿੱਕੇ ਗਰਮ ਕਾਗਜ਼ ਦੇ ਕਿਨਾਰਿਆਂ ਉੱਤੇ ਕੋਲੇ ਵਰਗੀ ਸਿਆਹੀ ਅਤੇ ਹਲਕੀਆਂ ਸੁਨਹਿਰੀ ਝਲਕਾਂ।',
      hi: 'हल्के गरम काग़ज़ के किनारों पर कोयला-सी स्याही और हल्की सुनहरी झलक।',
    },
    description:
      'Pale warm parchment with charcoal ink and restrained antique-gold flecks close to the edges.',
  }),
  makeGeneratedHukamnamaAsset({
    id: 'sage-canopy',
    src: sageCanopySrc,
    thumbnail: sageCanopyThumbnail,
    createdDate: '2026-08-15',
    displayName: {
      en: 'Sage Canopy',
      pa: 'ਸਲੇਟੀ-ਹਰੀ ਛਾਂ',
      hi: 'धूसर-हरी छाया',
    },
    localizedDescription: {
      en: 'Warm ivory paper edged with soft sage, olive, and charcoal pigment.',
      pa: 'ਗਰਮ ਚਿੱਟੇ ਕਾਗਜ਼ ਦੇ ਕਿਨਾਰਿਆਂ ਉੱਤੇ ਸਲੇਟੀ-ਹਰੇ, ਜੈਤੂਨੀ ਅਤੇ ਕੋਲੇ ਵਰਗੇ ਨਰਮ ਰੰਗ।',
      hi: 'गरम सफ़ेद काग़ज़ के किनारों पर धूसर-हरे, जैतूनी और कोयला-जैसे मुलायम रंग।',
    },
    description:
      'Warm ivory paper with sage, olive, and charcoal shadow-like pigment gathered at the edges.',
  }),
  makeGeneratedHukamnamaAsset({
    id: 'monsoon-blue',
    src: monsoonBlueSrc,
    thumbnail: monsoonBlueThumbnail,
    createdDate: '2026-08-15',
    displayName: {
      en: 'Monsoon Blue',
      pa: 'ਮਾਨਸੂਨੀ ਨੀਲਾ',
      hi: 'मानसूनी नीला',
    },
    localizedDescription: {
      en: 'Cream-grey paper edged with blue-grey and muted blue-green ink.',
      pa: 'ਕਰੀਮੀ-ਸਲੇਟੀ ਕਾਗਜ਼ ਦੇ ਕਿਨਾਰਿਆਂ ਉੱਤੇ ਨੀਲੇ-ਸਲੇਟੀ ਅਤੇ ਫਿੱਕੇ ਨੀਲ-ਹਰੇ ਸਿਆਹੀ ਰੰਗ।',
      hi: 'क्रीम-धूसर काग़ज़ के किनारों पर नीले-धूसर और हल्के नीले-हरे स्याही रंग।',
    },
    description:
      'Cream-grey paper with abstract blue-grey, desaturated teal, and storm-ink diffusion at the edges.',
  }),
  makeGeneratedHukamnamaAsset({
    id: 'sandstone-light',
    src: sandstoneLightSrc,
    thumbnail: sandstoneLightThumbnail,
    createdDate: '2026-08-15',
    displayName: {
      en: 'Sandstone Light',
      pa: 'ਰੇਤਲੇ ਪੱਥਰ ਦੀ ਰੌਸ਼ਨੀ',
      hi: 'बलुआ पत्थर की रोशनी',
    },
    localizedDescription: {
      en: 'Creamy stone paper with warm sandstone and pale clay texture at the edges.',
      pa: 'ਕਰੀਮੀ ਪੱਥਰੀ ਕਾਗਜ਼ ਦੇ ਕਿਨਾਰਿਆਂ ਉੱਤੇ ਗਰਮ ਰੇਤਲੇ ਅਤੇ ਫਿੱਕੇ ਮਿੱਟੀ ਰੰਗਾਂ ਦੀ ਬਣਾਵਟ।',
      hi: 'क्रीमी पत्थर-जैसे काग़ज़ के किनारों पर गरम बलुआ और हल्की मिट्टी की बनावट।',
    },
    description:
      'Creamy limestone paper with warm sandstone, pale clay, and subtle plaster-like geometry at the edges.',
  }),
  makeGeneratedHukamnamaAsset({
    id: 'plum-ink',
    src: plumInkSrc,
    thumbnail: plumInkThumbnail,
    createdDate: '2026-08-15',
    displayName: {
      en: 'Plum Ink',
      pa: 'ਜਾਮਨੀ ਸਿਆਹੀ',
      hi: 'जामुनी स्याही',
    },
    localizedDescription: {
      en: 'Parchment edged with plum, wine-red, and smoke-black ink blooms.',
      pa: 'ਕਾਗਜ਼ ਦੇ ਕਿਨਾਰਿਆਂ ਉੱਤੇ ਜਾਮਨੀ, ਗੂੜ੍ਹੇ ਲਾਲ ਅਤੇ ਧੂੰਏਂ ਵਰਗੀ ਕਾਲੀ ਸਿਆਹੀ।',
      hi: 'काग़ज़ के किनारों पर जामुनी, गहरी लाल और धुएँ-सी काली स्याही।',
    },
    description:
      'Parchment paper with muted aubergine, plum, wine, and smoke-black ink blooms at the edges.',
  }),
  makeGeneratedHukamnamaAsset({
    id: 'silver-dusk',
    src: silverDuskSrc,
    thumbnail: silverDuskThumbnail,
    createdDate: '2026-08-15',
    displayName: {
      en: 'Silver Dusk',
      pa: 'ਚਾਂਦੀਲੀ ਸੰਝ',
      hi: 'रुपहली सांझ',
    },
    localizedDescription: {
      en: 'Soft ivory paper edged with silver-grey, pale lilac, and graphite washes.',
      pa: 'ਹਲਕੇ ਚਿੱਟੇ ਕਾਗਜ਼ ਦੇ ਕਿਨਾਰਿਆਂ ਉੱਤੇ ਚਾਂਦੀਲੇ-ਸਲੇਟੀ, ਫਿੱਕੇ ਜਾਮਨੀ ਅਤੇ ਸਲੇਟੀ ਖਣਿਜ ਰੰਗ।',
      hi: 'हल्के सफ़ेद काग़ज़ के किनारों पर रुपहले-धूसर, हल्के जामुनी और स्लेटी खनिज रंग।',
    },
    description:
      'Soft ivory paper with silver-grey, lilac-grey, and graphite mineral washes at the edges.',
  }),
]

/** Complete bundled inventory, including legacy narrative and generated works. */
export const shareHighlightAssets: readonly ShareHighlightAsset[] = [
  ...shareHighlightNarrativeAssets,
  ...generatedHukamnamaAssets,
]

/** Preserve the focused fifteen-treatment gallery used by single-line cards. */
export const shareHighlightLineAssets: readonly ShareHighlightAsset[] = [
  ...shareHighlightNarrativeAssets,
  generatedHukamnamaAssets[0]!,
]

/** Artwork reviewed as neutral enough to accompany an unrelated Hukamnama. */
export const shareHighlightHukamnamaAssets = shareHighlightAssets.filter(
  (asset): asset is ShareHighlightAsset & {
    hukamnamaUse: NonNullable<ShareHighlightAsset['hukamnamaUse']>
  } => asset.hukamnamaUse?.status === 'approved-neutral'
)
