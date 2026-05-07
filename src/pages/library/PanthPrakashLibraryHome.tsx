import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { LibraryEpisodeIndexEntry, LibraryPageIndexEntry, LibraryPagePayload, LibrarySearchIndex, LibrarySearchPageEntry, LibraryWork } from '../../types'
import { loadLibraryEpisodeIndex, loadLibraryPage, loadLibraryPageIndex, loadLibrarySearchIndex, loadLibraryWorkCatalog } from '../../data/libraryRepository'
import {
  getPanthPrakashArcOptions,
  getPanthPrakashEpisodeDisplayTitle,
  getPanthPrakashEpisodeEditorial,
  type PanthPrakashArcId,
} from '../../data/panthPrakashEditorial'
import SurfaceStateCard from '../../components/SurfaceStateCard'
import { buildSessionResumePath, useProgressStore } from '../../store/progress'

const DEFAULT_WORK_ID = 'panth-prakash-english'

type PageSearchResult = Pick<LibrarySearchPageEntry, 'pageNumber' | 'title' | 'snippet' | 'episodeNumber' | 'episodeDisplayTitle' | 'sourcePageNumber'>

export default function PanthPrakashLibraryHome() {
  const navigate = useNavigate()
  const { workId: routeWorkId } = useParams<{ workId: string }>()
  const workId = routeWorkId ?? DEFAULT_WORK_ID
  const currentSession = useProgressStore(state => state.currentSession)
  const [work, setWork] = useState<LibraryWork | null>(null)
  const [pageIndex, setPageIndex] = useState<LibraryPageIndexEntry[]>([])
  const [episodeIndex, setEpisodeIndex] = useState<LibraryEpisodeIndexEntry[]>([])
  const [searchIndex, setSearchIndex] = useState<LibrarySearchIndex | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [pageJumpValue, setPageJumpValue] = useState('1')
  const [episodeSearch, setEpisodeSearch] = useState('')
  const [episodeVolume, setEpisodeVolume] = useState<'all' | number>('all')
  const [episodeArc, setEpisodeArc] = useState<'all' | PanthPrakashArcId>('all')
  const [visibleEpisodeWindow, setVisibleEpisodeWindow] = useState({ filterKey: '', count: 24 })
  const [pageSearchQuery, setPageSearchQuery] = useState('')
  const [pageSearchStatus, setPageSearchStatus] = useState<'idle' | 'searching' | 'ready' | 'empty'>('idle')
  const [pageSearchResults, setPageSearchResults] = useState<PageSearchResult[]>([])

  useEffect(() => {
    let cancelled = false

    Promise.resolve().then(() => {
      if (cancelled) return
      setStatus('loading')

      Promise.all([
        loadLibraryWorkCatalog(),
        loadLibraryPageIndex(workId),
        loadLibraryEpisodeIndex(workId),
        loadLibrarySearchIndex().catch(() => null),
      ])
        .then(([catalog, pages, episodes, loadedSearchIndex]) => {
          if (cancelled) return
          setWork(catalog.workById[workId] ?? null)
          setPageIndex(pages)
          setEpisodeIndex(episodes)
          setSearchIndex(loadedSearchIndex)
          setStatus(catalog.workById[workId] ? 'ready' : 'error')
        })
        .catch(() => {
          if (cancelled) return
          setStatus('error')
        })
      })

    return () => {
      cancelled = true
    }
  }, [workId])

  const volumeSummary = useMemo(() => {
    const counts = new Map<number, number>()
    for (const entry of pageIndex) {
      counts.set(entry.volume, (counts.get(entry.volume) ?? 0) + 1)
    }
    return [...counts.entries()].map(([volume, count]) => ({ volume, count }))
  }, [pageIndex])

  const continueReadingPath = currentSession && currentSession.resumePath.startsWith(`/library/${workId}/page/`)
    ? buildSessionResumePath(currentSession)
    : null

  const filteredEpisodes = useMemo(() => {
    const normalizedSearch = episodeSearch.trim().toLowerCase()
    return episodeIndex.filter(episode => {
      const matchesVolume = episodeVolume === 'all' || episode.volume === episodeVolume
      const editorial = getPanthPrakashEpisodeEditorial(episode)
      const matchesArc = episodeArc === 'all' || editorial?.arc === episodeArc
      const displayTitle = getPanthPrakashEpisodeDisplayTitle(episode)
      const searchable = `${episode.episodeNumber} ${episode.title} ${displayTitle} ${editorial?.arcLabel ?? ''} ${episode.startPage} ${episode.endPage}`.toLowerCase()
      return matchesVolume && matchesArc && (!normalizedSearch || searchable.includes(normalizedSearch))
    })
  }, [episodeIndex, episodeSearch, episodeVolume, episodeArc])

  const episodeFilterKey = `${episodeSearch.trim().toLowerCase()}|${episodeVolume}|${episodeArc}`
  const visibleEpisodeCount = visibleEpisodeWindow.filterKey === episodeFilterKey
    ? visibleEpisodeWindow.count
    : 24
  const visibleEpisodes = filteredEpisodes.slice(0, visibleEpisodeCount)
  const pagesMissingSourceMapping = useMemo(() => pageIndex.filter(entry => !entry.sourcePageNumber).length, [pageIndex])

  function handlePageJumpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextPage = Math.min(pageIndex.length || 1, Math.max(1, Number(pageJumpValue) || 1))
    navigate(`/library/${workId}/page/${nextPage}`)
  }

  async function handlePageSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = pageSearchQuery.trim().toLowerCase()
    if (!query) {
      setPageSearchResults([])
      setPageSearchStatus('idle')
      return
    }

    setPageSearchStatus('searching')

    const indexedPages = searchIndex?.pages?.filter(entry => entry.workId === workId)
    if (indexedPages?.length) {
      const rawMatches = indexedPages
        .map<PageSearchResult | null>(entry => {
          const normalizedHaystack = entry.searchText.toLowerCase()
          const index = normalizedHaystack.indexOf(query)
          if (index === -1) return null
          const snippetStart = Math.max(0, index - 72)
          const snippetEnd = Math.min(entry.searchText.length, index + pageSearchQuery.length + 112)
          return {
            pageNumber: entry.pageNumber,
            title: entry.title,
            sourcePageNumber: entry.sourcePageNumber,
            episodeNumber: entry.episodeNumber,
            episodeDisplayTitle: entry.episodeDisplayTitle,
            snippet: entry.searchText.slice(snippetStart, snippetEnd).replace(/\s+/g, ' ').trim(),
          } satisfies PageSearchResult
        })
        .filter((result): result is PageSearchResult => Boolean(result))
      const seenMatches = new Set<string>()
      const matches = rawMatches
        .filter(result => {
          const key = result.episodeNumber ? `episode:${result.episodeNumber}` : `page:${result.pageNumber}`
          if (seenMatches.has(key)) return false
          seenMatches.add(key)
          return true
        })
        .slice(0, 8)

      setPageSearchResults(matches)
      setPageSearchStatus(matches.length ? 'ready' : 'empty')
      return
    }

    const loadedPages = await Promise.all(pageIndex.map(entry => loadLibraryPage(workId, entry.pageNumber).catch(() => null)))
    const rawFallbackMatches = loadedPages
      .filter((page): page is LibraryPagePayload => Boolean(page))
      .map<PageSearchResult | null>(page => {
        const haystack = [
          page.title,
          page.episode?.title ?? '',
          ...page.blocks.map(block => block.text),
          ...(page.rawBlocks ?? []).map(block => block.text),
        ].join(' ')
        const normalizedHaystack = haystack.toLowerCase()
        const index = normalizedHaystack.indexOf(query)
        if (index === -1) return null
        const snippetStart = Math.max(0, index - 72)
        const snippetEnd = Math.min(haystack.length, index + pageSearchQuery.length + 112)
        return {
          pageNumber: page.pageNumber,
          title: page.title,
          sourcePageNumber: page.sourcePageNumber,
          episodeNumber: page.episode?.number,
          episodeDisplayTitle: page.episode
            ? getPanthPrakashEpisodeDisplayTitle({ ...page.episode, episodeNumber: page.episode.number, volume: page.volume })
            : undefined,
          snippet: haystack.slice(snippetStart, snippetEnd).replace(/\s+/g, ' ').trim(),
        } satisfies PageSearchResult
      })
      .filter((result): result is PageSearchResult => Boolean(result))
    const fallbackSeenMatches = new Set<string>()
    const matches = rawFallbackMatches
      .filter(result => {
        const key = result.episodeNumber ? `episode:${result.episodeNumber}` : `page:${result.pageNumber}`
        if (fallbackSeenMatches.has(key)) return false
        fallbackSeenMatches.add(key)
        return true
      })
      .slice(0, 8)

    setPageSearchResults(matches)
    setPageSearchStatus(matches.length ? 'ready' : 'empty')
  }

  if (status === 'loading') {
    return (
      <SurfaceStateCard
        surface="panth-library-home"
        state="loading"
        eyebrow="Source Browsing"
        title="Loading Panth Prakash"
        body="Preparing the book overview, page map, and episode list."
        page="library"
      />
    )
  }

  if (status === 'error' || !work) {
    return (
      <SurfaceStateCard
        surface="panth-library-home"
        state="degraded"
        eyebrow="Source Browsing"
        title="Panth Prakash unavailable"
        body="The Panth Prakash overview could not be loaded yet."
        page="library"
      />
    )
  }

  return (
    <div
      className="page-shell animate-fade-in"
      data-testid="panth-library-home"
      style={{ paddingBottom: 'calc(var(--nav-stack-height, 7rem) + var(--safe-area-bottom) + 10rem)' }}
    >
      <div className="mb-4">
        <p className="eyebrow">Native reader</p>
        <h1 className="mt-2 font-display text-[2.2rem] leading-none text-ink dark:text-dark-text">{work.title}</h1>
        <p className="mt-3 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/72">
          Read the full Panth Prakash as bundled NaamRas text, with volume navigation, episode reading, and source pages one tap away when you want to verify a passage.
        </p>
      </div>

      <section className="section-shell-quiet px-4 py-4 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip-pill">{work.totalPages} total pages</span>
          {volumeSummary.map(entry => (
            <span key={entry.volume} className="chip-pill">Volume {entry.volume} · {entry.count} pages</span>
          ))}
          <span className="chip-pill">{episodeIndex.length} extracted episodes</span>
        </div>
      </section>

      <section className="section-shell-quiet px-4 py-4 mb-4" data-testid="panth-native-coverage">
        <p className="eyebrow">Complete native reader</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="chip-pill">{work.totalPages.toLocaleString('en-US')} pages bundled</span>
          <span className="chip-pill">{episodeIndex.length} episodes</span>
          <span className="chip-pill">Volumes 1 and 2</span>
          <span className="chip-pill">{pagesMissingSourceMapping} pages missing source mapping</span>
        </div>
        <ul className="mt-3 grid gap-2 font-sans text-xs leading-5 text-ink/68 dark:text-dark-text/74">
          <li>• Read continuously by episode instead of paging through scans.</li>
          <li>• Keep source-page links available as evidence without making them the reading surface.</li>
          <li>• Search spans the bundled text across both volumes and opens the matching episode.</li>
        </ul>
      </section>

      <section className="section-shell px-5 py-5 mb-4">
        <p className="eyebrow">Jump in</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <form onSubmit={handlePageJumpSubmit} className="flex flex-wrap items-center gap-2">
            <label htmlFor="panth-home-jump" className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/62 dark:text-dark-text/74">
              Jump to page
            </label>
            <input
              id="panth-home-jump"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pageJumpValue}
              onChange={event => setPageJumpValue(event.target.value)}
              className="w-24 rounded-full border border-sand/18 bg-parchment-card px-3 py-2 font-sans text-sm text-ink outline-none ring-0 dark:border-dark-text/10 dark:bg-dark-card dark:text-dark-text"
            />
            <button
              type="submit"
              className="interactive-focus rounded-full bg-gradient-to-r from-saffron to-saffron-light px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-white"
            >
              Go to page
            </button>
          </form>
          <Link
            to={`/library/${work.id}/page/1`}
            className="interactive-focus rounded-full border border-sand/18 bg-parchment-card/82 px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-ink dark:border-dark-text/10 dark:bg-dark-card/78 dark:text-dark-text"
          >
            Start at page 1
          </Link>
          {continueReadingPath ? (
            <Link
              to={continueReadingPath}
              className="interactive-focus rounded-full border border-gold/18 bg-gold/10 px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark dark:border-gold/18 dark:bg-gold/12 dark:text-gold-light"
            >
              Resume page {currentSession?.resumePath.match(/\/page\/(\d+)/)?.[1] ?? ''}
            </Link>
          ) : null}
        </div>
      </section>

      {continueReadingPath ? (
        <section className="section-shell-quiet px-4 py-4 mb-4">
          <p className="eyebrow">Continue reading</p>
          <p className="mt-2 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/72">
            Pick up where you left off inside Panth Prakash instead of hunting for the page again.
          </p>
          <div className="mt-4">
            <Link
              to={continueReadingPath}
              className="interactive-focus interactive-card-link block rounded-[24px] border border-gold/16 bg-parchment-card/88 px-4 py-4 dark:border-gold/16 dark:bg-dark-card/78"
            >
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-gold dark:text-gold-light">
                Continue reading
              </p>
              <p className="mt-2 font-sans text-sm font-semibold text-ink dark:text-dark-text">
                Resume page {currentSession?.resumePath.match(/\/page\/(\d+)/)?.[1] ?? ''}
              </p>
            </Link>
          </div>
        </section>
      ) : null}

      <section className="section-shell px-5 py-5 mb-4">
        <p className="eyebrow">Search the text</p>
        <p className="mt-2 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/72">
          Search inside the bundled Panth Prakash text. Results stay page-first and link into the episode reader with source context available when needed.
        </p>
        <form onSubmit={handlePageSearchSubmit} className="mt-4 grid gap-3">
          <label htmlFor="panth-page-search" className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/62 dark:text-dark-text/74">
            Search within Panth Prakash pages
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="panth-page-search"
              aria-label="Search within Panth Prakash pages"
              value={pageSearchQuery}
              onChange={event => setPageSearchQuery(event.target.value)}
              placeholder="Search people, places, or phrases"
              className="min-w-0 flex-1 rounded-full border border-sand/18 bg-parchment-card px-4 py-3 font-sans text-sm text-ink outline-none ring-0 dark:border-dark-text/10 dark:bg-dark-card dark:text-dark-text"
            />
            <button
              type="submit"
              className="interactive-focus rounded-full bg-gradient-to-r from-saffron to-saffron-light px-4 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-white"
            >
              Search pages
            </button>
          </div>
        </form>
        <div className="mt-4 grid gap-3" data-testid="panth-full-text-results">
          {pageSearchStatus === 'searching' ? <p className="font-sans text-sm text-ink/68 dark:text-dark-text/74">Searching page text…</p> : null}
          {pageSearchStatus === 'empty' ? <p className="font-sans text-sm text-ink/68 dark:text-dark-text/74">No page matches yet. Try a person, place, or exact phrase.</p> : null}
          {pageSearchResults.map(result => {
            const resultPath = result.episodeNumber
              ? `/library/${work.id}/episode/${result.episodeNumber}`
              : `/library/${work.id}/page/${result.pageNumber}`
            const openLabel = result.episodeNumber ? `Open episode ${result.episodeNumber}` : `Open page ${result.pageNumber}`
            return (
              <div
                key={result.pageNumber}
                className="rounded-[22px] border border-sand/14 bg-parchment-card/72 px-4 py-3 text-left dark:border-dark-text/10 dark:bg-dark-card/62"
              >
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={resultPath}
                    className="interactive-focus rounded-full bg-gold/10 px-3 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark dark:bg-gold/12 dark:text-gold-light"
                  >
                    {openLabel}
                  </Link>
                  {result.episodeNumber ? (
                    <Link
                      to={`/library/${work.id}/page/${result.pageNumber}`}
                      className="interactive-focus rounded-full border border-sand/18 bg-parchment-card/82 px-3 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-ink dark:border-dark-text/10 dark:bg-dark-card/78 dark:text-dark-text"
                    >
                      Open page {result.pageNumber}
                    </Link>
                  ) : null}
                </div>
                <p className="mt-3 font-sans text-sm font-semibold text-ink dark:text-dark-text">
                  Page {result.pageNumber}{result.episodeDisplayTitle ? ` · ${result.episodeDisplayTitle}` : ''}
                </p>
                <p className="mt-1 font-sans text-xs leading-5 text-ink/68 dark:text-dark-text/74">{result.snippet}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="hero-surface px-5 py-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <p className="eyebrow">Episode Browser</p>
            <p className="mt-2 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/72">
              Search, filter, and load the full episode map for both volumes, then open each section as native app text.
            </p>
          </div>
        </div>

        <div className="mb-4 grid gap-3 rounded-[24px] border border-sand/14 bg-parchment-card/62 p-4 dark:border-dark-text/10 dark:bg-dark-card/56">
          <label htmlFor="panth-episode-search" className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/62 dark:text-dark-text/74">
            Search episodes
          </label>
          <input
            id="panth-episode-search"
            aria-label="Search episodes"
            value={episodeSearch}
            onChange={event => setEpisodeSearch(event.target.value)}
            placeholder="Search titles, episode numbers, or page ranges"
            className="rounded-full border border-sand/18 bg-parchment-card px-4 py-3 font-sans text-sm text-ink outline-none ring-0 dark:border-dark-text/10 dark:bg-dark-card dark:text-dark-text"
          />
          <div className="flex flex-wrap gap-2" aria-label="Episode volume filters">
            {(['all', 1, 2] as const).map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setEpisodeVolume(option)}
                className={episodeVolume === option
                  ? 'interactive-focus rounded-full bg-gradient-to-r from-saffron to-saffron-light px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-white'
                  : 'interactive-focus rounded-full border border-sand/18 bg-parchment-card/82 px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-ink dark:border-dark-text/10 dark:bg-dark-card/78 dark:text-dark-text'}
              >
                {option === 'all' ? 'All volumes' : `Volume ${option}`}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Episode arc filters">
            <button
              type="button"
              onClick={() => setEpisodeArc('all')}
              className={episodeArc === 'all'
                ? 'interactive-focus rounded-full bg-gradient-to-r from-saffron to-saffron-light px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-white'
                : 'interactive-focus rounded-full border border-sand/18 bg-parchment-card/82 px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-ink dark:border-dark-text/10 dark:bg-dark-card/78 dark:text-dark-text'}
            >
              All arcs
            </button>
            {getPanthPrakashArcOptions().map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => setEpisodeArc(option.id)}
                className={episodeArc === option.id
                  ? 'interactive-focus rounded-full bg-gradient-to-r from-saffron to-saffron-light px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-white'
                  : 'interactive-focus rounded-full border border-sand/18 bg-parchment-card/82 px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-ink dark:border-dark-text/10 dark:bg-dark-card/78 dark:text-dark-text'}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="font-sans text-xs leading-5 text-ink/64 dark:text-dark-text/74" data-testid="panth-episode-count-meta">
            Showing {visibleEpisodes.length} of {filteredEpisodes.length} episodes
          </p>
        </div>

        <div className="grid gap-3">
          {visibleEpisodes.map(episode => {
            const editorial = getPanthPrakashEpisodeEditorial(episode)
            const displayTitle = getPanthPrakashEpisodeDisplayTitle(episode)
            return (
              <Link
                key={episode.episodeNumber}
                to={`/library/${work.id}/episode/${episode.episodeNumber}`}
                aria-label={`Start episode ${episode.episodeNumber}: ${displayTitle}`}
                className="section-shell interactive-focus interactive-card-link px-4 py-4 text-left"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="chip-pill">Episode {episode.episodeNumber}</span>
                  <span className="chip-pill">Volume {episode.volume}</span>
                  <span className="chip-pill">Pages {episode.startPage}–{episode.endPage}</span>
                  <span className="chip-pill">{editorial?.arcLabel}</span>
                </div>
                <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">{displayTitle}</p>
              </Link>
            )
          })}
        </div>

        {visibleEpisodes.length < filteredEpisodes.length ? (
          <button
            type="button"
            onClick={() => setVisibleEpisodeWindow(current => ({
              filterKey: episodeFilterKey,
              count: (current.filterKey === episodeFilterKey ? current.count : 24) + 24,
            }))}
            className="interactive-focus mt-4 w-full rounded-full border border-gold/18 bg-gold/10 px-4 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark dark:border-gold/18 dark:bg-gold/12 dark:text-gold-light"
          >
            Load more episodes
          </button>
        ) : null}
      </section>
    </div>
  )
}
