import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { buildNitnemStudyPath, getNitnemOption } from './nitnem'
import { useNitnemPracticeStore } from './nitnemPractice'
import { DEFAULT_SUNDAR_GUTKA_LENGTHS, useSundarGutkaLengthStore } from './sundarGutkaLength'
import { getActiveNitnemPractice } from '../utils/nitnemPractice'

const initial = '2026-10-22T23:58:00.000Z'
const tagged = (path: string, startedAt = initial) => {
  const params = new URLSearchParams(path.split('?')[1])
  params.set('nitnemPractice', startedAt)
  return `/study?${params}`
}
const pathFor = (id = 'rehras-sahib', length?: string) => {
  const path = buildNitnemStudyPath(getNitnemOption(id)!)
  if (!length) return path
  const params = new URLSearchParams(path.split('?')[1])
  params.set('sgLength', length)
  return `/study?${params}`
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(initial)
  localStorage.clear()
  useNitnemPracticeStore.setState({ active: null })
  useSundarGutkaLengthStore.setState({ lengths: { ...DEFAULT_SUNDAR_GUTKA_LENGTHS } })
})
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

test('explicitly starting a nonusual version captures its identity without editing the usual choice', () => {
  const path = pathFor('rehras-sahib', 'long')
  expect(useNitnemPracticeStore.getState().start('rehras-sahib', path)).toBe(true)
  expect(useNitnemPracticeStore.getState().active).toEqual({
    optionId: 'rehras-sahib', readingPath: tagged(path),
    startedAt: initial, updatedAt: initial, completed: false,
  })
  expect(useSundarGutkaLengthStore.getState().lengths['rehras-sahib']).toBe('short')
})

test.each([
  'https://example.com/study?source=G',
  '/study?source=G&ang=8',
  `${pathFor('japji-sahib')}&shabadId=123`,
  `${pathFor('japji-sahib')}&hukamnamaDate=2026-10-22`,
  `${pathFor('japji-sahib')}&flow=ardaas-hukamnama`,
])('does not start a practice from unrelated or competing content: %s', path => {
  expect(useNitnemPracticeStore.getState().start('japji-sahib', path)).toBe(false)
  expect(useNitnemPracticeStore.getState().active).toBeNull()
})

test('anchor updates cannot replace the intentional reading with another bani', () => {
  const store = useNitnemPracticeStore.getState()
  store.start('rehras-sahib', pathFor())
  vi.setSystemTime('2026-10-23T00:01:00.000Z')
  const resume = `${useNitnemPracticeStore.getState().active!.readingPath}&resumeVerseId=120`
  expect(store.updatePath(resume)).toBe(true)
  expect(useNitnemPracticeStore.getState().active).toMatchObject({
    readingPath: resume, startedAt: initial, updatedAt: '2026-10-23T00:01:00.000Z',
  })
  expect(store.updatePath(pathFor('japji-sahib'))).toBe(false)
  expect(store.updatePath(pathFor('rehras-sahib', 'long'))).toBe(false)
  expect(useNitnemPracticeStore.getState().active?.readingPath).toBe(resume)
})

test('switching the open version preserves the original intentional session', () => {
  const store = useNitnemPracticeStore.getState()
  store.start('rehras-sahib', pathFor())
  vi.setSystemTime('2026-10-23T00:01:00.000Z')
  const long = `${pathFor('rehras-sahib', 'long')}&resumeVerseId=400`
  expect(store.switchReading('rehras-sahib', long)).toBe(true)
  expect(useNitnemPracticeStore.getState().active).toMatchObject({
    readingPath: tagged(long), startedAt: initial, updatedAt: '2026-10-23T00:01:00.000Z',
  })
  expect(store.switchReading('japji-sahib', pathFor('japji-sahib'))).toBe(false)
  expect(useSundarGutkaLengthStore.getState().lengths['rehras-sahib']).toBe('short')
})

