import { useState, useCallback, useRef, useEffect, useMemo, type ImgHTMLAttributes, type ReactNode } from 'react'
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
  READ_BANIDB_CATALOG_COUNT,
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
import { useLocaleStore } from '../store/locale'
import { buildNitnemStudyPath, NITNEM_ROUTE_OPTIONS } from '../store/nitnem'
import type { AsyncIssueCode, SearchMode, UiLocale } from '../types'
import { buildCanonicalBaniStudyPath } from '../utils/baniRouteResolver'
import {
  SUNDAR_GUTKA_SUPPORTED_BANIS,
  isSundarGutkaLengthSupportedBaniId,
} from '../utils/sundarGutkaLength'
import { getSourceReaderUnit, SOURCE_READER_META } from '../utils/sourceReaderMeta'
import { getSearchModeLabels } from '../utils/translations'
import { IconArrowRight, IconSearch, IconChevronUp, IconChevronDown, IconLibrary, IconBookmark, IconBookmarkFilled, IconMusic } from '../components/icons'
import SearchHighlight from '../components/SearchHighlight'
import ScriptureSourceBrowser from '../components/ScriptureSourceBrowser'
import LibraryBookBrowser from '../components/LibraryBookBrowser'
import { hasSearchMatch } from '../utils/searchHighlight'
import {
  getAngTargets,
  getAvailableSearchMeta,
  getLibrarySearchMatches,
  groupSearchResults,
  isDirectLookupQuery,
  SEARCH_SOURCE_LABELS,
  type AppSearchMatch,
  type GroupedSearchResult,
  type SearchSource,
} from '../utils/appSearch'
import { buildReadSearchPath } from '../utils/searchRoutes'
import {
  buildCurrentAppPath,
  buildReaderOriginNavigationState,
} from '../utils/libraryReaderNavigation'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import {
  getAppScrollTop,
  getAppViewportBounds,
  scrollAppTo,
} from '../utils/appScroll'
import { getSearchRevealScrollTop } from '../utils/searchReveal'
import {
  ARDAAS_HUKAMNAMA_EDITORIAL_COPY,
  getReaderEditorialCopyForBani,
} from '../content/readerEditorialCopy'
import readHarmandirSrc from '../assets/living-library/read-harmandir.jpeg'
import banisGuruNanakSrc from '../assets/living-library/banis-guru-nanak.jpeg'
import booksCourtSrc from '../assets/living-library/books-court.jpeg'

type Scripture = 'SGGS' | 'DG'
type ReadCollection = 'banis' | 'sources' | 'books'
type ExactBani = Bani & { baniDbId: number }

const READ_COLLECTIONS: ReadCollection[] = ['banis', 'sources', 'books']
const READ_SOURCE_SECTION_IDS = ['sggs', 'dasam-granth', 'bhai-gurdas-vaaran']

type ReadPageCopy = {
  title: string
  heroEyebrow: string
  heroBody: string
  collectionsLabel: string
  tabs: Record<ReadCollection, string>
  find: string
  searchTitle: string
  searchLabel: string
  searchPlaceholder: string
  refine: string
  simplify: string
  autoDetect: string
  directOpen: string
  searching: string
  ready: string
  inApp: string
  exactFirst: string
  libraryMatches: string
  gurbaniMatches: string
  result: string
  results: string
  directDestination: string
  directDestinations: string
  partialSearch: string
  allSources: string
  openDirectTarget: (label: string, unit: string, value: string) => string
  directLookupBody: string
  noDirectTarget: string
  matchedFor: string
  meaning: string
  allRaags: string
  allWriters: string
  unitLabels: Record<'Ang' | 'Vaar' | 'Page', string>
  matchCount: (count: number) => string
  libraryWorkDetail: (chapterCount: number) => string
  libraryChapterDetail: (shortTitle: string, volume: number, episodeNumber?: number) => string
  showingResults: (visible: number, total: number) => string
  showMoreResults: string
  noFilteredResults: string
  clearFilters: string
  noResultsTitle: string
  noResultsBody: string
  tryExamples: string
  clearSearch: string
  recent: string
  clear: string
  searchResultsAbove: string
  featuredFlowEyebrow: string
  featuredFlowChip: string
  featuredFlowTitle: string
  featuredFlowBody: string
  beginFlow: string
  banisEyebrow: string
  banisTitle: string
  banisBody: string
  sourcesEyebrow: string
  sourcesTitle: string
  sourcesBody: string
  sourceCatalogEyebrow: string
  sourceCatalogTitle: string
  sourceCatalogBody: string
  companionEyebrow: string
  companionTitle: string
  companionBody: string
  rehatTitle: string
  rehatBody: string
  booksEyebrow: string
  booksTitle: string
  booksBody: string
  booksCatalogEyebrow: string
  booksCatalogTitle: string
  booksCatalogBody: string
  directoryEyebrow: string
  directoryTitle: string
  directoryBody: string
  sundarGroups: { nitnem: string; popular: string; other: string }
  completeVaars: string
  chooseVaar: string
  amritTitle: string
  amritBody: string
  pin: string
  unpin: string
  browse: string
  indexLoading: string
  indexOffline: string
  indexError: string
  indexEmpty: string
  retry: string
  countLoading: string
  countUnavailable: string
  baniSingular: string
  baniPlural: string
  artworkUnavailable: string
  artworkDescriptions: {
    harmandir: string
    guruNanak: string
    court: string
  }
}

