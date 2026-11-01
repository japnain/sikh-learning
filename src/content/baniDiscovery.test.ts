import { describe, expect, it } from 'vitest'
import { READ_BANIDB_CATALOG_IDS, READ_DIRECTORY_DG_BANIS } from '../data/banis'
import { BANI_DISCOVERY, getBaniDiscovery, getBrowseBaniDiscovery } from './baniDiscovery'
import { BHAGAT_BANI_DISCOVERY } from './baniDiscoveryBhagats'
import { DASAM_BANI_DISCOVERY } from './baniDiscoveryDasam'
import { SGGS_BANI_DISCOVERY } from './baniDiscoverySggs'
import { VAAR_BANI_DISCOVERY } from './baniDiscoveryVaars'

describe('researched bani discovery', () => {
  it('covers every supported exact reading once, with English naming, concise context and sources', () => {
    const authoredIds = [SGGS_BANI_DISCOVERY, DASAM_BANI_DISCOVERY, BHAGAT_BANI_DISCOVERY, VAAR_BANI_DISCOVERY].flatMap(Object.keys).map(Number)
    expect(new Set(authoredIds).size).toBe(authoredIds.length)
    expect(authoredIds.sort((a, b) => a - b)).toEqual(READ_BANIDB_CATALOG_IDS)
    for (const id of READ_BANIDB_CATALOG_IDS) {
      const entry = getBaniDiscovery(id)!
      expect(entry.name, `English name for ${id}`).toMatch(/[A-Za-z]/)
      expect(entry.summary.length, `Visible context for ${id}`).toBeGreaterThan(35)
      expect(entry.summary.length, `Concise context for ${id}`).toBeLessThanOrEqual(340)
      expect(entry.references.length, `Source for ${id}`).toBeGreaterThan(0)
      for (const ref of entry.references) {
        expect(new URL(ref.url).protocol).toBe('https:')
        expect(ref.label.length).toBeGreaterThan(3)
      }
      expect(`${entry.name} ${entry.summary}`).not.toMatch(/exact BaniDB|STTM length|served as|cataloged/i)
    }
  })

  it('keeps different readings distinct and explains excerpts and mixed collections', () => {
    expect(BANI_DISCOVERY[6].name).not.toBe(BANI_DISCOVERY[7].name)
    expect(BANI_DISCOVERY[25].name).not.toBe(BANI_DISCOVERY[26].name)
    expect(BANI_DISCOVERY[14].name).not.toBe(BANI_DISCOVERY[15].name)
    expect(`${BANI_DISCOVERY[67].summary} ${BANI_DISCOVERY[67].detail}`).toMatch(/Sadd/)
    expect(`${BANI_DISCOVERY[67].summary} ${BANI_DISCOVERY[67].detail}`).toMatch(/Balvand/)
    expect(`${BANI_DISCOVERY[19].name} ${BANI_DISCOVERY[19].summary} ${BANI_DISCOVERY[19].detail}`).toMatch(/first|opening/i)
    expect(getBrowseBaniDiscovery(READ_DIRECTORY_DG_BANIS.find(bani => bani.id === 'zafarnama')!)?.references.length).toBeGreaterThan(0)
  })
})
