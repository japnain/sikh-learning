import { getAppScrollTop, getAppViewportBounds, scrollAppTo } from './appScroll'

export interface ProseAnchor {
  id: string
  fraction: number
  offset: number
}

function readingEdge(root: HTMLElement) {
  const viewport = getAppViewportBounds()
  const header = root.querySelector<HTMLElement>('[data-reader-header]')
  const gap = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  return Math.max(viewport.top, header?.getBoundingClientRect().bottom ?? viewport.top) + gap
}

/** Resolve the passage at the actual header edge, only after scrolling settles. */
export function findProseReadingBlock(root: HTMLElement, selector: string): HTMLElement | null {
  const blocks = root.querySelectorAll<HTMLElement>(selector)
  const edge = readingEdge(root)
  let low = 0
  let high = blocks.length
  // Prose blocks are in document order. This avoids measuring every paragraph.
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (blocks[middle].getBoundingClientRect().bottom <= edge) low = middle + 1
    else high = middle
  }
  const block = blocks[low]
  if (!block) return null
  const rect = block.getBoundingClientRect()
  return rect.height > 0 && rect.top < getAppViewportBounds().bottom ? block : null
}

export function captureProseAnchor(root: HTMLElement, selector: string): ProseAnchor | null {
  const block = findProseReadingBlock(root, selector)
  if (!block?.id) return null
  const rect = block.getBoundingClientRect()
  const edge = readingEdge(root)
  return {
    id: block.id,
    fraction: Math.min(1, Math.max(0, (edge - rect.top) / rect.height)),
    offset: Math.max(0, rect.top - edge),
  }
}

/** Call after modal scroll unlocking so its old pixel offset cannot win. */
export function restoreProseAnchor(root: HTMLElement, anchor: ProseAnchor) {
  const block = document.getElementById(anchor.id)
  if (!block || !root.contains(block)) return
  const rect = block.getBoundingClientRect()
  const delta = rect.top + rect.height * anchor.fraction - readingEdge(root) - anchor.offset
  if (Math.abs(delta) > 0.5) {
    scrollAppTo({ top: Math.max(0, getAppScrollTop() + delta), behavior: 'auto' })
  }
}
