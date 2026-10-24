import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { useActivityEventsStore } from '../store/activityEvents'
import { useCloudSyncStore } from '../store/cloudSync'
import { useLanguageStore } from '../store/language'
import type {
  CloudActivityEvent,
  CloudLocalSnapshot,
  CloudRemoteSnapshot,
  MergeLocalStateResult,
} from './types'

const mocks = vi.hoisted(() => {
  const config = {
    enabled: true,
    url: 'https://naamras-qa.supabase.co',
    anonKey: 'test-key',
    banidbMockEnabled: false,
    banidbDirectFallbackEnabled: true,
    banidbPublicOrigin: 'https://api.banidb.com',
    banidbFunctionSlug: 'banidb-proxy',
    mergeFunctionSlug: 'merge-local-state',
    deleteAccountFunctionSlug: 'delete-account',
    studyFunctionSlug: 'generate-study-response',
    studyEnabled: false,
  }
  const getSession = vi.fn()
  const onAuthStateChange = vi.fn()
  const invoke = vi.fn()
  const exportLocalSnapshot = vi.fn()
  const applyRemoteSnapshot = vi.fn()
  const client = {
    auth: {
      getSession,
      onAuthStateChange,
      signOut: vi.fn(),
      signInWithOAuth: vi.fn(),
      signInWithOtp: vi.fn(),
    },
    functions: {
      invoke,
    },
  }

  return {
    config,
    client,
    getSession,
    onAuthStateChange,
    invoke,
    exportLocalSnapshot,
    applyRemoteSnapshot,
  }
})

vi.mock('./config', () => ({
  getNaamrasSupabaseConfig: () => mocks.config,
}))

vi.mock('./client', () => ({
  getNaamrasSupabaseClient: () => mocks.config.enabled ? mocks.client : null,
}))

vi.mock('./snapshot', () => ({
  exportLocalSnapshot: mocks.exportLocalSnapshot,
  applyRemoteSnapshot: mocks.applyRemoteSnapshot,
  reconcileRemoteSnapshotWithLocalChanges: (remote: unknown) => remote,
}))

vi.mock('../qa/runtime', () => ({
  withQaControl: (_key: string, operation: () => unknown) => operation(),
}))

import {
  bootstrapCloudSync,
  resetCloudSyncRuntimeForTests,
  toSupabaseMergeSnapshot,
  syncNow, signOutOfCloud, deleteCloudAccount, pauseCloudSyncForRestore,
} from './runtime'

const EVENT: CloudActivityEvent = {
  id: 'event-1',
  userId: null,
  deviceId: 'device-a',
  eventType: 'saved-item.bookmark.added',
  occurredAt: '2026-04-17T12:00:00.000Z',
  clientUpdatedAt: '2026-04-17T12:00:00.000Z',
  deletedAt: null,
  payload: {},
}

const LOCAL_SNAPSHOT: CloudLocalSnapshot = {
  version: 3,
  deviceId: 'device-a',
  profile: {
    id: 'profile',
    userId: null,
    deviceId: 'device-a',
    clientUpdatedAt: '2026-04-17T12:00:00.000Z',
    baseUpdatedAt: null,
    deletedAt: null,
    locale: 'en',
    darkMode: false,
    reader: {
      scriptMode: 'gurmukhi',
      showTransliteration: false,
      meaningLanguage: 'en',
      larivaar: false,
      showVishraam: true,
      lineSpacing: 'relaxed',
      textAlign: 'left',
      fontSize: 22,
      englishSource: 'bdb',
      punjabiSource: 'ss',
      hindiSource: 'ss',
      visraamSource: 'sttm',
      sundarGutkaLengths: {},
    },
    onboarding: {
      hasCompletedOnboarding: true,
      learningLevel: 'beginner',
      audience: 'adult',
      learningGoal: 'read',
      presentationMode: 'overlay',
    },
  },
  savedItems: [],
  vocabEntries: [],
  learningProgress: [],
  activityEvents: [EVENT],
}

const REMOTE_SNAPSHOT: CloudRemoteSnapshot = {
  version: 3,
  generatedAt: '2026-04-17T12:05:00.000Z',
  profile: {
    ...LOCAL_SNAPSHOT.profile,
    userId: 'user-1',
    baseUpdatedAt: '2026-04-17T12:00:00.000Z',
  },
  savedItems: [],
  vocabEntries: [],
  learningProgress: [],
  activityEvents: [],
}

function completeResult(): MergeLocalStateResult {
  return {
    version: 3,
    complete: true,
    acknowledgedEventIds: ['event-1'],
    mergedAt: '2026-04-17T12:05:00.000Z',
    snapshot: REMOTE_SNAPSHOT,
  }
}

