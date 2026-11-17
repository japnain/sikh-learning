import type { StoreApi } from 'zustand'
import { getPersonalStorageForOwner, getPersonalStorageOwner, markPersonalStorageRecovery, onPersonalOwnerHydration, onPersonalStorageReset, personalStorageEventKey, withoutPersonalStorageWrites } from './ownerStorage'
/** Clear the outgoing in-memory values before hydrating. Failed local writes
 * remain attached to their original owner and are never replayed into another. */
export function registerPersonalStore<T>(store: StoreApi<T> & { persist: {
  rehydrate: () => Promise<void> | void
  getOptions: () => { name?: string; version?: number; partialize?: (state: T) => unknown }
  hasHydrated: () => boolean
} }, defaults?: Partial<T>) {
  let previousOwner = getPersonalStorageOwner()
  const pending = new Map<string, { state: T; raw: string | null | undefined }>()
  onPersonalStorageReset(() => { pending.clear(); previousOwner = getPersonalStorageOwner() })
  const reset = (hydrate: boolean) => {
    const options = store.persist.getOptions(), name = options.name!
    try {
      const raw = getPersonalStorageForOwner(previousOwner).getItem(name)
      const state = store.getState()
      const encoded = JSON.stringify({ state: options.partialize ? options.partialize(state) : state, version: options.version ?? 0 })
      // An absent key with pristine defaults is not an unpersisted user edit.
      const initial = { ...store.getInitialState(), ...defaults }
      const initialEncoded = JSON.stringify({ state: options.partialize ? options.partialize(initial) : initial, version: options.version ?? 0 })
      if (encoded !== raw && (raw !== null || encoded !== initialEncoded)) pending.set(previousOwner, { state, raw })
      else pending.delete(previousOwner)
    } catch { pending.set(previousOwner, { state: store.getState(), raw: undefined }) }
    previousOwner = getPersonalStorageOwner()
    withoutPersonalStorageWrites(() => store.setState({ ...store.getInitialState(), ...defaults }, true))
    if (!hydrate) return
    void store.persist.rehydrate()
    const hydrated = store.persist.hasHydrated()
    const retained = pending.get(previousOwner)
    if (retained) {
      withoutPersonalStorageWrites(() => store.setState(retained.state, true))
      if (retained.raw === undefined || getPersonalStorageForOwner(previousOwner).getItem(name) !== retained.raw) {
        markPersonalStorageRecovery()
        throw new Error('personal-data-pending-conflict')
      }
    }
    if (!hydrated) throw new Error('personal-data-hydration-failed')
  }
  const unsubscribe = onPersonalOwnerHydration(reset)
  const onStorage = (event: StorageEvent) => {
    const key = personalStorageEventKey(event)
    const options = store.persist.getOptions(), name = options.name!
    if (key !== null && key !== name) return
    const owner = getPersonalStorageOwner()
    try {
      const raw = getPersonalStorageForOwner(owner).getItem(name)
      const state = store.getState()
      const encoded = JSON.stringify({ state: options.partialize ? options.partialize(state) : state, version: options.version ?? 0 })
      if (encoded === raw) pending.delete(owner)
      const retained = pending.get(owner)
      if (retained) {
        // The incoming durable record and our unsaved session edit must both
        // survive. Never turn a storage event into an implicit last-write win.
        if (raw !== retained.raw) markPersonalStorageRecovery()
        return
      }
      const initial = { ...store.getInitialState(), ...defaults }
      const initialEncoded = JSON.stringify({ state: options.partialize ? options.partialize(initial) : initial, version: options.version ?? 0 })
      if (encoded !== raw && encoded !== event.oldValue && !(event.oldValue === null && encoded === initialEncoded)) {
        pending.set(owner, { state, raw: event.oldValue })
        markPersonalStorageRecovery()
        return
      }
      void store.persist.rehydrate()
      if (!store.persist.hasHydrated()) markPersonalStorageRecovery()
    } catch { markPersonalStorageRecovery() }
  }
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
  if (import.meta.hot) import.meta.hot.dispose(() => { unsubscribe(); window.removeEventListener('storage', onStorage) })
}
