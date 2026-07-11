import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { LibraryChapterIndexEntry, LibraryChapterPayload, LibraryTextBlock, LibraryWork } from '../../types'
import { loadLibraryChapter, loadLibraryChapterIndex, loadLibraryWorkCatalog } from '../../data/libraryRepository'
import SurfaceStateCard from '../../components/SurfaceStateCard'
import { useProgressStore } from '../../store/progress'

interface ChapterReaderState {
  work: LibraryWork
  chapter: LibraryChapterPayload
  chapters: LibraryChapterIndexEntry[]
}

interface ChapterLoadState {
  key: string
  status: 'loading' | 'ready' | 'error'
  reader: ChapterReaderState | null
}

function blockClassName(block: LibraryTextBlock) {
  if (block.type === 'heading') return 'mt-8 font-display text-2xl leading-snug text-ink dark:text-dark-text'
  if (block.type === 'line') return 'mt-4 font-serif text-[1.04rem] leading-8 text-ink/84 dark:text-dark-text/84'
  return 'mt-5 font-serif text-[1.06rem] leading-8 text-ink/86 dark:text-dark-text/86'
}

function chapterLabel(chapter: Pick<LibraryChapterPayload | LibraryChapterIndexEntry, 'kind' | 'episodeNumber' | 'chapterNumber'>) {
  return chapter.kind === 'episode' && chapter.episodeNumber
    ? `Episode ${chapter.episodeNumber}`
    : `Chapter ${chapter.chapterNumber}`
}

function sourceRangeLabel(chapter: Pick<LibraryChapterPayload, 'startSourcePage' | 'endSourcePage'>) {
  return chapter.startSourcePage === chapter.endSourcePage
    ? `EPUB page ${chapter.startSourcePage}`
    : `EPUB pages ${chapter.startSourcePage}-${chapter.endSourcePage}`
}

function chapterPath(workId: string, chapterId: string) {
  return `/library/${workId}/chapters/${chapterId}`
}

