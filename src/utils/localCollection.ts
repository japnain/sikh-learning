/**
 * Synchronous collections with atomic per-item writes and durable tombstones.
 * The legacy list is a compatibility mirror. Independent tabs never overwrite
 * one another's lists; simultaneous edits to the same item are last-write-wins.
 * Only explicit backup replacement switches generations. Prior records remain
 * available for rollback; ordinary edits use bounded storage per distinct id.
 */
const PREFIX = 'naamras-collection-v1:'
const RETRIES = 4
type Snapshot<T> = { version: 1; generation: string; items: T[] }
type RecordValue<T> = { version: 1; item: T | null }
export type CollectionMutation<T> = { items: T[]; persisted: boolean; error?: unknown }
type CollectionOptions<T> = {
  storageKey: string
  getId: (item: T) => string
  normalize: (value: unknown) => T | null
  readLegacy: (raw: string | null) => T[]
  serializeLegacy: (items: T[]) => string
  storage?: () => Storage | null
  preservePending?: boolean
}
type RegisteredCollection = {
  readEncoded: (storage: Storage) => string | null
  replaceLegacy: (storage: Storage) => boolean
  capturePending: () => () => void
}
type Write = { storage: Storage; key: string; before: string | null; after: string }
const collections = new Map<string, RegisteredCollection>()
const transactions = new Set<Write[]>()

export function captureLocalCollectionPending() {
  const restore = [...collections.values()].map(collection => collection.capturePending())
  return () => restore.forEach(callback => callback())
}

/** Cloud apply is synchronous. Undo only our writes, preserving later tab edits. */
export function beginLocalCollectionTransaction() {
  const writes: Write[] = []
  const restorePending = captureLocalCollectionPending()
  transactions.add(writes)
  return {
    commit: () => { transactions.delete(writes) },
    rollback: () => {
      transactions.delete(writes)
      let failed = false
      for (const { storage, key, before, after } of [...writes].reverse()) {
        try {
          if (storage.getItem(key) !== after) continue
          if (before === null) storage.removeItem(key)
          else storage.setItem(key, before)
          if (storage.getItem(key) !== before) failed = true
        } catch { failed = true }
      }
      restorePending()
      if (failed) throw new Error('collection-rollback-not-persisted')
    },
  }
}
function write(storage: Storage, key: string, after: string) {
  const before = storage.getItem(key)
  storage.setItem(key, after)
  // Record even a failed readback: a write may have persisted before reads fail.
  for (const transaction of transactions) transaction.push({ storage, key, before, after })
  return storage.getItem(key) === after
}
function browserStorage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage }
  catch { return null }
}
function namespace(storageKey: string) { return `${PREFIX}${encodeURIComponent(storageKey)}:` }
export function getLocalCollectionSnapshotKey(storageKey: string) { return `${namespace(storageKey)}snapshot` }
export function getLocalCollectionSnapshotKeys() {
  return [...collections.keys()].map(getLocalCollectionSnapshotKey)
}

/** Backup reads another tab's latest writes. Corrupt journal data is an error. */
export function readResolvedLocalCollection(storageKey: string, storage: Storage): string | null {
  return collections.get(storageKey)?.readEncoded(storage) ?? storage.getItem(storageKey)
}

/** Call after raw restore writes, with snapshot keys included in rollback. */
export function replaceLocalCollectionsFromLegacy(storage: Storage) {
  for (const collection of collections.values()) {
    if (!collection.replaceLegacy(storage)) throw new Error('collection-replace-not-persisted')
  }
}

