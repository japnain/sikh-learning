import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fetchBani } from '../api/banidb'
import japji from '../test/fixtures/bani-sections/japji-banidb-2026-10-31.json'
import type { ScriptureEntry } from '../types'
import { getBaniSections } from './baniSections'

const options = { baniId: 'japji-sahib', baniDbId: 2, exactBani: true } as const
let capturedEntries: ScriptureEntry[]

// Boundary, source, synthetic-heading and localization checks all begin with the
// complete captured reading through production normalization, never a bypass.
beforeAll(async () => {
  const transport = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(japji), { status: 200 }))
  try {
    capturedEntries = (await fetchBani(2)).entries
  } finally {
    transport.mockRestore()
  }
})

const reading = () => structuredClone(capturedEntries)

describe('checked Japji composition navigation', () => {
  it('returns both saloks and all 38 pauris with actual source/verse and line locations', () => {
    const entries = reading()
    const result = getBaniSections(entries, options)
    expect(result).toHaveLength(40)
    expect(result[0]).toMatchObject({ kind: 'opening-salok', label: 'Opening salok', entryIndex: 0, lineIndex: 2, verseId: 14 })
    expect(result[1]).toMatchObject({ kind: 'pauri', number: 1, label: 'Pauri 1', ang: 1 })
    expect(result[36]).toMatchObject({ number: 36, ang: 7, excerpt: 'ਗਿਆਨ ਖੰਡ ਮਹਿ ਗਿਆਨੁ ਪਰਚੰਡੁ ॥' })
    expect(result.at(-1)).toMatchObject({ kind: 'closing-salok', label: 'Closing salok', ang: 8 })
    for (const section of result) {
      const target = entries[section.entryIndex].lines![section.lineIndex]
      expect(section.verseId).toBe(target.verseId)
      expect(section.excerpt).toBe(target.gurmukhi)
      expect(section.source).toBe('G')
    }
  })

  it('preserves scripture and falls back for an unreviewed whitespace change', () => {
    const entries = reading()
    const target = entries[0].lines!.find(item => item.gurmukhi.startsWith('ਸੋਚੈ'))!
    target.gurmukhi = `  ${target.gurmukhi.replace(' ', '\n')} `
    const original = JSON.stringify(entries)
    expect(getBaniSections(entries, options)).toEqual([])
    expect(JSON.stringify(entries)).toBe(original)
  })

  it('accepts live bani rows without shabad IDs and preserves exact jump positions', () => {
    const entries = reading()
    entries.forEach(entry => entry.lines!.forEach(line => { line.shabadId = 0 }))
    const result = getBaniSections(entries, options)
    expect(result).toHaveLength(40)
    for (const section of result) {
      expect(entries[section.entryIndex].lines![section.lineIndex]).toMatchObject({
        verseId: section.verseId, gurmukhi: section.excerpt, shabadId: 0,
      })
    }
  })

  it.each([
    { ...options, exactBani: false },
    { ...options, baniDbId: 31 },
    { ...options, baniId: 'sukhmani-sahib' },
    { ...options, baniDbId: undefined },
  ])('falls back for unverified route identity %j', context => {
    expect(getBaniSections(reading(), context)).toEqual([])
  })

  it.each(['wrong-source', 'unknown-source', 'missing-page', 'duplicate-anchor', 'missing-anchor', 'reordered-anchor', 'invalid-verse', 'duplicate-verse', 'wrong-ang', 'wrong-original-ang', 'missing-number', 'duplicate-number', 'wrong-number', 'text-after-number'])(
    'returns no partial index for %s', fault => {
      const entries = reading()
      const firstPage = entries[0].lines!
      const pauriOne = firstPage.find(item => item.gurmukhi.startsWith('ਸੋਚੈ'))!
      const pauriTwo = firstPage.find(item => item.gurmukhi.startsWith('ਹੁਕਮੀ'))!
      const ending = firstPage.find(item => item.verseId === 21)!
      if (fault === 'wrong-source') entries[0].source = 'D'
      if (fault === 'unknown-source') entries[0].sourceAttribution = 'unavailable'
      if (fault === 'missing-page') entries.splice(3, 1)
      if (fault === 'duplicate-anchor') firstPage.push({ ...pauriOne, verseId: 1001 })
      if (fault === 'missing-anchor') pauriOne.gurmukhi = 'ਅਣਪਛਾਤੀ ਪੰਕਤੀ ॥'
      if (fault === 'reordered-anchor') [pauriOne.gurmukhi, pauriTwo.gurmukhi] = [pauriTwo.gurmukhi, pauriOne.gurmukhi]
      if (fault === 'invalid-verse') pauriOne.verseId = 0
      if (fault === 'duplicate-verse') pauriOne.verseId = pauriTwo.verseId
      if (fault === 'wrong-ang') pauriOne.ang = 2
      if (fault === 'wrong-original-ang') pauriOne.originalAng = 2
      if (fault === 'missing-number') ending.gurmukhi = 'ਪੰਕਤੀ ॥'
      if (fault === 'duplicate-number') firstPage.splice(firstPage.indexOf(ending), 0, { ...ending, verseId: 1001 })
      if (fault === 'wrong-number') ending.gurmukhi = 'ਪੰਕਤੀ ॥੨॥'
      if (fault === 'text-after-number') ending.gurmukhi += ' ਹੋਰ ਲਿਖਤ ॥'
      expect(getBaniSections(entries, options)).toEqual([])
    },
  )

  it('rejects additional scripture after the final salok even within Ang 8', () => {
    const entries = reading()
    const lastPage = entries.at(-1)!.lines!
    lastPage.push({ ...lastPage.at(-1)!, verseId: 2000, gurmukhi: 'ਸੋ ਦਰੁ ਤੇਰਾ ਕੇਹਾ ॥' })
    expect(getBaniSections(entries, options)).toEqual([])
  })

  it('keeps synthetic heading rows in the underlying reading and correct jump indices', () => {
    const entries = reading()
    entries[0].lines!.splice(4, 0, { ...entries[0].lines![1], verseId: 0, gurmukhi: 'ਪਉੜੀਆਂ', isHeader: true })
    const result = getBaniSections(entries, options)
    expect(result).toHaveLength(40)
    expect(result[1].lineIndex).toBe(5)
    expect(entries[0].lines![4].gurmukhi).toBe('ਪਉੜੀਆਂ')
  })

  it.each([undefined, 'G'] as const)('allows an unattributed synthetic title group with source %s', source => {
    const entries = reading()
    const title: ScriptureEntry = {
      ...entries[0], id: 'synthetic-title', source, sourceAttribution: 'unavailable',
      lines: [{ ...entries[0].lines![1], verseId: 0, gurmukhi: 'ਜਪੁਜੀ ਸਾਹਿਬ', shabadId: 0 }],
    }
    entries.unshift(title)
    const result = getBaniSections(entries, options)
    expect(result).toHaveLength(40)
    expect(result[0].entryIndex).toBe(1)
    expect(result.every(section => section.verseId > 0 && section.entryIndex !== 0)).toBe(true)
    expect(entries[0].lines![0].gurmukhi).toBe('ਜਪੁਜੀ ਸਾਹਿਬ')
  })

  it.each(['conflicting-source', 'real-body', 'positive-verse-header', 'mixed-group'])(
    'does not relax attribution for an unverified %s group', fault => {
      const entries = reading()
      const title: ScriptureEntry = {
        ...entries[0], id: 'unverified-group', source: undefined, sourceAttribution: 'unavailable',
        lines: [{ ...entries[0].lines![1], verseId: 0, gurmukhi: 'ਜਪੁਜੀ ਸਾਹਿਬ', shabadId: 0 }],
      }
      if (fault === 'conflicting-source') title.source = 'D'
      if (fault === 'real-body') title.lines![0].isHeader = false
      if (fault === 'positive-verse-header') title.lines![0].verseId = 5000
      if (fault === 'mixed-group') title.lines!.push({ ...entries[0].lines![0], verseId: 5000 })
      entries.unshift(title)
      expect(getBaniSections(entries, options)).toEqual([])
    },
  )

  it('cannot disguise a missing original body row as an excluded zero-ID heading', () => {
    const entries = reading()
    const interior = entries[0].lines!.find(line => line.verseId === 17)!
    interior.verseId = 0
    interior.isHeader = true
    expect(getBaniSections(entries, options)).toEqual([])
  })

  it('localizes navigation labels without changing source excerpts', () => {
    const entries = reading()
    expect(getBaniSections(entries, { ...options, locale: 'pa' })[1].label).toBe('ਪਉੜੀ 1')
    expect(getBaniSections(entries, { ...options, locale: 'hi' })[1].label).toBe('पउड़ी 1')
    expect(getBaniSections(entries, { ...options, locale: 'pa' })[1].excerpt).toBe(getBaniSections(entries, options)[1].excerpt)
  })
})
