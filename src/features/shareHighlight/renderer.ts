import {
  SHARE_HIGHLIGHT_BRAND_DOMAIN,
  SHARE_HIGHLIGHT_CARD_HEIGHT,
  SHARE_HIGHLIGHT_CARD_WIDTH,
  SHARE_HIGHLIGHT_STORY_HEIGHT,
  SHARE_HIGHLIGHT_STORY_WIDTH,
  type ShareHighlightCardContent,
  type ShareHighlightCardInput,
  type ShareHighlightCardLayout,
  type ShareHighlightNormalizedPoint,
  type ShareHighlightNormalizedRect,
  type ShareHighlightObjectCoverPlacement,
  type ShareHighlightPassageInput,
  type ShareHighlightPassageLine,
  type ShareHighlightPixelRect,
  type ShareHighlightPngExport,
  type ShareHighlightStoryLayout,
  type ShareHighlightStoryArtworkMode,
  type ShareHighlightStoryArtworkFit,
  type ShareHighlightStoryArtworkPresentation,
  type ShareHighlightStoryFrameEffect,
  type ShareHighlightStoryArtworkProfile,
  type ShareHighlightStoryComposition,
  type ShareHighlightStoryPngExport,
  type ShareHighlightStoryPngSet,
  type ShareHighlightStoryPngSetPage,
  type ShareHighlightStorySelection,
  type ShareHighlightStoryScopeCopy,
  type ShareHighlightStoryTextSection,
  type ShareHighlightTextRole,
  type ShareHighlightTextSection,
  type ShareHighlightTextPosition,
  type ShareHighlightTextStyle,
} from './types'
import {
  drawShareHighlightQrCode,
  SHARE_HIGHLIGHT_QR_RENDER_SIZE,
} from './qrCode'
import { buildHukamnamaArtworkSlices, getHukamnamaArtDirection } from './hukamnamaArtDirection'

const DEFAULT_FOCAL_POSITION: ShareHighlightNormalizedPoint = { x: 0.5, y: 0.5 }
const DEFAULT_TEXT_SAFE_ZONE: ShareHighlightNormalizedRect = {
  x: 0.12,
  y: 0.2,
  width: 0.76,
  height: 0.58,
}
const PANEL_CORNER_RADIUS = 76
const PANEL_HORIZONTAL_PADDING = 48
const PANEL_VERTICAL_PADDING = 40
const MIN_PANEL_HEIGHT = 210
const MIN_PANEL_WIDTH = 470
const MAX_PANEL_WIDTH = 956
const TEXT_SCALE_MINIMUM = 0.5
const TEXT_SCALE_STEP = 0.02
const TEXT_REGION_HORIZONTAL_MARGIN = 62
const TEXT_REGION_MINIMUM_TOP = 78
const TEXT_REGION_MAXIMUM_BOTTOM = 1180
const FOOTER_BASELINE = 1294
const FOOTER_HORIZONTAL_MARGIN = 62

/** Story UI chrome commonly occupies roughly the outer 10–12% vertically. */
const STORY_SAFE_TOP = 204
const STORY_SAFE_BOTTOM = 1712
const STORY_METADATA_X = 72
const STORY_METADATA_WIDTH = SHARE_HIGHLIGHT_STORY_WIDTH - (STORY_METADATA_X * 2)
const STORY_FOOTER_BASELINE = STORY_SAFE_BOTTOM - 18
const STORY_FOOTER_HORIZONTAL_MARGIN = 72
const STORY_LINK_FOOTER_TOP = 1544
const STORY_LINK_QR_SIZE = SHARE_HIGHLIGHT_QR_RENDER_SIZE
const STORY_LINK_QR_X = SHARE_HIGHLIGHT_STORY_WIDTH - STORY_FOOTER_HORIZONTAL_MARGIN - STORY_LINK_QR_SIZE
const STORY_LINK_QR_Y = STORY_SAFE_BOTTOM - STORY_LINK_QR_SIZE
const STORY_EXPRESSIVE_HEADER_SURFACE: ShareHighlightPixelRect = {
  x: 46,
  y: STORY_SAFE_TOP - 18,
  width: 988,
  height: 112,
}
const STORY_EXPRESSIVE_ART_STAGE: ShareHighlightPixelRect = {
  x: 72,
  y: 318,
  width: 936,
  height: 520,
}
const STORY_EXPRESSIVE_AMBIENT_OVERSCAN = 36
const STORY_EXPRESSIVE_AMBIENT_DESTINATION: ShareHighlightPixelRect = {
  x: -STORY_EXPRESSIVE_AMBIENT_OVERSCAN,
  y: -STORY_EXPRESSIVE_AMBIENT_OVERSCAN,
  width: SHARE_HIGHLIGHT_STORY_WIDTH + (STORY_EXPRESSIVE_AMBIENT_OVERSCAN * 2),
  height: SHARE_HIGHLIGHT_STORY_HEIGHT + (STORY_EXPRESSIVE_AMBIENT_OVERSCAN * 2),
}
const STORY_EXPRESSIVE_PLAIN_FOOTER_SURFACE: ShareHighlightPixelRect = {
  x: 46,
  y: 1614,
  width: 988,
  height: 98,
}
const STORY_EXPRESSIVE_LINK_FOOTER_SURFACE: ShareHighlightPixelRect = {
  x: 46,
  y: STORY_LINK_FOOTER_TOP - 10,
  width: 988,
  height: 178,
}
const STORY_SCALE_STEP = 0.02
const HUKAMNAMA_IMAGE_MAX_HEIGHT = 8192
const MANUSCRIPT_HEADER_CENTER_Y = 220
const MANUSCRIPT_HEADER_RULE_Y = 258
const MANUSCRIPT_ART_HEADER_RULE_Y = 272
const STORY_MANUSCRIPT_ART_READING_SURFACE: ShareHighlightPixelRect = {
  x: 40,
  y: 132,
  width: 1000,
  height: 1640,
}
const STORY_MANUSCRIPT_CAMEO_STAGE: ShareHighlightPixelRect = {
  x: 56,
  y: 154,
  width: 136,
  height: 116,
}
const STORY_MANUSCRIPT_HEADER_COPY: ShareHighlightPixelRect = {
  x: 220,
  y: 172,
  width: 796,
  height: 86,
}
const STORY_MANUSCRIPT_AMBIENT_OVERSCAN = 24
const MANUSCRIPT_PLAIN_FOOTER_RULE_Y = 1658
const MANUSCRIPT_LINK_FOOTER_RULE_Y = 1532
const MANUSCRIPT_HEADER_GAP = 28
const MANUSCRIPT_TITLE_MAX_SIZE = 32
const MANUSCRIPT_TITLE_MIN_SIZE = 23
const MANUSCRIPT_DATE_MAX_SIZE = 25
const MANUSCRIPT_DATE_MIN_SIZE = 19
const MANUSCRIPT_MAX_DISTRIBUTED_GAP = 18

interface StoryCompositionSpec {
  body: ShareHighlightPixelRect
  readingSurface: ShareHighlightPixelRect
  maximum: StoryRoleFontSizes
  minimum: StoryRoleFontSizes
  sectionGap: number
  lineGap: number
  headerGap: number
}

interface StoryRoleFontSizes {
  header: number
  gurmukhi: number
  transliteration: number
  meaning: number
}

type SingleColumnStoryComposition = ShareHighlightStoryComposition
export type ShareHighlightStoryFooterMode = 'plain' | 'linked'

const LINKED_STORY_BODY_HEIGHTS: Record<SingleColumnStoryComposition, number> = {
  expressive: 1160,
  manuscript: 1238,
}

const STORY_COMPOSITIONS: Record<SingleColumnStoryComposition, StoryCompositionSpec> = {
  expressive: {
    // The expressive card begins below the metadata, leaving a clean
    // seam of artwork between the two instead of forming one large text wall.
    body: { x: 82, y: 360, width: 916, height: 1192 },
    readingSurface: { x: 46, y: 318, width: 988, height: 1278 },
    maximum: { header: 42, gurmukhi: 54, transliteration: 34, meaning: 36 },
    minimum: { header: 34, gurmukhi: 42, transliteration: 32, meaning: 32 },
    sectionGap: 8,
    lineGap: 18,
    headerGap: 8,
  },
  manuscript: {
    // The parchment itself nearly fills the Story. Text remains inside the
    // platform-safe editorial region, while the full-height paper removes the
    // dark dead bands that made long readings feel stranded in the canvas.
    body: { x: 64, y: 282, width: 952, height: 1362 },
    readingSurface: { x: 18, y: 72, width: 1044, height: 1776 },
    maximum: { header: 38, gurmukhi: 48, transliteration: 34, meaning: 34 },
    minimum: { header: 28, gurmukhi: 42, transliteration: 32, meaning: 32 },
    sectionGap: 4,
    lineGap: 5,
    headerGap: 3,
  },
}

const CONTAINED_ART_EXPRESSIVE_COMPOSITION: StoryCompositionSpec = {
  body: { x: 82, y: 910, width: 916, height: 590 },
  readingSurface: { x: 46, y: 868, width: 988, height: 674 },
  maximum: STORY_COMPOSITIONS.expressive.maximum,
  minimum: STORY_COMPOSITIONS.expressive.minimum,
  sectionGap: STORY_COMPOSITIONS.expressive.sectionGap,
  lineGap: STORY_COMPOSITIONS.expressive.lineGap,
  headerGap: STORY_COMPOSITIONS.expressive.headerGap,
}

function resolveStoryCompositionSpec(
  composition: SingleColumnStoryComposition,
  footerMode: ShareHighlightStoryFooterMode,
  storyProfile?: ShareHighlightStoryArtworkProfile
): StoryCompositionSpec {
  const usesContainedArtwork = composition === 'expressive' && Boolean(storyProfile)
  const usesArtworkMat = composition === 'manuscript' && Boolean(storyProfile)
  const baseSpec = usesContainedArtwork
    ? CONTAINED_ART_EXPRESSIVE_COMPOSITION
    : STORY_COMPOSITIONS[composition]
  const spec = usesArtworkMat
    ? {
        ...baseSpec,
        readingSurface: { ...STORY_MANUSCRIPT_ART_READING_SURFACE },
      }
    : baseSpec
  if (footerMode === 'plain') return spec

  return {
    ...spec,
    body: {
      ...spec.body,
      height: usesContainedArtwork
        ? 500
        : LINKED_STORY_BODY_HEIGHTS[composition],
    },
  }
}

const SHARE_SANS_FONT_FAMILY = '"Plus Jakarta Sans", "Noto Serif Gurmukhi", "Noto Sans Devanagari", sans-serif'
const SHARE_TITLE_FONT_FAMILY = '"Cormorant Garamond", "Noto Serif Gurmukhi", "Noto Sans Devanagari", serif'

const STORY_ROLE_SPECS = {
  header: {
    lineHeightRatio: 1.2,
    fontFamily: '"Noto Serif Gurmukhi", serif',
    fontStyle: 'normal' as const,
    fontWeight: 600 as const,
  },
  gurmukhi: {
    lineHeightRatio: 1.2,
    fontFamily: '"Noto Serif Gurmukhi", serif',
    fontStyle: 'normal' as const,
    fontWeight: 600 as const,
  },
  transliteration: {
    lineHeightRatio: 1.28,
    fontFamily: SHARE_SANS_FONT_FAMILY,
    fontStyle: 'italic' as const,
    fontWeight: 500 as const,
  },
  meaning: {
    lineHeightRatio: 1.28,
    fontFamily: SHARE_SANS_FONT_FAMILY,
    fontStyle: 'normal' as const,
    fontWeight: 500 as const,
  },
}

const TEXT_SPECS: Record<ShareHighlightTextRole, {
  maximumFontSize: number
  minimumFontSize: number
  lineHeightRatio: number
  fontFamily: string
  fontStyle: ShareHighlightTextStyle['fontStyle']
  fontWeight: ShareHighlightTextStyle['fontWeight']
}> = {
  source: {
    maximumFontSize: 25,
    minimumFontSize: 18,
    lineHeightRatio: 1.35,
    fontFamily: SHARE_SANS_FONT_FAMILY,
    fontStyle: 'normal',
    fontWeight: 700,
  },
  gurmukhi: {
    maximumFontSize: 76,
    minimumFontSize: 38,
    lineHeightRatio: 1.48,
    fontFamily: '"Noto Serif Gurmukhi", serif',
    fontStyle: 'normal',
    fontWeight: 600,
  },
  transliteration: {
    maximumFontSize: 31,
    minimumFontSize: 20,
    lineHeightRatio: 1.5,
    fontFamily: SHARE_SANS_FONT_FAMILY,
    fontStyle: 'italic',
    fontWeight: 500,
  },
  meaning: {
    maximumFontSize: 34,
    minimumFontSize: 21,
    lineHeightRatio: 1.48,
    fontFamily: SHARE_SANS_FONT_FAMILY,
    fontStyle: 'normal',
    fontWeight: 500,
  },
}

const SECTION_GAPS: Record<ShareHighlightTextRole, number> = {
  source: 0,
  gurmukhi: 24,
  transliteration: 20,
  meaning: 0,
}

export interface ShareHighlightOverlayPalette {
  kind: 'parchment' | 'warm-ink' | 'cool-ink' | 'neutral-ink'
  primaryText: string
  secondaryText: string
  standardWash: string
  denseWash: string
  washShoulder: string
  washFeather: string
  shadow: string
}

const OVERLAY_PALETTES: Record<ShareHighlightOverlayPalette['kind'], ShareHighlightOverlayPalette> = {
  parchment: {
    kind: 'parchment',
    primaryText: '#251d16',
    secondaryText: 'rgba(37, 29, 22, 0.82)',
    standardWash: 'rgba(249, 242, 224, 0.7)',
    denseWash: 'rgba(249, 242, 224, 0.82)',
    washShoulder: 'rgba(249, 242, 224, 0.42)',
    washFeather: 'rgba(249, 242, 224, 0)',
    shadow: 'rgba(255, 250, 238, 0.58)',
  },
  'warm-ink': {
    kind: 'warm-ink',
    primaryText: '#fff8eb',
    secondaryText: 'rgba(255, 246, 231, 0.82)',
    standardWash: 'rgba(48, 27, 18, 0.62)',
    denseWash: 'rgba(43, 23, 15, 0.78)',
    washShoulder: 'rgba(48, 27, 18, 0.34)',
    washFeather: 'rgba(48, 27, 18, 0)',
    shadow: 'rgba(7, 3, 2, 0.72)',
  },
  'cool-ink': {
    kind: 'cool-ink',
    primaryText: '#f9fbf7',
    secondaryText: 'rgba(239, 246, 242, 0.82)',
    standardWash: 'rgba(7, 24, 29, 0.62)',
    denseWash: 'rgba(5, 20, 25, 0.8)',
    washShoulder: 'rgba(7, 24, 29, 0.34)',
    washFeather: 'rgba(7, 24, 29, 0)',
    shadow: 'rgba(1, 7, 9, 0.76)',
  },
  'neutral-ink': {
    kind: 'neutral-ink',
    primaryText: '#fffaf0',
    secondaryText: 'rgba(246, 241, 231, 0.82)',
    standardWash: 'rgba(8, 11, 12, 0.62)',
    denseWash: 'rgba(6, 9, 10, 0.8)',
    washShoulder: 'rgba(8, 11, 12, 0.34)',
    washFeather: 'rgba(8, 11, 12, 0)',
    shadow: 'rgba(1, 3, 3, 0.76)',
  },
}

export type ShareHighlightTextMeasure = (text: string, style: ShareHighlightTextStyle) => number

export interface ShareHighlightDecodedImage {
  source: CanvasImageSource
  width: number
  height: number
}

export interface ShareHighlightFontSet {
  ready: PromiseLike<unknown>
  load: (font: string, text?: string) => PromiseLike<readonly unknown[]>
  check?: (font: string, text?: string) => boolean
}

export interface ShareHighlightRendererOptions {
  canvas?: HTMLCanvasElement
  createCanvas?: () => HTMLCanvasElement
  loadImage?: (src: string, signal?: AbortSignal) => Promise<ShareHighlightDecodedImage>
  /** Pass `null` only in a controlled environment that has no FontFaceSet. */
  fontSet?: ShareHighlightFontSet | null
  /** Cancels stale or closed render work without surfacing a user-facing failure. */
  signal?: AbortSignal
  /** Defaults to 12 seconds for the complete image load and decode operation. */
  imageDecodeTimeoutMs?: number
  /** Defaults to 15 seconds for each PNG page encoding operation. */
  pngEncodeTimeoutMs?: number
}

export class ShareHighlightRenderAbortedError extends Error {
  readonly code = 'share-highlight-render-aborted'

  constructor() {
    super('Share image rendering was cancelled.')
    this.name = 'AbortError'
  }
}

export class ShareHighlightRenderTimeoutError extends Error {
  readonly code = 'share-highlight-render-timeout'

  constructor(message: string) {
    super(message)
    this.name = 'ShareHighlightRenderTimeoutError'
  }
}

/** Keeps an oversized complete reading distinguishable from a retryable render failure. */
export class HukamnamaImageTooLongError extends RangeError {
  readonly code = 'hukamnama-image-too-long'
  readonly requiredHeight: number
  readonly maximumHeight = HUKAMNAMA_IMAGE_MAX_HEIGHT

  constructor(requiredHeight: number) {
    super('This reading is too long for one safely readable image.')
    this.name = 'HukamnamaImageTooLongError'
    this.requiredHeight = requiredHeight
  }
}

export class ShareHighlightContentOverflowError extends Error {
  readonly code = 'share-highlight-content-overflow'
  readonly requiredHeight: number
  readonly availableHeight: number
  readonly reason: 'support-overflow' | 'gurmukhi-overflow' | 'card-overflow'
  readonly supportRoles: Array<'transliteration' | 'meaning'>

