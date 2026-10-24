import { useLanguageStore } from '../store/language'
import type { EnglishSource, MeaningLanguage, ScriptureEntry, ScriptureLine } from '../types'
import { gurmukhiToHindi } from './gurmukhiToHindi'
import { getEntryEnglishText, getLineEnglishText } from './translations'

export function renderScriptText(text: string, scriptMode: 'gurmukhi' | 'devanagari'): string {
  return scriptMode === 'devanagari' ? gurmukhiToHindi(text) : text
}

export function getScriptTextLang(scriptMode: 'gurmukhi' | 'devanagari'): 'pa-Guru' | 'hi' {
  return scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'
}

export function getScriptTextFontClass(scriptMode: 'gurmukhi' | 'devanagari'): string {
  return scriptMode === 'devanagari'
    ? 'script-text-safe font-devanagari'
    : 'script-text-safe font-gurmukhi'
}

export function formatGurbaniText(
  text: string,
  options: {
    scriptMode: 'gurmukhi' | 'devanagari'
    larivaar?: boolean
    showVishraam?: boolean
    larivaarText?: string
  }
): string {
  const { scriptMode, larivaar = false, showVishraam = true, larivaarText } = options

  let next = text
  if (!showVishraam) {
    next = next.replace(/[।॥]/g, '').replace(/\s+/g, ' ').trim()
  }
  if (larivaar) {
    next = (larivaarText || next).replace(/\s+/g, '')
  }

  return renderScriptText(next, scriptMode)
}

export function formatGurbaniWord(
  text: string,
  options: {
    scriptMode: 'gurmukhi' | 'devanagari'
    showVishraam?: boolean
  }
): string {
  const { scriptMode, showVishraam = true } = options
  const next = showVishraam ? text : text.replace(/[।॥]/g, '')
  return renderScriptText(next, scriptMode)
}

export function isStructuralTitleLine(text: string): boolean {
  const compact = text
    .replace(/[।॥0-9੦-੯]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!compact) return true
  if (compact.length <= 8) return true

  return /^(ਪਉੜੀ|ਸਲੋਕ|ਮਹਲਾ|ਮਃ|ਰਹਾਉ|ਚਉਪਈ|ਚੌਪਈ|ਦੋਹਰਾ|ਸਵਈਆ|ਸਵੈਯਾ|ਅਸਟਪਦੀ|ਛੰਤ|ਵਾਰ)\b/.test(compact)
}

/**
 * Identifies standalone Gurbani structure labels that BaniDB sometimes returns
 * without header metadata. Keep this deliberately narrower than
 * `isStructuralTitleLine`: a short Gurbani verse, or a verse ending in
 * "ਰਹਾਉ", must still be treated as scripture content.
 */
