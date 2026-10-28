import { getAppScrollTop, restoreAppScrollTopWhenReady } from './appScroll'
import { isSafeInternalAppPath } from './libraryReaderNavigation'

const STORAGE_KEY = 'naamras-discovery-return-v1'
const MAX_RETURNS = 20
const MAX_AGE_MS = 30 * 60 * 1000

type DiscoveryReturn = { path: string; top: number; focusId: string | null; savedAt: number }
const memory = new Map<string, DiscoveryReturn>()
let storageRead = false

function validReturn(value: unknown): value is DiscoveryReturn {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<DiscoveryReturn>
  return isSafeInternalAppPath(item.path) && item.path.length <= 4096
    && typeof item.top === 'number' && Number.isFinite(item.top) && item.top >= 0
    && typeof item.savedAt === 'number' && item.savedAt <= Date.now() && Date.now() - item.savedAt <= MAX_AGE_MS
    && (item.focusId === null || (typeof item.focusId === 'string' && item.focusId.length <= 200))
}

function readReturns() {
  if (!storageRead) {
    storageRead = true
    let stored: unknown = []
    try { stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]') } catch { /* Best-effort navigation state. */ }
    if (Array.isArray(stored)) {
      stored.slice(-MAX_RETURNS).filter(validReturn).forEach(item => memory.set(item.path, item))
    }
  }
  for (const [path, item] of memory) if (!validReturn(item)) memory.delete(path)
  return memory
}

function persistReturns() {
  while (memory.size > MAX_RETURNS) memory.delete(memory.keys().next().value!)
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...memory.values()])) } catch { /* Memory still preserves this visit. */ }
}

/** Capture only on a real reading handoff, never on ordinary scrolling. */
export function rememberDiscoveryReturn(path: string, focusId?: string | null) {
  if (typeof window === 'undefined' || !isSafeInternalAppPath(path) || path.length > 4096) return
  readReturns()
  const activeId = focusId ?? (document.activeElement instanceof HTMLElement ? document.activeElement.id : null)
  memory.delete(path)
  memory.set(path, { path, top: getAppScrollTop(), focusId: activeId?.slice(0, 200) || null, savedAt: Date.now() })
  persistReturns()
}

/** One return hint per handoff. The caller invokes this when discovery data is ready. */
export function restoreDiscoveryReturn(path: string): () => void {
  if (typeof window === 'undefined') return () => {}
  const item = readReturns().get(path)
  if (!item) return () => {}
  let cancelled = false
  let frame: number | null = null
  let timeout: number | null = null
  let observer: MutationObserver | null = null
  let cancelScroll = () => {}
  const cleanup = () => {
    cancelled = true
    if (frame !== null) window.cancelAnimationFrame(frame)
    if (timeout !== null) window.clearTimeout(timeout)
    observer?.disconnect()
    cancelScroll()
    document.removeEventListener('pointerdown', cleanup, true)
    document.removeEventListener('keydown', cleanup, true)
    document.removeEventListener('wheel', cleanup, true)
    document.removeEventListener('touchstart', cleanup, true)
  }
  const restoreFocus = () => {
    if (cancelled || !item.focusId) return
    const element = document.getElementById(item.focusId)
    if (!(element instanceof HTMLElement)) return
    element.focus({ preventScroll: true })
    observer?.disconnect()
  }
  // The app's route restoration runs first; do not compete with its focus/reset.
  frame = window.requestAnimationFrame(() => {
    frame = window.requestAnimationFrame(() => {
      frame = null
      if (cancelled) return
      // Consume only when the effect actually runs. StrictMode or data changes
      // may cancel a scheduled restoration before discovery is ready.
      if (memory.get(path)?.savedAt !== item.savedAt) return
      memory.delete(path)
      persistReturns()
      cancelScroll = restoreAppScrollTopWhenReady(item.top, { timeoutMs: 2500 })
      restoreFocus()
      if (item.focusId && !document.getElementById(item.focusId)) {
        observer = new MutationObserver(restoreFocus)
        observer.observe(document.getElementById('root') ?? document.body, { childList: true, subtree: true })
      }
      timeout = window.setTimeout(cleanup, 2600)
    })
  })
  document.addEventListener('pointerdown', cleanup, true)
  document.addEventListener('keydown', cleanup, true)
  document.addEventListener('wheel', cleanup, { capture: true, passive: true })
  document.addEventListener('touchstart', cleanup, { capture: true, passive: true })
  return cleanup
}
