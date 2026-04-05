import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EnglishSource, MeaningLanguage, ScriptMode } from '../types'

interface LanguageState {
  scriptMode: ScriptMode
  setScriptMode: (mode: ScriptMode) => void
  toggleScriptMode: () => void
  showTransliteration: boolean
  setShowTransliteration: (value: boolean) => void
  toggleTransliteration: () => void
  meaningLanguage: MeaningLanguage
  setMeaningLanguage: (value: MeaningLanguage) => void
  fontSize: number
  setFontSize: (n: number) => void
  englishSource: EnglishSource
  setEnglishSource: (source: EnglishSource) => void
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
      fontSize: 22,
      setFontSize: (n) => set({ fontSize: n }),
      englishSource: 'bdb',
      setEnglishSource: (englishSource) => set({ englishSource }),
    }),
    { name: 'sikh-language' }
  )
)
