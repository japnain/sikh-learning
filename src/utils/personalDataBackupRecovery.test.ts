import { afterEach, expect, test, vi } from 'vitest'
import { createPersonalDataBackup, restorePersonalDataBackup } from './personalDataBackup'
import { hasPersonalStorageRecovery, markPersonalStorageRecovery, resetPersonalStorageOwnerForTests, selectPersonalStorageOwner } from './ownerStorage'
import { resetCloudSyncRuntimeForTests } from '../supabase/runtime'
import { useLanguageStore } from '../store/language'

afterEach(() => { vi.restoreAllMocks(); resetCloudSyncRuntimeForTests(); resetPersonalStorageOwnerForTests(); localStorage.clear() })
test('a safely rolled-back failed restore preserves an existing recovery requirement', async () => {
  selectPersonalStorageOwner('recovery-account')
  const backup = createPersonalDataBackup()
  markPersonalStorageRecovery()
  const original = localStorage.setItem.bind(localStorage)
  let failed = false
  vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
    if (!failed && key.endsWith('sikh-bookmarks')) { failed = true; throw new Error('transient-write-failure') }
    return original(key, value)
  })
  await expect(restorePersonalDataBackup(backup, 'replace', { rehydrate: async () => {} })).rejects.toThrow('restore-failed')
  expect(hasPersonalStorageRecovery()).toBe(true)
})

test('a successful explicit replace restores mounted state before clearing recovery', async () => {
  selectPersonalStorageOwner('recovery-account')
  const backup = createPersonalDataBackup()
  const languageSnapshot = backup.data['sikh-language'] as { state: Record<string, unknown> }
  languageSnapshot.state.fontSize = 30
  markPersonalStorageRecovery()
  await restorePersonalDataBackup(backup, 'replace')
  expect(useLanguageStore.getState().fontSize).toBe(30)
  expect(hasPersonalStorageRecovery()).toBe(false)
})
