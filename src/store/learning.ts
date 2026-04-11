import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { THEME_PATH_BY_ID } from '../data/themePaths'
import type {
  DailyLesson,
  GuidedJourneyProgress,
  LearnActivity,
  LearnContentKind,
  LearnDepthPreference,
  LearnPlacementResult,
  LearnProgramId,
  LearnProgramProgress,
  LearningAssessmentRecord,
  LearningLessonProgress,
  LearningSkillKind,
  LearningSkillProgress,
  MilestoneId,
  ThemePathProgress,
  UserLearningState,
} from '../types'
import { dayDiffLocal, parseLocalDayStamp, toLocalDayStamp } from '../utils/learnDates'

type SkillRating = 'again' | 'good' | 'easy'

const LEARN_PROGRAM_IDS: LearnProgramId[] = [
  'start-reading',
  'build-fluency',
  'understand-gurbani',
  'deep-study',
]

interface LearningState {
  masteredSymbols: string[]
  completedLessons: string[]
  practiceStreak: number
  lastPracticedOn?: string
  totalPracticeSessions: number
  streakCalendar: Record<string, boolean>
  longestStreak: number
  earnedMilestoneIds: MilestoneId[]
  pendingMilestoneId: MilestoneId | null
  dailyLesson: DailyLesson | null
  skills: Record<string, LearningSkillProgress>
  lessonProgress: Record<string, LearningLessonProgress>
  assessmentHistory: LearningAssessmentRecord[]
  journeys: Record<string, GuidedJourneyProgress>
  activeJourneyId: string | null
  activeProgramId: LearnProgramId
  programProgress: Record<LearnProgramId, LearnProgramProgress>
  queuedReviewModuleIds: string[]
  placementResult: LearnPlacementResult | null
  lastLearnActivity: LearnActivity | null
  grammarNotesSeen: string[]
  masteredWordFamilyIds: string[]
  themePathProgress: Record<string, ThemePathProgress>
  completedThemePathIds: string[]
  learnState: UserLearningState
  toggleMasteredSymbol: (symbol: string) => void
  completeLesson: (lessonId: string) => void
  recordPracticeSession: () => void
  recordStreakDay: (dateStamp: string) => void
  earnMilestone: (id: MilestoneId) => void
  clearPendingMilestone: () => void
  setDailyLesson: (lesson: DailyLesson | null) => void
  completeDailyLessonStep: (stepId: string, lessonDate: string) => void
  scoreSkills: (skillIds: string[], kind: LearningSkillKind, rating: SkillRating) => void
  recordLessonAttempt: (lessonId: string, score: number, skillIds: string[], kind: LearningSkillKind) => void
  getWeakSkillIds: () => string[]
  startJourney: (journeyId: string) => void
  setActiveJourney: (journeyId: string | null) => void
  completeJourneyStep: (journeyId: string, stepId: string, totalSteps?: number) => void
  setActiveProgram: (programId: LearnProgramId) => void
  setProgramModule: (programId: LearnProgramId, moduleId: string | null) => void
  completeModule: (programId: LearnProgramId, moduleId: string, reviewIds?: string[]) => void
  queueReviewModules: (moduleIds: string[]) => void
  clearQueuedReview: (moduleId: string) => void
  setPlacementResult: (result: LearnPlacementResult | null) => void
  recordLearnActivity: (activity: LearnActivity) => void
  markGrammarNoteSeen: (noteId: string) => void
  completeWordFamily: (familyId: string) => void
  startThemePath: (pathId: string) => void
  completeThemePathModule: (pathId: string, moduleId: string) => void
  recordLearnItemView: (itemId: string, kind: LearnContentKind) => void
  toggleSavedLearnItem: (itemId: string) => void
  setActiveLearnCollection: (collectionId: string | null) => void
  setLearnDepthPreference: (depthPreference: LearnDepthPreference) => void
}

type PersistedLearningState = Partial<
  Pick<
    LearningState,
    | 'masteredSymbols'
    | 'completedLessons'
    | 'practiceStreak'
    | 'lastPracticedOn'
    | 'totalPracticeSessions'
    | 'streakCalendar'
    | 'longestStreak'
    | 'earnedMilestoneIds'
    | 'pendingMilestoneId'
    | 'dailyLesson'
    | 'skills'
    | 'lessonProgress'
    | 'assessmentHistory'
    | 'journeys'
    | 'activeJourneyId'
    | 'activeProgramId'
    | 'programProgress'
    | 'queuedReviewModuleIds'
    | 'placementResult'
    | 'lastLearnActivity'
    | 'grammarNotesSeen'
    | 'masteredWordFamilyIds'
    | 'themePathProgress'
    | 'completedThemePathIds'
    | 'learnState'
  >
