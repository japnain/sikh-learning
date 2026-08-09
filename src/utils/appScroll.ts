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
  scrollX: number
  scrollY: number
  href: string
}

let scrollLockCount = 0
let lockedScrollStyles: LockedScrollStyles | null = null
let pendingUnlockRestoreFrame: number | null = null

function getScrollingElement(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement ?? null
}

function getContentObservationRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.getElementById('root') ?? document.body ?? document.documentElement ?? null
}

function getLayoutViewportHeight() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 0
  return document.documentElement?.clientHeight || window.innerHeight || 0
}

function getDocumentScrollHeight() {
  if (typeof document === 'undefined') return 0
  const root = document.documentElement
  const body = document.body
  const scrollingElement = getScrollingElement()

  return Math.max(
    scrollingElement?.scrollHeight ?? 0,
    root?.scrollHeight ?? 0,
    root?.offsetHeight ?? 0,
    root?.clientHeight ?? 0,
    body?.scrollHeight ?? 0,
    body?.offsetHeight ?? 0,
    body?.clientHeight ?? 0
  )
}

export function getAppScrollTop() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 0
  const scrollingElement = getScrollingElement()
  const top = window.scrollY
    || scrollingElement?.scrollTop
    || document.documentElement?.scrollTop
    || document.body?.scrollTop
    || 0
  return Math.max(0, top)
}

export function getAppViewportHeight() {
  if (typeof window === 'undefined') return 0
  return window.visualViewport?.height || getLayoutViewportHeight()
}

export function getAppViewportBounds() {
  if (typeof window === 'undefined') {
    return { top: 0, bottom: 0, height: 0 }
  }

  const top = window.visualViewport?.offsetTop ?? 0
  const height = getAppViewportHeight()
  return {
    top,
    bottom: top + height,
    height,
  }
}

export function scrollAppTo(options: ScrollToOptions) {
  if (typeof window !== 'undefined') {
    window.scrollTo(options)
  }
}

export function scrollElementIntoAppView(element: HTMLElement, options: ScrollIntoViewOptions) {
  element.scrollIntoView(options)
}

