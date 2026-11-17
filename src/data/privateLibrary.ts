import { getNaamrasSupabaseClient } from '../supabase/client'
import { getNaamrasSupabaseConfig, getNaamrasSupabaseFunctionUrl } from '../supabase/config'

export interface PrivateBookContentsEntry { id: string; title: string; assetId?: string; page?: number }
export interface PrivateBookSummary {
  id: string
  title: string
  subtitle?: string
  authors: string[]
  contributors?: string[]
  description: string
  category: string
  language: string
  coverAssetId?: string
  formats: string[]
  editionVersion: string
  renderer: 'chapters' | 'pages' | 'pdf'
  primaryAssetId?: string
  searchAssetId?: string
  pageCount?: number
  contents: PrivateBookContentsEntry[]
}
export type PrivateBook = PrivateBookSummary
export interface PrivateBookBookmark { id: string; index: number; offset: number; label: string; createdAt: string; blockId?: string; blockOffset?: number }
export interface PrivateReadingState {
  index: number
  offset: number
  progress: number
  completed?: boolean
  bookmarks?: PrivateBookBookmark[]
  updatedAt?: string
  blockId?: string
  blockOffset?: number
}
export interface PrivateLibraryAccess {
  allowed: boolean
  loading: boolean
  error: string | null
  epoch: number
}

// Private catalogue/content never participates in guest persistence or public offline packs.
let access: PrivateLibraryAccess = { allowed: false, loading: true, error: null, epoch: 0 }
let userId: string | null = null
let initialized = false
let accessRequest: Promise<void> | null = null
const listeners = new Set<() => void>()
const pending = new Set<AbortController>()
const objectUrls = new Set<string>()
const stateWrites = new Map<string, Promise<PrivateReadingState>>()
const stateClocks = new Map<string, number>()
type ReadingSnapshot = { bookId: string; editionVersion: string; state: PrivateReadingState }
let departureSnapshot: (() => ReadingSnapshot | null) | null = null
let departureWrite: AbortController | null = null
let requestSession: { userId: string; epoch: number; token: string } | null = null
type BookshelfState = { query: string; category: string; sort: 'collection' | 'title' | 'author' | 'recent' }
let bookshelfState: BookshelfState | null = null
export const getPrivateBookshelfState = () => bookshelfState
export function rememberPrivateBookshelfState(state: BookshelfState) { if (access.allowed) bookshelfState = { ...state } }

function publish(next: Partial<PrivateLibraryAccess>) {
  access = { ...access, ...next }
  listeners.forEach(listener => listener())
}
function discardPrivateContent(preserveDepartureWrite = false) {
  if (!preserveDepartureWrite) { departureWrite?.abort(); departureWrite = null }
  requestSession = null
  departureSnapshot = null
  for (const controller of pending) controller.abort()
  pending.clear()
  for (const url of objectUrls) URL.revokeObjectURL(url)
  objectUrls.clear()
  stateWrites.clear()
  stateClocks.clear()
  bookshelfState = null
  accessRequest = null
  publish({ allowed: false, loading: false, epoch: access.epoch + 1 })
}
export function clearPrivateLibrarySession() {
  userId = null
  discardPrivateContent()
  publish({ error: null })
}
function changeIdentity(next: string | null) {
  if (next === userId) return
  userId = next
  discardPrivateContent()
  publish({ error: null, loading: Boolean(next) })
}
export const subscribePrivateLibraryAccess = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export const getPrivateLibraryAccess = () => access

export class PrivateLibraryError extends Error {
  status: number
  constructor(message: string, status = 0) { super(message); this.name = 'PrivateLibraryError'; this.status = status }
}
function cancelled() { return new DOMException('Private reading was closed.', 'AbortError') }

