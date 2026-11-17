import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useThemeStore } from './theme'

import {
  DEFAULT_EPUB_READER_PREFERENCES, EPUB_READER_PREFERENCES_KEY, EPUB_READER_PREFERENCES_VERSION,
  clampEpubFontScale, normalizeEpubReaderPreferences, migrateEpubReaderPreferences,
  type EpubReaderPreferences, type EpubReaderLineHeight, type EpubReaderMeasure, type EpubReaderPalette,
  type EpubReaderFontFamily, type EpubReaderParagraphSpacing, type EpubReaderMode, type EpubReaderPageTurn,
} from '../utils/epubReaderPreferences'
export {
  DEFAULT_EPUB_READER_PREFERENCES, EPUB_FONT_SCALE_MIN, EPUB_FONT_SCALE_MAX, EPUB_FONT_SCALE_STEP,
} from '../utils/epubReaderPreferences'
export type {
  EpubReaderPreferences, EpubReaderLineHeight, EpubReaderMeasure, EpubReaderPalette,
  EpubReaderFontFamily, EpubReaderParagraphSpacing, EpubReaderMode, EpubReaderPageTurn,
} from '../utils/epubReaderPreferences'

interface EpubReaderState extends EpubReaderPreferences {
  setFontScale: (fontScale: number) => void
  setLineHeight: (lineHeight: EpubReaderLineHeight) => void
  setMeasure: (measure: EpubReaderMeasure) => void
  setPalette: (palette: EpubReaderPalette) => void
  setFontFamily: (fontFamily: EpubReaderFontFamily) => void
  setParagraphSpacing: (paragraphSpacing: EpubReaderParagraphSpacing) => void
  setReadingMode: (readingMode: EpubReaderMode) => void
  setPageTurn: (pageTurn: EpubReaderPageTurn) => void
  resetPreferences: () => void
}

export const useEpubReaderStore = create<EpubReaderState>()(
  persist(
    set => ({
      ...DEFAULT_EPUB_READER_PREFERENCES,
      setFontScale: fontScale => set({ fontScale: clampEpubFontScale(fontScale) }),
      setLineHeight: lineHeight => set({ lineHeight }),
      setMeasure: measure => set({ measure }),
      setPalette: palette => set({ palette }),
      setFontFamily: fontFamily => set({ fontFamily: normalizeEpubReaderPreferences({ fontFamily }).fontFamily }),
      setParagraphSpacing: paragraphSpacing => set({ paragraphSpacing: normalizeEpubReaderPreferences({ paragraphSpacing }).paragraphSpacing }),
      setReadingMode: readingMode => set({ readingMode: normalizeEpubReaderPreferences({ readingMode }).readingMode }),
      setPageTurn: pageTurn => set({ pageTurn: normalizeEpubReaderPreferences({ pageTurn }).pageTurn }),
      resetPreferences: () => set(DEFAULT_EPUB_READER_PREFERENCES),
    }),
    {
      name: EPUB_READER_PREFERENCES_KEY,
      version: EPUB_READER_PREFERENCES_VERSION,
      migrate: migrateEpubReaderPreferences,
      merge: (persisted, current) => ({ ...current, ...normalizeEpubReaderPreferences(persisted) }),
      partialize: state => ({
        fontScale: state.fontScale,
        lineHeight: state.lineHeight,
        measure: state.measure,
        palette: state.palette,
        fontFamily: state.fontFamily,
        paragraphSpacing: state.paragraphSpacing,
        readingMode: state.readingMode,
        pageTurn: state.pageTurn,
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
