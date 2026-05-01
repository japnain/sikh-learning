import { describe, expect, test } from 'vitest'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from './readerDisplay'

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
