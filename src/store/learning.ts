import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  LearningAssessmentRecord,
  GuidedJourneyProgress,
  LearningLessonProgress,
  LearningSkillKind,
  LearningSkillProgress,
} from '../types'

type SkillRating = 'again' | 'good' | 'easy'

interface LearningState {
  masteredSymbols: string[]
  completedLessons: string[]
  practiceStreak: number
  lastPracticedOn?: string
  totalPracticeSessions: number
  skills: Record<string, LearningSkillProgress>
  lessonProgress: Record<string, LearningLessonProgress>
  assessmentHistory: LearningAssessmentRecord[]
  journeys: Record<string, GuidedJourneyProgress>
  activeJourneyId: string | null
  toggleMasteredSymbol: (symbol: string) => void
  completeLesson: (lessonId: string) => void
  recordPracticeSession: () => void
  scoreSkills: (skillIds: string[], kind: LearningSkillKind, rating: SkillRating) => void
  recordLessonAttempt: (lessonId: string, score: number, skillIds: string[], kind: LearningSkillKind) => void
  getWeakSkillIds: () => string[]
  startJourney: (journeyId: string) => void
  setActiveJourney: (journeyId: string | null) => void
  completeJourneyStep: (journeyId: string, stepId: string, totalSteps?: number) => void
}

function toDayStamp(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function dayDiff(a: string, b: string): number {
  const start = new Date(`${a}T00:00:00Z`)
  const end = new Date(`${b}T00:00:00Z`)
  return Math.round((end.getTime() - start.getTime()) / 86400000)
}

function nextMastery(current: number, rating: SkillRating): number {
  if (rating === 'again') return Math.max(0, Number((current - 0.12).toFixed(2)))
  if (rating === 'easy') return Math.min(1, Number((current + 0.34).toFixed(2)))
  return Math.min(1, Number((current + 0.2).toFixed(2)))
}

function symbolFromSkillId(skillId: string): string {
  return skillId.startsWith('symbol:') ? skillId.slice('symbol:'.length) : skillId
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      masteredSymbols: [],
      completedLessons: [],
      practiceStreak: 0,
      totalPracticeSessions: 0,
      skills: {},
      lessonProgress: {},
      assessmentHistory: [],
      journeys: {},
      activeJourneyId: null,
      toggleMasteredSymbol: (symbol) => set(state => ({
        masteredSymbols: state.masteredSymbols.includes(symbol)
          ? state.masteredSymbols.filter(current => current !== symbol)
          : [...state.masteredSymbols, symbol],
        skills: {
          ...state.skills,
          [`symbol:${symbol}`]: {
            kind: 'symbol',
            mastery: state.masteredSymbols.includes(symbol) ? 0.45 : 1,
            attempts: (state.skills[`symbol:${symbol}`]?.attempts ?? 0) + 1,
            successes: state.masteredSymbols.includes(symbol)
              ? state.skills[`symbol:${symbol}`]?.successes ?? 0
              : (state.skills[`symbol:${symbol}`]?.successes ?? 0) + 1,
            lastReviewedOn: new Date().toISOString(),
          },
        },
      })),
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
        const today = toDayStamp(new Date())
        const { lastPracticedOn, practiceStreak, totalPracticeSessions } = get()

        if (lastPracticedOn === today) {
          set({ totalPracticeSessions: totalPracticeSessions + 1 })
          return
        }

        const nextStreak = lastPracticedOn && dayDiff(lastPracticedOn, today) === 1
          ? practiceStreak + 1
          : 1

        set({
          lastPracticedOn: today,
          practiceStreak: nextStreak,
          totalPracticeSessions: totalPracticeSessions + 1,
        })
      },
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
    }),
    { name: 'sikh-learning-state' }
  )
)
