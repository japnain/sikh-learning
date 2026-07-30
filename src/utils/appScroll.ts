export const APP_SCROLL_VIEWPORT_ID = 'app-scroll-viewport'

type ScrollListener = () => void

interface SettledScrollOptions {
  idleMs?: number
}

interface DeferredScrollOptions {
  timeoutMs?: number
}

interface LockedScrollStyles {
  target: HTMLElement
  overflow: string
  overflowY: string
  overscrollBehavior: string
}

let scrollLockCount = 0
let lockedScrollStyles: LockedScrollStyles | null = null

function getFallbackScrollTop() {
  if (typeof window === 'undefined') return 0
  return window.scrollY || document.documentElement?.scrollTop || 0
}

export function getAppScrollViewport(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.getElementById(APP_SCROLL_VIEWPORT_ID)
}

export function getAppScrollTop() {
  return getAppScrollViewport()?.scrollTop ?? getFallbackScrollTop()
}

export function getAppViewportHeight() {
  const viewport = getAppScrollViewport()
  if (viewport?.clientHeight) return viewport.clientHeight
  return typeof window === 'undefined' ? 0 : window.innerHeight
}

export function getAppViewportBounds() {
  const viewport = getAppScrollViewport()
  if (!viewport) {
    const height = getAppViewportHeight()
    return { top: 0, bottom: height, height }
  }

  const rect = viewport.getBoundingClientRect()
  const height = viewport.clientHeight || rect.height
  return {
    top: rect.top,
    bottom: rect.top + height,
    height,
  }
}

export function scrollAppTo(options: ScrollToOptions) {
  const viewport = getAppScrollViewport()
  if (viewport) {
    if (typeof viewport.scrollTo === 'function') {
      viewport.scrollTo(options)
    } else if (typeof options.top === 'number') {
      viewport.scrollTop = options.top
    }
    return
  }

  if (typeof window !== 'undefined') {
    window.scrollTo(options)
  }
}

export function scrollElementIntoAppView(element: HTMLElement, options: ScrollIntoViewOptions) {
  element.scrollIntoView(options)
}

export function scrollAppHashIntoView(
  hash: string,
  { timeoutMs = 15000 }: DeferredScrollOptions = {}
) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {}

  let targetId: string
  try {
    targetId = decodeURIComponent(hash.replace(/^#/, ''))
  } catch {
    return () => {}
  }
  if (!targetId) return () => {}

  let cancelled = false
  let frame: number | null = null
  let timeout: number | null = null
  let observer: MutationObserver | null = null

  const cleanup = () => {
    if (frame !== null) window.cancelAnimationFrame(frame)
    if (timeout !== null) window.clearTimeout(timeout)
    observer?.disconnect()
    frame = null
    timeout = null
    observer = null
  }

  const tryScroll = () => {
    if (cancelled) return false
    const target = document.getElementById(targetId)
    if (!target) return false
    scrollElementIntoAppView(target, { block: 'start', behavior: 'auto' })
    cleanup()
    return true
  }

  frame = window.requestAnimationFrame(() => {
    frame = null
    tryScroll()
  })

  if (typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(() => {
      tryScroll()
    })
    observer.observe(getAppScrollViewport() ?? document.body, {
      childList: true,
      subtree: true,
    })
  }

  timeout = window.setTimeout(cleanup, timeoutMs)

  return () => {
    cancelled = true
    cleanup()
  }
}

export function restoreAppScrollTopWhenReady(
  top: number,
  { timeoutMs = 15000 }: DeferredScrollOptions = {}
) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {}

  const requestedTop = Number.isFinite(top) ? Math.max(0, top) : 0
  const viewport = getAppScrollViewport()
  let cancelled = false
  let frame: number | null = null
  let timeout: number | null = null
  let mutationObserver: MutationObserver | null = null
  let resizeObserver: ResizeObserver | null = null

  const cleanup = () => {
    if (frame !== null) window.cancelAnimationFrame(frame)
    if (timeout !== null) window.clearTimeout(timeout)
    mutationObserver?.disconnect()
    resizeObserver?.disconnect()
    frame = null
    timeout = null
    mutationObserver = null
    resizeObserver = null
  }

  const tryRestore = (force = false) => {
    if (cancelled) return false
    if (!viewport || requestedTop === 0) {
      scrollAppTo({ top: requestedTop, left: 0, behavior: 'auto' })
      cleanup()
      return true
    }

    const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight)
    if (!force && requestedTop > maxScrollTop + 1) return false

    scrollAppTo({
      top: Math.min(requestedTop, maxScrollTop),
      left: 0,
      behavior: 'auto',
    })
    cleanup()
    return true
  }

  frame = window.requestAnimationFrame(() => {
    frame = null
    tryRestore()
  })

  if (viewport && requestedTop > 0) {
    if (typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(() => {
        tryRestore()
      })
      mutationObserver.observe(viewport, {
        childList: true,
        subtree: true,
      })
    }

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        tryRestore()
      })
      resizeObserver.observe(viewport.firstElementChild ?? viewport)
    }
  }

  timeout = window.setTimeout(() => {
    timeout = null
    tryRestore(true)
  }, timeoutMs)

  return () => {
    cancelled = true
    cleanup()
  }
}

