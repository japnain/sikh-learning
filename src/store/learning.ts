import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LearningState {
  masteredSymbols: string[]
  completedLessons: string[]
  practiceStreak: number
  lastPracticedOn?: string
  totalPracticeSessions: number
  toggleMasteredSymbol: (symbol: string) => void
  completeLesson: (lessonId: string) => void
  recordPracticeSession: () => void
}

function toDayStamp(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function dayDiff(a: string, b: string): number {
  const start = new Date(`${a}T00:00:00Z`)
  const end = new Date(`${b}T00:00:00Z`)
  return Math.round((end.getTime() - start.getTime()) / 86400000)
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      masteredSymbols: [],
      completedLessons: [],
      practiceStreak: 0,
      totalPracticeSessions: 0,
      toggleMasteredSymbol: (symbol) => set(state => ({
        masteredSymbols: state.masteredSymbols.includes(symbol)
          ? state.masteredSymbols.filter(current => current !== symbol)
          : [...state.masteredSymbols, symbol],
      })),
      completeLesson: (lessonId) => set(state => ({
        completedLessons: state.completedLessons.includes(lessonId)
          ? state.completedLessons
          : [...state.completedLessons, lessonId],
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
    }),
    { name: 'sikh-learning-state' }
  )
)
