import { describe, expect, test } from 'vitest'
import {
  getScriptTextFontClass,
  getScriptTextLang,
  isStructuralGurbaniHeadingLine,
  renderScriptText,
} from './readerDisplay'

describe('reader display script typography', () => {
  test('uses shared script-safe font classes for Gurmukhi text', () => {
    expect(getScriptTextLang('gurmukhi')).toBe('pa-Guru')
    expect(getScriptTextFontClass('gurmukhi').split(' ')).toEqual(
      expect.arrayContaining(['script-text-safe', 'font-gurmukhi'])
    )
  })

  test('uses a Devanagari-specific script-safe font class after conversion', () => {
    expect(getScriptTextLang('devanagari')).toBe('hi')
    expect(getScriptTextFontClass('devanagari').split(' ')).toEqual(
      expect.arrayContaining(['script-text-safe', 'font-devanagari'])
    )
    expect(renderScriptText('ਸਬਰ', 'devanagari')).not.toBe('ਸਬਰ')
  })
})

describe('structural Gurbani headings', () => {
  test.each([
    'ਸਲੋਕ ਮਃ ੩ ॥',
    'ਮਃ ੩ ॥',
    'ਪਉੜੀ ॥',
    'ਪਉੜੀ ੫ ॥',
    'ਧਨਾਸਰੀ ਮਹਲਾ ੫ ਘਰੁ ੧੨',
    'ਰਾਗੁ ਗਉੜੀ ਦੀਪਕੀ ਮਹਲਾ ੧ ॥',
    'ਕਬਿਯੋ ਬਾਚ ਬੇਨਤੀ ਚੌਪਈ ॥',
  ])('recognizes BaniDB structure label %s', text => {
    expect(isStructuralGurbaniHeadingLine(text)).toBe(true)
  })

  test.each([
    '',
    'ਸਤਿ ਨਾਮੁ',
    'ਸਲੋਕੁ ਮਨਿ ਨਿਰਮਲ ਮੁਖੁ ਨਿਰਮਲ',
    'ਉਤ ਤਾਕੈ ਉਤ ਤੇ ਉਤ ਪੇਖੈ ਆਵੈ ਲੋਭੀ ਫੇਰਿ ॥ ਰਹਾਉ ॥',
  ])('does not promote scripture content %s to a heading', text => {
    expect(isStructuralGurbaniHeadingLine(text)).toBe(false)
  })
})
