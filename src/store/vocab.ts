import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { VocabEntry } from '../types'

interface VocabState {
  vocab: VocabEntry[]
  addWord: (entry: VocabEntry) => void
  removeWord: (word: string) => void
}

export const useVocabStore = create<VocabState>()(
  persist(
    (set) => ({
      vocab: [],
      addWord: (entry) => set(state => ({
        vocab: state.vocab.some(v => v.word === entry.word)
          ? state.vocab
          : [...state.vocab, entry],
      })),
      removeWord: (word) => set(state => ({
        vocab: state.vocab.filter(v => v.word !== word),
      })),
    }),
    { name: 'sikh-vocab' }
  )
)
