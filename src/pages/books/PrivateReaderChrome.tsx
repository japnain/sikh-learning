import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import ModalSheet from '../../components/ModalSheet'
import { IconArrowLeft, IconArrowRight, IconBookmark, IconBookmarkFilled, IconCheck, IconChevronUp, IconClose, IconLibrary, IconMoreHorizontal, IconSearch } from '../../components/icons'
import './private-reader-chrome.css'

export interface PrivateReaderChromeProps {
  title: string
  subtitle: string
  hidden: boolean
  onToggle: () => void
  onReveal: () => void
  backHref: string
  backState?: unknown
  onBack?: () => void
  bookmarked: boolean
  onBookmark: () => void
  onContents: () => void
  onAppearance: () => void
  onSearch: () => void
  onBookmarks: () => void
  onAnnotations?: () => void
  searchEnabled: boolean
  saving: 'saved' | 'saving' | 'error'
  onRetry: () => void
  locationUnit: 'page' | 'section'
  page: number
  count: number
  chapterLabel: string
  bookProgress: number
  canPrevious: boolean
  canNext: boolean
  onPrevious: () => void
  onNext: () => void
  onSeek: (page: number) => void
  finished: boolean
  onFinish: () => void
  palette?: 'paper' | 'sepia' | 'night'
}

function pageNumber(value: number, count: number) {
  return Number.isFinite(value) ? Math.max(1, Math.min(count, Math.round(value))) : 1
}

