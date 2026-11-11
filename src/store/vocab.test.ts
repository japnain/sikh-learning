import { beforeEach, expect, test, vi } from 'vitest'
import { isVocabEntryPersisted, useVocabStore } from './vocab'
import { useSavedFeedbackStore } from './savedFeedback'
import * as activityEvents from './activityEvents'
import type { VocabEntry } from '../types'
import { createLocalCollection } from '../utils/localCollection'

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  useVocabStore.setState({ vocab: [] })
  useSavedFeedbackStore.getState().clearSaved()
})

test('retains an added word for this session and reports an unsuccessful storage write', () => {
  const previous = { word: 'ਸਤਿ', transliteration: 'sat', meaning_en: 'Truth', meaning_hi: 'सत्य', meaning_pa: 'ਸੱਚ', scripture: 'SGGS', sourceId: 'G', savedAt: '2026-04-05T00:00:00.000Z' }
  useVocabStore.getState().addWord(previous)
  const savedBeforeFailure = localStorage.getItem('sikh-vocab')
  const storage = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new DOMException('Storage full', 'QuotaExceededError') })
  const input = { ...previous, word: 'ਨਾਮੁ', transliteration: 'naam', meaning_en: 'Name', context: { scripture: 'SGGS', sourceId: 'G', ang: 1, shabadId: 1, verseId: 12, line: 'ਸਤਿ ਨਾਮੁ' } }

  let result: unknown
  expect(() => { result = useVocabStore.getState().addWord(input) }).not.toThrow()
  expect(result).toMatchObject({ changed: true, persisted: false, item: { word: 'ਨਾਮੁ' } })
  expect(useVocabStore.getState().vocab.map(entry => entry.word)).toEqual(['ਸਤਿ', 'ਨਾਮੁ'])
  expect(localStorage.getItem('sikh-vocab')).toBe(savedBeforeFailure)
  storage.mockRestore()
})

test('retrying a session-retained word persists it once without replacing review or context', () => {
  const input = { word: 'ਨਾਮੁ', transliteration: 'naam', meaning_en: 'Name', meaning_hi: 'नाम', meaning_pa: 'ਨਾਮ', scripture: 'SGGS', sourceId: 'G', savedAt: '2026-04-05T00:00:00.000Z', context: { scripture: 'SGGS', sourceId: 'G', ang: 1, verseId: 12 } }
  const storage = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Unavailable') })
  const activity = vi.spyOn(activityEvents, 'queueActivityEvent')
  expect(useVocabStore.getState().addWord(input)).toMatchObject({ changed: true, persisted: false })
  expect(useSavedFeedbackStore.getState().lastSaved).toBeNull()
  expect(activity).not.toHaveBeenCalled()
  storage.mockRestore()
  const retained = useVocabStore.getState().vocab[0]

  const result = useVocabStore.getState().addWord(input)
  expect(result).toMatchObject({ changed: false, persisted: true })
  expect(useVocabStore.getState().vocab).toEqual([retained])
  expect(JSON.parse(localStorage.getItem('sikh-vocab') ?? '{}').state.vocab).toEqual([retained])
  expect(isVocabEntryPersisted(input.word)).toBe(true)
  expect(useVocabStore.getState().addWord(input)).toMatchObject({ changed: false, persisted: true })
  expect(activity).toHaveBeenCalledTimes(1)
})

test.each(['feedback', 'activity'] as const)('optional %s failure does not invalidate a durable vocabulary save', failure => {
  if (failure === 'feedback') vi.spyOn(useSavedFeedbackStore.getState(), 'recordSaved').mockImplementation(() => { throw new Error('Feedback unavailable') })
  else vi.spyOn(activityEvents, 'queueActivityEvent').mockImplementation(() => { throw new Error('Activity unavailable') })
  const result = useVocabStore.getState().addWord({ word: 'ਨਾਮੁ', transliteration: 'naam', meaning_en: 'Name', meaning_hi: 'नाम', meaning_pa: 'ਨਾਮ', scripture: 'SGGS', sourceId: 'G', savedAt: '2026-04-05T00:00:00.000Z' })
  expect(result).toMatchObject({ changed: true, persisted: true })
  expect(isVocabEntryPersisted('ਨਾਮੁ')).toBe(true)
})

