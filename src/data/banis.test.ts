import { describe, expect, it } from 'vitest'
import {
  READ_BANIDB_CATALOG_COUNT,
  READ_BANIDB_CATALOG_IDS,
  READ_DIRECTORY_DG_BANIS,
  READ_DIRECTORY_SGGS_BANIS,
  READ_EXACT_DG_BANIS,
  READ_EXACT_SGGS_BANIS,
  type Bani,
} from './banis'

const CURRENT_BANIDB_IDS = Array.from({ length: 107 }, (_, index) => index + 1)
  .filter(id => ![20, 37, 54].includes(id))

function exactIds(banis: Bani[]) {
  return banis
    .flatMap(bani => typeof bani.baniDbId === 'number' ? [bani.baniDbId] : [])
    .sort((left, right) => left - right)
}

describe('named BaniDB catalog', () => {
  it('covers every entry in the current 104-bani BaniDB index', () => {
    expect(READ_BANIDB_CATALOG_COUNT).toBe(104)
    expect(READ_BANIDB_CATALOG_IDS).toEqual(CURRENT_BANIDB_IDS)
  })

  it('keeps complete and non-overlapping source classifications', () => {
    const sggsIds = exactIds(READ_EXACT_SGGS_BANIS)
    const dasamIds = exactIds(READ_EXACT_DG_BANIS)

    expect(sggsIds).toHaveLength(89)
    expect(dasamIds).toHaveLength(14)
    expect(sggsIds.filter(id => dasamIds.includes(id))).toEqual([])
  })

  it('does not remove a source bani because it is also available in Sundar Gutka', () => {
    expect(exactIds(READ_DIRECTORY_SGGS_BANIS)).toEqual(exactIds(READ_EXACT_SGGS_BANIS))
    expect(exactIds(READ_DIRECTORY_DG_BANIS)).toEqual(exactIds(READ_EXACT_DG_BANIS))
  })
})
