import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toLocalDayStamp } from '../utils/localDates'

export interface NitnemCompletionEvent {
  id: string
  optionId: string
  date: string
  completed: boolean
  occurredAt: string
  source: 'manual' | 'legacy' | 'remote'
  wasSelected: boolean
}

interface NitnemHistoryState {
  events: NitnemCompletionEvent[]
  remoteDays: Record<string, { revision: string; updatedAt: string }>
  record: (event: NitnemCompletionEvent) => void
  importLegacy: (date: string, ids: string[]) => void
  reconcileCurrentDay: (date: string, ids: string[], revision: string, updatedAt: string) => void
}

export function normalizeWeeklyDayGoal(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(1, Math.min(7, Math.round(value)))
    : 7
}

function isDayStamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  return toLocalDayStamp(new Date(year, month - 1, day)) === value
}

function isEvent(value: unknown): value is NitnemCompletionEvent {
  if (!value || typeof value !== 'object') return false
  const event = value as Partial<NitnemCompletionEvent>
  return typeof event.id === 'string' && event.id.length > 0
    && typeof event.optionId === 'string' && /^[a-z][a-z0-9-]*$/.test(event.optionId)
    && isDayStamp(event.date)
    && typeof event.completed === 'boolean'
    && typeof event.wasSelected === 'boolean'
    && typeof event.occurredAt === 'string' && Number.isFinite(Date.parse(event.occurredAt))
    && (event.source === 'manual' || event.source === 'legacy' || event.source === 'remote')
}

function normalizeEvents(input: unknown): NitnemCompletionEvent[] {
  if (!Array.isArray(input)) return []
  return [...new Map(input.filter(isEvent).map(event => [event.id, event])).values()]
}

/** Retained local history is independent of the cloud transport's capped outbox. */
export const useNitnemHistoryStore = create<NitnemHistoryState>()(
  persist(
    (set, get) => ({
      events: [],
      remoteDays: {},
      record: event => {
        if (!isEvent(event) || get().events.some(existing => existing.id === event.id)) return
        set(state => ({ events: [...state.events, event] }))
      },
      importLegacy: (date, ids) => {
        if (!isDayStamp(date) || date > toLocalDayStamp(new Date())) return
        const [year, month, day] = date.split('-').map(Number)
        const occurredAt = new Date(year, month - 1, day).toISOString()
        const existing = new Set(get().events.filter(event => event.date === date).map(event => event.optionId))
        const imported = [...new Set(ids)].map(optionId => ({
          id: `legacy:${date}:${optionId}`,
          optionId, date, completed: true, occurredAt,
          source: 'legacy' as const, wasSelected: true,
        })).filter(event => isEvent(event) && !existing.has(event.optionId))
        if (imported.length) set(state => ({ events: [...state.events, ...imported] }))
      },
      reconcileCurrentDay: (date, ids, revision, updatedAt) => {
        if (date !== toLocalDayStamp(new Date()) || !Number.isFinite(Date.parse(updatedAt))) return
        const state = get()
        const previous = state.remoteDays[date]
        if (previous?.revision === revision || (previous && Date.parse(previous.updatedAt) > Date.parse(updatedAt))) return
        const completed = new Set(ids)
        const before = new Set(getNitnemCompletedIds(state.events, date))
        const changedIds = [...new Set([...before, ...completed])].filter(id => before.has(id) !== completed.has(id))
        const latestTime = state.events.filter(event => event.date === date)
          .reduce((latest, event) => Math.max(latest, Date.parse(event.occurredAt)), 0)
        const occurredAt = new Date(Math.max(Date.now(), Date.parse(updatedAt), latestTime + 1)).toISOString()
        const changes = changedIds.map(optionId => ({
          id: `${revision}:${date}:${optionId}:${completed.has(optionId) ? '1' : '0'}`,
          optionId, date, completed: completed.has(optionId), occurredAt,
          source: 'remote' as const, wasSelected: true,
        })).filter(isEvent)
        set({ events: [...state.events, ...changes], remoteDays: { ...state.remoteDays, [date]: { revision, updatedAt } } })
      },
    }),
    {
      name: 'naamras-nitnem-history',
      version: 1,
      merge: (persisted, current) => ({
        ...current,
        events: normalizeEvents((persisted as Partial<NitnemHistoryState> | undefined)?.events),
        remoteDays: Object.fromEntries(Object.entries((persisted as Partial<NitnemHistoryState> | undefined)?.remoteDays ?? {})
          .filter(([date, value]) => isDayStamp(date) && value && typeof value.revision === 'string' && typeof value.updatedAt === 'string' && Number.isFinite(Date.parse(value.updatedAt)))),
      }),
    }
  )
)

export function getNitnemCompletedIds(events: NitnemCompletionEvent[], date: string): string[] {
  const latest = new Map<string, NitnemCompletionEvent>()
  for (const event of events) {
    if (event.date !== date) continue
    const previous = latest.get(event.optionId)
    if (!previous || event.occurredAt > previous.occurredAt
      || (event.occurredAt === previous.occurredAt && event.id > previous.id)) {
      latest.set(event.optionId, event)
    }
  }
  return [...latest.values()].filter(event => event.completed && event.wasSelected).map(event => event.optionId)
}

function dayOrdinal(stamp: string): number {
  const [year, month, day] = stamp.split('-').map(Number)
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000)
}

export function getNitnemHistorySummary(events: NitnemCompletionEvent[], now = new Date(), weeklyGoal = 7) {
  const today = toLocalDayStamp(now)
  const latest = new Map<string, NitnemCompletionEvent>()
  for (const event of events) {
    if (event.date > today) continue
    const key = `${event.date}:${event.optionId}`
    const previous = latest.get(key)
    if (!previous || event.occurredAt > previous.occurredAt
      || (event.occurredAt === previous.occurredAt && event.id > previous.id)) latest.set(key, event)
  }
  const successfulDays = [...new Set([...latest.values()]
    .filter(event => event.completed && event.wasSelected).map(event => event.date))].sort()
  const successes = new Set(successfulDays)
  const ordinals = new Set(successfulDays.map(dayOrdinal))
  const todayOrdinal = dayOrdinal(today)
  let cursor = ordinals.has(todayOrdinal) ? todayOrdinal : todayOrdinal - 1
  let currentStreak = 0
  while (ordinals.has(cursor)) { currentStreak += 1; cursor -= 1 }
  let bestStreak = 0
  let run = 0
  let previous: number | null = null
  for (const stamp of successfulDays) {
    const ordinal = dayOrdinal(stamp)
    run = previous !== null && ordinal === previous + 1 ? run + 1 : 1
    bestStreak = Math.max(bestStreak, run)
    previous = ordinal
  }
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7)
  const week = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(monday)
    date.setDate(date.getDate() + offset)
    const stamp = toLocalDayStamp(date)
    return { date: stamp, isToday: stamp === today, isFuture: stamp > today, completed: successes.has(stamp) }
  })
  return {
    currentStreak, bestStreak, successfulDays, week,
    completedDaysThisWeek: week.filter(day => day.completed).length,
    weeklyDayGoal: normalizeWeeklyDayGoal(weeklyGoal),
  }
}
