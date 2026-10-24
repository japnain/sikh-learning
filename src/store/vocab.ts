import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { VocabContext, VocabEntry, VocabKind, VocabReviewState, VocabSense } from '../types'
import { canReviewVocab, hasVocabMeaning, hasVocabSense } from '../utils/vocabReview'
import { queueActivityEvent } from './activityEvents'
import { buildVocabFeedbackId, useSavedFeedbackStore } from './savedFeedback'
import type { SavedMutationResult } from './bookmarks'

type ReviewRating = 'again' | 'good' | 'easy'

interface AddWordInput extends Omit<VocabEntry, 'review' | 'context'> {
  context?: VocabContext
}

interface VocabState {
  vocab: VocabEntry[]
  addWord: (entry: AddWordInput) => SavedMutationResult<VocabEntry>
  removeWord: (word: string, kind?: VocabKind) => void
  reviewWord: (word: string, rating: ReviewRating, kind?: VocabKind) => void
  getDueWords: (at?: Date) => VocabEntry[]
}

const VOCAB_STORAGE_KEY = 'sikh-vocab'
let persistedSnapshot: { raw: string | null; keys: Set<string>; entries: Map<string, VocabEntry> } | null = null
const vocabKey = (word: string, kind: VocabKind = 'word') => JSON.stringify([kind, word])

/** One parsed snapshot per storage value, shared by the relevant saved controls. */
export function isVocabEntryPersisted(word: string, kind: VocabKind = 'word', sense?: VocabSense): boolean {
  try {
    if (typeof window === 'undefined') return false
    const raw = window.localStorage.getItem(VOCAB_STORAGE_KEY)
    if (persistedSnapshot?.raw !== raw) {
      const stored = raw ? JSON.parse(raw) : null
      const entries: unknown = typeof stored?.version === 'number' && stored.version !== 0 ? [] : stored?.state?.vocab
      const keys = new Set<string>()
      const entriesByKey = new Map<string, VocabEntry>()
      if (Array.isArray(entries)) {
        for (const entry of entries) {
          if (entry && typeof entry.word === 'string' && entry.word.length > 0
            && (entry.kind === undefined || entry.kind === null || entry.kind === 'word' || entry.kind === 'phrase')) {
            const key = vocabKey(entry.word, entry.kind ?? 'word')
            keys.add(key)
            entriesByKey.set(key, entry)
          }
        }
      }
      persistedSnapshot = { raw, keys, entries: entriesByKey }
    }
    const key = vocabKey(word, kind)
    const entry = persistedSnapshot.entries.get(key)
    return persistedSnapshot.keys.has(key) && (!sense || Boolean(entry && hasVocabSense(entry, sense)))
  } catch {
    persistedSnapshot = null
    return false
  }
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
  persist<VocabState>(
    (set, get) => ({
      vocab: [],
      addWord: (entry): SavedMutationResult<VocabEntry> => {
        const kind = entry.kind ?? 'word'
        const existing = get().vocab.find(v => v.word === entry.word && (v.kind ?? 'word') === kind)
        const input = { ...entry, context: entry.context ?? { scripture: entry.scripture, sourceId: entry.sourceId } }
        const wasPersisted = isVocabEntryPersisted(entry.word, kind, input)
        const newSense = existing && !hasVocabSense(existing, input)
        const incomingSense: VocabSense = {
          meaning_en: input.meaning_en, meaning_hi: input.meaning_hi, meaning_pa: input.meaning_pa,
          context: input.context, definitionSource: input.definitionSource,
        }
        const needsPrimaryAnswer = existing && !hasVocabMeaning(existing) && hasVocabMeaning(input)
        const vocabEntry: VocabEntry = existing ? (newSense ? {
          ...existing,
          ...(needsPrimaryAnswer ? incomingSense : {}),
          senses: needsPrimaryAnswer
            ? [...(existing.senses ?? []), { meaning_en: existing.meaning_en, meaning_hi: existing.meaning_hi, meaning_pa: existing.meaning_pa, context: existing.context, definitionSource: existing.definitionSource }]
            : [...(existing.senses ?? []), incomingSense],
        } : existing) : {
          ...entry,
          kind,
          context: input.context,
          review: createInitialReviewState(new Date(entry.savedAt)),
        }

        let persisted = false
        try {
          // Retain the original review and context while adding newly chosen senses.
          set(state => ({ vocab: existing ? state.vocab.map(item => item === existing ? vocabEntry : item) : [...state.vocab, vocabEntry] }))
          persisted = Boolean(useVocabStore.persist?.getOptions().storage) && isVocabEntryPersisted(entry.word, kind, input)
        } catch {
          // Persist updates memory first. Keep the entry usable for this
          // session, but require a successful retry before confirming Saved.
        }
        if (persisted && (!existing || newSense || !wasPersisted)) {
          try {
            useSavedFeedbackStore.getState().recordSaved({
              kind: 'review', targetId: buildVocabFeedbackId(vocabEntry), surfacedAt: vocabEntry.savedAt,
            })
          } catch { /* Optional feedback cannot invalidate the main write. */ }
          try {
            queueActivityEvent('vocab.entry.added', {
              word: vocabEntry.word, kind: vocabEntry.kind, sourceId: vocabEntry.sourceId,
            }, vocabEntry.savedAt)
          } catch { /* Optional sync bookkeeping cannot invalidate the main write. */ }
        }
        return { item: vocabEntry, changed: !existing || Boolean(newSense), persisted }
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
        return canReviewVocab(entry) && new Date(dueAt).getTime() <= at.getTime()
      }),
    }),
    {
      name: VOCAB_STORAGE_KEY,
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
