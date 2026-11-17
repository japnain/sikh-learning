import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useThemeStore } from './theme'

export type EpubReaderLineHeight = 'compact' | 'comfortable' | 'spacious'
export type EpubReaderMeasure = 'narrow' | 'standard' | 'wide'
export type EpubReaderPalette = 'app' | 'paper' | 'sepia' | 'night'

export const EPUB_FONT_SCALE_MIN = 0.85
export const EPUB_FONT_SCALE_MAX = 2
export const EPUB_FONT_SCALE_STEP = 0.05

export interface EpubReaderPreferences {
  fontScale: number
  lineHeight: EpubReaderLineHeight
  measure: EpubReaderMeasure
  palette: EpubReaderPalette
}

interface EpubReaderState extends EpubReaderPreferences {
  setFontScale: (fontScale: number) => void
  setLineHeight: (lineHeight: EpubReaderLineHeight) => void
  setMeasure: (measure: EpubReaderMeasure) => void
  setPalette: (palette: EpubReaderPalette) => void
  resetPreferences: () => void
}

export const DEFAULT_EPUB_READER_PREFERENCES: EpubReaderPreferences = {
  fontScale: 1,
  lineHeight: 'comfortable',
  measure: 'standard',
  palette: 'app',
}

function clampFontScale(fontScale: number) {
  if (!Number.isFinite(fontScale)) return DEFAULT_EPUB_READER_PREFERENCES.fontScale
  return Math.min(EPUB_FONT_SCALE_MAX, Math.max(EPUB_FONT_SCALE_MIN, Math.round(fontScale * 20) / 20))
}

export const useEpubReaderStore = create<EpubReaderState>()(
  persist(
    set => ({
      ...DEFAULT_EPUB_READER_PREFERENCES,
      setFontScale: fontScale => set({ fontScale: clampFontScale(fontScale) }),
      setLineHeight: lineHeight => set({ lineHeight }),
      setMeasure: measure => set({ measure }),
      setPalette: palette => set({ palette }),
      resetPreferences: () => set(DEFAULT_EPUB_READER_PREFERENCES),
    }),
    {
      name: 'sikh-epub-reader-preferences',
      version: 1,
      partialize: state => ({
        fontScale: state.fontScale,
        lineHeight: state.lineHeight,
        measure: state.measure,
        palette: state.palette,
      }),
    }
  )
)

export function useResolvedEpubPalette(): Exclude<EpubReaderPalette, 'app'> {
  const palette = useEpubReaderStore(state => state.palette)
  const dark = useThemeStore(state => state.dark)
  return palette === 'app' ? dark ? 'night' : 'paper' : palette
}
export const EPUB_APP_PALETTE_LABEL = { en: 'Follow app', pa: 'ਐਪ ਅਨੁਸਾਰ', hi: 'ऐप के अनुसार' }
