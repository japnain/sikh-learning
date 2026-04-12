import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createNaamrasObjectId, getNaamrasDeviceId } from '../insforge/device'
import type { CloudActivityEvent } from '../insforge/types'

interface ActivityEventsState {
  pendingEvents: CloudActivityEvent[]
  appendEvent: (eventType: string, payload?: Record<string, unknown>, occurredAt?: string) => CloudActivityEvent
  acknowledgeEvents: (ids: string[]) => void
  clearPendingEvents: () => void
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
          pendingEvents: [...state.pendingEvents, event],
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
