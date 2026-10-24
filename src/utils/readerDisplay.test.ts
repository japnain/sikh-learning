import { beforeEach, describe, expect, test } from 'vitest'
import type { ScriptureLine } from '../types'
import { useLanguageStore } from '../store/language'
import {
  getLineMeaningDetails,
  getLineMeaningText,
  getScriptTextFontClass,
  getScriptTextLang,
  isStructuralGurbaniHeadingLine,
  renderScriptText,
} from './readerDisplay'

const meaningLine: ScriptureLine = {
  verseId: 1, shabadId: 1, ang: 1, gurmukhi: 'ਸਤਿ ਨਾਮੁ ॥', transliteration: 'sat naam',
  translation_en: 'Standard meaning', translations_en: { bdb: 'Standard meaning' },
  translation_hi: '', translations_hi: {}, translation_pa: '', translations_pa: {},
}

describe('reader meaning attribution and availability', () => {
  beforeEach(() => useLanguageStore.setState({ punjabiSource: 'ss', hindiSource: 'ss' }))

  test('keeps fallback text and its actual source together when the preferred English source is missing', () => {
    expect(getLineMeaningDetails(meaningLine, 'en', 'ms')).toEqual({
      text: 'Standard meaning', actualSource: 'bdb', preferredSource: 'ms', preferredUnavailable: true,
    })
    expect(getLineMeaningText(meaningLine, 'en', 'ms')).toBe('Standard meaning')
  })

  test('ignores blank provider values when finding an available English meaning', () => {
    const line = { ...meaningLine, translation_en: '', translations_en: { bdb: '  ', ms: 'Available Manmohan Singh meaning' } }
    expect(getLineMeaningDetails(line, 'en', 'bdb')).toEqual({
      text: 'Available Manmohan Singh meaning', actualSource: 'ms', preferredSource: 'bdb', preferredUnavailable: true,
    })
  })

  test('reports the actual Punjabi and Hindi fallback sources instead of the selected unavailable source', () => {
    useLanguageStore.setState({ punjabiSource: 'ss', hindiSource: 'ss' })
    const line = { ...meaningLine, translations_pa: { ft: 'ਫ਼ਰੀਦਕੋਟ ਅਰਥ' }, translations_hi: { sts: 'हिंदी अर्थ' } }
    expect(getLineMeaningDetails(line, 'pa', 'bdb')).toEqual({ text: 'ਫ਼ਰੀਦਕੋਟ ਅਰਥ', actualSource: 'ft', preferredSource: 'ss', preferredUnavailable: true })
    expect(getLineMeaningDetails(line, 'hi', 'bdb')).toEqual({ text: 'हिंदी अर्थ', actualSource: 'sts', preferredSource: 'ss', preferredUnavailable: true })
  })

  test('distinguishes an unavailable requested layer from a layer the reader disabled', () => {
    expect(getLineMeaningDetails(meaningLine, 'hi', 'bdb')).toEqual({ text: '', actualSource: null, preferredSource: 'ss', preferredUnavailable: true })
    expect(getLineMeaningDetails(meaningLine, 'none', 'bdb')).toEqual({ text: '', actualSource: null, preferredSource: null, preferredUnavailable: false })
  })

  test('retains unattributed legacy meanings without inventing a provider or changing canonical source data', () => {
    const line = { ...meaningLine, translations_en: {} }
    const original = structuredClone(line)
    expect(getLineMeaningDetails(line, 'en', 'bdb')).toEqual({
      text: 'Standard meaning', actualSource: null, preferredSource: 'bdb', preferredUnavailable: true,
    })
    expect(line).toEqual(original)
  })
})

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
    { verseId: 29614, text: 'ਧਨਾਸਰੀ ਮਃ ੫ ਘਰੁ ੬ ਅਸਟਪਦੀ', heading: true },
    { verseId: 29615, text: 'ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥', heading: false },
    { verseId: 29616, text: 'ਜੋ ਜੋ ਜੂਨੀ ਆਇਓ ਤਿਹ ਤਿਹ ਉਰਝਾਇਓ ਮਾਣਸ ਜਨਮੁ ਸੰਜੋਗਿ ਪਾਇਆ ॥', heading: false },
  ])('classifies actual Oct 21 Hukamnama verse $verseId', ({ text, heading }) => {
    expect(isStructuralGurbaniHeadingLine(text)).toBe(heading)
  })

  test.each([
    'ਸਲੋਕ ਮਃ ੩ ॥',
    'ਮਃ ੩ ॥',
    'ਪਉੜੀ ॥',
    'ਪਉੜੀ ੫ ॥',
    'ਧਨਾਸਰੀ ਮਹਲਾ ੫ ਘਰੁ ੧੨',
    'ਰਾਗੁ ਗਉੜੀ ਦੀਪਕੀ ਮਹਲਾ ੧ ॥',
    'ਕਬਿਯੋ ਬਾਚ ਬੇਨਤੀ ਚੌਪਈ ॥',
    'ਟੋਡੀ ਬਾਣੀ ਭਗਤਾਂ ਕੀ',
  ])('recognizes BaniDB structure label %s', text => {
    expect(isStructuralGurbaniHeadingLine(text)).toBe(true)
  })

  test.each([
    '',
    'ਸਤਿ ਨਾਮੁ',
    'ਸਲੋਕੁ ਮਨਿ ਨਿਰਮਲ ਮੁਖੁ ਨਿਰਮਲ',
    'ਸਤਿ ਨਾਮੁ ਅਸਟਪਦੀ',
    'ਧਨਾਸਰੀ ਮਃ ੫ ਘਰੁ ੬ ਅਸਟਪਦੀ ਸਤਿ ਨਾਮੁ ॥',
    'ਉਤ ਤਾਕੈ ਉਤ ਤੇ ਉਤ ਪੇਖੈ ਆਵੈ ਲੋਭੀ ਫੇਰਿ ॥ ਰਹਾਉ ॥',
    'ਕੋਈ ਬੋਲੈ ਨਿਰਵਾ ਕੋਈ ਬੋਲੈ ਦੂਰਿ ॥',
    'ਟੋਡੀ ਬਾਣੀ ਭਗਤਾਂ ਕੀ ਸਤਿ ਨਾਮੁ ॥',
  ])('does not promote scripture content %s to a heading', text => {
    expect(isStructuralGurbaniHeadingLine(text)).toBe(false)
  })
})
