export interface Word {
  gurmukhi: string
  transliteration: string
  meaning_en: string
  meaning_hi: string
  meaning_pa: string
}

export interface MahanKoshEntry {
  id: number
  word: string
  searchKey: string
  transliteration: string
  roman: string
  hindi: string
  description: string
  description_hi: string
  exactMatch: boolean
  sourceUrl: string
}

export type EnglishSource = 'bdb' | 'ms' | 'ssk'
export type ScriptMode = 'gurmukhi' | 'devanagari'
export type MeaningLanguage = 'none' | 'en' | 'pa' | 'hi'
export type ReaderLineSpacing = 'compact' | 'relaxed'
export type ReaderAlignment = 'left' | 'center'
export type SearchMode =
  | 'first-letters'
  | 'first-letters-anywhere'
  | 'gurmukhi'
  | 'english'
  | 'transliteration'
  | 'ang'
  | 'auto-detect'
export type LearningLevel = 'beginner' | 'familiar' | 'daily-reader'
export type VocabKind = 'word' | 'phrase'
export type UiLocale = 'en' | 'pa' | 'hi'
export type OnboardingAudience = 'child' | 'teen' | 'adult'
export type LearningGoal = 'read' | 'understand' | 'habit'
export type LearningSkillKind = 'symbol' | 'sound' | 'pattern' | 'guided-reading' | 'comprehension'
export type GuidedJourneyStepType = 'learn' | 'guided' | 'study' | 'review'

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
  skills?: Record<string, LearningSkillProgress>
  lessonProgress?: Record<string, LearningLessonProgress>
  assessmentHistory?: LearningAssessmentRecord[]
  journeys?: Record<string, GuidedJourneyProgress>
  activeJourneyId?: string | null
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

export interface LearningSkillProgress {
  kind: LearningSkillKind
  mastery: number
  attempts: number
  successes: number
  lastReviewedOn?: string
}

export interface LearningLessonProgress {
  attempts: number
  bestScore: number
  completedAt?: string
  lastPracticedAt?: string
}

export interface LearningAssessmentRecord {
  lessonId: string
  score: number
  skillIds: string[]
  recordedAt: string
}

export interface FoundationModule {
  id: string
  title: string
  summary: string
  focus: string
  lessonIds: string[]
  symbolGroups: string[][]
}

export interface PhonicsDrill {
  id: string
  title: string
  prompt: string
  answer: string
  contrast: string
  explanation: string
  skillIds: string[]
}

export interface DecodingDrill {
  id: string
  title: string
  parts: string[]
  combined: string
  transliteration: string
  meaning: string
  skillIds: string[]
}

export interface GuidedReadingExercise {
  id: string
  title: string
  scripture: string
  source: 'G' | 'D'
  ang: number
  gurmukhi: string
  transliteration: string
  meaning: string
  supportHint: string
  keywords: string[]
  skillIds: string[]
}

export interface ComprehensionExercise {
  id: string
  guidedExerciseId: string
  question: string
  options: string[]
  answer: string
  explanation: string
  skillIds: string[]
}

export interface GuidedJourneyStep {
  id: string
  title: string
  detail: string
  type: GuidedJourneyStepType
  track?: 'foundations' | 'phonics' | 'decoding' | 'guided' | 'comprehension'
  lessonId?: string
  guidedExerciseId?: string
  source?: 'G' | 'D'
  ang?: number
  baniTitle?: string
}

export interface GuidedJourney {
  id: string
  title: string
  subtitle: string
  description: string
  source: 'G' | 'D'
  startAng: number
  steps: GuidedJourneyStep[]
}

export interface GuidedJourneyProgress {
  startedAt: string
  completedStepIds: string[]
  lastTouchedAt: string
  completedAt?: string
}