const READ_PAGE_COPY: Record<UiLocale, ReadPageCopy> = {
  en: {
    title: 'Read',
    heroEyebrow: 'NaamRas library',
    heroBody: 'Gurbani, daily banis, source editions, and books.',
    collectionsLabel: 'Read collections',
    tabs: { banis: 'Banis', sources: 'Sources', books: 'Books' },
    find: 'Find',
    searchTitle: 'Search Gurbani and the library',
    searchLabel: 'Search Gurbani, meanings, or direct routes',
    searchPlaceholder: 'Search Gurbani, first letters, transliteration, or meaning',
    refine: 'Refine search',
    simplify: 'Simplify',
    autoDetect: 'Auto detect',
    directOpen: 'Direct open',
    searching: 'Searching',
    ready: 'Ready',
    inApp: 'In the app',
    exactFirst: 'Exact destinations first',
    libraryMatches: 'From the library',
    gurbaniMatches: 'Gurbani matches',
    result: 'result found',
    results: 'results found',
    directDestination: 'direct reading destination available',
    directDestinations: 'direct reading destinations available',
    partialSearch: 'Some sources could not be searched. Showing the results that are available.',
    allSources: 'All',
    openDirectTarget: (label, unit, value) => `Open ${label} ${unit} ${value}`,
    directLookupBody: 'Direct source lookup without running a word search.',
    noDirectTarget: 'No matching source can open that ang or Vaar.',
    matchedFor: 'Matched for',
    meaning: 'Meaning',
    allRaags: 'All Raags',
    allWriters: 'All Writers',
    unitLabels: { Ang: 'Ang', Vaar: 'Vaar', Page: 'Page' },
    matchCount: count => `${count} ${count === 1 ? 'match' : 'matches'}`,
    libraryWorkDetail: chapterCount => `Book · ${chapterCount} chapters`,
    libraryChapterDetail: (shortTitle, volume, episodeNumber) => `${shortTitle} · Volume ${volume}${episodeNumber ? ` · Episode ${episodeNumber}` : ''}`,
    showingResults: (visible, total) => `Showing ${visible} of ${total} Gurbani matches.`,
    showMoreResults: 'Show more matches',
    noFilteredResults: 'No matches use both of these filters.',
    clearFilters: 'Clear filters',
    noResultsTitle: 'No matches yet',
    noResultsBody: 'Try a full bani name, a Gurmukhi phrase, or a simpler spelling.',
    tryExamples: 'Try an example',
    clearSearch: 'Clear search',
    recent: 'Recent',
    clear: 'Clear',
    searchResultsAbove: 'Search results are shown above.',
    featuredFlowEyebrow: 'Featured flow',
    featuredFlowChip: 'Devotional flow',
    featuredFlowTitle: 'Ardaas + Hukamnama',
    featuredFlowBody: ARDAAS_HUKAMNAMA_EDITORIAL_COPY.dek,
    beginFlow: 'Begin devotional flow',
    banisEyebrow: 'Daily practice',
    banisTitle: 'Banis for every part of the day',
    banisBody: 'Morning, evening, and complete daily readings.',
    sourcesEyebrow: 'Scripture sources',
    sourcesTitle: 'Open each source in its own structure',
    sourcesBody: 'Browse scripture by Ang and Bhai Gurdas Ji Vaaran by Vaar.',
    sourceCatalogEyebrow: 'Source editions',
    sourceCatalogTitle: 'Scripture source browser',
    sourceCatalogBody: 'Open scripture by Ang or choose a Vaar directly.',
    companionEyebrow: 'Companion reader',
    companionTitle: 'Guidance and practice',
    companionBody: 'Read Rehat through its complete chapter index.',
    rehatTitle: 'Rehat',
    rehatBody: 'Conduct, practice, and chapter-level reading.',
    booksEyebrow: 'Books',
    booksTitle: 'History and memory in longer form',
    booksBody: 'Open chapter-based works without mixing them into scripture sources.',
    booksCatalogEyebrow: 'Book collection',
    booksCatalogTitle: 'Historical books',
    booksCatalogBody: 'Browse available volumes, chapters, and full-text search.',
    directoryEyebrow: 'Browse',
    directoryTitle: 'Bani directories',
    directoryBody: 'Daily prayers, complete scripture collections, Vaaran, and kirtan.',
    sundarGroups: { nitnem: 'Nitnem', popular: 'Popular Bani', other: 'Other' },
    completeVaars: 'complete Vaars',
    chooseVaar: 'Choose a Vaar to open its complete sequence of Pauris.',
    amritTitle: 'Amrit Keertan',
    amritBody: 'Browse the complete section index',
    pin: 'Pin',
    unpin: 'Unpin',
    browse: 'Read',
    indexLoading: 'Loading the Sundar Gutka index…',
    indexOffline: 'The Sundar Gutka index is offline. Check your connection, then try again.',
    indexError: 'The Sundar Gutka index is unavailable right now. Try again shortly.',
    indexEmpty: 'No Sundar Gutka entries are available right now.',
    retry: 'Retry',
    countLoading: 'Loading',
    countUnavailable: 'Unavailable',
    baniSingular: 'bani',
    baniPlural: 'banis',
    artworkUnavailable: 'Artwork unavailable',
    artworkDescriptions: {
      harmandir: 'Painted view of a gold-domed shrine beside a sarovar and surrounding buildings.',
      guruNanak: 'Painted gathering beneath a flowering border, with seated and standing figures.',
      court: 'Painted historical court gathering in an architectural courtyard.',
    },
  },
  pa: {
    title: 'ਪੜ੍ਹੋ',
    heroEyebrow: 'ਨਾਮਰਸ ਲਾਇਬ੍ਰੇਰੀ',
    heroBody: 'ਗੁਰਬਾਣੀ, ਰੋਜ਼ਾਨਾ ਬਾਣੀਆਂ, ਮੂਲ ਸਰੋਤ ਅਤੇ ਕਿਤਾਬਾਂ।',
    collectionsLabel: 'ਪੜ੍ਹਨ ਦੀਆਂ ਸ਼੍ਰੇਣੀਆਂ',
    tabs: { banis: 'ਬਾਣੀਆਂ', sources: 'ਸਰੋਤ', books: 'ਕਿਤਾਬਾਂ' },
    find: 'ਖੋਜੋ',
    searchTitle: 'ਗੁਰਬਾਣੀ ਅਤੇ ਲਾਇਬ੍ਰੇਰੀ ਖੋਜੋ',
    searchLabel: 'ਗੁਰਬਾਣੀ, ਅਰਥ ਜਾਂ ਸਿੱਧੇ ਰਸਤੇ ਖੋਜੋ',
    searchPlaceholder: 'ਗੁਰਬਾਣੀ, ਪਹਿਲੇ ਅੱਖਰ, ਲਿਪਾਂਤਰ ਜਾਂ ਅਰਥ ਖੋਜੋ',
    refine: 'ਖੋਜ ਸੁਧਾਰੋ',
    simplify: 'ਸਧਾਰਨ ਕਰੋ',
    autoDetect: 'ਆਪਣੇ ਆਪ ਪਛਾਣ',
    directOpen: 'ਸਿੱਧਾ ਖੋਲ੍ਹੋ',
    searching: 'ਖੋਜ ਜਾਰੀ ਹੈ',
    ready: 'ਤਿਆਰ',
    inApp: 'ਐਪ ਵਿੱਚ',
    exactFirst: 'ਸਿੱਧੇ ਰਸਤੇ ਪਹਿਲਾਂ',
    libraryMatches: 'ਲਾਇਬ੍ਰੇਰੀ ਵਿੱਚੋਂ',
    gurbaniMatches: 'ਗੁਰਬਾਣੀ ਮੇਲ',
    result: 'ਨਤੀਜਾ ਮਿਲਿਆ',
    results: 'ਨਤੀਜੇ ਮਿਲੇ',
    directDestination: 'ਸਿੱਧਾ ਪੜ੍ਹਨ ਵਾਲਾ ਰਸਤਾ ਉਪਲਬਧ',
    directDestinations: 'ਸਿੱਧੇ ਪੜ੍ਹਨ ਵਾਲੇ ਰਸਤੇ ਉਪਲਬਧ',
    partialSearch: 'ਕੁਝ ਸਰੋਤ ਖੋਜੇ ਨਹੀਂ ਜਾ ਸਕੇ। ਉਪਲਬਧ ਨਤੀਜੇ ਦਿਖਾਏ ਜਾ ਰਹੇ ਹਨ।',
    allSources: 'ਸਾਰੇ',
    openDirectTarget: (label, unit, value) => `${label} ${unit} ${value} ਖੋਲ੍ਹੋ`,
    directLookupBody: 'ਸ਼ਬਦ ਖੋਜ ਚਲਾਏ ਬਿਨਾਂ ਸਰੋਤ ਸਿੱਧਾ ਖੋਲ੍ਹੋ।',
    noDirectTarget: 'ਕੋਈ ਮੇਲ ਖਾਂਦਾ ਸਰੋਤ ਉਹ ਅੰਗ ਜਾਂ ਵਾਰ ਨਹੀਂ ਖੋਲ੍ਹ ਸਕਦਾ।',
    matchedFor: 'ਇਸ ਲਈ ਮੇਲ',
    meaning: 'ਅਰਥ',
    allRaags: 'ਸਾਰੇ ਰਾਗ',
    allWriters: 'ਸਾਰੇ ਰਚਨਾਕਾਰ',
    unitLabels: { Ang: 'ਅੰਗ', Vaar: 'ਵਾਰ', Page: 'ਸਫ਼ਾ' },
    matchCount: count => `${count} ਮੇਲ`,
    libraryWorkDetail: chapterCount => `ਕਿਤਾਬ · ${chapterCount} ਅਧਿਆਇ`,
    libraryChapterDetail: (shortTitle, volume, episodeNumber) => `${shortTitle} · ਜਿਲਦ ${volume}${episodeNumber ? ` · ਕੜੀ ${episodeNumber}` : ''}`,
    showingResults: (visible, total) => `${total} ਵਿੱਚੋਂ ${visible} ਗੁਰਬਾਣੀ ਮੇਲ ਦਿਖਾਏ ਜਾ ਰਹੇ ਹਨ।`,
    showMoreResults: 'ਹੋਰ ਮੇਲ ਦਿਖਾਓ',
    noFilteredResults: 'ਇਹਨਾਂ ਦੋਵੇਂ ਫਿਲਟਰਾਂ ਨਾਲ ਕੋਈ ਮੇਲ ਨਹੀਂ ਹੈ।',
    clearFilters: 'ਫਿਲਟਰ ਸਾਫ਼ ਕਰੋ',
    noResultsTitle: 'ਹਾਲੇ ਕੋਈ ਮੇਲ ਨਹੀਂ',
    noResultsBody: 'ਪੂਰਾ ਬਾਣੀ ਨਾਮ, ਗੁਰਮੁਖੀ ਵਾਕ ਜਾਂ ਸਧਾਰਨ ਲਿਖਤ ਅਜ਼ਮਾਓ।',
    tryExamples: 'ਉਦਾਹਰਨ ਅਜ਼ਮਾਓ',
    clearSearch: 'ਖੋਜ ਸਾਫ਼ ਕਰੋ',
    recent: 'ਹਾਲੀਆ',
    clear: 'ਸਾਫ਼ ਕਰੋ',
    searchResultsAbove: 'ਖੋਜ ਨਤੀਜੇ ਉੱਪਰ ਦਿਖਾਏ ਗਏ ਹਨ।',
    featuredFlowEyebrow: 'ਖ਼ਾਸ ਪਾਠ-ਕ੍ਰਮ',
    featuredFlowChip: 'ਸ਼ਰਧਾ ਦਾ ਕ੍ਰਮ',
    featuredFlowTitle: 'ਅਰਦਾਸ + ਹੁਕਮਨਾਮਾ',
    featuredFlowBody: 'ਪਹਿਲਾਂ ਸਾਂਝੀ ਸਿੱਖ ਅਰਦਾਸ ਕਰੋ, ਫਿਰ ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ ਤੋਂ ਹੁਕਮਨਾਮਾ ਲੈ ਕੇ ਮਨਨ ਕਰੋ।',
    beginFlow: 'ਪਾਠ-ਕ੍ਰਮ ਸ਼ੁਰੂ ਕਰੋ',
    banisEyebrow: 'ਰੋਜ਼ਾਨਾ ਅਭਿਆਸ',
    banisTitle: 'ਦਿਨ ਦੇ ਹਰ ਵੇਲੇ ਲਈ ਬਾਣੀਆਂ',
    banisBody: 'ਸਵੇਰ, ਸ਼ਾਮ ਅਤੇ ਪੂਰੇ ਰੋਜ਼ਾਨਾ ਪਾਠ।',
    sourcesEyebrow: 'ਗੁਰਬਾਣੀ ਸਰੋਤ',
    sourcesTitle: 'ਹਰ ਸਰੋਤ ਨੂੰ ਉਸਦੀ ਆਪਣੀ ਬਣਤਰ ਵਿੱਚ ਖੋਲ੍ਹੋ',
    sourcesBody: 'ਗ੍ਰੰਥ ਅੰਗ ਅਨੁਸਾਰ ਅਤੇ ਭਾਈ ਗੁਰਦਾਸ ਜੀ ਦੀਆਂ ਵਾਰਾਂ ਵਾਰ ਅਨੁਸਾਰ ਖੋਲ੍ਹੋ।',
    sourceCatalogEyebrow: 'ਮੂਲ ਸਰੋਤ',
    sourceCatalogTitle: 'ਗੁਰਬਾਣੀ ਸਰੋਤ ਬ੍ਰਾਊਜ਼ਰ',
    sourceCatalogBody: 'ਅੰਗ ਜਾਂ ਵਾਰ ਚੁਣ ਕੇ ਸਿੱਧਾ ਪਾਠ ਖੋਲ੍ਹੋ।',
    companionEyebrow: 'ਸਹਾਇਕ ਪਾਠਕ',
    companionTitle: 'ਰਹਿਨੁਮਾਈ ਅਤੇ ਅਭਿਆਸ',
    companionBody: 'ਰਹਿਤ ਨੂੰ ਪੂਰੀ ਅਧਿਆਇ ਸੂਚੀ ਨਾਲ ਪੜ੍ਹੋ।',
    rehatTitle: 'ਰਹਿਤ',
    rehatBody: 'ਆਚਰਨ, ਅਭਿਆਸ ਅਤੇ ਅਧਿਆਇ ਅਨੁਸਾਰ ਪੜ੍ਹਾਈ।',
    booksEyebrow: 'ਕਿਤਾਬਾਂ',
    booksTitle: 'ਇਤਿਹਾਸ ਅਤੇ ਯਾਦ ਲੰਮੇ ਰੂਪ ਵਿੱਚ',
    booksBody: 'ਕਿਤਾਬਾਂ ਨੂੰ ਗੁਰਬਾਣੀ ਸਰੋਤਾਂ ਨਾਲ ਮਿਲਾਏ ਬਿਨਾਂ ਅਧਿਆਇ ਅਨੁਸਾਰ ਪੜ੍ਹੋ।',
    booksCatalogEyebrow: 'ਕਿਤਾਬ ਸੰਗ੍ਰਹਿ',
    booksCatalogTitle: 'ਇਤਿਹਾਸਕ ਕਿਤਾਬਾਂ',
    booksCatalogBody: 'ਉਪਲਬਧ ਜਿਲਦਾਂ, ਅਧਿਆਇ ਅਤੇ ਪੂਰੀ ਲਿਖਤ ਖੋਜੋ।',
    directoryEyebrow: 'ਵੇਖੋ',
    directoryTitle: 'ਬਾਣੀ ਸੂਚੀਆਂ',
    directoryBody: 'ਰੋਜ਼ਾਨਾ ਪਾਠ, ਪੂਰੇ ਗ੍ਰੰਥ ਸੰਗ੍ਰਹਿ, ਵਾਰਾਂ ਅਤੇ ਕੀਰਤਨ।',
    sundarGroups: { nitnem: 'ਨਿਤਨੇਮ', popular: 'ਪ੍ਰਸਿੱਧ ਬਾਣੀਆਂ', other: 'ਹੋਰ' },
    completeVaars: 'ਪੂਰੀਆਂ ਵਾਰਾਂ',
    chooseVaar: 'ਪਉੜੀਆਂ ਦਾ ਪੂਰਾ ਕ੍ਰਮ ਖੋਲ੍ਹਣ ਲਈ ਵਾਰ ਚੁਣੋ।',
    amritTitle: 'ਅੰਮ੍ਰਿਤ ਕੀਰਤਨ',
    amritBody: 'ਪੂਰੀ ਭਾਗ ਸੂਚੀ ਵੇਖੋ',
    pin: 'ਪਿੰਨ ਕਰੋ',
    unpin: 'ਪਿੰਨ ਹਟਾਓ',
    browse: 'ਪੜ੍ਹੋ',
    indexLoading: 'ਸੁੰਦਰ ਗੁਟਕਾ ਸੂਚੀ ਲੋਡ ਹੋ ਰਹੀ ਹੈ…',
    indexOffline: 'ਸੁੰਦਰ ਗੁਟਕਾ ਸੂਚੀ ਆਫ਼ਲਾਈਨ ਹੈ। ਕਨੈਕਸ਼ਨ ਵੇਖ ਕੇ ਫਿਰ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    indexError: 'ਸੁੰਦਰ ਗੁਟਕਾ ਸੂਚੀ ਹੁਣ ਉਪਲਬਧ ਨਹੀਂ ਹੈ। ਥੋੜ੍ਹੀ ਦੇਰ ਬਾਅਦ ਫਿਰ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    indexEmpty: 'ਇਸ ਵੇਲੇ ਸੁੰਦਰ ਗੁਟਕਾ ਦੀ ਕੋਈ ਐਂਟਰੀ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।',
    retry: 'ਫਿਰ ਕੋਸ਼ਿਸ਼ ਕਰੋ',
    countLoading: 'ਲੋਡ ਹੋ ਰਿਹਾ',
    countUnavailable: 'ਉਪਲਬਧ ਨਹੀਂ',
    baniSingular: 'ਬਾਣੀ',
    baniPlural: 'ਬਾਣੀਆਂ',
    artworkUnavailable: 'ਚਿੱਤਰ ਉਪਲਬਧ ਨਹੀਂ',
    artworkDescriptions: {
      harmandir: 'ਸਰੋਵਰ ਅਤੇ ਆਲੇ-ਦੁਆਲੇ ਦੀਆਂ ਇਮਾਰਤਾਂ ਕੋਲ ਸੁਨਹਿਰੀ ਗੁੰਬਦ ਵਾਲੇ ਧਾਰਮਿਕ ਅਸਥਾਨ ਦਾ ਚਿੱਤਰ।',
      guruNanak: 'ਫੁੱਲਦਾਰ ਹਾਸ਼ੀਏ ਹੇਠ ਬੈਠੀਆਂ ਅਤੇ ਖੜ੍ਹੀਆਂ ਸ਼ਖਸੀਅਤਾਂ ਦੀ ਚਿੱਤਰਿਤ ਸਭਾ।',
      court: 'ਇਮਾਰਤੀ ਵਿਹੜੇ ਵਿੱਚ ਇਤਿਹਾਸਕ ਦਰਬਾਰੀ ਸਭਾ ਦਾ ਚਿੱਤਰ।',
    },
  },
  hi: {
    title: 'पढ़ें',
    heroEyebrow: 'नामरस लाइब्रेरी',
    heroBody: 'गुरबाणी, दैनिक बाणियाँ, मूल स्रोत और किताबें।',
    collectionsLabel: 'पढ़ने की श्रेणियाँ',
    tabs: { banis: 'बाणियाँ', sources: 'स्रोत', books: 'किताबें' },
    find: 'खोजें',
    searchTitle: 'गुरबाणी और लाइब्रेरी खोजें',
    searchLabel: 'गुरबाणी, अर्थ या सीधे रास्ते खोजें',
    searchPlaceholder: 'गुरबाणी, पहले अक्षर, लिप्यंतरण या अर्थ खोजें',
    refine: 'खोज सुधारें',
    simplify: 'सरल करें',
    autoDetect: 'अपने आप पहचानें',
    directOpen: 'सीधे खोलें',
    searching: 'खोज जारी है',
    ready: 'तैयार',
    inApp: 'ऐप में',
    exactFirst: 'सीधे रास्ते पहले',
    libraryMatches: 'लाइब्रेरी से',
    gurbaniMatches: 'गुरबाणी मिलान',
    result: 'नतीजा मिला',
    results: 'नतीजे मिले',
    directDestination: 'सीधा पढ़ने का रास्ता उपलब्ध',
    directDestinations: 'सीधे पढ़ने के रास्ते उपलब्ध',
    partialSearch: 'कुछ स्रोत खोजे नहीं जा सके। उपलब्ध नतीजे दिखाए जा रहे हैं।',
    allSources: 'सभी',
    openDirectTarget: (label, unit, value) => `${label} ${unit} ${value} खोलें`,
    directLookupBody: 'शब्द खोज चलाए बिना स्रोत सीधे खोलें।',
    noDirectTarget: 'कोई मिलता स्रोत उस अंग या वार को नहीं खोल सकता।',
    matchedFor: 'इसके लिए मिलान',
    meaning: 'अर्थ',
    allRaags: 'सभी राग',
    allWriters: 'सभी रचनाकार',
    unitLabels: { Ang: 'अंग', Vaar: 'वार', Page: 'पृष्ठ' },
    matchCount: count => `${count} मिलान`,
    libraryWorkDetail: chapterCount => `किताब · ${chapterCount} अध्याय`,
    libraryChapterDetail: (shortTitle, volume, episodeNumber) => `${shortTitle} · खंड ${volume}${episodeNumber ? ` · कड़ी ${episodeNumber}` : ''}`,
    showingResults: (visible, total) => `${total} में से ${visible} गुरबाणी मिलान दिखाए जा रहे हैं।`,
    showMoreResults: 'और मिलान दिखाएँ',
    noFilteredResults: 'इन दोनों फ़िल्टरों के साथ कोई मिलान नहीं है।',
    clearFilters: 'फ़िल्टर साफ़ करें',
    noResultsTitle: 'अभी कोई मिलान नहीं',
    noResultsBody: 'पूरा बाणी नाम, गुरमुखी वाक्य या सरल वर्तनी आज़माएँ।',
    tryExamples: 'उदाहरण आज़माएँ',
    clearSearch: 'खोज साफ़ करें',
    recent: 'हाल की खोजें',
    clear: 'साफ़ करें',
    searchResultsAbove: 'खोज के नतीजे ऊपर दिखाए गए हैं।',
    featuredFlowEyebrow: 'विशेष पाठ-क्रम',
    featuredFlowChip: 'श्रद्धा का क्रम',
    featuredFlowTitle: 'अरदास + हुकमनामा',
    featuredFlowBody: 'पहले सामूहिक सिख अरदास करें, फिर श्री गुरु ग्रंथ साहिब जी से हुकमनामा लेकर मनन करें।',
    beginFlow: 'पाठ-क्रम शुरू करें',
    banisEyebrow: 'दैनिक अभ्यास',
    banisTitle: 'दिन के हर समय के लिए बाणियाँ',
    banisBody: 'सुबह, शाम और पूरे दैनिक पाठ।',
    sourcesEyebrow: 'गुरबाणी स्रोत',
    sourcesTitle: 'हर स्रोत को उसकी अपनी रचना में खोलें',
    sourcesBody: 'ग्रंथ को अंग और भाई गुरदास जी की वारों को वार के अनुसार खोलें।',
    sourceCatalogEyebrow: 'मूल स्रोत',
    sourceCatalogTitle: 'गुरबाणी स्रोत ब्राउज़र',
    sourceCatalogBody: 'अंग या वार चुनकर सीधे पाठ खोलें।',
    companionEyebrow: 'सहायक पाठक',
    companionTitle: 'मार्गदर्शन और अभ्यास',
    companionBody: 'रहत को पूरी अध्याय सूची के साथ पढ़ें।',
    rehatTitle: 'रहत',
    rehatBody: 'आचरण, अभ्यास और अध्याय के अनुसार पढ़ना।',
    booksEyebrow: 'किताबें',
    booksTitle: 'इतिहास और स्मृति लंबे रूप में',
    booksBody: 'किताबों को गुरबाणी स्रोतों में मिलाए बिना अध्याय के अनुसार पढ़ें।',
    booksCatalogEyebrow: 'किताब संग्रह',
    booksCatalogTitle: 'ऐतिहासिक किताबें',
    booksCatalogBody: 'उपलब्ध खंड, अध्याय और पूरी किताब में खोजें।',
    directoryEyebrow: 'देखें',
    directoryTitle: 'बाणी सूचियाँ',
    directoryBody: 'दैनिक पाठ, पूरे ग्रंथ संग्रह, वारें और कीर्तन।',
    sundarGroups: { nitnem: 'नितनेम', popular: 'लोकप्रिय बाणियाँ', other: 'अन्य' },
    completeVaars: 'पूरी वारें',
    chooseVaar: 'पउड़ियों का पूरा क्रम खोलने के लिए वार चुनें।',
    amritTitle: 'अमृत कीर्तन',
    amritBody: 'पूरी अनुभाग सूची देखें',
    pin: 'पिन करें',
    unpin: 'पिन हटाएँ',
    browse: 'पढ़ें',
    indexLoading: 'सुंदर गुटका सूची लोड हो रही है…',
    indexOffline: 'सुंदर गुटका सूची ऑफ़लाइन है। कनेक्शन जाँचकर फिर कोशिश करें।',
    indexError: 'सुंदर गुटका सूची अभी उपलब्ध नहीं है। थोड़ी देर बाद फिर कोशिश करें।',
    indexEmpty: 'अभी सुंदर गुटका की कोई प्रविष्टि उपलब्ध नहीं है।',
    retry: 'फिर कोशिश करें',
    countLoading: 'लोड हो रहा',
    countUnavailable: 'उपलब्ध नहीं',
    baniSingular: 'बाणी',
    baniPlural: 'बाणियाँ',
    artworkUnavailable: 'चित्र उपलब्ध नहीं',
    artworkDescriptions: {
      harmandir: 'सरोवर और आसपास की इमारतों के पास सुनहरे गुंबद वाले धार्मिक स्थल का चित्र।',
      guruNanak: 'फूलों की सीमा के नीचे बैठी और खड़ी आकृतियों की चित्रित सभा।',
      court: 'स्थापत्य आँगन में ऐतिहासिक दरबारी सभा का चित्र।',
    },
  },
}

