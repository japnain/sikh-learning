import { describe, expect, it } from 'vitest'
import { fetchBani } from '../api/banidb'
import type { SundarGutkaLength } from '../types'
import { isExactBaniReading } from './baniReadingValidation'

describe('exact bani payload validation', () => {
  it.each([
    [2, null], [24, null],
    [21, null], [21, 'short'], [21, 'medium'], [21, 'long'], [21, 'extralong'],
    [9, 'short'], [9, 'medium'], [9, 'long'], [9, 'extralong'],
    [22, 'short'], [22, 'medium'], [22, 'long'], [22, 'extralong'],
    [23, 'short'], [23, 'medium'], [23, 'long'], [23, 'extralong'],
  ] as Array<[number, SundarGutkaLength | null]>)('accepts normalized API content for bani %s, length %s', async (baniDbId, length) => {
    const data = await fetchBani(baniDbId, length)
    expect(isExactBaniReading(data, baniDbId, length)).toBe(true)
  })

  it('preserves legitimate mixed scripture sources in composite Rehras Sahib', async () => {
    const data = await fetchBani(21, 'short')
    expect(new Set(data.entries.map(entry => entry.source))).toEqual(new Set(['G', 'D']))
    expect(isExactBaniReading(data, 21, 'short')).toBe(true)
  })

  it('rejects contradictory source provenance even if the visible label appears consistent', async () => {
    const data = await fetchBani(2)
    data.entries[0] = { ...data.entries[0], sourceMeta: { sourceId: 'D' } }
    expect(isExactBaniReading(data, 2)).toBe(false)
  })

  it('accepts neutral BaniDB content only with an explicit unavailable attribution and its known canonical identity', async () => {
    const data = await fetchBani(21, 'short')
    data.entries = data.entries.map(entry => ({
      ...entry, source: 'G', scripture: 'Sundar Gutka', sourceName: 'Sundar Gutka',
      sourceMeta: null, sourceAttribution: 'unavailable', shabadId: 0,
      lines: entry.lines?.map(line => ({ ...line, shabadId: 0 })),
    }))
    expect(isExactBaniReading(data, 21, 'short')).toBe(true)
    for (const incompatible of [
      { sourceAttribution: undefined },
      { source: 'D' },
      { scripture: 'SGGS' },
      { sourceName: 'Sri Guru Granth Sahib Ji' },
      { sourceMeta: { sourceId: 'G' } },
      { shabadId: 42 },
      { lines: data.entries[0].lines?.map(line => ({ ...line, shabadId: 42 })) },
    ]) {
      expect(isExactBaniReading({ ...data, entries: [{ ...data.entries[0], ...incompatible }, ...data.entries.slice(1)] }, 21, 'short')).toBe(false)
    }
    expect(isExactBaniReading({ ...data, entries: data.entries.map(entry => ({ ...entry, id: entry.id.replace('bani-21-', 'bani-999-') })) }, 999, 'short')).toBe(false)
  })

  it('does not accept the extra-long alias for a four-band or a different bani', async () => {
    const aarti = await fetchBani(22, 'long')
    expect(isExactBaniReading({ ...aarti, availableLengths: ['short', 'medium', 'long', 'extralong'] }, 22, 'extralong')).toBe(false)
    const rehras = await fetchBani(21, 'long')
    expect(isExactBaniReading({ ...rehras, availableLengths: ['short', 'medium', 'long'] }, 21, 'extralong')).toBe(false)
  })
})
