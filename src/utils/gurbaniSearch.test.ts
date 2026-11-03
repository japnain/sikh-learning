import { describe, expect, test } from 'vitest'
import type { SearchResult } from '../api/banidb'
import type { SearchMode } from '../types'
import type { SearchRequest } from './gurbaniSearchPlan'
import {
  getBackendSearchTypes,
  getSearchMatchKind,
  getSearchMinimumLength,
  isDirectSearch,
  mergeGurbaniSearchResults,
  normalizeGurbaniSearchQuery,
  normalizeRomanizedSearch,
  type GurbaniSearchResultSet,
} from './gurbaniSearch'

function result(verseId: number, fields: Partial<SearchResult> = {}): SearchResult {
  return {
    verseId, shabadId: 1, source: 'G', pageNo: 1,
    sourceName: 'Sri Guru Granth Sahib Ji', gurmukhi: 'ਹੁਕਮਿ',
    transliteration: '', translation_en: '', raag: 'Jap', writer: 'Guru Nanak Dev Ji',
    ...fields,
  }
}

describe('search intent routing', () => {
  test('combines English and actual phonetic search for Latin queries', () => {
    expect(getBackendSearchTypes('compassion', 'auto-detect')).toEqual([3, 8])
    expect(getBackendSearchTypes('sat naam', 'auto-detect')).toEqual([3, 8])
    expect(getBackendSearchTypes('hukam', 'transliteration')).toEqual([8])
    expect(getBackendSearchTypes('compassion', 'english')).toEqual([3])
  })

  test.each([
    ['gurmukhi', 2], ['first-letters', 0], ['first-letters-anywhere', 1],
  ] as const)('keeps explicit %s searches in the chosen index', (mode, type) => {
    expect(getBackendSearchTypes('ਸਸਨਹ', mode)).toEqual([type])
  })

  test('uses Gurmukhi search for script input and never legacy romanized initials for words', () => {
    expect(getBackendSearchTypes('ਸਤਿ ਨਾਮੁ', 'auto-detect')).toContain(2)
    const modes: SearchMode[] = ['auto-detect', 'english', 'transliteration', 'gurmukhi']
    for (const mode of modes) expect(getBackendSearchTypes('hukam', mode)).not.toContain(4)
  })

  test.each(['1', '001', '੧੪੩੦', '१४३०'])('routes %s directly without a network word search', query => {
    expect(isDirectSearch(query, 'auto-detect')).toBe(true)
    expect(getBackendSearchTypes(query, 'auto-detect')).toEqual([])
    expect(getSearchMinimumLength(query, 'auto-detect')).toBe(1)
  })

  test.each(['0', '-1', '1.5', '1e2', '12 ang'])('does not misclassify %s as an automatic ang lookup', query => {
    expect(isDirectSearch(query, 'auto-detect')).toBe(false)
  })

  test('numeric meaning searches retain their explicit intent', () => {
    expect(isDirectSearch('12', 'english')).toBe(false)
    expect(getBackendSearchTypes('12', 'english')).toEqual([3])
    expect(getBackendSearchTypes('1430', 'ang')).toEqual([])
    expect(getBackendSearchTypes('', 'auto-detect')).toEqual([])
  })

  test.each(['auto-detect', 'gurmukhi'] as const)('allows the complete one-glyph ੴ query in %s mode', mode => {
    expect(getSearchMinimumLength('ੴ', mode)).toBe(1)
    expect(getSearchMinimumLength(' ੴ ', mode)).toBe(1)
    expect(isDirectSearch('ੴ', mode)).toBe(false)
    expect(getBackendSearchTypes('ੴ', mode)).toContain(2)
    expect(getSearchMinimumLength('ਸ', mode)).toBe(2)
  })

  test.each(['english', 'transliteration', 'first-letters', 'first-letters-anywhere'] as const)('keeps other minimum lengths unchanged in %s mode', mode => {
    expect(getSearchMinimumLength('ੴ', mode)).toBe(2)
  })
})