export default function LibraryChapterReader() {
  const updateSession = useProgressStore(state => state.updateSession)
  const { workId = 'panth-prakash-english', chapterId = '' } = useParams<{ workId: string; chapterId: string }>()
  const requestKey = `${workId}:${chapterId}`
  const [loadState, setLoadState] = useState<ChapterLoadState>({ key: requestKey, status: 'loading', reader: null })
  const state = loadState.key === requestKey ? loadState.status : 'loading'
  const reader = loadState.key === requestKey ? loadState.reader : null

  useEffect(() => {
    let cancelled = false

    Promise.all([
      loadLibraryWorkCatalog(),
      loadLibraryChapterIndex(workId),
      loadLibraryChapter(workId, chapterId),
    ])
      .then(([catalog, chapters, chapter]) => {
        const work = catalog.workById[workId]
        if (!work || !chapter) throw new Error('Chapter not found')
        if (cancelled) return
        setLoadState({ key: requestKey, status: 'ready', reader: { work, chapter, chapters } })
      })
      .catch(() => {
        if (cancelled) return
        setLoadState({ key: requestKey, status: 'error', reader: null })
      })

    return () => {
      cancelled = true
    }
  }, [chapterId, requestKey, workId])

  useEffect(() => {
    if (!reader) return
    updateSession({
      scriptureId: `${reader.work.id}-${reader.chapter.id}`,
      resumePath: chapterPath(reader.work.id, reader.chapter.id),
      updatedAt: new Date().toISOString(),
    })
  }, [reader, updateSession])

  const currentIndex = useMemo(() => {
    if (!reader) return -1
    return reader.chapters.findIndex(chapter => chapter.id === reader.chapter.id)
  }, [reader])

  if (state === 'loading') {
    return (
      <SurfaceStateCard
        surface="panth-chapter-reader"
        state="loading"
        eyebrow="Panth Prakash"
        title="Loading chapter"
        body="Opening the EPUB-derived chapter text."
        page="library"
      />
    )
  }

  if (state === 'error' || !reader) {
    return (
      <SurfaceStateCard
        surface="panth-chapter-reader"
        state="degraded"
        eyebrow="Panth Prakash"
        title="Chapter unavailable"
        body="This Panth Prakash chapter could not be loaded yet."
        page="library"
      />
    )
  }

  const { work, chapter, chapters } = reader
  const previousChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null
  const nextChapter = currentIndex >= 0 && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null
  const nearbyChapters = currentIndex >= 0
    ? chapters.slice(Math.max(0, currentIndex - 2), Math.min(chapters.length, currentIndex + 3))
    : []
  const progressPercent = chapters.length ? Math.min(100, Math.max(0, ((currentIndex + 1) / chapters.length) * 100)) : 0

  return (
    <div
      className="page-shell animate-fade-in"
      data-testid="panth-chapter-reader"
      data-page="library-chapter"
      style={{ paddingBottom: 'calc(var(--nav-stack-height, 7rem) + var(--safe-area-bottom) + 10rem)' }}
    >
      <section className="section-shell px-5 py-5 mb-5" data-testid="panth-chapter-compass">
        <nav className="mb-4 font-sans text-xs leading-5 text-ink/64 dark:text-dark-text/78" aria-label="Breadcrumb" data-testid="panth-chapter-breadcrumb">
          <Link to="/banis" className="interactive-focus inline-flex min-h-[44px] items-center px-1 underline-offset-4 hover:underline">Read</Link>
          <span aria-hidden="true"> / </span>
          <Link to="/library" className="interactive-focus inline-flex min-h-[44px] items-center px-1 underline-offset-4 hover:underline">Library</Link>
          <span aria-hidden="true"> / </span>
          <Link to={`/library/${work.id}`} className="interactive-focus inline-flex min-h-[44px] items-center px-1 underline-offset-4 hover:underline">{work.shortTitle}</Link>
          <span aria-hidden="true"> / </span>
          <span>{chapterLabel(chapter)}</span>
        </nav>

        <div className="flex flex-wrap gap-2">
          <span className="chip-pill">{chapterLabel(chapter)}</span>
          <span className="chip-pill">Volume {chapter.volume}</span>
          <span className="chip-pill">{sourceRangeLabel(chapter)}</span>
          <span className="chip-pill">EPUB source</span>
        </div>

        <h1 className="mt-5 max-w-3xl font-display text-[2.25rem] leading-[0.96] text-ink dark:text-dark-text sm:text-[3rem]">
          {chapter.title}
        </h1>
        <p className="mt-4 max-w-3xl font-sans text-sm leading-7 text-ink/72 dark:text-dark-text/74">
          {work.title} · {chapter.pages.length} EPUB page{chapter.pages.length === 1 ? '' : 's'} in this chapter.
        </p>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-sand/20 dark:bg-dark-text/16" aria-hidden="true" data-testid="panth-chapter-progress-track">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </section>

      <article className="hero-surface px-5 py-6 sm:px-7" data-testid="panth-chapter-article">
        <section className="max-w-3xl" data-testid="panth-chapter-text">
          {chapter.pages.map(page => (
            <section key={page.sourcePageNumber} className="border-t border-sand/12 py-6 first:border-t-0 dark:border-dark-text/10">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="chip-pill">EPUB page {page.sourcePageNumber}</span>
                <span className="chip-pill">{page.fileName.replace('EPUB/', '')}</span>
              </div>
              {page.blocks.map(block => (
                <p key={block.id} className={blockClassName(block)}>
                  {block.text}
                </p>
              ))}
            </section>
          ))}
        </section>

        <section className="mt-6 rounded-lg border border-sand/14 bg-parchment-card/62 p-4 dark:border-dark-text/10 dark:bg-dark-card/56" data-testid="panth-chapter-provenance">
          <p className="eyebrow">Source</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="chip-pill">{chapter.source.fileName}</span>
            <span className="chip-pill">{sourceRangeLabel(chapter)}</span>
            <span className="chip-pill">Converted to app text</span>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-sand/14 bg-parchment-card/62 p-4 dark:border-dark-text/10 dark:bg-dark-card/56" data-testid="panth-chapter-mini-contents">
          <p className="eyebrow">Nearby chapters</p>
          <div className="mt-3 grid gap-2">
            {nearbyChapters.map(entry => (
              <Link
                key={entry.id}
                to={chapterPath(work.id, entry.id)}
                className={`interactive-focus rounded-lg border px-3 py-3 font-sans text-sm ${entry.id === chapter.id ? 'border-gold/22 bg-gold/10 text-gold-dark dark:border-gold/20 dark:bg-gold/12 dark:text-gold-light' : 'border-sand/14 bg-parchment-card/70 text-ink dark:border-dark-text/10 dark:bg-dark-card/62 dark:text-dark-text'}`}
              >
                {chapterLabel(entry)} · {entry.title}
              </Link>
            ))}
          </div>
        </section>

        <nav className="mt-8 grid gap-3 sm:grid-cols-2" aria-label="Chapter navigation">
          {previousChapter ? (
            <Link to={chapterPath(work.id, previousChapter.id)} className="interactive-focus interactive-card-link rounded-lg border border-sand/14 bg-parchment-card/72 px-4 py-4 dark:border-dark-text/10 dark:bg-dark-card/62">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark dark:text-gold-light">Previous</p>
              <p className="mt-2 font-sans text-sm font-semibold text-ink dark:text-dark-text">{chapterLabel(previousChapter)}</p>
            </Link>
          ) : <span />}
          {nextChapter ? (
            <Link to={chapterPath(work.id, nextChapter.id)} className="interactive-focus interactive-card-link rounded-lg border border-sand/14 bg-parchment-card/72 px-4 py-4 text-right dark:border-dark-text/10 dark:bg-dark-card/62">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark dark:text-gold-light">Next</p>
              <p className="mt-2 font-sans text-sm font-semibold text-ink dark:text-dark-text">{chapterLabel(nextChapter)}</p>
            </Link>
          ) : null}
        </nav>
      </article>
    </div>
  )
}