  constructor(
    requiredHeight: number,
    availableHeight: number,
    details: {
      reason?: ShareHighlightContentOverflowError['reason']
      supportRoles?: ShareHighlightContentOverflowError['supportRoles']
    } = {}
  ) {
    super(`Share highlight content needs ${Math.ceil(requiredHeight)}px but only ${Math.floor(availableHeight)}px is available.`)
    this.name = 'ShareHighlightContentOverflowError'
    this.requiredHeight = requiredHeight
    this.availableHeight = availableHeight
    this.reason = details.reason ?? 'card-overflow'
    this.supportRoles = details.supportRoles ?? []
  }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function finiteOr(value: number | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function normalizePoint(point?: ShareHighlightNormalizedPoint): ShareHighlightNormalizedPoint {
  return {
    x: clamp(finiteOr(point?.x, DEFAULT_FOCAL_POSITION.x), 0, 1),
    y: clamp(finiteOr(point?.y, DEFAULT_FOCAL_POSITION.y), 0, 1),
  }
}

function normalizePlacementCue(zone?: ShareHighlightNormalizedRect): ShareHighlightNormalizedRect {
  const candidate = zone ?? DEFAULT_TEXT_SAFE_ZONE
  const x = clamp(finiteOr(candidate.x, DEFAULT_TEXT_SAFE_ZONE.x), 0, 1)
  const y = clamp(finiteOr(candidate.y, DEFAULT_TEXT_SAFE_ZONE.y), 0, 1)
  const width = clamp(finiteOr(candidate.width, DEFAULT_TEXT_SAFE_ZONE.width), 0, 1 - x)
  const height = clamp(finiteOr(candidate.height, DEFAULT_TEXT_SAFE_ZONE.height), 0, 1 - y)
  return { x, y, width, height }
}

function normalizeTextPosition(position?: ShareHighlightTextPosition): ShareHighlightTextPosition {
  return position === 'top' || position === 'middle' || position === 'bottom' ? position : 'auto'
}

export function resolveShareHighlightOverlayPalette(overlayTone?: string): ShareHighlightOverlayPalette {
  switch (overlayTone?.trim().toLowerCase()) {
    case 'light':
      return OVERLAY_PALETTES.parchment
    case 'warm-dark':
      return OVERLAY_PALETTES['warm-ink']
    case 'cool-dark':
      return OVERLAY_PALETTES['cool-ink']
    default:
      return OVERLAY_PALETTES['neutral-ink']
  }
}

export function resolveShareHighlightTextPanel(
  zone?: ShareHighlightNormalizedRect,
  position: ShareHighlightTextPosition = 'auto',
  desiredSize?: Partial<Pick<ShareHighlightPixelRect, 'width' | 'height'>>
): ShareHighlightPixelRect {
  const cue = normalizePlacementCue(zone)
  const cueCenterX = cue.x + (cue.width / 2)
  const cueCenterY = cue.y + (cue.height / 2)
  const authoredWidth = cue.width * SHARE_HIGHLIGHT_CARD_WIDTH
  const authoredHeight = cue.height * SHARE_HIGHLIGHT_CARD_HEIGHT
  const width = Math.round(clamp(
    finiteOr(desiredSize?.width, authoredWidth),
    MIN_PANEL_WIDTH,
    MAX_PANEL_WIDTH
  ))
  const height = Math.round(clamp(
    finiteOr(desiredSize?.height, authoredHeight),
    MIN_PANEL_HEIGHT,
    TEXT_REGION_MAXIMUM_BOTTOM - TEXT_REGION_MINIMUM_TOP
  ))
  const maximumX = SHARE_HIGHLIGHT_CARD_WIDTH - TEXT_REGION_HORIZONTAL_MARGIN - width
  const maximumY = TEXT_REGION_MAXIMUM_BOTTOM - height
  const resolvedPosition = normalizeTextPosition(position)
  let y = (cueCenterY * SHARE_HIGHLIGHT_CARD_HEIGHT) - (height / 2)

  if (resolvedPosition === 'top') y = TEXT_REGION_MINIMUM_TOP
  if (resolvedPosition === 'middle') {
    y = TEXT_REGION_MINIMUM_TOP + (
      (TEXT_REGION_MAXIMUM_BOTTOM - TEXT_REGION_MINIMUM_TOP - height) / 2
    )
  }
  if (resolvedPosition === 'bottom') y = maximumY

  return {
    x: Math.round(clamp(
      (cueCenterX * SHARE_HIGHLIGHT_CARD_WIDTH) - (width / 2),
      TEXT_REGION_HORIZONTAL_MARGIN,
      maximumX
    )),
    y: Math.round(clamp(
      y,
      TEXT_REGION_MINIMUM_TOP,
      maximumY
    )),
    width,
    height,
  }
}

/** Maps a cue authored in source-art coordinates through the object-cover crop. */
export function mapShareHighlightArtworkSafeZone(
  zone: ShareHighlightNormalizedRect,
  imageWidth: number,
  imageHeight: number,
  placement: ShareHighlightObjectCoverPlacement
): ShareHighlightNormalizedRect {
  const cue = normalizePlacementCue(zone)
  const mappedX = ((cue.x * imageWidth) - placement.sourceX) / placement.sourceWidth
  const mappedY = ((cue.y * imageHeight) - placement.sourceY) / placement.sourceHeight
  return {
    x: mappedX,
    y: mappedY,
    width: (cue.width * imageWidth) / placement.sourceWidth,
    height: (cue.height * imageHeight) / placement.sourceHeight,
  }
}

export function computeShareHighlightObjectCover(
  imageWidth: number,
  imageHeight: number,
  destinationWidth = SHARE_HIGHLIGHT_CARD_WIDTH,
  destinationHeight = SHARE_HIGHLIGHT_CARD_HEIGHT,
  focalPosition: ShareHighlightNormalizedPoint = DEFAULT_FOCAL_POSITION
): ShareHighlightObjectCoverPlacement {
  if (imageWidth <= 0 || imageHeight <= 0 || destinationWidth <= 0 || destinationHeight <= 0) {
    throw new RangeError('Artwork and destination dimensions must be greater than zero.')
  }

  const focal = normalizePoint(focalPosition)
  const scale = Math.max(destinationWidth / imageWidth, destinationHeight / imageHeight)
  // Near-equal aspect ratios can produce a source dimension a tiny fraction
  // larger than the decoded bitmap. Clamp the derived crop before calculating
  // its origin so floating-point drift never creates a negative source pixel.
  const sourceWidth = Math.min(imageWidth, destinationWidth / scale)
  const sourceHeight = Math.min(imageHeight, destinationHeight / scale)
  const maximumSourceX = Math.max(0, imageWidth - sourceWidth)
  const maximumSourceY = Math.max(0, imageHeight - sourceHeight)
  const sourceX = clamp(
    (imageWidth * focal.x) - (sourceWidth / 2),
    0,
    maximumSourceX
  )
  const sourceY = clamp(
    (imageHeight * focal.y) - (sourceHeight / 2),
    0,
    maximumSourceY
  )

  return {
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    destinationX: 0,
    destinationY: 0,
    destinationWidth,
    destinationHeight,
  }
}

/** Fits the complete source inside an exact canvas stage without cropping it. */
export function computeShareHighlightObjectContain(
  imageWidth: number,
  imageHeight: number,
  destination: ShareHighlightPixelRect = {
    x: 0,
    y: 0,
    width: SHARE_HIGHLIGHT_STORY_WIDTH,
    height: SHARE_HIGHLIGHT_STORY_HEIGHT,
  }
): ShareHighlightObjectCoverPlacement {
  if (
    !Number.isFinite(imageWidth)
    || !Number.isFinite(imageHeight)
    || imageWidth <= 0
    || imageHeight <= 0
    || !Number.isFinite(destination.x)
    || !Number.isFinite(destination.y)
    || !Number.isFinite(destination.width)
    || !Number.isFinite(destination.height)
    || destination.width <= 0
    || destination.height <= 0
  ) {
    throw new RangeError('Artwork and destination dimensions must be finite and greater than zero.')
  }

  const scale = Math.min(
    destination.width / imageWidth,
    destination.height / imageHeight
  )
  const destinationWidth = imageWidth * scale
  const destinationHeight = imageHeight * scale
  return {
    sourceX: 0,
    sourceY: 0,
    sourceWidth: imageWidth,
    sourceHeight: imageHeight,
    destinationX: destination.x + ((destination.width - destinationWidth) / 2),
    destinationY: destination.y + ((destination.height - destinationHeight) / 2),
    destinationWidth,
    destinationHeight,
  }
}

function isValidNormalizedBounds(bounds: ShareHighlightNormalizedRect) {
  return Number.isFinite(bounds.x)
    && Number.isFinite(bounds.y)
    && Number.isFinite(bounds.width)
    && Number.isFinite(bounds.height)
    && bounds.x >= 0
    && bounds.y >= 0
    && bounds.width > 0
    && bounds.height > 0
    && bounds.x + bounds.width <= 1
    && bounds.y + bounds.height <= 1
}

function isValidArtworkPlacement(
  placement: ShareHighlightObjectCoverPlacement,
  imageWidth: number,
  imageHeight: number
) {
  return Number.isFinite(imageWidth)
    && Number.isFinite(imageHeight)
    && imageWidth > 0
    && imageHeight > 0
    && Number.isFinite(placement.sourceX)
    && Number.isFinite(placement.sourceY)
    && Number.isFinite(placement.sourceWidth)
    && Number.isFinite(placement.sourceHeight)
    && Number.isFinite(placement.destinationX)
    && Number.isFinite(placement.destinationY)
    && Number.isFinite(placement.destinationWidth)
    && Number.isFinite(placement.destinationHeight)
    && placement.sourceWidth > 0
    && placement.sourceHeight > 0
    && placement.destinationWidth > 0
    && placement.destinationHeight > 0
    && placement.sourceX >= 0
    && placement.sourceY >= 0
    && placement.sourceX + placement.sourceWidth <= imageWidth + 0.001
    && placement.sourceY + placement.sourceHeight <= imageHeight + 0.001
}

/** Maps exact source-normalized subject bounds through one resolved draw placement. */
export function mapShareHighlightArtworkBoundsToCanvas(
  bounds: ShareHighlightNormalizedRect,
  imageWidth: number,
  imageHeight: number,
  placement: ShareHighlightObjectCoverPlacement
): ShareHighlightPixelRect {
  if (!isValidNormalizedBounds(bounds)) {
    throw new RangeError('Protected artwork bounds must be a positive normalized rectangle.')
  }
  if (!isValidArtworkPlacement(placement, imageWidth, imageHeight)) {
    throw new RangeError('Artwork placement dimensions must be finite and greater than zero.')
  }

  const sourceX = bounds.x * imageWidth
  const sourceY = bounds.y * imageHeight
  const sourceWidth = bounds.width * imageWidth
  const sourceHeight = bounds.height * imageHeight
  return {
    x: placement.destinationX + (
      ((sourceX - placement.sourceX) / placement.sourceWidth)
      * placement.destinationWidth
    ),
    y: placement.destinationY + (
      ((sourceY - placement.sourceY) / placement.sourceHeight)
      * placement.destinationHeight
    ),
    width: (sourceWidth / placement.sourceWidth) * placement.destinationWidth,
    height: (sourceHeight / placement.sourceHeight) * placement.destinationHeight,
  }
}

function splitGraphemes(value: string): string[] {
  const Segmenter = (Intl as unknown as {
    Segmenter?: new (locale: string, options: { granularity: 'grapheme' }) => {
      segment: (input: string) => Iterable<{ segment: string }>
    }
  }).Segmenter

  if (!Segmenter) return Array.from(value)
  const segmenter = new Segmenter('pa', { granularity: 'grapheme' })
  return Array.from(segmenter.segment(value), item => item.segment)
}

function splitOversizedToken(
  token: string,
  maximumWidth: number,
  style: ShareHighlightTextStyle,
  measure: ShareHighlightTextMeasure
) {
  const chunks: string[] = []
  let current = ''

  for (const grapheme of splitGraphemes(token)) {
    const candidate = current + grapheme
    if (current && measure(candidate, style) > maximumWidth) {
      chunks.push(current)
      current = grapheme
    } else {
      current = candidate
    }
  }

  if (current) chunks.push(current)
  return chunks
}

function wrapParagraph(
  paragraph: string,
  maximumWidth: number,
  style: ShareHighlightTextStyle,
  measure: ShareHighlightTextMeasure
) {
  const tokens = paragraph.trim().split(/\s+/u).filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const token of tokens) {
    if (measure(token, style) > maximumWidth) {
      if (current) {
        lines.push(current)
        current = ''
      }

      const chunks = splitOversizedToken(token, maximumWidth, style, measure)
      chunks.slice(0, -1).forEach(chunk => lines.push(chunk))
      current = chunks.at(-1) ?? ''
      continue
    }

    const candidate = current ? `${current} ${token}` : token
    if (current && measure(candidate, style) > maximumWidth) {
      lines.push(current)
      current = token
    } else {
      current = candidate
    }
  }

  if (current) lines.push(current)
  return lines
}

export function wrapShareHighlightText(
  text: string,
  maximumWidth: number,
  style: ShareHighlightTextStyle,
  measure: ShareHighlightTextMeasure
): string[] {
  if (maximumWidth <= 0) throw new RangeError('Text width must be greater than zero.')
  const normalized = text.replace(/\r\n?/g, '\n').trim()
  if (!normalized) return []

  return normalized.split('\n').flatMap(paragraph => (
    paragraph.trim() ? wrapParagraph(paragraph, maximumWidth, style, measure) : ['']
  ))
}

interface ShareHighlightStorySectionDraft {
  role: Extract<ShareHighlightTextRole, 'gurmukhi' | 'transliteration' | 'meaning'>
  lines: string[]
  style: ShareHighlightTextStyle
  height: number
}

interface ShareHighlightStoryLineDraft {
  line: ShareHighlightPassageLine
  sections: ShareHighlightStorySectionDraft[]
  height: number
}

interface ShareHighlightStoryMeasurement {
  drafts: ShareHighlightStoryLineDraft[]
  requiredHeight: number
  fontSizes: StoryRoleFontSizes
  gapScale: number
}

function normalizePassageLines(rawLines: readonly ShareHighlightPassageLine[]) {
  const lines = rawLines
    .map(line => ({
      ...line,
      gurmukhi: line.gurmukhi.trim(),
      transliteration: line.transliteration?.trim() || null,
      meaning: line.meaning?.trim() || null,
      isHeader: Boolean(line.isHeader),
    }))
    .filter(line => Boolean(line.gurmukhi))

  if (lines.length === 0) throw new TypeError('At least one Gurbani passage line is required.')
  return lines
}

function makeStoryStyle(
  role: ShareHighlightStorySectionDraft['role'],
  isHeader: boolean,
  fontSizes: StoryRoleFontSizes,
  palette: ShareHighlightOverlayPalette,
  composition: SingleColumnStoryComposition
): ShareHighlightTextStyle {
  const storyRole = role === 'gurmukhi' && isHeader ? 'header' : role
  const spec = STORY_ROLE_SPECS[storyRole]
  const fontSize = fontSizes[storyRole]
  const manuscriptLineHeightRatio = role === 'meaning'
    ? 1.18
    : role === 'transliteration'
      ? 1.2
      : 1.16
  return {
    fontFamily: spec.fontFamily,
    fontSize,
    fontStyle: spec.fontStyle,
    fontWeight: composition === 'manuscript' && role === 'meaning'
      ? 400
      : spec.fontWeight,
    lineHeight: Math.ceil(fontSize * (
      composition === 'manuscript' ? manuscriptLineHeightRatio : spec.lineHeightRatio
    )),
    color: role === 'gurmukhi' ? palette.primaryText : palette.secondaryText,
  }
}

function draftStoryLine(
  line: ShareHighlightPassageLine,
  measure: ShareHighlightTextMeasure,
  fontSizes: StoryRoleFontSizes,
  palette: ShareHighlightOverlayPalette,
  composition: SingleColumnStoryComposition,
  gapScale: number
): ShareHighlightStoryLineDraft {
  const values: Array<[ShareHighlightStorySectionDraft['role'], string]> = [
    ['gurmukhi', line.gurmukhi],
  ]
  if (line.transliteration) values.push(['transliteration', line.transliteration])
  if (line.meaning) values.push(['meaning', line.meaning])

  const spec = STORY_COMPOSITIONS[composition]
  const sections = values.map(([role, value]) => {
    const style = makeStoryStyle(
      role,
      Boolean(line.isHeader),
      fontSizes,
      palette,
      composition
    )
    const lines = wrapShareHighlightText(value, spec.body.width, style, measure)
    return {
      role,
      lines,
      style,
      height: lines.length * style.lineHeight,
    }
  })
  const height = sections.reduce((total, section, index) => (
    total + section.height + (index < sections.length - 1
      ? Math.max(3, Math.round(spec.sectionGap * gapScale))
      : 0)
  ), 0)

  return { line, sections, height }
}

function storyLineGap(
  line: ShareHighlightPassageLine,
  composition: SingleColumnStoryComposition,
  gapScale: number
) {
  const spec = STORY_COMPOSITIONS[composition]
  return Math.max(2, Math.round(
    (line.isHeader ? spec.headerGap : spec.lineGap) * gapScale
  ))
}

function interpolateStoryFontSizes(
  composition: SingleColumnStoryComposition,
  scale: number
): StoryRoleFontSizes {
  const spec = STORY_COMPOSITIONS[composition]
  const interpolate = (role: keyof StoryRoleFontSizes) => Math.round(
    spec.minimum[role] + ((spec.maximum[role] - spec.minimum[role]) * scale)
  )
  return {
    header: interpolate('header'),
    gurmukhi: interpolate('gurmukhi'),
    transliteration: interpolate('transliteration'),
    meaning: interpolate('meaning'),
  }
}

function measureStoryDrafts(
  rawLines: readonly ShareHighlightPassageLine[],
  measure: ShareHighlightTextMeasure,
  composition: SingleColumnStoryComposition,
  scale: number,
  overlayTone?: string
): ShareHighlightStoryMeasurement {
  const normalizedScale = clamp(scale, 0, 1)
  const fontSizes = interpolateStoryFontSizes(composition, normalizedScale)
  const gapScale = 0.72 + (normalizedScale * 0.28)
  // A manuscript is a calm, opaque reading page. Its text therefore always
  // uses the parchment palette instead of inheriting contrast from the art.
  const palette = resolveShareHighlightOverlayPalette(
    composition === 'manuscript' ? 'light' : overlayTone
  )
  const drafts = rawLines.map(line => draftStoryLine(
    line,
    measure,
    fontSizes,
    palette,
    composition,
    gapScale
  ))
  const requiredHeight = drafts.reduce((total, draft, index) => (
    total
    + draft.height
    + (index < drafts.length - 1
      ? storyLineGap(draft.line, composition, gapScale)
      : 0)
  ), 0)

  return { drafts, requiredHeight, fontSizes, gapScale }
}

function storySupportRoles(lines: readonly ShareHighlightPassageLine[]) {
  const hasTransliteration = lines.some(line => Boolean(line.transliteration))
  const hasMeaning = lines.some(line => Boolean(line.meaning))

  if (hasTransliteration && hasMeaning) {
    throw new TypeError(
      'A passage Story may include either transliteration or meaning, but not both.'
    )
  }

  const selectedRole: 'transliteration' | 'meaning' | null = hasMeaning
    ? 'meaning'
    : hasTransliteration
      ? 'transliteration'
      : null

  if (selectedRole && lines.some(line => !line.isHeader && !line[selectedRole])) {
    throw new TypeError(
      `The selected ${selectedRole} support must be present for every non-header passage line.`
    )
  }

  return selectedRole ? [selectedRole] : []
}

function makeDefaultStorySelection(
  lines: readonly ShareHighlightPassageLine[]
): ShareHighlightStorySelection {
  const sourceLineIds = lines.map(line => line.id)
  return {
    mode: 'complete',
    anchorSourceLineId: null,
    includedLineCount: sourceLineIds.length,
    totalLineCount: sourceLineIds.length,
    includedSourceLineIds: sourceLineIds,
    firstSourceLineId: sourceLineIds[0]!,
    lastSourceLineId: sourceLineIds.at(-1)!,
    previousSourceLineId: null,
    nextSourceLineId: null,
  }
}

function buildStoryLayout(
  lines: readonly ShareHighlightPassageLine[],
  composition: SingleColumnStoryComposition,
  storyProfile: ShareHighlightStoryArtworkProfile | undefined,
  measured: ShareHighlightStoryMeasurement,
  contentScale: number,
  footerMode: ShareHighlightStoryFooterMode
): ShareHighlightStoryLayout {
  const spec = resolveStoryCompositionSpec(composition, footerMode, storyProfile)
  const expandableGapCount = composition === 'manuscript'
    ? measured.drafts.slice(0, -1).filter(draft => !draft.line.isHeader).length
    : 0
  const availableAfterText = Math.max(0, spec.body.height - measured.requiredHeight)
  const distributedLineGap = expandableGapCount > 0
    ? Math.min(
        MANUSCRIPT_MAX_DISTRIBUTED_GAP,
        Math.max(0, availableAfterText - 36) / expandableGapCount
      )
    : 0
  const laidOutContentHeight = (
    measured.requiredHeight
    + (distributedLineGap * expandableGapCount)
  )
  const verticalInset = composition === 'expressive' && !storyProfile
    ? Math.min(52, Math.max(0, (spec.body.height - measured.requiredHeight) / 2))
    : Math.max(0, (spec.body.height - laidOutContentHeight) / 2)
  const protectedSubject = storyProfile?.protectedSubject
  const usesContainedArtwork = composition === 'expressive' && Boolean(storyProfile)
  const protectedCenterY = protectedSubject
    ? protectedSubject.bounds.y + (protectedSubject.bounds.height / 2)
    : null
  const clearProtectedSubject = (
    composition === 'expressive'
    && !usesContainedArtwork
    && protectedSubject?.intent === 'keep-clear-of-text'
  )
  const centerBelowLandscapeHero = (
    composition === 'expressive'
    && !usesContainedArtwork
    && storyProfile?.mode === 'landscape-hero'
  )
  const contentTop = clearProtectedSubject
    ? protectedCenterY !== null && protectedCenterY <= 0.5
      ? spec.body.y + spec.body.height - measured.requiredHeight
      : spec.body.y
    : centerBelowLandscapeHero
      ? spec.body.y + ((spec.body.height - measured.requiredHeight) / 2)
      : spec.body.y + verticalInset
  let cursorY = contentTop
  const sections: ShareHighlightStoryTextSection[] = []

  measured.drafts.forEach((draft, draftIndex) => {
    draft.sections.forEach((section, sectionIndex) => {
      sections.push({
        role: section.role,
        lines: section.lines,
        style: section.style,
        sourceLineId: draft.line.id,
        isHeader: Boolean(draft.line.isHeader),
        x: spec.body.x,
        y: cursorY,
        width: spec.body.width,
        height: section.height,
      })
      cursorY += section.height
      if (sectionIndex < draft.sections.length - 1) {
        cursorY += Math.max(3, Math.round(spec.sectionGap * measured.gapScale))
      }
    })
    if (draftIndex < measured.drafts.length - 1) {
      cursorY += storyLineGap(draft.line, composition, measured.gapScale)
      if (composition === 'manuscript' && !draft.line.isHeader) {
        cursorY += distributedLineGap
      }
    }
  })

  const supportRoles = storySupportRoles(lines)
  const minimum = spec.minimum
  const activeFontSizes = [measured.fontSizes.gurmukhi]
  if (supportRoles.includes('transliteration')) activeFontSizes.push(measured.fontSizes.transliteration)
  if (supportRoles.includes('meaning')) activeFontSizes.push(measured.fontSizes.meaning)
  const activeMinimums = [minimum.gurmukhi]
  if (supportRoles.includes('transliteration')) activeMinimums.push(minimum.transliteration)
  if (supportRoles.includes('meaning')) activeMinimums.push(minimum.meaning)

  const readingSurface = composition === 'expressive' && storyProfile
    ? {
        ...spec.readingSurface,
        // One quiet sheet carries both the reading and its citation. Keeping
        // the paper continuous avoids a stack of unrelated text capsules.
        height: STORY_SAFE_BOTTOM - spec.readingSurface.y,
      }
    : composition === 'expressive'
    ? {
        x: spec.readingSurface.x,
        y: Math.max(spec.readingSurface.y, contentTop - 42),
        width: spec.readingSurface.width,
        height: Math.min(
          spec.readingSurface.height,
          measured.requiredHeight + 84
        ),
      }
    : { ...spec.readingSurface }

  return {
    width: SHARE_HIGHLIGHT_STORY_WIDTH,
    height: SHARE_HIGHLIGHT_STORY_HEIGHT,
    body: { ...spec.body },
    readingSurface,
    contentScale,
    density: composition === 'expressive'
      ? (contentScale >= 0.62 ? 'comfortable' : 'compact')
      : (contentScale >= 0.56 ? 'compact' : 'dense'),
    composition,
    artworkMode: storyProfile?.mode ?? 'portrait-bleed',
    fit: {
      supportRoles,
      fontSizes: {
        gurmukhi: measured.fontSizes.gurmukhi,
        ...(supportRoles.includes('transliteration')
          ? { transliteration: measured.fontSizes.transliteration }
          : {}),
        ...(supportRoles.includes('meaning')
          ? { meaning: measured.fontSizes.meaning }
          : {}),
      },
      atReadabilityFloor: activeFontSizes.some((size, index) => size <= activeMinimums[index]!),
    },
    selection: makeDefaultStorySelection(lines),
    sourceLineIds: lines.map(line => line.id),
    sections,
  }
}

interface StoryLayoutAttempt {
  layout: ShareHighlightStoryLayout | null
  lastMeasurement: ShareHighlightStoryMeasurement
}

interface StoryAtomicBlock {
  startLineIndex: number
  endLineIndex: number
}

function tryStoryComposition(
  lines: readonly ShareHighlightPassageLine[],
  measure: ShareHighlightTextMeasure,
  composition: SingleColumnStoryComposition,
  storyProfile?: ShareHighlightStoryArtworkProfile,
  overlayTone?: string,
  footerMode: ShareHighlightStoryFooterMode = 'plain'
): StoryLayoutAttempt {
  const availableHeight = resolveStoryCompositionSpec(
    composition,
    footerMode,
    storyProfile
  ).body.height
  const maximumStep = Math.round(1 / STORY_SCALE_STEP)
  const floorMeasurement = measureStoryDrafts(lines, measure, composition, 0, overlayTone)
  if (floorMeasurement.requiredHeight > availableHeight) {
    return { layout: null, lastMeasurement: floorMeasurement }
  }

  // Required height is monotonic as type grows, so a bounded binary search
  // finds the largest readable step in at most six further measurements. A
  // linear 51-step scan made dense support toggles visibly stall on phones.
  let lowerStep = 0
  let upperStep = maximumStep
  let bestStep = 0
  let bestMeasurement = floorMeasurement

  while (lowerStep <= upperStep) {
    const candidateStep = Math.floor((lowerStep + upperStep) / 2)
    const candidateScale = Math.round(candidateStep * STORY_SCALE_STEP * 100) / 100
    const candidateMeasurement = candidateStep === 0
      ? floorMeasurement
      : measureStoryDrafts(lines, measure, composition, candidateScale, overlayTone)

    if (candidateMeasurement.requiredHeight <= availableHeight) {
      bestStep = candidateStep
      bestMeasurement = candidateMeasurement
      lowerStep = candidateStep + 1
    } else {
      upperStep = candidateStep - 1
    }
  }

  const contentScale = Math.round(bestStep * STORY_SCALE_STEP * 100) / 100
  return {
    layout: buildStoryLayout(
      lines,
      composition,
      storyProfile,
      bestMeasurement,
      contentScale,
      footerMode
    ),
    lastMeasurement: bestMeasurement,
  }
}

function buildStoryAtomicBlocks(
  lines: readonly ShareHighlightPassageLine[]
): StoryAtomicBlock[] {
  const blocks: StoryAtomicBlock[] = []
  let pendingHeaderStart: number | null = null

  lines.forEach((line, lineIndex) => {
    if (line.isHeader) {
      if (pendingHeaderStart === null) pendingHeaderStart = lineIndex
      return
    }

    blocks.push({
      startLineIndex: pendingHeaderStart ?? lineIndex,
      endLineIndex: lineIndex,
    })
    pendingHeaderStart = null
  })

  if (pendingHeaderStart !== null) {
    blocks.push({
      startLineIndex: pendingHeaderStart,
      endLineIndex: lines.length - 1,
    })
  }

  return blocks
}

function sourceLineIdMatches(
  candidate: ShareHighlightPassageLine['id'],
  requested: ShareHighlightPassageLine['id'] | null | undefined
) {
  return requested !== null && requested !== undefined && candidate === requested
}

function makeCompleteStorySelection(
  lines: readonly ShareHighlightPassageLine[],
  anchorLineId?: ShareHighlightPassageLine['id'] | null
): ShareHighlightStorySelection {
  const includedSourceLineIds = lines.map(line => line.id)
  const anchorSourceLineId = lines.find(line => sourceLineIdMatches(line.id, anchorLineId))?.id ?? null
  return {
    mode: 'complete',
    anchorSourceLineId,
    includedLineCount: includedSourceLineIds.length,
    totalLineCount: includedSourceLineIds.length,
    includedSourceLineIds,
    firstSourceLineId: includedSourceLineIds[0]!,
    lastSourceLineId: includedSourceLineIds.at(-1)!,
    previousSourceLineId: null,
    nextSourceLineId: null,
  }
}

function applyStorySelection(
  layout: ShareHighlightStoryLayout,
  selection: ShareHighlightStorySelection
): ShareHighlightStoryLayout {
  return {
    ...layout,
    selection,
    sourceLineIds: [...selection.includedSourceLineIds],
  }
}

interface StoryForwardPaginationContext {
  /** Start of the already-planned page immediately before this one. */
  previousSourceLineId: ShareHighlightPassageLine['id'] | null
  /** The complete-passage attempts are known to have failed after page one. */
  excerptOnly: boolean
}

function selectStoryExcerpt(
  lines: readonly ShareHighlightPassageLine[],
  measure: ShareHighlightTextMeasure,
  storyProfile: ShareHighlightStoryArtworkProfile | undefined,
  overlayTone: string | undefined,
  anchorLineId: ShareHighlightPassageLine['id'] | null | undefined,
  footerMode: ShareHighlightStoryFooterMode,
  forwardPagination?: StoryForwardPaginationContext
): ShareHighlightStoryLayout {
  const blocks = buildStoryAtomicBlocks(lines)
  const manuscriptBodyHeight = resolveStoryCompositionSpec('manuscript', footerMode).body.height
  const anchorLineIndex = lines.findIndex(line => sourceLineIdMatches(line.id, anchorLineId))
  const requestedBlockIndex = anchorLineIndex >= 0
    ? blocks.findIndex(block => (
        anchorLineIndex >= block.startLineIndex && anchorLineIndex <= block.endLineIndex
      ))
    : -1
  const startBlockIndex = requestedBlockIndex >= 0 ? requestedBlockIndex : 0
  const floorMeasurementCache = new Map<string, ShareHighlightStoryMeasurement>()

  const linesForBlockRange = (rangeStartBlockIndex: number, rangeEndBlockIndex: number) => {
    const rangeStartLineIndex = blocks[rangeStartBlockIndex]!.startLineIndex
    const rangeEndLineIndex = blocks[rangeEndBlockIndex]!.endLineIndex
    return lines.slice(rangeStartLineIndex, rangeEndLineIndex + 1)
  }

  const measureBlockRangeAtFloor = (
    rangeStartBlockIndex: number,
    rangeEndBlockIndex: number
  ) => {
    const cacheKey = `${rangeStartBlockIndex}:${rangeEndBlockIndex}`
    const cached = floorMeasurementCache.get(cacheKey)
    if (cached) return cached

    const measurement = measureStoryDrafts(
      linesForBlockRange(rangeStartBlockIndex, rangeEndBlockIndex),
      measure,
      'manuscript',
      0,
      overlayTone
    )
    floorMeasurementCache.set(cacheKey, measurement)
    return measurement
  }

  const findLargestFittingRange = (
    rangeStartBlockIndex: number,
    maximumEndBlockIndex = blocks.length - 1
  ) => {
    const firstMeasurement = measureBlockRangeAtFloor(
      rangeStartBlockIndex,
      rangeStartBlockIndex
    )
    if (firstMeasurement.requiredHeight > manuscriptBodyHeight) {
      return null
    }

    let bestEndBlockIndex = rangeStartBlockIndex
    let firstUnfitBlockIndex: number | null = null
    let blockOffset = 1

    // Most pages contain only a small fraction of a long Hukamnama. Grow the
    // candidate exponentially before binary-searching the first failure so a
    // 399-line reading never begins by measuring half of the entire source.
    while (bestEndBlockIndex < maximumEndBlockIndex) {
      const candidateEndBlockIndex = Math.min(
        rangeStartBlockIndex + blockOffset,
        maximumEndBlockIndex
      )
      const measurement = measureBlockRangeAtFloor(
        rangeStartBlockIndex,
        candidateEndBlockIndex
      )

      if (measurement.requiredHeight <= manuscriptBodyHeight) {
        bestEndBlockIndex = candidateEndBlockIndex
        if (candidateEndBlockIndex === maximumEndBlockIndex) break
        blockOffset *= 2
      } else {
        firstUnfitBlockIndex = candidateEndBlockIndex
        break
      }
    }

    let lowerBlockIndex = bestEndBlockIndex + 1
    let upperBlockIndex = (firstUnfitBlockIndex ?? maximumEndBlockIndex + 1) - 1
    while (lowerBlockIndex <= upperBlockIndex) {
      const candidateEndBlockIndex = Math.floor((lowerBlockIndex + upperBlockIndex) / 2)
      const measurement = measureBlockRangeAtFloor(
        rangeStartBlockIndex,
        candidateEndBlockIndex
      )
      if (measurement.requiredHeight <= manuscriptBodyHeight) {
        bestEndBlockIndex = candidateEndBlockIndex
        lowerBlockIndex = candidateEndBlockIndex + 1
      } else {
        upperBlockIndex = candidateEndBlockIndex - 1
      }
    }

    return { endBlockIndex: bestEndBlockIndex, firstMeasurement }
  }

  const selectedRange = findLargestFittingRange(startBlockIndex)
  if (!selectedRange) {
    const firstBlockLines = linesForBlockRange(startBlockIndex, startBlockIndex)
    const firstMeasurement = measureBlockRangeAtFloor(startBlockIndex, startBlockIndex)
    const supportRoles = storySupportRoles(firstBlockLines)
    throw new ShareHighlightContentOverflowError(
      firstMeasurement.requiredHeight,
      manuscriptBodyHeight,
      {
        reason: supportRoles.length > 0 ? 'support-overflow' : 'gurmukhi-overflow',
        supportRoles,
      }
    )
  }

  // Replaying the same deterministic, maximal page boundaries from the start
  // recovers the actual prior page rather than merely the preceding source
  // block. Capping each replay at the requested block detects an overlapping
  // page without measuring any content beyond the current anchor.
  const findPreviousPageStartBlockIndex = () => {
    if (startBlockIndex === 0) return null

    let pageStartBlockIndex = 0
    let lastNonOverlappingPageStartBlockIndex: number | null = null
    while (pageStartBlockIndex < startBlockIndex) {
      const pageRange = findLargestFittingRange(pageStartBlockIndex, startBlockIndex)
      if (!pageRange || pageRange.endBlockIndex >= startBlockIndex) {
        return lastNonOverlappingPageStartBlockIndex
      }

      lastNonOverlappingPageStartBlockIndex = pageStartBlockIndex
      const nextPageStartBlockIndex = pageRange.endBlockIndex + 1
      if (nextPageStartBlockIndex === startBlockIndex) {
        return pageStartBlockIndex
      }
      pageStartBlockIndex = nextPageStartBlockIndex
    }

    return lastNonOverlappingPageStartBlockIndex
  }

  // Singular exports support backwards navigation from any arbitrary anchor,
  // so they replay deterministic boundaries from page zero. A complete set is
  // planned strictly forwards and already knows its prior page start; replaying
  // here would turn a large export into superlinear work.
  const previousPageStartBlockIndex = forwardPagination
    ? null
    : findPreviousPageStartBlockIndex()
  const endLineIndex = blocks[selectedRange.endBlockIndex]!.endLineIndex
  const startLineIndex = blocks[startBlockIndex]!.startLineIndex
  const includedLines = lines.slice(startLineIndex, endLineIndex + 1)
  const selectedAttempt = tryStoryComposition(
    includedLines,
    measure,
    'manuscript',
    storyProfile,
    overlayTone,
    footerMode
  )
  if (!selectedAttempt.layout) {
    const supportRoles = storySupportRoles(includedLines)
    throw new ShareHighlightContentOverflowError(
      selectedAttempt.lastMeasurement.requiredHeight,
      manuscriptBodyHeight,
      {
        reason: supportRoles.length > 0 ? 'support-overflow' : 'gurmukhi-overflow',
        supportRoles,
      }
    )
  }

  const includedSourceLineIds = includedLines.map(line => line.id)
  const matchedAnchor = anchorLineIndex >= 0 ? lines[anchorLineIndex]!.id : includedSourceLineIds[0]!
  const previousPageStartBlock = previousPageStartBlockIndex === null
    ? null
    : blocks[previousPageStartBlockIndex]!
  const nextBlock = blocks[selectedRange.endBlockIndex + 1]
  const selection: ShareHighlightStorySelection = {
    mode: 'excerpt',
    anchorSourceLineId: matchedAnchor,
    includedLineCount: includedSourceLineIds.length,
    totalLineCount: lines.length,
    includedSourceLineIds,
    firstSourceLineId: includedSourceLineIds[0]!,
    lastSourceLineId: includedSourceLineIds.at(-1)!,
    previousSourceLineId: forwardPagination
      ? forwardPagination.previousSourceLineId
      : previousPageStartBlock
        ? lines[previousPageStartBlock.startLineIndex]!.id
        : null,
    nextSourceLineId: nextBlock ? lines[nextBlock.startLineIndex]!.id : null,
  }

  return applyStorySelection(selectedAttempt.layout, selection)
}

/**
 * Lays out an ordered reading on one native 9:16 Story canvas. Complete content
 * is preferred whenever it fits at the role-specific readability floors. When
 * it does not, the largest contiguous whole-line excerpt is selected without
 * dropping the chosen reading support. Structural headers form an atomic block
 * with their following line and are therefore never stranded at an edge.
 */
function layoutNormalizedShareHighlightStory(
  lines: readonly ShareHighlightPassageLine[],
  measure: ShareHighlightTextMeasure,
  overlayTone?: string,
  storyProfile?: ShareHighlightStoryArtworkProfile,
  anchorLineId?: ShareHighlightPassageLine['id'] | null,
  footerMode: ShareHighlightStoryFooterMode = 'plain',
  forwardPagination?: StoryForwardPaginationContext,
  forceManuscript = false
): ShareHighlightStoryLayout {
  storySupportRoles(lines)
  if (!forwardPagination?.excerptOnly) {
    const selection = makeCompleteStorySelection(lines, anchorLineId)
    if (!forceManuscript) {
      const expressive = tryStoryComposition(
        lines,
        measure,
        'expressive',
        storyProfile,
        overlayTone,
        footerMode
      )
      if (expressive.layout) return applyStorySelection(expressive.layout, selection)
    }

    const manuscript = tryStoryComposition(
      lines,
      measure,
      'manuscript',
      storyProfile,
      overlayTone,
      footerMode
    )

    if (manuscript.layout) return applyStorySelection(manuscript.layout, selection)
  }

  return selectStoryExcerpt(
    lines,
    measure,
    storyProfile,
    overlayTone,
    anchorLineId,
    footerMode,
    forwardPagination
  )
}

export function layoutShareHighlightStory(
  rawLines: readonly ShareHighlightPassageLine[],
  measure: ShareHighlightTextMeasure,
  overlayTone?: string,
  storyProfile?: ShareHighlightStoryArtworkProfile,
  anchorLineId?: ShareHighlightPassageLine['id'] | null,
  footerMode: ShareHighlightStoryFooterMode = 'plain'
): ShareHighlightStoryLayout {
  return layoutNormalizedShareHighlightStory(
    normalizePassageLines(rawLines),
    measure,
    overlayTone,
    storyProfile,
    anchorLineId,
    footerMode
  )
}

function makeStyle(
  role: ShareHighlightTextRole,
  scale: number,
  palette: ShareHighlightOverlayPalette
): ShareHighlightTextStyle {
  const spec = TEXT_SPECS[role]
  const fontSize = Math.max(spec.minimumFontSize, Math.round(spec.maximumFontSize * scale))
  return {
    fontFamily: spec.fontFamily,
    fontSize,
    fontStyle: spec.fontStyle,
    fontWeight: spec.fontWeight,
    lineHeight: Math.ceil(fontSize * spec.lineHeightRatio),
    color: role === 'gurmukhi' ? palette.primaryText : palette.secondaryText,
  }
}

function normalizeContent(content: ShareHighlightCardContent): ShareHighlightCardContent {
  const normalized = {
    gurmukhi: content.gurmukhi.trim(),
    transliteration: content.transliteration?.trim() || null,
    meaning: content.meaning?.trim() || null,
    sourceLabel: content.sourceLabel.trim(),
  }

  if (!normalized.gurmukhi) throw new TypeError('A Gurbani highlight is required.')
  if (!normalized.sourceLabel) throw new TypeError('A source label is required.')
  return normalized
}

function sectionValues(content: ShareHighlightCardContent): Array<[ShareHighlightTextRole, string]> {
  const values: Array<[ShareHighlightTextRole, string]> = [
    ['gurmukhi', content.gurmukhi],
  ]
  if (content.transliteration) values.push(['transliteration', content.transliteration])
  if (content.meaning) values.push(['meaning', content.meaning])
  return values
}

function fontString(style: ShareHighlightTextStyle) {
  return `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`
}

export function layoutShareHighlightCardText(
  rawContent: ShareHighlightCardContent,
  measure: ShareHighlightTextMeasure,
  safeZone?: ShareHighlightNormalizedRect,
  textPosition: ShareHighlightTextPosition = 'auto',
  overlayTone?: string
): ShareHighlightCardLayout {
  const content = normalizeContent(rawContent)
  const cue = normalizePlacementCue(safeZone)
  const resolvedPosition = normalizeTextPosition(textPosition)
  const palette = resolveShareHighlightOverlayPalette(overlayTone)
  const maximumPanelWidth = Math.round(clamp(
    (cue.width * SHARE_HIGHLIGHT_CARD_WIDTH) + (PANEL_HORIZONTAL_PADDING * 2),
    MIN_PANEL_WIDTH,
    MAX_PANEL_WIDTH
  ))
  const innerWidth = maximumPanelWidth - (PANEL_HORIZONTAL_PADDING * 2)
  const maximumInnerHeight = (
    TEXT_REGION_MAXIMUM_BOTTOM
    - TEXT_REGION_MINIMUM_TOP
    - (PANEL_VERTICAL_PADDING * 2)
  )

  if (innerWidth <= 0 || maximumInnerHeight <= 0) {
    throw new RangeError('The artwork text safe zone is too small for readable text.')
  }

  let minimumScaleRequiredHeight = 0

  for (let scalePercent = 100; scalePercent >= TEXT_SCALE_MINIMUM * 100; scalePercent -= TEXT_SCALE_STEP * 100) {
    const scale = scalePercent / 100
    const drafts = sectionValues(content).map(([role, value]) => {
      const style = makeStyle(role, scale, palette)
      const lines = wrapShareHighlightText(value, innerWidth, style, measure)
      return {
        role,
        lines,
        style,
        height: lines.length * style.lineHeight,
      }
    })
    const textHeight = drafts.reduce((total, section, index) => (
      total + section.height + (index < drafts.length - 1 ? SECTION_GAPS[section.role] : 0)
    ), 0)
    minimumScaleRequiredHeight = textHeight
    const panelHeight = Math.max(MIN_PANEL_HEIGHT, textHeight + (PANEL_VERTICAL_PADDING * 2))
    const widestLine = drafts.reduce((widest, section) => Math.max(
      widest,
      ...section.lines.map(line => measure(line, section.style))
    ), 0)
    const panelWidth = Math.round(clamp(
      Math.ceil(widestLine) + (PANEL_HORIZONTAL_PADDING * 2),
      MIN_PANEL_WIDTH,
      maximumPanelWidth
    ))
    const resolvedInnerWidth = panelWidth - (PANEL_HORIZONTAL_PADDING * 2)
    const everyLineFits = drafts.every(section => (
      section.lines.every(line => !line || measure(line, section.style) <= resolvedInnerWidth + 0.01)
    ))

    if (!everyLineFits || panelHeight > TEXT_REGION_MAXIMUM_BOTTOM - TEXT_REGION_MINIMUM_TOP) continue

    const panel = resolveShareHighlightTextPanel(safeZone, resolvedPosition, {
      width: panelWidth,
      height: panelHeight,
    })
    const verticalSlack = panelHeight - (PANEL_VERTICAL_PADDING * 2) - textHeight
    let cursorY = panel.y + PANEL_VERTICAL_PADDING + Math.max(0, verticalSlack / 2)
    const sections: ShareHighlightTextSection[] = drafts.map((section, index) => {
      const laidOut: ShareHighlightTextSection = {
        role: section.role,
        lines: section.lines,
        style: section.style,
        x: panel.x + PANEL_HORIZONTAL_PADDING,
        y: cursorY,
        width: resolvedInnerWidth,
        height: section.height,
      }
      cursorY += section.height + (index < drafts.length - 1 ? SECTION_GAPS[section.role] : 0)
      return laidOut
    })

    return {
      width: SHARE_HIGHLIGHT_CARD_WIDTH,
      height: SHARE_HIGHLIGHT_CARD_HEIGHT,
      panel,
      contentScale: scale,
      textPosition: resolvedPosition,
      density: (
        scale < 0.9
        || drafts.reduce((total, section) => total + section.lines.length, 0) >= 7
        || panelHeight >= 520
      ) ? 'dense' : 'standard',
      sections,
    }
  }

  throw new ShareHighlightContentOverflowError(minimumScaleRequiredHeight, maximumInnerHeight)
}

function createDefaultCanvas() {
  if (typeof document === 'undefined') {
    throw new Error('Canvas rendering requires a browser document or an injected canvas.')
  }
  return document.createElement('canvas')
}

const SHARE_HIGHLIGHT_IMAGE_DECODE_TIMEOUT_MS = 12_000
const SHARE_HIGHLIGHT_PNG_ENCODE_TIMEOUT_MS = 15_000

function resolveRenderTimeout(value: number | undefined, fallback: number) {
  return Number.isFinite(value) && value! > 0 ? value! : fallback
}

function throwIfShareHighlightRenderAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new ShareHighlightRenderAbortedError()
}

