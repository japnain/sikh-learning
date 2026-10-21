import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { getNitnemCompletedIds, getNitnemHistorySummary, normalizeWeeklyDayGoal, type NitnemCompletionEvent, useNitnemHistoryStore } from './nitnemHistory'

function event(date: string, optionId = 'japji-sahib', completed = true, hour = 8): NitnemCompletionEvent {
  const [year, month, day] = date.split('-').map(Number)
  return { id: `${date}:${optionId}:${hour}:${completed}`, optionId, date, completed,
    occurredAt: new Date(year, month - 1, day, hour).toISOString(), source: 'manual', wasSelected: true }
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 17, 12))
  localStorage.clear()
  useNitnemHistoryStore.setState({ events: [], remoteDays: {} })
})
afterEach(() => vi.useRealTimers())

test('derives a Monday week and genuine current and best streaks from confirmed completions', () => {
  const events = ['2026-10-05','2026-10-06','2026-10-07','2026-10-15','2026-10-16'].map(date => event(date))
  const summary = getNitnemHistorySummary(events, new Date(), 4)
  expect(summary.currentStreak).toBe(2)
  expect(summary.bestStreak).toBe(3)
  expect(summary.week.map(day => day.date)).toEqual(['2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16','2026-10-17','2026-10-18'])
  expect(summary.completedDaysThisWeek).toBe(2)
  expect(summary.week[5]).toMatchObject({ isToday: true, completed: false })
  expect(summary.week[6].isFuture).toBe(true)
  expect(summary.weeklyDayGoal).toBe(4)
})

test('undo removes a successful day only when no other selected bani remains complete', () => {
  const events = [event('2026-10-17'), event('2026-10-17','jaap-sahib'),event('2026-10-17','japji-sahib',false,9)]
  expect(getNitnemCompletedIds(events,'2026-10-17')).toEqual(['jaap-sahib'])
  expect(getNitnemHistorySummary(events).currentStreak).toBe(1)
  expect(getNitnemHistorySummary([...events,event('2026-10-17','jaap-sahib',false,10)]).currentStreak).toBe(0)
})

test('does not count future, unselected, or merely opened reading activity', () => {
  expect(getNitnemHistorySummary([]).bestStreak).toBe(0)
  const unselected = { ...event('2026-10-17'), wasSelected: false }
  expect(getNitnemHistorySummary([unselected,event('2026-10-18')]).successfulDays).toEqual([])
})

test('calendar-day streaks remain correct across daylight-saving and year boundaries', () => {
  const dst = ['2026-10-31','2026-11-01','2026-11-02'].map(date => event(date))
  expect(getNitnemHistorySummary(dst,new Date(2026,10,2,12)).currentStreak).toBe(3)
  expect(getNitnemHistorySummary([event('2025-12-31'),event('2026-01-01')],new Date(2026,0,1,12)).currentStreak).toBe(2)
})

test('imports only valid legacy dates once and preserves newer undo truth', () => {
  const store = useNitnemHistoryStore.getState()
  store.importLegacy('2026-02-31',['japji-sahib'])
  store.importLegacy('2026-10-18',['japji-sahib'])
  expect(useNitnemHistoryStore.getState().events).toEqual([])
  store.importLegacy('2026-10-17',['japji-sahib'])
  store.importLegacy('2026-10-17',['japji-sahib'])
  expect(useNitnemHistoryStore.getState().events).toHaveLength(1)
  store.record(event('2026-10-17','japji-sahib',false,9))
  store.importLegacy('2026-10-17',['japji-sahib'])
  expect(getNitnemHistorySummary(useNitnemHistoryStore.getState().events).successfulDays).toEqual([])
})

test('persists retained events and deduplicates transport retries', async () => {
  const record = event('2026-10-17')
  useNitnemHistoryStore.getState().record(record)
  useNitnemHistoryStore.getState().record(record)
  expect(useNitnemHistoryStore.getState().events).toHaveLength(1)
  await useNitnemHistoryStore.persist.rehydrate()
  expect(useNitnemHistoryStore.getState().events).toEqual([record])
})

test('keeps the weekly target between one and seven days', () => {
  expect(normalizeWeeklyDayGoal(undefined)).toBe(7)
  expect(normalizeWeeklyDayGoal(0)).toBe(1)
  expect(normalizeWeeklyDayGoal(8)).toBe(7)
})

test('ignores older remote revisions and never rewrites past-day history from projections', () => {
  const history = useNitnemHistoryStore.getState()
  history.reconcileCurrentDay('2026-10-16', ['japji-sahib'], 'past', '2026-10-16T10:00:00.000Z')
  expect(useNitnemHistoryStore.getState().events).toEqual([])
  history.reconcileCurrentDay('2026-10-17', ['japji-sahib'], 'complete', '2026-10-17T10:00:00.000Z')
  history.reconcileCurrentDay('2026-10-17', [], 'undo', '2026-10-17T11:00:00.000Z')
  history.reconcileCurrentDay('2026-10-17', ['japji-sahib'], 'complete', '2026-10-17T10:00:00.000Z')
  expect(getNitnemCompletedIds(useNitnemHistoryStore.getState().events,'2026-10-17')).toEqual([])
  expect(useNitnemHistoryStore.getState().events).toHaveLength(2)
})
