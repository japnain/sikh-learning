import '../../styles/catalog.css'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconArrowRight, IconLibrary, IconSearch } from '../../components/icons'
import SurfaceStateCard from '../../components/SurfaceStateCard'
import LibraryDownloadControls from './LibraryDownloadControls'
import { buildLibrarySearchPath, findLibraryChapterMatches, normalizeLibraryQuery, type LibraryChapterMatch } from '../../utils/librarySearch'
import {
  loadLibraryChapterIndex,
  loadLibrarySearchIndex,
  loadLibraryWorkCatalog,
} from '../../data/libraryRepository'
import { buildSessionResumePath, useProgressStore } from '../../store/progress'
import {
  buildLibraryReaderNavigationState,
  getLibraryReaderOrigin,
} from '../../utils/libraryReaderNavigation'
import type {
  LibraryChapterIndexEntry,
  LibraryWork,
} from '../../types'

const DEFAULT_WORK_ID = 'panth-prakash-english'
const INITIAL_VISIBLE_CHAPTERS = 36

interface LibraryLoadState {
  key: string
  status: 'loading' | 'ready' | 'error'
  work: LibraryWork | null
  chapters: LibraryChapterIndexEntry[]
}

function chapterLabel(chapter: Pick<LibraryChapterIndexEntry, 'kind' | 'episodeNumber' | 'chapterNumber'>) {
  return chapter.kind === 'episode' && chapter.episodeNumber
    ? `Episode ${chapter.episodeNumber}`
    : `Section ${chapter.chapterNumber}`
}

function chapterPath(workId: string, chapterId: string) {
  return `/library/${workId}/chapters/${chapterId}`
}

function estimatedReadingTime(chapter: Pick<LibraryChapterIndexEntry, 'wordCount' | 'pageCount'>) {
  const minutes = chapter.wordCount
    ? Math.ceil(chapter.wordCount / 225)
    : Math.max(1, Math.ceil(chapter.pageCount * 1.6))
  return `${minutes} min`
}

function contributorLine(work: LibraryWork) {
  const author = work.contributors?.find(contributor => contributor.role === 'author')?.name
  const translator = work.contributors?.find(contributor => contributor.role === 'translator')?.name
  return [author ? `By ${author}` : null, translator ? `translated by ${translator}` : null]
    .filter(Boolean)
    .join(' · ')
}