function isShareHighlightRenderInterruption(error: unknown) {
  return (
    error instanceof ShareHighlightRenderAbortedError
    || error instanceof ShareHighlightRenderTimeoutError
  )
}

function withShareHighlightRenderDeadline<T>(
  operation: () => PromiseLike<T> | T,
  {
    signal,
    timeoutMs,
    timeoutMessage,
    onInterrupt,
  }: {
    signal?: AbortSignal
    timeoutMs: number
    timeoutMessage: string
    onInterrupt?: () => void
  }
): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null

    const finish = (settle: () => void) => {
      if (settled) return
      settled = true
      if (timeoutId !== null) globalThis.clearTimeout(timeoutId)
      timeoutId = null
      signal?.removeEventListener('abort', handleAbort)
      settle()
    }
    const interrupt = (error: Error) => {
      finish(() => {
        onInterrupt?.()
        reject(error)
      })
    }
    const handleAbort = () => interrupt(new ShareHighlightRenderAbortedError())

    if (signal?.aborted) {
      handleAbort()
      return
    }

    signal?.addEventListener('abort', handleAbort, { once: true })
    timeoutId = globalThis.setTimeout(() => {
      interrupt(new ShareHighlightRenderTimeoutError(timeoutMessage))
    }, timeoutMs)
    ;(timeoutId as unknown as { unref?: () => void }).unref?.()

    Promise.resolve()
      .then(operation)
      .then(
        value => finish(() => resolve(value)),
        error => finish(() => reject(error)),
      )
  })
}

