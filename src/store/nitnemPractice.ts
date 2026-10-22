import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getNitnemOption } from './nitnem'
import { isActiveNitnemPracticeReading, isNitnemPracticeReading, normalizeNitnemPractice } from '../utils/nitnemPractice'

export interface NitnemPracticeSession {
  optionId: string
  readingPath: string
  startedAt: string
  updatedAt: string
  completed: boolean
}

interface NitnemPracticeState {
  active: NitnemPracticeSession | null
  start: (optionId: string, readingPath: string) => boolean
  updatePath: (readingPath: string) => boolean
  switchReading: (optionId: string, readingPath: string) => boolean
  finish: (optionId: string) => boolean
  clear: () => boolean
}

const updatedNow = (active: NitnemPracticeSession) => new Date(Math.max(Date.now(), Date.parse(active.updatedAt))).toISOString()
const tagPracticePath = (path: string, startedAt: string) => {
  const params = new URLSearchParams(path.split('?')[1])
  params.set('nitnemPractice', startedAt)
  return `/study?${params}`
}

/** One intentional local practice, separate from general per-bani Study places. */
export const useNitnemPracticeStore = create<NitnemPracticeState>()(persist<NitnemPracticeState, [], [], { active: NitnemPracticeSession | null }>(
  (set, get) => {
    const write = (active: NitnemPracticeSession | null): boolean => {
      try {
        // Unavailable storage must not prevent reading. The boolean describes
        // durability; the context remains useful for the current app session.
        set({ active })
        return Boolean(useNitnemPracticeStore.persist?.getOptions().storage)
      } catch { return false }
    }
    return {
      active: null,
      start: (optionId, readingPath) => {
        const option = getNitnemOption(optionId)
        if (!option || !isNitnemPracticeReading(readingPath, option)) return false
        const previous = get().active
        const now = new Date(Math.max(Date.now(), previous ? Date.parse(previous.updatedAt) + 1 : 0)).toISOString()
        return write({ optionId, readingPath: tagPracticePath(readingPath, now), startedAt: now, updatedAt: now, completed: false })
      },
      updatePath: readingPath => {
        const active = get().active
        if (!active || !isActiveNitnemPracticeReading(readingPath, active)) return false
        return write({ ...active, readingPath: tagPracticePath(readingPath, active.startedAt), updatedAt: updatedNow(active) })
      },
      switchReading: (optionId, readingPath) => {
        const active = get().active
        const option = getNitnemOption(optionId)
        if (!active || active.completed || active.optionId !== optionId || !option
          || !isNitnemPracticeReading(readingPath, option)) return false
        return write({ ...active, readingPath: tagPracticePath(readingPath, active.startedAt), updatedAt: updatedNow(active) })
      },
      finish: optionId => {
        const active = get().active
        if (!active || active.optionId !== optionId) return false
        return write({ ...active, completed: true, updatedAt: updatedNow(active) })
      },
      clear: () => write(null),
    }
  },
  {
    name: 'naamras-nitnem-practice', version: 1,
    partialize: state => ({ active: state.active }),
    merge: (persisted, current) => ({
      ...current,
      active: normalizeNitnemPractice((persisted as Partial<NitnemPracticeState> | undefined)?.active),
    }),
  },
))
