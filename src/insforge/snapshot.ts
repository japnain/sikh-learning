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

function createMetadata(id: string, clientUpdatedAt: string, deletedAt: string | null = null) {
  return {
    id,
    userId: null,
    deviceId: getNaamrasDeviceId(),
    clientUpdatedAt,
    deletedAt,
  }
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

function extractProfileRecord(): CloudProfileRecord {
  const locale = useLocaleStore.getState().locale
  const darkMode = useThemeStore.getState().dark
  const language = useLanguageStore.getState()
  const onboarding = useOnboardingStore.getState()
  const sundarGutkaLengths = useSundarGutkaLengthStore.getState().lengths

  return {
    ...createMetadata('profile', new Date().toISOString()),
    locale,
    darkMode,
    reader: {
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
    },
    onboarding: {
      hasCompletedOnboarding: onboarding.hasCompletedOnboarding,
      learningLevel: onboarding.learningLevel,
      audience: onboarding.audience,
      learningGoal: onboarding.learningGoal,
      presentationMode: onboarding.presentationMode,
    },
  }
}

function extractSavedItems(): CloudSavedItemRecord[] {
  const learningState = useLearningStore.getState().learnState
  const bookmarkRecords = useBookmarksStore.getState().bookmarks.map((bookmark) => {
    const payload: CloudBookmarkPayload = {
      ...bookmark,
    }

    return {
      ...createMetadata(bookmark.id, bookmark.savedAt),
      kind: 'bookmark' as const,
      naturalKey: buildBookmarkNaturalKey(payload),
      payload,
    }
  })

  const favoriteRecords = useFavoritesStore.getState().favorites.map((favorite) => {
    const payload: CloudFavoritePayload = {
      ...favorite,
    }

    return {
      ...createMetadata(favorite.id, favorite.savedAt),
      kind: 'favorite' as const,
      naturalKey: buildFavoriteNaturalKey(payload),
      payload,
    }
  })

  const savedLearnRecords = learningState.savedItemIds.map((itemId) => {
    const viewedAt = learningState.viewedItems.find(item => item.itemId === itemId)?.viewedAt
      ?? new Date().toISOString()
    const payload: CloudSavedLearnItemPayload = {
      itemId,
      savedAt: viewedAt,
    }

    return {
      ...createMetadata(`learn-save:${itemId}`, viewedAt),
      kind: 'learn-item' as const,
      naturalKey: buildSavedLearnNaturalKey(itemId),
      payload,
    }
  })

  return [...bookmarkRecords, ...favoriteRecords, ...savedLearnRecords]
}

function extractVocabEntries(): CloudVocabRecord[] {
  return useVocabStore.getState().vocab.map(entry => ({
    ...createMetadata(buildVocabNaturalKey(entry), entry.review?.lastReviewedAt ?? entry.savedAt),
    naturalKey: buildVocabNaturalKey(entry),
    payload: entry,
  }))
}

function extractLearningProgress(): CloudLearningProgressRecord[] {
  const learning = useLearningStore.getState()
  const progress = useProgressStore.getState()
  const readingProgress = useReadingProgressStore.getState()
  const nitnem = useNitemStore.getState()
  const updatedAt = new Date().toISOString()

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

  return [
    {
      ...createMetadata('learning-state', updatedAt),
      scope: 'learning-state',
      payload: learningPayload,
    },
    {
      ...createMetadata('study-progress', updatedAt),
      scope: 'study-progress',
      payload: {
        studied: progress.studied,
        reviewQueue: progress.reviewQueue,
        lastStudied: progress.lastStudied,
        currentSession: progress.currentSession,
      },
    },
    {
      ...createMetadata('reading-progress', updatedAt),
      scope: 'reading-progress',
      payload: {
        progress: readingProgress.progress,
      },
    },
    {
      ...createMetadata('nitnem-state', updatedAt),
      scope: 'nitnem-state',
      payload: {
        completedDate: nitnem.completedDate,
        completedIds: nitnem.completedIds,
        selectedIds: nitnem.selectedIds,
      },
    },
  ]
}

export function exportLocalSnapshot(): CloudLocalSnapshot {
  return {
    version: 1,
    deviceId: getNaamrasDeviceId(),
    profile: extractProfileRecord(),
    savedItems: extractSavedItems(),
    vocabEntries: extractVocabEntries(),
    learningProgress: extractLearningProgress(),
    activityEvents: useActivityEventsStore.getState().pendingEvents,
  }
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
}
