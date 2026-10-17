import { describe, expect, it } from 'vitest'
import { shareHighlightHukamnamaAssets } from '../../assets/share-highlights/manifest'
import { buildHukamnamaArtworkSlices, getHukamnamaArtDirection, HUKAMNAMA_ART_DIRECTIONS } from './hukamnamaArtDirection'
import { computeShareHighlightProtectedCover, resolveHukamnamaImagePalette } from './renderer'

const rgb = (hex: string) => [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16))
const luminance = (channels: number[]) => channels.map(value => value / 255)
  .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  .reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i]!, 0)

describe('individual Hukamnama artwork direction', () => {
  it('covers exactly the fourteen existing originals, never generated parchment', () => {
    expect(Object.keys(HUKAMNAMA_ART_DIRECTIONS).sort()).toEqual(shareHighlightHukamnamaAssets.map(art => art.id).sort())
    expect(getHukamnamaArtDirection('quiet-parchment')).toBeUndefined()
    expect(getHukamnamaArtDirection('toString')).toBeUndefined()
  })

  it.each(shareHighlightHukamnamaAssets)('preserves $id contrast at every reading density', art => {
    const direction = getHukamnamaArtDirection(art.id)!
    expect(direction.shortVeil).toBeLessThan(direction.longVeil)
    expect(direction.longVeil).toBeLessThanOrEqual(0.79)
    for (const scale of [0, 0.5, 1]) {
      const palette = resolveHukamnamaImagePalette(art.overlayTone, art.id, scale)
      expect(palette.paper).toBe(direction.paper)
      for (const pixel of [0, 255]) for (const ink of [palette.primaryText, palette.secondaryText]) {
        const background = rgb(palette.paper).map(channel => channel * palette.veilOpacity + pixel * (1 - palette.veilOpacity))
        const a = luminance(rgb(ink)), b = luminance(background)
        expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it.each(shareHighlightHukamnamaAssets)('feathers $id edges without missing, repeating, or distorting source pixels', art => {
    for (const height of [1350, 1920, 2331, 8192]) {
      const frame = { width: 1080, height }
      const placement = computeShareHighlightProtectedCover(art.normalized.width, art.normalized.height,
        { x: 0, y: 0, ...frame }, art.storyProfile.protectedSubject!.bounds, art.storyProfile.focalPosition)
      const slices = buildHukamnamaArtworkSlices(placement, frame, getHukamnamaArtDirection(art.id)!.edgeFeather)
      expect(slices.length).toBeGreaterThan(0)
      expect(slices.length).toBeLessThanOrEqual(49)
      expect(slices.at(-1)!.opacity).toBe(1)
      expect(slices.reduce((sum, s) => sum + s.placement.sourceWidth * s.placement.sourceHeight, 0))
        .toBeCloseTo(placement.sourceWidth * placement.sourceHeight, 4)
      expect(slices.reduce((sum, s) => sum + s.placement.destinationWidth * s.placement.destinationHeight, 0))
        .toBeCloseTo(placement.destinationWidth * placement.destinationHeight, 4)
      for (const { placement: p, opacity } of slices) {
        expect(opacity).toBeGreaterThan(0)
        expect(opacity).toBeLessThanOrEqual(1)
        expect(p.sourceWidth / p.destinationWidth).toBeCloseTo(placement.sourceWidth / placement.destinationWidth, 6)
        expect(p.sourceHeight / p.destinationHeight).toBeCloseTo(placement.sourceHeight / placement.destinationHeight, 6)
        expect(p.sourceX).toBeGreaterThanOrEqual(placement.sourceX - 0.001)
        expect(p.sourceY).toBeGreaterThanOrEqual(placement.sourceY - 0.001)
        expect(p.sourceX + p.sourceWidth).toBeLessThanOrEqual(placement.sourceX + placement.sourceWidth + 0.001)
        expect(p.sourceY + p.sourceHeight).toBeLessThanOrEqual(placement.sourceY + placement.sourceHeight + 0.001)
      }
    }
  })
})
