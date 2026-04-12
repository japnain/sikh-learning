import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { VocabContext, VocabEntry, VocabKind, VocabReviewState } from '../types'
import { queueActivityEvent } from './activityEvents'

type ReviewRating = 'again' | 'good' | 'easy'

interface AddWordInput extends Omit<VocabEntry, 'review' | 'context'> {
  context?: VocabContext
}

interface VocabState {
  vocab: VocabEntry[]
  addWord: (entry: AddWordInput) => void
  removeWord: (word: string, kind?: VocabKind) => void
  reviewWord: (word: string, rating: ReviewRating, kind?: VocabKind) => void
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
    kind: entry.kind ?? 'word',
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
      addWord: (entry) => {
        const existing = get().vocab.some(v => v.word === entry.word && (v.kind ?? 'word') === (entry.kind ?? 'word'))
        if (existing) return

        const vocabEntry: VocabEntry = {
          ...entry,
          kind: entry.kind ?? 'word',
          context: entry.context ?? {
            scripture: entry.scripture,
            sourceId: entry.sourceId,
          },
          review: createInitialReviewState(new Date(entry.savedAt)),
        }

        set(state => ({
          vocab: [...state.vocab, vocabEntry],
        }))
        queueActivityEvent('vocab.entry.added', {
          word: vocabEntry.word,
          kind: vocabEntry.kind,
          sourceId: vocabEntry.sourceId,
        }, vocabEntry.savedAt)
      },
      removeWord: (word, kind = 'word') => {
        const removed = get().vocab.find(entry => entry.word === word && (entry.kind ?? 'word') === kind)
        set(state => ({
          vocab: state.vocab.filter(v => !(v.word === word && (v.kind ?? 'word') === kind)),
        }))
        if (removed) {
          queueActivityEvent('vocab.entry.removed', {
            word: removed.word,
            kind: removed.kind ?? 'word',
            sourceId: removed.sourceId,
          })
        }
      },
      reviewWord: (word, rating, kind = 'word') => {
        const occurredAt = new Date().toISOString()
        let updated = false
        set(state => ({
          vocab: state.vocab.map(entry => {
            if (entry.word !== word || (entry.kind ?? 'word') !== kind) {
              return entry
            }

            updated = true
            return { ...entry, review: getNextReviewState(entry.review, rating) }
          }),
        }))
        if (updated) {
          queueActivityEvent('vocab.entry.reviewed', {
            word,
            kind,
            rating,
          }, occurredAt)
        }
      },
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
