import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type EpubReaderLineHeight = 'compact' | 'comfortable' | 'spacious'
export type EpubReaderMeasure = 'narrow' | 'standard' | 'wide'
export type EpubReaderPalette = 'paper' | 'sepia' | 'night'

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
  palette: 'paper',
}

function clampFontScale(fontScale: number) {
  return Math.min(1.3, Math.max(0.85, Math.round(fontScale * 20) / 20))
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
