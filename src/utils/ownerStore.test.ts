import { afterEach, expect, test, vi } from 'vitest'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { hasPersonalStorageRecovery, getActivePersonalStorage, getPersonalStorageForOwner, resetPersonalStorageOwnerForTests, selectPersonalStorageOwner } from './ownerStorage'
import { registerPersonalStore } from './ownerStore'

afterEach(() => { vi.restoreAllMocks(); resetPersonalStorageOwnerForTests(); localStorage.clear() })

test('an unreadable incoming partition clears outgoing memory without migrating or overwriting its bytes', () => {
  const key = 'sikh-theme'
  const migrate = vi.fn(() => ({ value: 'migrated' }))
  const store = create<{ value: string }>()(persist(() => ({ value: 'default' }), {
    name: key, version: 1, storage: createJSONStorage(getActivePersonalStorage), migrate,
  }))
  registerPersonalStore(store)
  selectPersonalStorageOwner('test-a')
  store.setState({ value: 'private-a' })
  const incoming = getPersonalStorageForOwner('test-b')
  const raw = JSON.stringify({ version: 0, state: { value: 'unsupported-incoming-value' } })
  incoming.setItem(key, raw)
  expect(() => selectPersonalStorageOwner('test-b', { hydrate: false })).toThrow()
  expect(store.getState().value).toBe('default')
  expect(migrate).not.toHaveBeenCalled()
  expect(incoming.getItem(key)).toBe(raw)
  expect(hasPersonalStorageRecovery()).toBe(true)
})

test('retained pending owner state survives a same-owner tab conflict and blocks sync', () => {
  const key = 'sikh-reading-progress'
  const store = create<{ value: string }>()(persist(() => ({ value: 'default' }), {
    name: key, storage: createJSONStorage(getActivePersonalStorage),
  }))
  registerPersonalStore(store)
  selectPersonalStorageOwner('test-a')
  store.setState({ value: 'saved' })
  const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError') })
  expect(() => store.setState({ value: 'unsaved' })).toThrow()
  spy.mockRestore()
  selectPersonalStorageOwner('test-b')
  selectPersonalStorageOwner('test-a')
  expect(store.getState().value).toBe('unsaved')
  const target = getPersonalStorageForOwner('test-a')
  target.setItem(key, JSON.stringify({ version: 0, state: { value: 'other-tab' } }))
  const rawKey = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).find(k => k?.endsWith(key))!
  window.dispatchEvent(new StorageEvent('storage', { key: rawKey }))
  expect(store.getState().value).toBe('unsaved')
  expect(target.getItem(key)).toContain('other-tab')
  expect(hasPersonalStorageRecovery()).toBe(true)
})

test('an unreadable outgoing baseline retains session edits and fails closed on return', () => {
  const key='sikh-reading-progress'
  const store=create<{value:string}>()(persist(()=>({value:'default'}),{name:key,storage:createJSONStorage(getActivePersonalStorage)}))
  registerPersonalStore(store)
  selectPersonalStorageOwner('test-a')
  store.setState({value:'saved'})
  const failedWrite=vi.spyOn(localStorage,'setItem').mockImplementation(()=>{throw new DOMException('Full','QuotaExceededError')})
  expect(()=>store.setState({value:'unsaved'})).toThrow()
  failedWrite.mockRestore()
  const originalRead=localStorage.getItem.bind(localStorage)
  const failedRead=vi.spyOn(localStorage,'getItem').mockImplementation(key=>{
    if(key==='naamras-owner-v1:test-a:sikh-reading-progress') throw new Error('temporarily unreadable')
    return originalRead(key)
  })
  selectPersonalStorageOwner('test-b')
  failedRead.mockRestore()
  expect(()=>selectPersonalStorageOwner('test-a')).toThrow()
  expect(store.getState().value).toBe('unsaved')
  expect(hasPersonalStorageRecovery()).toBe(true)
  expect(getPersonalStorageForOwner('test-a').getItem(key)).toContain('saved')
})
