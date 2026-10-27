import '../../styles/catalog.css'
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
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  IconArrowLeft,
  IconArrowRight,
  IconBookmark,
  IconBookmarkFilled,
  IconClose,
  IconLibrary,
} from '../../components/icons'
import SurfaceStateCard from '../../components/SurfaceStateCard'
import ModalSheet from '../../components/ModalSheet'
import ReaderHeader from '../../components/ReaderHeader'
import {
  loadLibraryChapter,
  loadLibraryChapterIndex,
  loadLibraryWorkCatalog,
  resetLibraryRepositoryCache,
} from '../../data/libraryRepository'
import { findLibraryBlockMatches, libraryMatchRanges, normalizeLibraryQuery } from '../../utils/librarySearch'
import '../../styles/library-tools.css'
import {
  useEpubReaderStore,
  type EpubReaderLineHeight,
  type EpubReaderMeasure,
  type EpubReaderPalette,
} from '../../store/epubReader'
import { useProgressStore } from '../../store/progress'
import { useBookmarksStore } from '../../store/bookmarks'
import { useLocaleStore } from '../../store/locale'
import type {
  LibraryChapterIndexEntry,
  LibraryChapterPayload,
  LibraryReaderLocator,
  LibraryTextBlock,
  LibraryWork,
} from '../../types'
import {
  addAppScrollSettledListener,
  isAppScrollAtEnd,
  scrollElementIntoAppView,
} from '../../utils/appScroll'
import {
  buildLibraryReaderNavigationState,
  getLibraryReaderOrigin,
} from '../../utils/libraryReaderNavigation'

interface ChapterReaderState {
  work: LibraryWork
  chapter: LibraryChapterPayload
  chapters: LibraryChapterIndexEntry[]
}

interface ChapterLoadState {
  key: string
  status: 'loading' | 'ready' | 'error'
  reader: ChapterReaderState | null
  issue?: 'missing' | 'unavailable'
}

type ReaderPanel = 'contents' | 'display' | 'notes' | null

const BOOK_SAVE_COPY = {
  en: {
    save: 'Save this book section',
    remove: 'Remove this saved book section',
    saved: 'Book section saved.',
    removed: 'Book section removed from Saved.',
    storage: 'This bookmark could not be saved.',
  },
  pa: {
    save: 'ਕਿਤਾਬ ਦਾ ਇਹ ਭਾਗ ਸੰਭਾਲੋ',
    remove: 'ਕਿਤਾਬ ਦਾ ਇਹ ਸੰਭਾਲਿਆ ਭਾਗ ਹਟਾਓ',
    saved: 'ਕਿਤਾਬ ਦਾ ਭਾਗ ਸੰਭਾਲਿਆ ਗਿਆ।',
    removed: 'ਕਿਤਾਬ ਦਾ ਭਾਗ ਸੰਭਾਲੇ ਵਿੱਚੋਂ ਹਟਾਇਆ ਗਿਆ।',
    storage: 'ਇਹ ਬੁੱਕਮਾਰਕ ਸੰਭਾਲਿਆ ਨਹੀਂ ਜਾ ਸਕਿਆ।',
  },
  hi: {
    save: 'पुस्तक का यह भाग सहेजें',
    remove: 'पुस्तक का यह सहेजा भाग हटाएँ',
    saved: 'पुस्तक का भाग सहेजा गया।',
    removed: 'पुस्तक का भाग सहेजे से हटा दिया गया।',
    storage: 'यह बुकमार्क सहेजा नहीं जा सका।',
  },
} as const

function chapterLabel(chapter: Pick<LibraryChapterPayload | LibraryChapterIndexEntry, 'kind' | 'episodeNumber' | 'chapterNumber'>) {
  return chapter.kind === 'episode' && chapter.episodeNumber
    ? `Episode ${chapter.episodeNumber}`
    : `Section ${chapter.chapterNumber}`
}

function chapterPath(workId: string, chapterId: string) {
  return `/library/${workId}/chapters/${chapterId}`
}

function decodeReaderBlockHash(hash: string): string | null {
  if (!hash || hash === '#') return null

  try {
    return decodeURIComponent(hash.slice(1)) || null
  } catch {
    return null
  }
}

function readerBlockText(block: LibraryTextBlock) {
  return block.lines?.join(' ') || block.text
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const ranges = libraryMatchRanges(text, query)
  if (!ranges.length) return <>{text}</>
  let from = 0
  const parts: ReactNode[] = []
  for (const range of ranges) {
    parts.push(text.slice(from, range.start), <mark key={range.start} className="epub-search-highlight">{text.slice(range.start, range.end)}</mark>)
    from = range.end
  }
  parts.push(text.slice(from))
  return <>{parts}</>
}

