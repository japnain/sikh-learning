import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  beginLocalCollectionTransaction, createLocalCollection,
  getLocalCollectionSnapshotKey, readResolvedLocalCollection,
} from './localCollection'

type Item = { id: string; title: string; savedAt: string }
const a: Item = { id: 'a', title: 'First save', savedAt: '2026-10-01T00:00:00.000Z' }
const b: Item = { ...a, id: 'b', title: 'Second save' }
const c: Item = { ...a, id: 'c', title: 'Third save' }
const d: Item = { ...a, id: 'd', title: 'Fourth save' }
let data: Map<string, string>
function tabStorage() {
  const hooks: { beforeSet?: (key: string, value: string) => void } = {}
  const storage: Storage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { hooks.beforeSet?.(key, value); data.set(key, value) },
    removeItem: key => { data.delete(key) }, clear: () => data.clear(),
    key: index => [...data.keys()][index] ?? null,
    get length() { return data.size },
  }
  return { storage, hooks }
}
function collection(storage: Storage) {
  return createLocalCollection<Item>({
    storageKey: 'test-saves', getId: item => item.id,
    normalize: value => {
      if (!value || typeof value !== 'object') return null
      const item = value as Partial<Item>
      return typeof item.id === 'string' && typeof item.title === 'string' && typeof item.savedAt === 'string'
        ? { id: item.id, title: item.title, savedAt: item.savedAt } : null
    },
    readLegacy: raw => JSON.parse(raw ?? '[]') as Item[],
    serializeLegacy: items => JSON.stringify(items), storage: () => storage,
  })
}
const ids = (items: Item[]) => items.map(item => item.id).sort()
beforeEach(() => { data = new Map() })

