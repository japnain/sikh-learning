export interface Word {
  gurmukhi: string
  transliteration: string
  meaning_en: string
  meaning_hi: string
  meaning_pa: string
}

export type EnglishSource = 'bdb' | 'ms' | 'ssk'
export type ScriptMode = 'gurmukhi' | 'devanagari'
export type MeaningLanguage = 'none' | 'en' | 'pa' | 'hi'
export type SearchMode = 'first-letters' | 'gurmukhi' | 'english' | 'transliteration'
export type LearningLevel = 'beginner' | 'familiar' | 'daily-reader'
export type VocabKind = 'word' | 'phrase'

export interface EnglishTranslations {
  bdb?: string
  ms?: string
  ssk?: string
}

export interface ScriptureLine {
  verseId: number
  shabadId: number
  ang: number
  originalAng?: number | null
  isHeader?: boolean
  gurmukhi: string
  transliteration: string
  translation_en: string
  translations_en: EnglishTranslations
  translation_hi: string
  translation_pa: string
}

export interface ScriptureEntry {
  id: string
  scripture: string
  ang: number
  source?: 'G' | 'D' | 'B' | 'A'
  shabadId?: number
  verseIds?: number[]
  sourceName?: string
  raag?: string
  writer?: string
  hukamnamaDate?: string
  lines?: ScriptureLine[]
  gurmukhi: string
  transliteration: string
  translation_en: string
  translation_hi: string
  translation_pa: string
  words: Word[]
}

export interface VocabEntry {
  kind?: VocabKind
  word: string
  transliteration: string
  meaning_en: string
  meaning_hi: string
  meaning_pa: string
  scripture: string
  sourceId: string
  savedAt: string
  context?: VocabContext
  review?: VocabReviewState
}

export interface StudiedEntry {
  id: string
  swipedAt: string
}

export interface Scripture {
  id: string
  name: string
  shortName: string
  sourceId: 'G' | 'D' | 'B' | 'A'
}

export interface VocabContext {
  scripture: string
  sourceId: string
  ang?: number
  shabadId?: number
  verseId?: number
  line?: string
}

export interface VocabReviewState {
  dueAt: string
  intervalDays: number
  reviewCount: number
  lastReviewedAt?: string
}

export interface LearningProgressState {
  masteredSymbols: string[]
  completedLessons: string[]
  practiceStreak: number
  lastPracticedOn?: string
  totalPracticeSessions: number
}

export interface LearningBridgeItem {
  id: string
  title: string
  scripture: string
  source: 'G' | 'D'
  ang: number
  gurmukhi: string
  transliteration: string
  meaning: string
  focus: string
}
