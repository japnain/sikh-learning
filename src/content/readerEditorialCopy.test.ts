import { describe, expect, it } from 'vitest'
import { BANIS, READ_EXACT_BANIS } from '../data/banis'
import { RESEARCHED_BANI_IDS } from './readerEditorialResearch'
import {
  ARDAAS_EDITORIAL_COPY,
  ARDAAS_HUKAMNAMA_EDITORIAL_COPY,
  BANNED_READER_EDITORIAL_PHRASES,
  DAILY_HUKAMNAMA_EDITORIAL_COPY,
  PERSONAL_HUKAMNAMA_EDITORIAL_COPY,
  READER_EDITORIAL_BANIS,
  READER_EDITORIAL_COPY_BY_BANI_ID,
  READER_EDITORIAL_REVIEWED_AT,
  formatReaderEditorialDate,
  getReaderEditorialCopyForBani,
  getReaderEditorialCopyForBaniDbId,
  getReaderEditorialCopyForSource,
} from './readerEditorialCopy'

it('formats Hukamnama display dates in the active interface language', () => {
  expect(formatReaderEditorialDate('2026-04-05', 'en')).toBe('April 5, 2026')
  expect(formatReaderEditorialDate('2026-04-05', 'pa')).not.toBe('April 5, 2026')
  expect(formatReaderEditorialDate('2026-04-05', 'hi')).not.toBe('April 5, 2026')
})

const expectedCatalog = Array.from(
  new Map([...READ_EXACT_BANIS, ...BANIS].map(bani => [bani.id, bani])).values()
)

function editorialText(id: string) {
  const copy = getReaderEditorialCopyForBani(id)
  expect(copy, `${id} should resolve`).toBeTruthy()
  return [copy?.title, copy?.dek, copy?.historicalNote, copy?.practiceNote, copy?.sourceLine]
    .filter(Boolean)
    .join(' ')
}

