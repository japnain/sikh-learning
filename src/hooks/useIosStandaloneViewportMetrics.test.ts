import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  calculateIosStandaloneViewportLoss,
  useIosStandaloneViewportMetrics,
} from './useIosStandaloneViewportMetrics'

const affectedIphone = {
  isIosStandalone: true,
  hasEditableFocus: false,
  innerWidth: 393,
  innerHeight: 793,
  clientHeight: 793,
  screenWidth: 393,
  screenHeight: 852,
  devicePixelRatio: 3,
}

describe('iOS standalone viewport metrics', () => {
  afterEach(() => {
    Object.defineProperty(window.navigator, 'standalone', {
      value: false,
      configurable: true,
    })
    document.documentElement.style.removeProperty('--ios-standalone-viewport-loss')
    delete document.documentElement.dataset.iosStandaloneViewport
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('detects the system-owned strip in the affected iPhone viewport', () => {
    expect(calculateIosStandaloneViewportLoss(affectedIphone)).toBe(59)
  })

  test('keeps a healthy full-cover iPhone unchanged', () => {
    expect(calculateIosStandaloneViewportLoss({
      ...affectedIphone,
      innerHeight: 852,
      clientHeight: 852,
    })).toBe(0)
  })

  test('never applies the workaround to Safari tabs or non-iOS standalone apps', () => {
    expect(calculateIosStandaloneViewportLoss({
      ...affectedIphone,
      isIosStandalone: false,
    })).toBe(0)
  })

  test('uses the physical block axis when legacy iOS screen dimensions stay portrait', () => {
    expect(calculateIosStandaloneViewportLoss({
      ...affectedIphone,
      innerWidth: 852,
      innerHeight: 334,
      clientHeight: 334,
    })).toBe(59)
  })

  test('preserves the last stable loss during keyboard-sized or focused transients', () => {
    expect(calculateIosStandaloneViewportLoss({
      ...affectedIphone,
      innerHeight: 500,
      clientHeight: 500,
    }, 59)).toBe(59)

    expect(calculateIosStandaloneViewportLoss({
      ...affectedIphone,
      hasEditableFocus: true,
      innerHeight: 500,
      clientHeight: 500,
    }, 59)).toBe(59)
  })

  test('ignores one-pixel viewport rounding noise', () => {
    expect(calculateIosStandaloneViewportLoss({
      ...affectedIphone,
      innerHeight: 851,
      clientHeight: 851,
    })).toBe(0)
  })

  test('does not observe or mutate viewport metrics in an ordinary Safari tab', () => {
    const root = document.documentElement
    const setProperty = vi.spyOn(root.style, 'setProperty')
    const addEventListener = vi.spyOn(window, 'addEventListener')

    const { unmount } = renderHook(() => useIosStandaloneViewportMetrics())

    expect(setProperty).not.toHaveBeenCalled()
    expect(root.dataset.iosStandaloneViewport).toBeUndefined()
    expect(addEventListener).not.toHaveBeenCalledWith('resize', expect.any(Function))
    unmount()
  })

  test('does not rewrite unchanged metrics during standalone resize events', () => {
    vi.useFakeTimers()
    Object.defineProperty(window.navigator, 'standalone', {
      value: true,
      configurable: true,
    })
    const root = document.documentElement
    const setProperty = vi.spyOn(root.style, 'setProperty')

    const { unmount } = renderHook(() => useIosStandaloneViewportMetrics())
    expect(setProperty).toHaveBeenCalledTimes(1)

    window.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new Event('resize'))
    vi.runAllTimers()

    expect(setProperty).toHaveBeenCalledTimes(1)
    unmount()
  })
})
