import { describe, it, expect, vi } from 'vitest'
import {
  fetchAng,
  fetchBani,
  fetchShabadWords,
  fetchShabad,
  fetchShabadVerses,
  fetchBanisIndex,
  fetchAmritKeertanIndex,
  fetchAmritKeertanShabads,
  fetchHukamnama,
  fetchKoshEntries,
  fetchRehats,
  fetchRehatChapters,
  fetchRehatChapter,
  fetchSearch,
} from './banidb'
import type { ScriptureEntry } from '../types'

function firstVisibleLine(entries: ScriptureEntry[]) {
  return entries
    .flatMap(entry => entry.lines ?? [])
    .find(line => !line.isHeader && line.gurmukhi.trim())
    ?.gurmukhi ?? null
}

function introLines(entries: ScriptureEntry[]) {
  return entries.flatMap(entry => entry.lines ?? []).filter(line => line.isHeader).map(line => line.gurmukhi)
}

describe('fetchAng', () => {
  it('routes scripture reads through the Supabase banidb proxy endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    await fetchAng(1, 'G')

    const [requestUrl, requestInit] = fetchSpy.mock.calls[0] ?? []
    expect(String(requestUrl)).toContain('/banidb-proxy')
    expect(requestInit).toMatchObject({
      method: 'POST',
    })
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      path: '/v2/angs/1/G',
    })

    fetchSpy.mockRestore()
  })

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
    expect(entries[0].lines?.[0].translations_hi?.sts).toContain('सत्य नाम')
    expect(entries[0].lines?.[0].translations_pa?.ft).toContain('ਇਕ ਅਕਾਲ ਪੁਰਖ')
    expect(entries[0].lines?.[0].larivaar).toBe('ੴਸਤਿਨਾਮੁਕਰਤਾਪੁਰਖੁ')
    expect(entries[0].lines?.[0].visraam?.sttm).toHaveLength(1)
    expect(entries[0].sourceMeta?.english).toBe('Sri Guru Granth Sahib Ji')
    expect(entries[0].raagMeta?.english).toBe('Jap')
    expect(entries[0].writerMeta?.english).toBe('Guru Nanak Dev Ji')
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
    expect(entry?.lines?.[0].visraam?.igurbani).toHaveLength(1)
    expect(entry?.lines?.[0].translations_pa?.ft).toContain('ਇਕ ਅਕਾਲ ਪੁਰਖ')
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

describe('fetchSearch', () => {
  it('returns richer result metadata for Banis search', async () => {
    const results = await fetchSearch('waheguru', 3, 'all')
    expect(results[0].sourceName).toBe('Sri Guru Granth Sahib Ji')
    expect(results[0].translation_en).toContain('Waaheguru')
    expect(results[0].sourceMeta?.english).toBe('Sri Guru Granth Sahib Ji')
    expect(results[0].raagMeta?.english).toBe('Raag Asa')
    expect(results[0].writerMeta?.english).toBe('Guru Arjan Dev Ji')
    expect(results[0].larivaar).toBe('ਵਾਹਿਗੁਰੂਵਾਹਿਗੁਰੂ')
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
    expect(shabads[0].translationEn).toContain('countless salutations')
    expect(shabads[0].sourceMeta?.sourceId).toBe('G')
    expect(shabads[0].sourceMeta?.english).toBe('Sri Guru Granth Sahib Ji')
    expect(shabads[0].sourceMeta?.pageNo).toBe(256)
    expect(shabads[0].sourceAng).toBe(256)
    expect(shabads[0].amritPageNo).toBe(65)
    expect(shabads[0].lineNo).toBe(4)
    expect(shabads[0].raagMeta?.english).toBe('Raag Gauree')
    expect(shabads[0].writerMeta?.english).toBe('Guru Arjan Dev Ji')
    expect(shabads[1].raagMeta?.raagWithPage).toBe('Raag Gujri (489-526)')
  })
})

describe('reference fetchers', () => {
  it('loads BaniDB kosh definitions', async () => {
    const entries = await fetchKoshEntries('ੴ')
    expect(entries).toEqual([
      {
        id: 1,
        word: 'ik oankar',
        wordUni: 'ੴ',
        definition: 'One Creator',
        definitionUni: 'ਇੱਕ ਕਰਤਾ ਪੁਰਖ',
      },
    ])
  })

  it('loads rehats, chapters, and chapter content', async () => {
    const rehats = await fetchRehats()
    expect(rehats[0]).toEqual({
      rehatId: 1,
      rehatName: 'Sikh Rehat Maryada',
      alphabet: 'S',
    })

    const chapters = await fetchRehatChapters(1)
    expect(chapters).toEqual([
      {
        chapterId: 11,
        chapterName: 'Daily Discipline',
        alphabet: 'D',
      },
      {
        chapterId: 12,
        chapterName: 'Shared Conduct',
        alphabet: 'S',
      },
    ])

    const chapter = await fetchRehatChapter(1, 11)
    expect(chapter).toEqual({
      rehatId: 1,
      chapterId: 11,
      chapterName: 'Daily Discipline',
      chapterContent: '<p>Amritvela, nitnem, seva, and simran remain central.</p>',
      alphabet: 'D',
    })
  })
})

