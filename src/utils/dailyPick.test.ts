import { describe, it, expect } from 'vitest'
import { getDailyPick } from './dailyPick'
import type { ScriptureEntry } from '../types'

const makeEntry = (id: string): ScriptureEntry => ({
  id, scripture: 'SGGS', ang: 1,
  gurmukhi: 'test', transliteration: 'test',
  translation_en: 'test', translation_pa: 'test', words: []
})

describe('getDailyPick', () => {
  it('returns an entry from the list', () => {
    const entries = [makeEntry('a'), makeEntry('b'), makeEntry('c')]
    const result = getDailyPick(entries, new Date('2026-03-22'))
    expect(entries.map(e => e.id)).toContain(result.id)
  })

  it('returns the same entry for the same date', () => {
    const entries = [makeEntry('a'), makeEntry('b'), makeEntry('c')]
    const date = new Date('2026-03-22')
    expect(getDailyPick(entries, date).id).toBe(getDailyPick(entries, date).id)
  })

  it('returns a different entry for different dates', () => {
    const entries = Array.from({ length: 30 }, (_, i) => makeEntry(`entry-${i}`))
    const picks = new Set(
      Array.from({ length: 30 }, (_, i) => {
        const d = new Date(2026, 0, i + 1)
        return getDailyPick(entries, d).id
      })
    )
    expect(picks.size).toBeGreaterThan(1)
  })
})
