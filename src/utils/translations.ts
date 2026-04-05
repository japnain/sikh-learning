import type { EnglishSource, EnglishTranslations, LearningLevel, MeaningLanguage, ScriptureEntry, ScriptureLine, ScriptMode } from '../types'

export const ENGLISH_SOURCE_LABELS: Record<EnglishSource, string> = {
  bdb: 'BaniDB',
  ms: 'Manmohan Singh',
  ssk: 'Sant Singh Khalsa',
}

export const SCRIPT_MODE_LABELS: Record<ScriptMode, string> = {
  gurmukhi: 'Gurmukhi',
  devanagari: 'Hindi',
}

export const MEANING_LANGUAGE_LABELS: Record<MeaningLanguage, string> = {
  none: 'Off',
  en: 'English',
  pa: 'Punjabi',
  hi: 'Hindi',
}

export const LEARNING_LEVEL_LABELS: Record<LearningLevel, string> = {
  beginner: 'Beginner',
  familiar: 'Familiar',
  'daily-reader': 'Daily Reader',
}

export function getPreferredEnglishText(
  translations: EnglishTranslations | undefined,
  preferred: EnglishSource
): string {
  if (!translations) return ''

  return (
    translations[preferred]
    ?? translations.bdb
    ?? translations.ms
    ?? translations.ssk
    ?? ''
  )
}

export function getEntryEnglishText(entry: ScriptureEntry, preferred: EnglishSource): string {
  const lines = entry.lines ?? []
  if (lines.length === 0) {
    return entry.translation_en
  }

  return lines
    .map(line => getPreferredEnglishText(line.translations_en, preferred))
    .filter(Boolean)
    .join(' ')
}

export function getLineEnglishText(line: ScriptureLine, preferred: EnglishSource): string {
  return getPreferredEnglishText(line.translations_en, preferred) || line.translation_en
}