export function focusElementWithoutAppScroll(element: HTMLElement) {
  if (typeof window === 'undefined') return

  const scrollX = window.scrollX
  const scrollY = getAppScrollTop()

  try {
    element.focus({ preventScroll: true })
  } catch {
    element.focus()
  }

  if (window.scrollX !== scrollX || getAppScrollTop() !== scrollY) {
    scrollAppTo({ left: scrollX, top: scrollY, behavior: 'auto' })
  }
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

  const contentRoot = getContentObservationRoot()
  if (contentRoot && typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(() => {
      tryScroll()
    })
    observer.observe(contentRoot, {
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
  const contentRoot = getContentObservationRoot()
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
    const maxScrollTop = Math.max(0, getDocumentScrollHeight() - getLayoutViewportHeight())
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

  if (contentRoot && requestedTop > 0) {
    if (typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(() => {
        tryRestore()
      })
      mutationObserver.observe(contentRoot, {
        childList: true,
        subtree: true,
      })
    }

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        tryRestore()
      })
      resizeObserver.observe(contentRoot)
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
  if (typeof document === 'undefined' || typeof window === 'undefined') return false
  const scrollTop = getAppScrollTop()
  const documentHeight = getDocumentScrollHeight()
  return scrollTop > 0
    && documentHeight > 0
    && scrollTop + getLayoutViewportHeight() >= documentHeight - threshold
}

export function addAppScrollSettledListener(
  listener: ScrollListener,
  { idleMs = 180 }: SettledScrollOptions = {}
) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {}

  const supportsScrollEnd = 'onscrollend' in document
  let idleTimer: number | null = null
  let settleFrame: number | null = null
  let postPaintFrame: number | null = null
  let touchActive = false
  let settlePendingForGesture = false
  const activeTouchPointers = new Set<number>()

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

  const hasActiveTouchGesture = () => touchActive || activeTouchPointers.size > 0

  const beginTouchGesture = () => {
    settlePendingForGesture = false
    clearIdleTimer()
    cancelScheduledListener()
  }

  const finishTouchGesture = () => {
    if (hasActiveTouchGesture() || !settlePendingForGesture) return
    settlePendingForGesture = false
    scheduleListenerAfterPaint()
  }

  const handleScroll = () => {
    settlePendingForGesture = false
    cancelScheduledListener()
    clearIdleTimer()

    // Browsers with native scrollend can identify the end of touch momentum.
    // An idle timeout can fire between iOS momentum frames and must only be a
    // fallback for engines that do not expose scrollend.
    if (supportsScrollEnd) return

    idleTimer = window.setTimeout(() => {
      idleTimer = null
      if (hasActiveTouchGesture()) {
        settlePendingForGesture = true
        return
      }
      scheduleListenerAfterPaint()
    }, idleMs)
  }

  const handleScrollEnd = () => {
    clearIdleTimer()
    cancelScheduledListener()
    if (hasActiveTouchGesture()) {
      settlePendingForGesture = true
      return
    }
    settlePendingForGesture = false
    scheduleListenerAfterPaint()
  }

  const handleTouchStart = () => {
    touchActive = true
    beginTouchGesture()
  }

  const handleTouchEnd = (event: TouchEvent) => {
    touchActive = (event.touches?.length ?? 0) > 0
    finishTouchGesture()
  }

  const handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return
    activeTouchPointers.add(event.pointerId)
    beginTouchGesture()
  }

  const handlePointerEnd = (event: PointerEvent) => {
    activeTouchPointers.delete(event.pointerId)
    finishTouchGesture()
  }

  window.addEventListener('scroll', handleScroll, { passive: true })
  if (supportsScrollEnd) {
    document.addEventListener('scrollend', handleScrollEnd, { passive: true })
  }
  document.addEventListener('touchstart', handleTouchStart, { passive: true })
  document.addEventListener('touchend', handleTouchEnd, { passive: true })
  document.addEventListener('touchcancel', handleTouchEnd, { passive: true })
  document.addEventListener('pointerdown', handlePointerDown, { passive: true })
  window.addEventListener('pointerup', handlePointerEnd, { passive: true })
  window.addEventListener('pointercancel', handlePointerEnd, { passive: true })

  return () => {
    clearIdleTimer()
    cancelScheduledListener()
    window.removeEventListener('scroll', handleScroll)
    if (supportsScrollEnd) {
      document.removeEventListener('scrollend', handleScrollEnd)
    }
    document.removeEventListener('touchstart', handleTouchStart)
    document.removeEventListener('touchend', handleTouchEnd)
    document.removeEventListener('touchcancel', handleTouchEnd)
    document.removeEventListener('pointerdown', handlePointerDown)
    window.removeEventListener('pointerup', handlePointerEnd)
    window.removeEventListener('pointercancel', handlePointerEnd)
    activeTouchPointers.clear()
  }
}

export function lockAppScroll() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {}

  const target = document.documentElement
  if (scrollLockCount === 0) {
    if (pendingUnlockRestoreFrame !== null) {
      window.cancelAnimationFrame(pendingUnlockRestoreFrame)
      pendingUnlockRestoreFrame = null
    }

    lockedScrollStyles = {
      target,
      overflow: target.style.overflow,
      overflowY: target.style.overflowY,
      overscrollBehavior: target.style.overscrollBehavior,
      scrollX: Math.max(0, window.scrollX || 0),
      scrollY: getAppScrollTop(),
      href: window.location.href,
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

    pendingUnlockRestoreFrame = window.requestAnimationFrame(() => {
      pendingUnlockRestoreFrame = null
      if (scrollLockCount > 0 || window.location.href !== previous.href) return
      window.scrollTo({
        left: previous.scrollX,
        top: previous.scrollY,
        behavior: 'auto',
      })
    })
  }
}
