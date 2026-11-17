import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { findPrivateVisibleLocator, privateTextLocatorPage, type PrivateTextLocator } from './privateTextLocator'

export function privateColumnCount(scrollWidth: number, width: number, gap: number) {
  return width > 0 ? Math.max(1, Math.ceil((scrollWidth + gap - 1) / (width + gap))) : 1
}

interface PaginationOptions {
  enabled: boolean
  ready: boolean
  chapterKey: string
  layoutKey: string
  locator: RefObject<PrivateTextLocator | null>
  edge: RefObject<'start' | 'end' | null>
  onPosition: (locator: PrivateTextLocator | null, page: number, count: number, immediate: boolean) => void
}

/** Paginate the original DOM so selection, source IDs and annotations remain intact. */
export function usePrivatePagination({ enabled, ready, chapterKey, layoutKey, locator: locatorRef, edge: edgeRef, onPosition }: PaginationOptions) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const pagesRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef(0)
  const countRef = useRef(1)
  const strideRef = useRef(1)
  const callbackRef = useRef(onPosition)
  const [page, setPageState] = useState(0)
  const [count, setCount] = useState(1)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const outgoingLeaf = useRef<HTMLDivElement | null>(null)
  const sourceTabStops = useRef(new Map<HTMLElement, string | null>())
  useLayoutEffect(() => { callbackRef.current = onPosition })

  const publish = useCallback((immediate: boolean) => {
    const viewport = viewportRef.current
    const pages = pagesRef.current
    if (!viewport || !pages) return
    const rect = viewport.getBoundingClientRect()
    for (const element of sourceTabStops.current.keys()) if (!pages.contains(element)) sourceTabStops.current.delete(element)
    for (const element of pages.querySelectorAll<HTMLElement>('a,button,input,textarea,select,[tabindex]')) {
      if (!sourceTabStops.current.has(element)) sourceTabStops.current.set(element, element.getAttribute('tabindex'))
      const visible = Array.from(element.getClientRects()).some(part => part.right > rect.left && part.left < rect.right && part.bottom > rect.top && part.top < rect.bottom)
      const original = sourceTabStops.current.get(element)!
      if (!visible) element.setAttribute('tabindex', '-1')
      else if (original === null) element.removeAttribute('tabindex')
      else element.setAttribute('tabindex', original)
    }
    // Reflow may move the page's leading glyph backwards. Preserve the semantic
    // source anchor across layout-only changes; only an intentional turn replaces it.
    const found = !immediate && locatorRef.current ? locatorRef.current : findPrivateVisibleLocator(pages, rect)
    if (found) locatorRef.current = found
    callbackRef.current(found ?? locatorRef.current, pageRef.current, countRef.current, immediate)
  }, [locatorRef])

  const setPage = useCallback((next: number, animate = true) => {
    const viewport = viewportRef.current
    const pages = pagesRef.current
    if (!viewport || !pages) return false
    const target = Math.max(0, Math.min(countRef.current - 1, Math.floor(next)))
    if (target === pageRef.current) return false
    viewport.scrollLeft = 0
    viewport.scrollTop = 0
    if (timer.current) clearTimeout(timer.current)
    outgoingLeaf.current?.remove()
    outgoingLeaf.current = null
    const previous = pageRef.current
    const motion = animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // A short-lived inert copy gives the turning page a real paper face. Large
    // chapters use a fade so a turn never clones thousands of source blocks.
    if (motion && viewport.dataset.pageTurn === 'curl' && pages.getElementsByTagName('*').length <= 1500) {
      const leaf = document.createElement('div')
      leaf.className = 'private-reader-book-turn-leaf'
      leaf.setAttribute('aria-hidden', 'true')
      leaf.setAttribute('inert', '')
      const copy = pages.cloneNode(true) as HTMLElement
      for (const element of Array.from(copy.querySelectorAll<HTMLElement>('[id],[data-source-id],[data-source-text],[data-source-anchor]'))) {
        for (const attribute of ['id', 'data-source-id', 'data-source-text', 'data-source-anchor']) element.removeAttribute(attribute)
      }
      copy.removeAttribute('id')
      leaf.append(copy)
      viewport.append(leaf)
      outgoingLeaf.current = leaf
    }
    pageRef.current = target
    setPageState(target)
    viewport.dataset.readerPage = String(target)
    viewport.dataset.turnDirection = target > previous ? 'next' : 'previous'
    viewport.dataset.turnRendering = outgoingLeaf.current ? 'leaf' : 'fade'
    viewport.classList.toggle('private-reader-book-viewport--turning', motion)
    pages.style.transform = `translateX(${-target * strideRef.current}px)`
    // Geometry is measured at the destination, without waiting for a visual transition.
    publish(true)
    timer.current = setTimeout(() => { viewport.classList.remove('private-reader-book-viewport--turning'); outgoingLeaf.current?.remove(); outgoingLeaf.current = null }, 320)
    return true
  }, [publish])

  const measure = useCallback(() => {
    const viewport = viewportRef.current
    const pages = pagesRef.current
    if (!enabled || !ready || !viewport || !pages) return
    viewport.scrollLeft = 0
    viewport.scrollTop = 0
    outgoingLeaf.current?.remove()
    outgoingLeaf.current = null
    const rect = viewport.getBoundingClientRect()
    const width = viewport.clientWidth || rect.width
    if (!width) return
    const gap = Math.max(0, Number.parseFloat(getComputedStyle(pages).columnGap) || 40)
    const stride = width + gap
    pages.style.width = `${width}px`
    pages.style.columnWidth = `${width}px`
    pages.style.transform = `translateX(${-pageRef.current * stride}px)`
    viewport.classList.remove('private-reader-book-viewport--turning')
    const nextCount = privateColumnCount(pages.scrollWidth, width, gap)
    let target = edgeRef.current === 'end' ? nextCount - 1 : edgeRef.current === 'start' ? 0 : pageRef.current
    if (!edgeRef.current && locatorRef.current) {
      const resolved = privateTextLocatorPage(pages, locatorRef.current, rect.left, stride, pageRef.current)
      if (resolved === null) locatorRef.current = null
      else target = resolved
    }
    edgeRef.current = null
    pageRef.current = Math.max(0, Math.min(nextCount - 1, target))
    countRef.current = nextCount
    strideRef.current = stride
    setCount(nextCount)
    setPageState(pageRef.current)
    viewport.dataset.readerPage = String(pageRef.current)
    viewport.dataset.readerPageCount = String(nextCount)
    pages.style.transform = `translateX(${-pageRef.current * stride}px)`
    publish(false)
  }, [enabled, ready, locatorRef, edgeRef, publish])

  useLayoutEffect(() => {
    if (!enabled || !ready) return
    let frame = requestAnimationFrame(measure)
    const resize = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure) }
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
    if (viewportRef.current) observer?.observe(viewportRef.current)
    window.addEventListener('resize', resize)
    document.fonts?.addEventListener('loadingdone', resize)
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', resize)
      document.fonts?.removeEventListener('loadingdone', resize)
    }
  }, [enabled, ready, chapterKey, layoutKey, measure])

  useLayoutEffect(() => () => { if (timer.current) clearTimeout(timer.current); outgoingLeaf.current?.remove() }, [])
  useLayoutEffect(() => {
    if (enabled) return
    for (const [element, original] of sourceTabStops.current) {
      if (original === null) element.removeAttribute('tabindex')
      else element.setAttribute('tabindex', original)
    }
    sourceTabStops.current.clear()
  }, [enabled])
  return { viewportRef, pagesRef, page, count, setPage, refresh: measure }
}
