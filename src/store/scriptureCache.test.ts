import { describe, it, expect, beforeEach } from 'vitest'
import { useScriptureCacheStore } from './scriptureCache'
import type { MahanKoshEntry, ScriptureEntry, Word } from '../types'

const mockEntry: ScriptureEntry = {
  id: 'G-1-1', scripture: 'SGGS', ang: 1,
  gurmukhi: 'ੴ', transliteration: 'ik', translation_en: 'One', translation_hi: 'एक', translation_pa: 'ਇੱਕ',
  words: [],
}

const mockWords: Word[] = [
  { gurmukhi: 'ੴ', transliteration: 'ik', meaning_en: 'One', meaning_hi: 'एक', meaning_pa: 'ਇੱਕ' },
]

const mockMahanKoshEntry: MahanKoshEntry = {
  id: 1,
  word: 'ੴ',
  searchKey: 'ik',
  transliteration: 'ik',
  roman: 'ik',
  hindi: 'एक',
  description: 'One universal creator',
  description_hi: 'एक ओंकार',
  exactMatch: true,
  sourceUrl: 'https://example.com',
}

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

  it('sets and gets mahankosh data', () => {
    const s = useScriptureCacheStore.getState()
    s.setMahanKosh('ੴ', [mockMahanKoshEntry])
    expect(s.getMahanKosh('ੴ')).toEqual([mockMahanKoshEntry])
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

  it('evicts the oldest ang entries when the ang cache limit is exceeded', () => {
    const s = useScriptureCacheStore.getState()

    for (let ang = 1; ang <= 41; ang += 1) {
      s.setAng('G', ang, [{ ...mockEntry, id: `G-${ang}-1`, ang }])
    }

    expect(s.getAng('G', 1)).toBeUndefined()
    expect(s.getAng('G', 41)).toEqual([{ ...mockEntry, id: 'G-41-1', ang: 41 }])
    expect(Object.keys(useScriptureCacheStore.getState().angCache)).toHaveLength(40)
  })

  it('refreshes a word entry instead of evicting it when it is written again', () => {
    const s = useScriptureCacheStore.getState()

    for (let shabadId = 1; shabadId <= 80; shabadId += 1) {
      s.setWords(shabadId, [{ ...mockWords[0], transliteration: `ik-${shabadId}` }])
    }

    s.setWords(1, mockWords)
    s.setWords(81, [{ ...mockWords[0], transliteration: 'ik-81' }])

    expect(s.getWords(1)).toEqual(mockWords)
    expect(s.getWords(2)).toBeUndefined()
    expect(Object.keys(useScriptureCacheStore.getState().wordCache)).toHaveLength(80)
  })

  it('caps the mahankosh cache to the configured limit', () => {
    const s = useScriptureCacheStore.getState()

    for (let index = 1; index <= 121; index += 1) {
      s.setMahanKosh(`word-${index}`, [{ ...mockMahanKoshEntry, id: index, word: `word-${index}` }])
    }

    expect(s.getMahanKosh('word-1')).toBeUndefined()
    expect(s.getMahanKosh('word-121')).toEqual([{ ...mockMahanKoshEntry, id: 121, word: 'word-121' }])
    expect(Object.keys(useScriptureCacheStore.getState().mahankoshCache)).toHaveLength(120)
  })
})
