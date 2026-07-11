import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { LibraryChapterIndexEntry, LibraryChapterPayload, LibrarySearchChapterEntry, LibrarySearchIndex, LibraryWork } from '../../types'
import { loadLibraryChapter, loadLibraryChapterIndex, loadLibrarySearchIndex, loadLibraryWorkCatalog } from '../../data/libraryRepository'
import SurfaceStateCard from '../../components/SurfaceStateCard'
import { buildSessionResumePath, useProgressStore } from '../../store/progress'

const DEFAULT_WORK_ID = 'panth-prakash-english'
const INITIAL_VISIBLE_CHAPTERS = 36

type ChapterSearchResult = Pick<LibrarySearchChapterEntry, 'chapterId' | 'title' | 'snippet' | 'episodeNumber' | 'volume' | 'startSourcePage' | 'endSourcePage'>

interface LibraryLoadState {
  key: string
  status: 'loading' | 'ready' | 'error'
  work: LibraryWork | null
  chapters: LibraryChapterIndexEntry[]
  searchIndex: LibrarySearchIndex | null
}

function chapterLabel(chapter: Pick<LibraryChapterIndexEntry, 'kind' | 'episodeNumber' | 'chapterNumber'>) {
  return chapter.kind === 'episode' && chapter.episodeNumber
    ? `Episode ${chapter.episodeNumber}`
    : `Chapter ${chapter.chapterNumber}`
}

function chapterRangeLabel(chapter: Pick<LibraryChapterIndexEntry, 'startSourcePage' | 'endSourcePage'>) {
  return chapter.startSourcePage === chapter.endSourcePage
    ? `EPUB page ${chapter.startSourcePage}`
    : `EPUB pages ${chapter.startSourcePage}-${chapter.endSourcePage}`
}

function chapterPath(workId: string, chapterId: string) {
  return `/library/${workId}/chapters/${chapterId}`
}

