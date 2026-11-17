import { createPersonalDataBackupResult } from '../utils/personalDataBackup'
import { canOfferLocalDataMigration, importLocalDataIntoCurrentAccount, keepLocalDataSeparate } from './localDataMigration'
import { hasPersonalStorageRecovery, clearPersonalStorageRecovery, onPersonalOwnerRecovery, getPersonalStorageForRestore, getPersonalStorage, getPersonalStorageForOwner, getPersonalStorageOwner, getPersonalStorageGeneration, selectPersonalStorageOwner, resetPersonalStorageOwnerForTests, LOCAL_DATA_OWNER, OWNER_RECOVERY_ERROR } from '../utils/ownerStorage'
import type { User } from '@supabase/supabase-js'
import { getNaamrasSupabaseClient } from './client'
import { getNaamrasSupabaseConfig } from './config'
import { discoverAuthProviders } from './authProviders'
import { getAuthRedirectUrl } from './authRedirect'
import { applyRemoteSnapshot, exportLocalSnapshot, reconcileRemoteSnapshotWithLocalChanges } from './snapshot'
import type {
  CloudLocalSnapshot,
  CloudRemoteSnapshot,
  CloudUserSummary,
  MergeLocalStateResult,
} from './types'
import { withQaControl } from '../qa/runtime'
import { useActivityEventsStore } from '../store/activityEvents'
import { useBookmarksStore } from '../store/bookmarks'
import { useCloudSyncStore } from '../store/cloudSync'
import { useFavoritesStore } from '../store/favorites'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { useNitemStore } from '../store/nitnem'
import { useOnboardingStore } from '../store/onboarding'
import { useProgressStore } from '../store/progress'
import { useReadingProgressStore } from '../store/readingProgress'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { useThemeStore } from '../store/theme'
import { refreshVocabFromStorage, useVocabStore } from '../store/vocab'

type SupabaseOAuthProvider = 'apple' | 'google'

let bootstrapPromise: Promise<void> | null = null
let syncTimer: number | null = null
let currentUserId: string | null = null
let currentAccessToken: string | null = null
let applyingRemoteSnapshot = false
let cleanupSubscriptions: Array<() => void> = []
let onlineListenerBound = false
let storeSubscriptionsBound = false
let authListenerBound = false
let providerDiscovery: AbortController | null = null
let accountGeneration = 0
let localRevision = 0
let restorePaused = false
let restoreRecoveryRequired = false
let ownerReady = true
const RESTORE_RECOVERY_KEY = 'naamras-personal-data-restore-recovery'
export const RESTORE_RECOVERY_ERROR = 'personal-data-restore-recovery-required'
let inFlight: Promise<{ ok: boolean; skipped?: boolean; offline?: boolean; queued?: boolean; error?: unknown }> | null = null

function invalidateRequests() {
  accountGeneration += 1
  if (syncTimer !== null && typeof window !== 'undefined') window.clearTimeout(syncTimer)
  syncTimer = null
  inFlight = null
}

function assertOwnerDataReadable(owner: string) {
  const storage = getPersonalStorageForOwner(owner)
  const backup = createPersonalDataBackupResult(storage)
  if (backup.omittedPreferences.some(key => ['sikh-language', 'sikh-ui-locale', 'sikh-theme', 'sikh-onboarding', 'sikh-sundar-gutka-lengths'].includes(key))) throw new Error(OWNER_RECOVERY_ERROR)
  for (const key of ['naamras-cloud-sync-export-metadata', 'naamras-cloud-activity-events']) {
    const raw = storage.getItem(key)
    if (raw !== null) {
      const value = JSON.parse(raw)
      if (!isObject(value)) throw new Error(OWNER_RECOVERY_ERROR)
      if (key.endsWith('metadata') && Object.values(value).some(record => !isObject(record)
        || typeof record.hash !== 'string' || !isTimestamp(record.clientUpdatedAt)
        || !isObject(record.record))) throw new Error(OWNER_RECOVERY_ERROR)
      if (key.endsWith('events') && (value.version !== 0 || !isObject(value.state) || !Array.isArray(value.state.pendingEvents))) throw new Error(OWNER_RECOVERY_ERROR)
    }
  }
}