describe('durable independent tab collections', () => {
  it('preserves overlapping first-use additions even when migration starts from an older mirror', () => {
    const first = tabStorage(), second = tabStorage()
    const left = collection(first.storage), right = collection(second.storage)
    const staleRight = right.read()
    first.hooks.beforeSet = key => {
      if (key !== getLocalCollectionSnapshotKey('test-saves')) return
      first.hooks.beforeSet = undefined
      expect(right.put(b, staleRight).persisted).toBe(true)
    }
    expect(left.put(a).persisted).toBe(true)
    expect(ids(collection(tabStorage().storage).read())).toEqual(['a', 'b'])
  })

  it('preserves add/add interleavings after both tabs have read the same stale list', () => {
    const first = tabStorage(), second = tabStorage()
    const left = collection(first.storage), right = collection(second.storage)
    left.put(a)
    const stale = right.read()
    first.hooks.beforeSet = key => {
      if (!key.includes(':record:') || !key.endsWith(':b')) return
      first.hooks.beforeSet = undefined
      right.put(c, stale)
    }
    expect(left.put(b).persisted).toBe(true)
    expect(ids(right.read())).toEqual(['a', 'b', 'c'])
  })

  it('keeps a deletion tombstone while a stale tab adds a different item', () => {
    const first = tabStorage(), second = tabStorage()
    const left = collection(first.storage), right = collection(second.storage)
    left.put(a)
    const stale = right.read()
    first.hooks.beforeSet = key => {
      if (!key.includes(':record:')) return
      first.hooks.beforeSet = undefined
      right.put(b, stale)
    }
    expect(left.remove(a.id).persisted).toBe(true)
    // Even an old compatibility list cannot resurrect a deleted record.
    second.storage.setItem('test-saves', JSON.stringify([a, b]))
    expect(collection(tabStorage().storage).read()).toEqual([b])
  })

  it('restores the original record and date without replacing a concurrent unrelated save', () => {
    const left = collection(tabStorage().storage), right = collection(tabStorage().storage)
    left.put(a)
    const removed = left.read()[0]
    left.remove(a.id)
    right.put(b)
    expect(left.put(removed).persisted).toBe(true)
    expect(left.read()).toEqual(expect.arrayContaining([a, b]))
  })

  it('applies a cloud delta against its baseline while preserving later adds and deletions', () => {
    const left = collection(tabStorage().storage), right = collection(tabStorage().storage)
    left.put(a)
    const baseline = left.read()
    right.put(b)
    right.remove(a.id)
    expect(left.replace([{ ...a, title: 'Remote update' }, c], undefined, baseline).persisted).toBe(true)
    expect(ids(left.read())).toEqual(['b', 'c'])
    // A remote deletion of a record unchanged since the baseline still applies.
    const nextBaseline = left.read()
    right.put(d)
    left.replace([c], undefined, nextBaseline)
    expect(ids(right.read())).toEqual(['c', 'd'])
  })

  it('preserves independent simultaneous cloud replacements', () => {
    const first = tabStorage(), second = tabStorage()
    const left = collection(first.storage), right = collection(second.storage)
    left.put(a)
    const baseline = left.read()
    first.hooks.beforeSet = key => {
      if (!key.includes(':record:') || !key.endsWith(':b')) return
      first.hooks.beforeSet = undefined
      expect(right.replace([a, c], undefined, baseline).persisted).toBe(true)
    }
    expect(left.replace([a, b], undefined, baseline).persisted).toBe(true)
    expect(ids(collection(tabStorage().storage).read())).toEqual(['a', 'b', 'c'])
  })

  it('bounds ordinary edits and cloud changes to one durable slot per item', () => {
    const saved = collection(tabStorage().storage)
    saved.put(a)
    for (let index = 0; index < 100; index++) {
      const baseline = saved.read()
      expect(saved.replace([{ ...a, title: String(index) }], undefined, baseline).persisted).toBe(true)
    }
    expect(data.size).toBe(3)
    expect(saved.read()[0].title).toBe('99')
  })

  it('retries an in-flight mutation against an explicitly restored generation', () => {
    const first = tabStorage(), second = tabStorage()
    const left = collection(first.storage), right = collection(second.storage)
    left.put(a)
    first.hooks.beforeSet = key => {
      if (!key.includes(':record:') || !key.endsWith(':b')) return
      first.hooks.beforeSet = undefined
      right.replace([c])
    }
    expect(left.put(b).persisted).toBe(true)
    expect(ids(right.read())).toEqual(['b', 'c'])
  })

  it('restores a generation pointer on rollback without reviving records from the failed restore', () => {
    const target = tabStorage().storage, saved = collection(target)
    saved.put(a)
    const snapshot = target.getItem(getLocalCollectionSnapshotKey('test-saves'))!
    expect(saved.replace([b]).persisted).toBe(true)
    saved.put(c)
    target.setItem(getLocalCollectionSnapshotKey('test-saves'), snapshot)
    expect(saved.read()).toEqual([a])
  })

  it('rolls back only this cloud apply’s writes and preserves a later edit from another tab', () => {
    const first = tabStorage(), second = tabStorage()
    const left = collection(first.storage), right = collection(second.storage)
    left.put(a)
    const transaction = beginLocalCollectionTransaction()
    left.replace([{ ...a, title: 'Remote update' }, b], undefined, [a])
    transaction.commit()
    // A separate transaction lets us model a later same-key browser write.
    const own = beginLocalCollectionTransaction()
    left.put({ ...a, title: 'Another remote update' })
    own.commit()
    right.put({ ...a, title: 'Later tab edit' })
    own.rollback()
    expect(left.read().find(item => item.id === 'a')?.title).toBe('Later tab edit')
    expect(ids(left.read())).toEqual(['a', 'b'])
  })

  it('rolls a partially persisted cloud batch back on quota failure', () => {
    const first = tabStorage(), saved = collection(first.storage)
    saved.put(a)
    first.hooks.beforeSet = key => {
      if (key.includes(':record:') && key.endsWith(':c')) throw new DOMException('Full', 'QuotaExceededError')
    }
    expect(saved.replace([b, c], undefined, [a]).persisted).toBe(false)
    expect(saved.read()).toEqual([a])
  })

  it('detects silently dropped writes and readback failures', () => {
    const first = tabStorage()
    first.storage.setItem = () => {}
    expect(collection(first.storage).put(a).persisted).toBe(false)
    const second = tabStorage()
    let writes = 0
    const set = second.storage.setItem
    second.storage.setItem = (key, value) => { set(key, value); writes++ }
    const get = second.storage.getItem
    second.storage.getItem = key => { if (writes > 0) throw new Error('Read blocked'); return get(key) }
    expect(collection(second.storage).put(a).persisted).toBe(false)
  })


  it('retains failed saves through later mutations and refreshes without exporting them as durable', () => {
    const first = tabStorage(), saved = collection(first.storage)
    saved.put(a)
    first.hooks.beforeSet = key => { if (key.includes(':record:')) throw new Error('Full') }
    expect(saved.put(b).persisted).toBe(false)
    expect(saved.put(c).persisted).toBe(false)
    expect(ids(saved.read())).toEqual(['a', 'b', 'c'])
    expect(JSON.parse(readResolvedLocalCollection('test-saves', first.storage)!)).toEqual([a])
    first.hooks.beforeSet = undefined
    expect(saved.put(b).persisted).toBe(true)
    expect(ids(saved.read())).toEqual(['a', 'b', 'c'])
    expect(ids(collection(tabStorage().storage).read())).toEqual(['a', 'b'])
    expect(saved.replace([d]).persisted).toBe(true)
    expect(saved.read()).toEqual([d])
  })

  it('ignores unreadable storage events but refreshes successfully cleared storage', () => {
    const target = tabStorage().storage, saved = collection(target)
    saved.put(a)
    const listener = vi.fn()
    const unsubscribe = saved.subscribe(listener)
    const get = target.getItem
    target.getItem = () => { throw new Error('Blocked') }
    window.dispatchEvent(new StorageEvent('storage', { key: 'test-saves' }))
    expect(listener).not.toHaveBeenCalled()
    target.getItem = get
    target.clear()
    window.dispatchEvent(new StorageEvent('storage', { key: null }))
    expect(listener).toHaveBeenLastCalledWith([])
    unsubscribe()
  })

  it('restores pending session changes when an authoritative restore is rolled back', () => {
    const first = tabStorage(), saved = collection(first.storage)
    saved.put(a)
    first.hooks.beforeSet = () => { throw new Error('Full') }
    saved.put(b)
    first.hooks.beforeSet = undefined
    const transaction = beginLocalCollectionTransaction()
    saved.replace([c])
    expect(saved.read()).toEqual([c])
    transaction.rollback()
    expect(ids(saved.read())).toEqual(['a', 'b'])
    expect(JSON.parse(readResolvedLocalCollection('test-saves', first.storage)!)).toEqual([a])
  })

  it('does not silently export corrupt journal entries and allows explicit repair', () => {
    const target = tabStorage().storage, saved = collection(target)
    saved.put(a)
    target.setItem(getLocalCollectionSnapshotKey('test-saves'), '{corrupt')
    expect(() => readResolvedLocalCollection('test-saves', target)).toThrow()
    expect(saved.replace([b]).persisted).toBe(true)
    expect(saved.read()).toEqual([b])
  })
})