test('durability distinguishes a legacy word from a phrase with the same text', () => {
  localStorage.clear()
  localStorage.setItem('sikh-vocab', JSON.stringify({ state: { vocab: [{ word: 'ਨਾਮੁ' }, { word: 'ਸਤਿ', kind: 'phrase' }] }, version: 0 }))
  expect(isVocabEntryPersisted('ਨਾਮੁ')).toBe(true)
  expect(isVocabEntryPersisted('ਨਾਮੁ', 'phrase')).toBe(false)
  expect(isVocabEntryPersisted('ਸਤਿ')).toBe(false)
  expect(isVocabEntryPersisted('ਸਤਿ', 'phrase')).toBe(true)
  localStorage.setItem('sikh-vocab', JSON.stringify({ state: { vocab: [{ word: 'ਨਾਮੁ' }] }, version: 99 }))
  expect(isVocabEntryPersisted('ਨਾਮੁ')).toBe(false)
})

test('adds saved word with review metadata', () => {
  useVocabStore.getState().addWord({
    word: 'ਨਾਮੁ',
    transliteration: 'naam',
    meaning_en: 'Name',
    meaning_hi: 'नाम',
    meaning_pa: 'ਨਾਮ',
    scripture: 'SGGS',
    sourceId: 'G',
    savedAt: '2026-04-05T00:00:00.000Z',
  })

  const entry = useVocabStore.getState().vocab[0]
  expect(entry.review?.intervalDays).toBe(0)
  expect(entry.context?.scripture).toBe('SGGS')
})

test('moves reviewed words out of the due queue', () => {
  useVocabStore.getState().addWord({
    word: 'ਸਤਿ',
    transliteration: 'sat',
    meaning_en: 'Truth',
    meaning_hi: 'सत्य',
    meaning_pa: 'ਸੱਚ',
    scripture: 'SGGS',
    sourceId: 'G',
    savedAt: '2026-04-05T00:00:00.000Z',
  })

  expect(useVocabStore.getState().getDueWords()).toHaveLength(1)
  useVocabStore.getState().reviewWord('ਸਤਿ', 'good')
  expect(useVocabStore.getState().getDueWords()).toHaveLength(0)
})

test('keeps words and phrases separate in the review store', () => {
  const store = useVocabStore.getState()

  store.addWord({
    kind: 'word',
    word: 'ਨਾਮੁ',
    transliteration: 'naam',
    meaning_en: 'Name',
    meaning_hi: 'नाम',
    meaning_pa: 'ਨਾਮ',
    scripture: 'SGGS',
    sourceId: 'G',
    savedAt: '2026-04-05T00:00:00.000Z',
  })

  store.addWord({
    kind: 'phrase',
    word: 'ੴ ਸਤਿ ਨਾਮੁ',
    transliteration: 'ik oankaar sat naam',
    meaning_en: 'One Creator, Truth is the Name',
    meaning_hi: 'एक ओंकार सतिनाम',
    meaning_pa: 'ਇੱਕ ਅਕਾਲ ਪੁਰਖ, ਸੱਚਾ ਨਾਮ',
    scripture: 'SGGS',
    sourceId: 'G',
    savedAt: '2026-04-05T00:00:00.000Z',
  })

  store.reviewWord('ੴ ਸਤਿ ਨਾਮੁ', 'easy', 'phrase')

  expect(useVocabStore.getState().vocab).toHaveLength(2)
  expect(useVocabStore.getState().getDueWords()).toHaveLength(1)
  expect(useVocabStore.getState().getDueWords()[0].word).toBe('ਨਾਮੁ')
})