function updateUser(user: User | null, accessToken?: string) {
  const changed = currentUserId !== (user?.id ?? null)
  if (changed || !ownerReady || getPersonalStorageOwner() !== (user?.id ?? LOCAL_DATA_OWNER)) {
    invalidateRequests()
    ownerReady = false
    applyingRemoteSnapshot = true
    try {
      const owner = user?.id ?? LOCAL_DATA_OWNER
      let readable = true
      try { assertOwnerDataReadable(owner) } catch { readable = false }
      selectPersonalStorageOwner(owner, { hydrate: readable })
      if (!readable) throw new Error(OWNER_RECOVERY_ERROR)
      ownerReady = true
      restoreRecoveryRequired = Boolean(getPersonalStorage().getItem(RESTORE_RECOVERY_KEY))
      restorePaused = restoreRecoveryRequired
    } catch {
      // Never export the outgoing owner's stores under a newly authenticated ID.
      useCloudSyncStore.getState().setLastError(OWNER_RECOVERY_ERROR)
    } finally { applyingRemoteSnapshot = false }
  }
  currentUserId = user?.id ?? null
  currentAccessToken = user && accessToken ? accessToken : null
  const syncStore = useCloudSyncStore.getState()
  syncStore.setLocalDataAvailable(ownerReady && canOfferLocalDataMigration())
  syncStore.setCurrentUser(user ? toCloudUserSummary(user) : null)
  if (changed || !user) {
    syncStore.setStatus(user ? 'ready' : 'signed-out')
    syncStore.setLastSyncedAt(null)
    syncStore.setLastError(null)
    syncStore.setSyncQueued(Boolean(user))
  }
  if (restoreRecoveryRequired) markRestoreRecoveryRequired()
  if (!ownerReady) { syncStore.setStatus('error'); syncStore.setLastError(OWNER_RECOVERY_ERROR); syncStore.setSyncQueued(false) }
  return changed
}

function markRestoreRecoveryRequired() {
  restorePaused = true
  restoreRecoveryRequired = true
  const syncStore = useCloudSyncStore.getState()
  syncStore.setStatus('error')
  syncStore.setLastError(RESTORE_RECOVERY_ERROR)
  syncStore.setSyncQueued(false)
}

