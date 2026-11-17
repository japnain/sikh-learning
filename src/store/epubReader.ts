import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useThemeStore } from './theme'

export type EpubReaderLineHeight = 'compact' | 'comfortable' | 'spacious'
export type EpubReaderMeasure = 'narrow' | 'standard' | 'wide'
export type EpubReaderPalette = 'app' | 'paper' | 'sepia' | 'night'
export type EpubReaderFontFamily = 'literary' | 'classic' | 'sans'

export const EPUB_FONT_SCALE_MIN = 0.85
export const EPUB_FONT_SCALE_MAX = 2
export const EPUB_FONT_SCALE_STEP = 0.05

export interface EpubReaderPreferences {
  fontScale: number
  lineHeight: EpubReaderLineHeight
  measure: EpubReaderMeasure
  palette: EpubReaderPalette
  fontFamily: EpubReaderFontFamily
}

interface EpubReaderState extends EpubReaderPreferences {
  setFontScale: (fontScale: number) => void
  setLineHeight: (lineHeight: EpubReaderLineHeight) => void
  setMeasure: (measure: EpubReaderMeasure) => void
  setPalette: (palette: EpubReaderPalette) => void
  setFontFamily: (fontFamily: EpubReaderFontFamily) => void
  resetPreferences: () => void
}

export const DEFAULT_EPUB_READER_PREFERENCES: EpubReaderPreferences = {
  fontScale: 1,
  lineHeight: 'comfortable',
  measure: 'standard',
  palette: 'app',
  fontFamily: 'literary',
}

function clampFontScale(fontScale: number) {
  if (!Number.isFinite(fontScale)) return DEFAULT_EPUB_READER_PREFERENCES.fontScale
  return Math.min(EPUB_FONT_SCALE_MAX, Math.max(EPUB_FONT_SCALE_MIN, Math.round(fontScale * 20) / 20))
}

function normalizedPreferences(value: unknown): EpubReaderPreferences {
  const data = value && typeof value === 'object' ? value as Partial<EpubReaderPreferences> : {}
  return {
    fontScale: typeof data.fontScale === 'number' ? clampFontScale(data.fontScale) : DEFAULT_EPUB_READER_PREFERENCES.fontScale,
    lineHeight: ['compact', 'comfortable', 'spacious'].includes(data.lineHeight ?? '') ? data.lineHeight! : 'comfortable',
    measure: ['narrow', 'standard', 'wide'].includes(data.measure ?? '') ? data.measure! : 'standard',
    palette: ['app', 'paper', 'sepia', 'night'].includes(data.palette ?? '') ? data.palette! : 'app',
    fontFamily: ['literary', 'classic', 'sans'].includes(data.fontFamily ?? '') ? data.fontFamily! : 'literary',
  }
}

export const useEpubReaderStore = create<EpubReaderState>()(
  persist(
    set => ({
      ...DEFAULT_EPUB_READER_PREFERENCES,
      setFontScale: fontScale => set({ fontScale: clampFontScale(fontScale) }),
      setLineHeight: lineHeight => set({ lineHeight }),
      setMeasure: measure => set({ measure }),
      setPalette: palette => set({ palette }),
      setFontFamily: fontFamily => set({ fontFamily: normalizedPreferences({ fontFamily }).fontFamily }),
      resetPreferences: () => set(DEFAULT_EPUB_READER_PREFERENCES),
    }),
    {
      name: 'sikh-epub-reader-preferences',
      version: 2,
      migrate: persisted => normalizedPreferences(persisted),
      merge: (persisted, current) => ({ ...current, ...normalizedPreferences(persisted) }),
      partialize: state => ({
        fontScale: state.fontScale,
        lineHeight: state.lineHeight,
        measure: state.measure,
        palette: state.palette,
        fontFamily: state.fontFamily,
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
