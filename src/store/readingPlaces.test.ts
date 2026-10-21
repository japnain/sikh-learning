import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { buildNitnemStudyPath, getNitnemOption } from './nitnem'
import { useProgressStore, type Session } from './progress'
import { getExactReadingKey, useReadingPlacesStore } from './readingPlaces'
import { DEFAULT_SUNDAR_GUTKA_LENGTHS, useSundarGutkaLengthStore } from './sundarGutkaLength'
import { getHomeNitnemResume } from '../utils/homeNitnemResume'

afterEach(() => { vi.restoreAllMocks() })

beforeEach(() => {
  localStorage.clear()
  useReadingPlacesStore.setState({ places: {} })
  useProgressStore.setState({ currentSession: null })
  useSundarGutkaLengthStore.setState({ lengths: { ...DEFAULT_SUNDAR_GUTKA_LENGTHS } })
})

const sessionFor = (id: string, verse: number, date = '2026-10-17T12:00:00Z'): Session => ({
  scriptureId: 'G-1', resumePath: buildNitnemStudyPath(getNitnemOption(id)!),
  resumeVerseId: verse, updatedAt: date,
})

test('returning from another bani preserves each saved verse after local reload', async () => {
  const japji = sessionFor('japji-sahib', 101)
  const jaap = sessionFor('jaap-sahib', 202, '2026-10-17T13:00:00Z')
  useProgressStore.getState().updateSession(japji)
  useProgressStore.getState().updateSession(jaap)
  const persisted = localStorage.getItem('naamras-reading-places')!
  useReadingPlacesStore.setState({ places: {} })
  localStorage.setItem('naamras-reading-places', persisted)
  await useReadingPlacesStore.persist.rehydrate()
  const places = useReadingPlacesStore.getState().places
  expect(getHomeNitnemResume(getNitnemOption('japji-sahib')!, jaap, places)).toContain('resumeVerseId=101')
  expect(getHomeNitnemResume(getNitnemOption('jaap-sahib')!, jaap, places)).toContain('resumeVerseId=202')
})

test('short and long readings retain independent places and restore the chosen version', () => {
  useSundarGutkaLengthStore.getState().setLength('rehras-sahib', 'short')
  const short = sessionFor('rehras-sahib', 111)
  useProgressStore.getState().updateSession(short)
  useSundarGutkaLengthStore.getState().setLength('rehras-sahib', 'long')
  const long = sessionFor('rehras-sahib', 222, '2026-10-17T13:00:00Z')
  useProgressStore.getState().updateSession(long)
  const places = useReadingPlacesStore.getState().places
  expect(getHomeNitnemResume(getNitnemOption('rehras-sahib')!, short, places)).toContain('resumeVerseId=222')
  useSundarGutkaLengthStore.getState().setLength('rehras-sahib', 'short')
  expect(getHomeNitnemResume(getNitnemOption('rehras-sahib')!, long, places)).toContain('resumeVerseId=111')
})

test('exact Savaiye variants never share a reading place', () => {
  useProgressStore.getState().updateSession(sessionFor('tav-prasad-savaiye', 333))
  expect(getHomeNitnemResume(getNitnemOption('tav-prasad-savaiye-dheenan-ki')!, null, useReadingPlacesStore.getState().places)).toBeNull()
})

test('opening a reading without a visible verse does not erase its previous place', () => {
  const saved = sessionFor('japji-sahib', 123)
  useProgressStore.getState().updateSession(saved)
  useProgressStore.getState().updateSession({ ...saved, resumeVerseId: undefined, updatedAt: '2026-10-17T14:00:00Z' })
  expect(Object.values(useReadingPlacesStore.getState().places)[0].resumeVerseId).toBe(123)
  expect(getHomeNitnemResume(getNitnemOption('japji-sahib')!, useProgressStore.getState().currentSession, useReadingPlacesStore.getState().places)).toContain('resumeVerseId=123')
})

test('an older session cannot overwrite a newer local place', () => {
  const latest = sessionFor('japji-sahib', 456, '2026-10-17T14:00:00Z')
  useProgressStore.getState().updateSession(latest)
  useProgressStore.getState().updateSession(sessionFor('japji-sahib', 123))
  expect(getHomeNitnemResume(getNitnemOption('japji-sahib')!, useProgressStore.getState().currentSession, useReadingPlacesStore.getState().places)).toContain('resumeVerseId=456')
})

test('an older arrival retries a newer session-only place without replacing its verse', () => {
  const newer = sessionFor('japji-sahib', 456, '2026-10-17T14:00:00Z')
  const before = localStorage.getItem('naamras-reading-places')
  const failure = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError') })
  expect(useReadingPlacesStore.getState().remember(newer)).toBe(false)
  expect(localStorage.getItem('naamras-reading-places')).toBe(before)
  failure.mockRestore()
  expect(useReadingPlacesStore.getState().remember(sessionFor('japji-sahib', 123))).toBe(true)
  expect(Object.values(JSON.parse(localStorage.getItem('naamras-reading-places')!).state.places)).toEqual([newer])
})

test.each([
  '/study?source=G&ang=1',
  'https://example.com/study?source=G&exactBani=1',
  '/study?source=G&baniId=japji-sahib&baniDbId=2&startAng=8&endAng=1&exactBani=1',
])('ignores a non-exact or invalid reading identity: %s', path => {
  useProgressStore.getState().updateSession({ ...sessionFor('japji-sahib', 9), resumePath: path })
  expect(getExactReadingKey(path)).toBeNull()
  expect(useReadingPlacesStore.getState().places).toEqual({})
})

test('rehydration ignores tampered keys and malformed entries', async () => {
  const valid = sessionFor('japji-sahib', 9)
  localStorage.setItem('naamras-reading-places', JSON.stringify({ version: 1, state: { places: {
    wrong: valid, invalid: { ...valid, resumeVerseId: -1 }, external: { ...valid, resumePath: 'https://example.com' },
  } } }))
  await useReadingPlacesStore.persist.rehydrate()
  expect(Object.keys(useReadingPlacesStore.getState().places)).toEqual([getExactReadingKey(valid.resumePath)])
})

test('bounds device storage while retaining the fifty most recent exact reading places', () => {
  for (let index = 1; index <= 55; index += 1) {
    useProgressStore.getState().updateSession({
      ...sessionFor('japji-sahib', index, new Date(Date.UTC(2026, 9, 17, 12, index)).toISOString()),
      resumePath: `/study?source=G&baniId=reading-${index}&baniDbId=${index}&startAng=1&endAng=8&exactBani=1`,
    })
  }
  const values = Object.values(useReadingPlacesStore.getState().places)
  expect(values).toHaveLength(50)
  expect(values.some(value => value.resumeVerseId === 1)).toBe(false)
  expect(values.some(value => value.resumeVerseId === 55)).toBe(true)
})
