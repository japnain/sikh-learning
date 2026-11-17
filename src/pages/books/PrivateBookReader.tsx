import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent, type RefObject } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import ReaderHeader from '../../components/ReaderHeader'
import ModalSheet from '../../components/ModalSheet'
import { IconArrowLeft, IconArrowRight, IconBookmark, IconBookmarkFilled, IconCheck, IconClose } from '../../components/icons'
import { createPrivateObjectUrl, revokePrivateObjectUrl, fetchPrivateAsset, fetchPrivateAssetRange, getPrivateAssetInfo, getPrivateLibraryAccess, loadPrivateBook, loadPrivateReadingState, savePrivateReadingState, type PrivateBook } from '../../data/privateLibrary'
import { usePrivateLibraryAccess } from '../../hooks/usePrivateLibraryAccess'
import { useEpubReaderStore, useResolvedEpubPalette, EPUB_FONT_SCALE_MIN, EPUB_FONT_SCALE_MAX } from '../../store/epubReader'
import { PrivateBookAccessMessage } from './PrivateBookPage'
import { privateImageCaption, privateSectionLabel } from './privateBookNavigation'
import { createPrivatePdfRangeLoader, privatePdfCanvasRatio } from './privatePdfRendering'
import './private-book-reader.css'

interface BookBlock {
  id: string
  type: 'heading' | 'paragraph' | 'verse' | 'quote' | 'list' | 'note' | 'image' | 'table'
  text?: string
  level?: number
  items?: string[]
  ordered?: boolean
  start?: number
  assetId?: string
  alt?: string
  rows?: string[][]
  anchor?: string
  links?: Array<{ text: string; targetChapterId?: string; targetAnchor?: string }>
}
interface BookChapter { id: string; title: string; blocks: BookBlock[] }
interface SavedMark { id: string; index: number; offset: number; blockId?: string; blockOffset?: number; label: string; createdAt: string }
interface ReadingState { index: number; offset: number; blockId?: string; blockOffset?: number; progress: number; completed?: boolean; bookmarks?: SavedMark[]; updatedAt?: string }
const EMPTY_STATE: ReadingState = { index: 0, offset: 0, progress: 0, bookmarks: [] }
type ReaderPanel = 'contents' | 'display' | 'search' | 'bookmarks' | null
interface SearchResult { index: number; anchor: string; title: string; text: string }
type PdfSearch = (term: string, signal: AbortSignal) => Promise<{ results: SearchResult[]; hasText: boolean }>
function reportPdfFailure(stage: string, error: unknown) {
  if (!import.meta.env.DEV) return
  const failure = error as { name?: unknown; status?: unknown } | null
  console.warn('Private PDF stage failed', { stage, name: typeof failure?.name === 'string' ? failure.name : 'Error', status: typeof failure?.status === 'number' ? failure.status : undefined })
}

export default function PrivateBookReader() {
  const access = usePrivateLibraryAccess()
  const { bookId = '' } = useParams<{ bookId: string }>()
  if (access.loading || !access.allowed) return <PrivateBookAccessMessage loading={access.loading} retry={access.recheck} />
  return <PrivateReaderLoader key={`${bookId}:${access.epoch}`} bookId={bookId} />
}

function PrivateReaderLoader({ bookId }: { bookId: string }) {
  const location = useLocation()
  const [data, setData] = useState<{ book: PrivateBook; state: ReadingState } | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    void loadPrivateBook(bookId).then(async book => {
      const state = await loadPrivateReadingState(bookId, book.editionVersion)
      if (active) { setData({ book, state: state ? normalizeReadingState(state) : EMPTY_STATE }); setError(false) }
    }).catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [bookId, attempt])
  if (data) return <PrivateReaderSession book={data.book} initialState={data.state} />
  return <main className="private-book-state page-shell" aria-busy={!error || undefined}>
    <Link className="private-book-back" to={`/books/private/${encodeURIComponent(bookId)}`} state={getShelfNavigationState(location.state)}><IconArrowLeft size={18} /> Book details</Link>
    <h1>{error ? 'Your reading session could not be opened' : 'Finding your place…'}</h1>
    <p>{error ? 'Check your connection and try again. Your saved place has not been changed.' : 'Preparing the book and your saved position.'}</p>
    {error ? <button className="private-book-button" onClick={() => setAttempt(value => value + 1)}>Try again</button> : null}
  </main>
}

function normalizeReadingState(value: unknown): ReadingState {
  if (!value || typeof value !== 'object') return { ...EMPTY_STATE }
  const data = value as Partial<ReadingState>
  return {
    index: Number.isSafeInteger(data.index) && Number(data.index) >= 0 ? Number(data.index) : 0,
    offset: Number.isFinite(data.offset) && Number(data.offset) >= 0 ? Math.min(Number(data.offset), 1_000_000) : 0,
    blockId: typeof data.blockId === 'string' && data.blockId.length <= 200 ? data.blockId : undefined,
    blockOffset: Number.isFinite(data.blockOffset) && Number(data.blockOffset) >= 0 ? Math.min(Number(data.blockOffset), 1_000_000) : undefined,
    progress: Number.isFinite(data.progress) ? Math.min(1, Math.max(0, Number(data.progress))) : 0,
    completed: data.completed === true,
    bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks.filter(mark => mark && typeof mark.id === 'string' && typeof mark.label === 'string' && Number.isSafeInteger(mark.index) && mark.index >= 0 && Number.isFinite(mark.offset) && mark.offset >= 0).slice(0, 200).map(mark => ({ ...mark, blockId: typeof mark.blockId === 'string' && mark.blockId.length <= 200 ? mark.blockId : undefined, blockOffset: Number.isFinite(mark.blockOffset) && Number(mark.blockOffset) >= 0 ? Math.min(Number(mark.blockOffset), 1_000_000) : undefined })) : [],
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
  }
}

