import { afterEach, describe, expect, it, vi } from 'vitest'

type SyncHarnessOptions = {
  invokeImpl?: () => Promise<{ data?: unknown; error?: unknown }>
}

async function loadSyncHarness(options: SyncHarnessOptions = {}) {
  vi.resetModules()

  const mockApplyRemoteSnapshot = vi.fn()
  const mockExportLocalSnapshot = vi.fn(() => ({
    version: 1,
    deviceId: 'device-1',
    profile: {
      id: 'profile',
      userId: null,
      deviceId: 'device-1',
      clientUpdatedAt: '2026-01-01T00:00:00.000Z',
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
        sundarGutkaLengths: {},
      },
      onboarding: {
        hasCompletedOnboarding: false,
        learningLevel: 'beginner',
        audience: 'adult',
        learningGoal: 'read',
        presentationMode: 'first-run',
      },
    },
    savedItems: [],
    vocabEntries: [],
    learningProgress: [],
    activityEvents: [],
  }))
  const mockLoadRemoteSnapshotFromRepositories = vi.fn().mockResolvedValue({
    profile: {
      id: 'profile',
      userId: null,
      deviceId: 'remote-device',
      clientUpdatedAt: '2026-01-03T00:00:00.000Z',
      deletedAt: null,
      locale: 'pa',
      darkMode: true,
      reader: {
        scriptMode: 'gurmukhi',
        showTransliteration: true,
        meaningLanguage: 'en',
        larivaar: false,
        showVishraam: true,
        lineSpacing: 'relaxed',
        textAlign: 'left',
        fontSize: 22,
        englishSource: 'bdb',
        sundarGutkaLengths: {},
      },
      onboarding: {
        hasCompletedOnboarding: true,
        learningLevel: 'daily-reader',
        audience: 'adult',
        learningGoal: 'understand',
        presentationMode: 'overlay',
      },
    },
    savedItems: [],
    vocabEntries: [],
    learningProgress: [],
    activityEvents: [],
  })

  const invokeImpl = options.invokeImpl
    ?? (() => Promise.resolve({ data: null, error: new Error('merge failed') }))
  const mockClient = {
    auth: {
      getPublicAuthConfig: vi.fn().mockResolvedValue({ data: { oAuthProviders: ['google'] }, error: null }),
      getCurrentUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'user-1',
            email: 'naamras@example.com',
            profile: { name: 'Naamras' },
            providers: ['google'],
          },
        },
        error: null,
      }),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
    functions: {
      invoke: vi.fn(invokeImpl),
    },
  }

  vi.doMock('./client', () => ({
    getNaamrasInsforgeClient: () => mockClient,
  }))
  vi.doMock('./config', () => ({
    getNaamrasInsforgeConfig: () => ({
      enabled: true,
      baseUrl: 'https://naamras.insforge.app',
      mergeFunctionSlug: 'merge-local-state',
      banidbFunctionSlug: 'banidb-proxy',
      studyFunctionSlug: 'generate-study-response',
      studyEnabled: false,
    }),
  }))
  vi.doMock('./repositories', () => ({
    loadRemoteSnapshotFromRepositories: mockLoadRemoteSnapshotFromRepositories,
  }))
  vi.doMock('./snapshot', () => ({
    exportLocalSnapshot: mockExportLocalSnapshot,
    applyRemoteSnapshot: mockApplyRemoteSnapshot,
  }))
  vi.doMock('../qa/runtime', () => ({
    withQaControl: async <T>(_scope: string, callback: () => Promise<T>) => callback(),
  }))

  const runtime = await import('./runtime')
  const { useCloudSyncStore } = await import('../store/cloudSync')

  return {
    runtime,
    useCloudSyncStore,
    mockApplyRemoteSnapshot,
    mockExportLocalSnapshot,
    mockLoadRemoteSnapshotFromRepositories,
    mockClient,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('syncNow', () => {
  it('does not apply a remote snapshot when the merge function returns an error', async () => {
    const {
      runtime,
      useCloudSyncStore,
      mockApplyRemoteSnapshot,
      mockLoadRemoteSnapshotFromRepositories,
    } = await loadSyncHarness()

    await runtime.bootstrapCloudSync()
    const result = await runtime.syncNow('manual')

    expect(mockLoadRemoteSnapshotFromRepositories).not.toHaveBeenCalled()
    expect(mockApplyRemoteSnapshot).not.toHaveBeenCalled()
    expect(useCloudSyncStore.getState()).toMatchObject({
      status: 'error',
      syncQueued: true,
    })
    expect(result).toMatchObject({ ok: false })
  })

  it('does not overwrite local state when the merge function throws', async () => {
    const {
      runtime,
      useCloudSyncStore,
      mockApplyRemoteSnapshot,
      mockLoadRemoteSnapshotFromRepositories,
    } = await loadSyncHarness({
      invokeImpl: () => Promise.reject(new Error('network exploded')),
    })

    await runtime.bootstrapCloudSync()
    const result = await runtime.syncNow('manual')

    expect(mockLoadRemoteSnapshotFromRepositories).not.toHaveBeenCalled()
    expect(mockApplyRemoteSnapshot).not.toHaveBeenCalled()
    expect(useCloudSyncStore.getState()).toMatchObject({
      status: 'error',
      syncQueued: true,
    })
    expect(result).toMatchObject({ ok: false })
  })
})
