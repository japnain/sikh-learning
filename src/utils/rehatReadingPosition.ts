import { getAppScrollTop, getAppViewportBounds, scrollAppTo } from './appScroll'

/** A content fingerprint prevents an old saved location being applied to a revised chapter. */
export function rehatContentFingerprint(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619)
  return (hash >>> 0).toString(36)
}

/** Assign anchors only after sanitizing. Find highlights do not change these identities. */
export function prepareRehatReadingHtml(sanitizedHtml: string) {
  const revision = rehatContentFingerprint(sanitizedHtml)
  if (typeof document === 'undefined') return { html: sanitizedHtml, revision }
  const template = document.createElement('template')
  template.innerHTML = sanitizedHtml
  const seen = new Map<string, number>()
  // Outermost blocks stay non-overlapping, including source lists with nested paragraphs.
  const candidates = Array.from(template.content.querySelectorAll<HTMLElement>('p,li'))
    .filter(element => !element.parentElement?.closest('p,li') && element.textContent?.trim())
  if (!candidates.length && template.content.textContent?.trim()) {
    const block = document.createElement('div')
    block.append(template.content.cloneNode(true))
    template.content.replaceChildren(block)
    candidates.push(block)
  }
  for (const block of candidates) {
    const fingerprint = rehatContentFingerprint((block.textContent ?? '').replace(/\s+/g, ' ').trim())
    const occurrence = (seen.get(fingerprint) ?? 0) + 1
    seen.set(fingerprint, occurrence)
    block.dataset.rehatBlock = `rehat-${revision}-${fingerprint}-${occurrence}`
    block.id = block.dataset.rehatBlock
  }
  return { html: template.innerHTML, revision }
}

export interface RehatReadingAnchor {
  blockId: string
  fraction: number
  offset: number
}

export function rehatReadingEdge(root: HTMLElement) {
  const header = root.closest('.rehat-reader-shell')?.querySelector<HTMLElement>('[data-reader-header]')
  const gutter = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  return Math.max(getAppViewportBounds().top, header?.getBoundingClientRect().bottom ?? 0) + gutter
}

/** Called after scroll settles, with logarithmic geometry reads for long chapters. */
export function captureRehatReadingAnchor(root: HTMLElement, blocks: ArrayLike<HTMLElement>): RehatReadingAnchor | null {
  const edge = rehatReadingEdge(root)
  let start = 0
  let end = blocks.length
  while (start < end) {
    const middle = start + Math.floor((end - start) / 2)
    if (blocks[middle].getBoundingClientRect().bottom <= edge) start = middle + 1
    else end = middle
  }
  const block = blocks[Math.min(start, blocks.length - 1)]
  if (!block?.dataset.rehatBlock) return null
  const rect = block.getBoundingClientRect()
  if (rect.height <= 0 || rect.top >= getAppViewportBounds().bottom) return null
  return {
    blockId: block.dataset.rehatBlock,
    fraction: Math.max(0, Math.min(1, (edge - rect.top) / rect.height)),
    offset: Math.max(0, rect.top - edge),
  }
}

export function restoreRehatReadingAnchor(root: HTMLElement, blocks: ArrayLike<HTMLElement>, anchor: RehatReadingAnchor) {
  const target = Array.from(blocks).find(block => block.dataset.rehatBlock === anchor.blockId)
  if (!target) return false
  const rect = target.getBoundingClientRect()
  if (rect.height <= 0) return false
  const delta = rect.top + rect.height * anchor.fraction - rehatReadingEdge(root) - anchor.offset
  if (Math.abs(delta) > .5) scrollAppTo({ top: Math.max(0, getAppScrollTop() + delta), behavior: 'auto' })
  return true
}
