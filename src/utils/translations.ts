import type {
  EnglishSource,
  EnglishTranslations,
  LearningGoal,
  LearningLevel,
  OnboardingAudience,
  MeaningLanguage,
  ReaderAlignment,
  ReaderLineSpacing,
  SearchMode,
  ScriptureEntry,
  ScriptureLine,
  ScriptMode,
  UiLocale,
} from '../types'

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

export const LINE_SPACING_LABELS: Record<ReaderLineSpacing, string> = {
  compact: 'Compact',
  relaxed: 'Relaxed',
}

export const TEXT_ALIGNMENT_LABELS: Record<ReaderAlignment, string> = {
  left: 'Left',
  center: 'Center',
}

export const LEARNING_LEVEL_LABELS: Record<LearningLevel, string> = {
  beginner: 'Beginner',
  familiar: 'Familiar',
  'daily-reader': 'Daily Reader',
}

export const UI_LOCALE_LABELS: Record<UiLocale, string> = {
  en: 'English',
  pa: 'Punjabi',
  hi: 'Hindi',
}

export const ONBOARDING_AUDIENCE_LABELS: Record<OnboardingAudience, string> = {
  child: 'Child',
  teen: 'Teen',
  adult: 'Adult',
}

export const LEARNING_GOAL_LABELS: Record<LearningGoal, string> = {
  read: 'I want to read',
  understand: 'I want to understand',
  habit: 'I want to build habit',
}

export const SEARCH_MODE_LABELS: Record<SearchMode, string> = {
  'first-letters': 'First Letters',
  'first-letters-anywhere': 'Anywhere',
  gurmukhi: 'Gurmukhi',
  english: 'English',
  transliteration: 'Romanized',
  ang: 'Ang / Page',
  'auto-detect': 'Auto',
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
