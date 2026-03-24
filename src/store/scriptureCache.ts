import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ScriptureEntry, Word } from '../types'

type BaniSource = 'G' | 'D'

interface ScriptureCacheState {
  angCache: Record<string, ScriptureEntry[]>
  wordCache: Record<string, Word[]>
  getAng: (source: BaniSource, ang: number) => ScriptureEntry[] | undefined
  setAng: (source: BaniSource, ang: number, entries: ScriptureEntry[]) => void
  getWords: (shabadId: number) => Word[] | undefined
  setWords: (shabadId: number, words: Word[]) => void
  getEntryById: (id: string) => ScriptureEntry | undefined
  clearAll: () => void
}

const angKey = (source: BaniSource, ang: number) => `${source}-${ang}`

export const useScriptureCacheStore = create<ScriptureCacheState>()(
  persist(
    (set, get) => ({
      angCache: {},
      wordCache: {},
      getAng: (source, ang) => get().angCache[angKey(source, ang)],
      setAng: (source, ang, entries) => set(state => ({
        angCache: { ...state.angCache, [angKey(source, ang)]: entries },
      })),
      getWords: (shabadId) => get().wordCache[String(shabadId)],
      setWords: (shabadId, words) => set(state => ({
        wordCache: { ...state.wordCache, [String(shabadId)]: words },
      })),
      getEntryById: (id) => Object.values(get().angCache).flat().find(e => e.id === id),
      clearAll: () => set({ angCache: {}, wordCache: {} }),
    }),
    { name: 'sikh-scripture-cache' }
  )
)
