import { describe, it, expect } from 'vitest'
import { fetchAng, fetchShabadWords } from './banidb'

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
