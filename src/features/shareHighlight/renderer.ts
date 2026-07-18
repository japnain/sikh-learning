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
  type ShareHighlightStoryTextSection,
  type ShareHighlightTextRole,
  type ShareHighlightTextSection,
  type ShareHighlightTextPosition,
  type ShareHighlightTextStyle,
} from './types'

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
const STORY_FOOTER_BASELINE = STORY_SAFE_BOTTOM - 44
const STORY_FOOTER_HORIZONTAL_MARGIN = 72
const STORY_SCALE_STEP = 0.02

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

type SingleColumnStoryComposition = Exclude<
  ShareHighlightStoryComposition,
  'bilingual-diptych'
>

const STORY_COMPOSITIONS: Record<SingleColumnStoryComposition, StoryCompositionSpec> = {
  expressive: {
    // The expressive card begins below the metadata capsule, leaving a clean
    // seam of artwork between the two instead of forming one large text wall.
    body: { x: 82, y: 360, width: 916, height: 1192 },
    readingSurface: { x: 46, y: 318, width: 988, height: 1278 },
    maximum: { header: 42, gurmukhi: 54, transliteration: 34, meaning: 36 },
    minimum: { header: 34, gurmukhi: 42, transliteration: 30, meaning: 30 },
    sectionGap: 8,
    lineGap: 18,
    headerGap: 8,
  },
  manuscript: {
    body: { x: 70, y: 378, width: 940, height: 1190 },
    readingSurface: { x: 42, y: 326, width: 996, height: 1372 },
    maximum: { header: 38, gurmukhi: 48, transliteration: 32, meaning: 34 },
    minimum: { header: 34, gurmukhi: 34, transliteration: 30, meaning: 30 },
    sectionGap: 5,
    lineGap: 4,
    headerGap: 4,
  },
}

// The diptych uses more of the Story-safe page than the single-column
// manuscript. That extra width and height keeps the English translation
// useful on real daily readings without sacrificing the artwork's top hero or
// the citation footer.
const DIPTYCH_BODY: ShareHighlightPixelRect = {
  x: 58,
  y: 340,
  width: 964,
  height: 1270,
}
const DIPTYCH_READING_SURFACE: ShareHighlightPixelRect = {
  x: 34,
  y: 314,
  width: 1012,
  height: 1396,
}
const DIPTYCH_GUTTER = 28
const DIPTYCH_COLUMN_RATIOS = [0.32, 0.34, 0.36, 0.38, 0.4, 0.42, 0.44, 0.46, 0.48] as const
const DIPTYCH_GURMUKHI_SIZES = [42, 40, 38, 36, 34, 32] as const
const DIPTYCH_MEANING_SIZES = [32, 30, 28, 27, 26] as const
const DIPTYCH_GURMUKHI_GAP = 2
const DIPTYCH_MEANING_GAP = 4

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
  palette: ShareHighlightOverlayPalette
): ShareHighlightTextStyle {
  const storyRole = role === 'gurmukhi' && isHeader ? 'header' : role
  const spec = STORY_ROLE_SPECS[storyRole]
  const fontSize = fontSizes[storyRole]
  return {
    fontFamily: spec.fontFamily,
    fontSize,
    fontStyle: spec.fontStyle,
    fontWeight: spec.fontWeight,
    lineHeight: Math.ceil(fontSize * spec.lineHeightRatio),
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
    const style = makeStoryStyle(role, Boolean(line.isHeader), fontSizes, palette)
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
  const roles: Array<'transliteration' | 'meaning'> = []
  if (lines.some(line => Boolean(line.transliteration))) roles.push('transliteration')
  if (lines.some(line => Boolean(line.meaning))) roles.push('meaning')
  return roles
}

function buildStoryLayout(
  lines: readonly ShareHighlightPassageLine[],
  composition: SingleColumnStoryComposition,
  storyProfile: ShareHighlightStoryArtworkProfile | undefined,
  measured: ShareHighlightStoryMeasurement,
  contentScale: number
): ShareHighlightStoryLayout {
  const spec = STORY_COMPOSITIONS[composition]
  const verticalInset = Math.min(
    composition === 'expressive' ? 52 : 48,
    Math.max(0, (spec.body.height - measured.requiredHeight) / 2)
  )
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
    : {
        ...spec.readingSurface,
        // A manuscript should feel like a deliberately sized page, not a
        // mostly empty sheet. The maximum still supports genuinely long
        // Hukamnamas, while shorter dense readings reveal more of the art.
        height: Math.min(
          spec.readingSurface.height,
          Math.max(780, Math.ceil(measured.requiredHeight + 280))
        ),
      }

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
    sourceLineIds: lines.map(line => line.id),
    sections,
  }
}