test('an unfinished session survives midnight and reload, while completion enables a fresh start', async () => {
  const store = useNitnemPracticeStore.getState()
  store.start('rehras-sahib', `${pathFor()}&resumeVerseId=120`)
  const persisted = localStorage.getItem('naamras-nitnem-practice')!
  useNitnemPracticeStore.setState({ active: null })
  localStorage.setItem('naamras-nitnem-practice', persisted)
  vi.setSystemTime('2026-10-23T00:01:00.000Z')
  await useNitnemPracticeStore.persist.rehydrate()
  const options = [getNitnemOption('rehras-sahib')!]
  expect(getActiveNitnemPractice(options, useNitnemPracticeStore.getState().active, '2026-10-23')?.readingPath).toContain('resumeVerseId=120')
  expect(store.finish('japji-sahib')).toBe(false)
  expect(store.finish('rehras-sahib')).toBe(true)
  expect(getActiveNitnemPractice(options, useNitnemPracticeStore.getState().active, '2026-10-23')).toBeNull()
  expect(store.start('rehras-sahib', pathFor())).toBe(true)
  expect(useNitnemPracticeStore.getState().active).toMatchObject({
    readingPath: tagged(pathFor(), '2026-10-23T00:01:00.001Z'), startedAt: '2026-10-23T00:01:00.001Z', completed: false,
  })
})

test('rehydration rejects malformed identity and dates rather than reviving arbitrary content', async () => {
  for (const active of [
    { optionId: 'rehras-sahib', readingPath: pathFor('japji-sahib'), startedAt: initial, updatedAt: initial },
    { optionId: 'rehras-sahib', readingPath: pathFor(), startedAt: initial, updatedAt: '2026-10-21T00:00:00Z' },
    { optionId: 'rehras-sahib', readingPath: pathFor(), startedAt: 'invalid', updatedAt: initial },
    { optionId: 'rehras-sahib', readingPath: pathFor(), startedAt: initial, updatedAt: initial, completed: 'yes' },
  ]) {
    localStorage.setItem('naamras-nitnem-practice', JSON.stringify({ version: 1, state: { active } }))
    await useNitnemPracticeStore.persist.rehydrate()
    expect(useNitnemPracticeStore.getState().active).toBeNull()
  }
})

test('storage failure reports session-only durability without preventing an intentional reading', () => {
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError') })
  expect(useNitnemPracticeStore.getState().start('rehras-sahib', pathFor())).toBe(false)
  expect(useNitnemPracticeStore.getState().active?.optionId).toBe('rehras-sahib')
  expect(useNitnemPracticeStore.getState().updatePath(`${useNitnemPracticeStore.getState().active!.readingPath}&resumeVerseId=123`)).toBe(false)
  expect(useNitnemPracticeStore.getState().active?.readingPath).toContain('resumeVerseId=123')
})

test('ordinary Study of the same bani and stale practice links cannot steal the active anchor', () => {
  const store = useNitnemPracticeStore.getState()
  store.start('rehras-sahib', pathFor())
  const previous = useNitnemPracticeStore.getState().active!
  expect(store.updatePath(`${pathFor()}&resumeVerseId=999`)).toBe(false)
  expect(store.start('rehras-sahib', pathFor())).toBe(true)
  const current = useNitnemPracticeStore.getState().active!
  expect(current.startedAt).not.toBe(previous.startedAt)
  expect(store.updatePath(`${previous.readingPath}&resumeVerseId=999`)).toBe(false)
  expect(store.updatePath(`${current.readingPath}&resumeVerseId=123`)).toBe(true)
})

test('a new intentional start replaces the single active context, and clear removes it', () => {
  const store = useNitnemPracticeStore.getState()
  store.start('rehras-sahib', pathFor())
  expect(store.start('japji-sahib', pathFor('japji-sahib'))).toBe(true)
  expect(useNitnemPracticeStore.getState().active?.optionId).toBe('japji-sahib')
  expect(store.clear()).toBe(true)
  expect(useNitnemPracticeStore.getState().active).toBeNull()
})
