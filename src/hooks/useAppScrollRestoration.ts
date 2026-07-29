import { useLayoutEffect, useRef, type RefObject } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import {
  getAppScrollTop,
  restoreAppScrollTopWhenReady,
  scrollAppHashIntoView,
} from '../utils/appScroll'

const STORAGE_KEY = 'naamras-app-scroll-positions-v1'
const MAX_STORED_POSITIONS = 50

interface StoredPosition {
  id: string
  top: number
}

interface LocationSnapshot {
  key: string
  pathname: string
  search: string
  hash: string
}

interface UseAppScrollRestorationOptions {
  mainContentRef: RefObject<HTMLElement | null>
  enabled?: boolean
  routeHandlesOwnHash?: boolean
}

function locationId(location: LocationSnapshot) {
  return `${location.key}:${location.pathname}${location.search}${location.hash}`
}

function readStoredPositions() {
  const positions = new Map<string, number>()
  if (typeof window === 'undefined') return positions

  try {
    const stored = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? '[]') as unknown
    if (!Array.isArray(stored)) return positions

    stored.slice(-MAX_STORED_POSITIONS).forEach(entry => {
      if (
        typeof entry === 'object'
        && entry !== null
        && typeof (entry as StoredPosition).id === 'string'
        && typeof (entry as StoredPosition).top === 'number'
        && Number.isFinite((entry as StoredPosition).top)
        && (entry as StoredPosition).top >= 0
      ) {
        positions.set((entry as StoredPosition).id, (entry as StoredPosition).top)
      }
    })
  } catch {
    // Invalid session data should never block navigation.
  }

  return positions
}

function persistStoredPositions(positions: Map<string, number>) {
  if (typeof window === 'undefined') return

  const entries = Array.from(positions, ([id, top]) => ({ id, top }))
    .slice(-MAX_STORED_POSITIONS)

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Scroll restoration is best-effort when storage is unavailable or full.
  }
}

export function useAppScrollRestoration({
  mainContentRef,
  enabled = true,
  routeHandlesOwnHash = false,
}: UseAppScrollRestorationOptions) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const positionsRef = useRef<Map<string, number> | null>(null)
  const previousLocationRef = useRef<LocationSnapshot | null>(null)

  if (positionsRef.current === null) {
    positionsRef.current = readStoredPositions()
  }

  useLayoutEffect(() => {
    if (!('scrollRestoration' in window.history)) return
    const previousMode = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => {
      window.history.scrollRestoration = previousMode
    }
  }, [])

  const currentLocationId = locationId({
    key: location.key,
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
  })

  useLayoutEffect(() => {
    if (!enabled) return

    const saveCurrentPosition = () => {
      const positions = positionsRef.current
      if (!positions) return

      positions.delete(currentLocationId)
      positions.set(currentLocationId, getAppScrollTop())
      while (positions.size > MAX_STORED_POSITIONS) {
        const oldestId = positions.keys().next().value
        if (typeof oldestId !== 'string') break
        positions.delete(oldestId)
      }
      persistStoredPositions(positions)
    }

    const saveBeforeLinkNavigation = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null
      if (!target || target.target || target.hasAttribute('download')) return

      try {
        const destination = new URL(target.href, window.location.href)
        if (destination.origin !== window.location.origin || destination.href === window.location.href) return
        saveCurrentPosition()
      } catch {
        // Ignore malformed or non-URL href values.
      }
    }

    document.addEventListener('click', saveBeforeLinkNavigation, true)
    window.addEventListener('popstate', saveCurrentPosition)
    window.addEventListener('pagehide', saveCurrentPosition)
    return () => {
      document.removeEventListener('click', saveBeforeLinkNavigation, true)
      window.removeEventListener('popstate', saveCurrentPosition)
      window.removeEventListener('pagehide', saveCurrentPosition)
      saveCurrentPosition()
    }
  }, [currentLocationId, enabled])

  useLayoutEffect(() => {
    if (!enabled) {
      previousLocationRef.current = null
      return
    }

    const currentLocation: LocationSnapshot = {
      key: location.key,
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    }
    const previousLocation = previousLocationRef.current
    previousLocationRef.current = currentLocation
    const pathChanged = previousLocation?.pathname !== currentLocation.pathname
    const storedTop = positionsRef.current?.get(currentLocationId)
    let cancelScroll = () => {}
    let focusFrame: number | null = null

    if (currentLocation.hash) {
      if (!routeHandlesOwnHash) {
        cancelScroll = scrollAppHashIntoView(currentLocation.hash)
      }
    } else if (typeof storedTop === 'number' && (navigationType === 'POP' || !previousLocation)) {
      cancelScroll = restoreAppScrollTopWhenReady(storedTop)
    } else if (pathChanged) {
      cancelScroll = restoreAppScrollTopWhenReady(0)
    }

    if (previousLocation && pathChanged && !currentLocation.hash) {
      focusFrame = window.requestAnimationFrame(() => {
        focusFrame = null
        mainContentRef.current?.focus({ preventScroll: true })
      })
    }

    return () => {
      cancelScroll()
      if (focusFrame !== null) window.cancelAnimationFrame(focusFrame)
    }
  }, [
    currentLocationId,
    enabled,
    location.hash,
    location.key,
    location.pathname,
    location.search,
    mainContentRef,
    navigationType,
    routeHandlesOwnHash,
  ])
}
