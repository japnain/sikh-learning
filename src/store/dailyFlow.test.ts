import { beforeEach, expect, test, vi } from 'vitest'
import { useDailyFlowStore } from './dailyFlow'

beforeEach(() => {
  localStorage.clear()
  useDailyFlowStore.setState({
    date: '2026-04-06',
    completedActionIds: [],
  })
  vi.useRealTimers()
})

test('toggles daily actions', () => {
  useDailyFlowStore.getState().toggleAction('read')
  expect(useDailyFlowStore.getState().isCompleted('read')).toBe(true)

  useDailyFlowStore.getState().toggleAction('read')
  expect(useDailyFlowStore.getState().isCompleted('read')).toBe(false)
})

test('resets state on a new day', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-04-07T12:00:00Z'))

  useDailyFlowStore.setState({
    date: '2026-04-06',
    completedActionIds: ['read', 'grow'],
  })

  useDailyFlowStore.getState().ensureToday()
  expect(useDailyFlowStore.getState().completedActionIds).toEqual([])
})
