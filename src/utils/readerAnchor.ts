import { getAppScrollTop, getAppViewportBounds, isAppScrollAtEnd, scrollAppTo } from './appScroll'

export interface ReaderAnchor {
  key: string
  fraction: number
  viewportTop: number
}

export function getReaderViewportTop() {
  const viewport = getAppViewportBounds()
  const toolbar = document.querySelector<HTMLElement>('.study-reader-topbar')
  const toolbarHidden = toolbar?.closest<HTMLElement>('[data-reader-controls]')?.dataset.readerControls === 'hidden'
  const breathingRoom = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const line = document.querySelector<HTMLElement>('[data-reader-anchor]')
  const fixedToolbar = toolbar && getComputedStyle(toolbar).position !== 'absolute'
  const scrollMargin = fixedToolbar && line ? Number.parseFloat(getComputedStyle(line).scrollMarginTop) || 0 : 0
  // Resume aligns below the header plus the line's 1rem scroll margin. Treat
  // that same gutter as outside the reading area so the previous line's
  // trailing padding cannot replace the requested verse immediately afterward.
  return Math.max(viewport.top + breathingRoom, toolbarHidden ? 0 : Math.max(
    (toolbar?.getBoundingClientRect().bottom ?? 0) + breathingRoom,
    scrollMargin,
  ))
}

/** A font reflow can shrink the document and clamp the browser to its new end. */
export function isReaderScrollUnmovedOrClamped(previousTop: number) {
  const currentTop = getAppScrollTop()
  return Math.abs(currentTop - previousTop) <= 2
    || (previousTop > currentTop + 2 && isAppScrollAtEnd(2))
}

/** Prefer scripture body while retaining a fallback for a heading-only passage. */
export function getReaderBodyLines(lines: HTMLElement[]): HTMLElement[] {
  const body = lines.filter(line => line.dataset.lineKind !== 'header' && line.dataset.readerStructural !== 'true')
  return body.length > 0 ? body : lines
}

export function findVisibleReaderLine(lines: HTMLElement[]): HTMLElement | null {
  const top = getReaderViewportTop()
  const viewport = getAppViewportBounds()
  const visible = lines.filter(line => {
    const rect = line.getBoundingClientRect()
    return rect.bottom > top + 1 && rect.top < viewport.bottom
  })
  return getReaderBodyLines(visible)[0] ?? null
}

/** Keep a source line and the point within it stable when its support layers reflow. */
export function captureReaderAnchor(root: ParentNode = document, preferredKey?: string): ReaderAnchor | null {
  const top = getReaderViewportTop()
  const lines = Array.from(root.querySelectorAll<HTMLElement>('[data-reader-anchor]'))
  const line = (preferredKey ? lines.find(item => item.dataset.readerAnchor === preferredKey) : null)
    ?? findVisibleReaderLine(lines)
    ?? getReaderBodyLines(lines).find(item => item.getBoundingClientRect().bottom > top)
  if (!line?.dataset.readerAnchor) return null
  const rect = line.getBoundingClientRect()
  return {
    key: line.dataset.readerAnchor,
    fraction: rect.top < top ? Math.min(1, (top - rect.top) / Math.max(1, rect.height)) : 0,
    viewportTop: Math.max(top, rect.top),
  }
}

export function restoreReaderAnchor(anchor: ReaderAnchor, root: ParentNode = document) {
  const target = Array.from(root.querySelectorAll<HTMLElement>('[data-reader-anchor]'))
    .find(line => line.dataset.readerAnchor === anchor.key)
  if (!target) return
  const rect = target.getBoundingClientRect()
  const delta = rect.top + rect.height * anchor.fraction - anchor.viewportTop
  if (Math.abs(delta) > 0.5) scrollAppTo({ top: Math.max(0, getAppScrollTop() + delta), behavior: 'auto' })
}
