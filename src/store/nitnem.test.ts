import { beforeEach, expect, test } from 'vitest'
import {
  buildNitnemStudyPath,
  DEFAULT_NITNEM_OPTION_IDS,
  NITNEM_ROUTE_OPTIONS,
  getNitnemOption,
  normalizePersistedNitnemIds,
  useNitemStore,
} from './nitnem'
import { useSundarGutkaLengthStore } from './sundarGutkaLength'

beforeEach(() => {
  localStorage.clear()
  useSundarGutkaLengthStore.setState({
    lengths: {
      'chaupai-sahib': 'short',
      'rehras-sahib': 'short',
      aarti: 'short',
      'kirtan-sohila': 'short',
    },
  })
  useNitemStore.setState({
    completedDate: '2026-04-08',
    completedIds: [],
    selectedIds: [...DEFAULT_NITNEM_OPTION_IDS],
  })
})

test('keeps the default daily nitnem selection', () => {
  expect(useNitemStore.getState().selectedIds).toEqual([...DEFAULT_NITNEM_OPTION_IDS])
})

test('keeps the additional banis grouped under Additional with clean card copy', () => {
  const additionalOptions = NITNEM_ROUTE_OPTIONS.filter(option => option.group === 'Additional')

  expect(additionalOptions.map(option => option.id)).toEqual([
    'salok-mahalla-9',
    'sukhmani-sahib',
    'asa-di-var',
    'aarti',
    'laavan',
  ])
  expect(DEFAULT_NITNEM_OPTION_IDS).not.toEqual(
    expect.arrayContaining(additionalOptions.map(option => option.id))
  )

  const aarti = getNitnemOption('aarti')
  expect(aarti).not.toBeNull()
  expect(aarti?.gurmukhiTitle).toBe('ਆਰਤੀ')
  expect(aarti?.romanizedTitle).toBe('Aarti')
  expect(aarti?.supportsLengthAdjustment).toBe(true)

  const salokMahalla9 = getNitnemOption('salok-mahalla-9')
  expect(salokMahalla9).not.toBeNull()
  expect(salokMahalla9?.gurmukhiTitle).toBe('ਸਲੋਕ ਮਹਲਾ ੯')
  expect(salokMahalla9?.romanizedTitle).toBe('Salok Mahalla 9')
  expect(salokMahalla9?.supportsLengthAdjustment).toBe(false)
  expect(additionalOptions.map(option => option.detail)).not.toContain('Optional Sundar Gutka bani.')
})

test('normalizes legacy focused selections onto the single supported bani route', () => {
  expect(normalizePersistedNitnemIds(['rehras-sahib-focused', 'rehras-sahib'])).toEqual(['rehras-sahib'])
})

test('builds an exact study path with sgLength for adjustable Rehras Sahib', () => {
  const option = getNitnemOption('rehras-sahib')
  expect(option).not.toBeNull()

  expect(buildNitnemStudyPath(option!)).toBe(
    '/study?source=G&ang=8&startAng=8&endAng=12&bani=Rehras+Sahib&baniDbId=21&exactBani=1&baniId=rehras-sahib&sgLength=short'
  )
})

test('builds an adjustable exact route for Benati Chaupai Sahib', () => {
  const option = getNitnemOption('chaupai-sahib')
  expect(option).not.toBeNull()

  expect(buildNitnemStudyPath(option!)).toBe(
    '/study?source=D&ang=1386&startAng=1386&endAng=1388&bani=Benati+Chaupai+Sahib&baniDbId=9&exactBani=1&baniId=chaupai-sahib&sgLength=short'
  )
})

test('builds the real exact route for the Dheenan Ki Savaiye variant', () => {
  const option = getNitnemOption('tav-prasad-savaiye-dheenan-ki')
  expect(option).not.toBeNull()

  expect(buildNitnemStudyPath(option!)).toBe(
    '/study?source=D&ang=11&startAng=11&endAng=37&bani=Tav+Prasad+Savaiye+%28Dheenan+Ki%29&baniDbId=7&exactBani=1&baniId=tav-prasad-savaiye'
  )
})
