import { describe, expect, test } from 'vitest'
import { getAngTargets } from './appSearch'

describe('getAngTargets', () => {
  test('accepts positive decimal integer digits', () => {
    expect(getAngTargets(' 1 ', 'G')).toEqual([expect.objectContaining({
      source: 'G',
      path: '/study?source=G&ang=1',
    })])
    expect(getAngTargets('001', 'G')).toEqual([expect.objectContaining({
      source: 'G',
      path: '/study?source=G&ang=1',
    })])
    expect(getAngTargets('੧੪੩੦', 'G')).toEqual([expect.objectContaining({
      source: 'G',
      path: '/study?source=G&ang=1430',
    })])
    expect(getAngTargets('१४३०', 'G')).toEqual([expect.objectContaining({
      source: 'G',
      path: '/study?source=G&ang=1430',
    })])
  })

  test.each([
    '0',
    '-1',
    '+1',
    '1.5',
    '1e2',
    'Infinity',
    '12 ang',
    '੧.੫',
  ])('rejects non-positive or non-decimal-integer input %j', query => {
    expect(getAngTargets(query, 'all')).toEqual([])
  })
})
