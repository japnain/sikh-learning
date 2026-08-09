import { useLayoutEffect } from 'react'

interface IosStandaloneViewportMetrics {
  isIosStandalone: boolean
  hasEditableFocus: boolean
  innerWidth: number
  innerHeight: number
  clientHeight: number
  screenWidth: number
  screenHeight: number
  devicePixelRatio: number
}

const MIN_MEANINGFUL_LOSS = 2
const MAX_VIEWPORT_LOSS = 96
const MAX_VIEWPORT_LOSS_RATIO = 0.15

export function calculateIosStandaloneViewportLoss(
  metrics: IosStandaloneViewportMetrics,
  previousLoss = 0
) {
  if (!metrics.isIosStandalone) return 0
  if (metrics.hasEditableFocus) return previousLoss

  const portrait = metrics.innerHeight >= metrics.innerWidth
  const screenBlockSize = portrait
    ? Math.max(metrics.screenWidth, metrics.screenHeight)
    : Math.min(metrics.screenWidth, metrics.screenHeight)
  const layoutHeight = Math.max(metrics.clientHeight, metrics.innerHeight)

  if (screenBlockSize <= 0 || layoutHeight <= 0) return previousLoss

  const rawLoss = Math.max(0, screenBlockSize - layoutHeight)
  const lossCeiling = Math.min(
    MAX_VIEWPORT_LOSS,
    Math.ceil(screenBlockSize * MAX_VIEWPORT_LOSS_RATIO)
  )
  if (rawLoss < MIN_MEANINGFUL_LOSS) return 0
  if (rawLoss > lossCeiling) return previousLoss

  const pixelRatio = Math.max(1, metrics.devicePixelRatio || 1)
  return Math.round(rawLoss * pixelRatio) / pixelRatio
}

function hasEditableFocus() {
  const activeElement = document.activeElement
  return activeElement instanceof HTMLElement
    && activeElement.matches(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
    )
}

function measureViewportLoss(previousLoss: number) {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean }
  return calculateIosStandaloneViewportLoss({
    isIosStandalone: navigatorWithStandalone.standalone === true,
    hasEditableFocus: hasEditableFocus(),
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    clientHeight: document.documentElement.clientHeight,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    devicePixelRatio: window.devicePixelRatio,
  }, previousLoss)
}

export function useIosStandaloneViewportMetrics() {
  useLayoutEffect(() => {
    const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean }
    if (navigatorWithStandalone.standalone !== true) return

    const root = document.documentElement
    let stableLoss = 0
    let lastAppliedLoss: number | null = null
    let firstFrame: number | null = null
    let secondFrame: number | null = null

    const applyMeasurement = () => {
      stableLoss = measureViewportLoss(stableLoss)
      if (stableLoss === lastAppliedLoss) return

      lastAppliedLoss = stableLoss
      root.style.setProperty('--ios-standalone-viewport-loss', `${stableLoss}px`)
      root.dataset.iosStandaloneViewport = stableLoss > 0 ? 'short' : 'full'
    }

    const cancelScheduledMeasurement = () => {
      if (firstFrame !== null) window.cancelAnimationFrame(firstFrame)
      if (secondFrame !== null) window.cancelAnimationFrame(secondFrame)
      firstFrame = null
      secondFrame = null
    }

    const scheduleMeasurement = () => {
      cancelScheduledMeasurement()
      firstFrame = window.requestAnimationFrame(() => {
        firstFrame = null
        secondFrame = window.requestAnimationFrame(() => {
          secondFrame = null
          applyMeasurement()
        })
      })
    }

    applyMeasurement()
    window.addEventListener('pageshow', scheduleMeasurement)
    window.addEventListener('orientationchange', scheduleMeasurement)
    window.addEventListener('resize', scheduleMeasurement)

    return () => {
      cancelScheduledMeasurement()
      window.removeEventListener('pageshow', scheduleMeasurement)
      window.removeEventListener('orientationchange', scheduleMeasurement)
      window.removeEventListener('resize', scheduleMeasurement)
      root.style.removeProperty('--ios-standalone-viewport-loss')
      delete root.dataset.iosStandaloneViewport
    }
  }, [])
}
