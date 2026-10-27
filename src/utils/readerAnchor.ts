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

type ReaderLines = ArrayLike<HTMLElement>

const isBodyLine = (line: HTMLElement) => line.dataset.lineKind !== 'header' && line.dataset.readerStructural !== 'true'

/** Scripture lines are stacked in document order, with no overlapping rows.
 * Locate the reading edge without measuring every offscreen verse on a swipe.
 * Read current geometry so wrapping, font changes and tall lines stay accurate.
 */
function firstLineBelow(lines: ReaderLines, top: number) {
  let start = 0
  let end = lines.length
  while (start < end) {
    const middle = start + Math.floor((end - start) / 2)
    if (lines[middle].getBoundingClientRect().bottom <= top) start = middle + 1
    else end = middle
  }
  return start
}

function visibleLineAt(lines: ReaderLines, top: number, bottom: number): HTMLElement | null {
  let heading: HTMLElement | null = null
  for (let index = firstLineBelow(lines, top + 1); index < lines.length; index += 1) {
    const line = lines[index]
    if (line.getBoundingClientRect().top >= bottom) break
    if (isBodyLine(line)) return line
    heading ??= line
  }
  return heading
}

export function findVisibleReaderLine(lines: ReaderLines): HTMLElement | null {
  return visibleLineAt(lines, getReaderViewportTop(), getAppViewportBounds().bottom)
}

/** Keep a source line and the point within it stable when its support layers reflow. */
export function captureReaderAnchor(root: ParentNode = document, preferredKey?: string): ReaderAnchor | null {
  const top = getReaderViewportTop()
  const lines = root.querySelectorAll<HTMLElement>('[data-reader-anchor]')
  let line = (preferredKey ? Array.from(lines).find(item => item.dataset.readerAnchor === preferredKey) : null)
    ?? visibleLineAt(lines, top, getAppViewportBounds().bottom)
  if (!line) {
    // Before the reading starts (or between passages), prefer the next body
    // line. A reading made entirely of headings still needs an anchor.
    const nextIndex = firstLineBelow(lines, top)
    for (let index = nextIndex; index < lines.length; index += 1) {
      if (isBodyLine(lines[index])) { line = lines[index]; break }
    }
    if (!line && !Array.from(lines).some(isBodyLine)) line = lines[nextIndex]
  }
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
