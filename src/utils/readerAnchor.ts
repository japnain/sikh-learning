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
  return Math.max(viewport.top + 16, toolbarHidden ? 0 : toolbar?.getBoundingClientRect().bottom ?? 0)
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
    return rect.bottom > top && rect.top < viewport.bottom
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
