import type { CSSProperties } from 'react'
import type { HomeArtworkAsset } from './homeArtwork'

type Palette = 'ink' | 'ochre' | 'rose' | 'jade' | 'parchment'
type Composition = { palette: Palette; height: number; inset: number }

// Individual hanging decisions: a panoramic mural, a miniature and a tall
// decorative panel need different space. Dimensions always preserve the work.
const COMPOSITIONS: Record<string, Composition> = {
  eclipse: { palette: 'ink', height: 372, inset: 20 },
  'court-mural': { palette: 'rose', height: 320, inset: 16 },
  'interior-audience': { palette: 'rose', height: 390, inset: 28 },
  'court-assembly': { palette: 'jade', height: 350, inset: 20 },
  'fort-procession': { palette: 'ochre', height: 330, inset: 20 },
  'string-and-tabla': { palette: 'jade', height: 330, inset: 24 },
  'devotional-interior': { palette: 'ochre', height: 340, inset: 20 },
  'waterside-temple': { palette: 'jade', height: 390, inset: 28 },
  'miniature-collage': { palette: 'parchment', height: 400, inset: 28 },
  'rider-and-attendants': { palette: 'jade', height: 270, inset: 16 },
  'falconer-on-horseback': { palette: 'parchment', height: 380, inset: 28 },
  'floral-teacher-mural': { palette: 'parchment', height: 360, inset: 28 },
  'golden-court-assembly': { palette: 'ochre', height: 380, inset: 28 },
  'gurmukhi-floral-medallion': { palette: 'rose', height: 390, inset: 28 },
  'ceremonial-arms-display': { palette: 'ochre', height: 370, inset: 28 },
  'nanak-bala-mardana': { palette: 'rose', height: 380, inset: 28 },
  'nanak-companions': { palette: 'jade', height: 345, inset: 24 },
  'golden-temple-carpenter': { palette: 'jade', height: 320, inset: 20 },
  'akal-takht-simpson': { palette: 'ochre', height: 310, inset: 20 },
}

// Background, primary text, secondary text, accent. Palettes are deliberately
// restrained so the painting supplies the color and scripture stays readable.
const PALETTES: Record<Palette, { light: string[]; dark: string[] }> = {
  ink: { light: ['#e5e8e5', '#25353b', '#54646a', '#695332'], dark: ['#14212a', '#f2eee4', '#bdc8cb', '#d4bc91'] },
  ochre: { light: ['#eee4d2', '#3b3024', '#6c5d4c', '#795429'], dark: ['#292218', '#f4ead9', '#ccbdab', '#dbbb81'] },
  rose: { light: ['#ede2dc', '#3e2c2c', '#735a54', '#805440'], dark: ['#2c2121', '#f4e8df', '#cdbbb3', '#ddb395'] },
  jade: { light: ['#e3e7de', '#2d3933', '#57665c', '#685833'], dark: ['#1c2926', '#eff0e4', '#bdcbc3', '#d3c497'] },
  parchment: { light: ['#eee9dd', '#37352a', '#666352', '#765d32'], dark: ['#28281f', '#f1eddf', '#c9c5b2', '#d8c498'] },
}

export function getHomeArtworkComposition(asset: HomeArtworkAsset, dark: boolean) {
  const direction = COMPOSITIONS[asset.id] ?? { palette: 'parchment', height: 380, inset: 24 }
  const [background, ink, muted, accent] = PALETTES[direction.palette][dark ? 'dark' : 'light']
  const ratio = asset.width / asset.height
  // Keep three source pixels per CSS pixel on high-density phone screens.
  // Smaller reproductions receive a smaller frame instead of being enlarged.
  const maxWidth = Math.min(direction.height * ratio, asset.width / 3)
  return {
    orientation: ratio > 1.85 ? 'panorama' : ratio >= 1 ? 'landscape' : 'portrait',
    arrivalStyle: {
      '--arrival-bg': background,
      '--arrival-ink': ink,
      '--arrival-muted': muted,
      '--arrival-accent': accent,
      '--artwork-inset': `${direction.inset}px`,
    } as CSSProperties,
    frameStyle: { aspectRatio: ratio, maxWidth: `${maxWidth}px` } as CSSProperties,
  }
}
