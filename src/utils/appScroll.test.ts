import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  APP_SCROLL_VIEWPORT_ID,
  addAppScrollSettledListener,
  getAppScrollViewport,
  getAppScrollTop,
  isAppScrollAtEnd,
  lockAppScroll,
  restoreAppScrollTopWhenReady,
  scrollAppHashIntoView,
  scrollAppTo,
} from './appScroll'

function createScrollViewport() {
  const viewport = document.createElement('div')
  viewport.id = APP_SCROLL_VIEWPORT_ID
  document.body.append(viewport)
  return viewport
}

describe('app scroll viewport', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.body.replaceChildren()
  })

  test('routes scroll reads and writes through the explicit viewport', () => {
    const viewport = createScrollViewport()
    const scrollTo = vi.fn()
    Object.defineProperty(viewport, 'scrollTo', { configurable: true, value: scrollTo })
    viewport.scrollTop = 420

    expect(getAppScrollTop()).toBe(420)

    const options = { top: 0, left: 0, behavior: 'auto' as const }
    scrollAppTo(options)
    expect(scrollTo).toHaveBeenCalledWith(options)
  })

  test('does no settled work during active scrolling and cancels the idle fallback on scrollend', () => {
    vi.useFakeTimers()
    const viewport = createScrollViewport()
    const onSettled = vi.fn()
    const removeListener = addAppScrollSettledListener(onSettled)

    viewport.dispatchEvent(new Event('scroll'))
    vi.advanceTimersByTime(179)
    expect(onSettled).not.toHaveBeenCalled()

    viewport.dispatchEvent(new Event('scroll'))
    viewport.dispatchEvent(new Event('scrollend'))
    expect(onSettled).toHaveBeenCalledTimes(1)

    vi.runAllTimers()
    expect(onSettled).toHaveBeenCalledTimes(1)
    removeListener()
  })

  test('computes the end boundary from the app viewport instead of the document root', () => {
    const viewport = createScrollViewport()
    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 800 },
      scrollHeight: { configurable: true, value: 2000 },
    })
    viewport.scrollTop = 1195
    expect(isAppScrollAtEnd()).toBe(false)

    viewport.scrollTop = 1200
    expect(isAppScrollAtEnd()).toBe(true)
  })

  test('locks nested overlays without losing the viewport scroll styles', () => {
    const viewport = createScrollViewport()
    viewport.style.overflowY = 'auto'
    viewport.style.overscrollBehavior = 'contain'

    const releaseFirst = lockAppScroll()
    const releaseSecond = lockAppScroll()
    expect(viewport.style.overflowY).toBe('hidden')
    expect(viewport.style.overscrollBehavior).toBe('none')

    releaseFirst()
    expect(viewport.style.overflowY).toBe('hidden')

    releaseSecond()
    expect(viewport.style.overflowY).toBe('auto')
    expect(viewport.style.overscrollBehavior).toBe('contain')
  })

  test('waits for lazy route content before restoring a saved scroll position', async () => {
    vi.useFakeTimers()
    const viewport = createScrollViewport()
    const scrollTo = vi.fn((options: ScrollToOptions) => {
      viewport.scrollTop = options.top ?? viewport.scrollTop
    })
    Object.defineProperty(viewport, 'scrollTo', { configurable: true, value: scrollTo })
    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 800 },
      scrollHeight: { configurable: true, value: 900 },
    })

    const cancelRestore = restoreAppScrollTopWhenReady(700)
    vi.advanceTimersByTime(0)
    expect(scrollTo).not.toHaveBeenCalled()

    Object.defineProperty(viewport, 'scrollHeight', { configurable: true, value: 1800 })
    viewport.append(document.createElement('main'))
    await Promise.resolve()

    expect(scrollTo).toHaveBeenCalledWith({ top: 700, left: 0, behavior: 'auto' })
    expect(viewport.scrollTop).toBe(700)
    cancelRestore()
  })

  test('resolves a hash target that appears after a lazy route renders', async () => {
    vi.useFakeTimers()
    createScrollViewport()
    const scrollIntoView = vi.spyOn(HTMLElement.prototype, 'scrollIntoView')

    const cancelRestore = scrollAppHashIntoView('#contents')
    vi.advanceTimersByTime(0)
    expect(scrollIntoView).not.toHaveBeenCalled()

    const target = document.createElement('section')
    target.id = 'contents'
    getAppScrollViewport()?.append(target)
    await Promise.resolve()

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' })
    cancelRestore()
  })
})
