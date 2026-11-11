import '../styles/library.css'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { isBookBookmark, useBookmarksStore, type Bookmark } from '../store/bookmarks'
import { useFavoritesStore, type FavoriteItem } from '../store/favorites'
import { buildSessionResumePath, useProgressStore } from '../store/progress'
import { getReadingPlaceKey } from '../store/readingPlaces'
import { useContinueReadings } from '../hooks/useContinueReadings'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { useVocabStore } from '../store/vocab'
import { useLocaleStore } from '../store/locale'
import { useLanguageStore } from '../store/language'
import { useStoryStore } from '../store/stories'
import SavedStories from '../components/SavedStories'
import { useSavedFeedbackStore } from '../store/savedFeedback'
import { buildSavedStudyPath } from '../utils/savedStudyPath'
import {
  buildLibraryReaderNavigationState,
  buildReaderOriginNavigationState,
} from '../utils/libraryReaderNavigation'
import { getUiCopy } from '../utils/uiCopy'
import { getEditorialCopy } from '../content/editorialCopy'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import { formatSourceReaderReference, SOURCE_READER_META } from '../utils/sourceReaderMeta'
import type { ScriptMode, UiLocale, VocabEntry } from '../types'
import type { SavedMeaning } from '../utils/savedShelf'
import { useReadingVisibilityStore } from '../store/readingVisibility'
import { SAVED_SHELF_COPY } from '../utils/savedShelfCopy'
import { matchesSavedSearch, normalizeSavedSearch, savedPassageMatches, savedPassageMeaning, savedVocabMatches, savedVocabMeaning, savedReviewPath } from '../utils/savedShelf'
import savedMuralSrc from '../assets/living-library/saved-mural-landscape.avif'
import {
  IconBookmarkFilled,
  IconChevronDown,
  IconChevronUp,
  IconClose,
  IconHeartFilled,
} from '../components/icons'

const SOURCE_FULL_NAME: Record<string, string> = {
  G: SOURCE_READER_META.G.name,
  D: SOURCE_READER_META.D.name,
  B: SOURCE_READER_META.B.name,
  A: SOURCE_READER_META.A.name,
}

type SavedFilter = 'all' | 'favorites' | 'bookmarks' | 'stories' | 'words' | 'phrases'
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
    reviewCounts: (words: number, phrases: number) => `${words} word${words === 1 ? '' : 's'} · ${phrases} phrase${phrases === 1 ? '' : 's'}.`,
    read: 'Read',
    chooseReading: 'Choose a bani, ang, or scripture section when you do not have an active reading session yet.',
    browseReadingBody: 'Open exact banis, angs, and scripture sections without leaving the Saved shelf behind.',
    inProgress: 'Continue reading',
    allReadingPlaces: 'All reading places',
    fewerReadingPlaces: 'Show fewer',
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
    allReadingPlaces: 'ਪੜ੍ਹਨ ਦੀਆਂ ਸਾਰੀਆਂ ਥਾਵਾਂ',
    fewerReadingPlaces: 'ਘੱਟ ਵੇਖੋ',
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
    allReadingPlaces: 'पढ़ने के सभी स्थान',
    fewerReadingPlaces: 'कम दिखाएँ',
    readingHistory: 'पढ़ने का इतिहास',
    book: 'पुस्तक',
  },
} as const

function bookmarkReference(bookmark: Bookmark, bookLabel: string, locale: UiLocale) {
  if (isBookBookmark(bookmark)) return `${bookLabel} · ${bookmark.chapterLabel}`
  return formatSourceReaderReference({
    source: bookmark.source,
    value: bookmark.ang,
    locale,
  })
}

function formatSessionReference(scriptureId: string, locale: UiLocale): string {
  const panthEpisode = scriptureId.match(/^panth-prakash-english-episode-(\d{1,3})$/)
  if (panthEpisode) return `Panth Prakash · Episode ${Number(panthEpisode[1])}`

  const [source, ang] = scriptureId.split('-')
  if (!source || !ang || !SOURCE_FULL_NAME[source]) return scriptureId.startsWith('rehat') ? 'Rehat' : scriptureId
  return formatSourceReaderReference({
    source,
    value: ang,
    locale,
    sourceLabel: SOURCE_FULL_NAME[source],
  })
}

