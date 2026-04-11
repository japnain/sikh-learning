import { useState, useCallback, useRef, useEffect, useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchSearch,
  fetchBanisIndex,
  fetchAmritKeertanIndex,
  fetchAmritKeertanShabads,
  type SearchResult,
  type BaniIndexItem,
  type AmritKeertanHeader,
  type AmritKeertanShabad,
} from '../api/banidb'
import { BANIS, DG_CATEGORY_ORDER, READ_EXACT_DG_BANIS, READ_EXACT_SGGS_BANIS, SGGS_CATEGORY_ORDER, type Bani } from '../data/banis'
import { useRecentSearchStore } from '../store/recentSearch'
import { buildNitnemStudyPath, NITNEM_ROUTE_OPTIONS } from '../store/nitnem'
import type { SearchMode } from '../types'
import { buildCanonicalBaniStudyPath } from '../utils/baniRouteResolver'
import {
  SUNDAR_GUTKA_SUPPORTED_BANIS,
  isSundarGutkaLengthSupportedBaniId,
} from '../utils/sundarGutkaLength'
import { SEARCH_MODE_LABELS } from '../utils/translations'
import { IconArrowLeft, IconArrowRight, IconSearch, IconChevronUp, IconChevronDown, IconLibrary, IconSword, IconBookmark, IconBookmarkFilled } from '../components/icons'
import { getEditorialCopy } from '../content/editorialCopy'
import {
  getAngTargets,
  getAppSearchMatches,
  getAvailableSearchMeta,
  groupSearchResults,
  SEARCH_SOURCE_LABELS,
  type GroupedSearchResult,
  type SearchSource,
} from '../utils/appSearch'

type Scripture = 'SGGS' | 'DG'
type ExactBani = Bani & { baniDbId: number }
interface ResolvedRouteOption {
  key: string
  label: string
  path: string
}

const SCRIPTURE_META: Record<Scripture, { label: string; icon: ReactNode; categoryOrder: readonly string[] }> = {
  SGGS: { label: 'Sri Guru Granth Sahib Ji', icon: <IconLibrary size={18} />, categoryOrder: SGGS_CATEGORY_ORDER },
  DG: { label: 'Dasam Granth', icon: <IconSword size={18} />, categoryOrder: DG_CATEGORY_ORDER },
}

const AMRIT_KEERTAN_PAGE_SIZE = 12
const SEARCH_MODE_META: Record<SearchMode, { type: number; placeholder: string; minLength: number }> = {
  'first-letters': { type: 0, placeholder: 'Search first letters in Gurmukhi...', minLength: 2 },
  'first-letters-anywhere': { type: 1, placeholder: 'Search first letters anywhere in the line...', minLength: 2 },
  gurmukhi: { type: 2, placeholder: 'Search full Gurbani words...', minLength: 2 },
  english: { type: 3, placeholder: 'Search English meanings...', minLength: 2 },
  transliteration: { type: 4, placeholder: 'Search transliteration...', minLength: 2 },
  ang: { type: -1, placeholder: 'Open an ang or page directly...', minLength: 1 },
  'auto-detect': { type: 8, placeholder: 'Let the app detect the search style...', minLength: 2 },
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
const CANONICAL_SUNDAR_GUTKA_BANI_IDS = new Set([
  'japji-sahib',
  'jaap-sahib',
  'tav-prasad-savaiye',
  'chaupai-sahib',
  'anand-sahib',
  'rehras-sahib',
  'kirtan-sohila',
  'salok-mahalla-9',
  'sukhmani-sahib',
  'asa-di-var',
  'aarti',
  'laavan',
])

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
  SGGS: READ_EXACT_SGGS_BANIS.filter((bani): bani is ExactBani => typeof bani.baniDbId === 'number'),
  DG: READ_EXACT_DG_BANIS.filter((bani): bani is ExactBani => typeof bani.baniDbId === 'number'),
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
    } satisfies ResolvedRouteOption
  })
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <span key={i} className="bg-saffron/30 text-saffron dark:text-saffron-light font-semibold rounded-sm px-0.5">{part}</span>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

function IndexRow({
  label,
  detail,
  onClick,
}: {
  label: string
  detail?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl px-3 py-3 mb-1 transition-colors duration-300 active:scale-95 transition-transform duration-150"
    >
      <p className="font-sans text-sm text-ink dark:text-dark-text">{label}</p>
      {detail ? (
        <p className="font-sans text-xs text-gold dark:text-gold-light mt-0.5">{detail}</p>
      ) : null}
    </button>
  )
}

function MetadataChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-gold/10 dark:bg-gold/10 border border-gold/15 dark:border-gold/20 px-2 py-1 font-sans text-[10px] text-gold dark:text-gold-light">
      {children}
    </span>
  )
}

export default function Banis() {
  const navigate = useNavigate()
  const editorial = getEditorialCopy('en')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchMode, setSearchMode] = useState<SearchMode>('auto-detect')
  const [searchSource, setSearchSource] = useState<SearchSource>('all')
  const [raagFilter, setRaagFilter] = useState<string>('all')
  const [writerFilter, setWriterFilter] = useState<string>('all')
  const [sundarGutkaBanis, setSundarGutkaBanis] = useState<BaniIndexItem[]>([])
  const [loadingSundarGutka, setLoadingSundarGutka] = useState(true)
  const [amritHeaders, setAmritHeaders] = useState<AmritKeertanHeader[]>([])
  const [loadingAmritHeaders, setLoadingAmritHeaders] = useState(true)
  const [amritShabadsByHeader, setAmritShabadsByHeader] = useState<Record<number, AmritKeertanShabad[]>>({})
  const [loadingAmritHeader, setLoadingAmritHeader] = useState<number | null>(null)
  const [selectedAmritHeaderId, setSelectedAmritHeaderId] = useState<number | null>(null)
  const [amritChapterQuery, setAmritChapterQuery] = useState('')
  const [visibleAmritCount, setVisibleAmritCount] = useState(AMRIT_KEERTAN_PAGE_SIZE)
  const toggle = (key: string) => setExpanded(e => ({ ...e, [key]: !e[key] }))
  const searchOptionsOpen = expanded['search-options'] ?? false

  const { recent, addRecent, togglePinned, clearRecent } = useRecentSearchStore()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

    setLoadingAmritHeaders(true)
    fetchAmritKeertanIndex()
      .then(data => {
        if (!cancelled) setAmritHeaders(data)
      })
      .catch(() => {
        if (!cancelled) setAmritHeaders([])
      })
      .finally(() => {
        if (!cancelled) setLoadingAmritHeaders(false)
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

  const handleSearch = useCallback((query: string, mode: SearchMode = searchMode, source: SearchSource = searchSource) => {
    setSearchQuery(query)
    setRaagFilter('all')
    setWriterFilter('all')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = query.trim()
    if (trimmed.length < SEARCH_MODE_META[mode].minLength) {
      setSearchResults([])
      setSearching(false)
      return
    }
    if (mode === 'ang') {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await fetchSearch(trimmed, SEARCH_MODE_META[mode].type, source)
        setSearchResults(results)
        addRecent(trimmed, mode)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [addRecent, searchMode, searchSource])

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

  const loadAmritHeader = async (headerId: number) => {
    if (amritShabadsByHeader[headerId] || loadingAmritHeader === headerId) return
    setLoadingAmritHeader(headerId)
    try {
      const shabads = await fetchAmritKeertanShabads(headerId)
      setAmritShabadsByHeader(current => ({ ...current, [headerId]: shabads }))
    } catch {
      setAmritShabadsByHeader(current => ({ ...current, [headerId]: [] }))
    } finally {
      setLoadingAmritHeader(current => (current === headerId ? null : current))
    }
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
    const other = sundarGutkaBanis.filter(item => {
      const canonicalId = getCanonicalSundarGutkaBani(item)?.id
      return canonicalId
        ? !NITNEM_SUNDAR_GUTKA_BANI_IDS.has(canonicalId) && !POPULAR_SUNDAR_GUTKA_BANI_IDS.has(canonicalId)
        : true
    })

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

  const selectedAmritHeader = useMemo(
    () => amritHeaders.find(header => header.headerId === selectedAmritHeaderId) ?? null,
    [amritHeaders, selectedAmritHeaderId]
  )
  const selectedAmritShabads = useMemo(
    () => selectedAmritHeaderId ? (amritShabadsByHeader[selectedAmritHeaderId] ?? []) : [],
    [amritShabadsByHeader, selectedAmritHeaderId]
  )
  const normalizedAmritChapterQuery = amritChapterQuery.trim().toLowerCase()
  const filteredAmritShabads = useMemo(() => {
    if (!normalizedAmritChapterQuery) return selectedAmritShabads

    return selectedAmritShabads.filter(shabad => {
      const searchable = [
        shabad.gurmukhi,
        shabad.transliteration,
        shabad.source,
        shabad.raag,
        String(shabad.pageNo || ''),
      ]
        .join(' ')
        .toLowerCase()

      return searchable.includes(normalizedAmritChapterQuery)
    })
  }, [normalizedAmritChapterQuery, selectedAmritShabads])
  const visibleAmritShabads = useMemo(
    () => filteredAmritShabads.slice(0, visibleAmritCount),
    [filteredAmritShabads, visibleAmritCount]
  )
  const hasMoreAmritShabads = visibleAmritShabads.length < filteredAmritShabads.length

  const handleToggleAmritKeertan = () => {
    if (expanded.ak) {
      setSelectedAmritHeaderId(null)
      setAmritChapterQuery('')
      setVisibleAmritCount(AMRIT_KEERTAN_PAGE_SIZE)
    }
    toggle('ak')
  }

  const openAmritHeader = async (header: AmritKeertanHeader) => {
    setSelectedAmritHeaderId(header.headerId)
    setAmritChapterQuery('')
    setVisibleAmritCount(AMRIT_KEERTAN_PAGE_SIZE)
    await loadAmritHeader(header.headerId)
  }

  const openAmritShabad = (shabadId: number) => {
    navigate(`/study?shabadId=${shabadId}`)
  }

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

  const appSearchMatches = useMemo(() => {
    const trimmedQuery = searchQuery.trim()
    if (searchMode === 'ang' || trimmedQuery.length < SEARCH_MODE_META[searchMode].minLength) {
      return []
    }

    return getAppSearchMatches(trimmedQuery, searchSource)
  }, [searchMode, searchQuery, searchSource])

  return (
    <div
      className="p-4 max-w-md mx-auto min-h-screen bg-parchment dark:bg-dark-bg transition-colors duration-300 animate-fade-in"
      data-testid="page-banis"
      data-page="banis"
    >
      <div className="mb-6 mt-4">
        <p className="eyebrow">{editorial?.read.eyebrow ?? 'Read'}</p>
        <h1 className="mt-2 font-display text-4xl leading-none text-ink dark:text-dark-text">
          {editorial?.read.title ?? 'Move directly into Gurbani.'}
        </h1>
        <p className="mt-3 max-w-[32ch] font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">
          {editorial?.read.body}
        </p>
      </div>

      <div
        className="mb-6 section-shell-quiet p-4"
        aria-labelledby="banis-quick-find-title"
        data-testid="banis-quick-find"
        data-ai-surface="read-smart-search"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">{editorial?.read.quickFindEyebrow ?? 'Quick Find'}</p>
            <p id="banis-quick-find-title" className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">
              {editorial?.read.quickFindTitle ?? 'Search by the shape you remember first.'}
            </p>
            <p className="mt-2 max-w-[30ch] font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">
              {editorial?.read.quickFindBody ?? SEARCH_OPTION_SUMMARY[searchMode]}
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggle('search-options')}
            className="shrink-0 rounded-full border border-sand/15 bg-parchment-card px-3 py-2 font-sans text-[11px] font-medium text-ink/65 transition-colors duration-300 dark:border-dark-text/10 dark:bg-dark-card dark:text-dark-text/65"
            aria-expanded={searchOptionsOpen}
            aria-controls="banis-search-options-panel"
          >
            {searchOptionsOpen ? 'Simplify' : 'Refine'}
          </button>
        </div>

        <div className="relative mt-4" data-ai-search-shell="read-smart-search">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30 dark:text-dark-text/30" />
          <input
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
            className="w-full bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl pl-9 pr-4 py-3 font-sans text-sm text-ink dark:text-dark-text placeholder:text-ink/30 dark:placeholder:text-dark-text/30 outline-none focus:border-saffron/40 transition-colors duration-300"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <MetadataChip>{SEARCH_MODE_LABELS[searchMode]}</MetadataChip>
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
                    className={`rounded-xl px-3 py-2 font-sans text-xs font-medium min-h-[42px] transition-all duration-300 ${
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
                    className={`rounded-full px-3 py-1.5 font-sans text-[11px] border transition-all duration-300 ${
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
          <div className="mt-3 space-y-2" data-testid="banis-search-ang-results" data-ai-result-group="ang">
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
                  Open {target.label} {target.kind} {searchQuery.trim()}
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
        {searching && <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 mt-2 ml-1">Searching exact results...</p>}
        {appSearchMatches.length > 0 && searchMode !== 'ang' && (
          <div className="mt-3 space-y-2" data-testid="banis-search-app-results" data-ai-result-group="in-app">
            <div className="flex items-center justify-between gap-3 px-1">
              <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-ink/40 dark:text-dark-text/40">
                In the app
              </p>
              <p className="font-sans text-[11px] text-ink/45 dark:text-dark-text/45">
                Exact destinations first
              </p>
            </div>
            {appSearchMatches.map(match => (
              <button
                key={match.key}
                onClick={() => navigate(match.path)}
                className="w-full text-left rounded-[22px] border border-saffron/20 bg-gradient-to-r from-saffron/8 to-saffron-light/10 px-4 py-3 transition-colors duration-300 active:scale-[0.99] dark:border-saffron/20 dark:from-saffron/12 dark:to-saffron-light/12"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">{match.label}</p>
                    <p className="mt-1 font-sans text-xs text-ink/55 dark:text-dark-text/55">{match.detail}</p>
                  </div>
                  <span className="chip-pill">{match.kind === 'learn-topic' ? 'Learn' : 'Read'}</span>
                </div>
              </button>
            ))}
          </div>
        )}
        {searchResults.length > 0 && searchMode !== 'ang' && (
          <div className="mt-2 space-y-1" data-testid="banis-search-gurbani-results" data-ai-result-group="gurbani">
            {(availableRaags.length > 0 || availableWriters.length > 0) && (
              <div className="space-y-2 pb-2">
                {availableRaags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setRaagFilter('all')}
                      aria-pressed={raagFilter === 'all'}
                      className={`rounded-full px-3 py-1.5 font-sans text-[11px] border ${raagFilter === 'all' ? 'bg-saffron text-white border-saffron' : 'bg-parchment-card dark:bg-dark-card text-ink/60 dark:text-dark-text/60 border-sand/15 dark:border-dark-text/10'}`}
                    >
                      All Raags
                    </button>
                    {availableRaags.map(raag => (
                      <button
                        key={raag}
                        onClick={() => setRaagFilter(raag)}
                        aria-pressed={raagFilter === raag}
                        className={`rounded-full px-3 py-1.5 font-sans text-[11px] border ${raagFilter === raag ? 'bg-saffron text-white border-saffron' : 'bg-parchment-card dark:bg-dark-card text-ink/60 dark:text-dark-text/60 border-sand/15 dark:border-dark-text/10'}`}
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
                      className={`rounded-full px-3 py-1.5 font-sans text-[11px] border ${writerFilter === 'all' ? 'bg-saffron text-white border-saffron' : 'bg-parchment-card dark:bg-dark-card text-ink/60 dark:text-dark-text/60 border-sand/15 dark:border-dark-text/10'}`}
                    >
                      All Writers
                    </button>
                    {availableWriters.map(writer => (
                      <button
                        key={writer}
                        onClick={() => setWriterFilter(writer)}
                        aria-pressed={writerFilter === writer}
                        className={`rounded-full px-3 py-1.5 font-sans text-[11px] border ${writerFilter === writer ? 'bg-saffron text-white border-saffron' : 'bg-parchment-card dark:bg-dark-card text-ink/60 dark:text-dark-text/60 border-sand/15 dark:border-dark-text/10'}`}
                      >
                        {writer}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {groupedSearchResults.map(r => (
              <button
                key={r.key}
                onClick={() => openSearchResult(r)}
                className="w-full text-left bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl px-3 py-3 transition-colors duration-300"
              >
                <p lang="pa-Guru" className="font-gurmukhi text-sm text-ink dark:text-dark-text"><Highlight text={r.gurmukhi} query={searchQuery} /></p>
                <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 mt-0.5"><Highlight text={r.transliteration} query={searchQuery} /></p>
                <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 mt-0.5"><Highlight text={r.translation_en} query={searchQuery} /></p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {r.sourceName && <MetadataChip>{r.sourceName}</MetadataChip>}
                  {typeof r.pageNo === 'number' && r.pageNo > 0 && <MetadataChip>{`Ang ${r.pageNo}`}</MetadataChip>}
                  {r.matchCount > 1 && <MetadataChip>{`${r.matchCount} matches`}</MetadataChip>}
                  {r.raag && <MetadataChip>{r.raag}</MetadataChip>}
                  {r.writer && <MetadataChip>{r.writer}</MetadataChip>}
                </div>
              </button>
            ))}
          </div>
        )}
        {searchQuery.trim().length >= SEARCH_MODE_META[searchMode].minLength && !searching && searchResults.length === 0 && appSearchMatches.length === 0 && searchMode !== 'ang' && (
          <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 mt-2 ml-1">No results found</p>
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

      <button
        type="button"
        onClick={() => navigate('/study?baniDbId=24&bani=Ardaas&flow=ardaas-hukamnama')}
        className="hero-surface mb-4 w-full p-5 text-left active:scale-[0.99] transition-transform duration-150"
        data-testid="banis-featured-flow"
      >
        <p className="eyebrow">{editorial?.read.featuredFlowEyebrow ?? 'Featured Flow'}</p>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-3xl leading-none text-ink dark:text-dark-text">
              Ardaas + Hukamnama
            </h2>
            <p className="mt-3 max-w-[30ch] font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">
              {editorial?.read.featuredFlowBody ?? 'Do Ardaas, then take a random Hukamnama from Sri Guru Granth Sahib Ji.'}
            </p>
          </div>
          <span className="mt-1 shrink-0 text-gold dark:text-gold-light">
            <IconArrowRight size={18} />
          </span>
        </div>
      </button>

      <div className="mb-4">
        <button
          onClick={() => toggle('sundar-gutka')}
          className="w-full flex justify-between items-center bg-gradient-to-r from-saffron/10 to-saffron-light/10 dark:from-saffron/15 dark:to-saffron-light/15 border border-saffron/20 dark:border-saffron/20 rounded-2xl p-4 min-h-[44px] transition-colors duration-300 shadow-card active:scale-95 transition-transform duration-150"
          aria-expanded={Boolean(expanded['sundar-gutka'])}
          aria-controls="banis-sundar-gutka-panel"
        >
          <div className="text-left">
            <p className="font-sans font-semibold text-base text-saffron dark:text-saffron-light">ਸੁੰਦਰ ਗੁਟਕਾ · Sundar Gutka</p>
          </div>
          <span className="text-saffron dark:text-saffron-light font-sans text-sm">{expanded['sundar-gutka'] ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
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
                    className="w-full flex justify-between items-center bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl p-3 min-h-[44px] transition-colors duration-300 active:scale-95 transition-transform duration-150"
                    aria-expanded={Boolean(expanded[groupKey])}
                    aria-controls={`${groupKey}-panel`}
                  >
                    <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 uppercase tracking-wider">{group.label}</p>
                    <span className="font-sans text-xs text-ink/50 dark:text-dark-text/50">{expanded[groupKey] ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
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
                              label={routeOptions.length > 1 && option.variantLabel
                                ? `${item.gurmukhi} · ${option.variantLabel}`
                                : item.gurmukhi}
                              onClick={() => navigate(buildNitnemStudyPath(option))}
                            />
                          ))
                        }

                        return (
                          <IndexRow
                            key={item.id}
                            label={item.gurmukhi}
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
          <div key={scripture} className="mb-4">
            <button
              onClick={() => toggle(sectionKey)}
              className={`w-full flex justify-between items-center ${scripture === 'SGGS' ? 'bg-parchment-card dark:bg-dark-card' : 'bg-parchment-low dark:bg-dark-surface'} border border-sand/15 dark:border-dark-text/10 rounded-2xl p-4 min-h-[44px] transition-colors duration-300 shadow-card active:scale-95 transition-transform duration-150`}
              aria-expanded={Boolean(isOpen)}
              aria-controls={`banis-${sectionKey}-panel`}
            >
              <div className="text-left">
                <p className={`font-sans font-semibold text-base flex items-center gap-1.5 ${scripture === 'SGGS' ? 'text-saffron dark:text-saffron-light' : 'text-ink dark:text-dark-text'}`}>{meta.icon} {meta.label}</p>
              </div>
              <span className="text-saffron dark:text-saffron-light font-sans text-sm">{isOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
            </button>

            {isOpen && (
              <div id={`banis-${sectionKey}-panel`} className="mt-2 ml-2">
                {groups.map(group => {
                  const groupKey = `${sectionKey}-${group.category}`
                  return (
                    <div key={group.category} className="mb-2">
                      <button
                        onClick={() => toggle(groupKey)}
                        className="w-full flex justify-between items-center bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl p-3 min-h-[44px] transition-colors duration-300 active:scale-95 transition-transform duration-150"
                        aria-expanded={Boolean(expanded[groupKey])}
                        aria-controls={`${groupKey}-panel`}
                      >
                        <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 uppercase tracking-wider">{group.category}</p>
                        <span className="font-sans text-xs text-ink/50 dark:text-dark-text/50">{expanded[groupKey] ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
                      </button>
                      {expanded[groupKey] && (
                        <div id={`${groupKey}-panel`} className="mt-1 ml-2">
                          {group.items.flatMap(item => {
                            if (item.variantOf) {
                              return []
                            }

                            const routeOptions = getExactRouteOptionsForBani(item)
                            if (routeOptions.length > 0) {
                              return routeOptions.map(option => (
                                <IndexRow
                                  key={option.key}
                                  label={option.label}
                                  onClick={() => navigate(option.path)}
                                />
                              ))
                            }

                            return (
                              <IndexRow
                                key={item.id}
                                label={item.name}
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

      <div className="mb-4">
        <button
          onClick={handleToggleAmritKeertan}
          className="w-full flex justify-between items-center bg-parchment-low dark:bg-dark-surface border border-sand/15 dark:border-dark-text/10 rounded-2xl p-4 min-h-[44px] transition-colors duration-300 shadow-card active:scale-95 transition-transform duration-150"
          aria-expanded={Boolean(expanded.ak)}
          aria-controls="banis-amrit-keertan-panel"
        >
          <div className="text-left">
            <p className="font-sans font-semibold text-base text-ink dark:text-dark-text">Amrit Keertan</p>
          </div>
          <span className="text-saffron dark:text-saffron-light font-sans text-sm">{expanded['ak'] ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
        </button>

        {expanded['ak'] && (
          <div id="banis-amrit-keertan-panel" className="mt-2 ml-2">
            {loadingAmritHeaders ? (
              <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 px-2 py-3">Loading Amrit Keertan…</p>
            ) : selectedAmritHeader ? (
              <div className="space-y-3">
                <div className="section-shell rounded-[26px] p-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAmritHeaderId(null)
                      setAmritChapterQuery('')
                      setVisibleAmritCount(AMRIT_KEERTAN_PAGE_SIZE)
                    }}
                    className="mb-4 inline-flex min-h-[40px] items-center gap-2 rounded-full bg-parchment-low px-3 py-2 font-sans text-xs font-medium text-ink/65 transition-colors duration-300 active:scale-95 dark:bg-dark-surface dark:text-dark-text/65"
                  >
                    <IconArrowLeft size={14} />
                    Back to chapters
                  </button>
                  <p className="eyebrow mb-2">Amrit Keertan Chapter</p>
                  <p lang="pa-Guru" className="font-gurmukhi text-2xl leading-relaxed text-ink dark:text-dark-text">
                    {selectedAmritHeader.gurmukhi}
                  </p>
                  {selectedAmritHeader.transliteration && (
                    <p className="mt-2 font-sans text-sm italic text-ink/50 dark:text-dark-text/50">
                      {selectedAmritHeader.transliteration}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <MetadataChip>{selectedAmritShabads.length} shabads</MetadataChip>
                    {normalizedAmritChapterQuery ? (
                      <MetadataChip>{filteredAmritShabads.length} matching</MetadataChip>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedAmritShabads[0]) {
                          openAmritShabad(selectedAmritShabads[0].shabadId)
                        }
                      }}
                      disabled={selectedAmritShabads.length === 0}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-gradient-to-r from-saffron to-saffron-light px-4 py-2 font-sans text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Start from first shabad
                      <IconArrowRight size={14} />
                    </button>
                  </div>
                </div>

                {loadingAmritHeader === selectedAmritHeader.headerId && selectedAmritShabads.length === 0 ? (
                  <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 px-2 py-3">Loading shabads…</p>
                ) : (
                  <div className="space-y-3">
                    <div className="section-shell-quiet rounded-[24px] px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="eyebrow">Chapter search</p>
                          <p className="font-sans text-sm text-ink/60 dark:text-dark-text/60 mt-1">
                            Search by line opening, transliteration, raag, source, or ang.
                          </p>
                        </div>
                        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/40 dark:text-dark-text/40">
                          Showing {visibleAmritShabads.length} of {filteredAmritShabads.length}
                        </p>
                      </div>
                      <div className="relative mt-3">
                        <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30 dark:text-dark-text/30" />
                        <input
                          id="banis-chapter-search"
                          name="banis-chapter-search"
                          type="search"
                          autoCapitalize="none"
                          autoCorrect="off"
                          autoComplete="off"
                          spellCheck={false}
                          enterKeyHint="search"
                          inputMode="search"
                          value={amritChapterQuery}
                          onChange={event => {
                            setAmritChapterQuery(event.target.value)
                            setVisibleAmritCount(AMRIT_KEERTAN_PAGE_SIZE)
                          }}
                          placeholder="Search within this chapter..."
                          className="w-full rounded-2xl border border-sand/15 bg-parchment-card pl-9 pr-4 py-3 font-sans text-sm text-ink outline-none transition-colors duration-300 focus:border-saffron/40 dark:border-dark-text/10 dark:bg-dark-card dark:text-dark-text"
                        />
                      </div>
                    </div>

                    {visibleAmritShabads.length === 0 ? (
                      <div className="section-shell-quiet rounded-[24px] px-4 py-5">
                        <p className="font-sans text-sm text-ink/60 dark:text-dark-text/60">
                          No shabads match this chapter search yet.
                        </p>
                      </div>
                    ) : null}

                    {visibleAmritShabads.map((shabad, index) => (
                      <button
                        key={`${selectedAmritHeader.headerId}-${shabad.shabadId}-${index}`}
                        onClick={() => openAmritShabad(shabad.shabadId)}
                        className="w-full text-left rounded-[24px] bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 px-4 py-4 transition-colors duration-300 active:scale-[0.99] transition-transform duration-150"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p lang="pa-Guru" className="font-gurmukhi text-lg leading-relaxed text-ink dark:text-dark-text">
                              {shabad.gurmukhi}
                            </p>
                            {shabad.transliteration && shabad.transliteration.length <= 80 && (
                              <p className="mt-2 font-sans text-sm italic text-ink/45 dark:text-dark-text/45">
                                {shabad.transliteration}
                              </p>
                            )}
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {shabad.source ? <MetadataChip>{shabad.source}</MetadataChip> : null}
                              {shabad.raag ? <MetadataChip>{shabad.raag}</MetadataChip> : null}
                              {shabad.pageNo ? <MetadataChip>{`Ang ${shabad.pageNo}`}</MetadataChip> : null}
                            </div>
                          </div>
                          <span className="font-sans text-xs text-ink/30 dark:text-dark-text/30">
                            {index + 1}
                          </span>
                        </div>
                      </button>
                    ))}

                    {hasMoreAmritShabads ? (
                      <button
                        type="button"
                        onClick={() => setVisibleAmritCount(count => count + AMRIT_KEERTAN_PAGE_SIZE)}
                        className="w-full rounded-2xl border border-sand/15 bg-parchment-low px-4 py-3 font-sans text-sm font-medium text-ink transition-colors duration-300 active:scale-[0.99] dark:border-dark-text/10 dark:bg-dark-surface dark:text-dark-text"
                      >
                        Show {Math.min(AMRIT_KEERTAN_PAGE_SIZE, filteredAmritShabads.length - visibleAmritShabads.length)} more shabads
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {amritHeaders.map(header => (
                  <button
                    key={header.headerId}
                    onClick={() => void openAmritHeader(header)}
                    className="w-full text-left rounded-[24px] bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 px-4 py-4 transition-colors duration-300 active:scale-[0.99] transition-transform duration-150"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p lang="pa-Guru" className="font-gurmukhi text-base leading-relaxed text-ink dark:text-dark-text">
                          {header.gurmukhi}
                        </p>
                        {header.transliteration && (
                          <p className="mt-1 font-sans text-xs italic text-ink/40 dark:text-dark-text/40">
                            {header.transliteration}
                          </p>
                        )}
                      </div>
                      <span className="mt-1 font-sans text-xs text-gold dark:text-gold-light">
                        Open
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
