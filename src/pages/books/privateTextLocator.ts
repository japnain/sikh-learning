export type PrivateTextLocator = { blockId: string; charOffset: number }
type TextViewport = Pick<DOMRectReadOnly, 'left' | 'top' | 'right' | 'bottom'>
type SourceText = { id: string; nodes: Text[]; length: number; document: Document }

function sourceBlocks(root: HTMLElement) {
  const blocks = Array.from(root.querySelectorAll<HTMLElement>('section[data-source-id]'))
  if (root.matches('section[data-source-id]')) blocks.unshift(root)
  return blocks
}

function sourceText(block: HTMLElement): SourceText | null {
  const body = Array.from(block.querySelectorAll<HTMLElement>('[data-source-text]'))
    .find(element => element.closest('section[data-source-id]') === block)
  const id = block.dataset.sourceId
  if (!body || !id) return null
  const walker = block.ownerDocument.createTreeWalker(body, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let node: Node | null
  while ((node = walker.nextNode())) {
    if (node.textContent?.length) nodes.push(node as Text)
  }
  if (!nodes.some(text => text.data.trim().length)) return null
  return { id, nodes, length: nodes.reduce((total, text) => total + text.length, 0), document: block.ownerDocument }
}

function clampedOffset(offset: number, length: number) {
  if (!Number.isFinite(offset)) return offset === Infinity ? length : 0
  return Math.max(0, Math.min(length, Math.trunc(offset)))
}

function textPoint(source: SourceText, offset: number): { node: Text; offset: number } {
  let remaining = clampedOffset(offset, source.length)
  for (const node of source.nodes) {
    if (remaining < node.length) return { node, offset: remaining }
    remaining -= node.length
  }
  const node = source.nodes[source.nodes.length - 1]
  return { node, offset: node.length }
}

function textRange(source: SourceText, begin: number, end: number) {
  const start = textPoint(source, begin)
  const finish = textPoint(source, end)
  const range = source.document.createRange()
  range.setStart(start.node, start.offset)
  range.setEnd(finish.node, finish.offset)
  return range
}

function rangeRects(range: Range) {
  const rects = typeof range.getClientRects === 'function' ? Array.from(range.getClientRects()) : []
  if (rects.length) return rects
  const rect = typeof range.getBoundingClientRect === 'function' ? range.getBoundingClientRect() : null
  return rect && rect.height > 0 ? [rect] : []
}

function intersects(rect: TextViewport, viewport: TextViewport) {
  return rect.right > rect.left && rect.bottom > rect.top
    && rect.right > viewport.left && rect.left < viewport.right
    && rect.bottom > viewport.top && rect.top < viewport.bottom
}

function elementIsVisible(element: HTMLElement, viewport: TextViewport) {
  const rects = element.getClientRects()
  for (let index = 0; index < rects.length; index++) {
    if (intersects(rects[index], viewport)) return true
  }
  return !rects.length && intersects(element.getBoundingClientRect(), viewport)
}

function firstElementRect(element: HTMLElement) {
  const rects = element.getClientRects()
  for (let index = 0; index < rects.length; index++) {
    if (rects[index].height > 0) return rects[index]
  }
  const rect = element.getBoundingClientRect()
  return rect.height > 0 ? rect : undefined
}

/** Character positions use DOM/JavaScript UTF-16 offsets and survive inline annotation wrappers. */
export function findPrivateTextRange(root: HTMLElement, locator: PrivateTextLocator): Range | null {
  const block = sourceBlocks(root).find(element => element.dataset.sourceId === locator.blockId)
  const source = block ? sourceText(block) : null
  if (!source) return null
  const offset = clampedOffset(locator.charOffset, source.length)
  return textRange(source, offset, Math.min(source.length, offset + 1))
}

/** Find the first visible source character, including a paragraph spanning several CSS columns. */
export function findPrivateVisibleLocator(root: HTMLElement, viewport: TextViewport): PrivateTextLocator | null {
  if (!(viewport.right > viewport.left) || !(viewport.bottom > viewport.top)) return null
  let imageFallback: PrivateTextLocator | null = null
  for (const block of sourceBlocks(root)) {
    // Large chapters can contain thousands of blocks; only visible ones need text traversal or ranges.
    if (!elementIsVisible(block, viewport)) continue
    if (!imageFallback) {
      const image = block.querySelector<HTMLImageElement>('[data-source-text] img')
      if (image && block.dataset.sourceId && elementIsVisible(image, viewport)) {
        imageFallback = { blockId: block.dataset.sourceId, charOffset: 0 }
      }
    }
    const source = sourceText(block)
    if (!source) continue
    const prefixIsVisible = (end: number) => rangeRects(textRange(source, 0, end)).some(rect => intersects(rect, viewport))
    if (!prefixIsVisible(source.length)) continue
    // Prefix visibility is monotonic; individual glyph x coordinates reset on every wrapped line.
    let low = 0
    let high = source.length - 1
    while (low < high) {
      const middle = Math.floor((low + high) / 2)
      if (prefixIsVisible(middle + 1)) high = middle
      else low = middle + 1
    }
    if (rangeRects(textRange(source, low, low + 1)).some(rect => intersects(rect, viewport))) {
      return { blockId: source.id, charOffset: low }
    }
  }
  return imageFallback
}

/** Undo the current horizontal page transform before assigning the locator to a column. */
export function privateTextLocatorPage(root: HTMLElement, locator: PrivateTextLocator, viewportLeft: number, stride: number, currentPage: number): number | null {
  if (!Number.isFinite(viewportLeft) || !Number.isFinite(stride) || stride <= 0 || !Number.isFinite(currentPage)) return null
  const block = sourceBlocks(root).find(element => element.dataset.sourceId === locator.blockId)
  if (!block) return null
  // An image can fill a column while its caption starts later; offset zero anchors the image itself.
  const imageAnchor = locator.charOffset === 0 && block.querySelector('[data-source-text] img')
  const source = imageAnchor ? null : sourceText(block)
  const offset = source ? clampedOffset(locator.charOffset, source.length) : 0
  const range = source ? textRange(source, offset, Math.min(source.length, offset + 1)) : null
  const rect = imageAnchor || !range ? firstElementRect(block) : rangeRects(range).find(value => value.height > 0)
  if (!rect || !Number.isFinite(rect.left)) return null
  const absoluteLeft = rect.left - viewportLeft + Math.max(0, Math.trunc(currentPage)) * stride
  return Math.max(0, Math.floor((absoluteLeft + 0.01) / stride))
}