async function loadDecodedImage(
  src: string,
  signal?: AbortSignal,
): Promise<ShareHighlightDecodedImage> {
  if (typeof Image === 'undefined') {
    throw new Error('Artwork loading requires a browser Image implementation or an injected image loader.')
  }

  const image = new Image()
  image.decoding = 'async'
  const loaded = new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      image.removeEventListener('load', handleLoad)
      image.removeEventListener('error', handleError)
      signal?.removeEventListener('abort', handleAbort)
    }
    const handleLoad = () => {
      cleanup()
      resolve()
    }
    const handleError = () => {
      cleanup()
      reject(new Error(`Unable to load share artwork: ${src}`))
    }
    const handleAbort = () => {
      cleanup()
      image.src = ''
      reject(new ShareHighlightRenderAbortedError())
    }

    if (signal?.aborted) {
      handleAbort()
      return
    }
    image.addEventListener('load', handleLoad, { once: true })
    image.addEventListener('error', handleError, { once: true })
    signal?.addEventListener('abort', handleAbort, { once: true })
    image.src = src
  })
  await loaded

  throwIfShareHighlightRenderAborted(signal)
  if (typeof image.decode === 'function') {
    await image.decode()
  }
  throwIfShareHighlightRenderAborted(signal)
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error(`Share artwork has invalid dimensions: ${src}`)
  }

  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
  }
}

async function loadShareHighlightArtwork(
  src: string,
  options: ShareHighlightRendererOptions,
) {
  const loadController = new AbortController()
  const forwardAbort = () => loadController.abort()
  if (options.signal?.aborted) forwardAbort()
  else options.signal?.addEventListener('abort', forwardAbort, { once: true })

  try {
    return await withShareHighlightRenderDeadline(
      () => (options.loadImage ?? loadDecodedImage)(src, loadController.signal),
      {
        signal: options.signal,
        timeoutMs: resolveRenderTimeout(
          options.imageDecodeTimeoutMs,
          SHARE_HIGHLIGHT_IMAGE_DECODE_TIMEOUT_MS,
        ),
        timeoutMessage: 'Share artwork loading timed out before rendering.',
        onInterrupt: () => loadController.abort(),
      },
    )
  } finally {
    options.signal?.removeEventListener('abort', forwardAbort)
  }
}

function resolveFontSet(option: ShareHighlightRendererOptions['fontSet']) {
  if (option !== undefined) return option
  if (typeof document === 'undefined' || !('fonts' in document)) return null
  return document.fonts as unknown as ShareHighlightFontSet
}

const SHARE_HIGHLIGHT_FONT_TIMEOUT_MS = 5_000
const REQUIRED_SHARE_HIGHLIGHT_FONTS = [
  {
    family: 'Noto Serif Gurmukhi',
    font: '600 76px "Noto Serif Gurmukhi"',
    text: 'ੴ ਸਤਿ ਨਾਮੁ',
  },
  {
    family: 'Plus Jakarta Sans Bold',
    font: '700 25px "Plus Jakarta Sans"',
    text: `${SHARE_HIGHLIGHT_BRAND_DOMAIN} SOURCE`,
  },
  {
    family: 'Plus Jakarta Sans Regular',
    font: '400 32px "Plus Jakarta Sans"',
    text: 'Complete English meaning',
  },
  {
    family: 'Plus Jakarta Sans Medium',
    font: '500 34px "Plus Jakarta Sans"',
    text: 'Read. Reflect. Return.',
  },
  {
    family: 'Cormorant Garamond',
    font: '650 38px "Cormorant Garamond"',
    text: 'Daily Hukamnama',
  },
  {
    family: 'Noto Sans Devanagari',
    font: '500 32px "Noto Sans Devanagari"',
    text: 'हुकमनामा अर्थ',
  },
] as const

export async function awaitShareHighlightFonts(
  fontSet?: ShareHighlightFontSet | null,
  signal?: AbortSignal,
) {
  const resolved = fontSet === undefined ? resolveFontSet(undefined) : fontSet
  if (!resolved) return

  const loadedFaces = await withShareHighlightRenderDeadline(
    () => Promise.resolve(resolved.ready)
      .then(() => Promise.all(
        REQUIRED_SHARE_HIGHLIGHT_FONTS.map(request => (
          resolved.load(request.font, request.text)
        )),
      ))
      .catch(() => {
        throw new Error('Required share fonts could not be loaded before rendering.')
      }),
    {
      signal,
      timeoutMs: SHARE_HIGHLIGHT_FONT_TIMEOUT_MS,
      timeoutMessage: 'Required share fonts timed out before rendering.',
    },
  )

  REQUIRED_SHARE_HIGHLIGHT_FONTS.forEach((request, index) => {
    const faces = loadedFaces[index]
    if (!Array.isArray(faces) || faces.length === 0) {
      throw new Error(`Required share font is unavailable: ${request.family}.`)
    }
    if (resolved.check && !resolved.check(request.font, request.text)) {
      throw new Error(`Required share font failed verification: ${request.family}.`)
    }
  })
}

function roundedRectanglePath(
  context: CanvasRenderingContext2D,
  rect: ShareHighlightPixelRect,
  radius: number
) {
  const resolvedRadius = Math.min(radius, rect.width / 2, rect.height / 2)
  const right = rect.x + rect.width
  const bottom = rect.y + rect.height
  context.beginPath()
  context.moveTo(rect.x + resolvedRadius, rect.y)
  context.lineTo(right - resolvedRadius, rect.y)
  context.quadraticCurveTo(right, rect.y, right, rect.y + resolvedRadius)
  context.lineTo(right, bottom - resolvedRadius)
  context.quadraticCurveTo(right, bottom, right - resolvedRadius, bottom)
  context.lineTo(rect.x + resolvedRadius, bottom)
  context.quadraticCurveTo(rect.x, bottom, rect.x, bottom - resolvedRadius)
  context.lineTo(rect.x, rect.y + resolvedRadius)
  context.quadraticCurveTo(rect.x, rect.y, rect.x + resolvedRadius, rect.y)
  context.closePath()
}

function drawNoArtworkBackground(
  context: CanvasRenderingContext2D,
  width = SHARE_HIGHLIGHT_CARD_WIDTH,
  height = SHARE_HIGHLIGHT_CARD_HEIGHT
) {
  context.fillStyle = '#15110f'
  context.fillRect(0, 0, width, height)

  const gradient = context.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#1d302c')
  gradient.addColorStop(0.48, '#171512')
  gradient.addColorStop(1, '#382219')
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)

  context.save()
  roundedRectanglePath(context, {
    x: 35,
    y: 35,
    width: width - 70,
    height: height - 70,
  }, 28)
  context.strokeStyle = 'rgba(225, 186, 112, 0.3)'
  context.lineWidth = 2
  context.stroke()
  context.restore()
}

function drawLocalizedTextWash(
  context: CanvasRenderingContext2D,
  panel: ShareHighlightPixelRect,
  palette: ShareHighlightOverlayPalette,
  density: ShareHighlightCardLayout['density']
) {
  const horizontalFeather = 58
  const verticalFeather = 72
  const wash: ShareHighlightPixelRect = {
    x: clamp(panel.x - horizontalFeather, 0, SHARE_HIGHLIGHT_CARD_WIDTH),
    y: clamp(panel.y - verticalFeather, 0, SHARE_HIGHLIGHT_CARD_HEIGHT),
    width: 0,
    height: 0,
  }
  const washRight = clamp(
    panel.x + panel.width + horizontalFeather,
    0,
    SHARE_HIGHLIGHT_CARD_WIDTH
  )
  const washBottom = clamp(
    panel.y + panel.height + verticalFeather,
    0,
    SHARE_HIGHLIGHT_CARD_HEIGHT
  )
  wash.width = washRight - wash.x
  wash.height = washBottom - wash.y

  const gradient = context.createLinearGradient(wash.x, 0, washRight, 0)
  const panelCenter = panel.x + (panel.width / 2)
  const core = density === 'dense' ? palette.denseWash : palette.standardWash

  if (panelCenter < SHARE_HIGHLIGHT_CARD_WIDTH * 0.43) {
    gradient.addColorStop(0, core)
    gradient.addColorStop(0.66, palette.washShoulder)
    gradient.addColorStop(1, palette.washFeather)
  } else if (panelCenter > SHARE_HIGHLIGHT_CARD_WIDTH * 0.57) {
    gradient.addColorStop(0, palette.washFeather)
    gradient.addColorStop(0.34, palette.washShoulder)
    gradient.addColorStop(1, core)
  } else {
    gradient.addColorStop(0, palette.washFeather)
    gradient.addColorStop(0.15, palette.washShoulder)
    gradient.addColorStop(0.5, core)
    gradient.addColorStop(0.85, palette.washShoulder)
    gradient.addColorStop(1, palette.washFeather)
  }

  context.save()
  context.shadowColor = core
  context.shadowBlur = density === 'dense' ? 58 : 68
  context.shadowOffsetX = 0
  context.shadowOffsetY = 0
  roundedRectanglePath(context, wash, PANEL_CORNER_RADIUS)
  context.fillStyle = gradient
  context.fill()
  context.restore()
}

function storySurfaceFill(
  palette: ShareHighlightOverlayPalette,
  translucent = false
) {
  switch (palette.kind) {
    case 'parchment':
      return translucent ? 'rgba(245, 236, 218, 0.96)' : '#f5ecda'
    case 'warm-ink':
      return translucent ? 'rgba(45, 28, 22, 0.94)' : '#2d1c16'
    case 'cool-ink':
      return translucent ? 'rgba(16, 38, 42, 0.94)' : '#10262a'
    default:
      return translucent ? 'rgba(23, 25, 26, 0.94)' : '#17191a'
  }
}

function drawStoryReadingSurface(
  context: CanvasRenderingContext2D,
  layout: ShareHighlightStoryLayout,
  palette: ShareHighlightOverlayPalette
) {
  context.save()
  context.shadowColor = 'transparent'
  context.shadowBlur = 0
  context.shadowOffsetX = 0
  context.shadowOffsetY = 0
  roundedRectanglePath(
    context,
    layout.readingSurface,
    8
  )
  // The art supplies the colour and texture; the reading remains a flat,
  // opaque field so every background has the same dependable contrast.
  context.fillStyle = storySurfaceFill(palette)
  context.fill()
  context.restore()
}

