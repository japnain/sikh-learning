export type ReaderPresentation = 'read' | 'study'

const STORAGE_KEY = 'naamras-reader-presentation'
export const READER_PRESENTATION_CHANGED_EVENT = 'naamras:reader-presentation-changed'
let sessionPreference: ReaderPresentation | null = null

export function isReaderPresentationPreferenceSaved(): boolean {
  return sessionPreference === null
}

/** Clear a temporary choice after an explicit restore or reset. */
export function resetReaderPresentationSessionPreference(): void {
  sessionPreference = null
}

export function subscribeReaderPresentation(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      resetReaderPresentationSessionPreference()
      listener()
    }
  }
  window.addEventListener(READER_PRESENTATION_CHANGED_EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(READER_PRESENTATION_CHANGED_EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function getSavedReaderPresentation(): ReaderPresentation | null {
  if (sessionPreference !== null) return sessionPreference
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'read' || saved === 'study' ? saved : null
  } catch {
    return null
  }
}

/** Apply a preference to both future readers and any reader beneath the settings overlay. */
export function setReaderPresentationPreference(presentation: ReaderPresentation): boolean {
  let saved = false
  try {
    localStorage.setItem(STORAGE_KEY, presentation)
    saved = localStorage.getItem(STORAGE_KEY) === presentation
  } catch { /* Keep this choice usable until storage becomes available. */ }
  sessionPreference = saved ? null : presentation
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(READER_PRESENTATION_CHANGED_EVENT, { detail: presentation }))
  }
  return saved
}