function isExactBani(bani: Bani): bani is ExactBani {
  return typeof bani.baniDbId === 'number'
}
interface ResolvedRouteOption {
  key: string
  label: string
  path: string
  detail?: string
}

const SCRIPTURE_META: Record<Scripture, { label: string; icon: ReactNode; categoryOrder: readonly string[] }> = {
  SGGS: { label: SOURCE_READER_META.G.name, icon: <IconLibrary size={18} />, categoryOrder: SGGS_CATEGORY_ORDER },
  DG: { label: SOURCE_READER_META.D.name, icon: <IconLibrary size={18} />, categoryOrder: DG_CATEGORY_ORDER },
}

const SEARCH_MODE_META: Record<SearchMode, { type: number; placeholder: string; minLength: number }> = {
  'first-letters': { type: 0, placeholder: 'First letters in Gurmukhi', minLength: 2 },
  'first-letters-anywhere': { type: 1, placeholder: 'First letters in any line', minLength: 2 },
  gurmukhi: { type: 2, placeholder: 'Full Gurbani words', minLength: 2 },
  english: { type: 3, placeholder: 'English meanings', minLength: 2 },
  transliteration: { type: 4, placeholder: 'Transliteration', minLength: 2 },
  ang: { type: -1, placeholder: 'Open an ang or Vaar', minLength: 1 },
  'auto-detect': { type: 8, placeholder: 'Gurbani or ang', minLength: 2 },
}
const READ_SEARCH_EXAMPLES = ['Japji Sahib', 'ਵਾਹਿਗੁਰੂ', 'hukam']
const SEARCH_RESULTS_PAGE_SIZE = 12
const GURMUKHI_SEARCH_PATTERN = /[\u0A00-\u0A7F]/
const LATIN_SEARCH_PATTERN = /[A-Za-z]/

