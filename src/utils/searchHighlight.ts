import { matchRomanizedWord, normalizeRomanizedSearch } from './romanizedSearch'

export type SearchHighlightMode = 'literal' | 'transliteration'
export interface SearchHighlightFragment { text: string; match: boolean }

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function getSearchHighlightTokens(query: string, minimumTokenLength = 2) {
  return [...new Set(
    query
      .split(/[\s,.;:!?()[\]{}"'“”‘’/\\|-]+/)
      .map(token => token.trim())
      .filter(token => token.length >= minimumTokenLength)
  )].sort((left, right) => right.length - left.length)
}

export function buildSearchHighlightPattern(tokens: string[]) {
  return new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'gi')
}

export function hasSearchMatch(text: string, query: string, minimumTokenLength = 2) {
  return getSearchHighlightFragments(text, query, minimumTokenLength).some(fragment => fragment.match)
}

const graphemeSegmenter = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null

/** Match a search representation while retaining every original display character. */
export function getSearchHighlightFragments(
  text: string,
  query: string,
  minimumTokenLength = 2,
  mode: SearchHighlightMode = 'literal',
): SearchHighlightFragment[] {
  const tokens = getSearchHighlightTokens(query.trim().normalize('NFC'), minimumTokenLength)
  if (!text || !tokens.length || query.length > 240 || !graphemeSegmenter) return [{ text, match: false }]

  let normalized = ''
  const starts: number[] = []
  const ends: number[] = []
  for (const { segment, index } of graphemeSegmenter.segment(text)) {
    const folded = segment.normalize('NFC').toLowerCase()
    normalized += folded
    for (let offset = 0; offset < folded.length; offset += 1) {
      starts.push(index)
      ends.push(index + segment.length)
    }
  }

  const ranges: Array<{ start: number; end: number }> = []
  for (const token of tokens) {
    // Romanized words use the phonetic matcher below. Literal substrings would
    // highlight unrelated pieces of a recognized alias or a partial word.
    if (mode === 'transliteration' && /\p{Script=Latin}/u.test(token)) continue
    const needle = token.toLowerCase()
    let index = normalized.indexOf(needle)
    while (index >= 0) {
      ranges.push({ start: starts[index], end: ends[index + needle.length - 1] })
      index = normalized.indexOf(needle, index + needle.length)
    }
  }

  if (mode === 'transliteration') {
    const normalizedTokens = normalizeRomanizedSearch(query).split(' ').filter(Boolean)
    const queryWords = [...query.matchAll(/\p{Script=Latin}[\p{Script=Latin}\p{M}]*/gu)]
    const joinedAlias = queryWords.length > 1 && normalizedTokens.length === 1
    const originalTokens = joinedAlias ? [] : tokens.filter(token => /^\p{Script=Latin}[\p{Script=Latin}\p{M}]*$/u.test(token))
    const lastOriginal = joinedAlias ? undefined : queryWords.at(-1)?.[0]
    const phoneticTokens = [...new Set([...originalTokens, ...normalizedTokens])]
    const matchesWord = (word: string, allowPrefix: boolean) => matchRomanizedWord(word, query)
      || phoneticTokens.some(token => matchRomanizedWord(word, token,
        allowPrefix && (token === lastOriginal || token === normalizedTokens.at(-1))))
    const words = [...text.matchAll(/\p{Script=Latin}[\p{Script=Latin}\p{M}]*/gu)]
    const markWord = (word: RegExpExecArray) => ranges.push({ start: word.index, end: word.index + word[0].length })
    // Phonetic spelling can change character counts. Mark the original word as
    // a whole rather than slicing its letters using normalized string offsets.
    for (const [index, word] of words.entries()) {
      if (matchesWord(word[0], true)) markWord(word)
      // Aliases can join words ("wahe guru") or split them ("satnam").
      // Only join adjacent whitespace-separated words when normalization itself
      // recognizes the alias, keeping punctuation and unrelated words untouched.
      const next = words[index + 1]
      if (next && /^\s+$/.test(text.slice(word.index + word[0].length, next.index))) {
        const phrase = `${word[0]} ${next[0]}`
        if (normalizeRomanizedSearch(phrase).split(' ').length === 1 && matchesWord(phrase, false)) {
          markWord(word)
          markWord(next)
        }
      }
    }
  }

  if (!ranges.length) return [{ text, match: false }]
  ranges.sort((left, right) => left.start - right.start || left.end - right.end)
  const merged: typeof ranges = []
  for (const range of ranges) {
    const previous = merged.at(-1)
    if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end)
    else merged.push({ ...range })
  }

  const fragments: SearchHighlightFragment[] = []
  let cursor = 0
  for (const range of merged) {
    if (cursor < range.start) fragments.push({ text: text.slice(cursor, range.start), match: false })
    fragments.push({ text: text.slice(range.start, range.end), match: true })
    cursor = range.end
  }
  if (cursor < text.length) fragments.push({ text: text.slice(cursor), match: false })
  return fragments
}
