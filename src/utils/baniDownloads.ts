import type { BaniFetchResult } from '../api/banidb'
import { fetchHostedBaniReading, HOSTED_BANI_REVISION } from '../api/hostedBani'
import type { SundarGutkaLength } from '../types'
import { isExactBaniReading, normalizeCachedBaniReading } from './baniReadingValidation'
import { SUNDAR_GUTKA_LENGTH_ORDER } from './sundarGutkaLength'
import { ensureOfflineReaderShell } from './offlineReaderShell'

export const BANI_DOWNLOADS_CHANGED_EVENT = 'naamras:bani-downloads-changed'
const CACHE_NAME = 'naamras-bani-downloads-v1'
const CACHE_ORIGIN = 'https://naamras.local'
const PACK_PREFIX = '/__naamras-downloads/packs/'
const PENDING_PREFIX = '/__naamras-downloads/pending/'
const MAX_PACK_BYTES = 64 * 1024 * 1024
const LOAD_TIMEOUT_MS = 30_000

export interface BaniDownloadInfo {
  key: string
  title: string
  provider: 'banidb' | 'shabados' | 'mixed'
  sourceRevision?: string
  downloadedAt: string
  availableLengths: SundarGutkaLength[]
  byteSize: number
}

export interface BaniDownloadSource {
  key: string
  title: string
  provider: BaniDownloadInfo['provider']
  sourceRevision?: string
  load: (length?: SundarGutkaLength | null, signal?: AbortSignal) => Promise<BaniFetchResult>
  validate: (reading: unknown, length?: SundarGutkaLength | null) => boolean
}

export interface BaniDownloadProgress {
  completed: number
  total: number
  stage: 'loading' | 'verifying' | 'saving'
  length: SundarGutkaLength | null
}

export interface BaniDownloadOptions {
  signal?: AbortSignal
  onProgress?: (progress: BaniDownloadProgress) => void
}

type ReadingKey = SundarGutkaLength | 'default'
interface DownloadPayload extends Omit<BaniDownloadInfo, 'byteSize'> {
  schemaVersion: 1
  defaultKey: ReadingKey
  readings: Partial<Record<ReadingKey, BaniFetchResult>>
}

const activeDownloads = new Map<string, { controller: AbortController; completion: Promise<BaniDownloadInfo> }>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isLength(value: unknown): value is SundarGutkaLength {
  return SUNDAR_GUTKA_LENGTH_ORDER.some(length => length === value)
}

function isKey(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9:._-]{0,127}$/i.test(value)
}

function packRequest(key: string) {
  return new Request(`${CACHE_ORIGIN}${PACK_PREFIX}${encodeURIComponent(key)}`)
}

function notifyDownloadsChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(BANI_DOWNLOADS_CHANGED_EVENT))
}

function isReading(value: unknown, key: ReadingKey, availableLengths: SundarGutkaLength[]): value is BaniFetchResult {
  if (!isRecord(value) || !Array.isArray(value.entries) || !value.entries.length
    || !value.entries.every(entry => isRecord(entry) && typeof entry.id === 'string'
      && typeof entry.gurmukhi === 'string' && entry.gurmukhi.trim().length > 0)
    || !Array.isArray(value.availableLengths)
    || value.availableLengths.join(',') !== availableLengths.join(',')) return false
  return value.resolvedLength === (key === 'default' ? null : key)
}

