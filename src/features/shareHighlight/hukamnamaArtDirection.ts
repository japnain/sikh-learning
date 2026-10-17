import type { ShareHighlightObjectCoverPlacement } from './types'

interface HukamnamaArtDirection {
  paper: string
  shortVeil: number
  longVeil: number
  edgeFeather: number
}

/** Display treatments only. The fourteen original artwork files are never edited. */
export const HUKAMNAMA_ART_DIRECTIONS = {
  'court-mural': { paper: '#f1e5d2', shortVeil: 0.66, longVeil: 0.76, edgeFeather: 88 },
  'interior-audience': { paper: '#231d18', shortVeil: 0.68, longVeil: 0.75, edgeFeather: 72 },
  'court-assembly': { paper: '#1a2327', shortVeil: 0.69, longVeil: 0.77, edgeFeather: 88 },
  'fort-procession': { paper: '#292019', shortVeil: 0.70, longVeil: 0.77, edgeFeather: 96 },
  'string-and-tabla': { paper: '#18242b', shortVeil: 0.69, longVeil: 0.76, edgeFeather: 72 },
  'devotional-interior': { paper: '#26201b', shortVeil: 0.70, longVeil: 0.77, edgeFeather: 88 },
  'waterside-temple': { paper: '#19262a', shortVeil: 0.70, longVeil: 0.77, edgeFeather: 64 },
  'miniature-collage': { paper: '#27201e', shortVeil: 0.71, longVeil: 0.79, edgeFeather: 64 },
  'rider-and-attendants': { paper: '#1a2628', shortVeil: 0.69, longVeil: 0.77, edgeFeather: 88 },
  'falconer-on-horseback': { paper: '#242219', shortVeil: 0.69, longVeil: 0.76, edgeFeather: 64 },
  'floral-teacher-mural': { paper: '#f1ecdf', shortVeil: 0.67, longVeil: 0.77, edgeFeather: 72 },
  'golden-court-assembly': { paper: '#252219', shortVeil: 0.70, longVeil: 0.78, edgeFeather: 80 },
  'gurmukhi-floral-medallion': { paper: '#f0e6d6', shortVeil: 0.69, longVeil: 0.78, edgeFeather: 64 },
  'ceremonial-arms-display': { paper: '#2a2117', shortVeil: 0.71, longVeil: 0.77, edgeFeather: 64 },
} as const satisfies Record<string, HukamnamaArtDirection>

export function getHukamnamaArtDirection(id?: string): HukamnamaArtDirection | undefined {
  return id && Object.hasOwn(HUKAMNAMA_ART_DIRECTIONS, id)
    ? HUKAMNAMA_ART_DIRECTIONS[id as keyof typeof HUKAMNAMA_ART_DIRECTIONS]
    : undefined
}

/** Feather just the exposed image edges into the same-art ambient background.
 * Disjoint strips keep source geometry exact and avoid another full-size canvas.
 * The original subject stays sharp; there is no blur applied to the main art. */
export function buildHukamnamaArtworkSlices(
  placement: ShareHighlightObjectCoverPlacement,
  frame: { width: number; height: number },
  edgeFeather: number,
): Array<{ placement: ShareHighlightObjectCoverPlacement; opacity: number }> {
  const vertical = placement.destinationHeight < frame.height - 1
  const horizontal = placement.destinationWidth < frame.width - 1
  if (!vertical && !horizontal) return [{ placement, opacity: 1 }]
  const length = vertical ? placement.destinationHeight : placement.destinationWidth
  const origin = vertical ? placement.destinationY : placement.destinationX
  const frameLength = vertical ? frame.height : frame.width
  const feather = Math.min(Math.max(0, edgeFeather), length / 4)
  if (!feather) return [{ placement, opacity: 1 }]
  const start = origin > 0.5 ? feather : 0
  const end = origin + length < frameLength - 0.5 ? feather : 0
  const slices: ReturnType<typeof buildHukamnamaArtworkSlices> = []
  const add = (from: number, to: number, opacity: number) => {
    if (to <= from) return
    const fraction = (to - from) / length
    const slice = vertical ? {
      ...placement,
      sourceY: placement.sourceY + placement.sourceHeight * from / length,
      sourceHeight: placement.sourceHeight * fraction,
      destinationY: placement.destinationY + from,
      destinationHeight: to - from,
    } : {
      ...placement,
      sourceX: placement.sourceX + placement.sourceWidth * from / length,
      sourceWidth: placement.sourceWidth * fraction,
      destinationX: placement.destinationX + from,
      destinationWidth: to - from,
    }
    slices.push({ placement: slice, opacity })
  }
  const steps = 24
  for (let index = 0; index < steps; index += 1) {
    const t = (index + 0.5) / steps
    const opacity = t * t * (3 - 2 * t)
    if (start) add(start * index / steps, start * (index + 1) / steps, opacity)
    if (end) add(length - end * (index + 1) / steps, length - end * index / steps, opacity)
  }
  add(start, length - end, 1)
  return slices
}
