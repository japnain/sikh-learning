import { describe, expect, test } from 'vitest'
import {
  getAngTargets,
  getAppSearchMatches,
  getLibrarySearchMatches,
  isDirectLookupQuery,
} from './appSearch'

describe('getAngTargets', () => {
  test('accepts positive decimal integer digits', () => {
    expect(getAngTargets(' 1 ', 'G')).toEqual([expect.objectContaining({
      source: 'G',
      path: '/study?source=G&ang=1',
    })])
    expect(getAngTargets('001', 'G')).toEqual([expect.objectContaining({
      source: 'G',
      path: '/study?source=G&ang=1',
    })])
    expect(getAngTargets('੧੪੩੦', 'G')).toEqual([expect.objectContaining({
      source: 'G',
      path: '/study?source=G&ang=1430',
    })])
    expect(getAngTargets('१४३०', 'G')).toEqual([expect.objectContaining({
      source: 'G',
      path: '/study?source=G&ang=1430',
    })])
  })

  test('offers only source readers backed by the BaniDB ang endpoint', () => {
    const targets = getAngTargets('12', 'all')

    expect(targets.map(target => target.source)).toEqual(['G', 'D', 'B'])
    expect(targets).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/study?source=A&ang=12' }),
    ]))
    expect(getAngTargets('12', 'A')).toEqual([])
  })

  test.each([
    '0',
    '-1',
    '+1',
    '1.5',
    '1e2',
    'Infinity',
    '12 ang',
    '੧.੫',
  ])('rejects non-positive or non-decimal-integer input %j', query => {
    expect(getAngTargets(query, 'all')).toEqual([])
  })
})

test.each(['12', '੧੨', '१२'])('recognizes %s as a direct lookup in auto-detect mode', query => {
  expect(isDirectLookupQuery(query)).toBe(true)
})

test('includes standalone and browse-only reading destinations', () => {
  expect(getAppSearchMatches('Ardaas')).toEqual(expect.arrayContaining([
    expect.objectContaining({ label: 'Ardaas', path: '/study?baniDbId=24&bani=Ardaas' }),
  ]))
  expect(getAppSearchMatches('Zafarnama')).toEqual(expect.arrayContaining([
    expect.objectContaining({ label: 'Zafarnama', kind: 'read-route' }),
  ]))
  expect(getAppSearchMatches('Bhai Gurdas')).toEqual(expect.arrayContaining([
    expect.objectContaining({ label: 'Bhai Gurdas Ji Vaaran', kind: 'read-route' }),
  ]))
  expect(getAppSearchMatches('Amrit Keertan')).toEqual(expect.arrayContaining([
    expect.objectContaining({ label: 'Amrit Keertan', path: '/banis/amrit-keertan' }),
  ]))
})

test('honors the selected source for app destinations', () => {
  expect(getAppSearchMatches('Amrit Keertan', 'G')).toEqual([])
  expect(getAppSearchMatches('Amrit Keertan', 'A')).toEqual(expect.arrayContaining([
    expect.objectContaining({ path: '/banis/amrit-keertan' }),
  ]))
})

test('finds library works and matching Panth Prakash chapters', async () => {
  await expect(getLibrarySearchMatches('Panth Prakash')).resolves.toEqual(expect.arrayContaining([
    expect.objectContaining({
      label: 'Sri Gur Panth Prakash',
      path: '/library/panth-prakash-english',
      kind: 'library-work',
    }),
  ]))
  await expect(getLibrarySearchMatches('Origin of the Khalsa')).resolves.toEqual(expect.arrayContaining([
    expect.objectContaining({
      label: 'Origin of the Khalsa',
      path: '/library/panth-prakash-english/chapters/episode-001',
      kind: 'library-chapter',
    }),
  ]))
})
