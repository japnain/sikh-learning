import { useBookmarksStore } from '../store/bookmarks'
import { useFavoritesStore } from '../store/favorites'
import { useLanguageStore } from '../store/language'
import { useLearningStore } from '../store/learning'
import { useLocaleStore } from '../store/locale'
import { useNitemStore } from '../store/nitnem'
import { useOnboardingStore } from '../store/onboarding'
import { useProgressStore } from '../store/progress'
import { useReadingProgressStore } from '../store/readingProgress'
import { useActivityEventsStore } from '../store/activityEvents'
import { DEFAULT_SUNDAR_GUTKA_LENGTHS, useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { useThemeStore } from '../store/theme'
import { useVocabStore } from '../store/vocab'
import { getNaamrasDeviceId } from './device'
import { buildBookmarkNaturalKey, buildFavoriteNaturalKey, buildSavedLearnNaturalKey } from './savedItemKeys'
import type {
  CloudBookmarkPayload,
  CloudFavoritePayload,
  CloudLearningProgressRecord,
  CloudLocalSnapshot,
  CloudProfileRecord,
  CloudRemoteSnapshot,
  CloudSavedItemRecord,
  CloudSavedLearnItemPayload,
  CloudVocabRecord,
} from './types'

const SNAPSHOT_METADATA_STORAGE_KEY = 'naamras-cloud-sync-export-metadata'

type SnapshotMetadataRecord = {
  hash: string
  clientUpdatedAt: string
}

type SnapshotMetadataMap = Record<string, SnapshotMetadataRecord>

function createMetadata(id: string, clientUpdatedAt: string, deletedAt: string | null = null) {
  return {
    id,
    userId: null,
    deviceId: getNaamrasDeviceId(),
    clientUpdatedAt,
    deletedAt,
  }
}

function canUseStorage() {
  return typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined'
}

function readSnapshotMetadata(): SnapshotMetadataMap {
  if (!canUseStorage()) return {}

  try {
    const raw = globalThis.localStorage.getItem(SNAPSHOT_METADATA_STORAGE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed as SnapshotMetadataMap : {}
  } catch {
    return {}
  }
}

function writeSnapshotMetadata(metadata: SnapshotMetadataMap) {
  if (!canUseStorage()) return

  try {
    globalThis.localStorage.setItem(SNAPSHOT_METADATA_STORAGE_KEY, JSON.stringify(metadata))
  } catch {
    // Ignore storage pressure and keep the snapshot export responsive.
  }
}

function serializeMetadataPayload(payload: unknown) {
  return JSON.stringify(payload)
}

function resolveGeneratedTimestamp(metadata: SnapshotMetadataMap, key: string, payload: unknown) {
  const hash = serializeMetadataPayload(payload)
  const previous = metadata[key]
  if (previous?.hash === hash) {
    return previous.clientUpdatedAt
  }

  const clientUpdatedAt = new Date().toISOString()
  metadata[key] = {
    hash,
    clientUpdatedAt,
  }
  return clientUpdatedAt
}

function syncAuthoritativeTimestamp(
  metadata: SnapshotMetadataMap,
  key: string,
  payload: unknown,
  clientUpdatedAt: string
) {
  metadata[key] = {
    hash: serializeMetadataPayload(payload),
    clientUpdatedAt,
  }
  return clientUpdatedAt
}

function normalizeVocabWord(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function buildVocabNaturalKey(record: CloudVocabRecord['payload']) {
  return `${record.kind ?? 'word'}:${normalizeVocabWord(record.word)}`
}

function extractProfileRecord(metadata: SnapshotMetadataMap): CloudProfileRecord {
  const locale = useLocaleStore.getState().locale
  const darkMode = useThemeStore.getState().dark
  const language = useLanguageStore.getState()
  const onboarding = useOnboardingStore.getState()
  const sundarGutkaLengths = useSundarGutkaLengthStore.getState().lengths

  const reader = {
    scriptMode: language.scriptMode,
    showTransliteration: language.showTransliteration,
    meaningLanguage: language.meaningLanguage,
    larivaar: language.larivaar,
    showVishraam: language.showVishraam,
    lineSpacing: language.lineSpacing,
    textAlign: language.textAlign,
    fontSize: language.fontSize,
    englishSource: language.englishSource,
    sundarGutkaLengths,
  }
  const onboardingState = {
    hasCompletedOnboarding: onboarding.hasCompletedOnboarding,
    learningLevel: onboarding.learningLevel,
    audience: onboarding.audience,
    learningGoal: onboarding.learningGoal,
    presentationMode: onboarding.presentationMode,
  }
  const clientUpdatedAt = resolveGeneratedTimestamp(metadata, 'profile', {
    locale,
    darkMode,
    reader,
    onboarding: onboardingState,
  })

  return {
    ...createMetadata('profile', clientUpdatedAt),
    locale,
    darkMode,
    reader,
    onboarding: onboardingState,
  }
}

function extractSavedItems(metadata: SnapshotMetadataMap): CloudSavedItemRecord[] {
  const learningState = useLearningStore.getState().learnState
  const bookmarkRecords = useBookmarksStore.getState().bookmarks.map((bookmark) => {
    const payload: CloudBookmarkPayload = {
      ...bookmark,
    }
    const clientUpdatedAt = syncAuthoritativeTimestamp(metadata, bookmark.id, payload, bookmark.savedAt)

    return {
      ...createMetadata(bookmark.id, clientUpdatedAt),
      kind: 'bookmark' as const,
      naturalKey: buildBookmarkNaturalKey(payload),
      payload,
    }
  })

  const favoriteRecords = useFavoritesStore.getState().favorites.map((favorite) => {
    const payload: CloudFavoritePayload = {
      ...favorite,
    }
    const clientUpdatedAt = syncAuthoritativeTimestamp(metadata, favorite.id, payload, favorite.savedAt)

    return {
      ...createMetadata(favorite.id, clientUpdatedAt),
      kind: 'favorite' as const,
      naturalKey: buildFavoriteNaturalKey(payload),
      payload,
    }
  })

  const savedLearnRecords = learningState.savedItemIds.map((itemId) => {
    const viewedAt = learningState.viewedItems.find(item => item.itemId === itemId)?.viewedAt
    const savedAt = viewedAt
      ? syncAuthoritativeTimestamp(metadata, `learn-save:${itemId}`, { itemId }, viewedAt)
      : resolveGeneratedTimestamp(metadata, `learn-save:${itemId}`, { itemId })
    const payload: CloudSavedLearnItemPayload = {
      itemId,
      savedAt,
    }

    return {
      ...createMetadata(`learn-save:${itemId}`, savedAt),
      kind: 'learn-item' as const,
      naturalKey: buildSavedLearnNaturalKey(itemId),
      payload,
    }
  })

  return [...bookmarkRecords, ...favoriteRecords, ...savedLearnRecords]
}

function extractVocabEntries(metadata: SnapshotMetadataMap): CloudVocabRecord[] {
  return useVocabStore.getState().vocab.map(entry => {
    const naturalKey = buildVocabNaturalKey(entry)
    const clientUpdatedAt = syncAuthoritativeTimestamp(
      metadata,
      naturalKey,
      entry,
      entry.review?.lastReviewedAt ?? entry.savedAt
    )

    return {
      ...createMetadata(naturalKey, clientUpdatedAt),
      naturalKey,
      payload: entry,
    }
  })
}

function extractLearningProgress(metadata: SnapshotMetadataMap): CloudLearningProgressRecord[] {
  const learning = useLearningStore.getState()
  const progress = useProgressStore.getState()
  const readingProgress = useReadingProgressStore.getState()
  const nitnem = useNitemStore.getState()

  const learningPayload = {
    masteredSymbols: learning.masteredSymbols,
    completedLessons: learning.completedLessons,
    practiceStreak: learning.practiceStreak,
    lastPracticedOn: learning.lastPracticedOn,
    totalPracticeSessions: learning.totalPracticeSessions,
    streakCalendar: learning.streakCalendar,
    longestStreak: learning.longestStreak,
    earnedMilestoneIds: learning.earnedMilestoneIds,
    pendingMilestoneId: learning.pendingMilestoneId,
    dailyLesson: learning.dailyLesson,
    skills: learning.skills,
    lessonProgress: learning.lessonProgress,
    assessmentHistory: learning.assessmentHistory,
    journeys: learning.journeys,
    activeJourneyId: learning.activeJourneyId,
    activeProgramId: learning.activeProgramId,
    programProgress: learning.programProgress,
    queuedReviewModuleIds: learning.queuedReviewModuleIds,
    placementResult: learning.placementResult,
    lastLearnActivity: learning.lastLearnActivity,
    grammarNotesSeen: learning.grammarNotesSeen,
    masteredWordFamilyIds: learning.masteredWordFamilyIds,
    themePathProgress: learning.themePathProgress,
    completedThemePathIds: learning.completedThemePathIds,
    learnState: learning.learnState,
  }
  const studyProgressPayload = {
    studied: progress.studied,
    reviewQueue: progress.reviewQueue,
    lastStudied: progress.lastStudied,
    currentSession: progress.currentSession,
  }
  const readingProgressPayload = {
    progress: readingProgress.progress,
  }
  const nitnemStatePayload = {
    completedDate: nitnem.completedDate,
    completedIds: nitnem.completedIds,
    selectedIds: nitnem.selectedIds,
  }

  const learningUpdatedAt = resolveGeneratedTimestamp(metadata, 'learning-progress:learning-state', learningPayload)
  const studyProgressUpdatedAt = resolveGeneratedTimestamp(metadata, 'learning-progress:study-progress', studyProgressPayload)
  const readingProgressUpdatedAt = resolveGeneratedTimestamp(
    metadata,
    'learning-progress:reading-progress',
    readingProgressPayload
  )
  const nitnemUpdatedAt = resolveGeneratedTimestamp(metadata, 'learning-progress:nitnem-state', nitnemStatePayload)

  return [
    {
      ...createMetadata('learning-state', learningUpdatedAt),
      scope: 'learning-state',
      payload: learningPayload,
    },
    {
      ...createMetadata('study-progress', studyProgressUpdatedAt),
      scope: 'study-progress',
      payload: studyProgressPayload,
    },
    {
      ...createMetadata('reading-progress', readingProgressUpdatedAt),
      scope: 'reading-progress',
      payload: readingProgressPayload,
    },
    {
      ...createMetadata('nitnem-state', nitnemUpdatedAt),
      scope: 'nitnem-state',
      payload: nitnemStatePayload,
    },
  ]
}

export function exportLocalSnapshot(): CloudLocalSnapshot {
  const metadata = readSnapshotMetadata()
  const snapshot: CloudLocalSnapshot = {
    version: 1,
    deviceId: getNaamrasDeviceId(),
    profile: extractProfileRecord(metadata),
    savedItems: extractSavedItems(metadata),
    vocabEntries: extractVocabEntries(metadata),
    learningProgress: extractLearningProgress(metadata),
    activityEvents: useActivityEventsStore.getState().pendingEvents,
  }
  writeSnapshotMetadata(metadata)
  return snapshot
}

function syncRemoteSnapshotMetadata(snapshot: CloudRemoteSnapshot) {
  const metadata = readSnapshotMetadata()

  if (snapshot.profile) {
    syncAuthoritativeTimestamp(metadata, snapshot.profile.id, {
      locale: snapshot.profile.locale,
      darkMode: snapshot.profile.darkMode,
      reader: snapshot.profile.reader,
      onboarding: snapshot.profile.onboarding,
    }, snapshot.profile.clientUpdatedAt)
  }

  for (const record of snapshot.savedItems ?? []) {
    const metadataKey = record.kind === 'learn-item'
      ? `learn-save:${(record.payload as CloudSavedLearnItemPayload).itemId}`
      : record.id
    const metadataPayload = record.kind === 'learn-item'
      ? { itemId: (record.payload as CloudSavedLearnItemPayload).itemId }
      : record.payload
    syncAuthoritativeTimestamp(metadata, metadataKey, metadataPayload, record.clientUpdatedAt)
  }

  for (const record of snapshot.vocabEntries ?? []) {
    syncAuthoritativeTimestamp(metadata, record.naturalKey, record.payload, record.clientUpdatedAt)
  }

  for (const record of snapshot.learningProgress ?? []) {
    syncAuthoritativeTimestamp(
      metadata,
      `learning-progress:${record.scope}`,
      record.payload,
      record.clientUpdatedAt
    )
  }

  writeSnapshotMetadata(metadata)
}

function applyProfileRecord(profile: CloudProfileRecord | null | undefined) {
  if (!profile) return

  useLocaleStore.setState({ locale: profile.locale })
  useThemeStore.setState({ dark: profile.darkMode })
  useLanguageStore.setState({
    scriptMode: profile.reader.scriptMode,
    showTransliteration: profile.reader.showTransliteration,
    meaningLanguage: profile.reader.meaningLanguage,
    larivaar: profile.reader.larivaar,
    showVishraam: profile.reader.showVishraam,
    lineSpacing: profile.reader.lineSpacing,
    textAlign: profile.reader.textAlign,
    fontSize: profile.reader.fontSize,
    englishSource: profile.reader.englishSource,
  })
  useSundarGutkaLengthStore.setState({
    lengths: {
      ...DEFAULT_SUNDAR_GUTKA_LENGTHS,
      ...profile.reader.sundarGutkaLengths,
    },
  })
  useOnboardingStore.setState({
    hasCompletedOnboarding: profile.onboarding.hasCompletedOnboarding,
    learningLevel: profile.onboarding.learningLevel,
    audience: profile.onboarding.audience,
    learningGoal: profile.onboarding.learningGoal,
    presentationMode: profile.onboarding.presentationMode,
    isOnboardingOpen: !profile.onboarding.hasCompletedOnboarding,
  })
}

function applySavedItems(savedItems: CloudSavedItemRecord[] | undefined) {
  if (!savedItems) return

  const bookmarks = savedItems
    .filter(record => record.kind === 'bookmark' && !record.deletedAt)
    .map(record => record.payload as CloudBookmarkPayload)
  const favorites = savedItems
    .filter(record => record.kind === 'favorite' && !record.deletedAt)
    .map(record => record.payload as CloudFavoritePayload)
  const savedLearnItemIds = savedItems
    .filter(record => record.kind === 'learn-item' && !record.deletedAt)
    .map(record => (record.payload as CloudSavedLearnItemPayload).itemId)

  useBookmarksStore.getState().replaceBookmarks(bookmarks)
  useFavoritesStore.setState({ favorites })
  useLearningStore.setState(state => ({
    learnState: {
      ...state.learnState,
      savedItemIds: savedLearnItemIds,
    },
  }))
}

function applyVocabEntries(vocabEntries: CloudVocabRecord[] | undefined) {
  if (!vocabEntries) return

  useVocabStore.setState({
    vocab: vocabEntries
      .filter(record => !record.deletedAt)
      .map(record => record.payload),
  })
}

function applyLearningProgress(records: CloudLearningProgressRecord[] | undefined) {
  if (!records) return

  for (const record of records) {
    if (record.deletedAt) continue

    switch (record.scope) {
      case 'learning-state':
        useLearningStore.setState(record.payload as Partial<ReturnType<typeof useLearningStore.getState>>)
        break
      case 'study-progress':
        useProgressStore.setState(record.payload as Partial<ReturnType<typeof useProgressStore.getState>>)
        break
      case 'reading-progress':
        useReadingProgressStore.setState(record.payload as Partial<ReturnType<typeof useReadingProgressStore.getState>>)
        break
      case 'nitnem-state':
        useNitemStore.setState(record.payload as Partial<ReturnType<typeof useNitemStore.getState>>)
        break
    }
  }
}

export function applyRemoteSnapshot(snapshot: CloudRemoteSnapshot | null | undefined) {
  if (!snapshot) return

  applyProfileRecord(snapshot.profile)
  applySavedItems(snapshot.savedItems)
  applyVocabEntries(snapshot.vocabEntries)
  applyLearningProgress(snapshot.learningProgress)
  syncRemoteSnapshotMetadata(snapshot)
}
