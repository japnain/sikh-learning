import { act, renderHook } from '@testing-library/react'
import { useLanguageStore } from '../store/language'
import { getSavedReaderPresentation, setReaderPresentationPreference } from '../utils/readerPresentation'
import { useReaderPresentation } from './useReaderPresentation'

beforeEach(() => {
  localStorage.removeItem('naamras-reader-presentation')
  useLanguageStore.setState({ meaningLanguage: 'none', showTransliteration: false })
})

afterEach(() => {
  vi.restoreAllMocks()
})

test('completed onboarding applies support choices over an older Read preference', () => {
  localStorage.setItem('naamras-reader-presentation', 'read')
  const { result } = renderHook(() => useReaderPresentation('japji', true))
  expect(result.current.presentation).toBe('read')

  act(() => {
    useLanguageStore.getState().setMeaningLanguage('pa')
    setReaderPresentationPreference('study')
  })

  expect(result.current.presentation).toBe('study')
  expect(getSavedReaderPresentation()).toBe('study')
})

test('text-only setup takes an existing reader back to Read', () => {
  localStorage.setItem('naamras-reader-presentation', 'study')
  const { result } = renderHook(() => useReaderPresentation('japji', true))
  act(() => setReaderPresentationPreference('read'))
  expect(result.current.presentation).toBe('read')
})

test('the selected presentation still reaches the active reader when storage is unavailable', () => {
  const { result } = renderHook(() => useReaderPresentation('japji', true))
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage unavailable') })
  act(() => setReaderPresentationPreference('study'))
  expect(result.current.presentation).toBe('study')
})

test('a reader choice is used the next time a reader opens', () => {
  const first = renderHook(() => useReaderPresentation('japji', false))
  act(() => first.result.current.changePresentation('study'))
  first.unmount()
  const second = renderHook(() => useReaderPresentation('other', false))
  expect(second.result.current.presentation).toBe('study')
})