function findSourceBlock(article: HTMLElement, anchor: string) {
  return Array.from(article.querySelectorAll<HTMLElement>('[data-source-id]')).find(element => element.dataset.sourceId === anchor || element.dataset.sourceAnchor === anchor)
}
function getShelfNavigationState(state: unknown) {
  const origin = state && typeof state === 'object' && 'privateBookshelfOrigin' in state ? state.privateBookshelfOrigin : null
  return { privateBookshelfOrigin: typeof origin === 'string' && /^\/banis(?:\?[^#]*)?$/.test(origin) ? origin : '/banis?collection=books' }
}
function readingInset(article: HTMLElement) {
  const page = article.closest('main')
  if (page?.classList.contains('private-reader--focused')) return 24
  const headerHeight = page ? Number.parseFloat(getComputedStyle(page).getPropertyValue('--reader-header-height')) : 0
  return (Number.isFinite(headerHeight) && headerHeight > 0 ? headerHeight : 111) + 24
}

function PrivateReaderSession({ book, initialState }: { book: PrivateBook; initialState: ReadingState }) {
  const location = useLocation()
  const preferences = useEpubReaderStore()
  const palette = useResolvedEpubPalette()
  const requestedIndex = new URLSearchParams(location.search).get('section')
  const sectionFromUrl = requestedIndex !== null && /^\d+$/.test(requestedIndex) ? Number(requestedIndex) : null
  const initialCount = book.renderer === 'pdf' ? book.pageCount || 1 : Math.max(book.contents.length, 1)
  const [total, setTotal] = useState(initialCount)
  const [index, setIndex] = useState(Math.min(initialCount - 1, sectionFromUrl ?? initialState.index))
  const [readingState, setReadingState] = useState<ReadingState>(initialState)
  const [panel, setPanel] = useState<ReaderPanel>(null)
  const [focusedReading, setFocusedReading] = useState(false)
  const [returnPlace, setReturnPlace] = useState<ReadingState | null>(null)
  const [zoom, setZoom] = useState(1)
  const [imageChapter, setImageChapter] = useState(false)
  const [saving, setSaving] = useState<'saved' | 'saving' | 'error'>('saved')
  const [dirty, setDirty] = useState(false)
  const [ready, setReady] = useState(false)
  const [layoutRevision, setLayoutRevision] = useState(0)
  const [pageInput, setPageInput] = useState(String(index + 1))
  const articleRef = useRef<HTMLDivElement>(null)
  const panelFocusRef = useRef<HTMLElement | null>(null)
  const focusButtonRef = useRef<HTMLButtonElement>(null)
  const showControlsRef = useRef<HTMLButtonElement>(null)
  const previousFocusMode = useRef(false)
  const appearancePlace = useRef<{ state: ReadingState; zoom: number } | null>(null)
  const pendingOffset = useRef(sectionFromUrl === null ? initialState.offset : 0)
  const pendingAnchor = useRef<string | null>(null)
  const pendingBlock = useRef(sectionFromUrl === null && initialState.blockId ? { id: initialState.blockId, offset: initialState.blockOffset || 0 } : null)
  const currentState = useRef(readingState)
  const mountedEpoch = useRef(getPrivateLibraryAccess().epoch)
  const dirtyRef = useRef(false)
  const queuedState = useRef<ReadingState | null>(null)
  const restoreGeneration = useRef(0)
  const pdfSearchRef = useRef<PdfSearch | null>(null)
  const currentEntry = book.contents[index]
  const isPages = book.renderer !== 'chapters'
  const label = isPages ? `Page ${index + 1} of ${total}` : privateSectionLabel(currentEntry?.title, index)
  const bookmarks = readingState.bookmarks ?? []
  const marked = bookmarks.some(mark => mark.index === index && Math.abs(mark.offset - readingState.offset) < 100)
  const shelfState = getShelfNavigationState(location.state)

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.isComposing) { setPanel(null); setFocusedReading(false) } }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])

  useEffect(() => {
    if (focusedReading) showControlsRef.current?.focus({ preventScroll: true })
    else if (previousFocusMode.current) focusButtonRef.current?.focus({ preventScroll: true })
    previousFocusMode.current = focusedReading
  }, [focusedReading])

  const updateState = useCallback((patch: Partial<ReadingState>) => {
    const next = { ...currentState.current, ...patch, updatedAt: new Date().toISOString() }
    currentState.current = next
    dirtyRef.current = true
    setReadingState(next)
    setDirty(true)
  }, [])

  const flushPosition = useCallback(() => {
    const access = getPrivateLibraryAccess()
    const snapshot = currentState.current
    if (!dirtyRef.current || !access.allowed || access.epoch !== mountedEpoch.current || queuedState.current === snapshot) return
    queuedState.current = snapshot
    void savePrivateReadingState(book.id, book.editionVersion, snapshot).then(() => {
      if (currentState.current === snapshot) dirtyRef.current = false
    }).catch(() => { if (queuedState.current === snapshot) queuedState.current = null })
  }, [book.id, book.editionVersion])

  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') flushPosition() }
    window.addEventListener('pagehide', flushPosition)
    document.addEventListener('visibilitychange', hide)
    return () => {
      window.removeEventListener('pagehide', flushPosition)
      document.removeEventListener('visibilitychange', hide)
      flushPosition()
    }
  }, [flushPosition])

  useEffect(() => {
    if (!dirty) return
    let active = true
    const timeout = window.setTimeout(() => {
      const access = getPrivateLibraryAccess()
      if (!access.allowed || access.epoch !== mountedEpoch.current || queuedState.current === readingState) return
      queuedState.current = readingState
      setSaving('saving')
      void savePrivateReadingState(book.id, book.editionVersion, readingState).then(() => {
        if (currentState.current === readingState) dirtyRef.current = false
        if (active) setSaving('saved')
      }).catch(() => { if (queuedState.current === readingState) queuedState.current = null; if (active) setSaving('error') })
    }, 700)
    return () => { active = false; clearTimeout(timeout) }
  }, [book.id, book.editionVersion, dirty, readingState])

  const onReady = useCallback(() => { setReady(true); setLayoutRevision(value => value + 1) }, [])
  const registerPdfSearch = useCallback((search: PdfSearch | null) => { pdfSearchRef.current = search }, [])
  const changeAppearance = (change: () => void) => {
    appearancePlace.current ??= { state: { ...currentState.current }, zoom }
    change()
  }
  useEffect(() => {
    const saved = appearancePlace.current
    if (panel || !saved || saved.state.index !== index || !ready) return
    let secondFrame = 0
    const firstFrame = requestAnimationFrame(() => {
      // ModalSheet restores the pre-dialog scroll on its first frame.
      secondFrame = requestAnimationFrame(() => {
        const article = articleRef.current
        if (!article || article.querySelector('.private-reader-pdf[aria-busy="true"]')) return
        const target = saved.state.blockId ? findSourceBlock(article, saved.state.blockId) : null
        const inset = readingInset(article)
        const blockOffset = Math.min(saved.state.blockOffset || 0, Math.max(0, (target?.getBoundingClientRect().height || 1) - 1))
        const offset = isPages || imageChapter ? saved.state.offset * zoom / saved.zoom : saved.state.offset
        const top = target && !imageChapter
          ? target.getBoundingClientRect().top + window.scrollY - inset + blockOffset
          : article.getBoundingClientRect().top + window.scrollY - inset + offset
        appearancePlace.current = null
        window.scrollTo({ top: Math.max(0, top), behavior: 'instant' })
        updateState({ offset, blockId: saved.state.blockId, blockOffset })
      })
    })
    return () => { cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame) }
  }, [panel, ready, index, layoutRevision, isPages, imageChapter, zoom, preferences.fontScale, preferences.fontFamily, preferences.lineHeight, preferences.measure, updateState])
  useEffect(() => {
    if (!ready) return
    const generation = ++restoreGeneration.current
    const frame = requestAnimationFrame(() => {
      if (generation !== restoreGeneration.current) return
      const article = articleRef.current
      if (!article) return
      const inset = readingInset(article)
      let blockId: string | undefined
      let blockOffset: number | undefined
      if (pendingAnchor.current) {
        const target = findSourceBlock(article, pendingAnchor.current)
        target?.scrollIntoView({ block: 'start' })
        blockId = target?.dataset.sourceId
        blockOffset = 0
        pendingAnchor.current = null
      } else if (pendingBlock.current && findSourceBlock(article, pendingBlock.current.id)) {
        const target = findSourceBlock(article, pendingBlock.current.id)!
        blockId = target.dataset.sourceId
        blockOffset = Math.min(pendingBlock.current.offset, Math.max(0, target.getBoundingClientRect().height - 1))
        window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - inset + blockOffset), behavior: 'instant' })
      } else {
        const top = article.getBoundingClientRect().top + window.scrollY
        window.scrollTo({ top: Math.max(0, top - inset + pendingOffset.current), behavior: 'instant' })
      }
      pendingBlock.current = null
      updateState({ index, offset: pendingOffset.current, blockId, blockOffset, progress: currentState.current.completed ? 1 : isPages ? (index + 1) / total : index / total })
    })
    return () => cancelAnimationFrame(frame)
  }, [ready, index, total, isPages, updateState])

  useEffect(() => {
    if (!ready || panel) return
    let timeout: ReturnType<typeof setTimeout> | undefined
    const remember = () => {
      const article = articleRef.current
      if (!article) return
      const inset = readingInset(article)
      const top = article.getBoundingClientRect().top + window.scrollY
      const offset = Math.max(0, window.scrollY - Math.max(0, top - inset))
      const within = Math.min(1, offset / Math.max(1, article.scrollHeight - window.innerHeight + inset))
      const blocks = !isPages ? Array.from(article.querySelectorAll<HTMLElement>('[data-source-id]')) : []
      const block = blocks.find(element => element.getBoundingClientRect().bottom > inset) || blocks.at(-1)
      const snapshot: ReadingState = {
        ...currentState.current, index, offset,
        blockId: block?.dataset.sourceId,
        blockOffset: block ? Math.max(0, inset - block.getBoundingClientRect().top) : undefined,
        progress: currentState.current.completed ? 1 : Math.min(1, (index + (isPages ? 1 : within)) / total),
        updatedAt: new Date().toISOString(),
      }
      // Capture synchronously: browser Back can unmount before the UI/save debounce fires.
      currentState.current = snapshot
      dirtyRef.current = true
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        setReadingState(currentState.current)
        setDirty(true)
      }, 200)
    }
    window.addEventListener('scroll', remember, { passive: true })
    return () => { window.removeEventListener('scroll', remember); clearTimeout(timeout) }
  }, [index, total, ready, isPages, panel])

  const go = (next: number, offset = 0, anchor?: string, blockOffset = 0, rememberReturn = panel !== null || Boolean(anchor)) => {
    const clamped = Math.max(0, Math.min(total - 1, next))
    appearancePlace.current = null
    if (rememberReturn) setReturnPlace({ ...currentState.current })
    pendingOffset.current = offset
    pendingAnchor.current = anchor && !blockOffset ? anchor : null
    pendingBlock.current = anchor && blockOffset ? { id: anchor, offset: blockOffset } : null
    setPanel(null)
    setPageInput(String(clamped + 1))
    if (clamped === index) {
      const generation = ++restoreGeneration.current
      const scrollToPlace = () => {
        const article = articleRef.current
        if (!article || generation !== restoreGeneration.current) return
        const target = anchor ? findSourceBlock(article, anchor) : undefined
        const top = target ? target.getBoundingClientRect().top + window.scrollY - readingInset(article) + blockOffset
          : article.getBoundingClientRect().top + window.scrollY - readingInset(article) + offset
        window.scrollTo({ top: Math.max(0, top), behavior: 'instant' })
      }
      // Wait for the sheet's scroll lock to release before applying an in-section jump.
      if (panel) requestAnimationFrame(() => requestAnimationFrame(scrollToPlace))
      else scrollToPlace()
    } else { setReady(false); setImageChapter(false); setIndex(clamped) }
    updateState({ index: clamped, offset, blockId: anchor, blockOffset: anchor ? blockOffset : undefined, progress: currentState.current.completed ? 1 : isPages ? (clamped + 1) / total : clamped / total })
  }
  const openReference = (chapterId?: string, anchor?: string) => {
    const next = chapterId ? book.contents.findIndex(entry => entry.id === chapterId) : index
    if (next >= 0) go(next, 0, anchor)
  }
  const toggleBookmark = () => {
    const existing = bookmarks.find(mark => mark.index === index && Math.abs(mark.offset - readingState.offset) < 100)
    updateState({ bookmarks: existing ? bookmarks.filter(mark => mark.id !== existing.id) : [...bookmarks.slice(-199), { id: crypto.randomUUID(), index, offset: currentState.current.offset, blockId: currentState.current.blockId, blockOffset: currentState.current.blockOffset, label, createdAt: new Date().toISOString() }] })
  }
  const jumpPage = (event: FormEvent) => { event.preventDefault(); if (/^\d+$/.test(pageInput)) go(Number(pageInput) - 1) }
  const pageNavigation = useRef({ go, index, ready, panel, isPages, imageChapter, zoom })
  useEffect(() => { pageNavigation.current = { go, index, ready, panel, isPages, imageChapter, zoom } })
  useEffect(() => {
    const navigate = (event: KeyboardEvent) => {
      const state = pageNavigation.current
      const target = event.target instanceof Element ? event.target : null
      if (event.defaultPrevented || event.isComposing || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey
        || state.panel || !state.ready || !(state.isPages || state.imageChapter) || state.zoom > 1
        || target?.closest('input,textarea,select,button,a,[contenteditable=true]')) return
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault(); state.go(state.index + (event.key === 'ArrowRight' ? 1 : -1))
      }
    }
    window.addEventListener('keydown', navigate)
    return () => window.removeEventListener('keydown', navigate)
  }, [])
  const articleStyle = { '--private-font-scale': preferences.fontScale, '--private-font-family': preferences.fontFamily === 'classic' ? 'Georgia, "Times New Roman", serif' : preferences.fontFamily === 'sans' ? '"Plus Jakarta Sans", system-ui, sans-serif' : '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif', '--private-line-height': preferences.lineHeight === 'compact' ? 1.6 : preferences.lineHeight === 'spacious' ? 2.1 : 1.85, '--private-measure': preferences.measure === 'narrow' ? '34rem' : preferences.measure === 'wide' ? '52rem' : '42rem' } as CSSProperties
  const panelTitle = panel === 'display' ? 'Reading appearance' : panel === 'contents' ? 'Book navigation' : panel === 'search' ? 'Find in book' : 'Saved bookmarks'

  return <main className={`private-reader private-reader--${palette}${focusedReading ? ' private-reader--focused' : ''}`} style={articleStyle} lang={book.language || 'en'}>
    <ReaderHeader inert={focusedReading || undefined} aria-hidden={focusedReading || undefined} className="private-reader__header" heading title={book.title} subtitle={label} back={<Link className="private-reader__icon" aria-label="Back to book details" to={`/books/private/${encodeURIComponent(book.id)}`} state={shelfState} onClick={flushPosition}><IconArrowLeft size={20} /></Link>} actions={<>
      <button className="private-reader__icon" type="button" onClick={toggleBookmark} aria-label={marked ? 'Remove bookmark at this position' : 'Bookmark this position'} aria-pressed={marked}>{marked ? <IconBookmarkFilled size={19} /> : <IconBookmark size={19} />}</button>
      <button className="private-reader__control" type="button" aria-expanded={panel === 'display'} onClick={() => setPanel(value => value === 'display' ? null : 'display')} aria-label="Reading appearance">Aa</button>
      <button className="private-reader__control" type="button" aria-expanded={panel === 'contents'} onClick={() => setPanel(value => value === 'contents' ? null : 'contents')}>{isPages ? 'Pages' : 'Contents'}</button>
    </>} secondary={<div className="private-reader__secondary">
      <button type="button" aria-expanded={panel === 'bookmarks'} onClick={() => setPanel(value => value === 'bookmarks' ? null : 'bookmarks')}>Bookmarks{bookmarks.length ? ` · ${bookmarks.length}` : ''}</button>
      {book.renderer !== 'pages' ? <button type="button" aria-expanded={panel === 'search'} onClick={() => setPanel(value => value === 'search' ? null : 'search')}>Find in book</button> : null}
      <button ref={focusButtonRef} type="button" onClick={() => setFocusedReading(true)}>Focus</button>
      <span className="private-reader__save" role="status">{saving === 'saving' ? 'Saving place…' : saving === 'error' ? <button type="button" onClick={() => updateState({})}>Place not saved · Retry</button> : `${Math.round(readingState.progress * 100)}% read`}</span>
    </div>} />

    {focusedReading ? <button ref={showControlsRef} className="private-reader-show-controls" type="button" onClick={() => setFocusedReading(false)} aria-label="Show reading controls">Aa <span>Show controls</span></button> : null}
    {returnPlace ? <button className="private-reader-return" type="button" onClick={() => { const destination = returnPlace; setReturnPlace(null); go(destination.index, destination.offset, destination.blockId, destination.blockOffset, false) }}><IconArrowLeft size={15} /> Back to reading</button> : null}

    {panel ? <ModalSheet open onClose={() => setPanel(null)} title={panelTitle} description="Adjust your reading or choose a place in the book. Close this panel to return to the page." initialFocusRef={panelFocusRef} className={`private-reader-sheet private-reader--${palette}`}><section className="private-reader-panel">
      <button className="private-reader-panel__close private-reader__icon" onClick={() => setPanel(null)} aria-label="Close reading panel"><IconClose size={18} /></button>
      {panel === 'display' ? <><h2>Make yourself comfortable</h2><div className="private-reader-settings">
        {!isPages && !imageChapter ? <><div className="private-reader-type-size"><span>Text size</span><div><button type="button" aria-label="Decrease text size" disabled={preferences.fontScale <= EPUB_FONT_SCALE_MIN} onClick={() => changeAppearance(() => preferences.setFontScale(preferences.fontScale - .1))}>A−</button><output aria-live="polite">{Math.round(preferences.fontScale * 100)}%</output><button type="button" aria-label="Increase text size" disabled={preferences.fontScale >= EPUB_FONT_SCALE_MAX} onClick={() => changeAppearance(() => preferences.setFontScale(preferences.fontScale + .1))}>A+</button></div><label className="sr-only" htmlFor="private-reader-text-size">Text size</label><input id="private-reader-text-size" type="range" min="0.85" max="2" step="0.05" value={preferences.fontScale} onChange={event => changeAppearance(() => preferences.setFontScale(Number(event.target.value)))} /></div><label>Typeface<select value={preferences.fontFamily} onChange={event => changeAppearance(() => preferences.setFontFamily(event.target.value as 'literary' | 'classic' | 'sans'))}><option value="literary">Literary · Palatino</option><option value="classic">Classic · Georgia</option><option value="sans">Clear · Sans serif</option></select></label><label>Line spacing<select value={preferences.lineHeight} onChange={event => changeAppearance(() => preferences.setLineHeight(event.target.value as 'compact' | 'comfortable' | 'spacious'))}><option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="spacious">Spacious</option></select></label><label>Reading width<select value={preferences.measure} onChange={event => changeAppearance(() => preferences.setMeasure(event.target.value as 'narrow' | 'standard' | 'wide'))}><option value="narrow">Narrow</option><option value="standard">Standard</option><option value="wide">Wide</option></select></label></> : <label>Page zoom<input type="range" min="0.7" max="2.5" step="0.1" value={zoom} onChange={event => changeAppearance(() => setZoom(Number(event.target.value)))} /><span>{Math.round(zoom * 100)}%</span></label>}
        <fieldset><legend>Paper</legend><div className="private-reader-palette">{(['app', 'paper', 'sepia', 'night'] as const).map(choice => <button key={choice} className={`private-reader-palette__${choice}`} aria-pressed={preferences.palette === choice} onClick={() => preferences.setPalette(choice)}>{choice === 'app' ? 'Follow app' : choice}</button>)}</div></fieldset>
        <button type="button" className="private-reader-reset" onClick={() => changeAppearance(() => { preferences.resetPreferences(); setZoom(1) })}>Reset appearance</button>
      </div></> : null}
      {panel === 'contents' ? <><h2>{isPages ? 'Go to a page' : 'Contents'}</h2>{isPages ? <><form className="private-reader-page-jump" onSubmit={jumpPage}><label>Page<input ref={element => { panelFocusRef.current = element }} type="number" min="1" max={total} value={pageInput} onChange={event => setPageInput(event.target.value)} /></label><span>of {total}</span><button className="private-book-button" type="submit">Go</button></form>{book.renderer === 'pdf' && book.contents.some(entry => entry.page) ? <><h3 className="private-reader-outline-title">In this edition</h3><ol className="private-reader-toc">{book.contents.filter(entry => entry.page).map((entry, entryIndex) => <li key={entry.id}><button onClick={() => go((entry.page || 1) - 1)}><span>{entry.page}</span>{privateSectionLabel(entry.title, entryIndex)}</button></li>)}</ol></> : null}</> : <ol className="private-reader-toc">{book.contents.map((entry, entryIndex) => <li key={entry.id}><button ref={entryIndex === index ? element => { panelFocusRef.current = element } : undefined} aria-current={entryIndex === index ? 'location' : undefined} onClick={() => go(entryIndex)}><span>{String(entryIndex + 1).padStart(2, '0')}</span>{privateSectionLabel(entry.title, entryIndex)}</button></li>)}</ol>}</> : null}
      {panel === 'search' ? <BookSearch inputRef={panelFocusRef} book={book} onOpen={(next, anchor) => go(next, 0, anchor)} searchPdf={(term, signal) => pdfSearchRef.current ? pdfSearchRef.current(term, signal) : Promise.reject(new Error('Pages are still loading'))} /> : null}
      {panel === 'bookmarks' ? <><h2>Your bookmarks</h2>{bookmarks.length ? <ol className="private-reader-marks">{bookmarks.map(mark => <li key={mark.id}><button onClick={() => go(mark.index, mark.offset, mark.blockId, mark.blockOffset)}>{mark.label}</button><button className="private-reader__icon" aria-label={`Remove bookmark: ${mark.label}`} onClick={() => updateState({ bookmarks: bookmarks.filter(item => item.id !== mark.id) })}><IconClose size={16} /></button></li>)}</ol> : <p>Save a place with the bookmark button above. Your bookmarks are private to your account.</p>}</> : null}
    </section></ModalSheet> : null}

    <div ref={articleRef} className={`private-reader__content ${isPages || imageChapter ? 'private-reader__content--pages' : ''}`}>
      {imageChapter ? <div className="private-reader-image-tools" role="group" aria-label="Original page zoom"><button type="button" aria-label="Zoom out" disabled={zoom <= 0.7} onClick={() => changeAppearance(() => setZoom(value => Math.max(0.7, Math.round((value - 0.2) * 10) / 10)))}>−</button><button type="button" onClick={() => changeAppearance(() => setZoom(1))}>Fit width</button><button type="button" aria-label="Zoom in" disabled={zoom >= 2.5} onClick={() => changeAppearance(() => setZoom(value => Math.min(2.5, Math.round((value + 0.2) * 10) / 10)))}>+</button><output aria-live="polite">{Math.round(zoom * 100)}%</output></div> : null}
      {book.renderer === 'chapters' && currentEntry?.assetId ? <ChapterContent key={currentEntry.id} bookId={book.id} assetId={currentEntry.assetId} zoom={zoom} onImageOnly={setImageChapter} onReady={onReady} onReference={openReference} /> : null}
      {book.renderer === 'pages' && currentEntry?.assetId ? <PageImage key={currentEntry.id} bookId={book.id} assetId={currentEntry.assetId} alt={`Page ${index + 1}`} zoom={zoom} onReady={onReady} /> : null}
      {book.renderer === 'pdf' && book.primaryAssetId ? <PdfPage bookId={book.id} assetId={book.primaryAssetId} index={index} zoom={zoom} onReady={onReady} onPageCount={setTotal} onSearchReady={registerPdfSearch} /> : null}
      {(book.renderer === 'pdf' ? !book.primaryAssetId : !currentEntry?.assetId) ? <p role="alert">This section is unavailable. Please return to the book and try again.</p> : null}
    </div>

    <nav className="private-reader-pagination" aria-label={isPages ? 'Page navigation' : 'Section navigation'}>
      <button className="private-book-button" type="button" disabled={index === 0} onClick={() => go(index - 1)}><IconArrowLeft size={17} /> Previous</button>
      <span>{index + 1} / {total}</span>
      {index < total - 1 ? <button className="private-book-button" type="button" onClick={() => go(index + 1)}>Next <IconArrowRight size={17} /></button> : <button className="private-book-button private-book-button--primary" type="button" onClick={() => updateState({ completed: !readingState.completed, progress: readingState.completed ? index / total : 1 })}>{readingState.completed ? <><IconCheck size={17} /> Finished</> : 'Mark finished'}</button>}
    </nav>
    {isPages ? <p className="private-reader-source-note">Original pages · Text selection depends on the source.</p> : null}
  </main>
}

