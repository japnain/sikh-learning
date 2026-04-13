import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BANIS } from '../data/banis'
import { useBookmarksStore, type Bookmark } from '../store/bookmarks'
import { useFavoritesStore } from '../store/favorites'
import { useProgressStore } from '../store/progress'
import { useReadingProgressStore } from '../store/readingProgress'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { useVocabStore } from '../store/vocab'
import { useLocaleStore } from '../store/locale'
import { useLearningStore } from '../store/learning'
import useLearnCatalog from '../hooks/useLearnCatalog'
import { SGGS_ANG_COUNT, DG_ANG_COUNT } from '../utils/dailyPick'
import { buildCanonicalBaniStudyPath } from '../utils/baniRouteResolver'
import { getLearnSavedItems, getLearnItemLabel } from '../utils/learnExperience'
import { buildLearnDetailPath, buildLearnTabPath } from '../utils/learnRails'
import { getUiCopy } from '../utils/uiCopy'
import { getEditorialCopy } from '../content/editorialCopy'
import {
  IconArrowLeft,
  IconArrowRight,
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

function AngBrowser({ source, totalAngs }: { source: string; totalAngs: number }) {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50
  const start = page * PAGE_SIZE + 1
  const end = Math.min(start + PAGE_SIZE - 1, totalAngs)

  return (
    <div>
      <div className="grid grid-cols-5 gap-2 mb-4">
        {Array.from({ length: end - start + 1 }, (_, i) => start + i).map(ang => (
          <button
            key={ang}
            onClick={() => navigate(`/study?source=${source}&ang=${ang}`)}
            className="section-shell min-h-[44px] rounded-2xl py-2 font-sans text-sm text-ink dark:text-dark-text hover:text-gold dark:hover:text-gold-light"
          >
            {ang}
          </button>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="font-sans text-gold dark:text-gold-light text-sm disabled:opacity-30 min-h-[44px] px-3 flex items-center gap-1"
        ><IconArrowLeft size={14} /> Prev</button>
        <span className="font-sans text-ink/50 dark:text-dark-text/50 text-xs">{angLabel(source)} {start}–{end} of {totalAngs}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={end >= totalAngs}
          className="font-sans text-gold dark:text-gold-light text-sm disabled:opacity-30 min-h-[44px] px-3 flex items-center gap-1"
        >Next <IconArrowRight size={14} /></button>
      </div>
    </div>
  )
}

interface Section {
  id: string
  name: string
  source: string
  totalAngs: number
}

const SECTIONS: Section[] = [
  { id: 'sggs', name: 'Sri Guru Granth Sahib Ji', source: 'G', totalAngs: SGGS_ANG_COUNT },
  { id: 'dasam-granth', name: 'Dasam Granth', source: 'D', totalAngs: DG_ANG_COUNT },
  { id: 'bhai-gurdas-vaaran', name: 'Bhai Gurdas Ji Vaaran', source: 'B', totalAngs: 628 },
]

export default function Library() {
  const navigate = useNavigate()
  const locale = useLocaleStore(s => s.locale)
  const copy = getUiCopy(locale)
  const editorial = getEditorialCopy(locale)
  const libraryCopy = copy.library
  const { bookmarks, removeBookmark } = useBookmarksStore()
  const { favorites, removeFavorite } = useFavoritesStore()
  const { vocab } = useVocabStore()
  const savedLearnItemIds = useLearningStore(state => state.learnState.savedItemIds)
  const toggleSavedLearnItem = useLearningStore(state => state.toggleSavedLearnItem)
  const { currentSession, studied } = useProgressStore()
  const { getProgress } = useReadingProgressStore()
  const { getEntryById } = useScriptureCacheStore()
  const { catalog, loading: learnCatalogLoading } = useLearnCatalog()
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({
    bookmarks: bookmarks.length > 0,
    learnSaves: savedLearnItemIds.length > 0,
    library: false,
  }))

  const words = vocab.filter(item => (item.kind ?? 'word') === 'word')
  const phrases = vocab.filter(item => (item.kind ?? 'word') === 'phrase')
  const learnSavedItems = useMemo(
    () => (catalog ? getLearnSavedItems(catalog, savedLearnItemIds) : []),
    [catalog, savedLearnItemIds]
  )
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
  const hasSavedShelfContent = (
    savedLearnItemIds.length
    + bookmarks.length
    + favorites.length
    + phrases.length
    + words.length
    + inProgress.length
    + recentStudy.length
  ) > 0

  const toggle = (id: string) => setExpanded(c => ({ ...c, [id]: !c[id] }))

  return (
    <div className="page-shell animate-fade-in" data-testid="page-library" data-page="library">
      <div className="mb-5">
        <p className="eyebrow">{libraryCopy.eyebrow}</p>
        <h1 className="font-display text-4xl text-ink dark:text-dark-text leading-none mt-2">{libraryCopy.title}</h1>
        <p className="font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65 mt-3">
          {editorial?.library.body ?? libraryCopy.body}
        </p>
      </div>

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
          <IconLibrary size={20} className="text-gold dark:text-gold-light mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-5 sm:grid-cols-4">
          <div className="section-shell-quiet px-3 py-3">
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{savedLearnItemIds.length}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45 mt-1">{libraryCopy.learnSaves}</p>
          </div>
          <div className="section-shell-quiet px-3 py-3">
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{bookmarks.length}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45 mt-1">{libraryCopy.bookmarks}</p>
          </div>
          <div className="section-shell-quiet px-3 py-3">
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{favorites.length}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45 mt-1">{libraryCopy.favorites}</p>
          </div>
          <div className="section-shell-quiet px-3 py-3">
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{phrases.length}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45 mt-1">{libraryCopy.phrases}</p>
          </div>
        </div>
        {!hasSavedShelfContent ? (
          <div className="section-shell-quiet mt-5 p-4 border border-gold/12 dark:border-gold/16">
            <p className="eyebrow">Start the shelf</p>
            <p className="mt-2 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/72">
              Saved words, Learn guides, bookmarks, and reading history will settle here once you begin keeping pieces close.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate(buildLearnTabPath('today'))}
                className="rounded-full bg-gradient-to-r from-saffron to-saffron-light px-4 py-2 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-white"
              >
                Open Today
              </button>
              <button
                type="button"
                onClick={() => navigate('/banis')}
                className="rounded-full border border-sand/18 bg-white/76 px-4 py-2 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-ink dark:border-dark-text/10 dark:bg-dark-card/78 dark:text-dark-text"
              >
                Browse Read
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {favorites.length > 0 && (
        <section
          className="section-shell p-4 mb-5 border border-saffron/15 bg-gradient-to-br from-saffron/6 via-white/70 to-white/95 dark:border-saffron/20 dark:from-saffron/10 dark:via-dark-card dark:to-dark-surface"
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
                  className="absolute top-3 right-3 text-ink/40 dark:text-dark-text/40 min-h-[24px] min-w-[24px] flex items-center justify-center"
                  aria-label="Remove favorite"
                >
                  <IconClose size={14} />
                </button>
                <button
                  onClick={() => {
                    if (favorite.shabadId) {
                      navigate(`/study?shabadId=${favorite.shabadId}`)
                      return
                    }
                    navigate(`/study?source=${favorite.source}&ang=${favorite.ang}`)
                  }}
                  className="text-left w-full pr-6"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <IconHeartFilled size={14} className="text-saffron dark:text-saffron-light" />
                    <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                      {SOURCE_SHORT_NAME[favorite.source] ?? favorite.source} · {angLabel(favorite.source)} {favorite.ang}
                    </span>
                  </div>
                  <p className="font-sans font-semibold text-sm text-ink dark:text-dark-text">{favorite.title}</p>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-3 mb-5 sm:grid-cols-2" data-testid="library-shortcuts">
        <button
          onClick={() => navigate('/vocab')}
          className="section-shell p-4 text-left"
          data-testid="library-open-vocab"
        >
          <p className="eyebrow">{libraryCopy.reviewBank}</p>
          <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">{libraryCopy.reviewBankTitle}</p>
          <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-1">
            {editorial?.library.reviewBody
              ? `${words.length} words · ${phrases.length} phrases. ${editorial.library.reviewBody}`
              : `${words.length} saved words and ${phrases.length} saved phrases are ready for review.`}
          </p>
        </button>

        <button
          onClick={() => {
            if (currentSession) {
              const parts = currentSession.scriptureId.split('-')
              if (parts.length >= 2) {
                navigate(`/study?source=${parts[0]}&ang=${parts[1]}`)
                return
              }
            }

            navigate(buildLearnTabPath('today'))
          }}
          className="section-shell p-4 text-left"
          data-testid="library-resume-reading"
        >
          <p className="eyebrow">{currentSession ? libraryCopy.resume : 'Learn'}</p>
          <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">
            {currentSession ? libraryCopy.resumeTitle : 'Open Today'}
          </p>
          <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-1">
            {currentSession
              ? resumeReference
              : 'Return through today’s rotating Learn doorway when you do not have an active reading session yet.'}
          </p>
        </button>

        <button
          onClick={() => navigate('/banis')}
          className="section-shell p-4 text-left sm:col-span-2"
          data-testid="library-browse-read"
        >
          <p className="eyebrow">Read</p>
          <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">Browse Read</p>
          <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-1">
            Open exact banis, angs, and scripture sections without leaving the Saved shelf behind.
          </p>
        </button>
      </div>

      {savedLearnItemIds.length > 0 && (
        <section
          className="section-shell-quiet p-4 mb-5 border border-gold/15 dark:border-gold/18"
          aria-labelledby="library-learn-saves-title"
          data-testid="library-learn-saves"
        >
          <button
            onClick={() => toggle('learnSaves')}
            className="w-full flex justify-between items-center gap-3"
            aria-expanded={Boolean(expanded.learnSaves)}
            aria-controls="library-learn-saves-panel"
          >
            <div className="text-left flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/12 text-gold dark:bg-gold/14 dark:text-gold-light">
                <IconBookmarkFilled size={14} />
              </span>
              <div>
                <p id="library-learn-saves-title" className="eyebrow">{libraryCopy.learnSaves}</p>
                <p className="font-sans text-sm text-ink/72 dark:text-dark-text/74 mt-1">{savedLearnItemIds.length} saved Learn item{savedLearnItemIds.length === 1 ? '' : 's'}</p>
              </div>
            </div>
            <span className="text-gold dark:text-gold-light">{expanded.learnSaves ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}</span>
          </button>
          {expanded.learnSaves && (
            <div id="library-learn-saves-panel" className="mt-4 space-y-2">
              {learnCatalogLoading && learnSavedItems.length === 0 ? (
                <div className="section-shell px-4 py-4 border border-gold/12 dark:border-gold/16">
                  <p className="font-sans text-sm text-ink/72 dark:text-dark-text/74">Loading Learn saves…</p>
                </div>
              ) : null}
              {learnSavedItems.map(item => (
                <div
                  key={item.id}
                  className="section-shell px-4 py-4 relative border border-gold/12 dark:border-gold/16"
                >
                  <button
                    onClick={() => toggleSavedLearnItem(item.id)}
                    className="absolute top-3 right-3 text-ink/40 dark:text-dark-text/40 min-h-[24px] min-w-[24px] flex items-center justify-center"
                    aria-label="Remove saved Learn item"
                  >
                    <IconClose size={14} />
                  </button>
                  <button
                    onClick={() => navigate(buildLearnDetailPath(item.kind, item.id, 'saved'))}
                    className="text-left w-full pr-6"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <IconBookmarkFilled size={14} className="text-gold dark:text-gold-light" />
                      <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                        {getLearnItemLabel(item.kind)}
                      </span>
                    </div>
                    <p className="font-sans font-semibold text-sm text-ink dark:text-dark-text">{item.title}</p>
                    <p className="font-sans text-xs text-ink/60 dark:text-dark-text/60 mt-1">{item.subtitle}</p>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {inProgress.length > 0 && (
        <section
          className="section-shell-quiet p-4 mb-5"
          aria-labelledby="library-in-progress-title"
          data-testid="library-in-progress"
        >
          <p id="library-in-progress-title" className="eyebrow mb-3">In Progress</p>
          <div className="space-y-2">
            {inProgress.map(item => (
              <button
                key={item.id}
                onClick={() => navigate(buildCanonicalBaniStudyPath(item))}
                className="w-full section-shell px-4 py-3 text-left"
              >
                <div className="flex justify-between gap-3">
                  <p className="font-sans text-sm text-ink dark:text-dark-text">{item.name}</p>
                  <p className="font-sans text-xs text-ink/45 dark:text-dark-text/45">{item.pct}%</p>
                </div>
                <div className="h-1.5 bg-sand/20 dark:bg-dark-text/10 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-gradient-to-r from-saffron to-saffron-light rounded-full" style={{ width: `${item.pct}%` }} />
                </div>
              </button>
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
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/12 text-gold dark:bg-gold/14 dark:text-gold-light">
                <IconBookmarkFilled size={14} />
              </span>
              <div>
                <p id="library-bookmarks-title" className="eyebrow">{libraryCopy.bookmarks}</p>
                <p className="font-sans text-sm text-ink/72 dark:text-dark-text/74 mt-1">{bookmarks.length} saved passage{bookmarks.length === 1 ? '' : 's'}</p>
              </div>
            </div>
            <span className="text-gold dark:text-gold-light">{expanded.bookmarks ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}</span>
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
                    className="absolute top-3 right-3 text-ink/40 dark:text-dark-text/40 min-h-[24px] min-w-[24px] flex items-center justify-center"
                    aria-label="Remove bookmark"
                  >
                    <IconClose size={14} />
                  </button>
                  <button
                    onClick={() => navigate(`/study?source=${bookmark.source}&ang=${bookmark.ang}`)}
                    className="text-left w-full pr-6"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <IconBookmarkFilled size={14} className="text-gold dark:text-gold-light" />
                      <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                        {SOURCE_SHORT_NAME[bookmark.source] ?? bookmark.source} · {angLabel(bookmark.source)} {bookmark.ang}
                      </span>
                    </div>
                    <p className="font-sans font-semibold text-sm text-ink dark:text-dark-text">{bookmark.title}</p>
                    {bookmark.description && (
                      <p className="font-sans text-xs text-ink/60 dark:text-dark-text/60 italic mt-1">{bookmark.description}</p>
                    )}
                  </button>
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
              <button
                key={entry!.id}
                onClick={() => {
                  const parts = entry!.id.split('-')
                  if (parts.length >= 2) navigate(`/study?source=${parts[0]}&ang=${parts[1]}`)
                }}
                className="w-full section-shell-quiet px-4 py-4 text-left"
              >
                <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                  {entry!.scripture}
                </p>
                <p className="font-gurmukhi text-lg leading-relaxed text-ink dark:text-dark-text mt-2 line-clamp-2">
                  {entry!.gurmukhi}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      <section
        className="section-shell-quiet p-4 mb-5"
        aria-labelledby="library-source-browser-title"
        data-testid="library-source-browser"
      >
        <button
          onClick={() => toggle('library')}
          className="w-full flex justify-between items-center gap-3"
          aria-expanded={Boolean(expanded.library)}
          aria-controls="library-source-browser-panel"
        >
          <div className="text-left">
            <p id="library-source-browser-title" className="eyebrow">{libraryCopy.sourceBrowsing}</p>
            <p className="font-sans text-sm text-ink dark:text-dark-text mt-1">{libraryCopy.sourceBrowsingBody}</p>
          </div>
          <span className="text-gold dark:text-gold-light">{expanded.library ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}</span>
        </button>

        {expanded.library && (
          <div id="library-source-browser-panel" className="mt-4 space-y-3">
            {SECTIONS.map(section => {
              const isOpen = expanded[section.id]
              const panelId = `library-source-${section.id}`
              return (
                <div key={section.id} className="section-shell px-4 py-4">
                  <button
                    onClick={() => toggle(section.id)}
                    className="w-full flex justify-between items-center gap-3"
                    aria-expanded={Boolean(isOpen)}
                    aria-controls={panelId}
                  >
                    <p className="font-sans font-semibold text-sm text-ink dark:text-dark-text">{section.name}</p>
                    <span className="text-gold dark:text-gold-light">{isOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}</span>
                  </button>
                  {isOpen && (
                    <div id={panelId} className="mt-4">
                      <AngBrowser source={section.source} totalAngs={section.totalAngs} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

    </div>
  )
}
