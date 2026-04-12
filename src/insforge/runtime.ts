import type { UserSchema } from '@insforge/sdk'
import { getNaamrasInsforgeClient } from './client'
import { getNaamrasInsforgeConfig } from './config'
import { loadRemoteSnapshotFromRepositories } from './repositories'
import { applyRemoteSnapshot, exportLocalSnapshot } from './snapshot'
import type { CloudUserSummary, MergeLocalStateResult } from './types'
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

let bootstrapPromise: Promise<void> | null = null
let syncTimer: number | null = null
let currentUserId: string | null = null
let applyingRemoteSnapshot = false
let cleanupSubscriptions: Array<() => void> = []
let onlineListenerBound = false

function toCloudUserSummary(user: UserSchema): CloudUserSummary {
  return {
    id: user.id,
    email: user.email,
    name: user.profile?.name ?? null,
    providers: user.providers ?? [],
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
  const config = getNaamrasInsforgeConfig()
  const syncStore = useCloudSyncStore.getState()
  const client = getNaamrasInsforgeClient()

  syncStore.setConfigured(config.enabled)
  if (!config.enabled || !client) {
    syncStore.setStatus('idle')
    syncStore.setAvailableProviders([])
    syncStore.setCurrentUser(null)
    currentUserId = null
    return
  }

  syncStore.setStatus('booting')

  const [authConfigResult, userResult] = await Promise.all([
    client.auth.getPublicAuthConfig(),
    client.auth.getCurrentUser(),
  ])

  syncStore.setAvailableProviders(authConfigResult.data?.oAuthProviders ?? [])

  if (authConfigResult.error && !userResult.data?.user) {
    syncStore.setStatus('error')
    syncStore.setLastError(authConfigResult.error.message)
  }

  const user = userResult.data?.user ?? null
  currentUserId = user?.id ?? null
  syncStore.setCurrentUser(user ? toCloudUserSummary(user) : null)

  if (userResult.error) {
    syncStore.setStatus('error')
    syncStore.setLastError(userResult.error.message)
    return
  }

  if (!user) {
    syncStore.setStatus('signed-out')
    syncStore.setLastError(null)
    return
  }

  syncStore.setStatus('ready')
  syncStore.setLastError(null)
}

export async function syncNow(reason = 'manual') {
  const client = getNaamrasInsforgeClient()
  const config = getNaamrasInsforgeConfig()
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

  const snapshot = exportLocalSnapshot()
  const functionResponse = await client.functions.invoke<MergeLocalStateResult>(config.mergeFunctionSlug, {
    body: {
      reason,
      snapshot,
    },
  })

  if (functionResponse.error) {
    const remoteSnapshot = await loadRemoteSnapshotFromRepositories(client)
    if (remoteSnapshot) {
      applyingRemoteSnapshot = true
      try {
        applyRemoteSnapshot(remoteSnapshot)
      } finally {
        applyingRemoteSnapshot = false
      }
      syncStore.setStatus('ready')
      syncStore.setLastSyncedAt(new Date().toISOString())
      syncStore.setLastError(functionResponse.error.message)
      return { ok: false, fallbackLoaded: true }
    }

    syncStore.setStatus('error')
    syncStore.setLastError(functionResponse.error.message)
    syncStore.setSyncQueued(true)
    return { ok: false, error: functionResponse.error }
  }

  const result = functionResponse.data

  applyingRemoteSnapshot = true
  try {
    applyRemoteSnapshot(result?.snapshot ?? null)
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
}

export async function bootstrapCloudSync() {
  if (bootstrapPromise) return bootstrapPromise

  bootstrapPromise = (async () => {
    await refreshCloudState()
    bindStoreSubscriptions()
    bindOnlineListener()

    if (currentUserId) {
      await syncNow('app-start')
    }
  })()

  return bootstrapPromise
}

export async function signInWithProvider(provider: 'google' | 'apple' | 'github') {
  const client = getNaamrasInsforgeClient()
  const syncStore = useCloudSyncStore.getState()

  if (!client) {
    syncStore.setLastError('InsForge is not configured for this build.')
    return { ok: false }
  }

  syncStore.setStatus('authenticating')
  syncStore.setLastError(null)

  const { error } = await client.auth.signInWithOAuth({
    provider,
    redirectTo: typeof window !== 'undefined' ? window.location.href : undefined,
  })

  if (error) {
    syncStore.setStatus('signed-out')
    syncStore.setLastError(error.message)
    return { ok: false, error }
  }

  return { ok: true }
}

export async function signOutOfCloud() {
  const client = getNaamrasInsforgeClient()
  const syncStore = useCloudSyncStore.getState()

  if (!client) return { ok: false }

  const { error } = await client.auth.signOut()

  if (error) {
    syncStore.setStatus('error')
    syncStore.setLastError(error.message)
    return { ok: false, error }
  }

  currentUserId = null
  syncStore.setCurrentUser(null)
  syncStore.setStatus('signed-out')
  syncStore.setLastError(null)
  syncStore.setSyncQueued(false)
  return { ok: true }
}
