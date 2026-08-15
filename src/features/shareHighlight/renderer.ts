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
const STORY_SCALE_STEP = 0.02
const MANUSCRIPT_HEADER_CENTER_Y = 220
const MANUSCRIPT_HEADER_RULE_Y = 258
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
    // The expressive card begins below the metadata capsule, leaving a clean
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

function resolveStoryCompositionSpec(
  composition: SingleColumnStoryComposition,
  footerMode: ShareHighlightStoryFooterMode
): StoryCompositionSpec {
  const spec = STORY_COMPOSITIONS[composition]
  if (footerMode === 'plain') return spec

  return {
    ...spec,
    body: {
      ...spec.body,
      height: LINKED_STORY_BODY_HEIGHTS[composition],
    },
  }
}

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
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    fontStyle: 'italic' as const,
    fontWeight: 500 as const,
  },
  meaning: {
    lineHeightRatio: 1.28,
    fontFamily: '"Plus Jakarta Sans", "Noto Serif Gurmukhi", sans-serif',
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
    fontFamily: '"Plus Jakarta Sans", sans-serif',
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
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    fontStyle: 'italic',
    fontWeight: 500,
  },
  meaning: {
    maximumFontSize: 34,
    minimumFontSize: 21,
    lineHeightRatio: 1.48,
    fontFamily: '"Plus Jakarta Sans", "Noto Serif Gurmukhi", sans-serif',
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
  load: (font: string, text?: string) => PromiseLike<unknown>
}

