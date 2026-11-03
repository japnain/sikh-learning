import { describe, expect, test } from 'vitest'
import { getSearchHighlightFragments, hasSearchMatch } from './searchHighlight'

function marked(text: string, query: string, mode: 'literal' | 'transliteration' = 'literal') {
  const fragments = getSearchHighlightFragments(text, query, 2, mode)
  expect(fragments.map(fragment => fragment.text).join('')).toBe(text)
  return fragments.filter(fragment => fragment.match).map(fragment => fragment.text)
}

describe('search result highlighting', () => {
  test('retains token matches across punctuation, whitespace and mixed case', () => {
    expect(marked('Without—fear,\nwithout hatred.', 'without fear')).toEqual(['Without', 'fear', 'without'])
    expect(hasSearchMatch('A life without fear.', 'FEAR')).toBe(true)
    expect(hasSearchMatch('A life without fear.', 'peace')).toBe(false)
  })

  test('keeps overlapping matches together without losing text', () => {
    expect(marked('Sat naam satnaam.', 'sat naam')).toEqual(['Sat', 'naam', 'satnaam'])
  })

  test('canonical Gurmukhi matches include vowel signs and retain original encoding', () => {
    expect(marked('ਸਤਿ ਨਾਮੁ', 'ਸਤ')).toEqual(['ਸਤਿ'])
    expect(marked('ਸ਼ਬਦ ਸ਼ਬਦ', 'ਸ਼ਬਦ')).toEqual(['ਸ਼ਬਦ', 'ਸ਼ਬਦ'])
    expect(marked('ਨਾਮੁ', 'ਨਮ')).toEqual([])
  })

  test('phonetic variants and Latin accents highlight intact original words', () => {
    expect(marked('sat nām, sat naam, sat nam.', 'sat naam', 'transliteration'))
      .toEqual(['sat', 'nām', 'sat', 'naam', 'sat', 'nam'])
    expect(marked('vaahiguroo vaahiguroo', 'waheguru', 'transliteration'))
      .toEqual(['vaahiguroo', 'vaahiguroo'])
    expect(marked('na\u0304m', 'naam', 'transliteration')).toEqual(['na\u0304m'])
    expect(marked('anand naam', 'naam', 'transliteration')).toEqual(['naam'])
  })

  test('phonetic folding is opt-in and never strips Gurmukhi vowel signs', () => {
    expect(marked('naam', 'nam')).toEqual([])
    expect(marked('ਨਾਮੁ', 'ਨਮ', 'transliteration')).toEqual([])
    expect(marked('ਨਾਮੁ', 'ਨਾ', 'transliteration')).toEqual(['ਨਾ'])
  })

  test.each([
    ['kirapaa', 'kirpa'], ['kirpa', 'kirapaa'],
    ['simaran', 'simran'], ['simran', 'simaran'],
  ])('highlights optional unstressed vowels in %s for %s', (text, query) => {
    expect(marked(text, query, 'transliteration')).toEqual([text])
  })

  test('follows word-boundary aliases in both query and displayed romanization', () => {
    expect(marked('sat naam', 'satnam', 'transliteration')).toEqual(['sat', 'naam'])
    expect(marked('satnam', 'sat naam', 'transliteration')).toEqual(['satnam'])
    expect(marked('vaahiguroo', 'wahe guru', 'transliteration')).toEqual(['vaahiguroo'])
    expect(marked('wahe\t guru', 'vaahiguroo', 'transliteration')).toEqual(['wahe', 'guru'])
    expect(marked('ik onkar', 'ikoankaar', 'transliteration')).toEqual(['ik', 'onkar'])
  })

  test('does not join phonetic words across intervening scripture or punctuation', () => {
    expect(marked('wahe ॥ guru', 'vaahiguroo', 'transliteration')).toEqual([])
    expect(marked('wahe, guru', 'vaahiguroo', 'transliteration')).toEqual([])
    expect(marked('naam anand', 'naam', 'transliteration')).toEqual(['naam'])
  })

  test('treats wahe guru as one alias without highlighting its unrelated individual words', () => {
    expect(marked('vaahiguroo vaeh guru', 'wahe guru', 'transliteration')).toEqual(['vaahiguroo'])
    expect(marked('vaahiguroo vaeh guru wahe guru', 'wahe guru', 'transliteration'))
      .toEqual(['vaahiguroo', 'wahe', 'guru'])
    expect(marked('wahe, guru', 'wahe guru', 'transliteration')).toEqual([])
  })

  test('treats regular expression syntax as ordinary search input', () => {
    expect(marked('a+b aab <script>', 'a+b')).toEqual(['a+b'])
    expect(marked('anything', '')).toEqual([])
    expect(marked('anything', 'a'.repeat(241))).toEqual([])
  })
})