/** Portable restores must not race an older request or upload a partially restored state. */
export function pauseCloudSyncForRestore() {
  const restoreOwner = getPersonalStorageOwner()
  const restoreGeneration = getPersonalStorageGeneration()
  const storage = getPersonalStorageForRestore()
  const previousMarker = storage.getItem(RESTORE_RECOVERY_KEY)
  const previousRecovery = hasPersonalStorageRecovery()
  const marker = `restore:${Date.now()}:${Math.random().toString(36).slice(2)}`
  invalidateRequests()
  restorePaused = true
  // Leave a recovery marker until either all writes or the rollback are verified.
  // This also blocks automatic sync if the tab closes during a restore.
  try {
    storage.setItem(RESTORE_RECOVERY_KEY, marker)
    if (storage.getItem(RESTORE_RECOVERY_KEY) !== marker) throw new Error('write-not-persisted')
  } catch (error) { markRestoreRecoveryRequired(); throw error }
  return (safeToResume = true, completedRestore = true) => {
    if (getPersonalStorageOwner() !== restoreOwner || getPersonalStorageGeneration() !== restoreGeneration) {
      // The transaction's fixed storage adapter protects its old partition.
      // Never release or poison the incoming owner's sync/recovery status.
      if (safeToResume && storage.getItem(RESTORE_RECOVERY_KEY) === marker) {
        if (!completedRestore && previousRecovery) storage.setItem(RESTORE_RECOVERY_KEY, previousMarker ?? 'owner-recovery')
        else storage.removeItem(RESTORE_RECOVERY_KEY)
      }
      return
    }
    if (storage.getItem(RESTORE_RECOVERY_KEY) !== marker) return
    if (!safeToResume) { markRestoreRecoveryRequired(); return }
    if (!completedRestore && previousRecovery) {
      storage.setItem(RESTORE_RECOVERY_KEY, previousMarker ?? 'owner-recovery')
      markRestoreRecoveryRequired()
      return
    }
    try {
      storage.removeItem(RESTORE_RECOVERY_KEY)
      if (storage.getItem(RESTORE_RECOVERY_KEY) !== null) throw new Error('delete-not-persisted')
    } catch (error) {
      markRestoreRecoveryRequired()
      throw new Error('restore-recovery-required', { cause: error })
    }
    restorePaused = false
    restoreRecoveryRequired = false
    clearPersonalStorageRecovery()
    if (completedRestore && currentUserId && getPersonalStorageOwner() === currentUserId) {
      try { assertOwnerDataReadable(currentUserId); selectPersonalStorageOwner(currentUserId); ownerReady = true }
      catch { ownerReady = false }
    }
    const syncStore = useCloudSyncStore.getState()
    syncStore.setLastError(null)
    syncStore.setStatus(currentUserId ? 'ready' : syncStore.configured ? 'signed-out' : 'idle')
    if (!ownerReady) { syncStore.setStatus('error'); syncStore.setLastError(OWNER_RECOVERY_ERROR) }
    localRevision += 1
    scheduleSync('personal-data-restore')
  }
}

function bindAuthListener() {
  if (authListenerBound) return
  const client = getNaamrasSupabaseClient()
  if (!client) return
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    // Keep the callback synchronous; the timer starts network work outside Auth's lock.
    const changed = updateUser(session?.user ?? null, session?.access_token)
    if (changed && session?.user) scheduleSync('auth-change')
  })
  cleanupSubscriptions.push(() => data.subscription.unsubscribe())
  authListenerBound = true
}

type CloudSyncFailureKind = 'bootstrap' | 'sync' | 'auth' | 'account'

function getCloudSyncFailureMessage(kind: CloudSyncFailureKind) {
  if (kind === 'bootstrap') {
    return 'Backup is unavailable right now. You can keep reading on this device and sign in later.'
  }

  if (kind === 'auth') {
    return 'Sign-in could not start right now. You can keep reading locally and try again in a moment.'
  }

  if (kind === 'account') {
    return 'Cloud account changes could not be completed right now. Try again in a moment.'
  }

  return 'Cloud sync is taking longer than usual. Local changes are still safe on this device.'
}

function toCloudUserSummary(user: User): CloudUserSummary {
  const providerList = user.app_metadata?.providers
  const providers = Array.isArray(providerList)
    ? providerList.filter((provider): provider is string => typeof provider === 'string')
    : []

  return {
    id: user.id,
    email: user.email ?? user.id,
    name: typeof user.user_metadata?.name === 'string'
      ? user.user_metadata.name
      : typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : null,
    providers,
  }
}

export function refreshAvailableProviders() {
  providerDiscovery?.abort()
  const controller = new AbortController()
  providerDiscovery = controller
  return discoverAuthProviders(getNaamrasSupabaseConfig(), controller.signal).then(providers => {
    if (providerDiscovery !== controller || controller.signal.aborted) return
    useCloudSyncStore.getState().setAvailableProviders(providers)
    providerDiscovery = null
  })
}

