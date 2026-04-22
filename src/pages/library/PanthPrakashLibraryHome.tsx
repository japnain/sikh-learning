import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { LibraryEpisodeIndexEntry, LibraryPageIndexEntry, LibraryWork } from '../../types'
import { loadLibraryEpisodeIndex, loadLibraryPageIndex, loadLibraryWorkCatalog } from '../../data/libraryRepository'
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

  useEffect(() => {
    let cancelled = false
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

  function handlePageJumpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextPage = Math.min(pageIndex.length || 1, Math.max(1, Number(pageJumpValue) || 1))
    navigate(`/library/${workId}/page/${nextPage}`)
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

      <section className="hero-surface px-5 py-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <p className="eyebrow">Episode Browser</p>
            <p className="mt-2 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/72">
              Extracted from heading markers in the scanned translation. Good enough to navigate, still reviewable.
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          {episodeIndex.slice(0, 24).map(episode => (
            <Link
              key={episode.episodeNumber}
              to={`/library/${work.id}/page/${episode.startPage}`}
              className="section-shell interactive-focus interactive-card-link px-4 py-4 text-left"
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="chip-pill">Episode {episode.episodeNumber}</span>
                <span className="chip-pill">Volume {episode.volume}</span>
                <span className="chip-pill">Pages {episode.startPage}–{episode.endPage}</span>
              </div>
              <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">{episode.title}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
