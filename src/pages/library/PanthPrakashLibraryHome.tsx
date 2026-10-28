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
import { useProgressStore } from '../../store/progress'
import { buildBookReadingResumePath, getReadingPlaces, useReadingPlacesStore } from '../../store/readingPlaces'
import { useLocaleStore } from '../../store/locale'
import { LIBRARY_BOOK_COPY } from '../../content/libraryBookCopy'
import type { UiLocale } from '../../types'
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

function chapterLabel(chapter: Pick<LibraryChapterIndexEntry, 'kind' | 'episodeNumber' | 'chapterNumber'>, locale: UiLocale = 'en') {
  const copy = LIBRARY_BOOK_COPY[locale]
  return chapter.kind === 'episode' && chapter.episodeNumber
    ? copy.episode(chapter.episodeNumber)
    : copy.section(chapter.chapterNumber)
}

function chapterPath(workId: string, chapterId: string) {
  return `/library/${workId}/chapters/${chapterId}`
}

function estimatedReadingTime(chapter: Pick<LibraryChapterIndexEntry, 'wordCount' | 'pageCount'>, locale: UiLocale) {
  const minutes = chapter.wordCount
    ? Math.ceil(chapter.wordCount / 225)
    : Math.max(1, Math.ceil(chapter.pageCount * 1.6))
  return LIBRARY_BOOK_COPY[locale].minutes(minutes)
}

function contributorLine(work: LibraryWork, locale: UiLocale) {
  const copy = LIBRARY_BOOK_COPY[locale]
  const author = work.contributors?.find(contributor => contributor.role === 'author')?.name
  const translator = work.contributors?.find(contributor => contributor.role === 'translator')?.name
  return [author ? copy.byAuthor(author) : null, translator ? copy.translatedBy(translator) : null]
    .filter(Boolean)
    .join(' · ')
}

