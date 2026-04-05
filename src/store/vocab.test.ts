import { beforeEach, expect, test } from 'vitest'
import { useVocabStore } from './vocab'

beforeEach(() => {
  localStorage.clear()
  useVocabStore.setState({ vocab: [] })
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
