import type { SearchResult } from '../api/banidb'
import { READ_EXACT_BANIS, READ_EXACT_DG_BANIS, READ_EXACT_SGGS_BANIS, type Bani } from '../data/banis'
import { buildNitnemStudyPath, NITNEM_ROUTE_OPTIONS } from '../store/nitnem'
import type { LearnSearchIndex } from '../types'
import { buildCanonicalBaniStudyPath } from './baniRouteResolver'
import {
  SUNDAR_GUTKA_SUPPORTED_BANIS,
  isSundarGutkaLengthSupportedBaniId,
} from './sundarGutkaLength'

export type SearchSource = 'all' | 'G' | 'D' | 'B' | 'A'

interface ExactBani extends Bani {
  baniDbId: number
}

interface ResolvedRouteOption {
  key: string
  label: string
  path: string
}

export interface AppSearchMatch {
  key: string
  label: string
  detail: string
  path: string
  score: number
  kind: 'read-route' | 'learn-topic'
}

export interface DirectAngTarget {
  source: keyof typeof ANG_SOURCE_META
  label: string
  kind: string
  path: string
}

export interface GroupedSearchResult {
  key: string
  shabadId: number
  verseId: number
  pageNo: number | null
  source: string
  sourceName: string
  gurmukhi: string
  transliteration: string
  translation_en: string
  raag: string
  writer: string
  matchCount: number
}

const SCRIPTURE_META = {
  SGGS: { label: 'Sri Guru Granth Sahib Ji' },
  DG: { label: 'Dasam Granth' },
} as const

export const SEARCH_SOURCE_LABELS: Record<SearchSource, string> = {
  all: 'All',
  G: 'SGGS',
  D: 'DG',
  B: 'BGV',
  A: 'AK',
}

export const ANG_SOURCE_META = {
  G: { label: 'SGGS', max: 1430, kind: 'Ang' },
  D: { label: 'DG', max: 1428, kind: 'Ang' },
  B: { label: 'BGV', max: 628, kind: 'Page' },
} as const

const ROUTABLE_EXACT_BANIS = READ_EXACT_BANIS
  .filter((bani): bani is ExactBani => typeof bani.baniDbId === 'number')
  .filter(bani => !bani.variantOf)

const EXACT_VARIANT_OPTIONS_BY_BASE_ID = [READ_EXACT_SGGS_BANIS, READ_EXACT_DG_BANIS]
  .flat()
  .filter((bani): bani is ExactBani => typeof bani.baniDbId === 'number')
  .reduce<Map<string, ExactBani[]>>((groups, bani) => {
    const baseId = bani.variantOf ?? bani.id
    const list = groups.get(baseId) ?? []
    list.push(bani)
    groups.set(baseId, list)
    return groups
  }, new Map())

const CANONICAL_BANI_ALIASES_BY_ID = new Map<string, string[]>([
  ['japji-sahib', ['jap', 'japji']],
  ['jaap-sahib', ['jaap', 'jap sahib']],
  ['tav-prasad-savaiye', ['tav prasad', 'savaiye', 'swaiye']],
  ['chaupai-sahib', ['chaupai', 'benati chaupai', 'chaupai sahib']],
  ['anand-sahib', ['anand', 'anand sahib']],
  ['rehras-sahib', ['rehras', 'rahras', 'rehraas']],
  ['kirtan-sohila', ['sohila', 'kirtan sohila']],
  ['sukhmani-sahib', ['sukhmani', 'sukhmani sahib']],
  ['asa-di-var', ['asa', 'asa di var']],
  ['aarti', ['arti', 'aarti']],
  ['laavan', ['lavan', 'laavaan']],
  ['salok-mahalla-9', ['salok 9', 'mahalla 9', 'salok mahalla 9']],
  ['dukh-bhanjani', ['dukh bhanjani']],
  ['akal-ustat', ['akal ustat']],
  ['ardaas', ['ardas', 'ardaas']],
])

