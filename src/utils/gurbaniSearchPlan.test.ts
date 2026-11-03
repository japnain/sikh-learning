import { describe, expect, test } from 'vitest'
import type { SearchResult } from '../api/banidb'
import { buildGurbaniSearchPlan, derivePhoneticRequests } from './gurbaniSearchPlan'

function seed(gurmukhi: string, transliteration: string, overrides: Partial<SearchResult> = {}): SearchResult {
  return { shabadId: 1, verseId: 10, source: 'G', pageNo: 1, sourceName: 'Sri Guru Granth Sahib Ji',
    gurmukhi, transliteration, translation_en: '', raag: '', writer: '', ...overrides }
}

describe('provider request planning', () => {
  test('gives each meaning term an independent identity and marks alternatives', () => {
    const plan = buildGurbaniSearchPlan('compassion', 'english', 'G')
    expect(plan.requests.map(item => item.query)).toEqual(['compassion', 'mercy', 'kindness'])
    expect(plan.requests.map(item => item.searchType)).toEqual([3, 3, 3])
    expect(new Set(plan.requests.map(item => item.id)).size).toBe(3)
    expect(plan.requests[0]).toEqual({ id: JSON.stringify([3, 'compassion', 'G']), query: 'compassion', searchType: 3, matchQuery: 'compassion', kind: 'meaning' })
    expect(plan.requests.slice(1).every(item => item.related === true)).toBe(true)
    expect(plan.englishIntent?.topicLabel).toBe('Compassion')
  })

  test('strips a recognized question wrapper and does not send that question to phonetic search', () => {
    const plan = buildGurbaniSearchPlan('What does Gurbani say about anger?', 'auto-detect', 'all')
    expect(plan.requests.map(item => item.query)).toEqual(['anger', 'wrath', 'rage'])
    expect(plan.requests.every(item => item.searchType === 3)).toBe(true)
    expect(plan.englishIntent?.isNaturalLanguage).toBe(true)
  })

  test('retains phonetic retrieval for short ambiguous Roman-letter input', () => {
    const plan = buildGurbaniSearchPlan('sat nam', 'auto-detect', 'all')
    expect(plan.requests.map(item => [item.query, item.searchType, item.kind])).toEqual([
      ['sat nam', 3, 'meaning'], ['sat nam', 8, 'transliteration'],
    ])
  })

  test('keeps transliteration separate from English topic interpretation', () => {
    const plan = buildGurbaniSearchPlan('compassion', 'transliteration', 'D')
    expect(plan.requests).toEqual([{ id: JSON.stringify([8, 'compassion', 'D']), query: 'compassion', searchType: 8, matchQuery: 'compassion', kind: 'transliteration' }])
    expect(plan.englishIntent).toBeUndefined()
  })

  test.each([
    ['satnam', 'sat naam'], ['satnaam', 'sat naam'],
    ['wahe guru', 'waheguru'], ['vahe guru', 'waheguru'],
    ['ek onkar', 'ikoankaar'], ['ik onkar', 'ikoankaar'],
    ['ik oankaar satnam', 'ikoankaar sat naam'],
    ['kirpa', 'kirapaa'], ['simran', 'simaran'],
  ])('adds known phonetic retrieval alias for %s while retaining the original request and match query', (query, providerQuery) => {
    for (const mode of ['auto-detect', 'transliteration'] as const) {
      const phonetic = buildGurbaniSearchPlan(query, mode, 'all').requests.filter(item => item.searchType === 8)
      expect(phonetic.map(item => item.query)).toEqual([query, providerQuery])
      expect(phonetic[1]).toMatchObject({ matchQuery: query, id: JSON.stringify([8, providerQuery, 'all']) })
      expect(phonetic[0].matchQuery).toBe(query)
    }
  })

  test.each(['peace*', 'peace OR love', 'peace AND love', '+peace -anger', 'peace|love'])('keeps explicit operator query %s literal', query => {
    const plan = buildGurbaniSearchPlan(query, 'auto-detect', 'all')
    expect(plan.requests.map(item => [item.query, item.searchType, item.related])).toEqual([[query, 3, undefined]])
  })

  test.each(['ek onkar', 'ik onkar', 'ik oankaar', 'ek oankaar'])('adds the paged observed symbol lookup for %s', query => {
    const script = buildGurbaniSearchPlan(query, 'transliteration', 'G').requests.find(item => item.searchType === 2)
    expect(script).toEqual({ id: JSON.stringify([2, 'ੴ', 'G']), query: 'ੴ', searchType: 2, matchQuery: query, kind: 'transliteration' })
    expect(buildGurbaniSearchPlan(`"${query}"`, 'transliteration', 'G').requests.some(item => item.searchType === 2)).toBe(false)
  })

  test.each(['"compassion"', '“compassion”', '"peace of mind"'])('quoted query %s bypasses related terms', query => {
    const plan = buildGurbaniSearchPlan(query, 'auto-detect', 'all')
    expect(plan.requests).toHaveLength(1)
    expect(plan.requests[0].searchType).toBe(3)
    expect(plan.requests[0].related).toBeUndefined()
    expect(plan.requests[0].query).toBe(query.replace(/["“”]/g, ''))
  })

  test('does not broaden negation or collapse an explicit English number into an ang lookup', () => {
    expect(buildGurbaniSearchPlan('without fear', 'english', 'all').requests.map(item => item.query)).toEqual(['without fear'])
    expect(buildGurbaniSearchPlan('12', 'english', 'all').requests[0].searchType).toBe(3)
    expect(buildGurbaniSearchPlan('੧੨', 'auto-detect', 'all').requests).toEqual([])
    expect(buildGurbaniSearchPlan('1430', 'ang', 'G').requests).toEqual([])
  })

  test('preserves explicit script and first-letter modes', () => {
    expect(buildGurbaniSearchPlan('ਸਤਿ ਨਾਮੁ', 'gurmukhi', 'G').requests[0]).toMatchObject({ query: 'ਸਤਿ ਨਾਮੁ', searchType: 2, kind: 'gurmukhi' })
    expect(buildGurbaniSearchPlan('ਸ ਸ ਨ ਹ', 'first-letters', 'all').requests[0]).toMatchObject({ query: 'ਸਸਨਹ', searchType: 0, kind: 'initials' })
    expect(buildGurbaniSearchPlan('ਸਸਨਹ', 'first-letters-anywhere', 'all').requests[0].searchType).toBe(1)
    expect(buildGurbaniSearchPlan('death ਵਾਹਿਗੁਰੂ', 'auto-detect', 'all').requests.map(item => item.searchType)).toEqual([2, 0, 1, 3, 8])
  })

  test('normalizes stable request identity while separating sources', () => {
    const a = buildGurbaniSearchPlan('  hukam  ', 'transliteration', 'G').requests[0]
    const b = buildGurbaniSearchPlan('hukam', 'transliteration', 'G').requests[0]
    const c = buildGurbaniSearchPlan('hukam', 'transliteration', 'D').requests[0]
    expect(a.id).toBe(b.id)
    expect(a.id).not.toBe(c.id)
    expect(buildGurbaniSearchPlan('', 'auto-detect', 'all').requests).toEqual([])
    expect(buildGurbaniSearchPlan('a'.repeat(161), 'english', 'all').requests).toEqual([])
  })
})

describe('observed phonetic expansion', () => {
  test('derives a paged main-letter request from an aligned hukam seed', () => {
    const rows = [seed('ਹੁਕਮੀ ਹੁਕਮੁ ਚਲਾਏ ਰਾਹੁ ॥', 'hukamee hukam chalaae raahu ||')]
    expect(derivePhoneticRequests('hukam', 'transliteration', 'G', rows)).toEqual([
      { id: JSON.stringify([6, '*ਹਕਮ*', 'G']), query: '*ਹਕਮ*', searchType: 6, matchQuery: 'hukam', kind: 'transliteration' },
    ])
    expect(rows[0].gurmukhi).toBe('ਹੁਕਮੀ ਹੁਕਮੁ ਚਲਾਏ ਰਾਹੁ ॥')
  })

  test.each(['sat nam', 'satnam'])('keeps the entire matched phrase for %s instead of a broad naam anchor', query => {
    const rows = [seed('ਸਤਿ ਨਾਮੁ ਤੇਰਾ ਪਰਾ ਪੂਰਬਲਾ ॥੧॥', 'sat naam teraa paraa poorabalaa ||1||')]
    expect(derivePhoneticRequests(query, 'transliteration', 'all', rows).map(item => item.query)).toEqual(['*ਸਤ*ਨਮ*'])
  })

  test('uses shared phonetic matching for optional schwa spellings and nasal parentheses', () => {
    const rows = [seed('ਕਿਰਪਾ ਕਰੋ ॥', 'kirapaa karo ||'), seed('ਧੰਨੁ ਗੁਰੂ ॥', 'dha(n)n guroo ||')]
    expect(derivePhoneticRequests('kirpa', 'transliteration', 'all', rows).map(item => item.query)).toEqual(['*ਕਰਪ*'])
    expect(derivePhoneticRequests('dhan guroo', 'transliteration', 'all', rows).map(item => item.query)).toEqual(['*ਧਨ*ਗਰ*'])
  })

  test('matches a spaced wahe guru alias to an observed single script word', () => {
    const rows = [seed('ਵਾਹਿਗੁਰੂ ਤੇਰਾ ਸਭੁ ਸਦਕਾ ॥', 'vaahiguroo teraa sabh sadhakaa ||')]
    expect(derivePhoneticRequests('wahe guru', 'transliteration', 'all', rows).map(item => item.query)).toEqual(['*ਵਹਗਰ*'])
  })

  test('removes subjoined ra but preserves independent vowels according to the official defaults', () => {
    const rows = [seed('ਪ੍ਰੇਮ ਓਹੁ ॥', 'prem oh ||')]
    expect(derivePhoneticRequests('prem oh', 'transliteration', 'all', rows).map(item => item.query)).toEqual(['*ਪਮ*ਓਹ*'])
    expect(derivePhoneticRequests('prem', 'transliteration', 'all', rows)).toEqual([])
    expect(derivePhoneticRequests('oh', 'transliteration', 'all', rows)).toEqual([])
  })

  test('rejects ambiguous word alignment, unrelated seed words and reordered phrases', () => {
    const rows = [
      seed('ਸਤਿਨਾਮੁ ॥', 'sat naam ||'),
      seed('ਸਤਿ ਨਾਨਕੁ ॥', 'sat naanak ||'),
      seed('ਨਾਮੁ ਤੇਰਾ ਸਤਿ ਹੈ ॥', 'naam teraa sat hai ||'),
      seed('ਸਤਿ ਹਰਿ ਨਾਮੁ ॥', 'sat har naam ||'),
    ]
    expect(derivePhoneticRequests('sat nam', 'transliteration', 'all', rows)).toEqual([])
  })

  test('deduplicates anchors, limits expansion and respects the selected source', () => {
    const rows = [
      seed('ਭਭਰ ॥', 'bhabhar ||'), seed('ਭਭਰਿ ॥', 'bhabhar ||'),
      seed('ਬਭਰ ॥', 'babhar ||'), seed('ਭਬਰ ॥', 'bhabar ||'),
      seed('ਬਬਰ ॥', 'babar ||'),
    ]
    const expanded = derivePhoneticRequests('bhabhar', 'transliteration', 'all', rows)
    expect(expanded).toHaveLength(3)
    expect(expanded.map(item => item.query)).toEqual(['*ਭਭਰ*', '*ਬਭਰ*', '*ਭਬਰ*'])
    expect(new Set(expanded.map(item => item.id)).size).toBe(expanded.length)
    expect(derivePhoneticRequests('bhabhar', 'transliteration', 'D', rows)).toEqual([])
  })

  test.each(['english', 'gurmukhi', 'first-letters', 'ang'] as const)('does not derive phonetic requests for %s intent', mode => {
    expect(derivePhoneticRequests('hukam', mode, 'all', [seed('ਹੁਕਮੁ ॥', 'hukam ||')])).toEqual([])
  })

  test('does not expand quoted phrases, script queries or empty input', () => {
    const rows = [seed('ਹੁਕਮੁ ॥', 'hukam ||')]
    for (const query of ['"hukam"', 'ਹੁਕਮੁ', '']) expect(derivePhoneticRequests(query, 'auto-detect', 'all', rows)).toEqual([])
  })
})