function PrivateImage({ bookId, assetId, alt, onLoad, onSettled, style }: { bookId: string; assetId: string; alt: string; onLoad?: () => void; onSettled?: () => void; style?: CSSProperties }) {
  const [url, setUrl] = useState<string>()
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const settledCallback = useRef(onSettled)
  useEffect(() => { settledCallback.current = onSettled }, [onSettled])
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    let objectUrl: string | undefined
    void fetchPrivateAsset(bookId, assetId, { signal: controller.signal }).then(blob => {
      if (!active) return
      objectUrl = createPrivateObjectUrl(blob)
      setUrl(objectUrl)
    }).catch(() => { if (active) setError(true) })
    return () => { active = false; controller.abort(); if (objectUrl) revokePrivateObjectUrl(objectUrl) }
  }, [bookId, assetId, attempt])
  if (error) return <div className="private-reader-resource-error" role="alert"><p>This image could not be loaded.</p><button className="private-book-button" onClick={() => { setError(false); setUrl(undefined); setAttempt(value => value + 1) }}>Retry image</button></div>
  return url ? <img src={url} alt={alt} style={style} onLoad={() => { onLoad?.(); settledCallback.current?.() }} onError={() => setError(true)} /> : <div className="private-reader-image-loading" role="status">Loading image…</div>
}