describe('request-backed relevance', () => {
  function lane(results: SearchResult[], fields: Partial<SearchRequest> = {}): GurbaniSearchResultSet {
    const request: SearchRequest = {
      id: 'meaning:anger', query: 'anger', searchType: 3, matchQuery: 'anger', kind: 'meaning', ...fields,
    }
    return { results, searchType: request.searchType, request }
  }

  test('uses each conversational query term and shows the translation that actually matched it', () => {
    const verse = result(1, { translation_en: 'Release your rage.', translations_en: { ms: 'Put aside your wrath.' } })
    const matches = mergeGurbaniSearchResults([lane([verse], {
      query: 'wrath', matchQuery: 'wrath', related: true,
    })], 'What does Gurbani say about anger?', 'english')
    expect(matches).toEqual([{ ...verse, translation_en: 'Put aside your wrath.',
      searchMatch: { kind: 'meaning', query: 'wrath', related: true } }])
    expect(verse).not.toHaveProperty('searchMatch')
    expect(verse.translation_en).toBe('Release your rage.')
  })

  test('places literal index inflections above exact synonym matches', () => {
    const related = result(1, { translation_en: 'Wrath' })
    const literal = result(2, { translation_en: 'Do not become angered.' })
    const matches = mergeGurbaniSearchResults([
      lane([related], { query: 'wrath', matchQuery: 'wrath', related: true }),
      lane([literal]),
    ], 'anger', 'english')
    expect(matches.map(match => match.verseId)).toEqual([2, 1])
    expect(matches.map(match => match.searchMatch?.related)).toEqual([false, true])
  })

  test.each([false, true])('a duplicate verse retains its literal translation and provenance regardless of arrival order (%s)', reverse => {
    const verse = result(1, { translation_en: 'Wrath', translations_en: { ms: 'Do not become angered.' } })
    const literalVerse = { ...verse, translation_en: 'Do not become angered.' }
    const sets = [lane([verse], { query: 'wrath', matchQuery: 'wrath', related: true }), lane([literalVerse])]
    const matches = mergeGurbaniSearchResults(reverse ? sets.reverse() : sets, 'anger', 'english')
    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({ translation_en: literalVerse.translation_en,
      searchMatch: { kind: 'meaning', query: 'anger', related: false } })
  })

  test('validates main-letter expansion results against the full original phonetic phrase', () => {
    const matching = result(1, { transliteration: 'kirapaa karahu har raai' })
    const interrupted = result(2, { transliteration: 'kirapaa meree karahu' })
    const reordered = result(3, { transliteration: 'karahu kirapaa' })
    const otherVowels = result(4, { transliteration: 'karapaa karahu' })
    const matches = mergeGurbaniSearchResults([lane([interrupted, reordered, otherVowels, matching], {
      query: '*ਕਰਪ*ਕਰਹ*', searchType: 6, matchQuery: 'kirpa karahu', kind: 'transliteration',
    })], 'kirpa karahu', 'transliteration')
    expect(matches).toEqual([{ ...matching, searchMatch: { kind: 'transliteration', query: 'kirpa karahu', related: false } }])
  })

  test('does not promote a partial final word from a broad main-letter request', () => {
    const verse = result(1, { transliteration: 'hukam rajaiee chalanaa' })
    const fields = { query: '*ਹਕਮ*ਰਜ*', searchType: 6, matchQuery: 'hukam raja', kind: 'transliteration' as const }
    expect(mergeGurbaniSearchResults([lane([verse], fields)], 'hukam raja', 'transliteration')).toEqual([])
    expect(mergeGurbaniSearchResults([lane([verse], { ...fields, searchType: 8 })], 'hukam raja', 'transliteration')).toHaveLength(1)
  })

  test.each([
    ['simran', 'simaran'], ['kirpa', 'kirapaa'], ['wahe guru kirpa', 'vaahiguroo kirapaa'],
    ['satnam simran', 'sat naam simaran'],
    ['ek onkar', 'ikOankaar'], ['ik oankaar', 'ikOankaar'],
  ])('accepts complete phonetic spellings %s and %s', (query, transliteration) => {
    const verse = result(1, { transliteration })
    expect(mergeGurbaniSearchResults([lane([verse], { query, matchQuery: query, searchType: 8, kind: 'transliteration' })], query, 'transliteration'))
      .toHaveLength(1)
  })

  test('does not classify meaning-only omni candidates as phonetic results', () => {
    const meaningOnly = result(1, { transliteration: 'satigur naanak', translation_en: 'Waheguru appears.' })
    expect(mergeGurbaniSearchResults([lane([meaningOnly], {
      query: 'waheguru', matchQuery: 'waheguru', kind: 'transliteration', searchType: 8,
    })], 'waheguru', 'auto-detect')).toEqual([])
  })

  test('uses explicit result provenance before guessing from the original question or reader mode', () => {
    const related = result(1, { translation_en: 'Mercy', searchMatch: { kind: 'meaning', query: 'mercy', related: true } })
    expect(getSearchMatchKind(related, 'What does Gurbani say about compassion?', 'auto-detect')).toBe('english')
    expect(getSearchMatchKind(related, 'mercy', 'transliteration')).toBe('english')
    const phonetic = result(2, { searchMatch: { kind: 'transliteration', query: 'kirpa', related: false } })
    expect(getSearchMatchKind(phonetic, '*ਕਰਪ*', 'english')).toBe('transliteration')
  })

  test('keeps legacy result objects free of new request provenance', () => {
    const verse = result(1, { translation_en: 'Anger' })
    expect(mergeGurbaniSearchResults([{ searchType: 3, results: [verse] }], 'anger', 'english')).toEqual([verse])
  })
})

