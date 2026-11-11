import { create } from 'zustand'
import { createLocalCollection, readResolvedLocalCollection } from '../utils/localCollection'
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
  hasPendingChanges: boolean
  addWord: (entry: AddWordInput) => SavedMutationResult<VocabEntry>
  removeWord: (word: string, kind?: VocabKind) => SavedMutationResult<VocabEntry>
  restoreWord: (entry: VocabEntry) => SavedMutationResult<VocabEntry>
  reviewWord: (word: string, rating: ReviewRating, kind?: VocabKind) => SavedMutationResult<VocabEntry>
  retryPersistence: () => boolean
  getDueWords: (at?: Date) => VocabEntry[]
}

const VOCAB_STORAGE_KEY = 'sikh-vocab'
const pendingWrites = new Map<string, { before: VocabEntry | null; after: VocabEntry | null }>()
let persistedSnapshot: { raw: string | null; keys: Set<string>; entries: Map<string, VocabEntry> } | null = null
const vocabKey = (word: string, kind: VocabKind = 'word') => JSON.stringify([kind, word])

/** One parsed snapshot per storage value, shared by the relevant saved controls. */
export function isVocabEntryPersisted(word: string, kind: VocabKind = 'word', sense?: VocabSense): boolean {
  try {
    if (typeof window === 'undefined') return false
    const pending = pendingWrites.get(vocabKey(word, kind))
    if (pending && (!pending.after || !pending.before || (sense && !hasVocabSense(pending.before, sense)))) return false
    const raw = readResolvedLocalCollection(VOCAB_STORAGE_KEY, window.localStorage)
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

function safelyQueueActivity(...args: Parameters<typeof queueActivityEvent>) {
  try { queueActivityEvent(...args) } catch { /* Activity bookkeeping cannot undo a saved mutation. */ }
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

const vocabCollection = createLocalCollection<VocabEntry>({
  storageKey: VOCAB_STORAGE_KEY,
  preservePending: false,
  getId: entry => vocabKey(entry.word, entry.kind),
  normalize: value => {
    if (!value || typeof value !== 'object') return null
    const entry = value as VocabEntry
    if (typeof entry.word !== 'string' || !entry.word.trim()
      || (entry.kind != null && entry.kind !== 'word' && entry.kind !== 'phrase')
      || !['transliteration', 'meaning_en', 'meaning_hi', 'meaning_pa', 'scripture', 'sourceId', 'savedAt'].every(key => typeof entry[key as keyof VocabEntry] === 'string')
      || !Number.isFinite(Date.parse(entry.savedAt))) return null
    return normalizeEntry(entry)
  },
  readLegacy: raw => {
    const stored = JSON.parse(raw ?? 'null')
    return stored?.version != null && stored.version !== 0 ? [] : (Array.isArray(stored?.state?.vocab) ? stored.state.vocab.map(normalizeEntry) : [])
  },
  serializeLegacy: vocab => JSON.stringify({ state: { vocab }, version: 0 }),
})

function withPending(items: VocabEntry[]) {
  const merged = new Map(items.map(entry => [vocabKey(entry.word, entry.kind), entry]))
  for (const [key, change] of pendingWrites) {
    if (change.after) merged.set(key, change.after)
    else merged.delete(key)
  }
  return [...merged.values()]
}

const vocabStore = create<VocabState>()((set, get) => {
  const currentVocab = () => withPending(vocabCollection.read(get().vocab))
  const write = (before: VocabEntry | null, after: VocabEntry | null, targetKey?: string) => {
    const entry = after ?? before!
    const key = targetKey ?? vocabKey(entry.word, entry.kind)
    const result = after ? vocabCollection.put(after, get().vocab) : vocabCollection.remove(key, get().vocab)
    if (result.persisted) pendingWrites.delete(key)
    else pendingWrites.set(key, { before: pendingWrites.has(key) ? pendingWrites.get(key)!.before : before, after })
    set({ vocab: withPending(result.items), hasPendingChanges: pendingWrites.size > 0 })
    return result.persisted
  }
  return {
      vocab: vocabCollection.read(),
      hasPendingChanges: false,
      addWord: (entry): SavedMutationResult<VocabEntry> => {
        const kind = entry.kind ?? 'word'
        const existing = currentVocab().find(v => v.word === entry.word && (v.kind ?? 'word') === kind)
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

        const persisted = write(existing ?? null, vocabEntry)
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
        const removed = currentVocab().find(entry => entry.word === word && (entry.kind ?? 'word') === kind) ?? null
        if (!removed) return { item: null, changed: false, persisted: true }
        const persisted = write(removed, null)
        if (removed && persisted) safelyQueueActivity('vocab.entry.removed', {
          word: removed.word, kind: removed.kind ?? 'word', sourceId: removed.sourceId,
        })
        return { item: removed, changed: Boolean(removed), persisted }
      },
      restoreWord: (entry) => {
        const existing = currentVocab().find(item => vocabKey(item.word, item.kind) === vocabKey(entry.word, entry.kind))
        // Do not replace a newer save made since removal. Preserve its review and
        // merge any removed senses back into it so Undo never discards meanings.
        const missingSenses = existing ? [entry, ...(entry.senses ?? [])].filter(sense => !hasVocabSense(existing, sense)) : []
        const restored = existing
          ? { ...existing, senses: [...(existing.senses ?? []), ...missingSenses.map(sense => ({
              meaning_en: sense.meaning_en, meaning_hi: sense.meaning_hi, meaning_pa: sense.meaning_pa,
              context: sense.context, definitionSource: sense.definitionSource,
            }))] }
          : entry
        const persisted = write(existing ?? null, restored)
        if (persisted) safelyQueueActivity('vocab.entry.added', {
          word: restored.word, kind: restored.kind ?? 'word', sourceId: restored.sourceId,
        })
        return { item: restored, changed: !existing || missingSenses.length > 0, persisted }
      },
      reviewWord: (word, rating, kind = 'word') => {
        const existing = currentVocab().find(entry => entry.word === word && (entry.kind ?? 'word') === kind)
        if (!existing) return { item: null, changed: false, persisted: true }
        const updated = { ...existing, review: getNextReviewState(existing.review, rating) }
        const persisted = write(existing, updated)
        if (persisted) safelyQueueActivity('vocab.entry.reviewed', { word, kind, rating }, updated.review.lastReviewedAt)
        return { item: updated, changed: true, persisted }
      },
      retryPersistence: () => {
        // Replay only unsuccessful item mutations against the current durable
        // collection. A retry never replaces unrelated work from another tab.
        for (const [key, change] of [...pendingWrites]) {
          const durableItems = vocabCollection.read(get().vocab)
          const durable = durableItems.find(entry => vocabKey(entry.word, entry.kind) === key)
          let after = change.after
          // A retry of a review or meaning edit must not resurrect an item
          // explicitly removed elsewhere. A fresh save/Undo has no before item.
          if (after && change.before && !durable) {
            pendingWrites.delete(key)
            set({ vocab: withPending(durableItems), hasPendingChanges: pendingWrites.size > 0 })
            continue
          }
          if (after && durable && change.before) {
            // Preserve fields (including new senses) another tab updated while
            // applying only the fields this session actually changed.
            const edited = Object.fromEntries(Object.entries(after).filter(([field, value]) =>
              JSON.stringify(value) !== JSON.stringify(change.before?.[field as keyof VocabEntry])))
            after = { ...durable, ...edited }
          }
          write(change.before, after, key)
        }
        return pendingWrites.size === 0
      },
      getDueWords: (at = new Date()) => get().vocab.filter(entry => {
        const dueAt = entry.review?.dueAt ?? entry.savedAt
        return canReviewVocab(entry) && new Date(dueAt).getTime() <= at.getTime()
      }),
  }
})

// Keep the established cloud/backup integration surface while item mutations
// use atomic collection records. External snapshots apply only their delta.
const setMemory = vocabStore.setState
vocabStore.setState = ((partial: Parameters<typeof setMemory>[0], replace?: boolean) => {
  const before = vocabStore.getState()
  const next = typeof partial === 'function' ? partial(before) : partial
  // Snapshot/backup rollback restores captured memory separately from its
  // transaction journal; never write another collection mutation here.
  if (replace) { setMemory(next as VocabState, true); return }
  if ('vocab' in next && next.vocab) {
    const result = vocabCollection.replace(next.vocab, undefined, before.vocab)
    const desired = new Map(next.vocab.map(entry => [vocabKey(entry.word, entry.kind), entry]))
    for (const [key, change] of pendingWrites) {
      if (JSON.stringify(desired.get(key) ?? null) !== JSON.stringify(change.after)) pendingWrites.delete(key)
    }
    setMemory({ ...next, vocab: withPending(result.items), hasPendingChanges: pendingWrites.size > 0 })
    if (!result.persisted) throw result.error ?? new Error('Vocabulary could not be saved on this device.')
  } else setMemory(next)
}) as typeof setMemory

export const useVocabStore = Object.assign(vocabStore, {
  persist: {
    getOptions: () => ({ name: VOCAB_STORAGE_KEY, version: 0, partialize: (state: VocabState) => ({ vocab: state.vocab }) }),
    rehydrate: async () => { pendingWrites.clear(); setMemory({ vocab: vocabCollection.read(), hasPendingChanges: false }) },
    captureRollback: () => {
      const original = vocabStore.getState()
      const pending = new Map(pendingWrites)
      return () => {
        pendingWrites.clear()
        for (const [key, change] of pending) pendingWrites.set(key, change)
        setMemory(original, true)
      }
    },
  },
})

export function refreshVocabFromStorage() {
  const vocab = withPending(vocabCollection.read(vocabStore.getState().vocab))
  if (JSON.stringify(vocab) !== JSON.stringify(vocabStore.getState().vocab)) setMemory({ vocab })
}

const unsubscribeVocab = vocabCollection.subscribe(items => setMemory({ vocab: withPending(items) }))
if (import.meta.hot) import.meta.hot.dispose(unsubscribeVocab)