const SUNDAR_GUTKA_CANONICAL_ROUTE_BY_LABEL = new Map<string, string>([
  ['ਜਪੁਜੀ ਸਾਹਿਬ', 'japji-sahib'],
  ['japujee saahib', 'japji-sahib'],
  ['japji sahib', 'japji-sahib'],
  ['ਜਾਪੁ ਸਾਹਿਬ', 'jaap-sahib'],
  ['jaap saahib', 'jaap-sahib'],
  ['jaap sahib', 'jaap-sahib'],
  ['ਤ੍ਵ ਪ੍ਰਸਾਦਿ ਸਵੱਯੇ ਸ੍ਰਾਵਗ ਸੁੱਧ', 'tav-prasad-savaiye'],
  ['tavai prasaadh savaye sraavag sudh', 'tav-prasad-savaiye'],
  ['tav prasad savaiye', 'tav-prasad-savaiye'],
  ['ਬੇਨਤੀ ਚੌਪਈ ਸਾਹਿਬ', 'chaupai-sahib'],
  ['benatee chauapiee saahib', 'chaupai-sahib'],
  ['benati chaupai sahib', 'chaupai-sahib'],
  ['chaupai sahib', 'chaupai-sahib'],
  ['ਅਨੰਦੁ ਸਾਹਿਬ', 'anand-sahib'],
  ['anandh saahib', 'anand-sahib'],
  ['anand sahib', 'anand-sahib'],
  ['ਰਹਰਾਸਿ ਸਾਹਿਬ', 'rehras-sahib'],
  ['raharaas saahib', 'rehras-sahib'],
  ['raharaas sahib', 'rehras-sahib'],
  ['rehras sahib', 'rehras-sahib'],
  ['ਸੋਹਿਲਾ ਸਾਹਿਬ', 'kirtan-sohila'],
  ['sohilaa saahib', 'kirtan-sohila'],
  ['sohila sahib', 'kirtan-sohila'],
  ['kirtan sohila', 'kirtan-sohila'],
  ['ਸਲੋਕ ਮਹਲਾ ੯', 'salok-mahalla-9'],
  ['salok mahalaa nauvaa', 'salok-mahalla-9'],
  ['salok mahalla 9', 'salok-mahalla-9'],
  ['ਸੁਖਮਨੀ ਸਾਹਿਬ', 'sukhmani-sahib'],
  ['sukhamanee saahib', 'sukhmani-sahib'],
  ['sukhmani sahib', 'sukhmani-sahib'],
  ['ਆਸਾ ਦੀ ਵਾਰ', 'asa-di-var'],
  ['aasaa dhee vaar', 'asa-di-var'],
  ['asa di var', 'asa-di-var'],
  ['ਆਰਤੀ', 'aarti'],
  ['aaratee', 'aarti'],
  ['aarti', 'aarti'],
  ['ਲਾਵਾਂ', 'laavan'],
  ['laavaan', 'laavan'],
  ['laavan', 'laavan'],
].map(([label, baniId]) => [normalizeBaniLabel(label), baniId]))

const CANONICAL_SEARCH_LABELS_BY_ID = Array.from(SUNDAR_GUTKA_CANONICAL_ROUTE_BY_LABEL.entries()).reduce<Map<string, string[]>>((groups, [label, baniId]) => {
  const current = groups.get(baniId) ?? []
  current.push(label)
  groups.set(baniId, current)
  return groups
}, new Map())

