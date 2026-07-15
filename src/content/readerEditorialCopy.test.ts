import { describe, expect, it } from 'vitest'
import { READ_EXACT_BANIS, type Bani } from '../data/banis'
import {
  ARDAAS_HUKAMNAMA_EDITORIAL_COPY,
  BANNED_READER_EDITORIAL_PHRASES,
  DAILY_HUKAMNAMA_EDITORIAL_COPY,
  PERSONAL_HUKAMNAMA_EDITORIAL_COPY,
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
      expect(copy.historicalNote?.trim().length ?? 0, `${bani.id} should carry researched context`).toBeGreaterThan(60)
      expect(copy.practiceNote?.trim().length ?? 0, `${bani.id} should carry usage guidance`).toBeGreaterThan(45)
      expect(copy.sourceRefs.length, `${bani.id} should carry provenance notes`).toBeGreaterThanOrEqual(2)
      expect(copy.sourceRefs.map(ref => ref.label).join(' '), `${bani.id} should cite exact-bani/source provenance`).toMatch(/BaniDB|Sri Guru Granth Sahib Ji|Dasam Granth/)
    }

    expect(missing).toEqual([])
  })

  it('keeps generic product-copy phrases and app implementation labels out of reader intros', () => {
    const disallowedFragments = [
      ...BANNED_READER_EDITORIAL_PHRASES,
      'Exact BaniDB',
      'exact BaniDB',
      'served as one exact',
      'served as its own exact',
      'adjustable STTM',
      'random answer',
    ]

    for (const bani of READ_EXACT_BANIS) {
      const copy = getReaderEditorialCopyForBani(bani.id)
      expect(copy, bani.id).toBeTruthy()
      const text = [copy?.title, copy?.dek, copy?.historicalNote, copy?.practiceNote].filter(Boolean).join(' ')

      for (const phrase of disallowedFragments) {
        expect(text.toLowerCase(), `${bani.id} should not use "${phrase}"`).not.toContain(phrase.toLowerCase())
      }
    }
  })

  it('manual copy repairs the called-out Sukhmani Sahib context', () => {
    const copy = getReaderEditorialCopyForBani('sukhmani-sahib')
    expect(copy).toBeTruthy()
    const text = [copy?.dek, copy?.historicalNote, copy?.practiceNote, copy?.sourceLine].join(' ')

    expect(text).toMatch(/Guru Arjan/i)
    expect(text).toMatch(/Raag Gauri/i)
    expect(text).toMatch(/24 ashtpadis/i)
    expect(text).toMatch(/Angs 262–296/i)
    expect(text).toMatch(/naam/i)
    expect(text).not.toMatch(/Pearl of Peace/i)
  })

  it('adds researched copy for the Ardaas plus Hukamnama flow', () => {
    const text = [
      ARDAAS_HUKAMNAMA_EDITORIAL_COPY.title,
      ARDAAS_HUKAMNAMA_EDITORIAL_COPY.dek,
      ARDAAS_HUKAMNAMA_EDITORIAL_COPY.historicalNote,
      ARDAAS_HUKAMNAMA_EDITORIAL_COPY.practiceNote,
      ARDAAS_HUKAMNAMA_EDITORIAL_COPY.sourceRefs.map(ref => `${ref.label} ${ref.note}`).join(' '),
    ].join(' ')

    expect(text).toMatch(/Ardaas \+ Hukamnama/i)
    expect(text).toMatch(/Sikh Rehat Maryada/i)
    expect(text).toMatch(/Sarbat da bhala/i)
    expect(text).toMatch(/Panj Pyare/i)
    expect(text).toMatch(/Sri Guru Granth Sahib Ji/i)
    expect(text).not.toMatch(/Do Ardaas, then/i)
  })

  it('explains Daily Hukamnama as a source shabad practice, not a decorative daily card', () => {
    const text = [
      DAILY_HUKAMNAMA_EDITORIAL_COPY.title,
      DAILY_HUKAMNAMA_EDITORIAL_COPY.dek,
      DAILY_HUKAMNAMA_EDITORIAL_COPY.historicalNote,
      DAILY_HUKAMNAMA_EDITORIAL_COPY.practiceNote,
    ].join(' ')

    expect(text).toMatch(/Daily Hukamnama Sri Harmandir Sahib, Amritsar/i)
    expect(text).toMatch(/hukam/i)
    expect(text).toMatch(/full source shabad/i)
    expect(text).toMatch(/date/i)
    expect(text).not.toMatch(/decorative/i)
  })

  it('keeps a personal Hukamnama distinct from the dated Harmandir Sahib reading', () => {
    const text = [
      PERSONAL_HUKAMNAMA_EDITORIAL_COPY.title,
      PERSONAL_HUKAMNAMA_EDITORIAL_COPY.dek,
      PERSONAL_HUKAMNAMA_EDITORIAL_COPY.sourceLine,
      PERSONAL_HUKAMNAMA_EDITORIAL_COPY.historicalNote,
      PERSONAL_HUKAMNAMA_EDITORIAL_COPY.practiceNote,
      PERSONAL_HUKAMNAMA_EDITORIAL_COPY.sourceRefs.map(ref => `${ref.label} ${ref.note}`).join(' '),
    ].join(' ')

    expect(text).toMatch(/Personal Hukamnama/i)
    expect(text).toMatch(/Sri Guru Granth Sahib Ji/i)
    expect(text).not.toMatch(/Harmandir Sahib/i)
    expect(text).toMatch(/Daily Hukamnama/i)
  })
})
