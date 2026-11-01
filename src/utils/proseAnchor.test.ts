import { captureProseAnchor, findProseReadingBlock, restoreProseAnchor } from './proseAnchor'
import { mockDocumentScroll } from '../test/documentScroll'

function rect(top: number, height: number): DOMRect {
  return { top, bottom: top + height, height, left: 0, right: 1200, width: 1200, x: 0, y: top, toJSON: () => ({}) }
}

describe('prose anchors', () => {
  let scroll: ReturnType<typeof mockDocumentScroll>
  let root: HTMLElement
  beforeEach(() => {
    scroll = mockDocumentScroll({ top: 1000, viewportHeight: 400, scrollHeight: 10000 })
    root = document.createElement('main')
    root.innerHTML = '<header data-reader-header></header><p id="before" data-block></p><p id="reading" data-block></p><p id="after" data-block></p>'
    document.body.append(root)
    document.documentElement.style.fontSize = '24px'
  })
  afterEach(() => {
    root.remove()
    document.documentElement.style.fontSize = ''
    scroll.restore()
    vi.restoreAllMocks()
  })

  test('uses the measured header and enlarged root text and retains the same fraction after reflow', () => {
    const header = root.querySelector('header')!
    vi.spyOn(header, 'getBoundingClientRect').mockReturnValue(rect(0, 112))
    vi.spyOn(root.querySelector('#before')!, 'getBoundingClientRect').mockReturnValue(rect(-200, 200))
    const readingRect = vi.spyOn(root.querySelector('#reading')!, 'getBoundingClientRect').mockReturnValue(rect(36, 200))
    vi.spyOn(root.querySelector('#after')!, 'getBoundingClientRect').mockReturnValue(rect(240, 200))
    expect(findProseReadingBlock(root, '[data-block]')?.id).toBe('reading')
    const anchor = captureProseAnchor(root, '[data-block]')!
    expect(anchor).toEqual({ id: 'reading', fraction: 0.5, offset: 0 })
    readingRect.mockReturnValue(rect(436, 400))
    restoreProseAnchor(root, anchor)
    expect(scroll.getTop()).toBe(1500)
  })

  test('keeps the visible gap above a passage and ignores a removed anchor', () => {
    vi.spyOn(root.querySelector('header')!, 'getBoundingClientRect').mockReturnValue(rect(0, 60))
    vi.spyOn(root.querySelector('#before')!, 'getBoundingClientRect').mockReturnValue(rect(-100, 100))
    const readingRect = vi.spyOn(root.querySelector('#reading')!, 'getBoundingClientRect').mockReturnValue(rect(124, 100))
    vi.spyOn(root.querySelector('#after')!, 'getBoundingClientRect').mockReturnValue(rect(250, 100))
    const anchor = captureProseAnchor(root, '[data-block]')!
    expect(anchor).toEqual({ id: 'reading', fraction: 0, offset: 40 })
    readingRect.mockReturnValue(rect(324, 160))
    restoreProseAnchor(root, anchor)
    expect(scroll.getTop()).toBe(1200)
    root.querySelector('#reading')!.remove()
    scroll.scrollTo.mockClear()
    restoreProseAnchor(root, anchor)
    expect(scroll.scrollTo).not.toHaveBeenCalled()
  })
})
