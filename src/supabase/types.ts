import type {
  EnglishSource,
  HindiSource,
  LearningGoal,
  LearningLevel,
  MeaningLanguage,
  OnboardingAudience,
  PunjabiSource,
  ReaderAlignment,
  ReaderLineSpacing,
  ScriptMode,
  SundarGutkaLength,
  UiLocale,
  VisraamSource,
  VocabEntry,
} from '../types'

export interface CloudSyncMetadata {
  id: string
  userId: string | null
  deviceId: string
  clientUpdatedAt: string
  deletedAt: string | null
}

export interface CloudProfileRecord extends CloudSyncMetadata {
  locale: UiLocale
  darkMode: boolean
  reader: {
    scriptMode: ScriptMode
    showTransliteration: boolean
    meaningLanguage: MeaningLanguage
    larivaar: boolean
    showVishraam: boolean
    lineSpacing: ReaderLineSpacing
    textAlign: ReaderAlignment
    fontSize: number
    englishSource: EnglishSource
    punjabiSource: PunjabiSource
    hindiSource: HindiSource
    visraamSource: VisraamSource
    sundarGutkaLengths: Record<string, SundarGutkaLength>
  }
  onboarding: {
    hasCompletedOnboarding: boolean
    learningLevel: LearningLevel
    audience: OnboardingAudience
    learningGoal: LearningGoal
    presentationMode: 'first-run' | 'overlay'
  }
}

export interface CloudBookmarkPayload {
  id: string
  type: 'shabad' | 'bani' | 'verse'
  title: string
  source: 'G' | 'D' | 'B' | 'A'
  ang: number
  shabadId?: number
  verseId?: number
  excerpt?: string
  description?: string
  savedAt: string
}

export interface CloudFavoritePayload {
  id: string
  title: string
  source: 'G' | 'D' | 'B' | 'A'
  ang: number
  shabadId?: number
  type: 'ang' | 'shabad' | 'bani'
  savedAt: string
}

export type CloudSavedItemKind = 'bookmark' | 'favorite'

export interface CloudSavedItemRecord extends CloudSyncMetadata {
  kind: CloudSavedItemKind
  naturalKey: string
  payload: CloudBookmarkPayload | CloudFavoritePayload
}

export interface CloudVocabRecord extends CloudSyncMetadata {
  naturalKey: string
  payload: VocabEntry
}

export type CloudLearningProgressScope =
  | 'study-progress'
  | 'reading-progress'
  | 'nitnem-state'

export interface CloudLearningProgressRecord extends CloudSyncMetadata {
  scope: CloudLearningProgressScope
  payload: Record<string, unknown>
}

export interface CloudActivityEvent {
  id: string
  userId: string | null
  deviceId: string
  eventType: string
  occurredAt: string
  clientUpdatedAt: string
  deletedAt: string | null
  payload: Record<string, unknown>
}

export interface CloudLocalSnapshot {
  version: 1
  deviceId: string
  profile: CloudProfileRecord
  savedItems: CloudSavedItemRecord[]
  vocabEntries: CloudVocabRecord[]
  learningProgress: CloudLearningProgressRecord[]
  activityEvents: CloudActivityEvent[]
}

export interface CloudRemoteSnapshot {
  profile?: CloudProfileRecord | null
  savedItems?: CloudSavedItemRecord[]
  vocabEntries?: CloudVocabRecord[]
  learningProgress?: CloudLearningProgressRecord[]
  activityEvents?: CloudActivityEvent[]
}

export interface MergeLocalStateResult {
  acknowledgedEventIds?: string[]
  mergedAt?: string | null
  snapshot?: CloudRemoteSnapshot | null
}

export interface CloudUserSummary {
  id: string
  email: string
  name: string | null
  providers: string[]
}

export type GenerateStudyMode =
  | 'explain-pankti'
  | 'reflect-hukamnama'
  | 'study-saved-word'

export interface GenerateStudyRequest {
  mode: GenerateStudyMode
  scripture: {
    title: string
    gurmukhi?: string
    transliteration?: string
    translation?: string
  }
  context?: Record<string, unknown>
}

export interface GenerateStudyResponse {
  mode: GenerateStudyMode
  title: string
  body: string
  bulletPoints: string[]
  reflectionPrompt: string | null
  guardrail: string
}