export function isStructuralGurbaniHeadingLine(text: string): boolean {
  const compact = text
    .normalize('NFC')
    .replace(/[।॥|]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()

  if (!compact) return false

  const number = '[0-9੦-੯]+'
  const sectionHeading = new RegExp(
    `^(?:ਸਲੋਕੁ?|ਪਉੜੀ|ਅਸਟਪਦੀ|ਛੰਤ|ਵਾਰ|ਦੋਹਰਾ|ਚਉਪਈ|ਚੌਪਈ|ਸਵਈਆ|ਸਵੈਯਾ)(?:\\s+(?:(?:ਮਃ|ਮਹਲਾ)\\s+)?${number})?$`,
    'u'
  )
  if (sectionHeading.test(compact)) return true

  const numberedHeading = new RegExp(
    `^(?:ਮਃ|ਮਹਲਾ)\\s+${number}(?:\\s+(?:ਘਰ|ਘਰੁ)\\s+${number})?$`,
    'u'
  )
  if (numberedHeading.test(compact)) return true

  const words = compact.split(' ')
  if (words.length > 9) return false

  // Provider metadata occasionally leaves Bhagat-bani collection headings
  // unmarked (for example the October 24 Todee Hukamnama). Require the complete
  // heading form so a verse merely mentioning bani/bhagats remains scripture.
  if (/^(?:ਰਾਗੁ?\s+)?[\u0A00-\u0A7F]+(?:\s+[\u0A00-\u0A7F]+)?\s+ਬਾਣੀ\s+ਭਗਤਾਂ\s+ਕੀ$/u.test(compact)) return true

  // Raag and section titles may begin with a proper name (for example,
  // "ਧਨਾਸਰੀ") before their Mahala/Ghar metadata and a terminal form label.
  const metadataHeading = new RegExp(
    `^(?:.+\\s+)(?:ਮਃ|ਮਹਲਾ)\\s+${number}(?:\\s+(?:ਘਰ|ਘਰੁ)\\s+${number})?(?:\\s+ਅਸਟਪਦੀ)?$`,
    'u'
  )
  if (metadataHeading.test(compact)) return true

  // Dasam Bani section headings can include a short descriptive prefix.
  return words.length <= 6
    && /(?:^|\s)(?:ਚਉਪਈ|ਚੌਪਈ|ਦੋਹਰਾ|ਸਵਈਆ|ਸਵੈਯਾ)$/u.test(compact)
}

function getPreferredMappedText(
  translations: Record<string, string> | undefined,
  preferred: string,
  fallback: string
) {
  if (translations?.[preferred]?.trim()) return translations[preferred]

  const next = Object.values(translations ?? {}).find(text => Boolean(text?.trim()))
  return next ?? (fallback?.trim() ? fallback : '')
}

export function getLinePunjabiText(
  line: ScriptureLine,
  preferred = useLanguageStore.getState().punjabiSource
): string {
  return getPreferredMappedText(line.translations_pa, preferred, line.translation_pa)
}

export function getLineHindiText(
  line: ScriptureLine,
  preferred = useLanguageStore.getState().hindiSource
): string {
  return getPreferredMappedText(line.translations_hi, preferred, line.translation_hi)
}

export function getEntryMeaningText(
  entry: ScriptureEntry,
  meaningLanguage: MeaningLanguage,
  englishSource: EnglishSource
): string {
  if (meaningLanguage === 'none') return ''
  if (meaningLanguage === 'en') return getEntryEnglishText(entry, englishSource)
  if (meaningLanguage === 'hi') {
    const lines = entry.lines ?? []
    return lines.length > 0
      ? lines.map(line => getLineHindiText(line)).filter(Boolean).join(' ')
      : entry.translation_hi
  }

  const lines = entry.lines ?? []
  return lines.length > 0
    ? lines.map(line => getLinePunjabiText(line)).filter(Boolean).join(' ')
    : entry.translation_pa
}

export function getLineMeaningText(
  line: ScriptureLine,
  meaningLanguage: MeaningLanguage,
  englishSource: EnglishSource
): string {
  return getLineMeaningDetails(line, meaningLanguage, englishSource).text
}

export interface LineMeaningDetails {
  text: string
  actualSource: string | null
  preferredSource: string | null
  preferredUnavailable: boolean
}

/** Keep displayed text and its actual attribution together when a preferred source is absent. */
export function getLineMeaningDetails(
  line: ScriptureLine,
  meaningLanguage: MeaningLanguage,
  englishSource: EnglishSource,
): LineMeaningDetails {
  if (meaningLanguage === 'none') return { text: '', actualSource: null, preferredSource: null, preferredUnavailable: false }

  const language = useLanguageStore.getState()
  const preferred = meaningLanguage === 'en' ? englishSource
    : meaningLanguage === 'hi' ? language.hindiSource : language.punjabiSource
  const translations: Record<string, string | undefined> | undefined = meaningLanguage === 'en'
    ? { ...line.translations_en } : meaningLanguage === 'hi' ? line.translations_hi : line.translations_pa
  const sourceOrder = meaningLanguage === 'en'
    ? [preferred, 'bdb', 'ms', 'ssk']
    : [preferred, ...Object.keys(translations ?? {})]
  const actualSource = sourceOrder.find(source => Boolean(translations?.[source]?.trim())) ?? null
  const text = (meaningLanguage === 'en' ? getLineEnglishText(line, englishSource)
    : meaningLanguage === 'hi' ? getLineHindiText(line, preferred) : getLinePunjabiText(line, preferred)) ?? ''

  return {
    text: text.trim() ? text : '',
    actualSource,
    preferredSource: preferred,
    preferredUnavailable: !translations?.[preferred]?.trim(),
  }
}

export function isScriptureMeaningLanguage(value: MeaningLanguage): value is 'pa' | 'hi' {
  return value === 'pa' || value === 'hi'
}