function drawStoryMetadataSurfaces(
  context: CanvasRenderingContext2D,
  layout: ShareHighlightStoryLayout,
  palette: ShareHighlightOverlayPalette,
  footerMode: ShareHighlightStoryFooterMode,
  hasArtworkCameo = false
) {
  const surfaceFill = storySurfaceFill(palette)
  context.save()

  if (layout.composition === 'manuscript') {
    // Metadata and footer are part of the same sheet, separated by hairlines
    // rather than floating cards. This gives the complete reading almost the
    // whole 9:16 canvas without sacrificing Story-safe text placement.
    context.fillStyle = 'rgba(105, 75, 43, 0.2)'
    context.fillRect(
      layout.body.x,
      hasArtworkCameo ? MANUSCRIPT_ART_HEADER_RULE_Y : MANUSCRIPT_HEADER_RULE_Y,
      layout.body.width,
      2
    )
    context.fillRect(
      layout.body.x,
      footerMode === 'linked'
        ? MANUSCRIPT_LINK_FOOTER_RULE_Y
        : MANUSCRIPT_PLAIN_FOOTER_RULE_Y,
      layout.body.width,
      2
    )
    context.restore()
    return
  }

  context.fillStyle = surfaceFill
  roundedRectanglePath(context, STORY_EXPRESSIVE_HEADER_SURFACE, 8)
  context.fill()

  const footerSurface = expressiveFooterSurface(footerMode)
  if (!pixelRectContains(layout.readingSurface, footerSurface)) {
    roundedRectanglePath(context, footerSurface, 8)
    context.fill()
  }
  // When artwork is present, the citation belongs to the same reading sheet.
  context.fillStyle = palette.kind === 'parchment'
    ? 'rgba(105, 75, 43, 0.2)'
    : 'rgba(245, 236, 218, 0.2)'
  context.fillRect(STORY_METADATA_X, footerSurface.y, STORY_METADATA_WIDTH, 1)
  context.restore()
}

function resolveManuscriptHeaderTypography(
  context: CanvasRenderingContext2D,
  seriesLabel: string,
  dateLabel: string | null,
  availableWidth = STORY_COMPOSITIONS.manuscript.body.width
) {
  const maximumSteps = Math.max(
    MANUSCRIPT_TITLE_MAX_SIZE - MANUSCRIPT_TITLE_MIN_SIZE,
    MANUSCRIPT_DATE_MAX_SIZE - MANUSCRIPT_DATE_MIN_SIZE
  )

  for (let step = 0; step <= maximumSteps; step += 1) {
    const progress = maximumSteps === 0 ? 1 : step / maximumSteps
    const titleSize = Math.round(
      MANUSCRIPT_TITLE_MAX_SIZE
      - ((MANUSCRIPT_TITLE_MAX_SIZE - MANUSCRIPT_TITLE_MIN_SIZE) * progress)
    )
    const dateSize = Math.round(
      MANUSCRIPT_DATE_MAX_SIZE
      - ((MANUSCRIPT_DATE_MAX_SIZE - MANUSCRIPT_DATE_MIN_SIZE) * progress)
    )
    context.font = `normal 650 ${titleSize}px "Cormorant Garamond", serif`
    const titleWidth = context.measureText(seriesLabel).width
    context.font = `normal 600 ${dateSize}px "Plus Jakarta Sans", sans-serif`
    const dateWidth = dateLabel ? context.measureText(dateLabel).width : 0
    const requiredWidth = titleWidth + (
      dateLabel ? MANUSCRIPT_HEADER_GAP + dateWidth : 0
    )

    if (requiredWidth <= availableWidth) {
      return { titleSize, dateSize }
    }
  }

  return {
    titleSize: MANUSCRIPT_TITLE_MIN_SIZE,
    dateSize: MANUSCRIPT_DATE_MIN_SIZE,
  }
}

function drawStoryHeader(
  context: CanvasRenderingContext2D,
  seriesLabel: string,
  dateLabel: string | null,
  palette: ShareHighlightOverlayPalette,
  layout: ShareHighlightStoryLayout,
  hasArtworkCameo = false
) {
  context.save()
  context.shadowColor = 'transparent'
  context.shadowBlur = 0
  context.shadowOffsetX = 0
  context.shadowOffsetY = 0
  context.textAlign = 'left'
  context.textBaseline = 'top'
  context.font = 'normal 700 32px "Plus Jakarta Sans", sans-serif'
  context.fillStyle = palette.primaryText

  if (layout.composition === 'manuscript') {
    const manuscriptBody = STORY_COMPOSITIONS.manuscript.body
    const headerLeft = hasArtworkCameo
      ? STORY_MANUSCRIPT_HEADER_COPY.x
      : manuscriptBody.x
    const headerWidth = hasArtworkCameo
      ? STORY_MANUSCRIPT_HEADER_COPY.width
      : manuscriptBody.width
    const headerRight = headerLeft + headerWidth
    const typography = resolveManuscriptHeaderTypography(
      context,
      seriesLabel,
      dateLabel,
      headerWidth
    )

    context.textBaseline = 'middle'
    context.font = `normal 650 ${typography.titleSize}px "Cormorant Garamond", serif`
    context.fillStyle = palette.primaryText
    context.textAlign = 'left'
    context.fillText(seriesLabel, headerLeft, MANUSCRIPT_HEADER_CENTER_Y)

    if (dateLabel) {
      context.font = `normal 600 ${typography.dateSize}px "Plus Jakarta Sans", sans-serif`
      context.fillStyle = palette.secondaryText
      context.textAlign = 'right'
      context.fillText(dateLabel, headerRight, MANUSCRIPT_HEADER_CENTER_Y)
    }
    context.restore()
    return
  }

  context.fillText(seriesLabel, STORY_METADATA_X, STORY_SAFE_TOP, STORY_METADATA_WIDTH)

  if (dateLabel) {
    context.font = 'normal 600 30px "Plus Jakarta Sans", sans-serif'
    context.fillStyle = palette.secondaryText
    context.fillText(dateLabel, STORY_METADATA_X, STORY_SAFE_TOP + 43, STORY_METADATA_WIDTH)
  }
  context.restore()
}

function drawTextSection(
  context: CanvasRenderingContext2D,
  section: ShareHighlightTextSection,
  palette: ShareHighlightOverlayPalette,
  useTextShadow = true
) {
  context.save()
  context.font = fontString(section.style)
  context.fillStyle = section.style.color
  context.textAlign = 'left'
  context.textBaseline = 'top'
  context.shadowColor = useTextShadow ? palette.shadow : 'transparent'
  context.shadowBlur = useTextShadow ? 8 : 0
  context.shadowOffsetX = 0
  context.shadowOffsetY = useTextShadow ? 2 : 0
  section.lines.forEach((line, index) => {
    if (line) context.fillText(line, section.x, section.y + (index * section.style.lineHeight))
  })
  context.restore()
}

function drawFooterWash(context: CanvasRenderingContext2D) {
  const gradient = context.createLinearGradient(0, 1160, 0, SHARE_HIGHLIGHT_CARD_HEIGHT)
  gradient.addColorStop(0, 'rgba(5, 8, 9, 0)')
  gradient.addColorStop(0.7, 'rgba(5, 8, 9, 0.46)')
  gradient.addColorStop(1, 'rgba(5, 8, 9, 0.72)')
  context.fillStyle = gradient
  context.fillRect(0, 1160, SHARE_HIGHLIGHT_CARD_WIDTH, SHARE_HIGHLIGHT_CARD_HEIGHT - 1160)
}

function drawFooter(
  context: CanvasRenderingContext2D,
  sourceLabel: string
) {
  context.save()
  context.shadowColor = 'rgba(0, 0, 0, 0.72)'
  context.shadowBlur = 7
  context.shadowOffsetX = 0
  context.shadowOffsetY = 2
  context.font = 'normal 600 25px "Plus Jakarta Sans", sans-serif'
  context.fillStyle = 'rgba(255, 250, 240, 0.9)'
  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'
  context.fillText(
    sourceLabel,
    FOOTER_HORIZONTAL_MARGIN,
    FOOTER_BASELINE,
    SHARE_HIGHLIGHT_CARD_WIDTH - (FOOTER_HORIZONTAL_MARGIN * 2)
  )

  context.font = 'normal 700 28px "Plus Jakarta Sans", sans-serif'
  context.fillStyle = 'rgba(255, 250, 240, 0.94)'
  context.textAlign = 'right'
  context.fillText(
    SHARE_HIGHLIGHT_BRAND_DOMAIN,
    SHARE_HIGHLIGHT_CARD_WIDTH - FOOTER_HORIZONTAL_MARGIN,
    FOOTER_BASELINE
  )
  context.restore()
}

const DEFAULT_STORY_SCOPE_COPY: ShareHighlightStoryScopeCopy = {
  complete: 'Complete Hukamnama',
  excerpt: 'Hukamnama excerpt',
  coverageTemplate: '{included} of {total} lines',
  readComplete: 'Read the complete Hukamnama',
  openInNaamras: 'Open this Hukamnama in NaamRas',
}

function formatStoryCoverage(
  template: string,
  selection: ShareHighlightStorySelection
) {
  return template
    .replaceAll('{included}', String(selection.includedLineCount))
    .replaceAll('{total}', String(selection.totalLineCount))
}

function formatStoryShareUrl(value: string) {
  const url = new URL(value)
  const path = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '')
  return `${url.host}${path}${url.search}`
}

function drawStoryFooter(
  context: CanvasRenderingContext2D,
  sourceLabel: string,
  palette: ShareHighlightOverlayPalette,
  layout: ShareHighlightStoryLayout,
  shareUrl?: string | null,
  supportLabel?: string | null,
  scopeCopy?: ShareHighlightStoryScopeCopy | null
) {
  const isManuscript = layout.composition === 'manuscript'
  const normalizedShareUrl = shareUrl?.trim() || null

  if (normalizedShareUrl) {
    const copy = scopeCopy ?? DEFAULT_STORY_SCOPE_COPY
    const scopeLabel = layout.selection.mode === 'complete' ? copy.complete : copy.excerpt
    const coverage = formatStoryCoverage(copy.coverageTemplate, layout.selection)
    const actionLabel = layout.selection.mode === 'complete'
      ? copy.openInNaamras
      : copy.readComplete
    const textX = STORY_FOOTER_HORIZONTAL_MARGIN
    const textMaxWidth = STORY_LINK_QR_X - textX - 34

    context.save()
    context.shadowColor = 'transparent'
    context.shadowBlur = 0
    context.shadowOffsetX = 0
    context.shadowOffsetY = 0
    context.textAlign = 'left'
    context.textBaseline = 'top'

    context.font = 'normal 750 22px "Plus Jakarta Sans", sans-serif'
    context.fillStyle = palette.primaryText
    context.fillText(`${scopeLabel} · ${coverage}`, textX, STORY_LINK_FOOTER_TOP, textMaxWidth)

    if (supportLabel?.trim()) {
      context.font = 'normal 600 18px "Plus Jakarta Sans", sans-serif'
      context.fillStyle = palette.secondaryText
      context.fillText(supportLabel.trim(), textX, STORY_LINK_FOOTER_TOP + 34, textMaxWidth)
    }

    context.font = 'normal 700 23px "Plus Jakarta Sans", sans-serif'
    context.fillStyle = palette.primaryText
    context.fillText(actionLabel, textX, STORY_LINK_FOOTER_TOP + 68, textMaxWidth)

    context.font = 'normal 650 20px "Plus Jakarta Sans", sans-serif'
    context.fillStyle = palette.secondaryText
    context.fillText(
      formatStoryShareUrl(normalizedShareUrl),
      textX,
      STORY_LINK_FOOTER_TOP + 101,
      textMaxWidth
    )

    context.font = 'normal 600 18px "Plus Jakarta Sans", sans-serif'
    context.fillStyle = palette.secondaryText
    context.fillText(sourceLabel, textX, STORY_LINK_FOOTER_TOP + 137, textMaxWidth)

    context.shadowColor = 'transparent'
    context.shadowBlur = 0
    drawShareHighlightQrCode(
      context,
      normalizedShareUrl,
      { x: STORY_LINK_QR_X, y: STORY_LINK_QR_Y, size: STORY_LINK_QR_SIZE },
      { dark: '#14231d', light: '#fffdf7' }
    )
    context.restore()
    return
  }

  const baseline = isManuscript
    ? Math.min(
        STORY_FOOTER_BASELINE,
        layout.readingSurface.y + layout.readingSurface.height - 34
      )
    : STORY_FOOTER_BASELINE
  const fontSize = isManuscript ? 24 : 30
  context.save()
  context.shadowColor = 'transparent'
  context.shadowBlur = 0
  context.shadowOffsetX = 0
  context.shadowOffsetY = 0
  context.font = `normal 600 ${fontSize}px "Plus Jakarta Sans", sans-serif`
  context.fillStyle = palette.secondaryText
  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'
  context.fillText(
    sourceLabel,
    STORY_FOOTER_HORIZONTAL_MARGIN,
    baseline,
    650
  )
  context.font = `normal 700 ${fontSize}px "Plus Jakarta Sans", sans-serif`
  context.fillStyle = palette.primaryText
  context.textAlign = 'right'
  context.fillText(
    SHARE_HIGHLIGHT_BRAND_DOMAIN,
    SHARE_HIGHLIGHT_STORY_WIDTH - STORY_FOOTER_HORIZONTAL_MARGIN,
    baseline
  )
  context.restore()
}

export async function renderShareHighlightCard(
  input: ShareHighlightCardInput,
  options: ShareHighlightRendererOptions = {}
): Promise<HTMLCanvasElement> {
  throwIfShareHighlightRenderAborted(options.signal)
  const canvas = options.canvas ?? options.createCanvas?.() ?? createDefaultCanvas()
  canvas.width = SHARE_HIGHLIGHT_CARD_WIDTH
  canvas.height = SHARE_HIGHLIGHT_CARD_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('A Canvas 2D rendering context is required.')

  const artworkSrc = input.artwork?.src?.trim()
  const [artwork] = await Promise.all([
    artworkSrc
      ? loadShareHighlightArtwork(artworkSrc, options)
      : Promise.resolve(null),
    awaitShareHighlightFonts(resolveFontSet(options.fontSet), options.signal),
  ])

  context.clearRect(0, 0, SHARE_HIGHLIGHT_CARD_WIDTH, SHARE_HIGHLIGHT_CARD_HEIGHT)
  let cardSafeZone = input.artwork?.textSafeZone

  if (artwork) {
    const placement = computeShareHighlightObjectCover(
      artwork.width,
      artwork.height,
      SHARE_HIGHLIGHT_CARD_WIDTH,
      SHARE_HIGHLIGHT_CARD_HEIGHT,
      input.artwork?.focalPosition
    )
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(
      artwork.source,
      placement.sourceX,
      placement.sourceY,
      placement.sourceWidth,
      placement.sourceHeight,
      placement.destinationX,
      placement.destinationY,
      placement.destinationWidth,
      placement.destinationHeight
    )
    if (cardSafeZone) {
      cardSafeZone = mapShareHighlightArtworkSafeZone(cardSafeZone, artwork.width, artwork.height, placement)
    }
  } else {
    drawNoArtworkBackground(context)
    cardSafeZone = DEFAULT_TEXT_SAFE_ZONE
  }

  const measure: ShareHighlightTextMeasure = (text, style) => {
    context.font = fontString(style)
    return context.measureText(text).width
  }
  const overlayTone = artwork ? input.artwork?.overlayTone : 'dark'
  const palette = resolveShareHighlightOverlayPalette(overlayTone)
  const layout = layoutShareHighlightCardText(
    input.content,
    measure,
    cardSafeZone,
    artwork ? input.textPosition : 'middle',
    overlayTone
  )
  if (artwork) drawLocalizedTextWash(context, layout.panel, palette, layout.density)
  layout.sections.forEach(section => drawTextSection(context, section, palette))
  drawFooterWash(context)
  drawFooter(context, input.content.sourceLabel.trim())
  return canvas
}

export function canvasToPngBlob(
  canvas: HTMLCanvasElement,
  options: Pick<ShareHighlightRendererOptions, 'signal' | 'pngEncodeTimeoutMs'> = {},
): Promise<Blob> {
  return withShareHighlightRenderDeadline(
    () => new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('The share highlight canvas could not be encoded as PNG.'))
      }, 'image/png')
    }),
    {
      signal: options.signal,
      timeoutMs: resolveRenderTimeout(
        options.pngEncodeTimeoutMs,
        SHARE_HIGHLIGHT_PNG_ENCODE_TIMEOUT_MS,
      ),
      timeoutMessage: 'Share image encoding timed out before completion.',
    },
  )
}

function normalizePngFileName(value?: string) {
  const requested = value?.trim() || 'naamras-highlight.png'
  const safe = requested.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'naamras-highlight.png'
  return safe.toLowerCase().endsWith('.png') ? safe : `${safe}.png`
}

export async function exportShareHighlightPng(
  input: ShareHighlightCardInput,
  options: ShareHighlightRendererOptions = {}
): Promise<ShareHighlightPngExport> {
  const canvas = await renderShareHighlightCard(input, options)
  const blob = await canvasToPngBlob(canvas, options)
  const file = new File([blob], normalizePngFileName(input.fileName), { type: 'image/png' })
  return {
    canvas,
    blob,
    file,
    width: SHARE_HIGHLIGHT_CARD_WIDTH,
    height: SHARE_HIGHLIGHT_CARD_HEIGHT,
  }
}

interface ResolvedStoryArtworkProfile extends ShareHighlightStoryArtworkProfile {
  focalPosition: ShareHighlightNormalizedPoint
  heroHeightFraction: number
  presentation: ShareHighlightStoryArtworkPresentation
}

interface ResolvedStoryArtworkPlacement {
  ambientPlacement: ShareHighlightObjectCoverPlacement | null
  crispPlacement: ShareHighlightObjectCoverPlacement | null
  cameoPlacement: ShareHighlightObjectCoverPlacement | null
  frameEffect: ShareHighlightStoryFrameEffect
  protectedCanvasBounds: ShareHighlightPixelRect | null
}

const DEFAULT_STORY_ARTWORK_PRESENTATION: ShareHighlightStoryArtworkPresentation = {
  short: { fit: 'contain', stageHeight: 500 },
  long: { frameEffect: 'warm', cameoFit: 'contain' },
}

