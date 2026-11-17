/** Personal data is scoped to a tab's authenticated owner. Public downloads and
 * appearance-only preferences stay device-wide. Legacy keys are retained as the
 * separate local/guest space; signing in never claims them automatically. */
const PREFIX = 'naamras-owner-v1:'
export const LOCAL_DATA_OWNER = 'local'
export const OWNER_RECOVERY_ERROR = 'personal-data-owner-recovery-required'
const OWNED_KEYS = new Set([
  'sikh-bookmarks', 'sikh-favorites', 'sikh-vocab', 'sikh-progress', 'sikh-reading-progress',
  'sikh-nitnem', 'naamras-nitnem-history', 'naamras-nitnem-practice', 'naamras-reading-places',
  'naamras-story-state-v1', 'sikh-recent-search', 'naamras-reading-visibility',
  'sikh-language', 'sikh-ui-locale', 'sikh-theme', 'sikh-onboarding', 'sikh-sundar-gutka-lengths',
  'naamras-local-data-choice', 'naamras-cloud-activity-events', 'naamras-cloud-sync-export-metadata', 'naamras-personal-data-restore-recovery',
])
let owner = LOCAL_DATA_OWNER
let generation = 0
let pausedWrites = false
let restoreWriteScope: { owner: string; generation: number } | null = null
const listeners = new Set<() => void>()
const hydrators = new Set<(hydrate: boolean) => void>()
const resetListeners = new Set<() => void>()
const recoveryListeners = new Set<() => void>()
const recoveryOwners = new Set<string>()
export const onPersonalOwnerRecovery = (callback: () => void) => { recoveryListeners.add(callback); return () => { recoveryListeners.delete(callback) } }
export function hasPersonalStorageRecovery() {
  try { return recoveryOwners.has(owner) || getPersonalStorage().getItem('naamras-personal-data-restore-recovery') !== null }
  catch { return true }
}
export function markPersonalStorageRecovery() {
  recoveryOwners.add(owner)
  try { getPersonalStorageForRestore().setItem('naamras-personal-data-restore-recovery', 'owner-conflict') } catch { /* The session guard remains active if storage is full. */ }
  recoveryListeners.forEach(callback => callback())
}
export function clearPersonalStorageRecovery() { recoveryOwners.delete(owner) }
export const onPersonalStorageReset = (callback: () => void) => { resetListeners.add(callback) }
const owned = (key: string) => OWNED_KEYS.has(key) || key.startsWith('naamras-collection-v1:')
const root = (value: string) => value === LOCAL_DATA_OWNER ? '' : `${PREFIX}${encodeURIComponent(value)}:`
export const getPersonalStorageOwner = () => owner
export const getPersonalStorageGeneration = () => generation
export const onPersonalOwnerHydration = (listener: (hydrate: boolean) => void) => { hydrators.add(listener); return () => { hydrators.delete(listener) } }
export const onPersonalOwnerChange = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
/** Synchronous hydration only: the allowance closes before any awaited work,
 * and an identity change immediately invalidates it. */
export function withPersonalStorageRestoreWrites<T>(operation: () => T): T {
  const previous = restoreWriteScope
  restoreWriteScope = { owner, generation }
  try { return operation() } finally { restoreWriteScope = previous }
}
export const withoutPersonalStorageWrites = <T>(operation: () => T): T => {
  const before = pausedWrites; pausedWrites = true
  try { return operation() } finally { pausedWrites = before }
}
function storageFor(resolveOwner: () => string, protectPending = true): Storage {
  const keyFor = (key: string) => owned(key) ? root(resolveOwner()) + key : key
  const assertWrite = (key: string) => {
    const permittedRestore = restoreWriteScope?.owner === resolveOwner() && restoreWriteScope.generation === generation
    if (protectPending && !permittedRestore && owned(key) && (recoveryOwners.has(resolveOwner())
      || localStorage.getItem(root(resolveOwner()) + 'naamras-personal-data-restore-recovery') !== null)) throw new Error(OWNER_RECOVERY_ERROR)
  }
  const keys = () => {
    const result: string[] = [], prefix = root(resolveOwner())
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!
      if (prefix && key.startsWith(prefix) && owned(key.slice(prefix.length))) result.push(key.slice(prefix.length))
      else if (!key.startsWith(PREFIX) && (!owned(key) || !prefix)) result.push(key)
    }
    return result
  }
  return {
    get length() { return keys().length }, key: i => keys()[i] ?? null,
    getItem: key => localStorage.getItem(keyFor(key)),
    setItem: (key, value) => {
      if (pausedWrites) return
      assertWrite(key)
      localStorage.setItem(keyFor(key), value)
    },
    removeItem: key => { if (!pausedWrites) { assertWrite(key); localStorage.removeItem(keyFor(key)) } },
    clear: () => { throw new Error('personal-storage-clear-is-not-supported') },
  }
}
const activeStorage = storageFor(() => owner, true)
/** Capture this adapter for an async transaction; later auth changes cannot retarget its writes. */
export const getPersonalStorage = () => { const value = owner; return storageFor(() => value) }
export const getPersonalStorageForOwner = (value: string) => storageFor(() => value)
/** Only validated backup transactions and scoped recovery-marker maintenance may
 * bypass the write freeze. Ordinary stores/pages always use protected adapters. */
export const getPersonalStorageForRestore = () => { const value = owner; return storageFor(() => value, false) }
/** Zustand retains its storage adapter, so its synchronous operations follow the active partition. */
export const getActivePersonalStorage = () => activeStorage
export function personalStorageEventKey(event: StorageEvent): string | null | undefined {
  if (event.storageArea && event.storageArea !== localStorage) return undefined
  if (event.key === null) return null
  const prefix = root(owner)
  if (prefix && event.key.startsWith(prefix)) return event.key.slice(prefix.length)
  return event.key.startsWith(PREFIX) || (prefix && owned(event.key)) ? undefined : event.key
}
export function selectPersonalStorageOwner(next: string, options: { hydrate?: boolean } = {}) {
  if (!next || next.length > 200 || [...next].some(char => char.charCodeAt(0) < 32)) throw new Error(OWNER_RECOVERY_ERROR)
  let failed = false
  try {
    if (next !== LOCAL_DATA_OWNER) {
      const key = `${root(next)}owner`, expected = JSON.stringify({ version: 1, owner: next })
      const current = localStorage.getItem(key)
      if (current !== null && current !== expected) throw new Error(OWNER_RECOVERY_ERROR)
      if (current === null) localStorage.setItem(key, expected)
      if (localStorage.getItem(key) !== expected) throw new Error(OWNER_RECOVERY_ERROR)
    }
  } catch { failed = true }
  const hydrate = options.hydrate !== false && !failed
  if (!hydrate) recoveryOwners.add(next)
  // Even failed durability must hide the outgoing account's in-memory data.
  if (owner !== next) {
    owner = next
    generation += 1
    for (const callback of hydrators) { try { callback(hydrate) } catch { failed = true } }
    // UI observers only see the completed incoming state, including stores
    // registered later by a lazy reader. All work above is synchronous.
    for (const listener of listeners) { try { listener() } catch { failed = true } }
  }
  if (failed || !hydrate) throw new Error(OWNER_RECOVERY_ERROR)
}
export function resetPersonalStorageOwnerForTests() { owner = LOCAL_DATA_OWNER; generation += 1; pausedWrites = false; restoreWriteScope = null; recoveryOwners.clear(); resetListeners.forEach(callback => callback()) }
