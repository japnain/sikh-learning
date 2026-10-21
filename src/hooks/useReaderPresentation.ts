import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLanguageStore } from '../store/language'
import { captureReaderAnchor, isReaderScrollUnmovedOrClamped, restoreReaderAnchor, type ReaderAnchor } from '../utils/readerAnchor'
import { getAppScrollTop } from '../utils/appScroll'

export type ReaderPresentation = 'read' | 'study'
const STORAGE_KEY = 'naamras-reader-presentation'

export function useReaderPresentation(routeIdentity: string, sheetOpen: boolean, contentRevision?: unknown) {
  const [presentation, setPresentation] = useState<ReaderPresentation>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'read' || saved === 'study') return saved
    } catch { /* Reading remains available when storage is unavailable. */ }
    const preferences = useLanguageStore.getState()
    return preferences.meaningLanguage !== 'none' || preferences.showTransliteration ? 'study' : 'read'
  })
  const anchor = useRef<ReaderAnchor | null>(null)
  const language = useLanguageStore()

  useEffect(() => useLanguageStore.subscribe(() => {
    // Capture before React commits changed typography. While a sheet is open,
    // retain the original anchor until its scroll lock has been released.
    if (!anchor.current) anchor.current = captureReaderAnchor()
  }), [])

  useEffect(() => { anchor.current = null }, [routeIdentity])

  useLayoutEffect(() => {
    if (sheetOpen || !anchor.current) return
    const saved = anchor.current
    let cancelled = false
    let innerFrame: number | null = null
    let fontFrame: number | null = null
    const cancelSettlement = () => { cancelled = true }
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
        if (cancelled) return
        restoreReaderAnchor(saved)
        settledScrollTop = getAppScrollTop()
        if (fontsReady) void fontsReady.then(() => {
          if (cancelled) return
          fontFrame = requestAnimationFrame(() => {
            if (!cancelled && isReaderScrollUnmovedOrClamped(settledScrollTop)) restoreReaderAnchor(saved)
          })
        })
      })
    })
    anchor.current = null
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      if (innerFrame !== null) cancelAnimationFrame(innerFrame)
      if (fontFrame !== null) cancelAnimationFrame(fontFrame)
      intentEvents.forEach(type => document.removeEventListener(type, cancelSettlement, { capture: true }))
    }
  }, [language, presentation, routeIdentity, sheetOpen, contentRevision])

  const changePresentation = (next: ReaderPresentation) => {
    if (next === presentation) return
    if (!anchor.current) anchor.current = captureReaderAnchor()
    setPresentation(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch { /* Session preference still works. */ }
  }

  const rememberReadingPosition = (sourceAnchorKey?: string) => {
    anchor.current = captureReaderAnchor(document, sourceAnchorKey)
  }

  return { presentation, changePresentation, rememberReadingPosition }
}