test('unavailable storage at initialization retains usable memory without confirming persistence', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')!
  Object.defineProperty(window, 'localStorage', { configurable: true, get: () => { throw new DOMException('Blocked', 'SecurityError') } })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.resetModules()
  try {
    const { useVocabStore: unavailableStore, isVocabEntryPersisted: isPersisted } = await import('./vocab')
    const result = unavailableStore.getState().addWord({ word: 'ਨਾਮੁ', transliteration: 'naam', meaning_en: 'Name', meaning_hi: 'नाम', meaning_pa: 'ਨਾਮ', scripture: 'SGGS', sourceId: 'G', savedAt: '2026-04-05T00:00:00.000Z' })
    expect(result).toMatchObject({ changed: true, persisted: false })
    expect(unavailableStore.getState().vocab[0]?.word).toBe('ਨਾਮੁ')
    expect(isPersisted('ਨਾਮੁ')).toBe(false)
  } finally {
    Object.defineProperty(window, 'localStorage', descriptor)
    vi.resetModules()
  }
})


test('keeps additional meanings and verse contexts without overwriting the first sense or its review', () => {
  const input = { word: 'ਨਾਮੁ', transliteration: 'naam', meaning_en: 'Name', meaning_hi: '', meaning_pa: '', scripture: 'SGGS', sourceId: 'G', savedAt: '2026-04-05T00:00:00.000Z', context: { scripture: 'SGGS', sourceId: 'G', ang: 1, verseId: 12 } }
  useVocabStore.getState().addWord(input)
  useVocabStore.getState().reviewWord(input.word, 'good')
  const original = useVocabStore.getState().vocab[0]
  const another = {...input,meaning_en:'Identity',context:{...input.context,verseId:99},definitionSource:{name:'Mahankosh',entryId:'10'}}
  expect(useVocabStore.getState().addWord(another)).toMatchObject({changed:true,persisted:true})
  const retained = useVocabStore.getState().vocab[0]
  expect(retained.context).toEqual(original.context)
  expect(retained.meaning_en).toBe('Name')
  expect(retained.review).toEqual(original.review)
  expect(retained.senses).toEqual([expect.objectContaining({meaning_en:'Identity', context:another.context,definitionSource:another.definitionSource})])
  expect(useVocabStore.getState().addWord(another)).toMatchObject({changed:false,persisted:true})
  expect(useVocabStore.getState().vocab[0].senses).toHaveLength(1)
})

test('failed storage of a new sense is not mistaken for persistence of the original word', () => {
  const input = { word:'ਨਾਮੁ',transliteration:'naam',meaning_en:'Name',meaning_pa:'',meaning_hi:'',scripture:'SGGS',sourceId:'G',savedAt:'2026-04-05T00:00:00.000Z',context:{scripture:'SGGS',sourceId:'G',verseId:12} }
  useVocabStore.getState().addWord(input)
  const another = {...input,meaning_en:'Identity',context:{...input.context,verseId:99}}
  vi.spyOn(localStorage,'setItem').mockImplementation(() => {throw new Error('full')})
  expect(useVocabStore.getState().addWord(another)).toMatchObject({changed:true,persisted:false})
  expect(isVocabEntryPersisted(input.word,'word',input)).toBe(true)
  expect(isVocabEntryPersisted(input.word,'word',another)).toBe(false)
})

test('filling a legacy blank answer makes it reviewable while empty entries are excluded', () => {
  const input = { word:'ਨਾਮੁ',transliteration:'naam',meaning_en:'',meaning_pa:'',meaning_hi:'',scripture:'SGGS',sourceId:'G',savedAt:'2026-04-05T00:00:00.000Z' }
  useVocabStore.getState().addWord(input)
  expect(useVocabStore.getState().getDueWords()).toEqual([])
  useVocabStore.getState().addWord({...input,meaning_pa:'ਨਾਮ',definitionSource:{name:'BaniDB Kosh',entryId:'10'}})
  expect(useVocabStore.getState().getDueWords()).toHaveLength(1)
  expect(useVocabStore.getState().vocab[0].meaning_pa).toBe('ਨਾਮ')
})

