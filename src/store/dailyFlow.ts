import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface DailyFlowState {
  date: string
  completedActionIds: string[]
  ensureToday: () => void
  toggleAction: (actionId: string) => void
  isCompleted: (actionId: string) => boolean
}

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const useDailyFlowStore = create<DailyFlowState>()(
  persist(
    (set, get) => ({
      date: todayLocal(),
      completedActionIds: [],
      ensureToday: () => {
        const today = todayLocal()
        if (get().date !== today) {
          set({ date: today, completedActionIds: [] })
        }
      },
      toggleAction: (actionId) => set(state => ({
        completedActionIds: state.completedActionIds.includes(actionId)
          ? state.completedActionIds.filter(id => id !== actionId)
          : [...state.completedActionIds, actionId],
      })),
      isCompleted: (actionId) => get().completedActionIds.includes(actionId),
    }),
    { name: 'sikh-daily-flow' }
  )
)
