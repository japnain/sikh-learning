import { Byte, Encoder } from '@nuintun/qrcode'

const CANONICAL_SHARE_ORIGIN = 'https://naamras.xyz'
const QUIET_ZONE_MODULES = 4

/** Native Story pixels reserved for a QR that remains readable after social resizing. */
export const SHARE_HIGHLIGHT_QR_RENDER_SIZE = 180

export interface ShareHighlightQrRect {
  x: number
  y: number
  size: number
}

export interface ShareHighlightQrPalette {
  dark: string
  light: string
}

export interface ShareHighlightQrRenderResult {
  moduleCount: number
  moduleSize: number
  renderedSize: number
  url: string
}

export function normalizeShareHighlightQrUrl(value: string): string {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new TypeError('A valid NaamRas share URL is required for the QR code.')
  }

  if (parsed.origin !== CANONICAL_SHARE_ORIGIN) {
    throw new TypeError('The QR code may only point to the canonical NaamRas origin.')
  }

  parsed.hash = ''
  return parsed.toString()
}

export function drawShareHighlightQrCode(
  context: Pick<CanvasRenderingContext2D, 'fillRect' | 'fillStyle'>,
  value: string,
  rect: ShareHighlightQrRect,
  palette: ShareHighlightQrPalette
): ShareHighlightQrRenderResult {
  const url = normalizeShareHighlightQrUrl(value)
  const qrCode = new Encoder({ level: 'M' }).encode(new Byte(url))
  const moduleCount = qrCode.size + (QUIET_ZONE_MODULES * 2)
  const moduleSize = Math.floor(rect.size / moduleCount)
  if (moduleSize < 1) {
    throw new RangeError('The QR code area is too small to render every module.')
  }

  const renderedSize = moduleCount * moduleSize
  const originX = Math.round(rect.x + ((rect.size - renderedSize) / 2))
  const originY = Math.round(rect.y + ((rect.size - renderedSize) / 2))

  context.fillStyle = palette.light
  context.fillRect(originX, originY, renderedSize, renderedSize)
  context.fillStyle = palette.dark

  for (let row = 0; row < qrCode.size; row += 1) {
    for (let column = 0; column < qrCode.size; column += 1) {
      if (!qrCode.get(column, row)) continue
      context.fillRect(
        originX + ((column + QUIET_ZONE_MODULES) * moduleSize),
        originY + ((row + QUIET_ZONE_MODULES) * moduleSize),
        moduleSize,
        moduleSize
      )
    }
  }

  return { moduleCount, moduleSize, renderedSize, url }
}
