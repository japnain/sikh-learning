import type {
  EnglishSource,
  EnglishTranslations,
  HindiSource,
  LearningGoal,
  LearningLevel,
  OnboardingAudience,
  MeaningLanguage,
  PunjabiSource,
  ReaderAlignment,
  ReaderLineSpacing,
  SearchMode,
  ScriptureEntry,
  ScriptureLine,
  ScriptMode,
  UiLocale,
  VisraamSource,
} from '../types'

type LocaleLabelMaps = {
  englishSources: Record<EnglishSource, string>
  punjabiSources: Record<string, string>
  hindiSources: Record<string, string>
  visraamSources: Record<VisraamSource, string>
  scriptModes: Record<ScriptMode, string>
  meaningLanguages: Record<MeaningLanguage, string>
  lineSpacing: Record<ReaderLineSpacing, string>
  textAlignment: Record<ReaderAlignment, string>
  learningLevels: Record<LearningLevel, string>
  uiLocales: Record<UiLocale, string>
  onboardingAudience: Record<OnboardingAudience, string>
  learningGoals: Record<LearningGoal, string>
  searchModes: Record<SearchMode, string>
}

const LABELS_BY_LOCALE: Record<UiLocale, LocaleLabelMaps> = {
  en: {
    englishSources: {
      bdb: 'Standard',
      ms: 'Manmohan Singh',
      ssk: 'Sant Singh Khalsa',
    },
    punjabiSources: {
      ss: 'Steek',
      ft: 'Faridkot',
      bdb: 'BaniDB',
      ms: 'Manmohan Singh',
      pss: 'PSS',
    },
    hindiSources: {
      ss: 'Steek',
      sts: 'STS',
    },
    visraamSources: {
      sttm: 'STTM',
      igurbani: 'iGurbani',
      sttm2: 'STTM 2',
    },
    scriptModes: {
      gurmukhi: 'Gurmukhi',
      devanagari: 'Hindi',
    },
    meaningLanguages: {
      none: 'Off',
      en: 'English',
      pa: 'Punjabi',
      hi: 'Hindi',
    },
    lineSpacing: {
      compact: 'Compact',
      relaxed: 'Relaxed',
    },
    textAlignment: {
      left: 'Left',
      center: 'Center',
    },
    learningLevels: {
      beginner: 'Beginner',
      familiar: 'Familiar',
      'daily-reader': 'Daily Reader',
    },
    uiLocales: {
      en: 'English',
      pa: 'Punjabi',
      hi: 'Hindi',
    },
    onboardingAudience: {
      child: 'Child',
      teen: 'Teen',
      adult: 'Adult',
    },
    learningGoals: {
      read: 'I want to read',
      understand: 'I want to understand',
      habit: 'I want to build habit',
    },
    searchModes: {
      'first-letters': 'First Letters',
      'first-letters-anywhere': 'Anywhere',
      gurmukhi: 'Gurmukhi',
      english: 'English',
      transliteration: 'Romanized',
      ang: 'Ang / Vaar / Page',
      'auto-detect': 'Auto',
    },
  },
  pa: {
    englishSources: {
      bdb: 'ਮਿਆਰੀ',
      ms: 'ਮਨਮੋਹਨ ਸਿੰਘ',
      ssk: 'ਸੰਤ ਸਿੰਘ ਖਾਲਸਾ',
    },
    punjabiSources: {
      ss: 'ਟੀਕਾ',
      ft: 'ਫਰੀਦਕੋਟ',
      bdb: 'ਬਾਣੀ ਡੀਬੀ',
      ms: 'ਮਨਮੋਹਨ ਸਿੰਘ',
      pss: 'ਪੀ.ਐੱਸ.ਐੱਸ.',
    },
    hindiSources: {
      ss: 'ਟੀਕਾ',
      sts: 'ਐਸ.ਟੀ.ਐੱਸ.',
    },
    visraamSources: {
      sttm: 'ਐਸ.ਟੀ.ਟੀ.ਐਮ.',
      igurbani: 'ਆਈ ਗੁਰਬਾਣੀ',
      sttm2: 'ਐਸ.ਟੀ.ਟੀ.ਐਮ. ੨',
    },
    scriptModes: {
      gurmukhi: 'ਗੁਰਮੁਖੀ',
      devanagari: 'ਹਿੰਦੀ',
    },
    meaningLanguages: {
      none: 'ਬੰਦ',
      en: 'ਅੰਗਰੇਜ਼ੀ',
      pa: 'ਪੰਜਾਬੀ',
      hi: 'ਹਿੰਦੀ',
    },
    lineSpacing: {
      compact: 'ਤੰਗ',
      relaxed: 'ਖੁੱਲ੍ਹਾ',
    },
    textAlignment: {
      left: 'ਖੱਬੇ',
      center: 'ਵਿਚਕਾਰ',
    },
    learningLevels: {
      beginner: 'ਸ਼ੁਰੂਆਤੀ',
      familiar: 'ਜਾਣੂ',
      'daily-reader': 'ਰੋਜ਼ਾਨਾ ਪਾਠਕ',
    },
    uiLocales: {
      en: 'ਅੰਗਰੇਜ਼ੀ',
      pa: 'ਪੰਜਾਬੀ',
      hi: 'ਹਿੰਦੀ',
    },
    onboardingAudience: {
      child: 'ਬੱਚਾ',
      teen: 'ਕਿਸ਼ੋਰ',
      adult: 'ਵਿਆਸਕ',
    },
    learningGoals: {
      read: 'ਮੈਂ ਪੜ੍ਹਨਾ ਚਾਹੁੰਦਾ/ਚਾਹੁੰਦੀ ਹਾਂ',
      understand: 'ਮੈਂ ਸਮਝਣਾ ਚਾਹੁੰਦਾ/ਚਾਹੁੰਦੀ ਹਾਂ',
      habit: 'ਮੈਂ ਆਦਤ ਬਣਾਉਣੀ ਹੈ',
    },
    searchModes: {
      'first-letters': 'ਪਹਿਲੇ ਅੱਖਰ',
      'first-letters-anywhere': 'ਕਿਤੇ ਵੀ',
      gurmukhi: 'ਗੁਰਮੁਖੀ',
      english: 'ਅੰਗਰੇਜ਼ੀ',
      transliteration: 'ਰੋਮਨ',
      ang: 'ਅੰਗ / ਵਾਰ / ਸਫ਼ਾ',
      'auto-detect': 'ਆਟੋ',
    },
  },
  hi: {
    englishSources: {
      bdb: 'मानक',
      ms: 'मनमोहन सिंह',
      ssk: 'संत सिंह खालसा',
    },
    punjabiSources: {
      ss: 'टीका',
      ft: 'फरीदकोट',
      bdb: 'बानीडीबी',
      ms: 'मनमोहन सिंह',
      pss: 'पीएसएस',
    },
    hindiSources: {
      ss: 'टीका',
      sts: 'एसटीएस',
    },
    visraamSources: {
      sttm: 'एसटीटीएम',
      igurbani: 'आईगुरबानी',
      sttm2: 'एसटीटीएम 2',
    },
    scriptModes: {
      gurmukhi: 'गुरमुखी',
      devanagari: 'हिंदी',
    },
    meaningLanguages: {
      none: 'बंद',
      en: 'अंग्रेज़ी',
      pa: 'पंजाबी',
      hi: 'हिंदी',
    },
    lineSpacing: {
      compact: 'सघन',
      relaxed: 'आरामदायक',
    },
    textAlignment: {
      left: 'बाएँ',
      center: 'मध्य',
    },
    learningLevels: {
      beginner: 'शुरुआती',
      familiar: 'परिचित',
      'daily-reader': 'दैनिक पाठक',
    },
    uiLocales: {
      en: 'अंग्रेज़ी',
      pa: 'पंजाबी',
      hi: 'हिंदी',
    },
    onboardingAudience: {
      child: 'बच्चा',
      teen: 'किशोर',
      adult: 'वयस्क',
    },
    learningGoals: {
      read: 'मैं पढ़ना चाहता/चाहती हूँ',
      understand: 'मैं समझना चाहता/चाहती हूँ',
      habit: 'मैं आदत बनाना चाहता/चाहती हूँ',
    },
    searchModes: {
      'first-letters': 'पहले अक्षर',
      'first-letters-anywhere': 'कहीं भी',
      gurmukhi: 'गुरमुखी',
      english: 'अंग्रेज़ी',
      transliteration: 'रोमन',
      ang: 'अंग / वार / पृष्ठ',
      'auto-detect': 'ऑटो',
    },
  },
}