function resolveStoryArtworkProfile(
  input: ShareHighlightPassageInput,
  artwork: ShareHighlightDecodedImage | null
): ResolvedStoryArtworkProfile {
  const authored = input.artwork?.storyProfile
  const protectedBounds = authored?.protectedSubject?.bounds
  const protectedCenter = protectedBounds
    ? normalizePoint({
        x: protectedBounds.x + (protectedBounds.width / 2),
        y: protectedBounds.y + (protectedBounds.height / 2),
      })
    : null
  const inferredMode: ShareHighlightStoryArtworkMode = artwork
    ? artwork.width / artwork.height > 1.12
      ? 'landscape-hero'
      : artwork.width / artwork.height < 0.72
        ? 'portrait-bleed'
        : 'pattern-frame'
    : 'portrait-bleed'

  return {
    mode: authored?.mode ?? inferredMode,
    focalPosition: normalizePoint(
      authored?.focalPosition
      ?? protectedCenter
      ?? input.artwork?.focalPosition
    ),
    heroHeightFraction: clamp(
      finiteOr(authored?.heroHeightFraction, 0.34),
      0.24,
      0.48
    ),
    presentation: authored?.presentation ?? DEFAULT_STORY_ARTWORK_PRESENTATION,
    ...(authored?.protectedSubject
      ? { protectedSubject: authored.protectedSubject }
      : {}),
  }
}

function isValidStoryArtworkProfile(profile: ShareHighlightStoryArtworkProfile) {
  const validMode = profile.mode === 'portrait-bleed'
    || profile.mode === 'landscape-hero'
    || profile.mode === 'pattern-frame'
  const validPoint = (point: ShareHighlightNormalizedPoint | undefined) => (
    point === undefined
    || (
      Number.isFinite(point.x)
      && Number.isFinite(point.y)
      && point.x >= 0
      && point.x <= 1
      && point.y >= 0
      && point.y <= 1
    )
  )
  const validHeroHeight = profile.heroHeightFraction === undefined
    || (
      Number.isFinite(profile.heroHeightFraction)
      && profile.heroHeightFraction > 0
      && profile.heroHeightFraction <= 1
    )
  const validSubject = profile.protectedSubject === undefined
    || (
      (profile.protectedSubject.intent === 'keep-visible'
        || profile.protectedSubject.intent === 'keep-clear-of-text')
      && isValidNormalizedBounds(profile.protectedSubject.bounds)
    )
  const validFit = (fit: ShareHighlightStoryArtworkFit) => (
    fit === 'protected-cover' || fit === 'contain'
  )
  const validFrameEffect = (effect: ShareHighlightStoryFrameEffect) => (
    effect === 'warm'
    || effect === 'cool'
    || effect === 'vivid'
    || effect === 'pattern'
    || effect === 'architectural'
    || effect === 'amber'
  )
  const presentation = profile.presentation
  const validPresentation = presentation === undefined || (
    validFit(presentation.short.fit)
    && Number.isFinite(presentation.short.stageHeight)
    && presentation.short.stageHeight > 0
    && presentation.short.stageHeight <= STORY_EXPRESSIVE_ART_STAGE.height
    && validFrameEffect(presentation.long.frameEffect)
    && validFit(presentation.long.cameoFit)
    && (
      presentation.long.cameoMaxAspect === undefined
      || (
        Number.isFinite(presentation.long.cameoMaxAspect)
        && presentation.long.cameoMaxAspect > 0
        && presentation.long.cameoMaxAspect <= 2
      )
    )
  )
  return validMode
    && validPoint(profile.focalPosition)
    && validHeroHeight
    && validSubject
    && validPresentation
}

function placementDestinationRect(
  placement: ShareHighlightObjectCoverPlacement
): ShareHighlightPixelRect {
  return {
    x: placement.destinationX,
    y: placement.destinationY,
    width: placement.destinationWidth,
    height: placement.destinationHeight,
  }
}

function pixelRectContains(
  outer: ShareHighlightPixelRect,
  inner: ShareHighlightPixelRect
) {
  const epsilon = 0.001
  return inner.x >= outer.x - epsilon
    && inner.y >= outer.y - epsilon
    && inner.x + inner.width <= outer.x + outer.width + epsilon
    && inner.y + inner.height <= outer.y + outer.height + epsilon
}

function pixelRectHasFinitePositiveArea(rect: ShareHighlightPixelRect) {
  return Number.isFinite(rect.x)
    && Number.isFinite(rect.y)
    && Number.isFinite(rect.width)
    && Number.isFinite(rect.height)
    && rect.width > 0
    && rect.height > 0
}

function pixelRectsOverlap(
  left: ShareHighlightPixelRect,
  right: ShareHighlightPixelRect
) {
  return left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.y < right.y + right.height
    && left.y + left.height > right.y
}

function expressiveFooterSurface(
  footerMode: ShareHighlightStoryFooterMode
) {
  return footerMode === 'linked'
    ? STORY_EXPRESSIVE_LINK_FOOTER_SURFACE
    : STORY_EXPRESSIVE_PLAIN_FOOTER_SURFACE
}

function computeStoryObjectCoverPlacement(
  imageWidth: number,
  imageHeight: number,
  destination: ShareHighlightPixelRect,
  focalPosition: ShareHighlightNormalizedPoint
) {
  return {
    ...computeShareHighlightObjectCover(
      imageWidth,
      imageHeight,
      destination.width,
      destination.height,
      focalPosition
    ),
    destinationX: destination.x,
    destinationY: destination.y,
  }
}

function centeredArtworkStage(
  parent: ShareHighlightPixelRect,
  maximumHeight: number,
  maximumAspect?: number
): ShareHighlightPixelRect {
  const height = Math.min(parent.height, maximumHeight)
  const width = maximumAspect === undefined
    ? parent.width
    : Math.min(parent.width, height * maximumAspect)
  return {
    x: parent.x + ((parent.width - width) / 2),
    y: parent.y + ((parent.height - height) / 2),
    width,
    height,
  }
}

/**
 * Finds the largest cover crop inside a stage that keeps the complete authored
 * protected subject visible. The crop origin is additionally constrained so a
 * focal point near an edge can never push protected pixels out of frame.
 */
export function computeShareHighlightProtectedCover(
  imageWidth: number,
  imageHeight: number,
  destination: ShareHighlightPixelRect,
  protectedBounds: ShareHighlightNormalizedRect,
  focalPosition: ShareHighlightNormalizedPoint = DEFAULT_FOCAL_POSITION
): ShareHighlightObjectCoverPlacement {
  if (
    !Number.isFinite(imageWidth)
    || !Number.isFinite(imageHeight)
    || imageWidth <= 0
    || imageHeight <= 0
    || !pixelRectHasFinitePositiveArea(destination)
    || !isValidNormalizedBounds(protectedBounds)
  ) {
    throw new RangeError('Protected-cover artwork geometry must be finite and positive.')
  }

  const sourceAspect = imageWidth / imageHeight
  const destinationAspect = destination.width / destination.height
  const minimumSafeAspect = sourceAspect * protectedBounds.width
  const maximumSafeAspect = sourceAspect / protectedBounds.height
  const safeAspect = clamp(
    destinationAspect,
    minimumSafeAspect,
    maximumSafeAspect
  )
  const safeDestinationWidth = safeAspect >= destinationAspect
    ? destination.width
    : destination.height * safeAspect
  const safeDestinationHeight = safeAspect >= destinationAspect
    ? destination.width / safeAspect
    : destination.height
  const safeDestination = {
    x: destination.x + ((destination.width - safeDestinationWidth) / 2),
    y: destination.y + ((destination.height - safeDestinationHeight) / 2),
    width: safeDestinationWidth,
    height: safeDestinationHeight,
  }

  const cropUsesFullHeight = sourceAspect >= safeAspect
  const sourceWidth = cropUsesFullHeight ? imageHeight * safeAspect : imageWidth
  const sourceHeight = cropUsesFullHeight ? imageHeight : imageWidth / safeAspect
  const protectedLeft = protectedBounds.x * imageWidth
  const protectedRight = (protectedBounds.x + protectedBounds.width) * imageWidth
  const protectedTop = protectedBounds.y * imageHeight
  const protectedBottom = (protectedBounds.y + protectedBounds.height) * imageHeight
  const minimumSourceX = Math.max(0, protectedRight - sourceWidth)
  const maximumSourceX = Math.min(protectedLeft, imageWidth - sourceWidth)
  const minimumSourceY = Math.max(0, protectedBottom - sourceHeight)
  const maximumSourceY = Math.min(protectedTop, imageHeight - sourceHeight)
  const focal = normalizePoint(focalPosition)
  const sourceX = clamp(
    (imageWidth * focal.x) - (sourceWidth / 2),
    minimumSourceX,
    maximumSourceX
  )
  const sourceY = clamp(
    (imageHeight * focal.y) - (sourceHeight / 2),
    minimumSourceY,
    maximumSourceY
  )

  return {
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    destinationX: safeDestination.x,
    destinationY: safeDestination.y,
    destinationWidth: safeDestination.width,
    destinationHeight: safeDestination.height,
  }
}

function resolveAuthoredArtworkPlacement(
  artwork: ShareHighlightDecodedImage,
  destination: ShareHighlightPixelRect,
  fit: ShareHighlightStoryArtworkFit,
  profile: ResolvedStoryArtworkProfile
) {
  if (fit === 'protected-cover' && profile.protectedSubject) {
    return computeShareHighlightProtectedCover(
      artwork.width,
      artwork.height,
      destination,
      profile.protectedSubject.bounds,
      profile.focalPosition
    )
  }
  return computeShareHighlightObjectContain(
    artwork.width,
    artwork.height,
    destination
  )
}

function resolveStoryArtworkPlacement(
  artwork: ShareHighlightDecodedImage,
  profile: ResolvedStoryArtworkProfile,
  layout: ShareHighlightStoryLayout,
  footerMode: ShareHighlightStoryFooterMode
): ResolvedStoryArtworkPlacement | null {
  if (
    !Number.isFinite(artwork.width)
    || !Number.isFinite(artwork.height)
    || artwork.width <= 0
    || artwork.height <= 0
  ) return null

  try {
    if (layout.composition === 'manuscript') {
      const ambientDestination = {
        x: -STORY_MANUSCRIPT_AMBIENT_OVERSCAN,
        y: -STORY_MANUSCRIPT_AMBIENT_OVERSCAN,
        width: SHARE_HIGHLIGHT_STORY_WIDTH + (STORY_MANUSCRIPT_AMBIENT_OVERSCAN * 2),
        height: SHARE_HIGHLIGHT_STORY_HEIGHT + (STORY_MANUSCRIPT_AMBIENT_OVERSCAN * 2),
      }
      const ambientPlacement = computeStoryObjectCoverPlacement(
        artwork.width,
        artwork.height,
        ambientDestination,
        profile.focalPosition
      )
      const cameoStage = centeredArtworkStage(
        STORY_MANUSCRIPT_CAMEO_STAGE,
        STORY_MANUSCRIPT_CAMEO_STAGE.height,
        profile.presentation.long.cameoMaxAspect
      )
      const cameoPlacement = resolveAuthoredArtworkPlacement(
        artwork,
        cameoStage,
        profile.presentation.long.cameoFit,
        profile
      )
      const cameoBounds = placementDestinationRect(cameoPlacement)
      const protectedCanvasBounds = profile.protectedSubject
        ? mapShareHighlightArtworkBoundsToCanvas(
            profile.protectedSubject.bounds,
            artwork.width,
            artwork.height,
            cameoPlacement
          )
        : null
      const footerRuleY = footerMode === 'linked'
        ? MANUSCRIPT_LINK_FOOTER_RULE_Y
        : MANUSCRIPT_PLAIN_FOOTER_RULE_Y
      const manuscriptReservedSurfaces: ShareHighlightPixelRect[] = [
        STORY_MANUSCRIPT_HEADER_COPY,
        layout.body,
        {
          x: layout.body.x,
          y: footerRuleY,
          width: layout.body.width,
          height: STORY_SAFE_BOTTOM - footerRuleY,
        },
      ]
      const placementIsSafe = isValidArtworkPlacement(
        ambientPlacement,
        artwork.width,
        artwork.height
      )
        && isValidArtworkPlacement(cameoPlacement, artwork.width, artwork.height)
        && pixelRectContains(STORY_MANUSCRIPT_CAMEO_STAGE, cameoBounds)
        && manuscriptReservedSurfaces.every(surface => (
          !pixelRectsOverlap(cameoBounds, surface)
        ))
        && (
          protectedCanvasBounds === null
          || (
            pixelRectHasFinitePositiveArea(protectedCanvasBounds)
            && pixelRectContains(cameoBounds, protectedCanvasBounds)
            && manuscriptReservedSurfaces.every(surface => (
              !pixelRectsOverlap(protectedCanvasBounds, surface)
            ))
          )
        )

      return placementIsSafe
        ? {
            ambientPlacement,
            crispPlacement: null,
            cameoPlacement,
            frameEffect: profile.presentation.long.frameEffect,
            protectedCanvasBounds,
          }
        : null
    }

    const shortStage = centeredArtworkStage(
      STORY_EXPRESSIVE_ART_STAGE,
      profile.presentation.short.stageHeight
    )
    const crispPlacement = resolveAuthoredArtworkPlacement(
      artwork,
      shortStage,
      profile.presentation.short.fit,
      profile
    )
    const ambientPlacement = computeStoryObjectCoverPlacement(
      artwork.width,
      artwork.height,
      STORY_EXPRESSIVE_AMBIENT_DESTINATION,
      profile.focalPosition
    )
    const artworkBounds = placementDestinationRect(crispPlacement)
    const ambientBounds = placementDestinationRect(ambientPlacement)
    const protectedCanvasBounds = profile.protectedSubject
      ? mapShareHighlightArtworkBoundsToCanvas(
          profile.protectedSubject.bounds,
          artwork.width,
          artwork.height,
          crispPlacement
        )
      : null
    const reservedSurfaces = [
      STORY_EXPRESSIVE_HEADER_SURFACE,
      layout.readingSurface,
      expressiveFooterSurface(footerMode),
    ]
    const placementIsSafe = isValidArtworkPlacement(
      crispPlacement,
      artwork.width,
      artwork.height
    )
      && isValidArtworkPlacement(ambientPlacement, artwork.width, artwork.height)
      && pixelRectHasFinitePositiveArea(artworkBounds)
      && pixelRectHasFinitePositiveArea(ambientBounds)
      && pixelRectContains(STORY_EXPRESSIVE_ART_STAGE, artworkBounds)
      && pixelRectContains(ambientBounds, STORY_EXPRESSIVE_ART_STAGE)
      && reservedSurfaces.every(surface => !pixelRectsOverlap(
        STORY_EXPRESSIVE_ART_STAGE,
        surface
      ))
      && (
        protectedCanvasBounds === null
        || (
          pixelRectHasFinitePositiveArea(protectedCanvasBounds)
          && pixelRectContains(artworkBounds, protectedCanvasBounds)
          && reservedSurfaces.every(surface => (
            !pixelRectsOverlap(protectedCanvasBounds, surface)
          ))
        )
      )

    return placementIsSafe
      ? {
          ambientPlacement,
          crispPlacement,
          cameoPlacement: null,
          frameEffect: profile.presentation.long.frameEffect,
          protectedCanvasBounds,
        }
      : null
  } catch {
    return null
  }
}

function drawStoryArtworkBackground(
  context: CanvasRenderingContext2D,
  artwork: ShareHighlightDecodedImage | null,
  resolvedPlacement: ResolvedStoryArtworkPlacement | null,
  composition: ShareHighlightStoryComposition
) {
  // Story decoration is intentionally restrained. Ordinary highlight cards
  // retain their existing background treatment in drawNoArtworkBackground.
  context.fillStyle = artwork && resolvedPlacement ? '#17191a' : '#f5ecda'
  context.fillRect(0, 0, SHARE_HIGHLIGHT_STORY_WIDTH, SHARE_HIGHLIGHT_STORY_HEIGHT)
  if (!artwork || !resolvedPlacement) {
    return
  }

  if (composition === 'manuscript') {
    const ambientPlacement = resolvedPlacement.ambientPlacement
    if (!ambientPlacement) return
    const frameTreatments: Record<ShareHighlightStoryFrameEffect, {
      filter: string
      overlay: string
    }> = {
      warm: {
        filter: 'blur(14px) saturate(0.70) brightness(0.50)',
        overlay: 'rgba(29, 14, 8, 0.26)',
      },
      cool: {
        filter: 'blur(14px) saturate(0.64) brightness(0.48)',
        overlay: 'rgba(5, 20, 28, 0.28)',
      },
      vivid: {
        filter: 'blur(18px) saturate(0.56) brightness(0.44)',
        overlay: 'rgba(8, 16, 22, 0.32)',
      },
      pattern: {
        filter: 'blur(3px) saturate(0.80) brightness(0.58)',
        overlay: 'rgba(24, 14, 8, 0.16)',
      },
      architectural: {
        filter: 'blur(8px) saturate(0.70) brightness(0.56)',
        overlay: 'rgba(10, 18, 24, 0.20)',
      },
      amber: {
        filter: 'blur(10px) saturate(0.68) brightness(0.44)',
        overlay: 'rgba(36, 17, 3, 0.30)',
      },
    }
    const treatment = frameTreatments[resolvedPlacement.frameEffect]

    context.save()
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.filter = treatment.filter
    context.globalAlpha = 1
    context.drawImage(
      artwork.source,
      ambientPlacement.sourceX,
      ambientPlacement.sourceY,
      ambientPlacement.sourceWidth,
      ambientPlacement.sourceHeight,
      ambientPlacement.destinationX,
      ambientPlacement.destinationY,
      ambientPlacement.destinationWidth,
      ambientPlacement.destinationHeight
    )
    context.filter = 'none'
    context.fillStyle = treatment.overlay
    context.fillRect(0, 0, SHARE_HIGHLIGHT_STORY_WIDTH, SHARE_HIGHLIGHT_STORY_HEIGHT)
    context.restore()
    return
  }

  if (composition === 'expressive') {
    const ambientPlacement = resolvedPlacement.ambientPlacement
    if (!ambientPlacement) return

    context.save()
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.filter = 'blur(24px) saturate(0.72) brightness(0.62)'
    context.globalAlpha = 0.88
    context.drawImage(
      artwork.source,
      ambientPlacement.sourceX,
      ambientPlacement.sourceY,
      ambientPlacement.sourceWidth,
      ambientPlacement.sourceHeight,
      ambientPlacement.destinationX,
      ambientPlacement.destinationY,
      ambientPlacement.destinationWidth,
      ambientPlacement.destinationHeight
    )
    context.filter = 'none'
    context.globalAlpha = 1
    context.fillStyle = 'rgba(15, 13, 12, 0.42)'
    context.fillRect(0, 0, SHARE_HIGHLIGHT_STORY_WIDTH, SHARE_HIGHLIGHT_STORY_HEIGHT)
    context.restore()
  }

  const placement = resolvedPlacement.crispPlacement
  if (!placement) return
  context.save()
  // The sharp, uncropped subject remains visible over the full-canvas art.
  // Square edges also avoid masking protected pixels at a rounded corner.
  roundedRectanglePath(context, STORY_EXPRESSIVE_ART_STAGE, 0)
  context.clip()
  context.filter = 'none'
  context.globalAlpha = 1
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(
    artwork.source,
    placement.sourceX,
    placement.sourceY,
    placement.sourceWidth,
    placement.sourceHeight,
    placement.destinationX,
    placement.destinationY,
    placement.destinationWidth,
    placement.destinationHeight
  )
  context.restore()
}

