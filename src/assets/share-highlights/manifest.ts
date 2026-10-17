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

export interface ShareHighlightLocalizedCopy {
  en: string
  pa: string
  hi: string
}

export type ShareHighlightRightsReviewStatus = 'blocked' | 'unresolved'

export type ShareHighlightSourceStatus =
  | 'unknown'
  | 'work-identified-file-unverified'

export type ShareHighlightCulturalReviewStatus = 'blocked' | 'unresolved'

export type ShareHighlightCulturalReviewFlag =
  | 'composite-artwork'
  | 'devi-or-angelic-figure'
  | 'embedded-gurmukhi'
  | 'graphic-violence'
  | 'guru-granth-sahib'
  | 'guru-or-religious-figure'
  | 'historical-religious-context'
  | 'interreligious-iconography'
  | 'martial-imagery'
  | 'nested-artwork'
  | 'non-sikh-subject'
  | 'operation-blue-star'
  | 'orientalist-context'
  | 'political-trauma'
  | 'sacred-interior'
  | 'sacred-music'
  | 'sacred-site'
  | 'shastar'
  | 'sikh-devotional-music'

export interface ShareHighlightRightsReview {
  status: ShareHighlightRightsReviewStatus
  sourceStatus: ShareHighlightSourceStatus
  creator?: string
  title?: string
  date?: string
  sourceUrl?: string
  licenseNote?: string
  note: string
}

export interface ShareHighlightCulturalReview {
  status: ShareHighlightCulturalReviewStatus
  flags: readonly ShareHighlightCulturalReviewFlag[]
  note: string
}

export interface ShareHighlightExistingHukamnamaUse {
  /** An explicit catalog decision; rights provenance remains a separate review. */
  catalogStatus: 'included-existing'
  shortTreatment: 'contained-hero'
  longTreatment: 'ambient-mat'
  rightsReview: ShareHighlightRightsReview
  culturalReview: ShareHighlightCulturalReview
}

export interface ShareHighlightHistoricalHukamnamaUse {
  status: 'approved-neutral'
  provenance: string
  createdDate: string
}

export type ShareHighlightHukamnamaUse =
  | ShareHighlightExistingHukamnamaUse
  | ShareHighlightHistoricalHukamnamaUse

/** Editorial treatment used when an artwork is composed into a 9:16 Story. */
export type ShareHighlightStoryCompositionMode =
  | 'portrait-bleed'
  | 'landscape-hero'
  | 'pattern-frame'

export type ShareHighlightProtectedSubjectIntent = 'keep-visible' | 'keep-clear-of-text'

export type ShareHighlightStoryArtworkFit = 'protected-cover' | 'contain'

export type ShareHighlightStoryFrameEffect =
  | 'warm'
  | 'cool'
  | 'vivid'
  | 'pattern'
  | 'architectural'
  | 'amber'

export interface ShareHighlightStoryPresentation {
  short: {
    fit: ShareHighlightStoryArtworkFit
    stageHeight: number
  }
  long: {
    frameEffect: ShareHighlightStoryFrameEffect
    cameoFit: ShareHighlightStoryArtworkFit
    cameoMaxAspect?: number
  }
}

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
  /** Per-asset Hukamnama art direction interpreted inside renderer-owned safe regions. */
  presentation?: ShareHighlightStoryPresentation
}

export interface ShareHighlightAsset {
  id: string
  src: string
  thumbnail: string
  displayName: ShareHighlightLocalizedCopy
  localizedDescription: ShareHighlightLocalizedCopy
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
  /** Explicit picker metadata; rights review is recorded independently from inclusion. */
  hukamnamaUse?: ShareHighlightHukamnamaUse
  /** Neutral description of only the content visible in the supplied artwork. */
  description: string
}

