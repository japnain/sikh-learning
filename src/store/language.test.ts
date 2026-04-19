import { beforeEach, expect, test } from 'vitest'
import { useLanguageStore } from './language'

beforeEach(() => {
  localStorage.clear()
  useLanguageStore.setState({
    scriptMode: 'gurmukhi',
    showTransliteration: false,
    meaningLanguage: 'en',
    larivaar: false,
    showVishraam: true,
    lineSpacing: 'relaxed',
    textAlign: 'left',
    fontSize: 22,
    englishSource: 'bdb',
    punjabiSource: 'ss',
    hindiSource: 'ss',
    visraamSource: 'sttm',
  })
})

test('persists reader preference state updates', () => {
  useLanguageStore.getState().setScriptMode('devanagari')
  useLanguageStore.getState().setShowTransliteration(true)
  useLanguageStore.getState().setMeaningLanguage('pa')
  useLanguageStore.getState().setEnglishSource('ms')
  useLanguageStore.getState().setLarivaar(true)
  useLanguageStore.getState().setShowVishraam(false)
  useLanguageStore.getState().setLineSpacing('compact')
  useLanguageStore.getState().setTextAlign('center')
  useLanguageStore.getState().setPunjabiSource('ft')
  useLanguageStore.getState().setHindiSource('sts')
  useLanguageStore.getState().setVisraamSource('igurbani')

  const state = useLanguageStore.getState()
  expect(state.scriptMode).toBe('devanagari')
  expect(state.showTransliteration).toBe(true)
  expect(state.meaningLanguage).toBe('pa')
  expect(state.englishSource).toBe('ms')
  expect(state.larivaar).toBe(true)
  expect(state.showVishraam).toBe(false)
  expect(state.lineSpacing).toBe('compact')
  expect(state.textAlign).toBe('center')
  expect(state.punjabiSource).toBe('ft')
  expect(state.hindiSource).toBe('sts')
  expect(state.visraamSource).toBe('igurbani')
})
