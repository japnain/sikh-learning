import { create } from 'zustand'
import { downloadBani, type BaniDownloadInfo, type BaniDownloadProgress, type BaniDownloadSource } from '../utils/baniDownloads'
import { OfflineReaderShellError } from '../utils/offlineReaderShell'

export interface DownloadQueueItem {
  key: string
  title: string
  createSource: () => BaniDownloadSource
}
interface QueueState {
  progress: { title: string; done: number; total: number; detail: BaniDownloadProgress } | null
  message: 'finished' | 'stopped' | null
  error: 'failed' | 'shellFailed' | null
  retryKeys: string[]
  completed: BaniDownloadInfo[]
  start: (items: readonly DownloadQueueItem[]) => Promise<void>
  cancel: () => void
  clearNotice: () => void
}
let controller: AbortController | null = null

/** App-session queue: navigating into a reader must not cancel verified text downloads. */
export const useBaniDownloadQueue = create<QueueState>((set) => ({
  progress: null, message: null, error: null, retryKeys: [], completed: [],
  cancel: () => controller?.abort(),
  clearNotice: () => set({ message: null, error: null }),
  start: async items => {
    if (controller || !items.length) return
    const queue = [...new Map(items.map(item => [item.key, item])).values()]
    const request = new AbortController()
    controller = request
    let done = 0
    set({ message: null, error: null, retryKeys: [], completed: [] })
    try {
      for (const item of queue) {
        request.signal.throwIfAborted()
        const onProgress = (detail: BaniDownloadProgress) => set({ progress: { title: item.title, done, total: queue.length, detail } })
        onProgress({ completed: 0, total: 1, stage: 'loading', length: null })
        const saved = await downloadBani(item.createSource(), { signal: request.signal, onProgress })
        done += 1
        set(state => ({ completed: [...state.completed, saved] }))
      }
      set({ message: 'finished' })
    } catch (failure) {
      set({ retryKeys: queue.slice(done).map(item => item.key),
        ...(request.signal.aborted ? { message: 'stopped' as const } : { error: failure instanceof OfflineReaderShellError ? 'shellFailed' as const : 'failed' as const }) })
    } finally {
      controller = null
      set({ progress: null })
    }
  },
}))