>

function createDefaultProgramProgress(): Record<LearnProgramId, LearnProgramProgress> {
  return {
    'start-reading': { currentModuleId: null, completedModuleIds: [] },
    'build-fluency': { currentModuleId: null, completedModuleIds: [] },
    'understand-gurbani': { currentModuleId: null, completedModuleIds: [] },
    'deep-study': { currentModuleId: null, completedModuleIds: [] },
  }
}

function createDefaultLearnState(): UserLearningState {
  return {
    viewedItems: [],
    savedItemIds: [],
    recentTopicIds: [],
    activeCollectionId: null,
    depthPreference: 'balanced',
  }
}

function normalizeProgramProgress(
  progress: PersistedLearningState['programProgress'] | undefined
): Record<LearnProgramId, LearnProgramProgress> {
  const defaults = createDefaultProgramProgress()

  for (const programId of LEARN_PROGRAM_IDS) {
    const existing = progress?.[programId]
    if (!existing) continue

    defaults[programId] = {
      currentModuleId: existing.currentModuleId ?? null,
      completedModuleIds: existing.completedModuleIds ?? [],
      lastActivityAt: existing.lastActivityAt,
    }
  }

  return defaults
}

function sortDayStamps(dayStamps: string[]): string[] {
  return [...dayStamps].sort((a, b) => a.localeCompare(b))
}

function getLongestStreak(calendar: Record<string, boolean>): number {
  const activeDays = sortDayStamps(Object.keys(calendar).filter(day => calendar[day]))
  if (activeDays.length === 0) return 0

  let longest = 1
  let current = 1

  for (let index = 1; index < activeDays.length; index += 1) {
    const previousDay = activeDays[index - 1]
    const currentDay = activeDays[index]
    if (dayDiffLocal(previousDay, currentDay) === 1) {
      current += 1
      longest = Math.max(longest, current)
      continue
    }

    current = 1
  }

  return longest
}

function getCurrentStreak(calendar: Record<string, boolean>, latestDay: string | undefined): number {
  if (!latestDay || !calendar[latestDay]) return 0

  let streak = 1
  let currentDay = latestDay

  while (true) {
    const previous = parseLocalDayStamp(currentDay)
    previous.setDate(previous.getDate() - 1)
    const previousStamp = toLocalDayStamp(previous)

    if (!calendar[previousStamp]) {
      return streak
    }

    streak += 1
    currentDay = previousStamp
  }
}

function getLatestPracticedOn(calendar: Record<string, boolean>, lastPracticedOn?: string): string | undefined {
  const activeDays = sortDayStamps(Object.keys(calendar).filter(day => calendar[day]))
  const latestCalendarDay = activeDays[activeDays.length - 1]

  if (!lastPracticedOn) return latestCalendarDay
  if (!latestCalendarDay) return lastPracticedOn
  return latestCalendarDay > lastPracticedOn ? latestCalendarDay : lastPracticedOn
}

function createDefaultState() {
  return {
    masteredSymbols: [],
    completedLessons: [],
    practiceStreak: 0,
    lastPracticedOn: undefined as string | undefined,
    totalPracticeSessions: 0,
    streakCalendar: {} as Record<string, boolean>,
    longestStreak: 0,
    earnedMilestoneIds: [] as MilestoneId[],
    pendingMilestoneId: null as MilestoneId | null,
    dailyLesson: null as DailyLesson | null,
    skills: {} as Record<string, LearningSkillProgress>,
    lessonProgress: {} as Record<string, LearningLessonProgress>,
    assessmentHistory: [] as LearningAssessmentRecord[],
    journeys: {} as Record<string, GuidedJourneyProgress>,
    activeJourneyId: null as string | null,
    activeProgramId: 'start-reading' as LearnProgramId,
    programProgress: createDefaultProgramProgress(),
    queuedReviewModuleIds: [] as string[],
    placementResult: null as LearnPlacementResult | null,
    lastLearnActivity: null as LearnActivity | null,
    grammarNotesSeen: [] as string[],
    masteredWordFamilyIds: [] as string[],
    themePathProgress: {} as Record<string, ThemePathProgress>,
    completedThemePathIds: [] as string[],
    learnState: createDefaultLearnState(),
  }
}

