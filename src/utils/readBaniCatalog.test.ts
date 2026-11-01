import { describe, expect, test } from 'vitest'
import { READ_BANIDB_CATALOG_IDS } from '../data/banis'
import { buildReadBaniCatalog } from './readBaniCatalog'
import { BANI_SCRIPT_NAMES } from '../content/baniScriptNames'

describe('Read Bani presentation ownership', () => {
  test('keeps every exact provider ID reachable once without a network index', () => {
    const catalog = buildReadBaniCatalog()
    const all = [...catalog.sundarGutka.flatMap(group => group.items), ...catalog.scriptures.SGGS, ...catalog.scriptures.DG]
    const ids = all.flatMap(item => item.baniDbId ? [item.baniDbId] : [])
    expect(ids.slice().sort((a, b) => a - b)).toEqual(READ_BANIDB_CATALOG_IDS)
    expect(new Set(all.map(item => item.identity)).size).toBe(all.length)
    expect(catalog.sundarGutka.flatMap(group => group.items)).toHaveLength(18)
    expect(catalog.scriptures.SGGS).toHaveLength(76)
    expect(catalog.scriptures.DG).toHaveLength(11)
    for (const item of all.filter(item => item.baniDbId)) {
      expect(item.scriptTitle).toBe(BANI_SCRIPT_NAMES[item.baniDbId!]!.gurmukhi)
      expect(item.scriptTitle).toMatch(/[\u0A00-\u0A7F]/)
    }
  })

  test('deduplicates repeated provider rows while preserving different compositions and recensions', () => {
    const catalog = buildReadBaniCatalog([
      { id: 7, gurmukhi: 'ਦੀਨਨ ਕੀ', transliteration: 'Dheenan Ki' },
      { id: 7, gurmukhi: 'duplicate', transliteration: 'duplicate' },
      { id: 14, gurmukhi: 'ਕੁਚਜੀ', transliteration: 'Kuchji' },
      { id: 15, gurmukhi: 'ਸੁਚਜੀ', transliteration: 'Suchji' },
    ])
    const sundar = catalog.sundarGutka.flatMap(group => group.items)
    expect(sundar.filter(item => item.baniDbId === 7)).toEqual([
      expect.objectContaining({ identity: 'bani:7', scriptTitle: 'ਦੀਨਨ ਕੀ' }),
    ])
    expect(sundar.map(item => item.baniDbId)).toEqual(expect.arrayContaining([6, 7]))
    expect(catalog.scriptures.SGGS.map(item => item.baniDbId)).toEqual(expect.arrayContaining([14, 15]))
    expect(catalog.scriptures.DG.map(item => item.baniDbId)).toEqual(expect.arrayContaining([25, 26]))
  })

  test('uses the live index only to enrich names, never to remove canonical readings', () => {
    const catalog = buildReadBaniCatalog([{ id: 24, gurmukhi: 'ਅਰਦਾਸ', transliteration: '' }])
    expect(catalog.sundarGutka.flatMap(group => group.items)).toHaveLength(18)
    expect(catalog.sundarGutka.flatMap(group => group.items).find(item => item.baniDbId === 24)?.scriptTitle).toBe('ਅਰਦਾਸ')
    expect(catalog.scriptures.DG.find(item => item.bani?.id === 'zafarnama')).toMatchObject({ identity: 'browse:zafarnama' })
  })
})
