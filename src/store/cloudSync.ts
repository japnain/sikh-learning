import { create } from 'zustand'
import type { CloudUserSummary } from '../insforge/types'

export type CloudSyncStatus =
  | 'idle'
  | 'booting'
  | 'signed-out'
  | 'authenticating'
  | 'ready'
  | 'syncing'
  | 'offline'
  | 'error'

interface CloudSyncState {
  configured: boolean
  status: CloudSyncStatus
  currentUser: CloudUserSummary | null
  availableProviders: string[]
  lastSyncedAt: string | null
  lastError: string | null
  syncQueued: boolean
  setConfigured: (configured: boolean) => void
  setStatus: (status: CloudSyncStatus) => void
  setCurrentUser: (user: CloudUserSummary | null) => void
  setAvailableProviders: (providers: string[]) => void
  setLastSyncedAt: (value: string | null) => void
  setLastError: (value: string | null) => void
  setSyncQueued: (value: boolean) => void
  reset: () => void
}

const INITIAL_STATE = {
  configured: false,
  status: 'idle' as CloudSyncStatus,
  currentUser: null,
  availableProviders: [],
  lastSyncedAt: null,
  lastError: null,
  syncQueued: false,
}

export const useCloudSyncStore = create<CloudSyncState>()((set) => ({
  ...INITIAL_STATE,
  setConfigured: (configured) => set({ configured }),
  setStatus: (status) => set({ status }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  setAvailableProviders: (availableProviders) => set({ availableProviders }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setLastError: (lastError) => set({ lastError }),
  setSyncQueued: (syncQueued) => set({ syncQueued }),
  reset: () => set(INITIAL_STATE),
}))