type RequestOptions = { signal?: AbortSignal; method?: string; body?: unknown; range?: string; capability?: boolean }
async function request(action: string, params: Record<string, string> = {}, options: RequestOptions = {}) {
  const endpoint = getNaamrasSupabaseFunctionUrl('private-library')
  const client = getNaamrasSupabaseClient()
  const expectedUser = userId
  const epoch = access.epoch
  if (!endpoint || !client || !expectedUser || (!options.capability && !access.allowed)) {
    throw new PrivateLibraryError('Sign in to an account with access to this collection.', 403)
  }
  const { data, error } = await client.auth.getSession()
  if (epoch !== access.epoch || userId !== expectedUser) throw cancelled()
  if (error || !data.session || data.session.user.id !== expectedUser) {
    clearPrivateLibrarySession()
    throw new PrivateLibraryError('Please sign in again.', 401)
  }
  requestSession = { userId: expectedUser, epoch, token: data.session.access_token }
  const url = new URL(endpoint)
  url.searchParams.set('action', action)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  const controller = new AbortController()
  const abort = () => controller.abort()
  options.signal?.addEventListener('abort', abort, { once: true })
  if (options.signal?.aborted) controller.abort()
  pending.add(controller)
  const timeout = setTimeout(abort, 45_000)
  const headers: Record<string, string> = { Authorization: `Bearer ${data.session.access_token}` }
  const anonKey = getNaamrasSupabaseConfig().anonKey
  if (anonKey) headers.apikey = anonKey
  if (options.range) headers.Range = options.range
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET', headers, cache: 'no-store', redirect: 'error',
      credentials: 'omit', signal: controller.signal,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
    if (epoch !== access.epoch || userId !== expectedUser) throw cancelled()
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        discardPrivateContent()
        publish({ error: null })
      }
      throw new PrivateLibraryError(response.status === 429
        ? 'Please wait a moment before trying again.'
        : response.status === 401 || response.status === 403
          ? 'This collection is not available to this account.'
          : 'The book could not be loaded. Please try again.', response.status)
    }
    // Consume bodies inside the lifetime of the request controller, including logout cancellation.
    const bytes = options.method === 'HEAD' ? new ArrayBuffer(0) : await response.arrayBuffer()
    if (epoch !== access.epoch || userId !== expectedUser || controller.signal.aborted) throw cancelled()
    return { bytes, headers: response.headers, status: response.status }
  } finally {
    clearTimeout(timeout)
    pending.delete(controller)
    options.signal?.removeEventListener('abort', abort)
  }
}
async function json<T>(action: string, params: Record<string, string> = {}, options: RequestOptions = {}): Promise<T> {
  const result = await request(action, params, options)
  try { return JSON.parse(new TextDecoder().decode(result.bytes)) as T }
  catch { throw new PrivateLibraryError('The book response could not be read.') }
}

export async function recheckPrivateLibraryAccess() {
  if (!userId) { publish({ allowed: false, loading: false, error: null }); return }
  if (accessRequest) return accessRequest
  const epoch = access.epoch
  publish({ loading: !access.allowed, error: null })
  const run = (async () => {
    try {
      const result = await json<{ allowed: boolean }>('capability', {}, { capability: true })
      if (epoch !== access.epoch) return
      if (!result.allowed) discardPrivateContent()
      publish({ allowed: result.allowed === true, loading: false, error: null })
    } catch (error) {
      if (epoch !== access.epoch) return
      discardPrivateContent()
      publish({ error: error instanceof PrivateLibraryError && [401, 403].includes(error.status)
        ? null : 'Connect to the internet to open your private collection.', loading: false })
    } finally { if (epoch === access.epoch) accessRequest = null }
  })()
  accessRequest = run
  return run
}

export function initializePrivateLibrarySession() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  const client = getNaamrasSupabaseClient()
  if (!client) { publish({ loading: false }); return }
  // Do not await SDK auth operations inside its auth-change callback.
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') { clearPrivateLibrarySession(); return }
    changeIdentity(session?.user.id ?? null)
    requestSession = session ? { userId: session.user.id, epoch: access.epoch, token: session.access_token } : null
    setTimeout(() => { void recheckPrivateLibraryAccess() }, 0)
  })
  const bootstrapEpoch = access.epoch
  void client.auth.getSession().then(({ data, error }) => {
    if (bootstrapEpoch !== access.epoch) return
    if (error) { clearPrivateLibrarySession(); return }
    changeIdentity(data.session?.user.id ?? null)
    void recheckPrivateLibraryAccess()
  }).catch(() => { if (bootstrapEpoch === access.epoch) clearPrivateLibrarySession() })
  const refresh = () => { if (document.visibilityState === 'visible') void recheckPrivateLibraryAccess() }
  window.addEventListener('focus', refresh)
  document.addEventListener('visibilitychange', refresh)
  window.addEventListener('online', refresh)
  window.addEventListener('pagehide', () => {
    if (!userId) return
    try { flushDepartureState() } finally { discardPrivateContent(true) }
  })
  window.addEventListener('pageshow', event => {
    if (event.persisted && userId) { discardPrivateContent(); void recheckPrivateLibraryAccess() }
  })
  window.addEventListener('offline', () => {
    if (userId) { discardPrivateContent(); publish({ error: 'Connect to the internet to open your private collection.' }) }
  })
  // Re-evaluate revoked grants on visible idle readers as well as on every resource request.
  window.setInterval(refresh, 60_000)
}