const EXISTING_HUKAMNAMA_USE_BY_ID = {
  'court-mural': {
    catalogStatus: 'included-existing',
    shortTreatment: 'contained-hero',
    longTreatment: 'ambient-mat',
    rightsReview: {
      status: 'unresolved',
      sourceStatus: 'unknown',
      note: 'No acquisition source, creator, owner, or license is recorded for this local file.',
    },
    culturalReview: {
      status: 'unresolved',
      flags: ['embedded-gurmukhi', 'historical-religious-context'],
      note: 'The Gurmukhi labels and represented history need transcription and Sikh editorial review.',
    },
  },
  'interior-audience': {
    catalogStatus: 'included-existing',
    shortTreatment: 'contained-hero',
    longTreatment: 'ambient-mat',
    rightsReview: {
      status: 'unresolved',
      sourceStatus: 'unknown',
      note: 'No acquisition source, creator, owner, or license is recorded for this local file.',
    },
    culturalReview: {
      status: 'unresolved',
      flags: ['guru-or-religious-figure', 'martial-imagery'],
      note: 'The represented figures and martial context need identification and Sikh editorial review.',
    },
  },
  'court-assembly': {
    catalogStatus: 'included-existing',
    shortTreatment: 'contained-hero',
    longTreatment: 'ambient-mat',
    rightsReview: {
      status: 'unresolved',
      sourceStatus: 'unknown',
      note: 'No acquisition source, creator, owner, or license is recorded for this local file.',
    },
    culturalReview: {
      status: 'unresolved',
      flags: ['guru-or-religious-figure', 'historical-religious-context'],
      note: 'The seated figure and historical court context need identification and Sikh editorial review.',
    },
  },
  'fort-procession': {
    catalogStatus: 'included-existing',
    shortTreatment: 'contained-hero',
    longTreatment: 'ambient-mat',
    rightsReview: {
      status: 'unresolved',
      sourceStatus: 'work-identified-file-unverified',
      creator: 'Edwin Lord Weeks',
      title: 'The Great Mogul and His Court Returning from the Great Mosque at Delhi, India',
      date: 'circa 1886',
      sourceUrl: 'https://collections.portlandmuseum.org/objects-1/info/18836',
      note: 'The museum identifies the underlying painting; this local derivative\'s acquisition and reuse terms remain unverified.',
    },
    culturalReview: {
      status: 'unresolved',
      flags: ['non-sikh-subject', 'orientalist-context'],
      note: 'This Mughal procession at Delhi is not Sikh-specific and needs an editorial relevance decision.',
    },
  },
  'string-and-tabla': {
    catalogStatus: 'included-existing',
    shortTreatment: 'contained-hero',
    longTreatment: 'ambient-mat',
    rightsReview: {
      status: 'blocked',
      sourceStatus: 'unknown',
      note: 'The artwork is visibly signed “manjeet singh”; no owner identity, acquisition source, or written permission is recorded.',
    },
    culturalReview: {
      status: 'unresolved',
      flags: ['sikh-devotional-music'],
      note: 'The musicians and devotional context need identification and Sikh editorial review.',
    },
  },
  'devotional-interior': {
    catalogStatus: 'included-existing',
    shortTreatment: 'contained-hero',
    longTreatment: 'ambient-mat',
    rightsReview: {
      status: 'unresolved',
      sourceStatus: 'work-identified-file-unverified',
      creator: 'William Carpenter',
      title: 'Interior of the Golden Temple, Amritsar',
      date: 'probably February 1854',
      sourceUrl: 'https://collections.vam.ac.uk/item/O430745/interior-of-the-golden-temple-painting-william-carpenter/',
      licenseNote: 'The V&A page permits only specified non-commercial downloads; other uses require licensing.',
      note: 'The museum identifies the underlying painting; this local derivative\'s acquisition and reuse terms remain unverified.',
    },
    culturalReview: {
      status: 'unresolved',
      flags: ['guru-granth-sahib', 'sacred-interior'],
      note: 'The depicted Guru Granth Sahib ceremony and sacred interior require Sikh editorial review.',
    },
  },
  'waterside-temple': {
    catalogStatus: 'included-existing',
    shortTreatment: 'contained-hero',
    longTreatment: 'ambient-mat',
    rightsReview: {
      status: 'blocked',
      sourceStatus: 'work-identified-file-unverified',
      creator: 'The Singh Twins',
      title: 'Nineteen Eighty-Four',
      date: '1999',
      sourceUrl: 'https://www.singhtwins.co.uk/shop_2020/giclee-prints_buy_unsigned/gc_buy_u-nineteen-eighty-four-.html',
      licenseNote: 'The artists state that all artwork is copyrighted and direct image licensing requests to their licensing contact.',
      note: 'The local crop\'s acquisition lineage is unverified; written image permission is required before release.',
    },
    culturalReview: {
      status: 'blocked',
      flags: ['operation-blue-star', 'graphic-violence', 'political-trauma', 'sacred-site'],
      note: 'Operation Blue Star trauma, casualties, political imagery, and Harmandir Sahib require explicit specialist sign-off.',
    },
  },
  'miniature-collage': {
    catalogStatus: 'included-existing',
    shortTreatment: 'contained-hero',
    longTreatment: 'ambient-mat',
    rightsReview: {
      status: 'unresolved',
      sourceStatus: 'unknown',
      note: 'No acquisition source, component sources, creator, owner, or license is recorded for this composite.',
    },
    culturalReview: {
      status: 'unresolved',
      flags: ['composite-artwork', 'embedded-gurmukhi', 'guru-or-religious-figure', 'martial-imagery'],
      note: 'Every component, represented figure, weapon, and text element needs verification and Sikh editorial review.',
    },
  },
  'rider-and-attendants': {
    catalogStatus: 'included-existing',
    shortTreatment: 'contained-hero',
    longTreatment: 'ambient-mat',
    rightsReview: {
      status: 'unresolved',
      sourceStatus: 'unknown',
      note: 'No acquisition source, creator, owner, or license is recorded for this local file.',
    },
    culturalReview: {
      status: 'unresolved',
      flags: ['guru-or-religious-figure', 'martial-imagery'],
      note: 'The mounted figure, attendants, falcons, and martial context need identification and Sikh editorial review.',
    },
  },
  'falconer-on-horseback': {
    catalogStatus: 'included-existing',
    shortTreatment: 'contained-hero',
    longTreatment: 'ambient-mat',
    rightsReview: {
      status: 'unresolved',
      sourceStatus: 'work-identified-file-unverified',
      creator: 'Ram Chand (attributed)',
      title: 'Equestrian portrait of Guru Gobind Singh attended upon by a Nihang',
      date: 'circa 1830–40',
      sourceUrl: 'https://www.kashihouse.com/artprints/equestrian-portrait-of-the-warrior-poet-guru-gobind-singh-1850',
      note: 'The underlying Toor Collection work is identified; this local crop and colour treatment\'s lineage and reuse terms remain unverified.',
    },
    culturalReview: {
      status: 'unresolved',
      flags: ['guru-or-religious-figure', 'martial-imagery', 'devi-or-angelic-figure'],
      note: 'The Guru Gobind Singh portrait, martial imagery, and Devi or angelic figure require Sikh editorial review.',
    },
  },
  'floral-teacher-mural': {
    catalogStatus: 'included-existing',
    shortTreatment: 'contained-hero',
    longTreatment: 'ambient-mat',
    rightsReview: {
      status: 'unresolved',
      sourceStatus: 'unknown',
      note: 'The mural site, photographer, acquisition source, owner, and license are not recorded.',
    },
    culturalReview: {
      status: 'unresolved',
      flags: ['guru-or-religious-figure', 'sacred-music'],
      note: 'The represented teacher and attendants need identification and Sikh editorial review.',
    },
  },
  'golden-court-assembly': {
    catalogStatus: 'included-existing',
    shortTreatment: 'contained-hero',
    longTreatment: 'ambient-mat',
    rightsReview: {
      status: 'unresolved',
      sourceStatus: 'unknown',
      note: 'No acquisition source, creator, owner, or license is recorded for this local file.',
    },
    culturalReview: {
      status: 'unresolved',
      flags: ['guru-or-religious-figure', 'interreligious-iconography'],
      note: 'The represented figures and interreligious iconography need identification and Sikh editorial review.',
    },
  },
  'gurmukhi-floral-medallion': {
    catalogStatus: 'included-existing',
    shortTreatment: 'contained-hero',
    longTreatment: 'ambient-mat',
    rightsReview: {
      status: 'unresolved',
      sourceStatus: 'unknown',
      note: 'The photographed location, photographer, acquisition source, owner, and license are not recorded.',
    },
    culturalReview: {
      status: 'unresolved',
      flags: ['embedded-gurmukhi'],
      note: 'The embedded Gurmukhi requires verified transcription, context, and Sikh editorial review.',
    },
  },
  'ceremonial-arms-display': {
    catalogStatus: 'included-existing',
    shortTreatment: 'contained-hero',
    longTreatment: 'ambient-mat',
    rightsReview: {
      status: 'unresolved',
      sourceStatus: 'unknown',
      note: 'The photographer, location, acquisition source, and license are unknown; the framed nested artwork also needs clearance.',
    },
    culturalReview: {
      status: 'unresolved',
      flags: ['shastar', 'nested-artwork', 'guru-or-religious-figure'],
      note: 'The shastar display and framed Guru artwork require contextual Sikh editorial review.',
    },
  },
} as const satisfies Record<string, ShareHighlightExistingHukamnamaUse>

