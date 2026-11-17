import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type TestSession = { access_token: string; user: { id: string } }
const auth = vi.hoisted(() => ({
  session: null as TestSession | null,
  callback: null as ((event: string, session: TestSession | null) => void) | null,
  getSession: vi.fn(),
}))

vi.mock('../supabase/client', () => ({
  getNaamrasSupabaseClient: () => ({ auth: {
    getSession: auth.getSession,
    onAuthStateChange: (callback: typeof auth.callback) => {
      auth.callback = callback
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    },
  } }),
}))
vi.mock('../supabase/config', () => ({
  getNaamrasSupabaseConfig: () => ({ anonKey: 'test-publishable-key' }),
  getNaamrasSupabaseFunctionUrl: () => 'https://books.example.test/functions/v1/private-library',
}))

type Api = typeof import('./privateLibrary')
let api: Api
const fetchMock = vi.fn<typeof fetch>()
const revoked = vi.fn()
const eventListeners: Array<{ target: EventTarget; type: string; listener: EventListenerOrEventListenerObject }> = []

function reply(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}
async function flushMicrotasks() { for (let i = 0; i < 6; i++) await Promise.resolve() }
function book(overrides: Record<string, unknown> = {}) {
  return {
    id: 'work-one', title: 'A Reader’s Book', authors: ['An Author'], description: 'A sample book.',
    category: 'Essays', language: 'en', formats: ['epub'], editionVersion: 'revision-one',
    renderer: 'chapters', contents: [{ id: 'chapter-one', title: 'Opening', assetId: 'asset-one' }],
    ...overrides,
  }
}
async function signIn(id = 'owner-account') {
  auth.session = { access_token: `session-for-${id}`, user: { id } }
  api.initializePrivateLibrarySession()
  await Promise.resolve()
  await api.recheckPrivateLibraryAccess()
  expect(api.getPrivateLibraryAccess().allowed).toBe(true)
  fetchMock.mockClear()
}

beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers()
  auth.session = null
  auth.callback = null
  auth.getSession.mockReset().mockImplementation(async () => ({ data: { session: auth.session }, error: null }))
  fetchMock.mockReset().mockImplementation(async () => reply({ allowed: true }))
  revoked.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = vi.fn(() => 'blob:https://books.example.test/cover-one')
    static revokeObjectURL = revoked
  })
  for (const target of [window, document]) {
    const add = target.addEventListener.bind(target)
    vi.spyOn(target, 'addEventListener').mockImplementation(((type: string, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => {
      eventListeners.push({ target, type, listener })
      add(type, listener, options)
    }) as typeof target.addEventListener)
  }
  api = await import('./privateLibrary')
})

