import { describe, it, expect } from 'vitest'
import { fetchAng, fetchBani, fetchShabadWords, fetchShabad, fetchShabadVerses, fetchBanisIndex, fetchAmritKeertanIndex, fetchAmritKeertanShabads, fetchHukamnama } from './banidb'

describe('fetchAng', () => {
  it('fetches ang and returns ScriptureEntry[] grouped by shabadId', async () => {
    const entries = await fetchAng(1, 'G')
    expect(entries).toHaveLength(2) // shabadId 1 and 2
    expect(entries[0].id).toBe('G-1-1')
    expect(entries[0].scripture).toBe('SGGS')
    expect(entries[0].ang).toBe(1)
    expect(entries[0].gurmukhi).toContain('ੴ')
    expect(entries[0].transliteration).toContain('ikOankaar')
    expect(entries[0].translation_en).toContain('One Universal Creator God')
    expect(entries[0].translation_pa).toContain('ਅਕਾਲ')
    expect(entries[0].words).toEqual([])
    expect(entries[0].lines).toHaveLength(2)
    expect(entries[0].lines?.[0].translations_en.ms).toContain('There is but One God')
  })

  it('concatenates multiple verses in same shabadId', async () => {
    const entries = await fetchAng(1, 'G')
    expect(entries[0].gurmukhi).toContain('ਨਿਰਭਉ') // verse 2 of shabadId 1
  })

  it('maps source D to DG scripture name', async () => {
    const entries = await fetchAng(1, 'D')
    expect(entries[0].scripture).toBe('DG')
    expect(entries[0].id).toBe('D-1-1')
  })

  it('returns [] for ang with no verses', async () => {
    const entries = await fetchAng(9999, 'G')
    expect(entries).toEqual([])
  })

  it('throws on network error', async () => {
    await expect(fetchAng('error' as unknown as number, 'G')).rejects.toThrow()
  })
})

describe('fetchShabadWords', () => {
  it('returns Word[] from shabad', async () => {
    const words = await fetchShabadWords(1)
    expect(words.length).toBeGreaterThan(0)
    expect(words[0]).toEqual({
      gurmukhi: 'ੴ',
      transliteration: 'ikOankaar',
      meaning_en: 'One Universal Creator',
      meaning_hi: 'एक ओंकार',
      meaning_pa: 'ਇੱਕ ਅਕਾਲ ਪੁਰਖ',
    })
  })

  it('returns [] for shabad with no verses', async () => {
    const words = await fetchShabadWords(9999)
    expect(words).toEqual([])
  })

  it('throws on network error', async () => {
    await expect(fetchShabadWords('error' as unknown as number)).rejects.toThrow()
  })
})

describe('fetchShabad', () => {
  it('returns a single exact shabad entry', async () => {
    const entry = await fetchShabad(50)
    expect(entry?.shabadId).toBe(50)
    expect(entry?.scripture).toBe('SGGS')
    expect(entry?.gurmukhi).toContain('ੴ')
    expect(entry?.lines).toHaveLength(2)
    expect(entry?.writer).toBe('Guru Nanak Dev Ji')
  })
})

describe('fetchShabadVerses', () => {
  it('returns verse-level entries for an exact search result view', async () => {
    const entries = await fetchShabadVerses(50)
    expect(entries).toHaveLength(2)
    expect(entries[0].shabadId).toBe(50)
    expect(entries[0].verseIds).toEqual([100])
    expect(entries[0].gurmukhi).toBe('ੴ ਸਤਿ ਨਾਮੁ')
  })
})

describe('index fetchers', () => {
  it('loads the Sundar Gutka bani index', async () => {
    const banis = await fetchBanisIndex()
    expect(banis[0]).toEqual({
      id: 2,
      gurmukhi: 'ਜਪੁਜੀ ਸਾਹਿਬ',
      transliteration: 'japujee saahib',
    })
  })

  it('loads the Amrit Keertan header index', async () => {
    const headers = await fetchAmritKeertanIndex()
    expect(headers[0]).toEqual({
      headerId: 1,
      gurmukhi: 'ਦੁਇ ਕਰ ਜੋੜਿ ਕਰਉ ਅਰਦਾਸਿ ॥',
      transliteration: 'dhui kar joR karau aradhaas ||',
    })
  })

  it('loads shabads for an Amrit Keertan header', async () => {
    const shabads = await fetchAmritKeertanShabads(1)
    expect(shabads[0].shabadId).toBe(816)
    expect(shabads[0].gurmukhi).toContain('ਡੰਡਉਤਿ')
  })
})

describe('fetchBani', () => {
  it('normalizes Rehras intro lines without producing Ang 0', async () => {
    const entries = await fetchBani(21)
    expect(entries).toHaveLength(1)
    expect(entries[0].ang).toBe(8)
    expect(entries[0].lines?.[0].isHeader).toBe(true)
    expect(entries[0].lines?.[0].originalAng).toBeNull()
    expect(entries[0].lines?.[2].ang).toBe(8)
  })
})

describe('fetchHukamnama', () => {
  it('returns normalized hukamnama entry data', async () => {
    const hukamnama = await fetchHukamnama('2026-04-05')
    expect(hukamnama.date).toBe('2026-04-05')
    expect(hukamnama.ang).toBe(680)
    expect(hukamnama.shabadId).toBe(2591)
    expect(hukamnama.entry.lines).toHaveLength(2)
    expect(hukamnama.entry.raag).toBe('Raag Dhanaasree')
    expect(hukamnama.entry.lines?.[0].translations_en.ssk).toContain('Inner-knower')
  })
})
