import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BANIS } from '../data/banis'
import { isBookBookmark, useBookmarksStore, type Bookmark } from '../store/bookmarks'
import { useFavoritesStore, type FavoriteItem } from '../store/favorites'
import { buildSessionResumePath, useProgressStore } from '../store/progress'
import { useReadingProgressStore } from '../store/readingProgress'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { useVocabStore } from '../store/vocab'
import { useLocaleStore } from '../store/locale'
import { useLanguageStore } from '../store/language'
import { useSavedFeedbackStore } from '../store/savedFeedback'
import { buildCanonicalBaniStudyPath } from '../utils/baniRouteResolver'
import { buildSavedStudyPath } from '../utils/savedStudyPath'
import {
  buildReaderOriginNavigationState,
} from '../utils/libraryReaderNavigation'
import { getUiCopy } from '../utils/uiCopy'
import { getEditorialCopy } from '../content/editorialCopy'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import { formatSourceReaderReference, SOURCE_READER_META } from '../utils/sourceReaderMeta'
import type { UiLocale } from '../types'
import savedMuralSrc from '../assets/living-library/saved-mural-landscape.avif'
import {
  IconBookmarkFilled,
  IconChevronDown,
  IconChevronUp,
  IconClose,
  IconHeartFilled,
  IconLibrary,
} from '../components/icons'

const SOURCE_FULL_NAME: Record<string, string> = {
  G: SOURCE_READER_META.G.name,
  D: SOURCE_READER_META.D.name,
  B: SOURCE_READER_META.B.name,
  A: SOURCE_READER_META.A.name,
}

type SavedFilter = 'all' | 'favorites' | 'bookmarks'
type PendingRemoval =
  | { kind: 'bookmark'; item: Bookmark }
  | { kind: 'favorite'; item: FavoriteItem }