describe('reader editorial copy coverage', () => {
  it('covers the complete reader catalog with individually researched, linked copy', () => {
    expect(READER_EDITORIAL_BANIS.map(bani => bani.id).sort()).toEqual(expectedCatalog.map(bani => bani.id).sort())
    expect(Object.keys(READER_EDITORIAL_COPY_BY_BANI_ID).sort()).toEqual(expectedCatalog.map(bani => bani.id).sort())
    expect([...RESEARCHED_BANI_IDS].sort()).toEqual(expectedCatalog.map(bani => bani.id).sort())

    const substantiveCopy = new Set<string>()

    for (const bani of expectedCatalog) {
      const copy = getReaderEditorialCopyForBani(bani.id)
      expect(copy, `${bani.id} should resolve by its canonical id`).toBeTruthy()
      expect(copy?.id).toBe(bani.id)
      expect(copy?.title).toBe(bani.name)
      expect(copy?.reviewed, `${bani.id} should be reviewed before rendering`).toBe(true)
      expect(copy?.reviewedAt, `${bani.id} should have a current review date`).toBe(READER_EDITORIAL_REVIEWED_AT)
      expect(copy?.dek.trim().length ?? 0, `${bani.id} should have a substantive introduction`).toBeGreaterThan(55)
      expect(copy?.dek.length ?? 0, `${bani.id} introduction should fit the reader hero`).toBeLessThanOrEqual(280)
      expect(copy?.historicalNote?.trim().length ?? 0, `${bani.id} should carry researched context`).toBeGreaterThan(65)
      expect(copy?.practiceNote?.trim().length ?? 0, `${bani.id} should carry reading guidance`).toBeGreaterThan(55)
      expect(copy?.sourceLine.trim().length ?? 0, `${bani.id} should identify its source or reading set`).toBeGreaterThan(12)
      expect(copy?.sourceRefs.length ?? 0, `${bani.id} should carry at least two provenance links`).toBeGreaterThanOrEqual(2)

      for (const ref of copy?.sourceRefs ?? []) {
        expect(ref.url, `${bani.id}/${ref.label} should link to its source`).toMatch(/^https:\/\//)
        expect(ref.note.trim().length, `${bani.id}/${ref.label} should explain how the source was used`).toBeGreaterThan(30)
      }

      if (typeof bani.baniDbId === 'number') {
        expect(
          getReaderEditorialCopyForBaniDbId(bani.baniDbId, bani.source),
          `${bani.id} should resolve to the same copy by source-scoped BaniDB id`
        ).toBe(copy)
      }

      substantiveCopy.add([copy?.dek, copy?.historicalNote, copy?.practiceNote].join(' '))
    }

    expect(substantiveCopy.size).toBe(expectedCatalog.length)
  })

  it('keeps placeholder language, implementation copy, and em dashes out of the published writing', () => {
    for (const bani of expectedCatalog) {
      const copy = getReaderEditorialCopyForBani(bani.id)
      const text = [
        copy?.title,
        copy?.dek,
        copy?.historicalNote,
        copy?.practiceNote,
        copy?.sourceLine,
        ...(copy?.sourceRefs.flatMap(ref => [ref.label, ref.note]) ?? []),
      ].filter(Boolean).join(' ')

      expect(text, `${bani.id} should avoid em dashes`).not.toContain('—')
      for (const phrase of BANNED_READER_EDITORIAL_PHRASES) {
        expect(text.toLowerCase(), `${bani.id} should not use "${phrase}"`).not.toContain(phrase.toLowerCase())
      }
    }
  })

  it('repairs the catalog facts that were wrong or easy to misstate', () => {
    expect(editorialText('thiiti-majh')).toMatch(/Thiti Mahalla 5 \(Gauri\).*Guru Arjan/is)
    expect(editorialText('birhade')).toMatch(/Angs 431–432/)
    expect(editorialText('ghorian')).toMatch(/Ang 575/)
    expect(editorialText('salok-farid')).toMatch(/Angs 1377–1384/)
    expect(editorialText('tav-prasad-savaiye')).toMatch(/Angs 11–13.*Sraavag Suddh/is)
    expect(editorialText('var-majh')).toMatch(/Angs 137–151/)
    expect(editorialText('ugardanti')).toMatch(/selected recension.*pagination varies/is)
    expect(editorialText('ruti-mahalla-5')).toMatch(/Eight salok–chhant units/i)
    expect(getReaderEditorialCopyForBani('basant-ki-vaar')?.practiceNote).toMatch(/three pauris together/i)
    expect(getReaderEditorialCopyForBani('basant-ki-vaar')?.practiceNote).not.toMatch(/saloks attached around/i)
  })

  it('describes composite, anthology, Bhagat, weekday, and Bhatt sets without false attribution', () => {
    const dukhBhanjani = editorialText('dukh-bhanjani')
    expect(dukhBhanjani).toMatch(/anthology.*noncontiguous/is)
    expect(dukhBhanjani).toMatch(/without treating recitation as a guaranteed medical outcome/i)

    const gurMantar = editorialText('gur-mantar')
    expect(gurMantar).toMatch(/Bhai Gurdas Ji Vaar 13/i)
    expect(gurMantar).toMatch(/later reader-made anthology/i)
    expect(gurMantar).toMatch(/not a contiguous composition from SGGS Ang 13/i)

    expect(editorialText('gauri-vaar-kabir')).toMatch(/weekday composition.*Sunday through Saturday/is)
    expect(editorialText('bilaval-mahalla-3-vaar-sat')).toMatch(/weekday composition.*seven days/is)

    const raagCluster = editorialText('raag-bhairao')
    expect(raagCluster).toMatch(/Bhagat-Bani portion/i)
    expect(raagCluster).toMatch(/source grouping of distinct shabads/i)

    for (const id of ['savaiye-mahalla-1', 'savaiye-mahalla-2', 'savaiye-mahalla-3', 'savaiye-mahalla-4', 'savaiye-mahalla-5']) {
      const text = editorialText(id)
      expect(text).toMatch(/Bhatt Savaiyye in praise of/i)
      expect(text).toMatch(/Bhatts? (?:are|speak|contribute|voice)/i)
    }
  })

  it('keeps exact BaniDB variants distinct and normalizes legacy route aliases', () => {
    expect(getReaderEditorialCopyForBaniDbId(7, 'D')?.id).toBe('tav-prasad-savaiye-dinan-ki')
    expect(getReaderEditorialCopyForBani('tav-prasad-savaiye-dheenan-ki')?.id).toBe('tav-prasad-savaiye-dinan-ki')
    expect(getReaderEditorialCopyForBaniDbId(7, 'D')?.dek).toMatch(/Dheenan Ki/i)
    expect(getReaderEditorialCopyForBaniDbId(6, 'D')?.dek).toMatch(/Sraavag Suddh/i)

    expect(getReaderEditorialCopyForBaniDbId(25, 'D')?.title).toBe('Sri Bhagauti Astotr')
    expect(getReaderEditorialCopyForBaniDbId(26, 'D')?.title).toBe('Sri Bhagauti Astotr (Hazur Sahib)')
    expect(getReaderEditorialCopyForBaniDbId(25, 'D')?.sourceLine).toMatch(/Panth Prakash/i)
    expect(getReaderEditorialCopyForBaniDbId(26, 'D')?.sourceLine).toMatch(/Hazur Sahib/i)

    expect(getReaderEditorialCopyForBani('rehras-sahib-focused')?.id).toBe('rehras-sahib')
    expect(getReaderEditorialCopyForBani('chaupai-sahib-focused')?.id).toBe('chaupai-sahib')
  })

  it('gives plain Ardaas and each Hukamnama flow distinct, source-linked context', () => {
    expect(getReaderEditorialCopyForBaniDbId(24)).toBe(ARDAAS_EDITORIAL_COPY)
    expect(ARDAAS_EDITORIAL_COPY.id).not.toBe(ARDAAS_HUKAMNAMA_EDITORIAL_COPY.id)
    expect(editorialTextForSpecial(ARDAAS_EDITORIAL_COPY)).toMatch(/Panj Pyare.*four Sahibzade.*Sarbat da bhala/is)
    expect(editorialTextForSpecial(ARDAAS_HUKAMNAMA_EDITORIAL_COPY)).toMatch(/Ardaas.*Hukamnama.*full/is)

    expect(DAILY_HUKAMNAMA_EDITORIAL_COPY.title).toBe('Daily Hukamnama')
    expect(DAILY_HUKAMNAMA_EDITORIAL_COPY.sourceLine).toMatch(/Sri Harmandir Sahib, Amritsar/i)
    expect(editorialTextForSpecial(DAILY_HUKAMNAMA_EDITORIAL_COPY)).toMatch(/dated.*whole shabad/is)

    expect(PERSONAL_HUKAMNAMA_EDITORIAL_COPY.title).toBe('Personal Hukamnama')
    expect(PERSONAL_HUKAMNAMA_EDITORIAL_COPY.sourceLine).toMatch(/after Ardaas/i)

    for (const copy of [ARDAAS_EDITORIAL_COPY, ARDAAS_HUKAMNAMA_EDITORIAL_COPY, DAILY_HUKAMNAMA_EDITORIAL_COPY, PERSONAL_HUKAMNAMA_EDITORIAL_COPY]) {
      expect(copy.sourceRefs.length).toBeGreaterThanOrEqual(2)
      expect(copy.sourceRefs.every(ref => ref.url?.startsWith('https://'))).toBe(true)
      expect(copy.sourceRefs.some(ref => ref.url?.includes('old.sgpc.net'))).toBe(false)
    }
  })

  it('provides reviewed context for direct SGGS, Dasam, Vaaran, and Amrit Keertan routes', () => {
    const cases = [
      ['G', 262, 'Sri Guru Granth Sahib Ji · Ang 262'],
      ['D', 11, 'Dasam Bani · Ang 11'],
      ['B', 13, 'Bhai Gurdas Ji Vaaran · Vaar 13'],
      ['A', 22, 'Amrit Keertan · page 22'],
    ] as const

    for (const [source, position, sourceLine] of cases) {
      const copy = getReaderEditorialCopyForSource(source, position)
      expect(copy.reviewed).toBe(true)
      expect(copy.sourceLine).toBe(sourceLine)
      expect(copy.sourceRefs).toHaveLength(2)
      expect(copy.sourceRefs.every(ref => ref.url?.startsWith('https://'))).toBe(true)
      expect(new Set(copy.sourceRefs.map(ref => ref.url)).size).toBe(2)
    }

    expect(getReaderEditorialCopyForSource('G', 1, { exactShabad: true }).dek).toMatch(/complete shabad/i)
  })
})

function editorialTextForSpecial(copy: {
  title: string
  dek: string
  historicalNote?: string
  practiceNote?: string
  sourceLine: string
}) {
  return [copy.title, copy.dek, copy.historicalNote, copy.practiceNote, copy.sourceLine].filter(Boolean).join(' ')
}
