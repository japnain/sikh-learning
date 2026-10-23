import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import type { ScriptureEntry, ScriptureLine, Word } from '../types'
import { addAppScrollSettledListener, getAppScrollTop, getAppViewportBounds, scrollAppTo } from '../utils/appScroll'
import { getReaderViewportTop } from '../utils/readerAnchor'

export interface ReaderWordContext {
  word: Word
  line: ScriptureLine
  entry: ScriptureEntry
}

export function hasReaderSelection() {
  const selection = window.getSelection()
  return Boolean(selection && !selection.isCollapsed && selection.toString().trim())
}

function isWithinReaderDock(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('.reader-dock:not([hidden])'))
}

function hasReaderDockFocus() {
  return isWithinReaderDock(document.activeElement)
}

function needsReaderDock() {
  // Do not remove a focused dock merely because the top actions came back.
  if (hasReaderDockFocus()) return true
  const toolbar = document.querySelector<HTMLElement>('.study-reader-topbar')
  const toolbarStyle = toolbar ? getComputedStyle(toolbar) : null
  // A usable fixed desktop header already exposes the same controls. Touch
  // headers scroll with the document; measure both rather than duplicating a
  // reachable toolbar merely because the reading is deep.
  if (!toolbar || !toolbarStyle || !['absolute', 'fixed', 'sticky'].includes(toolbarStyle.position)) return getAppScrollTop() > 120

  const back = toolbar.querySelector<HTMLElement>('[data-reader-back]')
  const appearance = toolbar.querySelector<HTMLElement>('[data-ai-action="open-reader-settings"]')
  if (!back || !appearance) return getAppScrollTop() > 120

  const viewport = getAppViewportBounds()
  // The header's computed padding resolves env(safe-area-inset-top) to CSS pixels.
  const safeTop = viewport.top + (parseFloat(toolbarStyle.paddingTop) || 0)
  return [back, appearance].some(control => {
    const rect = control.getBoundingClientRect()
    const availableHeight = Math.min(rect.bottom, viewport.bottom) - Math.max(rect.top, safeTop)
    return availableHeight < 43.9
  })
}