function drawStoryArtworkCameo(
  context: CanvasRenderingContext2D,
  artwork: ShareHighlightDecodedImage | null,
  resolvedPlacement: ResolvedStoryArtworkPlacement | null,
  composition: ShareHighlightStoryComposition
) {
  const placement = resolvedPlacement?.cameoPlacement
  if (composition !== 'manuscript' || !artwork || !placement) return

  context.save()
  context.shadowColor = 'transparent'
  context.shadowBlur = 0
  context.shadowOffsetX = 0
  context.shadowOffsetY = 0
  roundedRectanglePath(context, STORY_MANUSCRIPT_CAMEO_STAGE, 0)
  context.clip()
  context.filter = 'none'
  context.globalAlpha = 1
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(
    artwork.source,
    placement.sourceX,
    placement.sourceY,
    placement.sourceWidth,
    placement.sourceHeight,
    placement.destinationX,
    placement.destinationY,
    placement.destinationWidth,
    placement.destinationHeight
  )
  context.restore()
}

function normalizePassageFileBase(value?: string) {
  const normalized = normalizePngFileName(value?.trim() || 'naamras-hukamnama')
  return normalized || 'naamras-hukamnama.png'
}

function makePassagePageFileName(
  value: string | undefined,
  pageNumber: number,
  pageCount: number
) {
  const normalized = normalizePassageFileBase(value)
  if (pageCount <= 1) return normalized

  const stem = normalized.replace(/\.png$/i, '')
  const numberWidth = Math.max(2, String(pageCount).length)
  return `${stem}-${String(pageNumber).padStart(numberWidth, '0')}-of-${String(pageCount).padStart(numberWidth, '0')}.png`
}

interface RenderedShareHighlightStory {
  canvas: HTMLCanvasElement
  layout: ShareHighlightStoryLayout
}

interface ShareHighlightStoryRenderPlan {
  artwork: ShareHighlightDecodedImage | null
  artworkPlacement: ResolvedStoryArtworkPlacement | null
  dateLabel: string | null
  footerMode: ShareHighlightStoryFooterMode
  layouts: ShareHighlightStoryLayout[]
  overlayTone: string | undefined
  seriesLabel: string
  sourceLabel: string
}

type ShareHighlightStoryLayoutPlanner = (
  measure: ShareHighlightTextMeasure,
  overlayTone: string | undefined,
  storyProfile: ShareHighlightStoryArtworkProfile | undefined,
  footerMode: ShareHighlightStoryFooterMode,
  forceManuscript: boolean
) => ShareHighlightStoryLayout[]

function prepareStoryCanvas(canvas: HTMLCanvasElement) {
  canvas.width = SHARE_HIGHLIGHT_STORY_WIDTH
  canvas.height = SHARE_HIGHLIGHT_STORY_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('A Canvas 2D rendering context is required.')
  return context
}

function releaseStoryCanvas(canvas: HTMLCanvasElement) {
  // Resetting both dimensions releases the browser's native pixel buffer. Set
  // exports retain only encoded blobs; singular exports intentionally keep the
  // canvas for the existing live preview API.
  canvas.width = 0
  canvas.height = 0
}

function measureStoryTextWith(context: CanvasRenderingContext2D): ShareHighlightTextMeasure {
  return (text, style) => {
    context.font = fontString(style)
    return context.measureText(text).width
  }
}

function makeStoryPageDateLabel(
  dateLabel: string | null,
  pageNumber?: number,
  pageCount?: number
) {
  if (!pageNumber || !pageCount || pageCount <= 1) return dateLabel
  return [dateLabel, `${pageNumber} / ${pageCount}`].filter(Boolean).join(' · ')
}

function drawPlannedShareHighlightStory(
  context: CanvasRenderingContext2D,
  input: ShareHighlightPassageInput,
  plan: ShareHighlightStoryRenderPlan,
  layout: ShareHighlightStoryLayout,
  pageNumber?: number,
  pageCount?: number
) {
  const palette = resolveShareHighlightOverlayPalette(
    layout.composition !== 'expressive' ? 'light' : plan.overlayTone
  )

  context.clearRect(0, 0, SHARE_HIGHLIGHT_STORY_WIDTH, SHARE_HIGHLIGHT_STORY_HEIGHT)
  drawStoryArtworkBackground(
    context,
    plan.artwork,
    plan.artworkPlacement,
    layout.composition
  )
  drawStoryReadingSurface(context, layout, palette)
  drawStoryArtworkCameo(
    context,
    plan.artwork,
    plan.artworkPlacement,
    layout.composition
  )
  const hasArtworkCameo = Boolean(plan.artworkPlacement?.cameoPlacement)
  drawStoryMetadataSurfaces(
    context,
    layout,
    palette,
    plan.footerMode,
    hasArtworkCameo
  )
  drawStoryHeader(
    context,
    plan.seriesLabel,
    makeStoryPageDateLabel(plan.dateLabel, pageNumber, pageCount),
    palette,
    layout,
    hasArtworkCameo
  )
  layout.sections.forEach(section => drawTextSection(context, section, palette, false))
  drawStoryFooter(
    context,
    plan.sourceLabel,
    palette,
    layout,
    input.content.shareUrl,
    input.content.supportLabel,
    input.content.scopeCopy
  )
}

async function prepareShareHighlightStoryRenderPlan(
  input: ShareHighlightPassageInput,
  options: ShareHighlightRendererOptions,
  context: CanvasRenderingContext2D,
  planLayouts: ShareHighlightStoryLayoutPlanner
): Promise<ShareHighlightStoryRenderPlan> {
  const sourceLabel = input.content.sourceLabel.trim()
  const seriesLabel = input.content.seriesLabel.trim()
  const dateLabel = input.content.dateLabel?.trim() || null
  const footerMode: ShareHighlightStoryFooterMode = input.content.shareUrl?.trim()
    ? 'linked'
    : 'plain'
  if (!sourceLabel) throw new TypeError('A passage source label is required.')
  if (!seriesLabel) throw new TypeError('A passage series label is required.')
  const artworkSrc = input.artwork?.src?.trim() || null
  const authoredProfile = input.artwork?.storyProfile
  const optedIntoStoryArtwork = Boolean(artworkSrc && authoredProfile)
  const profileIsValid = Boolean(
    optedIntoStoryArtwork
    && authoredProfile
    && isValidStoryArtworkProfile(authoredProfile)
  )
  if (optedIntoStoryArtwork && !profileIsValid) {
    throw new TypeError('The selected Hukamnama artwork has an invalid Story profile.')
  }

  await awaitShareHighlightFonts(resolveFontSet(options.fontSet), options.signal)
  throwIfShareHighlightRenderAborted(options.signal)

  const measure = measureStoryTextWith(context)
  let artwork: ShareHighlightDecodedImage | null = null
  let artworkPlacement: ResolvedStoryArtworkPlacement | null = null
  let overlayTone = profileIsValid ? input.artwork?.overlayTone : 'dark'
  const storyProfile = resolveStoryArtworkProfile(input, null)
  let layouts = planLayouts(
    measure,
    overlayTone,
    profileIsValid ? storyProfile : undefined,
    footerMode,
    !optedIntoStoryArtwork
  )
  if (layouts.length === 0) throw new Error('A Hukamnama Story plan requires at least one page.')

  // Only an authored profile opts a supplied image into Hukamnama rendering.
  // The decoded image is shared by the whole set, and the exact placement
  // validated here is retained in the plan and used by every page draw.
  if (profileIsValid && artworkSrc) {
    let decodedArtwork: ShareHighlightDecodedImage
    try {
      decodedArtwork = await loadShareHighlightArtwork(artworkSrc, options)
    } catch (error) {
      if (isShareHighlightRenderInterruption(error)) throw error
      throw new Error('The selected Hukamnama artwork could not be loaded.')
    }
    if (
      !Number.isFinite(decodedArtwork.width)
      || !Number.isFinite(decodedArtwork.height)
      || decodedArtwork.width <= 0
      || decodedArtwork.height <= 0
    ) {
      throw new RangeError('The selected Hukamnama artwork decoded with invalid dimensions.')
    }

    const resolvedProfile = resolveStoryArtworkProfile(input, decodedArtwork)
    let resolvedLayouts = layouts
    if (layouts[0]!.composition === 'expressive') {
      resolvedLayouts = planLayouts(
        measure,
        input.artwork?.overlayTone,
        resolvedProfile,
        footerMode,
        false
      )
    }
    const firstLayout = resolvedLayouts[0]
    const resolvedPlacement = firstLayout
      ? resolveStoryArtworkPlacement(
          decodedArtwork,
          resolvedProfile,
          firstLayout,
          footerMode
        )
      : null

    if (!firstLayout || !resolvedPlacement) {
      throw new RangeError(
        'The selected Hukamnama artwork cannot be placed safely around the reading.'
      )
    }

    artwork = decodedArtwork
    artworkPlacement = resolvedPlacement
    overlayTone = input.artwork?.overlayTone
    layouts = resolvedLayouts
  }

  return {
    artwork,
    artworkPlacement,
    dateLabel,
    footerMode,
    layouts,
    overlayTone,
    seriesLabel,
    sourceLabel,
  }
}

function assertCompleteStoryLayoutPlan(
  layouts: readonly ShareHighlightStoryLayout[],
  normalizedLines: readonly ShareHighlightPassageLine[]
) {
  const expectedSourceLineIds = normalizedLines.map(line => line.id)
  const exportedSourceLineIds = layouts.flatMap(layout => (
    layout.selection.includedSourceLineIds
  ))
  const hasValidPageLinks = layouts.every((layout, index) => {
    const previous = layouts[index - 1]
    const next = layouts[index + 1]
    return layout.selection.includedLineCount > 0
      && layout.selection.totalLineCount === normalizedLines.length
      && layout.selection.previousSourceLineId === (
        previous?.selection.firstSourceLineId ?? null
      )
      && layout.selection.nextSourceLineId === (
        next?.selection.firstSourceLineId ?? null
      )
  })

  if (
    layouts.length === 0
    || !hasValidPageLinks
    || exportedSourceLineIds.length !== expectedSourceLineIds.length
    || exportedSourceLineIds.some((sourceLineId, index) => (
      sourceLineId !== expectedSourceLineIds[index]
    ))
  ) {
    throw new Error('Hukamnama Story pagination did not preserve the complete passage.')
  }
}

function makePlannedExcerptSelection(
  lines: readonly ShareHighlightPassageLine[],
  totalLineCount: number,
  previousSourceLineId: ShareHighlightPassageLine['id'] | null,
  nextSourceLineId: ShareHighlightPassageLine['id'] | null
): ShareHighlightStorySelection {
  const includedSourceLineIds = lines.map(line => line.id)
  return {
    mode: 'excerpt',
    anchorSourceLineId: includedSourceLineIds[0]!,
    includedLineCount: includedSourceLineIds.length,
    totalLineCount,
    includedSourceLineIds,
    firstSourceLineId: includedSourceLineIds[0]!,
    lastSourceLineId: includedSourceLineIds.at(-1)!,
    previousSourceLineId,
    nextSourceLineId,
  }
}

function layoutExactManuscriptStoryPage(
  lines: readonly ShareHighlightPassageLine[],
  measure: ShareHighlightTextMeasure,
  overlayTone: string | undefined,
  storyProfile: ShareHighlightStoryArtworkProfile | undefined,
  footerMode: ShareHighlightStoryFooterMode,
  selection: ShareHighlightStorySelection
) {
  const attempt = tryStoryComposition(
    lines,
    measure,
    'manuscript',
    storyProfile,
    overlayTone,
    footerMode
  )
  return attempt.layout ? applyStorySelection(attempt.layout, selection) : null
}

const STORY_FINAL_PAGE_MINIMUM_FILL_GAIN = 0.04
const STORY_FINAL_PAGE_SCORE_EPSILON = 0.001
const STORY_FINAL_PAGE_MAX_CANDIDATES = 2

function storyLayoutContentFill(layout: ShareHighlightStoryLayout) {
  if (layout.sections.length === 0 || layout.body.height <= 0) return 0

  const contentTop = Math.min(...layout.sections.map(section => section.y))
  const contentBottom = Math.max(...layout.sections.map(section => (
    section.y + section.height
  )))
  return clamp((contentBottom - contentTop) / layout.body.height, 0, 1)
}

interface StoryFinalPairCandidate {
  layouts: [ShareHighlightStoryLayout, ShareHighlightStoryLayout]
  minimumFill: number
  fillImbalance: number
  scaleImbalance: number
  movedBlockCount: number
}

interface StoryFinalSplitCandidate {
  splitBlockIndex: number
  estimatedImbalance: number
  movedBlockCount: number
}

function rankStoryFinalSplitCandidates(
  blocks: readonly StoryAtomicBlock[],
  normalizedLines: readonly ShareHighlightPassageLine[],
  previousStartBlockIndex: number,
  originalFinalStartBlockIndex: number,
  measure: ShareHighlightTextMeasure,
  overlayTone: string | undefined
) {
  const relevantBlocks = blocks.slice(previousStartBlockIndex)
  const minimumGapScale = 0.72
  const weights = relevantBlocks.map(block => {
    const blockLines = normalizedLines.slice(
      block.startLineIndex,
      block.endLineIndex + 1
    )
    const measured = measureStoryDrafts(
      blockLines,
      measure,
      'manuscript',
      0,
      overlayTone
    )
    const finalLine = blockLines.at(-1)!
    return measured.requiredHeight + storyLineGap(
      finalLine,
      'manuscript',
      minimumGapScale
    )
  })
  const totalWeight = weights.reduce((total, weight) => total + weight, 0)
  let leftWeight = 0
  const candidates: StoryFinalSplitCandidate[] = []

  for (let offset = 1; offset < relevantBlocks.length; offset += 1) {
    leftWeight += weights[offset - 1]!
    const splitBlockIndex = previousStartBlockIndex + offset
    if (splitBlockIndex === originalFinalStartBlockIndex) continue
    candidates.push({
      splitBlockIndex,
      estimatedImbalance: Math.abs(leftWeight - (totalWeight - leftWeight)),
      movedBlockCount: Math.abs(splitBlockIndex - originalFinalStartBlockIndex),
    })
  }

  return candidates
    .sort((candidate, current) => (
      candidate.estimatedImbalance - current.estimatedImbalance
      || candidate.movedBlockCount - current.movedBlockCount
    ))
    .slice(0, STORY_FINAL_PAGE_MAX_CANDIDATES)
}

function scoreStoryFinalPair(
  layouts: StoryFinalPairCandidate['layouts'],
  movedBlockCount: number
): StoryFinalPairCandidate {
  const fills = layouts.map(storyLayoutContentFill)
  return {
    layouts,
    minimumFill: Math.min(...fills),
    fillImbalance: Math.abs(fills[0]! - fills[1]!),
    scaleImbalance: Math.abs(
      layouts[0].contentScale - layouts[1].contentScale
    ),
    movedBlockCount,
  }
}

function isBetterStoryFinalPair(
  candidate: StoryFinalPairCandidate,
  current: StoryFinalPairCandidate
) {
  if (
    candidate.minimumFill
    > current.minimumFill + STORY_FINAL_PAGE_SCORE_EPSILON
  ) return true
  if (
    Math.abs(candidate.minimumFill - current.minimumFill)
    > STORY_FINAL_PAGE_SCORE_EPSILON
  ) return false

  if (
    candidate.fillImbalance
    < current.fillImbalance - STORY_FINAL_PAGE_SCORE_EPSILON
  ) return true
  if (
    Math.abs(candidate.fillImbalance - current.fillImbalance)
    > STORY_FINAL_PAGE_SCORE_EPSILON
  ) return false

  if (
    candidate.scaleImbalance
    < current.scaleImbalance - STORY_FINAL_PAGE_SCORE_EPSILON
  ) return true
  if (
    Math.abs(candidate.scaleImbalance - current.scaleImbalance)
    > STORY_FINAL_PAGE_SCORE_EPSILON
  ) return false

  return candidate.movedBlockCount < current.movedBlockCount
}

function rebalanceFinalStoryPages(
  layouts: readonly ShareHighlightStoryLayout[],
  normalizedLines: readonly ShareHighlightPassageLine[],
  measure: ShareHighlightTextMeasure,
  overlayTone: string | undefined,
  storyProfile: ShareHighlightStoryArtworkProfile | undefined,
  footerMode: ShareHighlightStoryFooterMode
) {
  if (layouts.length < 2) return Array.from(layouts)

  const previousLayout = layouts.at(-2)!
  const finalLayout = layouts.at(-1)!
  if (
    previousLayout.composition !== 'manuscript'
    || finalLayout.composition !== 'manuscript'
  ) return Array.from(layouts)

  const blocks = buildStoryAtomicBlocks(normalizedLines)
  const finalStartLineIndex = normalizedLines.length - finalLayout.selection.includedLineCount
  const previousStartLineIndex = (
    finalStartLineIndex - previousLayout.selection.includedLineCount
  )
  const finalStartBlockIndex = blocks.findIndex(block => (
    block.startLineIndex === finalStartLineIndex
  ))
  const previousStartBlockIndex = blocks.findIndex(block => (
    block.startLineIndex === previousStartLineIndex
  ))
  if (
    finalStartBlockIndex < 1
    || previousStartBlockIndex < 0
  ) return Array.from(layouts)

  const pageBeforePrevious = layouts.at(-3)
  const originalPair: StoryFinalPairCandidate['layouts'] = [
    previousLayout,
    finalLayout,
  ]
  const originalScore = scoreStoryFinalPair(originalPair, 0)
  let bestScore = originalScore

  // Rank boundaries using real minimum-font wrapping for each atomic block,
  // then fully lay out only the two most balanced candidates. This remains
  // height-aware without turning the final polish pass into an exhaustive
  // series of costly full-page layout searches.
  const splitCandidates = rankStoryFinalSplitCandidates(
    blocks,
    normalizedLines,
    previousStartBlockIndex,
    finalStartBlockIndex,
    measure,
    overlayTone
  )
  for (const splitCandidate of splitCandidates) {
    const { splitBlockIndex } = splitCandidate

    const finalStartLine = blocks[splitBlockIndex]!.startLineIndex
    const candidatePreviousLines = normalizedLines.slice(
      previousStartLineIndex,
      finalStartLine
    )
    const candidateFinalLines = normalizedLines.slice(finalStartLine)
    const previousSelection = makePlannedExcerptSelection(
      candidatePreviousLines,
      normalizedLines.length,
      pageBeforePrevious?.selection.firstSourceLineId ?? null,
      candidateFinalLines[0]!.id
    )
    const finalSelection = makePlannedExcerptSelection(
      candidateFinalLines,
      normalizedLines.length,
      candidatePreviousLines[0]!.id,
      null
    )
    const candidatePrevious = layoutExactManuscriptStoryPage(
      candidatePreviousLines,
      measure,
      overlayTone,
      storyProfile,
      footerMode,
      previousSelection
    )
    const candidateFinal = layoutExactManuscriptStoryPage(
      candidateFinalLines,
      measure,
      overlayTone,
      storyProfile,
      footerMode,
      finalSelection
    )
    if (!candidatePrevious || !candidateFinal) continue

    const candidateScore = scoreStoryFinalPair(
      [candidatePrevious, candidateFinal],
      splitCandidate.movedBlockCount
    )
    if (isBetterStoryFinalPair(candidateScore, bestScore)) {
      bestScore = candidateScore
    }
  }

  // Avoid moving stable boundaries for tiny metric differences. Four percent
  // of the manuscript body is roughly one readable support line; a change
  // below that threshold is not a meaningful visual improvement.
  if (
    bestScore === originalScore
    || bestScore.minimumFill
      < originalScore.minimumFill + STORY_FINAL_PAGE_MINIMUM_FILL_GAIN
  ) return Array.from(layouts)

  return [
    ...layouts.slice(0, -2),
    ...bestScore.layouts,
  ]
}

