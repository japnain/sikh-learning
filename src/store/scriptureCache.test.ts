import { describe, it, expect, beforeEach } from 'vitest'
import { useScriptureCacheStore } from './scriptureCache'
import type { BanidbKoshDefinition, MahanKoshEntry, RehatChapterContent, RehatChapterSummary, RehatSummary, ScriptureEntry, Word } from '../types'

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

const mockBanidbKoshEntry: BanidbKoshDefinition = {
  id: 1,
  word: 'ik oankar',
  wordUni: 'ੴ',
  definition: 'One Creator',
  definitionUni: 'ਇੱਕ ਕਰਤਾ ਪੁਰਖ',
}

const mockRehats: RehatSummary[] = [
  { rehatId: 1, rehatName: 'Sikh Rehat Maryada', alphabet: 'S' },
]

const mockRehatChapters: RehatChapterSummary[] = [
  { chapterId: 11, chapterName: 'Daily Discipline', alphabet: 'D' },
]

const mockRehatChapter: RehatChapterContent = {
  rehatId: 1,
  chapterId: 11,
  chapterName: 'Daily Discipline',
  chapterContent: '<p>Amritvela and nitnem.</p>',
  alphabet: 'D',
}

beforeEach(() => { useScriptureCacheStore.getState().clearAll() })

describe('scriptureCache', () => {
  it('starts empty', () => {
    const s = useScriptureCacheStore.getState()
    expect(s.angCache).toEqual({})
    expect(s.wordCache).toEqual({})
    expect(s.completeAngKeys).toEqual([])
    expect(s.studyEntries).toEqual([])
  })

  it('sets and gets ang entries', () => {
    const s = useScriptureCacheStore.getState()
    s.setAng('G', 1, [mockEntry])
    expect(s.getAng('G', 1)).toEqual([mockEntry])
    expect(s.hasCompleteAng('G', 1)).toBe(true)
    expect(s.hasCompleteAng('D', 1)).toBe(false)
    expect(JSON.parse(localStorage.getItem('sikh-scripture-cache')!).state.completeAngKeys).toEqual(['G-1'])
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

  it('sets and gets BaniDB kosh data', () => {
    const s = useScriptureCacheStore.getState()
    s.setBanidbKosh('ੴ', [mockBanidbKoshEntry])
    expect(s.getBanidbKosh('ੴ')).toEqual([mockBanidbKoshEntry])
  })

  it('sets and gets rehat list data', () => {
    const s = useScriptureCacheStore.getState()
    s.setRehats(mockRehats)
    expect(s.getRehats()).toEqual(mockRehats)
  })

  it('sets and gets rehat chapter lists', () => {
    const s = useScriptureCacheStore.getState()
    s.setRehatChapters(1, mockRehatChapters)
    expect(s.getRehatChapters(1)).toEqual(mockRehatChapters)
  })

  it('sets and gets rehat chapter content', () => {
    const s = useScriptureCacheStore.getState()
    s.setRehatChapter(1, mockRehatChapter)
    expect(s.getRehatChapter(1, 11)).toEqual(mockRehatChapter)
  })

  it('returns undefined for uncached words', () => {
    expect(useScriptureCacheStore.getState().getWords(999)).toBeUndefined()
  })

  it('clearAll empties both caches', () => {
    const s = useScriptureCacheStore.getState()
    s.setAng('G', 1, [mockEntry])
    s.setWords(1, mockWords)
    s.setStudyEntry({ ...mockEntry, id: 'bani-21-8-0', ang: 8 })
    s.clearAll()
    expect(s.getAng('G', 1)).toBeUndefined()
    expect(s.hasCompleteAng('G', 1)).toBe(false)
    expect(useScriptureCacheStore.getState().completeAngKeys).toEqual([])
    expect(useScriptureCacheStore.getState().studyEntries).toEqual([])
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
    expect(s.hasCompleteAng('G', 1)).toBe(false)
    expect(s.hasCompleteAng('G', 41)).toBe(true)
    expect(useScriptureCacheStore.getState().completeAngKeys).toHaveLength(40)
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

  it('retains legacy Ang arrays and entry lookup without certifying a partial page complete', async () => {
    const fragment = { ...mockEntry, id: 'bani-21-8-0', source: 'G' as const, ang: 8 }
    const stored = JSON.stringify({ state: { angCache: { 'G-8': [fragment] }, angOrder: ['G-8'] }, version: 0 })
    localStorage.setItem('sikh-scripture-cache', stored)
    await useScriptureCacheStore.persist.rehydrate()
    const s = useScriptureCacheStore.getState()
    expect(s.getAng('G', 8)).toEqual([fragment])
    expect(s.getEntryById(fragment.id)).toEqual(fragment)
    expect(localStorage.getItem('sikh-scripture-cache')).toBe(stored)
    expect(s.hasCompleteAng('G', 8)).toBe(false)
    expect(s.completeAngKeys).toEqual([])
  })

  it('keeps studied Bani fragments available without creating a complete or partial Ang cache entry', () => {
    const fragment = { ...mockEntry, id: 'bani-21-8-0', ang: 8 }
    const s = useScriptureCacheStore.getState()
    s.setStudyEntry(fragment)
    expect(s.getEntryById(fragment.id)).toEqual(fragment)
    expect(s.getAng('G', 8)).toBeUndefined()
    expect(s.hasCompleteAng('G', 8)).toBe(false)
    expect(JSON.parse(localStorage.getItem('sikh-scripture-cache')!).state.studyEntries).toEqual([fragment])
  })

  it('bounds Recent Study to40 unique entries and refreshes a repeated ID', () => {
    const s = useScriptureCacheStore.getState()
    for (let index = 1; index <= 40; index += 1) {
      s.setStudyEntry({ ...mockEntry, id: `bani-${index}`, ang: index })
    }
    const refreshed = { ...mockEntry, id: 'bani-1', translation_en: 'Updated available meaning' }
    s.setStudyEntry(refreshed)
    s.setStudyEntry({ ...mockEntry, id: 'bani-41', ang: 41 })
    expect(s.getEntryById('bani-1')).toEqual(refreshed)
    expect(s.getEntryById('bani-2')).toBeUndefined()
    expect(s.getEntryById('bani-41')).toEqual({ ...mockEntry, id: 'bani-41', ang: 41 })
    expect(useScriptureCacheStore.getState().studyEntries).toHaveLength(40)
    expect(useScriptureCacheStore.getState().angCache).toEqual({})
  })

  it('prefers the complete page entry when Recent Study also contains that entry ID', () => {
    const s = useScriptureCacheStore.getState()
    s.setStudyEntry({ ...mockEntry, translation_en: 'Subset meaning' })
    s.setAng('G', 1, [mockEntry])
    expect(s.getEntryById(mockEntry.id)).toEqual(mockEntry)
  })

})
