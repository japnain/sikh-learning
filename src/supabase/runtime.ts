import type { User } from '@supabase/supabase-js'
import { getNaamrasSupabaseClient } from './client'
import { getNaamrasSupabaseConfig } from './config'
import { applyRemoteSnapshot, exportLocalSnapshot } from './snapshot'
import type {
  CloudLocalSnapshot,
  CloudRemoteSnapshot,
  CloudSavedLearnItemPayload,
  CloudUserSummary,
  MergeLocalStateResult,
} from './types'
import { withQaControl } from '../qa/runtime'
import { useActivityEventsStore } from '../store/activityEvents'
import { useBookmarksStore } from '../store/bookmarks'
import { useCloudSyncStore } from '../store/cloudSync'
import { useFavoritesStore } from '../store/favorites'
import { useLanguageStore } from '../store/language'
import { useLearningStore } from '../store/learning'
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

function toSupabaseMergeSnapshot(snapshot: CloudLocalSnapshot) {
  const savedLearnItemIds = snapshot.savedItems
    .filter(record => record.kind === 'learn-item' && !record.deletedAt)
    .map(record => (record.payload as CloudSavedLearnItemPayload).itemId)

  const readingProgressRecord = snapshot.learningProgress.find(record => record.scope === 'reading-progress')
  const readingProgressPayload = readingProgressRecord?.payload as { progress?: Record<string, number> } | undefined

  return {
    version: snapshot.version,
    deviceId: snapshot.deviceId,
    profile: {
      locale: snapshot.profile.locale,
      darkMode: snapshot.profile.darkMode,
      onboarding: snapshot.profile.onboarding,
    },
    readerPreferences: snapshot.profile.reader,
    bookmarks: snapshot.savedItems
      .filter(record => record.kind === 'bookmark')
      .map(record => record.payload),
    savedLearnItemIds,
    vocabEntries: snapshot.vocabEntries,
    learningProgress: snapshot.learningProgress,
    readingProgress: readingProgressPayload?.progress ?? {},
    activityEvents: snapshot.activityEvents,
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
    useLearningStore.subscribe(() => scheduleSync('learning')),
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

    applyingRemoteSnapshot = true
    try {
      applyRemoteSnapshot(result?.snapshot as CloudRemoteSnapshot | null | undefined)
    } finally {
      applyingRemoteSnapshot = false
    }

    if (result?.acknowledgedEventIds?.length) {
      useActivityEventsStore.getState().acknowledgeEvents(result.acknowledgedEventIds)
    }

    syncStore.setStatus('ready')
    syncStore.setLastSyncedAt(result?.mergedAt ?? new Date().toISOString())
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