export default function PrivateReaderChrome({ title, subtitle, hidden, onToggle, onReveal, backHref, backState, onBack,
  bookmarked, onBookmark, onContents, onAppearance, onSearch, onBookmarks, onAnnotations, searchEnabled,
  saving, onRetry, locationUnit, page, count, chapterLabel, bookProgress, canPrevious, canNext, onPrevious, onNext, onSeek,
  finished, onFinish, palette = 'paper' }: PrivateReaderChromeProps) {
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [previewPage, setPreviewPage] = useState<number | null>(null)
  const headerRef = useRef<HTMLElement>(null)
  const footerRef = useRef<HTMLElement>(null)
  const optionsRef = useRef<HTMLButtonElement>(null)
  const revealRef = useRef<HTMLButtonElement>(null)
  const firstOptionRef = useRef<HTMLElement | null>(null)
  const wasHidden = useRef(hidden)
  const dragging = useRef(false)
  const pendingSeek = useRef<number | null>(null)
  const actionFrames = useRef<number[]>([])
  const sliderId = useId()
  const safeCount = Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1
  const currentPage = pageNumber(page, safeCount)
  const displayedPage = previewPage === null ? currentPage : pageNumber(previewPage, safeCount)
  const fraction = Number.isFinite(bookProgress) ? Math.max(0, Math.min(1, bookProgress)) : 0
  const progressText = fraction > 0 && fraction < .01 ? '<1%' : `${Math.round(fraction * 100)}%`
  const locationLabel = locationUnit === 'section' ? 'Section' : 'Page'
  const pageText = `${locationLabel} ${displayedPage} of ${safeCount}`

  useLayoutEffect(() => {
    const header = headerRef.current
    const footer = footerRef.current
    const reader = header?.closest<HTMLElement>('.private-reader')
    if (!header || !footer || !reader) return
    const measure = () => {
      // Transforms hide the chrome without changing its measured reservation.
      // Text-size changes and safe areas still resize the reading viewport.
      header.dataset.enlargedText = String(Number.parseFloat(getComputedStyle(document.documentElement).fontSize) >= 24)
      if (header.offsetHeight > 0) {
        reader.style.setProperty('--private-chrome-top', `${header.offsetHeight}px`)
        reader.style.setProperty('--reader-header-height', `${header.offsetHeight}px`)
      }
      if (footer.offsetHeight > 0) reader.style.setProperty('--private-chrome-bottom', `${footer.offsetHeight}px`)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(header)
    observer.observe(footer)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const active = document.activeElement
    if (hidden && !wasHidden.current && (headerRef.current?.contains(active) || footerRef.current?.contains(active))) {
      revealRef.current?.focus({ preventScroll: true })
    }
    wasHidden.current = hidden
  }, [hidden])

  useEffect(() => () => { actionFrames.current.forEach(cancelAnimationFrame) }, [])

  const openTool = (action: () => void) => {
    setOptionsOpen(false)
    // Return focus and release the first sheet before opening another one.
    // Its opener then remains the persistent Reading options button.
    actionFrames.current.forEach(cancelAnimationFrame)
    actionFrames.current = [requestAnimationFrame(() => {
      actionFrames.current.push(requestAnimationFrame(() => {
        optionsRef.current?.focus({ preventScroll: true })
        action()
      }))
    })]
  }

  const commitSeek = () => {
    dragging.current = false
    const next = pendingSeek.current === null ? null : pageNumber(pendingSeek.current, safeCount)
    pendingSeek.current = null
    setPreviewPage(null)
    if (next !== null && next !== currentPage) onSeek(next)
  }

  const revealControls = () => {
    onReveal()
    requestAnimationFrame(() => optionsRef.current?.focus({ preventScroll: true }))
  }

  return <>
    <header ref={headerRef} className="private-reader-chrome__header" data-hidden={hidden || undefined} inert={hidden || undefined} aria-hidden={hidden || undefined}>
      <Link className="private-reader-chrome__button" to={backHref} state={backState} onClick={onBack} aria-label="Back to book details"><IconArrowLeft size={21} /></Link>
      <div className="private-reader-chrome__identity">
        <h1 title={title}>{title}</h1>
        <span className="sr-only">{subtitle}</span>
      </div>
      <div className="private-reader-chrome__actions">
        <button type="button" className="private-reader-chrome__button" aria-label={bookmarked ? 'Remove bookmark at this position' : 'Bookmark this position'} aria-pressed={bookmarked} onClick={onBookmark}>{bookmarked ? <IconBookmarkFilled size={19} /> : <IconBookmark size={19} />}</button>
        <button ref={optionsRef} type="button" className="private-reader-chrome__button" aria-label="Reading options" aria-haspopup="dialog" aria-expanded={optionsOpen} onClick={() => setOptionsOpen(true)}><IconMoreHorizontal size={23} /></button>
      </div>
    </header>

    <footer ref={footerRef} className="private-reader-chrome__footer" data-hidden={hidden || undefined} inert={hidden || undefined} aria-hidden={hidden || undefined}>
      <div className="private-reader-chrome__footer-inner">
        <div className="private-reader-chrome__location">
          <button type="button" onClick={onContents} aria-label={`Open contents: ${chapterLabel}`} title={chapterLabel}><span>{chapterLabel}</span><IconChevronUp size={13} /></button>
          <span className="private-reader-chrome__book-progress">{progressText} <span>of book</span></span>
        </div>
        <nav className="private-reader-chrome__navigation" aria-label="Reading navigation">
          <button className="private-reader-chrome__button" type="button" aria-label={`Previous ${locationUnit}`} disabled={!canPrevious} onClick={onPrevious}><IconArrowLeft size={20} /></button>
          <div className="private-reader-chrome__scrubber">
            <label htmlFor={sliderId} className="sr-only">Reading position</label>
            <input id={sliderId} type="range" min={1} max={safeCount} step={1} value={displayedPage} disabled={safeCount <= 1}
              aria-valuetext={`${pageText}, ${chapterLabel}`} style={{ '--private-seek-fill': `${safeCount <= 1 ? 0 : (displayedPage - 1) / (safeCount - 1) * 100}%` } as CSSProperties}
              onPointerDown={event => { dragging.current = true; event.currentTarget.setPointerCapture?.(event.pointerId) }}
              onChange={event => {
                const next = pageNumber(Number(event.target.value), safeCount)
                if (dragging.current) { pendingSeek.current = next; setPreviewPage(next) }
                else if (next !== currentPage) onSeek(next)
              }}
              onPointerUp={commitSeek} onPointerCancel={() => { dragging.current = false; pendingSeek.current = null; setPreviewPage(null) }}
              onLostPointerCapture={commitSeek} onBlur={commitSeek} />
            <span className="private-reader-chrome__page-label" aria-hidden="true">{pageText}</span>
          </div>
          {canNext ? <button className="private-reader-chrome__button" type="button" aria-label={`Next ${locationUnit}`} onClick={onNext}><IconArrowRight size={20} /></button>
            : <button className="private-reader-chrome__button" type="button" aria-label={finished ? 'Mark unfinished' : 'Mark finished'} aria-pressed={finished} onClick={onFinish}><IconCheck size={20} /></button>}
        </nav>
      </div>
    </footer>

    {saving !== 'saved' ? <div className={saving === 'saving' ? 'sr-only' : 'private-reader-chrome__save'} data-hidden-chrome={hidden || undefined} role="status">{saving === 'saving' ? 'Saving your place…' : <button type="button" onClick={onRetry}>Place not saved · Retry</button>}</div> : null}

    {hidden ? <><h1 className="sr-only">{title}</h1><span className="private-reader-chrome__quiet-page" aria-hidden="true">{currentPage}</span><button ref={revealRef} className="private-reader-chrome__reveal private-reader-chrome__button" type="button" aria-label="Show reading controls" onClick={revealControls} onKeyDown={event => { if (event.key === 'Escape' && !event.nativeEvent.isComposing) { event.preventDefault(); event.stopPropagation(); revealControls() } }}><IconMoreHorizontal size={22} /></button></> : null}

    {optionsOpen ? <ModalSheet open onClose={() => setOptionsOpen(false)} title="Reading options" description="Choose a reading tool, adjust the page, or hide the controls." initialFocusRef={firstOptionRef} className={`private-reader-sheet private-reader-options private-reader--${palette}`}>
      <div className="private-reader-options__heading"><h2>Reading options</h2><button type="button" className="private-reader-chrome__button" aria-label="Close reading options" onClick={() => setOptionsOpen(false)}><IconClose size={19} /></button></div>
      <div className="private-reader-options__identity"><strong>{title}</strong><span>{subtitle}</span></div>
      <div className="private-reader-options__tools">
        <button ref={element => { firstOptionRef.current = element }} type="button" onClick={() => openTool(onAppearance)}><span className="private-reader-options__type" aria-hidden="true">Aa</span><span>Reading appearance</span></button>
        <button type="button" onClick={() => openTool(onContents)}><IconLibrary size={19} /><span>Contents</span></button>
        {searchEnabled ? <button type="button" onClick={() => openTool(onSearch)}><IconSearch size={19} /><span>Find in book</span></button> : null}
        <button type="button" onClick={() => openTool(onBookmarks)}><IconBookmark size={19} /><span>Bookmarks</span></button>
        {onAnnotations ? <button type="button" onClick={() => openTool(onAnnotations)}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 4 5 5M4 20l5-1L21 7a2.1 2.1 0 0 0-4-4L5 15l-1 5Z" /></svg><span>Highlights &amp; notes</span></button> : null}
      </div>
      <button type="button" className="private-reader-options__focus" onClick={() => openTool(onToggle)}>Hide reading controls</button>
    </ModalSheet> : null}
  </>
}