function ReaderInlineText({ text, query, onOpenNotes }: { text: string; query: string; onOpenNotes?: (trigger: HTMLElement) => void }) {
  const normalized = text.replace(/\s+([,.;!?])/g, '$1')
  const markerPattern = /([A-Za-z)])(\d{1,3})(?=(?:[,.;:!?)]|\s|$))/g
  const content: ReactNode[] = []
  let cursor = 0

  for (const match of normalized.matchAll(markerPattern)) {
    const number = match[2]
    const numberStart = (match.index ?? 0) + match[1].length
    content.push(<HighlightedText key={`text-${cursor}`} text={normalized.slice(cursor, numberStart)} query={query} />)
    content.push(<sup key={`${numberStart}-${number}`} className="epub-reading-footnote-marker">{onOpenNotes ? <a href="#source-notes" aria-label={`Open source notes, reference ${number}`} onClick={event => { event.preventDefault(); onOpenNotes(event.currentTarget) }}>{number}</a> : number}</sup>)
    cursor = numberStart + number.length
  }

  content.push(<HighlightedText key={`text-${cursor}`} text={normalized.slice(cursor)} query={query} />)
  return <>{content}</>
}

function ReaderBlock({ block, query, matched, register, onOpenNotes }: { block: LibraryTextBlock; query: string; matched: boolean; register: (blockId: string, node: HTMLElement | null) => void; onOpenNotes?: (trigger: HTMLElement) => void }) {
  const common = {
    id: block.id,
    ref: (node: HTMLElement | null) => register(block.id, node),
    'data-reader-block': block.id,
    'data-reader-match': matched ? 'true' : undefined,
    tabIndex: -1,
  }

  if (block.type === 'heading') {
    return <h2 {...common} className="epub-reading-heading"><ReaderInlineText text={block.text} query={query} onOpenNotes={onOpenNotes} /></h2>
  }

  if (block.type === 'invocation') {
    return <p {...common} className="epub-reading-invocation"><ReaderInlineText text={block.text} query={query} onOpenNotes={onOpenNotes} /></p>
  }

  if (block.type === 'meter') {
    return <p {...common} className="epub-reading-meter"><HighlightedText text={block.text} query={query} /></p>
  }

  if (block.type === 'verse' || block.type === 'line') {
    const lines = block.lines?.length ? block.lines : [block.text]
    return (
      <div {...common} className="epub-reading-verse">
        <div>
          {lines.map((line, index) => <span key={`${block.id}-line-${index}`}><ReaderInlineText text={line} query={query} onOpenNotes={onOpenNotes} /></span>)}
        </div>
        {block.number ? <span className="epub-reading-verse__number">{block.number}</span> : null}
      </div>
    )
  }

  if (block.type === 'note') {
    return <aside {...common} className="epub-reading-note" aria-label="Note"><ReaderInlineText text={block.text} query={query} onOpenNotes={onOpenNotes} /></aside>
  }

  return <p {...common} className="epub-reading-paragraph"><ReaderInlineText text={block.text} query={query} onOpenNotes={onOpenNotes} /></p>
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
  const locale = useLocaleStore(state => state.locale)
  const bookSaveCopy = BOOK_SAVE_COPY[locale]
  const { addBookmark, removeBookmark, getBookBookmark } = useBookmarksStore()
  const { workId = 'panth-prakash-english', chapterId = '' } = useParams<{ workId: string; chapterId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const searchQuery = normalizeLibraryQuery(new URLSearchParams(location.search).get('find') ?? '')
  const readerOrigin = getLibraryReaderOrigin(location.state, `/library/${workId}`)
  const readerNavigationState = buildLibraryReaderNavigationState(readerOrigin)
  const requestKey = `${workId}:${chapterId}`
  const [loadState, setLoadState] = useState<ChapterLoadState>({ key: requestKey, status: 'loading', reader: null })
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [activePanel, setActivePanel] = useState<ReaderPanel>(null)
  const [tocQuery, setTocQuery] = useState('')
  const [savedNotice, setSavedNotice] = useState<string | null>(null)
  const blockNodes = useRef(new Map<string, HTMLElement>())
  const visibleBlockIdRef = useRef<string | null>(null)
  const committedBlockIdRef = useRef<string | null>(null)
  const didRestoreLocation = useRef(false)
  const readerShellRef = useRef<HTMLDivElement | null>(null)
  const contentsTriggerRef = useRef<HTMLButtonElement | null>(null)
  const settingsTriggerRef = useRef<HTMLButtonElement | null>(null)
  const notesTriggerRef = useRef<HTMLElement | null>(null)
  const progressBarRef = useRef<HTMLSpanElement | null>(null)
  const progressLabelRef = useRef<HTMLSpanElement | null>(null)

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
    visibleBlockIdRef.current = null
    committedBlockIdRef.current = null

    Promise.all([
      loadLibraryWorkCatalog(),
      loadLibraryChapterIndex(workId),
      loadLibraryChapter(workId, chapterId),
    ])
      .then(([catalog, chapters, chapter]) => {
        const work = catalog.workById[workId]
        if (cancelled) return
        if (!work || !chapter) {
          setLoadState({ key: requestKey, status: 'error', reader: null, issue: 'missing' })
          return
        }
        setLoadState({ key: requestKey, status: 'ready', reader: { work, chapter, chapters } })
      })
      .catch(() => {
        if (cancelled) return
        setLoadState({ key: requestKey, status: 'error', reader: null, issue: 'unavailable' })
      })

    return () => {
      cancelled = true
    }
  }, [chapterId, requestKey, workId, loadAttempt])

  const retryLoad = useCallback(() => {
    resetLibraryRepositoryCache()
    setLoadState({ key: requestKey, status: 'loading', reader: null })
    setLoadAttempt(attempt => attempt + 1)
  }, [requestKey])

  useEffect(() => {
    if (state !== 'error' || loadState.issue === 'missing') return
    window.addEventListener('online', retryLoad)
    return () => window.removeEventListener('online', retryLoad)
  }, [state, loadState.issue, retryLoad])

  const currentIndex = useMemo(() => {
    if (!reader) return -1
    return reader.chapters.findIndex(chapter => chapter.id === reader.chapter.id)
  }, [reader])

  const chapterBlocks = useMemo(
    () => reader?.chapter.pages.flatMap(page => page.blocks) ?? [],
    [reader]
  )
  const searchMatches = useMemo(() => findLibraryBlockMatches(chapterBlocks, searchQuery), [chapterBlocks, searchQuery])
  const matchedBlockIds = useMemo(() => new Set(searchMatches.map(match => match.blockId)), [searchMatches])
  const currentMatchIndex = Math.max(0, searchMatches.findIndex(match => match.blockId === decodeReaderBlockHash(location.hash)))

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

  const renderLocationProgress = useCallback((blockId: string) => {
    const locator = createLocator(blockId)
    if (!locator) return
    const progressPercent = Math.max(1, locator.locations.totalProgression * 100)
    if (progressBarRef.current) {
      progressBarRef.current.style.transform = `scaleX(${progressPercent / 100})`
    }
    if (progressLabelRef.current) {
      progressLabelRef.current.textContent = `${Math.round(locator.locations.totalProgression * 100)}% of book`
    }
  }, [createLocator])

  const commitLocation = useCallback((blockId: string) => {
    if (!reader || committedBlockIdRef.current === blockId) return
    const locator = createLocator(blockId)
    if (!locator) return
    committedBlockIdRef.current = blockId
    renderLocationProgress(blockId)
    updateSession({
      scriptureId: `${reader.work.id}-${reader.chapter.id}`,
      resumePath: chapterPath(reader.work.id, reader.chapter.id),
      readerLocator: locator,
      updatedAt: new Date().toISOString(),
    })
  }, [createLocator, reader, renderLocationProgress, updateSession])

  const commitVisibleLocation = useCallback(() => {
    const finalBlock = isAppScrollAtEnd() ? chapterBlocks.at(-1) : null
    const blockId = finalBlock?.id ?? visibleBlockIdRef.current
    if (blockId) commitLocation(blockId)
  }, [chapterBlocks, commitLocation])

  const closeActivePanel = useCallback(() => {
    const trigger = activePanel === 'contents' ? contentsTriggerRef.current : activePanel === 'notes' ? notesTriggerRef.current : settingsTriggerRef.current
    setActivePanel(null)
    window.requestAnimationFrame(() => trigger?.focus({ preventScroll: true }))
  }, [activePanel, setActivePanel])

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

    const decodedBlockId = decodeReaderBlockHash(location.hash) ?? searchMatches[0]?.blockId ?? null
    const requestedNode = decodedBlockId ? blockNodes.current.get(decodedBlockId) : null
    const shouldRestoreBlock = Boolean(decodedBlockId && requestedNode)
    const requestedBlockId = shouldRestoreBlock ? decodedBlockId : chapterBlocks[0]?.id
    const restoreFrame = window.requestAnimationFrame(() => {
      if (shouldRestoreBlock && !didRestoreLocation.current && requestedNode) {
        didRestoreLocation.current = true
        scrollElementIntoAppView(requestedNode, { block: 'start', behavior: 'auto' })
        if (searchQuery) {
          requestedNode.focus({ preventScroll: true })
          if (!location.hash) navigate({ pathname: location.pathname, search: location.search, hash: `#${encodeURIComponent(decodedBlockId!)}` }, { replace: true, state: location.state })
        }
      }
      if (requestedBlockId) {
        visibleBlockIdRef.current = requestedBlockId
        renderLocationProgress(requestedBlockId)
      }
    })

    const removeSettledScrollListener = addAppScrollSettledListener(commitVisibleLocation)
    if (typeof IntersectionObserver === 'undefined') {
      return () => {
        window.cancelAnimationFrame(restoreFrame)
        removeSettledScrollListener()
      }
    }
    const observer = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0]
      const blockId = visible?.target.getAttribute('data-reader-block')
      if (blockId) visibleBlockIdRef.current = blockId
    }, {
      root: null,
      rootMargin: '-18% 0px -65% 0px',
      threshold: [0, 0.1, 0.5],
    })

    blockNodes.current.forEach(node => observer.observe(node))

    return () => {
      window.cancelAnimationFrame(restoreFrame)
      removeSettledScrollListener()
      observer.disconnect()
    }
  }, [chapterBlocks, commitVisibleLocation, location.hash, location.pathname, location.search, location.state, navigate, reader, renderLocationProgress, searchMatches, searchQuery])

  useEffect(() => {
    if (!reader) return

    const handlePageHide = () => commitVisibleLocation()
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') commitVisibleLocation()
    }

    window.addEventListener('pagehide', handlePageHide)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      commitVisibleLocation()
    }
  }, [commitVisibleLocation, reader])

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
        actions={[{ label: 'Back to book', onClick: () => navigate(`/library/${workId}`, { state: readerNavigationState }), aiAction: 'leave-loading-book-section' }]}
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
        body={loadState.issue === 'missing' ? 'This section is not in the current book. Open the contents to choose another section.' : navigator.onLine === false ? 'You are offline and this section has not been downloaded. Reconnect to try again, or return to the book.' : 'The connection or saved copy could not be read. Try again, or return to the book.'}
        page="library"
        actions={[
          { label: 'Retry', onClick: retryLoad, aiAction: 'retry-library-chapter' },
          { label: 'Back to book', onClick: () => navigate(`/library/${workId}`, { state: readerNavigationState }), aiAction: 'leave-unavailable-book-section', emphasis: 'secondary' },
        ]}
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
  const backLabel = readerOrigin.startsWith('/saved')
    ? 'Back to Saved'
    : readerOrigin.startsWith('/banis')
      ? 'Back to Read'
      : `Back to ${work.shortTitle}`
  const chapterBookmark = getBookBookmark(work.id, chapter.id)
  const openSourceNotes = (trigger: HTMLElement) => {
    notesTriggerRef.current = trigger
    setActivePanel('notes')
  }
  const goToSearchMatch = (index: number) => {
    const match = searchMatches[index]
    if (!match) return
    didRestoreLocation.current = false
    navigate({ pathname: location.pathname, search: location.search, hash: `#${encodeURIComponent(match.blockId)}` }, { replace: true, state: location.state })
  }
  const toggleChapterBookmark = () => {
    if (chapterBookmark) {
      const result = removeBookmark(chapterBookmark.id)
      setSavedNotice(result.persisted ? bookSaveCopy.removed : bookSaveCopy.storage)
      return
    }

    const blockId = visibleBlockIdRef.current ?? chapterBlocks[0]?.id
    const block = blockId ? chapterBlocks.find(item => item.id === blockId) : undefined
    const result = addBookmark({
      type: 'book',
      title: `${work.shortTitle} · ${chapterLabel(chapter)}`,
      workId: work.id,
      chapterId: chapter.id,
      chapterLabel: chapterLabel(chapter),
      blockId,
      excerpt: block ? readerBlockText(block).slice(0, 360).trim() : chapter.title,
      description: chapter.title,
      returnPath: `${chapterPath(work.id, chapter.id)}${blockId ? `#${encodeURIComponent(blockId)}` : ''}`,
    })
    setSavedNotice(result.persisted ? bookSaveCopy.saved : bookSaveCopy.storage)
  }

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
      <ReaderHeader className="epub-reader-topbar" data-testid="panth-reader-topbar"
        title={work.shortTitle} subtitle={chapterLabel(chapter)}
        back={<Link to={readerOrigin} className="epub-reader-topbar__back interactive-focus" aria-label={backLabel}><IconArrowLeft size={18} /></Link>}
        actions={<>
          <button ref={contentsTriggerRef} type="button" onClick={() => setActivePanel('contents')} aria-label="Open contents" aria-haspopup="dialog" aria-expanded={activePanel === 'contents'}><IconLibrary size={18} /></button>
          <button ref={settingsTriggerRef} type="button" onClick={() => setActivePanel('display')} aria-label="Reading appearance" aria-haspopup="dialog" aria-expanded={activePanel === 'display'}><span aria-hidden="true" className="study-reader-aa">Aa</span></button>
<button
            type="button"
            onClick={toggleChapterBookmark}
            aria-label={chapterBookmark ? bookSaveCopy.remove : bookSaveCopy.save}
            aria-pressed={Boolean(chapterBookmark)}
            data-testid="panth-reader-bookmark"
          >
            {chapterBookmark ? <IconBookmarkFilled size={18} /> : <IconBookmark size={18} />}
          </button>
        </>}
        progress={<div className="epub-reader-progress" aria-hidden="true"><span ref={progressBarRef} /></div>}
      />

      <div className="sr-only" aria-live="polite" aria-atomic="true">{savedNotice}</div>

      <div className="epub-reader-main" data-testid="panth-chapter-article">
        {searchQuery ? <section className="epub-reader-find" aria-label="Find in this section">
          <p role="status">{searchMatches.length ? `Passage ${currentMatchIndex + 1} of ${searchMatches.length} matching “${searchQuery}”` : `No text passage matches “${searchQuery}” in this section. The search may match its title.`}</p>
          <div>
            <button type="button" disabled={currentMatchIndex === 0 || !searchMatches.length} onClick={() => goToSearchMatch(currentMatchIndex - 1)}>Previous match</button>
            <button type="button" disabled={currentMatchIndex >= searchMatches.length - 1} onClick={() => goToSearchMatch(currentMatchIndex + 1)}>Next match</button>
            <button type="button" onClick={() => navigate({ pathname: location.pathname, hash: location.hash }, { replace: true, state: location.state })}>Clear search</button>
          </div>
        </section> : null}
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
                <ReaderBlock key={block.id} block={block} query={searchQuery} matched={matchedBlockIds.has(block.id)} register={registerBlock} onOpenNotes={chapter.sourceNotes?.length ? openSourceNotes : undefined} />
              ))}
            </Fragment>
          ))}
        </article>

        <section className="epub-source-notes-entry" aria-label="Source references">
          {chapter.sourceNotes?.length ? <button id="source-notes" type="button" onClick={event => openSourceNotes(event.currentTarget)}>Read source notes for this episode</button>
            : <p>The supplied reading package has no source-note appendix for this section.</p>}
        </section>

        <nav className="epub-reader-chapter-nav" aria-label="Section navigation">
          {previousChapter ? (
            <Link
              to={chapterPath(work.id, previousChapter.id)}
              state={readerNavigationState}
              className="interactive-focus"
            >
              <IconArrowLeft size={16} />
              <span><small>Previous</small><strong>{chapterLabel(previousChapter)}</strong></span>
            </Link>
          ) : <span />}
          {nextChapter ? (
            <Link
              to={chapterPath(work.id, nextChapter.id)}
              state={readerNavigationState}
              className="interactive-focus"
            >
              <span><small>Next</small><strong>{chapterLabel(nextChapter)}</strong></span>
              <IconArrowRight size={16} />
            </Link>
          ) : null}
        </nav>

        <footer className="epub-reader-edition-link">
          <Link to={`/library/${work.id}`} state={readerNavigationState}>About this reading edition</Link>
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
                  state={readerNavigationState}
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

      {activePanel === 'notes' && chapter.sourceNotes?.length ? <ReaderPanelShell
        title="Source notes"
        description="The source edition’s references for this episode. OCR wording is preserved; reference numbers are not individually verified."
        palette={palette}
        onClose={closeActivePanel}
      >
        {chapter.sourceNotes.map((note, index) => <section key={`${note.sourceHref}-${index}`} className="epub-source-note">
          <h3>Volume {chapter.volume} · Source page {note.printPageNumber}</h3>
          <p>{note.text}</p>
        </section>)}
      </ReaderPanelShell> : null}

      {activePanel === 'display' ? (
        <ReaderPanelShell
          title="Reading appearance"
          description="Text size, spacing and width are shared with Stories. Page color applies only to books; the app theme stays separate."
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
