import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { LibraryPagePayload, LibraryWork } from '../../types'
import { loadLibraryPage, loadLibraryWorkCatalog } from '../../data/libraryRepository'
import SurfaceStateCard from '../../components/SurfaceStateCard'
import { useProgressStore } from '../../store/progress'

export default function LibraryPageReader() {
  const navigate = useNavigate()
  const updateSession = useProgressStore(state => state.updateSession)
  const { workId = '', pageNumber = '1' } = useParams<{ workId: string; pageNumber: string }>()
  const parsedPageNumber = Number(pageNumber) || 1
  const [work, setWork] = useState<LibraryWork | null>(null)
  const [page, setPage] = useState<LibraryPagePayload | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [pageJumpValue, setPageJumpValue] = useState(String(parsedPageNumber))

  useEffect(() => {
    let cancelled = false
    setStatus('loading')

    Promise.all([
      loadLibraryWorkCatalog(),
      loadLibraryPage(workId, parsedPageNumber),
    ])
      .then(([catalog, loadedPage]) => {
        if (cancelled) return
        setWork(catalog.workById[workId] ?? null)
        setPage(loadedPage)
        setStatus(loadedPage ? 'ready' : 'error')
      })
      .catch(() => {
        if (cancelled) return
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [parsedPageNumber, workId])

  useEffect(() => {
    setPageJumpValue(String(parsedPageNumber))
  }, [parsedPageNumber])

  useEffect(() => {
    if (!work || !page) return
    updateSession({
      scriptureId: `${work.id}-${page.pageNumber}`,
      resumePath: `/library/${work.id}/page/${page.pageNumber}`,
      updatedAt: new Date().toISOString(),
    })
  }, [page, updateSession, work])

  if (status === 'loading') {
    return (
      <SurfaceStateCard
        surface="library-page-reader"
        state="loading"
        eyebrow="Source Browsing"
        title="Loading page"
        body="Pulling the Panth Prakash page into the reader."
        page="library"
      />
    )
  }

  if (status === 'error' || !work || !page) {
    return (
      <SurfaceStateCard
        surface="library-page-reader"
        state="degraded"
        eyebrow="Source Browsing"
        title="Page unavailable"
        body="This Panth Prakash page could not be loaded yet."
        page="library"
      />
    )
  }

  const currentWork = work
  const currentPage = page
  const nextPage = currentPage.pageNumber < currentWork.totalPages ? currentPage.pageNumber + 1 : currentPage.pageNumber
  const previousPage = currentPage.pageNumber > 1 ? currentPage.pageNumber - 1 : currentPage.pageNumber

  const filteredBlocks = (() => {
    const looksReadable = (text: string) => {
      const letters = (text.match(/[A-Za-z]/g) ?? []).length
      const weird = (text.match(/[<>^`~_|]/g) ?? []).length
      return letters >= 6 && weird <= 1
    }

    const candidateBlocks = currentPage.blocks.length > 0 ? currentPage.blocks : (currentPage.rawBlocks ?? [])
    const cleaned = candidateBlocks.filter(block => {
      if (block.type === 'heading') return looksReadable(block.text) || /volume|episode|foreword|preface|contents/i.test(block.text)
      return looksReadable(block.text)
    })

    return cleaned.length > 0 ? cleaned : candidateBlocks
  })()

  const qualityLabel = currentPage.quality ?? 'readable'
  const isContentsLikePage = (() => {
    const headingCount = filteredBlocks.filter(block => block.type === 'heading').length
    const episodeLikeCount = filteredBlocks.filter(block => /episode/i.test(block.text)).length
    return /contents/i.test(currentPage.title)
      || (headingCount >= 8 && episodeLikeCount >= 8)
  })()
  const isReferenceLikePage = /index|contents|preface|introduction|foreword|acknowledgement|references|dedication/i.test(currentPage.title)
  const curatedNavigation = currentPage.editorialNavigation ?? []
  const qualityNote = ({
    clean: 'Editorial reading view with strong OCR cleanup.',
    readable: 'Readable OCR draft with light cleanup applied.',
    fragment: 'Complete coverage page: partial OCR survives, so rough fragments are shown instead of hiding the page.',
    unreadable: 'Complete coverage page: this OCR is currently too damaged for editorial reading, so a placeholder is shown while we repair it.',
  } as const)[qualityLabel]
  const presentationNote = isContentsLikePage
    ? 'This contents page is laid out as a browsable episode list so long OCR heading runs read more like an editorial table of contents.'
    : isReferenceLikePage
      ? 'This front or back matter page is laid out as documentary material rather than continuous narrative prose.'
      : null
  const pageProgressPercent = Math.min(100, Math.max(0, (currentPage.pageNumber / currentWork.totalPages) * 100))
  const pageContextLine = page.episode
    ? `${page.episode.title} · episode ${page.episode.number}`
    : isReferenceLikePage
      ? 'Documentary front matter'
      : 'Continuous narrative page'
  const sourceContextLine = `Volume ${page.volume} · Source page ${page.sourcePageNumber} · ${qualityLabel} OCR`

  function handlePageJumpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = Math.min(currentWork.totalPages, Math.max(1, Number(pageJumpValue) || currentPage.pageNumber))
    navigate(`/library/${currentWork.id}/page/${next}`)
  }

  return (
    <div
      className="page-shell animate-fade-in"
      data-testid="library-page-reader"
      style={{ paddingBottom: 'calc(var(--nav-stack-height, 7rem) + var(--safe-area-bottom) + 4rem)' }}
    >
      <section className="section-shell px-5 py-5 mb-5" data-testid="library-reading-compass">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">Reading Compass</p>
            <h1 className="mt-2 font-display text-[2.25rem] leading-none text-ink dark:text-dark-text">{work.title}</h1>
            <p className="mt-3 max-w-[34ch] font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/72">
              {pageContextLine}
            </p>
          </div>
          <div className="shrink-0 rounded-[24px] border border-gold/16 bg-parchment-card/78 px-4 py-3 text-right dark:border-gold/12 dark:bg-dark-card/70">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-gold dark:text-gold-light">Page</p>
            <p className="mt-1 font-display text-[2rem] leading-none text-ink dark:text-dark-text">{page.pageNumber}</p>
            <p className="mt-1 font-sans text-[11px] text-ink/55 dark:text-dark-text/58">of {work.totalPages}</p>
          </div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-sand/15 dark:bg-dark-text/8" aria-hidden="true">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold to-saffron-light"
            style={{ width: `${pageProgressPercent}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-sans text-xs leading-5 text-ink/58 dark:text-dark-text/60" data-testid="library-page-meta">
          <span>{sourceContextLine}</span>
          <span>{page.episode ? `Episode pages ${page.episode.startPage}–${page.episode.endPage}` : 'Source context quiet until needed'}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link
            to={`/library/${work.id}/page/${previousPage}`}
            className="interactive-focus rounded-[22px] border border-sand/16 bg-parchment-card/82 px-4 py-3 text-center font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-ink dark:border-dark-text/10 dark:bg-dark-card/78 dark:text-dark-text"
          >
            Prev page
          </Link>
          <Link
            to={`/library/${work.id}/page/${nextPage}`}
            className="interactive-focus rounded-[22px] bg-gradient-to-r from-saffron to-saffron-light px-4 py-3 text-center font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-white"
          >
            Next page
          </Link>
        </div>

        <form onSubmit={handlePageJumpSubmit} className="mt-3 flex items-center gap-2 rounded-[22px] border border-sand/12 bg-parchment-card/62 px-3 py-3 dark:border-dark-text/10 dark:bg-dark-card/56">
          <label htmlFor="library-page-jump" className="shrink-0 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55 dark:text-dark-text/60">
            Jump
          </label>
          <input
            id="library-page-jump"
            aria-label="Jump to page"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pageJumpValue}
            onChange={event => setPageJumpValue(event.target.value)}
            className="min-w-0 flex-1 rounded-full border border-sand/18 bg-parchment-card px-3 py-2 font-sans text-sm text-ink outline-none ring-0 dark:border-dark-text/10 dark:bg-dark-card dark:text-dark-text"
          />
          <button
            type="submit"
            aria-label="Go to page"
            className="interactive-focus rounded-full border border-sand/14 bg-white/70 px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-ink dark:border-dark-text/10 dark:bg-dark-panel dark:text-dark-text"
          >
            Go
          </button>
        </form>
      </section>

      <section className="hero-surface mt-56 px-5 py-6">
        <div className="mx-auto max-w-[38rem]">
          <div className="mb-6 rounded-[24px] border border-gold/14 bg-parchment-card/62 px-4 py-4 dark:border-gold/10 dark:bg-dark-card/52">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-gold dark:text-gold-light">Reading view</p>
            <h2 className="mt-2 font-display text-[1.8rem] leading-none text-ink dark:text-dark-text">{page.title}</h2>
            <p className="mt-3 font-sans text-sm leading-6 text-ink/62 dark:text-dark-text/66" data-testid="library-page-provenance">
              OCR draft from the verified English archive source. {qualityNote}
            </p>
            {presentationNote ? (
              <p className="mt-2 font-sans text-sm leading-6 text-ink/62 dark:text-dark-text/66" data-testid="library-page-presentation-note">
                {presentationNote}
              </p>
            ) : null}
          </div>

          {isContentsLikePage ? (
            <article
              className="space-y-4"
              data-testid="library-page-contents-layout"
              style={{ paddingBottom: 'calc(var(--nav-stack-height, 7rem) + 1.5rem)' }}
            >
              {curatedNavigation.length > 0 ? (
                <nav
                  aria-label="Curated contents navigation"
                  className="rounded-[24px] border border-gold/14 bg-parchment-card/78 p-4 dark:border-gold/12 dark:bg-dark-card/72"
                  data-testid="library-page-curated-navigation"
                >
                  <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                    Browse these sections
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {curatedNavigation.map(link => (
                      <Link
                        key={link.id}
                        to={`/library/${work.id}/page/${link.pageNumber}`}
                        className="interactive-focus rounded-[20px] border border-sand/18 bg-parchment-card px-4 py-3 text-left transition hover:border-gold/30 hover:bg-white/70 dark:border-dark-text/10 dark:bg-dark-card dark:hover:border-gold/20 dark:hover:bg-dark-card/86"
                      >
                        <p className="font-sans text-sm font-semibold leading-6 text-ink dark:text-dark-text">{link.label}</p>
                        <p className="mt-1 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/72">{link.description}</p>
                        <p className="mt-2 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark dark:text-gold-light">
                          Open at page {link.pageNumber}
                        </p>
                      </Link>
                    ))}
                  </div>
                </nav>
              ) : null}
              <ol className="space-y-3">
                {filteredBlocks.map(block => (
                  <li key={block.id} className={block.type === 'heading' ? 'list-decimal ml-5 pl-1' : 'list-none ml-3'}>
                    <p
                      className={block.type === 'heading'
                        ? 'font-sans text-base font-semibold leading-7 text-ink dark:text-dark-text'
                        : 'font-sans text-sm italic leading-6 text-ink/72 dark:text-dark-text/72'}
                    >
                      {block.text}
                    </p>
                  </li>
                ))}
              </ol>
            </article>
          ) : (
            <article className="space-y-4" style={{ paddingBottom: 'calc(var(--nav-stack-height, 7rem) + 1.5rem)' }}>
              {filteredBlocks.map(block => (
                block.type === 'heading' ? (
                  <h2
                    key={block.id}
                    className="font-sans text-base font-semibold leading-7 tracking-[0.02em] text-gold-dark dark:text-gold-light"
                  >
                    {block.text}
                  </h2>
                ) : (
                  <p
                    key={block.id}
                    className="font-sans text-[1.08rem] leading-8 text-ink dark:text-dark-text"
                  >
                    {block.text}
                  </p>
                )
              ))}
            </article>
          )}
        </div>
      </section>
    </div>
  )
}