export function toSupabaseMergeSnapshot(snapshot: CloudLocalSnapshot) {
  return {
    version: snapshot.version,
    deviceId: snapshot.deviceId,
    profile: snapshot.profile,
    savedItems: snapshot.savedItems,
    vocabEntries: snapshot.vocabEntries,
    learningProgress: snapshot.learningProgress,
    activityEvents: snapshot.activityEvents,
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function validateCompleteMergeResult(
  result: MergeLocalStateResult | null | undefined,
  localSnapshot: CloudLocalSnapshot
): asserts result is Required<
  Pick<MergeLocalStateResult, 'version' | 'complete' | 'acknowledgedEventIds' | 'mergedAt' | 'snapshot'>
> & {
  version: 3
  complete: true
  mergedAt: string
  snapshot: CloudRemoteSnapshot
} {
  if (
    !result
    || result.version !== 3
    || result.complete !== true
    || !isTimestamp(result.mergedAt)
    || !Array.isArray(result.acknowledgedEventIds)
    || !result.acknowledgedEventIds.every(id => typeof id === 'string')
    || !isObject(result.snapshot)
    || result.snapshot.version !== 3
    || !isTimestamp(result.snapshot.generatedAt)
    || !isObject(result.snapshot.profile)
    || !Array.isArray(result.snapshot.savedItems)
    || !Array.isArray(result.snapshot.vocabEntries)
    || !Array.isArray(result.snapshot.learningProgress)
  ) {
    throw new Error('Cloud sync returned an incomplete snapshot.')
  }

  const acknowledgedIds = new Set(result.acknowledgedEventIds)
  const hasUnacknowledgedEvent = localSnapshot.activityEvents.some(event => !acknowledgedIds.has(event.id))
  if (hasUnacknowledgedEvent) {
    throw new Error('Cloud sync did not acknowledge every pending activity event.')
  }
}

function scheduleSync(reason: string) {
  if (typeof window === 'undefined') return
  if (applyingRemoteSnapshot) return
  localRevision += 1
  if (!currentUserId || !currentAccessToken || restorePaused || !ownerReady || getPersonalStorageOwner() !== currentUserId || hasPersonalStorageRecovery()) return

  useCloudSyncStore.getState().setSyncQueued(true)

  if (syncTimer !== null) {
    window.clearTimeout(syncTimer)
  }

  syncTimer = window.setTimeout(() => {
    syncTimer = null
    void syncNow(reason)
  }, 800)
}

function bindStoreSubscriptions() {
  if (storeSubscriptionsBound) return
  storeSubscriptionsBound = true

  cleanupSubscriptions.push(onPersonalOwnerRecovery(() => {
    invalidateRequests()
    markRestoreRecoveryRequired()
  }))
  cleanupSubscriptions.push(...[
    useBookmarksStore.subscribe(() => scheduleSync('bookmarks')),
    useFavoritesStore.subscribe(() => scheduleSync('favorites')),
    useVocabStore.subscribe(() => scheduleSync('vocab')),
    useProgressStore.subscribe(() => scheduleSync('study-progress')),
    useReadingProgressStore.subscribe(() => scheduleSync('reading-progress')),
    useNitemStore.subscribe(() => scheduleSync('nitnem')),
    useLanguageStore.subscribe(() => scheduleSync('reader-preferences')),
    useLocaleStore.subscribe(() => scheduleSync('locale')),
    useThemeStore.subscribe(() => scheduleSync('theme')),
    useOnboardingStore.subscribe(() => scheduleSync('onboarding')),
    useSundarGutkaLengthStore.subscribe(() => scheduleSync('reader-lengths')),
    useActivityEventsStore.subscribe(() => scheduleSync('activity-events')),
  ])
}

function bindOnlineListener() {
  if (typeof window === 'undefined' || onlineListenerBound) return

  const handleOnline = () => {
    refreshAvailableProviders()
    if (useCloudSyncStore.getState().syncQueued) {
      void syncNow('reconnect')
    }
  }

  window.addEventListener('online', handleOnline)
  cleanupSubscriptions.push(() => window.removeEventListener('online', handleOnline))
  onlineListenerBound = true
}

async function refreshCloudState() {
  const config = getNaamrasSupabaseConfig()
  const syncStore = useCloudSyncStore.getState()
  const client = getNaamrasSupabaseClient()

  await withQaControl('supabase-bootstrap', async () => undefined)

  syncStore.setConfigured(config.enabled)
  syncStore.setAvailableProviders([])

  if (!config.enabled || !client) {
    updateUser(null)
    syncStore.setStatus('idle')
    return
  }

  syncStore.setStatus('booting')
  refreshAvailableProviders()

  const generation = accountGeneration
  const { data, error } = await client.auth.getSession()
  if (generation !== accountGeneration) return
  if (error) {
    updateUser(null)
    syncStore.setStatus('error')
    syncStore.setLastError(getCloudSyncFailureMessage('bootstrap'))
    return
  }

  const user = data.session?.user ?? null
  updateUser(user, data.session?.access_token)
  syncStore.setStatus(user ? 'ready' : 'signed-out')
  syncStore.setLastError(null)
  if (restoreRecoveryRequired) markRestoreRecoveryRequired()
  if (!ownerReady) { syncStore.setStatus('error'); syncStore.setLastError(OWNER_RECOVERY_ERROR); syncStore.setSyncQueued(false) }
}

export function syncNow(reason = 'manual'): Promise<{ ok: boolean; skipped?: boolean; offline?: boolean; queued?: boolean; error?: unknown }> {
  const client = getNaamrasSupabaseClient()
  const config = getNaamrasSupabaseConfig()
  const syncStore = useCloudSyncStore.getState()
  if (!client || !config.enabled || !currentUserId || !currentAccessToken || restorePaused || !ownerReady || getPersonalStorageOwner() !== currentUserId || hasPersonalStorageRecovery()) return Promise.resolve({ ok: false, skipped: true })
  if (inFlight) return inFlight
  try { assertOwnerDataReadable(currentUserId) } catch {
    ownerReady = false
    syncStore.setStatus('error')
    syncStore.setLastError(OWNER_RECOVERY_ERROR)
    syncStore.setSyncQueued(false)
    return Promise.resolve({ ok: false, skipped: true })
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    syncStore.setStatus('offline')
    syncStore.setSyncQueued(true)
    return Promise.resolve({ ok: false, offline: true })
  }
  if (syncTimer !== null) window.clearTimeout(syncTimer)
  syncTimer = null
  const generation = accountGeneration
  const userId = currentUserId
  const accessToken = currentAccessToken
  // Other tabs can finish durable writes before their storage events are delivered.
  useBookmarksStore.getState().hydrateCachedBookmarks()
  useFavoritesStore.getState().hydrateCachedFavorites()
  refreshVocabFromStorage()
  const revision = localRevision
  const isCurrent = () => generation === accountGeneration && currentUserId === userId && !restorePaused && ownerReady && getPersonalStorageOwner() === userId && !hasPersonalStorageRecovery()
  syncStore.setStatus('syncing')
  syncStore.setLastError(null)
  const operation = (async () => {
    try {
      const snapshot = exportLocalSnapshot()
      const response = await withQaControl('cloud-sync', async () => client.functions.invoke<MergeLocalStateResult>(config.mergeFunctionSlug, {
        body: { reason, snapshot: toSupabaseMergeSnapshot(snapshot) },
        headers: { Authorization: `Bearer ${accessToken}` },
      }))
      if (!isCurrent()) return { ok: false, skipped: true }
      if (response.error) throw response.error
      const result = response.data
      validateCompleteMergeResult(result, snapshot)
      useBookmarksStore.getState().hydrateCachedBookmarks()
      useFavoritesStore.getState().hydrateCachedFavorites()
      refreshVocabFromStorage()
      const hasNewerChanges = localRevision !== revision
      const incoming = hasNewerChanges
        ? reconcileRemoteSnapshotWithLocalChanges(result.snapshot, snapshot, exportLocalSnapshot())
        : result.snapshot
      applyingRemoteSnapshot = true
      try {
        // Metadata is rebased to what the server actually acknowledged, not to
        // the unsent edits preserved in incoming. The next export remains dirty.
        if (hasNewerChanges) applyRemoteSnapshot(incoming, result.snapshot)
        else applyRemoteSnapshot(incoming)
        if (result.acknowledgedEventIds.length) useActivityEventsStore.getState().acknowledgeEvents(result.acknowledgedEventIds)
      } finally { applyingRemoteSnapshot = false }
      syncStore.setStatus('ready')
      syncStore.setLastSyncedAt(result.mergedAt)
      syncStore.setLastError(null)
      syncStore.setSyncQueued(hasNewerChanges)
      return hasNewerChanges ? { ok: false, queued: true } : { ok: true }
    } catch (error) {
      if (!isCurrent()) return { ok: false, skipped: true }
      if (error instanceof Error && error.message === 'cloud-rollback-failed') {
        try { pauseCloudSyncForRestore()(false) } catch { markRestoreRecoveryRequired() }
        return { ok: false, error }
      }
      syncStore.setStatus('error')
      syncStore.setLastError(getCloudSyncFailureMessage('sync'))
      syncStore.setSyncQueued(true)
      return { ok: false, error }
    }
  })()
  inFlight = operation
  void operation.finally(() => {
    if (inFlight === operation) inFlight = null
    if (isCurrent() && localRevision !== revision) scheduleSync('newer-local-changes')
  })
  return operation
}

export async function bootstrapCloudSync() {
  if (bootstrapPromise) return bootstrapPromise

  bootstrapPromise = (async () => {
    try {
      if (getPersonalStorage().getItem(RESTORE_RECOVERY_KEY)) markRestoreRecoveryRequired()
    } catch { /* Normal local-storage errors remain covered by each write path. */ }
    useBookmarksStore.getState().hydrateCachedBookmarks()
    useFavoritesStore.getState().hydrateCachedFavorites()
    bindAuthListener()
    await refreshCloudState()
    bindStoreSubscriptions()
    bindOnlineListener()

    if (currentUserId) {
      await syncNow('app-start')
    }
  })().catch(() => {
    const syncStore = useCloudSyncStore.getState()
    syncStore.setStatus('error')
    syncStore.setLastError(getCloudSyncFailureMessage('bootstrap'))
    bootstrapPromise = null
  })

  return bootstrapPromise
}

export async function signInWithProvider(
  provider: SupabaseOAuthProvider,
  redirectTo?: string
) {
  const client = getNaamrasSupabaseClient()
  const syncStore = useCloudSyncStore.getState()

  if (!client) {
    syncStore.setLastError('Supabase is not configured for this build.')
    return { ok: false }
  }

  if (!syncStore.availableProviders.includes(provider)) {
    syncStore.setLastError(getCloudSyncFailureMessage('auth'))
    return { ok: false }
  }

  syncStore.setStatus('authenticating')
  syncStore.setLastError(null)

  const { error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectTo ?? getAuthRedirectUrl(),
    },
  })

  if (error) {
    syncStore.setStatus('signed-out')
    syncStore.setLastError(getCloudSyncFailureMessage('auth'))
    return { ok: false, error }
  }

  return { ok: true }
}

