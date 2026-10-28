import { describe, expect, test } from 'vitest'
import { getSourceBrowsePage, parseSourceUnit } from './sourceBrowse'

describe('source destination numbers', () => {
  test.each(['1430', '੧੪੩੦', '१४३०', '١٤٣٠', '۱۴۳۰', '１４３０'])('accepts supported numeral script %s', value => {
    expect(parseSourceUnit(value, 1430)).toBe(1430)
  })
  test.each(['', '0', '-1', '+1', '1431', '1.5', '1e2', '12 3', 'Infinity', '੧੪੩੧'])('rejects invalid destination %s', value => {
    expect(parseSourceUnit(value, 1430)).toBeNull()
  })
  test('keeps ranges specific to the selected source', () => {
    expect(parseSourceUnit('40', 40)).toBe(40)
    expect(parseSourceUnit('41', 40)).toBeNull()
    expect(parseSourceUnit(' 1 ', 40)).toBe(1)
  })
  test('bounds malformed or excessive browser page parameters', () => {
    expect(getSourceBrowsePage('99', 1430)).toBe(29)
    expect(getSourceBrowsePage('0', 1430)).toBe(1)
    expect(getSourceBrowsePage('-1', 1430)).toBe(1)
    expect(getSourceBrowsePage('2e1', 1430)).toBe(1)
    expect(getSourceBrowsePage('2', 40)).toBe(1)
    expect(getSourceBrowsePage(null, 1430)).toBe(1)
  })
})
