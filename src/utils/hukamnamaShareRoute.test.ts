import { describe, expect, it } from 'vitest'
import {
  buildHukamnamaShortPath,
  buildHukamnamaStudyPath,
  buildPersonalHukamnamaShortPath,
  buildPersonalHukamnamaStudyPath,
  normalizeHukamnamaDate,
} from './hukamnamaShareRoute'

describe('Hukamnama share routes', () => {
  it('builds deterministic short and canonical reading paths', () => {
    expect(buildHukamnamaShortPath('2026-08-03')).toBe('/h/2026-08-03')
    expect(buildHukamnamaStudyPath('2026-08-03')).toBe(
      '/study?hukamnamaDate=2026-08-03'
    )
  })

  it('rejects malformed and impossible dates', () => {
    expect(normalizeHukamnamaDate('2026-02-29')).toBeNull()
    expect(normalizeHukamnamaDate('2026-13-03')).toBeNull()
    expect(normalizeHukamnamaDate('08-03-2026')).toBeNull()
    expect(buildHukamnamaShortPath('not-a-date')).toBe('/')
    expect(buildHukamnamaStudyPath(undefined)).toBe('/')
  })

  it('accepts leap days when the date is valid', () => {
    expect(normalizeHukamnamaDate('2028-02-29')).toBe('2028-02-29')
  })

  it('builds a compact personal Hukamnama route that preserves the exact reading', () => {
    expect(buildPersonalHukamnamaShortPath(2591, 680, 10101)).toBe(
      '/p/2591/680/10101'
    )
    expect(buildPersonalHukamnamaStudyPath('2591', '680', '10101')).toBe(
      '/study?shabadId=2591&flow=ardaas-hukamnama&randomHukamnamaAng=680&resumeVerseId=10101'
    )
    expect(buildPersonalHukamnamaShortPath(2591, 680)).toBe('/p/2591/680')
  })

  it('rejects malformed personal reading identifiers', () => {
    expect(buildPersonalHukamnamaShortPath('nope', 680, 10101)).toBe('/')
    expect(buildPersonalHukamnamaShortPath('1e3', 680, 10101)).toBe('/')
    expect(buildPersonalHukamnamaShortPath(2591, 1431, 10101)).toBe('/')
    expect(buildPersonalHukamnamaStudyPath(2591, 680, 0)).toBe('/')
  })
})