export async function sendMagicLink(email: string, redirectTo?: string) {
  const client = getNaamrasSupabaseClient()
  const syncStore = useCloudSyncStore.getState()

  if (!client) {
    syncStore.setLastError('Supabase is not configured for this build.')
    return { ok: false }
  }

  if (!syncStore.availableProviders.includes('email')) {
    syncStore.setLastError(getCloudSyncFailureMessage('auth'))
    return { ok: false }
  }

  syncStore.setStatus('authenticating')
  syncStore.setLastError(null)

  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo ?? getAuthRedirectUrl(),
    },
  })

  if (error) {
    syncStore.setStatus('signed-out')
    syncStore.setLastError(getCloudSyncFailureMessage('auth'))
    return { ok: false, error }
  }

  syncStore.setStatus('signed-out')
  syncStore.setLastError(null)
  return { ok: true }
}

export async function signOutOfCloud() {
  const client = getNaamrasSupabaseClient()
  const syncStore = useCloudSyncStore.getState()

  if (!client) return { ok: false }

  invalidateRequests()
  const userId = currentUserId
  const generation = accountGeneration
  const { error } = await withQaControl('cloud-sync', async () => client.auth.signOut())
  if (currentUserId && (currentUserId !== userId || generation !== accountGeneration)) return { ok: false, skipped: true }

  if (error) {
    syncStore.setStatus('error')
    syncStore.setLastError(getCloudSyncFailureMessage('account'))
    return { ok: false, error }
  }

  updateUser(null)
  syncStore.setStatus('signed-out')
  syncStore.setLastError(null)
  syncStore.setSyncQueued(false)
  return { ok: true }
}

