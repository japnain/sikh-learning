export const SHARE_HIGHLIGHT_CARD_WIDTH = 1080
export const SHARE_HIGHLIGHT_CARD_HEIGHT = 1350
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
 * One atomic line in a longer Gurbani reading. Passage pagination never moves
 * part of a line onto another image; wrapping may occur only inside its fields.
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

/** A multi-image reading set. The existing single-card input remains unchanged. */
export interface ShareHighlightPassageInput {
  /** `null` renders the deterministic solid-background option on every page. */
  artwork?: ShareHighlightArtwork | null
  content: ShareHighlightPassageContent
  /** Defaults to `naamras-hukamnama`; ordered page metadata is appended automatically. */
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

export interface ShareHighlightPngSetPage extends ShareHighlightPngExport {
  pageNumber: number
  pageCount: number
}

export interface ShareHighlightPngSetExport {
  pages: ShareHighlightPngSetPage[]
  files: File[]
  totalPages: number
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