const completePhrase: VocabEntry = {
  kind: 'phrase', word: 'ਸਤਿ ਨਾਮੁ', transliteration: 'sat naam',
  meaning_en: 'True Name', meaning_pa: 'ਸੱਚਾ ਨਾਮ', meaning_hi: 'सत्य नाम',
  scripture: 'SGGS', sourceId: 'G', savedAt: '2026-04-05T00:00:00.000Z',
  context: { scripture: 'SGGS', sourceId: 'G', ang: 1, shabadId: 1, verseId: 12, line: 'ੴ ਸਤਿ ਨਾਮੁ' },
  definitionSource: { name: 'Dictionary', entryId: '12' },
  review: { dueAt: '2026-04-20T00:00:00.000Z', intervalDays: 15, reviewCount: 7, lastReviewedAt: '2026-04-05T00:00:00.000Z' },
  senses: [{ meaning_en: 'Truth is the Name', meaning_pa: '', meaning_hi: '',
    definitionSource: { name: 'Another dictionary', entryId: '9' },
    context: { scripture: 'SGGS', sourceId: 'G', ang: 2, shabadId: 2, verseId: 40, line: 'Another context' } }],
}

test('Undo restores the complete phrase and original review history without changing a same-text word', () => {
  const word: VocabEntry = { ...completePhrase, kind: 'word', senses: undefined }
  useVocabStore.setState({ vocab: [completePhrase, word] })
  const removed = useVocabStore.getState().removeWord(completePhrase.word, 'phrase')
  expect(removed).toEqual({ changed: true, persisted: true, item: completePhrase })
  expect(useVocabStore.getState().vocab).toEqual([word])
  const restored = useVocabStore.getState().restoreWord(removed.item!)
  expect(restored).toEqual({ changed: true, persisted: true, item: completePhrase })
  expect(useVocabStore.getState().vocab).toHaveLength(2)
  expect(useVocabStore.getState().vocab).toEqual(expect.arrayContaining([word, completePhrase]))
  expect(JSON.parse(localStorage.getItem('sikh-vocab')!).state.vocab).toEqual(useVocabStore.getState().vocab)
})

test('failed removal and Undo keep usable session state and retry persists the full restored record', () => {
  useVocabStore.setState({ vocab: [completePhrase] })
  const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError') })
  const removed = useVocabStore.getState().removeWord(completePhrase.word, 'phrase')
  expect(removed).toMatchObject({ changed: true, persisted: false })
  expect(useVocabStore.getState().vocab).toEqual([])
  expect(useVocabStore.getState().restoreWord(removed.item!)).toMatchObject({ changed: true, persisted: false })
  expect(useVocabStore.getState().vocab).toEqual([completePhrase])
  expect(useVocabStore.getState().retryPersistence()).toBe(false)
  write.mockRestore()
  expect(useVocabStore.getState().retryPersistence()).toBe(true)
  expect(JSON.parse(localStorage.getItem('sikh-vocab')!).state.vocab).toEqual([completePhrase])
})

test('review handles thrown and silent storage failures and retries without rating twice', () => {
  useVocabStore.setState({ vocab: [completePhrase] })
  const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {})
  const result = useVocabStore.getState().reviewWord(completePhrase.word, 'good', 'phrase')
  expect(result).toMatchObject({ changed: true, persisted: false, item: { review: { reviewCount: 8 } } })
  expect(JSON.parse(localStorage.getItem('sikh-vocab')!).state.vocab[0].review.reviewCount).toBe(7)
  write.mockImplementation(() => { throw new Error('Storage blocked') })
  expect(useVocabStore.getState().retryPersistence()).toBe(false)
  write.mockRestore()
  expect(useVocabStore.getState().retryPersistence()).toBe(true)
  expect(useVocabStore.getState().vocab[0]).toEqual(result.item)
  expect(JSON.parse(localStorage.getItem('sikh-vocab')!).state.vocab[0]).toEqual(result.item)
})

