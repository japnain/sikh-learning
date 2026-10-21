import { act, renderHook } from '@testing-library/react'
import type { MouseEvent, PointerEvent } from 'react'
import { useReaderInteraction, type ReaderWordContext } from './useReaderInteraction'

const scroll = vi.hoisted(() => ({ top: 0, viewport: { top: 0, bottom: 844, height: 844 }, settled: () => {} }))
vi.mock('../utils/appScroll', () => ({
  getAppScrollTop: () => scroll.top,
  getAppViewportBounds: () => scroll.viewport,
  scrollAppTo: vi.fn(),
  addAppScrollSettledListener: (listener: () => void) => { scroll.settled = listener; return vi.fn() },
}))

const context = { word: { gurmukhi: 'ਸਤਿ', meaning_en: 'True' }, line: { verseId: 12 }, entry: { id: 'verse-1' } } as ReaderWordContext
const click = (target = document.createElement('p')) => ({ target, clientX: 20, clientY: 30, detail: 1 }) as unknown as MouseEvent<HTMLElement>
const down = { clientX: 20, clientY: 30 } as PointerEvent<HTMLElement>

beforeEach(() => { scroll.top = 0; scroll.viewport = { top: 0, bottom: 844, height: 844 }; window.getSelection()?.removeAllRanges() })
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); window.getSelection()?.removeAllRanges(); document.querySelectorAll('[data-hook-test-toolbar]').forEach(element => element.remove()) })

function addToolbar({ position = 'absolute', safeTop = 59, controlTop = () => 66.5 - scroll.top, appearanceTop = controlTop, controlHeight = 44 } = {}) {
  const toolbar = document.createElement('div')
  toolbar.className = 'study-reader-topbar'
  toolbar.dataset.hookTestToolbar = 'true'
  toolbar.style.position = position
  toolbar.style.paddingTop = `${safeTop}px`
  toolbar.innerHTML = '<button data-reader-back>Back</button><button data-ai-action="open-reader-settings">Appearance</button>'
  const [back, appearance] = [...toolbar.querySelectorAll('button')]
  for (const [control, top] of [[back, controlTop], [appearance, appearanceTop]] as const) {
    vi.spyOn(control, 'getBoundingClientRect').mockImplementation(() => ({ x: 0, y: top(), left: 0, right: 44, top: top(), bottom: top() + controlHeight, height: controlHeight, width: 44, toJSON: () => ({}) }))
  }
  document.body.append(toolbar)
  return { toolbar, back, appearance }
}

async function measureCommit() {
  await act(async () => { await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve())) })
}

test('shallow touch scroll and reveal keep the dock available when the top targets move into the safe area', async () => {
  addToolbar()
  const { result } = renderHook(() => useReaderInteraction('first', false))
  await measureCommit()
  expect(result.current.deep).toBe(false)
  act(() => { document.dispatchEvent(new Event('touchmove')); scroll.top = 20; scroll.settled() })
  expect(result.current.visible).toBe(true)
  expect(result.current.deep).toBe(true)
  act(() => { document.dispatchEvent(new Event('touchmove')); scroll.top = 60; scroll.settled() })
  expect(result.current.visible).toBe(false)
  act(() => result.current.reveal())
  expect(result.current.visible).toBe(true)
  expect(result.current.deep).toBe(true)
  act(() => { scroll.top = 0; scroll.settled() })
  expect(result.current.deep).toBe(false)
})

test('reveal reads current header geometry even before a pending scroll settles', () => {
  addToolbar()
  const { result } = renderHook(() => useReaderInteraction('first', false))
  act(() => result.current.hide())
  scroll.top = 60
  act(() => result.current.reveal())
  expect(result.current.visible).toBe(true)
  expect(result.current.deep).toBe(true)
})

test('the dock becomes available if either top action loses its 44px target below the resolved safe inset', async () => {
  addToolbar({ controlTop: () => 70, appearanceTop: () => 58 })
  const { result } = renderHook(() => useReaderInteraction('first', false))
  await measureCommit()
  expect(result.current.deep).toBe(true)
})

test('a larger top target may remain usable when its first pixels cross the safe inset', async () => {
  addToolbar({ controlTop: () => 39, controlHeight: 64 })
  const { result } = renderHook(() => useReaderInteraction('first', false))
  await measureCommit()
  expect(result.current.deep).toBe(false)
})

test('without a safe inset, visible shallow touch targets do not trigger the dock prematurely', () => {
  addToolbar({ safeTop: 0, controlTop: () => 66.5 - scroll.top })
  const { result } = renderHook(() => useReaderInteraction('first', false))
  act(() => { scroll.top = 60; scroll.settled() })
  expect(result.current.deep).toBe(false)
  act(() => { scroll.top = 70; scroll.settled() })
  expect(result.current.deep).toBe(true)
})

test('a fixed desktop toolbar retains the 120px depth threshold', () => {
  addToolbar({ position: 'fixed', controlTop: () => 10 })
  const { result } = renderHook(() => useReaderInteraction('first', false))
  act(() => { scroll.top = 60; scroll.settled() })
  expect(result.current.deep).toBe(false)
  act(() => { scroll.top = 121; scroll.settled() })
  expect(result.current.deep).toBe(true)
})

test('a missing toolbar keeps the 120px fallback and a newly mounted touch toolbar is remeasured', async () => {
  const { result, rerender } = renderHook(() => useReaderInteraction('first', false))
  act(() => { scroll.top = 60; scroll.settled() })
  expect(result.current.deep).toBe(false)
  act(() => { scroll.top = 121; scroll.settled() })
  expect(result.current.deep).toBe(true)
  act(() => { scroll.top = 60; scroll.settled() })
  addToolbar()
  rerender()
  await measureCommit()
  expect(result.current.deep).toBe(true)
})

