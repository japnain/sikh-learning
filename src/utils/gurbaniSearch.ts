import { matchRomanizedWord, normalizeRomanizedSearch } from './romanizedSearch'
export { normalizeRomanizedSearch } from './romanizedSearch'
import type { SearchResult } from '../api/banidb'
import type { SearchMode } from '../types'
import { isDirectLookupQuery } from './appSearch'
import type { SearchRequest } from './gurbaniSearchPlan'

export const SEARCH_QUERY_MAX_LENGTH = 160
export const SEARCH_MODE_META: Record<SearchMode, { type: number; minLength: number }> = {
  'auto-detect': { type: 8, minLength: 2 },
  english: { type: 3, minLength: 2 },
  // BaniDB type 4 only searches word initials. Omni supplies actual phonetic
  // candidates; we verify their romanization before showing them in this mode.
  transliteration: { type: 8, minLength: 2 },
  gurmukhi: { type: 2, minLength: 2 },
  'first-letters': { type: 0, minLength: 2 },
  'first-letters-anywhere': { type: 1, minLength: 2 },
  ang: { type: -1, minLength: 1 },
}

export interface GurbaniSearchResultSet { searchType: number; results: SearchResult[]; request?: SearchRequest }
const gurmukhiPattern = /[\u0A00-\u0A7F]/u
const latinPattern = /[a-z]/i

export function normalizeGurbaniSearchQuery(query: string, mode: SearchMode = 'auto-detect') {
  const clean = query.normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ').trim().replace(/^["“]+|["”]+$/g, '').trim()
  return mode === 'first-letters' || mode === 'first-letters-anywhere'
    ? clean.replace(/[\s।॥|,.;:!?]+/g, '') : clean
}

export function isDirectSearch(query: string, mode: SearchMode) {
  return mode === 'ang' || (mode === 'auto-detect' && isDirectLookupQuery(query))
}

export function getSearchMinimumLength(query: string, mode: SearchMode) {
  if ((mode === 'auto-detect' || mode === 'gurmukhi') && query.trim() === 'ੴ') return 1
  return isDirectSearch(query, mode) ? 1 : SEARCH_MODE_META[mode].minLength
}

export function getBackendSearchTypes(query: string, mode: SearchMode): number[] {
  if (!query || isDirectSearch(query, mode)) return []
  if (mode !== 'auto-detect') return [SEARCH_MODE_META[mode].type]
  if (gurmukhiPattern.test(query)) {
    // Word search plus the two explicit initials interpretations. Avoid a
    // redundant omni call for pure Gurmukhi, which also transliterates internally.
    if (latinPattern.test(query)) return [2, 0, 1, 3, 8]
    return /[\s\u0A3E-\u0A4D\u0A70-\u0A71]/.test(query) ? [2] : [2, 0, 1]
  }
  return [3, 8]
}

function normalizeLatin(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}


function phraseScore(text: string, query: string) {
  if (!text || !query) return 0
  if (text === query) return 120
  if (` ${text} `.includes(` ${query} `)) return 100
  const words = text.split(' ')
  const tokens = query.split(' ')
  // Translation search is a word search, so all words may occur in a different
  // order. Never let "love" match only "glove" or "death" match "deaths".
  return tokens.every(token => words.includes(token)) ? 70 : 0
}

function romanizedWords(text: string) {
  const raw = normalizeLatin(text.replace(/[()]/g, '')).split(' ').filter(Boolean)
  const words: string[] = []
  for (let index = 0; index < raw.length; index += 1) {
    const pair = raw[index + 1] ? `${raw[index]} ${raw[index + 1]}` : ''
    if (pair && normalizeRomanizedSearch(pair).split(' ').length === 1) {
      words.push(pair)
      index += 1
    } else {
      const normalized = normalizeRomanizedSearch(raw[index]).split(' ')
      // A joined spelling such as satnam represents two lexical words. Other
      // words keep their original spelling for optional vowels and typed prefixes.
      words.push(...(normalized.length > 1 ? normalized : [raw[index]]))
    }
  }
  return words
}

