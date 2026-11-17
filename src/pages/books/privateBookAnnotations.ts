import {
  PRIVATE_ANNOTATION_MAX_COUNT, PRIVATE_ANNOTATION_MAX_NOTE_LENGTH, PRIVATE_ANNOTATION_MAX_QUOTE_LENGTH,
  PRIVATE_READING_STATE_SOFT_BYTES, type PrivateBookAnnotation,
} from '../../data/privateLibrary'

export const PRIVATE_ANNOTATION_COLORS = ['yellow', 'green', 'blue', 'pink'] as const
export type PrivateAnnotationColor = typeof PRIVATE_ANNOTATION_COLORS[number]
export const PRIVATE_ANNOTATION_LIMIT = PRIVATE_ANNOTATION_MAX_COUNT
export const PRIVATE_ANNOTATION_QUOTE_LIMIT = PRIVATE_ANNOTATION_MAX_QUOTE_LENGTH
export const PRIVATE_ANNOTATION_NOTE_LIMIT = PRIVATE_ANNOTATION_MAX_NOTE_LENGTH
export const PRIVATE_READING_STATE_SAFE_BYTES = PRIVATE_READING_STATE_SOFT_BYTES
export const PRIVATE_ANNOTATION_BUDGET_MESSAGE = 'There is not enough room to save this annotation. Shorten the note or remove an older annotation, then try again. Your existing notes are unchanged.'

export interface PrivateTextSelection {
  blockId: string
  start: number
  end: number
  quote: string
}
export interface PrivateSelectionResult { ranges: PrivateTextSelection[]; error?: string }

const canonicalTimestamp = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value
export function nextPrivateAnnotationTimestamp(previous?: string) {
  return new Date(Math.max(Date.now(), previous && canonicalTimestamp(previous) ? Date.parse(previous) + 1 : 0)).toISOString()
}

export function normalizePrivateAnnotations(value: unknown): PrivateBookAnnotation[] {
  if (!Array.isArray(value)) return []
  const result: PrivateBookAnnotation[] = []
  const ids = new Set<string>()
  for (const item of value) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(item.id)
      || ids.has(item.id) || !Number.isSafeInteger(item.index) || item.index < 0
      || !canonicalTimestamp(item.createdAt) || !canonicalTimestamp(item.updatedAt)) continue
    const base = { id: item.id, index: item.index, createdAt: item.createdAt, updatedAt: item.updatedAt }
    if (item.kind === 'page' && typeof item.note === 'string' && item.note.trim() && item.note.length <= PRIVATE_ANNOTATION_NOTE_LIMIT) {
      result.push({ ...base, kind: 'page', note: item.note }); ids.add(item.id)
    } else if (item.kind === 'text' && typeof item.blockId === 'string' && item.blockId.length > 0 && item.blockId.length <= 200
      && Number.isSafeInteger(item.start) && item.start >= 0 && Number.isSafeInteger(item.end) && item.end > item.start && item.end <= 1_000_000
      && typeof item.quote === 'string' && item.quote.length <= PRIVATE_ANNOTATION_QUOTE_LIMIT && item.end - item.start === item.quote.length
      && PRIVATE_ANNOTATION_COLORS.includes(item.color) && (item.note === undefined || typeof item.note === 'string' && item.note.length <= PRIVATE_ANNOTATION_NOTE_LIMIT)) {
      result.push({ ...base, kind: 'text', blockId: item.blockId, start: item.start, end: item.end, quote: item.quote, color: item.color, ...(item.note === undefined ? {} : { note: item.note }) }); ids.add(item.id)
    }
  }
  return result
}

/** Count the actual UTF-8 request envelope; leave headroom below the gateway's 48 KiB cap. */
export function isPrivateReadingStateWithinBudget(state: unknown) {
  try { return new TextEncoder().encode(JSON.stringify({ state })).byteLength <= PRIVATE_READING_STATE_SAFE_BYTES }
  catch { return false }
}

function textPosition(body: HTMLElement, node: Node, offset: number) {
  const prefix = body.ownerDocument.createRange()
  prefix.selectNodeContents(body)
  prefix.setEnd(node, offset)
  return prefix.toString().length
}

