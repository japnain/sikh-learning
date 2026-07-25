import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  IconArrowLeft,
  IconArrowRight,
  IconClose,
  IconLibrary,
  IconMoreHorizontal,
} from '../../components/icons'
import SurfaceStateCard from '../../components/SurfaceStateCard'
import ModalSheet from '../../components/ModalSheet'
import {
  loadLibraryChapter,
  loadLibraryChapterIndex,
  loadLibraryWorkCatalog,
} from '../../data/libraryRepository'
import {
  useEpubReaderStore,
  type EpubReaderLineHeight,
  type EpubReaderMeasure,
  type EpubReaderPalette,
} from '../../store/epubReader'
import { useProgressStore, type Session } from '../../store/progress'
import type {
  LibraryChapterIndexEntry,
  LibraryChapterPayload,
  LibraryReaderLocator,
  LibraryTextBlock,
  LibraryWork,
} from '../../types'

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

type ReaderPanel = 'contents' | 'display' | null

function chapterLabel(chapter: Pick<LibraryChapterPayload | LibraryChapterIndexEntry, 'kind' | 'episodeNumber' | 'chapterNumber'>) {
  return chapter.kind === 'episode' && chapter.episodeNumber
    ? `Episode ${chapter.episodeNumber}`
    : `Section ${chapter.chapterNumber}`
}

function chapterPath(workId: string, chapterId: string) {
  return `/library/${workId}/chapters/${chapterId}`
}

function readerBlockText(block: LibraryTextBlock) {
  return block.lines?.join(' ') || block.text
}

function isDocumentScrollEnd() {
  const root = document.documentElement
  const scrollTop = window.scrollY || root.scrollTop
  const documentHeight = Math.max(root.scrollHeight, document.body?.scrollHeight ?? 0)
  return scrollTop > 0
    && documentHeight > 0
    && scrollTop + window.innerHeight >= documentHeight - 4
}

function ReaderInlineText({ text }: { text: string }) {
  const normalized = text.replace(/\s+([,.;!?])/g, '$1')
  const markerPattern = /([A-Za-z)])(\d{1,3})(?=(?:[,.;:!?)]|\s|$))/g
  const content: ReactNode[] = []
  let cursor = 0

  for (const match of normalized.matchAll(markerPattern)) {
    const number = match[2]
    const numberStart = (match.index ?? 0) + match[1].length
    content.push(normalized.slice(cursor, numberStart))
    content.push(<sup key={`${numberStart}-${number}`} className="epub-reading-footnote-marker">{number}</sup>)
    cursor = numberStart + number.length
  }

  content.push(normalized.slice(cursor))
  return <>{content}</>
}

