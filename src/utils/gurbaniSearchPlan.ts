import type { SearchResult } from '../api/banidb'
import type { SearchMode } from '../types'
import type { SearchSource } from './appSearch'
import { planEnglishSearchIntent, type EnglishSearchIntentPlan } from './englishSearchIntent'
import { getBackendSearchTypes, isDirectSearch, normalizeGurbaniSearchQuery, SEARCH_QUERY_MAX_LENGTH } from './gurbaniSearch'
import { matchRomanizedWord, normalizeRomanizedSearch } from './romanizedSearch'

export interface SearchRequest {
  id: string
  query: string
  searchType: number
  matchQuery: string
  kind: 'meaning' | 'transliteration' | 'gurmukhi' | 'initials'
  related?: boolean
}

export interface GurbaniSearchPlan {
  requests: SearchRequest[]
  englishIntent?: EnglishSearchIntentPlan
}

const gurmukhiPattern = /[\u0A00-\u0A7F]/u
const quotedSyntax = /["“”]|(?:^|\s)['‘].+['’](?:$|\s|[?!.,])/u
const englishOperators = /[+*|&^~\\[\]{}]|\b(?:AND|OR|NOT)\b|(?:^|\s)-\S/i

function canonicalPhoneticQuery(query: string) {
  return query.replace(/\b(?:satnam|satnaam)\b/gi, 'sat naam')
    .replace(/\b(?:wahe|vahe)\s+guru\b/gi, 'waheguru')
    .replace(/\b(?:ek|ik)\s+(?:onkar|oankaar)\b/gi, 'ikoankaar')
    .replace(/\bkirpa\b/gi, 'kirapaa')
    .replace(/\bsimran\b/gi, 'simaran')
}

function request(query: string, searchType: number, source: SearchSource, kind: SearchRequest['kind'], matchQuery = query, related = false): SearchRequest {
  return { id: JSON.stringify([searchType, query, source]), query, searchType, matchQuery, kind, ...(related ? { related: true } : {}) }
}

function phoneticRequests(query: string, source: SearchSource, expand: boolean): SearchRequest[] {
  const variants = expand ? [...new Set([query, canonicalPhoneticQuery(query)])] : [query]
  const requests = variants.filter(value => value.length <= SEARCH_QUERY_MAX_LENGTH)
    .map(value => request(value, 8, source, 'transliteration', query))
  // The written symbol is one script token and BaniDB renders it ikOankaar.
  // Its exact script lookup is paged even when a spaced phonetic query misses it.
  if (expand && /^(?:ik|ek)\s+(?:onkar|oankaar)$/i.test(query)) {
    requests.push(request('ੴ', 2, source, 'transliteration', query))
  }
  return requests
}

/** Provider requests have their own identities; two meaning terms paginate independently. */
export function buildGurbaniSearchPlan(query: string, mode: SearchMode, source: SearchSource): GurbaniSearchPlan {
  const normalized = normalizeGurbaniSearchQuery(query, mode)
  if (!normalized || normalized.length > SEARCH_QUERY_MAX_LENGTH || isDirectSearch(normalized, mode)) return { requests: [] }

  if (mode === 'english' || (mode === 'auto-detect' && !gurmukhiPattern.test(normalized))) {
    // Inspect the original query: the general input normalizer removes outer
    // quotation marks, which must still suppress lexical expansion here.
    const englishIntent = planEnglishSearchIntent(query)
    const literalOnly = quotedSyntax.test(query) || englishOperators.test(query)
    const terms = literalOnly ? [englishIntent.literalQuery] : englishIntent.terms
    const requests = [...new Set(terms.map(term => normalizeGurbaniSearchQuery(term)).filter(Boolean))]
      .slice(0, 3).map((term, index) => request(term, 3, source, 'meaning', term, index > 0))
    if (mode === 'auto-detect' && !englishIntent.isNaturalLanguage && !literalOnly) {
      requests.push(...phoneticRequests(normalized, source, true))
    }
    return { requests, englishIntent }
  }

  return { requests: getBackendSearchTypes(normalized, mode).flatMap(type => type === 8
    ? phoneticRequests(normalized, source, !quotedSyntax.test(query))
    : [request(normalized, type, source, type === 3 ? 'meaning' : type === 2 ? 'gurmukhi' : 'initials')]) }
}

const independentVowels: Record<string, string> = { 'ਆ': 'ਅ', 'ਇ': 'ੲ', 'ਈ': 'ੲ', 'ਏ': 'ੲ', 'ਉ': 'ੳ', 'ਊ': 'ੳ', 'ਐ': 'ਅ', 'ਔ': 'ਅ' }

/** BaniDB's main-letter index uses anvaad's vowel/mark reduction. Only observed
 * scripture words enter this function; it never transliterates user input.
 * https://github.com/KhalisFoundation/anvaad-js/blob/master/src/mainLetters.js
 */
function mainLetters(word: string) {
  return word.replace(/੍[ਹਰ]/g, '')
    .replace(/[ਆਇਈਏਉਊਐਔ]/g, letter => independentVowels[letter])
    .replace(/[\u0A00-\u0A04]|[\u0A3C-\u0A51]|[\u0A60-\u0A71]/gu, '')
    .replace(/[^\u0A05-\u0A39\u0A59-\u0A5E\u0A72-\u0A74]/g, '')
}

function romanWords(text: string) {
  return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[()]/g, '')
    .match(/[a-z]+(?:['’][a-z]+)*/gi) ?? []
}

function scriptWords(text: string) {
  return text.replace(/[\u0A66-\u0A6F]/g, '').split(/[^\u0A00-\u0A7F]+/g)
    .filter(word => /[\u0A05-\u0A39\u0A59-\u0A5E\u0A72-\u0A74]/.test(word))
}

/** Extend phonetic seed matches through the paged main-letter index. Alignment
 * must be one Roman lexical word to one script word; uncertain seeds add nothing.
 * The caller must still gate every returned verse against the original phrase,
 * because main-letter searches permit intervening text and phonetic collisions.
 */
export function derivePhoneticRequests(query: string, mode: SearchMode, source: SearchSource, seedResults: readonly SearchResult[]): SearchRequest[] {
  const normalized = normalizeGurbaniSearchQuery(query, mode)
  if (!['auto-detect', 'transliteration'].includes(mode) || gurmukhiPattern.test(normalized)
    || quotedSyntax.test(query) || normalized.length > SEARCH_QUERY_MAX_LENGTH) return []
  const queryWords = normalizeRomanizedSearch(normalized).split(' ').filter(Boolean)
  if (!queryWords.length || queryWords.some(word => !/^[a-z]+$/.test(word))) return []

  const requests = new Map<string, SearchRequest>()
  for (const seed of seedResults) {
    if (source !== 'all' && seed.source !== source) continue
    const roman = romanWords(seed.transliteration)
    const script = scriptWords(seed.gurmukhi)
    if (!roman.length || roman.length !== script.length) continue
    for (let start = 0; start <= roman.length - queryWords.length; start += 1) {
      if (!queryWords.every((word, offset) => matchRomanizedWord(roman[start + offset], word))) continue
      const letters = script.slice(start, start + queryWords.length).map(mainLetters)
      // Isolated one/two-letter anchors are too broad. A multiword phrase can
      // safely retain short words, such as the full sat naam skeleton.
      if (letters.some(word => !word) || letters.join('').length < 3) continue
      // The provider's wildcard branch searches the full main-letter column;
      // its tokenized branch misses some sources. Wildcards also preserve the
      // phrase gaps (literal spaces are removed by the operator parser).
      const providerQuery = `*${letters.join('*')}*`
      if (providerQuery.length > SEARCH_QUERY_MAX_LENGTH) continue
      const next = request(providerQuery, 6, source, 'transliteration', normalized)
      requests.set(next.id, next)
      if (requests.size === 3) return [...requests.values()]
    }
  }
  return [...requests.values()]
}
