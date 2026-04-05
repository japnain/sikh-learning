import { beforeEach, expect, test } from 'vitest'
import { useLanguageStore } from './language'

beforeEach(() => {
  localStorage.clear()
  useLanguageStore.setState({
    scriptMode: 'gurmukhi',
    showTransliteration: false,
    meaningLanguage: 'en',
    fontSize: 22,
    englishSource: 'bdb',
  })
})

test('persists reader preference state updates', () => {
  useLanguageStore.getState().setScriptMode('devanagari')
  useLanguageStore.getState().setShowTransliteration(true)
  useLanguageStore.getState().setMeaningLanguage('pa')
  useLanguageStore.getState().setEnglishSource('ms')

  const state = useLanguageStore.getState()
  expect(state.scriptMode).toBe('devanagari')
  expect(state.showTransliteration).toBe(true)
  expect(state.meaningLanguage).toBe('pa')
  expect(state.englishSource).toBe('ms')
})
