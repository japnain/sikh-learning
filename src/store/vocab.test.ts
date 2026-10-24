import { beforeEach, expect, test, vi } from 'vitest'
import { isVocabEntryPersisted, useVocabStore } from './vocab'
import { useSavedFeedbackStore } from './savedFeedback'
import * as activityEvents from './activityEvents'

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
