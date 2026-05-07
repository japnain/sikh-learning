import { useState, useCallback, useRef, useEffect, useMemo, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  fetchSearch,
  fetchBanisIndex,
  type SearchResult,
  type BaniIndexItem,
} from '../api/banidb'
import {
  BANIS,
  DG_CATEGORY_ORDER,
  READ_DIRECTORY_DG_BANIS,
  READ_DIRECTORY_SGGS_BANIS,
  READ_DIRECTORY_SUNDAR_GUTKA_BANI_IDS,
  READ_EXACT_DG_BANIS,
  READ_EXACT_SGGS_BANIS,
  SGGS_CATEGORY_ORDER,
  type Bani,
} from '../data/banis'
import useAppSearchMatches from '../hooks/useAppSearchMatches'
import { resolveAsyncIssue } from '../qa/async'
import { useRecentSearchStore } from '../store/recentSearch'
import { useLanguageStore } from '../store/language'
import { buildNitnemStudyPath, NITNEM_ROUTE_OPTIONS } from '../store/nitnem'
import type { AsyncIssueCode, SearchMode } from '../types'
import { buildCanonicalBaniStudyPath } from '../utils/baniRouteResolver'
import {
  SUNDAR_GUTKA_SUPPORTED_BANIS,
  isSundarGutkaLengthSupportedBaniId,
} from '../utils/sundarGutkaLength'
import { SEARCH_MODE_LABELS } from '../utils/translations'
import { IconArrowRight, IconSearch, IconChevronUp, IconChevronDown, IconLibrary, IconSword, IconBookmark, IconBookmarkFilled } from '../components/icons'
import SearchHighlight from '../components/SearchHighlight'
import ScriptureSourceBrowser from '../components/ScriptureSourceBrowser'
import { hasSearchMatch } from '../utils/searchHighlight'
import { getEditorialCopy } from '../content/editorialCopy'
import {
  getAngTargets,
  getAvailableSearchMeta,
  groupSearchResults,
  SEARCH_SOURCE_LABELS,
  type GroupedSearchResult,
  type SearchSource,
} from '../utils/appSearch'
import { buildReadSearchPath } from '../utils/searchRoutes'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import {
  ARDAAS_HUKAMNAMA_EDITORIAL_COPY,
  getReaderEditorialCopyForBani,
} from '../content/readerEditorialCopy'

type Scripture = 'SGGS' | 'DG'
type ExactBani = Bani & { baniDbId: number }
interface ResolvedRouteOption {
  key: string
  label: string
  path: string
  detail?: string
}

const SCRIPTURE_META: Record<Scripture, { label: string; icon: ReactNode; categoryOrder: readonly string[] }> = {
  SGGS: { label: 'Sri Guru Granth Sahib Ji', icon: <IconLibrary size={18} />, categoryOrder: SGGS_CATEGORY_ORDER },
  DG: { label: 'Dasam Granth', icon: <IconSword size={18} />, categoryOrder: DG_CATEGORY_ORDER },
}

const SEARCH_MODE_META: Record<SearchMode, { type: number; placeholder: string; minLength: number }> = {
  'first-letters': { type: 0, placeholder: 'Search first letters in Gurmukhi...', minLength: 2 },
  'first-letters-anywhere': { type: 1, placeholder: 'Search first letters anywhere in the line...', minLength: 2 },
  gurmukhi: { type: 2, placeholder: 'Search full Gurbani words...', minLength: 2 },
  english: { type: 3, placeholder: 'Search English meanings...', minLength: 2 },
  transliteration: { type: 4, placeholder: 'Search transliteration...', minLength: 2 },
  ang: { type: -1, placeholder: 'Open an ang or page directly...', minLength: 1 },
  'auto-detect': { type: 8, placeholder: 'Type Gurbani, meaning, or ang...', minLength: 2 },
}
const SEARCH_OPTION_SUMMARY: Record<SearchMode, string> = {
  'first-letters': 'Search by first letters and slip into the right bani with less hunting.',
  'first-letters-anywhere': 'Catch first letters even when they appear later in the line.',
  gurmukhi: 'Search the Gurbani itself when the line is already in your mind.',
  english: 'Search by meaning when the thought arrives before the words.',
  transliteration: 'Search by pronunciation when that is what you remember first.',
  ang: 'Open an ang or page directly without running a word search.',
  'auto-detect': 'Let the app read what you typed and choose the most likely search style.',
}
const GURMUKHI_SEARCH_PATTERN = /[\u0A00-\u0A7F]/
const LATIN_SEARCH_PATTERN = /[A-Za-z]/

function getBackendSearchTypes(query: string, mode: SearchMode): number[] {
  if (mode !== 'auto-detect') return [SEARCH_MODE_META[mode].type]

  const hasGurmukhi = GURMUKHI_SEARCH_PATTERN.test(query)
  const hasLatin = LATIN_SEARCH_PATTERN.test(query)
  const searchTypes = new Set<number>()

  if (hasGurmukhi) {
    [
      SEARCH_MODE_META.gurmukhi.type,
      SEARCH_MODE_META['first-letters'].type,
      SEARCH_MODE_META['first-letters-anywhere'].type,
      SEARCH_MODE_META['auto-detect'].type,
    ].forEach(type => searchTypes.add(type))
  }

  if (hasLatin || !hasGurmukhi) {
    [
      SEARCH_MODE_META.english.type,
      SEARCH_MODE_META.transliteration.type,
      SEARCH_MODE_META['auto-detect'].type,
    ].forEach(type => searchTypes.add(type))
  }

  return Array.from(searchTypes)
}

function dedupeSearchResults(resultSets: SearchResult[][]): SearchResult[] {
  const seen = new Map<string, SearchResult>()

  for (const results of resultSets) {
    for (const result of results) {
      const key = `${result.source}-${result.shabadId}-${result.verseId}`
      if (!seen.has(key)) {
        seen.set(key, result)
      }
    }
  }

  return Array.from(seen.values())
}

function isSearchModeParam(value: string | null): value is SearchMode {
  return value !== null && value in SEARCH_MODE_META
}

