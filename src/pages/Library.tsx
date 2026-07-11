import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BANIS } from '../data/banis'
import { useBookmarksStore, type Bookmark } from '../store/bookmarks'
import { useFavoritesStore } from '../store/favorites'
import { buildSessionResumePath, useProgressStore } from '../store/progress'
import { useReadingProgressStore } from '../store/readingProgress'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { useVocabStore } from '../store/vocab'
import { useLocaleStore } from '../store/locale'
import { useLanguageStore } from '../store/language'
import { useSavedFeedbackStore } from '../store/savedFeedback'
import { buildCanonicalBaniStudyPath } from '../utils/baniRouteResolver'
import { buildSavedStudyPath } from '../utils/savedStudyPath'
import { getUiCopy } from '../utils/uiCopy'
import { getEditorialCopy } from '../content/editorialCopy'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import {
  IconBookmarkFilled,
  IconChevronDown,
  IconChevronUp,
  IconClose,
  IconHeartFilled,
  IconLibrary,
} from '../components/icons'

const SOURCE_SHORT_NAME: Record<string, string> = {
  G: 'SGGS', D: 'DG', B: 'BGV', A: 'AK',
}

const SOURCE_FULL_NAME: Record<string, string> = {
  G: 'Sri Guru Granth Sahib Ji',
  D: 'Dasam Granth',
  B: 'Bhai Gurdas Ji Vaaran',
  A: 'Amrit Keertan',
}

const angLabel = (source: string) => source === 'G' || source === 'D' ? 'Ang' : 'Page'

function formatSessionReference(scriptureId: string): string {
  const [source, ang] = scriptureId.split('-')
  if (!source || !ang) return scriptureId.toUpperCase()
  const sourceLabel = SOURCE_FULL_NAME[source] ?? SOURCE_SHORT_NAME[source] ?? source.toUpperCase()
  return `${sourceLabel} · ${angLabel(source)} ${ang}`
}