afterEach(() => {
  api.clearPrivateLibrarySession()
  for (const { target, type, listener } of eventListeners.splice(0)) target.removeEventListener(type, listener)
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('private catalogue authorization and isolation', () => {
  it('does not request private metadata or create object URLs while signed out', async () => {
    api.initializePrivateLibrarySession()
    await Promise.resolve()
    await expect(api.loadPrivateBooks()).rejects.toMatchObject({ status: 403 })
    expect(() => api.createPrivateObjectUrl(new Blob(['cover']))).toThrow(/not available/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('requires the capability grant and never falls back to a public catalogue', async () => {
    fetchMock.mockImplementation(async () => reply({ allowed: false }))
    auth.session = { access_token: 'ordinary-token', user: { id: 'ordinary-account' } }
    api.initializePrivateLibrarySession()
    await Promise.resolve()
    await api.recheckPrivateLibraryAccess()
    expect(api.getPrivateLibraryAccess()).toMatchObject({ allowed: false, loading: false })
    await expect(api.loadPrivateBooks()).rejects.toMatchObject({ status: 403 })
    expect(fetchMock.mock.calls.every(([url]) => new URL(String(url)).searchParams.get('action') === 'capability')).toBe(true)
  })

  it('fetches authorized metadata with current credentials, no browser cache and no redirects', async () => {
    await signIn()
    fetchMock.mockResolvedValue(reply({ books: [book()] }))
    await expect(api.loadPrivateBooks()).resolves.toHaveLength(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(new URL(String(url)).searchParams.get('action')).toBe('catalog')
    expect(options).toMatchObject({
      cache: 'no-store', redirect: 'error', credentials: 'omit',
      headers: { Authorization: 'Bearer session-for-owner-account', apikey: 'test-publishable-key' },
    })
    expect(options?.signal).toBeInstanceOf(AbortSignal)
  })

  it('rejects a malformed book or a response for a different requested book', async () => {
    await signIn()
    fetchMock.mockResolvedValueOnce(reply({ books: [book({ authors: [123] })] }))
    await expect(api.loadPrivateBooks()).rejects.toThrow(/collection could not be read/)
    fetchMock.mockResolvedValueOnce(reply({ book: book({ id: 'different-work' }) }))
    await expect(api.loadPrivateBook('work-one')).rejects.toThrow(/book could not be read/)
  })

  it('rejects malformed nested contents before a reader attempts to render it', async () => {
    await signIn()
    fetchMock.mockResolvedValueOnce(reply({ books: [book({ contents: [null] })] }))
    await expect(api.loadPrivateBooks()).rejects.toThrow(/collection could not be read/)
  })

  it('aborts old requests, revokes private URLs and rejects a late response after logout', async () => {
    await signIn()
    const cover = api.createPrivateObjectUrl(new Blob(['cover']))
    const waiting = deferred<Response>()
    fetchMock.mockReturnValueOnce(waiting.promise)
    const result = api.loadPrivateBooks().catch(error => error)
    await Promise.resolve()
    const signal = fetchMock.mock.calls[0][1]?.signal
    auth.session = null
    auth.callback?.('SIGNED_OUT', null)
    expect(signal?.aborted).toBe(true)
    expect(revoked).toHaveBeenCalledWith(cover)
    waiting.resolve(reply({ books: [book()] }))
    expect(await result).toMatchObject({ name: 'AbortError' })
    expect(api.getPrivateLibraryAccess().allowed).toBe(false)
  })

  it('invalidates a previous account response even when the new account is also granted access', async () => {
    await signIn()
    const waiting = deferred<Response>()
    fetchMock.mockReturnValueOnce(waiting.promise)
    const oldResult = api.loadPrivateBooks().catch(error => error)
    await Promise.resolve()
    auth.session = { access_token: 'second-token', user: { id: 'second-account' } }
    auth.callback?.('SIGNED_IN', auth.session)
    fetchMock.mockResolvedValue(reply({ allowed: true }))
    await api.recheckPrivateLibraryAccess()
    expect(api.getPrivateLibraryAccess().allowed).toBe(true)
    waiting.resolve(reply({ books: [book()] }))
    expect(await oldResult).toMatchObject({ name: 'AbortError' })
    fetchMock.mockResolvedValue(reply({ books: [] }))
    await expect(api.loadPrivateBooks()).resolves.toEqual([])
    expect(fetchMock.mock.lastCall?.[1]?.headers).toMatchObject({ Authorization: 'Bearer second-token' })
  })

  it('guards the body-read stage if logout happens after response headers arrive', async () => {
    await signIn()
    const body = deferred<ArrayBuffer>()
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers(), arrayBuffer: () => body.promise } as Response)
    const result = api.fetchPrivateAsset('work-one', 'asset-one').catch(error => error)
    await Promise.resolve(); await Promise.resolve()
    api.clearPrivateLibrarySession()
    body.resolve(new Uint8Array([1, 2, 3]).buffer)
    expect(await result).toMatchObject({ name: 'AbortError' })
  })

  it('revokes loaded content when the gateway denies a subsequent request', async () => {
    await signIn()
    const cover = api.createPrivateObjectUrl(new Blob(['cover']))
    fetchMock.mockResolvedValueOnce(reply({ error: 'denied' }, 403))
    await expect(api.loadPrivateBook('work-one')).rejects.toMatchObject({ status: 403 })
    expect(api.getPrivateLibraryAccess().allowed).toBe(false)
    expect(revoked).toHaveBeenCalledWith(cover)
    fetchMock.mockClear()
    await expect(api.fetchPrivateAsset('work-one', 'asset-one')).rejects.toMatchObject({ status: 403 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fails closed if the SDK session identity changes before the request', async () => {
    await signIn()
    auth.session = { access_token: 'unexpected-token', user: { id: 'different-account' } }
    await expect(api.loadPrivateBooks()).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(api.getPrivateLibraryAccess().allowed).toBe(false)
  })

  it('does not restore a stale startup session after a newer sign-out event', async () => {
    const startup = deferred<{ data: { session: TestSession | null }; error: null }>()
    auth.getSession.mockReturnValueOnce(startup.promise)
    api.initializePrivateLibrarySession()
    auth.callback?.('SIGNED_OUT', null)
    startup.resolve({ data: { session: { access_token: 'stale-token', user: { id: 'owner-account' } } }, error: null })
    await Promise.resolve(); await Promise.resolve()
    expect(api.getPrivateLibraryAccess()).toMatchObject({ allowed: false, loading: false })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('discards private resources before page suspension and rechecks on BFCache restoration', async () => {
    await signIn()
    const cover = api.createPrivateObjectUrl(new Blob(['cover']))
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))
    expect(api.getPrivateLibraryAccess().allowed).toBe(false)
    expect(revoked).toHaveBeenCalledWith(cover)
    fetchMock.mockResolvedValue(reply({ allowed: false }))
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    await api.recheckPrivateLibraryAccess()
    expect(fetchMock).toHaveBeenCalled()
    expect(fetchMock.mock.calls.every(([url]) => new URL(String(url)).searchParams.get('action') === 'capability')).toBe(true)
    expect(api.getPrivateLibraryAccess()).toMatchObject({ allowed: false, loading: false })
  })

  it('ignores a rejected old bootstrap after a newer account is authorized', async () => {
    const startup = deferred<{ data: { session: TestSession | null }; error: null }>()
    auth.getSession.mockReturnValueOnce(startup.promise)
    api.initializePrivateLibrarySession()
    auth.session = { access_token: 'current-token', user: { id: 'current-account' } }
    auth.callback?.('SIGNED_IN', auth.session)
    await api.recheckPrivateLibraryAccess()
    startup.reject(new Error('Old session lookup failed'))
    await flushMicrotasks()
    expect(api.getPrivateLibraryAccess()).toMatchObject({ allowed: true, loading: false })
  })

  it('keeps bookshelf filters only in memory and removes them when access is revoked', async () => {
    await signIn()
    const localSet = vi.spyOn(Storage.prototype, 'setItem')
    const filters = { query: 'sample phrase', category: 'Essays', sort: 'title' as const }
    api.rememberPrivateBookshelfState(filters)
    expect(api.getPrivateBookshelfState()).toEqual(filters)
    expect(localSet).not.toHaveBeenCalled()
    fetchMock.mockResolvedValue(reply({ allowed: false }))
    await api.recheckPrivateLibraryAccess()
    expect(api.getPrivateBookshelfState()).toBeNull()
    api.rememberPrivateBookshelfState(filters)
    expect(api.getPrivateBookshelfState()).toBeNull()
  })

  it('stores reading state only through the authenticated backend request', async () => {
    await signIn()
    const localSet = vi.spyOn(Storage.prototype, 'setItem')
    const state = { index: 2, offset: 30, progress: 0.4, bookmarks: [] }
    fetchMock.mockResolvedValue(reply({ state }))
    await expect(api.savePrivateReadingState('work-one', 'revision-one', state)).resolves.toEqual(state)
    const [url, options] = fetchMock.mock.calls[0]
    expect(new URL(String(url)).searchParams.get('editionVersion')).toBe('revision-one')
    expect(options).toMatchObject({ method: 'PUT', cache: 'no-store' })
    expect(JSON.parse(String(options?.body))).toEqual({ state: { ...state, updatedAt: expect.any(String) } })
    expect(localSet).not.toHaveBeenCalled()
  })

  it('serializes writes for an edition and snapshots queued state before later mutations', async () => {
    await signIn()
    const waiting = deferred<Response>()
    const firstState = { index: 1, offset: 20, progress: 0.2, bookmarks: [] }
    const nextState = { index: 2, offset: 40, progress: 0.4, bookmarks: [] }
    fetchMock.mockReturnValueOnce(waiting.promise).mockImplementation(async () => reply({ state: { ...nextState, index: 2 } }))
    const first = api.savePrivateReadingState('work-one', 'revision-one', firstState)
    const next = api.savePrivateReadingState('work-one', 'revision-one', nextState)
    nextState.index = 99
    await flushMicrotasks()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    waiting.resolve(reply({ state: firstState }))
    await first
    await next
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).state.index).toBe(2)
  })

  it('continues to save the latest queued state after a recoverable earlier write failure', async () => {
    await signIn()
    const waiting = deferred<Response>()
    const state = { index: 2, offset: 30, progress: 0.4, bookmarks: [] }
    fetchMock.mockReturnValueOnce(waiting.promise).mockImplementation(async () => reply({ state }))
    const first = api.savePrivateReadingState('work-one', 'revision-one', { ...state, index: 1 }).catch(error => error)
    const next = api.savePrivateReadingState('work-one', 'revision-one', state)
    await flushMicrotasks()
    waiting.resolve(reply({ error: 'Temporary failure' }, 500))
    expect(await first).toMatchObject({ status: 500 })
    await expect(next).resolves.toEqual(state)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('discards queued writes on an account switch even after the new account gains access', async () => {
    await signIn()
    const waiting = deferred<Response>()
    const state = { index: 2, offset: 30, progress: 0.4, bookmarks: [] }
    fetchMock.mockReturnValueOnce(waiting.promise)
    const first = api.savePrivateReadingState('work-one', 'revision-one', state).catch(error => error)
    const next = api.savePrivateReadingState('work-one', 'revision-one', { ...state, index: 3 }).catch(error => error)
    await flushMicrotasks()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    auth.session = { access_token: 'new-token', user: { id: 'new-account' } }
    auth.callback?.('SIGNED_IN', auth.session)
    fetchMock.mockResolvedValue(reply({ allowed: true }))
    await api.recheckPrivateLibraryAccess()
    fetchMock.mockClear()
    waiting.resolve(reply({ state }))
    expect(await first).toMatchObject({ name: 'AbortError' })
    expect(await next).toMatchObject({ name: 'AbortError' })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(api.getPrivateLibraryAccess().allowed).toBe(true)
  })
})

describe('private reading state on departure', () => {
  it('synchronously saves the latest snapshot before privacy cleanup without another session lookup or local persistence', async () => {
    await signIn()
    const cover = api.createPrivateObjectUrl(new Blob(['cover']))
    api.rememberPrivateBookshelfState({ query: 'sample phrase', category: 'Essays', sort: 'title' })
    const asset = deferred<Response>()
    const departure = deferred<Response>()
    fetchMock.mockImplementation((_url, options) => {
      if (options?.keepalive) {
        expect(api.getPrivateLibraryAccess().allowed).toBe(true)
        expect(revoked).not.toHaveBeenCalled()
        return departure.promise
      }
      return asset.promise
    })
    const assetResult = api.fetchPrivateAsset('work-one', 'asset-one').catch(error => error)
    await flushMicrotasks()
    const assetSignal = fetchMock.mock.calls[0][1]?.signal
    let latest = { index: 1, offset: 10, progress: .2 }
    const supplier = vi.fn(() => ({ bookId: 'work-one', editionVersion: 'revision-one', state: latest }))
    api.registerPrivateReadingSnapshot(supplier)
    latest = { index: 4, offset: 75, progress: .8 }
    auth.getSession.mockClear()
    const storageReads = vi.spyOn(Storage.prototype, 'getItem')
    const storageWrites = vi.spyOn(Storage.prototype, 'setItem')

    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [url, options] = fetchMock.mock.calls[1]
    expect(new URL(String(url)).searchParams.toString()).toBe('action=state&bookId=work-one&editionVersion=revision-one')
    expect(options).toMatchObject({
      method: 'PUT', keepalive: true, cache: 'no-store', credentials: 'omit', redirect: 'error',
      headers: { Authorization: 'Bearer session-for-owner-account', apikey: 'test-publishable-key', 'Content-Type': 'application/json' },
    })
    expect(JSON.parse(String(options?.body))).toEqual({ state: { ...latest, updatedAt: expect.any(String) } })
    expect(auth.getSession).not.toHaveBeenCalled()
    expect(storageReads).not.toHaveBeenCalled()
    expect(storageWrites).not.toHaveBeenCalled()
    expect(assetSignal?.aborted).toBe(true)
    expect(options?.signal?.aborted).toBe(false)
    expect(api.getPrivateLibraryAccess().allowed).toBe(false)
    expect(api.getPrivateBookshelfState()).toBeNull()
    expect(revoked).toHaveBeenCalledWith(cover)
    expect(supplier).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new PageTransitionEvent('pagehide'))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(supplier).toHaveBeenCalledTimes(1)
    asset.resolve(new Response(new Uint8Array([1, 2, 3])))
    expect(await assetResult).toMatchObject({ name: 'AbortError' })
    departure.resolve(reply({ state: latest }))
    await flushMicrotasks()
  })

  it('dispatches the departure snapshot immediately while ordinary writes are in flight or queued', async () => {
    await signIn()
    const ordinary = deferred<Response>()
    const departure = deferred<Response>()
    fetchMock.mockImplementation((_url, options) => options?.keepalive ? departure.promise : ordinary.promise)
    const firstState = { index: 1, offset: 10, progress: .2 }
    const latest = { index: 3, offset: 90, progress: .7 }
    const first = api.savePrivateReadingState('work-one', 'revision-one', firstState).catch(error => error)
    const queued = api.savePrivateReadingState('work-one', 'revision-one', { ...latest, index: 2 }).catch(error => error)
    await flushMicrotasks()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const ordinaryOptions = fetchMock.mock.calls[0][1]
    api.registerPrivateReadingSnapshot(() => ({ bookId: 'work-one', editionVersion: 'revision-one', state: latest }))

    window.dispatchEvent(new PageTransitionEvent('pagehide'))

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const departureOptions = fetchMock.mock.calls[1][1]
    expect(departureOptions?.keepalive).toBe(true)
    expect(ordinaryOptions?.signal?.aborted).toBe(true)
    expect(departureOptions?.signal?.aborted).toBe(false)
    const ordinaryTimestamp = Date.parse(JSON.parse(String(ordinaryOptions?.body)).state.updatedAt)
    const departureState = JSON.parse(String(departureOptions?.body)).state
    expect(departureState).toMatchObject(latest)
    expect(Date.parse(departureState.updatedAt)).toBeGreaterThan(ordinaryTimestamp + 1)
    ordinary.resolve(reply({ state: firstState }))
    expect(await first).toMatchObject({ name: 'AbortError' })
    expect(await queued).toMatchObject({ name: 'AbortError' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    departure.resolve(reply({ state: latest }))
    await flushMicrotasks()
  })

  it.each(['logout', 'account switch'] as const)('aborts a surviving departure write on %s and cannot replay the old snapshot', async change => {
    await signIn()
    const departure = deferred<Response>()
    fetchMock.mockReturnValue(departure.promise)
    const supplier = vi.fn(() => ({ bookId: 'work-one', editionVersion: 'revision-one', state: { index: 2, offset: 20, progress: .4 } }))
    api.registerPrivateReadingSnapshot(supplier)
    window.dispatchEvent(new PageTransitionEvent('pagehide'))
    const signal = fetchMock.mock.calls[0][1]?.signal
    expect(signal?.aborted).toBe(false)

    auth.session = change === 'logout' ? null : { access_token: 'new-account-token', user: { id: 'new-account' } }
    auth.callback?.(change === 'logout' ? 'SIGNED_OUT' : 'SIGNED_IN', auth.session)

    expect(signal?.aborted).toBe(true)
    window.dispatchEvent(new PageTransitionEvent('pagehide'))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(supplier).toHaveBeenCalledTimes(1)
    departure.resolve(reply({ state: null }))
    await flushMicrotasks()
  })

  it.each(['signed out', 'revoked'] as const)('does not consult the snapshot or send departure data when access is %s', async condition => {
    if (condition === 'revoked') {
      await signIn()
      fetchMock.mockResolvedValue(reply({ allowed: false }))
      await api.recheckPrivateLibraryAccess()
    } else {
      api.initializePrivateLibrarySession()
      await flushMicrotasks()
    }
    const supplier = vi.fn(() => ({ bookId: 'work-one', editionVersion: 'revision-one', state: { index: 1, offset: 0, progress: .2 } }))
    api.registerPrivateReadingSnapshot(supplier)
    fetchMock.mockClear()
    auth.getSession.mockClear()
    window.dispatchEvent(new PageTransitionEvent('pagehide'))
    expect(supplier).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(auth.getSession).not.toHaveBeenCalled()
  })

  it('unregisters only the matching reader supplier', async () => {
    await signIn()
    const previous = vi.fn(() => null)
    const unregisterPrevious = api.registerPrivateReadingSnapshot(previous)
    const current = vi.fn(() => ({ bookId: 'work-two', editionVersion: 'revision-two', state: { index: 3, offset: 0, progress: .5 } }))
    api.registerPrivateReadingSnapshot(current)
    unregisterPrevious()
    window.dispatchEvent(new PageTransitionEvent('pagehide'))
    expect(previous).not.toHaveBeenCalled()
    expect(current).toHaveBeenCalledTimes(1)
    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get('bookId')).toBe('work-two')
    await flushMicrotasks()
  })

  it.each(['unregistered', 'clean'] as const)('does not create a departure write for a %s reader', async condition => {
    await signIn()
    const unregister = api.registerPrivateReadingSnapshot(() => condition === 'clean' ? null : ({
      bookId: 'work-one', editionVersion: 'revision-one', state: { index: 1, offset: 0, progress: .2 },
    }))
    if (condition === 'unregistered') unregister()
    window.dispatchEvent(new PageTransitionEvent('pagehide'))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(api.getPrivateLibraryAccess().allowed).toBe(false)
  })

  it.each([0, 1])('enforces the departure body limit using UTF-8 bytes at 48 KiB plus %s', async excess => {
    vi.setSystemTime(new Date('2026-11-17T12:00:00.000Z'))
    await signIn()
    const timestamp = new Date().toISOString()
    const state = { index: 1, offset: 0, progress: .2, bookmarks: [{ id: 'mark-one', index: 1, offset: 0, label: '', createdAt: timestamp }] }
    const overhead = new TextEncoder().encode(JSON.stringify({ state: { ...state, updatedAt: timestamp } })).byteLength
    const labelBytes = 48 * 1024 + excess - overhead
    state.bookmarks[0].label = 'ੴ'.repeat(Math.floor(labelBytes / 3)) + 'x'.repeat(labelBytes % 3)
    api.registerPrivateReadingSnapshot(() => ({ bookId: 'work-one', editionVersion: 'revision-one', state }))

    window.dispatchEvent(new PageTransitionEvent('pagehide'))

    expect(api.getPrivateLibraryAccess().allowed).toBe(false)
    if (excess) expect(fetchMock).not.toHaveBeenCalled()
    else {
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(new TextEncoder().encode(String(fetchMock.mock.calls[0][1]?.body)).byteLength).toBe(48 * 1024)
    }
    await flushMicrotasks()
  })

  it('seeds the write clock from loaded state and advances every save and departure even if the device clock moves backwards', async () => {
    vi.setSystemTime(new Date('2026-11-17T12:00:00.000Z'))
    await signIn()
    const state = { index: 1, offset: 0, progress: .2, updatedAt: '2028-01-01T00:00:00.000Z' }
    fetchMock.mockResolvedValueOnce(reply({ state }))
    expect(await api.loadPrivateReadingState('work-one', 'revision-one')).toEqual(state)
    fetchMock.mockClear()
    fetchMock.mockImplementation(async (_url, options) => reply({ state: JSON.parse(String(options?.body)).state }))

    const first = await api.savePrivateReadingState('work-one', 'revision-one', state)
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
    const second = await api.savePrivateReadingState('work-one', 'revision-one', { ...state, index: 2 })
    api.registerPrivateReadingSnapshot(() => ({ bookId: 'work-one', editionVersion: 'revision-one', state: { ...state, index: 3 } }))
    window.dispatchEvent(new PageTransitionEvent('pagehide'))

    const last = JSON.parse(String(fetchMock.mock.calls[2][1]?.body)).state
    expect(first.updatedAt).toBe('2028-01-01T00:00:00.001Z')
    expect(second.updatedAt).toBe('2028-01-01T00:00:00.002Z')
    expect(last.updatedAt).toBe('2028-01-01T00:00:00.003Z')
    expect(state.updatedAt).toBe('2028-01-01T00:00:00.000Z')
    await flushMicrotasks()
  })
})

describe('private asset transport', () => {
  it('delivers only the requested validated byte range', async () => {
    await signIn()
    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array([3, 4, 5]), {
      status: 206, headers: { 'Content-Range': 'bytes 2-4/10', 'Content-Type': 'application/pdf' },
    }))
    expect(new Uint8Array(await api.fetchPrivateAssetRange('work-one', 'pdf-one', 2, 5))).toEqual(new Uint8Array([3, 4, 5]))
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ Range: 'bytes=2-4' })
  })

  it('rejects full-response and truncated-response substitutions for a byte range', async () => {
    await signIn()
    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200 }))
    await expect(api.fetchPrivateAssetRange('work-one', 'pdf-one', 0, 3)).rejects.toThrow(/requested pages/)
    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array([1, 2]), { status: 206, headers: { 'Content-Range': 'bytes 0-2/10' } }))
    await expect(api.fetchPrivateAssetRange('work-one', 'pdf-one', 0, 3)).rejects.toThrow(/requested pages/)
  })

  it('rejects a same-length response containing the wrong byte offsets', async () => {
    await signIn()
    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), {
      status: 206, headers: { 'Content-Range': 'bytes 0-2/10' },
    }))
    await expect(api.fetchPrivateAssetRange('work-one', 'pdf-one', 2, 5)).rejects.toThrow(/requested pages/)
  })

  it('validates ranges locally and rejects missing or invalid asset sizes', async () => {
    await signIn()
    await expect(api.fetchPrivateAssetRange('work-one', 'pdf-one', -1, 3)).rejects.toThrow(/Invalid page range/)
    expect(fetchMock).not.toHaveBeenCalled()
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }))
    await expect(api.getPrivateAssetInfo('work-one', 'pdf-one')).rejects.toThrow(/size could not be read/)
    expect(fetchMock.mock.calls[0][1]?.method).toBe('HEAD')
  })

  it('rejects asset bytes after the caller cancels the read', async () => {
    await signIn()
    const waiting = deferred<Response>()
    const controller = new AbortController()
    fetchMock.mockReturnValueOnce(waiting.promise)
    const result = api.fetchPrivateAsset('work-one', 'asset-one', { signal: controller.signal }).catch(error => error)
    await Promise.resolve()
    const requestSignal = fetchMock.mock.calls[0][1]?.signal
    controller.abort()
    expect(requestSignal?.aborted).toBe(true)
    waiting.resolve(new Response(new Uint8Array([1, 2, 3])))
    expect(await result).toMatchObject({ name: 'AbortError' })
  })
})