function isSearchSourceParam(value: string | null): value is SearchSource {
  return value !== null && value in SEARCH_SOURCE_LABELS
}

const CANONICAL_SUNDAR_GUTKA_BANI_IDS = new Set<string>(READ_DIRECTORY_SUNDAR_GUTKA_BANI_IDS)
const SUNDAR_GUTKA_STANDALONE_BANIDB_IDS = new Set([24])

const NITNEM_SUNDAR_GUTKA_BANI_IDS = new Set([
  'japji-sahib',
  'jaap-sahib',
  'tav-prasad-savaiye',
  'chaupai-sahib',
  'anand-sahib',
  'rehras-sahib',
  'kirtan-sohila',
])

const POPULAR_SUNDAR_GUTKA_BANI_IDS = new Set([
  'asa-di-var',
  'salok-mahalla-9',
  'sukhmani-sahib',
  'aarti',
  'laavan',
])

const CANONICAL_BANI_BY_ID = new Map(BANIS.map(bani => [bani.id, bani]))
const EXACT_BANIS_BY_SCRIPTURE = {
  SGGS: READ_DIRECTORY_SGGS_BANIS.filter((bani): bani is ExactBani => typeof bani.baniDbId === 'number'),
  DG: READ_DIRECTORY_DG_BANIS.filter((bani): bani is ExactBani => typeof bani.baniDbId === 'number'),
} satisfies Record<Scripture, ExactBani[]>

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

function getExactBaniRowLabel(bani: ExactBani) {
  if (!bani.variantOf) return bani.name

  const exactVariants = EXACT_VARIANT_OPTIONS_BY_BASE_ID.get(bani.variantOf) ?? []
  const baseLabel = exactVariants.find(option => !option.variantOf)?.name ?? bani.name

  return bani.variantLabel ? `${baseLabel} · ${bani.variantLabel}` : bani.name
}

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

const SUNDAR_GUTKA_CANONICAL_ROUTE_BY_LABEL = new Map<string, string>([
  ['ਜਪੁਜੀ ਸਾਹਿਬ', 'japji-sahib'],
  ['japujee saahib', 'japji-sahib'],
  ['japji sahib', 'japji-sahib'],
  ['ਜਾਪੁ ਸਾਹਿਬ', 'jaap-sahib'],
  ['jaap saahib', 'jaap-sahib'],
  ['jaap sahib', 'jaap-sahib'],
  ['ਤ੍ਵ ਪ੍ਰਸਾਦਿ ਸਵੱਯੇ ਸ੍ਰਾਵਗ ਸੁੱਧ', 'tav-prasad-savaiye'],
  ["tavai prasaadh savaye sraavag sudh", 'tav-prasad-savaiye'],
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

function getCanonicalSundarGutkaBani(item: BaniIndexItem): Bani | null {
  const candidates = [item.gurmukhi, item.transliteration]

  for (const candidate of candidates) {
    const canonicalId = SUNDAR_GUTKA_CANONICAL_ROUTE_BY_LABEL.get(normalizeBaniLabel(candidate))
    if (!canonicalId) continue

    const canonicalBani = CANONICAL_BANI_BY_ID.get(canonicalId)
    if (canonicalBani && CANONICAL_SUNDAR_GUTKA_BANI_IDS.has(canonicalBani.id)) {
      return canonicalBani
    }
  }

  return null
}

function getNitnemRouteOptionsForBani(item: BaniIndexItem) {
  const canonicalId = getCanonicalSundarGutkaBani(item)?.id
  if (!canonicalId) return []

  return NITNEM_ROUTE_OPTIONS.filter(option => option.baseBaniId === canonicalId)
}

function getSundarGutkaDisplayCopy(item: BaniIndexItem) {
  const canonicalBani = getCanonicalSundarGutkaBani(item)

  return {
    label: item.gurmukhi,
    detail: canonicalBani?.name ?? item.transliteration,
  }
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
    }] satisfies ResolvedRouteOption[]
  }

  if (nitnemOptions.length > 1) {
    return nitnemOptions.map(option => ({
      key: option.id,
      label: nitnemOptions.length > 1 && option.variantLabel
        ? `${bani.name} · ${option.variantLabel}`
        : option.name,
      path: buildNitnemStudyPath(option),
      detail: getReaderEditorialCopyForBani(option.id)?.dek,
    })) satisfies ResolvedRouteOption[]
  }

  const exactVariants = EXACT_VARIANT_OPTIONS_BY_BASE_ID.get(baseId) ?? []
  if (exactVariants.length <= 1) return []

  const baseLabel = exactVariants[0]?.name ?? bani.name

  return exactVariants.map(option => {
    return {
      key: option.id,
      label: option.variantLabel
        ? `${baseLabel} · ${option.variantLabel}`
        : option.name,
      path: buildCanonicalBaniStudyPath(option),
      detail: getReaderEditorialCopyForBani(option.id)?.dek,
    } satisfies ResolvedRouteOption
  })
}

function IndexRow({
  label,
  detail,
  supplementalDetail,
  onClick,
  labelClassName,
  detailClassName,
  supplementalDetailClassName,
  labelLang,
}: {
  label: string
  detail?: string
  supplementalDetail?: string
  onClick: () => void
  labelClassName?: string
  detailClassName?: string
  supplementalDetailClassName?: string
  labelLang?: string
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="read-index-row w-full text-left active:scale-[0.99] transition-transform duration-150"
    >
      <p lang={labelLang} className={`read-index-row__title ${labelClassName ?? 'font-sans text-sm text-ink dark:text-dark-text'}`}>
        {label}
      </p>
      {detail ? (
        <p className={`read-index-row__detail ${detailClassName ?? 'font-sans text-xs text-gold dark:text-gold-light mt-0.5'}`}>
          {detail}
        </p>
      ) : null}
      {supplementalDetail ? (
        <p className={`read-index-row__detail ${supplementalDetailClassName ?? 'font-sans text-xs leading-5 text-ink/58 dark:text-dark-text/70 mt-1'}`}>
          {supplementalDetail}
        </p>
      ) : null}
    </button>
  )
}

