import { afterEach, describe, expect, it, vi } from 'vitest'
import { findPrivateTextRange, findPrivateVisibleLocator, privateTextLocatorPage } from './privateTextLocator'

const originalRangeGeometry = ['getClientRects', 'getBoundingClientRect'].map(name => ({
  name, descriptor: Object.getOwnPropertyDescriptor(Range.prototype, name),
}))

function sourceRoot() {
  const root = document.createElement('article')
  document.body.append(root)
  return root
}

function appendSource(root: HTMLElement, id: string, text: string) {
  const section = document.createElement('section')
  section.dataset.sourceId = id
  const body = document.createElement('p')
  body.dataset.sourceText = ''
  body.append(document.createTextNode(text))
  section.append(body)
  root.append(section)
  return { section, body }
}

function rect(left: number, top = 20, width = 8, height = 18): DOMRect {
  return { x: left, y: top, left, top, right: left + width, bottom: top + height, width, height, toJSON: () => ({}) }
}

/** Supply text geometry independently of the helper, as jsdom does not lay out CSS columns. */
function installGeometry(position: (id: string, offset: number) => DOMRect | null) {
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function(this: HTMLElement) {
    const section = this.closest<HTMLElement>('section[data-source-id]')
    const id = section?.dataset.sourceId
    if (!section || !id) return [] as unknown as DOMRectList
    const length = Math.max(1, section.querySelector('[data-source-text]')?.textContent?.length ?? 0)
    const positions: DOMRect[] = []
    for (let offset = 0; offset < length; offset++) {
      const value = position(id, offset)
      if (value) positions.push(value)
    }
    return positions as unknown as DOMRectList
  })
  const clientRects = vi.fn(function(this: Range) {
    const body = this.startContainer.parentElement?.closest<HTMLElement>('[data-source-text]')
    if (!body) return [] as unknown as DOMRectList
    const id = body.closest<HTMLElement>('[data-source-id]')!.dataset.sourceId!
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT)
    const nodes: Text[] = []
    let node: Node | null
    while ((node = walker.nextNode())) nodes.push(node as Text)
    const offsetOf = (target: Node, offset: number) => {
      let sum = 0
      for (const item of nodes) {
        if (item === target) return sum + offset
        sum += item.length
      }
      return sum
    }
    const begin = offsetOf(this.startContainer, this.startOffset)
    const end = offsetOf(this.endContainer, this.endOffset)
    const positions: DOMRect[] = []
    for (let offset = begin; offset < end; offset++) {
      const value = position(id, offset)
      if (value) positions.push(value)
    }
    if (begin === end) {
      const value = position(id, begin)
      if (value) positions.push(rect(value.left, value.top, 0, value.height))
    }
    return positions as unknown as DOMRectList
  })
  Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, writable: true, value: clientRects })
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, writable: true, value: vi.fn(() => rect(0, 0, 0, 0)) })
  return clientRects
}

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
  for (const { name, descriptor } of originalRangeGeometry) {
    if (descriptor) Object.defineProperty(Range.prototype, name, descriptor)
    else Reflect.deleteProperty(Range.prototype, name)
  }
})