export interface ShareHighlightRendererOptions {
  canvas?: HTMLCanvasElement
  createCanvas?: () => HTMLCanvasElement
  loadImage?: (src: string) => Promise<ShareHighlightDecodedImage>
  /** Pass `null` only in a controlled environment that has no FontFaceSet. */
  fontSet?: ShareHighlightFontSet | null
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
  const sourceWidth = destinationWidth / scale
  const sourceHeight = destinationHeight / scale
  const sourceX = clamp((imageWidth * focal.x) - (sourceWidth / 2), 0, imageWidth - sourceWidth)
  const sourceY = clamp((imageHeight * focal.y) - (sourceHeight / 2), 0, imageHeight - sourceHeight)

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
  const spec = resolveStoryCompositionSpec(composition, footerMode)
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
  const verticalInset = composition === 'expressive'
    ? Math.min(52, Math.max(0, (spec.body.height - measured.requiredHeight) / 2))
    : Math.max(0, (spec.body.height - laidOutContentHeight) / 2)
  const protectedSubject = storyProfile?.protectedSubject
  const protectedCenterY = protectedSubject
    ? protectedSubject.bounds.y + (protectedSubject.bounds.height / 2)
    : null
  const clearProtectedSubject = (
    composition === 'expressive'
    && protectedSubject?.intent === 'keep-clear-of-text'
  )
  const centerBelowLandscapeHero = (
    composition === 'expressive'
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

  const readingSurface = composition === 'expressive'
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
  const availableHeight = resolveStoryCompositionSpec(composition, footerMode).body.height
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
  forwardPagination?: StoryForwardPaginationContext
): ShareHighlightStoryLayout {
  storySupportRoles(lines)
  if (!forwardPagination?.excerptOnly) {
    const selection = makeCompleteStorySelection(lines, anchorLineId)
    const expressive = tryStoryComposition(
      lines,
      measure,
      'expressive',
      storyProfile,
      overlayTone,
      footerMode
    )
    if (expressive.layout) return applyStorySelection(expressive.layout, selection)

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

async function loadDecodedImage(src: string): Promise<ShareHighlightDecodedImage> {
  if (typeof Image === 'undefined') {
    throw new Error('Artwork loading requires a browser Image implementation or an injected image loader.')
  }

  const image = new Image()
  image.decoding = 'async'
  const loaded = new Promise<void>((resolve, reject) => {
    image.addEventListener('load', () => resolve(), { once: true })
    image.addEventListener('error', () => reject(new Error(`Unable to load share artwork: ${src}`)), { once: true })
  })
  image.src = src
  await loaded

  if (typeof image.decode === 'function') {
    await image.decode()
  }
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error(`Share artwork has invalid dimensions: ${src}`)
  }

  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
  }
}

function resolveFontSet(option: ShareHighlightRendererOptions['fontSet']) {
  if (option !== undefined) return option
  if (typeof document === 'undefined' || !('fonts' in document)) return null
  return document.fonts as unknown as ShareHighlightFontSet
}

export async function awaitShareHighlightFonts(fontSet?: ShareHighlightFontSet | null) {
  const resolved = fontSet === undefined ? resolveFontSet(undefined) : fontSet
  if (!resolved) return

  await resolved.ready
  await Promise.all([
    resolved.load('600 76px "Noto Serif Gurmukhi"', 'ੴ ਸਤਿ ਨਾਮੁ'),
    resolved.load('700 25px "Plus Jakarta Sans"', `${SHARE_HIGHLIGHT_BRAND_DOMAIN} SOURCE`),
    resolved.load('400 32px "Plus Jakarta Sans"', 'Complete English meaning'),
    resolved.load('500 34px "Plus Jakarta Sans"', 'Read. Reflect. Return.'),
    resolved.load('650 38px "Cormorant Garamond"', 'Daily Hukamnama'),
  ])
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
  palette: ShareHighlightOverlayPalette,
  hasManuscriptArtwork = false
) {
  const isManuscript = layout.composition === 'manuscript'
  context.save()
  context.shadowColor = 'rgba(8, 5, 3, 0.28)'
  context.shadowBlur = isManuscript ? 24 : 24
  context.shadowOffsetX = 0
  context.shadowOffsetY = isManuscript ? 8 : 12
  roundedRectanglePath(
    context,
    layout.readingSurface,
    isManuscript ? 40 : 54
  )
  if (layout.composition !== 'expressive' && palette.kind === 'parchment') {
    const parchment = context.createLinearGradient(
      0,
      layout.readingSurface.y,
      0,
      layout.readingSurface.y + layout.readingSurface.height
    )
    parchment.addColorStop(0, hasManuscriptArtwork
      ? 'rgba(251, 245, 232, 0.96)'
      : '#fbf5e8')
    parchment.addColorStop(1, hasManuscriptArtwork
      ? 'rgba(240, 227, 202, 0.96)'
      : '#f0e3ca')
    context.fillStyle = parchment
  } else {
    context.fillStyle = storySurfaceFill(palette, layout.composition === 'expressive')
  }
  context.fill()
  context.shadowColor = 'transparent'
  context.lineWidth = 2
  context.strokeStyle = palette.kind === 'parchment'
    ? 'rgba(91, 63, 37, 0.22)'
    : 'rgba(245, 224, 188, 0.22)'
  context.stroke()

  if (isManuscript) {
    const keylineInset = 10
    roundedRectanglePath(context, {
      x: layout.readingSurface.x + keylineInset,
      y: layout.readingSurface.y + keylineInset,
      width: layout.readingSurface.width - (keylineInset * 2),
      height: layout.readingSurface.height - (keylineInset * 2),
    }, 22)
    context.lineWidth = 1
    context.strokeStyle = 'rgba(117, 82, 45, 0.12)'
    context.stroke()
  }
  context.restore()
}

function drawStoryMetadataSurfaces(
  context: CanvasRenderingContext2D,
  layout: ShareHighlightStoryLayout,
  palette: ShareHighlightOverlayPalette,
  footerMode: ShareHighlightStoryFooterMode
) {
  const surfaceFill = storySurfaceFill(palette, layout.composition === 'expressive')
  context.save()

  if (layout.composition === 'manuscript') {
    // Metadata and footer are part of the same sheet, separated by hairlines
    // rather than floating cards. This gives the complete reading almost the
    // whole 9:16 canvas without sacrificing Story-safe text placement.
    context.fillStyle = 'rgba(105, 75, 43, 0.2)'
    context.fillRect(
      layout.body.x,
      MANUSCRIPT_HEADER_RULE_Y,
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
  roundedRectanglePath(context, {
    x: 46,
    y: STORY_SAFE_TOP - 18,
    width: 988,
    height: 112,
  }, 36)
  context.fill()

  // In expressive mode the footer sits outside the central reading field. A
  // separate quiet capsule keeps both citation and brand contrast guaranteed.
  if (footerMode === 'linked') {
    roundedRectanglePath(context, {
      x: 46,
      y: STORY_LINK_FOOTER_TOP - 10,
      width: 988,
      height: 178,
    }, 36)
    context.fill()
  }
  context.restore()
}

function resolveManuscriptHeaderTypography(
  context: CanvasRenderingContext2D,
  seriesLabel: string,
  dateLabel: string | null
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

    if (requiredWidth <= STORY_COMPOSITIONS.manuscript.body.width) {
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
  layout: ShareHighlightStoryLayout
) {
  context.save()
  context.shadowColor = palette.shadow
  context.shadowBlur = 7
  context.shadowOffsetX = 0
  context.shadowOffsetY = 2
  context.textAlign = 'left'
  context.textBaseline = 'top'
  context.font = 'normal 700 32px "Plus Jakarta Sans", sans-serif'
  context.fillStyle = palette.primaryText

  if (layout.composition === 'manuscript') {
    const manuscriptBody = STORY_COMPOSITIONS.manuscript.body
    const headerRight = manuscriptBody.x + manuscriptBody.width
    const typography = resolveManuscriptHeaderTypography(context, seriesLabel, dateLabel)

    context.textBaseline = 'middle'
    context.font = `normal 650 ${typography.titleSize}px "Cormorant Garamond", serif`
    context.fillStyle = palette.primaryText
    context.textAlign = 'left'
    context.fillText(seriesLabel, manuscriptBody.x, MANUSCRIPT_HEADER_CENTER_Y)

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
  palette: ShareHighlightOverlayPalette
) {
  context.save()
  context.font = fontString(section.style)
  context.fillStyle = section.style.color
  context.textAlign = 'left'
  context.textBaseline = 'top'
  context.shadowColor = palette.shadow
  context.shadowBlur = 8
  context.shadowOffsetX = 0
  context.shadowOffsetY = 2
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
    context.shadowColor = palette.shadow
    context.shadowBlur = 3
    context.shadowOffsetX = 0
    context.shadowOffsetY = 1
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
  context.shadowColor = palette.shadow
  context.shadowBlur = 4
  context.shadowOffsetX = 0
  context.shadowOffsetY = 1
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
  const canvas = options.canvas ?? options.createCanvas?.() ?? createDefaultCanvas()
  canvas.width = SHARE_HIGHLIGHT_CARD_WIDTH
  canvas.height = SHARE_HIGHLIGHT_CARD_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('A Canvas 2D rendering context is required.')

  const artworkSrc = input.artwork?.src?.trim()
  const [artwork] = await Promise.all([
    artworkSrc
      ? (options.loadImage ?? loadDecodedImage)(artworkSrc)
      : Promise.resolve(null),
    awaitShareHighlightFonts(resolveFontSet(options.fontSet)),
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

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('The share highlight canvas could not be encoded as PNG.'))
    }, 'image/png')
  })
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
  const blob = await canvasToPngBlob(canvas)
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
    ...(authored?.manuscriptTreatment
      ? { manuscriptTreatment: authored.manuscriptTreatment }
      : {}),
    ...(authored?.protectedSubject
      ? { protectedSubject: authored.protectedSubject }
      : {}),
  }
}

function drawStoryArtworkBackground(
  context: CanvasRenderingContext2D,
  artwork: ShareHighlightDecodedImage | null,
  profile: ResolvedStoryArtworkProfile,
  composition: ShareHighlightStoryComposition
) {
  if (!artwork) {
    drawNoArtworkBackground(context, SHARE_HIGHLIGHT_STORY_WIDTH, SHARE_HIGHLIGHT_STORY_HEIGHT)
    return
  }

  context.fillStyle = '#171310'
  context.fillRect(0, 0, SHARE_HIGHLIGHT_STORY_WIDTH, SHARE_HIGHLIGHT_STORY_HEIGHT)
  const protectedSubjectHero = (
    composition !== 'expressive'
    && profile.protectedSubject?.intent === 'keep-clear-of-text'
  )
  const destinationHeight = profile.mode === 'landscape-hero' || protectedSubjectHero
    ? Math.round(SHARE_HIGHLIGHT_STORY_HEIGHT * (
        protectedSubjectHero ? 0.28 : profile.heroHeightFraction
      ))
    : SHARE_HIGHLIGHT_STORY_HEIGHT

  if (profile.mode === 'landscape-hero' || protectedSubjectHero) {
    // Extend the artwork's palette through the full Story so a landscape hero
    // never falls into a large, flat void. This ambient layer is deliberately
    // soft and dark; the crisp authored crop is drawn over it below.
    const ambientOverscan = 44
    const ambientPlacement = computeShareHighlightObjectCover(
      artwork.width,
      artwork.height,
      SHARE_HIGHLIGHT_STORY_WIDTH + (ambientOverscan * 2),
      SHARE_HIGHLIGHT_STORY_HEIGHT + (ambientOverscan * 2),
      profile.focalPosition
    )
    context.save()
    context.globalAlpha = composition === 'expressive' ? 0.84 : 0.7
    context.filter = composition === 'expressive'
      ? 'blur(22px) saturate(0.88) brightness(0.72)'
      : 'blur(30px) saturate(0.72) brightness(0.5)'
    context.drawImage(
      artwork.source,
      ambientPlacement.sourceX,
      ambientPlacement.sourceY,
      ambientPlacement.sourceWidth,
      ambientPlacement.sourceHeight,
      -ambientOverscan,
      -ambientOverscan,
      ambientPlacement.destinationWidth,
      ambientPlacement.destinationHeight
    )
    context.restore()
    context.fillStyle = composition === 'expressive'
      ? 'rgba(13, 10, 8, 0.2)'
      : 'rgba(13, 10, 8, 0.42)'
    context.fillRect(0, 0, SHARE_HIGHLIGHT_STORY_WIDTH, SHARE_HIGHLIGHT_STORY_HEIGHT)
  }

  const placement = computeShareHighlightObjectCover(
    artwork.width,
    artwork.height,
    SHARE_HIGHLIGHT_STORY_WIDTH,
    destinationHeight,
    profile.focalPosition
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

  if (profile.mode === 'landscape-hero' || protectedSubjectHero) {
    const fadeHeight = Math.min(170, destinationHeight * 0.28)
    const gradient = context.createLinearGradient(0, destinationHeight - fadeHeight, 0, destinationHeight)
    gradient.addColorStop(0, 'rgba(23, 19, 16, 0)')
    gradient.addColorStop(1, 'rgba(23, 19, 16, 0.88)')
    context.fillStyle = gradient
    context.fillRect(0, destinationHeight - fadeHeight, SHARE_HIGHLIGHT_STORY_WIDTH, fadeHeight)
  } else if (profile.mode === 'pattern-frame') {
    const frameInset = 24
    context.save()
    roundedRectanglePath(context, {
      x: frameInset,
      y: 156,
      width: SHARE_HIGHLIGHT_STORY_WIDTH - (frameInset * 2),
      height: 1578,
    }, 48)
    context.strokeStyle = 'rgba(245, 222, 178, 0.5)'
    context.lineWidth = 4
    context.stroke()
    context.restore()
  }
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
  dateLabel: string | null
  footerMode: ShareHighlightStoryFooterMode
  layouts: ShareHighlightStoryLayout[]
  overlayTone: string | undefined
  seriesLabel: string
  sourceLabel: string
  storyProfile: ResolvedStoryArtworkProfile
}

type ShareHighlightStoryLayoutPlanner = (
  measure: ShareHighlightTextMeasure,
  overlayTone: string | undefined,
  storyProfile: ShareHighlightStoryArtworkProfile,
  footerMode: ShareHighlightStoryFooterMode
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
  const hasManuscriptArtwork = (
    layout.composition === 'manuscript'
    && plan.storyProfile.manuscriptTreatment === 'art-frame'
    && Boolean(plan.artwork)
  )

  context.clearRect(0, 0, SHARE_HIGHLIGHT_STORY_WIDTH, SHARE_HIGHLIGHT_STORY_HEIGHT)
  drawStoryArtworkBackground(
    context,
    layout.composition === 'expressive' || hasManuscriptArtwork
      ? plan.artwork
      : null,
    plan.storyProfile,
    layout.composition
  )
  drawStoryReadingSurface(context, layout, palette, hasManuscriptArtwork)
  drawStoryMetadataSurfaces(context, layout, palette, plan.footerMode)
  drawStoryHeader(
    context,
    plan.seriesLabel,
    makeStoryPageDateLabel(plan.dateLabel, pageNumber, pageCount),
    palette,
    layout
  )
  layout.sections.forEach(section => drawTextSection(context, section, palette))
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

  await awaitShareHighlightFonts(resolveFontSet(options.fontSet))

  const measure = measureStoryTextWith(context)
  const artworkSrc = input.artwork?.src?.trim() || null
  let artwork: ShareHighlightDecodedImage | null = null
  let overlayTone = artworkSrc ? input.artwork?.overlayTone : 'dark'
  let storyProfile = resolveStoryArtworkProfile(input, null)
  let layouts = planLayouts(measure, overlayTone, storyProfile, footerMode)
  if (layouts.length === 0) throw new Error('A Hukamnama Story plan requires at least one page.')

  // Exact text preflight decides whether this is an expressive Story or an
  // explicitly reviewed art-matted manuscript before any image is decoded.
  // Long-form pagination never depends on artwork dimensions, so only an
  // expressive layout needs to be planned again after the selected image loads.
  const expressiveArtwork = layouts[0]!.composition === 'expressive'
  const manuscriptArtwork = (
    layouts[0]!.composition === 'manuscript'
    && storyProfile.manuscriptTreatment === 'art-frame'
  )
  if ((expressiveArtwork || manuscriptArtwork) && artworkSrc) {
    artwork = await (options.loadImage ?? loadDecodedImage)(artworkSrc)
    overlayTone = input.artwork?.overlayTone
    storyProfile = resolveStoryArtworkProfile(input, artwork)
    if (expressiveArtwork) {
      layouts = planLayouts(measure, overlayTone, storyProfile, footerMode)
    }
  }

  return {
    artwork,
    dateLabel,
    footerMode,
    layouts,
    overlayTone,
    seriesLabel,
    sourceLabel,
    storyProfile,
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
  storyProfile: ShareHighlightStoryArtworkProfile,
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

function rebalanceFinalStoryOrphan(
  layouts: readonly ShareHighlightStoryLayout[],
  normalizedLines: readonly ShareHighlightPassageLine[],
  measure: ShareHighlightTextMeasure,
  overlayTone: string | undefined,
  storyProfile: ShareHighlightStoryArtworkProfile,
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
    || blocks.length - finalStartBlockIndex !== 1
    // Moving one whole block must leave at least two on the prior page. This
    // fixes the tail without merely relocating the orphan one page earlier.
    || finalStartBlockIndex - previousStartBlockIndex < 3
  ) return Array.from(layouts)

  const movedBlock = blocks[finalStartBlockIndex - 1]!
  const rebalancedPreviousLines = normalizedLines.slice(
    previousStartLineIndex,
    movedBlock.startLineIndex
  )
  const rebalancedFinalLines = normalizedLines.slice(movedBlock.startLineIndex)
  const pageBeforePrevious = layouts.at(-3)
  const previousSelection = makePlannedExcerptSelection(
    rebalancedPreviousLines,
    normalizedLines.length,
    pageBeforePrevious?.selection.firstSourceLineId ?? null,
    rebalancedFinalLines[0]!.id
  )
  const finalSelection = makePlannedExcerptSelection(
    rebalancedFinalLines,
    normalizedLines.length,
    rebalancedPreviousLines[0]!.id,
    null
  )
  const rebalancedPrevious = layoutExactManuscriptStoryPage(
    rebalancedPreviousLines,
    measure,
    overlayTone,
    storyProfile,
    footerMode,
    previousSelection
  )
  const rebalancedFinal = layoutExactManuscriptStoryPage(
    rebalancedFinalLines,
    measure,
    overlayTone,
    storyProfile,
    footerMode,
    finalSelection
  )
  if (!rebalancedPrevious || !rebalancedFinal) return Array.from(layouts)

  return [
    ...layouts.slice(0, -2),
    rebalancedPrevious,
    rebalancedFinal,
  ]
}

function planCompleteStoryLayouts(
  normalizedLines: readonly ShareHighlightPassageLine[],
  measure: ShareHighlightTextMeasure,
  overlayTone: string | undefined,
  storyProfile: ShareHighlightStoryArtworkProfile,
  footerMode: ShareHighlightStoryFooterMode
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
      }
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

  const rebalancedLayouts = rebalanceFinalStoryOrphan(
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
    (measure, overlayTone, storyProfile, footerMode) => [
      layoutShareHighlightStory(
        input.content.lines,
        measure,
        overlayTone,
        storyProfile,
        input.content.anchorLineId,
        footerMode
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
  const blob = await canvasToPngBlob(canvas)
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
  const normalizedLines = normalizePassageLines(input.content.lines)
  const firstCanvas = options.canvas ?? options.createCanvas?.() ?? createDefaultCanvas()
  let firstCanvasReleased = false

  try {
    const firstContext = prepareStoryCanvas(firstCanvas)
    const plan = await prepareShareHighlightStoryRenderPlan(
      input,
      options,
      firstContext,
      (measure, overlayTone, storyProfile, footerMode) => (
        planCompleteStoryLayouts(
          normalizedLines,
          measure,
          overlayTone,
          storyProfile,
          footerMode
        )
      )
    )
    const pageCount = plan.layouts.length
    const pages: ShareHighlightStoryPngSetPage[] = []

    // Render and encode one page at a time. No subsequent canvas is allocated
    // until the prior PNG is complete and its native pixel buffer is released.
    for (const [index, layout] of plan.layouts.entries()) {
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
        const blob = await canvasToPngBlob(canvas)
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