function isDirectSearch(query: string, mode: SearchMode) {
  return mode === 'ang' || (mode === 'auto-detect' && isDirectLookupQuery(query))
}

function getSearchMinimumLength(query: string, mode: SearchMode) {
  return isDirectSearch(query, mode) ? 1 : SEARCH_MODE_META[mode].minLength
}

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

function normalizeSearchMatchText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function refineLatinSearchResults(results: SearchResult[], query: string, mode: SearchMode) {
  const shouldRefine = (
    mode === 'english'
    || (
      mode === 'auto-detect'
      && LATIN_SEARCH_PATTERN.test(query)
      && !GURMUKHI_SEARCH_PATTERN.test(query)
    )
  )
  if (!shouldRefine) return results

  const normalizedQuery = normalizeSearchMatchText(query)
  if (!normalizedQuery) return results

  const meaningMatches = results.filter(result => (
    normalizeSearchMatchText(result.translation_en).includes(normalizedQuery)
  ))
  const transliterationMatches = results.filter(result => (
    normalizeSearchMatchText(result.transliteration).includes(normalizedQuery)
  ))

  if (meaningMatches.length === 0 && transliterationMatches.length === 0) {
    return results
  }

  const exactMatches = new Map<string, SearchResult>()
  for (const result of [...meaningMatches, ...transliterationMatches]) {
    exactMatches.set(`${result.source}-${result.shabadId}-${result.verseId}`, result)
  }
  return Array.from(exactMatches.values())
}

function isSearchModeParam(value: string | null): value is SearchMode {
  return value !== null && value in SEARCH_MODE_META
}

function isSearchSourceParam(value: string | null): value is SearchSource {
  return value !== null && value in SEARCH_SOURCE_LABELS
}

