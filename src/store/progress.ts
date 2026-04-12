import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StudiedEntry } from '../types'
import { getUpdatedStreak } from '../utils/streak'
import { queueActivityEvent } from './activityEvents'

interface Session {
  scriptureId: string
  lastCardIndex: number
}

interface ProgressState {
  studied: StudiedEntry[]
  reviewQueue: string[]
  lastStudied: string | null
  streak: number
  currentSession: Session | null
  markStudied: (id: string) => void
  addToReview: (id: string) => void
  updateSession: (session: Session) => void
  clearSession: () => void
  recordSwipeToday: () => void
}

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      studied: [],
      reviewQueue: [],
      lastStudied: null,
      streak: 0,
      currentSession: null,

      markStudied: (id) => set(state => ({
        studied: [...state.studied.filter(s => s.id !== id), { id, swipedAt: new Date().toISOString() }],
        reviewQueue: state.reviewQueue.filter(r => r !== id),
      })),

      addToReview: (id) => set(state => ({
        reviewQueue: state.reviewQueue.includes(id) ? state.reviewQueue : [...state.reviewQueue, id],
      })),

      updateSession: (session) => set({ currentSession: session }),

      clearSession: () => set({ currentSession: null }),

      recordSwipeToday: () => {
        const occurredAt = new Date().toISOString()
        let nextStreak = 0
        let nextLastStudied: string | null = null
        set(state => {
          const today = todayLocal()
          const updated = getUpdatedStreak({ streak: state.streak, lastStudied: state.lastStudied }, today)
          nextStreak = updated.streak
          nextLastStudied = updated.lastStudied
          return updated
        })
        queueActivityEvent('study.swipe-recorded', {
          streak: nextStreak,
          lastStudied: nextLastStudied,
        }, occurredAt)
      },
    }),
    { name: 'sikh-progress' }
  )
)