export default function PanthPrakashLibraryHome() {
  const locale = useLocaleStore(state => state.locale)
  const copy = LIBRARY_BOOK_COPY[locale]
  const readingPlaces = useReadingPlacesStore(state => state.places)
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
    ? copy.saved
    : readerOrigin.startsWith('/banis')
      ? copy.allBooks
      : copy.back
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
      const haystack = `${chapterLabel(chapter)} ${chapterLabel(chapter, locale)} ${chapter.title} volume ${chapter.volume} ${copy.volume(chapter.volume)}`.toLowerCase()
      return matchesVolume && (!normalizedChapterQuery || haystack.includes(normalizedChapterQuery))
  })

  const visibleChapters = filteredChapters.slice(0, visibleCount)
  const bookPlace = getReadingPlaces(readingPlaces, currentSession)[`book:${workId}`]
  const savedBookPath = work ? buildBookReadingResumePath(bookPlace, work, chapters) : null
  const continueReadingPath = savedBookPath === `/library/${workId}` ? null : savedBookPath

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
        eyebrow={copy.books}
        title={copy.openingCollection}
        body={copy.preparingContents}
        page="library"
        actions={[{ label: copy.backToBooks, onClick: () => navigate(readerOrigin), aiAction: 'leave-loading-library' }]}
      />
    )
  }

  if (status === 'error' || !work) {
    return (
      <SurfaceStateCard
        surface="epub-library-home"
        state="degraded"
        eyebrow={copy.books}
        title={copy.bookUnavailable}
        body={copy.bookUnavailableBody}
        page="library"
        actions={[{
          label: copy.retry,
          onClick: handleRetryLoad,
          aiAction: 'retry-library-work',
        }, { label: copy.backToBooks, onClick: () => navigate(readerOrigin), aiAction: 'leave-unavailable-library', emphasis: 'secondary' }]}
      />
    )
  }

  const byline = contributorLine(work, locale)
  const publications = work.publications ?? []

  return (
    <div
      className="epub-work-shell page-shell animate-fade-in"
      data-testid="panth-library-home"
      data-page="library-work"
      lang={locale}
    >
      <nav className="epub-work-back" aria-label={copy.bookNavigation}>
        <Link to={readerOrigin} className="interactive-focus">
          <IconArrowLeft size={16} />
          {readerOriginLabel}
        </Link>
      </nav>

      <header className="epub-work-hero">
        <div className="epub-book-cover" aria-hidden="true">
          <span className="epub-book-cover__mark">ੴ</span>
          <span>{work.shortTitle}</span>
          <small>{copy.englishEdition}</small>
        </div>
        <div className="epub-work-hero__copy">
          <p className="eyebrow">{copy.historicalBook(publications.length || 1)}</p>
          <h1 lang="en">{work.title}</h1>
          {byline ? <p className="epub-work-byline">{byline}</p> : null}
          <p lang="en" className="epub-work-description">{work.description}</p>
          <div className="epub-work-actions">
            {continueReadingPath ? (
              <Link
                to={continueReadingPath}
                state={readerNavigationState}
                className="epub-primary-action interactive-focus"
              >
                {copy.continueReading}
                <IconArrowRight size={16} />
              </Link>
            ) : episodeChapters[0] ? (
              <Link
                to={chapterPath(work.id, episodeChapters[0].id)}
                state={readerNavigationState}
                className="epub-primary-action interactive-focus"
              >
                {copy.startReading}
                <IconArrowRight size={16} />
              </Link>
            ) : null}
            <a href="#contents" className="epub-secondary-action interactive-focus">
              <IconLibrary size={16} />
              {copy.viewContents}
            </a>
          </div>
        </div>
      </header>

      <section className="epub-edition-note" data-testid="panth-epub-coverage" aria-labelledby="epub-edition-note-title">
        <div>
          <p className="eyebrow">{copy.aboutEdition}</p>
          <h2 id="epub-edition-note-title">{copy.editionTitle}</h2>
        </div>
        <p>{copy.editionBody}</p>
        {work.editionNote ? <details className="epub-edition-details">
          <summary>{copy.editionDetails}</summary>
          <p lang="en">{work.editionNote}</p>
        </details> : null}
        {work.sourceQualityNote ? <p lang="en" className="epub-source-quality">{work.sourceQualityNote}</p> : null}
        {work.historicalContext ? <aside className="epub-historical-context" aria-labelledby="epub-historical-context-title">
          <h3 id="epub-historical-context-title">{copy.historicalContext}</h3>
          <p lang="en">{work.historicalContext}</p>
          {(work.historicalContextSources ?? []).filter(source => /^https:\/\//u.test(source.url)).map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>)}
        </aside> : null}
        <div className="epub-edition-stats">
          <span>{copy.episodes(episodeChapters.length)}</span>
          <span>{copy.volumeCount(publications.length || 1)}</span>
          {work.readablePages ? <span>{copy.readablePages(work.readablePages)}</span> : null}
        </div>
      </section>

      <section className="epub-volume-grid" aria-labelledby="epub-volumes-title">
        <div className="epub-section-heading">
          <div>
            <p className="eyebrow">{copy.volumes}</p>
            <h2 id="epub-volumes-title">{copy.chooseStart}</h2>
          </div>
        </div>
        <div className="epub-volume-cards">
          {publications.map(publication => {
            const firstChapter = chapters.find(chapter => chapter.id === publication.firstChapterId)
              ?? chapters.find(chapter => chapter.publicationId === publication.id)
              ?? chapters.find(chapter => chapter.volume === publication.volume)
            return (
              <article key={publication.id} className="epub-volume-card">
                <p className="eyebrow">{copy.volume(publication.volume)}</p>
                <h3 lang="en">{publication.shortTitle ?? publication.title}</h3>
                <p>
                  {publication.episodeRange
                    ? copy.episodeRange(publication.episodeRange[0], publication.episodeRange[1])
                    : copy.sections(chapters.filter(chapter => chapter.volume === publication.volume).length)}
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
                    {copy.openVolume}
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
          <p className="eyebrow">{copy.searchBook}</p>
          <h2 id="epub-search-title">{copy.searchHeading}</h2>
        </div>
        <form onSubmit={handleBookSearchSubmit} className="epub-search-form" role="search">
          <label htmlFor="epub-book-search">{copy.searchWithin(work.shortTitle)}</label>
          <div>
            <IconSearch size={17} />
            <input
              id="epub-book-search"
              value={bookSearchQuery}
              onChange={event => setBookSearchQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
            />
            <button type="submit" disabled={bookSearchStatus === 'searching'}>
              {bookSearchStatus === 'searching' ? copy.searching : copy.search}
            </button>
          </div>
        </form>

        {bookSearchStatus === 'empty' ? <p className="epub-search-status">{copy.noMatches}</p> : null}
        {bookSearchStatus === 'error' ? <p className="epub-search-status">{copy.searchUnavailable}</p> : null}
        {bookSearchResults.length ? (
          <div className="epub-search-results" data-testid="panth-full-text-results" aria-live="polite">
            <p>{copy.searchResults(Math.min(searchVisibleCount, bookSearchResults.length), bookSearchResults.length, submittedQuery)}</p>
            {bookSearchResults.slice(0, searchVisibleCount).map(result => (
              <Link
                key={result.chapterId}
                to={buildLibrarySearchPath(work.id, result.chapterId, submittedQuery)}
                state={buildLibraryReaderNavigationState(`${location.pathname}?${new URLSearchParams({ q: submittedQuery })}`)}
                className="interactive-focus"
              >
                <span>{copy.volume(result.volume)} · {result.episodeNumber ? copy.episode(result.episodeNumber) : copy.section()}</span>
                <strong lang="en">{result.title}</strong>
                <p lang="en">{result.snippet}</p>
                <small>{copy.matches(result.matchCount)}</small>
              </Link>
            ))}
            {searchVisibleCount < bookSearchResults.length ? <button type="button" className="epub-load-more interactive-focus" onClick={() => setSearchVisibleCount(count => count + 10)}>{copy.showMoreMatches}</button> : null}
          </div>
        ) : null}
      </section>

      <section id="contents" className="epub-contents" data-testid="panth-chapter-browser" aria-labelledby="epub-contents-title">
        <div className="epub-section-heading">
          <div>
            <p className="eyebrow">{copy.contents}</p>
            <h2 id="epub-contents-title">{copy.contentsHeading}</h2>
          </div>
          <span>{copy.entries(filteredChapters.length)}</span>
        </div>

        <div className="epub-contents-tools">
          <label>
            <span>{copy.searchChapters}</span>
            <input
              value={chapterQuery}
              onChange={event => {
                setChapterQuery(event.target.value)
                setVisibleCount(INITIAL_VISIBLE_CHAPTERS)
              }}
              placeholder={copy.chapterPlaceholder}
            />
          </label>
          <div className="epub-volume-filter" aria-label={copy.filterVolumes}>
            <button type="button" aria-pressed={volumeFilter === 'all'} onClick={() => setVolumeFilter('all')}>{copy.all}</button>
            {publications.map(publication => (
              <button
                key={publication.id}
                type="button"
                aria-pressed={volumeFilter === publication.volume}
                onClick={() => setVolumeFilter(publication.volume)}
              >
                {copy.shortVolume(publication.volume)}
              </button>
            ))}
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          {copy.showingSections(visibleChapters.length, filteredChapters.length)}
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
                  <small>{copy.volume(chapter.volume)} · {chapterLabel(chapter, locale)}</small>
                  <strong lang="en">{chapter.title}</strong>
                  <span>{estimatedReadingTime(chapter, locale)}</span>
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
            {copy.showMore}
          </button>
        ) : null}
      </section>
    </div>
  )
}
