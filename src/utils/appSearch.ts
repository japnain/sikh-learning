import type { SearchResult } from '../api/banidb'
import { loadLibrarySearchIndex, loadLibraryDiscoveryCatalog } from '../data/libraryRepository'
import { loadStoryCatalog } from '../data/storyRepository'
import { buildLibrarySearchPath, normalizeLibraryQuery } from './librarySearch'
import { BANIS, READ_EXACT_BANIS, READ_EXACT_DG_BANIS, READ_EXACT_SGGS_BANIS, type Bani } from '../data/banis'
import { buildNitnemStudyPath, NITNEM_ROUTE_OPTIONS } from '../store/nitnem'
import { buildCanonicalBaniStudyPath } from './baniRouteResolver'
import { SOURCE_READER_META } from './sourceReaderMeta'
import { matchesStorySearch, normalizeStorySearch } from './storySearch'
import { getBaniDiscovery, getBrowseBaniDiscovery } from '../content/baniDiscovery'
import { BANI_SCRIPT_NAMES } from '../content/baniScriptNames'
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
  excerpt?: string
  path: string
  score: number
  kind: 'read-route' | 'library-work' | 'library-chapter' | 'story'
  library?: {
    shortTitle: string
    chapterCount?: number
    volume?: number
    episodeNumber?: number
  }
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

export const SEARCH_SOURCE_LABELS: Record<SearchSource, string> = {
  all: 'All',
  G: 'SGGS',
  D: 'DG',
  B: 'BGV',
  A: 'AK',
}

export const ANG_SOURCE_META = {
  G: { label: SOURCE_READER_META.G.shortName, max: SOURCE_READER_META.G.max, kind: SOURCE_READER_META.G.unit },
  D: { label: SOURCE_READER_META.D.shortName, max: SOURCE_READER_META.D.max, kind: SOURCE_READER_META.D.unit },
  B: { label: SOURCE_READER_META.B.shortName, max: SOURCE_READER_META.B.max, kind: SOURCE_READER_META.B.unit },
  A: { label: SOURCE_READER_META.A.shortName, max: SOURCE_READER_META.A.max, kind: SOURCE_READER_META.A.unit },
} as const

// BaniDB exposes Amrit Keertan through its dedicated `/amritkeertan`
// directory endpoints. Its `/angs/:page/A` route does not resolve AK pages,
// so numeric direct lookup must never offer a link that opens a degraded
// Study reader. Amrit Keertan remains discoverable through app search.
const DIRECT_ANG_SOURCES = ['G', 'D', 'B'] as const

const ROUTABLE_EXACT_BANIS = READ_EXACT_BANIS
  .filter((bani): bani is ExactBani => typeof bani.baniDbId === 'number')
  .filter(bani => !bani.variantOf)

const ROUTABLE_BROWSE_BANIS = BANIS.filter(bani => bani.type === 'browse-only')

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