export const ENGLISH_SOURCE_LABELS = LABELS_BY_LOCALE.en.englishSources
export const SCRIPT_MODE_LABELS = LABELS_BY_LOCALE.en.scriptModes
export const MEANING_LANGUAGE_LABELS = LABELS_BY_LOCALE.en.meaningLanguages
export const LINE_SPACING_LABELS = LABELS_BY_LOCALE.en.lineSpacing
export const TEXT_ALIGNMENT_LABELS = LABELS_BY_LOCALE.en.textAlignment
export const LEARNING_LEVEL_LABELS = LABELS_BY_LOCALE.en.learningLevels
export const UI_LOCALE_LABELS = LABELS_BY_LOCALE.en.uiLocales
export const ONBOARDING_AUDIENCE_LABELS = LABELS_BY_LOCALE.en.onboardingAudience
export const LEARNING_GOAL_LABELS = LABELS_BY_LOCALE.en.learningGoals
export const SEARCH_MODE_LABELS = LABELS_BY_LOCALE.en.searchModes

export function getEnglishSourceLabels(locale: UiLocale): Record<EnglishSource, string> {
  return LABELS_BY_LOCALE[locale].englishSources
}

export function getPunjabiSourceLabels(locale: UiLocale): Record<string, string> {
  return LABELS_BY_LOCALE[locale].punjabiSources
}