export async function deleteCloudAccount() {
  const client = getNaamrasSupabaseClient()
  const config = getNaamrasSupabaseConfig()
  const syncStore = useCloudSyncStore.getState()

  if (!client || !config.enabled || !currentUserId || !currentAccessToken) {
    syncStore.setLastError(getCloudSyncFailureMessage('account'))
    return { ok: false }
  }

  invalidateRequests()
  const generation = accountGeneration
  const userId = currentUserId
  const accessToken = currentAccessToken
  const isCurrent = () => generation === accountGeneration && currentUserId === userId
  try {
    const response = await withQaControl('cloud-account-delete', async () => (
      client.functions.invoke<{ deleted?: boolean }>(config.deleteAccountFunctionSlug, {
        body: { confirmation: 'delete' },
          headers: { Authorization: `Bearer ${accessToken}` },
      })
    ))
    if (!isCurrent()) return { ok: false, skipped: true }

    if (response.error || !response.data?.deleted) {
      syncStore.setStatus('error')
      syncStore.setLastError(getCloudSyncFailureMessage('account'))
      return { ok: false, error: response.error }
    }

    if (syncTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(syncTimer)
      syncTimer = null
    }

    await client.auth.signOut({ scope: 'local' }).catch(() => undefined)
    if (currentUserId && (currentUserId !== userId || generation !== accountGeneration)) return { ok: false, skipped: true }
    updateUser(null)
    syncStore.setStatus('signed-out')
    syncStore.setLastError(null)
    syncStore.setSyncQueued(false)
    syncStore.setLastSyncedAt(null)
    return { ok: true }
  } catch (error) {
    if (!isCurrent()) return { ok: false, skipped: true }
    syncStore.setStatus('error')
    syncStore.setLastError(getCloudSyncFailureMessage('account'))
    return { ok: false, error }
  }
}

