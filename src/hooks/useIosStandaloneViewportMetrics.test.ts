import { describe, expect, test } from 'vitest'
import { calculateIosStandaloneViewportLoss } from './useIosStandaloneViewportMetrics'

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
})