/** Controls never own scripture scrolling or intercept the native selection gesture. */
export function useReaderInteraction(routeIdentity: string, blocked: boolean) {
  const [currentRoute, setCurrentRoute] = useState(routeIdentity)
  const [visible, setVisible] = useState(true)
  const [deep, setDeep] = useState(needsReaderDock)
  const [word, setWord] = useState<ReaderWordContext | null>(null)
  const [selectionActive, setSelectionActive] = useState(false)
  const [focusWithinDock, setFocusWithinDock] = useState(false)
  const gesture = useRef<{ x: number; y: number; at: number; top: number } | null>(null)
  const readingIntent = useRef(false)
  const wordTarget = useRef<HTMLElement | null>(null)
  const blockedRef = useRef(blocked)
  useEffect(() => { blockedRef.current = blocked }, [blocked])

  // Recheck after mounted content, font/settings changes, or a route replaces its header.
  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => { setDeep(needsReaderDock()) })
    return () => window.cancelAnimationFrame(frame)
  })

  if (currentRoute !== routeIdentity) {
    setCurrentRoute(routeIdentity)
    setVisible(true)
    setWord(null)
    setSelectionActive(false)
    setDeep(needsReaderDock())
  }

  useLayoutEffect(() => {
    if (!word) return
    const target = wordTarget.current
    const dock = document.querySelector<HTMLElement>('.reader-dock:not([hidden])')
    if (!target?.isConnected || !dock || hasReaderSelection()) return
    const rect = target.getBoundingClientRect()
    const overlap = rect.bottom - dock.getBoundingClientRect().top + 16
    const clearance = Math.max(0, rect.top - getReaderViewportTop())
    if (overlap > 0 && clearance > 0) scrollAppTo({ top: getAppScrollTop() + Math.min(overlap, clearance), behavior: 'auto' })
  }, [word])

  useEffect(() => {
    gesture.current = null
    readingIntent.current = false
    let lastTop = getAppScrollTop()
    const removeScroll = addAppScrollSettledListener(() => {
      const top = getAppScrollTop()
      setDeep(needsReaderDock())
      if (readingIntent.current && !blockedRef.current && !hasReaderSelection() && !hasReaderDockFocus() && Math.abs(top - lastTop) > 32) {
        setVisible(false)
        setWord(null)
      }
      lastTop = top
      readingIntent.current = false
    })
    const noteReadingIntent = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null
      if (blockedRef.current || target?.closest('button,a,input,select,textarea,[role="dialog"],.reader-dock')) return
      if (event instanceof KeyboardEvent && !['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) return
      readingIntent.current = true
    }
    const selectionChanged = () => {
      const active = hasReaderSelection()
      setSelectionActive(active)
      if (active && !blockedRef.current && !hasReaderDockFocus()) setWord(null)
    }
    const focusEntered = (event: FocusEvent) => { setFocusWithinDock(isWithinReaderDock(event.target)) }
    const focusLeft = (event: FocusEvent) => { setFocusWithinDock(isWithinReaderDock(event.relatedTarget)) }
    let viewportFrame: number | null = null
    const refreshViewport = () => {
      if (viewportFrame !== null) window.cancelAnimationFrame(viewportFrame)
      viewportFrame = window.requestAnimationFrame(() => {
        viewportFrame = null
        setDeep(needsReaderDock())
      })
    }
    document.addEventListener('selectionchange', selectionChanged)
    document.addEventListener('focusin', focusEntered)
    document.addEventListener('focusout', focusLeft)
    window.addEventListener('resize', refreshViewport)
    window.addEventListener('orientationchange', refreshViewport)
    window.addEventListener('pageshow', refreshViewport)
    window.visualViewport?.addEventListener('resize', refreshViewport)
    window.visualViewport?.addEventListener('scroll', refreshViewport)
    const intentEvents = ['wheel', 'touchmove', 'keydown'] as const
    intentEvents.forEach(type => document.addEventListener(type, noteReadingIntent, { passive: true }))
    return () => {
      removeScroll()
      if (viewportFrame !== null) window.cancelAnimationFrame(viewportFrame)
      document.removeEventListener('selectionchange', selectionChanged)
      document.removeEventListener('focusin', focusEntered)
      document.removeEventListener('focusout', focusLeft)
      window.removeEventListener('resize', refreshViewport)
      window.removeEventListener('orientationchange', refreshViewport)
      window.removeEventListener('pageshow', refreshViewport)
      window.visualViewport?.removeEventListener('resize', refreshViewport)
      window.visualViewport?.removeEventListener('scroll', refreshViewport)
      intentEvents.forEach(type => document.removeEventListener(type, noteReadingIntent))
    }
  }, [routeIdentity])

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    gesture.current = { x: event.clientX, y: event.clientY, at: Date.now(), top: getAppScrollTop() }
  }
  const canTap = (event: MouseEvent<HTMLElement>) => {
    if (blockedRef.current || hasReaderSelection()) return false
    const start = gesture.current
    return !start || event.detail === 0 || (Date.now() - start.at < 450
      && Math.abs(start.x - event.clientX) < 10
      && Math.abs(start.y - event.clientY) < 10
      && Math.abs(start.top - getAppScrollTop()) < 10)
  }
  const reveal = () => { readingIntent.current = false; setDeep(needsReaderDock()); setVisible(true); setWord(null) }
  const hide = () => { readingIntent.current = false; setVisible(false); setWord(null) }
  const onContentClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('button,a,input,select,textarea,summary,[role="dialog"],[role="toolbar"],[data-reader-interactive]')) return
    if (!canTap(event)) return
    if (visible) hide()
    else reveal()
  }
  const previewWord = (context: ReaderWordContext, event: MouseEvent<HTMLElement>) => {
    if (!canTap(event)) return
    readingIntent.current = false
    wordTarget.current = event.currentTarget
    setVisible(true)
    setWord(context)
  }

  return { visible: visible && (!selectionActive || focusWithinDock), selectionActive, deep: deep || focusWithinDock, word, onPointerDown, onContentClick, previewWord, reveal, hide, clearWord: () => { readingIntent.current = false; setWord(null) } }
}
