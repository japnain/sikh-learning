import '../styles/catalog.css'
import '../styles/reader.css'
import '../styles/read-discovery.css'
import { lazy, Suspense, useState, useCallback, useRef, useEffect, useMemo, type ImgHTMLAttributes, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useNavigationType, useSearchParams } from 'react-router-dom'
import {
  fetchSearchPage,
  fetchBanisIndex,
  type SearchResult,
  type BaniIndexItem,
} from '../api/banidb'
import {
  DG_CATEGORY_ORDER,
  READ_BANIDB_CATALOG_COUNT,
  SGGS_CATEGORY_ORDER,
} from '../data/banis'
import useAppSearchMatches from '../hooks/useAppSearchMatches'
import { subscribeLibraryDiscoveryCatalog } from '../data/libraryRepository'
import { subscribeStoryCatalog } from '../data/storyRepository'
import { resolveAsyncIssue } from '../qa/async'
import { useRecentSearchStore } from '../store/recentSearch'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { buildNitnemStudyPath, NITNEM_ROUTE_OPTIONS } from '../store/nitnem'
import type { AsyncIssueCode, SearchMode, UiLocale } from '../types'
import { buildCanonicalBaniStudyPath } from '../utils/baniRouteResolver'
import { getSourceReaderUnit, SOURCE_READER_META } from '../utils/sourceReaderMeta'
import { getSearchModeLabels } from '../utils/translations'
import { IconArrowRight, IconChevronUp, IconChevronDown, IconLibrary, IconBookmark, IconBookmarkFilled, IconMusic } from '../components/icons'
import SearchHighlight from '../components/SearchHighlight'
import ScriptureSourceBrowser from '../components/ScriptureSourceBrowser'
import LibraryBookBrowser from '../components/LibraryBookBrowser'
import AppSearchResultGroup from '../components/read/AppSearchResultGroup'
import ReadSearchControls from '../components/read/ReadSearchControls'
import ReadBaniRow from '../components/read/ReadBaniRow'
import { getBaniDiscovery, getBrowseBaniDiscovery } from '../content/baniDiscovery'
import { BANI_SCRIPT_NAMES } from '../content/baniScriptNames'
import { buildReadBaniCatalog, type ReadBaniCatalogItem } from '../utils/readBaniCatalog'
import {
  getAngTargets,
  getAppSearchMatches,
  getAvailableSearchMeta,
  getLibrarySearchMatches,
  getStorySearchMatches,
  groupSearchResults,
  SEARCH_SOURCE_LABELS,
  type AppSearchMatch,
  type GroupedSearchResult,
  type SearchSource,
} from '../utils/appSearch'
import { buildReadSearchPath } from '../utils/searchRoutes'
import { rememberDiscoveryReturn, restoreDiscoveryReturn } from '../utils/discoveryReturn'
import ReadContinue from '../components/ReadContinue'
import { READ_SEARCH_UI, SEARCH_SCOPES, type SearchScope } from '../content/readSearchCopy'
import { withSearchDeadline } from '../utils/searchDeadline'
import { getGurbaniSearchSession, rememberGurbaniSearchSession } from '../utils/gurbaniSearchSession'
import { SEARCH_RESULTS_COPY } from '../content/searchResultsCopy'
import { SEARCH_INTENT_COPY } from '../content/searchIntentCopy'
import { SEARCH_MODE_META, SEARCH_QUERY_MAX_LENGTH, isDirectSearch, getSearchMinimumLength, normalizeGurbaniSearchQuery, mergeGurbaniSearchResults, getSearchMatchKind } from '../utils/gurbaniSearch'
import { buildGurbaniSearchPlan } from '../utils/gurbaniSearchPlan'
import { runGurbaniSearch, continueGurbaniSearch, type GurbaniSearchSnapshot, type GurbaniSearchEngineOptions } from '../utils/gurbaniSearchEngine'
import {
  buildCurrentAppPath,
  buildReaderOriginNavigationState,
  buildLibraryReaderNavigationState,
} from '../utils/libraryReaderNavigation'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import {
  addAppScrollListener,
  getAppScrollTop,
  getAppViewportBounds,
  scrollAppTo,
} from '../utils/appScroll'
import { getSearchRevealScrollTop } from '../utils/searchReveal'
import { READ_PAGE_COPY, READ_COLLECTIONS, type ReadCollection, type ReadPageCopy } from '../content/readPageCopy'
import readHarmandirSrc from '../assets/living-library/read-harmandir.jpeg'
import banisGuruNanakSrc from '../assets/living-library/banis-guru-nanak.jpeg'
import booksCourtSrc from '../assets/living-library/books-court.jpeg'

type Scripture = 'SGGS' | 'DG'
const StoryBrowser = lazy(() => import('../components/StoryBrowser'))

const READ_SOURCE_SECTION_IDS = ['sggs', 'dasam-granth', 'bhai-gurdas-vaaran']


const SCRIPTURE_META: Record<Scripture, { label: string; icon: ReactNode; categoryOrder: readonly string[] }> = {
  SGGS: { label: SOURCE_READER_META.G.name, icon: <IconLibrary size={18} />, categoryOrder: SGGS_CATEGORY_ORDER },
  DG: { label: SOURCE_READER_META.D.name, icon: <IconLibrary size={18} />, categoryOrder: DG_CATEGORY_ORDER },
}

const SEARCH_RESULTS_PAGE_SIZE = 12
function getSearchVisibleCount(value: string | null) {
  const count = Number(value)
  return Number.isSafeInteger(count) && count >= SEARCH_RESULTS_PAGE_SIZE ? count : SEARCH_RESULTS_PAGE_SIZE
}
const GURMUKHI_SEARCH_PATTERN = /[\u0A00-\u0A7F]/
const LATIN_SEARCH_PATTERN = /[A-Za-z]/

function getUniqueAppSearchMatches(
  matches: AppSearchMatch[],
  excludedMatches: AppSearchMatch[] = []
) {
  const seenKeys = new Set(excludedMatches.map(match => match.key))
  const seenPaths = new Set(excludedMatches.map(match => match.path))

  return [...matches]
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
    .filter(match => {
      if (seenKeys.has(match.key) || seenPaths.has(match.path)) return false
      seenKeys.add(match.key)
      seenPaths.add(match.path)
      return true
    })
}

function isSearchModeParam(value: string | null): value is SearchMode {
  return value !== null && Object.prototype.hasOwnProperty.call(SEARCH_MODE_META, value)
}

function isSearchSourceParam(value: string | null): value is SearchSource {
  return value !== null && Object.prototype.hasOwnProperty.call(SEARCH_SOURCE_LABELS, value)
}

function isReadCollectionParam(value: string | null): value is ReadCollection {
  return value !== null && READ_COLLECTIONS.includes(value as ReadCollection)
}

const BHAI_GURDAS_VAARS = Array.from(
  { length: SOURCE_READER_META.B.max },
  (_, index) => index + 1
)

function DirectoryCount({
  count,
  testId,
  issue = false,
  copy,
}: {
  count: number | null
  testId: string
  issue?: boolean
  copy: ReadPageCopy
}) {
  const label = count === null
    ? (issue ? copy.countUnavailable : copy.countLoading)
    : `${count} ${count === 1 ? copy.baniSingular : copy.baniPlural}`

  return (
    <span
      className="min-w-[4.25rem] text-right font-sans text-[11px] tabular-nums text-ink/75 dark:text-dark-text/76"
      data-testid={testId}
    >
      {label}
    </span>
  )
}

function MetadataChip({
  children,
  onClick,
}: {
  children: ReactNode
  onClick?: () => void
}) {
  const className = 'read-metadata font-sans'

  if (!onClick) {
    return <span className={className}>{children}</span>
  }

  return (
    <button type="button" onClick={onClick} className={`${className} read-metadata--action`}>
      {children}
    </button>
  )
}

function getSearchIssueCopy(issue: AsyncIssueCode, locale: UiLocale) {
  switch (issue) {
    case 'offline':
      return locale === 'pa'
        ? 'ਖੋਜ ਇਸ ਵੇਲੇ ਆਫ਼ਲਾਈਨ ਹੈ। ਕੋਈ ਬਾਣੀ ਸਿੱਧੀ ਖੋਲ੍ਹੋ ਜਾਂ ਕਨੈਕਸ਼ਨ ਵਾਪਸ ਆਉਣ ਤੇ ਫਿਰ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'
        : locale === 'hi'
          ? 'खोज अभी ऑफ़लाइन है। कोई बाणी सीधे खोलें या कनेक्शन लौटने पर फिर कोशिश करें।'
          : 'Read search is offline right now. Browse a bani directly or try again when the connection returns.'
    case 'missing':
      return locale === 'pa'
        ? 'ਉਹ ਸਰੋਤ ਨਹੀਂ ਮਿਲਿਆ। ਖੋਜ ਢੰਗ ਬਦਲੋ, ਕੋਈ ਬਾਣੀ ਸਿੱਧੀ ਖੋਲ੍ਹੋ ਜਾਂ ਹੋਰ ਲਿਖਤ ਅਜ਼ਮਾਓ।'
        : locale === 'hi'
          ? 'वह स्रोत नहीं मिला। खोज का तरीका बदलें, कोई बाणी सीधे खोलें या दूसरी खोज आज़माएँ।'
          : 'That Read source could not be found. Switch modes, browse a bani directly, or try another query.'
    case 'qa-fault':
      return locale === 'pa'
        ? 'ਖੋਜ ਟੈਸਟ ਵਾਲੀ ਘੱਟ ਉਪਲਬਧ ਹਾਲਤ ਦਿਖਾ ਰਹੀ ਹੈ। ਕੋਈ ਬਾਣੀ ਸਿੱਧੀ ਖੋਲ੍ਹੋ ਜਾਂ ਫਿਰ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'
        : locale === 'hi'
          ? 'खोज परीक्षण वाली सीमित स्थिति दिखा रही है। कोई बाणी सीधे खोलें या फिर कोशिश करें।'
          : 'Read search is showing the test degraded state. Browse a bani directly or try again.'
    case 'unavailable':
    default:
      return locale === 'pa'
        ? 'ਖੋਜ ਇਸ ਵੇਲੇ ਉਪਲਬਧ ਨਹੀਂ ਹੈ। ਕੋਈ ਬਾਣੀ ਸਿੱਧੀ ਖੋਲ੍ਹੋ, ਖੋਜ ਢੰਗ ਬਦਲੋ ਜਾਂ ਥੋੜ੍ਹੀ ਦੇਰ ਬਾਅਦ ਫਿਰ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'
        : locale === 'hi'
          ? 'खोज अभी उपलब्ध नहीं है। कोई बाणी सीधे खोलें, खोज का तरीका बदलें या थोड़ी देर बाद फिर कोशिश करें।'
          : 'Read search is unavailable right now. Browse a bani directly, switch modes, or try again shortly.'
  }
}