function SavedMeaningPreview({ meaning, scriptMode }: { meaning: SavedMeaning | null; scriptMode: ScriptMode }) {
  if (!meaning) return null
  const isPunjabi = meaning.lang === 'pa'
  return <p lang={isPunjabi ? getScriptTextLang(scriptMode) : meaning.lang} className={`${isPunjabi ? getScriptTextFontClass(scriptMode) : meaning.lang === 'hi' ? 'font-devanagari' : 'font-sans'} mt-2 line-clamp-3 text-sm leading-relaxed text-ink/72 dark:text-dark-text/72`}>
    {isPunjabi ? renderScriptText(meaning.text, scriptMode) : meaning.text}
  </p>
}

export default function Library() {
  const locale = useLocaleStore(s => s.locale)
  const scriptMode = useLanguageStore(state => state.scriptMode)
  const meaningLanguage = useLanguageStore(state => state.meaningLanguage)
  const showTransliteration = useLanguageStore(state => state.showTransliteration)
  const copy = getUiCopy(locale)
  const editorial = getEditorialCopy(locale)
  const libraryCopy = copy.library
  const messages = LIBRARY_MESSAGES[locale]
  const shelfCopy = SAVED_SHELF_COPY[locale]
  const { bookmarks, removeBookmark, restoreBookmark } = useBookmarksStore()
  const savedStories = useStoryStore(state => state.saved)
  const { favorites, removeFavorite, restoreFavorite } = useFavoritesStore()
  const vocab = useVocabStore(state => state.vocab)
  const lastSaved = useSavedFeedbackStore(state => state.lastSaved)
  const { currentSession, studied } = useProgressStore()
  const readingPlaces = useContinueReadings()
  const { hidden, hide, restore, restoreAll } = useReadingVisibilityStore()
  const visiblePlaces = readingPlaces.filter(item => hidden[item.id] !== item.updatedAt)
  const [lastHidden, setLastHidden] = useState<{ id: string; title: string } | null>(null)
  const [showAllPlaces, setShowAllPlaces] = useState(false)
  const inProgress = showAllPlaces ? visiblePlaces : visiblePlaces.slice(0, 4)
  const getEntryById = useScriptureCacheStore(state => state.getEntryById)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [bookmarksExpanded, setBookmarksExpanded] = useState(true)
  const [savedQuery, setSavedQuery] = useState('')
  const [savedFilter, setSavedFilter] = useState<SavedFilter>('all')
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null)
  const [savedActionNotice, setSavedActionNotice] = useState<string | null>(null)

  const words = vocab.filter(item => (item.kind ?? 'word') === 'word')
  const phrases = vocab.filter(item => item.kind === 'phrase')
  const counts = { bookmarks: bookmarks.length, favorites: favorites.length, stories: Object.keys(savedStories).length, words: words.length, phrases: phrases.length }
  const totalSaved = Object.values(counts).reduce((sum, count) => sum + count, 0)
  const filterLabels = { ...messages.filters, stories: shelfCopy.stories, words: shelfCopy.words, phrases: shelfCopy.phrases }
  const currentPlace = currentSession ? readingPlaces.find(item => item.id === getReadingPlaceKey(currentSession.resumePath)) : null
  const resumePath = currentPlace?.path ?? (currentSession?.resumePath.startsWith('/library/') ? null : buildSessionResumePath(currentSession))
  const resumeReference = currentPlace ? `${currentPlace.title} · ${currentPlace.detail}`
    : currentSession?.readerLocator?.title || (currentSession ? formatSessionReference(currentSession.scriptureId, locale) : null)
  const allRecentStudy = [...studied].reverse().map(item => getEntryById(item.id)).filter(Boolean)
  const recentStudy = showAllHistory ? allRecentStudy : allRecentStudy.slice(0, 3)
  const normalizedSavedQuery = normalizeSavedSearch(savedQuery)
  const isBrowsing = !normalizedSavedQuery && savedFilter === 'all'
  const savedShelfNotice = lastSaved ? messages.notices[lastSaved.kind] : null
  const hasSavedShelfContent = totalSaved + readingPlaces.length + allRecentStudy.length > 0 || Boolean(resumePath)
  const sortedBookmarks = useMemo(() => [...bookmarks].sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt)), [bookmarks])
  const sortedFavorites = useMemo(() => [...favorites].sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt)), [favorites])
  const includesKind = (kind: SavedFilter) => savedFilter === 'all' || savedFilter === kind
  const visibleBookmarks = includesKind('bookmarks') ? sortedBookmarks.filter(item => savedPassageMatches(item, savedQuery, scriptMode)) : []
  const visibleFavorites = includesKind('favorites') ? sortedFavorites.filter(item => savedPassageMatches(item, savedQuery, scriptMode)) : []
  const visibleStories = includesKind('stories') ? Object.values(savedStories)
    .filter(story => matchesSavedSearch([story.title, story.subtitle, story.description, ...story.themes, ...story.people], savedQuery))
    .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt)) : []
  const visibleVocab = (items: VocabEntry[], kind: SavedFilter) => includesKind(kind) ? items
    .filter(item => savedVocabMatches(item, savedQuery, scriptMode))
    .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt)) : []
  const visibleWords = visibleVocab(words, 'words')
  const visiblePhrases = visibleVocab(phrases, 'phrases')
  const resultCount = visibleBookmarks.length + visibleFavorites.length + visibleStories.length + visibleWords.length + visiblePhrases.length

  const handleRemove = (removal: PendingRemoval) => {
    const result = removal.kind === 'bookmark' ? removeBookmark(removal.item.id) : removeFavorite(removal.item.id)
    setPendingRemoval(removal)
    setSavedActionNotice(result.persisted ? messages.removed(removal.item.title) : messages.storageUnavailable)
  }
  const handleUndoRemoval = () => {
    if (!pendingRemoval) return
    const result = pendingRemoval.kind === 'bookmark' ? restoreBookmark(pendingRemoval.item) : restoreFavorite(pendingRemoval.item)
    setSavedActionNotice(result.persisted ? messages.restored(pendingRemoval.item.title) : messages.storageUnavailable)
    setPendingRemoval(null)
  }

  const passageCard = (item: Bookmark | FavoriteItem, kind: 'bookmark' | 'favorite') => {
    const book = isBookBookmark(item as Bookmark)
    const meaning = savedPassageMeaning(item, meaningLanguage)
    const scriptTitle = /[\u0A00-\u0A7F]/.test(item.title)
    const path = buildSavedStudyPath(item)
    return <article key={item.id} className="section-shell library-saved-card relative border border-gold/12 p-4 dark:border-gold/16">
      <button type="button" onClick={() => handleRemove(kind === 'bookmark' ? { kind, item: item as Bookmark } : { kind, item: item as FavoriteItem })}
        className="library-remove-button absolute right-1 top-1 flex min-h-11 min-w-11 items-center justify-center text-ink/68 dark:text-dark-text/64"
        aria-label={kind === 'bookmark' ? messages.removeBookmark(item.title) : messages.removeFavorite(item.title)}><IconClose size={14} /></button>
      <Link to={path} state={buildReaderOriginNavigationState(path, '/saved')}
        className={`interactive-focus interactive-card-link w-full rounded-lg pr-10 text-left ${lastSaved?.kind === kind && lastSaved.targetId === item.id ? 'saved-feedback-highlight' : ''}`}>
        <p lang={locale} className="font-sans text-xs text-gold-dark dark:text-gold-light mb-2">{kind === 'bookmark' ? bookmarkReference(item as Bookmark, messages.book, locale) : formatSourceReaderReference({ source: (item as FavoriteItem).source, value: (item as FavoriteItem).ang, locale })}</p>
        <h3 lang={scriptTitle ? getScriptTextLang(scriptMode) : undefined} className={`${scriptTitle ? getScriptTextFontClass(scriptMode) : 'font-sans'} font-semibold text-sm text-ink dark:text-dark-text`}>{renderScriptText(item.title, scriptMode)}</h3>
        {'description' in item && item.description ? <p className="font-sans text-xs text-ink/68 dark:text-dark-text/64 italic mt-1">{item.description}</p> : null}
        {item.excerpt ? <p lang={book ? 'en' : getScriptTextLang(scriptMode)} className={`${book ? 'font-serif' : getScriptTextFontClass(scriptMode)} mt-2 line-clamp-3 text-base leading-relaxed text-ink/76 dark:text-dark-text/76`}>{book ? item.excerpt : renderScriptText(item.excerpt, scriptMode)}</p> : null}
        {showTransliteration && item.transliteration ? <p lang="pa-Latn" className="mt-1 font-sans text-xs leading-5 text-ink/64 dark:text-dark-text/66">{item.transliteration}</p> : null}
        <SavedMeaningPreview meaning={meaning} scriptMode={scriptMode} />
      </Link>
    </article>
  }

  const vocabSection = (items: VocabEntry[], kind: 'words' | 'phrases') => items.length ? <section aria-labelledby={`library-${kind}-title`} data-testid={`library-${kind}`}>
    <div className="library-section-heading"><h2 id={`library-${kind}-title`} className="font-display text-2xl">{shelfCopy[kind]}</h2><span className="chip-pill">{items.length}</span></div>
    <div className="library-saved-grid">{items.map(entry => {
      const meaning = savedVocabMeaning(entry, meaningLanguage)
      return <Link key={`${entry.kind ?? 'word'}:${entry.word}`} to={savedReviewPath(entry)} className="section-shell interactive-focus interactive-card-link p-4">
        <h3 lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-xl leading-relaxed`}>{renderScriptText(entry.word, scriptMode)}</h3>
        {showTransliteration && entry.transliteration ? <p lang="pa-Latn" className="mt-1 font-sans text-xs text-ink/64 dark:text-dark-text/66">{entry.transliteration}</p> : null}
        <SavedMeaningPreview meaning={meaning} scriptMode={scriptMode} />
        <p className="mt-3 font-sans text-xs text-gold-dark dark:text-gold-light">{shelfCopy.review} · {entry.scripture}</p>
      </Link>
    })}</div>
  </section> : null

  return <div className="page-shell animate-fade-in" data-testid="page-library" data-page="library" data-ai-surface="library" data-ai-state="ready">
    <div className="library-intro">
      <header className="library-page-header">
        <p className="eyebrow">{libraryCopy.eyebrow}</p>
        <h1 className="font-display text-4xl text-ink dark:text-dark-text leading-none mt-2">{libraryCopy.title}</h1>
        <p className="font-sans text-sm leading-6 text-ink/72 dark:text-dark-text/65 mt-3">{shelfCopy.body}</p>
      </header>
      <figure className="library-art-band" aria-hidden="true"><img src={savedMuralSrc} alt="" width={1920} height={1080} decoding="async" /></figure>
    </div>
    <div className="library-adaptive-layout">
      <section className="library-shelf-rail" aria-label={messages.overview} data-testid="library-snapshot">
        {totalSaved > 0 || lastSaved ? <div className="library-shelf-metrics">{(['bookmarks', 'favorites', 'stories', 'words', 'phrases'] as const).map(kind => <div key={kind} className={`section-shell-quiet px-3 py-3 ${lastSaved?.kind === (kind === 'bookmarks' ? 'bookmark' : kind === 'favorites' ? 'favorite' : kind === 'words' || kind === 'phrases' ? 'review' : '') ? 'saved-feedback-highlight' : ''}`}>
          <p className="font-sans text-2xl text-ink dark:text-dark-text">{counts[kind]}</p><p className="library-shelf-metric-label">{filterLabels[kind]}</p>
        </div>)}</div> : null}
        {savedShelfNotice ? <p role="status" className="mt-3 font-sans text-xs text-gold-dark dark:text-gold-light">{savedShelfNotice}</p> : null}
        {!hasSavedShelfContent ? <div className="library-shelf-empty">
          <h2 className="font-display text-2xl">{messages.startShelf}</h2><p className="mt-2 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/72">{messages.emptyBody}</p>
          <div className="mt-4 flex flex-wrap gap-2"><Link to="/banis" className="interactive-focus interactive-pill-link rounded-lg bg-[rgb(var(--color-text))] px-4 py-2 font-sans text-sm font-semibold text-[rgb(var(--color-bg))]">{messages.browseRead}</Link><Link to="/vocab" className="interactive-focus interactive-pill-link rounded-lg border border-sand/18 px-4 py-2 font-sans text-sm font-semibold">{libraryCopy.reviewBank}</Link></div>
        </div> : null}
      </section>
      <div className="library-shelf-content">
        {totalSaved > 0 || savedQuery || savedFilter !== 'all' ? <section className="library-search" aria-label={messages.searchLabel}>
          <label className="block"><span className="eyebrow">{messages.searchLabel}</span><input type="search" value={savedQuery} onChange={event => { setSavedQuery(event.target.value); setBookmarksExpanded(true) }} placeholder={messages.searchPlaceholder} aria-describedby="library-search-hint" className="mt-2 min-h-11 w-full rounded-xl border border-sand/20 bg-parchment-card/80 px-4 font-sans text-sm text-ink dark:border-dark-text/12 dark:bg-dark-card/80 dark:text-dark-text" /></label>
          <p id="library-search-hint" className="mt-2 font-sans text-xs leading-5 text-ink/64 dark:text-dark-text/66">{shelfCopy.searchHint}</p>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={messages.overview}>{(['all', 'favorites', 'bookmarks', 'stories', 'words', 'phrases'] as const).map(filter => <button key={filter} type="button" onClick={() => { setSavedFilter(filter); setBookmarksExpanded(true) }} aria-pressed={savedFilter === filter} className={`min-h-11 rounded-full border px-3 font-sans text-xs font-semibold ${savedFilter === filter ? 'border-saffron bg-saffron text-white' : 'border-sand/20 text-ink/72 dark:border-dark-text/12 dark:text-dark-text/72'}`}>{filterLabels[filter]} <span aria-hidden="true" className="ml-1 opacity-75">{filter === 'all' ? totalSaved : counts[filter]}</span></button>)}</div>
          <p className="sr-only" role="status">{shelfCopy.results(resultCount)}</p>
        </section> : null}
        {savedActionNotice ? <div role="status" aria-live="polite" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/16 bg-gold/10 px-3 py-2 font-sans text-xs"><span>{savedActionNotice}</span>{pendingRemoval ? <button type="button" onClick={handleUndoRemoval} className="min-h-11 px-3 font-semibold text-saffron dark:text-saffron-light">{messages.undo}</button> : null}</div> : null}
        {resultCount === 0 && (totalSaved > 0 || savedQuery || savedFilter !== 'all') ? <div role="status" className="section-shell-quiet p-4 font-sans text-sm"><p>{messages.noMatches}</p><button type="button" className="min-h-11 underline" onClick={() => { setSavedQuery(''); setSavedFilter('all'); setBookmarksExpanded(true) }}>{messages.clearSearch}</button></div> : null}

        {visibleFavorites.length > 0 ? <section aria-labelledby="library-favorites-title" data-testid="library-favorites"><div className="library-section-heading"><h2 id="library-favorites-title" className="font-display text-2xl flex items-center gap-2"><IconHeartFilled size={16} className="text-saffron" />{libraryCopy.favorites}</h2><span className="chip-pill">{visibleFavorites.length}</span></div><div className="library-saved-grid">{visibleFavorites.map(item => passageCard(item, 'favorite'))}</div></section> : null}
        {visibleBookmarks.length > 0 ? <section aria-labelledby="library-bookmarks-title" data-testid="library-bookmarks">
          <h2 id="library-bookmarks-title"><button type="button" onClick={() => setBookmarksExpanded(value => !value)} className="library-section-heading w-full min-h-11 text-left" aria-expanded={bookmarksExpanded} aria-controls="library-bookmarks-panel"><span className="font-display text-2xl flex items-center gap-2"><IconBookmarkFilled size={16} className="text-gold-dark" />{libraryCopy.bookmarks}<span className="font-sans text-xs text-ink/64 dark:text-dark-text/66">{messages.savedPassages(visibleBookmarks.length)}</span></span>{bookmarksExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}</button></h2>
          {bookmarksExpanded ? <div id="library-bookmarks-panel" className="library-saved-grid">{visibleBookmarks.map(item => passageCard(item, 'bookmark'))}</div> : null}
        </section> : null}
        <SavedStories stories={visibleStories} />
        {vocabSection(visibleWords, 'words')}
        {vocabSection(visiblePhrases, 'phrases')}

        {isBrowsing && hasSavedShelfContent ? <>
          <div className="library-shortcuts grid gap-3 sm:grid-cols-2" data-testid="library-shortcuts">
            <Link to="/vocab" className={`section-shell interactive-focus interactive-card-link p-4 ${lastSaved?.kind === 'review' ? 'saved-feedback-highlight' : ''}`} data-testid="library-open-vocab"><p className="eyebrow">{libraryCopy.reviewBank}</p><h2 className="font-sans text-base font-semibold mt-2">{libraryCopy.reviewBankTitle}</h2><p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-1">{messages.reviewCounts(words.length, phrases.length)} {editorial?.library.reviewBody}</p></Link>
            <Link to={resumePath ?? '/banis'} state={resumePath ? buildReaderOriginNavigationState(resumePath, '/saved') : undefined} className="section-shell interactive-focus interactive-card-link p-4" data-testid="library-resume-reading"><p className="eyebrow">{resumePath ? libraryCopy.resume : messages.read}</p><h2 className="font-sans text-base font-semibold mt-2">{resumePath ? libraryCopy.resumeTitle : messages.browseRead}</h2><p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-1">{resumePath ? resumeReference : messages.chooseReading}</p></Link>
          </div>
          {readingPlaces.length > 0 ? <section aria-labelledby="library-in-progress-title" data-testid="library-in-progress">
            <h2 id="library-in-progress-title" className="font-display text-2xl mb-3">{messages.inProgress}</h2>
            <div className="space-y-2">{inProgress.map(item => <div key={item.id} className="section-shell relative"><Link to={item.path} state={item.kind === 'story' ? buildLibraryReaderNavigationState('/saved') : buildReaderOriginNavigationState(item.path, '/saved')} className="w-full interactive-focus interactive-card-link pl-4 pr-14 py-3 text-left"><h3 className="font-sans text-sm">{item.title}</h3><p className="mt-1 font-sans text-xs text-ink/68 dark:text-dark-text/64">{item.detail}</p></Link><button type="button" className="absolute right-1 top-1 min-h-11 min-w-11 flex items-center justify-center text-ink/64 dark:text-dark-text/64" aria-label={shelfCopy.hide(item.title)} onClick={() => { hide(item.id, item.updatedAt); setLastHidden({ id: item.id, title: item.title }) }}><IconClose size={14} /></button></div>)}</div>
            {lastHidden ? <div role="status" className="mt-3 font-sans text-xs">{shelfCopy.hidden(lastHidden.title)} <button type="button" className="min-h-11 px-3 underline" onClick={() => { restore(lastHidden.id); setLastHidden(null) }}>{messages.undo}</button></div> : null}
            {visiblePlaces.length > 4 ? <button type="button" className="mt-3 min-h-11 text-sm underline interactive-focus" aria-expanded={showAllPlaces} onClick={() => setShowAllPlaces(value => !value)}>{showAllPlaces ? messages.fewerReadingPlaces : messages.allReadingPlaces}</button> : null}
            {visiblePlaces.length < readingPlaces.length ? <button type="button" className="mt-3 min-h-11 px-2 text-sm underline interactive-focus" onClick={() => { restoreAll(); setLastHidden(null) }}>{shelfCopy.restorePlaces}</button> : null}
          </section> : null}
          {recentStudy.length > 0 ? <section aria-labelledby="library-reading-history-title" data-testid="library-reading-history"><h2 id="library-reading-history-title" className="font-display text-2xl mb-3">{shelfCopy.history}</h2><div className="space-y-2">{recentStudy.map(entry => <Link key={entry!.id} to={`/study?source=${entry!.source}&ang=${entry!.ang}`} state={buildReaderOriginNavigationState(`/study?source=${entry!.source}&ang=${entry!.ang}`, '/saved')} className="w-full section-shell-quiet interactive-focus interactive-card-link px-4 py-4 text-left"><p className="font-sans text-xs text-gold-dark dark:text-gold-light">{entry!.scripture}</p><p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-lg leading-relaxed mt-2 line-clamp-2`}>{renderScriptText(entry!.gurmukhi, scriptMode)}</p></Link>)}</div>{allRecentStudy.length > 3 ? <button type="button" className="mt-3 min-h-11 text-sm underline interactive-focus" aria-expanded={showAllHistory} onClick={() => setShowAllHistory(value => !value)}>{showAllHistory ? messages.fewerReadingPlaces : shelfCopy.allHistory}</button> : null}</section> : null}
        </> : null}
      </div>
    </div>
  </div>
}