function normalizeBaniLabel(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'`()]/g, '')
    .replace(/[^a-z0-9\u0A00-\u0A7F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeRomanizedBaniLabel(value: string) {
  return normalizeBaniLabel(value)
    .replace(/\bsaahib\b/g, 'sahib')
    .replace(/\bbenatee\b/g, 'benati')
    .replace(/\braharaas\b/g, 'rehras')
    .replace(/\bsohilaa\b/g, 'sohila')
    .replace(/\bsukhamanee\b/g, 'sukhmani')
    .replace(/\baasaa\b/g, 'asa')
    .replace(/\bdhee\b/g, 'di')
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeTopicQuery(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getCanonicalRouteMatchScore(query: string, labels: string[]) {
  const normalizedQuery = normalizeBaniLabel(query)
  const romanizedQuery = normalizeRomanizedBaniLabel(query)

  if (!normalizedQuery) return -1

  let bestScore = -1

  for (const label of labels) {
    const normalizedLabel = normalizeBaniLabel(label)
    const romanizedLabel = normalizeRomanizedBaniLabel(label)
    if (!normalizedLabel) continue

    if (normalizedLabel === normalizedQuery) {
      bestScore = Math.max(bestScore, 140)
    } else if (normalizedLabel.startsWith(`${normalizedQuery} `) || normalizedLabel.startsWith(normalizedQuery)) {
      bestScore = Math.max(bestScore, 118)
    } else if (normalizedLabel.includes(` ${normalizedQuery} `) || normalizedLabel.endsWith(` ${normalizedQuery}`)) {
      bestScore = Math.max(bestScore, 102)
    } else if (normalizedLabel.includes(normalizedQuery)) {
      bestScore = Math.max(bestScore, 90)
    }

    if (!romanizedQuery || !romanizedLabel) continue

    if (romanizedLabel === romanizedQuery) {
      bestScore = Math.max(bestScore, 126)
    } else if (romanizedLabel.startsWith(`${romanizedQuery} `) || romanizedLabel.startsWith(romanizedQuery)) {
      bestScore = Math.max(bestScore, 112)
    } else if (romanizedLabel.includes(` ${romanizedQuery} `) || romanizedLabel.endsWith(` ${romanizedQuery}`)) {
      bestScore = Math.max(bestScore, 96)
    } else if (romanizedLabel.includes(romanizedQuery)) {
      bestScore = Math.max(bestScore, 82)
    }
  }

  return bestScore
}

function scoreTopicMatch(title: string, shortTitle: string, searchTerms: string[], query: string): number {
  const normalized = normalizeTopicQuery(query)
  if (!normalized) return -1

  const normalizedTitle = normalizeTopicQuery(title)
  const normalizedShortTitle = normalizeTopicQuery(shortTitle)
  const normalizedTerms = searchTerms.map(normalizeTopicQuery)

  if (normalizedTitle === normalized || normalizedShortTitle === normalized) return 136
  if (normalizedTerms.includes(normalized)) return 126
  if (normalizedTitle.includes(normalized) || normalizedShortTitle.includes(normalized)) return 112

  const tokens = normalized.split(' ')
  const score = tokens.reduce((running, token) => {
    if (!token) return running
    if (normalizedTitle.includes(token) || normalizedShortTitle.includes(token)) return running + 12
    if (normalizedTerms.some(term => term.includes(token))) return running + 10
    return running
  }, 0)

  return score
}

function getExactRouteOptionsForBani(bani: ExactBani): ResolvedRouteOption[] {
  const baseId = bani.variantOf ?? bani.id
  const nitnemOptions = NITNEM_ROUTE_OPTIONS.filter(option => option.baseBaniId === baseId)

  if (isSundarGutkaLengthSupportedBaniId(baseId)) {
    const routeOption = nitnemOptions[0] ?? null
    const label = routeOption?.name ?? SUNDAR_GUTKA_SUPPORTED_BANIS[baseId].name

    return [{
      key: routeOption?.id ?? baseId,
      label,
      path: routeOption
        ? buildNitnemStudyPath(routeOption)
        : buildCanonicalBaniStudyPath(bani, {
            baniDbId: SUNDAR_GUTKA_SUPPORTED_BANIS[baseId].baniDbId,
            baniId: baseId,
            baniName: SUNDAR_GUTKA_SUPPORTED_BANIS[baseId].name,
          }),
    }]
  }

  if (nitnemOptions.length > 1) {
    return nitnemOptions.map(option => ({
      key: option.id,
      label: nitnemOptions.length > 1 && option.variantLabel
        ? `${bani.name} · ${option.variantLabel}`
        : option.name,
      path: buildNitnemStudyPath(option),
    }))
  }

  const exactVariants = EXACT_VARIANT_OPTIONS_BY_BASE_ID.get(baseId) ?? []
  if (exactVariants.length <= 1) return []

  const baseLabel = exactVariants[0]?.name ?? bani.name

  return exactVariants.map(option => ({
    key: option.id,
    label: option.variantLabel
      ? `${baseLabel} · ${option.variantLabel}`
      : option.name,
    path: buildCanonicalBaniStudyPath(option),
  }))
}

function getReadRouteMatches(query: string, searchSource: SearchSource): AppSearchMatch[] {
  const allowedSources = searchSource === 'all'
    ? new Set(['G', 'D'])
    : new Set(['G', 'D'].includes(searchSource) ? [searchSource] : [])

  const matches = ROUTABLE_EXACT_BANIS.flatMap((bani): AppSearchMatch[] => {
    if (!allowedSources.has(bani.source)) return []

    const routeOptions = getExactRouteOptionsForBani(bani)
    const resolvedRoutes = routeOptions.length > 0
      ? routeOptions
      : [{
          key: bani.id,
          label: bani.name,
          path: buildCanonicalBaniStudyPath(bani),
        }]

    return resolvedRoutes
      .flatMap((route): AppSearchMatch[] => {
        const searchLabels = Array.from(new Set([
          route.label,
          bani.name,
          bani.id.replace(/-/g, ' '),
          ...(CANONICAL_SEARCH_LABELS_BY_ID.get(bani.id) ?? []),
          ...(CANONICAL_BANI_ALIASES_BY_ID.get(bani.id) ?? []),
        ]))

        const score = getCanonicalRouteMatchScore(query, searchLabels)
        if (score < 0) return []

        return [{
          key: `read-${bani.id}-${route.key}`,
          label: route.label,
          detail: `${SCRIPTURE_META[bani.scripture as 'SGGS' | 'DG'].label} · ${bani.category}`,
          path: route.path,
          score,
          kind: 'read-route',
        } satisfies AppSearchMatch]
      })
  })

  return matches
}

export function getLearnTopicMatches(
  query: string,
  searchIndex: LearnSearchIndex | null
): AppSearchMatch[] {
  const normalized = normalizeTopicQuery(query)
  if (!normalized || normalized.length < 2 || !searchIndex) return []

  const canonicalTopicId = searchIndex.synonyms[normalized] ?? null

  return searchIndex.topics
    .map(topic => {
      const baseScore = scoreTopicMatch(topic.title, topic.shortTitle, topic.searchTerms, normalized)
      let score = baseScore

      if (canonicalTopicId) {
        if (topic.id === canonicalTopicId) {
          score = Math.max(score, 220)
        } else if (topic.id.startsWith(`${canonicalTopicId}-`)) {
          score += 12
        }
      }

      return { topic, score }
    })
    .filter(item => item.score >= (canonicalTopicId ? 24 : 48))
    .sort((left, right) =>
      right.score - left.score
      || Number(right.topic.id === canonicalTopicId) - Number(left.topic.id === canonicalTopicId)
      || left.topic.title.localeCompare(right.topic.title)
    )
    .slice(0, 4)
    .map(({ topic, score }) => ({
      key: `learn-${topic.id}`,
      label: topic.title,
      detail: 'Learn topic guide',
      path: `/learn?tab=topics&topic=${topic.id}&detail=topic`,
      score,
      kind: 'learn-topic' as const,
    }))
}

export function getAppSearchMatches(
  query: string,
  searchSource: SearchSource = 'all',
  searchIndex: LearnSearchIndex | null = null
): AppSearchMatch[] {
  if (query.trim().length < 2) return []

  return [
    ...getLearnTopicMatches(query, searchIndex),
    ...getReadRouteMatches(query, searchSource),
  ]
    .sort((left, right) => right.score - left.score || left.label.length - right.label.length || left.label.localeCompare(right.label))
    .slice(0, 8)
}

export function getAngTargets(query: string, searchSource: SearchSource): DirectAngTarget[] {
  const angLookup = Number(query.trim())
  if (!Number.isFinite(angLookup) || angLookup <= 0) return []

  const sources = searchSource === 'all'
    ? (Object.keys(ANG_SOURCE_META) as Array<keyof typeof ANG_SOURCE_META>)
    : searchSource in ANG_SOURCE_META
      ? [searchSource as keyof typeof ANG_SOURCE_META]
      : []

  return sources
    .filter(source => angLookup <= ANG_SOURCE_META[source].max)
    .map(source => ({
      source,
      label: ANG_SOURCE_META[source].label,
      kind: ANG_SOURCE_META[source].kind,
      path: `/study?source=${source}&ang=${angLookup}`,
    }))
}

export function groupSearchResults(searchResults: SearchResult[], filters?: { raag?: string; writer?: string }): GroupedSearchResult[] {
  const filtered = searchResults.filter(result => (
    (!filters?.raag || filters.raag === 'all' || result.raag === filters.raag)
    && (!filters?.writer || filters.writer === 'all' || result.writer === filters.writer)
  ))

  const grouped = new Map<string, GroupedSearchResult>()
  for (const result of filtered) {
    const key = `${result.source}-${result.pageNo ?? 'unknown'}-${result.shabadId}`
    const existing = grouped.get(key)
    if (existing) {
      existing.matchCount += 1
      continue
    }
    grouped.set(key, {
      key,
      shabadId: result.shabadId,
      verseId: result.verseId,
      pageNo: result.pageNo,
      source: result.source,
      sourceName: result.sourceName,
      gurmukhi: result.gurmukhi,
      transliteration: result.transliteration,
      translation_en: result.translation_en,
      raag: result.raag,
      writer: result.writer,
      matchCount: 1,
    })
  }

  return Array.from(grouped.values())
}

export function getAvailableSearchMeta(searchResults: SearchResult[]) {
  return {
    raags: Array.from(new Set(searchResults.map(result => result.raag).filter(Boolean))).slice(0, 6),
    writers: Array.from(new Set(searchResults.map(result => result.writer).filter(Boolean))).slice(0, 6),
  }
}