interface StoryLayoutAttempt {
  layout: ShareHighlightStoryLayout | null
  lastMeasurement: ShareHighlightStoryMeasurement
}

function tryStoryComposition(
  lines: readonly ShareHighlightPassageLine[],
  measure: ShareHighlightTextMeasure,
  composition: SingleColumnStoryComposition,
  storyProfile?: ShareHighlightStoryArtworkProfile,
  overlayTone?: string
): StoryLayoutAttempt {
  const availableHeight = STORY_COMPOSITIONS[composition].body.height
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
    layout: buildStoryLayout(lines, composition, storyProfile, bestMeasurement, contentScale),
    lastMeasurement: bestMeasurement,
  }
}

type DiptychRole = 'gurmukhi' | 'meaning'

interface DiptychSectionDraft {
  sourceLineId: ShareHighlightPassageLine['id']
  isHeader: boolean
  lines: string[]
  style: ShareHighlightTextStyle
  height: number
}

interface DiptychColumnMeasurement {
  role: DiptychRole
  fontSize: number
  requiredHeight: number
  sections: DiptychSectionDraft[]
}

interface DiptychCandidate {
  gurmukhiRect: ShareHighlightPixelRect
  meaningRect: ShareHighlightPixelRect
  dividerX: number
  gurmukhi: DiptychColumnMeasurement
  meaning: DiptychColumnMeasurement
}

function measureDiptychColumn(
  lines: readonly ShareHighlightPassageLine[],
  role: DiptychRole,
  rect: ShareHighlightPixelRect,
  fontSize: number,
  measure: ShareHighlightTextMeasure
): DiptychColumnMeasurement {
  const palette = resolveShareHighlightOverlayPalette('light')
  const fontSizes: StoryRoleFontSizes = {
    header: fontSize,
    gurmukhi: fontSize,
    transliteration: DIPTYCH_MEANING_SIZES[0],
    meaning: fontSize,
  }
  const sections = lines.flatMap<DiptychSectionDraft>(line => {
    const value = role === 'gurmukhi' ? line.gurmukhi : line.meaning
    if (!value) return []
    const baseStyle = makeStoryStyle(role, Boolean(line.isHeader), fontSizes, palette)
    const style = role === 'meaning'
      ? { ...baseStyle, lineHeight: Math.ceil(fontSize * 1.24) }
      : baseStyle
    const wrapped = wrapShareHighlightText(value, rect.width, style, measure)
    return [{
      sourceLineId: line.id,
      isHeader: Boolean(line.isHeader),
      lines: wrapped,
      style,
      height: wrapped.length * style.lineHeight,
    }]
  })
  const gap = role === 'gurmukhi' ? DIPTYCH_GURMUKHI_GAP : DIPTYCH_MEANING_GAP
  const requiredHeight = sections.reduce((total, section, index) => (
    total + section.height + (index < sections.length - 1 ? gap : 0)
  ), 0)

  return { role, fontSize, requiredHeight, sections }
}

function findDiptychColumnFit(
  lines: readonly ShareHighlightPassageLine[],
  role: DiptychRole,
  rect: ShareHighlightPixelRect,
  sizes: readonly number[],
  measure: ShareHighlightTextMeasure
) {
  for (const size of sizes) {
    const candidate = measureDiptychColumn(lines, role, rect, size, measure)
    if (candidate.requiredHeight <= rect.height) return candidate
  }
  return null
}

function isBetterDiptychCandidate(
  candidate: DiptychCandidate,
  current: DiptychCandidate | null
) {
  if (!current) return true
  if (candidate.meaning.fontSize !== current.meaning.fontSize) {
    return candidate.meaning.fontSize > current.meaning.fontSize
  }
  if (candidate.gurmukhi.fontSize !== current.gurmukhi.fontSize) {
    return candidate.gurmukhi.fontSize > current.gurmukhi.fontSize
  }
  return Math.max(candidate.gurmukhi.requiredHeight, candidate.meaning.requiredHeight)
    < Math.max(current.gurmukhi.requiredHeight, current.meaning.requiredHeight)
}