describe('source text locators', () => {
  it('uses stable UTF-16 offsets across nested annotations and excludes reference controls', () => {
    const root = sourceRoot()
    const { section, body } = appendSource(root, 'opening', 'A😀')
    const mark = document.createElement('mark')
    const emphasis = document.createElement('em')
    emphasis.textContent = 'ੴਬ'
    mark.append(emphasis)
    body.append(mark, document.createTextNode('Z'))
    const reference = document.createElement('button')
    reference.textContent = 'Open reference 12'
    section.append(reference)
    const markup = root.innerHTML

    expect(findPrivateTextRange(root, { blockId: 'opening', charOffset: 3 })?.toString()).toBe('ੴ')
    expect(findPrivateTextRange(root, { blockId: 'opening', charOffset: 4 })?.toString()).toBe('ਬ')
    const last = findPrivateTextRange(root, { blockId: 'opening', charOffset: 5 })!
    expect(last.toString()).toBe('Z')
    const end = findPrivateTextRange(root, { blockId: 'opening', charOffset: 999 })!
    expect(end.collapsed).toBe(true)
    expect(end.startContainer).toBe(body.lastChild)
    expect(end.startOffset).toBe(1)
    expect(root.innerHTML).toBe(markup)
  })

  it('clamps offsets and resolves a boundary to the following text node', () => {
    const root = sourceRoot()
    const { body } = appendSource(root, 'paragraph', 'abc')
    const mark = document.createElement('mark')
    mark.textContent = 'def'
    body.append(mark)
    expect(findPrivateTextRange(root, { blockId: 'paragraph', charOffset: -5 })?.toString()).toBe('a')
    expect(findPrivateTextRange(root, { blockId: 'paragraph', charOffset: 3.9 })?.startContainer).toBe(mark.firstChild)
    expect(findPrivateTextRange(root, { blockId: 'paragraph', charOffset: 3.9 })?.toString()).toBe('d')
    expect(findPrivateTextRange(root, { blockId: 'paragraph', charOffset: NaN })?.toString()).toBe('a')
    expect(findPrivateTextRange(root, { blockId: 'paragraph', charOffset: Infinity })?.collapsed).toBe(true)
    expect(findPrivateTextRange(root, { blockId: 'missing', charOffset: 0 })).toBeNull()
  })

  it('ignores image, reference-only and empty source blocks', () => {
    const root = sourceRoot()
    const { body } = appendSource(root, 'image', '')
    const image = document.createElement('img')
    image.alt = 'An illustration description'
    body.append(image)
    appendSource(root, 'empty', '  \n')
    const section = document.createElement('section')
    section.dataset.sourceId = 'reference'
    const button = document.createElement('button')
    button.textContent = 'Source reference'
    section.append(button)
    root.append(section)
    for (const blockId of ['image', 'empty', 'reference']) {
      expect(findPrivateTextRange(root, { blockId, charOffset: 0 })).toBeNull()
    }
    expect(findPrivateVisibleLocator(root, rect(0, 0, 300, 400))).toBeNull()
  })

  it('finds the first visible character deep inside a paragraph spanning columns without a linear character scan', () => {
    const root = sourceRoot()
    appendSource(root, 'long-paragraph', 'a'.repeat(12_000))
    const geometry = installGeometry((_id, offset) => {
      const column = Math.floor(offset / 1000)
      const within = offset % 1000
      return rect((column - 7) * 320 + 10 + within % 20 * 10, 10 + Math.floor(within / 20) * 20)
    })
    expect(findPrivateVisibleLocator(root, rect(0, 0, 300, 1100))).toEqual({ blockId: 'long-paragraph', charOffset: 7000 })
    expect(geometry.mock.calls.length).toBeLessThan(20)
  })

  it('considers both vertical visibility and horizontal column clipping in document order', () => {
    const root = sourceRoot()
    appendSource(root, 'previous-column', 'old')
    appendSource(root, 'current-column', 'abcdef')
    appendSource(root, 'later-paragraph', 'later')
    installGeometry((id, offset) => id === 'previous-column' ? rect(-300 + offset * 10)
      : id === 'later-paragraph' ? rect(10 + offset * 10, 80)
        : rect(10 + offset % 3 * 10, offset < 3 ? -30 : 20))
    expect(findPrivateVisibleLocator(root, rect(0, 0, 300, 100))).toEqual({ blockId: 'current-column', charOffset: 3 })
    expect(findPrivateVisibleLocator(root, rect(500, 0, 100, 100))).toBeNull()
    expect(findPrivateVisibleLocator(root, rect(0, 0, 0, 100))).toBeNull()
  })

  it('retains a visible character locator when an annotation changes the text-node boundaries', () => {
    const root = sourceRoot()
    const { body } = appendSource(root, 'annotated', 'A😀BCDEF')
    installGeometry((_id, offset) => rect(offset < 4 ? -200 + offset * 10 : 10 + (offset - 4) * 10))
    const locator = findPrivateVisibleLocator(root, rect(0, 0, 300, 100))!
    expect(locator).toEqual({ blockId: 'annotated', charOffset: 4 })
    expect(findPrivateTextRange(root, locator)?.toString()).toBe('C')
    const text = body.firstChild as Text
    const selected = text.splitText(3)
    selected.splitText(3)
    const mark = document.createElement('mark')
    selected.replaceWith(mark)
    mark.append(selected)
    expect(findPrivateVisibleLocator(root, rect(0, 0, 300, 100))).toEqual(locator)
    expect(findPrivateTextRange(root, locator)?.toString()).toBe('C')
  })

  it('restores the same character to its new column after typography reflows', () => {
    const root = sourceRoot()
    appendSource(root, 'passage', 'x'.repeat(200))
    let charactersPerPage = 40
    let currentPage = 2
    installGeometry((_id, offset) => rect(20 + (Math.floor(offset / charactersPerPage) - currentPage) * 320 + offset % charactersPerPage % 10 * 12))
    const locator = findPrivateVisibleLocator(root, rect(20, 0, 300, 100))!
    expect(locator).toEqual({ blockId: 'passage', charOffset: 80 })
    expect(privateTextLocatorPage(root, locator, 20, 320, currentPage)).toBe(2)
    charactersPerPage = 25
    expect(privateTextLocatorPage(root, locator, 20, 320, currentPage)).toBe(3)
    currentPage = 5
    expect(privateTextLocatorPage(root, locator, 20, 320, currentPage)).toBe(3)
    expect(findPrivateTextRange(root, locator)?.toString()).toBe('x')
  })

  it('rejects unavailable geometry and invalid pagination dimensions', () => {
    const root = sourceRoot()
    appendSource(root, 'passage', 'text')
    installGeometry(() => null)
    const locator = { blockId: 'passage', charOffset: 0 }
    expect(privateTextLocatorPage(root, locator, 0, 300, 0)).toBeNull()
    expect(privateTextLocatorPage(root, locator, 0, 0, 0)).toBeNull()
    expect(privateTextLocatorPage(root, locator, 0, NaN, 0)).toBeNull()
    expect(findPrivateVisibleLocator(root, rect(0, 0, 300, 100))).toBeNull()
  })

  it('skips text traversal and range creation for 20,000 offscreen source blocks', () => {
    const root = sourceRoot()
    const visibleIndex = 19_990
    const fragment = document.createDocumentFragment()
    for (let index = 0; index < 20_000; index++) {
      const section = document.createElement('section')
      section.dataset.sourceId = `line-${index}`
      const body = document.createElement('p')
      body.dataset.sourceText = ''
      body.textContent = 'An excerpt.'
      section.append(body)
      const bounds = [rect((index - visibleIndex) * 320, 10, 280, 20)] as unknown as DOMRectList
      section.getClientRects = () => bounds
      fragment.append(section)
    }
    root.append(fragment)
    installGeometry((id, offset) => rect((Number(id.slice(5)) - visibleIndex) * 320 + offset * 8))
    const ranges = vi.spyOn(document, 'createRange')
    const textWalkers = vi.spyOn(document, 'createTreeWalker')

    expect(findPrivateVisibleLocator(root, rect(0, 0, 300, 100))).toEqual({ blockId: `line-${visibleIndex}`, charOffset: 0 })

    expect(ranges.mock.calls.length).toBeLessThanOrEqual(8)
    // The fixture's Range geometry also walks its own text; the helper never walks an offscreen block.
    expect(textWalkers.mock.calls.every(([body]) => (body as HTMLElement).closest('section')?.dataset.sourceId === `line-${visibleIndex}`)).toBe(true)
  }, 15_000)

  it('anchors an image-only visible page to its source block and derives its page after reflow', () => {
    const root = sourceRoot()
    appendSource(root, 'previous-text', 'An earlier paragraph.')
    const { body, section } = appendSource(root, 'illustration', '')
    body.append(document.createElement('img'))
    appendSource(root, 'later-text', 'A later paragraph.')
    installGeometry(id => rect(id === 'illustration' ? 20 : id === 'previous-text' ? -300 : 340, 20, 280, 300))
    const locator = findPrivateVisibleLocator(root, rect(20, 0, 300, 400))!
    expect(locator).toEqual({ blockId: 'illustration', charOffset: 0 })
    expect(findPrivateTextRange(root, locator)).toBeNull()
    expect(privateTextLocatorPage(root, locator, 20, 320, 4)).toBe(4)
    section.getClientRects = () => [rect(340)] as unknown as DOMRectList
    expect(privateTextLocatorPage(root, locator, 20, 320, 4)).toBe(5)
  })

  it('prefers visible text to an image fallback and keeps an offscreen caption from moving the image anchor', () => {
    const root = sourceRoot()
    const { body, section } = appendSource(root, 'illustration', 'Caption on the following page.')
    const image = document.createElement('img')
    body.prepend(image)
    appendSource(root, 'paragraph', 'A visible paragraph.')
    let paragraphVisible = true
    installGeometry(id => rect(id === 'illustration' || !paragraphVisible ? 340 : 20))
    section.getClientRects = () => [rect(20, 20, 280, 300), rect(340)] as unknown as DOMRectList
    image.getClientRects = () => [rect(20, 20, 280, 300)] as unknown as DOMRectList
    const viewport = rect(20, 0, 300, 400)
    expect(findPrivateVisibleLocator(root, viewport)).toEqual({ blockId: 'paragraph', charOffset: 0 })
    paragraphVisible = false
    const locator = findPrivateVisibleLocator(root, viewport)!
    expect(locator).toEqual({ blockId: 'illustration', charOffset: 0 })
    expect(privateTextLocatorPage(root, locator, 20, 320, 4)).toBe(4)
  })
})
