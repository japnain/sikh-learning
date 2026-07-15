import {
  SHARE_HIGHLIGHT_BRAND_DOMAIN,
  SHARE_HIGHLIGHT_CARD_HEIGHT,
  SHARE_HIGHLIGHT_CARD_WIDTH,
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
  type ShareHighlightPngSetExport,
  type ShareHighlightPngSetPage,
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

const PASSAGE_MINIMUM_SCALE = 0.72
const PASSAGE_SCALE_STEP = 0.02
const PASSAGE_WASH_RECT: ShareHighlightPixelRect = {
  x: 34,
  y: 38,
  width: SHARE_HIGHLIGHT_CARD_WIDTH - 68,
  height: 1184,
}
const PASSAGE_TEXT_X = 86
const PASSAGE_TEXT_WIDTH = SHARE_HIGHLIGHT_CARD_WIDTH - (PASSAGE_TEXT_X * 2)
const PASSAGE_BODY_TOP = 196
const PASSAGE_BODY_BOTTOM = 1152
const PASSAGE_BODY_HEIGHT = PASSAGE_BODY_BOTTOM - PASSAGE_BODY_TOP
const PASSAGE_SECTION_GAP = 8
const PASSAGE_LINE_GAP = 28
const PASSAGE_HEADER_GAP = 14

const PASSAGE_TEXT_SPECS = {
  header: {
    maximumFontSize: 40,
    lineHeightRatio: 1.38,
    fontFamily: '"Noto Serif Gurmukhi", serif',
    fontStyle: 'normal' as const,
    fontWeight: 600 as const,
  },
  gurmukhi: {
    maximumFontSize: 54,
    lineHeightRatio: 1.42,
    fontFamily: '"Noto Serif Gurmukhi", serif',
    fontStyle: 'normal' as const,
    fontWeight: 600 as const,
  },
  transliteration: {
    maximumFontSize: 24,
    lineHeightRatio: 1.46,
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    fontStyle: 'italic' as const,
    fontWeight: 500 as const,
  },
  meaning: {
    maximumFontSize: 27,
    lineHeightRatio: 1.46,
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

  constructor(requiredHeight: number, availableHeight: number) {
    super(`Share highlight content needs ${Math.ceil(requiredHeight)}px but only ${Math.floor(availableHeight)}px is available.`)
    this.name = 'ShareHighlightContentOverflowError'
    this.requiredHeight = requiredHeight
    this.availableHeight = availableHeight
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

export interface ShareHighlightPassagePagePlan {
  pageNumber: number
  pageCount: number
  contentScale: number
  lines: ShareHighlightPassageLine[]
}

export interface ShareHighlightPassagePageLayout {
  contentScale: number
  requiredHeight: number
  sections: ShareHighlightTextSection[]
}

interface ShareHighlightPassageSectionDraft {
  role: Extract<ShareHighlightTextRole, 'gurmukhi' | 'transliteration' | 'meaning'>
  lines: string[]
  style: ShareHighlightTextStyle
  height: number
}

interface ShareHighlightPassageLineDraft {
  line: ShareHighlightPassageLine
  sections: ShareHighlightPassageSectionDraft[]
  height: number
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

function makePassageStyle(
  role: ShareHighlightPassageSectionDraft['role'],
  isHeader: boolean,
  scale: number,
  palette: ShareHighlightOverlayPalette
): ShareHighlightTextStyle {
  const spec = role === 'gurmukhi' && isHeader
    ? PASSAGE_TEXT_SPECS.header
    : PASSAGE_TEXT_SPECS[role]
  const fontSize = Math.round(spec.maximumFontSize * scale)
  return {
    fontFamily: spec.fontFamily,
    fontSize,
    fontStyle: spec.fontStyle,
    fontWeight: spec.fontWeight,
    lineHeight: Math.ceil(fontSize * spec.lineHeightRatio),
    color: role === 'gurmukhi' ? palette.primaryText : palette.secondaryText,
  }
}

function draftPassageLine(
  line: ShareHighlightPassageLine,
  measure: ShareHighlightTextMeasure,
  scale: number,
  palette: ShareHighlightOverlayPalette
): ShareHighlightPassageLineDraft {
  const values: Array<[ShareHighlightPassageSectionDraft['role'], string]> = [
    ['gurmukhi', line.gurmukhi],
  ]
  if (line.transliteration) values.push(['transliteration', line.transliteration])
  if (line.meaning) values.push(['meaning', line.meaning])

  const sections = values.map(([role, value]) => {
    const style = makePassageStyle(role, Boolean(line.isHeader), scale, palette)
    const lines = wrapShareHighlightText(value, PASSAGE_TEXT_WIDTH, style, measure)
    return {
      role,
      lines,
      style,
      height: lines.length * style.lineHeight,
    }
  })
  const height = sections.reduce((total, section, index) => (
    total + section.height + (index < sections.length - 1 ? PASSAGE_SECTION_GAP : 0)
  ), 0)

  return { line, sections, height }
}

export function layoutShareHighlightPassagePage(
  rawLines: readonly ShareHighlightPassageLine[],
  measure: ShareHighlightTextMeasure,
  contentScale = 1,
  overlayTone?: string
): ShareHighlightPassagePageLayout {
  const lines = normalizePassageLines(rawLines)
  const scale = clamp(contentScale, PASSAGE_MINIMUM_SCALE, 1)
  const palette = resolveShareHighlightOverlayPalette(overlayTone)
  const drafts = lines.map(line => draftPassageLine(line, measure, scale, palette))
  const requiredHeight = drafts.reduce((total, draft, index) => (
    total
    + draft.height
    + (index < drafts.length - 1
      ? (draft.line.isHeader ? PASSAGE_HEADER_GAP : PASSAGE_LINE_GAP)
      : 0)
  ), 0)
  let cursorY = PASSAGE_BODY_TOP
  const sections: ShareHighlightTextSection[] = []

  drafts.forEach((draft, draftIndex) => {
    draft.sections.forEach((section, sectionIndex) => {
      sections.push({
        role: section.role,
        lines: section.lines,
        style: section.style,
        x: PASSAGE_TEXT_X,
        y: cursorY,
        width: PASSAGE_TEXT_WIDTH,
        height: section.height,
      })
      cursorY += section.height
      if (sectionIndex < draft.sections.length - 1) cursorY += PASSAGE_SECTION_GAP
    })
    if (draftIndex < drafts.length - 1) {
      cursorY += draft.line.isHeader ? PASSAGE_HEADER_GAP : PASSAGE_LINE_GAP
    }
  })

  return { contentScale: scale, requiredHeight, sections }
}

function makePassageUnits(lines: readonly ShareHighlightPassageLine[]) {
  const units: ShareHighlightPassageLine[][] = []
  let index = 0

  while (index < lines.length) {
    if (!lines[index]?.isHeader) {
      units.push([lines[index]!])
      index += 1
      continue
    }

    const unit: ShareHighlightPassageLine[] = []
    while (lines[index]?.isHeader) {
      unit.push(lines[index]!)
      index += 1
    }
    if (index < lines.length) {
      unit.push(lines[index]!)
      index += 1
    }
    units.push(unit)
  }

  return units
}

function passageLinesFit(
  lines: readonly ShareHighlightPassageLine[],
  measure: ShareHighlightTextMeasure,
  scale: number
) {
  return layoutShareHighlightPassagePage(lines, measure, scale).requiredHeight <= PASSAGE_BODY_HEIGHT
}

function largestPassageScale(
  lines: readonly ShareHighlightPassageLine[],
  measure: ShareHighlightTextMeasure
) {
  for (
    let scalePercent = 100;
    scalePercent >= PASSAGE_MINIMUM_SCALE * 100;
    scalePercent -= PASSAGE_SCALE_STEP * 100
  ) {
    const scale = scalePercent / 100
    if (passageLinesFit(lines, measure, scale)) return scale
  }
  return PASSAGE_MINIMUM_SCALE
}

/**
 * Greedily fills readable folio pages without ever splitting a source line.
 * Header units are kept with the following verse unless that combined unit is
 * itself too tall, in which case line integrity takes precedence.
 */
export function paginateShareHighlightPassage(
  rawLines: readonly ShareHighlightPassageLine[],
  measure: ShareHighlightTextMeasure
): ShareHighlightPassagePagePlan[] {
  const lines = normalizePassageLines(rawLines)
  const pendingUnits = makePassageUnits(lines)
  const pages: ShareHighlightPassageLine[][] = []
  let currentPage: ShareHighlightPassageLine[] = []

  while (pendingUnits.length > 0) {
    const unit = pendingUnits.shift()!
    const candidate = [...currentPage, ...unit]

    if (passageLinesFit(candidate, measure, PASSAGE_MINIMUM_SCALE)) {
      currentPage = candidate
      continue
    }

    if (currentPage.length > 0) {
      pages.push(currentPage)
      currentPage = []
      pendingUnits.unshift(unit)
      continue
    }

    if (unit.length > 1) {
      pendingUnits.unshift(...unit.map(line => [line]))
      continue
    }

    const layout = layoutShareHighlightPassagePage(unit, measure, PASSAGE_MINIMUM_SCALE)
    throw new ShareHighlightContentOverflowError(layout.requiredHeight, PASSAGE_BODY_HEIGHT)
  }

  if (currentPage.length > 0) pages.push(currentPage)
  const commonScale = Math.min(...pages.map(page => largestPassageScale(page, measure)))
  const pageCount = pages.length

  return pages.map((pageLines, index) => ({
    pageNumber: index + 1,
    pageCount,
    contentScale: commonScale,
    lines: pageLines,
  }))
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

function drawNoArtworkBackground(context: CanvasRenderingContext2D) {
  context.fillStyle = '#15110f'
  context.fillRect(0, 0, SHARE_HIGHLIGHT_CARD_WIDTH, SHARE_HIGHLIGHT_CARD_HEIGHT)

  const gradient = context.createLinearGradient(0, 0, SHARE_HIGHLIGHT_CARD_WIDTH, SHARE_HIGHLIGHT_CARD_HEIGHT)
  gradient.addColorStop(0, '#1d302c')
  gradient.addColorStop(0.48, '#171512')
  gradient.addColorStop(1, '#382219')
  context.fillStyle = gradient
  context.fillRect(0, 0, SHARE_HIGHLIGHT_CARD_WIDTH, SHARE_HIGHLIGHT_CARD_HEIGHT)

  context.save()
  roundedRectanglePath(context, {
    x: 35,
    y: 35,
    width: SHARE_HIGHLIGHT_CARD_WIDTH - 70,
    height: SHARE_HIGHLIGHT_CARD_HEIGHT - 70,
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

function drawPassageWash(
  context: CanvasRenderingContext2D,
  palette: ShareHighlightOverlayPalette
) {
  const gradient = context.createLinearGradient(
    PASSAGE_WASH_RECT.x,
    0,
    PASSAGE_WASH_RECT.x + PASSAGE_WASH_RECT.width,
    0
  )
  gradient.addColorStop(0, palette.washFeather)
  gradient.addColorStop(0.035, palette.washShoulder)
  gradient.addColorStop(0.075, palette.denseWash)
  gradient.addColorStop(0.925, palette.denseWash)
  gradient.addColorStop(0.965, palette.washShoulder)
  gradient.addColorStop(1, palette.washFeather)

  context.save()
  context.shadowColor = palette.denseWash
  context.shadowBlur = 74
  context.shadowOffsetX = 0
  context.shadowOffsetY = 0
  roundedRectanglePath(context, PASSAGE_WASH_RECT, 82)
  context.fillStyle = gradient
  context.fill()
  context.restore()
}

function drawPassageHeader(
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
  context.font = 'normal 700 25px "Plus Jakarta Sans", sans-serif'
  context.fillStyle = palette.primaryText
  context.fillText(seriesLabel, PASSAGE_TEXT_X, 74, PASSAGE_TEXT_WIDTH)

  if (dateLabel) {
    context.font = 'normal 600 22px "Plus Jakarta Sans", sans-serif'
    context.fillStyle = palette.secondaryText
    context.fillText(dateLabel, PASSAGE_TEXT_X, 112, PASSAGE_TEXT_WIDTH)
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
  sourceLabel: string,
  pageMeta?: Pick<ShareHighlightPngSetPage, 'pageNumber' | 'pageCount'>
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
    pageMeta ? 500 : SHARE_HIGHLIGHT_CARD_WIDTH - (FOOTER_HORIZONTAL_MARGIN * 2)
  )

  if (pageMeta) {
    context.font = 'normal 700 24px "Plus Jakarta Sans", sans-serif'
    context.fillStyle = 'rgba(255, 250, 240, 0.9)'
    context.textAlign = 'center'
    context.fillText(
      `${pageMeta.pageNumber} / ${pageMeta.pageCount}`,
      SHARE_HIGHLIGHT_CARD_WIDTH / 2,
      FOOTER_BASELINE
    )
  }

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

function drawPassageArtworkBackground(
  context: CanvasRenderingContext2D,
  artwork: ShareHighlightDecodedImage | null,
  input: ShareHighlightPassageInput
) {
  if (!artwork) {
    drawNoArtworkBackground(context)
    return
  }

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
}

function normalizePassageFileBase(value?: string) {
  const normalized = normalizePngFileName(value?.trim() || 'naamras-hukamnama')
  return normalized.replace(/\.png$/i, '') || 'naamras-hukamnama'
}

function makePassagePageFileName(base: string, pageNumber: number, pageCount: number) {
  const digits = Math.max(2, String(pageCount).length)
  return `${base}-${String(pageNumber).padStart(digits, '0')}-of-${String(pageCount).padStart(digits, '0')}.png`
}

/**
 * Exports a complete reading as an ordered image set. Artwork and fonts are
 * prepared once, then pages are rendered and encoded sequentially so a failed
 * page rejects the whole operation instead of exposing a partial set.
 */
export async function exportShareHighlightPngSet(
  input: ShareHighlightPassageInput,
  options: ShareHighlightRendererOptions = {}
): Promise<ShareHighlightPngSetExport> {
  const sourceLabel = input.content.sourceLabel.trim()
  const seriesLabel = input.content.seriesLabel.trim()
  const dateLabel = input.content.dateLabel?.trim() || null
  if (!sourceLabel) throw new TypeError('A passage source label is required.')
  if (!seriesLabel) throw new TypeError('A passage series label is required.')

  const firstCanvas = options.canvas ?? options.createCanvas?.() ?? createDefaultCanvas()
  firstCanvas.width = SHARE_HIGHLIGHT_CARD_WIDTH
  firstCanvas.height = SHARE_HIGHLIGHT_CARD_HEIGHT
  const firstContext = firstCanvas.getContext('2d')
  if (!firstContext) throw new Error('A Canvas 2D rendering context is required.')

  const artworkSrc = input.artwork?.src?.trim()
  const [artwork] = await Promise.all([
    artworkSrc
      ? (options.loadImage ?? loadDecodedImage)(artworkSrc)
      : Promise.resolve(null),
    awaitShareHighlightFonts(resolveFontSet(options.fontSet)),
  ])
  const measure: ShareHighlightTextMeasure = (text, style) => {
    firstContext.font = fontString(style)
    return firstContext.measureText(text).width
  }
  const plans = paginateShareHighlightPassage(input.content.lines, measure)
  const pageCount = plans.length
  const fileBase = normalizePassageFileBase(input.fileNameBase)
  const overlayTone = artwork ? input.artwork?.overlayTone : 'dark'
  const palette = resolveShareHighlightOverlayPalette(overlayTone)
  const pages: ShareHighlightPngSetPage[] = []

  for (const plan of plans) {
    const canvas = plan.pageNumber === 1
      ? firstCanvas
      : options.createCanvas?.() ?? createDefaultCanvas()
    canvas.width = SHARE_HIGHLIGHT_CARD_WIDTH
    canvas.height = SHARE_HIGHLIGHT_CARD_HEIGHT
    const context = canvas.getContext('2d')
    if (!context) throw new Error('A Canvas 2D rendering context is required.')

    context.clearRect(0, 0, SHARE_HIGHLIGHT_CARD_WIDTH, SHARE_HIGHLIGHT_CARD_HEIGHT)
    drawPassageArtworkBackground(context, artwork, input)
    drawPassageWash(context, palette)
    drawPassageHeader(context, seriesLabel, dateLabel, palette)
    const layout = layoutShareHighlightPassagePage(
      plan.lines,
      (text, style) => {
        context.font = fontString(style)
        return context.measureText(text).width
      },
      plan.contentScale,
      overlayTone
    )
    if (layout.requiredHeight > PASSAGE_BODY_HEIGHT) {
      throw new ShareHighlightContentOverflowError(layout.requiredHeight, PASSAGE_BODY_HEIGHT)
    }
    layout.sections.forEach(section => drawTextSection(context, section, palette))
    drawFooterWash(context)
    drawFooter(context, sourceLabel, {
      pageNumber: plan.pageNumber,
      pageCount,
    })

    const blob = await canvasToPngBlob(canvas)
    const file = new File([
      blob,
    ], makePassagePageFileName(fileBase, plan.pageNumber, pageCount), { type: 'image/png' })
    pages.push({
      canvas,
      blob,
      file,
      width: SHARE_HIGHLIGHT_CARD_WIDTH,
      height: SHARE_HIGHLIGHT_CARD_HEIGHT,
      pageNumber: plan.pageNumber,
      pageCount,
    })
  }

  return {
    pages,
    files: pages.map(page => page.file),
    totalPages: pages.length,
  }
}
