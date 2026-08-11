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
import type { Bookmark } from '../store/bookmarks'
import type { FavoriteItem } from '../store/favorites'

export interface CloudSyncMetadata {
  id: string
  userId: string | null
  deviceId: string
  clientUpdatedAt: string
  /**
   * The last server version observed by this device. A null value marks a
   * record that has never been reconciled with the account.
   */
  baseUpdatedAt: string | null
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

export type CloudBookmarkPayload = Bookmark

export type CloudFavoritePayload = FavoriteItem

export type CloudSavedItemKind = 'bookmark' | 'favorite'

export interface CloudSavedItemRecord extends CloudSyncMetadata {
  kind: CloudSavedItemKind
  naturalKey: string
  payload: CloudBookmarkPayload | CloudFavoritePayload | null
}

export interface CloudVocabRecord extends CloudSyncMetadata {
  naturalKey: string
  payload: VocabEntry | null
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
  version: 3
  deviceId: string
  profile: CloudProfileRecord
  savedItems: CloudSavedItemRecord[]
  vocabEntries: CloudVocabRecord[]
  learningProgress: CloudLearningProgressRecord[]
  activityEvents: CloudActivityEvent[]
}

export interface CloudRemoteSnapshot {
  version: 3
  generatedAt: string
  profile?: CloudProfileRecord | null
  savedItems?: CloudSavedItemRecord[]
  vocabEntries?: CloudVocabRecord[]
  learningProgress?: CloudLearningProgressRecord[]
  activityEvents?: CloudActivityEvent[]
}

export interface MergeLocalStateResult {
  version?: 3
  complete?: boolean
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
