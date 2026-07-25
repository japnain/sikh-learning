export const SHARE_HIGHLIGHT_CARD_WIDTH = 1080
export const SHARE_HIGHLIGHT_CARD_HEIGHT = 1350
/** Native 9:16 canvas for Instagram, WhatsApp, and other Story surfaces. */
export const SHARE_HIGHLIGHT_STORY_WIDTH = 1080
export const SHARE_HIGHLIGHT_STORY_HEIGHT = 1920
export const SHARE_HIGHLIGHT_BRAND_DOMAIN = 'naamras.xyz' as const

export interface ShareHighlightNormalizedPoint {
  /** Horizontal position from 0 (left) to 1 (right). */
  x: number
  /** Vertical position from 0 (top) to 1 (bottom). */
  y: number
}

export interface ShareHighlightNormalizedRect extends ShareHighlightNormalizedPoint {
  /** Width expressed as a fraction of the card width. */
  width: number
  /** Height expressed as a fraction of the card height. */
  height: number
}

export type ShareHighlightStoryArtworkMode =
  | 'portrait-bleed'
  | 'landscape-hero'
  | 'pattern-frame'

export interface ShareHighlightStoryProtectedSubject {
  bounds: ShareHighlightNormalizedRect
  intent: 'keep-visible' | 'keep-clear-of-text'
}

/**
 * Optional, hand-authored Story treatment for an artwork. These cues stay out
 * of the composer UI: the selected image simply arrives with a good crop and
 * an appropriate amount of visual breathing room.
 */
export interface ShareHighlightStoryArtworkProfile {
  mode: ShareHighlightStoryArtworkMode
  focalPosition?: ShareHighlightNormalizedPoint
  /** Height of a landscape hero as a fraction of the 9:16 frame. */
  heroHeightFraction?: number
  protectedSubject?: ShareHighlightStoryProtectedSubject
}

/**
 * Artwork metadata is deliberately structural so a bundled asset manifest can
 * be passed directly to the renderer without coupling the renderer to it.
 */
export interface ShareHighlightArtwork {
  id: string
  /** Omit or leave empty to render the deterministic solid-background option. */
  src?: string
  thumbnail?: string
  focalPosition?: ShareHighlightNormalizedPoint
  textSafeZone?: ShareHighlightNormalizedRect
  overlayTone?: string
  description?: string
  storyProfile?: ShareHighlightStoryArtworkProfile
}

export interface ShareHighlightCardContent {
  gurmukhi: string
  transliteration?: string | null
  meaning?: string | null
  sourceLabel: string
}

export type ShareHighlightTextPosition = 'auto' | 'top' | 'middle' | 'bottom'

export interface ShareHighlightCardInput {
  /** `null` renders the deterministic solid-background option. */
  artwork?: ShareHighlightArtwork | null
  content: ShareHighlightCardContent
  /** Keeps artwork-specific placement by default, with three simple vertical overrides. */
  textPosition?: ShareHighlightTextPosition
  /** Defaults to `naamras-highlight.png`. */
  fileName?: string
}

/**
 * One atomic line in a longer Gurbani reading. The one-frame Story renderer
 * wraps inside these fields while preserving their order and complete text.
 */
export interface ShareHighlightPassageLine {
  id: string | number
  gurmukhi: string
  transliteration?: string | null
  meaning?: string | null
  /** Structural labels such as “ਸਲੋਕ ॥” should stay with the next line when space permits. */
  isHeader?: boolean
}

export interface ShareHighlightPassageContent {
  lines: ShareHighlightPassageLine[]
  sourceLabel: string
  seriesLabel: string
  dateLabel?: string | null
}

/** A complete reading rendered onto one 9:16 Story image. */
export interface ShareHighlightPassageInput {
  /** `null` renders the deterministic solid-background option. */
  artwork?: ShareHighlightArtwork | null
  content: ShareHighlightPassageContent
  /** Defaults to `naamras-hukamnama.png`. */
  fileNameBase?: string
}

export type ShareHighlightTextRole = 'source' | 'gurmukhi' | 'transliteration' | 'meaning'

export interface ShareHighlightTextStyle {
  fontFamily: string
  fontSize: number
  fontStyle: 'normal' | 'italic'
  fontWeight: 400 | 500 | 600 | 700
  lineHeight: number
  color: string
}

export interface ShareHighlightTextSection {
  role: ShareHighlightTextRole
  lines: string[]
  style: ShareHighlightTextStyle
  x: number
  y: number
  width: number
  height: number
}

export interface ShareHighlightPixelRect {
  x: number
  y: number
  width: number
  height: number
}

export interface ShareHighlightCardLayout {
  width: typeof SHARE_HIGHLIGHT_CARD_WIDTH
  height: typeof SHARE_HIGHLIGHT_CARD_HEIGHT
  panel: ShareHighlightPixelRect
  contentScale: number
  textPosition: ShareHighlightTextPosition
  density: 'standard' | 'dense'
  sections: ShareHighlightTextSection[]
}

export interface ShareHighlightObjectCoverPlacement {
  sourceX: number
  sourceY: number
  sourceWidth: number
  sourceHeight: number
  destinationX: number
  destinationY: number
  destinationWidth: number
  destinationHeight: number
}

export interface ShareHighlightPngExport {
  canvas: HTMLCanvasElement
  blob: Blob
  file: File
  width: typeof SHARE_HIGHLIGHT_CARD_WIDTH
  height: typeof SHARE_HIGHLIGHT_CARD_HEIGHT
}

export interface ShareHighlightStoryTextSection extends ShareHighlightTextSection {
  sourceLineId: ShareHighlightPassageLine['id']
  isHeader: boolean
}

export type ShareHighlightStoryComposition =
  | 'expressive'
  | 'manuscript'

export interface ShareHighlightStoryFit {
  supportRoles: Array<'transliteration' | 'meaning'>
  fontSizes: {
    gurmukhi: number
    transliteration?: number
    meaning?: number
  }
  /** True when one or more roles are using their readability floor. */
  atReadabilityFloor: boolean
}

export interface ShareHighlightStoryLayout {
  width: typeof SHARE_HIGHLIGHT_STORY_WIDTH
  height: typeof SHARE_HIGHLIGHT_STORY_HEIGHT
  body: ShareHighlightPixelRect
  /** Opaque or near-opaque field that guarantees contrast behind the reading. */
  readingSurface: ShareHighlightPixelRect
  contentScale: number
  density: 'comfortable' | 'compact' | 'dense'
  composition: ShareHighlightStoryComposition
  artworkMode: ShareHighlightStoryArtworkMode
  fit: ShareHighlightStoryFit
  /** IDs in their exact rendered order, one entry for each non-empty source line. */
  sourceLineIds: ShareHighlightPassageLine['id'][]
  sections: ShareHighlightStoryTextSection[]
}

export interface ShareHighlightStoryPngExport {
  canvas: HTMLCanvasElement
  blob: Blob
  file: File
  width: typeof SHARE_HIGHLIGHT_STORY_WIDTH
  height: typeof SHARE_HIGHLIGHT_STORY_HEIGHT
}

export type ShareHighlightShareResult =
  | {
      status: 'shared'
      method: 'web-share'
    }
  | {
      status: 'cancelled'
      method: 'web-share'
    }
  | {
      status: 'downloaded'
      method: 'download'
      shareError?: unknown
    }
