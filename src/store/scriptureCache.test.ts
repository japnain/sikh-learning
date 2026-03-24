import { describe, it, expect, beforeEach } from 'vitest'
import { useScriptureCacheStore } from './scriptureCache'
import type { ScriptureEntry, Word } from '../types'

const mockEntry: ScriptureEntry = {
  id: 'G-1-1', scripture: 'SGGS', ang: 1,
  gurmukhi: 'ੴ', transliteration: 'ik', translation_en: 'One', translation_pa: 'ਇੱਕ',
  words: [],
}

const mockWords: Word[] = [
  { gurmukhi: 'ੴ', transliteration: 'ik', meaning_en: 'One', meaning_pa: 'ਇੱਕ' },
]

beforeEach(() => { useScriptureCacheStore.getState().clearAll() })

describe('scriptureCache', () => {
  it('starts empty', () => {
    const s = useScriptureCacheStore.getState()
    expect(s.angCache).toEqual({})
    expect(s.wordCache).toEqual({})
  })

  it('sets and gets ang entries', () => {
    const s = useScriptureCacheStore.getState()
    s.setAng('G', 1, [mockEntry])
    expect(s.getAng('G', 1)).toEqual([mockEntry])
  })

  it('returns undefined for uncached ang', () => {
    expect(useScriptureCacheStore.getState().getAng('G', 999)).toBeUndefined()
  })

  it('sets and gets word data', () => {
    const s = useScriptureCacheStore.getState()
    s.setWords(1, mockWords)
    expect(s.getWords(1)).toEqual(mockWords)
  })

  it('returns undefined for uncached words', () => {
    expect(useScriptureCacheStore.getState().getWords(999)).toBeUndefined()
  })

  it('clearAll empties both caches', () => {
    const s = useScriptureCacheStore.getState()
    s.setAng('G', 1, [mockEntry])
    s.setWords(1, mockWords)
    s.clearAll()
    expect(s.getAng('G', 1)).toBeUndefined()
  })

  it('getEntryById finds entry across all cached angs', () => {
    const s = useScriptureCacheStore.getState()
    s.setAng('G', 1, [mockEntry])
    expect(s.getEntryById('G-1-1')).toEqual(mockEntry)
  })

  it('getEntryById returns undefined for unknown ID', () => {
    expect(useScriptureCacheStore.getState().getEntryById('G-999-999')).toBeUndefined()
  })
})