function isPayload(value: unknown, expectedKey: string): value is DownloadPayload {
  if (!isRecord(value) || value.schemaVersion !== 1 || value.key !== expectedKey || !isKey(value.key)
    || typeof value.title !== 'string' || !value.title.trim() || value.title.length > 240
    || !['banidb', 'shabados', 'mixed'].includes(String(value.provider))
    || (value.sourceRevision !== undefined && (typeof value.sourceRevision !== 'string' || value.sourceRevision.length > 240))
    || typeof value.downloadedAt !== 'string' || !Number.isFinite(Date.parse(value.downloadedAt))
    || !Array.isArray(value.availableLengths) || !value.availableLengths.every(isLength)
    || new Set(value.availableLengths).size !== value.availableLengths.length
    || !isRecord(value.readings)) return false
  const readings = value.readings
  const availableLengths = value.availableLengths
  const keys: ReadingKey[] = availableLengths.length ? availableLengths : ['default']
  return keys.includes(value.defaultKey as ReadingKey)
    && Object.keys(readings).length === keys.length
    && keys.every(key => Object.hasOwn(readings, key) && isReading(readings[key], key, availableLengths))
}

async function removeAbandonedStaging(cache: Cache) {
  // A browser closing mid-write can leave staging bytes behind. A generous age
  // limit avoids touching another tab's active (at most a few minutes) download.
  const cutoff = Date.now() - 30 * 60 * 1000
  for (const request of await cache.keys()) {
    const url = new URL(request.url)
    if (url.origin !== CACHE_ORIGIN || !url.pathname.startsWith(PENDING_PREFIX)) continue
    const createdAt = Number(url.pathname.slice(PENDING_PREFIX.length).split('-')[0])
    if (Number.isFinite(createdAt) && createdAt < cutoff) await cache.delete(request)
  }
}

async function checksum(text: string) {
  if (!globalThis.crypto?.subtle) throw new Error('Secure browser storage is required for offline downloads. Open Naamras over HTTPS.')
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

async function parsePack(response: Response | undefined, key: string): Promise<{ payload: DownloadPayload; byteSize: number; sha256: string } | null> {
  if (!response) return null
  try {
    const text = await response.text()
    const byteSize = new TextEncoder().encode(text).byteLength
    if (byteSize > MAX_PACK_BYTES) return null
    const envelope: unknown = JSON.parse(text)
    if (!isRecord(envelope) || !isPayload(envelope.payload, key)
      || typeof envelope.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(envelope.sha256)
      || await checksum(JSON.stringify(envelope.payload)) !== envelope.sha256) return null
    return { payload: envelope.payload, byteSize, sha256: envelope.sha256 }
  } catch {
    return null
  }
}

function infoFor(payload: DownloadPayload, byteSize: number): BaniDownloadInfo {
  return {
    key: payload.key, title: payload.title, provider: payload.provider,
    ...(payload.sourceRevision ? { sourceRevision: payload.sourceRevision } : {}),
    downloadedAt: payload.downloadedAt, availableLengths: [...payload.availableLengths], byteSize,
  }
}

/** Explicit downloads are a separate store: browsing/cache eviction never removes them. */
export async function readDownloadedBani(
  key: string,
  length?: SundarGutkaLength | null,
  validate?: BaniDownloadSource['validate'],
): Promise<BaniFetchResult | null> {
  if (!isKey(key) || typeof globalThis.caches === 'undefined') return null
  try {
    const cache = await globalThis.caches.open(CACHE_NAME)
    const pack = await parsePack(await cache.match(packRequest(key)), key)
    if (!pack) return null
    const reading = pack.payload.readings[length ?? pack.payload.defaultKey]
    return reading && (!validate || validate(reading, length)) ? reading : null
  } catch {
    return null
  }
}

export async function listBaniDownloads(): Promise<BaniDownloadInfo[]> {
  if (typeof globalThis.caches === 'undefined') return []
  // A storage failure is different from an empty device. Let the download UI
  // retain its last known list and offer a retry instead of claiming it is empty.
  const cache = await globalThis.caches.open(CACHE_NAME)
  const results: BaniDownloadInfo[] = []
  for (const request of await cache.keys()) {
    const url = new URL(request.url)
    if (url.origin !== CACHE_ORIGIN || !url.pathname.startsWith(PACK_PREFIX)) continue
    let key: string
    try { key = decodeURIComponent(url.pathname.slice(PACK_PREFIX.length)) }
    catch { continue }
    if (!isKey(key)) continue
    const pack = await parsePack(await cache.match(request), key)
    if (pack) results.push(infoFor(pack.payload, pack.byteSize))
  }
  return results.sort((left, right) => left.title.localeCompare(right.title))
}

async function loadWithDeadline(source: BaniDownloadSource, length: SundarGutkaLength | undefined, signal: AbortSignal) {
  signal.throwIfAborted()
  const controller = new AbortController()
  const cancel = () => controller.abort(signal.reason)
  signal.addEventListener('abort', cancel, { once: true })
  let rejectAbort: () => void = () => {}
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = () => reject(controller.signal.reason ?? new DOMException('Download cancelled.', 'AbortError'))
    controller.signal.addEventListener('abort', rejectAbort, { once: true })
  })
  const deadline = setTimeout(() => controller.abort(new Error('The download timed out. Please try again.')), LOAD_TIMEOUT_MS)
  try {
    const reading = await Promise.race([source.load(length, controller.signal), aborted])
    signal.throwIfAborted()
    if (!source.validate(reading, length)) throw new Error('This reading could not be verified. Your saved download is unchanged.')
    // Capture each version before another loader invocation can reuse a mutable object.
    return JSON.parse(JSON.stringify(reading)) as BaniFetchResult
  } finally {
    clearTimeout(deadline)
    signal.removeEventListener('abort', cancel)
    controller.signal.removeEventListener('abort', rejectAbort)
  }
}