function normalizePersistedState(persisted: PersistedLearningState | undefined): PersistedLearningState {
  const defaults = createDefaultState()
  const streakCalendar = {
    ...defaults.streakCalendar,
    ...(persisted?.streakCalendar ?? {}),
  }

  if (persisted?.lastPracticedOn) {
    streakCalendar[persisted.lastPracticedOn] = true
  }

  const lastPracticedOn = getLatestPracticedOn(streakCalendar, persisted?.lastPracticedOn)
  const practiceStreak = getCurrentStreak(streakCalendar, lastPracticedOn)
  const longestStreak = Math.max(
    persisted?.longestStreak ?? 0,
    getLongestStreak(streakCalendar)
  )

  return {
    masteredSymbols: persisted?.masteredSymbols ?? defaults.masteredSymbols,
    completedLessons: persisted?.completedLessons ?? defaults.completedLessons,
    practiceStreak,
    lastPracticedOn,
    totalPracticeSessions: persisted?.totalPracticeSessions ?? defaults.totalPracticeSessions,
    streakCalendar,
    longestStreak,
    earnedMilestoneIds: persisted?.earnedMilestoneIds ?? defaults.earnedMilestoneIds,
    pendingMilestoneId: persisted?.pendingMilestoneId ?? defaults.pendingMilestoneId,
    dailyLesson: persisted?.dailyLesson ?? defaults.dailyLesson,
    skills: persisted?.skills ?? defaults.skills,
    lessonProgress: persisted?.lessonProgress ?? defaults.lessonProgress,
    assessmentHistory: persisted?.assessmentHistory ?? defaults.assessmentHistory,
    journeys: persisted?.journeys ?? defaults.journeys,
    activeJourneyId: persisted?.activeJourneyId ?? defaults.activeJourneyId,
    activeProgramId: persisted?.activeProgramId ?? defaults.activeProgramId,
    programProgress: normalizeProgramProgress(persisted?.programProgress),
    queuedReviewModuleIds: persisted?.queuedReviewModuleIds ?? defaults.queuedReviewModuleIds,
    placementResult: persisted?.placementResult ?? defaults.placementResult,
    lastLearnActivity: persisted?.lastLearnActivity ?? defaults.lastLearnActivity,
    grammarNotesSeen: persisted?.grammarNotesSeen ?? defaults.grammarNotesSeen,
    masteredWordFamilyIds: persisted?.masteredWordFamilyIds ?? defaults.masteredWordFamilyIds,
    themePathProgress: persisted?.themePathProgress ?? defaults.themePathProgress,
    completedThemePathIds: persisted?.completedThemePathIds ?? defaults.completedThemePathIds,
    learnState: {
      ...defaults.learnState,
      ...(persisted?.learnState ?? {}),
      viewedItems: persisted?.learnState?.viewedItems ?? defaults.learnState.viewedItems,
      savedItemIds: persisted?.learnState?.savedItemIds ?? defaults.learnState.savedItemIds,
      recentTopicIds: persisted?.learnState?.recentTopicIds ?? defaults.learnState.recentTopicIds,
      activeCollectionId: persisted?.learnState?.activeCollectionId ?? defaults.learnState.activeCollectionId,
      depthPreference: persisted?.learnState?.depthPreference ?? defaults.learnState.depthPreference,
    },
  }
}

function nextMastery(current: number, rating: SkillRating): number {
  if (rating === 'again') return Math.max(0, Number((current - 0.12).toFixed(2)))
  if (rating === 'easy') return Math.min(1, Number((current + 0.34).toFixed(2)))
  return Math.min(1, Number((current + 0.2).toFixed(2)))
}

function symbolFromSkillId(skillId: string): string {
  return skillId.startsWith('symbol:') ? skillId.slice('symbol:'.length) : skillId
}

