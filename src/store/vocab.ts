import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { VocabContext, VocabEntry, VocabReviewState } from '../types'

type ReviewRating = 'again' | 'good' | 'easy'

interface AddWordInput extends Omit<VocabEntry, 'review' | 'context'> {
  context?: VocabContext
}

interface VocabState {
  vocab: VocabEntry[]
  addWord: (entry: AddWordInput) => void
  removeWord: (word: string) => void
  reviewWord: (word: string, rating: ReviewRating) => void
  getDueWords: (at?: Date) => VocabEntry[]
}

function createInitialReviewState(referenceDate = new Date()): VocabReviewState {
  return {
    dueAt: referenceDate.toISOString(),
    intervalDays: 0,
    reviewCount: 0,
  }
}

function getNextReviewState(current: VocabReviewState | undefined, rating: ReviewRating): VocabReviewState {
  const now = new Date()

  if (rating === 'again') {
    return {
      dueAt: now.toISOString(),
      intervalDays: 0,
      reviewCount: current?.reviewCount ?? 0,
      lastReviewedAt: now.toISOString(),
    }
  }

  const currentInterval = current?.intervalDays ?? 0
  const nextInterval = rating === 'easy'
    ? Math.max(3, currentInterval * 2 || 4)
    : Math.max(1, currentInterval === 0 ? 1 : Math.ceil(currentInterval * 1.8))

  const dueDate = new Date(now)
  dueDate.setDate(dueDate.getDate() + nextInterval)

  return {
    dueAt: dueDate.toISOString(),
    intervalDays: nextInterval,
    reviewCount: (current?.reviewCount ?? 0) + 1,
    lastReviewedAt: now.toISOString(),
  }
}

function normalizeEntry(entry: VocabEntry): VocabEntry {
  return {
    ...entry,
    context: entry.context ?? {
      scripture: entry.scripture,
      sourceId: entry.sourceId,
    },
    review: entry.review ?? createInitialReviewState(new Date(entry.savedAt)),
  }
}

export const useVocabStore = create<VocabState>()(
  persist(
    (set, get) => ({
      vocab: [],
      addWord: (entry) => set(state => ({
        vocab: state.vocab.some(v => v.word === entry.word)
          ? state.vocab
          : [...state.vocab, {
            ...entry,
            context: entry.context ?? {
              scripture: entry.scripture,
              sourceId: entry.sourceId,
            },
            review: createInitialReviewState(new Date(entry.savedAt)),
          }],
      })),
      removeWord: (word) => set(state => ({
        vocab: state.vocab.filter(v => v.word !== word),
      })),
      reviewWord: (word, rating) => set(state => ({
        vocab: state.vocab.map(entry => (
          entry.word === word
            ? { ...entry, review: getNextReviewState(entry.review, rating) }
            : entry
        )),
      })),
      getDueWords: (at = new Date()) => get().vocab.filter(entry => {
        const dueAt = entry.review?.dueAt ?? entry.savedAt
        return new Date(dueAt).getTime() <= at.getTime()
      }),
    }),
    {
      name: 'sikh-vocab',
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<VocabState> | undefined
        const persistedVocab = persisted?.vocab ?? []
        return {
          ...currentState,
          ...persisted,
          vocab: persistedVocab.map(normalizeEntry),
        }
      },
    }
  )
)
