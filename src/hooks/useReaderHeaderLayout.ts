import { useLayoutEffect, useRef } from 'react'
import { getAppScrollTop } from '../utils/appScroll'
import { captureReaderAnchor, getReaderViewportTop, restoreReaderAnchor } from '../utils/readerAnchor'

const pixels = (value: string) => Number.parseFloat(value) || 0

/** Measure real text and header height, including browser text enlargement and late fonts. */
export function useReaderHeaderLayout(routeIdentity: string, layoutRevision?: string) {
  const pageRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const page = pageRef.current
    const header = page?.querySelector<HTMLElement>('.study-reader-topbar')
    const identity = header?.querySelector<HTMLElement>('.study-reader-topbar__identity')
    const title = identity?.querySelector<HTMLElement>('h1')
    if (!page || !header || !identity || !title) return
    let disposed = false
    let frame: number | null = null

    const textWidth = (element: HTMLElement) => {
      // Range measures the text rather than the width allocated to its block.
      // Temporarily disabling wrapping also works after the header has reflowed.
      const previous = element.style.whiteSpace
      element.style.whiteSpace = 'nowrap'
      const range = document.createRange()
      range.selectNodeContents(element)
      const width = typeof range.getBoundingClientRect === 'function' ? range.getBoundingClientRect().width : element.scrollWidth
      element.style.whiteSpace = previous
      return width
    }
    const measure = () => {
      if (disposed || !header.isConnected || header.clientWidth <= 0) return
      const headerStyle = getComputedStyle(header)
      const identityStyle = getComputedStyle(identity)
      const flank = pixels(headerStyle.getPropertyValue('--study-reader-header-flank-width')) || 88
      const normalIdentityWidth = header.clientWidth - pixels(headerStyle.paddingLeft) - pixels(headerStyle.paddingRight)
        - 2 * flank - pixels(identityStyle.paddingLeft) - pixels(identityStyle.paddingRight)
      const length = identity.querySelector<HTMLElement>('.study-reader-length-control')
      const lengthStyle = length ? getComputedStyle(length) : null
      const longestLengthLabel = length ? Math.max(0, ...Array.from(length.querySelectorAll<HTMLElement>('span,strong')).map(textWidth)) : 0
      const lengthInset = lengthStyle ? pixels(lengthStyle.paddingLeft) + pixels(lengthStyle.paddingRight)
        + pixels(lengthStyle.borderLeftWidth) + pixels(lengthStyle.borderRightWidth) : 0
      const reflow = textWidth(title) > normalIdentityWidth + 1 || longestLengthLabel + lengthInset > normalIdentityWidth + 1
      const before = header.dataset.reflow === 'true'
      const anchor = getAppScrollTop() > 0 && !page.closest('[inert],[aria-hidden="true"]') ? captureReaderAnchor() : null
      header.dataset.reflow = String(reflow)
      const height = Math.ceil(header.getBoundingClientRect().height)
      if (height <= 0) return
      const previousHeight = pixels(page.style.getPropertyValue('--study-reader-topbar-height'))
      if (previousHeight !== height) page.style.setProperty('--study-reader-topbar-height', `${height}px`)
      if (anchor && (previousHeight !== height || before !== reflow)) {
        restoreReaderAnchor({ ...anchor, viewportTop: Math.max(anchor.viewportTop, getReaderViewportTop()) })
      }
    }
    const schedule = () => {
      if (frame !== null) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => { frame = null; measure() })
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
    observer?.observe(header)
    observer?.observe(page)
    window.addEventListener('resize', schedule)
    window.addEventListener('orientationchange', schedule)
    window.addEventListener('pageshow', schedule)
    document.fonts?.addEventListener?.('loadingdone', schedule)
    void document.fonts?.ready.then(() => { if (!disposed) schedule() })
    return () => {
      disposed = true
      if (frame !== null) cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('orientationchange', schedule)
      window.removeEventListener('pageshow', schedule)
      document.fonts?.removeEventListener?.('loadingdone', schedule)
    }
  }, [routeIdentity, layoutRevision])
  return pageRef
}
