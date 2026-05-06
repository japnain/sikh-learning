import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { LibraryEpisodeIndexEntry, LibraryPagePayload, LibraryTextBlock, LibraryWork } from '../../types'
import { loadLibraryEpisodeIndex, loadLibraryPage, loadLibraryWorkCatalog } from '../../data/libraryRepository'
import {
  getPanthPrakashEpisodeDisplayTitle,
  getPanthPrakashEpisodeEditorial,
  getPanthPrakashTextState,
  getPanthPrakashTextStateLabel,
} from '../../data/panthPrakashEditorial'
import SurfaceStateCard from '../../components/SurfaceStateCard'

interface EpisodeReaderState {
  work: LibraryWork
  episode: LibraryEpisodeIndexEntry
  pages: LibraryPagePayload[]
  previousEpisode: LibraryEpisodeIndexEntry | null
  nextEpisode: LibraryEpisodeIndexEntry | null
}

const METER_PATTERN = /\b(Dohra|Chaupai|Chaupa[iî]|Kabitt|Savaiyya|Soratha|Bhujang|Rasaval|Pauri)\b/gi
const VERSE_MARKER_PATTERN = /\((\d{1,3})\)/g

function pageRangeLabel(pages: LibraryPagePayload[]) {
  const sourceNumbers = pages.map(page => page.sourcePageNumber).filter(pageNumber => pageNumber > 0)
  if (!sourceNumbers.length) return 'Source pages retained'
  const first = Math.min(...sourceNumbers)
  const last = Math.max(...sourceNumbers)
  return first === last ? `Source page ${first}` : `Source pages ${first}–${last}`
}

function blockClassName(block: LibraryTextBlock) {
  if (block.type === 'heading') return 'mt-8 font-display text-2xl leading-snug text-ink dark:text-dark-text'
  if (block.type === 'paragraph') return 'mt-5 font-serif text-[1.06rem] leading-8 text-ink/86 dark:text-dark-text/86'
  return 'mt-3 font-serif text-[1.04rem] leading-8 text-ink/84 dark:text-dark-text/84'
}

function collectApparatus(pages: LibraryPagePayload[]) {
  const meters = new Set<string>()
  const markers = new Set<string>()
  for (const page of pages) {
    for (const block of page.blocks) {
      for (const match of block.text.matchAll(METER_PATTERN)) {
        const meter = match[1].replace(/Chaupa[iî]/i, 'Chaupai')
        meters.add(meter[0].toUpperCase() + meter.slice(1).toLowerCase())
      }
      for (const match of block.text.matchAll(VERSE_MARKER_PATTERN)) {
        markers.add(match[1])
      }
    }
  }
  return {
    meters: [...meters].slice(0, 8),
    markers: [...markers].map(Number).sort((a, b) => a - b).map(String).slice(0, 40),
  }
}

function buildTrustSummary(pages: LibraryPagePayload[]) {
  let editorialReconstruction = 0
  let contentsNavigation = 0
  let sourceBacked = 0
  let rawSourceRetained = 0

  for (const page of pages) {
    const textState = getPanthPrakashTextState(page, page.blocks)
    if (textState === 'editorial-reconstruction') editorialReconstruction += 1
    else if (textState === 'contents-navigation') contentsNavigation += 1
    else sourceBacked += 1
    if (page.rawBlocks?.length) rawSourceRetained += 1
  }

  return { editorialReconstruction, contentsNavigation, sourceBacked, rawSourceRetained }
}