const SHARE_HIGHLIGHT_LOCALIZED_COPY = {
  'court-mural': {
    displayName: { en: 'Court mural', pa: 'ਦਰਬਾਰੀ ਭਿੱਤ-ਚਿੱਤਰ', hi: 'दरबारी भित्तिचित्र' },
    localizedDescription: {
      en: 'A court scene with riders, attendants, floral borders, and Gurmukhi labels.',
      pa: 'ਸਵਾਰਾਂ, ਸੇਵਾਦਾਰਾਂ, ਫੁੱਲਦਾਰ ਹਾਸ਼ੀਆਂ ਅਤੇ ਗੁਰਮੁਖੀ ਲਿਖਤ ਵਾਲਾ ਦਰਬਾਰੀ ਦ੍ਰਿਸ਼।',
      hi: 'सवारों, परिचारकों, पुष्प किनारों और गुरमुखी लेखों वाला दरबारी दृश्य।',
    },
  },
  'interior-audience': {
    displayName: { en: 'Interior audience', pa: 'ਅੰਦਰੂਨੀ ਸਭਾ', hi: 'आंतरिक सभा' },
    localizedDescription: {
      en: 'An interior gathering beneath a broad maroon canopy.',
      pa: 'ਗੂੜ੍ਹੇ ਲਾਲ ਛਤਰ ਹੇਠ ਲੋਕਾਂ ਦੀ ਅੰਦਰੂਨੀ ਸਭਾ।',
      hi: 'गहरे लाल शामियाने के नीचे लोगों की आंतरिक सभा।',
    },
  },
  'court-assembly': {
    displayName: { en: 'Court assembly', pa: 'ਦਰਬਾਰੀ ਸਭਾ', hi: 'दरबारी सभा' },
    localizedDescription: {
      en: 'A crowded court assembly around a seated figure and a white horse.',
      pa: 'ਇੱਕ ਬੈਠੇ ਵਿਅਕਤੀ ਅਤੇ ਚਿੱਟੇ ਘੋੜੇ ਦੇ ਆਲੇ-ਦੁਆਲੇ ਭਰੀ ਦਰਬਾਰੀ ਸਭਾ।',
      hi: 'एक बैठे व्यक्ति और सफेद घोड़े के आसपास भरी दरबारी सभा।',
    },
  },
  'fort-procession': {
    displayName: { en: 'Fort procession', pa: 'ਕਿਲ੍ਹੇ ਕੋਲ ਜਲੂਸ', hi: 'किले के पास जुलूस' },
    localizedDescription: {
      en: 'A warm-toned procession of elephants and riders beside a red fort.',
      pa: 'ਲਾਲ ਕਿਲ੍ਹੇ ਕੋਲ ਹਾਥੀਆਂ ਅਤੇ ਘੋੜਸਵਾਰਾਂ ਦਾ ਗਰਮ ਰੰਗਾਂ ਵਾਲਾ ਜਲੂਸ।',
      hi: 'लाल किले के पास हाथियों और घुड़सवारों का गर्म रंगों वाला जुलूस।',
    },
  },
  'string-and-tabla': {
    displayName: { en: 'String and tabla', pa: 'ਤੰਤੀ ਸਾਜ਼ ਅਤੇ ਤਬਲਾ', hi: 'तंत्री वाद्य और तबला' },
    localizedDescription: {
      en: 'Two seated musicians playing a string instrument and tabla.',
      pa: 'ਬੈਠੇ ਦੋ ਸੰਗੀਤਕਾਰ ਤੰਤੀ ਸਾਜ਼ ਅਤੇ ਤਬਲਾ ਵਜਾਉਂਦੇ ਹੋਏ।',
      hi: 'बैठे हुए दो संगीतकार तंत्री वाद्य और तबला बजाते हुए।',
    },
  },
  'devotional-interior': {
    displayName: { en: 'Devotional interior', pa: 'ਅੰਦਰੂਨੀ ਭਗਤੀ ਸਭਾ', hi: 'आंतरिक भक्ति सभा' },
    localizedDescription: {
      en: 'A devotional gathering around a covered platform in an ornate interior.',
      pa: 'ਸਜਾਵਟੀ ਅੰਦਰੂਨੀ ਥਾਂ ਵਿੱਚ ਢੱਕੇ ਮੰਚ ਦੇ ਆਲੇ-ਦੁਆਲੇ ਭਗਤੀ ਸਭਾ।',
      hi: 'सजावटी आंतरिक स्थान में ढके मंच के आसपास भक्ति सभा।',
    },
  },
  'waterside-temple': {
    displayName: { en: 'Waterside temple', pa: 'ਸਰੋਵਰ ਕੰਢੇ ਧਾਰਮਿਕ ਸਥਾਨ', hi: 'सरोवर किनारे धार्मिक स्थल' },
    localizedDescription: {
      en: 'A waterside religious complex surrounded by crowds and conflict scenes.',
      pa: 'ਭੀੜਾਂ ਅਤੇ ਟਕਰਾਅ ਦੇ ਦ੍ਰਿਸ਼ਾਂ ਨਾਲ ਘਿਰਿਆ ਸਰੋਵਰ ਕੰਢੇ ਧਾਰਮਿਕ ਸਥਾਨ।',
      hi: 'भीड़ और संघर्ष के दृश्यों से घिरा सरोवर किनारे धार्मिक परिसर।',
    },
  },
  'miniature-collage': {
    displayName: { en: 'Miniature collage', pa: 'ਲਘੂ-ਚਿੱਤਰ ਕੋਲਾਜ', hi: 'लघुचित्र कोलाज' },
    localizedDescription: {
      en: 'A vertical collage of miniature scenes, figures, weapons, and embedded script.',
      pa: 'ਲਘੂ ਦ੍ਰਿਸ਼ਾਂ, ਪਾਤਰਾਂ, ਸ਼ਸਤ੍ਰਾਂ ਅਤੇ ਲਿਖਤ ਦਾ ਲੰਬਵਾਂ ਕੋਲਾਜ।',
      hi: 'लघु दृश्यों, आकृतियों, शस्त्रों और लिखावट का लंबवत कोलाज।',
    },
  },
  'rider-and-attendants': {
    displayName: { en: 'Rider and attendants', pa: 'ਸਵਾਰ ਅਤੇ ਸੇਵਾਦਾਰ', hi: 'सवार और परिचारक' },
    localizedDescription: {
      en: 'A mounted figure with attendants, a white horse, and falcons.',
      pa: 'ਸੇਵਾਦਾਰਾਂ, ਚਿੱਟੇ ਘੋੜੇ ਅਤੇ ਬਾਜ਼ਾਂ ਨਾਲ ਇੱਕ ਸਵਾਰ।',
      hi: 'परिचारकों, सफेद घोड़े और बाज़ों के साथ एक सवार।',
    },
  },
  'falconer-on-horseback': {
    displayName: { en: 'Falconer on horseback', pa: 'ਘੋੜਸਵਾਰ ਬਾਜ਼ਧਾਰੀ', hi: 'घोड़े पर बाज़धारी' },
    localizedDescription: {
      en: 'A green-robed rider holding a falcon on horseback.',
      pa: 'ਘੋੜੇ ਉੱਤੇ ਬਾਜ਼ ਫੜਿਆ ਹਰੇ ਵਸਤਰਾਂ ਵਾਲਾ ਸਵਾਰ।',
      hi: 'घोड़े पर बाज़ थामे हरे वस्त्रों वाला सवार।',
    },
  },
  'floral-teacher-mural': {
    displayName: { en: 'Floral teacher mural', pa: 'ਫੁੱਲਦਾਰ ਅਧਿਆਪਕ ਭਿੱਤ-ਚਿੱਤਰ', hi: 'पुष्पांकित शिक्षक भित्तिचित्र' },
    localizedDescription: {
      en: 'A floral-framed mural of a seated elder with two attendants.',
      pa: 'ਫੁੱਲਦਾਰ ਹਾਸ਼ੀਏ ਵਿੱਚ ਦੋ ਸੇਵਾਦਾਰਾਂ ਨਾਲ ਬੈਠੇ ਬਜ਼ੁਰਗ ਦਾ ਭਿੱਤ-ਚਿੱਤਰ।',
      hi: 'पुष्प किनारे में दो परिचारकों के साथ बैठे बुज़ुर्ग का भित्तिचित्र।',
    },
  },
  'golden-court-assembly': {
    displayName: { en: 'Golden court assembly', pa: 'ਸੁਨਹਿਰੀ ਦਰਬਾਰੀ ਸਭਾ', hi: 'स्वर्णिम दरबारी सभा' },
    localizedDescription: {
      en: 'A symmetrical golden court scene with seated figures and musicians.',
      pa: 'ਬੈਠੇ ਪਾਤਰਾਂ ਅਤੇ ਸੰਗੀਤਕਾਰਾਂ ਵਾਲਾ ਸਮਮਿਤ ਸੁਨਹਿਰੀ ਦਰਬਾਰੀ ਦ੍ਰਿਸ਼।',
      hi: 'बैठी आकृतियों और संगीतकारों वाला सममित स्वर्णिम दरबारी दृश्य।',
    },
  },
  'gurmukhi-floral-medallion': {
    displayName: { en: 'Gurmukhi floral medallion', pa: 'ਗੁਰਮੁਖੀ ਫੁੱਲਦਾਰ ਤਮਗਾ', hi: 'गुरमुखी पुष्प पदक' },
    localizedDescription: {
      en: 'An orange floral pattern surrounding a dark Gurmukhi medallion.',
      pa: 'ਗੂੜ੍ਹੇ ਗੁਰਮੁਖੀ ਤਮਗੇ ਦੇ ਆਲੇ-ਦੁਆਲੇ ਸੰਤਰੀ ਫੁੱਲਦਾਰ ਨਕਸ਼ਾ।',
      hi: 'गहरे गुरमुखी पदक के चारों ओर नारंगी पुष्प आकृति।',
    },
  },
  'ceremonial-arms-display': {
    displayName: { en: 'Ceremonial arms display', pa: 'ਰਸਮੀ ਸ਼ਸਤ੍ਰ ਪ੍ਰਦਰਸ਼ਨੀ', hi: 'औपचारिक शस्त्र प्रदर्शन' },
    localizedDescription: {
      en: 'A golden display of shields, swords, and a framed rider miniature.',
      pa: 'ਢਾਲਾਂ, ਤਲਵਾਰਾਂ ਅਤੇ ਸਵਾਰ ਦੇ ਫਰੇਮ ਕੀਤੇ ਲਘੂ-ਚਿੱਤਰ ਦੀ ਸੁਨਹਿਰੀ ਪ੍ਰਦਰਸ਼ਨੀ।',
      hi: 'ढालों, तलवारों और सवार के फ़्रेम किए लघुचित्र का स्वर्णिम प्रदर्शन।',
    },
  },
  'quiet-parchment': {
    displayName: { en: 'Quiet parchment', pa: 'ਸਾਦਾ ਪਾਰਚਮੈਂਟ', hi: 'शांत पार्चमेंट' },
    localizedDescription: {
      en: 'A quiet abstract parchment texture in green, cream, and muted copper.',
      pa: 'ਹਰੇ, ਕਰੀਮੀ ਅਤੇ ਮੱਧਮ ਤਾਂਬੇ ਰੰਗਾਂ ਵਿੱਚ ਸਾਦੀ ਅਮੂਰਤ ਪਾਰਚਮੈਂਟ ਬਣਾਵਟ।',
      hi: 'हरे, क्रीम और हल्के तांबे रंगों में शांत अमूर्त पार्चमेंट बनावट।',
    },
  },
} as const satisfies Record<string, {
  displayName: ShareHighlightLocalizedCopy
  localizedDescription: ShareHighlightLocalizedCopy
}>