export function getHindiSourceLabels(locale: UiLocale): Record<string, string> {
  return LABELS_BY_LOCALE[locale].hindiSources
}

export function getVisraamSourceLabels(locale: UiLocale): Record<VisraamSource, string> {
  return LABELS_BY_LOCALE[locale].visraamSources
}

export function getScriptModeLabels(locale: UiLocale): Record<ScriptMode, string> {
  return LABELS_BY_LOCALE[locale].scriptModes
}

export function getMeaningLanguageLabels(locale: UiLocale): Record<MeaningLanguage, string> {
  return LABELS_BY_LOCALE[locale].meaningLanguages
}

export function getLineSpacingLabels(locale: UiLocale): Record<ReaderLineSpacing, string> {
  return LABELS_BY_LOCALE[locale].lineSpacing
}

export function getTextAlignmentLabels(locale: UiLocale): Record<ReaderAlignment, string> {
  return LABELS_BY_LOCALE[locale].textAlignment
}

export function getLearningLevelLabels(locale: UiLocale): Record<LearningLevel, string> {
  return LABELS_BY_LOCALE[locale].learningLevels
}

export function getUiLocaleLabels(locale: UiLocale): Record<UiLocale, string> {
  return LABELS_BY_LOCALE[locale].uiLocales
}

export function getOnboardingAudienceLabels(locale: UiLocale): Record<OnboardingAudience, string> {
  return LABELS_BY_LOCALE[locale].onboardingAudience
}

export function getLearningGoalLabels(locale: UiLocale): Record<LearningGoal, string> {
  return LABELS_BY_LOCALE[locale].learningGoals
}

export function getSearchModeLabels(locale: UiLocale): Record<SearchMode, string> {
  return LABELS_BY_LOCALE[locale].searchModes
}

export function getPunjabiSourceLabel(locale: UiLocale, source: PunjabiSource): string {
  return LABELS_BY_LOCALE[locale].punjabiSources[source] ?? source.toUpperCase()
}

export function getHindiSourceLabel(locale: UiLocale, source: HindiSource): string {
  return LABELS_BY_LOCALE[locale].hindiSources[source] ?? source.toUpperCase()
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