function layOutDiptychSections(
  measurement: DiptychColumnMeasurement,
  rect: ShareHighlightPixelRect
): ShareHighlightStoryTextSection[] {
  const gap = measurement.role === 'gurmukhi'
    ? DIPTYCH_GURMUKHI_GAP
    : DIPTYCH_MEANING_GAP
  // Both language columns share a strong top edge. Their line breaks remain
  // independent, so neither language inherits awkward gaps from the other.
  let cursorY = rect.y

  return measurement.sections.map((section, index) => {
    const laidOut: ShareHighlightStoryTextSection = {
      role: measurement.role,
      lines: section.lines,
      style: section.style,
      sourceLineId: section.sourceLineId,
      isHeader: section.isHeader,
      x: rect.x,
      y: cursorY,
      width: rect.width,
      height: section.height,
    }
    cursorY += section.height + (index < measurement.sections.length - 1 ? gap : 0)
    return laidOut
  })
}

function tryBilingualDiptych(
  lines: readonly ShareHighlightPassageLine[],
  measure: ShareHighlightTextMeasure,
  storyProfile?: ShareHighlightStoryArtworkProfile
): ShareHighlightStoryLayout | null {
  const usableWidth = DIPTYCH_BODY.width - DIPTYCH_GUTTER
  let best: DiptychCandidate | null = null

  for (const ratio of DIPTYCH_COLUMN_RATIOS) {
    const gurmukhiWidth = Math.round(usableWidth * ratio)
    const meaningWidth = usableWidth - gurmukhiWidth
    const gurmukhiRect: ShareHighlightPixelRect = {
      x: DIPTYCH_BODY.x,
      y: DIPTYCH_BODY.y,
      width: gurmukhiWidth,
      height: DIPTYCH_BODY.height,
    }
    const meaningRect: ShareHighlightPixelRect = {
      x: DIPTYCH_BODY.x + gurmukhiWidth + DIPTYCH_GUTTER,
      y: DIPTYCH_BODY.y,
      width: meaningWidth,
      height: DIPTYCH_BODY.height,
    }
    const gurmukhi = findDiptychColumnFit(
      lines,
      'gurmukhi',
      gurmukhiRect,
      DIPTYCH_GURMUKHI_SIZES,
      measure
    )
    const meaning = findDiptychColumnFit(
      lines,
      'meaning',
      meaningRect,
      DIPTYCH_MEANING_SIZES,
      measure
    )
    if (!gurmukhi || !meaning) continue

    const candidate: DiptychCandidate = {
      gurmukhiRect,
      meaningRect,
      dividerX: gurmukhiRect.x + gurmukhiRect.width + (DIPTYCH_GUTTER / 2),
      gurmukhi,
      meaning,
    }
    if (isBetterDiptychCandidate(candidate, best)) best = candidate
  }

  if (!best) return null
  const sections = [
    ...layOutDiptychSections(best.gurmukhi, best.gurmukhiRect),
    ...layOutDiptychSections(best.meaning, best.meaningRect),
  ]

  return {
    width: SHARE_HIGHLIGHT_STORY_WIDTH,
    height: SHARE_HIGHLIGHT_STORY_HEIGHT,
    body: { ...DIPTYCH_BODY },
    readingSurface: { ...DIPTYCH_READING_SURFACE },
    contentScale: Math.min(
      best.gurmukhi.fontSize / DIPTYCH_GURMUKHI_SIZES[0],
      best.meaning.fontSize / DIPTYCH_MEANING_SIZES[0]
    ),
    density: 'dense',
    composition: 'bilingual-diptych',
    columns: {
      gurmukhi: best.gurmukhiRect,
      meaning: best.meaningRect,
      dividerX: best.dividerX,
    },
    artworkMode: storyProfile?.mode ?? 'portrait-bleed',
    fit: {
      supportRoles: ['meaning'],
      fontSizes: {
        gurmukhi: best.gurmukhi.fontSize,
        meaning: best.meaning.fontSize,
      },
      atReadabilityFloor: (
        best.gurmukhi.fontSize === DIPTYCH_GURMUKHI_SIZES.at(-1)
        || best.meaning.fontSize === DIPTYCH_MEANING_SIZES.at(-1)
      ),
    },
    sourceLineIds: lines.map(line => line.id),
    sections,
  }
}

/**
 * Lays out the complete ordered reading on one native 9:16 Story canvas.
 * Type and rhythm adapt together; text is wrapped but never elided, truncated,
 * split into pages, or reordered. A structural header uses a tighter following
 * gap so it remains visually attached to the verse it introduces.
 */