function romanizedScore(text: string, query: string, allowPrefix = true) {
  const normalized = normalizeRomanizedSearch(text)
  const needle = normalizeRomanizedSearch(query)
  const exact = normalized === needle ? 120 : needle && ` ${normalized} `.includes(` ${needle} `) ? 100 : 0
  if (exact) return exact
  if (!needle) return 0
  const words = romanizedWords(text)
  const tokens = romanizedWords(query)
  const containsWords = (prefix: boolean) => words.some((_, index) => tokens.every((token, offset) => {
    const word = words[index + offset]
    return Boolean(word) && matchRomanizedWord(word, token, prefix && offset === tokens.length - 1)
  }))
  if (containsWords(false)) return 90
  // Tolerate a partially typed final word, never an arbitrary first-letter hit.
  return allowPrefix && containsWords(true) ? 50 : 0
}

function meaningMatch(result: Pick<SearchResult, 'translation_en' | 'translations_en'>, query: string) {
  const needle = normalizeLatin(query)
  const translations = [...new Set([result.translation_en, ...Object.values(result.translations_en ?? {})].filter(Boolean))]
  return translations.map(text => ({ text, score: phraseScore(normalizeLatin(text), needle) }))
    .sort((a, b) => b.score - a.score)[0] ?? { text: '', score: 0 }
}

export function getSearchMatchKind(result: Pick<SearchResult, 'translation_en' | 'transliteration' | 'searchMatch'>, query: string, mode: SearchMode) {
  if (result.searchMatch) return result.searchMatch.kind === 'meaning' ? 'english' : result.searchMatch.kind
  if (mode === 'english') return 'english'
  if (mode === 'transliteration') return 'transliteration'
  if (gurmukhiPattern.test(query)) return 'gurmukhi'
  if (meaningMatch(result, query).score) return 'english'
  return romanizedScore(result.transliteration, query) ? 'transliteration' : null
}

/** Merge by verse, rank meaningful matches, and show the translation that matched.
 * Type 8 mixes English, initials and phonetics. Its unrelated initials hits must
 * never masquerade as an English meaning or a transliterated word match.
 */
export function mergeGurbaniSearchResults(sets: GurbaniSearchResultSet[], query: string, mode: SearchMode): SearchResult[] {
  const ranked = new Map<string, { result: SearchResult; score: number; priority: number; order: number }>()
  let order = 0
  for (const set of sets) for (const result of set.results) {
    const request = set.request
    const matchQuery = request?.matchQuery ?? query
    const meaning = !request || request.kind === 'meaning' ? meaningMatch(result, matchQuery) : { text: '', score: 0 }
    const romanized = !request || request.kind === 'transliteration'
      ? romanizedScore(result.transliteration, matchQuery, set.searchType !== 6) : 0
    const isScript = gurmukhiPattern.test(query)
    let score: number
    // Type 3 is the provider's translation-only index, including inflected
    // words. Keep those genuine candidates below exact whole-word matches.
    if (request?.kind === 'meaning') score = meaning.score || (set.searchType === 3 ? 20 : 0)
    else if (request?.kind === 'transliteration') score = romanized
    else if (request) score = request.kind === 'gurmukhi' ? 100 : 60
    else if (mode === 'english') score = meaning.score || (set.searchType === 3 ? 20 : 0)
    else if (mode === 'transliteration') score = romanized
    else if (mode === 'auto-detect' && !isScript) score = Math.max(meaning.score, romanized, set.searchType === 3 ? 20 : 0)
    else score = set.searchType === 2 ? 100 : 60
    if (!score) continue
    const useMeaning = request ? request.kind === 'meaning' : mode !== 'transliteration'
    let match = meaning.score > 0 && useMeaning
      ? { ...result, translation_en: meaning.text } : result
    if (request) match = { ...match, searchMatch: { kind: request.kind, query: matchQuery, related: request.related ?? false } }
    // A synonym may be an excellent match for its own word while still being
    // less direct than any match from the user's literal query.
    const priority = request?.related ? 0 : 1
    const key = `${result.source}-${result.shabadId}-${result.verseId}`
    const existing = ranked.get(key)
    if (!existing || priority > existing.priority || (priority === existing.priority && score > existing.score)) {
      ranked.set(key, { result: match, score, priority, order: existing?.order ?? order++ })
    }
  }
  return [...ranked.values()].sort((a, b) => b.priority - a.priority || b.score - a.score || a.order - b.order).map(item => item.result)
}