describe('fetchBani', () => {
  it('defaults Rehras Sahib to the short STTM length without producing Ang 0 and keeps later sections', async () => {
    const result = await fetchBani(21)
    expect(result.availableLengths).toEqual(['short', 'medium', 'long', 'extralong'])
    expect(result.resolvedLength).toBe('short')
    expect(result.entries).toHaveLength(3)
    expect(result.entries[0].ang).toBe(8)
    expect(result.entries[0].lines?.[0].isHeader).toBe(false)
    expect(result.entries[0].lines?.[0].originalAng).toBe(8)
    expect(result.entries[0].lines?.[0].ang).toBe(8)
    expect(result.entries[1].ang).toBe(1386)
    expect(result.entries[2].ang).toBe(917)
    expect(firstVisibleLine(result.entries)).toBe('ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥')
    expect(introLines(result.entries)).not.toContain('ਧੰਨੁ ਸੁ ਕਾਗਦੁ ਕਲਮ ਧੰਨੁ ਧਨ ਭਾਂਡਾ ਧਨੁ ਮਸੁ ॥')
  })

  it('filters Rehras Sahib to the long STTM start when requested', async () => {
    const result = await fetchBani(21, 'long')
    expect(result.resolvedLength).toBe('long')
    expect(firstVisibleLine(result.entries)).toBe('ਹਰਿ ਜੁਗੁ ਜੁਗੁ ਭਗਤ ਉਪਾਇਆ ਪੈਜ ਰਖਦਾ ਆਇਆ ਰਾਮ ਰਾਜੇ ॥')
  })

  it('keeps extra-long Rehras opening lines ordered and only marks real BaniDB headers', async () => {
    const result = await fetchBani(21, 'extralong')
    expect(result.resolvedLength).toBe('extralong')
    const openingLines = result.entries[0].lines ?? []

    expect(openingLines.slice(0, 4).map(line => line.gurmukhi)).toEqual([
      'ਰਹਰਾਸਿ ਸਾਹਿਬ',
      'ਸਲੋਕ ਮਃ ੧ ॥',
      'ਧੰਨੁ ਸੁ ਕਾਗਦੁ ਕਲਮ ਧੰਨੁ ਧਨ ਭਾਂਡਾ ਧਨੁ ਮਸੁ ॥',
      'ਹਰਿ ਜੁਗੁ ਜੁਗੁ ਭਗਤ ਉਪਾਇਆ ਪੈਜ ਰਖਦਾ ਆਇਆ ਰਾਮ ਰਾਜੇ ॥',
    ])
    expect(openingLines[0]).toMatchObject({ isHeader: true, headerLevel: 1 })
    expect(openingLines[1]?.isHeader).toBe(false)
    expect(introLines(result.entries)).not.toContain('ਧੰਨੁ ਸੁ ਕਾਗਦੁ ਕਲਮ ਧੰਨੁ ਧਨ ਭਾਂਡਾ ਧਨੁ ਮਸੁ ॥')
  })

  it('normalizes Benati Chaupai Sahib to three distinct ordered bands', async () => {
    const shortResult = await fetchBani(9, 'short')
    const mediumResult = await fetchBani(9, 'medium')
    const longResult = await fetchBani(9, 'long')
    const extraLongResult = await fetchBani(9, 'extralong')

    expect(shortResult.availableLengths).toEqual(['short', 'medium', 'long'])
    expect(shortResult.resolvedLength).toBe('short')
    expect(mediumResult.resolvedLength).toBe('medium')
    expect(longResult.resolvedLength).toBe('long')
    expect(extraLongResult.resolvedLength).toBe('long')
    expect(firstVisibleLine(shortResult.entries)).toBe('ਕਬਿਯੋ ਬਾਚ ਬੇਨਤੀ ॥')
    expect(firstVisibleLine(mediumResult.entries)).toBe('ੴ ਸ੍ਰੀ ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫਤਹ ॥')
    expect(introLines(longResult.entries)).toContain('ਦੋਹਰਾ ॥')
    expect(introLines(extraLongResult.entries)).toContain('ਦੋਹਰਾ ॥')
  })

  it('normalizes Aarti to three ordered bands and keeps Kirtan Sohila at four', async () => {
    const aartiShort = await fetchBani(22, 'short')
    const aarti = await fetchBani(22, 'extralong')
    const sohila = await fetchBani(23, 'long')

    expect(aartiShort.availableLengths).toEqual(['short', 'medium', 'long'])
    expect(aartiShort.resolvedLength).toBe('short')
    expect(firstVisibleLine(aartiShort.entries)).toBe('ਸਭ ਮਹਿ ਜੋਤਿ ਜੋਤਿ ਹੈ ਸੋਇ ॥')
    expect(aarti.availableLengths).toEqual(['short', 'medium', 'long'])
    expect(aarti.resolvedLength).toBe('long')
    expect(sohila.availableLengths).toEqual(['short', 'medium', 'long', 'extralong'])
    expect(sohila.resolvedLength).toBe('long')
    expect(introLines(aarti.entries)).toContain('ਆਰਤੀ-ਆਰਤਾ')
    expect(introLines(sohila.entries)).toContain('ਰਾਗੁ ਗਉੜੀ ਦੀਪਕੀ ਮਹਲਾ ੧ ॥')
    const sohilaExtraLong = await fetchBani(23, 'extralong')
    expect(sohilaExtraLong.resolvedLength).toBe('extralong')
    expect(introLines(sohilaExtraLong.entries)).toContain('ਸੋਹਿਲਾ ਸਾਹਿਬ')
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
