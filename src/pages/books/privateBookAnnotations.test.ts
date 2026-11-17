import { afterEach, describe, expect, test, vi } from 'vitest'
import type { PrivateBookAnnotation } from '../../data/privateLibrary'
import { canAddPrivateAnnotations, capturePrivateTextSelection, createPrivateTextAnnotations,
  isPrivateReadingStateWithinBudget, nextPrivateAnnotationTimestamp, normalizePrivateAnnotations,
  privateAnnotationDomRange, privateAnnotationVisibleRects } from './privateBookAnnotations'

const timestamp = '2026-01-01T00:00:00.000Z'
const mark = (patch: Record<string, unknown> = {}): PrivateBookAnnotation => ({ id: 'synthetic-mark', kind: 'text', index: 0,
  blockId: 'first', start: 0, end: 5, quote: 'Alpha', color: 'yellow', createdAt: timestamp, updatedAt: timestamp, ...patch } as PrivateBookAnnotation)
function source(html: string) { const root = document.createElement('div'); root.innerHTML = html; document.body.append(root); return root }
function select(start: Node, startOffset: number, end: Node, endOffset: number) {
  const range = document.createRange(); range.setStart(start, startOffset); range.setEnd(end, endOffset)
  const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range); return selection
}
afterEach(() => { document.body.replaceChildren(); window.getSelection()?.removeAllRanges(); vi.restoreAllMocks() })

describe('exact private annotation source ranges', () => {
  test('captures UTF-16 offsets through nested inline text without folding whitespace', () => {
    const root = source('<section data-source-id="first"><div data-source-text> A🪷 <em>bold</em>\nline</div><button>Reference</button></section>')
    const body = root.querySelector('[data-source-text]')!
    const selected = select(body.firstChild!, 2, body.lastChild!, 3)
    const result = capturePrivateTextSelection(root, selected)
    expect(result.ranges).toEqual([{ blockId: 'first', start: 2, end: 12, quote: '🪷 bold\nli' }])
    const annotation = createPrivateTextAnnotations(result.ranges, 2, 'green')[0]
    expect(privateAnnotationDomRange(root, annotation)?.toString()).toBe(selected.toString())
    expect(body.textContent).toBe(' A🪷 bold\nline')
  })

  test('captures a multi-block selection but excludes reference button text from source offsets', () => {
    const root = source('<section data-source-id="first"><div data-source-text>Alpha beta</div><button>Reference</button></section><section data-source-id="second"><div data-source-text>Gamma delta</div></section>')
    const bodies = root.querySelectorAll('[data-source-text]')
    const ranges = capturePrivateTextSelection(root, select(bodies[0].firstChild!, 6, bodies[1].firstChild!, 5)).ranges
    expect(ranges).toEqual([{ blockId: 'first', start: 6, end: 10, quote: 'beta' }, { blockId: 'second', start: 0, end: 5, quote: 'Gamma' }])
    const annotations = createPrivateTextAnnotations(ranges, 3, 'pink', 'One thought about this passage.')
    expect(annotations[0].note).toBe('One thought about this passage.')
    expect(annotations[1].note).toBeUndefined()
    expect(new Set(annotations.map(item => item.id)).size).toBe(2)
  })

  test('splits a long passage without losing text or splitting a surrogate pair', () => {
    const root = source('<section data-source-id="first"><div data-source-text></div></section>')
    const body = root.querySelector('[data-source-text]')!
    body.textContent = `${'a'.repeat(999)}🪷${'b'.repeat(1001)}`
    const ranges = capturePrivateTextSelection(root, select(body.firstChild!, 0, body.firstChild!, body.textContent.length)).ranges
    expect(ranges.map(item => item.quote).join('')).toBe(body.textContent)
    expect(ranges.map(item => item.quote.length)).toEqual([999, 1000, 3])
    expect(ranges[1].start).toBe(ranges[0].end)
    expect(ranges[2].start).toBe(ranges[1].end)
    expect(ranges[1].quote.startsWith('🪷')).toBe(true)
  })

  test('rejects a non-source endpoint and never invents selectable text for an image', () => {
    const root = source('<section data-source-id="first"><div data-source-text>Alpha</div><button>Reference</button></section><img alt="A scanned page">')
    const body = root.querySelector('[data-source-text]')!
    const result = capturePrivateTextSelection(root, select(body.firstChild!, 0, root.querySelector('button')!.firstChild!, 4))
    expect(result.ranges).toEqual([])
    expect(result.error).toMatch(/book’s text/)
    window.getSelection()?.removeAllRanges()
    expect(capturePrivateTextSelection(root, window.getSelection()).ranges).toEqual([])
  })

  test('reattaches through split text nodes only when the exact quote still matches', () => {
    const root = source('<section data-source-id="first"><div data-source-text>Al<strong>ph</strong>a beta</div></section>')
    expect(privateAnnotationDomRange(root, mark())?.toString()).toBe('Alpha')
    expect(privateAnnotationDomRange(root, mark({ quote: 'alpha' }))).toBeNull()
    expect(privateAnnotationDomRange(root, mark({ end: 50 }))).toBeNull()
    expect(privateAnnotationDomRange(root, mark({ blockId: 'other' }))).toBeNull()
    expect(root.querySelectorAll('mark')).toHaveLength(0)
  })

  test('clips fallback highlights to the paginated viewport and excludes hidden columns', () => {
    const root = source('<div class="private-reader-book-viewport"></div>')
    vi.spyOn(root.firstElementChild!, 'getBoundingClientRect').mockReturnValue({ left: 20, top: 30, right: 200, bottom: 300 } as DOMRect)
    const range = { getClientRects: () => [{ left: 5, top: 20, right: 80, bottom: 50 }, { left: 210, top: 40, right: 300, bottom: 70 }] } as unknown as Range
    expect(privateAnnotationVisibleRects(root, range)).toEqual([{ left: 20, top: 30, width: 60, height: 20 }])
  })
})