function isReadCollectionParam(value: string | null): value is ReadCollection {
  return value !== null && READ_COLLECTIONS.includes(value as ReadCollection)
}

const CANONICAL_SUNDAR_GUTKA_BANI_IDS = new Set<string>(READ_DIRECTORY_SUNDAR_GUTKA_BANI_IDS)
const NITNEM_SUNDAR_GUTKA_BANIDB_IDS = new Set([2, 4, 6, 9, 10, 20, 21, 23])
const POPULAR_SUNDAR_GUTKA_BANIDB_IDS = new Set([90, 30, 31, 22])
const STANDALONE_BANIDB_NAMES = new Map([[24, 'Ardaas']])

const CANONICAL_BANI_BY_ID = new Map(BANIS.map(bani => [bani.id, bani]))
const EXACT_BANI_BY_BANIDB_ID = new Map(
  [READ_EXACT_SGGS_BANIS, READ_EXACT_DG_BANIS]
    .flat()
    .filter(isExactBani)
    .map(bani => [bani.baniDbId, bani])
)
const DIRECTORY_BANIS_BY_SCRIPTURE = {
  SGGS: READ_DIRECTORY_SGGS_BANIS,
  DG: READ_DIRECTORY_DG_BANIS,
} satisfies Record<Scripture, Bani[]>

const BHAI_GURDAS_VAARS = Array.from(
  { length: SOURCE_READER_META.B.max },
  (_, index) => index + 1
)

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

