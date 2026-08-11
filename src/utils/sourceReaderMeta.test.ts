import { describe, expect, test } from 'vitest'
import {
  formatSourceReaderReference,
  getSourceReaderUnitLabel,
} from './sourceReaderMeta'

describe('source reader references', () => {
  test('uses the canonical unit for each reading source', () => {
    expect(formatSourceReaderReference({ source: 'B', value: 12, locale: 'en' })).toBe('BGV · Vaar 12')
    expect(formatSourceReaderReference({ source: 'A', value: 44, locale: 'en' })).toBe('AK · Page 44')
  })

  test('localizes reading and verse units without changing source identity', () => {
    expect(formatSourceReaderReference({
      source: 'A',
      value: 44,
      verseId: 9,
      locale: 'pa',
    })).toBe('AK · ਸਫ਼ਾ 44 · ਪੰਕਤੀ 9')
    expect(getSourceReaderUnitLabel('B', 'hi')).toBe('वार')
  })
})
