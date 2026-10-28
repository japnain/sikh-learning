import type { UiLocale } from '../types'
import { ARDAAS_HUKAMNAMA_EDITORIAL_COPY } from './readerEditorialCopy'

export type ReadCollection = 'banis' | 'sources' | 'books' | 'stories'
export const READ_COLLECTIONS: ReadCollection[] = ['banis', 'sources', 'books', 'stories']

export type ReadPageCopy = {
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
  showingItems: (visible: number, total: number) => string
  showAllItems: (total: number) => string
  showFewer: string
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

export const READ_PAGE_COPY: Record<UiLocale, ReadPageCopy> = {
  en: {
    title: 'Read',
    heroEyebrow: 'NaamRas library',
    heroBody: 'Gurbani, daily banis, books, and Sikh stories.',
    collectionsLabel: 'Read collections',
    tabs: { banis: 'Banis', sources: 'Sources', books: 'Books', stories: 'Stories' },
    find: 'Find',
    searchTitle: 'Search Gurbani, books and stories',
    searchLabel: 'Search Gurbani, meanings, or direct routes',
    searchPlaceholder: 'Search Gurbani, first letters, transliteration, or meaning',
    refine: 'Refine search',
    simplify: 'Simplify',
    autoDetect: 'Auto detect',
    directOpen: 'Direct open',
    searching: 'Searching',
    ready: 'Ready',
    inApp: 'Open a reading',
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
    showingItems: (visible, total) => `Showing ${visible} of ${total} matches`,
    showAllItems: total => `Show all ${total} matches`,
    showFewer: 'Show fewer matches',
    noFilteredResults: 'No matches use both of these filters.',
    clearFilters: 'Clear filters',
    noResultsTitle: 'No matches yet',
    noResultsBody: 'Try a full bani name, a Gurmukhi phrase, or a simpler spelling.',
    tryExamples: 'Try an example',
    clearSearch: 'Clear search',
    recent: 'Recent',
    clear: 'Clear',
    searchResultsAbove: 'Search results are shown above.',
    featuredFlowEyebrow: 'Daily devotion',
    featuredFlowChip: 'Devotional flow',
    featuredFlowTitle: 'Ardaas + Hukamnama',
    featuredFlowBody: ARDAAS_HUKAMNAMA_EDITORIAL_COPY.dek,
    beginFlow: 'Begin Ardaas',
    banisEyebrow: 'Daily practice',
    banisTitle: 'Banis for every part of the day',
    banisBody: 'Choose a complete prayer for morning, evening, or any moment of the day.',
    sourcesEyebrow: 'Scripture sources',
    sourcesTitle: 'Open each source in its own structure',
    sourcesBody: 'Read in sequence, or go straight to an Ang or Vaar in the original source.',
    sourceCatalogEyebrow: 'Source editions',
    sourceCatalogTitle: 'Choose a source',
    sourceCatalogBody: 'Open scripture by Ang or choose a Vaar directly.',
    companionEyebrow: 'Companion reader',
    companionTitle: 'Guidance and practice',
    companionBody: 'Read Rehat through its complete chapter index.',
    rehatTitle: 'Rehat',
    rehatBody: 'Conduct, practice, and chapter-level reading.',
    booksEyebrow: 'Books',
    booksTitle: 'History and memory in longer form',
    booksBody: 'Settle into Sikh history chapter by chapter, or explore guidance for daily life.',
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
    tabs: { banis: 'ਬਾਣੀਆਂ', sources: 'ਸਰੋਤ', books: 'ਕਿਤਾਬਾਂ', stories: 'ਸਾਖੀਆਂ' },
    find: 'ਖੋਜੋ',
    searchTitle: 'ਗੁਰਬਾਣੀ, ਕਿਤਾਬਾਂ ਅਤੇ ਸਾਖੀਆਂ ਖੋਜੋ',
    searchLabel: 'ਗੁਰਬਾਣੀ, ਅਰਥ ਜਾਂ ਸਿੱਧੇ ਰਸਤੇ ਖੋਜੋ',
    searchPlaceholder: 'ਗੁਰਬਾਣੀ, ਪਹਿਲੇ ਅੱਖਰ, ਲਿਪਾਂਤਰ ਜਾਂ ਅਰਥ ਖੋਜੋ',
    refine: 'ਖੋਜ ਸੁਧਾਰੋ',
    simplify: 'ਸਧਾਰਨ ਕਰੋ',
    autoDetect: 'ਆਪਣੇ ਆਪ ਪਛਾਣ',
    directOpen: 'ਸਿੱਧਾ ਖੋਲ੍ਹੋ',
    searching: 'ਖੋਜ ਜਾਰੀ ਹੈ',
    ready: 'ਤਿਆਰ',
    inApp: 'ਪਾਠ ਖੋਲ੍ਹੋ',
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
    showingItems: (visible, total) => `${total} ਵਿੱਚੋਂ ${visible} ਮੇਲ`,
    showAllItems: total => `ਸਾਰੇ ${total} ਮੇਲ ਵੇਖੋ`,
    showFewer: 'ਘੱਟ ਮੇਲ ਦਿਖਾਓ',
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
    beginFlow: 'ਅਰਦਾਸ ਸ਼ੁਰੂ ਕਰੋ',
    banisEyebrow: 'ਰੋਜ਼ਾਨਾ ਅਭਿਆਸ',
    banisTitle: 'ਦਿਨ ਦੇ ਹਰ ਵੇਲੇ ਲਈ ਬਾਣੀਆਂ',
    banisBody: 'ਸਵੇਰ, ਸ਼ਾਮ ਅਤੇ ਪੂਰੇ ਰੋਜ਼ਾਨਾ ਪਾਠ।',
    sourcesEyebrow: 'ਗੁਰਬਾਣੀ ਸਰੋਤ',
    sourcesTitle: 'ਹਰ ਸਰੋਤ ਨੂੰ ਉਸਦੀ ਆਪਣੀ ਬਣਤਰ ਵਿੱਚ ਖੋਲ੍ਹੋ',
    sourcesBody: 'ਗ੍ਰੰਥ ਅੰਗ ਅਨੁਸਾਰ ਅਤੇ ਭਾਈ ਗੁਰਦਾਸ ਜੀ ਦੀਆਂ ਵਾਰਾਂ ਵਾਰ ਅਨੁਸਾਰ ਖੋਲ੍ਹੋ।',
    sourceCatalogEyebrow: 'ਮੂਲ ਸਰੋਤ',
    sourceCatalogTitle: 'ਸਰੋਤ ਚੁਣੋ',
    sourceCatalogBody: 'ਅੰਗ ਜਾਂ ਵਾਰ ਚੁਣ ਕੇ ਸਿੱਧਾ ਪਾਠ ਖੋਲ੍ਹੋ।',
    companionEyebrow: 'ਸਹਾਇਕ ਪਾਠਕ',
    companionTitle: 'ਰਹਿਨੁਮਾਈ ਅਤੇ ਅਭਿਆਸ',
    companionBody: 'ਰਹਿਤ ਨੂੰ ਪੂਰੀ ਅਧਿਆਇ ਸੂਚੀ ਨਾਲ ਪੜ੍ਹੋ।',
    rehatTitle: 'ਰਹਿਤ',
    rehatBody: 'ਆਚਰਨ, ਅਭਿਆਸ ਅਤੇ ਅਧਿਆਇ ਅਨੁਸਾਰ ਪੜ੍ਹਾਈ।',
    booksEyebrow: 'ਕਿਤਾਬਾਂ',
    booksTitle: 'ਇਤਿਹਾਸ ਅਤੇ ਯਾਦ ਲੰਮੇ ਰੂਪ ਵਿੱਚ',
    booksBody: 'ਸੰਪੂਰਨ ਕਿਤਾਬਾਂ ਅਤੇ ਅਧਿਆਵਾਂ ਰਾਹੀਂ ਸਿੱਖ ਇਤਿਹਾਸ ਪੜ੍ਹੋ।',
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
    tabs: { banis: 'बाणियाँ', sources: 'स्रोत', books: 'किताबें', stories: 'साखियाँ' },
    find: 'खोजें',
    searchTitle: 'गुरबाणी, किताबें और साखियाँ खोजें',
    searchLabel: 'गुरबाणी, अर्थ या सीधे रास्ते खोजें',
    searchPlaceholder: 'गुरबाणी, पहले अक्षर, लिप्यंतरण या अर्थ खोजें',
    refine: 'खोज सुधारें',
    simplify: 'सरल करें',
    autoDetect: 'अपने आप पहचानें',
    directOpen: 'सीधे खोलें',
    searching: 'खोज जारी है',
    ready: 'तैयार',
    inApp: 'पाठ खोलें',
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
    showingItems: (visible, total) => `${total} में से ${visible} मिलान`,
    showAllItems: total => `सभी ${total} मिलान देखें`,
    showFewer: 'कम मिलान दिखाएँ',
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
    beginFlow: 'अरदास शुरू करें',
    banisEyebrow: 'दैनिक अभ्यास',
    banisTitle: 'दिन के हर समय के लिए बाणियाँ',
    banisBody: 'सुबह, शाम और पूरे दैनिक पाठ।',
    sourcesEyebrow: 'गुरबाणी स्रोत',
    sourcesTitle: 'हर स्रोत को उसकी अपनी रचना में खोलें',
    sourcesBody: 'ग्रंथ को अंग और भाई गुरदास जी की वारों को वार के अनुसार खोलें।',
    sourceCatalogEyebrow: 'मूल स्रोत',
    sourceCatalogTitle: 'स्रोत चुनें',
    sourceCatalogBody: 'अंग या वार चुनकर सीधे पाठ खोलें।',
    companionEyebrow: 'सहायक पाठक',
    companionTitle: 'मार्गदर्शन और अभ्यास',
    companionBody: 'रहत को पूरी अध्याय सूची के साथ पढ़ें।',
    rehatTitle: 'रहत',
    rehatBody: 'आचरण, अभ्यास और अध्याय के अनुसार पढ़ना।',
    booksEyebrow: 'किताबें',
    booksTitle: 'इतिहास और स्मृति लंबे रूप में',
    booksBody: 'पूरी किताबों और उनके अध्यायों के माध्यम से सिख इतिहास पढ़ें।',
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

