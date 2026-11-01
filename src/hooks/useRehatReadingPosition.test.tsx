import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useRehatReadingPosition } from './useRehatReadingPosition'
import { useReadingPlacesStore } from '../store/readingPlaces'
import { scrollAppTo } from '../utils/appScroll'

const scrolling = vi.hoisted(() => ({ top: 0, settled: null as (() => void) | null }))
vi.mock('../utils/appScroll', () => ({
  getAppScrollTop: () => scrolling.top,
  getAppViewportBounds: () => ({ top: 0, bottom: 800, height: 800 }),
  scrollAppTo: vi.fn(),
  addAppScrollSettledListener: (callback: () => void) => { scrolling.settled = callback; return () => { scrolling.settled = null } },
}))

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  localStorage.clear()
  useReadingPlacesStore.setState({ places: {} })
  scrolling.top = 0
})
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = '' })

function geometry(top: number, height: number) {
  return { top, bottom: top + height, height, left: 0, right: 300, width: 300, x: 0, y: top, toJSON: () => ({}) } as DOMRect
}

function reading() {
  document.body.innerHTML = '<div class="rehat-reader-shell"><header data-reader-header="persistent"></header><article><p data-rehat-block="rehat-r1-a-1">First</p><p data-rehat-block="rehat-r1-b-1">Second</p></article></div>'
  const root = document.querySelector('article')!
  const blocks = root.querySelectorAll('p')
  vi.spyOn(document.querySelector('header')!, 'getBoundingClientRect').mockReturnValue(geometry(0, 100))
  vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(geometry(-200, 1400))
  vi.spyOn(blocks[0], 'getBoundingClientRect').mockReturnValue(geometry(-200, 200))
  const secondGeometry = vi.spyOn(blocks[1], 'getBoundingClientRect').mockReturnValue(geometry(0, 300))
  return { root, secondGeometry, props: { rootRef: { current: root }, rehatId: 1, chapterId: 11,
    sourceTitle: 'Sikh Rehat Maryada', chapterTitle: 'Daily Discipline', revision: 'r1', renderedHtml: root.innerHTML, finding: false } }
}

test('saves only a settled or suspended reading, and reopens its verified paragraph', () => {
  const { props } = reading()
  const hook = renderHook(() => useRehatReadingPosition(props))
  act(() => { vi.runAllTimers() })
  expect(useReadingPlacesStore.getState().places).toEqual({})
  scrolling.top = 300
  act(() => { scrolling.settled?.() })
  expect(useReadingPlacesStore.getState().places['rehat:1']).toMatchObject({
    resumePath: '/banis/rehat/1/chapters/11',
    readerLocator: { revision: 'r1', locations: { blockId: 'rehat-r1-b-1', position: 2 } },
  })
  hook.unmount()
  vi.mocked(scrollAppTo).mockClear()
  renderHook(() => useRehatReadingPosition(props))
  act(() => { vi.runAllTimers() })
  expect(scrollAppTo).toHaveBeenCalledWith({ top: 184, behavior: 'auto' })
})

test('does not restore a revised chapter or overwrite the saved place while finding text', () => {
  const { props } = reading()
  useReadingPlacesStore.getState().remember({ scriptureId: 'rehat-1-11', resumePath: '/banis/rehat/1/chapters/11', updatedAt: '2026-10-31T10:00:00Z',
    readerLocator: { revision: 'old', href: '/banis/rehat/1/chapters/11', type: 'text/html', locations: { progression: .4, totalProgression: .4, position: 2, blockId: 'rehat-old-b-1' } } })
  renderHook(() => useRehatReadingPosition({ ...props, finding: true }))
  act(() => { vi.runAllTimers() })
  scrolling.top = 300
  act(() => { window.dispatchEvent(new Event('pagehide')) })
  expect(scrollAppTo).not.toHaveBeenCalled()
  expect(useReadingPlacesStore.getState().places['rehat:1'].readerLocator?.revision).toBe('old')
})

test('preserves the current point after the appearance sheet unlocks the page', () => {
  const { props, secondGeometry } = reading()
  const hook = renderHook(() => useRehatReadingPosition(props))
  act(() => { vi.runAllTimers() })
  scrolling.top = 300
  act(() => { hook.result.current.openAppearance() })
  secondGeometry.mockReturnValue(geometry(-50, 600))
  act(() => { scrolling.settled?.() })
  expect(useReadingPlacesStore.getState().places).toEqual({})
  act(() => { hook.result.current.closeAppearance(); vi.runAllTimers() })
  expect(scrollAppTo).toHaveBeenCalledWith({ top: 366, behavior: 'auto' })
})

test('does not write or measure on wheel input before scrolling settles', () => {
  const { props, secondGeometry } = reading()
  renderHook(() => useRehatReadingPosition(props))
  act(() => { vi.runAllTimers() })
  scrolling.top = 300
  secondGeometry.mockClear()
  act(() => { window.dispatchEvent(new Event('wheel')) })
  expect(secondGeometry).not.toHaveBeenCalled()
  expect(useReadingPlacesStore.getState().places).toEqual({})
  act(() => { scrolling.settled?.() })
  expect(useReadingPlacesStore.getState().places['rehat:1']).toBeDefined()
})

test('an explicit paragraph link takes precedence over the source’s saved paragraph', () => {
  const { props } = reading()
  useReadingPlacesStore.getState().remember({ scriptureId: 'rehat-1-11', resumePath: '/banis/rehat/1/chapters/11', updatedAt: '2026-10-31T10:00:00Z',
    readerLocator: { revision: 'r1', href: '/banis/rehat/1/chapters/11', type: 'text/html', locations: { progression: .4, totalProgression: .4, position: 2, blockId: 'rehat-r1-b-1' } } })
  scrolling.top = 300
  renderHook(() => useRehatReadingPosition({ ...props, hash: '#rehat-r1-a-1' }))
  act(() => { vi.runAllTimers() })
  expect(scrollAppTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
})

test('late source metadata does not restart restoration after the reader has moved', () => {
  const { props } = reading()
  useReadingPlacesStore.getState().remember({ scriptureId: 'rehat-1-11', resumePath: '/banis/rehat/1/chapters/11', updatedAt: '2026-10-31T10:00:00Z',
    readerLocator: { revision: 'r1', href: '/banis/rehat/1/chapters/11', type: 'text/html', locations: { progression: .4, totalProgression: .4, position: 2, blockId: 'rehat-r1-b-1' } } })
  const hook = renderHook(sourceTitle => useRehatReadingPosition({ ...props, sourceTitle }), { initialProps: '' })
  act(() => { vi.runAllTimers() })
  vi.mocked(scrollAppTo).mockClear()
  act(() => { window.dispatchEvent(new Event('wheel')) })
  hook.rerender('Sikh Rehat Maryada')
  act(() => { vi.runAllTimers() })
  expect(scrollAppTo).not.toHaveBeenCalled()
})

test('captures the current paragraph before following a chapter navigation link', () => {
  const { props, root } = reading()
  const link = document.createElement('a')
  link.href = '/banis/rehat/1/chapters/12'
  link.addEventListener('click', event => event.preventDefault())
  root.parentElement!.append(link)
  renderHook(() => useRehatReadingPosition(props))
  act(() => { vi.runAllTimers() })
  scrolling.top = 300
  act(() => { link.click() })
  expect(useReadingPlacesStore.getState().places['rehat:1'].readerLocator?.locations.blockId).toBe('rehat-r1-b-1')
})
