import { useEffect, useRef, useState, type RefObject } from 'react'
import ModalSheet from '../../components/ModalSheet'
import type { PrivateBookAnnotation } from '../../data/privateLibrary'
import { useResolvedEpubPalette } from '../../store/epubReader'
import {
  PRIVATE_ANNOTATION_BUDGET_MESSAGE, PRIVATE_ANNOTATION_COLORS, PRIVATE_ANNOTATION_LIMIT,
  PRIVATE_ANNOTATION_NOTE_LIMIT, canAddPrivateAnnotations, capturePrivateTextSelection,
  createPrivateTextAnnotations, nextPrivateAnnotationTimestamp, privateAnnotationDomRange, privateAnnotationVisibleRects, type PrivateAnnotationColor, type PrivateTextSelection,
} from './privateBookAnnotations'
import './private-book-annotations.css'

interface Props {
  contentRef: RefObject<HTMLElement | null>
  chapterIndex: number
  annotations: PrivateBookAnnotation[]
  /** Return false when the complete reading-state request would exceed its byte budget. */
  onChange: (annotations: PrivateBookAnnotation[]) => boolean | void | Promise<boolean | void>
  onNavigate: (index: number, blockId?: string, charOffset?: number) => void
  disabled?: boolean
  pageMode?: boolean
  pageLabel?: string
  listOpen?: boolean
  onCloseList?: () => void
}
type Draft = { kind: 'text'; index: number; ranges: PrivateTextSelection[] } | { kind: 'page'; index: number; label?: string } | { kind: 'edit'; id: string }
type PaintedRange = { id: string; color: PrivateAnnotationColor; range: Range }
type Rectangle = { id: string; color: PrivateAnnotationColor; left: number; top: number; width: number; height: number }
interface HighlightRegistry { set: (name: string, highlight: unknown) => void; delete: (name: string) => void }
const highlightName = (color: PrivateAnnotationColor) => `naamras-private-${color}`
const excerpt = (value: string) => value.length > 100 ? `${value.slice(0, 100)}…` : value

