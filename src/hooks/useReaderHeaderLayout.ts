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
    let measuredWidth = 0

    const textWidths = (elements: HTMLElement[]) => {
      // Range measures the text rather than the width allocated to its block.
      // Unwrap together so each label does not force a separate layout. Labels
      // that are already nowrap need no temporary style mutation at all.
      const wrapping = elements.filter(element => getComputedStyle(element).whiteSpace !== 'nowrap')
        .map(element => ({ element, previous: element.style.whiteSpace }))
      wrapping.forEach(({ element }) => { element.style.whiteSpace = 'nowrap' })
      const widths = elements.map(element => {
        const range = document.createRange()
        range.selectNodeContents(element)
        return typeof range.getBoundingClientRect === 'function' ? range.getBoundingClientRect().width : element.scrollWidth
      })
      wrapping.forEach(({ element, previous }) => { element.style.whiteSpace = previous })
      return widths
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
      const lengthInset = lengthStyle ? pixels(lengthStyle.paddingLeft) + pixels(lengthStyle.paddingRight)
        + pixels(lengthStyle.borderLeftWidth) + pixels(lengthStyle.borderRightWidth) : 0
      const [titleWidth, ...labelWidths] = textWidths([title, ...Array.from(length?.querySelectorAll<HTMLElement>('span,strong') ?? [])])
      const reflow = titleWidth > normalIdentityWidth + 1 || Math.max(0, ...labelWidths) + lengthInset > normalIdentityWidth + 1
      const before = header.dataset.reflow === 'true'
      const previousHeight = pixels(page.style.getPropertyValue('--study-reader-topbar-height'))
      const layoutChanged = before !== reflow || previousHeight !== Math.ceil(header.getBoundingClientRect().height)
      const anchor = layoutChanged && getAppScrollTop() > 0 && !page.closest('[inert],[aria-hidden="true"]') ? captureReaderAnchor() : null
      if (header.dataset.reflow !== String(reflow)) header.dataset.reflow = String(reflow)
      const height = Math.ceil(header.getBoundingClientRect().height)
      if (height <= 0) return
      measuredWidth = header.clientWidth
      if (previousHeight !== height) page.style.setProperty('--study-reader-topbar-height', `${height}px`)
      if (anchor && (previousHeight !== height || before !== reflow)) {
        restoreReaderAnchor({ ...anchor, viewportTop: Math.max(anchor.viewportTop, getReaderViewportTop()) })
      }
    }
    const schedule = () => {
      if (frame !== null) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => { frame = null; measure() })
    }
    const scheduleWidthChange = () => {
      // Mobile browser chrome changes viewport height throughout a swipe.
      // The reader's title and wrapping only need remeasurement at a new width.
      if (header.clientWidth !== measuredWidth) schedule()
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(entries => {
      // Keep real header/font growth responsive without measuring it again
      // whenever the scripture page's height changes.
      if (entries.some(entry => entry.target === header)) schedule()
      else scheduleWidthChange()
    })
    observer?.observe(header)
    observer?.observe(page)
    window.addEventListener('resize', scheduleWidthChange)
    window.addEventListener('orientationchange', schedule)
    window.addEventListener('pageshow', schedule)
    document.fonts?.addEventListener?.('loadingdone', schedule)
    void document.fonts?.ready.then(() => { if (!disposed) schedule() })
    return () => {
      disposed = true
      if (frame !== null) cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', scheduleWidthChange)
      window.removeEventListener('orientationchange', schedule)
      window.removeEventListener('pageshow', schedule)
      document.fonts?.removeEventListener?.('loadingdone', schedule)
    }
  }, [routeIdentity, layoutRevision])
  return pageRef
}