test('Undo merges removed senses into a newer save without replacing its review progress', () => {
  useVocabStore.setState({ vocab: [completePhrase] })
  useVocabStore.getState().removeWord(completePhrase.word, 'phrase')
  const newer = { ...completePhrase, meaning_en: 'New meaning', context: undefined, senses: undefined,
    review: { dueAt: '2026-12-01T00:00:00.000Z', intervalDays: 40, reviewCount: 9 } }
  useVocabStore.setState({ vocab: [newer] })
  useVocabStore.getState().restoreWord(completePhrase)
  expect(useVocabStore.getState().vocab).toHaveLength(1)
  const restored = useVocabStore.getState().vocab[0]
  expect(restored.review).toEqual(newer.review)
  expect(restored.meaning_en).toBe('New meaning')
  expect(restored.senses?.map(sense => sense.meaning_en)).toEqual(['True Name', 'Truth is the Name'])
  useVocabStore.getState().restoreWord(completePhrase)
  expect(useVocabStore.getState().vocab[0].senses).toHaveLength(2)
})

test('optional activity failures cannot invalidate durable remove, restore, or review', () => {
  useVocabStore.setState({ vocab: [completePhrase] })
  vi.spyOn(activityEvents, 'queueActivityEvent').mockImplementation(() => { throw new Error('Activity unavailable') })
  expect(useVocabStore.getState().reviewWord(completePhrase.word, 'good', 'phrase').persisted).toBe(true)
  const result = useVocabStore.getState().removeWord(completePhrase.word, 'phrase')
  expect(result.persisted).toBe(true)
  expect(useVocabStore.getState().restoreWord(result.item!).persisted).toBe(true)
})

function anotherTabCollection() {
  return createLocalCollection<VocabEntry>({
    storageKey: 'sikh-vocab', getId: entry => JSON.stringify([entry.kind ?? 'word', entry.word]),
    normalize: value => value as VocabEntry,
    readLegacy: raw => JSON.parse(raw ?? '{}').state?.vocab ?? [],
    serializeLegacy: vocab => JSON.stringify({ state: { vocab }, version: 0 }),
  })
}

test('stale tabs cannot lose another tab’s additions or resurrect its deletions when reviewing a different card', () => {
  const removedElsewhere = { ...completePhrase, word: 'removed elsewhere' }
  useVocabStore.setState({ vocab: [completePhrase, removedElsewhere] })
  const otherTab = anotherTabCollection()
  const addedElsewhere = { ...completePhrase, word: 'added elsewhere' }
  otherTab.put(addedElsewhere)
  otherTab.remove(JSON.stringify(['phrase', removedElsewhere.word]))
  // No storage event has updated this tab's memory yet.
  expect(useVocabStore.getState().vocab).toHaveLength(2)
  useVocabStore.getState().reviewWord(completePhrase.word, 'good', 'phrase')
  expect(useVocabStore.getState().vocab.map(entry => entry.word)).toEqual([completePhrase.word, addedElsewhere.word])
  expect(otherTab.read().find(entry => entry.word === completePhrase.word)?.review?.reviewCount).toBe(8)
  expect(otherTab.read().some(entry => entry.word === removedElsewhere.word)).toBe(false)
})

