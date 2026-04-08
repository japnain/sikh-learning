import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BANIS } from '../data/banis'

export interface NitemBani {
  id: string
  name: string
  source: 'G' | 'D'
  startAng: number
  endAng: number
  time: 'Morning' | 'Evening' | 'Night'
  baniDbId: number
}

const NITNEM_TIME_BY_BANI_ID: Record<string, NitemBani['time']> = {
  'japji-sahib': 'Morning',
  'jaap-sahib': 'Morning',
  'tav-prasad-savaiye': 'Morning',
  'chaupai-sahib': 'Morning',
  'anand-sahib': 'Morning',
  'rehras-sahib': 'Evening',
  'kirtan-sohila': 'Night',
}

export const NITNEM_BANIS: NitemBani[] = [
  'japji-sahib',
  'jaap-sahib',
  'tav-prasad-savaiye',
  'chaupai-sahib',
  'anand-sahib',
  'rehras-sahib',
  'kirtan-sohila',
].map(id => {
  const bani = BANIS.find(entry => entry.id === id)
  const time = NITNEM_TIME_BY_BANI_ID[id]
  if (!bani || (bani.source !== 'G' && bani.source !== 'D') || !bani.baniDbId || !time) {
    throw new Error(`Missing canonical Nitnem bani metadata for ${id}`)
  }

  return {
    id: bani.id,
    name: bani.name,
    source: bani.source,
    startAng: bani.startAng,
    endAng: bani.endAng,
    time,
    baniDbId: bani.baniDbId,
  }
})

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
