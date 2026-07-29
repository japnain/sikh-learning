import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createNaamrasObjectId, getNaamrasDeviceId } from '../supabase/device'
import type { CloudActivityEvent } from '../supabase/types'

interface ActivityEventsState {
  pendingEvents: CloudActivityEvent[]
  appendEvent: (eventType: string, payload?: Record<string, unknown>, occurredAt?: string) => CloudActivityEvent
  acknowledgeEvents: (ids: string[]) => void
  clearPendingEvents: () => void
}

export const MAX_PENDING_ACTIVITY_EVENTS = 250

function retainNewestEvents(events: CloudActivityEvent[]) {
  return events.slice(-MAX_PENDING_ACTIVITY_EVENTS)
}

export const useActivityEventsStore = create<ActivityEventsState>()(
  persist(
    (set) => ({
      pendingEvents: [],
      appendEvent: (eventType, payload = {}, occurredAt = new Date().toISOString()) => {
        const event: CloudActivityEvent = {
          id: createNaamrasObjectId('event'),
          userId: null,
          deviceId: getNaamrasDeviceId(),
          eventType,
          occurredAt,
          clientUpdatedAt: occurredAt,
          deletedAt: null,
          payload,
        }

        set(state => ({
          pendingEvents: retainNewestEvents([...state.pendingEvents, event]),
        }))

        return event
      },
      acknowledgeEvents: (ids) => set(state => ({
        pendingEvents: state.pendingEvents.filter(event => !ids.includes(event.id)),
      })),
      clearPendingEvents: () => set({ pendingEvents: [] }),
    }),
    {
      name: 'naamras-cloud-activity-events',
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<ActivityEventsState> | undefined
        return {
          ...currentState,
          pendingEvents: retainNewestEvents(
            Array.isArray(persisted?.pendingEvents) ? persisted.pendingEvents : []
          ),
        }
      },
    }
  )
)

export function queueActivityEvent(
  eventType: string,
  payload: Record<string, unknown> = {},
  occurredAt?: string
) {
  return useActivityEventsStore.getState().appendEvent(eventType, payload, occurredAt)
}