export function isAppScrollAtEnd(threshold = 4) {
  const viewport = getAppScrollViewport()
  if (viewport) {
    return viewport.scrollTop > 0
      && viewport.scrollHeight > 0
      && viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - threshold
  }

  if (typeof document === 'undefined' || typeof window === 'undefined') return false
  const root = document.documentElement
  const scrollTop = getFallbackScrollTop()
  const documentHeight = Math.max(root.scrollHeight, document.body?.scrollHeight ?? 0)
  return scrollTop > 0
    && documentHeight > 0
    && scrollTop + window.innerHeight >= documentHeight - threshold
}

export function addAppScrollSettledListener(
  listener: ScrollListener,
  { idleMs = 180 }: SettledScrollOptions = {}
) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {}

  const viewport = getAppScrollViewport()
  const scrollTarget: EventTarget = viewport ?? window
  const scrollEndTarget: EventTarget = viewport ?? document
  let idleTimer: number | null = null
  let settleFrame: number | null = null
  let postPaintFrame: number | null = null

  const clearIdleTimer = () => {
    if (idleTimer === null) return
    window.clearTimeout(idleTimer)
    idleTimer = null
  }

  const cancelScheduledListener = () => {
    if (settleFrame !== null) window.cancelAnimationFrame(settleFrame)
    if (postPaintFrame !== null) window.cancelAnimationFrame(postPaintFrame)
    settleFrame = null
    postPaintFrame = null
  }

  const scheduleListenerAfterPaint = () => {
    cancelScheduledListener()
    settleFrame = window.requestAnimationFrame(() => {
      settleFrame = null
      postPaintFrame = window.requestAnimationFrame(() => {
        postPaintFrame = null
        listener()
      })
    })
  }

  const handleScroll = () => {
    cancelScheduledListener()
    clearIdleTimer()
    idleTimer = window.setTimeout(() => {
      idleTimer = null
      scheduleListenerAfterPaint()
    }, idleMs)
  }

  const handleScrollEnd = () => {
    clearIdleTimer()
    scheduleListenerAfterPaint()
  }

  scrollTarget.addEventListener('scroll', handleScroll, { passive: true })
  scrollEndTarget.addEventListener('scrollend', handleScrollEnd, { passive: true })

  return () => {
    clearIdleTimer()
    cancelScheduledListener()
    scrollTarget.removeEventListener('scroll', handleScroll)
    scrollEndTarget.removeEventListener('scrollend', handleScrollEnd)
  }
}

export function lockAppScroll() {
  if (typeof document === 'undefined') return () => {}

  const target = getAppScrollViewport() ?? document.documentElement
  if (scrollLockCount === 0) {
    lockedScrollStyles = {
      target,
      overflow: target.style.overflow,
      overflowY: target.style.overflowY,
      overscrollBehavior: target.style.overscrollBehavior,
    }
    target.style.overflow = 'hidden'
    target.style.overflowY = 'hidden'
    target.style.overscrollBehavior = 'none'
  }
  scrollLockCount += 1

  let released = false
  return () => {
    if (released) return
    released = true
    scrollLockCount = Math.max(0, scrollLockCount - 1)
    if (scrollLockCount > 0 || !lockedScrollStyles) return

    const previous = lockedScrollStyles
    lockedScrollStyles = null
    previous.target.style.overflow = previous.overflow
    previous.target.style.overflowY = previous.overflowY
    previous.target.style.overscrollBehavior = previous.overscrollBehavior
  }
}