export default function LibraryEpisodeReader() {
  const { workId = 'panth-prakash-english', episodeNumber = '1' } = useParams<{ workId: string; episodeNumber: string }>()
  const numericEpisode = Number(episodeNumber)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [reader, setReader] = useState<EpisodeReaderState | null>(null)
  const [showSource, setShowSource] = useState(false)

  useEffect(() => {
    let cancelled = false
    setState('loading')
    setReader(null)
    setShowSource(false)

    Promise.all([loadLibraryWorkCatalog(), loadLibraryEpisodeIndex(workId)])
      .then(async ([catalog, episodes]) => {
        const work = catalog.workById[workId]
        const episode = episodes.find(entry => entry.episodeNumber === numericEpisode)
        if (!work || !episode) throw new Error('Episode not found')

        const pages = (await Promise.all(
          Array.from({ length: episode.endPage - episode.startPage + 1 }, (_, index) => loadLibraryPage(workId, episode.startPage + index))
        )).filter((page): page is LibraryPagePayload => Boolean(page))

        const episodeIndex = episodes.findIndex(entry => entry.episodeNumber === episode.episodeNumber)
        if (cancelled) return
        setReader({
          work,
          episode,
          pages,
          previousEpisode: episodeIndex > 0 ? episodes[episodeIndex - 1] : null,
          nextEpisode: episodeIndex >= 0 && episodeIndex < episodes.length - 1 ? episodes[episodeIndex + 1] : null,
        })
        setState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setState('error')
      })

    return () => {
      cancelled = true
    }
  }, [workId, numericEpisode])

  const editorial = reader ? getPanthPrakashEpisodeEditorial(reader.episode) : null
  const displayTitle = reader ? getPanthPrakashEpisodeDisplayTitle(reader.episode) : ''
  const trustSummary = useMemo(() => reader ? buildTrustSummary(reader.pages) : null, [reader])
  const apparatus = useMemo(() => reader ? collectApparatus(reader.pages) : { meters: [], markers: [] }, [reader])

  if (state === 'loading') {
    return (
      <SurfaceStateCard
        surface="panth-episode-reader"
        state="loading"
        eyebrow="Panth Prakash Episode"
        title="Loading episode"
        body="Building the continuous episode reader from native pages."
        page="library"
      />
    )
  }

  if (state === 'error' || !reader || !trustSummary) {
    return (
      <SurfaceStateCard
        surface="panth-episode-reader"
        state="degraded"
        eyebrow="Panth Prakash Episode"
        title="Episode unavailable"
        body="This Panth Prakash episode could not be loaded yet."
        page="library"
      />
    )
  }

  return (
    <div className="page-shell animate-fade-in pb-[calc(var(--nav-stack-height)+var(--safe-area-bottom)+4.75rem)]" data-testid="panth-episode-reader">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link to={`/library/${reader.work.id}`} className="interactive-focus rounded-full border border-sand/18 bg-parchment-card/82 px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-ink dark:border-dark-text/10 dark:bg-dark-card/78 dark:text-dark-text">
          Episode library
        </Link>
        <Link to={`/library/${reader.work.id}/page/${reader.episode.startPage}`} className="interactive-focus rounded-full border border-gold/18 bg-gold/10 px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark dark:border-gold/18 dark:bg-gold/12 dark:text-gold-light">
          Open first source page
        </Link>
      </div>

      <article className="hero-surface px-5 py-6 sm:px-7" data-testid="panth-episode-article">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip-pill">Episode {reader.episode.episodeNumber}</span>
          <span className="chip-pill">Volume {reader.episode.volume}</span>
          <span className="chip-pill">App pages {reader.episode.startPage}–{reader.episode.endPage}</span>
          {editorial?.arcLabel ? <span className="chip-pill">{editorial.arcLabel}</span> : null}
        </div>

        <h1 className="mt-5 max-w-3xl font-display text-[2.25rem] leading-[0.96] text-ink dark:text-dark-text sm:text-[3rem]">
          {displayTitle}
        </h1>
        {editorial?.summary ? (
          <p className="mt-4 max-w-3xl font-sans text-sm leading-7 text-ink/72 dark:text-dark-text/74" data-testid="panth-episode-summary">
            {editorial.summary}
          </p>
        ) : null}

        <div className="mt-6 rounded-[24px] border border-sand/14 bg-parchment-card/68 p-4 dark:border-dark-text/10 dark:bg-dark-card/58" data-testid="panth-episode-trust-layer">
          <p className="eyebrow">Reader status</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="chip-pill">Source-backed pages: {trustSummary.sourceBacked}</span>
            <span className="chip-pill">Editorial reconstructions: {trustSummary.editorialReconstruction}</span>
            {trustSummary.contentsNavigation ? <span className="chip-pill">Contents/navigation pages: {trustSummary.contentsNavigation}</span> : null}
            <span className="chip-pill">Raw source retained: {trustSummary.rawSourceRetained}</span>
          </div>
          <p className="mt-3 font-sans text-xs leading-5 text-ink/62 dark:text-dark-text/64">
            Reconstructed pages are readable native summaries grounded in retained OCR/source text. Open the source drawer or individual source pages for provenance.
          </p>
        </div>

        <div className="mt-6 rounded-[24px] border border-sand/14 bg-parchment-card/54 p-4 dark:border-dark-text/10 dark:bg-dark-card/52" data-testid="panth-episode-source-strip">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-gold dark:text-gold-light">
            {pageRangeLabel(reader.pages)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {reader.pages.map(page => (
              <Link
                key={page.pageNumber}
                to={`/library/${reader.work.id}/page/${page.pageNumber}`}
                className="interactive-focus rounded-full border border-sand/18 bg-parchment-card/82 px-3 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-ink dark:border-dark-text/10 dark:bg-dark-card/78 dark:text-dark-text"
              >
                View source page {page.pageNumber}
              </Link>
            ))}
          </div>
        </div>

        <section className="mt-8 max-w-3xl" data-testid="panth-episode-text">
          {reader.pages.map(page => {
            const textState = getPanthPrakashTextState(page, page.blocks)
            return (
              <section key={page.pageNumber} className="border-t border-sand/12 py-6 first:border-t-0 dark:border-dark-text/10">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="chip-pill">Page {page.pageNumber}</span>
                  <span className="chip-pill">Source scan page {page.sourcePageNumber}</span>
                  <span className="chip-pill">{getPanthPrakashTextStateLabel(textState)}</span>
                </div>
                {page.blocks.map(block => (
                  <p key={`${page.pageNumber}-${block.id}`} className={blockClassName(block)}>
                    {block.text}
                  </p>
                ))}
              </section>
            )
          })}
        </section>

        <section className="mt-6 rounded-[24px] border border-sand/14 bg-parchment-card/62 p-4 dark:border-dark-text/10 dark:bg-dark-card/56" data-testid="panth-episode-apparatus">
          <p className="eyebrow">Notes and source apparatus</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {apparatus.meters.map(meter => <span key={meter} className="chip-pill">Verse meter: {meter}</span>)}
            {apparatus.markers.map(marker => <span key={marker} className="chip-pill">Verse marker: {marker}</span>)}
            {!apparatus.meters.length && !apparatus.markers.length ? <span className="chip-pill">No explicit verse markers found in this episode</span> : null}
          </div>
        </section>

        <section className="mt-6 rounded-[24px] border border-sand/14 bg-parchment-card/62 p-4 dark:border-dark-text/10 dark:bg-dark-card/56">
          <button
            type="button"
            onClick={() => setShowSource(value => !value)}
            className="interactive-focus rounded-full border border-gold/18 bg-gold/10 px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark dark:border-gold/18 dark:bg-gold/12 dark:text-gold-light"
          >
            {showSource ? 'Hide source provenance' : 'Show source provenance'}
          </button>
          {showSource ? (
            <div className="mt-4 grid gap-4" data-testid="panth-episode-raw-source">
              <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">Raw OCR retained for {reader.pages.filter(page => page.rawBlocks?.length).length} source pages.</p>
              {reader.pages.map(page => (
                <div key={page.pageNumber} className="rounded-[18px] border border-sand/12 bg-parchment-card/72 p-3 dark:border-dark-text/10 dark:bg-dark-card/64">
                  <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-gold dark:text-gold-light">
                    Page {page.pageNumber} · Source scan page {page.sourcePageNumber} · {getPanthPrakashTextStateLabel(getPanthPrakashTextState(page, page.blocks))}
                  </p>
                  <p className="mt-2 line-clamp-5 font-sans text-xs leading-5 text-ink/64 dark:text-dark-text/66">
                    {(page.rawBlocks ?? []).map(block => block.text).join(' ').slice(0, 900) || 'No raw OCR block present.'}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <nav className="mt-8 grid gap-3 sm:grid-cols-2" aria-label="Episode navigation">
          {reader.previousEpisode ? (
            <Link to={`/library/${reader.work.id}/episode/${reader.previousEpisode.episodeNumber}`} className="interactive-focus interactive-card-link rounded-[24px] border border-sand/14 bg-parchment-card/72 px-4 py-4 dark:border-dark-text/10 dark:bg-dark-card/62">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-gold dark:text-gold-light">Previous episode</p>
              <p className="mt-2 font-sans text-sm font-semibold text-ink dark:text-dark-text">Episode {reader.previousEpisode.episodeNumber}</p>
            </Link>
          ) : <span />}
          {reader.nextEpisode ? (
            <Link to={`/library/${reader.work.id}/episode/${reader.nextEpisode.episodeNumber}`} className="interactive-focus interactive-card-link rounded-[24px] border border-sand/14 bg-parchment-card/72 px-4 py-4 text-right dark:border-dark-text/10 dark:bg-dark-card/62">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-gold dark:text-gold-light">Next episode</p>
              <p className="mt-2 font-sans text-sm font-semibold text-ink dark:text-dark-text">Episode {reader.nextEpisode.episodeNumber}</p>
            </Link>
          ) : null}
        </nav>
      </article>
    </div>
  )
}
