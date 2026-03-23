import { describe, it, expect } from 'vitest'
import { getUpdatedStreak, isStreakAlive } from './streak'

describe('getUpdatedStreak', () => {
  it('increments streak when first swipe today and studied yesterday', () => {
    const result = getUpdatedStreak({ streak: 3, lastStudied: '2026-03-21' }, '2026-03-22')
    expect(result).toEqual({ streak: 4, lastStudied: '2026-03-22' })
  })

  it('keeps streak same when already studied today', () => {
    const result = getUpdatedStreak({ streak: 3, lastStudied: '2026-03-22' }, '2026-03-22')
    expect(result).toEqual({ streak: 3, lastStudied: '2026-03-22' })
  })

  it('resets streak to 1 when missed a day', () => {
    const result = getUpdatedStreak({ streak: 5, lastStudied: '2026-03-20' }, '2026-03-22')
    expect(result).toEqual({ streak: 1, lastStudied: '2026-03-22' })
  })

  it('starts streak at 1 on first ever study', () => {
    const result = getUpdatedStreak({ streak: 0, lastStudied: null }, '2026-03-22')
    expect(result).toEqual({ streak: 1, lastStudied: '2026-03-22' })
  })
})

describe('isStreakAlive', () => {
  it('returns true if studied today', () => {
    expect(isStreakAlive('2026-03-22', '2026-03-22')).toBe(true)
  })

  it('returns true if studied yesterday', () => {
    expect(isStreakAlive('2026-03-21', '2026-03-22')).toBe(true)
  })

  it('returns false if missed more than one day', () => {
    expect(isStreakAlive('2026-03-20', '2026-03-22')).toBe(false)
  })
})