test('retrying a failed review preserves another tab’s new items, deletions, and meanings', () => {
  const removable = { ...completePhrase, word: 'remove elsewhere' }
  useVocabStore.setState({ vocab: [completePhrase, removable] })
  const storage = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Full') })
  useVocabStore.getState().reviewWord(completePhrase.word, 'good', 'phrase')
  storage.mockRestore()
  const otherTab = anotherTabCollection()
  const addition = { ...completePhrase, word: 'another card' }
  otherTab.put(addition)
  otherTab.remove(JSON.stringify(['phrase', removable.word]))
  otherTab.put({ ...completePhrase, senses: [...completePhrase.senses!, { meaning_en: 'Saved in another tab', meaning_hi: '', meaning_pa: '' }] })
  expect(useVocabStore.getState().retryPersistence()).toBe(true)
  const saved = otherTab.read()
  expect(saved.map(entry => entry.word)).toEqual([completePhrase.word, addition.word])
  expect(saved[0].review?.reviewCount).toBe(8)
  expect(saved[0].senses).toHaveLength(2)
  expect(useVocabStore.getState().vocab).toEqual(saved)
})

test('storage events update vocabulary and a stale cloud snapshot applies only its own delta', () => {
  useVocabStore.setState({ vocab: [completePhrase] })
  const otherTab = anotherTabCollection()
  const addition = { ...completePhrase, word: 'another card' }
  otherTab.put(addition)
  useVocabStore.setState({ vocab: [{ ...completePhrase, meaning_en: 'Updated by cloud' }] })
  expect(otherTab.read().map(entry => entry.word)).toEqual([completePhrase.word, addition.word])
  otherTab.remove(JSON.stringify(['phrase', completePhrase.word]))
  window.dispatchEvent(new StorageEvent('storage', { key: 'sikh-vocab' }))
  expect(useVocabStore.getState().vocab).toEqual([addition])
})

test('retrying a failed review does not resurrect that card after another tab removes it', () => {
  useVocabStore.setState({ vocab: [completePhrase] })
  const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Full') })
  useVocabStore.getState().reviewWord(completePhrase.word, 'good', 'phrase')
  write.mockRestore()
  const otherTab = anotherTabCollection()
  otherTab.remove(JSON.stringify(['phrase', completePhrase.word]))
  expect(useVocabStore.getState().retryPersistence()).toBe(true)
  expect(useVocabStore.getState().vocab).toEqual([])
  expect(otherTab.read()).toEqual([])
})

test('a failed restore can roll back hydration without losing the pending review retry', async () => {
  useVocabStore.setState({ vocab: [completePhrase] })
  const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Full') })
  useVocabStore.getState().reviewWord(completePhrase.word, 'good', 'phrase')
  write.mockRestore()
  const rollback = useVocabStore.persist.captureRollback()
  await useVocabStore.persist.rehydrate()
  expect(useVocabStore.getState().vocab[0].review?.reviewCount).toBe(7)
  rollback()
  expect(useVocabStore.getState().vocab[0].review?.reviewCount).toBe(8)
  expect(useVocabStore.getState().retryPersistence()).toBe(true)
  expect(JSON.parse(localStorage.getItem('sikh-vocab')!).state.vocab[0].review.reviewCount).toBe(8)
})

test('an incomplete save stays retryable across repeated attempts and can be removed before storage recovers', () => {
  const originalWrite = localStorage.setItem.bind(localStorage)
  const write = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
    if (key === 'sikh-vocab') throw new Error('Mirror full')
    originalWrite(key, value)
  })
  expect(useVocabStore.getState().addWord(completePhrase).persisted).toBe(false)
  expect(isVocabEntryPersisted(completePhrase.word, 'phrase')).toBe(false)
  expect(useVocabStore.getState().addWord(completePhrase).persisted).toBe(false)
  expect(isVocabEntryPersisted(completePhrase.word, 'phrase')).toBe(false)
  useVocabStore.getState().removeWord(completePhrase.word, 'phrase')
  write.mockRestore()
  expect(useVocabStore.getState().retryPersistence()).toBe(true)
  expect(useVocabStore.getState().vocab).toEqual([])
  expect(isVocabEntryPersisted(completePhrase.word, 'phrase')).toBe(false)
})
