import { beforeEach, expect, test, vi } from 'vitest'
import { migrateRecentSearchState, useRecentSearchStore } from './recentSearch'

beforeEach(() => {
  localStorage.clear()
  useRecentSearchStore.setState({ recent: [] })
})

test('keeps a pinned search pinned when it is repeated', () => {
  vi.setSystemTime(new Date('2026-07-25T12:00:00.000Z'))
  const store = useRecentSearchStore.getState()
  store.addRecent('Japji Sahib', 'auto-detect', 'G')
  store.togglePinned('Japji Sahib', 'auto-detect', 'G')

  vi.setSystemTime(new Date('2026-07-25T13:00:00.000Z'))
  useRecentSearchStore.getState().addRecent('Japji Sahib', 'auto-detect', 'G')

  expect(useRecentSearchStore.getState().recent).toEqual([{
    query: 'Japji Sahib',
    mode: 'auto-detect',
    source: 'G',
    pinned: true,
    savedAt: '2026-07-25T13:00:00.000Z',
  }])
})

test('keeps the same query separate when it belongs to different sources', () => {
  const store = useRecentSearchStore.getState()
  store.addRecent('hukam', 'english', 'G')
  store.addRecent('hukam', 'english', 'D')

  expect(useRecentSearchStore.getState().recent.map(item => item.source)).toEqual(['D', 'G'])
})

test('migrates legacy searches to all sources and repairs an invalid legacy mode', () => {
  expect(migrateRecentSearchState({
    recent: [{
      query: ' Japji Sahib ',
      mode: 'all',
      pinned: true,
      savedAt: '2026-07-25T12:00:00.000Z',
    }],
  })).toEqual({
    recent: [{
      query: 'Japji Sahib',
      mode: 'auto-detect',
      source: 'all',
      pinned: true,
      savedAt: '2026-07-25T12:00:00.000Z',
    }],
  })
})

test('stores a one-digit auto-detected direct lookup', () => {
  useRecentSearchStore.getState().addRecent('1', 'auto-detect', 'A')

  expect(useRecentSearchStore.getState().recent[0]).toMatchObject({
    query: '1',
    mode: 'auto-detect',
    source: 'A',
  })
})
