import { beforeEach, expect, test, vi } from 'vitest'
import { captureRehatReadingAnchor, prepareRehatReadingHtml, restoreRehatReadingAnchor } from './rehatReadingPosition'
import { highlightRehatHtml } from './rehatFind'
import { sanitizeRehatHtml } from './rehatHtml'
import { scrollAppTo } from './appScroll'

vi.mock('./appScroll', () => ({
  getAppScrollTop: () => 300,
  getAppViewportBounds: () => ({ top: 0, bottom: 800, height: 800 }),
  scrollAppTo: vi.fn(),
}))

beforeEach(() => { document.body.innerHTML = ''; vi.clearAllMocks() })

function rectangle(top: number, height: number) {
  return { top, bottom: top + height, height, left: 0, right: 300, width: 300, x: 0, y: top, toJSON: () => ({}) } as DOMRect
}

test('makes stable, revision-aware locators without changing source text or trusting supplied attributes', () => {
  const sanitized = sanitizeRehatHtml('<p id="evil" onclick="evil()">Keep <b>seva</b> close.</p><ul><li><p>Share.</p></li></ul><p>Share.</p>')
  const prepared = prepareRehatReadingHtml(sanitized)
  const template = document.createElement('template')
  template.innerHTML = prepared.html
  const blocks = template.content.querySelectorAll('[data-rehat-block]')
  expect(blocks).toHaveLength(3)
  expect(new Set(Array.from(blocks, block => block.id)).size).toBe(3)
  expect(template.content.textContent).toBe('Keep seva close.Share.Share.')
  expect(prepared.html).not.toContain('onclick')
  const highlighted = highlightRehatHtml(prepared.html, 'seva')
  expect(highlighted.html).toContain(blocks[0].id)
  expect(prepareRehatReadingHtml(sanitized).html).toBe(prepared.html)
  const revised = prepareRehatReadingHtml(sanitized + '<p>A corrected source addition.</p>')
  expect(revised.revision).not.toBe(prepared.revision)
  expect(revised.html).not.toContain(`id="${blocks[0].id}"`)
})

test('keeps a fractional point within a paragraph below the measured header after reflow', () => {
  document.body.innerHTML = '<div class="rehat-reader-shell"><header data-reader-header="persistent"></header><article><p data-rehat-block="first">Text</p></article></div>'
  const root = document.querySelector('article')!
  const block = root.querySelector('p')!
  vi.spyOn(document.querySelector('header')!, 'getBoundingClientRect').mockReturnValue(rectangle(0, 100))
  const geometry = vi.spyOn(block, 'getBoundingClientRect').mockReturnValue(rectangle(0, 200))
  const anchor = captureRehatReadingAnchor(root, [block])!
  expect(anchor).toMatchObject({ blockId: 'first', fraction: .58, offset: 0 })
  geometry.mockReturnValue(rectangle(-50, 400))
  expect(restoreRehatReadingAnchor(root, [block], anchor)).toBe(true)
  expect(scrollAppTo).toHaveBeenCalledWith({ top: 366, behavior: 'auto' })
})

test('locates a visible paragraph in a long chapter without measuring every preceding block', () => {
  document.body.innerHTML = '<article></article>'
  const root = document.querySelector('article')!
  const geometry = vi.fn()
  const blocks = Array.from({ length: 1024 }, (_, index) => {
    const block = document.createElement('p')
    block.dataset.rehatBlock = `block-${index}`
    block.getBoundingClientRect = () => { geometry(); return rectangle((index - 800) * 100, 100) }
    return block
  })
  expect(captureRehatReadingAnchor(root, blocks)?.blockId).toBe('block-800')
  expect(geometry.mock.calls.length).toBeLessThan(15)
})