describe('query normalization', () => {
  test('cleans pasted whitespace, invisible characters and surrounding smart quotes', () => {
    expect(normalizeGurbaniSearchQuery('  “\uFEFFsat\u200B   naam”\n')).toBe('sat naam')
    expect(normalizeGurbaniSearchQuery('God’s\t compassion')).toBe("God's compassion")
  })

  test('preserves Gurmukhi vowel marks while cleaning formatting characters', () => {
    expect(normalizeGurbaniSearchQuery('  ਸਤਿ\u200D  ਨਾਮੁ  ')).toBe('ਸਤਿ ਨਾਮੁ')
    expect(normalizeGurbaniSearchQuery('ਸੋਚੈ ਸੋਚਿ ਨ ਹੋਵਈ')).toBe('ਸੋਚੈ ਸੋਚਿ ਨ ਹੋਵਈ')
  })

  test('joins spaced initials only for explicit initials searches', () => {
    expect(normalizeGurbaniSearchQuery('ਸ ਸ ਨ ਹ ॥', 'first-letters')).toBe('ਸਸਨਹ')
    expect(normalizeGurbaniSearchQuery('ਸ, ਸ; ਨ: ਹ।', 'first-letters-anywhere')).toBe('ਸਸਨਹ')
    expect(normalizeGurbaniSearchQuery('ਸਤਿ ਨਾਮੁ', 'gurmukhi')).toBe('ਸਤਿ ਨਾਮੁ')
  })

  test.each([
    ['sat nam', 'sat naam'],
    ['waheguru', 'vaahiguroo'],
    ['dhan', 'dha(n)n'],
    ['NĀAM', 'naam'],
  ])('recognizes romanization variants %s and %s', (query, spelling) => {
    expect(normalizeRomanizedSearch(query)).toBe(normalizeRomanizedSearch(spelling))
  })
})