async function prepareDownload(source: BaniDownloadSource, options: BaniDownloadOptions, signal: AbortSignal) {
  if (!isKey(source.key) || !source.title.trim() || source.title.length > 240) throw new Error('This reading cannot be downloaded.')
  if (typeof globalThis.caches === 'undefined') throw new Error('Offline downloads are unavailable in this browser. Try a browser with website storage enabled.')
  signal.throwIfAborted()
  options.onProgress?.({ completed: 0, total: 1, stage: 'loading', length: null })
  await ensureOfflineReaderShell(signal)
  signal.throwIfAborted()
  const first = await loadWithDeadline(source, undefined, signal)
  const availableLengths = [...first.availableLengths]
  const defaultKey: ReadingKey = first.resolvedLength ?? 'default'
  const required: ReadingKey[] = availableLengths.length ? availableLengths : ['default']
  const readings: DownloadPayload['readings'] = { [defaultKey]: first }
  let completed = 1
  options.onProgress?.({ completed, total: required.length, stage: 'loading', length: first.resolvedLength })
  for (const length of required) {
    if (length === defaultKey) continue
    signal.throwIfAborted()
    readings[length] = await loadWithDeadline(source, length === 'default' ? undefined : length, signal)
    completed += 1
    options.onProgress?.({ completed, total: required.length, stage: 'loading', length: length === 'default' ? null : length })
  }
  const payload: DownloadPayload = {
    schemaVersion: 1, key: source.key, title: source.title, provider: source.provider,
    ...(source.sourceRevision ? { sourceRevision: source.sourceRevision } : {}),
    downloadedAt: new Date().toISOString(), availableLengths, defaultKey, readings,
  }
  if (!isPayload(payload, source.key)) throw new Error('The available lengths changed during the download. Please try again.')
  signal.throwIfAborted()
  options.onProgress?.({ completed, total: required.length, stage: 'verifying', length: null })
  const sha256 = await checksum(JSON.stringify(payload))
  const text = JSON.stringify({ sha256, payload })
  if (new TextEncoder().encode(text).byteLength > MAX_PACK_BYTES) throw new Error('This reading is too large for one offline pack.')
  signal.throwIfAborted()
  const cache = await globalThis.caches.open(CACHE_NAME)
  await removeAbandonedStaging(cache)
  signal.throwIfAborted()
  const pending = new Request(`${CACHE_ORIGIN}${PENDING_PREFIX}${Date.now()}-${globalThis.crypto.randomUUID()}`)
  const target = packRequest(source.key)
  let previous: Response | undefined
  let committed = false
  try {
    await cache.put(pending, new Response(text, { headers: { 'content-type': 'application/json; charset=utf-8' } }))
    signal.throwIfAborted()
    const staged = await cache.match(pending)
    if (!await parsePack(staged?.clone(), source.key)) throw new Error('The offline copy could not be verified. Your saved download is unchanged.')
    signal.throwIfAborted()
    options.onProgress?.({ completed, total: required.length, stage: 'saving', length: null })
    previous = await cache.match(target)
    signal.throwIfAborted()
    // Cache.put atomically replaces one response containing all lengths together.
    await cache.put(target, staged!)
    committed = true
    signal.throwIfAborted()
    const saved = await parsePack(await cache.match(target), source.key)
    if (!saved || saved.sha256 !== sha256) throw new Error('The saved reading could not be verified. Please try the download again.')
    signal.throwIfAborted()
    notifyDownloadsChanged()
    return infoFor(saved.payload, saved.byteSize)
  } catch (error) {
    if (committed) {
      if (previous) await cache.put(target, previous)
      else await cache.delete(target)
    }
    throw error
  } finally {
    await cache.delete(pending).catch(() => {})
  }
}

