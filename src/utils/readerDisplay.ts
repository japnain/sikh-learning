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

export function getScriptTextFontClass(scriptMode: 'gurmukhi' | 'devanagari'): 'font-gurmukhi' | 'font-sans' {
  return scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'
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

function getPreferredMappedText(
  translations: Record<string, string> | undefined,
  preferred: string,
  fallback: string
) {
  if (translations?.[preferred]) return translations[preferred]

  const next = Object.values(translations ?? {}).find(Boolean)
  return next ?? fallback
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
  if (meaningLanguage === 'none') return ''
  if (meaningLanguage === 'en') return getLineEnglishText(line, englishSource)
  if (meaningLanguage === 'hi') return getLineHindiText(line)
  return getLinePunjabiText(line)
}

export function isScriptureMeaningLanguage(value: MeaningLanguage): value is 'pa' | 'hi' {
  return value === 'pa' || value === 'hi'
}