function getNextStreakFields(
  state: Pick<LearningState, 'streakCalendar' | 'lastPracticedOn'>
  , dateStamp: string
) {
  const streakCalendar = {
    ...state.streakCalendar,
    [dateStamp]: true,
  }
  const lastPracticedOn = getLatestPracticedOn(streakCalendar, state.lastPracticedOn)

  return {
    streakCalendar,
    lastPracticedOn,
    practiceStreak: getCurrentStreak(streakCalendar, lastPracticedOn),
    longestStreak: getLongestStreak(streakCalendar),
  }
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      ...createDefaultState(),
      toggleMasteredSymbol: (symbol) => set(state => {
        const isAlreadyMastered = state.masteredSymbols.includes(symbol)

        return {
          masteredSymbols: isAlreadyMastered
            ? state.masteredSymbols.filter(current => current !== symbol)
            : [...state.masteredSymbols, symbol],
          skills: {
            ...state.skills,
            [`symbol:${symbol}`]: {
              kind: 'symbol',
              mastery: isAlreadyMastered ? 0.45 : 1,
              attempts: (state.skills[`symbol:${symbol}`]?.attempts ?? 0) + 1,
              successes: isAlreadyMastered
                ? state.skills[`symbol:${symbol}`]?.successes ?? 0
                : (state.skills[`symbol:${symbol}`]?.successes ?? 0) + 1,
              lastReviewedOn: new Date().toISOString(),
            },
          },
        }
      }),
      completeLesson: (lessonId) => set(state => ({
        completedLessons: state.completedLessons.includes(lessonId)
          ? state.completedLessons
          : [...state.completedLessons, lessonId],
        lessonProgress: {
          ...state.lessonProgress,
          [lessonId]: {
            attempts: Math.max(1, state.lessonProgress[lessonId]?.attempts ?? 0),
            bestScore: Math.max(1, state.lessonProgress[lessonId]?.bestScore ?? 0),
            completedAt: state.lessonProgress[lessonId]?.completedAt ?? new Date().toISOString(),
            lastPracticedAt: new Date().toISOString(),
          },
        },
      })),
      recordPracticeSession: () => {
        const today = toLocalDayStamp(new Date())
        set(state => ({
          ...getNextStreakFields(state, today),
          totalPracticeSessions: state.totalPracticeSessions + 1,
        }))
      },
      recordStreakDay: (dateStamp) => set(state => getNextStreakFields(state, dateStamp)),
      earnMilestone: (id) => set(state => {
        if (state.earnedMilestoneIds.includes(id)) {
          return {}
        }

        return {
          earnedMilestoneIds: [...state.earnedMilestoneIds, id],
          pendingMilestoneId: state.pendingMilestoneId ?? id,
        }
      }),
      clearPendingMilestone: () => set({ pendingMilestoneId: null }),
      setDailyLesson: (lesson) => set({ dailyLesson: lesson }),
      completeDailyLessonStep: (stepId, lessonDate) => set(state => {
        if (!state.dailyLesson || state.dailyLesson.date !== lessonDate) {
          return {}
        }

        if (state.dailyLesson.completedStepIds.includes(stepId)) {
          return {}
        }

        return {
          dailyLesson: {
            ...state.dailyLesson,
            completedStepIds: [...state.dailyLesson.completedStepIds, stepId],
          },
        }
      }),
      scoreSkills: (skillIds, kind, rating) => set(state => {
        const nextSkills = { ...state.skills }
        const nextMasteredSymbols = new Set(state.masteredSymbols)

        for (const skillId of skillIds) {
          const current = nextSkills[skillId] ?? {
            kind,
            mastery: 0,
            attempts: 0,
            successes: 0,
          }
          const mastery = nextMastery(current.mastery, rating)
          const successes = rating === 'again' ? current.successes : current.successes + 1

          nextSkills[skillId] = {
            kind,
            mastery,
            attempts: current.attempts + 1,
            successes,
            lastReviewedOn: new Date().toISOString(),
          }

          if (kind === 'symbol') {
            const symbol = symbolFromSkillId(skillId)
            if (mastery >= 0.8) nextMasteredSymbols.add(symbol)
            if (mastery < 0.8) nextMasteredSymbols.delete(symbol)
          }
        }

        return {
          skills: nextSkills,
          masteredSymbols: Array.from(nextMasteredSymbols),
        }
      }),
      recordLessonAttempt: (lessonId, score, skillIds, kind) => {
        get().recordPracticeSession()
        get().scoreSkills(
          skillIds,
          kind,
          score >= 0.9 ? 'easy' : score >= 0.65 ? 'good' : 'again'
        )

        set(state => {
          const currentLesson = state.lessonProgress[lessonId] ?? {
            attempts: 0,
            bestScore: 0,
          }
          const completedLessons = score >= 0.75 && !state.completedLessons.includes(lessonId)
            ? [...state.completedLessons, lessonId]
            : state.completedLessons

          return {
            completedLessons,
            lessonProgress: {
              ...state.lessonProgress,
              [lessonId]: {
                attempts: currentLesson.attempts + 1,
                bestScore: Math.max(currentLesson.bestScore, score),
                completedAt: score >= 0.75
                  ? currentLesson.completedAt ?? new Date().toISOString()
                  : currentLesson.completedAt,
                lastPracticedAt: new Date().toISOString(),
              },
            },
            assessmentHistory: [
              {
                lessonId,
                score,
                skillIds,
                recordedAt: new Date().toISOString(),
              },
              ...state.assessmentHistory,
            ].slice(0, 80),
          }
        })
      },
      getWeakSkillIds: () => Object.entries(get().skills)
        .filter(([, progress]) => progress.attempts > 0 && progress.mastery < 0.45)
        .sort((a, b) => a[1].mastery - b[1].mastery)
        .map(([skillId]) => skillId)
        .slice(0, 6),
      startJourney: (journeyId) => set(state => ({
        activeJourneyId: journeyId,
        journeys: {
          ...state.journeys,
          [journeyId]: state.journeys[journeyId] ?? {
            startedAt: new Date().toISOString(),
            completedStepIds: [],
            lastTouchedAt: new Date().toISOString(),
          },
        },
      })),
      setActiveJourney: (journeyId) => set({ activeJourneyId: journeyId }),
      completeJourneyStep: (journeyId, stepId, totalSteps) => set(state => {
        const current = state.journeys[journeyId] ?? {
          startedAt: new Date().toISOString(),
          completedStepIds: [],
          lastTouchedAt: new Date().toISOString(),
        }
        const completedStepIds = current.completedStepIds.includes(stepId)
          ? current.completedStepIds
          : [...current.completedStepIds, stepId]

        return {
          journeys: {
            ...state.journeys,
            [journeyId]: {
              ...current,
              completedStepIds,
              lastTouchedAt: new Date().toISOString(),
              completedAt: totalSteps && completedStepIds.length >= totalSteps
                ? current.completedAt ?? new Date().toISOString()
                : current.completedAt,
            },
          },
        }
      }),
      setActiveProgram: (programId) => set({ activeProgramId: programId }),
      setProgramModule: (programId, moduleId) => set(state => ({
        activeProgramId: programId,
        programProgress: {
          ...state.programProgress,
          [programId]: {
            ...state.programProgress[programId],
            currentModuleId: moduleId,
            lastActivityAt: new Date().toISOString(),
          },
        },
      })),
      completeModule: (programId, moduleId, reviewIds = []) => set(state => {
        const current = state.programProgress[programId]
        const nextCompletedModuleIds = current.completedModuleIds.includes(moduleId)
          ? current.completedModuleIds
          : [...current.completedModuleIds, moduleId]
        const completedLessons = state.completedLessons.includes(moduleId)
          ? state.completedLessons
          : [...state.completedLessons, moduleId]
        const queuedReviewModuleIds = Array.from(new Set([...reviewIds, ...state.queuedReviewModuleIds]))
        const dailyLesson = state.dailyLesson?.steps.some(step => step.moduleId === moduleId)
          ? {
            ...state.dailyLesson,
            completedStepIds: state.dailyLesson.completedStepIds.includes(moduleId)
              ? state.dailyLesson.completedStepIds
              : [
                ...state.dailyLesson.completedStepIds,
                ...state.dailyLesson.steps
                  .filter(step => step.moduleId === moduleId)
                  .map(step => step.id)
                  .filter(stepId => !state.dailyLesson?.completedStepIds.includes(stepId)),
              ],
          }
          : state.dailyLesson

        return {
          completedLessons,
          queuedReviewModuleIds,
          dailyLesson,
          activeProgramId: programId,
          programProgress: {
            ...state.programProgress,
            [programId]: {
              ...current,
              currentModuleId: current.currentModuleId === moduleId ? null : current.currentModuleId,
              completedModuleIds: nextCompletedModuleIds,
              lastActivityAt: new Date().toISOString(),
            },
          },
        }
      }),
      queueReviewModules: (moduleIds) => set(state => ({
        queuedReviewModuleIds: Array.from(new Set([...moduleIds, ...state.queuedReviewModuleIds])),
      })),
      clearQueuedReview: (moduleId) => set(state => ({
        queuedReviewModuleIds: state.queuedReviewModuleIds.filter(id => id !== moduleId),
      })),
      setPlacementResult: (result) => set(state => ({
        placementResult: result,
        activeProgramId: result?.programId ?? state.activeProgramId,
      })),
      recordLearnActivity: (activity) => set(state => ({
        activeProgramId: activity.programId,
        lastLearnActivity: activity,
        programProgress: {
          ...state.programProgress,
          [activity.programId]: {
            ...state.programProgress[activity.programId],
            currentModuleId: activity.moduleId,
            lastActivityAt: activity.visitedAt,
          },
        },
      })),
      markGrammarNoteSeen: (noteId) => set(state => ({
        grammarNotesSeen: state.grammarNotesSeen.includes(noteId)
          ? state.grammarNotesSeen
          : [...state.grammarNotesSeen, noteId],
      })),
      completeWordFamily: (familyId) => set(state => ({
        masteredWordFamilyIds: state.masteredWordFamilyIds.includes(familyId)
          ? state.masteredWordFamilyIds
          : [...state.masteredWordFamilyIds, familyId],
      })),
      startThemePath: (pathId) => set(state => ({
        themePathProgress: {
          ...state.themePathProgress,
          [pathId]: state.themePathProgress[pathId] ?? {
            startedAt: new Date().toISOString(),
            completedModuleIds: [],
          },
        },
      })),
      completeThemePathModule: (pathId, moduleId) => set(state => {
        const current = state.themePathProgress[pathId] ?? {
          startedAt: new Date().toISOString(),
          completedModuleIds: [],
        }
        const completedModuleIds = current.completedModuleIds.includes(moduleId)
          ? current.completedModuleIds
          : [...current.completedModuleIds, moduleId]
        const themePath = THEME_PATH_BY_ID[pathId]
        const isComplete = themePath
          ? themePath.moduleIds.every(id => completedModuleIds.includes(id))
          : false

        return {
          themePathProgress: {
            ...state.themePathProgress,
            [pathId]: {
              ...current,
              completedModuleIds,
            },
          },
          completedThemePathIds: isComplete && !state.completedThemePathIds.includes(pathId)
            ? [...state.completedThemePathIds, pathId]
            : state.completedThemePathIds,
        }
      }),
      recordLearnItemView: (itemId, kind) => set(state => {
        const viewedAt = new Date().toISOString()
        const nextViewedItems = [
          { itemId, kind, viewedAt },
          ...state.learnState.viewedItems.filter(item => item.itemId !== itemId),
        ].slice(0, 80)

        const nextRecentTopicIds = kind === 'topic-guide'
          ? [itemId, ...state.learnState.recentTopicIds.filter(topicId => topicId !== itemId)].slice(0, 12)
          : state.learnState.recentTopicIds

        return {
          learnState: {
            ...state.learnState,
            viewedItems: nextViewedItems,
            recentTopicIds: nextRecentTopicIds,
          },
        }
      }),
      toggleSavedLearnItem: (itemId) => set(state => ({
        learnState: {
          ...state.learnState,
          savedItemIds: state.learnState.savedItemIds.includes(itemId)
            ? state.learnState.savedItemIds.filter(current => current !== itemId)
            : [itemId, ...state.learnState.savedItemIds],
        },
      })),
      setActiveLearnCollection: (collectionId) => set(state => ({
        learnState: {
          ...state.learnState,
          activeCollectionId: collectionId,
        },
      })),
      setLearnDepthPreference: (depthPreference) => set(state => ({
        learnState: {
          ...state.learnState,
          depthPreference,
        },
      })),
    }),
    {
      name: 'sikh-learning-state',
      version: 4,
      migrate: (persistedState) => normalizePersistedState(
        persistedState as PersistedLearningState | undefined
      ),
    }
  )
)