async function withPackWriteLock<T>(key: string, signal: AbortSignal | undefined, operation: () => Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) {
    return Promise.reject(new Error('Offline downloads are unavailable in this browser. Try the latest Safari, Chrome or Firefox.'))
  }
  // Cache Storage is shared by tabs. The lock also protects rollback and remove
  // from overwriting a complete copy committed by another open Naamras tab.
  return navigator.locks.request(`naamras-bani-download:${key}`, { mode: 'exclusive', ...(signal ? { signal } : {}) }, operation)
}

/** Fetch every available length; only a complete verified pack becomes visible. */
export function downloadBani(source: BaniDownloadSource, options: BaniDownloadOptions = {}): Promise<BaniDownloadInfo> {
  if (activeDownloads.has(source.key)) return Promise.reject(new Error('This bani is already downloading.'))
  const controller = new AbortController()
  const cancel = () => controller.abort(options.signal?.reason)
  options.signal?.addEventListener('abort', cancel, { once: true })
  if (options.signal?.aborted) cancel()
  const completion = withPackWriteLock(source.key, controller.signal, () => prepareDownload(source, options, controller.signal)).finally(() => {
    options.signal?.removeEventListener('abort', cancel)
    if (activeDownloads.get(source.key)?.controller === controller) activeDownloads.delete(source.key)
  })
  activeDownloads.set(source.key, { controller, completion })
  return completion
}

export async function removeBaniDownload(key: string): Promise<boolean> {
  if (!isKey(key) || typeof globalThis.caches === 'undefined') return false
  const active = activeDownloads.get(key)
  if (active) {
    active.controller.abort(new DOMException('Download removed.', 'AbortError'))
    await active.completion.catch(() => {})
  }
  const removed = await withPackWriteLock(key, undefined, async () => (await globalThis.caches.open(CACHE_NAME)).delete(packRequest(key)))
  notifyDownloadsChanged()
  return removed
}

/** Download our backend's exact snapshot; content provenance remains BaniDB. */
export function createBaniDbDownloadSource(baniDbId: number, title: string): BaniDownloadSource {
  if (!Number.isSafeInteger(baniDbId) || baniDbId <= 0) throw new Error('Invalid bani identifier.')
  return {
    key: `banidb:${baniDbId}`, title, provider: 'banidb',
    sourceRevision: HOSTED_BANI_REVISION,
    load: (length, signal) => fetchHostedBaniReading(baniDbId, length, signal),
    validate: (reading, length) => isExactBaniReading(reading, baniDbId, length)
      && normalizeCachedBaniReading(reading, baniDbId, length) !== null,
  }
}