export default function Library() {
  const locale = useLocaleStore(s => s.locale)
  const scriptMode = useLanguageStore(state => state.scriptMode)
  const copy = getUiCopy(locale)
  const editorial = getEditorialCopy(locale)
  const libraryCopy = copy.library
  const { bookmarks, removeBookmark } = useBookmarksStore()
  const { favorites, removeFavorite } = useFavoritesStore()
  const { vocab } = useVocabStore()
  const lastSaved = useSavedFeedbackStore(state => state.lastSaved)
  const { currentSession, studied } = useProgressStore()
  const { getProgress } = useReadingProgressStore()
  const { getEntryById } = useScriptureCacheStore()
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({
    bookmarks: bookmarks.length > 0,
  }))

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
  const resumeReference = currentSession ? formatSessionReference(currentSession.scriptureId) : null
  const savedShelfNotice = useMemo(() => {
    switch (lastSaved?.kind) {
      case 'bookmark':
        return 'Bookmarked passage added to Saved.'
      case 'favorite':
        return 'Favorite added to Saved.'
      case 'review':
        return 'Review Bank updated.'
      default:
        return null
    }
  }, [lastSaved?.kind])
  const hasSavedShelfContent = (
    bookmarks.length
    + favorites.length
    + phrases.length
    + words.length
    + inProgress.length
    + recentStudy.length
  ) > 0

  const toggle = (id: string) => setExpanded(c => ({ ...c, [id]: !c[id] }))

  return (
    <div className="page-shell animate-fade-in" data-testid="page-library" data-page="library" data-ai-surface="library" data-ai-state="ready">
      <div className="mb-5">
        <p className="eyebrow">{libraryCopy.eyebrow}</p>
        <h1 className="font-display text-4xl text-ink dark:text-dark-text leading-none mt-2">{libraryCopy.title}</h1>
        <p className="font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65 mt-3">
          {editorial?.library.body ?? libraryCopy.body}
        </p>
      </div>

      <div className="library-adaptive-layout">
        <aside className="library-shelf-rail" aria-label="Saved overview">
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
            <p className="eyebrow">Start the shelf</p>
            <p className="mt-2 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/72">
              Saved words, bookmarks, favorites, and reading history will settle here once you begin keeping passages close.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to="/banis"
                className="interactive-focus interactive-pill-link rounded-lg bg-saffron px-4 py-2 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-white"
              >
                Browse Read
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

      {favorites.length > 0 && (
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
            <span className="chip-pill">{favorites.length}</span>
          </div>
          <div className="space-y-2">
            {favorites.map(favorite => (
              <div key={favorite.id} className="section-shell px-4 py-4 relative border border-saffron/12 dark:border-saffron/16">
                <button
                  onClick={() => removeFavorite(favorite.id)}
                  className="absolute right-1 top-1 flex min-h-[44px] min-w-[44px] items-center justify-center text-ink/68 dark:text-dark-text/64"
                  aria-label="Remove favorite"
                >
                  <IconClose size={14} />
                </button>
                <Link
                  to={buildSavedStudyPath(favorite)}
                  className={`interactive-focus interactive-card-link w-full rounded-lg pr-12 text-left ${lastSaved?.kind === 'favorite' && lastSaved.targetId === favorite.id ? 'saved-feedback-highlight' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <IconHeartFilled size={14} className="text-saffron dark:text-saffron-light" />
                    <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold-dark dark:text-gold-light">
                      {SOURCE_SHORT_NAME[favorite.source] ?? favorite.source} · {angLabel(favorite.source)} {favorite.ang}
                    </span>
                  </div>
                  <p className="font-sans font-semibold text-sm text-ink dark:text-dark-text">{favorite.title}</p>
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
              ? `${words.length} words · ${phrases.length} phrases. ${editorial.library.reviewBody}`
              : `${words.length} saved words and ${phrases.length} saved phrases are ready for review.`}
          </p>
        </Link>

        <Link
          to={resumePath ?? '/banis'}
          className="section-shell interactive-focus interactive-card-link p-4 text-left"
          data-testid="library-resume-reading"
        >
          <p className="eyebrow">{currentSession ? libraryCopy.resume : 'Read'}</p>
          <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">
            {currentSession ? libraryCopy.resumeTitle : 'Browse Read'}
          </p>
          <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-1">
            {currentSession
              ? resumeReference
              : 'Choose a bani, ang, or scripture section when you do not have an active reading session yet.'}
          </p>
        </Link>

        {currentSession ? (
          <Link
            to="/banis"
            className="section-shell interactive-focus interactive-card-link p-4 text-left sm:col-span-2"
            data-testid="library-browse-read"
          >
            <p className="eyebrow">Read</p>
            <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">Browse Read</p>
            <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-1">
              Open exact banis, angs, and scripture sections without leaving the Saved shelf behind.
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
          <p id="library-in-progress-title" className="eyebrow mb-3">In Progress</p>
          <div className="space-y-2">
            {inProgress.map(item => (
              <Link
                key={item.id}
                to={buildCanonicalBaniStudyPath(item)}
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

      {bookmarks.length > 0 && (
        <section
          className="section-shell-quiet p-4 mb-5 border border-gold/15 dark:border-gold/18"
          aria-labelledby="library-bookmarks-title"
          data-testid="library-bookmarks"
        >
          <button
            onClick={() => toggle('bookmarks')}
            className="w-full flex justify-between items-center gap-3"
            aria-expanded={Boolean(expanded.bookmarks)}
            aria-controls="library-bookmarks-panel"
          >
            <div className="text-left flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/12 text-gold-dark dark:bg-gold/14 dark:text-gold-light">
                <IconBookmarkFilled size={14} />
              </span>
              <div>
                <p id="library-bookmarks-title" className="eyebrow">{libraryCopy.bookmarks}</p>
                <p className="font-sans text-sm text-ink/72 dark:text-dark-text/74 mt-1">{bookmarks.length} saved passage{bookmarks.length === 1 ? '' : 's'}</p>
              </div>
            </div>
            <span className="icon-surface h-8 w-8 text-gold-dark dark:text-gold-light">{expanded.bookmarks ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}</span>
          </button>
          {expanded.bookmarks && (
            <div id="library-bookmarks-panel" className="mt-4 space-y-2">
              {bookmarks.map((bookmark: Bookmark) => (
                <div
                  key={bookmark.id}
                  className="section-shell px-4 py-4 relative border border-gold/12 dark:border-gold/16"
                >
                  <button
                    onClick={() => removeBookmark(bookmark.id)}
                    className="absolute right-1 top-1 flex min-h-[44px] min-w-[44px] items-center justify-center text-ink/68 dark:text-dark-text/64"
                    aria-label="Remove bookmark"
                  >
                    <IconClose size={14} />
                  </button>
                  <Link
                    to={buildSavedStudyPath(bookmark)}
                    className={`interactive-focus interactive-card-link w-full rounded-lg pr-12 text-left ${lastSaved?.kind === 'bookmark' && lastSaved.targetId === bookmark.id ? 'saved-feedback-highlight' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <IconBookmarkFilled size={14} className="text-gold-dark dark:text-gold-light" />
                      <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold-dark dark:text-gold-light">
                        {SOURCE_SHORT_NAME[bookmark.source] ?? bookmark.source} · {angLabel(bookmark.source)} {bookmark.ang}
                      </span>
                    </div>
                    <p className="font-sans font-semibold text-sm text-ink dark:text-dark-text">{bookmark.title}</p>
                    {bookmark.description && (
                      <p className="font-sans text-xs text-ink/68 dark:text-dark-text/64 italic mt-1">{bookmark.description}</p>
                    )}
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
          <p id="library-reading-history-title" className="eyebrow mb-3">Reading History</p>
          <div className="space-y-2">
            {recentStudy.map(entry => (
              <Link
                key={entry!.id}
                to={`/study?source=${entry!.id.split('-')[0]}&ang=${entry!.id.split('-')[1]}`}
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
