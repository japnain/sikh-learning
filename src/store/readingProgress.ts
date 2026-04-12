import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BANIS } from '../data/banis'
import { queueActivityEvent } from './activityEvents'

interface ReadingProgressState {
  progress: Record<string, number[]> // baniId → array of completed angs
  recordAng: (source: string, ang: number) => void
  getProgress: (baniId: string) => { done: number; total: number; pct: number }
}

export const useReadingProgressStore = create<ReadingProgressState>()(
  persist(
    (set, get) => ({
      progress: {},

      recordAng: (source, ang) => {
        // Find all banis this ang belongs to
        const matching = BANIS.filter(
          b => b.source === source && ang >= b.startAng && ang <= b.endAng
        )
        if (matching.length === 0) return

        let recorded = false
        set(state => {
          const updated = { ...state.progress }
          for (const bani of matching) {
            const existing = updated[bani.id] ?? []
            if (!existing.includes(ang)) {
              updated[bani.id] = [...existing, ang]
              recorded = true
            }
          }
          return { progress: updated }
        })
        if (recorded) {
          queueActivityEvent('reader.ang-recorded', {
            source,
            ang,
            baniIds: matching.map(bani => bani.id),
          })
        }
      },

      getProgress: (baniId) => {
        const bani = BANIS.find(b => b.id === baniId)
        if (!bani) return { done: 0, total: 0, pct: 0 }
        const total = bani.endAng - bani.startAng + 1
        const done = (get().progress[baniId] ?? []).length
        return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
      },
    }),
    { name: 'sikh-reading-progress' }
  )
)
