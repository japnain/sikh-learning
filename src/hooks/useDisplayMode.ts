import { useEffect, useState } from 'react'

type DisplayMode = 'browser' | 'standalone'

function getDisplayMode(): DisplayMode {
  if (typeof window === 'undefined') return 'browser'

  const browserNavigator = window.navigator as Navigator & { standalone?: boolean }
  const standaloneFromMedia = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false
  const standaloneFromSafari = Boolean(browserNavigator.standalone)

  return standaloneFromMedia || standaloneFromSafari ? 'standalone' : 'browser'
}

export function useDisplayMode(): DisplayMode {
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => getDisplayMode())

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(display-mode: standalone)')
    const updateDisplayMode = () => {
      setDisplayMode(getDisplayMode())
    }

    updateDisplayMode()

    if (!mediaQuery) return

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateDisplayMode)
      return () => mediaQuery.removeEventListener('change', updateDisplayMode)
    }

    mediaQuery.addListener?.(updateDisplayMode)
    return () => mediaQuery.removeListener?.(updateDisplayMode)
  }, [])

  return displayMode
}