beforeEach(() => {
  resetCloudSyncRuntimeForTests()
  vi.clearAllMocks()
  localStorage.clear()
  mocks.config.enabled = true
  mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
  mocks.client.auth.signOut.mockResolvedValue({ error: null })
  mocks.getSession.mockResolvedValue({
    data: {
      session: {
        user: {
          id: 'user-1',
          email: 'simran@example.com',
          app_metadata: { providers: ['email'] },
          user_metadata: {},
        },
      },
    },
    error: null,
  })
  mocks.exportLocalSnapshot.mockReturnValue(LOCAL_SNAPSHOT)
  mocks.invoke.mockResolvedValue({
    data: completeResult(),
    error: null,
  })
  mocks.applyRemoteSnapshot.mockImplementation(() => undefined)
  useCloudSyncStore.getState().reset()
  useActivityEventsStore.setState({ pendingEvents: [EVENT] })
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: true,
  })
})

describe('cloud runtime completion contract', () => {
  test('uploads the full v3 snapshot without dropping favorites or progress domains', () => {
    const serialized = toSupabaseMergeSnapshot({
      ...LOCAL_SNAPSHOT,
      savedItems: [{
        id: 'favorite-1',
        userId: null,
        deviceId: 'device-a',
        clientUpdatedAt: '2026-04-17T12:00:00.000Z',
        baseUpdatedAt: null,
        deletedAt: null,
        kind: 'favorite',
        naturalKey: 'favorite:G:1:verse:100',
        payload: {
          id: 'favorite-1',
          title: 'Verse 100',
          source: 'G',
          ang: 1,
          shabadId: 10,
          verseId: 100,
          type: 'shabad',
          routeMode: 'verse',
          savedAt: '2026-04-17T12:00:00.000Z',
        },
      }],
      learningProgress: [{
        id: 'reading-progress',
        userId: null,
        deviceId: 'device-a',
        clientUpdatedAt: '2026-04-17T12:00:00.000Z',
        baseUpdatedAt: null,
        deletedAt: null,
        scope: 'reading-progress',
        payload: {
          progress: {
            'japji-sahib': [1, 2, 3],
          },
        },
      }],
    })

    expect(serialized.savedItems[0]).toMatchObject({
      kind: 'favorite',
      naturalKey: 'favorite:G:1:verse:100',
    })
    expect(serialized.learningProgress[0]?.payload).toEqual({
      progress: {
        'japji-sahib': [1, 2, 3],
      },
    })
    expect(serialized.activityEvents).toEqual([EVENT])
  })

  test('acknowledges local activity only after a complete remote snapshot applies', async () => {
    await bootstrapCloudSync()

    expect(mocks.applyRemoteSnapshot).toHaveBeenCalledWith(REMOTE_SNAPSHOT)
    expect(useActivityEventsStore.getState().pendingEvents).toEqual([])
    expect(useCloudSyncStore.getState()).toMatchObject({
      status: 'ready',
      lastSyncedAt: '2026-04-17T12:05:00.000Z',
      lastError: null,
      syncQueued: false,
    })
  })

  test('keeps activity queued and does not claim ready for a partial response', async () => {
    mocks.invoke.mockResolvedValue({
      data: {
        ...completeResult(),
        complete: false,
      },
      error: null,
    })

    await bootstrapCloudSync()

    expect(mocks.applyRemoteSnapshot).not.toHaveBeenCalled()
    expect(useActivityEventsStore.getState().pendingEvents).toEqual([EVENT])
    expect(useCloudSyncStore.getState()).toMatchObject({
      status: 'error',
      lastSyncedAt: null,
      syncQueued: true,
    })
  })

  test('keeps activity queued when applying the remote snapshot fails', async () => {
    mocks.applyRemoteSnapshot.mockImplementation(() => {
      throw new Error('invalid remote payload')
    })

    await bootstrapCloudSync()

    expect(useActivityEventsStore.getState().pendingEvents).toEqual([EVENT])
    expect(useCloudSyncStore.getState()).toMatchObject({
      status: 'error',
      lastSyncedAt: null,
      syncQueued: true,
    })
  })

  test('does not initialize or upload when production cloud config is disabled', async () => {
    mocks.config.enabled = false

    await bootstrapCloudSync()

    expect(mocks.getSession).not.toHaveBeenCalled()
    expect(mocks.exportLocalSnapshot).not.toHaveBeenCalled()
    expect(mocks.invoke).not.toHaveBeenCalled()
    expect(useCloudSyncStore.getState()).toMatchObject({
      configured: false,
      status: 'idle',
      currentUser: null,
    })
  })
})


afterEach(() => { resetCloudSyncRuntimeForTests(); vi.useRealTimers() })

function deferredResponse() {
  let resolve!: (value: { data: MergeLocalStateResult; error: null }) => void
  const promise = new Promise<{ data: MergeLocalStateResult; error: null }>(done => { resolve = done })
  return { promise, resolve: () => resolve({ data: completeResult(), error: null }) }
}