describe('candidate relevance', () => {
  test.each(['auto-detect', 'transliteration'] as const)('removes initial-letter noise from %s results', mode => {
    const noise = result(1, { transliteration: 'har jee kirapaa karahu', translation_en: 'Show kindness to me.' })
    const match = result(10, { transliteration: 'hukam rajaiee chalanaa naanak likhiaa naal ||1||' })
    expect(mergeGurbaniSearchResults([{ searchType: 8, results: [noise, match] }], 'hukam', mode)).toEqual([match])
  })

  test('matches sat nam as a contiguous phrase without accepting sat naanak or reordered words', () => {
    const candidates = [
      result(12822, { transliteration: 'bisavaiaas sat naanak gur te paiee ||6||' }),
      result(17375, { transliteration: 'sat sat sat naanak kahiaa' }),
      result(3, { transliteration: 'naam teraa sat hai' }),
      result(46273, { transliteration: 'sat naam teraa paraa poorabalaa ||' }),
    ]
    expect(mergeGurbaniSearchResults([{ searchType: 8, results: candidates }], 'sat nam', 'transliteration'))
      .toEqual([candidates[3]])
  })

  test('finds vaahiguroo while excluding a verse that only mentions Waheguru in its translation', () => {
    const romanized = result(200432, { transliteration: 'pauRee 49 : vaahiguroo ma(n)tr', translation_en: 'Waheguru mantar' })
    const meaningOnly = result(207749, { transliteration: 'satigur naanak dhev paarabraham pooran braham', translation_en: 'Waheguru in the form of Guru Nanak Dev.' })
    const sets = [{ searchType: 8, results: [meaningOnly, romanized] }]
    expect(mergeGurbaniSearchResults(sets, 'waheguru', 'transliteration')).toEqual([romanized])
    expect(mergeGurbaniSearchResults(sets, 'waheguru', 'auto-detect')).toHaveLength(2)
  })

  test('permits a substantial final word prefix while keeping earlier words exact and contiguous', () => {
    const matching = result(1, { transliteration: 'hukam rajaiee chalanaa' })
    const interrupted = result(2, { transliteration: 'hukam na rajaiee' })
    const reordered = result(3, { transliteration: 'rajaiee hukam' })
    const sets = [{ searchType: 8, results: [interrupted, reordered, matching] }]
    expect(mergeGurbaniSearchResults(sets, 'hukam raja', 'transliteration')).toEqual([matching])
    expect(mergeGurbaniSearchResults(sets, 'hukam r', 'transliteration')).toEqual([])
  })

  test('does not let English substrings masquerade as whole-word Omni meaning matches', () => {
    const glove = result(1, { translation_en: 'A glove is worn.' })
    const love = result(2, { translation_en: 'Love brings peace.' })
    const sets = [{ searchType: 8, results: [glove, love] }]
    expect(mergeGurbaniSearchResults(sets, 'love', 'english')).toEqual([love])
    expect(mergeGurbaniSearchResults(sets, 'love', 'auto-detect')).toEqual([love])
  })

  test('retains trusted English index inflections below exact word matches', () => {
    const inflection = result(1, { translation_en: 'The peacefully accepting sing.' })
    const exact = result(2, { translation_en: 'Peace comes to your home.' })
    expect(mergeGurbaniSearchResults([{ searchType: 3, results: [inflection, exact] }], 'peace', 'english'))
      .toEqual([exact, inflection])
  })

  test('selects the matching translation from every available English source without mutating the verse', () => {
    const verse = result(1, {
      translation_en: 'The merciful Lord.',
      translations_en: { bdb: 'The merciful Lord.', ms: 'The Lord shows compassion.', ssk: 'The forgiving Lord.' },
    })
    expect(mergeGurbaniSearchResults([{ searchType: 8, results: [verse] }], 'compassion', 'english'))
      .toEqual([{ ...verse, translation_en: 'The Lord shows compassion.' }])
    expect(verse.translation_en).toBe('The merciful Lord.')
    expect(getSearchMatchKind(verse, 'compassion', 'auto-detect')).toBe('english')
  })

  test('selects the strongest matching translation instead of the default source', () => {
    const verse = result(1, {
      translation_en: 'Love and lasting peace.',
      translations_en: { bdb: 'Love and lasting peace.', ms: 'Peace love', ssk: 'Peace and love.' },
    })
    expect(mergeGurbaniSearchResults([{ searchType: 8, results: [verse] }], 'peace love', 'english')[0]?.translation_en)
      .toBe('Peace love')
  })

  test('ranks complete English phrases before reordered word matches', () => {
    const reordered = result(1, { translation_en: 'Love and lasting peace.' })
    const phrase = result(2, { translation_en: 'Peace and love fill the home.' })
    expect(mergeGurbaniSearchResults([{ searchType: 8, results: [reordered, phrase] }], 'peace and love', 'english'))
      .toEqual([phrase, reordered])
    expect(mergeGurbaniSearchResults([{ searchType: 8, results: [reordered, phrase] }], 'peace love', 'english'))
      .toEqual([reordered, phrase])
  })

  test('deduplicates repeated pages and search lanes by source, shabad and verse', () => {
    const verse = result(10, { transliteration: 'hukam rajaiee chalanaa', translation_en: 'The Hukam of His Command.' })
    const anotherSource = { ...verse, source: 'D' }
    const anotherShabad = { ...verse, shabadId: 2 }
    const sets = [
      { searchType: 3, results: [verse] },
      { searchType: 8, results: [{ ...verse }, anotherSource, anotherShabad] },
      { searchType: 3, results: [{ ...verse }] },
    ]
    expect(mergeGurbaniSearchResults(sets, 'hukam', 'auto-detect')).toEqual([verse, anotherSource, anotherShabad])
  })

  test('upgrades an existing verse when another lane supplies the matching translation', () => {
    const earlier = result(1, { translation_en: 'Peacefully accepting.' })
    const stronger = { ...earlier, translations_en: { ms: 'Peace fills the home.' } }
    expect(mergeGurbaniSearchResults([
      { searchType: 3, results: [earlier] },
      { searchType: 8, results: [stronger] },
    ], 'peace', 'auto-detect')).toEqual([{ ...stronger, translation_en: 'Peace fills the home.' }])
  })

  test('reports the actual matching field in auto mode', () => {
    expect(getSearchMatchKind(result(1, { transliteration: 'hukam rajaiee' }), 'hukam', 'auto-detect')).toBe('transliteration')
    expect(getSearchMatchKind(result(2, { translation_en: 'Peace within.' }), 'peace', 'auto-detect')).toBe('english')
    expect(getSearchMatchKind(result(3, { transliteration: 'har har' }), 'hukam', 'auto-detect')).toBeNull()
    expect(getSearchMatchKind(result(4), 'ਹੁਕਮਿ', 'auto-detect')).toBe('gurmukhi')
  })
})
