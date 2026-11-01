import '../../styles/catalog.css'
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
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
  loadLibraryWork,
  LibraryEditionUpdateRequiredError,
  resetLibraryRepositoryCache,
} from '../../data/libraryRepository'
import { findLibraryBlockMatches, libraryMatchRanges, normalizeLibraryQuery } from '../../utils/librarySearch'
import '../../styles/library-tools.css'
import {
  useEpubReaderStore,
  EPUB_FONT_SCALE_MIN,
  EPUB_FONT_SCALE_MAX,
  EPUB_FONT_SCALE_STEP,
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

import { captureProseAnchor, findProseReadingBlock, restoreProseAnchor, type ProseAnchor } from '../../utils/proseAnchor'
import { BOOK_READER_COPY, type BookReaderCopy } from './bookReaderCopy'

interface ChapterReaderState {
  work: LibraryWork
  chapter: LibraryChapterPayload
  chapters: LibraryChapterIndexEntry[]
}

interface ChapterLoadState {
  key: string
  status: 'loading' | 'ready' | 'error'
  reader: ChapterReaderState | null
  issue?: 'missing' | 'unavailable' | 'edition'
}

type ReaderPanel = 'contents' | 'display' | 'notes' | null

function chapterLabel(chapter: Pick<LibraryChapterPayload | LibraryChapterIndexEntry, 'kind' | 'episodeNumber' | 'chapterNumber'>, copy: BookReaderCopy) {
  return chapter.kind === 'episode' && chapter.episodeNumber
    ? copy.episode(chapter.episodeNumber)
    : copy.section(chapter.chapterNumber)
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

function ReaderInlineText({ text, query, onOpenNotes, copy }: { text: string; query: string; copy: BookReaderCopy; onOpenNotes?: (trigger: HTMLElement) => void }) {
  const normalized = text.replace(/\s+([,.;!?])/g, '$1')
  const markerPattern = /([A-Za-z)])(\d{1,3})(?=(?:[,.;:!?)]|\s|$))/g
  const content: ReactNode[] = []
  let cursor = 0

  for (const match of normalized.matchAll(markerPattern)) {
    const number = match[2]
    const numberStart = (match.index ?? 0) + match[1].length
    content.push(<HighlightedText key={`text-${cursor}`} text={normalized.slice(cursor, numberStart)} query={query} />)
    content.push(<sup key={`${numberStart}-${number}`} className="epub-reading-footnote-marker">{onOpenNotes ? <a href="#source-notes" aria-label={copy.openReference(number)} onClick={event => { event.preventDefault(); onOpenNotes(event.currentTarget) }}>{number}</a> : number}</sup>)
    cursor = numberStart + number.length
  }

  content.push(<HighlightedText key={`text-${cursor}`} text={normalized.slice(cursor)} query={query} />)
  return <>{content}</>
}