describe('private annotation storage boundaries', () => {
  test('counts the full UTF-8 request envelope and keeps a recoverable count limit', () => {
    expect(isPrivateReadingStateWithinBudget({ index: 0, annotations: [mark()] })).toBe(true)
    expect(isPrivateReadingStateWithinBudget({ note: '🪷'.repeat(12_000) })).toBe(false)
    expect(canAddPrivateAnnotations(Array.from({ length: 128 }, (_, i) => mark({ id: `note-${i}` })), [mark()])).toBe(false)
    expect(canAddPrivateAnnotations([], [mark({ note: 'a'.repeat(2001) })])).toBe(false)
  })

  test('normalizes only valid known fields and rejects malformed range integrity', () => {
    const normalized = normalizePrivateAnnotations([mark({ untrusted: 'not retained' }), mark({ id: 'invalid', end: 4 }),
      mark({ id: 'bad-color', color: 'url(x)' }), mark({ id: 'bad-date', updatedAt: 'yesterday' }), mark(),
      { id: 'page-note', kind: 'page', index: 4, note: 'A thought', createdAt: timestamp, updatedAt: timestamp },
      { id: 'empty-page', kind: 'page', index: 4, note: ' ', createdAt: timestamp, updatedAt: timestamp }])
    expect(normalized).toHaveLength(2)
    expect(normalized[0]).not.toHaveProperty('untrusted')
    expect(normalized[1].kind).toBe('page')
    expect(normalizePrivateAnnotations(undefined)).toEqual([])
  })

  test('advances edits beyond a prior timestamp despite clock rollback or same-millisecond saves', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(timestamp))
    expect(nextPrivateAnnotationTimestamp(timestamp)).toBe('2026-01-01T00:00:00.001Z')
    expect(nextPrivateAnnotationTimestamp('2027-01-01T00:00:00.000Z')).toBe('2027-01-01T00:00:00.001Z')
  })
})
