import { act, renderHook } from '@testing-library/react'
import { useLanguageStore } from '../store/language'
import { getSavedReaderPresentation, setReaderPresentationPreference } from '../utils/readerPresentation'
import { useReaderPresentation } from './useReaderPresentation'
import { mockDocumentScroll } from '../test/documentScroll'

async function settleViewportFrames(count = 5) {
  await act(async () => {
    await new Promise<void>(resolve => {
      const next = (remaining: number) => requestAnimationFrame(() => remaining > 1 ? next(remaining - 1) : resolve())
      next(count)
    })
  })
}

function modelWidthReflow() {
  const widthDescriptor = Object.getOwnPropertyDescriptor(document.documentElement, 'clientWidth')
  const viewportWidthDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth')
  let width = 390
  let scrollbarWidth = 0
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, get: () => width - scrollbarWidth })
  Object.defineProperty(window, 'innerWidth', { configurable: true, get: () => width })
  const scroll = mockDocumentScroll({ top: 4800, viewportHeight: 844, scrollHeight: 28000 })
  const host = document.createElement('main')
  host.innerHTML = '<p data-reader-anchor="rehras:0" data-line-kind="body">First source line</p><p data-reader-anchor="rehras:1" data-line-kind="body">The chosen source line</p>'
  document.body.append(host)
  const lines = host.querySelectorAll<HTMLElement>('[data-reader-anchor]')
  lines.forEach((line, index) => vi.spyOn(line, 'getBoundingClientRect').mockImplementation(() => {
    const documentTop = index === 0 ? 1000 : width === 390 ? 5000 : 14000
    const top = documentTop - scroll.getTop()
    return { x: 0, y: top, top, bottom: top + 120, left: 0, right: width, width, height: 120, toJSON: () => ({}) }
  }))
  return {
    target: lines[1], scroll,
    resize: (next: number) => { width = next; window.dispatchEvent(new Event('resize')) },
    showScrollbar: () => { scrollbarWidth = 4; window.dispatchEvent(new Event('resize')) },
    restore: () => {
      host.remove()
      scroll.restore()
      if (widthDescriptor) Object.defineProperty(document.documentElement, 'clientWidth', widthDescriptor)
      else Reflect.deleteProperty(document.documentElement, 'clientWidth')
      if (viewportWidthDescriptor) Object.defineProperty(window, 'innerWidth', viewportWidthDescriptor)
      else Reflect.deleteProperty(window, 'innerWidth')
    },
  }
}

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

test('width shrink retains the last settled source line instead of the old document offset', async () => {
  const layout = modelWidthReflow()
  try {
    const mounted = renderHook(() => useReaderPresentation('rehras', false))
    act(() => {
      layout.scroll.setTop(4900)
      document.dispatchEvent(new Event('scrollend'))
    })
    await settleViewportFrames()
    expect(layout.target.getBoundingClientRect().top).toBe(100)
    act(() => { layout.resize(320) })
    await settleViewportFrames()
    expect(layout.target.getBoundingClientRect().top).toBeCloseTo(100, 0)
    expect(layout.scroll.getTop()).toBe(13900)
    mounted.unmount()
  } finally { layout.restore() }
})

test('height-only viewport changes do not move the reading position', async () => {
  const layout = modelWidthReflow()
  try {
    const mounted = renderHook(() => useReaderPresentation('rehras', false))
    layout.scroll.scrollTo.mockClear()
    act(() => {
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 568 })
      window.dispatchEvent(new Event('resize'))
    })
    await settleViewportFrames()
    expect(layout.scroll.scrollTo).not.toHaveBeenCalled()
    expect(layout.target.getBoundingClientRect().top).toBe(200)
    mounted.unmount()
  } finally { layout.restore() }
})

test('content adding a scrollbar cannot restore an old place over an incoming reading destination', async () => {
  const layout = modelWidthReflow()
  try {
    const mounted = renderHook(() => useReaderPresentation('rehras', false))
    // The destination scroll can precede its scroll event during cold resume.
    // The cached anchor still describes the earlier place at this moment.
    layout.scroll.setTop(4900)
    layout.scroll.scrollTo.mockClear()
    act(() => { layout.showScrollbar() })
    await settleViewportFrames()
    expect(window.innerWidth).toBe(390)
    expect(document.documentElement.clientWidth).toBe(386)
    expect(layout.scroll.scrollTo).not.toHaveBeenCalled()
    expect(layout.scroll.getTop()).toBe(4900)
    expect(layout.target.getBoundingClientRect().top).toBe(100)
    mounted.unmount()
  } finally { layout.restore() }
})

test('width restoration waits for a reader sheet to close and ignores typing within it', async () => {
  const layout = modelWidthReflow()
  try {
    const mounted = renderHook(({ open }) => useReaderPresentation('rehras', open), { initialProps: { open: false } })
    mounted.rerender({ open: true })
    act(() => {
      layout.resize(320)
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
    })
    await settleViewportFrames()
    expect(layout.scroll.getTop()).toBe(4800)
    mounted.rerender({ open: false })
    await settleViewportFrames()
    expect(layout.target.getBoundingClientRect().top).toBeCloseTo(200, 0)
    mounted.unmount()
  } finally { layout.restore() }
})

test('an explicit section jump discards queued width restoration and seeds the new target for the next resize', async () => {
  const layout = modelWidthReflow()
  try {
    const mounted = renderHook(({ open }) => useReaderPresentation('rehras', open), { initialProps: { open: false } })
    mounted.rerender({ open: true })
    act(() => { layout.resize(320) })
    act(() => {
      mounted.result.current.discardReadingPosition()
      mounted.rerender({ open: false })
      requestAnimationFrame(() => requestAnimationFrame(() => { layout.scroll.setTop(13900) }))
    })
    await settleViewportFrames()
    expect(layout.target.getBoundingClientRect().top).toBe(100)
    act(() => { layout.resize(390) })
    await settleViewportFrames()
    expect(layout.target.getBoundingClientRect().top).toBeCloseTo(100, 0)
    mounted.unmount()
  } finally { layout.restore() }
})
