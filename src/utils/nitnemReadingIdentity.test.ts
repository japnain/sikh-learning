import { beforeEach, expect, test } from 'vitest'
import { buildNitnemStudyPath, getNitnemOption } from '../store/nitnem'
import { DEFAULT_SUNDAR_GUTKA_LENGTHS, useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { getNextIncompleteNitnemReading, getNextNitnemReading, getSelectedNitnemReading, isExactNitnemReading } from './nitnemReadingIdentity'

beforeEach(() => useSundarGutkaLengthStore.setState({ lengths: { ...DEFAULT_SUNDAR_GUTKA_LENGTHS } }))

test('matches exact identity despite current verse, Ang and display title', () => {
  const option = getNitnemOption('japji-sahib')!
  const params = new URLSearchParams(buildNitnemStudyPath(option).split('?')[1])
  params.set('ang', '5')
  params.set('resumeVerseId', '122')
  params.set('bani', 'A display title')
  expect(isExactNitnemReading(`/study?${params}`, option)).toBe(true)
})

test.each(['source', 'baniDbId', 'baniId', 'startAng', 'endAng', 'exactBani'])(
  'rejects a different or missing %s even when the display title matches', key => {
    const option = getNitnemOption('japji-sahib')!
    const params = new URLSearchParams(buildNitnemStudyPath(option).split('?')[1])
    params.delete(key)
    expect(isExactNitnemReading(`/study?${params}`, option)).toBe(false)
  },
)

test('does not grant completion to another selected Savaiye variant', () => {
  const reading = buildNitnemStudyPath(getNitnemOption('tav-prasad-savaiye')!)
  expect(getSelectedNitnemReading(reading, ['tav-prasad-savaiye-dheenan-ki'])).toBeNull()
  expect(getSelectedNitnemReading(reading, ['tav-prasad-savaiye-dheenan-ki', 'tav-prasad-savaiye'])?.id).toBe('tav-prasad-savaiye')
})

test.each(['shabadId=123', 'hukamnamaDate=2026-10-17', 'flow=ardaas-hukamnama'])(
  'rejects competing reader content even if exact Nitnem metadata is present: %s', conflictingRoute => {
    const option = getNitnemOption('japji-sahib')!
    expect(isExactNitnemReading(`${buildNitnemStudyPath(option)}&${conflictingRoute}`, option)).toBe(false)
  },
)

test('a previously opened length loses eligibility when the selected routine length changes', () => {
  const option = getNitnemOption('rehras-sahib')!
  const short = buildNitnemStudyPath(option)
  useSundarGutkaLengthStore.getState().setLength('rehras-sahib', 'long')
  expect(isExactNitnemReading(short, option)).toBe(false)
  expect(getSelectedNitnemReading(short, ['rehras-sahib'])?.id).toBe('rehras-sahib')
  expect(isExactNitnemReading(buildNitnemStudyPath(option), option)).toBe(true)
})

test('temporary length recognition never accepts lengths on fixed readings or a changed exact range', () => {
  expect(getSelectedNitnemReading(`${buildNitnemStudyPath(getNitnemOption('japji-sahib')!)}&sgLength=long`, ['japji-sahib'])).toBeNull()
  const rehras = buildNitnemStudyPath(getNitnemOption('rehras-sahib')!).replace('sgLength=short', 'sgLength=long')
  expect(getSelectedNitnemReading(rehras, ['rehras-sahib'])?.id).toBe('rehras-sahib')
  expect(getSelectedNitnemReading(rehras.replace('endAng=12', 'endAng=11'), ['rehras-sahib'])).toBeNull()
})

test('next follows personal order, skips complete items, wraps once and excludes the current reading', () => {
  const ids = ['rehras-sahib', 'jaap-sahib', 'japji-sahib']
  expect(getNextIncompleteNitnemReading('japji-sahib', ids, [])?.id).toBe('rehras-sahib')
  expect(getNextIncompleteNitnemReading('japji-sahib', ids, ['rehras-sahib'])?.id).toBe('jaap-sahib')
  expect(getNextIncompleteNitnemReading('japji-sahib', ids, ['rehras-sahib', 'jaap-sahib'])).toBeNull()
  expect(getNextIncompleteNitnemReading('japji-sahib', ['japji-sahib'], [])).toBeNull()
  expect(getNextIncompleteNitnemReading('unknown', ids, [])).toBeNull()
})

test('untracked next follows personal order through valid entries and stops at the end', () => {
  const ids = ['rehras-sahib', 'unknown', 'jaap-sahib', 'japji-sahib']
  expect(getNextNitnemReading('rehras-sahib', ids)?.id).toBe('jaap-sahib')
  expect(getNextNitnemReading('jaap-sahib', ids)?.id).toBe('japji-sahib')
  expect(getNextNitnemReading('japji-sahib', ids)).toBeNull()
  expect(getNextNitnemReading('unknown-current', ids)).toBeNull()
  expect(getNextNitnemReading('japji-sahib', ['japji-sahib'])).toBeNull()
})
