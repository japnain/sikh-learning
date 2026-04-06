import type { EnglishSource, MeaningLanguage, ScriptureEntry, ScriptureLine } from '../types'
import { gurmukhiToHindi } from './gurmukhiToHindi'
import { getEntryEnglishText, getLineEnglishText } from './translations'

export function renderScriptText(text: string, scriptMode: 'gurmukhi' | 'devanagari'): string {
  return scriptMode === 'devanagari' ? gurmukhiToHindi(text) : text
}

export function formatGurbaniText(
  text: string,
  options: {
    scriptMode: 'gurmukhi' | 'devanagari'
    larivaar?: boolean
    showVishraam?: boolean
  }
): string {
  const { scriptMode, larivaar = false, showVishraam = true } = options

  let next = text
  if (!showVishraam) {
    next = next.replace(/[।॥]/g, '').replace(/\s+/g, ' ').trim()
  }
  if (larivaar) {
    next = next.replace(/\s+/g, '')
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

export function getEntryMeaningText(
  entry: ScriptureEntry,
  meaningLanguage: MeaningLanguage,
  englishSource: EnglishSource
): string {
  if (meaningLanguage === 'none') return ''
  if (meaningLanguage === 'en') return getEntryEnglishText(entry, englishSource)
  if (meaningLanguage === 'hi') return entry.translation_hi
  return entry.translation_pa
}

export function getLineMeaningText(
  line: ScriptureLine,
  meaningLanguage: MeaningLanguage,
  englishSource: EnglishSource
): string {
  if (meaningLanguage === 'none') return ''
  if (meaningLanguage === 'en') return getLineEnglishText(line, englishSource)
  if (meaningLanguage === 'hi') return line.translation_hi
  return line.translation_pa
}

export function isScriptureMeaningLanguage(value: MeaningLanguage): value is 'pa' | 'hi' {
  return value === 'pa' || value === 'hi'
}