function isBook(value: unknown): value is PrivateBook {
  if (!value || typeof value !== 'object') return false
  const b = value as PrivateBook
  const validId = (id: unknown) => typeof id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(id)
  return validId(b.id) && typeof b.title === 'string' && Boolean(b.title.trim()) && Array.isArray(b.authors)
    && b.authors.every(a => typeof a === 'string') && typeof b.category === 'string'
    && typeof b.description === 'string' && typeof b.editionVersion === 'string'
    && typeof b.language === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(b.editionVersion)
    && ['chapters', 'pages', 'pdf'].includes(b.renderer) && Array.isArray(b.contents)
    && b.contents.every(c => c && validId(c.id) && typeof c.title === 'string'
      && (c.assetId === undefined || validId(c.assetId))
      && (c.page === undefined || (Number.isSafeInteger(c.page) && c.page > 0)))
    && Array.isArray(b.formats) && b.formats.every(f => typeof f === 'string' && ['pdf', 'epub'].includes(f))
    && (b.coverAssetId === undefined || validId(b.coverAssetId))
    && (b.primaryAssetId === undefined || validId(b.primaryAssetId))
    && (b.searchAssetId === undefined || validId(b.searchAssetId))
    && (b.pageCount === undefined || (Number.isSafeInteger(b.pageCount) && b.pageCount > 0))
}
export async function loadPrivateBooks(signal?: AbortSignal): Promise<PrivateBookSummary[]> {
  const result = await json<{ books: unknown[] }>('catalog', {}, { signal })
  if (!Array.isArray(result.books) || !result.books.every(isBook)
    || new Set(result.books.map(book => book.id)).size !== result.books.length) throw new PrivateLibraryError('The collection could not be read.')
  return result.books
}
export async function loadPrivateBook(bookId: string, signal?: AbortSignal): Promise<PrivateBook> {
  const result = await json<{ book: unknown }>('book', { bookId }, { signal })
  if (!isBook(result.book) || result.book.id !== bookId) throw new PrivateLibraryError('The book could not be read.')
  return result.book
}
export async function fetchPrivateAsset(bookId: string, assetId: string, options: { signal?: AbortSignal; range?: string } = {}) {
  const result = await request('asset', { bookId, assetId }, options)
  return new Blob([result.bytes], { type: result.headers.get('content-type') ?? 'application/octet-stream' })
}
export async function getPrivateAssetInfo(bookId: string, assetId: string, signal?: AbortSignal) {
  const result = await request('asset', { bookId, assetId }, { method: 'HEAD', signal })
  const size = Number(result.headers.get('content-length'))
  if (!Number.isSafeInteger(size) || size <= 0) throw new PrivateLibraryError('The book size could not be read.')
  return { size, contentType: result.headers.get('content-type') ?? 'application/octet-stream' }
}
export async function fetchPrivateAssetRange(bookId: string, assetId: string, begin: number, end: number, signal?: AbortSignal) {
  if (!Number.isSafeInteger(begin) || !Number.isSafeInteger(end) || begin < 0 || end <= begin) throw new PrivateLibraryError('Invalid page range.')
  const result = await request('asset', { bookId, assetId }, { range: `bytes=${begin}-${end - 1}`, signal })
  const bounds = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(result.headers.get('content-range') ?? '')
  if (result.status !== 206 || result.bytes.byteLength !== end - begin || !bounds
    || Number(bounds[1]) !== begin || Number(bounds[2]) !== end - 1 || Number(bounds[3]) < end) throw new PrivateLibraryError('The requested pages could not be read.')
  return result.bytes
}
export function createPrivateObjectUrl(blob: Blob) {
  if (!access.allowed) throw new PrivateLibraryError('This collection is not available.', 403)
  const url = URL.createObjectURL(blob)
  objectUrls.add(url)
  return url
}
export function revokePrivateObjectUrl(url: string) { URL.revokeObjectURL(url); objectUrls.delete(url) }
export async function loadPrivateReadingState(bookId: string, editionVersion: string, signal?: AbortSignal) {
  const epoch = access.epoch
  const owner = userId
  const key = `${userId}:${bookId}:${editionVersion}`
  await stateWrites.get(key)?.catch(() => undefined)
  if (epoch !== access.epoch || owner !== userId || signal?.aborted) throw cancelled()
  const state = (await json<{ state: PrivateReadingState | null }>('state', { bookId, editionVersion }, { signal })).state
  const timestamp = Date.parse(state?.updatedAt ?? '')
  if (Number.isFinite(timestamp)) stateClocks.set(key, Math.max(stateClocks.get(key) ?? 0, timestamp))
  return state
}
function snapshotReadingState(key: string, state: PrivateReadingState) {
  const timestamp = Math.max(Date.now(), (stateClocks.get(key) ?? 0) + 1)
  stateClocks.set(key, timestamp)
  return { ...structuredClone(state), updatedAt: new Date(timestamp).toISOString() }
}