export function resetCloudSyncRuntimeForTests() {
  providerDiscovery?.abort()
  providerDiscovery = null
  if (syncTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(syncTimer)
  }
  syncTimer = null
  currentUserId = null
  currentAccessToken = null
  applyingRemoteSnapshot = false
  bootstrapPromise = null
  cleanupSubscriptions.forEach(cleanup => cleanup())
  cleanupSubscriptions = []
  onlineListenerBound = false
  storeSubscriptionsBound = false
  authListenerBound = false
  accountGeneration += 1
  localRevision = 0
  restorePaused = false
  restoreRecoveryRequired = false
  ownerReady = true
  resetPersonalStorageOwnerForTests()
  inFlight = null
}

export async function resolveLocalDataMigration(merge: boolean) {
  if (!currentUserId || !ownerReady || getPersonalStorageOwner() !== currentUserId || hasPersonalStorageRecovery()) return { ok: false, skipped: true }
  try {
    if (merge) await importLocalDataIntoCurrentAccount()
    else keepLocalDataSeparate()
    useCloudSyncStore.getState().setLocalDataAvailable(canOfferLocalDataMigration())
    if (merge) scheduleSync('explicit-local-import')
    return { ok: true }
  } catch {
    useCloudSyncStore.getState().setLastError('local-data-import-failed')
    return { ok: false }
  }
}