export function layoutShareHighlightStory(
  rawLines: readonly ShareHighlightPassageLine[],
  measure: ShareHighlightTextMeasure,
  overlayTone?: string,
  storyProfile?: ShareHighlightStoryArtworkProfile
): ShareHighlightStoryLayout {
  const lines = normalizePassageLines(rawLines)
  const verseCount = lines.filter(line => !line.isHeader).length

  // Short and medium readings first receive the more expressive, art-forward
  // composition. Longer readings move directly to the manuscript treatment so
  // the artwork becomes an elegant hero/frame instead of competing with text.
  if (verseCount <= 8) {
    const expressive = tryStoryComposition(
      lines,
      measure,
      'expressive',
      storyProfile,
      overlayTone
    )
    if (expressive.layout) return expressive.layout
  }

  const supportRoles = storySupportRoles(lines)
  const meaningOnly = supportRoles.length === 1 && supportRoles[0] === 'meaning'
  const manuscript = tryStoryComposition(
    lines,
    measure,
    'manuscript',
    storyProfile,
    overlayTone
  )

  // Once a reading grows beyond the short-form card, prefer the facing-page
  // manuscript even when a tightly stacked fallback could technically fit.
  // A short but unusually wordy passage may also reach this branch after its
  // stacked manuscript fails.
  if (meaningOnly && (verseCount > 8 || !manuscript.layout)) {
    const diptych = tryBilingualDiptych(lines, measure, storyProfile)
    if (diptych) return diptych
  }

  if (manuscript.layout) return manuscript.layout

  if (supportRoles.length > 0) {
    const gurmukhiOnly = lines.map(line => ({
      ...line,
      transliteration: null,
      meaning: null,
    }))
    const gurmukhiAttempt = tryStoryComposition(
      gurmukhiOnly,
      measure,
      'manuscript',
      storyProfile,
      overlayTone
    )
    if (gurmukhiAttempt.layout) {
      throw new ShareHighlightContentOverflowError(
        manuscript.lastMeasurement.requiredHeight,
        STORY_COMPOSITIONS.manuscript.body.height,
        { reason: 'support-overflow', supportRoles }
      )
    }
  }

  throw new ShareHighlightContentOverflowError(
    manuscript.lastMeasurement.requiredHeight,
    STORY_COMPOSITIONS.manuscript.body.height,
    { reason: 'gurmukhi-overflow' }
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
    resolved.load('500 34px "Plus Jakarta Sans"', 'Read. Reflect. Return.'),
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
  palette: ShareHighlightOverlayPalette
) {
  context.save()
  context.shadowColor = 'rgba(8, 5, 3, 0.28)'
  context.shadowBlur = layout.composition !== 'expressive' ? 34 : 24
  context.shadowOffsetX = 0
  context.shadowOffsetY = 12
  roundedRectanglePath(
    context,
    layout.readingSurface,
    layout.composition !== 'expressive' ? 42 : 54
  )
  if (layout.composition !== 'expressive' && palette.kind === 'parchment') {
    const parchment = context.createLinearGradient(
      0,
      layout.readingSurface.y,
      0,
      layout.readingSurface.y + layout.readingSurface.height
    )
    parchment.addColorStop(0, '#fbf5e8')
    parchment.addColorStop(1, '#f0e3ca')
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
  context.restore()
}

function drawStoryDiptychDivider(
  context: CanvasRenderingContext2D,
  layout: ShareHighlightStoryLayout
) {
  if (!layout.columns) return

  context.save()
  context.beginPath()
  context.moveTo(layout.columns.dividerX, layout.body.y + 4)
  context.lineTo(
    layout.columns.dividerX,
    layout.body.y + layout.body.height - 4
  )
  context.lineWidth = 2
  context.strokeStyle = 'rgba(105, 75, 43, 0.24)'
  context.stroke()
  context.restore()
}

function drawStoryMetadataSurfaces(
  context: CanvasRenderingContext2D,
  layout: ShareHighlightStoryLayout,
  palette: ShareHighlightOverlayPalette
) {
  const surfaceFill = storySurfaceFill(palette, layout.composition === 'expressive')
  context.save()
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
  if (layout.composition === 'expressive') {
    roundedRectanglePath(context, {
      x: 46,
      y: 1604,
      width: 988,
      height: 98,
    }, 36)
    context.fill()
  }
  context.restore()
}

function drawStoryHeader(
  context: CanvasRenderingContext2D,
  seriesLabel: string,
  dateLabel: string | null,
  palette: ShareHighlightOverlayPalette
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

function drawStoryFooter(
  context: CanvasRenderingContext2D,
  sourceLabel: string,
  palette: ShareHighlightOverlayPalette,
  layout: ShareHighlightStoryLayout
) {
  const baseline = layout.composition !== 'expressive'
    ? Math.min(
        STORY_FOOTER_BASELINE,
        layout.readingSurface.y + layout.readingSurface.height - 34
      )
    : STORY_FOOTER_BASELINE
  context.save()
  context.shadowColor = palette.shadow
  context.shadowBlur = 4
  context.shadowOffsetX = 0
  context.shadowOffsetY = 1
  context.font = 'normal 600 30px "Plus Jakarta Sans", sans-serif'
  context.fillStyle = palette.secondaryText
  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'
  context.fillText(
    sourceLabel,
    STORY_FOOTER_HORIZONTAL_MARGIN,
    baseline,
    650
  )
  context.font = 'normal 700 30px "Plus Jakarta Sans", sans-serif'
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
    context.save()
    roundedRectanglePath(context, {
      x: 24,
      y: 156,
      width: SHARE_HIGHLIGHT_STORY_WIDTH - 48,
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

/**
 * Renders a complete Hukamnama to one native 9:16 Story canvas. The artwork's
 * focal point and overlay tone are honored, while the long-form wash deliberately
 * spans the safe reading area instead of relying on a small card text-safe zone.
 */
export async function renderShareHighlightStory(
  input: ShareHighlightPassageInput,
  options: ShareHighlightRendererOptions = {}
): Promise<HTMLCanvasElement> {
  const sourceLabel = input.content.sourceLabel.trim()
  const seriesLabel = input.content.seriesLabel.trim()
  const dateLabel = input.content.dateLabel?.trim() || null
  if (!sourceLabel) throw new TypeError('A passage source label is required.')
  if (!seriesLabel) throw new TypeError('A passage series label is required.')

  const canvas = options.canvas ?? options.createCanvas?.() ?? createDefaultCanvas()
  canvas.width = SHARE_HIGHLIGHT_STORY_WIDTH
  canvas.height = SHARE_HIGHLIGHT_STORY_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('A Canvas 2D rendering context is required.')

  const artworkSrc = input.artwork?.src?.trim()
  const [artwork] = await Promise.all([
    artworkSrc
      ? (options.loadImage ?? loadDecodedImage)(artworkSrc)
      : Promise.resolve(null),
    awaitShareHighlightFonts(resolveFontSet(options.fontSet)),
  ])
  const overlayTone = artwork ? input.artwork?.overlayTone : 'dark'
  const storyProfile = resolveStoryArtworkProfile(input, artwork)
  const layout = layoutShareHighlightStory(
    input.content.lines,
    (text, style) => {
      context.font = fontString(style)
      return context.measureText(text).width
    },
    overlayTone,
    storyProfile
  )
  const palette = resolveShareHighlightOverlayPalette(
    layout.composition !== 'expressive' ? 'light' : overlayTone
  )

  context.clearRect(0, 0, SHARE_HIGHLIGHT_STORY_WIDTH, SHARE_HIGHLIGHT_STORY_HEIGHT)
  drawStoryArtworkBackground(context, artwork, storyProfile, layout.composition)
  drawStoryReadingSurface(context, layout, palette)
  drawStoryMetadataSurfaces(context, layout, palette)
  drawStoryHeader(context, seriesLabel, dateLabel, palette)
  drawStoryDiptychDivider(context, layout)
  layout.sections.forEach(section => drawTextSection(context, section, palette))
  drawStoryFooter(context, sourceLabel, palette, layout)
  return canvas
}

/** Exports the complete reading as one downloadable/shareable PNG file. */
export async function exportShareHighlightStoryPng(
  input: ShareHighlightPassageInput,
  options: ShareHighlightRendererOptions = {}
): Promise<ShareHighlightStoryPngExport> {
  const canvas = await renderShareHighlightStory(input, options)
  const blob = await canvasToPngBlob(canvas)
  const file = new File([blob], normalizePassageFileBase(input.fileNameBase), { type: 'image/png' })
  return {
    canvas,
    blob,
    file,
    width: SHARE_HIGHLIGHT_STORY_WIDTH,
    height: SHARE_HIGHLIGHT_STORY_HEIGHT,
  }
}