export default function PanthPrakashLibraryHome() {
  const { workId: routeWorkId } = useParams<{ workId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const workId = routeWorkId ?? DEFAULT_WORK_ID
  const requestedReaderOrigin = getLibraryReaderOrigin(location.state, '/banis?collection=books')
  const readerOrigin = requestedReaderOrigin.split(/[?#]/u)[0].replace(/\/$/u, '') === location.pathname.replace(/\/$/u, '')
    ? '/banis?collection=books'
    : requestedReaderOrigin
  const readerNavigationState = buildLibraryReaderNavigationState(readerOrigin)
  const readerOriginLabel = readerOrigin.startsWith('/saved')
    ? 'Saved'
    : readerOrigin.startsWith('/banis')
      ? 'All books'
      : 'Back'
  const currentSession = useProgressStore(state => state.currentSession)
  const [loadState, setLoadState] = useState<LibraryLoadState>({
    key: workId,
    status: 'loading',
    work: null,
    chapters: [],
  })
  const [chapterQuery, setChapterQuery] = useState('')
  const [volumeFilter, setVolumeFilter] = useState<'all' | number>('all')
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_CHAPTERS)
  const [bookSearchQuery, setBookSearchQuery] = useState(() => new URLSearchParams(location.search).get('q') ?? '')
  const [submittedQuery, setSubmittedQuery] = useState(() => new URLSearchParams(location.search).get('q') ?? '')
  const [searchVisibleCount, setSearchVisibleCount] = useState(10)
  const [searchAttempt, setSearchAttempt] = useState(0)
  const searchSequence = useRef(0)
  const [bookSearchStatus, setBookSearchStatus] = useState<'idle' | 'searching' | 'ready' | 'empty' | 'error'>(() => new URLSearchParams(location.search).get('q') ? 'searching' : 'idle')
  const [bookSearchResults, setBookSearchResults] = useState<LibraryChapterMatch[]>([])
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      loadLibraryWorkCatalog(),
      loadLibraryChapterIndex(workId),
    ])
      .then(([catalog, loadedChapters]) => {
        if (cancelled) return
        const loadedWork = catalog.workById[workId] ?? null
        setLoadState({
          key: workId,
          status: loadedWork ? 'ready' : 'error',
          work: loadedWork,
          chapters: loadedChapters,
        })
      })
      .catch(() => {
        if (cancelled) return
        setLoadState({ key: workId, status: 'error', work: null, chapters: [] })
      })

    return () => {
      cancelled = true
    }
  }, [loadAttempt, workId])

  const currentLoadState = loadState.key === workId
    ? loadState
    : { key: workId, status: 'loading' as const, work: null, chapters: [] }
  const { work, chapters, status } = currentLoadState
  const episodeChapters = chapters.filter(chapter => chapter.kind === 'episode')
  const normalizedChapterQuery = chapterQuery.trim().toLowerCase()
  const filteredChapters = chapters.filter(chapter => {
      const matchesVolume = volumeFilter === 'all' || chapter.volume === volumeFilter
      const haystack = `${chapterLabel(chapter)} ${chapter.title} volume ${chapter.volume}`.toLowerCase()
      return matchesVolume && (!normalizedChapterQuery || haystack.includes(normalizedChapterQuery))
  })

  const visibleChapters = filteredChapters.slice(0, visibleCount)
  const continueReadingPath = currentSession && currentSession.resumePath.startsWith(`/library/${workId}/chapters/`)
    ? buildSessionResumePath(currentSession)
    : null

  useEffect(() => {
    const sequence = ++searchSequence.current
    const query = normalizeLibraryQuery(new URLSearchParams(location.search).get('q') ?? '')
    if (!query) return
    void loadLibrarySearchIndex(workId).then(searchIndex => {
      if (searchSequence.current !== sequence) return
      const matches = findLibraryChapterMatches(searchIndex, query, workId)
      setSubmittedQuery(query)
      setSearchVisibleCount(10)
      setBookSearchResults(matches)
      setBookSearchStatus(matches.length ? 'ready' : 'empty')
    }).catch(() => {
      if (searchSequence.current !== sequence) return
      setBookSearchResults([])
      setBookSearchStatus('error')
    })
    return () => { searchSequence.current += 1 }
  }, [location.search, searchAttempt, workId])

  function handleBookSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = normalizeLibraryQuery(bookSearchQuery)
    setSubmittedQuery(query)
    setSearchVisibleCount(10)
    setBookSearchResults([])
    setBookSearchStatus(query ? 'searching' : 'idle')
    const search = query ? `?${new URLSearchParams({ q: query })}` : ''
    if (search === location.search) setSearchAttempt(attempt => attempt + 1)
    else navigate({ pathname: location.pathname, search }, { replace: true, state: location.state })
  }

  const handleRetryLoad = useCallback(() => {
    setLoadState({
      key: workId,
      status: 'loading',
      work: null,
      chapters: [],
    })
    setLoadAttempt(attempt => attempt + 1)
  }, [workId])

  useEffect(() => {
    if (status !== 'error') return
    window.addEventListener('online', handleRetryLoad)
    return () => window.removeEventListener('online', handleRetryLoad)
  }, [handleRetryLoad, status])

  if (status === 'loading') {
    return (
      <SurfaceStateCard
        surface="epub-library-home"
        state="loading"
        eyebrow="Books"
        title="Opening the collection"
        body="Preparing volumes and contents."
        page="library"
        actions={[{ label: 'Back to books', onClick: () => navigate(readerOrigin), aiAction: 'leave-loading-library' }]}
      />
    )
  }

  if (status === 'error' || !work) {
    return (
      <SurfaceStateCard
        surface="epub-library-home"
        state="degraded"
        eyebrow="Books"
        title="Book unavailable"
        body="This book could not be loaded from the library catalog."
        page="library"
        actions={[{
          label: 'Retry',
          onClick: handleRetryLoad,
          aiAction: 'retry-library-work',
        }, { label: 'Back to books', onClick: () => navigate(readerOrigin), aiAction: 'leave-unavailable-library', emphasis: 'secondary' }]}
      />
    )
  }

  const byline = contributorLine(work)
  const publications = work.publications ?? []

  return (
    <div
      className="epub-work-shell page-shell animate-fade-in"
      data-testid="panth-library-home"
      data-page="library-work"
    >
      <nav className="epub-work-back" aria-label="Book navigation">
        <Link to={readerOrigin} className="interactive-focus">
          <IconArrowLeft size={16} />
          {readerOriginLabel}
        </Link>
      </nav>

      <header className="epub-work-hero">
        <div className="epub-book-cover" aria-hidden="true">
          <span className="epub-book-cover__mark">ੴ</span>
          <span>{work.shortTitle}</span>
          <small>English edition</small>
        </div>
        <div className="epub-work-hero__copy">
          <p className="eyebrow">Historical book · {publications.length || 1} volume{publications.length === 1 ? '' : 's'}</p>
          <h1>{work.title}</h1>
          {byline ? <p className="epub-work-byline">{byline}</p> : null}
          <p className="epub-work-description">{work.description}</p>
          <div className="epub-work-actions">
            {continueReadingPath ? (
              <Link
                to={continueReadingPath}
                state={readerNavigationState}
                className="epub-primary-action interactive-focus"
              >
                Continue reading
                <IconArrowRight size={16} />
              </Link>
            ) : episodeChapters[0] ? (
              <Link
                to={chapterPath(work.id, episodeChapters[0].id)}
                state={readerNavigationState}
                className="epub-primary-action interactive-focus"
              >
                Start reading
                <IconArrowRight size={16} />
              </Link>
            ) : null}
            <a href="#contents" className="epub-secondary-action interactive-focus">
              <IconLibrary size={16} />
              View contents
            </a>
          </div>
        </div>
      </header>

      <section className="epub-edition-note" data-testid="panth-epub-coverage" aria-labelledby="epub-edition-note-title">
        <div>
          <p className="eyebrow">About this edition</p>
          <h2 id="epub-edition-note-title">A clean reading edition from the supplied EPUBs</h2>
        </div>
        <p>
          {work.editionNote ?? 'The original EPUB files are preserved while their text is organized into accessible reading sections.'}
        </p>
        {work.sourceQualityNote ? <p className="epub-source-quality">{work.sourceQualityNote}</p> : null}
        {work.historicalContext ? <aside className="epub-historical-context" aria-labelledby="epub-historical-context-title">
          <h3 id="epub-historical-context-title">Read with historical context</h3>
          <p>{work.historicalContext}</p>
          {(work.historicalContextSources ?? []).filter(source => /^https:\/\//u.test(source.url)).map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>)}
        </aside> : null}
        <div className="epub-edition-stats">
          <span>{episodeChapters.length} episodes</span>
          <span>{publications.length || 1} volumes</span>
          {work.readablePages ? <span>{work.readablePages} readable source pages</span> : null}
        </div>
      </section>

      <section className="epub-volume-grid" aria-labelledby="epub-volumes-title">
        <div className="epub-section-heading">
          <div>
            <p className="eyebrow">Volumes</p>
            <h2 id="epub-volumes-title">Choose where to begin</h2>
          </div>
        </div>
        <div className="epub-volume-cards">
          {publications.map(publication => {
            const firstChapter = chapters.find(chapter => chapter.id === publication.firstChapterId)
              ?? chapters.find(chapter => chapter.publicationId === publication.id)
              ?? chapters.find(chapter => chapter.volume === publication.volume)
            return (
              <article key={publication.id} className="epub-volume-card">
                <p className="eyebrow">Volume {publication.volume}</p>
                <h3>{publication.shortTitle ?? publication.title}</h3>
                <p>
                  {publication.episodeRange
                    ? `Episodes ${publication.episodeRange[0]}–${publication.episodeRange[1]}`
                    : `${chapters.filter(chapter => chapter.volume === publication.volume).length} sections`}
                </p>
                <div className="epub-volume-card__meta">
                  {publication.publishedYear ? <span>{publication.publishedYear}</span> : null}
                  {publication.isbn ? <span>ISBN {publication.isbn}</span> : null}
                </div>
                {firstChapter ? (
                  <Link
                    to={chapterPath(work.id, firstChapter.id)}
                    state={readerNavigationState}
                    className="interactive-focus"
                  >
                    Open volume
                    <IconArrowRight size={15} />
                  </Link>
                ) : null}
              </article>
            )
          })}
        </div>
      </section>

      <LibraryDownloadControls key={work.id} work={work} />

      <section className="epub-search-panel" aria-labelledby="epub-search-title">
        <div>
          <p className="eyebrow">Search this book</p>
          <h2 id="epub-search-title">Find a person, place, or phrase</h2>
        </div>
        <form onSubmit={handleBookSearchSubmit} className="epub-search-form" role="search">
          <label htmlFor="epub-book-search">Search within {work.shortTitle}</label>
          <div>
            <IconSearch size={17} />
            <input
              id="epub-book-search"
              value={bookSearchQuery}
              onChange={event => setBookSearchQuery(event.target.value)}
              placeholder="Try “origin of the Khalsa”"
            />
            <button type="submit" disabled={bookSearchStatus === 'searching'}>
              {bookSearchStatus === 'searching' ? 'Searching…' : 'Search'}
            </button>
          </div>
        </form>

        {bookSearchStatus === 'empty' ? <p className="epub-search-status">No passages matched that search.</p> : null}
        {bookSearchStatus === 'error' ? <p className="epub-search-status">Search is temporarily unavailable.</p> : null}
        {bookSearchResults.length ? (
          <div className="epub-search-results" data-testid="panth-full-text-results" aria-live="polite">
            <p>Showing {Math.min(searchVisibleCount, bookSearchResults.length)} of {bookSearchResults.length} matching sections for “{submittedQuery}”.</p>
            {bookSearchResults.slice(0, searchVisibleCount).map(result => (
              <Link
                key={result.chapterId}
                to={buildLibrarySearchPath(work.id, result.chapterId, submittedQuery)}
                state={buildLibraryReaderNavigationState(`${location.pathname}?${new URLSearchParams({ q: submittedQuery })}`)}
                className="interactive-focus"
              >
                <span>Volume {result.volume} · {result.episodeNumber ? `Episode ${result.episodeNumber}` : 'Section'}</span>
                <strong>{result.title}</strong>
                <p>{result.snippet}</p>
                <small>{result.matchCount} match{result.matchCount === 1 ? '' : 'es'} in this section</small>
              </Link>
            ))}
            {searchVisibleCount < bookSearchResults.length ? <button type="button" className="epub-load-more interactive-focus" onClick={() => setSearchVisibleCount(count => count + 10)}>Show more matches</button> : null}
          </div>
        ) : null}
      </section>

      <section id="contents" className="epub-contents" data-testid="panth-chapter-browser" aria-labelledby="epub-contents-title">
        <div className="epub-section-heading">
          <div>
            <p className="eyebrow">Contents</p>
            <h2 id="epub-contents-title">Episodes and sections</h2>
          </div>
          <span>{filteredChapters.length} entries</span>
        </div>

        <div className="epub-contents-tools">
          <label>
            <span>Search chapters and episodes</span>
            <input
              value={chapterQuery}
              onChange={event => {
                setChapterQuery(event.target.value)
                setVisibleCount(INITIAL_VISIBLE_CHAPTERS)
              }}
              placeholder="Episode or title"
            />
          </label>
          <div className="epub-volume-filter" aria-label="Filter contents by volume">
            <button type="button" aria-pressed={volumeFilter === 'all'} onClick={() => setVolumeFilter('all')}>All</button>
            {publications.map(publication => (
              <button
                key={publication.id}
                type="button"
                aria-pressed={volumeFilter === publication.volume}
                onClick={() => setVolumeFilter(publication.volume)}
              >
                Vol. {publication.volume}
              </button>
            ))}
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          Showing {visibleChapters.length} of {filteredChapters.length} sections
        </p>
        <ol className="epub-chapter-list">
          {visibleChapters.map(chapter => (
            <li key={chapter.id}>
              <Link
                to={chapterPath(work.id, chapter.id)}
                state={readerNavigationState}
                className="interactive-focus"
              >
                <span className="epub-chapter-number">{chapter.episodeNumber ?? chapter.chapterNumber}</span>
                <span className="epub-chapter-copy">
                  <small>Volume {chapter.volume} · {chapterLabel(chapter)}</small>
                  <strong>{chapter.title}</strong>
                  <span>{estimatedReadingTime(chapter)} read</span>
                </span>
                <IconArrowRight size={17} />
              </Link>
            </li>
          ))}
        </ol>

        {visibleCount < filteredChapters.length ? (
          <button
            type="button"
            className="epub-load-more interactive-focus"
            onClick={() => setVisibleCount(count => count + INITIAL_VISIBLE_CHAPTERS)}
          >
            Show more
          </button>
        ) : null}
      </section>
    </div>
  )
}
