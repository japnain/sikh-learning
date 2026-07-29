import { beforeEach, expect, test } from 'vitest'
import type { CloudActivityEvent } from '../supabase/types'
import {
  MAX_PENDING_ACTIVITY_EVENTS,
  useActivityEventsStore,
} from './activityEvents'

function eventFixture(index: number): CloudActivityEvent {
  const occurredAt = new Date(Date.UTC(2026, 6, 25, 0, 0, index)).toISOString()
  return {
    id: `event-${index}`,
    userId: null,
    deviceId: 'device-test',
    eventType: `test.event.${index}`,
    occurredAt,
    clientUpdatedAt: occurredAt,
    deletedAt: null,
    payload: { index },
  }
}

beforeEach(() => {
  localStorage.clear()
  useActivityEventsStore.setState({ pendingEvents: [] })
})

test('retains only the newest unsynced activity events', () => {
  const total = MAX_PENDING_ACTIVITY_EVENTS + 5
  for (let index = 0; index < total; index += 1) {
    useActivityEventsStore.getState().appendEvent(
      `test.event.${index}`,
      { index },
      new Date(Date.UTC(2026, 6, 25, 0, 0, index)).toISOString()
    )
  }

  const pending = useActivityEventsStore.getState().pendingEvents
  expect(pending).toHaveLength(MAX_PENDING_ACTIVITY_EVENTS)
  expect(pending[0]?.payload).toEqual({ index: 5 })
  expect(pending.at(-1)?.payload).toEqual({ index: total - 1 })
})

test('bounds an oversized queue when persisted state is rehydrated', async () => {
  const oversized = Array.from(
    { length: MAX_PENDING_ACTIVITY_EVENTS + 8 },
    (_value, index) => eventFixture(index)
  )
  localStorage.setItem('naamras-cloud-activity-events', JSON.stringify({
    state: { pendingEvents: oversized },
    version: 0,
  }))

  await useActivityEventsStore.persist.rehydrate()

  const pending = useActivityEventsStore.getState().pendingEvents
  expect(pending).toHaveLength(MAX_PENDING_ACTIVITY_EVENTS)
  expect(pending[0]?.id).toBe('event-8')
  expect(pending.at(-1)?.id).toBe(`event-${oversized.length - 1}`)
})

test('acknowledges retained events without disturbing newer unsynced events', () => {
  const events = [eventFixture(1), eventFixture(2), eventFixture(3)]
  useActivityEventsStore.setState({ pendingEvents: events })

  useActivityEventsStore.getState().acknowledgeEvents(['event-1', 'event-3'])

  expect(useActivityEventsStore.getState().pendingEvents.map(event => event.id)).toEqual(['event-2'])
})