function ReaderBlock({ block, query, matched, register, onOpenNotes, copy }: { block: LibraryTextBlock; copy: BookReaderCopy; query: string; matched: boolean; register: (blockId: string, node: HTMLElement | null) => void; onOpenNotes?: (trigger: HTMLElement) => void }) {
  const common = {
    id: block.id,
    ref: (node: HTMLElement | null) => register(block.id, node),
    'data-reader-block': block.id,
    'data-reader-match': matched ? 'true' : undefined,
    tabIndex: -1,
  }

  if (block.type === 'heading') {
    return <h2 {...common} className="epub-reading-heading"><ReaderInlineText text={block.text} query={query} onOpenNotes={onOpenNotes} copy={copy} /></h2>
  }

  if (block.type === 'invocation') {
    return <p {...common} className="epub-reading-invocation"><ReaderInlineText text={block.text} query={query} onOpenNotes={onOpenNotes} copy={copy} /></p>
  }

  if (block.type === 'meter') {
    return <p {...common} className="epub-reading-meter"><HighlightedText text={block.text} query={query} /></p>
  }

  if (block.type === 'verse' || block.type === 'line') {
    const lines = block.lines?.length ? block.lines : [block.text]
    return (
      <div {...common} className="epub-reading-verse">
        <div>
          {lines.map((line, index) => <span key={`${block.id}-line-${index}`}><ReaderInlineText text={line} query={query} onOpenNotes={onOpenNotes} copy={copy} /></span>)}
        </div>
        {block.number ? <span className="epub-reading-verse__number">{block.number}</span> : null}
      </div>
    )
  }

  if (block.type === 'note') {
    return <aside {...common} className="epub-reading-note" aria-label={copy.note}><ReaderInlineText text={block.text} query={query} onOpenNotes={onOpenNotes} copy={copy} /></aside>
  }

  return <p {...common} className="epub-reading-paragraph"><ReaderInlineText text={block.text} query={query} onOpenNotes={onOpenNotes} copy={copy} /></p>
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

function ReaderPanelShell({ title, description, palette, onClose, children, closeLabel, readerLabel, panelId }: {
  closeLabel: string
  readerLabel: string
  panelId: string
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
      testId={`epub-reader-${panelId}`}
    >
        <header>
          <div>
            <p className="eyebrow">{readerLabel}</p>
            <h2 id="epub-reader-panel-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={closeLabel} autoFocus>
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
  const readerCopy = BOOK_READER_COPY[locale]
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
  const [findDraft, setFindDraft] = useState(searchQuery)
  const [pendingFindQuery, setPendingFindQuery] = useState<string | null>(null)
  const [savedNotice, setSavedNotice] = useState<string | null>(null)
  const blockNodes = useRef(new Map<string, HTMLElement>())
  const visibleBlockIdRef = useRef<string | null>(null)
  const committedBlockIdRef = useRef<string | null>(null)
  const didRestoreLocation = useRef(false)
  const readerShellRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef(activePanel)
  useLayoutEffect(() => {
    panelRef.current = activePanel
  }, [activePanel])
  const appearanceAnchorRef = useRef<ProseAnchor | null>(null)
  const restoreAppearanceRef = useRef(false)
  const contentsTriggerRef = useRef<HTMLButtonElement | null>(null)
  const settingsTriggerRef = useRef<HTMLButtonElement | null>(null)
  const notesTriggerRef = useRef<HTMLElement | null>(null)
  const progressBarRef = useRef<HTMLSpanElement | null>(null)
  const progressRef = useRef<HTMLDivElement | null>(null)
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
    appearanceAnchorRef.current = null
    restoreAppearanceRef.current = false

    Promise.all([
      loadLibraryWork(workId),
      loadLibraryChapterIndex(workId),
      loadLibraryChapter(workId, chapterId),
    ])
      .then(([work, chapters, chapter]) => {
        if (cancelled) return
        if (!work || !chapter) {
          setLoadState({ key: requestKey, status: 'error', reader: null, issue: 'missing' })
          return
        }
        setLoadState({ key: requestKey, status: 'ready', reader: { work, chapter, chapters } })
      })
      .catch(error => {
        if (cancelled) return
        setLoadState({ key: requestKey, status: 'error', reader: null, issue: error instanceof LibraryEditionUpdateRequiredError ? 'edition' : 'unavailable' })
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
    if (state !== 'error' || loadState.issue !== 'unavailable') return
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
    const progressPercent = locator.locations.totalProgression * 100
    if (progressBarRef.current) {
      progressBarRef.current.style.transform = `scaleX(${progressPercent / 100})`
    }
    if (progressLabelRef.current) {
      progressLabelRef.current.textContent = readerCopy.progressValue(Math.round(progressPercent))
    }
    progressRef.current?.setAttribute('aria-valuenow', String(Math.round(progressPercent)))
    progressRef.current?.setAttribute('aria-valuetext', readerCopy.progressValue(Math.round(progressPercent)))
  }, [createLocator, readerCopy])

  useEffect(() => {
    if (visibleBlockIdRef.current) renderLocationProgress(visibleBlockIdRef.current)
  }, [renderLocationProgress])

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

  const currentReadingBlockId = useCallback(() => {
    const root = readerShellRef.current
    return (root ? findProseReadingBlock(root, '[data-reader-block]')?.id : null)
      ?? visibleBlockIdRef.current
  }, [])

  const commitVisibleLocation = useCallback(() => {
    if (panelRef.current || restoreAppearanceRef.current) return
    const finalBlock = isAppScrollAtEnd() ? chapterBlocks.at(-1) : null
    const blockId = finalBlock?.id ?? currentReadingBlockId()
    if (blockId) {
      visibleBlockIdRef.current = blockId
      commitLocation(blockId)
    }
  }, [chapterBlocks, commitLocation, currentReadingBlockId])

  const openAppearance = () => {
    const root = readerShellRef.current
    appearanceAnchorRef.current = root ? captureProseAnchor(root, '[data-reader-block]') : null
    if (appearanceAnchorRef.current) commitLocation(appearanceAnchorRef.current.id)
    restoreAppearanceRef.current = false
    setActivePanel('display')
  }

  const changeAppearance = (change: () => void) => {
    restoreAppearanceRef.current = Boolean(appearanceAnchorRef.current)
    change()
  }

  useEffect(() => {
    if (activePanel || !restoreAppearanceRef.current) return
    let secondFrame: number | null = null
    // The sheet restores its locked offset first. Then retain the same point
    // within the visible block after typography has reflowed underneath it.
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const anchor = appearanceAnchorRef.current
        const root = readerShellRef.current
        if (anchor && root) {
          restoreProseAnchor(root, anchor)
          visibleBlockIdRef.current = anchor.id
          renderLocationProgress(anchor.id)
        }
        restoreAppearanceRef.current = false
        appearanceAnchorRef.current = null
      })
    })
    return () => {
      window.cancelAnimationFrame(firstFrame)
      if (secondFrame !== null) window.cancelAnimationFrame(secondFrame)
    }
  }, [activePanel, renderLocationProgress])

  useEffect(() => {
    if (activePanel || pendingFindQuery === null) return
    let secondFrame: number | null = null
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const firstMatch = findLibraryBlockMatches(chapterBlocks, pendingFindQuery)[0]
        const params = new URLSearchParams(location.search)
        if (pendingFindQuery) params.set('find', pendingFindQuery)
        else params.delete('find')
        if (firstMatch) didRestoreLocation.current = false
        setPendingFindQuery(null)
        navigate({ pathname: location.pathname, search: params.toString(), hash: firstMatch ? `#${encodeURIComponent(firstMatch.blockId)}` : location.hash }, { replace: true, state: location.state })
      })
    })
    return () => {
      window.cancelAnimationFrame(firstFrame)
      if (secondFrame !== null) window.cancelAnimationFrame(secondFrame)
    }
  }, [activePanel, chapterBlocks, location.hash, location.pathname, location.search, location.state, navigate, pendingFindQuery])

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
      if (requestedBlockId && (shouldRestoreBlock || !visibleBlockIdRef.current)) {
        visibleBlockIdRef.current = requestedBlockId
        renderLocationProgress(requestedBlockId)
      }
    })

    const removeSettledScrollListener = addAppScrollSettledListener(commitVisibleLocation)
    return () => {
      window.cancelAnimationFrame(restoreFrame)
      removeSettledScrollListener()
    }
  }, [chapterBlocks, commitVisibleLocation, location.hash, location.key, location.pathname, location.search, location.state, navigate, reader, renderLocationProgress, searchMatches, searchQuery])

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
        eyebrow={readerCopy.reader}
        title={readerCopy.opening}
        body={readerCopy.preparing}
        page="library"
        actions={[{ label: readerCopy.backBook, onClick: () => navigate(`/library/${workId}`, { state: readerNavigationState }), aiAction: 'leave-loading-book-section' }]}
      />
    )
  }

  if (state === 'error' || !reader) {
    return (
      <SurfaceStateCard
        surface="epub-chapter-reader"
        state="degraded"
        eyebrow={readerCopy.reader}
        title={readerCopy.unavailable}
        body={loadState.issue === 'edition' ? readerCopy.editionChanged : loadState.issue === 'missing' ? readerCopy.missing : navigator.onLine === false ? readerCopy.offline : readerCopy.failed}
        page="library"
        actions={[
          { label: readerCopy.retry, onClick: retryLoad, aiAction: 'retry-library-chapter' },
          { label: readerCopy.backBook, onClick: () => navigate(`/library/${workId}`, { state: readerNavigationState }), aiAction: 'leave-unavailable-book-section', emphasis: 'secondary' },
        ]}
      />
    )
  }

  const { work, chapter, chapters } = reader
  const previousChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null
  const nextChapter = currentIndex >= 0 && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null
  const normalizedTocQuery = tocQuery.trim().toLowerCase()
  const filteredToc = normalizedTocQuery
    ? chapters.filter(entry => `${chapterLabel(entry, readerCopy)} ${entry.title}`.toLowerCase().includes(normalizedTocQuery))
    : chapters
  const readerStyle = {
    '--epub-font-scale': String(fontScale),
  } as CSSProperties
  const backLabel = readerOrigin.startsWith('/saved')
    ? readerCopy.backSaved
    : readerOrigin.startsWith('/banis')
      ? readerCopy.backRead
      : readerCopy.backWork(work.shortTitle)
  const chapterBookmark = getBookBookmark(work.id, chapter.id)
  const openContents = () => {
    commitVisibleLocation()
    setFindDraft(searchQuery)
    setActivePanel('contents')
  }
  const openSourceNotes = (trigger: HTMLElement) => {
    commitVisibleLocation()
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
      setSavedNotice(result.persisted ? readerCopy.removed : readerCopy.storage)
      return
    }

    const blockId = currentReadingBlockId() ?? chapterBlocks[0]?.id
    const block = blockId ? chapterBlocks.find(item => item.id === blockId) : undefined
    const result = addBookmark({
      type: 'book',
      title: `${work.shortTitle} · ${chapterLabel(chapter, readerCopy)}`,
      workId: work.id,
      chapterId: chapter.id,
      chapterLabel: chapterLabel(chapter, readerCopy),
      blockId,
      excerpt: block ? readerBlockText(block).slice(0, 360).trim() : chapter.title,
      description: chapter.title,
      returnPath: `${chapterPath(work.id, chapter.id)}${blockId ? `#${encodeURIComponent(blockId)}` : ''}`,
    })
    setSavedNotice(result.persisted ? readerCopy.saved : readerCopy.storage)
  }

  return (
    <div
      ref={readerShellRef}
      tabIndex={-1}
      className="epub-reader-shell"
      data-testid="panth-chapter-reader"
      data-page="library-chapter"
      lang={locale}
      data-palette={palette}
      data-line-height={lineHeight}
      data-measure={measure}
      style={readerStyle}
    >
      <ReaderHeader className="epub-reader-topbar" data-testid="panth-reader-topbar"
        title={work.shortTitle}
        titleLang="en"
        back={<Link to={readerOrigin} className="epub-reader-topbar__back interactive-focus" aria-label={backLabel}><IconArrowLeft size={18} /></Link>}
        actions={<>
          <button ref={contentsTriggerRef} type="button" onClick={openContents} aria-label={readerCopy.openContents} aria-haspopup="dialog" aria-expanded={activePanel === 'contents'}><IconLibrary size={18} /></button>
          <button ref={settingsTriggerRef} type="button" onClick={openAppearance} aria-label={readerCopy.appearance} aria-haspopup="dialog" aria-expanded={activePanel === 'display'}><span aria-hidden="true" className="study-reader-aa">Aa</span></button>
          <button
            type="button"
            onClick={toggleChapterBookmark}
            aria-label={chapterBookmark ? readerCopy.remove : readerCopy.save}
            aria-pressed={Boolean(chapterBookmark)}
            data-testid="panth-reader-bookmark"
          >
            {chapterBookmark ? <IconBookmarkFilled size={18} /> : <IconBookmark size={18} />}
          </button>
        </>}
        secondary={searchQuery ? <section className="epub-reader-find !mb-0 !border-0 !p-2" aria-label={readerCopy.find}>
          <p role="status" aria-atomic="true" className="!mb-1">
            <span aria-hidden="true">{searchMatches.length ? `${currentMatchIndex + 1} / ${searchMatches.length}` : '0 / 0'} · “{searchQuery}”</span>
            <span className="sr-only">{searchMatches.length ? readerCopy.match(currentMatchIndex + 1, searchMatches.length, searchQuery) : readerCopy.noMatches(searchQuery)}</span>
          </p>
          <div>
            <button type="button" aria-label={readerCopy.previous} disabled={currentMatchIndex === 0 || !searchMatches.length} onClick={() => goToSearchMatch(currentMatchIndex - 1)}><IconArrowLeft size={18} /></button>
            <button type="button" aria-label={readerCopy.next} disabled={currentMatchIndex >= searchMatches.length - 1 || !searchMatches.length} onClick={() => goToSearchMatch(currentMatchIndex + 1)}><IconArrowRight size={18} /></button>
            <button type="button" onClick={openContents}>{readerCopy.edit}</button>
            <button type="button" aria-label={readerCopy.clear} onClick={() => {
              const params = new URLSearchParams(location.search)
              params.delete('find')
              setFindDraft('')
              navigate({ pathname: location.pathname, search: params.toString(), hash: location.hash }, { replace: true, state: location.state })
            }}><IconClose size={18} /></button>
          </div>
        </section> : null}
        progress={<div ref={progressRef} className="epub-reader-progress" role="progressbar" aria-label={readerCopy.progress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} aria-valuetext={readerCopy.progressValue(0)}><span ref={progressBarRef} /></div>}
      />

      <div className="sr-only" aria-live="polite" aria-atomic="true">{savedNotice}</div>

      <div className="epub-reader-main" data-testid="panth-chapter-article">
        <header className="epub-reading-title">
          <p>{readerCopy.volume(chapter.volume)} · {chapterLabel(chapter, readerCopy)}</p>
          <h1 lang="en">{chapter.title}</h1>
          <div>
            <span>{chapter.wordCount ? readerCopy.words(chapter.wordCount) : readerCopy.pages(chapter.pages.length)}</span>
            <span ref={progressLabelRef}>{readerCopy.progressValue(0)}</span>
          </div>
        </header>

        <article lang="en" className="epub-reading-body" data-testid="panth-chapter-text">
          {chapter.pages.map(page => (
            <Fragment key={`${page.sourcePageNumber}-${page.sourceHref ?? page.fileName}`}>
              {page.blocks.map(block => (
                <ReaderBlock key={block.id} copy={readerCopy} block={block} query={searchQuery} matched={matchedBlockIds.has(block.id)} register={registerBlock} onOpenNotes={chapter.sourceNotes?.length ? openSourceNotes : undefined} />
              ))}
            </Fragment>
          ))}
        </article>

        <section className="epub-source-notes-entry" aria-label={readerCopy.sourceReferences}>
          {chapter.sourceNotes?.length ? <button id="source-notes" type="button" onClick={event => openSourceNotes(event.currentTarget)}>{readerCopy.readNotes}</button>
            : <p>{readerCopy.noNotes}</p>}
        </section>

        <nav className="epub-reader-chapter-nav" aria-label={readerCopy.sectionNavigation}>
          {previousChapter ? (
            <Link
              to={chapterPath(work.id, previousChapter.id)}
              state={readerNavigationState}
              className="interactive-focus"
            >
              <IconArrowLeft size={16} />
              <span><small>{readerCopy.previousSection}</small><strong>{chapterLabel(previousChapter, readerCopy)}</strong></span>
            </Link>
          ) : <span />}
          {nextChapter ? (
            <Link
              to={chapterPath(work.id, nextChapter.id)}
              state={readerNavigationState}
              className="interactive-focus"
            >
              <span><small>{readerCopy.nextSection}</small><strong>{chapterLabel(nextChapter, readerCopy)}</strong></span>
              <IconArrowRight size={16} />
            </Link>
          ) : null}
        </nav>

        <footer className="epub-reader-edition-link">
          <Link to={`/library/${work.id}`} state={readerNavigationState}>{readerCopy.aboutEdition}</Link>
        </footer>
      </div>

      {activePanel === 'contents' ? (
        <ReaderPanelShell
          title={readerCopy.contents}
          panelId="contents" readerLabel={readerCopy.reader} closeLabel={readerCopy.closeContents}
          description={readerCopy.contentsDescription(chapters.length, work.publications?.length ?? 1)}
          palette={palette}
          onClose={closeActivePanel}
        >
          <form className="epub-reader-find" role="search" aria-label={readerCopy.find} onSubmit={event => {
            event.preventDefault()
            setPendingFindQuery(normalizeLibraryQuery(findDraft))
            closeActivePanel()
          }}>
            <label className="epub-toc-search">
              <span>{readerCopy.find}</span>
              <input type="search" value={findDraft} onChange={event => setFindDraft(event.target.value)} aria-label={readerCopy.query} enterKeyHint="search" />
            </label>
            <button type="submit" className="mt-2">{readerCopy.submit}</button>
          </form>
          <label className="epub-toc-search">
            <span>{readerCopy.searchContents}</span>
            <input value={tocQuery} onChange={event => setTocQuery(event.target.value)} placeholder={readerCopy.contentsPlaceholder} />
          </label>
          {!filteredToc.length ? <p role="status">{readerCopy.noContents}</p> : null}
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
                  <span><small>{readerCopy.volume(entry.volume)}</small><strong lang="en">{entry.title}</strong></span>
                </Link>
              </li>
            ))}
          </ol>
        </ReaderPanelShell>
      ) : null}

      {activePanel === 'notes' && chapter.sourceNotes?.length ? <ReaderPanelShell
        title={readerCopy.notes}
        panelId="source-notes" readerLabel={readerCopy.reader} closeLabel={readerCopy.closeNotes}
        description={readerCopy.notesDescription}
        palette={palette}
        onClose={closeActivePanel}
      >
        {chapter.sourceNotes.map((note, index) => <section key={`${note.sourceHref}-${index}`} className="epub-source-note">
          <h3>{readerCopy.volume(chapter.volume)} · {readerCopy.sourcePage(note.printPageNumber)}</h3>
          <p lang="en">{note.text}</p>
        </section>)}
      </ReaderPanelShell> : null}

      {activePanel === 'display' ? (
        <ReaderPanelShell
          title={readerCopy.appearance}
          panelId="reading-appearance" readerLabel={readerCopy.reader} closeLabel={readerCopy.closeAppearance}
          description={readerCopy.appearanceDescription}
          palette={palette}
          onClose={closeActivePanel}
        >
          <fieldset className="epub-setting-group">
            <legend>{readerCopy.textSize}</legend>
            <label className="epub-font-slider">
              <span aria-hidden="true">A</span>
              <input
                type="range"
                min={EPUB_FONT_SCALE_MIN}
                max={EPUB_FONT_SCALE_MAX}
                step={EPUB_FONT_SCALE_STEP}
                value={fontScale}
                onChange={event => changeAppearance(() => setFontScale(Number(event.target.value)))}
                aria-label={readerCopy.readingTextSize}
              />
              <span aria-hidden="true">A</span>
              <output>{Math.round(fontScale * 100)}%</output>
            </label>
          </fieldset>
          <SegmentedControl<EpubReaderLineHeight>
            label={readerCopy.lineSpacing}
            value={lineHeight}
            options={[
              { value: 'compact', label: readerCopy.compact },
              { value: 'comfortable', label: readerCopy.comfortable },
              { value: 'spacious', label: readerCopy.spacious },
            ]}
            onChange={value => changeAppearance(() => setLineHeight(value))}
          />
          <SegmentedControl<EpubReaderMeasure>
            label={readerCopy.textWidth}
            value={measure}
            options={[
              { value: 'narrow', label: readerCopy.narrow },
              { value: 'standard', label: readerCopy.standard },
              { value: 'wide', label: readerCopy.wide },
            ]}
            onChange={value => changeAppearance(() => setMeasure(value))}
          />
          <SegmentedControl<EpubReaderPalette>
            label={readerCopy.pageColor}
            value={palette}
            options={[
              { value: 'paper', label: readerCopy.paper },
              { value: 'sepia', label: readerCopy.sepia },
              { value: 'night', label: readerCopy.night },
            ]}
            onChange={value => changeAppearance(() => setPalette(value))}
          />
          <button type="button" className="epub-reset-settings" onClick={() => changeAppearance(resetPreferences)}>{readerCopy.reset}</button>
        </ReaderPanelShell>
      ) : null}
    </div>
  )
}