test('viewport movement and orientation recompute reachability without a document scroll', () => {
  vi.useFakeTimers()
  addToolbar({ controlTop: () => 70 })
  const { result } = renderHook(() => useReaderInteraction('first', false))
  expect(result.current.deep).toBe(false)
  act(() => { scroll.viewport = { top: 20, bottom: 844, height: 824 }; window.dispatchEvent(new Event('resize')); vi.runAllTimers() })
  expect(result.current.deep).toBe(true)
  act(() => { scroll.viewport = { top: 0, bottom: 844, height: 844 }; window.dispatchEvent(new Event('orientationchange')); vi.runAllTimers() })
  expect(result.current.deep).toBe(false)
  expect(scroll.top).toBe(0)
})

test('deliberate scroll hides the controls and a normal page tap reveals them', () => {
  const { result } = renderHook(() => useReaderInteraction('first', false))
  act(() => { document.dispatchEvent(new Event('wheel')); scroll.top = 20; scroll.settled() })
  expect(result.current.visible).toBe(true)
  act(() => { document.dispatchEvent(new Event('wheel')); scroll.top = 800; scroll.settled() })
  expect(result.current.visible).toBe(false)
  expect(result.current.deep).toBe(true)
  act(() => result.current.onContentClick(click()))
  expect(result.current.visible).toBe(true)
  act(() => result.current.onContentClick(click()))
  expect(result.current.visible).toBe(false)
})

test('a word preview reveals controls and another word replaces it without a modal', () => {
  const { result } = renderHook(() => useReaderInteraction('first', false))
  act(() => result.current.hide())
  act(() => result.current.previewWord(context, click()))
  expect(result.current.visible).toBe(true)
  expect(result.current.word).toBe(context)
  const other = { ...context, word: { ...context.word, gurmukhi: 'ਨਾਮੁ' } }
  act(() => result.current.previewWord(other, click()))
  expect(result.current.word).toBe(other)
  act(() => { document.dispatchEvent(new Event('wheel')); scroll.top = 300; scroll.settled() })
  expect(result.current.word).toBeNull()
})

test('a held press or dragged gesture never becomes a word tap', () => {
  const now = vi.spyOn(Date, 'now').mockReturnValue(1000)
  const { result } = renderHook(() => useReaderInteraction('first', false))
  act(() => result.current.onPointerDown(down))
  now.mockReturnValue(1600)
  act(() => result.current.previewWord(context, click()))
  expect(result.current.word).toBeNull()
  act(() => result.current.onPointerDown(down))
  act(() => { scroll.top = 30; result.current.previewWord(context, click()) })
  expect(result.current.word).toBeNull()
})

test('native selection dismisses the preview and suppresses reader controls', () => {
  const { result } = renderHook(() => useReaderInteraction('first', false))
  act(() => result.current.previewWord(context, click()))
  const line = document.createElement('p'); line.textContent = 'ਸਤਿ ਨਾਮੁ'; document.body.append(line)
  const selection = window.getSelection()!
  const range = document.createRange(); range.selectNodeContents(line)
  act(() => { selection.addRange(range); document.dispatchEvent(new Event('selectionchange')) })
  expect(result.current.selectionActive).toBe(true)
  expect(result.current.word).toBeNull()
  expect(result.current.visible).toBe(false)
  act(() => result.current.previewWord(context, click()))
  expect(result.current.word).toBeNull()
  act(() => { selection.removeAllRanges(); document.dispatchEvent(new Event('selectionchange')) })
  expect(result.current.selectionActive).toBe(false)
  line.remove()
})

test('interactive targets and an open sheet do not toggle controls or discard context', () => {
  const { result, rerender } = renderHook(({ blocked }) => useReaderInteraction('first', blocked), { initialProps: { blocked: false } })
  act(() => result.current.previewWord(context, click()))
  act(() => result.current.onContentClick(click(document.createElement('button'))))
  expect(result.current.word).toBe(context)
  rerender({ blocked: true })
  act(() => { scroll.top = 400; scroll.settled(); result.current.onContentClick(click()) })
  expect(result.current.visible).toBe(true)
  expect(result.current.word).toBe(context)
})

test('another route starts with controls revealed and no stale word', () => {
  const { result, rerender } = renderHook(({ path }) => useReaderInteraction(path, false), { initialProps: { path: 'first' } })
  act(() => result.current.previewWord(context, click()))
  rerender({ path: 'second' })
  expect(result.current.visible).toBe(true)
  expect(result.current.word).toBeNull()
})

test('font settlement and semantic restoration do not masquerade as reading gestures', () => {
  const { result } = renderHook(() => useReaderInteraction('first', false))
  act(() => result.current.previewWord(context, click()))
  act(() => { scroll.top = 3000; scroll.settled() })
  expect(result.current.visible).toBe(true)
  expect(result.current.word).toBe(context)
})

test('a newer word tap wins over an earlier scroll that has not settled', () => {
  const { result } = renderHook(() => useReaderInteraction('first', false))
  act(() => { document.dispatchEvent(new Event('wheel')); scroll.top = 800 })
  act(() => result.current.previewWord(context, click()))
  act(() => scroll.settled())
  expect(result.current.visible).toBe(true)
  expect(result.current.word).toBe(context)
})
