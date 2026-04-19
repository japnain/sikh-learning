import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  EnglishSource,
  HindiSource,
  MeaningLanguage,
  PunjabiSource,
  ReaderAlignment,
  ReaderLineSpacing,
  ScriptMode,
  VisraamSource,
} from '../types'

interface LanguageState {
  scriptMode: ScriptMode
  setScriptMode: (mode: ScriptMode) => void
  toggleScriptMode: () => void
  showTransliteration: boolean
  setShowTransliteration: (value: boolean) => void
  toggleTransliteration: () => void
  meaningLanguage: MeaningLanguage
  setMeaningLanguage: (value: MeaningLanguage) => void
  larivaar: boolean
  setLarivaar: (value: boolean) => void
  showVishraam: boolean
  setShowVishraam: (value: boolean) => void
  lineSpacing: ReaderLineSpacing
  setLineSpacing: (value: ReaderLineSpacing) => void
  textAlign: ReaderAlignment
  setTextAlign: (value: ReaderAlignment) => void
  fontSize: number
  setFontSize: (n: number) => void
  englishSource: EnglishSource
  setEnglishSource: (source: EnglishSource) => void
  punjabiSource: PunjabiSource
  setPunjabiSource: (source: PunjabiSource) => void
  hindiSource: HindiSource
  setHindiSource: (source: HindiSource) => void
  visraamSource: VisraamSource
  setVisraamSource: (source: VisraamSource) => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      scriptMode: 'gurmukhi',
      setScriptMode: (scriptMode) => set({ scriptMode }),
      toggleScriptMode: () => set(s => ({ scriptMode: s.scriptMode === 'gurmukhi' ? 'devanagari' : 'gurmukhi' })),
      showTransliteration: false,
      setShowTransliteration: (showTransliteration) => set({ showTransliteration }),
      toggleTransliteration: () => set(s => ({ showTransliteration: !s.showTransliteration })),
      meaningLanguage: 'en',
      setMeaningLanguage: (meaningLanguage) => set({ meaningLanguage }),
      larivaar: false,
      setLarivaar: (larivaar) => set({ larivaar }),
      showVishraam: true,
      setShowVishraam: (showVishraam) => set({ showVishraam }),
      lineSpacing: 'relaxed',
      setLineSpacing: (lineSpacing) => set({ lineSpacing }),
      textAlign: 'left',
      setTextAlign: (textAlign) => set({ textAlign }),
      fontSize: 22,
      setFontSize: (n) => set({ fontSize: n }),
      englishSource: 'bdb',
      setEnglishSource: (englishSource) => set({ englishSource }),
      punjabiSource: 'ss',
      setPunjabiSource: (punjabiSource) => set({ punjabiSource }),
      hindiSource: 'ss',
      setHindiSource: (hindiSource) => set({ hindiSource }),
      visraamSource: 'sttm',
      setVisraamSource: (visraamSource) => set({ visraamSource }),
    }),
    { name: 'sikh-language' }
  )
)
