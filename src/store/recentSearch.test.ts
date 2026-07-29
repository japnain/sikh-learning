import { beforeEach, expect, test, vi } from 'vitest'
import { useRecentSearchStore } from './recentSearch'

beforeEach(() => {
  localStorage.clear()
  useRecentSearchStore.setState({ recent: [] })
})

test('keeps a pinned search pinned when it is repeated', () => {
  vi.setSystemTime(new Date('2026-07-25T12:00:00.000Z'))
  const store = useRecentSearchStore.getState()
  store.addRecent('Japji Sahib', 'all')
  store.togglePinned('Japji Sahib', 'all')

  vi.setSystemTime(new Date('2026-07-25T13:00:00.000Z'))
  useRecentSearchStore.getState().addRecent('Japji Sahib', 'all')

  expect(useRecentSearchStore.getState().recent).toEqual([{
    query: 'Japji Sahib',
    mode: 'all',
    pinned: true,
    savedAt: '2026-07-25T13:00:00.000Z',
  }])
})