const LIBRARY_MESSAGES = {
  en: {
    overview: 'Saved overview',
    notices: { bookmark: 'Bookmarked passage added to Saved.', favorite: 'Favorite added to Saved.', review: 'Review Bank updated.' },
    startShelf: 'Start the shelf',
    emptyBody: 'Saved words, bookmarks, favorites, and reading history will settle here once you begin keeping passages close.',
    browseRead: 'Browse Read',
    searchLabel: 'Search saved readings',
    searchPlaceholder: 'Search titles, passages, or notes',
    filters: { all: 'All', favorites: 'Favorites', bookmarks: 'Bookmarks' },
    noMatches: 'No saved readings match this search.',
    clearSearch: 'Clear search',
    removeFavorite: (title: string) => `Remove ${title} from favorites`,
    removeBookmark: (title: string) => `Remove bookmark ${title}`,
    removed: (title: string) => `${title} removed from Saved.`,
    restored: (title: string) => `${title} restored.`,
    undo: 'Undo',
    storageUnavailable: 'This change could not be saved permanently because device storage is unavailable.',
    savedPassages: (count: number) => `${count} saved passage${count === 1 ? '' : 's'}`,
    wordsPhrases: (words: number, phrases: number) => `${words} saved words and ${phrases} saved phrases are ready for review.`,
    reviewCounts: (words: number, phrases: number) => `${words} words · ${phrases} phrases.`,
    read: 'Read',
    chooseReading: 'Choose a bani, ang, or scripture section when you do not have an active reading session yet.',
    browseReadingBody: 'Open exact banis, angs, and scripture sections without leaving the Saved shelf behind.',
    inProgress: 'In Progress',
    readingHistory: 'Reading History',
    book: 'Book',
  },
  pa: {
    overview: 'ਸੰਭਾਲੇ ਪਾਠਾਂ ਦੀ ਝਲਕ',
    notices: { bookmark: 'ਬੁੱਕਮਾਰਕ ਕੀਤਾ ਪਾਠ ਸੰਭਾਲੇ ਵਿੱਚ ਜੋੜਿਆ ਗਿਆ।', favorite: 'ਮਨਪਸੰਦ ਸੰਭਾਲੇ ਵਿੱਚ ਜੋੜਿਆ ਗਿਆ।', review: 'ਦੁਹਰਾਈ ਬੈਂਕ ਅੱਪਡੇਟ ਹੋਇਆ।' },
    startShelf: 'ਆਪਣੀ ਰੈਕ ਸ਼ੁਰੂ ਕਰੋ',
    emptyBody: 'ਜਦੋਂ ਤੁਸੀਂ ਪਾਠ ਸੰਭਾਲਣਾ ਸ਼ੁਰੂ ਕਰੋਗੇ ਤਾਂ ਸ਼ਬਦ, ਬੁੱਕਮਾਰਕ, ਮਨਪਸੰਦ ਅਤੇ ਪੜ੍ਹਨ ਦਾ ਇਤਿਹਾਸ ਇੱਥੇ ਮਿਲੇਗਾ।',
    browseRead: 'ਪਾਠ ਵੇਖੋ',
    searchLabel: 'ਸੰਭਾਲੇ ਪਾਠ ਖੋਜੋ',
    searchPlaceholder: 'ਸਿਰਲੇਖ, ਪਾਠ ਜਾਂ ਨੋਟ ਖੋਜੋ',
    filters: { all: 'ਸਾਰੇ', favorites: 'ਮਨਪਸੰਦ', bookmarks: 'ਬੁੱਕਮਾਰਕ' },
    noMatches: 'ਇਸ ਖੋਜ ਨਾਲ ਕੋਈ ਸੰਭਾਲਿਆ ਪਾਠ ਨਹੀਂ ਮਿਲਿਆ।',
    clearSearch: 'ਖੋਜ ਸਾਫ਼ ਕਰੋ',
    removeFavorite: (title: string) => `${title} ਨੂੰ ਮਨਪਸੰਦ ਤੋਂ ਹਟਾਓ`,
    removeBookmark: (title: string) => `${title} ਬੁੱਕਮਾਰਕ ਹਟਾਓ`,
    removed: (title: string) => `${title} ਸੰਭਾਲੇ ਵਿੱਚੋਂ ਹਟਾਇਆ ਗਿਆ।`,
    restored: (title: string) => `${title} ਮੁੜ ਸੰਭਾਲਿਆ ਗਿਆ।`,
    undo: 'ਵਾਪਸ ਕਰੋ',
    storageUnavailable: 'ਡਿਵਾਈਸ ਸਟੋਰੇਜ ਉਪਲਬਧ ਨਾ ਹੋਣ ਕਾਰਨ ਇਹ ਬਦਲਾਅ ਪੱਕੇ ਤੌਰ ਤੇ ਸੰਭਾਲਿਆ ਨਹੀਂ ਜਾ ਸਕਿਆ।',
    savedPassages: (count: number) => `${count} ਸੰਭਾਲੇ ਪਾਠ`,
    wordsPhrases: (words: number, phrases: number) => `${words} ਸ਼ਬਦ ਅਤੇ ${phrases} ਵਾਕ ਦੁਹਰਾਈ ਲਈ ਤਿਆਰ ਹਨ।`,
    reviewCounts: (words: number, phrases: number) => `${words} ਸ਼ਬਦ · ${phrases} ਵਾਕ।`,
    read: 'ਪਾਠ',
    chooseReading: 'ਜੇ ਕੋਈ ਪਾਠ ਜਾਰੀ ਨਹੀਂ ਹੈ ਤਾਂ ਬਾਣੀ, ਅੰਗ ਜਾਂ ਗ੍ਰੰਥ ਦਾ ਭਾਗ ਚੁਣੋ।',
    browseReadingBody: 'ਸੰਭਾਲੇ ਰੈਕ ਤੋਂ ਬਾਹਰ ਗਏ ਬਿਨਾਂ ਸਹੀ ਬਾਣੀ, ਅੰਗ ਜਾਂ ਗ੍ਰੰਥ ਭਾਗ ਖੋਲ੍ਹੋ।',
    inProgress: 'ਜਾਰੀ ਪਾਠ',
    readingHistory: 'ਪੜ੍ਹਨ ਦਾ ਇਤਿਹਾਸ',
    book: 'ਕਿਤਾਬ',
  },
  hi: {
    overview: 'सहेजे पाठों का सार',
    notices: { bookmark: 'बुकमार्क किया पाठ सहेजे में जुड़ गया।', favorite: 'पसंदीदा सहेजे में जुड़ गया।', review: 'रिव्यू बैंक अपडेट हुआ।' },
    startShelf: 'अपनी शेल्फ़ शुरू करें',
    emptyBody: 'जब आप पाठ सहेजना शुरू करेंगे, तब शब्द, बुकमार्क, पसंदीदा और पढ़ने का इतिहास यहाँ मिलेगा।',
    browseRead: 'पाठ देखें',
    searchLabel: 'सहेजे पाठ खोजें',
    searchPlaceholder: 'शीर्षक, पाठ या नोट खोजें',
    filters: { all: 'सभी', favorites: 'पसंदीदा', bookmarks: 'बुकमार्क' },
    noMatches: 'इस खोज से कोई सहेजा पाठ नहीं मिला।',
    clearSearch: 'खोज साफ़ करें',
    removeFavorite: (title: string) => `${title} को पसंदीदा से हटाएँ`,
    removeBookmark: (title: string) => `${title} बुकमार्क हटाएँ`,
    removed: (title: string) => `${title} सहेजे से हटा दिया गया।`,
    restored: (title: string) => `${title} फिर से सहेजा गया।`,
    undo: 'वापस लाएँ',
    storageUnavailable: 'डिवाइस स्टोरेज उपलब्ध न होने के कारण यह बदलाव स्थायी रूप से सेव नहीं हुआ।',
    savedPassages: (count: number) => `${count} सहेजे पाठ`,
    wordsPhrases: (words: number, phrases: number) => `${words} शब्द और ${phrases} वाक्यांश रिव्यू के लिए तैयार हैं।`,
    reviewCounts: (words: number, phrases: number) => `${words} शब्द · ${phrases} वाक्यांश।`,
    read: 'पाठ',
    chooseReading: 'यदि कोई पाठ जारी नहीं है तो बाणी, अंग या ग्रंथ का भाग चुनें।',
    browseReadingBody: 'सहेजी शेल्फ़ छोड़े बिना सटीक बाणी, अंग और ग्रंथ भाग खोलें।',
    inProgress: 'जारी पाठ',
    readingHistory: 'पढ़ने का इतिहास',
    book: 'पुस्तक',
  },
} as const