function getBaniRowLabel(bani: Bani) {
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
  const exactBani = EXACT_BANI_BY_BANIDB_ID.get(item.id)

  return {
    label: item.gurmukhi,
    detail: canonicalBani?.name ?? exactBani?.name ?? STANDALONE_BANIDB_NAMES.get(item.id) ?? item.transliteration,
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
      className="read-index-row w-full text-left active:scale-[0.99] transition-transform duration-150"
    >
      <p lang={labelLang} className={`read-index-row__title ${labelClassName ?? 'font-sans text-sm text-ink dark:text-dark-text'}`}>
        {label}
      </p>
      {detail ? (
        <p className={`read-index-row__detail ${detailClassName ?? 'font-sans text-xs text-gold-dark dark:text-gold-light mt-0.5'}`}>
          {detail}
        </p>
      ) : null}
      {supplementalDetail ? (
        <p className={`read-index-row__detail ${supplementalDetailClassName ?? 'font-sans text-xs leading-5 text-ink/68 dark:text-dark-text/70 mt-1'}`}>
          {supplementalDetail}
        </p>
      ) : null}
    </button>
  )
}

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
  const className = 'rounded-full bg-gold/10 dark:bg-gold/10 border border-gold/15 dark:border-gold/20 px-2 py-1 font-sans text-[10px] text-gold-dark dark:text-gold-light'

  if (!onClick) {
    return <span className={className}>{children}</span>
  }

  return (
    <button type="button" onClick={onClick} className={`${className} transition-colors duration-300 hover:bg-gold/15`}>
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

function AppSearchResultGroup({
  matches,
  query,
  groupLabel,
  groupHint,
  testId,
  aiResultGroup,
  resultAnchor,
  className,
  copy,
  searchMode,
  searchSource,
  addRecent,
  openSearchDestination,
}: {
  matches: AppSearchMatch[]
  query: string
  groupLabel: string
  groupHint?: string
  testId: string
  aiResultGroup: string
  resultAnchor: boolean
  className: string
  copy: ReadPageCopy
  searchMode: SearchMode
  searchSource: SearchSource
  addRecent: (query: string, mode: SearchMode, source: SearchSource) => void
  openSearchDestination: (path: string) => void
}) {
  const trimmedQuery = query.trim()

  return (
    <div
      data-search-result-anchor={resultAnchor ? 'true' : undefined}
      className={`nav-safe-results space-y-2 ${className}`}
      data-testid={testId}
      data-ai-result-group={aiResultGroup}
    >
      <div className="flex items-center justify-between gap-3 px-1">
        <h3 className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/75 dark:text-dark-text/76">
          {groupLabel}
        </h3>
        {groupHint ? (
          <p className="font-sans text-[11px] text-ink/68 dark:text-dark-text/64">
            {groupHint}
          </p>
        ) : null}
      </div>
      {matches.map(match => {
        const matchDetail = match.kind === 'library-work' && match.library
          ? copy.libraryWorkDetail(match.library.chapterCount ?? 0)
          : match.kind === 'library-chapter' && match.library
            ? copy.libraryChapterDetail(
                match.library.shortTitle,
                match.library.volume ?? 1,
                match.library.episodeNumber
              )
            : match.detail
        const showMatchedQuery = trimmedQuery.length >= 2
          && !hasSearchMatch(match.label, trimmedQuery)
          && !hasSearchMatch(matchDetail, trimmedQuery)
          && !hasSearchMatch(match.excerpt ?? '', trimmedQuery)

        return (
          <button
            key={match.key}
            onClick={() => {
              addRecent(trimmedQuery, searchMode, searchSource)
              openSearchDestination(match.path)
            }}
            className="w-full rounded-lg border border-saffron/20 bg-saffron/8 px-4 py-3 text-left transition-colors duration-300 active:scale-[0.99] dark:border-saffron/20 dark:bg-saffron/12"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">
                  <SearchHighlight text={match.label} query={trimmedQuery} />
                </p>
                <p className="mt-1 font-sans text-xs text-ink/68 dark:text-dark-text/64">
                  <SearchHighlight text={matchDetail} query={trimmedQuery} />
                </p>
                {match.excerpt ? (
                  <p className="mt-2 line-clamp-3 font-sans text-xs leading-5 text-ink/75 dark:text-dark-text/76">
                    <SearchHighlight text={match.excerpt} query={trimmedQuery} />
                  </p>
                ) : null}
                {showMatchedQuery ? (
                  <p className="mt-2 font-sans text-[11px] text-ink/68 dark:text-dark-text/64">
                    {copy.matchedFor} <SearchHighlight text={trimmedQuery} query={trimmedQuery} />
                  </p>
                ) : null}
              </div>
              <span className="chip-pill">{copy.browse}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default function Banis() {
  const scriptMode = useLanguageStore(state => state.scriptMode)
  const showTransliteration = useLanguageStore(state => state.showTransliteration)
  const meaningLanguage = useLanguageStore(state => state.meaningLanguage)
  const locale = useLocaleStore(state => state.locale)
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialModeParam = searchParams.get('mode')
  const initialSourceParam = searchParams.get('source')
  const collectionParam = searchParams.get('collection')
  const activeCollection: ReadCollection = isReadCollectionParam(collectionParam) ? collectionParam : 'banis'
  const copy = READ_PAGE_COPY[locale]
  const searchModeLabels = getSearchModeLabels(locale)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('query') ?? '')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [librarySearchResults, setLibrarySearchResults] = useState<AppSearchMatch[]>([])
  const [searching, setSearching] = useState(false)
  const [searchIssue, setSearchIssue] = useState<AsyncIssueCode | null>(null)
  const [searchPartialIssue, setSearchPartialIssue] = useState<AsyncIssueCode | null>(null)
  const [searchMode, setSearchMode] = useState<SearchMode>(() => (
    isSearchModeParam(initialModeParam) ? initialModeParam : 'auto-detect'
  ))
  const [searchSource, setSearchSource] = useState<SearchSource>(() => (
    isSearchSourceParam(initialSourceParam) ? initialSourceParam : 'all'
  ))
  const [raagFilter, setRaagFilter] = useState<string>('all')
  const [writerFilter, setWriterFilter] = useState<string>('all')
  const [visibleSearchResultCount, setVisibleSearchResultCount] = useState(SEARCH_RESULTS_PAGE_SIZE)
  const [sundarGutkaBanis, setSundarGutkaBanis] = useState<BaniIndexItem[]>([])
  const [loadingSundarGutka, setLoadingSundarGutka] = useState(true)
  const [sundarGutkaIssue, setSundarGutkaIssue] = useState<AsyncIssueCode | null>(null)
  const [sundarGutkaRequest, setSundarGutkaRequest] = useState(0)
  const toggle = (key: string) => setExpanded(e => ({ ...e, [key]: !e[key] }))
  const searchOptionsOpen = expanded['search-options'] ?? false

  const { recent, addRecent, togglePinned, clearRecent } = useRecentSearchStore()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchSequenceRef = useRef(0)
  const searchAbortRef = useRef<AbortController | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const searchCardRef = useRef<HTMLDivElement | null>(null)
  const searchLocationHydrationRef = useRef(false)
  const searchStateRef = useRef({
    query: searchQuery,
    mode: searchMode,
    source: searchSource,
  })
  searchStateRef.current = {
    query: searchQuery,
    mode: searchMode,
    source: searchSource,
  }

  const revealSearchFeedback = useCallback(() => {
    if (typeof window === 'undefined') return

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
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
    let cancelled = false

    setLoadingSundarGutka(true)
    setSundarGutkaIssue(null)
    fetchBanisIndex()
      .then(data => {
        if (!cancelled) {
          setSundarGutkaBanis(data)
          setSundarGutkaIssue(null)
        }
      })
      .catch(error => {
        if (!cancelled) {
          setSundarGutkaBanis([])
          setSundarGutkaIssue(resolveAsyncIssue(error).code)
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSundarGutka(false)
      })

    return () => {
      cancelled = true
    }
  }, [sundarGutkaRequest])

  useEffect(() => {
    return () => {
      searchSequenceRef.current += 1
      if (debounceRef.current) clearTimeout(debounceRef.current)
      searchAbortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const nextQuery = params.get('query') ?? ''
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
      searchAbortRef.current?.abort()
      searchAbortRef.current = null
      setSearchResults([])
      setLibrarySearchResults([])
      setSearching(false)
      setSearchIssue(null)
      setSearchPartialIssue(null)
    }

    setSearchQuery(current => current === nextQuery ? current : nextQuery)
    setSearchMode(current => current === nextMode ? current : nextMode)
    setSearchSource(current => current === nextSource ? current : nextSource)
  }, [location.search])

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
    const nextSearchParams = new URLSearchParams(searchPath.split('?')[1] ?? '')
    if (activeCollection !== 'banis') {
      nextSearchParams.set('collection', activeCollection)
    }
    const currentLocationParams = new URLSearchParams(location.search)
    for (const qaControl of ['qaFail', 'qaEmpty', 'qaSlow']) {
      const value = currentLocationParams.get(qaControl)
      if (value) nextSearchParams.set(qaControl, value)
    }

    const nextSearch = nextSearchParams.toString()
    const nextPath = `${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`
    const currentPath = `${location.pathname}${location.search}`

    if (nextPath === currentPath) return

    setSearchParams(new URLSearchParams(nextSearch), { replace: true })
  }, [activeCollection, location.pathname, location.search, searchMode, searchQuery, searchSource, setSearchParams])

  const selectCollection = useCallback((collection: ReadCollection) => {
    const nextSearchParams = new URLSearchParams(location.search)
    if (collection === 'banis') {
      nextSearchParams.delete('collection')
    } else {
      nextSearchParams.set('collection', collection)
    }
    setSearchParams(nextSearchParams, { replace: false })
  }, [location.search, setSearchParams])

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
    setSearchQuery(query)
    setRaagFilter('all')
    setWriterFilter('all')
    setVisibleSearchResultCount(SEARCH_RESULTS_PAGE_SIZE)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = query.trim()
    const directLookup = isDirectSearch(trimmed, mode)
    if (trimmed.length < getSearchMinimumLength(trimmed, mode)) {
      setSearchResults([])
      setLibrarySearchResults([])
      setSearching(false)
      setSearchIssue(null)
      setSearchPartialIssue(null)
      return
    }
    if (directLookup) {
      setSearchResults([])
      setLibrarySearchResults([])
      setSearching(false)
      setSearchIssue(null)
      setSearchPartialIssue(null)
      revealSearchFeedback()
      return
    }
    setSearchResults([])
    setLibrarySearchResults([])
    setSearching(true)
    setSearchIssue(null)
    setSearchPartialIssue(null)
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController()
      searchAbortRef.current = controller
      try {
        const shouldSearchLibrary = source === 'all'
          && (mode === 'auto-detect' || mode === 'english' || mode === 'transliteration')
        const settledResults = await Promise.allSettled(
          getBackendSearchTypes(trimmed, mode).map(searchType => (
            fetchSearch(trimmed, searchType, source, 'read-search', controller.signal)
          ))
        )
        const fulfilledResults = settledResults.filter(
          (result): result is PromiseFulfilledResult<SearchResult[]> => result.status === 'fulfilled'
        )
        const rejectedBackendResult = settledResults.find(
          (result): result is PromiseRejectedResult => result.status === 'rejected'
        )
        const resultSets = fulfilledResults.map(result => result.value)
        const results = refineLatinSearchResults(
          dedupeSearchResults(resultSets),
          trimmed,
          mode
        )
        if (searchSequenceRef.current !== requestSequence) return
        setSearchResults(results)
        if (results.length > 0) revealSearchFeedback()

        const settledLibrary = shouldSearchLibrary
          ? await getLibrarySearchMatches(trimmed).then(
              value => ({ status: 'fulfilled' as const, value }),
              reason => ({ status: 'rejected' as const, reason })
            )
          : null
        if (searchSequenceRef.current !== requestSequence) return

        const libraryResults = settledLibrary?.status === 'fulfilled' ? settledLibrary.value : []
        const partialFailure = rejectedBackendResult?.reason
          ?? (settledLibrary?.status === 'rejected' ? settledLibrary.reason : null)

        if (fulfilledResults.length === 0 && libraryResults.length === 0) {
          throw rejectedBackendResult?.reason
            ?? (settledLibrary?.status === 'rejected' ? settledLibrary.reason : null)
            ?? new Error('Read search unavailable')
        }

        setLibrarySearchResults(libraryResults)
        setSearchIssue(null)
        setSearchPartialIssue(partialFailure ? resolveAsyncIssue(partialFailure).code : null)
        addRecent(trimmed, mode, source)
      } catch (error) {
        if (searchSequenceRef.current !== requestSequence) return
        setSearchResults([])
        setLibrarySearchResults([])
        setSearchIssue(resolveAsyncIssue(error).code)
        setSearchPartialIssue(null)
      } finally {
        if (searchAbortRef.current === controller) {
          searchAbortRef.current = null
        }
        if (searchSequenceRef.current === requestSequence) {
          setSearching(false)
          revealSearchFeedback()
        }
      }
      }, 300)
    }, [addRecent, revealSearchFeedback, searchMode, searchSource])

  const clearSearch = useCallback(() => {
    handleSearch('', searchMode, searchSource)
    setSearchResults([])
    setLibrarySearchResults([])
    setSearchIssue(null)
    setSearchPartialIssue(null)
    globalThis.requestAnimationFrame(() => searchInputRef.current?.focus())
  }, [handleSearch, searchMode, searchSource])

  const trySearchExample = useCallback((example: string) => {
    setSearchMode('auto-detect')
    handleSearch(example, 'auto-detect', searchSource)
    globalThis.requestAnimationFrame(() => searchInputRef.current?.focus())
  }, [handleSearch, searchSource])

  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (trimmed.length >= getSearchMinimumLength(trimmed, searchMode)) {
      handleSearch(searchQuery, searchMode, searchSource)
    }
  }, [handleSearch, searchMode, searchSource, searchQuery])

  const readSearchOrigin = buildCurrentAppPath(location)
  const openSearchDestination = (path: string) => {
    navigate(path, {
      state: buildReaderOriginNavigationState(path, readSearchOrigin),
    })
  }

  const openSearchResult = (result: GroupedSearchResult) => {
    openSearchDestination(`/study?shabadId=${result.shabadId}&verseId=${result.verseId}`)
  }

  const openSundarGutkaBani = (item: BaniIndexItem) => {
    const canonicalBani = getCanonicalSundarGutkaBani(item)
    const exactBani = EXACT_BANI_BY_BANIDB_ID.get(item.id)
    const name = canonicalBani && isSundarGutkaLengthSupportedBaniId(canonicalBani.id)
      ? SUNDAR_GUTKA_SUPPORTED_BANIS[canonicalBani.id].name
      : canonicalBani?.name
        ?? exactBani?.name
        ?? STANDALONE_BANIDB_NAMES.get(item.id)
        ?? item.transliteration
        ?? item.gurmukhi

    if (canonicalBani) {
      navigate(buildCanonicalBaniStudyPath(canonicalBani, {
        baniDbId: item.id,
        baniId: canonicalBani.variantOf ?? canonicalBani.id,
        baniName: name,
      }))
      return
    }

    if (exactBani) {
      navigate(buildCanonicalBaniStudyPath(exactBani, {
        baniDbId: item.id,
        baniId: exactBani.variantOf ?? exactBani.id,
        baniName: name,
      }))
      return
    }

    navigate(`/study?baniDbId=${item.id}&bani=${encodeURIComponent(name)}`)
  }

  const sundarGutkaGroups = useMemo(() => {
    const nitnem = sundarGutkaBanis.filter(item => NITNEM_SUNDAR_GUTKA_BANIDB_IDS.has(item.id))
    const popular = sundarGutkaBanis.filter(item => POPULAR_SUNDAR_GUTKA_BANIDB_IDS.has(item.id))
    const other = sundarGutkaBanis.filter(item => (
      !NITNEM_SUNDAR_GUTKA_BANIDB_IDS.has(item.id)
      && !POPULAR_SUNDAR_GUTKA_BANIDB_IDS.has(item.id)
    ))

    return [
      { key: 'nitnem', label: copy.sundarGroups.nitnem, items: nitnem },
      { key: 'popular', label: copy.sundarGroups.popular, items: popular },
      { key: 'other', label: copy.sundarGroups.other, items: other },
    ].filter(group => group.items.length > 0)
  }, [copy.sundarGroups, sundarGutkaBanis])

  const scriptureGroups = useMemo(() => {
    return (Object.keys(SCRIPTURE_META) as Scripture[]).reduce<Record<Scripture, Array<{ category: string; items: Bani[] }>>>((groups, scripture) => {
      const items = DIRECTORY_BANIS_BY_SCRIPTURE[scripture]
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
  const visibleGroupedSearchResults = groupedSearchResults.slice(0, visibleSearchResultCount)
  const hasActiveMetadataFilters = raagFilter !== 'all' || writerFilter !== 'all'

  useEffect(() => {
    setVisibleSearchResultCount(SEARCH_RESULTS_PAGE_SIZE)
  }, [raagFilter, writerFilter])

  const { raags: availableRaags, writers: availableWriters } = useMemo(
    () => getAvailableSearchMeta(searchResults),
    [searchResults]
  )

  const directLookupActive = isDirectSearch(searchQuery.trim(), searchMode)
  const angTargets = useMemo(
    () => directLookupActive ? getAngTargets(searchQuery, searchSource) : [],
    [directLookupActive, searchQuery, searchSource]
  )

  const readRouteMatches = useAppSearchMatches(
    directLookupActive ? '' : searchQuery.trim(),
    searchSource
  )
  const immediateAppSearchMatches = getUniqueAppSearchMatches(readRouteMatches)
    .slice(0, SEARCH_RESULTS_PAGE_SIZE)
  const deferredLibrarySearchMatches = getUniqueAppSearchMatches(
    librarySearchResults,
    immediateAppSearchMatches
  ).slice(0, Math.max(SEARCH_RESULTS_PAGE_SIZE - immediateAppSearchMatches.length, 0))
  const appSearchMatchCount = (
    immediateAppSearchMatches.length
    + deferredLibrarySearchMatches.length
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
  const searchStatusMessage = useMemo(() => {
    if (!hasActiveSearch) return ''
    if (searching) return copy.searching
    if (searchIssue) return getSearchIssueCopy(searchIssue, locale)
    if (directLookupActive) {
      return angTargets.length === 1
        ? `1 ${copy.directDestination}`
        : `${angTargets.length} ${copy.directDestinations}`
    }

    const resultCount = appSearchMatchCount + groupedSearchResults.length
    const resultCopy = resultCount === 1 ? `1 ${copy.result}` : `${resultCount} ${copy.results}`
    return searchPartialIssue ? `${resultCopy}. ${copy.partialSearch}` : resultCopy
  }, [angTargets.length, appSearchMatchCount, copy, directLookupActive, groupedSearchResults.length, hasActiveSearch, locale, searchIssue, searchPartialIssue, searching])

  return (
    <div
      className="read-room-shell page-shell max-w-md mx-auto bg-parchment dark:bg-dark-bg transition-colors duration-300 animate-fade-in"
      data-testid="page-banis"
      data-page="banis"
      data-ai-surface="read"
      data-ai-state="ready"
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
        <div className="read-quick-find-card__heading">
          <div className="read-quick-find-card__title">
            <p className="eyebrow">{copy.find}</p>
            <h2 id="banis-quick-find-title" className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">
              {copy.searchTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => toggle('search-options')}
            className="shrink-0 rounded-full border border-sand/15 bg-parchment-card px-3 py-2 font-sans text-[11px] font-medium text-ink/65 transition-colors duration-300 dark:border-dark-text/10 dark:bg-dark-card dark:text-dark-text/80"
            aria-expanded={searchOptionsOpen}
            aria-controls="banis-search-options-panel"
            data-ai-action="toggle-search-options"
          >
            {searchOptionsOpen ? copy.simplify : copy.refine}
          </button>
        </div>

        <div className="read-search-control relative mt-4" data-ai-search-shell="read-smart-search">
          <IconSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/32 dark:text-dark-text/34" />
          <input
            ref={searchInputRef}
            id="banis-search"
            name="banis-search"
            type="search"
            aria-label={copy.searchLabel}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            inputMode="search"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder={searchMode === 'ang' ? searchModeLabels.ang : copy.searchPlaceholder}
            className="read-search-input w-full rounded-lg border border-sand/15 bg-parchment-card py-4 pl-11 pr-4 font-sans text-base text-ink outline-none transition-colors duration-300 placeholder:text-ink/36 focus:border-saffron/45 dark:border-dark-text/10 dark:bg-dark-card dark:text-dark-text dark:placeholder:text-dark-text/38"
            data-ai-action="read-smart-search"
          />
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {searchStatusMessage}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <MetadataChip>{searchMode === 'auto-detect' ? copy.autoDetect : searchModeLabels[searchMode]}</MetadataChip>
          {searchSource !== 'all' && <MetadataChip>{SEARCH_SOURCE_LABELS[searchSource]}</MetadataChip>}
          {directLookupActive && <MetadataChip>{copy.directOpen}</MetadataChip>}
          {hasActiveSearch && !directLookupActive && (
            <MetadataChip>{searching ? copy.searching : copy.ready}</MetadataChip>
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
                      className={`min-h-[44px] rounded-lg px-3 py-2 font-sans text-xs font-medium transition-all duration-300 ${
                        selected
                          ? 'bg-saffron text-white'
                          : 'bg-parchment-card dark:bg-dark-card text-ink/70 dark:text-dark-text/70 border border-sand/15 dark:border-dark-text/10'
                    }`}
                  >
                    {searchModeLabels[mode]}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {(Object.keys(SEARCH_SOURCE_LABELS) as SearchSource[]).map(value => {
                const selected = searchSource === value
                return (
                    <button
                      key={value}
                      onClick={() => setSearchSource(value as keyof typeof SEARCH_SOURCE_LABELS)}
                      aria-pressed={selected}
                      className={`min-h-[44px] rounded-full px-3 py-2 font-sans text-[11px] border transition-all duration-300 ${
                        selected
                          ? 'bg-saffron text-white border-saffron'
                          : 'bg-parchment-card dark:bg-dark-card text-ink/68 dark:text-dark-text/64 border-sand/15 dark:border-dark-text/10'
                    }`}
                  >
                    {value === 'all' ? copy.allSources : SEARCH_SOURCE_LABELS[value]}
                  </button>
                )
              })}
            </div>
          </div>
          )}
          {directLookupActive && searchQuery.trim() && (
            <div data-search-result-anchor="true" className="nav-safe-results mt-3 space-y-2" data-testid="banis-search-ang-results" data-ai-result-group="ang">
            {angTargets.length > 0 ? angTargets.map(target => (
              <button
                key={target.source}
                onClick={() => {
                  addRecent(searchQuery.trim(), searchMode, searchSource)
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
                onClick={() => handleSearch(searchQuery, searchMode, searchSource)}
              >
                {copy.retry}
              </button>
            </div>
          )}
          {searchPartialIssue && !searching && !searchIssue && !directLookupActive && (
            <div data-search-feedback-anchor="true" role="status" className="read-search-partial nav-safe-results mt-3 rounded-lg border px-4 py-3 font-sans text-sm">
              {copy.partialSearch}
            </div>
          )}
          {immediateAppSearchMatches.length > 0 && !directLookupActive && (
            <AppSearchResultGroup
              matches={immediateAppSearchMatches}
              query={searchQuery}
              groupLabel={copy.inApp}
              groupHint={copy.exactFirst}
              testId="banis-search-app-results"
              aiResultGroup="in-app"
              resultAnchor
              className="mt-3"
              copy={copy}
              searchMode={searchMode}
              searchSource={searchSource}
              addRecent={addRecent}
              openSearchDestination={openSearchDestination}
            />
          )}
          {searchResults.length > 0 && !directLookupActive && (
            <div data-search-result-anchor={immediateAppSearchMatches.length === 0 ? 'true' : undefined} className="nav-safe-results mt-2 space-y-1" data-testid="banis-search-gurbani-results" data-ai-result-group="gurbani">
            <h3 className="px-1 pb-1 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/75 dark:text-dark-text/76">
              {copy.gurbaniMatches}
            </h3>
            {(availableRaags.length > 0 || availableWriters.length > 0) && (
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
                  onClick={() => openSearchResult(r)}
                  className="w-full text-left"
                >
                  <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-sm text-ink dark:text-dark-text`}><SearchHighlight text={renderScriptText(r.gurmukhi, scriptMode)} query={searchQuery.trim()} /></p>
                  {showTransliteration && r.transliteration ? (
                    <p className="font-sans text-xs text-ink/75 dark:text-dark-text/76 mt-0.5"><SearchHighlight text={r.transliteration} query={searchQuery.trim()} /></p>
                  ) : null}
                  {(meaningLanguage === 'en' || isEnglishMeaningSearch) && r.translation_en ? (
                    <p className="read-search-result__meaning font-sans text-xs text-ink/75 dark:text-dark-text/76 mt-1">
                      {isEnglishMeaningSearch ? <span>{copy.meaning}</span> : null}
                      <SearchHighlight text={r.translation_en} query={searchQuery.trim()} />
                    </p>
                  ) : null}
                </button>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {r.sourceName && r.source in SEARCH_SOURCE_LABELS
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
        {deferredLibrarySearchMatches.length > 0 && !directLookupActive && (
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
            addRecent={addRecent}
            openSearchDestination={openSearchDestination}
          />
        )}
        {hasActiveSearch && !searching && !searchIssue && !searchPartialIssue && searchResults.length === 0 && appSearchMatchCount === 0 && !directLookupActive && (
          <section data-search-feedback-anchor="true" className="read-search-empty nav-safe-results mt-3" aria-labelledby="read-search-empty-title">
            <h3 id="read-search-empty-title" className="font-sans text-sm font-semibold text-ink dark:text-dark-text">
              {copy.noResultsTitle}
            </h3>
            <p className="mt-1 font-sans text-xs leading-5 text-ink/75 dark:text-dark-text/76">
              {copy.noResultsBody}
            </p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={copy.tryExamples}>
              {READ_SEARCH_EXAMPLES.map(example => (
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
              <button onClick={clearRecent} className="font-sans text-[10px] text-ink/75 dark:text-dark-text/76">{copy.clear}</button>
            </div>
            <div className="space-y-2">
              {recent.map(item => (
                <div key={`${item.query}-${item.mode}-${item.source}`} className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSearchMode(item.mode)
                      setSearchSource(item.source)
                      handleSearch(item.query, item.mode, item.source)
                    }}
                    className="flex-1 text-left font-sans text-xs bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-full px-3 py-2 text-ink/68 dark:text-dark-text/64 active:scale-95 transition-transform duration-150"
                  >
                    {item.query} · {searchModeLabels[item.mode]} · {item.source === 'all' ? copy.allSources : SEARCH_SOURCE_LABELS[item.source]}
                  </button>
                  <button
                    onClick={() => togglePinned(item.query, item.mode, item.source)}
                    aria-label={`${item.pinned ? copy.unpin : copy.pin} ${item.query}`}
                    className="min-h-[40px] min-w-[40px] rounded-full bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 flex items-center justify-center text-ink/68 dark:text-dark-text/64"
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

        <div className="read-collection-tabs" role="tablist" aria-label={copy.collectionsLabel}>
          {READ_COLLECTIONS.map((collection, index) => {
            const selected = activeCollection === collection
            return (
              <button
                key={collection}
                id={`read-tab-${collection}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="read-active-collection-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => selectCollection(collection)}
                onKeyDown={event => {
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

        {hasActiveSearch ? (
          <div
            id="read-active-collection-panel"
            role="tabpanel"
            aria-labelledby={`read-tab-${activeCollection}`}
            className="read-search-active-note"
          >
            {copy.searchResultsAbove}
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

        <Link
          to="/study?baniDbId=24&bani=Ardaas&flow=ardaas-hukamnama"
          className="read-featured-flow-card w-full text-left active:scale-[0.99] transition-transform duration-150"
          data-testid="banis-featured-flow"
          data-ai-action="open-ardaas-hukamnama-flow"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">{copy.featuredFlowEyebrow}</p>
            <span className="chip-pill shrink-0">{copy.featuredFlowChip}</span>
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
              count={loadingSundarGutka || sundarGutkaIssue ? null : sundarGutkaBanis.length}
              issue={Boolean(sundarGutkaIssue)}
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
            data-ai-state={loadingSundarGutka ? 'loading' : sundarGutkaIssue ? 'degraded' : sundarGutkaBanis.length ? 'ready' : 'empty'}
          >
            {loadingSundarGutka ? (
              <p role="status" className="font-sans text-xs text-ink/75 dark:text-dark-text/76 px-2 py-3">{copy.indexLoading}</p>
            ) : sundarGutkaIssue ? (
              <div role="alert" className="read-index-state">
                <p>{sundarGutkaIssue === 'offline' ? copy.indexOffline : copy.indexError}</p>
                <button type="button" onClick={() => setSundarGutkaRequest(request => request + 1)}>
                  {copy.retry}
                </button>
              </div>
            ) : sundarGutkaGroups.length === 0 ? (
              <p role="status" className="read-index-state">{copy.indexEmpty}</p>
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
                              detail={showTransliteration ? option.romanizedTitle : undefined}
                              supplementalDetail={meaningLanguage === 'en' ? getReaderEditorialCopyForBani(option.id)?.dek : undefined}
                              labelLang={getScriptTextLang(scriptMode)}
                              labelClassName={`${getScriptTextFontClass(scriptMode)} text-lg leading-relaxed text-ink dark:text-dark-text`}
                              detailClassName="font-sans text-xs text-gold-dark dark:text-gold-light mt-0.5"
                              onClick={() => navigate(buildNitnemStudyPath(option))}
                            />
                          ))
                        }

                        const displayCopy = getSundarGutkaDisplayCopy(item)

                        return (
                          <IndexRow
                            key={item.id}
                            label={renderScriptText(displayCopy.label, scriptMode)}
                            detail={showTransliteration ? displayCopy.detail : undefined}
                            labelLang={getScriptTextLang(scriptMode)}
                            labelClassName={`${getScriptTextFontClass(scriptMode)} text-lg leading-relaxed text-ink dark:text-dark-text`}
                            detailClassName="font-sans text-xs text-gold-dark dark:text-gold-light mt-0.5"
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
        const baniCount = DIRECTORY_BANIS_BY_SCRIPTURE[scripture].filter(isExactBani).length

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
                        aria-label={`${group.category}, ${group.items.length} readings`}
                      >
                        <p className="font-sans text-xs text-ink/68 dark:text-dark-text/64 uppercase tracking-wider">{group.category}</p>
                        <span className="ml-3 flex shrink-0 items-center gap-2">
                          <span aria-hidden="true" className="min-w-6 text-right font-sans text-[11px] tabular-nums text-ink/75 dark:text-dark-text/76">
                            {group.items.length}
                          </span>
                          <span className="icon-surface h-7 w-7 text-ink/68 dark:text-dark-text/66">{expanded[groupKey] ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
                        </span>
                      </button>
                      {expanded[groupKey] && (
                        <div id={`${groupKey}-panel`} className="mt-1 ml-2">
                          {group.items.flatMap(item => {
                            if (!isExactBani(item)) {
                              return (
                                <IndexRow
                                  key={item.id}
                                  label={getBaniRowLabel(item)}
                                  detail={getReaderEditorialCopyForBani(item.id)?.dek ?? item.description}
                                  detailClassName="font-sans text-xs leading-5 text-ink/68 dark:text-dark-text/70 mt-1"
                                  onClick={() => navigate(buildCanonicalBaniStudyPath(item))}
                                />
                              )
                            }

                            if (item.variantOf) {
                              const baseItemVisible = group.items.some(candidate => !candidate.variantOf && candidate.id === item.variantOf)
                              if (baseItemVisible) return []

                              return (
                                <IndexRow
                                  key={item.id}
                                  label={getBaniRowLabel(item)}
                                  detail={getReaderEditorialCopyForBani(item.id)?.dek}
                                  detailClassName="font-sans text-xs leading-5 text-ink/68 dark:text-dark-text/70 mt-1"
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
                                  detailClassName="font-sans text-xs leading-5 text-ink/68 dark:text-dark-text/70 mt-1"
                                  onClick={() => navigate(option.path)}
                                />
                              ))
                            }

                            return (
                              <IndexRow
                                key={item.id}
                                label={getBaniRowLabel(item)}
                                detail={getReaderEditorialCopyForBani(item.id)?.dek}
                                detailClassName="font-sans text-xs leading-5 text-ink/68 dark:text-dark-text/70 mt-1"
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
                  to={`/study?source=B&ang=${vaar}`}
                  state={{ readerOrigin: '/banis' }}
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

            <section
              className="read-source-section"
              aria-labelledby="read-source-browser-title"
              data-testid="read-source-browser"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="eyebrow">{copy.sourceCatalogEyebrow}</p>
                  <h2 id="read-source-browser-title" className="mt-2 font-display text-3xl leading-none text-ink dark:text-dark-text">
                    {copy.sourceCatalogTitle}
                  </h2>
                  <p className="read-section-copy mt-2 max-w-[34ch] font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/76">
                    {copy.sourceCatalogBody}
                  </p>
                </div>
                <span className="chip-pill shrink-0">{copy.browse}</span>
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
                  <p className="eyebrow">{copy.booksCatalogEyebrow}</p>
                  <h2 id="read-books-browser-title" className="mt-2 font-display text-3xl leading-none text-ink dark:text-dark-text">
                    {copy.booksCatalogTitle}
                  </h2>
                  <p className="read-section-copy mt-2 max-w-[34ch] font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/76">
                    {copy.booksCatalogBody}
                  </p>
                </div>
                <span className="chip-pill shrink-0">{copy.browse}</span>
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
