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
    supportTextSize: 'standard',
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
  useLanguageStore.getState().setSupportTextSize('large')

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
  expect(state.supportTextSize).toBe('large')
  expect(state.fontSize).toBe(22)
  expect(JSON.parse(localStorage.getItem('sikh-language')!).state.supportTextSize).toBe('large')
})

test('normalizes text size on changes and when restoring saved preferences', async () => {
  useLanguageStore.getState().setFontSize(23)
  expect(useLanguageStore.getState().fontSize).toBe(23)
  useLanguageStore.getState().setFontSize(2)
  expect(useLanguageStore.getState().fontSize).toBe(16)
  useLanguageStore.getState().setFontSize(Infinity)
  expect(useLanguageStore.getState().fontSize).toBe(22)
  localStorage.setItem('sikh-language', JSON.stringify({ state: { fontSize: 90 }, version: 0 }))
  await useLanguageStore.persist.rehydrate()
  expect(useLanguageStore.getState().fontSize).toBe(34)
  expect(typeof useLanguageStore.getState().setFontSize).toBe('function')
})
