import type { ScriptureEntry } from '../types'

export interface BaniFindHit {
  entryIndex: number
  lineIndex: number
  entryId: string
  source: ScriptureEntry['source']
  ang: number
  verseId: number
  gurmukhi: string
  transliteration: string
  matchedField: 'gurmukhi' | 'transliteration'
}

/** Search-only normalization: retain Gurmukhi vowel signs and never rewrite scripture. */
export function normalizeBaniFindText(text: string): string {
  return text.normalize('NFKD')
    .replace(/(\p{Script=Latin})\p{M}+/gu, '$1')
    .normalize('NFC').toLocaleLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/gu, '')
    .replace(/\p{P}+/gu, ' ')
    .replace(/\s+/gu, ' ').trim()
}

const wordCharacter = /[\p{L}\p{M}\p{N}]/u

export interface BaniFindFragment { text: string; match: boolean }

const graphemeSegmenter = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null

/** Map search-normalized matches back to whole, unmodified display graphemes. */
export function getBaniFindFragments(text: string, query: string): BaniFindFragment[] {
  const needle = normalizeBaniFindText(query)
  if (!needle || query.length > 240 || !graphemeSegmenter) return [{ text, match: false }]
  let normalized = ''
  const starts: number[] = []
  const ends: number[] = []
  for (const { segment, index } of graphemeSegmenter.segment(text)) {
    const folded = normalizeBaniFindText(segment) || (/[\s\p{P}]/u.test(segment) ? ' ' : '')
    for (let offset = 0; offset < folded.length; offset += 1) {
      const character = folded[offset]
      if (character === ' ' && (!normalized || normalized.endsWith(' '))) continue
      normalized += character
      starts.push(index)
      ends.push(index + segment.length)
    }
  }
  const ranges: { start: number; end: number }[] = []
  let index = normalized.indexOf(needle)
  while (index >= 0) {
    const range = { start: starts[index], end: ends[index + needle.length - 1] }
    const previous = ranges.at(-1)
    if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end)
    else ranges.push(range)
    index = normalized.indexOf(needle, index + needle.length)
  }
  if (!ranges.length) return [{ text, match: false }]
  const fragments: BaniFindFragment[] = []
  let cursor = 0
  for (const range of ranges) {
    if (range.start > cursor) fragments.push({ text: text.slice(cursor, range.start), match: false })
    fragments.push({ text: text.slice(range.start, range.end), match: true })
    cursor = range.end
  }
  if (cursor < text.length) fragments.push({ text: text.slice(cursor), match: false })
  return fragments
}

function matches(text: string, query: string, wholeWords: boolean): boolean {
  const normalized = normalizeBaniFindText(text)
  if (!wholeWords) return normalized.includes(query)
  let index = normalized.indexOf(query)
  while (index >= 0) {
    const before = Array.from(normalized.slice(0, index)).at(-1) ?? ''
    const after = Array.from(normalized.slice(index + query.length))[0] ?? ''
    if (!wordCharacter.test(before) && !wordCharacter.test(after)) return true
    index = normalized.indexOf(query, index + 1)
  }
  return false
}

/** Results retain source and line indices, even when verse IDs repeat across scriptures. */
export function findBaniLines(
  entries: readonly ScriptureEntry[],
  query: string,
  options: { limit?: number; wholeWords?: boolean } = {},
): BaniFindHit[] {
  const needle = normalizeBaniFindText(query)
  if (!needle || query.length > 240) return []
  const requestedLimit = options.limit ?? 100
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(200, Math.floor(requestedLimit))) : 100
  const hits: BaniFindHit[] = []
  for (const [entryIndex, entry] of entries.entries()) {
    const lines = entry.lines?.length ? entry.lines : [{
      ...entry, verseId: entry.verseIds?.[0] ?? 0,
    }]
    for (const [lineIndex, line] of lines.entries()) {
      const transliteration = line.transliteration ?? ''
      const matchedField = matches(line.gurmukhi, needle, options.wholeWords ?? false)
        ? 'gurmukhi' : matches(transliteration, needle, options.wholeWords ?? false) ? 'transliteration' : null
      if (!matchedField) continue
      hits.push({
        entryIndex, lineIndex, entryId: entry.id, source: entry.source,
        ang: line.ang, verseId: line.verseId,
        gurmukhi: line.gurmukhi, transliteration, matchedField,
      })
      if (hits.length >= limit) return hits
    }
  }
  return hits
}