function normalizeSavedSearch(value: string) {
  return value.toLocaleLowerCase().replace(/\s+/g, ' ').trim()
}

function bookmarkReference(bookmark: Bookmark, bookLabel: string, locale: UiLocale) {
  if (isBookBookmark(bookmark)) return `${bookLabel} · ${bookmark.chapterLabel}`
  return formatSourceReaderReference({
    source: bookmark.source,
    value: bookmark.ang,
    locale,
  })
}

function savedMeaning(item: Bookmark | FavoriteItem, locale: UiLocale) {
  if (locale === 'pa' && item.translation_pa?.trim()) return item.translation_pa.trim()
  if (locale === 'hi' && item.translation_hi?.trim()) return item.translation_hi.trim()
  return item.translation_en?.trim() || item.translation_pa?.trim() || item.translation_hi?.trim() || ''
}

function formatSessionReference(scriptureId: string, locale: UiLocale): string {
  const panthEpisode = scriptureId.match(/^panth-prakash-english-episode-(\d{1,3})$/)
  if (panthEpisode) return `Panth Prakash · Episode ${Number(panthEpisode[1])}`

  const [source, ang] = scriptureId.split('-')
  if (!source || !ang) return scriptureId.toUpperCase()
  return formatSourceReaderReference({
    source,
    value: ang,
    locale,
    sourceLabel: SOURCE_FULL_NAME[source],
  })
}