describe('cloud concurrency and auth lifecycle', () => {
  test('never signs out a new account when an older account deletion finishes', async () => {
    await bootstrapCloudSync()
    let finish!: (value: unknown) => void
    mocks.invoke.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
    const deleting = deleteCloudAccount()
    const listener = mocks.onAuthStateChange.mock.calls[0][0]
    listener('SIGNED_IN', { user: { id: 'user-2', app_metadata: {}, user_metadata: {} } })
    finish({ data: { deleted: true }, error: null })
    await expect(deleting).resolves.toMatchObject({ skipped: true })
    expect(mocks.client.auth.signOut).not.toHaveBeenCalled()
    expect(useCloudSyncStore.getState().currentUser?.id).toBe('user-2')
  })

  test('retains a recovery pause across reload and resumes only after successful restore', async () => {
    vi.useFakeTimers()
    await bootstrapCloudSync()
    pauseCloudSyncForRestore()(false)
    resetCloudSyncRuntimeForTests()
    mocks.invoke.mockClear()
    await bootstrapCloudSync()
    expect(mocks.invoke).not.toHaveBeenCalled()
    expect(useCloudSyncStore.getState().lastError).toBe('personal-data-restore-recovery-required')
    await expect(syncNow()).resolves.toMatchObject({ skipped: true })
    pauseCloudSyncForRestore()(true)
    await vi.advanceTimersByTimeAsync(800)
    expect(mocks.invoke).toHaveBeenCalledTimes(1)
    expect(useCloudSyncStore.getState().lastError).toBeNull()
  })

  test('pauses further uploads if a cloud snapshot cannot roll back', async () => {
    await bootstrapCloudSync()
    mocks.applyRemoteSnapshot.mockImplementationOnce(() => { throw new Error('cloud-rollback-failed') })
    await expect(syncNow()).resolves.toMatchObject({ ok: false })
    await expect(syncNow()).resolves.toMatchObject({ skipped: true })
    expect(useCloudSyncStore.getState().lastError).toBe('personal-data-restore-recovery-required')
  })

  test('does not overwrite local edits made during a request and retries serially', async () => {
    vi.useFakeTimers()
    await bootstrapCloudSync()
    mocks.applyRemoteSnapshot.mockClear()
    const deferred = deferredResponse()
    mocks.invoke.mockReturnValueOnce(deferred.promise)
    const first = syncNow()
    useLanguageStore.getState().setFontSize(34)
    expect(syncNow()).toBe(first)
    deferred.resolve()
    await expect(first).resolves.toMatchObject({ ok: false, queued: true })
    expect(mocks.applyRemoteSnapshot).toHaveBeenCalledWith(REMOTE_SNAPSHOT, REMOTE_SNAPSHOT)
    expect(useLanguageStore.getState().fontSize).toBe(34)
    expect(useCloudSyncStore.getState().syncQueued).toBe(true)
    await vi.advanceTimersByTimeAsync(800)
    expect(mocks.applyRemoteSnapshot).toHaveBeenCalledTimes(2)
    expect(useCloudSyncStore.getState().syncQueued).toBe(false)
  })

  test('ignores late responses after sign-out', async () => {
    await bootstrapCloudSync()
    mocks.applyRemoteSnapshot.mockClear()
    const deferred = deferredResponse()
    mocks.invoke.mockReturnValueOnce(deferred.promise)
    const first = syncNow()
    await signOutOfCloud()
    deferred.resolve()
    await expect(first).resolves.toMatchObject({ skipped: true })
    expect(mocks.applyRemoteSnapshot).not.toHaveBeenCalled()
    expect(useCloudSyncStore.getState()).toMatchObject({ currentUser: null, status: 'signed-out' })
  })

  test('observes auth changes and rejects a previous account response', async () => {
    vi.useFakeTimers()
    await bootstrapCloudSync()
    mocks.applyRemoteSnapshot.mockClear()
    const deferred = deferredResponse()
    mocks.invoke.mockReturnValueOnce(deferred.promise)
    const first = syncNow()
    const listener = mocks.onAuthStateChange.mock.calls[0][0]
    listener('SIGNED_IN', { user: { id: 'user-2', app_metadata: {}, user_metadata: {} } })
    deferred.resolve()
    await first
    expect(mocks.applyRemoteSnapshot).not.toHaveBeenCalled()
    expect(useCloudSyncStore.getState().currentUser?.id).toBe('user-2')
    await vi.advanceTimersByTimeAsync(800)
    expect(mocks.applyRemoteSnapshot).toHaveBeenCalledTimes(1)
    listener('SIGNED_OUT', null)
    expect(useCloudSyncStore.getState()).toMatchObject({ currentUser: null, status: 'signed-out' })
  })

  test('does not upload or apply halfway through a portable restore', async () => {
    vi.useFakeTimers()
    await bootstrapCloudSync()
    mocks.applyRemoteSnapshot.mockClear()
    const deferred = deferredResponse()
    mocks.invoke.mockReturnValueOnce(deferred.promise)
    const first = syncNow()
    const resume = pauseCloudSyncForRestore()
    useLanguageStore.getState().setFontSize(26)
    await expect(syncNow()).resolves.toMatchObject({ skipped: true })
    deferred.resolve()
    await first
    expect(mocks.applyRemoteSnapshot).not.toHaveBeenCalled()
    resume()
    await vi.advanceTimersByTimeAsync(800)
    expect(mocks.applyRemoteSnapshot).toHaveBeenCalledTimes(1)
  })
})