function ReadArtwork({
  description,
  fallbackLabel,
  className,
  ...imageProps
}: Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt'> & {
  description: string
  fallbackLabel: string
}) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        role="img"
        aria-label={description}
        className={`read-artwork-fallback ${className ?? ''}`.trim()}
        data-testid="read-artwork-fallback"
      >
        <span>{fallbackLabel}</span>
        <p>{description}</p>
      </div>
    )
  }

  return (
    <img
      {...imageProps}
      className={className}
      alt={description}
      onError={() => setFailed(true)}
    />
  )
}


export default function Banis() {
  const scriptMode = useLanguageStore(state => state.scriptMode)
  const showTransliteration = useLanguageStore(state => state.showTransliteration)
  const meaningLanguage = useLanguageStore(state => state.meaningLanguage)
  const locale = useLocaleStore(state => state.locale)
  const location = useLocation()
  const navigationType = useNavigationType()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialModeParam = searchParams.get('mode')
  const initialSourceParam = searchParams.get('source')
  const collectionParam = searchParams.get('collection')
  const activeCollection: ReadCollection = isReadCollectionParam(collectionParam) ? collectionParam : 'banis'
  const copy = READ_PAGE_COPY[locale]
  const searchModeLabels = getSearchModeLabels(locale)
  const expanded = useMemo<Record<string, boolean>>(() => Object.fromEntries(
    (searchParams.get('open') ?? '').split(',').filter(key => key.length > 0 && key.length <= 200).map(key => [key, true])
  ), [searchParams])
  const searchScope = (SEARCH_SCOPES.includes(searchParams.get('scope') as SearchScope) ? searchParams.get('scope') : 'all') as SearchScope
  const searchUi = READ_SEARCH_UI[locale]
  const resultCopy = SEARCH_RESULTS_COPY[locale]
  const previousQuery = searchParams.get('previousQuery') ?? ''
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('query') ?? (activeCollection === 'stories' ? searchParams.get('storyQuery') : null) ?? '')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [librarySearchResults, setLibrarySearchResults] = useState<AppSearchMatch[]>([])
  const [storySearchResults, setStorySearchResults] = useState<AppSearchMatch[]>([])
  const [searching, setSearching] = useState(false)
  const [nextSearchPages, setNextSearchPages] = useState<Record<string, number>>({})
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreIssue, setLoadMoreIssue] = useState(false)
  const remoteSearchRef = useRef<GurbaniSearchSnapshot>({ requests: [], failures: 0 })
  const localSearchFailuresRef = useRef<Partial<Record<'books' | 'stories', AsyncIssueCode>>>({})
  const localSearchCountsRef = useRef({ books: 0, stories: 0 })
  const loadMoreLockRef = useRef(false)
  const [searchIssue, setSearchIssue] = useState<AsyncIssueCode | null>(null)
  const [searchPartialIssue, setSearchPartialIssue] = useState<AsyncIssueCode | null>(null)
  const [searchMode, setSearchMode] = useState<SearchMode>(() => (
    isSearchModeParam(initialModeParam) ? initialModeParam : 'auto-detect'
  ))
  const [searchSource, setSearchSource] = useState<SearchSource>(() => (
    isSearchSourceParam(initialSourceParam) ? initialSourceParam : 'all'
  ))
  const [raagFilter, setRaagFilter] = useState<string>(() => searchParams.get('raag') ?? 'all')
  const [writerFilter, setWriterFilter] = useState<string>(() => searchParams.get('writer') ?? 'all')
  const [visibleSearchResultCount, setVisibleSearchResultCount] = useState(() => getSearchVisibleCount(searchParams.get('matches')))
  const [sundarGutkaBanis, setSundarGutkaBanis] = useState<BaniIndexItem[]>([])
  const toggle = (key: string) => setSearchParams(current => {
    const next = new URLSearchParams(current)
    const keys = new Set((next.get('open') ?? '').split(',').filter(Boolean))
    if (keys.has(key)) keys.delete(key)
    else keys.add(key)
    if (keys.size) next.set('open', [...keys].join(','))
    else next.delete('open')
    return next
  }, { replace: true })
  const searchOptionsOpen = expanded['search-options'] ?? false

  const { recent, addRecent, togglePinned, clearRecent } = useRecentSearchStore()
  const [recentExpanded, setRecentExpanded] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSearchRunRef = useRef<(() => void) | null>(null)
  const searchSequenceRef = useRef(0)
  const metadataRevisionRef = useRef({ books: 0, stories: 0 })
  const searchAbortRef = useRef<AbortController | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const searchCardRef = useRef<HTMLDivElement | null>(null)
  const searchLocationHydrationRef = useRef(false)
  const pendingSearchUrlWritesRef = useRef(new Set<string>())
  const pendingSearchScopeRef = useRef<SearchScope | null>(null)
  const revealGenerationRef = useRef(0)
  const pendingRevealRef = useRef<number | null>(null)
  const searchStateRef = useRef({
    query: searchQuery,
    mode: searchMode,
    source: searchSource,
    scope: searchScope,
  })
  searchStateRef.current = {
    query: searchQuery,
    mode: searchMode,
    source: searchSource,
    scope: searchScope,
  }

  const requestSearchReveal = useCallback(() => {
    pendingRevealRef.current = ++revealGenerationRef.current
  }, [])

  useEffect(() => {
    const refreshMetadata = (scope: 'books' | 'stories') => {
      const current = searchStateRef.current
      const includesMetadata = current.source === 'all' && ['auto-detect', 'english', 'transliteration'].includes(current.mode)
      if (current.query.trim().length < 2 || (current.scope === 'all' && isDirectSearch(current.query.trim(), current.mode))
        || (current.scope !== scope && !(current.scope === 'all' && includesMetadata))) return
      const sequence = searchSequenceRef.current
      const revision = ++metadataRevisionRef.current[scope]
      const search = scope === 'books' ? getLibrarySearchMatches : getStorySearchMatches
      void search(current.query.trim()).then(results => {
        if (sequence !== searchSequenceRef.current || revision !== metadataRevisionRef.current[scope]) return
        localSearchCountsRef.current[scope] = results.length
        delete localSearchFailuresRef.current[scope]
        if (scope === 'books') setLibrarySearchResults(results)
        else setStorySearchResults(results)
        const remoteFailure = remoteSearchRef.current.requests.find(state => state.error && state.failedPage === 1)
        const issue = Object.values(localSearchFailuresRef.current)[0] ?? (remoteFailure ? remoteFailure.issue ?? 'unavailable' : null)
        setSearchIssue(null)
        setSearchPartialIssue(issue)
      }).catch(() => { /* Keep usable results if a background catalog refresh fails. */ })
    }
    const unsubscribeBooks = subscribeLibraryDiscoveryCatalog(() => refreshMetadata('books'))
    const unsubscribeStories = subscribeStoryCatalog(() => refreshMetadata('stories'))
    return () => { unsubscribeBooks(); unsubscribeStories() }
  }, [])

  useEffect(() => {
    const cancelReveal = () => {
      revealGenerationRef.current += 1
      pendingRevealRef.current = null
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (['Tab', 'Escape', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'].includes(event.key)) cancelReveal()
    }
    window.addEventListener('wheel', cancelReveal, { passive: true })
    window.addEventListener('touchmove', cancelReveal, { passive: true })
    window.addEventListener('pointerdown', cancelReveal, true)
    const removeScrollListener = addAppScrollListener(cancelReveal)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      cancelReveal()
      window.removeEventListener('wheel', cancelReveal)
      window.removeEventListener('touchmove', cancelReveal)
      window.removeEventListener('pointerdown', cancelReveal, true)
      removeScrollListener()
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const revealSearchFeedback = useCallback(() => {
    const generation = pendingRevealRef.current
    if (typeof window === 'undefined' || generation === null) return
    // Claim this explicit search intent before scheduling. Later providers must
    // never reclaim the user's position while progressively filling results.
    pendingRevealRef.current = null

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (generation !== revealGenerationRef.current) return
        const input = searchInputRef.current
        const card = searchCardRef.current
        const feedback = card?.querySelector<HTMLElement>('[data-search-result-anchor="true"]')
          ?? card?.querySelector<HTMLElement>('[data-search-feedback-anchor="true"]')
        if (!input || !feedback) return

        const navHeight = Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--nav-stack-height')
        ) || 0
        const inputRect = input.getBoundingClientRect()
        const feedbackRect = feedback.getBoundingClientRect()
        const viewportBounds = getAppViewportBounds()
        const visibleTop = viewportBounds.top + 18
        const visibleBottom = viewportBounds.bottom - navHeight - 26
        const currentScrollTop = getAppScrollTop()
        const nextScrollTop = getSearchRevealScrollTop({
          currentScrollTop,
          inputTop: inputRect.top,
          feedbackTop: feedbackRect.top,
          feedbackBottom: feedbackRect.bottom,
          visibleTop,
          visibleBottom,
        })

        if (Math.abs(nextScrollTop - currentScrollTop) > 1) {
          scrollAppTo({
            top: Math.max(nextScrollTop, 0),
            behavior: 'auto',
          })
        }
      })
    })
  }, [])

  useEffect(() => {
    if (activeCollection !== 'banis') return
    let cancelled = false

    fetchBanisIndex()
      .then(data => {
        if (!cancelled) {
          setSundarGutkaBanis(data)
        }
      })
      .catch(() => { /* Bundled script names keep the complete catalog usable offline. */ })

    return () => {
      cancelled = true
    }
  }, [activeCollection])

  useEffect(() => {
    return () => {
      searchSequenceRef.current += 1
      if (debounceRef.current) clearTimeout(debounceRef.current)
      pendingSearchRunRef.current = null
      searchAbortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if ((params.get('scope') ?? 'all') === pendingSearchScopeRef.current) pendingSearchScopeRef.current = null
    // Router transitions can commit an earlier internal URL after the next
    // keystroke. State already contains that keystroke: do not hydrate the
    // older query back over it. Real links and Back/Forward still hydrate.
    if (navigationType === 'REPLACE' && pendingSearchUrlWritesRef.current.has(location.search)) {
      // Discard superseded writes too; they may have been coalesced by React.
      for (const pending of pendingSearchUrlWritesRef.current) {
        pendingSearchUrlWritesRef.current.delete(pending)
        if (pending === location.search) break
      }
      searchLocationHydrationRef.current = false
      return
    }
    pendingSearchUrlWritesRef.current.clear()
    const legacyStoryQuery = params.get('collection') === 'stories' && !params.has('query') ? params.get('storyQuery') : null
    const nextQuery = params.get('query') ?? legacyStoryQuery ?? ''
    const nextModeParam = params.get('mode')
    const nextSourceParam = params.get('source')
    const nextMode: SearchMode = isSearchModeParam(nextModeParam) ? nextModeParam : 'auto-detect'
    const nextSource: SearchSource = isSearchSourceParam(nextSourceParam) ? nextSourceParam : 'all'
    const currentSearch = searchStateRef.current
    const searchChanged = currentSearch.query !== nextQuery
      || currentSearch.mode !== nextMode
      || currentSearch.source !== nextSource

    searchLocationHydrationRef.current = true
    if (searchChanged) {
      searchSequenceRef.current += 1
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = null
      pendingSearchRunRef.current = null
      searchAbortRef.current?.abort()
      searchAbortRef.current = null
      setSearchResults([])
      setLibrarySearchResults([])
      setStorySearchResults([])
      setSearching(false)
      setSearchIssue(null)
      setSearchPartialIssue(null)
    }

    setSearchQuery(current => current === nextQuery ? current : nextQuery)
    setSearchMode(current => current === nextMode ? current : nextMode)
    setSearchSource(current => current === nextSource ? current : nextSource)
    setRaagFilter(params.get('raag') ?? 'all')
    setWriterFilter(params.get('writer') ?? 'all')
    setVisibleSearchResultCount(getSearchVisibleCount(params.get('matches')))
    if (legacyStoryQuery) {
      params.set('query', legacyStoryQuery)
      params.set('scope', 'stories')
      params.delete('storyQuery')
      setSearchParams(params, { replace: true })
    }
  }, [location.search, navigationType, setSearchParams])

  useEffect(() => {
    if (searchLocationHydrationRef.current) {
      searchLocationHydrationRef.current = false
      return
    }

    const searchPath = buildReadSearchPath({
      query: searchQuery,
      mode: searchMode,
      source: searchSource,
    })
    const searchFields = new URLSearchParams(searchPath.split('?')[1] ?? '')
    const nextSearchParams = new URLSearchParams(location.search)
    // Typing can render before the Router commits a scope-change transition.
    // Preserve that explicit selection when the urgent input update saves its URL.
    if (pendingSearchScopeRef.current !== null) {
      if (pendingSearchScopeRef.current === 'all') nextSearchParams.delete('scope')
      else nextSearchParams.set('scope', pendingSearchScopeRef.current)
    }
    for (const key of ['query', 'mode', 'source']) {
      const value = searchFields.get(key)
      if (value) nextSearchParams.set(key, value)
      else nextSearchParams.delete(key)
    }
    for (const [key, value] of [['raag', raagFilter], ['writer', writerFilter]]) {
      if (value !== 'all') nextSearchParams.set(key, value)
      else nextSearchParams.delete(key)
    }
    if (visibleSearchResultCount > SEARCH_RESULTS_PAGE_SIZE) nextSearchParams.set('matches', String(visibleSearchResultCount))
    else nextSearchParams.delete('matches')

    const nextSearch = nextSearchParams.toString()
    const nextPath = `${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`
    const currentPath = `${location.pathname}${location.search}`

    if (nextPath === currentPath) return

    pendingSearchUrlWritesRef.current.add(nextSearch ? `?${nextSearch}` : '')
    while (pendingSearchUrlWritesRef.current.size > 8) {
      pendingSearchUrlWritesRef.current.delete(pendingSearchUrlWritesRef.current.values().next().value!)
    }
    setSearchParams(new URLSearchParams(nextSearch), { replace: true })
  }, [activeCollection, location.pathname, location.search, searchMode, searchQuery, searchSource, raagFilter, writerFilter, visibleSearchResultCount, setSearchParams])

  const selectCollection = useCallback((collection: ReadCollection) => {
    revealGenerationRef.current += 1
    pendingRevealRef.current = null
    searchSequenceRef.current += 1
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = null
    pendingSearchRunRef.current = null
    searchAbortRef.current?.abort()
    searchAbortRef.current = null
    setSearching(false)
    setNextSearchPages({})
    setLoadingMore(false)
    setLoadMoreIssue(false)
    setSearchResults([])
    setLibrarySearchResults([])
    setStorySearchResults([])
    setSearchIssue(null)
    setSearchPartialIssue(null)
    const nextSearchParams = new URLSearchParams(location.search)
    if (searchQuery.trim()) nextSearchParams.set('previousQuery', searchQuery.trim())
    nextSearchParams.delete('query')
    nextSearchParams.delete('storyQuery')
    if (collection === 'banis') {
      nextSearchParams.delete('collection')
    } else {
      nextSearchParams.set('collection', collection)
    }
    setSearchParams(nextSearchParams, { replace: false })
  }, [location.search, searchQuery, setSearchParams])

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
    const requestSequence = ++searchSequenceRef.current
    searchAbortRef.current?.abort()
    searchAbortRef.current = null
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = null
    pendingSearchRunRef.current = null
    const trimmed = normalizeGurbaniSearchQuery(query, mode)
    remoteSearchRef.current = { requests: [], failures: 0 }
    localSearchFailuresRef.current = {}
    localSearchCountsRef.current = { books: 0, stories: 0 }
    loadMoreLockRef.current = false
    setNextSearchPages({})
    setLoadingMore(false)
    setLoadMoreIssue(false)
    const directLookup = (searchScope === 'all' || searchScope === 'gurbani') && isDirectSearch(trimmed, mode)
    if (trimmed.length < getSearchMinimumLength(trimmed, mode) || trimmed.length > SEARCH_QUERY_MAX_LENGTH) {
      revealGenerationRef.current += 1
      pendingRevealRef.current = null
      setSearchResults([])
      setLibrarySearchResults([])
      setStorySearchResults([])
      setSearching(false)
      setSearchIssue(null)
      setSearchPartialIssue(null)
      return
    }
    if (directLookup) {
      setSearchResults([])
      setLibrarySearchResults([])
      setStorySearchResults([])
      setSearching(false)
      setSearchIssue(null)
      setSearchPartialIssue(null)
      revealSearchFeedback()
      return
    }
    setSearchResults([])
    setLibrarySearchResults([])
    setStorySearchResults([])
    setSearching(true)
    setSearchIssue(null)
    setSearchPartialIssue(null)
    const runSearch = async () => {
      debounceRef.current = null
      pendingSearchRunRef.current = null
      const controller = new AbortController()
      searchAbortRef.current = controller
      const isCurrent = () => searchSequenceRef.current === requestSequence && !controller.signal.aborted
      // Keep raw quotes in the key: exact-word searches must not restore expanded results.
      const cacheKey = JSON.stringify([query.trim(), mode, source])
      const includeRemote = searchScope === 'all' || searchScope === 'gurbani'
      const cached = includeRemote ? getGurbaniSearchSession(cacheKey) : null
      let remoteSuccesses = cached?.requests.filter(state => state.completed).length ?? 0
      const localResultCount = includeRemote ? getAppSearchMatches(trimmed, source).length : 0
      let firstFailure: AsyncIssueCode | null = cached?.requests.find(state => state.error)?.issue ?? (cached?.failures ? 'unavailable' : null)
      const publish = (snapshot: GurbaniSearchSnapshot) => {
        if (!isCurrent()) return
        remoteSearchRef.current = snapshot
        rememberGurbaniSearchSession(cacheKey, snapshot)
        setNextSearchPages(Object.fromEntries(snapshot.requests.filter(state => state.nextPage !== null).map(state => [state.request.id, state.nextPage!])))
        setSearchResults(mergeGurbaniSearchResults(snapshot.requests.map(state => ({ searchType: state.request.searchType, results: state.results, request: state.request })), query, mode))
        const initialFailure = snapshot.requests.find(state => state.error && state.failedPage === 1)
        if (initialFailure) setSearchPartialIssue(initialFailure.issue ?? 'unavailable')
        setLoadMoreIssue(snapshot.requests.some(state => state.error && (state.failedPage ?? 0) > 1))
        revealSearchFeedback()
      }
      if (cached) publish(cached)
      const failed = (error: unknown, scope?: 'books' | 'stories') => {
        if (!isCurrent()) return
        const issue = resolveAsyncIssue(error).code
        if (scope) localSearchFailuresRef.current[scope] = issue
        firstFailure ??= issue
        setSearchPartialIssue(firstFailure)
      }
      const tasks: Promise<unknown>[] = []
      const engineOptions: GurbaniSearchEngineOptions = {
        query, mode, source, signal: controller.signal,
        fetchPage: (request, page, signal) => fetchSearchPage(request.query, request.searchType, source, 'read-search', signal, page),
        onChange: publish,
      }
      if (includeRemote && (!cached || cached.requests.some(state => !state.completed && !state.error))) tasks.push((cached
        ? continueGurbaniSearch(cached, { ...engineOptions, action: 'resume' })
        : runGurbaniSearch({ ...engineOptions, requests: buildGurbaniSearchPlan(query, mode, source).requests })
      ).then(snapshot => {
        if (!isCurrent()) return
        remoteSuccesses = snapshot.requests.filter(state => state.completed).length
        if (snapshot.failures) firstFailure ??= snapshot.requests.find(state => state.error)?.issue ?? 'unavailable'
      }).catch(error => { if (isCurrent()) failed(error) }))
      const includeMetadata = (source === 'all' && (mode === 'auto-detect' || mode === 'english' || mode === 'transliteration'))
      if (searchScope === 'books' || (searchScope === 'all' && includeMetadata)) {
        const revision = metadataRevisionRef.current.books
        tasks.push(withSearchDeadline(() => getLibrarySearchMatches(trimmed), controller.signal)
          .then(results => { if (isCurrent() && revision === metadataRevisionRef.current.books) { localSearchCountsRef.current.books = results.length; setLibrarySearchResults(results); revealSearchFeedback() } }).catch(error => { if (revision === metadataRevisionRef.current.books) failed(error, 'books') }))
      }
      if (searchScope === 'stories' || (searchScope === 'all' && includeMetadata)) {
        const revision = metadataRevisionRef.current.stories
        tasks.push(withSearchDeadline(() => getStorySearchMatches(trimmed), controller.signal)
          .then(results => { if (isCurrent() && revision === metadataRevisionRef.current.stories) { localSearchCountsRef.current.stories = results.length; setStorySearchResults(results); revealSearchFeedback() } }).catch(error => { if (revision === metadataRevisionRef.current.stories) failed(error, 'stories') }))
      }
      await Promise.all(tasks)
      if (searchAbortRef.current === controller) searchAbortRef.current = null
      if (!isCurrent()) return
      const initialRemoteFailure = remoteSearchRef.current.requests.find(state => state.error && state.failedPage === 1)
      const finalFailure = Object.values(localSearchFailuresRef.current)[0] ?? (initialRemoteFailure ? initialRemoteFailure.issue ?? 'unavailable' : null)
      const noResults = remoteSuccesses === 0 && localResultCount + localSearchCountsRef.current.books + localSearchCountsRef.current.stories === 0
      setSearchIssue(noResults ? finalFailure : null)
      setSearchPartialIssue(noResults ? null : finalFailure)
      if (includeRemote) rememberGurbaniSearchSession(cacheKey, remoteSearchRef.current)
      setSearching(false)
      revealSearchFeedback()
    }
    pendingSearchRunRef.current = runSearch
    debounceRef.current = setTimeout(runSearch, 300)
  }, [revealSearchFeedback, searchMode, searchSource, searchScope])

  const continueSearch = async (action: 'more' | 'retry') => {
    if (loadMoreLockRef.current || searching) return
    loadMoreLockRef.current = true
    setLoadingMore(true)
    setLoadMoreIssue(false)
    const sequence = searchSequenceRef.current
    const controller = new AbortController()
    searchAbortRef.current = controller
    const isCurrent = () => sequence === searchSequenceRef.current && !controller.signal.aborted
    let retriedLocalMatches = 0
    const localRetries = action === 'retry' ? (Object.keys(localSearchFailuresRef.current) as Array<'books' | 'stories'>).map(async scope => {
      const revision = metadataRevisionRef.current[scope]
      try {
        const results = await withSearchDeadline(() => scope === 'books'
          ? getLibrarySearchMatches(normalizeGurbaniSearchQuery(searchQuery, searchMode))
          : getStorySearchMatches(normalizeGurbaniSearchQuery(searchQuery, searchMode)), controller.signal)
        if (!isCurrent() || revision !== metadataRevisionRef.current[scope]) return
        localSearchCountsRef.current[scope] = results.length
        delete localSearchFailuresRef.current[scope]
        retriedLocalMatches += results.length
        if (revision === metadataRevisionRef.current[scope]) {
          if (scope === 'books') setLibrarySearchResults(results)
          else setStorySearchResults(results)
        }
      } catch (error) {
        if (isCurrent() && revision === metadataRevisionRef.current[scope]) localSearchFailuresRef.current[scope] = resolveAsyncIssue(error).code
      }
    }) : []
    try {
      const [snapshot] = await Promise.all([continueGurbaniSearch(remoteSearchRef.current, {
        action, query: searchQuery, mode: searchMode, source: searchSource, signal: controller.signal,
        fetchPage: (request, page, signal) => fetchSearchPage(request.query, request.searchType, searchSource, 'read-search', signal, page),
        onChange: current => {
          if (!isCurrent()) return
          remoteSearchRef.current = current
          if (searchScope === 'all' || searchScope === 'gurbani') rememberGurbaniSearchSession(JSON.stringify([searchQuery.trim(), searchMode, searchSource]), current)
          setNextSearchPages(Object.fromEntries(current.requests.filter(state => state.nextPage !== null).map(state => [state.request.id, state.nextPage!])))
          const merged = mergeGurbaniSearchResults(current.requests.map(state => ({ searchType: state.request.searchType, results: state.results, request: state.request })), searchQuery, searchMode)
          setSearchResults(merged)
          setVisibleSearchResultCount(count => Math.max(count, groupSearchResults(merged, { raag: raagFilter, writer: writerFilter }).length))
        },
      }), ...localRetries])
      if (!isCurrent()) return
      setLoadMoreIssue(snapshot.requests.some(state => state.error && (state.failedPage ?? 0) > 1))
      const initialFailure = snapshot.requests.find(state => state.error && state.failedPage === 1)
      const issue = Object.values(localSearchFailuresRef.current)[0] ?? (initialFailure ? initialFailure.issue ?? 'unavailable' : null)
      const hasResults = snapshot.requests.some(state => state.completed) || appSearchMatchCount > 0 || retriedLocalMatches > 0
      setSearchIssue(issue && !hasResults ? issue : null)
      setSearchPartialIssue(issue && hasResults ? issue : null)
      if (searchScope === 'all' || searchScope === 'gurbani') rememberGurbaniSearchSession(JSON.stringify([searchQuery.trim(), searchMode, searchSource]), snapshot)
    } catch {
      if (isCurrent()) setLoadMoreIssue(true)
    } finally {
      if (isCurrent()) { loadMoreLockRef.current = false; setLoadingMore(false) }
      if (searchAbortRef.current === controller) searchAbortRef.current = null
    }
  }

  const clearSearch = useCallback(() => {
    revealGenerationRef.current += 1
    pendingRevealRef.current = null
    setSearchParams(current => {
      const next = new URLSearchParams(current)
      if (searchQuery.trim()) next.set('previousQuery', searchQuery.trim())
      next.delete('query')
      return next
    }, { replace: true })
    searchSequenceRef.current += 1
    if (debounceRef.current) clearTimeout(debounceRef.current)
    searchAbortRef.current?.abort()
    pendingSearchRunRef.current = null
    setSearching(false)
    setNextSearchPages({})
    setLoadingMore(false)
    setLoadMoreIssue(false)
    setSearchResults([])
    setLibrarySearchResults([])
    setStorySearchResults([])
    setSearchIssue(null)
    setSearchPartialIssue(null)
    globalThis.requestAnimationFrame(() => searchInputRef.current?.focus())
  }, [searchQuery, setSearchParams])

  const trySearchExample = useCallback((example: string) => {
    requestSearchReveal()
    setRaagFilter('all')
    setWriterFilter('all')
    setVisibleSearchResultCount(SEARCH_RESULTS_PAGE_SIZE)
    setSearchQuery(example)
    globalThis.requestAnimationFrame(() => searchInputRef.current?.focus())
  }, [requestSearchReveal])

  const submitSearch = useCallback(() => {
    if (searchQuery.trim().length >= getSearchMinimumLength(searchQuery, searchMode) && searchQuery.trim().length <= SEARCH_QUERY_MAX_LENGTH) addRecent(searchQuery.trim(), searchMode, searchSource, searchScope)
    requestSearchReveal()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    pendingSearchRunRef.current?.()
    if (window.matchMedia?.('(pointer: coarse)').matches) searchInputRef.current?.blur()
    revealSearchFeedback()
  }, [addRecent, searchQuery, searchMode, searchSource, searchScope, requestSearchReveal, revealSearchFeedback])

  const restoreRecentSearch = (item: typeof recent[number]) => {
    requestSearchReveal()
    pendingSearchScopeRef.current = item.scope
    // Commit all search dimensions together; the URL hydration effect starts
    // the request only after its query, mode, source and scope agree.
    const fields = new URLSearchParams(buildReadSearchPath(item).split('?')[1] ?? '')
    setSearchParams(current => {
      const next = new URLSearchParams(current)
      for (const key of ['query', 'mode', 'source']) {
        const value = fields.get(key)
        if (value) next.set(key, value)
        else next.delete(key)
      }
      if (item.scope === 'all') next.delete('scope')
      else next.set('scope', item.scope)
      next.delete('raag'); next.delete('writer'); next.delete('matches')
      return next
    }, { replace: true })
  }

  useEffect(() => {
    handleSearch(searchQuery, searchMode, searchSource)
  }, [handleSearch, searchMode, searchSource, searchQuery])

  const readSearchOrigin = buildCurrentAppPath(location)
  const addScopedRecent = (query: string, mode: SearchMode, source: SearchSource) => addRecent(query, mode, source, searchScope)
  const openSearchDestination = (path: string) => {
    navigate(path, {
      state: path.startsWith('/stories/') ? buildLibraryReaderNavigationState(readSearchOrigin) : buildReaderOriginNavigationState(path, readSearchOrigin),
    })
  }

  const openSearchResult = (result: GroupedSearchResult) => {
    addScopedRecent(searchQuery.trim(), searchMode, searchSource)
    openSearchDestination(`/study?shabadId=${result.shabadId}&verseId=${result.verseId}`)
  }

  const baniCatalog = useMemo(() => buildReadBaniCatalog(sundarGutkaBanis), [sundarGutkaBanis])
  const sundarGutkaGroups = baniCatalog.sundarGutka.map(group => ({
    ...group,
    label: copy.sundarGroups[group.key],
  }))
  const sundarGutkaCount = sundarGutkaGroups.reduce((count, group) => count + group.items.length, 0)
  const scriptureGroups = (Object.keys(SCRIPTURE_META) as Scripture[]).reduce<Record<Scripture, Array<{ category: string; label: string; items: ReadBaniCatalogItem[] }>>>((groups, scripture) => {
    groups[scripture] = SCRIPTURE_META[scripture].categoryOrder.map(category => ({
      category,
      label: category === 'Raag Sections' ? copy.bhagatSelections : category,
      items: baniCatalog.scriptures[scripture].filter(item => item.bani?.category === category),
    })).filter(group => group.items.length > 0)
    return groups
  }, { SGGS: [], DG: [] })

  const openBani = (item: ReadBaniCatalogItem) => {
    const nitnemOption = NITNEM_ROUTE_OPTIONS.find(option => option.baniDbId === item.baniDbId)
    if (nitnemOption) openSearchDestination(buildNitnemStudyPath(nitnemOption))
    else if (item.bani) openSearchDestination(buildCanonicalBaniStudyPath(item.bani))
    else if (item.baniDbId === 24) openSearchDestination('/study?baniDbId=24&bani=Ardaas')
  }
  const renderBaniRow = (item: ReadBaniCatalogItem) => {
    const hindiTitle = scriptMode === 'devanagari' && item.baniDbId
      ? BANI_SCRIPT_NAMES[item.baniDbId]?.hindi : undefined
    return (
      <ReadBaniRow key={item.identity} identity={item.identity}
        entry={(item.baniDbId ? getBaniDiscovery(item.baniDbId) : getBrowseBaniDiscovery(item.bani!))!}
        scriptTitle={hindiTitle ?? (item.scriptTitle ? renderScriptText(item.scriptTitle, scriptMode) : undefined)}
        scriptLang={getScriptTextLang(scriptMode)} scriptClassName={getScriptTextFontClass(scriptMode)}
        onOpen={() => openBani(item)} />
    )
  }

  const groupedSearchResults = useMemo(
    () => groupSearchResults(searchResults, { raag: raagFilter, writer: writerFilter }),
    [raagFilter, searchResults, writerFilter]
  )
  const visibleGroupedSearchResults = groupedSearchResults.slice(0, visibleSearchResultCount)
  const hasActiveMetadataFilters = raagFilter !== 'all' || writerFilter !== 'all'


  const { raags: availableRaags, writers: availableWriters } = useMemo(
    () => getAvailableSearchMeta(searchResults),
    [searchResults]
  )

  const directLookupActive = (searchScope === 'all' || searchScope === 'gurbani') && isDirectSearch(searchQuery.trim(), searchMode)
  const angTargets = useMemo(
    () => directLookupActive ? getAngTargets(searchQuery, searchSource) : [],
    [directLookupActive, searchQuery, searchSource]
  )

  const readRouteMatches = useAppSearchMatches(
    directLookupActive || searchScope === 'stories' || searchScope === 'books' ? '' : searchQuery.trim(),
    searchSource
  )
  const immediateAppSearchMatches = getUniqueAppSearchMatches(readRouteMatches)
  const deferredLibrarySearchMatches = getUniqueAppSearchMatches(
    librarySearchResults,
    immediateAppSearchMatches
  )
  const appSearchMatchCount = (
    immediateAppSearchMatches.length
    + deferredLibrarySearchMatches.length
    + storySearchResults.length
  )
  const isEnglishMeaningSearch = (
    searchMode === 'english'
    || (
      searchMode === 'auto-detect'
      && LATIN_SEARCH_PATTERN.test(searchQuery)
      && !GURMUKHI_SEARCH_PATTERN.test(searchQuery)
    )
  )
  const hasActiveSearch = searchQuery.trim().length >= getSearchMinimumLength(searchQuery.trim(), searchMode)
  const queryTooLong = normalizeGurbaniSearchQuery(searchQuery, searchMode).length > SEARCH_QUERY_MAX_LENGTH
  const englishIntent = useMemo(() => (searchScope === 'all' || searchScope === 'gurbani')
    ? buildGurbaniSearchPlan(searchQuery, searchMode, searchSource).englishIntent : undefined,
  [searchQuery, searchMode, searchSource, searchScope])
  useEffect(() => {
    if (hasActiveSearch && searching) return
    return restoreDiscoveryReturn(buildCurrentAppPath(location))
  }, [hasActiveSearch, searching, location])

  const searchStatusMessage = useMemo(() => {
    if (!hasActiveSearch) return ''
    if (queryTooLong) return resultCopy.tooLong
    if (searching) return copy.searching
    if (searchIssue) return getSearchIssueCopy(searchIssue, locale)
    if (directLookupActive) {
      return angTargets.length === 1
        ? `1 ${copy.directDestination}`
        : `${angTargets.length} ${copy.directDestinations}`
    }

    const resultCount = appSearchMatchCount + groupedSearchResults.length
    const resultCountCopy = resultCount === 1 ? `1 ${copy.result}` : `${resultCount} ${copy.results}`
    const loaded = Object.keys(nextSearchPages).length > 0 ? `${resultCountCopy}. ${SEARCH_RESULTS_COPY[locale].remaining}` : resultCountCopy
    return searchPartialIssue ? `${loaded}. ${copy.partialSearch}` : loaded
  }, [angTargets.length, appSearchMatchCount, copy, directLookupActive, groupedSearchResults.length, hasActiveSearch, locale, searchIssue, searchPartialIssue, searching, nextSearchPages, queryTooLong, resultCopy.tooLong])

  return (
    <div
      className="read-room-shell page-shell max-w-md mx-auto bg-parchment dark:bg-dark-bg transition-colors duration-300 animate-fade-in"
      data-testid="page-banis"
      data-page="banis"
      data-ai-surface="read"
      data-ai-state="ready"
      onClickCapture={event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        const target = (event.target as HTMLElement).closest<HTMLElement>('a, [data-read-launch="true"]')
        if (!target) return
        const href = target.getAttribute('href')
        if (!target.hasAttribute('data-read-launch') && (!href?.startsWith('/') || href.startsWith('/banis?'))) return
        rememberDiscoveryReturn(buildCurrentAppPath(location), target.id || null)
      }}
    >
      <div className="read-room-stack">
        <section className="read-room-hero" aria-labelledby="read-room-title">
          <div className="read-room-hero__copy">
            <p className="eyebrow">{copy.heroEyebrow}</p>
            <h1 id="read-room-title" className="mt-2 font-display text-4xl leading-none text-ink dark:text-dark-text">
              {copy.title}
            </h1>
            <p className="read-room-hero__body mt-3 max-w-[32ch] font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/80">
              {copy.heroBody}
            </p>
          </div>
          <figure className="read-room-hero__art">
            <ReadArtwork
              src={readHarmandirSrc}
              description={copy.artworkDescriptions.harmandir}
              fallbackLabel={copy.artworkUnavailable}
              width={1200}
              height={1500}
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </figure>

          <div
            ref={searchCardRef}
            className="read-quick-find-card"
        aria-labelledby="banis-quick-find-title"
        data-testid="banis-quick-find"
        data-ai-surface="read-smart-search"
        data-ai-state={
          directLookupActive
            ? (hasActiveSearch ? 'ready' : 'empty')
              : searching
                ? 'loading'
              : searchIssue || searchPartialIssue
                ? 'degraded'
              : (appSearchMatchCount > 0 || searchResults.length > 0)
                ? 'ready'
                : hasActiveSearch
                  ? 'empty'
                  : 'empty'
        }
        data-ai-error={searchIssue || searchPartialIssue ? 'read-search' : undefined}
      >
        <ReadSearchControls copy={copy} locale={locale} inputRef={searchInputRef}
          query={searchQuery} mode={searchMode} source={searchSource} scope={searchScope}
          optionsOpen={searchOptionsOpen} active={hasActiveSearch} status={searchStatusMessage} previousQuery={previousQuery}
          onToggleOptions={() => toggle('search-options')}
          onQuery={value => { requestSearchReveal(); setRaagFilter('all'); setWriterFilter('all'); setVisibleSearchResultCount(SEARCH_RESULTS_PAGE_SIZE); setSearchQuery(value) }}
          onSubmit={submitSearch}
          onMode={mode => { requestSearchReveal(); setRaagFilter('all'); setWriterFilter('all'); setVisibleSearchResultCount(SEARCH_RESULTS_PAGE_SIZE); setSearchMode(mode) }}
          onSource={source => { requestSearchReveal(); setRaagFilter('all'); setWriterFilter('all'); setVisibleSearchResultCount(SEARCH_RESULTS_PAGE_SIZE); setSearchSource(source) }} onExit={clearSearch}
          onRecover={() => { requestSearchReveal(); setSearchQuery(previousQuery) }}
          onScope={scope => {
            requestSearchReveal()
            pendingSearchScopeRef.current = scope
            setSearchParams(current => {
              const next = new URLSearchParams(current)
              if (scope === 'all') next.delete('scope')
              else next.set('scope', scope)
              next.delete('raag'); next.delete('writer'); next.delete('matches')
              return next
            }, { replace: true })
          }} />

          {queryTooLong && <p role="alert" className="read-search-intent-hint">{resultCopy.tooLong}</p>}
          {hasActiveSearch && !queryTooLong && englishIntent && (englishIntent.terms.length > 1 || englishIntent.isNaturalLanguage || englishIntent.correctedFrom) && (
            <div className="read-search-intent-hint" data-testid="search-meaning-plan">
              {englishIntent.correctedFrom && <p>{resultCopy.corrected(englishIntent.correctedFrom, englishIntent.literalQuery)}</p>}
              <p>{resultCopy.searchingTerms(englishIntent.terms)}</p>
              <button type="button" className="read-search-clear mt-2" onClick={() => {
                requestSearchReveal()
                setRaagFilter('all'); setWriterFilter('all'); setVisibleSearchResultCount(SEARCH_RESULTS_PAGE_SIZE)
                setSearchQuery(`"${englishIntent.correctedFrom ?? englishIntent.literalQuery}"`)
              }}>{resultCopy.exactWords}</button>
            </div>
          )}
          {directLookupActive && searchQuery.trim() && !queryTooLong && (
            <div data-search-result-anchor="true" className="nav-safe-results mt-3 space-y-2" data-testid="banis-search-ang-results" data-ai-result-group="ang">
            {angTargets.length > 0 ? angTargets.map(target => (
              <button
                key={target.source}
                id={`read-direct-${target.source}`}
                data-read-launch="true"
                onClick={() => {
                  addRecent(searchQuery.trim(), searchMode, searchSource, searchScope)
                  openSearchDestination(target.path)
                }}
                className="w-full rounded-lg border border-sand/15 bg-parchment-card px-3 py-3 text-left transition-colors duration-300 dark:border-dark-text/10 dark:bg-dark-card"
              >
                <p className="font-sans text-sm text-ink dark:text-dark-text">
                  {copy.openDirectTarget(
                    target.label,
                    copy.unitLabels[target.kind as keyof typeof copy.unitLabels] ?? target.kind,
                    searchQuery.trim()
                  )}
                </p>
                <p className="font-sans text-xs text-ink/68 dark:text-dark-text/64 mt-1">
                  {copy.directLookupBody}
                </p>
              </button>
            )) : (
              <p className="font-sans text-xs text-ink/68 dark:text-dark-text/64 mt-2 ml-1">{copy.noDirectTarget}</p>
            )}
          </div>
          )}
          {searching && <p data-search-feedback-anchor="true" className="nav-safe-results font-sans text-xs text-ink/75 dark:text-dark-text/76 mt-2 ml-1">{copy.searching}…</p>}
          {searchIssue && !searching && !directLookupActive && (
            <div data-search-feedback-anchor="true" role="alert" className="nav-safe-results mt-3 rounded-lg border border-[#b4553d]/25 bg-[#b4553d]/10 px-4 py-3 text-sm text-[#7a2f1b] dark:border-[#ffb29d]/28 dark:bg-[#ffb29d]/10 dark:text-[#ffd0c4]">
              <p>{getSearchIssueCopy(searchIssue, locale)}</p>
              <button
                type="button"
                className="read-search-clear mt-3"
                onClick={() => { requestSearchReveal(); void continueSearch('retry') }}
              >
                {copy.retry}
              </button>
            </div>
          )}
          {searchPartialIssue && !searchIssue && !directLookupActive && (
            <div data-search-feedback-anchor="true" role="status" className="read-search-partial nav-safe-results mt-3 rounded-lg border px-4 py-3 font-sans text-sm">
              {copy.partialSearch}
              {!searching ? <button type="button" className="read-search-clear mt-2" onClick={() => { requestSearchReveal(); void continueSearch('retry') }}>{copy.retry}</button> : null}
            </div>
          )}
          {hasActiveSearch && immediateAppSearchMatches.length > 0 && !directLookupActive && (
            <AppSearchResultGroup
              matches={immediateAppSearchMatches}
              query={searchQuery}
              groupLabel={copy.inApp}
              testId="banis-search-app-results"
              aiResultGroup="in-app"
              resultAnchor
              className="mt-3"
              copy={copy}
              searchMode={searchMode}
              searchSource={searchSource}
              addRecent={addScopedRecent}
              openSearchDestination={openSearchDestination}
            />
          )}
          {hasActiveSearch && searchResults.length > 0 && !directLookupActive && (
            <div data-search-result-anchor={immediateAppSearchMatches.length === 0 ? 'true' : undefined} className="nav-safe-results mt-2 space-y-1" data-testid="banis-search-gurbani-results" data-ai-result-group="gurbani">
            <h3 className="px-1 pb-1 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/75 dark:text-dark-text/76">
              {copy.gurbaniMatches}
            </h3>
            {searchMode === 'transliteration' && <p className="read-search-intent-hint">{resultCopy.phoneticNote}</p>}
            {(availableRaags.length > 0 || availableWriters.length > 0) && (
              <details className="read-search-filters" open={hasActiveMetadataFilters || undefined}>
                <summary>{resultCopy.filters}{hasActiveMetadataFilters ? ` · ${[raagFilter, writerFilter].filter(value => value !== 'all').join(' · ')}` : ''}</summary>
                <div className="space-y-2 pb-2">
                {availableRaags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setRaagFilter('all')}
                        aria-pressed={raagFilter === 'all'}
                        className={`min-h-[44px] rounded-full px-3 py-2 font-sans text-[11px] border ${raagFilter === 'all' ? 'bg-saffron text-white border-saffron' : 'bg-parchment-card dark:bg-dark-card text-ink/68 dark:text-dark-text/64 border-sand/15 dark:border-dark-text/10'}`}
                    >
                      {copy.allRaags}
                    </button>
                    {availableRaags.map(raag => (
                      <button
                          key={raag}
                          onClick={() => setRaagFilter(raag)}
                          aria-pressed={raagFilter === raag}
                          className={`min-h-[44px] rounded-full px-3 py-2 font-sans text-[11px] border ${raagFilter === raag ? 'bg-saffron text-white border-saffron' : 'bg-parchment-card dark:bg-dark-card text-ink/68 dark:text-dark-text/64 border-sand/15 dark:border-dark-text/10'}`}
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
                        className={`min-h-[44px] rounded-full px-3 py-2 font-sans text-[11px] border ${writerFilter === 'all' ? 'bg-saffron text-white border-saffron' : 'bg-parchment-card dark:bg-dark-card text-ink/68 dark:text-dark-text/64 border-sand/15 dark:border-dark-text/10'}`}
                    >
                      {copy.allWriters}
                    </button>
                    {availableWriters.map(writer => (
                      <button
                          key={writer}
                          onClick={() => setWriterFilter(writer)}
                          aria-pressed={writerFilter === writer}
                          className={`min-h-[44px] rounded-full px-3 py-2 font-sans text-[11px] border ${writerFilter === writer ? 'bg-saffron text-white border-saffron' : 'bg-parchment-card dark:bg-dark-card text-ink/68 dark:text-dark-text/64 border-sand/15 dark:border-dark-text/10'}`}
                      >
                        {writer}
                      </button>
                    ))}
                  </div>
                )}
                </div>
              </details>
            )}
            {hasActiveMetadataFilters && groupedSearchResults.length === 0 ? (
              <div className="rounded-lg border border-sand/15 bg-parchment-card px-4 py-3 dark:border-dark-text/10 dark:bg-dark-card">
                <p role="status" className="font-sans text-xs leading-5 text-ink/75 dark:text-dark-text/76">
                  {copy.noFilteredResults}
                </p>
                <button
                  type="button"
                  className="read-search-clear mt-3"
                  onClick={() => {
                    setRaagFilter('all')
                    setWriterFilter('all')
                    setVisibleSearchResultCount(SEARCH_RESULTS_PAGE_SIZE)
                  }}
                >
                  {copy.clearFilters}
                </button>
              </div>
            ) : null}
            {visibleGroupedSearchResults.map(r => (
              <div
                key={r.key}
                data-testid="banis-search-gurbani-result"
                className="rounded-lg border border-sand/15 bg-parchment-card px-3 py-3 transition-colors duration-300 dark:border-dark-text/10 dark:bg-dark-card"
              >
                <button
                  type="button"
                  id={`read-verse-${r.verseId}`}
                  data-read-launch="true"
                  onClick={() => openSearchResult(r)}
                  className="w-full text-left"
                >
                  <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-sm text-ink dark:text-dark-text`}><SearchHighlight text={renderScriptText(r.gurmukhi, scriptMode)} query={searchQuery.trim()} /></p>
                  {(showTransliteration || searchMode === 'transliteration' || getSearchMatchKind(r, searchQuery, searchMode) === 'transliteration') && r.transliteration ? (
                    <p className="read-search-result__roman font-sans text-xs text-ink/75 dark:text-dark-text/76 mt-0.5">
                      {(searchMode === 'transliteration' || getSearchMatchKind(r, searchQuery, searchMode) === 'transliteration') ? <span className="read-search-result__label">{resultCopy.transliteration}</span> : null}
                      <span lang="en"><SearchHighlight text={r.transliteration} query={r.searchMatch?.query ?? searchQuery.trim()} mode="transliteration" /></span>
                    </p>
                  ) : null}
                  {(meaningLanguage === 'en' || isEnglishMeaningSearch) && r.translation_en ? (
                    <p className="read-search-result__meaning font-sans text-xs text-ink/75 dark:text-dark-text/76 mt-1">
                      {isEnglishMeaningSearch ? <span className="read-search-result__label">{r.searchMatch?.related ? `${resultCopy.relatedMeaning} · ${r.searchMatch.query}` : copy.meaning}</span> : null}
                      <span className="read-search-result__text"><SearchHighlight text={r.translation_en} query={r.searchMatch?.query ?? searchQuery.trim()} /></span>
                    </p>
                  ) : null}
                </button>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {r.sourceName && Object.prototype.hasOwnProperty.call(SEARCH_SOURCE_LABELS, r.source)
                    ? <MetadataChip onClick={() => setSearchSource(r.source as SearchSource)}>{r.sourceName}</MetadataChip>
                    : (r.sourceName ? <MetadataChip>{r.sourceName}</MetadataChip> : null)}
                  {typeof r.pageNo === 'number' && r.pageNo > 0 && (
                    <MetadataChip>{`${copy.unitLabels[getSourceReaderUnit(r.source)]} ${r.pageNo}`}</MetadataChip>
                  )}
                  {r.matchCount > 1 && <MetadataChip>{copy.matchCount(r.matchCount)}</MetadataChip>}
                  {r.raag ? <MetadataChip onClick={() => setRaagFilter(r.raag)}>{r.raag}</MetadataChip> : null}
                  {r.writer ? <MetadataChip onClick={() => setWriterFilter(r.writer)}>{r.writer}</MetadataChip> : null}
                </div>
              </div>
            ))}
            {groupedSearchResults.length > 0 ? (
              <div className="flex flex-col items-center gap-2 pt-2">
                <p role="status" className="font-sans text-[11px] text-ink/68 dark:text-dark-text/64">
                  {copy.showingResults(visibleGroupedSearchResults.length, groupedSearchResults.length)}
                </p>
                {visibleGroupedSearchResults.length < groupedSearchResults.length ? (
                  <button
                    type="button"
                    className="read-search-clear"
                    onClick={() => setVisibleSearchResultCount(current => current + SEARCH_RESULTS_PAGE_SIZE)}
                  >
                    {copy.showMoreResults}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
        {hasActiveSearch && !directLookupActive && Object.keys(nextSearchPages).length > 0 && (visibleGroupedSearchResults.length >= groupedSearchResults.length || loadMoreIssue) && (
          <div className="read-search-pagination nav-safe-results" data-testid="search-pagination">
            <p>{resultCopy.remaining}</p>
            {loadMoreIssue ? <p role="alert">{resultCopy.failed}</p> : null}
            <button type="button" data-testid="search-load-more" disabled={loadingMore || searching}
              onClick={() => { void continueSearch(loadMoreIssue ? 'retry' : 'more') }}>
              {loadingMore ? resultCopy.loading : loadMoreIssue ? copy.retry : resultCopy.more}
            </button>
          </div>
        )}
        {hasActiveSearch && deferredLibrarySearchMatches.length > 0 && !directLookupActive && (
          <AppSearchResultGroup
            matches={deferredLibrarySearchMatches}
            query={searchQuery}
            groupLabel={copy.libraryMatches}
            testId="banis-search-library-results"
            aiResultGroup="library"
            resultAnchor={immediateAppSearchMatches.length === 0 && searchResults.length === 0}
            className="mt-2"
            copy={copy}
            searchMode={searchMode}
            searchSource={searchSource}
            addRecent={addScopedRecent}
            openSearchDestination={openSearchDestination}
          />
        )}
        {hasActiveSearch && storySearchResults.length > 0 && !directLookupActive ? <AppSearchResultGroup
          matches={storySearchResults} query={searchQuery} groupLabel={copy.tabs.stories}
          testId="banis-search-story-results" aiResultGroup="stories" resultAnchor={appSearchMatchCount === storySearchResults.length && searchResults.length === 0}
          className="mt-3" copy={copy} searchMode={searchMode} searchSource={searchSource}
          addRecent={addScopedRecent} openSearchDestination={openSearchDestination}
        /> : null}
        {hasActiveSearch && !queryTooLong && !searching && !searchIssue && !searchPartialIssue && Object.keys(nextSearchPages).length === 0 && searchResults.length === 0 && appSearchMatchCount === 0 && !directLookupActive && (
          <section data-search-feedback-anchor="true" className="read-search-empty nav-safe-results mt-3" aria-labelledby="read-search-empty-title">
            <h3 id="read-search-empty-title" className="font-sans text-sm font-semibold text-ink dark:text-dark-text">
              {copy.noResultsTitle}
            </h3>
            <p className="mt-1 font-sans text-xs leading-5 text-ink/75 dark:text-dark-text/76">
              {searchUi.emptyBody[searchScope]}
            </p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={copy.tryExamples}>
              {(searchScope === 'all' || searchScope === 'gurbani' ? SEARCH_INTENT_COPY[locale].modes[searchMode].examples : searchUi.examples[searchScope]).map(example => (
                <button key={example} type="button" className="read-search-example" onClick={() => trySearchExample(example)}>
                  {example}
                </button>
              ))}
            </div>
            <button type="button" className="read-search-clear mt-3" onClick={clearSearch}>
              {copy.clearSearch}
            </button>
          </section>
        )}
        {!searchQuery && recent.length > 0 && (
          <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
              <p className="font-sans text-[10px] text-ink/75 dark:text-dark-text/76 uppercase tracking-wider">{copy.recent}</p>
              {recent.some(item => !item.pinned) && <button onClick={() => { clearRecent(); setRecentExpanded(false) }} className="font-sans text-[10px] text-ink/75 dark:text-dark-text/76">{searchUi.clearHistory}</button>}
            </div>
            <div className="space-y-2">
              {(recentExpanded ? recent : recent.slice(0, 3)).map(item => (
                <div key={`${item.query}-${item.mode}-${item.source}-${item.scope}`} className="flex items-center gap-2">
                  <button
                    onClick={() => restoreRecentSearch(item)}
                    className="flex-1 text-left font-sans text-xs bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-full px-3 py-2 text-ink/68 dark:text-dark-text/64 active:scale-95 transition-transform duration-150"
                  >
                    {item.query} · {searchUi.scopes[item.scope]} · {searchModeLabels[item.mode]} · {item.source === 'all' ? copy.allSources : SEARCH_SOURCE_LABELS[item.source]}
                  </button>
                  <button
                    onClick={() => togglePinned(item.query, item.mode, item.source, item.scope)}
                    aria-label={`${item.pinned ? copy.unpin : copy.pin} ${item.query}`}
                    className="min-h-[40px] min-w-[40px] rounded-full bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 flex items-center justify-center text-ink/68 dark:text-dark-text/64"
                  >
                    {item.pinned ? <IconBookmarkFilled size={15} className="text-saffron dark:text-saffron-light" /> : <IconBookmark size={15} />}
                  </button>
                </div>
              ))}
            </div>
            {recent.length > 3 && <button type="button" className="read-search-clear mt-2" aria-expanded={recentExpanded}
              onClick={() => setRecentExpanded(value => !value)}>
              {recentExpanded ? searchUi.fewerRecent : searchUi.moreRecent(recent.length)}
            </button>}
          </div>
        )}
          </div>
        </section>

        <div className="read-browse-heading"><h2>{searchUi.browse}</h2></div>
        <div className="read-collection-tabs" role={hasActiveSearch ? 'group' : 'tablist'} aria-label={copy.collectionsLabel}>
          {READ_COLLECTIONS.map((collection, index) => {
            const selected = activeCollection === collection
            return (
              <button
                key={collection}
                id={`read-tab-${collection}`}
                type="button"
                role={hasActiveSearch ? undefined : 'tab'}
                aria-selected={hasActiveSearch ? undefined : selected}
                aria-controls={hasActiveSearch ? undefined : 'read-active-collection-panel'}
                tabIndex={hasActiveSearch || selected ? 0 : -1}
                onClick={() => selectCollection(collection)}
                onKeyDown={event => {
                  if (hasActiveSearch) return
                  let nextIndex = index
                  if (event.key === 'ArrowRight') nextIndex = (index + 1) % READ_COLLECTIONS.length
                  else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + READ_COLLECTIONS.length) % READ_COLLECTIONS.length
                  else if (event.key === 'Home') nextIndex = 0
                  else if (event.key === 'End') nextIndex = READ_COLLECTIONS.length - 1
                  else return

                  event.preventDefault()
                  const nextCollection = READ_COLLECTIONS[nextIndex]
                  selectCollection(nextCollection)
                  window.requestAnimationFrame(() => {
                    document.getElementById(`read-tab-${nextCollection}`)?.focus()
                  })
                }}
                className="read-collection-tab"
              >
                {copy.tabs[collection]}
              </button>
            )
          })}
        </div>

        {!hasActiveSearch && activeCollection === 'stories' ? (
          <div id="read-active-collection-panel" role="tabpanel" aria-labelledby="read-tab-stories" className="read-collection-panel">
            <Suspense fallback={<p role="status" className="p-5 text-sm">{searchUi.openingStories}</p>}>
              <StoryBrowser showSearch={false} continuation={<ReadContinue />} />
            </Suspense>
          </div>
        ) : null}

        {!hasActiveSearch && activeCollection === 'banis' ? (
          <div
            id="read-active-collection-panel"
            role="tabpanel"
            aria-labelledby="read-tab-banis"
            className="read-collection-panel"
          >
            <div className="read-collection-intro">
              <ReadArtwork
                src={banisGuruNanakSrc}
                description={copy.artworkDescriptions.guruNanak}
                fallbackLabel={copy.artworkUnavailable}
                width={1080}
                height={1367}
                loading="lazy"
                decoding="async"
              />
              <div>
                <p className="eyebrow">{copy.banisEyebrow}</p>
                <h2>{copy.banisTitle}</h2>
                <p className="read-collection-intro__body">{copy.banisBody}</p>
              </div>
            </div>
            <ReadContinue />

        <Link
          to="/study?baniDbId=24&bani=Ardaas&flow=ardaas-hukamnama"
          state={{ readerOrigin: readSearchOrigin }}
          id="read-ardaas-flow"
          className="read-featured-flow-card w-full text-left active:scale-[0.99] transition-transform duration-150"
          data-testid="banis-featured-flow"
          data-ai-action="open-ardaas-hukamnama-flow"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">{copy.featuredFlowEyebrow}</p>
          </div>
          <div className="mt-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-3xl leading-none text-ink dark:text-dark-text">
                {copy.featuredFlowTitle}
              </h2>
              <p className="read-featured-flow-card__body mt-3 max-w-[30ch] font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/80">
                {copy.featuredFlowBody}
              </p>
            </div>
            <span className="read-featured-flow-card__action mt-1 shrink-0 text-gold-dark dark:text-gold-light">
              <IconArrowRight size={18} />
            </span>
          </div>
          <span className="read-featured-flow-card__cta mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-3 font-sans text-sm font-semibold text-cream dark:bg-gold-light dark:text-dark-bg">
            {copy.beginFlow}
            <IconArrowRight size={15} />
          </span>
        </Link>

        <section
          className="read-directory-section"
          aria-labelledby="read-directory-title"
          data-bani-catalog-count={READ_BANIDB_CATALOG_COUNT}
        >
          <div className="read-section-header">
            <p className="eyebrow">{copy.directoryEyebrow}</p>
            <h2 id="read-directory-title" className="mt-2 font-display text-3xl leading-none text-ink dark:text-dark-text">
              {copy.directoryTitle}
            </h2>
            <p className="read-section-copy mt-2 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/76">
              {copy.directoryBody}
            </p>
          </div>

          <div className="read-directory-list mt-4">
            <div>
        <button
          onClick={() => toggle('sundar-gutka')}
          className="read-directory-card read-directory-card--featured w-full flex justify-between items-center min-h-[44px] active:scale-[0.99] transition-transform duration-150"
          data-open={expanded['sundar-gutka'] ? 'true' : 'false'}
          data-testid="banis-directory-sundar-gutka"
          aria-expanded={Boolean(expanded['sundar-gutka'])}
          aria-controls="banis-sundar-gutka-panel"
        >
          <div className="min-w-0 text-left">
            <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} font-semibold text-base text-saffron dark:text-saffron-light`}>{renderScriptText('ਸੁੰਦਰ ਗੁਟਕਾ', scriptMode)} · Sundar Gutka</p>
          </div>
          <span className="ml-3 flex shrink-0 items-center gap-2">
            <DirectoryCount
              count={sundarGutkaCount}
              copy={copy}
              testId="banis-directory-sundar-gutka-count"
            />
            <span className="icon-surface h-8 w-8 text-saffron dark:text-gold-light">{expanded['sundar-gutka'] ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
          </span>
        </button>

        {expanded['sundar-gutka'] && (
          <div
            id="banis-sundar-gutka-panel"
            className="mt-2 ml-2"
            data-ai-state="ready"
          >
            {sundarGutkaGroups.map(group => {
              const groupKey = `sundar-gutka-${group.key}`
              return (
                <div key={group.key} className="mb-2">
                  <button
                    onClick={() => toggle(groupKey)}
                    className="read-directory-card read-directory-card--nested w-full flex justify-between items-center min-h-[44px] active:scale-[0.99] transition-transform duration-150"
                    data-open={expanded[groupKey] ? 'true' : 'false'}
                    aria-expanded={Boolean(expanded[groupKey])}
                    aria-controls={`${groupKey}-panel`}
                    aria-label={`${group.label}, ${group.items.length} banis`}
                  >
                    <p className="font-sans text-xs text-ink/68 dark:text-dark-text/64 uppercase tracking-wider">{group.label}</p>
                    <span className="ml-3 flex shrink-0 items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="min-w-6 text-right font-sans text-[11px] tabular-nums text-ink/75 dark:text-dark-text/76"
                        data-testid={`${groupKey}-count`}
                      >
                        {group.items.length}
                      </span>
                      <span className="icon-surface h-7 w-7 text-ink/68 dark:text-dark-text/66">{expanded[groupKey] ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
                    </span>
                  </button>
                  {expanded[groupKey] && (
                    <div id={`${groupKey}-panel`} className="read-bani-group-panel mt-1 ml-2">
                      {group.items.map(renderBaniRow)}
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
        const baniCount = baniCatalog.scriptures[scripture].length

        return (
          <div key={scripture}>
            <button
              onClick={() => toggle(sectionKey)}
              className="read-directory-card w-full flex justify-between items-center min-h-[44px] active:scale-[0.99] transition-transform duration-150"
              data-open={isOpen ? 'true' : 'false'}
              data-testid={`banis-directory-${sectionKey}`}
              aria-expanded={Boolean(isOpen)}
              aria-controls={`banis-${sectionKey}-panel`}
            >
              <div className="min-w-0 text-left">
                <p className="flex items-center gap-1.5 font-sans text-base font-semibold text-saffron dark:text-saffron-light">{meta.icon} {meta.label}</p>
              </div>
              <span className="ml-3 flex shrink-0 items-center gap-2">
                <DirectoryCount count={baniCount} copy={copy} testId={`banis-directory-${sectionKey}-count`} />
                <span className="icon-surface h-8 w-8 text-saffron dark:text-gold-light">{isOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
              </span>
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
                        aria-label={`${group.label}, ${group.items.length} readings`}
                      >
                        <p className="font-sans text-xs text-ink/68 dark:text-dark-text/64 uppercase tracking-wider">{group.label}</p>
                        <span className="ml-3 flex shrink-0 items-center gap-2">
                          <span aria-hidden="true" className="min-w-6 text-right font-sans text-[11px] tabular-nums text-ink/75 dark:text-dark-text/76">
                            {group.items.length}
                          </span>
                          <span className="icon-surface h-7 w-7 text-ink/68 dark:text-dark-text/66">{expanded[groupKey] ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
                        </span>
                      </button>
                      {expanded[groupKey] && (
                        <div id={`${groupKey}-panel`} className="read-bani-group-panel mt-1 ml-2">
                          {group.items.map(renderBaniRow)}
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

      <div>
        <button
          type="button"
          onClick={() => toggle('bhai-gurdas-vaaran')}
          className="read-directory-card w-full flex justify-between items-center min-h-[44px] active:scale-[0.99] transition-transform duration-150"
          data-open={expanded['bhai-gurdas-vaaran'] ? 'true' : 'false'}
          aria-expanded={Boolean(expanded['bhai-gurdas-vaaran'])}
          aria-controls="banis-bhai-gurdas-vaaran-panel"
        >
          <span className="min-w-0 text-left">
            <span className="flex items-center gap-1.5 font-sans text-base font-semibold text-ink dark:text-dark-text">
              <IconLibrary size={18} />
              Bhai Gurdas Ji Vaaran
            </span>
            <span className="mt-1 block font-sans text-xs text-ink/75 dark:text-dark-text/76">
              {SOURCE_READER_META.B.max} {copy.completeVaars}
            </span>
          </span>
          <span className="icon-surface h-8 w-8 shrink-0 text-saffron dark:text-gold-light">
            {expanded['bhai-gurdas-vaaran'] ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          </span>
        </button>

        {expanded['bhai-gurdas-vaaran'] ? (
          <div id="banis-bhai-gurdas-vaaran-panel" className="read-vaar-panel">
            <p className="read-vaar-panel__intro">
              {copy.chooseVaar}
            </p>
            <nav className="read-vaar-grid" aria-label="Bhai Gurdas Ji Vaaran">
              {BHAI_GURDAS_VAARS.map(vaar => (
                <Link
                  key={vaar}
                  id={`read-vaar-${vaar}`}
                  to={`/study?source=B&ang=${vaar}`}
                  state={{ readerOrigin: readSearchOrigin }}
                  className="read-vaar-link"
                  aria-label={`Open Bhai Gurdas Ji Vaar ${vaar}`}
                >
                  <span className="read-vaar-link__label">Vaar</span>
                  <span className="read-vaar-link__number">{vaar}</span>
                </Link>
              ))}
            </nav>
          </div>
        ) : null}
      </div>

      <Link
        to="/banis/amrit-keertan"
        state={{ readerOrigin: readSearchOrigin }}
        id="read-amrit-keertan"
        className="read-directory-card w-full flex justify-between items-center min-h-[44px] active:scale-[0.99] transition-transform duration-150"
        data-testid="banis-open-amrit-keertan"
      >
        <span className="min-w-0 text-left">
          <span className="flex items-center gap-1.5 font-sans text-base font-semibold text-ink dark:text-dark-text">
            <IconMusic size={18} />
            {copy.amritTitle}
          </span>
          <span className="mt-1 block font-sans text-xs text-ink/75 dark:text-dark-text/76">
            {copy.amritBody}
          </span>
        </span>
        <span className="icon-surface h-8 w-8 shrink-0 text-saffron dark:text-gold-light">
          <IconArrowRight size={14} />
        </span>
      </Link>
          </div>
        </section>

          </div>
        ) : null}

        {!hasActiveSearch && activeCollection === 'sources' ? (
          <div
            id="read-active-collection-panel"
            role="tabpanel"
            aria-labelledby="read-tab-sources"
            className="read-collection-panel"
          >
            <div className="read-collection-intro read-collection-intro--sources">
              <ReadArtwork
                src={readHarmandirSrc}
                description={copy.artworkDescriptions.harmandir}
                fallbackLabel={copy.artworkUnavailable}
                width={1200}
                height={1500}
                loading="lazy"
                decoding="async"
              />
              <div>
                <p className="eyebrow">{copy.sourcesEyebrow}</p>
                <h2>{copy.sourcesTitle}</h2>
                <p className="read-collection-intro__body">{copy.sourcesBody}</p>
              </div>
            </div>

            <ReadContinue />
            <section
              className="read-source-section"
              aria-labelledby="read-source-browser-title"
              data-testid="read-source-browser"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="read-source-browser-title" className="mt-2 font-display text-3xl leading-none text-ink dark:text-dark-text">
                    {copy.sourceCatalogTitle}
                  </h2>
                  <p className="read-section-copy mt-2 max-w-[34ch] font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/76">
                    {copy.sourceCatalogBody}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <ScriptureSourceBrowser
                  dataTestId="read-source-browser-shared"
                  sectionIds={READ_SOURCE_SECTION_IDS}
                  sectionClassName="read-source-browser-card surface-primary px-4 py-4"
                />
              </div>
            </section>
          </div>
        ) : null}

        {!hasActiveSearch && activeCollection === 'books' ? (
          <div
            id="read-active-collection-panel"
            role="tabpanel"
            aria-labelledby="read-tab-books"
            className="read-collection-panel"
          >
            <div className="read-collection-intro read-collection-intro--library">
              <ReadArtwork
                src={booksCourtSrc}
                description={copy.artworkDescriptions.court}
                fallbackLabel={copy.artworkUnavailable}
                width={736}
                height={920}
                loading="lazy"
                decoding="async"
              />
              <div>
                <p className="eyebrow">{copy.booksEyebrow}</p>
                <h2>{copy.booksTitle}</h2>
                <p className="read-collection-intro__body">{copy.booksBody}</p>
              </div>
            </div>

            <ReadContinue />
            <section className="read-companion-section" aria-labelledby="read-companion-title">
              <div className="read-section-header">
                <p className="eyebrow">{copy.companionEyebrow}</p>
                <h2 id="read-companion-title" className="mt-2 font-display text-3xl leading-none text-ink dark:text-dark-text">
                  {copy.companionTitle}
                </h2>
                <p className="read-section-copy mt-2 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/76">
                  {copy.companionBody}
                </p>
              </div>

              <div className="mt-4 grid gap-3">
                <Link
                  to="/banis/rehat"
                  state={{ readerOrigin: readSearchOrigin }}
                  id="read-rehat"
                  className="read-extra-source-card flex w-full items-center justify-between gap-4 rounded-lg border border-sand/15 bg-parchment-low p-4 text-left shadow-card transition-colors duration-300 active:scale-[0.99] dark:border-dark-text/10 dark:bg-dark-surface"
                  data-testid="banis-open-rehat"
                >
                  <span className="min-w-0">
                    <span className="font-sans font-semibold text-base text-ink dark:text-dark-text">{copy.rehatTitle}</span>
                    <span className="read-extra-source-card__body mt-1 block font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/82">
                      {copy.rehatBody}
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
              aria-labelledby="read-books-browser-title"
              data-testid="read-books-browser"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="read-books-browser-title" className="mt-2 font-display text-3xl leading-none text-ink dark:text-dark-text">
                    {copy.booksCatalogTitle}
                  </h2>
                  <p className="read-section-copy mt-2 max-w-[34ch] font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/76">
                    {copy.booksCatalogBody}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <LibraryBookBrowser dataTestId="read-books-browser-shared" />
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  )
}