function ReaderBlock({ block, register }: { block: LibraryTextBlock; register: (blockId: string, node: HTMLElement | null) => void }) {
  const common = {
    id: block.id,
    ref: (node: HTMLElement | null) => register(block.id, node),
    'data-reader-block': block.id,
  }

  if (block.type === 'heading') {
    return <h2 {...common} className="epub-reading-heading"><ReaderInlineText text={block.text} /></h2>
  }

  if (block.type === 'invocation') {
    return <p {...common} className="epub-reading-invocation"><ReaderInlineText text={block.text} /></p>
  }

  if (block.type === 'meter') {
    return <p {...common} className="epub-reading-meter">{block.text}</p>
  }

  if (block.type === 'verse' || block.type === 'line') {
    const lines = block.lines?.length ? block.lines : [block.text]
    return (
      <div {...common} className="epub-reading-verse">
        <div>
          {lines.map((line, index) => <span key={`${block.id}-line-${index}`}><ReaderInlineText text={line} /></span>)}
        </div>
        {block.number ? <span className="epub-reading-verse__number">{block.number}</span> : null}
      </div>
    )
  }

  if (block.type === 'note') {
    return <aside {...common} className="epub-reading-note" aria-label="Note"><ReaderInlineText text={block.text} /></aside>
  }

  return <p {...common} className="epub-reading-paragraph"><ReaderInlineText text={block.text} /></p>
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <fieldset className="epub-setting-group">
      <legend>{label}</legend>
      <div className="epub-segmented-control">
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function ReaderPanelShell({ title, description, palette, onClose, children }: {
  title: string
  description: string
  palette: EpubReaderPalette
  onClose: () => void
  children: ReactNode
}) {
  const paletteClass = palette === 'sepia'
    ? 'epub-reader-panel--sepia'
    : palette === 'night'
      ? 'epub-reader-panel--night'
      : 'epub-reader-panel--paper'

  return (
    <ModalSheet
      open
      onClose={onClose}
      title={title}
      description={description}
      className={`epub-reader-panel ${paletteClass}`}
      testId={`epub-reader-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
        <header>
          <div>
            <p className="eyebrow">Reader</p>
            <h2 id="epub-reader-panel-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={`Close ${title.toLowerCase()}`} autoFocus>
            <IconClose size={18} />
          </button>
        </header>
        <div className="epub-reader-panel__body">{children}</div>
    </ModalSheet>
  )
}

export default function LibraryChapterReader() {
  const updateSession = useProgressStore(state => state.updateSession)
  const { workId = 'panth-prakash-english', chapterId = '' } = useParams<{ workId: string; chapterId: string }>()
  const location = useLocation()
  const requestKey = `${workId}:${chapterId}`
  const [loadState, setLoadState] = useState<ChapterLoadState>({ key: requestKey, status: 'loading', reader: null })
  const [activePanel, setActivePanel] = useState<ReaderPanel>(null)
  const [tocQuery, setTocQuery] = useState('')
  const blockNodes = useRef(new Map<string, HTMLElement>())
  const currentBlockId = useRef<string | null>(null)
  const didRestoreLocation = useRef(false)
  const readerShellRef = useRef<HTMLDivElement | null>(null)
  const contentsTriggerRef = useRef<HTMLButtonElement | null>(null)
  const settingsTriggerRef = useRef<HTMLButtonElement | null>(null)
  const progressBarRef = useRef<HTMLSpanElement | null>(null)
  const progressLabelRef = useRef<HTMLSpanElement | null>(null)
  const pendingSessionRef = useRef<Session | null>(null)
  const sessionTimerRef = useRef<number | null>(null)

  const fontScale = useEpubReaderStore(state => state.fontScale)
  const lineHeight = useEpubReaderStore(state => state.lineHeight)
  const measure = useEpubReaderStore(state => state.measure)
  const palette = useEpubReaderStore(state => state.palette)
  const setFontScale = useEpubReaderStore(state => state.setFontScale)
  const setLineHeight = useEpubReaderStore(state => state.setLineHeight)
  const setMeasure = useEpubReaderStore(state => state.setMeasure)
  const setPalette = useEpubReaderStore(state => state.setPalette)
  const resetPreferences = useEpubReaderStore(state => state.resetPreferences)

  const state = loadState.key === requestKey ? loadState.status : 'loading'
  const reader = loadState.key === requestKey ? loadState.reader : null

  useEffect(() => {
    let cancelled = false
    didRestoreLocation.current = false
    blockNodes.current.clear()
    currentBlockId.current = null

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

  const currentIndex = useMemo(() => {
    if (!reader) return -1
    return reader.chapters.findIndex(chapter => chapter.id === reader.chapter.id)
  }, [reader])

  const chapterBlocks = useMemo(
    () => reader?.chapter.pages.flatMap(page => page.blocks) ?? [],
    [reader]
  )

  const locatorMetrics = useMemo(() => {
    if (!reader) return null

    let charactersBefore = 0
    let wordsBefore = 0
    const byBlockId = new Map<string, {
      index: number
      charactersBefore: number
      wordsBefore: number
    }>()

    chapterBlocks.forEach((block, index) => {
      byBlockId.set(block.id, { index, charactersBefore, wordsBefore })
      const text = readerBlockText(block)
      charactersBefore += text.length
      wordsBefore += text.split(/\s+/).filter(Boolean).length
    })

    const chapterCharactersBefore = reader.chapters
      .slice(0, Math.max(0, currentIndex))
      .reduce((total, chapter) => total + (chapter.charCount ?? 0), 0)
    const chapterCharacters = reader.chapter.charCount ?? charactersBefore
    const knownTotalCharacters = reader.work.totalCharacters
      ?? reader.chapters.reduce((total, chapter) => total + (chapter.charCount ?? 0), 0)

    return {
      byBlockId,
      chapterCharactersBefore,
      totalCharacters: Math.max(knownTotalCharacters, chapterCharacters, 1),
    }
  }, [chapterBlocks, currentIndex, reader])

  const createLocator = useCallback((blockId: string): LibraryReaderLocator | null => {
    if (!reader || !locatorMetrics) return null
    const metrics = locatorMetrics.byBlockId.get(blockId)
    if (!metrics) return null
    const block = chapterBlocks[metrics.index]
    if (!block) return null
    const chapterProgression = chapterBlocks.length > 1 ? metrics.index / (chapterBlocks.length - 1) : 0
    const totalProgression = Math.min(1, Math.max(
      0,
      (locatorMetrics.chapterCharactersBefore + metrics.charactersBefore) / locatorMetrics.totalCharacters
    ))

    return {
      revision: reader.work.revision,
      href: chapterPath(reader.work.id, reader.chapter.id),
      type: 'application/xhtml+xml',
      title: reader.chapter.title,
      locations: {
        progression: chapterProgression,
        totalProgression,
        position: (reader.chapter.startPosition ?? 1) + metrics.wordsBefore,
        blockId,
      },
      text: {
        highlight: readerBlockText(block).slice(0, 180),
      },
    }
  }, [chapterBlocks, locatorMetrics, reader])

  const flushPendingSession = useCallback(() => {
    if (sessionTimerRef.current !== null) {
      window.clearTimeout(sessionTimerRef.current)
      sessionTimerRef.current = null
    }
    const pendingSession = pendingSessionRef.current
    if (!pendingSession) return
    pendingSessionRef.current = null
    updateSession(pendingSession)
  }, [updateSession])

  const queueSessionUpdate = useCallback((session: Session) => {
    pendingSessionRef.current = session
    if (sessionTimerRef.current !== null) {
      window.clearTimeout(sessionTimerRef.current)
    }
    sessionTimerRef.current = window.setTimeout(flushPendingSession, 280)
  }, [flushPendingSession])

  useEffect(() => {
    const handlePageHide = () => flushPendingSession()
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushPendingSession()
    }

    window.addEventListener('pagehide', handlePageHide)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      flushPendingSession()
    }
  }, [flushPendingSession])

  const recordLocation = useCallback((blockId: string) => {
    if (!reader) return
    if (currentBlockId.current === blockId) return
    const locator = createLocator(blockId)
    if (!locator) return
    currentBlockId.current = blockId
    const progressPercent = Math.max(1, locator.locations.totalProgression * 100)
    if (progressBarRef.current) {
      progressBarRef.current.style.transform = `scaleX(${progressPercent / 100})`
    }
    if (progressLabelRef.current) {
      progressLabelRef.current.textContent = `${Math.round(locator.locations.totalProgression * 100)}% of book`
    }
    queueSessionUpdate({
      scriptureId: `${reader.work.id}-${reader.chapter.id}`,
      resumePath: chapterPath(reader.work.id, reader.chapter.id),
      readerLocator: locator,
      updatedAt: new Date().toISOString(),
    })
  }, [createLocator, queueSessionUpdate, reader])

  const closeActivePanel = useCallback(() => {
    const trigger = activePanel === 'contents' ? contentsTriggerRef.current : settingsTriggerRef.current
    setActivePanel(null)
    window.requestAnimationFrame(() => trigger?.focus({ preventScroll: true }))
  }, [activePanel])

  useEffect(() => {
    if (!reader) return
    const focusFrame = window.requestAnimationFrame(() => {
      const activeElement = document.activeElement
      if (activeElement === document.body || activeElement?.id === 'main-content') {
        readerShellRef.current?.focus({ preventScroll: true })
      }
    })
    return () => window.cancelAnimationFrame(focusFrame)
  }, [reader])

  useEffect(() => {
    if (!reader || !chapterBlocks.length) return

    const shouldRestoreBlock = Boolean(location.hash)
    const requestedBlockId = shouldRestoreBlock
      ? decodeURIComponent(location.hash.slice(1))
      : chapterBlocks[0]?.id
    const requestedNode = requestedBlockId ? blockNodes.current.get(requestedBlockId) : null
    const restoreFrame = window.requestAnimationFrame(() => {
      if (shouldRestoreBlock && !didRestoreLocation.current && requestedNode) {
        didRestoreLocation.current = true
        requestedNode.scrollIntoView?.({ block: 'start', behavior: 'auto' })
      }
      if (requestedBlockId) recordLocation(requestedBlockId)
    })

    if (typeof IntersectionObserver === 'undefined') {
      return () => window.cancelAnimationFrame(restoreFrame)
    }
    const observer = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0]
      const blockId = visible?.target.getAttribute('data-reader-block')
      if (blockId) recordLocation(blockId)
    }, {
      rootMargin: '-18% 0px -65% 0px',
      threshold: [0, 0.1, 0.5],
    })

    blockNodes.current.forEach(node => observer.observe(node))

    let scrollIdleTimer: number | null = null
    const recordSettledDocumentEnd = () => {
      scrollIdleTimer = null
      if (!isDocumentScrollEnd()) return
      const finalBlock = chapterBlocks.at(-1)
      if (finalBlock) recordLocation(finalBlock.id)
    }
    const handleScroll = () => {
      if (scrollIdleTimer !== null) window.clearTimeout(scrollIdleTimer)
      scrollIdleTimer = window.setTimeout(recordSettledDocumentEnd, 180)
    }
    const supportsScrollEnd = 'onscrollend' in document
    if (supportsScrollEnd) {
      document.addEventListener('scrollend', recordSettledDocumentEnd, { passive: true })
    } else {
      window.addEventListener('scroll', handleScroll, { passive: true })
    }

    return () => {
      window.cancelAnimationFrame(restoreFrame)
      if (scrollIdleTimer !== null) window.clearTimeout(scrollIdleTimer)
      if (supportsScrollEnd) {
        document.removeEventListener('scrollend', recordSettledDocumentEnd)
      } else {
        window.removeEventListener('scroll', handleScroll)
      }
      observer.disconnect()
    }
  }, [chapterBlocks, location.hash, reader, recordLocation])

  const registerBlock = useCallback((blockId: string, node: HTMLElement | null) => {
    if (node) blockNodes.current.set(blockId, node)
    else blockNodes.current.delete(blockId)
  }, [])

  if (state === 'loading') {
    return (
      <SurfaceStateCard
        surface="epub-chapter-reader"
        state="loading"
        eyebrow="Reader"
        title="Opening this section"
        body="Preparing the reading edition."
        page="library"
      />
    )
  }

  if (state === 'error' || !reader) {
    return (
      <SurfaceStateCard
        surface="epub-chapter-reader"
        state="degraded"
        eyebrow="Reader"
        title="Section unavailable"
        body="This section could not be opened from the publication package."
        page="library"
      />
    )
  }

  const { work, chapter, chapters } = reader
  const previousChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null
  const nextChapter = currentIndex >= 0 && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null
  const normalizedTocQuery = tocQuery.trim().toLowerCase()
  const filteredToc = normalizedTocQuery
    ? chapters.filter(entry => `${chapterLabel(entry)} ${entry.title}`.toLowerCase().includes(normalizedTocQuery))
    : chapters
  const readerStyle = {
    '--epub-font-scale': String(fontScale),
  } as CSSProperties

  return (
    <div
      ref={readerShellRef}
      tabIndex={-1}
      className="epub-reader-shell"
      data-testid="panth-chapter-reader"
      data-page="library-chapter"
      data-palette={palette}
      data-line-height={lineHeight}
      data-measure={measure}
      style={readerStyle}
    >
      <header className="epub-reader-topbar">
        <Link to={`/library/${work.id}`} className="epub-reader-topbar__back interactive-focus" aria-label={`Back to ${work.shortTitle}`}>
          <IconArrowLeft size={18} />
        </Link>
        <div className="epub-reader-topbar__title">
          <span>{work.shortTitle}</span>
          <strong>{chapterLabel(chapter)}</strong>
        </div>
        <div className="epub-reader-topbar__actions">
          <button ref={contentsTriggerRef} type="button" onClick={() => setActivePanel('contents')} aria-label="Open contents">
            <IconLibrary size={18} />
          </button>
          <button ref={settingsTriggerRef} type="button" onClick={() => setActivePanel('display')} aria-label="Open reading settings">
            <IconMoreHorizontal size={19} />
          </button>
        </div>
        <div className="epub-reader-progress" aria-hidden="true">
          <span ref={progressBarRef} />
        </div>
      </header>

      <div className="epub-reader-main" data-testid="panth-chapter-article">
        <header className="epub-reading-title">
          <p>Volume {chapter.volume} · {chapterLabel(chapter)}</p>
          <h1>{chapter.title}</h1>
          <div>
            <span>{chapter.wordCount ? `${chapter.wordCount.toLocaleString()} words` : `${chapter.pages.length} reading pages`}</span>
            <span ref={progressLabelRef}>0% of book</span>
          </div>
        </header>

        <article className="epub-reading-body" data-testid="panth-chapter-text">
          {chapter.pages.map(page => (
            <Fragment key={`${page.sourcePageNumber}-${page.sourceHref ?? page.fileName}`}>
              {page.blocks.map(block => (
                <ReaderBlock key={block.id} block={block} register={registerBlock} />
              ))}
            </Fragment>
          ))}
        </article>

        <nav className="epub-reader-chapter-nav" aria-label="Section navigation">
          {previousChapter ? (
            <Link to={chapterPath(work.id, previousChapter.id)} className="interactive-focus">
              <IconArrowLeft size={16} />
              <span><small>Previous</small><strong>{chapterLabel(previousChapter)}</strong></span>
            </Link>
          ) : <span />}
          {nextChapter ? (
            <Link to={chapterPath(work.id, nextChapter.id)} className="interactive-focus">
              <span><small>Next</small><strong>{chapterLabel(nextChapter)}</strong></span>
              <IconArrowRight size={16} />
            </Link>
          ) : null}
        </nav>

        <footer className="epub-reader-edition-link">
          <Link to={`/library/${work.id}`}>About this reading edition</Link>
        </footer>
      </div>

      {activePanel === 'contents' ? (
        <ReaderPanelShell
          title="Contents"
          description={`${chapters.length} sections across ${work.publications?.length ?? 1} volumes.`}
          palette={palette}
          onClose={closeActivePanel}
        >
          <label className="epub-toc-search">
            <span>Search contents</span>
            <input value={tocQuery} onChange={event => setTocQuery(event.target.value)} placeholder="Episode or title" />
          </label>
          <ol className="epub-reader-toc">
            {filteredToc.map(entry => (
              <li key={entry.id}>
                <Link
                  to={chapterPath(work.id, entry.id)}
                  aria-current={entry.id === chapter.id ? 'location' : undefined}
                  onClick={() => setActivePanel(null)}
                >
                  <span>{entry.episodeNumber ?? entry.chapterNumber}</span>
                  <span><small>Volume {entry.volume}</small><strong>{entry.title}</strong></span>
                </Link>
              </li>
            ))}
          </ol>
        </ReaderPanelShell>
      ) : null}

      {activePanel === 'display' ? (
        <ReaderPanelShell
          title="Reading settings"
          description="These choices stay with you across books."
          palette={palette}
          onClose={closeActivePanel}
        >
          <fieldset className="epub-setting-group">
            <legend>Text size</legend>
            <label className="epub-font-slider">
              <span aria-hidden="true">A</span>
              <input
                type="range"
                min="0.85"
                max="1.3"
                step="0.05"
                value={fontScale}
                onChange={event => setFontScale(Number(event.target.value))}
                aria-label="Reading text size"
              />
              <span aria-hidden="true">A</span>
              <output>{Math.round(fontScale * 100)}%</output>
            </label>
          </fieldset>
          <SegmentedControl<EpubReaderLineHeight>
            label="Line spacing"
            value={lineHeight}
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'comfortable', label: 'Comfort' },
              { value: 'spacious', label: 'Spacious' },
            ]}
            onChange={setLineHeight}
          />
          <SegmentedControl<EpubReaderMeasure>
            label="Text width"
            value={measure}
            options={[
              { value: 'narrow', label: 'Narrow' },
              { value: 'standard', label: 'Standard' },
              { value: 'wide', label: 'Wide' },
            ]}
            onChange={setMeasure}
          />
          <SegmentedControl<EpubReaderPalette>
            label="Page color"
            value={palette}
            options={[
              { value: 'paper', label: 'Paper' },
              { value: 'sepia', label: 'Sepia' },
              { value: 'night', label: 'Night' },
            ]}
            onChange={setPalette}
          />
          <button type="button" className="epub-reset-settings" onClick={resetPreferences}>Reset reading settings</button>
        </ReaderPanelShell>
      ) : null}
    </div>
  )
}
