import { afterEach, expect, test } from 'vitest'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getActivePersonalStorage, getPersonalStorageForOwner, onPersonalOwnerChange, resetPersonalStorageOwnerForTests, selectPersonalStorageOwner } from './ownerStorage'
import { registerPersonalStore } from './ownerStore'

afterEach(() => { resetPersonalStorageOwnerForTests(); localStorage.clear() })

test('an observer registered before a lazy store receives only fully hydrated incoming state', () => {
 let current = () => 'not-loaded'
 const seen: string[] = []
 const stop = onPersonalOwnerChange(() => seen.push(current()))
 const store = create<{ value: string }>()(persist(() => ({ value: 'default' }), {
   name: 'sikh-reading-progress', storage: createJSONStorage(getActivePersonalStorage),
 }))
 registerPersonalStore(store)
 current = () => store.getState().value
 getPersonalStorageForOwner('test-a').setItem('sikh-reading-progress',JSON.stringify({version:0,state:{value:'A'}}))
 getPersonalStorageForOwner('test-b').setItem('sikh-reading-progress',JSON.stringify({version:0,state:{value:'B'}}))
 selectPersonalStorageOwner('test-a')
 selectPersonalStorageOwner('test-b')
 expect(seen).toEqual(['A','B'])
 stop()
})

test('ordinary fixed adapters cannot overwrite or remove a partition awaiting recovery', async () => {
  const { getPersonalStorage, getPersonalStorageForRestore, markPersonalStorageRecovery, withPersonalStorageRestoreWrites } = await import('./ownerStorage')
  selectPersonalStorageOwner('protected-owner')
  const ordinary=getPersonalStorage()
  ordinary.setItem('sikh-bookmarks','retained-invalid-envelope')
  markPersonalStorageRecovery()
  expect(()=>ordinary.setItem('sikh-bookmarks','[]')).toThrow()
  expect(()=>ordinary.removeItem('sikh-bookmarks')).toThrow()
  expect(ordinary.getItem('sikh-bookmarks')).toBe('retained-invalid-envelope')
  // The explicit recovery writer is fixed to its captured owner.
  getPersonalStorageForRestore().setItem('sikh-bookmarks','[]')
  withPersonalStorageRestoreWrites(()=>ordinary.setItem('sikh-bookmarks','["validated-synchronous-hydration"]'))
  expect(()=>ordinary.setItem('sikh-bookmarks','[]')).toThrow()
})
