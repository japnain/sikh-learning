import { describe, expect, it } from 'vitest'
import { READ_EXACT_BANIS, type Bani } from '../data/banis'
import {
  BANNED_READER_EDITORIAL_PHRASES,
  getReaderEditorialCopyForBani,
  getReaderEditorialCopyForBaniDbId,
} from './readerEditorialCopy'

describe('reader editorial copy coverage', () => {
  it('has reviewed, source-backed copy for every exact bani exposed by the Read directory', () => {
    const exactBanis = READ_EXACT_BANIS.filter((bani): bani is Bani & { baniDbId: number } => typeof bani.baniDbId === 'number')
    const missing: string[] = []

    for (const bani of exactBanis) {
      const copy = getReaderEditorialCopyForBani(bani.id) ?? getReaderEditorialCopyForBaniDbId(bani.baniDbId)
      if (!copy) {
        missing.push(`${bani.id} (${bani.name})`)
        continue
      }

      expect(copy.reviewed, `${bani.id} should be reviewed before rendering`).toBe(true)
      expect(copy.dek.trim().length, `${bani.id} should have substantive editorial copy`).toBeGreaterThan(40)
      expect(copy.dek.length, `${bani.id} should stay concise enough for the reader hero`).toBeLessThanOrEqual(280)
      expect(copy.sourceLine, `${bani.id} should display its scripture/source location`).toContain('Ang')
      expect(copy.sourceRefs.length, `${bani.id} should carry provenance notes`).toBeGreaterThan(0)
    }

    expect(missing).toEqual([])
  })

  it('keeps generic product-copy phrases out of reader intros', () => {
    for (const bani of READ_EXACT_BANIS) {
      const copy = getReaderEditorialCopyForBani(bani.id)
      expect(copy, bani.id).toBeTruthy()
      const text = [copy?.title, copy?.dek, copy?.historicalNote, copy?.practiceNote].filter(Boolean).join(' ')

      for (const phrase of BANNED_READER_EDITORIAL_PHRASES) {
        expect(text.toLowerCase(), `${bani.id} should not use "${phrase}"`).not.toContain(phrase.toLowerCase())
      }
    }
  })
})
