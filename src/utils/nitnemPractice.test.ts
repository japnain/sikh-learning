import { beforeEach, expect, test } from 'vitest'
import { buildNitnemStudyPath, getNitnemOption } from '../store/nitnem'
import type { NitnemPracticeSession } from '../store/nitnemPractice'
import { getExactReadingKey } from '../store/readingPlaces'
import type { Session } from '../store/progress'
import { DEFAULT_SUNDAR_GUTKA_LENGTHS, useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { getActiveNitnemPractice, getNitnemPracticeResume, isActiveNitnemPracticeReading, isNitnemPracticeReading } from './nitnemPractice'

beforeEach(() => useSundarGutkaLengthStore.setState({ lengths: { ...DEFAULT_SUNDAR_GUTKA_LENGTHS } }))

const pathFor = (id: string, length?: string) => {
  const params = new URLSearchParams(buildNitnemStudyPath(getNitnemOption(id)!).split('?')[1])
  if (length) params.set('sgLength', length)
  return `/study?${params}`
}
const practice = (path: string, overrides: Partial<NitnemPracticeSession> = {}): NitnemPracticeSession => {
  const startedAt = overrides.startedAt ?? '2026-10-22T12:00:00Z'
  const params = new URLSearchParams(path.split('?')[1])
  params.set('nitnemPractice', startedAt)
  return { optionId: 'rehras-sahib', readingPath: `/study?${params}`,
    startedAt, updatedAt: '2026-10-22T12:00:00Z', completed: false, ...overrides }
}
const saved = (path: string, verse: number, updatedAt: string): Session => ({
  scriptureId: 'G-8', resumePath: path, resumeVerseId: verse, updatedAt,
})

test('the open exact version can differ from the usual length without changing defaults', () => {
  const option = getNitnemOption('rehras-sahib')!
  const long = pathFor(option.id, 'long')
  const active = practice(long)
  expect(isNitnemPracticeReading(long, option)).toBe(true)
  expect(isActiveNitnemPracticeReading(`${active.readingPath}&ang=10&resumeVerseId=120`, active)).toBe(true)
  expect(isActiveNitnemPracticeReading(long, active)).toBe(false)
  expect(isActiveNitnemPracticeReading(pathFor(option.id, 'short'), active)).toBe(false)
  expect(useSundarGutkaLengthStore.getState().lengths['rehras-sahib']).toBe('short')
})

test('another Savaiye variant cannot occupy the active practice identity', () => {
  const standard = getNitnemOption('tav-prasad-savaiye')!
  const other = getNitnemOption('tav-prasad-savaiye-dheenan-ki')!
  expect(isNitnemPracticeReading(pathFor(standard.id), other)).toBe(false)
  expect(isNitnemPracticeReading(pathFor(other.id), standard)).toBe(false)
})

test('an adjustable practice requires an explicit resolved length', () => {
  const option = getNitnemOption('rehras-sahib')!
  const params = new URLSearchParams(pathFor(option.id).split('?')[1])
  params.delete('sgLength')
  expect(isNitnemPracticeReading(`/study?${params}`, option)).toBe(false)
})

test('fresh practice does not inherit older saved Study positions', () => {
  const option = getNitnemOption('rehras-sahib')!
  const path = pathFor(option.id)
  const old = saved(path, 222, '2026-10-21T12:00:00Z')
  expect(getNitnemPracticeResume(option, null, { [getExactReadingKey(path)!]: old }, old)).toBeNull()
  const active = practice(path)
  expect(getNitnemPracticeResume(option, active, { [getExactReadingKey(path)!]: old }, old)).toBe(active.readingPath)
})

test('even newer Study anchors for the same version cannot replace the authoritative practice position', () => {
  const option = getNitnemOption('rehras-sahib')!
  const path = pathFor(option.id, 'long')
  const place = saved(path, 333, '2026-10-22T12:01:00Z')
  const current = saved(path, 444, '2026-10-22T12:02:00Z')
  const places = { [getExactReadingKey(path)!]: place }
  const active = practice(`${path}&resumeVerseId=123`)
  expect(getNitnemPracticeResume(option, active, places, current)).toBe(active.readingPath)
  expect(getNitnemPracticeResume(option, active, places, saved(pathFor('japji-sahib'), 555, '2026-10-22T12:03:00Z'))).toBe(active.readingPath)
  expect(getNitnemPracticeResume(option, active, places, saved(pathFor(option.id, 'short'), 666, '2026-10-22T12:04:00Z'))).toBe(active.readingPath)
})

test('a matching anchor carrying conflicting content never wins', () => {
  const option = getNitnemOption('rehras-sahib')!
  const path = pathFor(option.id)
  const active = practice(path)
  expect(getNitnemPracticeResume(option, active, {}, saved(`${path}&shabadId=123`, 444, '2026-10-22T12:02:00Z'))).toBe(active.readingPath)
})

test('completed or removed routine readings do not become the daily Continue target', () => {
  const option = getNitnemOption('rehras-sahib')!
  const active = practice(pathFor(option.id))
  expect(getActiveNitnemPractice([getNitnemOption('japji-sahib')!], active, '2026-10-22')).toBeNull()
  expect(getActiveNitnemPractice([option], { ...active, completed: true }, '2026-10-23')).toBeNull()
  expect(getNitnemPracticeResume(option, { ...active, completed: true })).toBeNull()
})
