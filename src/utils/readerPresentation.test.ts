import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  getSavedReaderPresentation, isReaderPresentationPreferenceSaved,
  resetReaderPresentationSessionPreference, setReaderPresentationPreference,
  subscribeReaderPresentation,
} from './readerPresentation'

beforeEach(() => {
  resetReaderPresentationSessionPreference()
  localStorage.removeItem('naamras-reader-presentation')
})
afterEach(() => { vi.restoreAllMocks(); resetReaderPresentationSessionPreference() })

test('a blocked write remains active for future readers and a retry saves it', () => {
  setReaderPresentationPreference('read')
  const listener = vi.fn()
  const unsubscribe = subscribeReaderPresentation(listener)
  const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError') })
  expect(setReaderPresentationPreference('study')).toBe(false)
  expect(getSavedReaderPresentation()).toBe('study')
  expect(isReaderPresentationPreferenceSaved()).toBe(false)
  expect(listener).toHaveBeenCalledOnce()
  write.mockRestore()
  expect(setReaderPresentationPreference('study')).toBe(true)
  expect(localStorage.getItem('naamras-reader-presentation')).toBe('study')
  expect(isReaderPresentationPreferenceSaved()).toBe(true)
  unsubscribe()
})

test('a silent storage failure also retains the choice only for the session', () => {
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => {})
  expect(setReaderPresentationPreference('read')).toBe(false)
  expect(getSavedReaderPresentation()).toBe('read')
  expect(isReaderPresentationPreferenceSaved()).toBe(false)
})

test('a subsequent external preference replaces a temporary choice', () => {
  const unsubscribe = subscribeReaderPresentation(() => {})
  const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  setReaderPresentationPreference('study')
  write.mockRestore()
  localStorage.setItem('naamras-reader-presentation', 'read')
  window.dispatchEvent(new StorageEvent('storage', { key: 'naamras-reader-presentation', newValue: 'read' }))
  expect(getSavedReaderPresentation()).toBe('read')
  expect(isReaderPresentationPreferenceSaved()).toBe(true)
  unsubscribe()
})
