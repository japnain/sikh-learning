import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface NitemBani {
  id: string
  name: string
  source: 'G' | 'D'
  startAng: number
  endAng: number
  time: 'Morning' | 'Evening' | 'Night'
  baniDbId: number
}

export const NITNEM_BANIS: NitemBani[] = [
  { id: 'japji-sahib',         name: 'Japji Sahib',          source: 'G', startAng: 1,   endAng: 8,   time: 'Morning', baniDbId: 1 },
  { id: 'jaap-sahib',          name: 'Jaap Sahib',           source: 'D', startAng: 1,   endAng: 10,  time: 'Morning', baniDbId: 2 },
  { id: 'tav-prasad-savaiye',  name: 'Tav Prasad Savaiye',   source: 'D', startAng: 10,  endAng: 10,  time: 'Morning', baniDbId: 3 },
  { id: 'chaupai-sahib',       name: 'Chaupai Sahib',        source: 'D', startAng: 1386, endAng: 1388, time: 'Morning', baniDbId: 4 },
  { id: 'anand-sahib',         name: 'Anand Sahib',          source: 'G', startAng: 917, endAng: 922, time: 'Morning', baniDbId: 6 },
  { id: 'rehras-sahib',        name: 'Rehras Sahib',         source: 'G', startAng: 8,   endAng: 12,  time: 'Evening', baniDbId: 21 },
  { id: 'kirtan-sohila',       name: 'Kirtan Sohila',        source: 'G', startAng: 12,  endAng: 13,  time: 'Night',   baniDbId: 9 },
]

interface NitemState {
  completedDate: string
  completedIds: string[]
  markComplete: (id: string) => void
  unmarkComplete: (id: string) => void
  isComplete: (id: string) => boolean
  resetIfNewDay: () => void
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

export const useNitemStore = create<NitemState>()(
  persist(
    (set, get) => ({
      completedDate: todayStr(),
      completedIds: [],

      markComplete: (id) => {
        const today = todayStr()
        const s = get()
        const base = s.completedDate === today ? s.completedIds : []
        if (!base.includes(id)) {
          set({ completedDate: today, completedIds: [...base, id] })
        }
      },

      unmarkComplete: (id) => {
        const today = todayStr()
        const s = get()
        const base = s.completedDate === today ? s.completedIds : []
        set({ completedDate: today, completedIds: base.filter(x => x !== id) })
      },

      isComplete: (id) => {
        const s = get()
        return s.completedDate === todayStr() && s.completedIds.includes(id)
      },

      resetIfNewDay: () => {
        const s = get()
        if (s.completedDate !== todayStr()) {
          set({ completedDate: todayStr(), completedIds: [] })
        }
      },
    }),
    { name: 'sikh-nitnem' }
  )
)
