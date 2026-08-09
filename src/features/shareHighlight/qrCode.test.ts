import { binarize, Decoder, Detector } from '@nuintun/qrcode'
import { describe, expect, it, vi } from 'vitest'
import {
  drawShareHighlightQrCode,
  normalizeShareHighlightQrUrl,
  SHARE_HIGHLIGHT_QR_RENDER_SIZE,
} from './qrCode'

function makeLuminanceContext(size: number) {
  const luminances = new Uint8Array(size * size).fill(255)
  let fillStyle = '#ffffff'
  return {
    luminances,
    context: {
      get fillStyle() {
        return fillStyle
      },
      set fillStyle(value: string | CanvasGradient | CanvasPattern) {
        fillStyle = String(value)
      },
      fillRect(x: number, y: number, width: number, height: number) {
        const value = fillStyle.toLowerCase() === '#000000' ? 0 : 255
        for (let row = Math.max(0, y); row < Math.min(size, y + height); row += 1) {
          luminances.fill(value, (row * size) + x, (row * size) + x + width)
        }
      },
    },
  }
}

function resizeLuminances(
  source: Uint8Array,
  sourceSize: number,
  targetSize: number,
) {
  const target = new Uint8Array(targetSize * targetSize)
  for (let y = 0; y < targetSize; y += 1) {
    for (let x = 0; x < targetSize; x += 1) {
      const sourceX = Math.min(sourceSize - 1, Math.floor(((x + 0.5) * sourceSize) / targetSize))
      const sourceY = Math.min(sourceSize - 1, Math.floor(((y + 0.5) * sourceSize) / targetSize))
      target[(y * targetSize) + x] = source[(sourceY * sourceSize) + sourceX]!
    }
  }
  return target
}

function decodeQr(luminances: Uint8Array, size: number) {
  const detections = new Detector().detect(binarize(luminances, size, size))
  const decoder = new Decoder()
  let current = detections.next()
  while (!current.done) {
    try {
      return decoder.decode(current.value.matrix).content
    } catch {
      current = detections.next(false)
    }
  }
  throw new Error('Rendered QR code could not be decoded.')
}

describe('share image QR code', () => {
  it('renders an opaque, integer-aligned QR code for a canonical short link', () => {
    const context = {
      fillStyle: '',
      fillRect: vi.fn(),
    }

    const result = drawShareHighlightQrCode(
      context,
      'https://naamras.xyz/h/2026-08-03#ignored',
      { x: 12, y: 20, size: 180 },
      { dark: '#111111', light: '#ffffff' }
    )

    expect(result.url).toBe('https://naamras.xyz/h/2026-08-03')
    expect(result.moduleSize).toBeGreaterThanOrEqual(4)
    expect(result.renderedSize).toBeLessThanOrEqual(180)
    expect(context.fillRect).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      result.renderedSize,
      result.renderedSize
    )
    expect(context.fillRect.mock.calls.length).toBeGreaterThan(100)
  })

  it('rejects malformed and off-origin destinations', () => {
    expect(() => normalizeShareHighlightQrUrl('not-a-url')).toThrow(TypeError)
    expect(() => normalizeShareHighlightQrUrl('https://example.com/h/2026-08-03'))
      .toThrow(TypeError)
  })

  it('rejects a rendering area that cannot preserve every module', () => {
    const context = { fillStyle: '', fillRect: vi.fn() }

    expect(() => drawShareHighlightQrCode(
      context,
      'https://naamras.xyz/h/2026-08-03',
      { x: 0, y: 0, size: 1 },
      { dark: '#000000', light: '#ffffff' }
    )).toThrow(RangeError)
  })

  it.each([
    'https://naamras.xyz/h/2026-08-03',
    'https://naamras.xyz/p/2591/680/10101',
  ])('decodes the production QR after a mobile-sized social resize: %s', url => {
    const { context, luminances } = makeLuminanceContext(SHARE_HIGHLIGHT_QR_RENDER_SIZE)
    const result = drawShareHighlightQrCode(
      context,
      url,
      { x: 0, y: 0, size: SHARE_HIGHLIGHT_QR_RENDER_SIZE },
      { dark: '#000000', light: '#ffffff' },
    )
    const mobileSize = 72
    const resized = resizeLuminances(
      luminances,
      SHARE_HIGHLIGHT_QR_RENDER_SIZE,
      mobileSize,
    )

    expect(result.moduleSize).toBeGreaterThanOrEqual(4)
    expect(decodeQr(luminances, SHARE_HIGHLIGHT_QR_RENDER_SIZE)).toBe(url)
    expect(decodeQr(resized, mobileSize)).toBe(url)
  })
})