function PageImage({ bookId, assetId, alt, zoom, onReady }: { bookId: string; assetId: string; alt: string; zoom: number; onReady: () => void }) {
  return <div className="private-reader-page-image"><PrivateImage bookId={bookId} assetId={assetId} alt={alt} onLoad={onReady} style={{ width: `${zoom * 100}%`, maxWidth: 'none' }} /></div>
}

function ChapterContent({ bookId, assetId, zoom, onImageOnly, onReady, onReference }: { bookId: string; assetId: string; zoom: number; onImageOnly: (value: boolean) => void; onReady: () => void; onReference: (chapterId?: string, anchor?: string) => void }) {
  const [chapter, setChapter] = useState<BookChapter | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const settledImages = useRef(new Set<string>())
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    void fetchPrivateAsset(bookId, assetId, { signal: controller.signal }).then(blob => blob.text()).then(text => {
      const value = JSON.parse(text) as BookChapter
      if (!Array.isArray(value.blocks)) throw new Error('Invalid section')
      if (active) {
        settledImages.current.clear()
        setChapter(value); setError(false)
        onImageOnly(value.blocks.some(block => block.type === 'image' && block.assetId) && value.blocks.every(block => block.type === 'image' || block.type === 'heading'))
        if (!value.blocks.some(block => block.type === 'image' && block.assetId)) onReady()
      }
    }).catch(() => { if (active) setError(true) })
    return () => { active = false; controller.abort() }
  }, [bookId, assetId, onReady, onImageOnly, attempt])
  if (error) return <div role="alert" className="private-reader-resource-error"><p>This section could not be loaded.</p><button className="private-book-button" onClick={() => setAttempt(value => value + 1)}>Try again</button></div>
  if (!chapter) return <p className="private-reader-loading" role="status">Opening section…</p>
  const imageOnly = chapter.blocks.some(block => block.type === 'image' && block.assetId) && chapter.blocks.every(block => block.type === 'image' || block.type === 'heading')
  return <article className={`private-reader-prose${imageOnly ? ' private-reader-prose--image-page' : ''}`} aria-label={chapter.title}>
    {chapter.blocks.map(block => <section id={block.id} key={block.id} className={`private-reader-block private-reader-block--${block.type}`} data-source-id={block.id} data-source-anchor={block.anchor || block.id}>
      {block.type === 'heading' ? <h2>{block.text}</h2> : block.type === 'image' && block.assetId ? <figure tabIndex={imageOnly ? 0 : undefined} aria-label={imageOnly ? 'Original page. Scroll horizontally when zoomed.' : undefined}><PrivateImage bookId={bookId} assetId={block.assetId} alt={privateImageCaption(block.alt) || (imageOnly ? 'Original scanned page' : 'Original book illustration')} style={imageOnly ? { width: `${zoom * 100}%`, maxWidth: 'none' } : undefined} onSettled={() => {
        settledImages.current.add(block.id)
        if (settledImages.current.size >= chapter.blocks.filter(item => item.type === 'image' && item.assetId).length) onReady()
      }} />{privateImageCaption(block.alt) ? <figcaption>{block.alt}</figcaption> : null}</figure> : block.type === 'table' ? <div className="private-reader-table"><table><tbody>{block.rows?.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div> : block.type === 'list' ? block.ordered ? <ol start={block.start}>{block.items?.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ol> : <ul>{block.items?.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul> : block.type === 'quote' ? <blockquote>{block.text}</blockquote> : block.type === 'note' ? <aside>{block.text}</aside> : <p>{block.text}</p>}
      {block.links?.length ? <div className="private-reader-reference-links">{block.links.map((link, linkIndex) => <button key={linkIndex} type="button" onClick={() => onReference(link.targetChapterId, link.targetAnchor)}>{link.text || 'Reference'}</button>)}</div> : null}
    </section>)}
  </article>
}

function BookSearch({ book, onOpen, searchPdf, inputRef }: { book: PrivateBook; onOpen: (index: number, anchor: string) => void; searchPdf: PdfSearch; inputRef: RefObject<HTMLElement | null> }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [status, setStatus] = useState<'idle' | 'searching' | 'done' | 'no-text' | 'error'>('idle')
  const controllerRef = useRef<AbortController | null>(null)
  useEffect(() => () => controllerRef.current?.abort(), [])
  const search = async (event: FormEvent) => {
    event.preventDefault()
    const term = query.trim().toLocaleLowerCase()
    if (term.length < 2) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setStatus('searching'); setResults([])
    let next = 0
    const found: SearchResult[] = []
    const worker = async () => {
      while (next < book.contents.length && !controller.signal.aborted) {
        const index = next++
        const entry = book.contents[index]
        if (!entry.assetId) continue
        const blob = await fetchPrivateAsset(book.id, entry.assetId, { signal: controller.signal })
        const chapter = JSON.parse(await blob.text()) as BookChapter
        for (const block of chapter.blocks || []) {
          const text = [block.text, ...(block.items || []), ...(block.rows || []).flat()].filter(Boolean).join(' ')
          const position = text.toLocaleLowerCase().indexOf(term)
          if (position >= 0 && found.length < 100) found.push({ index, anchor: block.id, title: entry.title, text: `${position > 55 ? '…' : ''}${text.slice(Math.max(0, position - 55), position + 180)}${text.length > position + 180 ? '…' : ''}` })
        }
      }
    }
    try {
      if (book.renderer === 'pdf') {
        const result = await searchPdf(term, controller.signal)
        if (!controller.signal.aborted) { setResults(result.results); setStatus(result.hasText ? 'done' : 'no-text') }
        return
      }
      if (book.searchAssetId) {
        const blob = await fetchPrivateAsset(book.id, book.searchAssetId, { signal: controller.signal })
        const searchIndex = JSON.parse(await blob.text()) as { chapters: Array<{ id: string; title: string; blocks: Array<{ id: string; text: string }> }> }
        for (const chapter of searchIndex.chapters || []) {
          const index = book.contents.findIndex(entry => entry.id === chapter.id)
          if (index < 0) continue
          for (const block of chapter.blocks || []) {
            const position = block.text.toLocaleLowerCase().indexOf(term)
            if (position >= 0 && found.length < 100) found.push({ index, anchor: block.id, title: chapter.title, text: `${position > 55 ? '…' : ''}${block.text.slice(Math.max(0, position - 55), position + 180)}${block.text.length > position + 180 ? '…' : ''}` })
          }
        }
      } else await Promise.all([worker(), worker()])
      if (!controller.signal.aborted) { setResults(found.sort((a, b) => a.index - b.index)); setStatus('done') }
    }
    catch { if (!controller.signal.aborted) setStatus('error') }
  }
  return <><h2>Find in this book</h2><form className="private-reader-search" onSubmit={search}><label className="sr-only" htmlFor="private-reader-search">Search words</label><input ref={element => { inputRef.current = element }} id="private-reader-search" type="search" minLength={2} value={query} onChange={event => setQuery(event.target.value)} placeholder="A word or phrase…" required /><button type="submit" className="private-book-button">Find</button></form>
    <p role="status">{status === 'searching' ? 'Searching this book…' : status === 'error' ? 'Search could not finish. Check your connection and try again.' : status === 'no-text' ? 'This edition contains scanned pages without searchable text. Use page navigation to explore it.' : status === 'done' ? `${results.length}${results.length >= 100 ? '+' : ''} matching passages` : 'Search runs when you choose Find.'}</p>
    <ol className="private-reader-search-results">{results.map((result, resultIndex) => <li key={`${result.index}-${result.anchor}-${resultIndex}`}><button aria-label={`${result.title}: ${result.text}`} onClick={() => onOpen(result.index, result.anchor)}><strong>{result.title}</strong><span>{result.text}</span></button></li>)}</ol>
  </>
}

function PdfPage({ bookId, assetId, index, zoom, onReady, onPageCount, onSearchReady }: { bookId: string; assetId: string; index: number; zoom: number; onReady: () => void; onPageCount: (count: number) => void; onSearchReady: (search: PdfSearch | null) => void }) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState(false)
  const [width, setWidth] = useState(700)
  const [textAvailable, setTextAvailable] = useState<boolean | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [renderedKey, setRenderedKey] = useState<string | null>(null)
  const renderKey = `${attempt}:${index}:${zoom}:${width}`
  const busy = !document || renderedKey !== renderKey
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const measure = () => { if (host.clientWidth) setWidth(host.clientWidth) }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(host)
    return () => observer?.disconnect()
  }, [])
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    let destroy: (() => void) | undefined
    let stage = 'head-and-engine'
    void (async () => {
      const [pdfjs, worker, info] = await Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'), import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'), getPrivateAssetInfo(bookId, assetId, controller.signal)])
      if (!active) return
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default
      const initialLength = Math.min(info.size, 65_536)
      stage = 'initial-range'
      const initial = new Uint8Array(await fetchPrivateAssetRange(bookId, assetId, 0, initialLength, controller.signal))
      if (!active) return
      const range = new pdfjs.PDFDataRangeTransport(info.size, initial)
      const loadRange = createPrivatePdfRangeLoader(info.size, controller.signal, (begin, end, signal) => fetchPrivateAssetRange(bookId, assetId, begin, end, signal))
      range.requestDataRange = (begin: number, end: number) => {
        void loadRange(begin, end).then(data => { if (active) range.onDataRange(begin, data) }).catch(error => { if (active) { reportPdfFailure('range-fetch', error); setError(true); controller.abort() } })
      }
      range.abort = () => controller.abort()
      const assetsRoot = new URL(`${import.meta.env.BASE_URL}vendor/pdfjs/`, window.location.href).href
      stage = 'pdf-open'
      const task = pdfjs.getDocument({
        range, disableAutoFetch: true, disableStream: true, rangeChunkSize: 262_144,
        useSystemFonts: true, useWasm: false, wasmUrl: assetsRoot,
        cMapUrl: `${assetsRoot}cmaps/`, cMapPacked: true,
        standardFontDataUrl: `${assetsRoot}standard_fonts/`,
      })
      destroy = () => { void task.destroy() }
      const pdf = await task.promise
      if (!active) { void task.destroy(); return }
      setDocument(pdf); onPageCount(pdf.numPages)
    })().catch(error => { if (active) { reportPdfFailure(stage, error); setError(true) } })
    return () => { active = false; controller.abort(); destroy?.() }
  }, [bookId, assetId, onPageCount, attempt])
  useEffect(() => {
    if (!document) return
    onSearchReady(async (term, signal) => {
      const results: SearchResult[] = []
      let hasText = false
      for (let pageNumber = 1; pageNumber <= document.numPages && results.length < 100; pageNumber += 1) {
        if (signal.aborted) throw new DOMException('Search cancelled', 'AbortError')
        const page = await document.getPage(pageNumber)
        const content = await page.getTextContent()
        if (signal.aborted) throw new DOMException('Search cancelled', 'AbortError')
        const text = content.items.map(item => 'str' in item ? item.str : '').join(' ')
        if (text.trim()) hasText = true
        const position = text.toLocaleLowerCase().indexOf(term)
        if (position >= 0) results.push({ index: pageNumber - 1, anchor: '', title: `Page ${pageNumber}`, text: `${position > 55 ? '…' : ''}${text.slice(Math.max(0, position - 55), position + 180)}${text.length > position + 180 ? '…' : ''}` })
      }
      return { results, hasText }
    })
    return () => onSearchReady(null)
  }, [document, onSearchReady])
  useEffect(() => {
    if (!document) return
    let active = true
    let cancel: (() => void) | undefined
    void (async () => {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
      const page = await document.getPage(Math.min(document.numPages, index + 1))
      if (!active || !canvasRef.current || !textLayerRef.current) return
      const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width * zoom })
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas unavailable')
      const ratio = privatePdfCanvasRatio(viewport.width, viewport.height, window.devicePixelRatio)
      canvas.width = Math.max(1, Math.floor(viewport.width * ratio)); canvas.height = Math.max(1, Math.floor(viewport.height * ratio))
      canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`
      const task = page.render({ canvas, canvasContext: context, viewport, transform: [ratio, 0, 0, ratio, 0, 0] })
      cancel = () => task.cancel()
      await task.promise
      if (!active) return
      const text = await page.getTextContent()
      if (!active) return
      const layer = textLayerRef.current
      layer.replaceChildren()
      layer.style.width = `${viewport.width}px`; layer.style.height = `${viewport.height}px`
      layer.style.setProperty('--total-scale-factor', String(viewport.scale))
      const textLayer = new pdfjs.TextLayer({ textContentSource: text, container: layer, viewport })
      cancel = () => textLayer.cancel()
      await textLayer.render()
      if (!active) return
      setTextAvailable(text.items.length > 0); setRenderedKey(renderKey); setError(false); onReady()
    })().catch(error => { if (active && error?.name !== 'RenderingCancelledException') { reportPdfFailure('page-render', error); setError(true) } })
    return () => { active = false; cancel?.() }
  }, [document, index, width, zoom, onReady, renderKey])
  return <div ref={hostRef} className="private-reader-pdf" aria-busy={busy || undefined}>
    {error ? <div role="alert" className="private-reader-resource-error"><p>This page could not be loaded.</p><button className="private-book-button" onClick={() => { setError(false); setDocument(null); setAttempt(value => value + 1) }}>Retry page</button></div> : busy ? <p className="private-reader-pdf__loading" role="status">{document ? `Loading page ${index + 1}…` : 'Opening original pages…'}</p> : null}
    <div className="private-reader-pdf__viewport" style={{ visibility: busy || error ? 'hidden' : 'visible' }} aria-hidden={busy || error}><canvas ref={canvasRef} role="img" aria-label={`Page ${index + 1}`} /><div ref={textLayerRef} className="private-pdf-text-layer" /></div>
    {!busy && !error && textAvailable === false ? <span className="sr-only">This page is a scan without selectable text.</span> : null}
  </div>
}
