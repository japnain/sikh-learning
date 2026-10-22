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