function MetadataChip({
  children,
  onClick,
}: {
  children: ReactNode
  onClick?: () => void
}) {
  const className = 'rounded-full bg-gold/10 dark:bg-gold/10 border border-gold/15 dark:border-gold/20 px-2 py-1 font-sans text-[10px] text-gold dark:text-gold-light'

  if (!onClick) {
    return <span className={className}>{children}</span>
  }

  return (
    <button type="button" onClick={onClick} className={`${className} transition-colors duration-300 hover:bg-gold/15`}>
      {children}
    </button>
  )
}

function getSearchIssueCopy(issue: AsyncIssueCode) {
  switch (issue) {
    case 'offline':
      return 'Read search is offline right now. Browse a bani directly or try again when the connection returns.'
    case 'missing':
      return 'That Read source could not be found. Switch modes, browse a bani directly, or try another query.'
    case 'qa-fault':
      return 'Read search is showing the test degraded state. Browse a bani directly or try again.'
    case 'unavailable':
    default:
      return 'Read search is unavailable right now. Browse a bani directly, switch modes, or try again shortly.'
  }
}

export default function Banis() {
  const scriptMode = useLanguageStore(state => state.scriptMode)
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialModeParam = searchParams.get('mode')
  const initialSourceParam = searchParams.get('source')
  const editorial = getEditorialCopy('en')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('query') ?? '')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchIssue, setSearchIssue] = useState<AsyncIssueCode | null>(null)
  const [searchMode, setSearchMode] = useState<SearchMode>(() => (
    isSearchModeParam(initialModeParam) ? initialModeParam : 'auto-detect'
  ))
  const [searchSource, setSearchSource] = useState<SearchSource>(() => (
    isSearchSourceParam(initialSourceParam) ? initialSourceParam : 'all'
  ))
  const [raagFilter, setRaagFilter] = useState<string>('all')
  const [writerFilter, setWriterFilter] = useState<string>('all')
  const [sundarGutkaBanis, setSundarGutkaBanis] = useState<BaniIndexItem[]>([])
  const [loadingSundarGutka, setLoadingSundarGutka] = useState(true)
  const toggle = (key: string) => setExpanded(e => ({ ...e, [key]: !e[key] }))
  const searchOptionsOpen = expanded['search-options'] ?? false

  const { recent, addRecent, togglePinned, clearRecent } = useRecentSearchStore()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const searchFeedbackRef = useRef<HTMLElement | null>(null)
  const setSearchFeedbackElement = useCallback((element: HTMLElement | null) => {
    searchFeedbackRef.current = element
  }, [])

  const revealSearchFeedback = useCallback(() => {
    if (typeof window === 'undefined') return

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const element = searchFeedbackRef.current
        if (!element) return

        const navHeight = Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--nav-stack-height')
        ) || 0
        const rect = element.getBoundingClientRect()
        const visibleTop = 18
        const visibleBottom = window.innerHeight - navHeight - 26
        let nextScrollY = window.scrollY

        if (rect.bottom > visibleBottom) {
          nextScrollY += rect.bottom - visibleBottom
        }

        if (rect.top < visibleTop) {
          nextScrollY += rect.top - visibleTop
        }

        if (Math.abs(nextScrollY - window.scrollY) > 1) {
          window.scrollTo({
            top: Math.max(nextScrollY, 0),
            behavior: 'auto',
          })
        }
      })
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    setLoadingSundarGutka(true)
    fetchBanisIndex()
      .then(data => {
        if (!cancelled) setSundarGutkaBanis(data)
      })
      .catch(() => {
        if (!cancelled) setSundarGutkaBanis([])
      })
      .finally(() => {
        if (!cancelled) setLoadingSundarGutka(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const nextQuery = params.get('query') ?? ''
    const nextModeParam = params.get('mode')
    const nextSourceParam = params.get('source')
    const nextMode: SearchMode = isSearchModeParam(nextModeParam) ? nextModeParam : 'auto-detect'
    const nextSource: SearchSource = isSearchSourceParam(nextSourceParam) ? nextSourceParam : 'all'

    setSearchQuery(current => current === nextQuery ? current : nextQuery)
    setSearchMode(current => current === nextMode ? current : nextMode)
    setSearchSource(current => current === nextSource ? current : nextSource)
  }, [location.search])

  useEffect(() => {
    const nextPath = buildReadSearchPath({
      query: searchQuery,
      mode: searchMode,
      source: searchSource,
    })
    const currentPath = `${location.pathname}${location.search}`

    if (nextPath === currentPath) return

    const nextSearch = nextPath.split('?')[1] ?? ''
    setSearchParams(new URLSearchParams(nextSearch), { replace: true })
  }, [location.pathname, location.search, searchMode, searchQuery, searchSource, setSearchParams])

  useEffect(() => {
    const state = (location.state as { focusSearch?: boolean } | null) ?? null
    if (!state?.focusSearch) return

    globalThis.requestAnimationFrame(() => {
      searchInputRef.current?.focus()
    })

    navigate(
      {
        pathname: location.pathname,
        search: location.search,
      },
      { replace: true, state: null }
    )
  }, [location.pathname, location.search, location.state, navigate])

  const handleSearch = useCallback((query: string, mode: SearchMode = searchMode, source: SearchSource = searchSource) => {
    setSearchQuery(query)
    setRaagFilter('all')
    setWriterFilter('all')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = query.trim()
    if (trimmed.length < SEARCH_MODE_META[mode].minLength) {
      setSearchResults([])
      setSearching(false)
      setSearchIssue(null)
      return
    }
    if (mode === 'ang') {
      setSearchResults([])
      setSearching(false)
      setSearchIssue(null)
      return
    }
    setSearching(true)
    setSearchIssue(null)
    debounceRef.current = setTimeout(async () => {
      try {
        const resultSets = await Promise.all(
          getBackendSearchTypes(trimmed, mode).map(searchType => (
            fetchSearch(trimmed, searchType, source, 'read-search')
          ))
        )
        const results = dedupeSearchResults(resultSets)
        setSearchResults(results)
        setSearchIssue(null)
        addRecent(trimmed, mode)
        } catch (error) {
          setSearchResults([])
          setSearchIssue(resolveAsyncIssue(error).code)
        } finally {
          setSearching(false)
          revealSearchFeedback()
        }
      }, 300)
    }, [addRecent, revealSearchFeedback, searchMode, searchSource])

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      handleSearch(searchQuery, searchMode, searchSource)
    }
  }, [handleSearch, searchMode, searchSource, searchQuery])

  const openSearchResult = (result: GroupedSearchResult) => {
    navigate(`/study?shabadId=${result.shabadId}&verseId=${result.verseId}`)
  }

  const openSundarGutkaBani = (item: BaniIndexItem) => {
    const canonicalBani = getCanonicalSundarGutkaBani(item)
    const name = canonicalBani && isSundarGutkaLengthSupportedBaniId(canonicalBani.id)
      ? SUNDAR_GUTKA_SUPPORTED_BANIS[canonicalBani.id].name
      : canonicalBani?.name ?? item.transliteration ?? item.gurmukhi

    if (canonicalBani) {
      navigate(buildCanonicalBaniStudyPath(canonicalBani, {
        baniDbId: item.id,
        baniId: canonicalBani.variantOf ?? canonicalBani.id,
        baniName: name,
      }))
      return
    }

    navigate(`/study?baniDbId=${item.id}&bani=${encodeURIComponent(name)}`)
  }

  const sundarGutkaGroups = useMemo(() => {
    const nitnem = sundarGutkaBanis.filter(item => {
      const canonicalId = getCanonicalSundarGutkaBani(item)?.id
      return canonicalId ? NITNEM_SUNDAR_GUTKA_BANI_IDS.has(canonicalId) : false
    })
    const popular = sundarGutkaBanis.filter(item => {
      const canonicalId = getCanonicalSundarGutkaBani(item)?.id
      return canonicalId ? POPULAR_SUNDAR_GUTKA_BANI_IDS.has(canonicalId) : false
    })
    const other = sundarGutkaBanis.filter(item => SUNDAR_GUTKA_STANDALONE_BANIDB_IDS.has(item.id))

    return [
      { key: 'nitnem', label: 'Nitnem', items: nitnem },
      { key: 'popular', label: 'Popular Bani', items: popular },
      { key: 'other', label: 'Other', items: other },
    ].filter(group => group.items.length > 0)
  }, [sundarGutkaBanis])

  const scriptureGroups = useMemo(() => {
    return (Object.keys(SCRIPTURE_META) as Scripture[]).reduce<Record<Scripture, Array<{ category: string; items: Array<Bani & { baniDbId: number }> }>>>((groups, scripture) => {
      const items = EXACT_BANIS_BY_SCRIPTURE[scripture]
      const orderedCategories = SCRIPTURE_META[scripture].categoryOrder

      groups[scripture] = orderedCategories
        .map(category => ({
          category,
          items: items.filter(item => item.category === category),
        }))
        .filter(group => group.items.length > 0)

      return groups
    }, {
      SGGS: [],
      DG: [],
    })
  }, [])

  const groupedSearchResults = useMemo(
    () => groupSearchResults(searchResults, { raag: raagFilter, writer: writerFilter }),
    [raagFilter, searchResults, writerFilter]
  )

  const { raags: availableRaags, writers: availableWriters } = useMemo(
    () => getAvailableSearchMeta(searchResults),
    [searchResults]
  )

  const angTargets = useMemo(
    () => searchMode === 'ang' ? getAngTargets(searchQuery, searchSource) : [],
    [searchMode, searchQuery, searchSource]
  )

  const appSearchMatches = useAppSearchMatches(
    searchMode === 'ang' ? '' : searchQuery.trim(),
    searchSource
  )

  return (
    <div
      className="read-room-shell page-shell max-w-md mx-auto min-h-screen bg-parchment dark:bg-dark-bg transition-colors duration-300 animate-fade-in"
      data-testid="page-banis"
      data-page="banis"
      data-ai-surface="read"
      data-ai-state="ready"
    >
      <div className="read-room-stack">
        <section className="read-room-hero" aria-labelledby="read-room-title">
          <div className="read-room-hero__copy">
            <p className="eyebrow">{editorial?.read.eyebrow ?? 'Read'}</p>
            <h1 id="read-room-title" className="mt-2 font-display text-4xl leading-none text-ink dark:text-dark-text">
              {editorial?.read.title ?? 'Move directly into Gurbani.'}
            </h1>
            <p className="read-room-hero__body mt-3 max-w-[32ch] font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/80">
              {editorial?.read.body}
            </p>
          </div>

          <div
            className="read-quick-find-card"
        aria-labelledby="banis-quick-find-title"
        data-testid="banis-quick-find"
        data-ai-surface="read-smart-search"
        data-ai-state={
          searchMode === 'ang'
            ? (searchQuery.trim().length >= SEARCH_MODE_META[searchMode].minLength ? 'ready' : 'empty')
            : searching
              ? 'loading'
              : searchIssue
                ? 'degraded'
              : (appSearchMatches.length > 0 || searchResults.length > 0)
                ? 'ready'
                : searchQuery.trim().length >= SEARCH_MODE_META[searchMode].minLength
                  ? 'empty'
                  : 'empty'
        }
        data-ai-error={searchIssue ? 'read-search' : undefined}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">{editorial?.read.quickFindEyebrow ?? 'Quick Find'}</p>
            <p id="banis-quick-find-title" className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">
              {editorial?.read.quickFindTitle ?? 'Search by the shape you remember first.'}
            </p>
            <p className="read-quick-find-card__body mt-2 max-w-[30ch] font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/80">
              {editorial?.read.quickFindBody ?? SEARCH_OPTION_SUMMARY[searchMode]}
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggle('search-options')}
            className="shrink-0 rounded-full border border-sand/15 bg-parchment-card px-3 py-2 font-sans text-[11px] font-medium text-ink/65 transition-colors duration-300 dark:border-dark-text/10 dark:bg-dark-card dark:text-dark-text/80"
            aria-expanded={searchOptionsOpen}
            aria-controls="banis-search-options-panel"
            data-ai-action="toggle-search-options"
          >
            {searchOptionsOpen ? 'Simplify' : 'Refine search'}
          </button>
        </div>

        <div className="read-search-control relative mt-4" data-ai-search-shell="read-smart-search">
          <IconSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/32 dark:text-dark-text/34" />
          <input
            ref={searchInputRef}
            id="banis-search"
            name="banis-search"
            type="search"
            aria-label="Search Gurbani, meanings, or direct routes"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            inputMode="search"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder={SEARCH_MODE_META[searchMode].placeholder}
            className="read-search-input w-full bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-2xl pl-11 pr-4 py-4 font-sans text-base text-ink dark:text-dark-text placeholder:text-ink/36 dark:placeholder:text-dark-text/38 outline-none focus:border-saffron/45 transition-colors duration-300"
            data-ai-action="read-smart-search"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <MetadataChip>{searchMode === 'auto-detect' ? 'Auto detect' : SEARCH_MODE_LABELS[searchMode]}</MetadataChip>
          {searchSource !== 'all' && <MetadataChip>{SEARCH_SOURCE_LABELS[searchSource]}</MetadataChip>}
          {searchMode === 'ang' && <MetadataChip>Direct open</MetadataChip>}
          {searchQuery.trim().length >= SEARCH_MODE_META[searchMode].minLength && searchMode !== 'ang' && (
            <MetadataChip>{searching ? 'Searching' : 'Ready'}</MetadataChip>
          )}
        </div>

        {searchOptionsOpen && (
          <div id="banis-search-options-panel">
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(Object.entries(SEARCH_MODE_META) as Array<[SearchMode, typeof SEARCH_MODE_META[SearchMode]]>).map(([mode]) => {
                const selected = searchMode === mode
                return (
                    <button
                      key={mode}
                      onClick={() => setSearchMode(mode)}
                      aria-pressed={selected}
                      className={`min-h-[44px] rounded-xl px-3 py-2 font-sans text-xs font-medium transition-all duration-300 ${
                        selected
                          ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                          : 'bg-parchment-card dark:bg-dark-card text-ink/70 dark:text-dark-text/70 border border-sand/15 dark:border-dark-text/10'
                    }`}
                  >
                    {SEARCH_MODE_LABELS[mode]}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {Object.entries(SEARCH_SOURCE_LABELS).map(([value, label]) => {
                const selected = searchSource === value
                return (
                    <button
                      key={value}
                      onClick={() => setSearchSource(value as keyof typeof SEARCH_SOURCE_LABELS)}
                      aria-pressed={selected}
                      className={`min-h-[44px] rounded-full px-3 py-2 font-sans text-[11px] border transition-all duration-300 ${
                        selected
                          ? 'bg-saffron text-white border-saffron'
                          : 'bg-parchment-card dark:bg-dark-card text-ink/60 dark:text-dark-text/60 border-sand/15 dark:border-dark-text/10'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
          )}
          {searchMode === 'ang' && searchQuery.trim() && (
            <div ref={setSearchFeedbackElement} className="nav-safe-results mt-3 space-y-2" data-testid="banis-search-ang-results" data-ai-result-group="ang">
            {angTargets.length > 0 ? angTargets.map(target => (
              <button
                key={target.source}
                onClick={() => {
                  addRecent(searchQuery.trim(), 'ang')
                  navigate(target.path)
                }}
                className="w-full text-left bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl px-3 py-3 transition-colors duration-300"
              >
                <p className="font-sans text-sm text-ink dark:text-dark-text">
                  Open {target.label} {target.kind}{' '}
                  <SearchHighlight text={searchQuery.trim()} query={searchQuery.trim()} />
                </p>
                <p className="font-sans text-xs text-ink/45 dark:text-dark-text/45 mt-1">
                  Direct page lookup without running a word search.
                </p>
              </button>
            )) : (
              <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 mt-2 ml-1">No matching source can open that ang/page.</p>
            )}
          </div>
          )}
          {searching && <p ref={setSearchFeedbackElement} className="nav-safe-results font-sans text-xs text-ink/40 dark:text-dark-text/40 mt-2 ml-1">Searching exact results...</p>}
          {searchIssue && !searching && searchMode !== 'ang' && (
            <div ref={setSearchFeedbackElement} className="nav-safe-results mt-3 rounded-[20px] border border-[#b4553d]/18 bg-[#b4553d]/8 px-4 py-3 text-sm text-[#8d3a24] dark:border-[#ffb29d]/18 dark:bg-[#ffb29d]/8 dark:text-[#ffb29d]">
              {getSearchIssueCopy(searchIssue)}
            </div>
          )}
          {appSearchMatches.length > 0 && searchMode !== 'ang' && (
            <div ref={setSearchFeedbackElement} className="nav-safe-results mt-3 space-y-2" data-testid="banis-search-app-results" data-ai-result-group="in-app">
            <div className="flex items-center justify-between gap-3 px-1">
              <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-ink/40 dark:text-dark-text/40">
                In the app
              </p>
              <p className="font-sans text-[11px] text-ink/45 dark:text-dark-text/45">
                Exact destinations first
              </p>
            </div>
            {appSearchMatches.map(match => (
              (() => {
                const trimmedSearchQuery = searchQuery.trim()
                const showMatchedQuery = trimmedSearchQuery.length >= 2
                  && !hasSearchMatch(match.label, trimmedSearchQuery)
                  && !hasSearchMatch(match.detail, trimmedSearchQuery)

                return (
                  <button
                    key={match.key}
                    onClick={() => navigate(match.path)}
                    className="w-full text-left rounded-[22px] border border-saffron/20 bg-gradient-to-r from-saffron/8 to-saffron-light/10 px-4 py-3 transition-colors duration-300 active:scale-[0.99] dark:border-saffron/20 dark:from-saffron/12 dark:to-saffron-light/12"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">
                          <SearchHighlight text={match.label} query={trimmedSearchQuery} />
                        </p>
                        <p className="mt-1 font-sans text-xs text-ink/55 dark:text-dark-text/55">
                          <SearchHighlight text={match.detail} query={trimmedSearchQuery} />
                        </p>
                        {showMatchedQuery ? (
                          <p className="mt-2 font-sans text-[11px] text-ink/52 dark:text-dark-text/54">
                            Matched for <SearchHighlight text={trimmedSearchQuery} query={trimmedSearchQuery} />
                          </p>
                        ) : null}
                      </div>
                      <span className="chip-pill">{match.kind === 'learn-topic' ? 'Learn' : 'Read'}</span>
                    </div>
                  </button>
                )
              })()
            ))}
            </div>
          )}
          {searchResults.length > 0 && searchMode !== 'ang' && (
            <div ref={setSearchFeedbackElement} className="nav-safe-results mt-2 space-y-1" data-testid="banis-search-gurbani-results" data-ai-result-group="gurbani">
            {(availableRaags.length > 0 || availableWriters.length > 0) && (
              <div className="space-y-2 pb-2">
                {availableRaags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setRaagFilter('all')}
                        aria-pressed={raagFilter === 'all'}
                        className={`min-h-[44px] rounded-full px-3 py-2 font-sans text-[11px] border ${raagFilter === 'all' ? 'bg-saffron text-white border-saffron' : 'bg-parchment-card dark:bg-dark-card text-ink/60 dark:text-dark-text/60 border-sand/15 dark:border-dark-text/10'}`}
                    >
                      All Raags
                    </button>
                    {availableRaags.map(raag => (
                      <button
                          key={raag}
                          onClick={() => setRaagFilter(raag)}
                          aria-pressed={raagFilter === raag}
                          className={`min-h-[44px] rounded-full px-3 py-2 font-sans text-[11px] border ${raagFilter === raag ? 'bg-saffron text-white border-saffron' : 'bg-parchment-card dark:bg-dark-card text-ink/60 dark:text-dark-text/60 border-sand/15 dark:border-dark-text/10'}`}
                      >
                        {raag}
                      </button>
                    ))}
                  </div>
                )}
                {availableWriters.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setWriterFilter('all')}
                        aria-pressed={writerFilter === 'all'}
                        className={`min-h-[44px] rounded-full px-3 py-2 font-sans text-[11px] border ${writerFilter === 'all' ? 'bg-saffron text-white border-saffron' : 'bg-parchment-card dark:bg-dark-card text-ink/60 dark:text-dark-text/60 border-sand/15 dark:border-dark-text/10'}`}
                    >
                      All Writers
                    </button>
                    {availableWriters.map(writer => (
                      <button
                          key={writer}
                          onClick={() => setWriterFilter(writer)}
                          aria-pressed={writerFilter === writer}
                          className={`min-h-[44px] rounded-full px-3 py-2 font-sans text-[11px] border ${writerFilter === writer ? 'bg-saffron text-white border-saffron' : 'bg-parchment-card dark:bg-dark-card text-ink/60 dark:text-dark-text/60 border-sand/15 dark:border-dark-text/10'}`}
                      >
                        {writer}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {groupedSearchResults.map(r => (
              <div
                key={r.key}
                className="bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl px-3 py-3 transition-colors duration-300"
              >
                <button
                  type="button"
                  onClick={() => openSearchResult(r)}
                  className="w-full text-left"
                >
                  <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-sm text-ink dark:text-dark-text`}><SearchHighlight text={renderScriptText(r.gurmukhi, scriptMode)} query={searchQuery.trim()} /></p>
                  <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 mt-0.5"><SearchHighlight text={r.transliteration} query={searchQuery.trim()} /></p>
                  <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 mt-0.5"><SearchHighlight text={r.translation_en} query={searchQuery.trim()} /></p>
                </button>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {r.sourceName && r.source in SEARCH_SOURCE_LABELS
                    ? <MetadataChip onClick={() => setSearchSource(r.source as SearchSource)}>{r.sourceName}</MetadataChip>
                    : (r.sourceName ? <MetadataChip>{r.sourceName}</MetadataChip> : null)}
                  {typeof r.pageNo === 'number' && r.pageNo > 0 && <MetadataChip>{`Ang ${r.pageNo}`}</MetadataChip>}
                  {r.matchCount > 1 && <MetadataChip>{`${r.matchCount} matches`}</MetadataChip>}
                  {r.raag ? <MetadataChip onClick={() => setRaagFilter(r.raag)}>{r.raag}</MetadataChip> : null}
                  {r.writer ? <MetadataChip onClick={() => setWriterFilter(r.writer)}>{r.writer}</MetadataChip> : null}
                </div>
              </div>
            ))}
          </div>
        )}
        {searchQuery.trim().length >= SEARCH_MODE_META[searchMode].minLength && !searching && !searchIssue && searchResults.length === 0 && appSearchMatches.length === 0 && searchMode !== 'ang' && (
            <p ref={setSearchFeedbackElement} className="nav-safe-results font-sans text-xs text-ink/40 dark:text-dark-text/40 mt-2 ml-1">No results found</p>
        )}
        {!searchQuery && recent.length > 0 && (
          <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
              <p className="font-sans text-[10px] text-ink/40 dark:text-dark-text/40 uppercase tracking-wider">Recent</p>
              <button onClick={clearRecent} className="font-sans text-[10px] text-ink/30 dark:text-dark-text/30">Clear</button>
            </div>
            <div className="space-y-2">
              {recent.map(item => (
                <div key={`${item.query}-${item.mode}`} className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSearchMode(item.mode)
                      handleSearch(item.query, item.mode, searchSource)
                    }}
                    className="flex-1 text-left font-sans text-xs bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-full px-3 py-2 text-ink/60 dark:text-dark-text/60 active:scale-95 transition-transform duration-150"
                  >
                    {item.query} · {SEARCH_MODE_LABELS[item.mode]}
                  </button>
                  <button
                    onClick={() => togglePinned(item.query, item.mode)}
                    aria-label={item.pinned ? `Unpin ${item.query}` : `Pin ${item.query}`}
                    className="min-h-[40px] min-w-[40px] rounded-full bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 flex items-center justify-center text-ink/45 dark:text-dark-text/45"
                  >
                    {item.pinned ? <IconBookmarkFilled size={15} className="text-saffron dark:text-saffron-light" /> : <IconBookmark size={15} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
          </div>
        </section>

        <button
          type="button"
          onClick={() => navigate('/study?baniDbId=24&bani=Ardaas&flow=ardaas-hukamnama')}
          aria-label="Ardaas + Hukamnama"
          className="read-featured-flow-card w-full text-left active:scale-[0.99] transition-transform duration-150"
          data-testid="banis-featured-flow"
          data-ai-action="open-ardaas-hukamnama-flow"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">{editorial?.read.featuredFlowEyebrow ?? 'Featured Flow'}</p>
            <span className="chip-pill shrink-0">Devotional flow</span>
          </div>
          <div className="mt-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-3xl leading-none text-ink dark:text-dark-text">
                Ardaas + Hukamnama
              </h2>
              <p className="read-featured-flow-card__body mt-3 max-w-[30ch] font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/80">
                {ARDAAS_HUKAMNAMA_EDITORIAL_COPY.dek}
              </p>
            </div>
            <span className="read-featured-flow-card__action mt-1 shrink-0 text-gold dark:text-gold-light">
              <IconArrowRight size={18} />
            </span>
          </div>
          <span className="read-featured-flow-card__cta mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 font-sans text-sm font-semibold text-cream dark:bg-gold-light dark:text-dark-bg">
            Begin devotional flow
            <IconArrowRight size={15} />
          </span>
        </button>

        <section className="read-directory-section" aria-labelledby="read-directory-title">
          <div className="read-section-header">
            <p className="eyebrow">Browse</p>
            <h2 id="read-directory-title" className="mt-2 font-display text-3xl leading-none text-ink dark:text-dark-text">
              Bani directories
            </h2>
            <p className="read-section-copy mt-2 font-sans text-sm leading-6 text-ink/62 dark:text-dark-text/76">
              Open named banis and daily prayers.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <div>
        <button
          onClick={() => toggle('sundar-gutka')}
          className="read-directory-card read-directory-card--featured w-full flex justify-between items-center min-h-[44px] active:scale-[0.99] transition-transform duration-150"
          data-open={expanded['sundar-gutka'] ? 'true' : 'false'}
          aria-expanded={Boolean(expanded['sundar-gutka'])}
          aria-controls="banis-sundar-gutka-panel"
        >
          <div className="text-left">
            <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} font-semibold text-base text-saffron dark:text-saffron-light`}>{renderScriptText('ਸੁੰਦਰ ਗੁਟਕਾ', scriptMode)} · Sundar Gutka</p>
          </div>
          <span className="icon-surface h-8 w-8 text-saffron dark:text-gold-light">{expanded['sundar-gutka'] ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
        </button>

        {expanded['sundar-gutka'] && (
          <div id="banis-sundar-gutka-panel" className="mt-2 ml-2">
            {loadingSundarGutka ? (
              <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 px-2 py-3">Loading Sundar Gutka…</p>
            ) : sundarGutkaGroups.map(group => {
              const groupKey = `sundar-gutka-${group.key}`
              return (
                <div key={group.key} className="mb-2">
                  <button
                    onClick={() => toggle(groupKey)}
                    className="read-directory-card read-directory-card--nested w-full flex justify-between items-center min-h-[44px] active:scale-[0.99] transition-transform duration-150"
                    data-open={expanded[groupKey] ? 'true' : 'false'}
                    aria-expanded={Boolean(expanded[groupKey])}
                    aria-controls={`${groupKey}-panel`}
                  >
                    <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 uppercase tracking-wider">{group.label}</p>
                    <span className="icon-surface h-7 w-7 text-ink/58 dark:text-dark-text/66">{expanded[groupKey] ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
                  </button>
                  {expanded[groupKey] && (
                    <div id={`${groupKey}-panel`} className="mt-1 ml-2">
                      {group.items.flatMap(item => {
                        const routeOptions = group.key === 'nitnem'
                          ? getNitnemRouteOptionsForBani(item)
                          : []

                        if (routeOptions.length > 0) {
                          return routeOptions.map(option => (
                            <IndexRow
                              key={`${item.id}-${option.id}`}
                              label={renderScriptText(option.gurmukhiTitle, scriptMode)}
                              detail={option.romanizedTitle}
                              supplementalDetail={getReaderEditorialCopyForBani(option.id)?.dek}
                              labelLang={getScriptTextLang(scriptMode)}
                              labelClassName={`${getScriptTextFontClass(scriptMode)} text-lg leading-relaxed text-ink dark:text-dark-text`}
                              detailClassName="font-sans text-xs text-gold dark:text-gold-light mt-0.5"
                              onClick={() => navigate(buildNitnemStudyPath(option))}
                            />
                          ))
                        }

                        const displayCopy = getSundarGutkaDisplayCopy(item)

                        return (
                          <IndexRow
                            key={item.id}
                            label={renderScriptText(displayCopy.label, scriptMode)}
                            detail={displayCopy.detail}
                            labelLang={getScriptTextLang(scriptMode)}
                            labelClassName={`${getScriptTextFontClass(scriptMode)} text-lg leading-relaxed text-ink dark:text-dark-text`}
                            detailClassName="font-sans text-xs text-gold dark:text-gold-light mt-0.5"
                            onClick={() => openSundarGutkaBani(item)}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {(['SGGS', 'DG'] as Scripture[]).map(scripture => {
        const meta = SCRIPTURE_META[scripture]
        const sectionKey = scripture.toLowerCase()
        const isOpen = expanded[sectionKey]
        const groups = scriptureGroups[scripture]

        return (
          <div key={scripture}>
            <button
              onClick={() => toggle(sectionKey)}
              className="read-directory-card w-full flex justify-between items-center min-h-[44px] active:scale-[0.99] transition-transform duration-150"
              data-open={isOpen ? 'true' : 'false'}
              aria-expanded={Boolean(isOpen)}
              aria-controls={`banis-${sectionKey}-panel`}
            >
              <div className="text-left">
                <p className={`font-sans font-semibold text-base flex items-center gap-1.5 ${scripture === 'SGGS' ? 'text-saffron dark:text-saffron-light' : 'text-ink dark:text-dark-text'}`}>{meta.icon} {meta.label}</p>
              </div>
              <span className="icon-surface h-8 w-8 text-saffron dark:text-gold-light">{isOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
            </button>

            {isOpen && (
              <div id={`banis-${sectionKey}-panel`} className="mt-2 ml-2">
                {groups.map(group => {
                  const groupKey = `${sectionKey}-${group.category}`
                  return (
                    <div key={group.category} className="mb-2">
                      <button
                        onClick={() => toggle(groupKey)}
                        className="read-directory-card read-directory-card--nested w-full flex justify-between items-center min-h-[44px] active:scale-[0.99] transition-transform duration-150"
                        data-open={expanded[groupKey] ? 'true' : 'false'}
                        aria-expanded={Boolean(expanded[groupKey])}
                        aria-controls={`${groupKey}-panel`}
                      >
                        <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 uppercase tracking-wider">{group.category}</p>
                        <span className="icon-surface h-7 w-7 text-ink/58 dark:text-dark-text/66">{expanded[groupKey] ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
                      </button>
                      {expanded[groupKey] && (
                        <div id={`${groupKey}-panel`} className="mt-1 ml-2">
                          {group.items.flatMap(item => {
                            if (item.variantOf) {
                              const baseItemVisible = group.items.some(candidate => !candidate.variantOf && candidate.id === item.variantOf)
                              if (baseItemVisible) return []

                              return (
                                <IndexRow
                                  key={item.id}
                                  label={getExactBaniRowLabel(item)}
                                  detail={getReaderEditorialCopyForBani(item.id)?.dek}
                                  detailClassName="font-sans text-xs leading-5 text-ink/58 dark:text-dark-text/70 mt-1"
                                  onClick={() => navigate(buildCanonicalBaniStudyPath(item))}
                                />
                              )
                            }

                            const routeOptions = getExactRouteOptionsForBani(item)
                            if (routeOptions.length > 0) {
                              return routeOptions.map(option => (
                                <IndexRow
                                  key={option.key}
                                  label={option.label}
                                  detail={option.detail}
                                  detailClassName="font-sans text-xs leading-5 text-ink/58 dark:text-dark-text/70 mt-1"
                                  onClick={() => navigate(option.path)}
                                />
                              ))
                            }

                            return (
                              <IndexRow
                                key={item.id}
                                label={getExactBaniRowLabel(item)}
                                detail={getReaderEditorialCopyForBani(item.id)?.dek}
                                detailClassName="font-sans text-xs leading-5 text-ink/58 dark:text-dark-text/70 mt-1"
                                onClick={() => navigate(buildCanonicalBaniStudyPath(item))}
                              />
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
          </div>
        </section>

        <section className="read-companion-section" aria-labelledby="read-companion-title">
          <div className="read-section-header">
            <p className="eyebrow">Companion readers</p>
            <h2 id="read-companion-title" className="mt-2 font-display text-3xl leading-none text-ink dark:text-dark-text">
              Source-backed companions
            </h2>
            <p className="read-section-copy mt-2 font-sans text-sm leading-6 text-ink/62 dark:text-dark-text/76">
              Open complementary readers with search, source context, and page navigation.
            </p>
          </div>

          <div className="mt-4 grid gap-3">
      <Link
        to="/banis/rehat"
        className="read-extra-source-card flex w-full items-center justify-between gap-4 rounded-2xl border border-sand/15 bg-parchment-low p-4 text-left shadow-card transition-colors duration-300 active:scale-[0.99] dark:border-dark-text/10 dark:bg-dark-surface"
        data-testid="banis-open-rehat"
      >
        <span className="min-w-0">
          <span className="font-sans font-semibold text-base text-ink dark:text-dark-text">Rehat</span>
          <span className="read-extra-source-card__body mt-1 block font-sans text-sm leading-6 text-ink/60 dark:text-dark-text/82">
            Open the Rehat reader with list search, chapter filtering, source context, and chapter text search.
          </span>
        </span>
        <span className="icon-surface h-9 w-9 shrink-0 text-saffron dark:text-gold-light">
          <IconArrowRight size={15} />
        </span>
      </Link>

      <Link
        to="/banis/amrit-keertan"
        className="read-extra-source-card flex w-full items-center justify-between gap-4 rounded-2xl border border-sand/15 bg-parchment-low p-4 text-left shadow-card transition-colors duration-300 active:scale-[0.99] dark:border-dark-text/10 dark:bg-dark-surface"
        data-testid="banis-open-amrit-keertan"
      >
        <span className="min-w-0">
          <span className="font-sans font-semibold text-base text-ink dark:text-dark-text">Amrit Keertan</span>
          <span className="read-extra-source-card__body mt-1 block font-sans text-sm leading-6 text-ink/60 dark:text-dark-text/82">
            Open the Amrit Keertan directory with section search, source metadata, English, and page navigation.
          </span>
        </span>
        <span className="icon-surface h-9 w-9 shrink-0 text-saffron dark:text-gold-light">
          <IconArrowRight size={15} />
        </span>
      </Link>
          </div>
        </section>

        <section
        className="read-source-section"
        aria-labelledby="read-source-browser-title"
        data-testid="read-source-browser"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">Browse by source</p>
            <h2 id="read-source-browser-title" className="mt-2 font-display text-3xl leading-none text-ink dark:text-dark-text">
              Source / page browser
            </h2>
            <p className="read-section-copy mt-2 max-w-[34ch] font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/76">
              Open by ang, page, or source edition.
            </p>
          </div>
          <span className="chip-pill shrink-0">Read</span>
        </div>

        <div className="mt-4">
          <ScriptureSourceBrowser
            dataTestId="read-source-browser-shared"
            sectionClassName="read-source-browser-card surface-primary px-4 py-4"
          />
        </div>
      </section>
      </div>
    </div>
  )
}