/** The source wrapper excludes reference controls and has unchanged source textContent. */
export function capturePrivateTextSelection(root: HTMLElement, selection: Selection | null): PrivateSelectionResult {
  if (!selection || selection.isCollapsed || selection.rangeCount !== 1) return { ranges: [] }
  const range = selection.getRangeAt(0)
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return { ranges: [] }
  const bodies = Array.from(root.querySelectorAll<HTMLElement>('[data-source-text]'))
  if (!bodies.some(body => body.contains(range.startContainer)) || !bodies.some(body => body.contains(range.endContainer))) {
    return { ranges: [], error: 'Select the book’s text to add a highlight. Original scanned pages support page notes.' }
  }
  const ranges: PrivateTextSelection[] = []
  for (const body of bodies) {
    if (!range.intersectsNode(body)) continue
    const blockId = body.closest<HTMLElement>('[data-source-id]')?.dataset.sourceId
    const text = body.textContent ?? ''
    if (!blockId || blockId.length > 200 || !text.length) continue
    let start = body.contains(range.startContainer) ? textPosition(body, range.startContainer, range.startOffset) : 0
    const end = body.contains(range.endContainer) ? textPosition(body, range.endContainer, range.endOffset) : text.length
    if (start < 0 || end > 1_000_000 || end > text.length || start >= end) continue
    // Long passages are saved as exact contiguous ranges, without truncating their text.
    while (start < end) {
      let partEnd = Math.min(end, start + PRIVATE_ANNOTATION_QUOTE_LIMIT)
      if (partEnd < end && /[\uD800-\uDBFF]/.test(text[partEnd - 1]) && /[\uDC00-\uDFFF]/.test(text[partEnd])) partEnd -= 1
      ranges.push({ blockId, start, end: partEnd, quote: text.slice(start, partEnd) })
      start = partEnd
    }
  }
  return ranges.some(item => item.quote.trim()) ? { ranges } : { ranges: [] }
}

/** Reattach only when the exact source quote still occupies its original UTF-16 range. */
export function privateAnnotationDomRange(root: HTMLElement, annotation: PrivateBookAnnotation): Range | null {
  if (annotation.kind !== 'text') return null
  const block = Array.from(root.querySelectorAll<HTMLElement>('[data-source-id]')).find(item => item.dataset.sourceId === annotation.blockId)
  const body = block?.querySelector<HTMLElement>('[data-source-text]')
  const text = body?.textContent ?? ''
  if (!body || !Number.isSafeInteger(annotation.start) || !Number.isSafeInteger(annotation.end)
    || annotation.start < 0 || annotation.end <= annotation.start || annotation.end > text.length
    || text.slice(annotation.start, annotation.end) !== annotation.quote) return null
  const walker = body.ownerDocument.createTreeWalker(body, NodeFilter.SHOW_TEXT)
  const range = body.ownerDocument.createRange()
  let position = 0
  let started = false
  while (walker.nextNode()) {
    const node = walker.currentNode
    const length = node.textContent?.length ?? 0
    if (!started && annotation.start <= position + length) {
      range.setStart(node, annotation.start - position)
      started = true
    }
    if (started && annotation.end <= position + length) {
      range.setEnd(node, annotation.end - position)
      return range
    }
    position += length
  }
  return null
}

export function privateAnnotationVisibleRects(root: HTMLElement, range: Range) {
  const viewport = root.querySelector<HTMLElement>('.private-reader-book-viewport') ?? root.closest<HTMLElement>('.private-reader-book-viewport') ?? root
  const bounds = viewport.getBoundingClientRect()
  if (typeof range.getClientRects !== 'function') return []
  return Array.from(range.getClientRects()).flatMap(rect => {
    const left = Math.max(rect.left, bounds.left, 0)
    const top = Math.max(rect.top, bounds.top, 0)
    const right = Math.min(rect.right, bounds.right, window.innerWidth)
    const bottom = Math.min(rect.bottom, bounds.bottom, window.innerHeight)
    return right > left && bottom > top ? [{ left, top, width: right - left, height: bottom - top }] : []
  })
}

export function createPrivateTextAnnotations(ranges: PrivateTextSelection[], index: number, color: PrivateAnnotationColor, note = ''): PrivateBookAnnotation[] {
  const timestamp = new Date().toISOString()
  return ranges.map((range, position) => ({ id: crypto.randomUUID(), kind: 'text', index, ...range, color,
    ...(position === 0 && note.trim() ? { note } : {}), createdAt: timestamp, updatedAt: timestamp }))
}

export function canAddPrivateAnnotations(existing: PrivateBookAnnotation[], added: PrivateBookAnnotation[]) {
  return existing.length + added.length <= PRIVATE_ANNOTATION_LIMIT
    && added.every(item => item.kind === 'page' ? Boolean(item.note.trim()) && item.note.length <= PRIVATE_ANNOTATION_NOTE_LIMIT
      : item.quote.length <= PRIVATE_ANNOTATION_QUOTE_LIMIT && item.end - item.start === item.quote.length && (!item.note || item.note.length <= PRIVATE_ANNOTATION_NOTE_LIMIT))
    && isPrivateReadingStateWithinBudget({ annotations: [...existing, ...added] })
}