const STANDALONE_ROUTE_DESTINATIONS = [
  {
    id: 'ardaas',
    label: 'Ardaas',
    detail: 'Sundar Gutka · Daily Prayer',
    path: '/study?baniDbId=24&bani=Ardaas',
    aliases: ['ardas', 'ardaas', 'ਅਰਦਾਸ'],
  },
] as const

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
    .replace(/[^\u0900-\u097Fa-z0-9\u0A00-\u0A7F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeLibrarySearchText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getSearchSnippet(searchText: string, matchIndex: number, matchLength: number) {
  if (matchIndex < 0) return searchText.slice(0, 180).replace(/\s+/g, ' ').trim()

  const start = Math.max(0, matchIndex - 70)
  const end = Math.min(searchText.length, matchIndex + matchLength + 130)
  return searchText.slice(start, end).replace(/\s+/g, ' ').trim()
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
  const matches = ROUTABLE_EXACT_BANIS.flatMap((bani): AppSearchMatch[] => {
    if (searchSource !== 'all' && bani.source !== searchSource) return []

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
        const routeParams = new URLSearchParams(route.path.split('?')[1] ?? '')
        const baniDbId = Number(routeParams.get('baniDbId'))
        const discovery = getBaniDiscovery(baniDbId)
        const scriptNames = BANI_SCRIPT_NAMES[baniDbId]
        const searchLabels = Array.from(new Set([
          route.label,
          ...(discovery ? [discovery.name] : []),
          ...(scriptNames ? [scriptNames.gurmukhi, scriptNames.hindi] : []),
          bani.name,
          bani.id.replace(/-/g, ' '),
          // Historical full titles describe this exact reading, while the
          // shorter family aliases below can still reveal both recensions.
          ...(baniDbId === bani.baniDbId ? CANONICAL_SEARCH_LABELS_BY_ID.get(bani.id) ?? [] : []),
          ...(CANONICAL_BANI_ALIASES_BY_ID.get(bani.id) ?? []),
        ]))

        const score = getCanonicalRouteMatchScore(query, searchLabels)
        if (score < 0) return []

        return [{
          key: `read-${bani.id}-${route.key}`,
          label: discovery?.name ?? route.label,
          detail: bani.category === 'Raag Sections' ? 'Bhagat Bani & Selections' : bani.category,
          excerpt: discovery?.summary,
          path: route.path,
          score,
          kind: 'read-route',
        } satisfies AppSearchMatch]
      })
  })

  const browseMatches = ROUTABLE_BROWSE_BANIS.flatMap((bani): AppSearchMatch[] => {
    if (searchSource !== 'all' && bani.source !== searchSource) return []

    const discovery = getBrowseBaniDiscovery(bani)
    const searchLabels = [
      bani.name,
      ...(discovery ? [discovery.name] : []),
      bani.id.replace(/-/g, ' '),
      ...(CANONICAL_BANI_ALIASES_BY_ID.get(bani.id) ?? []),
    ]
    const score = getCanonicalRouteMatchScore(query, searchLabels)
    if (score < 0) return []

    return [{
      key: `read-${bani.id}`,
      label: discovery?.name ?? bani.name,
      detail: `${SOURCE_READER_META[bani.source].name} · ${bani.category}`,
      excerpt: discovery?.summary,
      path: bani.id === 'amrit-keertan'
        ? '/banis/amrit-keertan'
        : buildCanonicalBaniStudyPath(bani),
      score,
      kind: 'read-route',
    }]
  })

  const standaloneMatches = searchSource === 'all'
    ? STANDALONE_ROUTE_DESTINATIONS.flatMap((destination): AppSearchMatch[] => {
        const params = new URLSearchParams(destination.path.split('?')[1] ?? '')
        const baniDbId = Number(params.get('baniDbId'))
        const discovery = getBaniDiscovery(baniDbId)
        const scriptNames = BANI_SCRIPT_NAMES[baniDbId]
        const score = getCanonicalRouteMatchScore(query, [
          destination.label,
          ...destination.aliases,
          ...(discovery ? [discovery.name] : []),
          ...(scriptNames ? [scriptNames.gurmukhi, scriptNames.hindi] : []),
        ])
        if (score < 0) return []

        return [{
          key: `read-${destination.id}`,
          label: discovery?.name ?? destination.label,
          detail: destination.detail,
          excerpt: discovery?.summary,
          path: destination.path,
          score,
          kind: 'read-route',
        }]
      })
    : []

  const distinct = new Map<string, AppSearchMatch>()
  for (const match of [...matches, ...browseMatches, ...standaloneMatches]) {
    const [pathname, search = ''] = match.path.split('?')
    const params = new URLSearchParams(search)
    const providerId = params.get('baniDbId')
    // Display labels, old aliases, and family expansion can name the same
    // destination. Exact provider/length/flow identity governs deduplication.
    const identity = providerId
      ? `${pathname}:bani:${providerId}:length:${params.get('sgLength') ?? ''}:flow:${params.get('flow') ?? ''}`
      : match.path
    const previous = distinct.get(identity)
    if (!previous || match.score > previous.score) distinct.set(identity, match)
  }
  return [...distinct.values()]
}

export function getAppSearchMatches(
  query: string,
  searchSource: SearchSource = 'all'
): AppSearchMatch[] {
  if (query.trim().length < 2) return []

  return getReadRouteMatches(query, searchSource)
    .sort((left, right) => right.score - left.score || left.label.length - right.label.length || left.label.localeCompare(right.label))
}