export default function Library() {
  const locale = useLocaleStore(s => s.locale)
  const scriptMode = useLanguageStore(state => state.scriptMode)
  const copy = getUiCopy(locale)
  const editorial = getEditorialCopy(locale)
  const libraryCopy = copy.library
  const messages = LIBRARY_MESSAGES[locale]
  const { bookmarks, removeBookmark, restoreBookmark } = useBookmarksStore()
  const { favorites, removeFavorite, restoreFavorite } = useFavoritesStore()
  const { vocab } = useVocabStore()
  const lastSaved = useSavedFeedbackStore(state => state.lastSaved)
  const { currentSession, studied } = useProgressStore()
  const { getProgress } = useReadingProgressStore()
  const { getEntryById } = useScriptureCacheStore()
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({
    bookmarks: bookmarks.length > 0,
  }))
  const [savedQuery, setSavedQuery] = useState('')
  const [savedFilter, setSavedFilter] = useState<SavedFilter>('all')
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null)
  const [savedActionNotice, setSavedActionNotice] = useState<string | null>(null)

  const words = vocab.filter(item => (item.kind ?? 'word') === 'word')
  const phrases = vocab.filter(item => (item.kind ?? 'word') === 'phrase')
  const resumePath = buildSessionResumePath(currentSession)
  const inProgress = useMemo(
    () => BANIS
      .map(bani => ({ ...bani, ...getProgress(bani.id) }))
      .filter(item => item.done > 0 && item.done < item.total)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 4),
    [getProgress]
  )
  const recentStudy = studied
    .slice(-3)
    .reverse()
    .map(item => getEntryById(item.id))
    .filter(Boolean)
  const resumeReference = currentSession ? formatSessionReference(currentSession.scriptureId, locale) : null
  const savedShelfNotice = useMemo(() => {
    switch (lastSaved?.kind) {
      case 'bookmark':
        return messages.notices.bookmark
      case 'favorite':
        return messages.notices.favorite
      case 'review':
        return messages.notices.review
      default:
        return null
    }
  }, [lastSaved?.kind, messages.notices])
  const hasSavedShelfContent = (
    bookmarks.length
    + favorites.length
    + phrases.length
    + words.length
    + inProgress.length
    + recentStudy.length
  ) > 0

  const toggle = (id: string) => setExpanded(c => ({ ...c, [id]: !c[id] }))
  const normalizedSavedQuery = normalizeSavedSearch(savedQuery)
  const sortedBookmarks = useMemo(
    () => [...bookmarks].sort((left, right) => Date.parse(right.savedAt) - Date.parse(left.savedAt)),
    [bookmarks]
  )
  const sortedFavorites = useMemo(
    () => [...favorites].sort((left, right) => Date.parse(right.savedAt) - Date.parse(left.savedAt)),
    [favorites]
  )
  const visibleBookmarks = savedFilter === 'favorites'
    ? []
    : sortedBookmarks.filter(bookmark => normalizeSavedSearch([
      bookmark.title,
      bookmark.excerpt,
      bookmark.description,
      bookmark.translation_en,
      bookmark.translation_pa,
      bookmark.translation_hi,
      bookmarkReference(bookmark, messages.book, locale),
    ].filter(Boolean).join(' ')).includes(normalizedSavedQuery))
  const visibleFavorites = savedFilter === 'bookmarks'
    ? []
    : sortedFavorites.filter(favorite => normalizeSavedSearch([
      favorite.title,
      favorite.excerpt,
      favorite.translation_en,
      favorite.translation_pa,
      favorite.translation_hi,
      SOURCE_FULL_NAME[favorite.source],
      favorite.ang,
    ].filter(Boolean).join(' ')).includes(normalizedSavedQuery))
  const hasSavedReadings = bookmarks.length + favorites.length > 0
  const hasSavedMatches = visibleBookmarks.length + visibleFavorites.length > 0
  const bookmarksExpanded = Boolean(expanded.bookmarks || normalizedSavedQuery)

  const handleRemove = (removal: PendingRemoval) => {
    const result = removal.kind === 'bookmark'
      ? removeBookmark(removal.item.id)
      : removeFavorite(removal.item.id)
    setPendingRemoval(removal)
    setSavedActionNotice(result.persisted
      ? messages.removed(removal.item.title)
      : messages.storageUnavailable)
  }

  const handleUndoRemoval = () => {
    if (!pendingRemoval) return
    const result = pendingRemoval.kind === 'bookmark'
      ? restoreBookmark(pendingRemoval.item)
      : restoreFavorite(pendingRemoval.item)
    setSavedActionNotice(result.persisted
      ? messages.restored(pendingRemoval.item.title)
      : messages.storageUnavailable)
    setPendingRemoval(null)
  }

  return (
    <div className="page-shell animate-fade-in" data-testid="page-library" data-page="library" data-ai-surface="library" data-ai-state="ready">
      <div className="library-page-header mb-5">
        <p className="eyebrow">{libraryCopy.eyebrow}</p>
        <h1 className="font-display text-4xl text-ink dark:text-dark-text leading-none mt-2">{libraryCopy.title}</h1>
        <p className="font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65 mt-3">
          {editorial?.library.body ?? libraryCopy.body}
        </p>
      </div>

      <figure className="library-art-band" aria-hidden="true">
        <img
          src={savedMuralSrc}
          alt=""
          width={1920}
          height={1080}
          loading="lazy"
          decoding="async"
        />
      </figure>

      <div className="library-adaptive-layout">
        <aside className="library-shelf-rail" aria-label={messages.overview}>
      <section
        className="hero-surface ornate-top p-5 mb-5"
        aria-labelledby="library-snapshot-title"
        data-testid="library-snapshot"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{libraryCopy.savedSnapshot}</p>
            <p id="library-snapshot-title" className="font-display text-3xl text-ink dark:text-dark-text leading-none mt-2">
              {editorial?.library.snapshotTitle ?? libraryCopy.returnKeep}
            </p>
          </div>
          <IconLibrary size={20} className="text-gold-dark dark:text-gold-light mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-5 sm:grid-cols-3">
          <div className={`section-shell-quiet px-3 py-3 transition-all duration-300 ${lastSaved?.kind === 'bookmark' ? 'saved-feedback-highlight' : ''}`}>
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{bookmarks.length}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/68 dark:text-dark-text/64 mt-1">{libraryCopy.bookmarks}</p>
          </div>
          <div className={`section-shell-quiet px-3 py-3 transition-all duration-300 ${lastSaved?.kind === 'favorite' ? 'saved-feedback-highlight' : ''}`}>
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{favorites.length}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/68 dark:text-dark-text/64 mt-1">{libraryCopy.favorites}</p>
          </div>
          <div className={`section-shell-quiet px-3 py-3 transition-all duration-300 ${lastSaved?.kind === 'review' ? 'saved-feedback-highlight' : ''}`}>
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{phrases.length}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/68 dark:text-dark-text/64 mt-1">{libraryCopy.phrases}</p>
          </div>
        </div>
        {savedShelfNotice ? (
          <div aria-live="polite" className="mt-4 min-h-[1.5rem]">
            <p role="status" className="inline-flex rounded-full bg-gold/10 px-3 py-1.5 font-sans text-xs font-medium text-gold-dark dark:bg-gold/12 dark:text-gold-light">
              {savedShelfNotice}
            </p>
          </div>
        ) : null}
        {!hasSavedShelfContent ? (
          <div className="section-shell-quiet mt-5 p-4 border border-gold/12 dark:border-gold/16">
            <p className="eyebrow">{messages.startShelf}</p>
            <p className="mt-2 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/72">
              {messages.emptyBody}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to="/banis"
                className="interactive-focus interactive-pill-link rounded-lg bg-saffron px-4 py-2 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-white"
              >
                {messages.browseRead}
              </Link>
              <Link
                to="/vocab"
                className="interactive-focus interactive-pill-link rounded-full border border-sand/18 bg-parchment-card/82 px-4 py-2 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-ink dark:border-dark-text/10 dark:bg-dark-card/78 dark:text-dark-text"
              >
                Review Bank
              </Link>
            </div>
          </div>
        ) : null}
      </section>

        </aside>

        <div className="library-shelf-content">

      {hasSavedReadings ? (
        <section className="section-shell-quiet mb-5 p-4" aria-label={messages.searchLabel}>
          <label className="block">
            <span className="eyebrow">{messages.searchLabel}</span>
            <input
              type="search"
              value={savedQuery}
              onChange={event => setSavedQuery(event.target.value)}
              placeholder={messages.searchPlaceholder}
              className="mt-2 min-h-[44px] w-full rounded-xl border border-sand/20 bg-parchment-card/80 px-4 font-sans text-sm text-ink outline-none transition-colors placeholder:text-ink/45 focus:border-saffron dark:border-dark-text/12 dark:bg-dark-card/80 dark:text-dark-text dark:placeholder:text-dark-text/42"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={messages.searchLabel}>
            {(['all', 'favorites', 'bookmarks'] as const).map(filter => (
              <button
                key={filter}
                type="button"
                onClick={() => setSavedFilter(filter)}
                aria-pressed={savedFilter === filter}
                className={`min-h-[44px] rounded-full border px-4 font-sans text-xs font-semibold transition-colors ${savedFilter === filter ? 'border-saffron bg-saffron text-white' : 'border-sand/20 text-ink/72 dark:border-dark-text/12 dark:text-dark-text/72'}`}
              >
                {messages.filters[filter]}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div aria-live="polite" aria-atomic="true" className="mb-3 min-h-[1.5rem]">
        {savedActionNotice ? (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/16 bg-gold/10 px-3 py-2 font-sans text-xs text-ink dark:text-dark-text">
            <span>{savedActionNotice}</span>
            {pendingRemoval ? (
              <button type="button" onClick={handleUndoRemoval} className="min-h-[44px] rounded-full px-3 font-semibold text-saffron dark:text-saffron-light">
                {messages.undo}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {hasSavedReadings && !hasSavedMatches ? (
        <div className="section-shell-quiet mb-5 p-4 text-center" role="status">
          <p className="font-sans text-sm text-ink/68 dark:text-dark-text/70">{messages.noMatches}</p>
          {normalizedSavedQuery ? (
            <button type="button" onClick={() => setSavedQuery('')} className="mt-2 min-h-[44px] rounded-full px-4 font-sans text-xs font-semibold text-saffron dark:text-saffron-light">
              {messages.clearSearch}
            </button>
          ) : null}
        </div>
      ) : null}

      {visibleFavorites.length > 0 && (
        <section
          className="surface-spotlight p-4 mb-5 border border-saffron/18 dark:border-saffron/20"
          aria-labelledby="library-favorites-title"
          data-testid="library-favorites"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <IconHeartFilled size={14} className="text-saffron dark:text-saffron-light" />
              <p id="library-favorites-title" className="eyebrow">{libraryCopy.favorites}</p>
            </div>
            <span className="chip-pill">{visibleFavorites.length}</span>
          </div>
          <div className="space-y-2">
            {visibleFavorites.map(favorite => (
              <div key={favorite.id} className="section-shell px-4 py-4 relative border border-saffron/12 dark:border-saffron/16">
                <button
                  onClick={() => handleRemove({ kind: 'favorite', item: favorite })}
                  className="absolute right-1 top-1 flex min-h-[44px] min-w-[44px] items-center justify-center text-ink/68 dark:text-dark-text/64"
                  aria-label={messages.removeFavorite(favorite.title)}
                >
                  <IconClose size={14} />
                </button>
                <Link
                  to={buildSavedStudyPath(favorite)}
                  state={buildReaderOriginNavigationState(buildSavedStudyPath(favorite), '/saved')}
                  className={`interactive-focus interactive-card-link w-full rounded-lg pr-12 text-left ${lastSaved?.kind === 'favorite' && lastSaved.targetId === favorite.id ? 'saved-feedback-highlight' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <IconHeartFilled size={14} className="text-saffron dark:text-saffron-light" />
                    <span lang={locale === 'pa' ? 'pa' : locale === 'hi' ? 'hi' : 'en'} className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold-dark dark:text-gold-light">
                      {formatSourceReaderReference({
                        source: favorite.source,
                        value: favorite.ang,
                        locale,
                      })}
                    </span>
                  </div>
                  <p className="font-sans font-semibold text-sm text-ink dark:text-dark-text">{favorite.title}</p>
                  {favorite.excerpt ? (
                    <p lang="pa-Guru" className="mt-2 line-clamp-3 font-gurmukhi text-base leading-relaxed text-ink/76 dark:text-dark-text/76">
                      {favorite.excerpt}
                    </p>
                  ) : null}
                  {savedMeaning(favorite, locale) ? (
                    <p lang={locale === 'hi' ? 'hi' : locale === 'pa' ? 'pa' : 'en'} className="mt-1 line-clamp-2 font-sans text-xs leading-5 text-ink/64 dark:text-dark-text/66">
                      {savedMeaning(favorite, locale)}
                    </p>
                  ) : null}
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-3 mb-5 sm:grid-cols-2" data-testid="library-shortcuts">
        <Link
          to="/vocab"
          className={`section-shell interactive-focus interactive-card-link p-4 text-left ${lastSaved?.kind === 'review' ? 'saved-feedback-highlight' : ''}`}
          data-testid="library-open-vocab"
        >
          <p className="eyebrow">{libraryCopy.reviewBank}</p>
          <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">{libraryCopy.reviewBankTitle}</p>
          <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-1">
            {editorial?.library.reviewBody
              ? `${messages.reviewCounts(words.length, phrases.length)} ${editorial.library.reviewBody}`
              : messages.wordsPhrases(words.length, phrases.length)}
          </p>
        </Link>

        <Link
          to={resumePath ?? '/banis'}
          state={resumePath
            ? buildReaderOriginNavigationState(resumePath, '/saved')
            : undefined}
          className="section-shell interactive-focus interactive-card-link p-4 text-left"
          data-testid="library-resume-reading"
        >
          <p className="eyebrow">{currentSession ? libraryCopy.resume : messages.read}</p>
          <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">
            {currentSession ? libraryCopy.resumeTitle : messages.browseRead}
          </p>
          <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-1">
            {currentSession
              ? resumeReference
              : messages.chooseReading}
          </p>
        </Link>

        {currentSession ? (
          <Link
            to="/banis"
            className="section-shell interactive-focus interactive-card-link p-4 text-left sm:col-span-2"
            data-testid="library-browse-read"
          >
            <p className="eyebrow">{messages.read}</p>
            <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">{messages.browseRead}</p>
            <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-1">
              {messages.browseReadingBody}
            </p>
          </Link>
        ) : null}
      </div>

      {inProgress.length > 0 && (
        <section
          className="section-shell-quiet p-4 mb-5"
          aria-labelledby="library-in-progress-title"
          data-testid="library-in-progress"
        >
          <p id="library-in-progress-title" className="eyebrow mb-3">{messages.inProgress}</p>
          <div className="space-y-2">
            {inProgress.map(item => (
              <Link
                key={item.id}
                to={buildCanonicalBaniStudyPath(item)}
                state={buildReaderOriginNavigationState(buildCanonicalBaniStudyPath(item), '/saved')}
                className="w-full section-shell interactive-focus interactive-card-link px-4 py-3 text-left"
              >
                <div className="flex justify-between gap-3">
                  <p className="font-sans text-sm text-ink dark:text-dark-text">{item.name}</p>
                  <p className="font-sans text-xs text-ink/68 dark:text-dark-text/64">{item.pct}%</p>
                </div>
                <div className="h-1.5 bg-sand/20 dark:bg-dark-text/10 rounded-full overflow-hidden mt-2">
                  <div className="h-full rounded-full bg-saffron" style={{ width: `${item.pct}%` }} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {visibleBookmarks.length > 0 && (
        <section
          className="section-shell-quiet p-4 mb-5 border border-gold/15 dark:border-gold/18"
          aria-labelledby="library-bookmarks-title"
          data-testid="library-bookmarks"
        >
          <button
            onClick={() => toggle('bookmarks')}
            className="w-full flex justify-between items-center gap-3"
            aria-expanded={bookmarksExpanded}
            aria-controls="library-bookmarks-panel"
          >
            <div className="text-left flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/12 text-gold-dark dark:bg-gold/14 dark:text-gold-light">
                <IconBookmarkFilled size={14} />
              </span>
              <div>
                <p id="library-bookmarks-title" className="eyebrow">{libraryCopy.bookmarks}</p>
                <p className="font-sans text-sm text-ink/72 dark:text-dark-text/74 mt-1">{messages.savedPassages(visibleBookmarks.length)}</p>
              </div>
            </div>
            <span className="icon-surface h-8 w-8 text-gold-dark dark:text-gold-light">{bookmarksExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}</span>
          </button>
          {bookmarksExpanded && (
            <div id="library-bookmarks-panel" className="mt-4 space-y-2">
              {visibleBookmarks.map((bookmark: Bookmark) => (
                <div
                  key={bookmark.id}
                  className="section-shell px-4 py-4 relative border border-gold/12 dark:border-gold/16"
                >
                  <button
                    onClick={() => handleRemove({ kind: 'bookmark', item: bookmark })}
                    className="absolute right-1 top-1 flex min-h-[44px] min-w-[44px] items-center justify-center text-ink/68 dark:text-dark-text/64"
                    aria-label={messages.removeBookmark(bookmark.title)}
                  >
                    <IconClose size={14} />
                  </button>
                  <Link
                    to={buildSavedStudyPath(bookmark)}
                    state={buildReaderOriginNavigationState(buildSavedStudyPath(bookmark), '/saved')}
                    className={`interactive-focus interactive-card-link w-full rounded-lg pr-12 text-left ${lastSaved?.kind === 'bookmark' && lastSaved.targetId === bookmark.id ? 'saved-feedback-highlight' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <IconBookmarkFilled size={14} className="text-gold-dark dark:text-gold-light" />
                      <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold-dark dark:text-gold-light">
                        {bookmarkReference(bookmark, messages.book, locale)}
                      </span>
                    </div>
                    <p className="font-sans font-semibold text-sm text-ink dark:text-dark-text">{bookmark.title}</p>
                    {bookmark.description && (
                      <p className="font-sans text-xs text-ink/68 dark:text-dark-text/64 italic mt-1">{bookmark.description}</p>
                    )}
                    {bookmark.excerpt ? (
                      <p lang={isBookBookmark(bookmark) ? 'en' : 'pa-Guru'} className={`${isBookBookmark(bookmark) ? 'font-serif' : 'font-gurmukhi'} mt-2 line-clamp-3 text-sm leading-relaxed text-ink/76 dark:text-dark-text/76`}>
                        {bookmark.excerpt}
                      </p>
                    ) : null}
                    {savedMeaning(bookmark, locale) ? (
                      <p lang={locale === 'hi' ? 'hi' : locale === 'pa' ? 'pa' : 'en'} className="mt-1 line-clamp-2 font-sans text-xs leading-5 text-ink/64 dark:text-dark-text/66">
                        {savedMeaning(bookmark, locale)}
                      </p>
                    ) : null}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {recentStudy.length > 0 && (
        <section
          className="section-shell p-4 mb-5"
          aria-labelledby="library-reading-history-title"
          data-testid="library-reading-history"
        >
          <p id="library-reading-history-title" className="eyebrow mb-3">{messages.readingHistory}</p>
          <div className="space-y-2">
            {recentStudy.map(entry => (
              <Link
                key={entry!.id}
                to={`/study?source=${entry!.source}&ang=${entry!.ang}`}
                state={buildReaderOriginNavigationState(`/study?source=${entry!.source}&ang=${entry!.ang}`, '/saved')}
                className="w-full section-shell-quiet interactive-focus interactive-card-link px-4 py-4 text-left"
              >
                <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold-dark dark:text-gold-light">
                  {entry!.scripture}
                </p>
                <p
                  lang={getScriptTextLang(scriptMode)}
                  className={`${getScriptTextFontClass(scriptMode)} text-lg leading-relaxed text-ink dark:text-dark-text mt-2 line-clamp-2`}
                >
                  {renderScriptText(entry!.gurmukhi, scriptMode)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

        </div>
      </div>
    </div>
  )
}