/** The supplier stays in RAM and is read before the global pagehide privacy cleanup. */
export function registerPrivateReadingSnapshot(supplier: () => ReadingSnapshot | null) {
  departureSnapshot = supplier
  return () => { if (departureSnapshot === supplier) departureSnapshot = null }
}

function flushDepartureState() {
  const session = requestSession
  const endpoint = getNaamrasSupabaseFunctionUrl('private-library')
  if (!access.allowed || !session || session.userId !== userId || session.epoch !== access.epoch || !endpoint) return
  const snapshot = departureSnapshot?.()
  if (!snapshot) return
  const key = `${userId}:${snapshot.bookId}:${snapshot.editionVersion}`
  const body = JSON.stringify({ state: snapshotReadingState(key, snapshot.state) })
  // Keep the whole write below both the gateway's 48 KiB limit and Fetch's 64 KiB keepalive budget.
  if (new TextEncoder().encode(body).byteLength > 48 * 1024) return
  const url = new URL(endpoint)
  url.searchParams.set('action', 'state')
  url.searchParams.set('bookId', snapshot.bookId)
  url.searchParams.set('editionVersion', snapshot.editionVersion)
  const headers: Record<string, string> = { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' }
  const anonKey = getNaamrasSupabaseConfig().anonKey
  if (anonKey) headers.apikey = anonKey
  const controller = new AbortController()
  departureWrite?.abort()
  departureWrite = controller
  // Dispatch synchronously: awaiting auth or the ordinary write queue can outlive page teardown.
  // The server rejects older timestamps, including ordinary writes already in flight.
  void fetch(url, { method: 'PUT', headers, body, keepalive: true, cache: 'no-store',
    credentials: 'omit', redirect: 'error', signal: controller.signal }).then(response => response.body?.cancel()).catch(() => {
    // Departure delivery is best effort; never retain private state locally for a later retry.
  }).finally(() => { if (departureWrite === controller) departureWrite = null })
}
export async function savePrivateReadingState(bookId: string, editionVersion: string, state: PrivateReadingState, signal?: AbortSignal) {
  const epoch = access.epoch
  const owner = userId
  if (!owner || !access.allowed) throw new PrivateLibraryError('This collection is not available.', 403)
  const key = `${owner}:${bookId}:${editionVersion}`
  const payload = snapshotReadingState(key, state)
  const previous = stateWrites.get(key)
  const write = (previous ? previous.catch(() => undefined) : Promise.resolve()).then(async () => {
    if (epoch !== access.epoch || owner !== userId || signal?.aborted) throw cancelled()
    return (await json<{ state: PrivateReadingState }>('state', { bookId, editionVersion }, { method: 'PUT', body: { state: payload }, signal })).state
  })
  stateWrites.set(key, write)
  try { return await write }
  finally { if (stateWrites.get(key) === write) stateWrites.delete(key) }
}
