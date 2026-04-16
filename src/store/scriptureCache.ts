import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MahanKoshEntry, ScriptureEntry, Word } from '../types'

type BaniSource = 'G' | 'D' | 'B' | 'N' | 'A' | 'S' | 'R'

interface ScriptureCacheState {
  angCache: Record<string, ScriptureEntry[]>
  angOrder: string[]
  wordCache: Record<string, Word[]>
  wordOrder: string[]
  mahankoshCache: Record<string, MahanKoshEntry[]>
  mahankoshOrder: string[]
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
const ANG_CACHE_LIMIT = 40
const WORD_CACHE_LIMIT = 80
const MAHANKOSH_CACHE_LIMIT = 120

function applyBoundedCache<T>(
  cache: Record<string, T>,
  order: string[],
  key: string,
  value: T,
  limit: number
) {
  const nextOrder = [...order.filter(entry => entry !== key), key]
  const nextCache = { ...cache, [key]: value }

  while (nextOrder.length > limit) {
    const oldestKey = nextOrder.shift()
    if (!oldestKey) break
    delete nextCache[oldestKey]
  }

  return {
    cache: nextCache,
    order: nextOrder,
  }
}

export const useScriptureCacheStore = create<ScriptureCacheState>()(
  persist(
    (set, get) => ({
      angCache: {},
      angOrder: [],
      wordCache: {},
      wordOrder: [],
      mahankoshCache: {},
      mahankoshOrder: [],
      getAng: (source, ang) => get().angCache[angKey(source, ang)],
      setAng: (source, ang, entries) => set(state => {
        const next = applyBoundedCache(
          state.angCache,
          state.angOrder,
          angKey(source, ang),
          entries,
          ANG_CACHE_LIMIT
        )

        return {
          angCache: next.cache,
          angOrder: next.order,
        }
      }),
      getWords: (shabadId) => get().wordCache[String(shabadId)],
      setWords: (shabadId, words) => set(state => {
        const next = applyBoundedCache(
          state.wordCache,
          state.wordOrder,
          String(shabadId),
          words,
          WORD_CACHE_LIMIT
        )

        return {
          wordCache: next.cache,
          wordOrder: next.order,
        }
      }),
      getMahanKosh: (word) => get().mahankoshCache[word],
      setMahanKosh: (word, entries) => set(state => {
        const next = applyBoundedCache(
          state.mahankoshCache,
          state.mahankoshOrder,
          word,
          entries,
          MAHANKOSH_CACHE_LIMIT
        )

        return {
          mahankoshCache: next.cache,
          mahankoshOrder: next.order,
        }
      }),
      getEntryById: (id) => Object.values(get().angCache).flat().find(e => e.id === id),
      clearAll: () => set({
        angCache: {},
        angOrder: [],
        wordCache: {},
        wordOrder: [],
        mahankoshCache: {},
        mahankoshOrder: [],
      }),
    }),
    { name: 'sikh-scripture-cache' }
  )
)
