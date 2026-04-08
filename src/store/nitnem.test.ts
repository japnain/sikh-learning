import { beforeEach, expect, test } from 'vitest'
import {
  buildNitnemStudyPath,
  DEFAULT_NITNEM_OPTION_IDS,
  getNitnemOption,
  useNitemStore,
} from './nitnem'

beforeEach(() => {
  localStorage.clear()
  useNitemStore.setState({
    completedDate: '2026-04-08',
    completedIds: [],
    selectedIds: [...DEFAULT_NITNEM_OPTION_IDS],
  })
})

test('keeps the default daily nitnem selection', () => {
  expect(useNitemStore.getState().selectedIds).toEqual([...DEFAULT_NITNEM_OPTION_IDS])
})

test('can add a focused nitnem variant to the selected home list', () => {
  useNitemStore.getState().toggleSelected('rehras-sahib-focused')

  expect(useNitemStore.getState().selectedIds).toContain('rehras-sahib-focused')
})

test('builds a full exact study path for the puraatan rehras route', () => {
  const option = getNitnemOption('rehras-sahib')
  expect(option).not.toBeNull()

  expect(buildNitnemStudyPath(option!)).toBe(
    '/study?source=G&ang=8&startAng=8&endAng=12&bani=Rehras+Sahib+%28Puraatan%29&baniDbId=21&exactBani=1&baniId=rehras-sahib'
  )
})

test('builds a focused range route when no exact bani id exists', () => {
  const option = getNitnemOption('chaupai-sahib-focused')
  expect(option).not.toBeNull()

  expect(buildNitnemStudyPath(option!)).toBe(
    '/study?source=D&ang=1386&startAng=1386&endAng=1388&bani=Chaupai+Sahib+%28Focused%29&baniId=chaupai-sahib'
  )
})

test('builds the real exact route for the Dheenan Ki Savaiye variant', () => {
  const option = getNitnemOption('tav-prasad-savaiye-dheenan-ki')
  expect(option).not.toBeNull()

  expect(buildNitnemStudyPath(option!)).toBe(
    '/study?source=D&ang=11&startAng=11&endAng=37&bani=Tav+Prasad+Savaiye+%28Dheenan+Ki%29&baniDbId=7&exactBani=1&baniId=tav-prasad-savaiye'
  )
})
