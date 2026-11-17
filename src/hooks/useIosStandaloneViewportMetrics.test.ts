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
    document.documentElement.style.removeProperty('--nav-viewport-loss')
    delete document.documentElement.dataset.iosStandaloneViewport
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
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
    expect(setProperty).toHaveBeenCalledTimes(2)

    window.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new Event('resize'))
    vi.runAllTimers()

    expect(setProperty).toHaveBeenCalledTimes(2)
    unmount()
  })

  function mockStandaloneViewport(height = 793) {
    vi.useFakeTimers()
    Object.defineProperty(window.navigator, 'standalone', {
      value: true,
      configurable: true,
    })
    vi.spyOn(window.screen, 'width', 'get').mockReturnValue(393)
    vi.spyOn(window.screen, 'height', 'get').mockReturnValue(852)
    const clientHeight = vi.spyOn(document.documentElement, 'clientHeight', 'get')
    const setDimensions = (width: number, nextHeight: number) => {
      vi.stubGlobal('innerWidth', width)
      vi.stubGlobal('innerHeight', nextHeight)
      clientHeight.mockReturnValue(nextHeight)
    }
    setDimensions(393, height)
    return setDimensions
  }

  test.each([
    { initialHeight: 793, nextHeight: 852, navLoss: '59px', globalLoss: '0px', mode: 'full' },
    { initialHeight: 852, nextHeight: 793, navLoss: '0px', globalLoss: '59px', mode: 'short' },
  ])('preserves navigation padding while the global viewport changes to $mode during scrolling', ({ initialHeight, nextHeight, navLoss, globalLoss, mode }) => {
    const setDimensions = mockStandaloneViewport(initialHeight)
    const root = document.documentElement
    const { unmount } = renderHook(() => useIosStandaloneViewportMetrics())
    expect(root.style.getPropertyValue('--ios-standalone-viewport-loss')).toBe(navLoss)
    expect(root.style.getPropertyValue('--nav-viewport-loss')).toBe(navLoss)

    setDimensions(393, nextHeight)
    window.dispatchEvent(new Event('resize'))
    vi.runAllTimers()

    expect(root.style.getPropertyValue('--ios-standalone-viewport-loss')).toBe(globalLoss)
    expect(root.style.getPropertyValue('--nav-viewport-loss')).toBe(navLoss)
    expect(root.dataset.iosStandaloneViewport).toBe(mode)
    unmount()
  })

  test('remeasures when an actual width change changes the viewport orientation', () => {
    const setDimensions = mockStandaloneViewport()
    const root = document.documentElement
    const { unmount } = renderHook(() => useIosStandaloneViewportMetrics())
    expect(root.style.getPropertyValue('--ios-standalone-viewport-loss')).toBe('59px')
    expect(root.style.getPropertyValue('--nav-viewport-loss')).toBe('59px')

    setDimensions(852, 393)
    window.dispatchEvent(new Event('resize'))
    vi.runAllTimers()

    expect(root.style.getPropertyValue('--ios-standalone-viewport-loss')).toBe('0px')
    expect(root.style.getPropertyValue('--nav-viewport-loss')).toBe('0px')
    expect(root.dataset.iosStandaloneViewport).toBe('full')
    unmount()
  })

  test.each(['pageshow', 'orientationchange'])('refreshes viewport padding on %s even when the width is unchanged', eventType => {
    const setDimensions = mockStandaloneViewport()
    const root = document.documentElement
    const { unmount } = renderHook(() => useIosStandaloneViewportMetrics())
    expect(root.style.getPropertyValue('--ios-standalone-viewport-loss')).toBe('59px')
    expect(root.style.getPropertyValue('--nav-viewport-loss')).toBe('59px')

    setDimensions(393, 852)
    window.dispatchEvent(new Event('resize'))
    vi.runAllTimers()
    expect(root.style.getPropertyValue('--ios-standalone-viewport-loss')).toBe('0px')
    expect(root.style.getPropertyValue('--nav-viewport-loss')).toBe('59px')

    window.dispatchEvent(new Event(eventType))
    window.dispatchEvent(new Event('resize'))
    vi.runAllTimers()

    expect(root.style.getPropertyValue('--ios-standalone-viewport-loss')).toBe('0px')
    expect(root.style.getPropertyValue('--nav-viewport-loss')).toBe('0px')
    expect(root.dataset.iosStandaloneViewport).toBe('full')
    unmount()
  })

  test('preserves the correction when a lifecycle refresh happens with the keyboard focused', () => {
    const setDimensions = mockStandaloneViewport()
    const root = document.documentElement
    const { unmount } = renderHook(() => useIosStandaloneViewportMetrics())
    const input = document.createElement('input')
    document.body.append(input)
    input.focus()
    setDimensions(393, 852)
    window.dispatchEvent(new Event('pageshow'))
    vi.runAllTimers()

    expect(root.style.getPropertyValue('--ios-standalone-viewport-loss')).toBe('59px')
    expect(root.style.getPropertyValue('--nav-viewport-loss')).toBe('59px')
    expect(root.dataset.iosStandaloneViewport).toBe('short')
    input.remove()
    unmount()
  })

  test('clears both viewport corrections and pending refreshes on unmount', () => {
    const setDimensions = mockStandaloneViewport()
    const root = document.documentElement
    const { unmount } = renderHook(() => useIosStandaloneViewportMetrics())
    setDimensions(393, 852)
    window.dispatchEvent(new Event('pageshow'))
    unmount()
    vi.runAllTimers()

    expect(root.style.getPropertyValue('--ios-standalone-viewport-loss')).toBe('')
    expect(root.style.getPropertyValue('--nav-viewport-loss')).toBe('')
    expect(root.dataset.iosStandaloneViewport).toBeUndefined()
  })
})
