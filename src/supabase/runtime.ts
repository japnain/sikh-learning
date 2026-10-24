import type { User } from '@supabase/supabase-js'
import { getNaamrasSupabaseClient } from './client'
import { getNaamrasSupabaseConfig } from './config'
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
import { useVocabStore } from '../store/vocab'

type SupabaseOAuthProvider = 'apple'

let bootstrapPromise: Promise<void> | null = null
let syncTimer: number | null = null
let currentUserId: string | null = null
let applyingRemoteSnapshot = false
let cleanupSubscriptions: Array<() => void> = []
let onlineListenerBound = false
let storeSubscriptionsBound = false
let authListenerBound = false
let accountGeneration = 0
let localRevision = 0
let restorePaused = false
let restoreRecoveryRequired = false
const RESTORE_RECOVERY_KEY = 'naamras-personal-data-restore-recovery'
export const RESTORE_RECOVERY_ERROR = 'personal-data-restore-recovery-required'
let inFlight: Promise<{ ok: boolean; skipped?: boolean; offline?: boolean; queued?: boolean; error?: unknown }> | null = null

function invalidateRequests() {
  accountGeneration += 1
  if (syncTimer !== null && typeof window !== 'undefined') window.clearTimeout(syncTimer)
  syncTimer = null
  inFlight = null
}

function updateUser(user: User | null) {
  const changed = currentUserId !== (user?.id ?? null)
  if (changed) invalidateRequests()
  currentUserId = user?.id ?? null
  const syncStore = useCloudSyncStore.getState()
  syncStore.setCurrentUser(user ? toCloudUserSummary(user) : null)
  if (changed || !user) {
    syncStore.setStatus(user ? 'ready' : 'signed-out')
    syncStore.setLastSyncedAt(null)
    syncStore.setLastError(null)
    syncStore.setSyncQueued(Boolean(user))
  }
  if (restoreRecoveryRequired) markRestoreRecoveryRequired()
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
  invalidateRequests()
  restorePaused = true
  // Leave a recovery marker until either all writes or the rollback are verified.
  // This also blocks automatic sync if the tab closes during a restore.
  try {
    localStorage.setItem(RESTORE_RECOVERY_KEY, 'pending')
    if (localStorage.getItem(RESTORE_RECOVERY_KEY) !== 'pending') throw new Error('write-not-persisted')
  } catch (error) { markRestoreRecoveryRequired(); throw error }
  return (safeToResume = true) => {
    if (!safeToResume) { markRestoreRecoveryRequired(); return }
    try {
      localStorage.removeItem(RESTORE_RECOVERY_KEY)
      if (localStorage.getItem(RESTORE_RECOVERY_KEY) !== null) throw new Error('delete-not-persisted')
    } catch (error) {
      markRestoreRecoveryRequired()
      throw new Error('restore-recovery-required', { cause: error })
    }
    restorePaused = false
    restoreRecoveryRequired = false
    const syncStore = useCloudSyncStore.getState()
    syncStore.setLastError(null)
    syncStore.setStatus(currentUserId ? 'ready' : syncStore.configured ? 'signed-out' : 'idle')
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
    const changed = updateUser(session?.user ?? null)
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

function getAvailableProviders() {
  const config = getNaamrasSupabaseConfig()
  return config.enabled ? ['apple', 'email'] : []
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
  if (!currentUserId || restorePaused) return

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
  syncStore.setAvailableProviders(getAvailableProviders())

  if (!config.enabled || !client) {
    syncStore.setStatus('idle')
    syncStore.setCurrentUser(null)
    currentUserId = null
    return
  }

  syncStore.setStatus('booting')

  const generation = accountGeneration
  const { data, error } = await client.auth.getSession()
  if (generation !== accountGeneration) return
  if (error) {
    syncStore.setStatus('error')
    syncStore.setLastError(getCloudSyncFailureMessage('bootstrap'))
    currentUserId = null
    return
  }

  const user = data.session?.user ?? null
  updateUser(user)
  syncStore.setStatus(user ? 'ready' : 'signed-out')
  syncStore.setLastError(null)
  if (restoreRecoveryRequired) markRestoreRecoveryRequired()
}

export function syncNow(reason = 'manual'): Promise<{ ok: boolean; skipped?: boolean; offline?: boolean; queued?: boolean; error?: unknown }> {
  const client = getNaamrasSupabaseClient()
  const config = getNaamrasSupabaseConfig()
  const syncStore = useCloudSyncStore.getState()
  if (!client || !config.enabled || !currentUserId || restorePaused) return Promise.resolve({ ok: false, skipped: true })
  if (inFlight) return inFlight
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    syncStore.setStatus('offline')
    syncStore.setSyncQueued(true)
    return Promise.resolve({ ok: false, offline: true })
  }
  if (syncTimer !== null) window.clearTimeout(syncTimer)
  syncTimer = null
  const generation = accountGeneration
  const userId = currentUserId
  const revision = localRevision
  const isCurrent = () => generation === accountGeneration && currentUserId === userId && !restorePaused
  syncStore.setStatus('syncing')
  syncStore.setLastError(null)
  const operation = (async () => {
    try {
      const snapshot = exportLocalSnapshot()
      const response = await withQaControl('cloud-sync', async () => client.functions.invoke<MergeLocalStateResult>(config.mergeFunctionSlug, {
        body: { reason, snapshot: toSupabaseMergeSnapshot(snapshot) },
      }))
      if (!isCurrent()) return { ok: false, skipped: true }
      if (response.error) throw response.error
      const result = response.data
      validateCompleteMergeResult(result, snapshot)
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
      if (localStorage.getItem(RESTORE_RECOVERY_KEY)) markRestoreRecoveryRequired()
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

  syncStore.setStatus('authenticating')
  syncStore.setLastError(null)

  const { error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectTo ?? (typeof window !== 'undefined' ? window.location.href : undefined),
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

  syncStore.setStatus('authenticating')
  syncStore.setLastError(null)

  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo ?? (typeof window !== 'undefined' ? window.location.href : undefined),
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

  currentUserId = null
  syncStore.setCurrentUser(null)
  syncStore.setStatus('signed-out')
  syncStore.setLastError(null)
  syncStore.setSyncQueued(false)
  return { ok: true }
}

export async function deleteCloudAccount() {
  const client = getNaamrasSupabaseClient()
  const config = getNaamrasSupabaseConfig()
  const syncStore = useCloudSyncStore.getState()

  if (!client || !config.enabled || !currentUserId) {
    syncStore.setLastError(getCloudSyncFailureMessage('account'))
    return { ok: false }
  }

  invalidateRequests()
  const generation = accountGeneration
  const userId = currentUserId
  const isCurrent = () => generation === accountGeneration && currentUserId === userId
  try {
    const response = await withQaControl('cloud-account-delete', async () => (
      client.functions.invoke<{ deleted?: boolean }>(config.deleteAccountFunctionSlug, {
        body: { confirmation: 'delete' },
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
    currentUserId = null
    syncStore.setCurrentUser(null)
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
  if (syncTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(syncTimer)
  }
  syncTimer = null
  currentUserId = null
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
  inFlight = null
}
