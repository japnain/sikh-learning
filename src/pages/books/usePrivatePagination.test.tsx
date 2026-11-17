import { act, renderHook } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest'
import { privateColumnCount, usePrivatePagination } from './usePrivatePagination'
import type { PrivateTextLocator } from './privateTextLocator'

const geometry = vi.hoisted(() => ({ visible: vi.fn(), page: vi.fn() }))
vi.mock('./privateTextLocator', () => ({ findPrivateVisibleLocator: geometry.visible, privateTextLocatorPage: geometry.page }))

function fixture(initial: PrivateTextLocator | null = null) {
  const locator = { current: initial }
  const edge = { current: null as 'start' | 'end' | null }
  const onPosition = vi.fn()
  let width = 300
  let scrollWidth = 980
  const viewport = document.createElement('div')
  const pages = document.createElement('div')
  viewport.append(pages)
  document.body.append(viewport)
  pages.style.columnGap = '40px'
  Object.defineProperty(viewport, 'clientWidth', { get: () => width })
  Object.defineProperty(pages, 'scrollWidth', { get: () => scrollWidth })
  vi.spyOn(viewport, 'getBoundingClientRect').mockImplementation(() => ({ left: 20, top: 80, right: 20 + width, bottom: 680, width, height: 600, x: 20, y: 80, toJSON: () => ({}) }))
  const hook = renderHook(({ chapterKey, layoutKey }) => usePrivatePagination({ enabled: true, ready: true, chapterKey, layoutKey, locator, edge, onPosition }),
    { initialProps: { chapterKey: 'chapter-one', layoutKey: 'default' } })
  hook.result.current.viewportRef.current = viewport
  hook.result.current.pagesRef.current = pages
  const measure = () => act(() => { vi.advanceTimersByTime(25) })
  measure()
  return { hook, locator, edge, pages, viewport, onPosition, measure,
    resize: (nextWidth: number, nextScrollWidth: number) => { width = nextWidth; scrollWidth = nextScrollWidth; window.dispatchEvent(new Event('resize')); measure() } }
}

describe('private chapter pagination', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    geometry.visible.mockReset().mockReturnValue({ blockId: 'body', charOffset: 80 })
    geometry.page.mockReset().mockReturnValue(0)
  })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = '' })

  test('counts complete columns without inventing a page for a fractional rounding pixel', () => {
    expect(privateColumnCount(980, 300, 40)).toBe(3)
    expect(privateColumnCount(980.4, 300, 40)).toBe(3)
    expect(privateColumnCount(300, 300, 40)).toBe(1)
    expect(privateColumnCount(0, 0, 40)).toBe(1)
  })

  test('turns within the chapter, persists the source position immediately, and reports the boundary', () => {
    const view = fixture()
    expect(view.hook.result.current.count).toBe(3)
    geometry.visible.mockReturnValue({ blockId: 'body', charOffset: 900 })
    act(() => { expect(view.hook.result.current.setPage(1)).toBe(true) })
    expect(view.pages.style.transform).toBe('translateX(-340px)')
    expect(view.locator.current).toEqual({ blockId: 'body', charOffset: 900 })
    expect(view.onPosition).toHaveBeenLastCalledWith({ blockId: 'body', charOffset: 900 }, 1, 3, true)
    act(() => { view.hook.result.current.setPage(100) })
    expect(view.hook.result.current.page).toBe(2)
    act(() => { expect(view.hook.result.current.setPage(3)).toBe(false) })
    view.hook.unmount()
  })

  test('resolves the same character again after font and viewport reflow', () => {
    const saved = { blockId: 'long-paragraph', charOffset: 1200 }
    geometry.visible.mockReturnValue(saved)
    geometry.page.mockReturnValue(1)
    const view = fixture(saved)
    expect(view.hook.result.current.page).toBe(1)
    geometry.page.mockReturnValue(2)
    geometry.visible.mockReturnValue({ blockId: 'earlier-page-boundary', charOffset: 0 })
    view.resize(220, 1260)
    expect(geometry.page).toHaveBeenLastCalledWith(view.pages, saved, 20, 260, 1)
    expect(view.hook.result.current.page).toBe(2)
    expect(view.pages.style.transform).toBe('translateX(-520px)')
    geometry.page.mockReturnValue(3)
    view.hook.rerender({ chapterKey: 'chapter-one', layoutKey: 'large-type' })
    view.measure()
    expect(view.hook.result.current.page).toBe(3)
    expect(view.locator.current).toEqual(saved)
    expect(view.onPosition).toHaveBeenLastCalledWith(saved, 3, 5, false)
    view.hook.unmount()
  })

  test('opens the last page of a previous chapter without retaining the next chapter locator', () => {
    const view = fixture()
    view.edge.current = 'end'
    view.locator.current = null
    view.hook.rerender({ chapterKey: 'earlier-chapter', layoutKey: 'default' })
    view.measure()
    expect(view.hook.result.current.page).toBe(2)
    expect(view.edge.current).toBeNull()
    expect(view.viewport).toHaveAttribute('data-reader-page', '2')
    view.hook.unmount()
  })

  test('removes offscreen source links from Tab order and clears accidental internal scroll', () => {
    const view = fixture()
    const link = document.createElement('button')
    link.textContent = 'Source note'
    view.pages.append(link)
    vi.spyOn(link, 'getClientRects').mockImplementation(() => {
      const shift = Number(/translateX\((-?[\d.]+)px\)/.exec(view.pages.style.transform)?.[1] || 0)
      return [{ left: 710 + shift, right: 790 + shift, top: 100, bottom: 140, width: 80, height: 40 }] as unknown as DOMRectList
    })
    act(() => view.hook.result.current.refresh())
    expect(link).toHaveAttribute('tabindex', '-1')
    view.viewport.scrollLeft = 680
    view.viewport.scrollTop = 80
    act(() => view.hook.result.current.setPage(2))
    expect(view.viewport.scrollLeft).toBe(0)
    expect(view.viewport.scrollTop).toBe(0)
    expect(link).not.toHaveAttribute('tabindex')
    view.hook.unmount()
  })

  test('curl copies are inert, contain no source IDs, and are removed after the turn', () => {
    const view = fixture()
    view.viewport.dataset.pageTurn = 'curl'
    view.pages.innerHTML = '<section id="source" data-source-id="source"><div data-source-text>Original text</div></section>'
    act(() => view.hook.result.current.setPage(1))
    const leaf = view.viewport.querySelector('.private-reader-book-turn-leaf')!
    expect(leaf).toHaveAttribute('inert')
    expect(leaf).toHaveAttribute('aria-hidden', 'true')
    expect(leaf.querySelector('[id],[data-source-id],[data-source-text]')).toBeNull()
    act(() => { vi.advanceTimersByTime(350) })
    expect(view.viewport.querySelector('.private-reader-book-turn-leaf')).toBeNull()
    view.hook.unmount()
  })
})