export const shareHighlightAssets = [
  {
    id: 'court-mural',
    src: courtMuralSrc,
    thumbnail: courtMuralThumbnail,
    ...SHARE_HIGHLIGHT_LOCALIZED_COPY['court-mural'],
    hukamnamaUse: EXISTING_HUKAMNAMA_USE_BY_ID['court-mural'],
    original: { width: 1080, height: 1920, orientation: 'portrait' },
    normalized: { width: 1920, height: 1080, orientation: 'landscape' },
    orientationCorrection: 'rotate-90-ccw',
    focalPosition: { x: 0.53, y: 0.5 },
    textSafeZone: { x: 0.44, y: 0.25, width: 0.3, height: 0.38 },
    storyProfile: {
      mode: 'landscape-hero',
      focalPosition: { x: 0.53, y: 0.5 },
      heroHeightFraction: 0.35,
      presentation: {
        short: { fit: 'protected-cover', stageHeight: 500 },
        long: { frameEffect: 'warm', cameoFit: 'contain' },
      },
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
    ...SHARE_HIGHLIGHT_LOCALIZED_COPY['interior-audience'],
    hukamnamaUse: EXISTING_HUKAMNAMA_USE_BY_ID['interior-audience'],
    original: { width: 1200, height: 2132, orientation: 'portrait' },
    normalized: { width: 1080, height: 1920, orientation: 'portrait' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.42, y: 0.55 },
    textSafeZone: { x: 0.1, y: 0.63, width: 0.8, height: 0.23 },
    storyProfile: {
      mode: 'portrait-bleed',
      focalPosition: { x: 0.5, y: 0.55 },
      presentation: {
        short: { fit: 'protected-cover', stageHeight: 520 },
        long: { frameEffect: 'warm', cameoFit: 'protected-cover' },
      },
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
    ...SHARE_HIGHLIGHT_LOCALIZED_COPY['court-assembly'],
    hukamnamaUse: EXISTING_HUKAMNAMA_USE_BY_ID['court-assembly'],
    original: { width: 1200, height: 900, orientation: 'landscape' },
    normalized: { width: 1200, height: 900, orientation: 'landscape' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.39, y: 0.46 },
    textSafeZone: { x: 0.13, y: 0.64, width: 0.5, height: 0.3 },
    storyProfile: {
      mode: 'landscape-hero',
      focalPosition: { x: 0.5, y: 0.5 },
      heroHeightFraction: 0.36,
      presentation: {
        short: { fit: 'protected-cover', stageHeight: 500 },
        long: { frameEffect: 'cool', cameoFit: 'contain' },
      },
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
    ...SHARE_HIGHLIGHT_LOCALIZED_COPY['fort-procession'],
    hukamnamaUse: EXISTING_HUKAMNAMA_USE_BY_ID['fort-procession'],
    original: { width: 1100, height: 676, orientation: 'landscape' },
    normalized: { width: 1100, height: 676, orientation: 'landscape' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.54, y: 0.52 },
    textSafeZone: { x: 0.32, y: 0.05, width: 0.42, height: 0.32 },
    storyProfile: {
      mode: 'landscape-hero',
      focalPosition: { x: 0.52, y: 0.5 },
      heroHeightFraction: 0.34,
      presentation: {
        short: { fit: 'protected-cover', stageHeight: 500 },
        long: { frameEffect: 'warm', cameoFit: 'contain' },
      },
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
    ...SHARE_HIGHLIGHT_LOCALIZED_COPY['string-and-tabla'],
    hukamnamaUse: EXISTING_HUKAMNAMA_USE_BY_ID['string-and-tabla'],
    original: { width: 827, height: 565, orientation: 'landscape' },
    normalized: { width: 827, height: 565, orientation: 'landscape' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.5, y: 0.52 },
    textSafeZone: { x: 0.39, y: 0.04, width: 0.36, height: 0.34 },
    storyProfile: {
      mode: 'landscape-hero',
      focalPosition: { x: 0.49, y: 0.48 },
      heroHeightFraction: 0.34,
      presentation: {
        short: { fit: 'protected-cover', stageHeight: 500 },
        long: { frameEffect: 'cool', cameoFit: 'contain' },
      },
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
    ...SHARE_HIGHLIGHT_LOCALIZED_COPY['devotional-interior'],
    hukamnamaUse: EXISTING_HUKAMNAMA_USE_BY_ID['devotional-interior'],
    original: { width: 832, height: 592, orientation: 'landscape' },
    normalized: { width: 832, height: 592, orientation: 'landscape' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.57, y: 0.57 },
    textSafeZone: { x: 0.39, y: 0.03, width: 0.44, height: 0.31 },
    storyProfile: {
      mode: 'landscape-hero',
      focalPosition: { x: 0.57, y: 0.5 },
      heroHeightFraction: 0.35,
      presentation: {
        short: { fit: 'protected-cover', stageHeight: 500 },
        long: { frameEffect: 'warm', cameoFit: 'contain' },
      },
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
    ...SHARE_HIGHLIGHT_LOCALIZED_COPY['waterside-temple'],
    hukamnamaUse: EXISTING_HUKAMNAMA_USE_BY_ID['waterside-temple'],
    original: { width: 1024, height: 1366, orientation: 'portrait' },
    normalized: { width: 1024, height: 1366, orientation: 'portrait' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.49, y: 0.43 },
    textSafeZone: { x: 0.08, y: 0.04, width: 0.84, height: 0.28 },
    storyProfile: {
      mode: 'portrait-bleed',
      focalPosition: { x: 0.5, y: 0.495 },
      presentation: {
        short: { fit: 'contain', stageHeight: 520 },
        long: { frameEffect: 'vivid', cameoFit: 'contain' },
      },
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
    ...SHARE_HIGHLIGHT_LOCALIZED_COPY['miniature-collage'],
    hukamnamaUse: EXISTING_HUKAMNAMA_USE_BY_ID['miniature-collage'],
    original: { width: 1080, height: 1920, orientation: 'portrait' },
    normalized: { width: 1080, height: 1920, orientation: 'portrait' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.51, y: 0.47 },
    textSafeZone: { x: 0.08, y: 0.57, width: 0.84, height: 0.22 },
    storyProfile: {
      mode: 'portrait-bleed',
      focalPosition: { x: 0.5, y: 0.5 },
      presentation: {
        short: { fit: 'contain', stageHeight: 520 },
        long: { frameEffect: 'vivid', cameoFit: 'contain' },
      },
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
    ...SHARE_HIGHLIGHT_LOCALIZED_COPY['rider-and-attendants'],
    hukamnamaUse: EXISTING_HUKAMNAMA_USE_BY_ID['rider-and-attendants'],
    original: { width: 1200, height: 510, orientation: 'landscape' },
    normalized: { width: 1200, height: 510, orientation: 'landscape' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.53, y: 0.49 },
    textSafeZone: { x: 0.38, y: 0.65, width: 0.3, height: 0.3 },
    storyProfile: {
      mode: 'landscape-hero',
      focalPosition: { x: 0.5, y: 0.5 },
      heroHeightFraction: 0.31,
      presentation: {
        short: { fit: 'protected-cover', stageHeight: 423 },
        long: { frameEffect: 'cool', cameoFit: 'contain' },
      },
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
    ...SHARE_HIGHLIGHT_LOCALIZED_COPY['falconer-on-horseback'],
    hukamnamaUse: EXISTING_HUKAMNAMA_USE_BY_ID['falconer-on-horseback'],
    original: { width: 1200, height: 1517, orientation: 'portrait' },
    normalized: { width: 1200, height: 1517, orientation: 'portrait' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.51, y: 0.51 },
    textSafeZone: { x: 0.08, y: 0.68, width: 0.84, height: 0.24 },
    storyProfile: {
      mode: 'portrait-bleed',
      focalPosition: { x: 0.5, y: 0.47 },
      presentation: {
        short: { fit: 'protected-cover', stageHeight: 520 },
        long: { frameEffect: 'warm', cameoFit: 'contain' },
      },
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
    ...SHARE_HIGHLIGHT_LOCALIZED_COPY['floral-teacher-mural'],
    hukamnamaUse: EXISTING_HUKAMNAMA_USE_BY_ID['floral-teacher-mural'],
    original: { width: 720, height: 823, orientation: 'portrait' },
    normalized: { width: 720, height: 823, orientation: 'portrait' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.5, y: 0.49 },
    textSafeZone: { x: 0.1, y: 0.05, width: 0.8, height: 0.28 },
    storyProfile: {
      mode: 'pattern-frame',
      focalPosition: { x: 0.5, y: 0.44 },
      presentation: {
        short: { fit: 'protected-cover', stageHeight: 520 },
        long: { frameEffect: 'pattern', cameoFit: 'protected-cover' },
      },
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
    ...SHARE_HIGHLIGHT_LOCALIZED_COPY['golden-court-assembly'],
    hukamnamaUse: EXISTING_HUKAMNAMA_USE_BY_ID['golden-court-assembly'],
    original: { width: 1199, height: 1476, orientation: 'portrait' },
    normalized: { width: 1199, height: 1476, orientation: 'portrait' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.5, y: 0.56 },
    textSafeZone: { x: 0.08, y: 0.03, width: 0.84, height: 0.3 },
    storyProfile: {
      mode: 'portrait-bleed',
      focalPosition: { x: 0.5, y: 0.51 },
      presentation: {
        short: { fit: 'contain', stageHeight: 520 },
        long: { frameEffect: 'architectural', cameoFit: 'contain' },
      },
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
    ...SHARE_HIGHLIGHT_LOCALIZED_COPY['gurmukhi-floral-medallion'],
    hukamnamaUse: EXISTING_HUKAMNAMA_USE_BY_ID['gurmukhi-floral-medallion'],
    original: { width: 675, height: 1200, orientation: 'portrait' },
    normalized: { width: 675, height: 1200, orientation: 'portrait' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.5, y: 0.48 },
    textSafeZone: { x: 0.08, y: 0.15, width: 0.84, height: 0.22 },
    storyProfile: {
      mode: 'pattern-frame',
      focalPosition: { x: 0.5, y: 0.36 },
      presentation: {
        short: { fit: 'protected-cover', stageHeight: 520 },
        long: { frameEffect: 'pattern', cameoFit: 'protected-cover' },
      },
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
    ...SHARE_HIGHLIGHT_LOCALIZED_COPY['ceremonial-arms-display'],
    hukamnamaUse: EXISTING_HUKAMNAMA_USE_BY_ID['ceremonial-arms-display'],
    original: { width: 1200, height: 1500, orientation: 'portrait' },
    normalized: { width: 1200, height: 1500, orientation: 'portrait' },
    orientationCorrection: 'none',
    focalPosition: { x: 0.5, y: 0.51 },
    textSafeZone: { x: 0.08, y: 0.03, width: 0.84, height: 0.28 },
    storyProfile: {
      mode: 'pattern-frame',
      focalPosition: { x: 0.5, y: 0.525 },
      presentation: {
        short: { fit: 'protected-cover', stageHeight: 520 },
        long: {
          frameEffect: 'amber',
          cameoFit: 'protected-cover',
          cameoMaxAspect: 1.05,
        },
      },
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
    ...SHARE_HIGHLIGHT_LOCALIZED_COPY['quiet-parchment'],
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

/**
 * Existing share-gallery artwork intentionally exposed in the Hukamnama picker.
 * This explicit list is the catalog boundary: adding a normal share asset never
 * makes it available beside a Hukamnama by accident.
 */
export const shareHighlightHukamnamaAssetIds = [
  'court-mural',
  'interior-audience',
  'court-assembly',
  'fort-procession',
  'string-and-tabla',
  'devotional-interior',
  'waterside-temple',
  'miniature-collage',
  'rider-and-attendants',
  'falconer-on-horseback',
  'floral-teacher-mural',
  'golden-court-assembly',
  'gurmukhi-floral-medallion',
  'ceremonial-arms-display',
] as const

export type ShareHighlightHukamnamaAssetId =
  typeof shareHighlightHukamnamaAssetIds[number]

const SHARE_HIGHLIGHT_HUKAMNAMA_ASSET_ID_SET: ReadonlySet<string> = new Set(
  shareHighlightHukamnamaAssetIds
)

export function isShareHighlightHukamnamaAsset(
  asset: ShareHighlightAsset
): asset is ShareHighlightAsset & {
  id: ShareHighlightHukamnamaAssetId
  hukamnamaUse: ShareHighlightExistingHukamnamaUse
} {
  const use = asset.hukamnamaUse
  return SHARE_HIGHLIGHT_HUKAMNAMA_ASSET_ID_SET.has(asset.id)
    && Boolean(
      use
      && 'catalogStatus' in use
      && use.catalogStatus === 'included-existing'
    )
}

export const shareHighlightHukamnamaAssets = shareHighlightAssets.filter(
  isShareHighlightHukamnamaAsset
)
