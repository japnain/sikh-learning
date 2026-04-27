import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { LibraryEpisodeIndexEntry, LibraryPageIndexEntry, LibraryPagePayload, LibraryWork } from '../../types'
import { loadLibraryEpisodeIndex, loadLibraryPage, loadLibraryPageIndex, loadLibraryWorkCatalog } from '../../data/libraryRepository'
import {
  buildPanthPrakashEditionDebtReport,
  getPanthPrakashArcOptions,
  getPanthPrakashEpisodeDisplayTitle,
  getPanthPrakashEpisodeEditorial,
  type PanthPrakashArcId,
} from '../../data/panthPrakashEditorial'
import SurfaceStateCard from '../../components/SurfaceStateCard'
import { buildSessionResumePath, useProgressStore } from '../../store/progress'

const DEFAULT_WORK_ID = 'panth-prakash-english'

export default function PanthPrakashLibraryHome() {
  const navigate = useNavigate()
  const { workId: routeWorkId } = useParams<{ workId: string }>()
  const workId = routeWorkId ?? DEFAULT_WORK_ID
  const currentSession = useProgressStore(state => state.currentSession)
  const [work, setWork] = useState<LibraryWork | null>(null)
  const [pageIndex, setPageIndex] = useState<LibraryPageIndexEntry[]>([])
  const [episodeIndex, setEpisodeIndex] = useState<LibraryEpisodeIndexEntry[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [pageJumpValue, setPageJumpValue] = useState('1')
  const [episodeSearch, setEpisodeSearch] = useState('')
  const [episodeVolume, setEpisodeVolume] = useState<'all' | number>('all')
  const [episodeArc, setEpisodeArc] = useState<'all' | PanthPrakashArcId>('all')
  const [visibleEpisodeCount, setVisibleEpisodeCount] = useState(24)
  const [pageSearchQuery, setPageSearchQuery] = useState('')
  const [pageSearchStatus, setPageSearchStatus] = useState<'idle' | 'searching' | 'ready' | 'empty'>('idle')
  const [pageSearchResults, setPageSearchResults] = useState<Array<{ page: LibraryPagePayload; snippet: string }>>([])

  useEffect(() => {
    let cancelled = false

    Promise.resolve().then(() => {
      if (cancelled) return
      setStatus('loading')

      Promise.all([
        loadLibraryWorkCatalog(),
        loadLibraryPageIndex(workId),
        loadLibraryEpisodeIndex(workId),
      ])
        .then(([catalog, pages, episodes]) => {
          if (cancelled) return
          setWork(catalog.workById[workId] ?? null)
          setPageIndex(pages)
          setEpisodeIndex(episodes)
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

  const visibleEpisodes = filteredEpisodes.slice(0, visibleEpisodeCount)
  const editionDebtReport = useMemo(() => buildPanthPrakashEditionDebtReport(pageIndex), [pageIndex])

  useEffect(() => {
    setVisibleEpisodeCount(24)
  }, [episodeSearch, episodeVolume, episodeArc])

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
    const loadedPages = await Promise.all(pageIndex.map(entry => loadLibraryPage(workId, entry.pageNumber).catch(() => null)))
    const matches = loadedPages
      .filter((page): page is LibraryPagePayload => Boolean(page))
      .map(page => {
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
          page,
          snippet: haystack.slice(snippetStart, snippetEnd).replace(/\s+/g, ' ').trim(),
        }
      })
      .filter((result): result is { page: LibraryPagePayload; snippet: string } => Boolean(result))
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
    <div className="page-shell animate-fade-in pb-10" data-testid="panth-library-home">
      <div className="mb-4">
        <p className="eyebrow">Source Browsing</p>
        <h1 className="mt-2 font-display text-[2.2rem] leading-none text-ink dark:text-dark-text">{work.title}</h1>
        <p className="mt-3 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/72">
          Start from a page, scan the episode list, or jump straight into volume one or two.
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

      <section className="section-shell-quiet px-4 py-4 mb-4" data-testid="panth-edition-debt">
        <p className="eyebrow">Edition trust debt</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="chip-pill">{editionDebtReport.pagesMissingSourceMapping} pages missing source mapping</span>
          <span className="chip-pill">{editionDebtReport.reviewStatusLabel}</span>
        </div>
        <ul className="mt-3 grid gap-2 font-sans text-xs leading-5 text-ink/64 dark:text-dark-text/66">
          {editionDebtReport.nextActions.map(action => <li key={action}>• {action}</li>)}
        </ul>
      </section>

      <section className="section-shell px-5 py-5 mb-4">
        <p className="eyebrow">Jump in</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <form onSubmit={handlePageJumpSubmit} className="flex flex-wrap items-center gap-2">
            <label htmlFor="panth-home-jump" className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55 dark:text-dark-text/60">
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
          Search inside the page text and raw OCR. Results stay page-first and link into the reader with episode context.
        </p>
        <form onSubmit={handlePageSearchSubmit} className="mt-4 grid gap-3">
          <label htmlFor="panth-page-search" className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55 dark:text-dark-text/60">
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
          {pageSearchStatus === 'searching' ? <p className="font-sans text-sm text-ink/62 dark:text-dark-text/66">Searching page text…</p> : null}
          {pageSearchStatus === 'empty' ? <p className="font-sans text-sm text-ink/62 dark:text-dark-text/66">No page matches yet. Try a person, place, or exact OCR phrase.</p> : null}
          {pageSearchResults.map(result => {
            const displayEpisode = result.page.episode
              ? getPanthPrakashEpisodeDisplayTitle({ ...result.page.episode, episodeNumber: result.page.episode.number, volume: result.page.volume })
              : null
            return (
              <Link
                key={result.page.pageNumber}
                to={`/library/${work.id}/page/${result.page.pageNumber}`}
                className="interactive-focus interactive-card-link block rounded-[22px] border border-sand/14 bg-parchment-card/72 px-4 py-3 text-left dark:border-dark-text/10 dark:bg-dark-card/62"
              >
                <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-gold dark:text-gold-light">
                  Open page {result.page.pageNumber}
                </p>
                <p className="mt-2 font-sans text-sm font-semibold text-ink dark:text-dark-text">Page {result.page.pageNumber}{displayEpisode ? ` · ${displayEpisode}` : ''}</p>
                <p className="mt-1 font-sans text-xs leading-5 text-ink/64 dark:text-dark-text/66">{result.snippet}</p>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="hero-surface px-5 py-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <p className="eyebrow">Episode Browser</p>
            <p className="mt-2 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/72">
              Extracted from heading markers in the scanned translation. Search, filter, and load the full episode map without pretending the OCR layer is finished.
            </p>
          </div>
        </div>

        <div className="mb-4 grid gap-3 rounded-[24px] border border-sand/14 bg-parchment-card/62 p-4 dark:border-dark-text/10 dark:bg-dark-card/56">
          <label htmlFor="panth-episode-search" className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55 dark:text-dark-text/60">
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
          <p className="font-sans text-xs leading-5 text-ink/58 dark:text-dark-text/60">
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
                to={`/library/${work.id}/page/${episode.startPage}`}
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
            onClick={() => setVisibleEpisodeCount(count => count + 24)}
            className="interactive-focus mt-4 w-full rounded-full border border-gold/18 bg-gold/10 px-4 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark dark:border-gold/18 dark:bg-gold/12 dark:text-gold-light"
          >
            Load more episodes
          </button>
        ) : null}
      </section>
    </div>
  )
}
