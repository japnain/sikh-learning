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
import { SGGS_ANG_COUNT, DG_ANG_COUNT } from '../utils/dailyPick'
import { buildCanonicalBaniStudyPath } from '../utils/baniRouteResolver'
import { getUiCopy } from '../utils/uiCopy'
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
  const libraryCopy = copy.library
  const { bookmarks, removeBookmark } = useBookmarksStore()
  const { favorites, removeFavorite } = useFavoritesStore()
  const { vocab } = useVocabStore()
  const { currentSession, studied } = useProgressStore()
  const { getProgress } = useReadingProgressStore()
  const { getEntryById } = useScriptureCacheStore()
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({
    bookmarks: bookmarks.length > 0,
    library: false,
  }))

  const words = vocab.filter(item => (item.kind ?? 'word') === 'word')
  const phrases = vocab.filter(item => (item.kind ?? 'word') === 'phrase')
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

  const toggle = (id: string) => setExpanded(c => ({ ...c, [id]: !c[id] }))

  return (
    <div className="page-shell animate-fade-in">
      <div className="mb-5">
        <p className="eyebrow">{libraryCopy.eyebrow}</p>
        <h1 className="font-display text-4xl text-ink dark:text-dark-text leading-none mt-2">{libraryCopy.title}</h1>
        <p className="font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65 mt-3">
          {libraryCopy.body}
        </p>
      </div>

      <section className="section-shell-quiet p-4 mb-5">
        <button
          onClick={() => toggle('library')}
          className="w-full flex justify-between items-center gap-3"
        >
          <div className="text-left">
            <p className="eyebrow">{libraryCopy.sourceBrowsing}</p>
            <p className="font-sans text-sm text-ink dark:text-dark-text mt-1">{libraryCopy.sourceBrowsingBody}</p>
          </div>
          <span className="text-gold dark:text-gold-light">{expanded.library ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}</span>
        </button>

        {expanded.library && (
          <div className="mt-4 space-y-3">
            {SECTIONS.map(section => {
              const isOpen = expanded[section.id]
              return (
                <div key={section.id} className="section-shell px-4 py-4">
                  <button
                    onClick={() => toggle(section.id)}
                    className="w-full flex justify-between items-center gap-3"
                  >
                    <p className="font-sans font-semibold text-sm text-ink dark:text-dark-text">{section.name}</p>
                    <span className="text-gold dark:text-gold-light">{isOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}</span>
                  </button>
                  {isOpen && (
                    <div className="mt-4">
                      <AngBrowser source={section.source} totalAngs={section.totalAngs} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="hero-surface p-5 mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{libraryCopy.savedSnapshot}</p>
            <p className="font-display text-3xl text-ink dark:text-dark-text leading-none mt-2">{libraryCopy.returnKeep}</p>
          </div>
          <IconLibrary size={20} className="text-gold dark:text-gold-light mt-1" />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-5">
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
      </section>

      {favorites.length > 0 && (
        <section className="section-shell-quiet p-4 mb-5">
          <p className="eyebrow mb-3">Favorites</p>
          <div className="space-y-2">
            {favorites.map(favorite => (
              <div key={favorite.id} className="section-shell px-4 py-4 relative">
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

      <div className="grid gap-3 mb-5">
        <button
          onClick={() => navigate('/vocab')}
          className="section-shell p-4 text-left"
        >
          <p className="eyebrow">{libraryCopy.reviewBank}</p>
          <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">{libraryCopy.reviewBankTitle}</p>
          <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-1">
            {words.length} saved words and {phrases.length} saved phrases are ready for review.
          </p>
        </button>

        {currentSession && (
          <button
            onClick={() => {
              const parts = currentSession.scriptureId.split('-')
              if (parts.length >= 2) navigate(`/study?source=${parts[0]}&ang=${parts[1]}`)
            }}
            className="section-shell p-4 text-left"
          >
            <p className="eyebrow">{libraryCopy.resume}</p>
            <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">{libraryCopy.resumeTitle}</p>
            <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-1">
              {resumeReference}
            </p>
          </button>
        )}
      </div>

      {inProgress.length > 0 && (
        <section className="section-shell-quiet p-4 mb-5">
          <p className="eyebrow mb-3">In Progress</p>
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
        <section className="section-shell-quiet p-4 mb-5">
          <button
            onClick={() => toggle('bookmarks')}
            className="w-full flex justify-between items-center gap-3"
          >
            <div className="text-left">
              <p className="eyebrow">Bookmarks</p>
              <p className="font-sans text-sm text-ink dark:text-dark-text mt-1">{bookmarks.length} saved passage{bookmarks.length === 1 ? '' : 's'}</p>
            </div>
            <span className="text-gold dark:text-gold-light">{expanded.bookmarks ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}</span>
          </button>
          {expanded.bookmarks && (
            <div className="mt-4 space-y-2">
              {bookmarks.map((bookmark: Bookmark) => (
                <div
                  key={bookmark.id}
                  className="section-shell px-4 py-4 relative"
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
        <section className="section-shell p-4 mb-5">
          <p className="eyebrow mb-3">Reading History</p>
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

    </div>
  )
}
