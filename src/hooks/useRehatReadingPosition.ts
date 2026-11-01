import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { useReadingPlacesStore } from '../store/readingPlaces'
import { addAppScrollSettledListener, getAppScrollTop, getAppViewportBounds, scrollAppTo } from '../utils/appScroll'
import { captureRehatReadingAnchor, rehatReadingEdge, restoreRehatReadingAnchor, type RehatReadingAnchor } from '../utils/rehatReadingPosition'

export function useRehatReadingPosition({ rootRef, rehatId, chapterId, sourceTitle, chapterTitle, revision, renderedHtml, finding, hash = '' }: {
  rootRef: RefObject<HTMLElement | null>
  rehatId: number | null
  chapterId: number | null
  sourceTitle: string
  chapterTitle: string
  revision: string
  renderedHtml: string
  finding: boolean
  hash?: string
}) {
  const blocksRef = useRef<NodeListOf<HTMLElement> | null>(null)
  const appearanceAnchor = useRef<RehatReadingAnchor | null>(null)
  const appearanceOpen = useRef(false)
  const findingRef = useRef(finding)
  const restoreFrames = useRef<number[]>([])
  const identity = `${rehatId}:${chapterId}:${revision}`
  const currentIdentity = useRef(identity)
  const metadataRef = useRef({ sourceTitle, chapterTitle })

  useLayoutEffect(() => {
    blocksRef.current = rootRef.current?.querySelectorAll<HTMLElement>('[data-rehat-block]') ?? null
    findingRef.current = finding
    currentIdentity.current = identity
    metadataRef.current = { sourceTitle, chapterTitle }
  }, [finding, renderedHtml, rootRef, identity, sourceTitle, chapterTitle])

  useEffect(() => {
    const root = rootRef.current
    if (!root || !rehatId || !chapterId || !blocksRef.current?.length) return
    let disposed = false
    let userInteracted = false
    let ready = false
    const frames: number[] = []
    const path = `/banis/rehat/${rehatId}/chapters/${chapterId}`
    const position = useReadingPlacesStore.getState().places[`rehat:${rehatId}`]
    const locator = position?.readerLocator
    let requestedBlock: string | null = null
    try { requestedBlock = hash ? decodeURIComponent(hash.slice(1)) : null } catch { /* An invalid link opens the chapter safely. */ }
    const savedBlock = position?.resumePath === path && locator?.revision === revision ? locator.locations.blockId : null
    const restoreBlock = hash ? requestedBlock : savedBlock
    const restore = () => {
      if (disposed || userInteracted || !blocksRef.current || findingRef.current) return
      const restored = restoreBlock && restoreRehatReadingAnchor(root, blocksRef.current, { blockId: restoreBlock, fraction: 0, offset: 0 })
      if (!restored) scrollAppTo({ top: 0, left: 0, behavior: 'auto' })
    }
    const markInteraction = () => { userInteracted = true }
    const save = () => {
      if (!ready || disposed || currentIdentity.current !== identity || appearanceOpen.current || findingRef.current || !blocksRef.current || !root.isConnected
        || root.closest('[inert],[aria-hidden="true"]') || getAppScrollTop() <= 0) return
      const anchor = captureRehatReadingAnchor(root, blocksRef.current)
      if (!anchor) return
      const rect = root.getBoundingClientRect()
      const edge = rehatReadingEdge(root)
      const available = Math.max(1, getAppViewportBounds().bottom - edge)
      const distance = Math.max(1, rect.height - available)
      const progress = Math.max(0, Math.min(1, (edge - rect.top) / distance))
      useReadingPlacesStore.getState().remember({
        scriptureId: `rehat-${rehatId}-${chapterId}`, resumePath: path, updatedAt: new Date().toISOString(),
        readerLocator: {
          revision, href: path, type: 'text/html', title: [metadataRef.current.sourceTitle, metadataRef.current.chapterTitle].filter(Boolean).join(' · '),
          locations: { blockId: anchor.blockId, progression: progress, totalProgression: progress,
            position: Array.from(blocksRef.current).findIndex(block => block.dataset.rehatBlock === anchor.blockId) + 1 },
        },
      })
    }
    // Wait for the shared toolbar to measure, and retry once after late fonts.
    frames.push(requestAnimationFrame(() => {
      frames.push(requestAnimationFrame(() => { restore(); ready = true }))
    }))
    void document.fonts?.ready.then(() => { if (!disposed) restore() })
    const visibility = () => { if (document.visibilityState === 'hidden') save() }
    const beforeNavigation = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('.rehat-reader-shell a[href]')) save()
    }
    const removeSettled = addAppScrollSettledListener(save)
    window.addEventListener('pointerdown', markInteraction, { passive: true })
    window.addEventListener('touchstart', markInteraction, { passive: true })
    window.addEventListener('wheel', markInteraction, { passive: true })
    window.addEventListener('keydown', markInteraction)
    window.addEventListener('pagehide', save)
    document.addEventListener('click', beforeNavigation, true)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      save()
      disposed = true
      frames.forEach(cancelAnimationFrame)
      restoreFrames.current.forEach(cancelAnimationFrame)
      restoreFrames.current = []
      appearanceAnchor.current = null
      appearanceOpen.current = false
      removeSettled()
      window.removeEventListener('pointerdown', markInteraction)
      window.removeEventListener('touchstart', markInteraction)
      window.removeEventListener('wheel', markInteraction)
      window.removeEventListener('keydown', markInteraction)
      window.removeEventListener('pagehide', save)
      document.removeEventListener('click', beforeNavigation, true)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [identity, rehatId, chapterId, revision, rootRef, hash])

  const openAppearance = useCallback(() => {
    const root = rootRef.current
    appearanceAnchor.current = root && blocksRef.current ? captureRehatReadingAnchor(root, blocksRef.current) : null
    appearanceOpen.current = true
  }, [rootRef])
  const closeAppearance = useCallback(() => {
    // Modal dismissal restores its locked scroll offset on the first frame.
    restoreFrames.current.forEach(cancelAnimationFrame)
    restoreFrames.current = [requestAnimationFrame(() => {
      restoreFrames.current.push(requestAnimationFrame(() => {
        const root = rootRef.current
        if (root && blocksRef.current && appearanceAnchor.current) restoreRehatReadingAnchor(root, blocksRef.current, appearanceAnchor.current)
        appearanceAnchor.current = null
        appearanceOpen.current = false
        restoreFrames.current = []
      }))
    })]
  }, [rootRef])
  return { openAppearance, closeAppearance }
}
