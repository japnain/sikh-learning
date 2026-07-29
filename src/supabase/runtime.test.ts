import { beforeEach, describe, expect, test, vi } from 'vitest'
import { useActivityEventsStore } from '../store/activityEvents'
import { useCloudSyncStore } from '../store/cloudSync'
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
  const invoke = vi.fn()
  const exportLocalSnapshot = vi.fn()
  const applyRemoteSnapshot = vi.fn()
  const client = {
    auth: {
      getSession,
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
}))

vi.mock('../qa/runtime', () => ({
  withQaControl: (_key: string, operation: () => unknown) => operation(),
}))

import {
  bootstrapCloudSync,
  resetCloudSyncRuntimeForTests,
  toSupabaseMergeSnapshot,
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
  version: 2,
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
  version: 2,
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
    version: 2,
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
  test('uploads the full v2 snapshot without dropping favorites or progress domains', () => {
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