export default function PrivateReaderNotebook({ contentRef, chapterIndex, annotations, onChange, onNavigate,
  disabled = false, pageMode = false, pageLabel, listOpen = false, onCloseList }: Props) {
  const palette = useResolvedEpubPalette()
  const [selected, setSelected] = useState<{ index: number; ranges: PrivateTextSelection[] }>({ index: chapterIndex, ranges: [] })
  const selection = selected.index === chapterIndex ? selected.ranges : []
  const [draft, setDraft] = useState<Draft | null>(null)
  const [note, setNote] = useState('')
  const [color, setColor] = useState<PrivateAnnotationColor>('yellow')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [rectangles, setRectangles] = useState<Rectangle[]>([])
  const [paintedCount, setPaintedCount] = useState(0)
  const painted = useRef<PaintedRange[]>([])
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const creationRef = useRef<{ key: string; annotations: PrivateBookAnnotation[] } | null>(null)
  const activeAnnotation = draft?.kind === 'edit' ? annotations.find(item => item.id === draft.id) : undefined

  useEffect(() => {
    const root = contentRef.current
    if (!root || disabled || pageMode) return
    let timeout: ReturnType<typeof setTimeout> | undefined
    const capture = () => {
      const result = capturePrivateTextSelection(root, root.ownerDocument.getSelection())
      setSelected({ index: chapterIndex, ranges: result.ranges })
      if (result.error) setError(result.error)
    }
    const changed = () => { clearTimeout(timeout); timeout = setTimeout(capture, 80) }
    root.ownerDocument.addEventListener('selectionchange', changed)
    root.addEventListener('pointerup', changed)
    root.addEventListener('keyup', changed)
    return () => {
      clearTimeout(timeout)
      const selected = root.ownerDocument.getSelection()
      if (selected?.anchorNode && root.contains(selected.anchorNode)) selected.removeAllRanges()
      root.ownerDocument.removeEventListener('selectionchange', changed)
      root.removeEventListener('pointerup', changed)
      root.removeEventListener('keyup', changed)
    }
  }, [contentRef, chapterIndex, disabled, pageMode])

  useEffect(() => {
    const root = contentRef.current
    if (!root) return
    const registry = typeof CSS === 'undefined' ? undefined : (CSS as typeof CSS & { highlights?: HighlightRegistry }).highlights
    const Highlight = (window as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight
    let frame = 0
    const repaint = () => {
      const matches: PaintedRange[] = []
      if (!disabled && !pageMode) for (const annotation of annotations) {
        if (annotation.kind !== 'text' || annotation.index !== chapterIndex) continue
        const range = privateAnnotationDomRange(root, annotation)
        if (range) matches.push({ id: annotation.id, color: annotation.color, range })
      }
      painted.current = matches
      setPaintedCount(matches.length)
      for (const currentColor of PRIVATE_ANNOTATION_COLORS) {
        if (registry && Highlight) registry.set(highlightName(currentColor), new Highlight(...matches.filter(item => item.color === currentColor).map(item => item.range)))
      }
      // Older engines receive a non-interactive visual overlay; source DOM/text stays intact.
      setRectangles(registry && Highlight ? [] : matches.flatMap(item => privateAnnotationVisibleRects(root, item.range).map(rect => ({ id: item.id, color: item.color, ...rect }))))
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(repaint) }
    const observer = new MutationObserver(schedule)
    observer.observe(root, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] })
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
    resize?.observe(root)
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, true)
    schedule()
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); resize?.disconnect()
      window.removeEventListener('resize', schedule); window.removeEventListener('scroll', schedule, true)
      for (const currentColor of PRIVATE_ANNOTATION_COLORS) registry?.delete(highlightName(currentColor))
      painted.current = []
    }
  }, [annotations, chapterIndex, contentRef, disabled, pageMode])

  useEffect(() => {
    const root = contentRef.current
    if (!root || disabled || pageMode) return
    let start: { x: number; y: number; time: number; id: number } | null = null
    const pointers = new Set<number>()
    let consumed = false
    const down = (event: PointerEvent) => {
      pointers.add(event.pointerId)
      if (pointers.size > 1 || event.isPrimary === false) { start = null; return }
      if (event.button === 0) start = { x: event.clientX, y: event.clientY, time: event.timeStamp, id: event.pointerId }
      consumed = false
    }
    const cancel = (event: PointerEvent) => { pointers.delete(event.pointerId); start = null }
    const edit = (event: PointerEvent) => {
      pointers.delete(event.pointerId)
      const initial = start
      start = null
      if (!initial || event.pointerId !== initial.id || event.timeStamp - initial.time > 350
        || Math.hypot(event.clientX - initial.x, event.clientY - initial.y) >= 8) return
      if (event.button !== 0 || !root.ownerDocument.getSelection()?.isCollapsed) return
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('a,button,input,textarea,select')) return
      const match = [...painted.current].reverse().find(item => typeof item.range.getClientRects === 'function'
        && Array.from(item.range.getClientRects()).some(rect => event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom))
      const annotation = match && annotations.find(item => item.id === match.id)
      if (annotation?.kind === 'text') {
        // Let the reader release its pointer bookkeeping, while defaultPrevented blocks page turns.
        event.preventDefault()
        consumed = true
        setNote(annotation.note ?? ''); setColor(annotation.color); setError(''); setDraft({ kind: 'edit', id: annotation.id })
      }
    }
    const click = (event: MouseEvent) => { if (consumed) { event.preventDefault(); event.stopPropagation(); consumed = false } }
    root.addEventListener('pointerdown', down)
    root.addEventListener('pointerup', edit)
    root.addEventListener('pointercancel', cancel)
    root.addEventListener('click', click)
    return () => { root.removeEventListener('pointerdown', down); root.removeEventListener('pointerup', edit); root.removeEventListener('pointercancel', cancel); root.removeEventListener('click', click) }
  }, [annotations, chapterIndex, contentRef, disabled, pageMode])

  const close = () => { if (!pending) { setDraft(null); setError(''); if (!draft) onCloseList?.() } }
  const commit = async (next: PrivateBookAnnotation[]) => {
    if (pending) return false
    if (next.length > PRIVATE_ANNOTATION_LIMIT) { setError(PRIVATE_ANNOTATION_BUDGET_MESSAGE); return false }
    setPending(true)
    const saveError = 'This annotation could not be saved. Check your connection and try again. Your draft is still here.'
    try {
      const result = onChange(next)
      if (await result === false) { setError(result instanceof Promise ? saveError : PRIVATE_ANNOTATION_BUDGET_MESSAGE); return false }
      setError('')
      return true
    } catch { setError(saveError); return false }
    finally { setPending(false) }
  }
  const creation = (key: string, create: () => PrivateBookAnnotation[]) => {
    if (creationRef.current?.key !== key) creationRef.current = { key, annotations: create() }
    return creationRef.current.annotations
  }
  const clearSelection = () => { contentRef.current?.ownerDocument.getSelection()?.removeAllRanges(); setSelected({ index: chapterIndex, ranges: [] }) }
  const highlight = async (nextColor: PrivateAnnotationColor) => {
    const added = creation(JSON.stringify({ selection, chapterIndex, nextColor }), () => createPrivateTextAnnotations(selection, chapterIndex, nextColor))
    if (!canAddPrivateAnnotations(annotations, added)) { setError(PRIVATE_ANNOTATION_BUDGET_MESSAGE); return }
    if (await commit([...annotations, ...added])) { creationRef.current = null; clearSelection() }
  }
  const openEditor = (annotation: PrivateBookAnnotation) => {
    setNote(annotation.note ?? ''); setColor(annotation.kind === 'text' ? annotation.color : 'yellow')
    setError(''); setDraft({ kind: 'edit', id: annotation.id })
  }
  const save = async () => {
    if (!draft || note.length > PRIVATE_ANNOTATION_NOTE_LIMIT) return
    if ((draft.kind === 'page' || activeAnnotation?.kind === 'page') && !note.trim()) { setError('Write a note before saving.'); return }
    const timestamp = nextPrivateAnnotationTimestamp(activeAnnotation?.updatedAt)
    if (draft.kind === 'edit') {
      if (!activeAnnotation) { setError('This annotation is no longer available.'); return }
      const updated = activeAnnotation.kind === 'text' ? { ...activeAnnotation, color, note, updatedAt: timestamp } : { ...activeAnnotation, note, updatedAt: timestamp }
      if (await commit(annotations.map(item => item.id === updated.id ? updated : item))) setDraft(null)
    } else {
      const added = creation(JSON.stringify({ draft, color, note }), () => draft.kind === 'text' ? createPrivateTextAnnotations(draft.ranges, draft.index, color, note)
        : [{ id: crypto.randomUUID(), kind: 'page', index: draft.index, note, createdAt: timestamp, updatedAt: timestamp }])
      if (!canAddPrivateAnnotations(annotations, added)) { setError(PRIVATE_ANNOTATION_BUDGET_MESSAGE); return }
      if (await commit([...annotations, ...added])) { creationRef.current = null; setDraft(null); clearSelection() }
    }
  }
  const remove = async (annotation: PrivateBookAnnotation) => {
    if (await commit(annotations.filter(item => item.id !== annotation.id))) setDraft(null)
  }
  const selectionQuote = selection.map(item => item.quote).join(' ')
  const draftQuote = draft?.kind === 'text' ? draft.ranges.map(item => item.quote).join(' ') : activeAnnotation?.kind === 'text' ? activeAnnotation.quote : ''
  const modalOpen = !disabled && (listOpen || Boolean(draft))
  const modalTitle = !draft ? 'Highlights and notes' : draft.kind === 'text' ? 'Add note' : draft.kind === 'page' || activeAnnotation?.kind === 'page' ? 'Page note' : 'Edit highlight'

  return <>
    <span className="sr-only" data-private-annotation-count={paintedCount}>{paintedCount ? `${paintedCount} highlighted passages in this section.` : ''}</span>
    <div className="private-annotation-overlay" aria-hidden="true">{rectangles.map((rect, i) => <span key={`${rect.id}-${i}`} data-private-annotation-id={rect.id} className={`private-annotation-rect private-annotation-color--${rect.color}`} style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }} />)}</div>
    {!disabled && !pageMode && selection.length > 0 && !modalOpen ? <aside className="private-annotation-selection" aria-label="Selected passage" aria-busy={pending || undefined}>
      <p>{excerpt(selectionQuote)}</p><div role="toolbar" aria-label="Selected passage">
        {PRIVATE_ANNOTATION_COLORS.map(item => <button key={item} type="button" disabled={pending} className={`private-annotation-swatch private-annotation-color--${item}`} aria-label={`Highlight ${item}`} onPointerDown={event => event.preventDefault()} onClick={() => { void highlight(item) }} />)}
        <button type="button" disabled={pending} onPointerDown={event => event.preventDefault()} onClick={() => { setNote(''); setColor('yellow'); setError(''); setDraft({ kind: 'text', index: chapterIndex, ranges: selection }) }}>Add note</button>
        <button type="button" disabled={pending} aria-label="Dismiss selection" onClick={clearSelection}>×</button>
      </div>{error ? <p role="alert">{error}</p> : null}
    </aside> : null}
    {modalOpen ? <ModalSheet open onClose={close} title={modalTitle} description="Highlights and notes are saved privately with this edition of your book." initialFocusRef={draft ? noteRef : undefined} className={`private-reader-sheet private-annotations-sheet private-reader--${palette}`}>
      <section className="private-annotations-panel" aria-busy={pending || undefined}>
        <header><h2>{modalTitle}</h2><button type="button" disabled={pending} className="private-annotation-close" aria-label={draft && listOpen ? 'Back to highlights and notes' : 'Close highlights and notes'} onClick={close}>{draft && listOpen ? 'Back' : '×'}</button></header>
        {draft ? <form onSubmit={event => { event.preventDefault(); void save() }}><fieldset disabled={pending}>
          {draftQuote ? <blockquote>{draftQuote}</blockquote> : <p>{draft.kind === 'page' ? draft.label ?? `Page ${draft.index + 1}` : `Page ${(activeAnnotation?.index ?? chapterIndex) + 1}`}</p>}
          {draftQuote ? <div className="private-annotation-colors" role="group" aria-label="Highlight color">{PRIVATE_ANNOTATION_COLORS.map(item => <button key={item} type="button" aria-pressed={color === item} aria-label={`Highlight ${item}`} className={`private-annotation-swatch private-annotation-color--${item}`} onClick={() => setColor(item)} />)}</div> : null}
          <label className="private-annotation-note-label">Your note<textarea ref={noteRef} value={note} maxLength={PRIVATE_ANNOTATION_NOTE_LIMIT} rows={5} placeholder="A thought to return to…" onChange={event => setNote(event.target.value)} /></label>
          <p className="private-annotation-caption">{note.length} / {PRIVATE_ANNOTATION_NOTE_LIMIT} · Saved privately with this book.</p>
          <div className="private-annotation-actions"><button type="submit" className="private-book-button private-book-button--primary">{pending ? 'Saving…' : 'Save note'}</button>{activeAnnotation ? <button type="button" className="private-annotation-remove" onClick={() => { void remove(activeAnnotation) }}>{activeAnnotation.kind === 'text' ? 'Remove highlight' : 'Remove note'}</button> : <button type="button" className="private-book-button" onClick={close}>Cancel</button>}</div>
        </fieldset></form> : <>
          <p className="private-annotation-caption">{pageMode ? 'Original pages support page notes and bookmarks. Text highlights are available in text editions.' : 'Select a passage to highlight it or add a note.'}</p>
          {pageMode ? <button type="button" disabled={pending} className="private-book-button" onClick={() => { setNote(''); setError(''); setDraft({ kind: 'page', index: chapterIndex, label: pageLabel }) }}>Add page note</button> : null}
          {annotations.length ? <ol className="private-annotations-list">{[...annotations].sort((a, b) => a.index - b.index || (a.kind === 'text' ? a.start : 0) - (b.kind === 'text' ? b.start : 0)).map(annotation => <li key={annotation.id} className={annotation.kind === 'text' ? `private-annotation-color--${annotation.color}` : undefined}>
            <p className="private-annotation-location">{annotation.kind === 'page' ? 'Page' : 'Section'} {annotation.index + 1}</p>
            {annotation.kind === 'text' ? <blockquote>{annotation.quote}</blockquote> : null}
            {annotation.note ? <p className="private-annotation-note">{annotation.note}</p> : null}
            <div className="private-annotation-list-actions"><button type="button" disabled={pending} aria-label={`Go to ${annotation.kind === 'text' ? `passage: ${excerpt(annotation.quote)}` : `page ${annotation.index + 1}`}`} onClick={() => { onCloseList?.(); onNavigate(annotation.index, annotation.kind === 'text' ? annotation.blockId : undefined, annotation.kind === 'text' ? annotation.start : undefined) }}>Go to {annotation.kind === 'text' ? 'passage' : 'page'}</button><button type="button" disabled={pending} aria-label={`Edit note: ${annotation.kind === 'text' ? excerpt(annotation.quote) : `Page ${annotation.index + 1}`}`} onClick={() => openEditor(annotation)}>Edit note</button><button type="button" disabled={pending} aria-label={`${annotation.kind === 'text' ? 'Remove highlight' : 'Remove note'}: ${annotation.kind === 'text' ? excerpt(annotation.quote) : `Page ${annotation.index + 1}`}`} onClick={() => { void remove(annotation) }}>Remove</button></div>
          </li>)}</ol> : <p className="private-annotations-empty">Your saved passages and thoughts will appear here.</p>}
        </>}
        {error ? <p role="alert" className="private-annotation-error">{error}</p> : null}
      </section>
    </ModalSheet> : null}
  </>
}
