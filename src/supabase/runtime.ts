import type { User } from '@supabase/supabase-js'
import { getNaamrasSupabaseClient } from './client'
import { getNaamrasSupabaseConfig } from './config'
import { applyRemoteSnapshot, exportLocalSnapshot } from './snapshot'
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
  version: 2
  complete: true
  mergedAt: string
  snapshot: CloudRemoteSnapshot
} {
  if (
    !result
    || result.version !== 2
    || result.complete !== true
    || !isTimestamp(result.mergedAt)
    || !Array.isArray(result.acknowledgedEventIds)
    || !result.acknowledgedEventIds.every(id => typeof id === 'string')
    || !isObject(result.snapshot)
    || result.snapshot.version !== 2
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
  if (!currentUserId || applyingRemoteSnapshot) return

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
  if (cleanupSubscriptions.length > 0) return

  cleanupSubscriptions = [
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
  ]
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

  const { data, error } = await client.auth.getSession()
  if (error) {
    syncStore.setStatus('error')
    syncStore.setLastError(getCloudSyncFailureMessage('bootstrap'))
    currentUserId = null
    return
  }

  const user = data.session?.user ?? null
  currentUserId = user?.id ?? null
  syncStore.setCurrentUser(user ? toCloudUserSummary(user) : null)
  syncStore.setStatus(user ? 'ready' : 'signed-out')
  syncStore.setLastError(null)
}

export async function syncNow(reason = 'manual') {
  const client = getNaamrasSupabaseClient()
  const config = getNaamrasSupabaseConfig()
  const syncStore = useCloudSyncStore.getState()

  if (!client || !config.enabled || !currentUserId) {
    return { ok: false, skipped: true }
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    syncStore.setStatus('offline')
    syncStore.setSyncQueued(true)
    return { ok: false, offline: true }
  }

  syncStore.setStatus('syncing')
  syncStore.setLastError(null)

  try {
    const snapshot = exportLocalSnapshot()
    const functionResponse = await withQaControl('cloud-sync', async () => client.functions.invoke<MergeLocalStateResult>(config.mergeFunctionSlug, {
      body: {
        reason,
        snapshot: toSupabaseMergeSnapshot(snapshot),
      },
    }))

    if (functionResponse.error) {
      syncStore.setStatus('error')
      syncStore.setLastError(getCloudSyncFailureMessage('sync'))
      syncStore.setSyncQueued(true)
      return { ok: false, error: functionResponse.error }
    }

    const result = functionResponse.data
    validateCompleteMergeResult(result, snapshot)

    applyingRemoteSnapshot = true
    try {
      applyRemoteSnapshot(result.snapshot)
      if (result.acknowledgedEventIds.length) {
        useActivityEventsStore.getState().acknowledgeEvents(result.acknowledgedEventIds)
      }
    } finally {
      applyingRemoteSnapshot = false
    }

    syncStore.setStatus('ready')
    syncStore.setLastSyncedAt(result.mergedAt)
    syncStore.setLastError(null)
    syncStore.setSyncQueued(false)

    return { ok: true }
  } catch (error) {
    syncStore.setStatus('error')
    syncStore.setLastError(getCloudSyncFailureMessage('sync'))
    syncStore.setSyncQueued(true)
    return { ok: false, error }
  }
}

export async function bootstrapCloudSync() {
  if (bootstrapPromise) return bootstrapPromise

  bootstrapPromise = (async () => {
    useBookmarksStore.getState().hydrateCachedBookmarks()
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
  syncStore.setLastError('Check your email for the Supabase magic link.')
  return { ok: true }
}

export async function signOutOfCloud() {
  const client = getNaamrasSupabaseClient()
  const syncStore = useCloudSyncStore.getState()

  if (!client) return { ok: false }

  const { error } = await withQaControl('cloud-sync', async () => client.auth.signOut())

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

  try {
    const response = await withQaControl('cloud-account-delete', async () => (
      client.functions.invoke<{ deleted?: boolean }>(config.deleteAccountFunctionSlug, {
        body: { confirmation: 'delete' },
      })
    ))

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
    currentUserId = null
    syncStore.setCurrentUser(null)
    syncStore.setStatus('signed-out')
    syncStore.setLastError(null)
    syncStore.setSyncQueued(false)
    syncStore.setLastSyncedAt(null)
    return { ok: true }
  } catch (error) {
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
}