function planCompleteStoryLayouts(
  normalizedLines: readonly ShareHighlightPassageLine[],
  measure: ShareHighlightTextMeasure,
  overlayTone: string | undefined,
  storyProfile: ShareHighlightStoryArtworkProfile | undefined,
  footerMode: ShareHighlightStoryFooterMode,
  forceManuscript = false
) {
  const layouts: ShareHighlightStoryLayout[] = []
  const seenPageStarts = new Set<ShareHighlightPassageLine['id']>()
  let nextAnchorLineId: ShareHighlightPassageLine['id'] | null = null
  let previousPageStartLineId: ShareHighlightPassageLine['id'] | null = null

  for (let pageIndex = 0; pageIndex < normalizedLines.length; pageIndex += 1) {
    const layout = layoutNormalizedShareHighlightStory(
      normalizedLines,
      measure,
      overlayTone,
      storyProfile,
      nextAnchorLineId,
      footerMode,
      {
        previousSourceLineId: previousPageStartLineId,
        excerptOnly: pageIndex > 0,
      },
      forceManuscript
    )
    const selection = layout.selection
    if (
      selection.includedLineCount <= 0
      || seenPageStarts.has(selection.firstSourceLineId)
    ) {
      throw new Error('Hukamnama Story pagination did not advance.')
    }

    layouts.push(layout)
    seenPageStarts.add(selection.firstSourceLineId)

    if (selection.mode === 'complete' || selection.nextSourceLineId === null) break
    previousPageStartLineId = selection.firstSourceLineId
    nextAnchorLineId = selection.nextSourceLineId
  }

  const rebalancedLayouts = rebalanceFinalStoryPages(
    layouts,
    normalizedLines,
    measure,
    overlayTone,
    storyProfile,
    footerMode
  )
  assertCompleteStoryLayoutPlan(rebalancedLayouts, normalizedLines)
  return rebalancedLayouts
}

/** Renders the adaptive complete reading or contiguous excerpt with metadata. */
async function renderShareHighlightStoryWithLayout(
  input: ShareHighlightPassageInput,
  options: ShareHighlightRendererOptions = {}
): Promise<RenderedShareHighlightStory> {
  const canvas = options.canvas ?? options.createCanvas?.() ?? createDefaultCanvas()
  const context = prepareStoryCanvas(canvas)
  const plan = await prepareShareHighlightStoryRenderPlan(
    input,
    options,
    context,
    (measure, overlayTone, storyProfile, footerMode, forceManuscript) => [
      layoutNormalizedShareHighlightStory(
        normalizePassageLines(input.content.lines),
        measure,
        overlayTone,
        storyProfile,
        input.content.anchorLineId,
        footerMode,
        undefined,
        forceManuscript
      ),
    ]
  )
  const layout = plan.layouts[0]!
  drawPlannedShareHighlightStory(context, input, plan, layout)
  return { canvas, layout }
}

/**
 * Renders one native 9:16 Story canvas. Callers that need exact source coverage
 * should use `exportShareHighlightStoryPng`, which also returns layout metadata.
 */
export async function renderShareHighlightStory(
  input: ShareHighlightPassageInput,
  options: ShareHighlightRendererOptions = {}
): Promise<HTMLCanvasElement> {
  return (await renderShareHighlightStoryWithLayout(input, options)).canvas
}

/** Exports one complete or excerpted reading as a downloadable/shareable PNG. */
export async function exportShareHighlightStoryPng(
  input: ShareHighlightPassageInput,
  options: ShareHighlightRendererOptions = {}
): Promise<ShareHighlightStoryPngExport> {
  const { canvas, layout } = await renderShareHighlightStoryWithLayout(input, options)
  const blob = await canvasToPngBlob(canvas, options)
  const file = new File([blob], normalizePassageFileBase(input.fileNameBase), { type: 'image/png' })
  return {
    canvas,
    blob,
    file,
    width: SHARE_HIGHLIGHT_STORY_WIDTH,
    height: SHARE_HIGHLIGHT_STORY_HEIGHT,
    layout,
    selection: layout.selection,
  }
}

/**
 * Exports an entire passage as one ordered Story set. A short reading keeps its
 * backwards-compatible single filename. Longer readings are split only at the
 * renderer's existing atomic boundaries, numbered on-canvas, and returned in
 * exact source order so callers can share the full Hukamnama in one action.
 */
export async function exportShareHighlightStoryPngSet(
  input: ShareHighlightPassageInput,
  options: ShareHighlightRendererOptions = {}
): Promise<ShareHighlightStoryPngSet> {
  throwIfShareHighlightRenderAborted(options.signal)
  const normalizedLines = normalizePassageLines(input.content.lines)
  const firstCanvas = options.canvas ?? options.createCanvas?.() ?? createDefaultCanvas()
  let firstCanvasReleased = false

  try {
    const firstContext = prepareStoryCanvas(firstCanvas)
    const plan = await prepareShareHighlightStoryRenderPlan(
      input,
      options,
      firstContext,
      (measure, overlayTone, storyProfile, footerMode, forceManuscript) => (
        planCompleteStoryLayouts(
          normalizedLines,
          measure,
          overlayTone,
          storyProfile,
          footerMode,
          forceManuscript
        )
      )
    )
    const pageCount = plan.layouts.length
    const pages: ShareHighlightStoryPngSetPage[] = []

    // Render and encode one page at a time. No subsequent canvas is allocated
    // until the prior PNG is complete and its native pixel buffer is released.
    for (const [index, layout] of plan.layouts.entries()) {
      throwIfShareHighlightRenderAborted(options.signal)
      const canvas = index === 0
        ? firstCanvas
        : options.createCanvas?.() ?? createDefaultCanvas()
      let page: ShareHighlightStoryPngSetPage | null = null

      try {
        const context = index === 0 ? firstContext : prepareStoryCanvas(canvas)
        drawPlannedShareHighlightStory(
          context,
          input,
          plan,
          layout,
          index + 1,
          pageCount
        )
        const blob = await canvasToPngBlob(canvas, options)
        throwIfShareHighlightRenderAborted(options.signal)
        const file = new File(
          [blob],
          makePassagePageFileName(input.fileNameBase, index + 1, pageCount),
          { type: 'image/png' }
        )
        page = {
          blob,
          file,
          width: SHARE_HIGHLIGHT_STORY_WIDTH,
          height: SHARE_HIGHLIGHT_STORY_HEIGHT,
          layout,
          selection: layout.selection,
        }
      } finally {
        releaseStoryCanvas(canvas)
        if (index === 0) firstCanvasReleased = true
      }

      if (!page) throw new Error('The Hukamnama Story page could not be encoded.')
      pages.push(page)
    }

    return {
      pages,
      files: pages.map(page => page.file),
      totalLineCount: normalizedLines.length,
    }
  } finally {
    if (!firstCanvasReleased) releaseStoryCanvas(firstCanvas)
  }
}

/** One complete reading, never an excerpt or a multi-image set. */
export function layoutShareHighlightHukamnamaImage(
  rawLines: readonly ShareHighlightPassageLine[],
  measure: ShareHighlightTextMeasure
): ShareHighlightStoryLayout {
  const lines = normalizePassageLines(rawLines)
  const supportRoles = storySupportRoles(lines)
  const palette = resolveShareHighlightOverlayPalette('light')
  const width = SHARE_HIGHLIGHT_STORY_WIDTH
  const inset = 96
  const bodyWidth = width - inset * 2
  const measureAtScale = (scale: number) => {
    const fontSizes = {
      header: Math.round(28 + scale * 6),
      gurmukhi: Math.round(42 + scale * 22),
      transliteration: Math.round(32 + scale * 2),
      meaning: Math.round(32 + scale * 2),
    }
    let cursor = 0
    const sections: ShareHighlightStoryTextSection[] = []
    lines.forEach((line, lineIndex) => {
      const values: Array<['gurmukhi' | 'meaning' | 'transliteration', string]> = [['gurmukhi', line.gurmukhi]]
      if (line.meaning) values.push(['meaning', line.meaning])
      if (line.transliteration) values.push(['transliteration', line.transliteration])
      values.forEach(([role, value], index) => {
        const style = makeStoryStyle(role, Boolean(line.isHeader), fontSizes, palette, 'manuscript')
        // A clear rhythm between verse and meaning, without stretching the
        // spaces between lines merely to fill a fixed Story-shaped canvas.
        style.lineHeight = Math.ceil(style.fontSize * (role === 'gurmukhi' ? 1.3 : 1.4))
        const wrapped = wrapShareHighlightText(value, bodyWidth, style, measure)
        // Keep an ending verse marker with its preceding word rather than
        // leaving a lonely ||4|| / ॥੪॥ on a line. Only wrapping changes.
        const lastIndex = wrapped.length - 1
        if (lastIndex > 0 && /^[|॥।\d੦-੯\s]+$/u.test(wrapped[lastIndex]!)) {
          const previous = wrapped[lastIndex - 1]!
          const breakAt = previous.lastIndexOf(' ')
          const joined = `${previous.slice(breakAt + 1)} ${wrapped[lastIndex]}`
          if (breakAt > 0 && measure(joined, style) <= bodyWidth) {
            wrapped[lastIndex - 1] = previous.slice(0, breakAt)
            wrapped[lastIndex] = joined
          }
        }
        const sectionHeight = wrapped.length * style.lineHeight
        sections.push({ role, lines: wrapped, style, sourceLineId: line.id,
          isHeader: Boolean(line.isHeader), x: inset, y: cursor, width: bodyWidth, height: sectionHeight })
        cursor += sectionHeight + (index < values.length - 1 ? 10 : 0)
      })
      if (lineIndex < lines.length - 1) cursor += line.isHeader ? 12 : 22
    })
    return { sections, requiredHeight: cursor, fontSizes }
  }
  const frameSpace = 440
  const availableHeight = SHARE_HIGHLIGHT_STORY_HEIGHT - frameSpace
  let scale = 1
  let measured = measureAtScale(scale)
  while (measured.requiredHeight > availableHeight && scale > 0) {
    scale = Math.max(0, Math.round((scale - 0.1) * 10) / 10)
    measured = measureAtScale(scale)
  }
  // Short readings are composed as a compact portrait. Longer readings keep
  // their exact text and grow beyond Story height at the readable font floor.
  const height = Math.max(1350, Math.ceil(measured.requiredHeight + frameSpace))
  // Bound mobile canvas memory; never silently truncate, split, or use tiny
  // scripture when an unreasonable payload exceeds one safe image buffer.
  if (height > HUKAMNAMA_IMAGE_MAX_HEIGHT) {
    throw new HukamnamaImageTooLongError(height)
  }
  const bodyTop = Math.round((height - measured.requiredHeight) / 2)
  return {
    width, height,
    body: { x: inset, y: bodyTop, width: bodyWidth, height: measured.requiredHeight },
    readingSurface: { x: 0, y: 0, width, height },
    sections: measured.sections.map(section => ({ ...section, y: section.y + bodyTop })),
    contentScale: scale,
    density: scale > 0.5 ? 'comfortable' : 'dense',
    composition: 'manuscript',
    artworkMode: 'portrait-bleed',
    fit: {
      supportRoles,
      fontSizes: { gurmukhi: measured.fontSizes.gurmukhi,
        ...(supportRoles.includes('meaning') ? { meaning: measured.fontSizes.meaning } : {}),
        ...(supportRoles.includes('transliteration') ? { transliteration: measured.fontSizes.transliteration } : {}) },
      atReadabilityFloor: scale === 0,
    },
    sourceLineIds: lines.map(line => line.id),
    selection: makeDefaultStorySelection(lines),
  }
}

/** Contrast is bounded against both black and white artwork pixels, rather
 * than guessed from a thumbnail. The original colours remain visible. */
export function resolveHukamnamaImagePalette(overlayTone?: string, artworkId?: string, contentScale = 1) {
  const dark = overlayTone && overlayTone !== 'light'
  const base = dark
    ? { paper: '#151d1a', primaryText: '#fff7e9', secondaryText: '#f7efdf', veilOpacity: 0.68 }
    : { paper: '#f5ecda', primaryText: '#201b16', secondaryText: '#29231d', veilOpacity: 0.64 }
  const direction = getHukamnamaArtDirection(artworkId)
  if (!direction) return base
  const density = 1 - Math.max(0, Math.min(1, Number.isFinite(contentScale) ? contentScale : 0))
  return { ...base, paper: direction.paper,
    veilOpacity: direction.shortVeil + (direction.longVeil - direction.shortVeil) * density }
}

function drawTextFirstHukamnama(
  context: CanvasRenderingContext2D,
  input: ShareHighlightPassageInput,
  layout: ShareHighlightStoryLayout,
  artwork: ShareHighlightDecodedImage | null
) {
  const treatment = resolveHukamnamaImagePalette(artwork ? input.artwork?.overlayTone : 'light',
    artwork ? input.artwork?.id : undefined, layout.contentScale)
  const palette = { ...resolveShareHighlightOverlayPalette('light'), ...treatment }
  context.clearRect(0, 0, layout.width, layout.height)
  context.fillStyle = treatment.paper
  context.fillRect(0, 0, layout.width, layout.height)

  if (artwork) {
    const destination = { x: 0, y: 0, width: layout.width, height: layout.height }
    const profile = input.artwork!.storyProfile!
    const placement = profile.protectedSubject
      ? computeShareHighlightProtectedCover(artwork.width, artwork.height, destination,
          profile.protectedSubject.bounds, profile.focalPosition)
      : computeShareHighlightObjectContain(artwork.width, artwork.height, destination)
    context.save()
    context.globalAlpha = 1
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    if ('filter' in context && (placement.destinationWidth < layout.width - 1 || placement.destinationHeight < layout.height - 1)) {
      // Extend the same artwork into the spare space, never inventing new art
      // or stretching/cutting off a wide scene to force a portrait crop.
      const overscan = 72
      const ambient = computeShareHighlightObjectCover(artwork.width, artwork.height,
        layout.width + overscan * 2, layout.height + overscan * 2, profile.focalPosition)
      context.filter = 'blur(36px)'
      context.drawImage(artwork.source,
        ambient.sourceX, ambient.sourceY, ambient.sourceWidth, ambient.sourceHeight,
        -overscan, -overscan, ambient.destinationWidth, ambient.destinationHeight)
    }
    context.filter = 'none'
    for (const slice of buildHukamnamaArtworkSlices(placement, layout,
      getHukamnamaArtDirection(input.artwork?.id)?.edgeFeather ?? 80)) {
      const p = slice.placement
      context.globalAlpha = slice.opacity
      context.drawImage(artwork.source,
        p.sourceX, p.sourceY, p.sourceWidth, p.sourceHeight,
        p.destinationX, p.destinationY, p.destinationWidth, p.destinationHeight)
    }
    // One uninterrupted reading veil, not an opaque panel or miniature image.
    // Text colours below are paired with this exact strength for contrast.
    context.globalAlpha = treatment.veilOpacity
    context.fillStyle = treatment.paper
    context.fillRect(0, 0, layout.width, layout.height)
    context.restore()
  }

  // The exported image is a reading, not a promotional card: no QR, URL,
  // call-to-action, coverage counters, or duplicated product branding.
  context.save()
  context.shadowColor = 'transparent'
  context.shadowBlur = 0
  context.globalAlpha = 1
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = palette.secondaryText
  context.font = `normal 500 32px ${SHARE_TITLE_FONT_FAMILY}`
  context.fillText(input.content.seriesLabel.trim(), layout.width / 2, 116, layout.body.width)
  if (input.content.dateLabel?.trim()) {
    context.font = `normal 400 20px ${SHARE_SANS_FONT_FAMILY}`
    context.fillText(input.content.dateLabel.trim(), layout.width / 2, 156, layout.body.width)
  }
  context.restore()
  layout.sections.forEach(section => drawTextSection(context, {
    ...section,
    style: { ...section.style, color: section.role === 'gurmukhi' ? palette.primaryText : palette.secondaryText },
  }, palette, false))
  context.save()
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = palette.secondaryText
  context.font = `normal 400 22px ${SHARE_SANS_FONT_FAMILY}`
  context.fillText(input.content.sourceLabel.trim(), layout.width / 2, layout.height - 112, layout.body.width)
  context.restore()
}

/** Singleton wrapper keeps sharing/download services unchanged while the
 * Hukamnama composer always offers exactly one complete image. */
export async function exportShareHighlightHukamnamaPng(
  input: ShareHighlightPassageInput,
  options: ShareHighlightRendererOptions = {}
): Promise<ShareHighlightStoryPngSet> {
  throwIfShareHighlightRenderAborted(options.signal)
  if (!input.content.sourceLabel.trim() || !input.content.seriesLabel.trim()) {
    throw new TypeError('A passage source label and series label are required.')
  }
  const canvas = options.canvas ?? options.createCanvas?.() ?? createDefaultCanvas()
  try {
    const context = prepareStoryCanvas(canvas)
    await awaitShareHighlightFonts(resolveFontSet(options.fontSet), options.signal)
    const layout = layoutShareHighlightHukamnamaImage(
      input.content.lines, measureStoryTextWith(context)
    )
    let artwork: ShareHighlightDecodedImage | null = null
    if (input.artwork?.src?.trim() && input.artwork.storyProfile) {
      if (!isValidStoryArtworkProfile(input.artwork.storyProfile)) {
        throw new TypeError('The selected Hukamnama artwork has an invalid Story profile.')
      }
      try {
        artwork = await loadShareHighlightArtwork(input.artwork.src.trim(), options)
      } catch (error) {
        if (isShareHighlightRenderInterruption(error)) throw error
        throw new Error('The selected Hukamnama artwork could not be loaded.')
      }
      if (!Number.isFinite(artwork.width) || !Number.isFinite(artwork.height) || artwork.width <= 0 || artwork.height <= 0) {
        throw new RangeError('The selected Hukamnama artwork decoded with invalid dimensions.')
      }
    }
    throwIfShareHighlightRenderAborted(options.signal)
    canvas.height = layout.height
    drawTextFirstHukamnama(context, input, layout, artwork)
    const blob = await canvasToPngBlob(canvas, options)
    throwIfShareHighlightRenderAborted(options.signal)
    const file = new File([blob], normalizePassageFileBase(input.fileNameBase), { type: 'image/png' })
    const page: ShareHighlightStoryPngSetPage = {
      blob, file, width: SHARE_HIGHLIGHT_STORY_WIDTH, height: layout.height, layout, selection: layout.selection,
    }
    return { pages: [page], files: [file], totalLineCount: layout.sourceLineIds.length }
  } finally {
    releaseStoryCanvas(canvas)
  }
}
