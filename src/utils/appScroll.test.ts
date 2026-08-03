import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mockDocumentScroll } from '../test/documentScroll'
import {
  addAppScrollSettledListener,
  getAppScrollTop,
  isAppScrollAtEnd,
  lockAppScroll,
  restoreAppScrollTopWhenReady,
  scrollAppHashIntoView,
  scrollAppTo,
} from './appScroll'

type DocumentScrollMock = ReturnType<typeof mockDocumentScroll>

let documentScroll: DocumentScrollMock | null = null

function createContentRoot() {
  const root = document.createElement('div')
  root.id = 'root'
  document.body.append(root)
  return root
}

describe('native app document scrolling', () => {
  beforeEach(() => {
    document.body.replaceChildren()
    createContentRoot()
  })

  afterEach(() => {
    documentScroll?.restore()
    documentScroll = null
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.documentElement.removeAttribute('style')
    document.body.replaceChildren()
    window.history.replaceState({}, '', '/')
  })

  test('reads and writes through the document scrolling root', () => {
    documentScroll = mockDocumentScroll({ top: 420 })

    expect(getAppScrollTop()).toBe(420)

    const options = { top: 0, left: 0, behavior: 'auto' as const }
    scrollAppTo(options)
    expect(documentScroll.scrollTo).toHaveBeenCalledWith(options)
    expect(documentScroll.getTop()).toBe(0)
  })

  test('clamps negative iOS rubber-band positions', () => {
    documentScroll = mockDocumentScroll({ top: -18 })
    expect(getAppScrollTop()).toBe(0)
  })

  test('does no settled work during active scrolling and cancels the idle fallback on scrollend', () => {
    vi.useFakeTimers()
    documentScroll = mockDocumentScroll()
    const onSettled = vi.fn()
    const removeListener = addAppScrollSettledListener(onSettled)

    window.dispatchEvent(new Event('scroll'))
    vi.advanceTimersByTime(179)
    expect(onSettled).not.toHaveBeenCalled()

    window.dispatchEvent(new Event('scroll'))
    document.dispatchEvent(new Event('scrollend'))
    expect(onSettled).not.toHaveBeenCalled()

    vi.runAllTimers()
    expect(onSettled).toHaveBeenCalledTimes(1)
    removeListener()
  })

  test('computes the end boundary from document metrics', () => {
    documentScroll = mockDocumentScroll({
      top: 1195,
      viewportHeight: 800,
      scrollHeight: 2000,
    })
    expect(isAppScrollAtEnd()).toBe(false)

    documentScroll.setTop(1200)
    expect(isAppScrollAtEnd()).toBe(true)
  })

  test('locks nested overlays on the root and restores styles and position once', () => {
    vi.useFakeTimers()
    documentScroll = mockDocumentScroll({ top: 420 })
    const root = document.documentElement
    root.style.overflowY = 'auto'
    root.style.overscrollBehavior = 'contain'

    const releaseFirst = lockAppScroll()
    const releaseSecond = lockAppScroll()
    expect(root.style.overflow).toBe('hidden')
    expect(root.style.overflowY).toBe('hidden')
    expect(root.style.overscrollBehavior).toBe('none')

    releaseFirst()
    expect(root.style.overflowY).toBe('hidden')

    releaseSecond()
    expect(root.style.overflow).toBe('')
    expect(root.style.overflowY).toBe('auto')
    expect(root.style.overscrollBehavior).toBe('contain')
    expect(documentScroll.scrollTo).not.toHaveBeenCalled()

    vi.runAllTimers()
    expect(documentScroll.scrollTo).toHaveBeenCalledWith({
      left: 0,
      top: 420,
      behavior: 'auto',
    })
  })

  test('does not restore a locked route position after navigation', () => {
    vi.useFakeTimers()
    documentScroll = mockDocumentScroll({ top: 420 })
    const release = lockAppScroll()

    window.history.pushState({}, '', '/next')
    release()
    vi.runAllTimers()

    expect(documentScroll.scrollTo).not.toHaveBeenCalled()
  })

  test('waits for lazy document content before restoring a saved scroll position', async () => {
    vi.useFakeTimers()
    documentScroll = mockDocumentScroll({
      viewportHeight: 800,
      scrollHeight: 900,
    })

    const cancelRestore = restoreAppScrollTopWhenReady(700)
    vi.advanceTimersByTime(0)
    expect(documentScroll.scrollTo).not.toHaveBeenCalled()

    documentScroll.setScrollHeight(1800)
    document.getElementById('root')?.append(document.createElement('main'))
    await Promise.resolve()
    await Promise.resolve()

    expect(documentScroll.scrollTo).toHaveBeenCalledWith({
      top: 700,
      left: 0,
      behavior: 'auto',
    })
    expect(documentScroll.getTop()).toBe(700)
    cancelRestore()
  })

  test('resolves a hash target that appears after a lazy route renders', async () => {
    vi.useFakeTimers()
    documentScroll = mockDocumentScroll()
    const scrollIntoView = vi.spyOn(HTMLElement.prototype, 'scrollIntoView')

    const cancelRestore = scrollAppHashIntoView('#contents')
    vi.advanceTimersByTime(0)
    expect(scrollIntoView).not.toHaveBeenCalled()

    const target = document.createElement('section')
    target.id = 'contents'
    document.getElementById('root')?.append(target)
    await Promise.resolve()
    await Promise.resolve()

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' })
    cancelRestore()
  })
})
