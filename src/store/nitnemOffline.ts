import { create } from 'zustand'

export type NitnemOfflineStatus = 'checking' | 'preparing' | 'ready' | 'offline' | 'paused' | 'partial' | 'error'

interface NitnemOfflineState {
  ready: number
  total: number
  status: NitnemOfflineStatus
  signature: string
  retryRevision: number
  retry: () => void
}

/** Verified readiness for the saved routine, never the unsaved editor draft. */
export const useNitnemOfflineStatusStore = create<NitnemOfflineState>(set => ({
  ready: 0, total: 0, status: 'checking', signature: '', retryRevision: 0,
  retry: () => set(state => ({ retryRevision: state.retryRevision + 1 })),
}))