export default function PanthPrakashLibraryHome() {
  const { workId: routeWorkId } = useParams<{ workId: string }>()
  const workId = routeWorkId ?? DEFAULT_WORK_ID
  const currentSession = useProgressStore(state => state.currentSession)
  const [loadState, setLoadState] = useState<LibraryLoadState>({
    key: workId,
    status: 'loading',
    work: null,
    chapters: [],
    searchIndex: null,
  })
  const currentLoadState = loadState.key === workId
    ? loadState
    : { key: workId, status: 'loading' as const, work: null, chapters: [], searchIndex: null }
  const { work, chapters, searchIndex, status } = currentLoadState
  const [chapterQuery, setChapterQuery] = useState('')
  const [volumeFilter, setVolumeFilter] = useState<'all' | number>('all')
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_CHAPTERS)
  const [bookSearchQuery, setBookSearchQuery] = useState('')
  const [bookSearchStatus, setBookSearchStatus] = useState<'idle' | 'searching' | 'ready' | 'empty'>('idle')
  const [bookSearchResults, setBookSearchResults] = useState<ChapterSearchResult[]>([])

  useEffect(() => {
    let cancelled = false

    Promise.all([
      loadLibraryWorkCatalog(),
      loadLibraryChapterIndex(workId),
      loadLibrarySearchIndex().catch(() => null),
    ])
      .then(([catalog, loadedChapters, loadedSearchIndex]) => {
        if (cancelled) return
        const loadedWork = catalog.workById[workId] ?? null
        setLoadState({
          key: workId,
          status: loadedWork ? 'ready' : 'error',
          work: loadedWork,
          chapters: loadedChapters,
          searchIndex: loadedSearchIndex,
        })
      })
      .catch(() => {
        if (cancelled) return
        setLoadState({ key: workId, status: 'error', work: null, chapters: [], searchIndex: null })
      })

    return () => {
      cancelled = true
    }
  }, [workId])

  const volumeSummary = (() => {
    const counts = new Map<number, number>()
    for (const chapter of chapters) {
      counts.set(chapter.volume, (counts.get(chapter.volume) ?? 0) + 1)
    }
    return [...counts.entries()].map(([volume, count]) => ({ volume, count }))
  })()

  const filteredChapters = (() => {
    const normalizedQuery = chapterQuery.trim().toLowerCase()
    return chapters.filter(chapter => {
      const matchesVolume = volumeFilter === 'all' || chapter.volume === volumeFilter
      const haystack = `${chapterLabel(chapter)} ${chapter.title} volume ${chapter.volume} ${chapter.startSourcePage} ${chapter.endSourcePage}`.toLowerCase()
      return matchesVolume && (!normalizedQuery || haystack.includes(normalizedQuery))
    })
  })()

  const visibleChapters = filteredChapters.slice(0, visibleCount)
  const firstChapter = chapters[0]
  const firstVolumeTwoChapter = chapters.find(chapter => chapter.volume === 2)
  const continueReadingPath = currentSession && currentSession.resumePath.startsWith(`/library/${workId}/chapters/`)
    ? buildSessionResumePath(currentSession)
    : null

  async function handleBookSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = bookSearchQuery.trim().toLowerCase()
    if (!query) {
      setBookSearchResults([])
      setBookSearchStatus('idle')
      return
    }

    setBookSearchStatus('searching')
    const indexedChapters = searchIndex?.chapters?.filter(entry => entry.workId === workId)

    if (indexedChapters?.length) {
      const matches = indexedChapters
        .map<ChapterSearchResult | null>(entry => {
          const normalizedHaystack = entry.searchText.toLowerCase()
          const index = normalizedHaystack.indexOf(query)
          if (index === -1) return null
          const snippetStart = Math.max(0, index - 90)
          const snippetEnd = Math.min(entry.searchText.length, index + bookSearchQuery.length + 150)
          return {
            chapterId: entry.chapterId,
            title: entry.title,
            episodeNumber: entry.episodeNumber,
            volume: entry.volume,
            startSourcePage: entry.startSourcePage,
            endSourcePage: entry.endSourcePage,
            snippet: entry.searchText.slice(snippetStart, snippetEnd).replace(/\s+/g, ' ').trim(),
          }
        })
        .filter((result): result is ChapterSearchResult => Boolean(result))
        .slice(0, 8)

      setBookSearchResults(matches)
      setBookSearchStatus(matches.length ? 'ready' : 'empty')
      return
    }

    const loadedChapters = await Promise.all(chapters.map(chapter => loadLibraryChapter(workId, chapter.id).catch(() => null)))
    const matches = loadedChapters
      .filter((chapter): chapter is LibraryChapterPayload => Boolean(chapter))
      .map<ChapterSearchResult | null>(chapter => {
        const haystack = [chapter.title, ...chapter.pages.flatMap(page => page.blocks.map(block => block.text))].join(' ')
        const normalizedHaystack = haystack.toLowerCase()
        const index = normalizedHaystack.indexOf(query)
        if (index === -1) return null
        const snippetStart = Math.max(0, index - 90)
        const snippetEnd = Math.min(haystack.length, index + bookSearchQuery.length + 150)
        return {
          chapterId: chapter.id,
          title: chapter.title,
          episodeNumber: chapter.episodeNumber,
          volume: chapter.volume,
          startSourcePage: chapter.startSourcePage,
          endSourcePage: chapter.endSourcePage,
          snippet: haystack.slice(snippetStart, snippetEnd).replace(/\s+/g, ' ').trim(),
        }
      })
      .filter((result): result is ChapterSearchResult => Boolean(result))
      .slice(0, 8)

    setBookSearchResults(matches)
    setBookSearchStatus(matches.length ? 'ready' : 'empty')
  }

  if (status === 'loading') {
    return (
      <SurfaceStateCard
        surface="panth-library-home"
        state="loading"
        eyebrow="Book Reader"
        title="Loading Panth Prakash"
        body="Preparing the EPUB-derived chapter index."
        page="library"
      />
    )
  }

  if (status === 'error' || !work) {
    return (
      <SurfaceStateCard
        surface="panth-library-home"
        state="degraded"
        eyebrow="Book Reader"
        title="Panth Prakash unavailable"
        body="The Panth Prakash book reader could not be loaded yet."
        page="library"
      />
    )
  }

  return (
    <div
      className="page-shell animate-fade-in"
      data-testid="panth-library-home"
      data-page="library-work"
      style={{ paddingBottom: 'calc(var(--nav-stack-height, 7rem) + var(--safe-area-bottom) + 10rem)' }}
    >
      <div className="panth-work-header mb-4">
        <p className="eyebrow">EPUB book reader</p>
        <h1 className="mt-2 font-display text-[2.2rem] leading-none text-ink dark:text-dark-text">{work.title}</h1>
        <p className="mt-3 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/72">
          Read the supplied Sri Gur Panth Prakash EPUBs as a continuous book, organized by volume and episode chapters.
        </p>
      </div>

      <section className="section-shell-quiet px-4 py-4 mb-4" data-testid="panth-epub-coverage">
        <p className="eyebrow">Book coverage</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="chip-pill">{work.totalChapters ?? chapters.length} chapters</span>
          <span className="chip-pill">{work.totalSourcePages ?? work.totalPages} EPUB pages</span>
          {volumeSummary.map(entry => (
            <span key={entry.volume} className="chip-pill">Volume {entry.volume} · {entry.count} chapters</span>
          ))}
          <span className="chip-pill">Source: EPUB</span>
        </div>
      </section>

      <section className="section-shell px-5 py-5 mb-4">
        <p className="eyebrow">Start reading</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {firstChapter ? (
            <Link
              to={chapterPath(work.id, firstChapter.id)}
              className="interactive-focus rounded-lg bg-saffron px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-white"
            >
              Start Volume I
            </Link>
          ) : null}
          {firstVolumeTwoChapter ? (
            <Link
              to={chapterPath(work.id, firstVolumeTwoChapter.id)}
              className="interactive-focus rounded-full border border-sand/18 bg-parchment-card/82 px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-ink dark:border-dark-text/10 dark:bg-dark-card/78 dark:text-dark-text"
            >
              Start Volume II
            </Link>
          ) : null}
          {continueReadingPath ? (
            <Link
              to={continueReadingPath}
              className="interactive-focus rounded-full border border-gold/18 bg-gold/10 px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark dark:border-gold/18 dark:bg-gold/12 dark:text-gold-light"
            >
              Continue reading
            </Link>
          ) : null}
        </div>
      </section>

      <section className="section-shell px-5 py-5 mb-4">
        <p className="eyebrow">Search the book</p>
        <p className="mt-2 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/72">
          Search the EPUB-derived chapter text across both volumes.
        </p>
        <form onSubmit={handleBookSearchSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="panth-book-search" className="sr-only">Search within Panth Prakash chapters</label>
          <input
            id="panth-book-search"
            value={bookSearchQuery}
            onChange={event => setBookSearchQuery(event.target.value)}
            className="min-h-[44px] flex-1 rounded-lg border border-sand/18 bg-parchment-card px-4 py-3 font-sans text-sm text-ink outline-none ring-0 dark:border-dark-text/10 dark:bg-dark-card dark:text-dark-text"
            placeholder="Search the book"
          />
          <button
            type="submit"
            className="interactive-focus rounded-lg bg-ink px-4 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-cream dark:bg-gold-light dark:text-dark-bg"
          >
            Search
          </button>
        </form>
        {bookSearchStatus !== 'idle' ? (
          <div className="mt-4 grid gap-3" data-testid="panth-full-text-results">
            {bookSearchStatus === 'searching' ? (
              <p className="font-sans text-sm text-ink/68 dark:text-dark-text/68">Searching chapters...</p>
            ) : null}
            {bookSearchStatus === 'empty' ? (
              <p className="font-sans text-sm text-ink/68 dark:text-dark-text/68">No chapter matches found.</p>
            ) : null}
            {bookSearchResults.map(result => (
              <Link
                key={result.chapterId}
                to={chapterPath(work.id, result.chapterId)}
                className="interactive-focus interactive-card-link rounded-lg border border-sand/14 bg-parchment-card/70 px-4 py-4 dark:border-dark-text/10 dark:bg-dark-card/62"
              >
                <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark dark:text-gold-light">
                  {result.episodeNumber ? `Episode ${result.episodeNumber}` : `Volume ${result.volume}`} · EPUB pages {result.startSourcePage}-{result.endSourcePage}
                </p>
                <p className="mt-2 font-sans text-sm font-semibold text-ink dark:text-dark-text">{result.title}</p>
                <p className="mt-2 line-clamp-3 font-sans text-xs leading-5 text-ink/68 dark:text-dark-text/66">{result.snippet}</p>
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <section className="section-shell px-5 py-5" data-testid="panth-chapter-browser">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Table of contents</p>
            <h2 className="mt-2 font-display text-3xl leading-none text-ink dark:text-dark-text">Chapters</h2>
          </div>
          <p className="font-sans text-xs leading-5 text-ink/68 dark:text-dark-text/74" data-testid="panth-chapter-count-meta">
            Showing {visibleChapters.length} of {filteredChapters.length} chapters
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="sr-only" htmlFor="panth-chapter-filter">Search chapters</label>
          <input
            id="panth-chapter-filter"
            value={chapterQuery}
            onChange={event => {
              setChapterQuery(event.target.value)
              setVisibleCount(INITIAL_VISIBLE_CHAPTERS)
            }}
            className="min-h-[44px] rounded-lg border border-sand/18 bg-parchment-card px-4 py-3 font-sans text-sm text-ink outline-none ring-0 dark:border-dark-text/10 dark:bg-dark-card dark:text-dark-text"
            placeholder="Filter chapters"
          />
          <div className="flex gap-2">
            {(['all', 1, 2] as const).map(option => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setVolumeFilter(option)
                  setVisibleCount(INITIAL_VISIBLE_CHAPTERS)
                }}
                className={`interactive-focus min-h-[44px] rounded-full px-3 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] ${volumeFilter === option ? 'bg-saffron text-white dark:bg-gold-light dark:text-dark-bg' : 'border border-sand/18 bg-parchment-card/82 text-ink dark:border-dark-text/10 dark:bg-dark-card/78 dark:text-dark-text'}`}
              >
                {option === 'all' ? 'All' : `Vol ${option}`}
              </button>
            ))}
          </div>
        </div>

        <div className="panth-chapter-grid mt-5 grid gap-3">
          {visibleChapters.map(chapter => (
            <Link
              key={chapter.id}
              to={chapterPath(work.id, chapter.id)}
              className="interactive-focus interactive-card-link rounded-lg border border-sand/14 bg-parchment-card/72 px-4 py-4 dark:border-dark-text/10 dark:bg-dark-card/62"
            >
              <div className="flex flex-wrap gap-2">
                <span className="chip-pill">{chapterLabel(chapter)}</span>
                <span className="chip-pill">Volume {chapter.volume}</span>
                <span className="chip-pill">{chapterRangeLabel(chapter)}</span>
              </div>
              <p className="mt-3 font-sans text-sm font-semibold leading-6 text-ink dark:text-dark-text">{chapter.title}</p>
            </Link>
          ))}
        </div>

        {visibleChapters.length < filteredChapters.length ? (
          <button
            type="button"
            onClick={() => setVisibleCount(count => count + INITIAL_VISIBLE_CHAPTERS)}
            className="interactive-focus mt-5 w-full rounded-lg border border-gold/18 bg-gold/10 px-4 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark dark:border-gold/18 dark:bg-gold/12 dark:text-gold-light"
          >
            Load more chapters
          </button>
        ) : null}
      </section>
    </div>
  )
}
