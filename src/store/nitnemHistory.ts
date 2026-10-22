import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toLocalDayStamp } from '../utils/localDates'
import { getExactReadingKey } from './readingPlaces'

export interface NitnemCompletionEvent {
  id: string
  optionId: string
  date: string
  completed: boolean
  occurredAt: string
  source: 'manual' | 'legacy' | 'remote'
  wasSelected: boolean
  /** Absent on legacy practice records; never infer it from today's preference. */
  readingPath?: string
  readingKey?: string
  undoesEventId?: string
}

interface NitnemHistoryState {
  events: NitnemCompletionEvent[]
  remoteDays: Record<string, { revision: string; updatedAt: string }>
  record: (event: NitnemCompletionEvent) => void
  importLegacy: (date: string, ids: string[]) => void
  importCompletionEvents: (events: unknown) => void
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

export function normalizeNitnemCompletionEvents(input: unknown): NitnemCompletionEvent[] {
  if (!Array.isArray(input)) return []
  const events = input.filter(isEvent).map(event => {
    const { readingPath, readingKey, undoesEventId, ...practice } = event
    const exactKey = typeof readingPath === 'string' ? getExactReadingKey(readingPath) : null
    return {
      ...practice,
      ...(exactKey && (!readingKey || readingKey === exactKey) ? { readingPath, readingKey: exactKey } : {}),
      ...(typeof undoesEventId === 'string' && undoesEventId ? { undoesEventId } : {}),
    }
  })
  return [...new Map(events.map(event => [event.id, event])).values()]
}

/** The confirmed bani/day event, independent of the currently selected version. */
export function getNitnemCompletionForDay(events: NitnemCompletionEvent[], date: string, optionId: string): NitnemCompletionEvent | null {
  let latest: NitnemCompletionEvent | null = null
  for (const event of events) {
    if (event.date !== date || event.optionId !== optionId) continue
    if (!latest || event.occurredAt > latest.occurredAt
      || (event.occurredAt === latest.occurredAt && event.id > latest.id)) latest = event
  }
  return latest?.completed && latest.wasSelected ? latest : null
}

function isLaterEvent(left: NitnemCompletionEvent, right: NitnemCompletionEvent): boolean {
  return left.occurredAt > right.occurredAt || (left.occurredAt === right.occurredAt && left.id > right.id)
}

/**
 * Older cloud payloads project completion at restore time without its version.
 * A later metadata-aware payload may describe the earlier real event. Enrich
 * that projection without replacing its clock/state or crossing an actual Undo.
 */
function enrichRemoteCompletionProvenance(events: NitnemCompletionEvent[], incoming: NitnemCompletionEvent[]): NitnemCompletionEvent[] {
  const latest = new Map<string, NitnemCompletionEvent>()
  const latestUndo = new Map<string, NitnemCompletionEvent>()
  for (const event of events) {
    const key = `${event.date}:${event.optionId}`
    const previous = latest.get(key)
    if (!previous || isLaterEvent(event, previous)) latest.set(key, event)
    const undo = latestUndo.get(key)
    if (!event.completed && (!undo || isLaterEvent(event, undo))) latestUndo.set(key, event)
  }
  const provenance = new Map<string, NitnemCompletionEvent>()
  for (const event of incoming) {
    if (!event.completed || !event.wasSelected || !event.readingPath || !event.readingKey) continue
    const key = `${event.date}:${event.optionId}`
    const projected = latest.get(key)
    if (!projected || projected.source !== 'remote' || !projected.completed || !projected.wasSelected
      || projected.readingPath || projected.readingKey || isLaterEvent(event, projected)) continue
    const undo = latestUndo.get(key)
    if (undo && isLaterEvent(undo, event)) continue
    const previous = provenance.get(projected.id)
    if (!previous || isLaterEvent(event, previous)) provenance.set(projected.id, event)
  }
  if (!provenance.size) return events
  return events.map(event => {
    const exact = provenance.get(event.id)
    return exact ? { ...event, readingPath: exact.readingPath, readingKey: exact.readingKey } : event
  })
}

/** Retained local history is independent of the cloud transport's capped outbox. */
export const useNitnemHistoryStore = create<NitnemHistoryState>()(
  persist(
    (set, get) => ({
      events: [],
      remoteDays: {},
      record: event => {
        const normalized = normalizeNitnemCompletionEvents([event])[0]
        if (!normalized || get().events.some(existing => existing.id === normalized.id)) return
        set(state => ({ events: [...state.events, normalized] }))
      },
      importCompletionEvents: input => {
        const incoming = normalizeNitnemCompletionEvents(input)
          .filter(event => event.date <= toLocalDayStamp(new Date()))
        const current = get().events
        const known = new Set(current.map(event => event.id))
        const added = incoming.filter(event => !known.has(event.id))
        const merged = added.length ? [...current, ...added] : current
        const events = enrichRemoteCompletionProvenance(merged, incoming)
        if (events !== current) set({ events })
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
        const changes = changedIds.map(optionId => {
          const previousCompletion = getNitnemCompletionForDay(state.events, date, optionId)
          return {
            id: `${revision}:${date}:${optionId}:${completed.has(optionId) ? '1' : '0'}`,
            optionId, date, completed: completed.has(optionId), occurredAt,
            source: 'remote' as const, wasSelected: true,
            ...(!completed.has(optionId) && previousCompletion ? {
              readingPath: previousCompletion.readingPath, readingKey: previousCompletion.readingKey,
              undoesEventId: previousCompletion.id,
            } : {}),
          }
        }).filter(isEvent)
        set({ events: [...state.events, ...changes], remoteDays: { ...state.remoteDays, [date]: { revision, updatedAt } } })
      },
    }),
    {
      name: 'naamras-nitnem-history',
      version: 1,
      merge: (persisted, current) => ({
        ...current,
        events: normalizeNitnemCompletionEvents((persisted as Partial<NitnemHistoryState> | undefined)?.events),
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
