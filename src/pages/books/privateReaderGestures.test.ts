import { describe, expect, it } from 'vitest'
import { classifyPrivateReaderGesture, type PrivateReaderGesture } from './privateReaderGestures'

const tap: PrivateReaderGesture = {
  startX: 200, startY: 300, endX: 200, endY: 300, duration: 120, width: 400,
  selectionActive: false, multiplePointers: false, interactive: false, zoomed: false,
}

function classify(changes: Partial<PrivateReaderGesture> = {}) {
  return classifyPrivateReaderGesture({ ...tap, ...changes })
}

describe('private reader gesture intent', () => {
  it.each([
    { startX: 10, result: 'previous' },
    { startX: 87, result: 'previous' },
    { startX: 88, result: 'toggle' },
    { startX: 200, result: 'toggle' },
    { startX: 312, result: 'toggle' },
    { startX: 313, result: 'next' },
    { startX: 390, result: 'next' },
  ])('classifies a stationary tap at x=$startX as $result', ({ startX, result }) => {
    expect(classify({ startX, endX: startX })).toBe(result)
  })

  it('scales the center zone to the viewport and keeps a small tap drift in its original zone', () => {
    expect(classify({ width: 1000, startX: 220, endX: 220 })).toBe('toggle')
    expect(classify({ width: 1000, startX: 780, endX: 780 })).toBe('toggle')
    expect(classify({ startX: 85, endX: 90, endY: 305 })).toBe('previous')
  })

  it.each([
    { endX: 155, endY: 300, duration: 900, result: 'next' },
    { endX: 245, endY: 300, duration: 900, result: 'previous' },
    { endX: 100, endY: 350, duration: 400, result: 'next' },
    { endX: 300, endY: 250, duration: 400, result: 'previous' },
  ])('recognizes a deliberate horizontal swipe to x=$endX', ({ result, ...changes }) => {
    expect(classify(changes)).toBe(result)
  })

  it.each([
    { endX: 156 },
    { endX: 155, duration: 901 },
    { endX: 150, endY: 330 },
    { endY: 310 },
    { endY: 200 },
    { endX: 220, endY: 360 },
    { endX: 208, endY: 306 },
  ])('does not interpret a short, slow, diagonal or vertical drag as navigation: %j', changes => {
    expect(classify(changes)).toBeNull()
  })

  it('allows a short tap but preserves a long press for text selection', () => {
    expect(classify({ duration: 350, endX: 205, endY: 305 })).toBe('toggle')
    expect(classify({ duration: 351 })).toBeNull()
    expect(classify({ duration: 1000 })).toBeNull()
  })

  it.each(['selectionActive', 'multiplePointers', 'interactive'] as const)('ignores taps and swipes while %s', flag => {
    expect(classify({ [flag]: true })).toBeNull()
    expect(classify({ [flag]: true, endX: 100 })).toBeNull()
  })

  it('allows center controls on a zoomed page without interpreting its pan or edge tap as a page turn', () => {
    expect(classify({ zoomed: true })).toBe('toggle')
    expect(classify({ zoomed: true, startX: 10, endX: 10 })).toBeNull()
    expect(classify({ zoomed: true, startX: 390, endX: 390 })).toBeNull()
    expect(classify({ zoomed: true, endX: 100 })).toBeNull()
    expect(classify({ zoomed: true, endY: 400 })).toBeNull()
  })

  it.each([{ width: 0 }, { width: -1 }, { duration: -1 }, { endX: NaN }, { startY: Infinity }])('ignores unusable pointer measurements: %j', changes => {
    expect(classify(changes)).toBeNull()
  })
})
