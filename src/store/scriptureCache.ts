import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MahanKoshEntry, ScriptureEntry, Word } from '../types'

type BaniSource = 'G' | 'D' | 'B' | 'N' | 'A' | 'S' | 'R'

interface ScriptureCacheState {
  angCache: Record<string, ScriptureEntry[]>
  wordCache: Record<string, Word[]>
  mahankoshCache: Record<string, MahanKoshEntry[]>
  getAng: (source: BaniSource, ang: number) => ScriptureEntry[] | undefined
  setAng: (source: BaniSource, ang: number, entries: ScriptureEntry[]) => void
  getWords: (shabadId: number) => Word[] | undefined
  setWords: (shabadId: number, words: Word[]) => void
  getMahanKosh: (word: string) => MahanKoshEntry[] | undefined
  setMahanKosh: (word: string, entries: MahanKoshEntry[]) => void
  getEntryById: (id: string) => ScriptureEntry | undefined
  clearAll: () => void
}

const angKey = (source: BaniSource, ang: number) => `${source}-${ang}`

export const useScriptureCacheStore = create<ScriptureCacheState>()(
  persist(
    (set, get) => ({
      angCache: {},
      wordCache: {},
      mahankoshCache: {},
      getAng: (source, ang) => get().angCache[angKey(source, ang)],
      setAng: (source, ang, entries) => set(state => ({
        angCache: { ...state.angCache, [angKey(source, ang)]: entries },
      })),
      getWords: (shabadId) => get().wordCache[String(shabadId)],
      setWords: (shabadId, words) => set(state => ({
        wordCache: { ...state.wordCache, [String(shabadId)]: words },
      })),
      getMahanKosh: (word) => get().mahankoshCache[word],
      setMahanKosh: (word, entries) => set(state => ({
        mahankoshCache: { ...state.mahankoshCache, [word]: entries },
      })),
      getEntryById: (id) => Object.values(get().angCache).flat().find(e => e.id === id),
      clearAll: () => set({ angCache: {}, wordCache: {}, mahankoshCache: {} }),
    }),
    { name: 'sikh-scripture-cache' }
  )
)
