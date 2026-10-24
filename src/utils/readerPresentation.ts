export type ReaderPresentation = 'read' | 'study'

const STORAGE_KEY = 'naamras-reader-presentation'
export const READER_PRESENTATION_CHANGED_EVENT = 'naamras:reader-presentation-changed'

export function subscribeReaderPresentation(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) listener()
  }
  window.addEventListener(READER_PRESENTATION_CHANGED_EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(READER_PRESENTATION_CHANGED_EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function getSavedReaderPresentation(): ReaderPresentation | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'read' || saved === 'study' ? saved : null
  } catch {
    return null
  }
}

/** Apply a preference to both future readers and any reader beneath the settings overlay. */
export function setReaderPresentationPreference(presentation: ReaderPresentation) {
  try { localStorage.setItem(STORAGE_KEY, presentation) } catch { /* The active reader can still update. */ }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(READER_PRESENTATION_CHANGED_EVENT, { detail: presentation }))
  }
}