export async function getLibrarySearchMatches(query: string): Promise<AppSearchMatch[]> {
  const normalizedQuery = normalizeLibrarySearchText(query)
  if (normalizedQuery.length < 2) return []
  const phrase = normalizeLibraryQuery(query).toLowerCase()

  const [catalog, catalogIndex] = await Promise.all([
    loadLibraryDiscoveryCatalog(),
    // Aliases enrich discovery; their index must not hide usable downloaded
    // chapter indexes when the network is unavailable.
    loadLibrarySearchIndex().catch(() => ({ works: [] })),
  ])
  const aliasesByWorkId = new Map(catalogIndex.works.map(work => [work.id, work.aliases]))
  const workMatches: AppSearchMatch[] = []

  for (const work of catalog.works) {
    const labels = [work.title, work.shortTitle, ...(aliasesByWorkId.get(work.id) ?? [])]
    const score = getCanonicalRouteMatchScore(query, labels)
    if (score < 0) continue

    workMatches.push({
      key: `library-work-${work.id}`,
      label: work.title,
      detail: `Book · ${work.totalChapters ?? 0} chapters`,
      path: `/library/${work.id}`,
      score: score + 8,
      kind: 'library-work',
      library: {
        shortTitle: work.shortTitle,
        chapterCount: work.totalChapters ?? 0,
      },
    })
  }

  const workIndexResults = await Promise.allSettled(catalog.works.map(async work => {
    const searchIndex = await loadLibrarySearchIndex(work.id)
    return (searchIndex.chapters ?? []).flatMap((entry): AppSearchMatch[] => {
      const title = entry.title.toLowerCase()
      const exactTitle = title === phrase
      const titleContains = title.includes(phrase)
      // Search needs existence and a snippet offset, not every occurrence.
      // Reuse the literal phrase offset so snippets and reader highlights agree.
      const phraseOffset = entry.searchText.toLowerCase().indexOf(phrase)
      if (!titleContains && phraseOffset < 0) return []

      const score = exactTitle ? 132 : titleContains ? 112 : 78
      const episodeLabel = entry.episodeNumber ? ` · Episode ${entry.episodeNumber}` : ''
      return [{
        key: `library-chapter-${entry.workId}-${entry.chapterId}`,
        label: entry.title,
        detail: `${work.shortTitle} · Volume ${entry.volume}${episodeLabel}`,
        excerpt: getSearchSnippet(entry.searchText, phraseOffset, phrase.length),
        path: buildLibrarySearchPath(entry.workId, entry.chapterId, query),
        score,
        kind: 'library-chapter',
        library: {
          shortTitle: work.shortTitle,
          volume: entry.volume,
          episodeNumber: entry.episodeNumber,
        },
      }]
    })
  }))

  const readableIndexes = workIndexResults.filter(result => result.status === 'fulfilled')
  if (!workMatches.length && !readableIndexes.length) {
    const failure = workIndexResults.find(result => result.status === 'rejected')
    if (failure) throw failure.reason
  }
  return [...workMatches, ...readableIndexes.flatMap(result => result.value)]
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
}

export async function getStorySearchMatches(query: string): Promise<AppSearchMatch[]> {
  const needle = normalizeStorySearch(query)
  if (needle.length < 2) return []
  const catalog = await loadStoryCatalog()
  return catalog.stories.flatMap((story): AppSearchMatch[] => {
    const title = normalizeStorySearch(story.title)
    if (!matchesStorySearch(story, query)) return []
    return [{
      key: `story-${story.id}`, kind: 'story', label: story.title,
      detail: [...story.people, ...story.themes].join(' · '), excerpt: story.description,
      path: `/stories/${encodeURIComponent(story.id)}`,
      score: title === needle ? 140 : title.includes(needle) ? 110 : 75,
    }]
  }).sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
}

function normalizeDirectLookupQuery(query: string) {
  return Array.from(query.trim(), character => {
    const codePoint = character.codePointAt(0) ?? 0
    if (codePoint >= 0x0A66 && codePoint <= 0x0A6F) {
      return String(codePoint - 0x0A66)
    }
    if (codePoint >= 0x0966 && codePoint <= 0x096F) {
      return String(codePoint - 0x0966)
    }
    return character
  }).join('')
}

export function isDirectLookupQuery(query: string) {
  const normalizedQuery = normalizeDirectLookupQuery(query)
  if (!/^\d+$/.test(normalizedQuery)) return false

  const lookup = Number(normalizedQuery)
  return Number.isSafeInteger(lookup) && lookup > 0
}

export function getAngTargets(query: string, searchSource: SearchSource): DirectAngTarget[] {
  const normalizedQuery = normalizeDirectLookupQuery(query)
  if (!isDirectLookupQuery(normalizedQuery)) return []

  const angLookup = Number(normalizedQuery)
  if (!Number.isSafeInteger(angLookup) || angLookup <= 0) return []

  const sources = searchSource === 'all'
    ? [...DIRECT_ANG_SOURCES]
    : DIRECT_ANG_SOURCES.includes(searchSource as typeof DIRECT_ANG_SOURCES[number])
      ? [searchSource as typeof DIRECT_ANG_SOURCES[number]]
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
    raags: Array.from(new Set(searchResults.map(result => result.raag).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    writers: Array.from(new Set(searchResults.map(result => result.writer).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
  }
}
