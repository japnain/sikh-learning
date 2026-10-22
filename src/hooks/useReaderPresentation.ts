import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLanguageStore } from '../store/language'
import { captureReaderAnchor, getReaderViewportTop, isReaderScrollUnmovedOrClamped, restoreReaderAnchor, type ReaderAnchor } from '../utils/readerAnchor'
import { addAppScrollListener, addAppScrollSettledListener, getAppScrollTop, getAppViewportBounds } from '../utils/appScroll'
import {
  getSavedReaderPresentation,
  READER_PRESENTATION_CHANGED_EVENT,
  setReaderPresentationPreference,
  type ReaderPresentation,
} from '../utils/readerPresentation'

export type { ReaderPresentation } from '../utils/readerPresentation'

function getLayoutViewportWidth() {
  // A scrollbar appearing as content loads changes clientWidth, but does not
  // mean the viewport changed or supersede an incoming reading destination.
  return typeof window === 'undefined' ? 0 : window.innerWidth || document.documentElement.clientWidth
}

export function useReaderPresentation(routeIdentity: string, sheetOpen: boolean, contentRevision?: unknown) {
  const [presentation, setPresentation] = useState<ReaderPresentation>(() => {
    const saved = getSavedReaderPresentation()
    if (saved) return saved
    const preferences = useLanguageStore.getState()
    return preferences.meaningLanguage !== 'none' || preferences.showTransliteration ? 'study' : 'read'
  })
  const anchor = useRef<ReaderAnchor | null>(null)
  const viewportAnchor = useRef<ReaderAnchor | null>(null)
  const viewportWidth = useRef(0)
  const restoringWidth = useRef(false)
  const restorationGeneration = useRef(0)
  const delayedCaptureFrame = useRef<number | null>(null)
  const sheetIsOpen = useRef(sheetOpen)
  const [viewportRevision, setViewportRevision] = useState(0)
  const language = useLanguageStore()

  useLayoutEffect(() => { sheetIsOpen.current = sheetOpen }, [sheetOpen])

  useLayoutEffect(() => {
    anchor.current = null
    viewportAnchor.current = null
    viewportWidth.current = getLayoutViewportWidth()
    restoringWidth.current = false
    restorationGeneration.current += 1
    return () => {
      restorationGeneration.current += 1
      if (delayedCaptureFrame.current !== null) cancelAnimationFrame(delayedCaptureFrame.current)
      delayedCaptureFrame.current = null
    }
  }, [routeIdentity])

  useEffect(() => {
    let frame: number | null = null
    let lastCaptureAt = -Infinity
    const recordPlace = () => {
      // A resize can dispatch scroll before resize. Never replace the old
      // semantic place with geometry that already belongs to the new width.
      if (sheetIsOpen.current || restoringWidth.current || delayedCaptureFrame.current !== null || getLayoutViewportWidth() !== viewportWidth.current) return
      const captured = captureReaderAnchor()
      if (captured) viewportAnchor.current = captured
      lastCaptureAt = performance.now()
    }
    const recordScroll = () => {
      if (frame !== null || performance.now() - lastCaptureAt < 100) return
      frame = requestAnimationFrame(() => { frame = null; recordPlace() })
    }
    const resize = () => {
      const nextWidth = getLayoutViewportWidth()
      if (!nextWidth || nextWidth === viewportWidth.current) return
      const saved = anchor.current ?? viewportAnchor.current
      viewportWidth.current = nextWidth
      if (!saved) { recordPlace(); return }
      const top = getReaderViewportTop()
      const bottom = Math.max(top, getAppViewportBounds().bottom - 44)
      anchor.current = { ...saved, viewportTop: Math.max(top, Math.min(saved.viewportTop, bottom)) }
      restoringWidth.current = true
      setViewportRevision(revision => revision + 1)
    }
    const removeSettled = addAppScrollSettledListener(recordPlace)
    const removeScroll = addAppScrollListener(recordScroll)
    window.addEventListener('resize', resize)
    window.visualViewport?.addEventListener('resize', resize)
    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      removeSettled()
      removeScroll()
      window.removeEventListener('resize', resize)
      window.visualViewport?.removeEventListener('resize', resize)
    }
  }, [routeIdentity])

  useEffect(() => {
    const updatePresentation = (event: Event) => {
      const next = (event as CustomEvent<ReaderPresentation>).detail
      if (next !== 'read' && next !== 'study') return
      if (!anchor.current) anchor.current = captureReaderAnchor()
      setPresentation(next)
    }
    window.addEventListener(READER_PRESENTATION_CHANGED_EVENT, updatePresentation)
    return () => window.removeEventListener(READER_PRESENTATION_CHANGED_EVENT, updatePresentation)
  }, [])

  useEffect(() => useLanguageStore.subscribe(() => {
    // Capture before React commits changed typography. While a sheet is open,
    // retain the original anchor until its scroll lock has been released.
    if (!anchor.current) anchor.current = captureReaderAnchor()
  }), [])

  useLayoutEffect(() => {
    if (sheetOpen || !anchor.current) return
    const saved = anchor.current
    const generation = ++restorationGeneration.current
    let cancelled = false
    let innerFrame: number | null = null
    let fontFrame: number | null = null
    const isCurrent = () => !cancelled && generation === restorationGeneration.current
    const finishSettlement = () => {
      if (!isCurrent()) return
      restoringWidth.current = false
      viewportAnchor.current = captureReaderAnchor() ?? saved
    }
    const cancelSettlement = () => {
      cancelled = true
      restoringWidth.current = false
    }
    const intentEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
    intentEvents.forEach(type => document.addEventListener(type, cancelSettlement, { capture: true, passive: true }))
    restoreReaderAnchor(saved)
    let settledScrollTop = getAppScrollTop()
    // Read this after mounted text has forced layout: a newly revealed support
    // layer can request a font that was not needed in Read.
    const fontsReady = document.fonts?.ready
    const frame = requestAnimationFrame(() => {
      // ModalSheet releases its scroll lock on the preceding frame.
      innerFrame = requestAnimationFrame(() => {
        if (!isCurrent()) return
        restoreReaderAnchor(saved)
        settledScrollTop = getAppScrollTop()
        if (fontsReady) void fontsReady.then(() => {
          if (!isCurrent()) return
          fontFrame = requestAnimationFrame(() => {
            if (isCurrent() && isReaderScrollUnmovedOrClamped(settledScrollTop)) restoreReaderAnchor(saved)
            finishSettlement()
          })
        }).catch(finishSettlement)
        else finishSettlement()
      })
    })
    anchor.current = null
    return () => {
      // Opening another sheet can interrupt the two-frame settlement. Retain
      // that pending semantic place for its eventual unlock, unless an explicit
      // jump or fresh reading intent has already superseded it.
      if (isCurrent() && restoringWidth.current && !anchor.current) anchor.current = saved
      cancelled = true
      cancelAnimationFrame(frame)
      if (innerFrame !== null) cancelAnimationFrame(innerFrame)
      if (fontFrame !== null) cancelAnimationFrame(fontFrame)
      intentEvents.forEach(type => document.removeEventListener(type, cancelSettlement, { capture: true }))
    }
  }, [language, presentation, routeIdentity, sheetOpen, contentRevision, viewportRevision])

  useLayoutEffect(() => {
    if (!sheetOpen && !restoringWidth.current && !anchor.current && delayedCaptureFrame.current === null) {
      const captured = captureReaderAnchor()
      if (captured) viewportAnchor.current = captured
    }
  }, [routeIdentity, sheetOpen, contentRevision])

  const changePresentation = (next: ReaderPresentation) => {
    if (next === presentation) return
    if (!anchor.current) anchor.current = captureReaderAnchor()
    setPresentation(next)
    setReaderPresentationPreference(next)
  }

  const rememberReadingPosition = (sourceAnchorKey?: string) => {
    anchor.current = captureReaderAnchor(document, sourceAnchorKey)
    if (anchor.current) viewportAnchor.current = anchor.current
  }

  const discardReadingPosition = useCallback(() => {
    const generation = ++restorationGeneration.current
    anchor.current = null
    viewportAnchor.current = null
    restoringWidth.current = false
    if (delayedCaptureFrame.current !== null) cancelAnimationFrame(delayedCaptureFrame.current)
    // Explicit section/find jumps release their sheet and move on two frames.
    // Capture the chosen destination afterward, never the abandoned origin.
    const captureAfterJump = (remaining: number) => {
      delayedCaptureFrame.current = requestAnimationFrame(() => {
        delayedCaptureFrame.current = null
        if (generation !== restorationGeneration.current) return
        if (remaining > 1) { captureAfterJump(remaining - 1); return }
        if (!sheetIsOpen.current && getLayoutViewportWidth() === viewportWidth.current) viewportAnchor.current = captureReaderAnchor()
      })
    }
    captureAfterJump(3)
  }, [])

  return { presentation, changePresentation, rememberReadingPosition, discardReadingPosition }
}