export function createLocalCollection<T>(options: CollectionOptions<T>) {
  const snapshotKey = getLocalCollectionSnapshotKey(options.storageKey)
  const recordRoot = `${namespace(options.storageKey)}record:`
  const getStorage = options.storage ?? browserStorage
  const pending = new Map<string, T | null>()
  const withPending = (items: T[]) => {
    const merged = new Map(items.map(item => [options.getId(item), item]))
    for (const [id, item] of pending) {
      if (item === null) merged.delete(id)
      else merged.set(id, item)
    }
    return [...merged.values()]
  }
  const normalize = (items: unknown[]): T[] => {
    const result = new Map<string, T>()
    for (const value of items) {
      const item = options.normalize(value)
      if (item) result.set(options.getId(item), item)
    }
    return [...result.values()]
  }
  const legacy = (target: Storage, fallback: T[] = []) => {
    const raw = target.getItem(options.storageKey)
    return raw === null ? fallback : options.readLegacy(raw)
  }
  const snapshot = (target: Storage, fallback: T[] = []): Snapshot<T> => {
    const raw = target.getItem(snapshotKey)
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Partial<Snapshot<T>>
      if (parsed.version !== 1 || typeof parsed.generation !== 'string' || !/^[\w-]+$/.test(parsed.generation)
        || !Array.isArray(parsed.items)) throw new Error('invalid-collection-snapshot')
      const items = normalize(parsed.items)
      if (items.length !== parsed.items.length) throw new Error('invalid-collection-snapshot')
      return { version: 1, generation: parsed.generation, items }
    }
    // Concurrent migration always shares a generation; all first-use item writes
    // remain visible even if a second tab initialized from an older mirror.
    return { version: 1, generation: 'legacy', items: legacy(target, fallback) }
  }
  const same = (left: T | null | undefined, right: T | null | undefined) => (
    JSON.stringify(left == null ? null : options.normalize(left)) === JSON.stringify(right == null ? null : options.normalize(right))
  )
  const resolve = (target: Storage, start: Snapshot<T>): Map<string, T> => {
    const items = new Map(start.items.map(item => [options.getId(item), item]))
    const prefix = `${recordRoot}${start.generation}:`
    const keys: string[] = []
    for (let index = 0; index < target.length; index++) {
      const key = target.key(index)
      if (key?.startsWith(prefix)) keys.push(key)
    }
    for (const key of keys) {
      const raw = target.getItem(key)
      if (raw === null) continue
      const value = JSON.parse(raw) as RecordValue<T>
      const id = decodeURIComponent(key.slice(prefix.length))
      if (value.version !== 1) throw new Error('invalid-collection-record')
      if (value.item === null) items.delete(id)
      else {
        const item = options.normalize(value.item)
        if (!item || options.getId(item) !== id) throw new Error('invalid-collection-item')
        items.set(id, item)
      }
    }
    return items
  }
  const readFrom = (target: Storage, fallback: T[] = []): T[] => {
    for (let attempt = 0; attempt < RETRIES; attempt++) {
      const start = snapshot(target, fallback)
      const items = resolve(target, start)
      if (snapshot(target).generation === start.generation) return [...items.values()]
    }
    throw new Error('collection-changing')
  }
  const mirror = (target: Storage, items: T[]) => write(target, options.storageKey, options.serializeLegacy(items))
  const read = (fallback: T[] = [], target = getStorage()): T[] => {
    if (!target) return withPending(fallback)
    try { return withPending(readFrom(target, fallback)) } catch { return withPending(fallback) }
  }
  const mutate = (id: string, item: T | null, fallback: T[] = [], target = getStorage(), expected?: T | null): CollectionMutation<T> => {
    const optimistic = new Map(read(fallback, target).map(value => [options.getId(value), value]))
    if (item === null) optimistic.delete(id)
    else optimistic.set(id, item)
    const failed: CollectionMutation<T> = { items: [...optimistic.values()], persisted: false }
    const fail = () => {
      if (expected === undefined && options.preservePending !== false) pending.set(id, item)
      return failed
    }
    if (!target) return fail()
    try {
      for (let attempt = 0; attempt < RETRIES; attempt++) {
        let start = snapshot(target, fallback)
        if (target.getItem(snapshotKey) === null) {
          if (!write(target, snapshotKey, JSON.stringify(start)) && target.getItem(snapshotKey) === null) return fail()
          start = snapshot(target, fallback)
        }
        if (expected !== undefined) {
          const current = resolve(target, start)
          if (!same(current.get(id), expected)) return { items: [...current.values()], persisted: true }
        }
        const key = `${recordRoot}${start.generation}:${encodeURIComponent(id)}`
        const encoded = JSON.stringify({ version: 1, item })
        if (!write(target, key, encoded)) return fail()
        if (snapshot(target).generation !== start.generation) continue
        const items = readFrom(target, fallback)
        const mirrored = mirror(target, items)
        if (snapshot(target).generation !== start.generation) continue
        if (!mirrored || target.getItem(key) !== encoded) return fail()
        if (expected === undefined) pending.delete(id)
        return { items: withPending(items), persisted: true }
      }
    } catch (error) { failed.error = error }
    return fail()
  }
  const replace = (values: T[], target = getStorage(), baseline?: T[]): CollectionMutation<T> => {
    const items = normalize(values)
    if (!target) return { items, persisted: false }
    const transaction = beginLocalCollectionTransaction()
    try {
      if (baseline) {
        const before = new Map(baseline.map(item => [options.getId(item), item]))
        const after = new Map(items.map(item => [options.getId(item), item]))
        for (const id of new Set([...before.keys(), ...after.keys()])) {
          if (same(before.get(id), after.get(id))) continue
          const result = mutate(id, after.get(id) ?? null, baseline, target, before.get(id) ?? null)
          if (!result.persisted) throw result.error ?? new Error('collection-change-not-persisted')
        }
      } else {
        // An explicit restore is authoritative and may repair a corrupt journal.
        const generation = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
        if (!write(target, snapshotKey, JSON.stringify({ version: 1, generation, items }))) throw new Error('collection-replace-not-persisted')
      }
      const resolved = readFrom(target)
      if (!mirror(target, resolved)) throw new Error('collection-mirror-not-persisted')
      if (!baseline) pending.clear()
      transaction.commit()
      return { items: withPending(resolved), persisted: true }
    } catch (error) {
      try { transaction.rollback() } catch (rollbackError) {
        return { items: read(baseline ?? items, target), persisted: false, error: rollbackError }
      }
      return { items: read(baseline ?? items, target), persisted: false, error }
    }
  }
  const collection = {
    read,
    put: (item: T, fallback: T[] = []) => mutate(options.getId(item), item, fallback),
    remove: (id: string, fallback: T[] = []) => mutate(id, null, fallback),
    replace,
    clearPending: () => pending.clear(),
    subscribe: (listener: (items: T[]) => void) => {
      if (typeof window === 'undefined') return () => {}
      const onStorage = (event: StorageEvent) => {
        if (event.storageArea && event.storageArea !== getStorage()) return
        if (event.key === null || event.key === snapshotKey || event.key === options.storageKey || event.key.startsWith(recordRoot)) {
          const target = getStorage()
          if (!target) return
          try { listener(withPending(readFrom(target))) } catch { /* Keep useful session state if storage is temporarily unreadable. */ }
        }
      }
      window.addEventListener('storage', onStorage)
      return () => window.removeEventListener('storage', onStorage)
    },
  }
  collections.set(options.storageKey, {
    readEncoded: target => target.getItem(snapshotKey) === null
      ? target.getItem(options.storageKey) : options.serializeLegacy(readFrom(target)),
    replaceLegacy: target => replace(legacy(target), target).persisted,
    capturePending: () => {
      const snapshot = new Map(pending)
      return () => { pending.clear(); for (const [id, item] of snapshot) pending.set(id, item) }
    },
  })
  return collection
}
