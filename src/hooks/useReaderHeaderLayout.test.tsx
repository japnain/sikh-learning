import { act, render } from '@testing-library/react'
import { useReaderHeaderLayout } from './useReaderHeaderLayout'
import { captureReaderAnchor, restoreReaderAnchor } from '../utils/readerAnchor'

const geometry = vi.hoisted(() => ({
  width: 390, title: 120, label: 70, value: 25, normalHeight: 108, expandedHeight: 184, top: 0,
  observers: [] as Array<(entries: Array<{ target: Element }>) => void>,
}))
vi.mock('../utils/appScroll', () => ({ getAppScrollTop: () => geometry.top }))
vi.mock('../utils/readerAnchor', () => ({
  captureReaderAnchor: vi.fn(() => ({ key: 'source-G:31', fraction: .2, viewportTop: 120 })),
  restoreReaderAnchor: vi.fn(),
  getReaderViewportTop: () => (document.querySelector('.study-reader-topbar')?.getBoundingClientRect().bottom ?? 0) + 16,
}))

let fontsDescriptor: PropertyDescriptor | undefined
let fonts: EventTarget & { ready: Promise<void> }
let disconnect: ReturnType<typeof vi.fn>

function Harness() {
  const ref = useReaderHeaderLayout('rehras-short')
  return <div ref={ref} data-testid="measured-reader"><div className="study-reader-topbar" style={{ paddingLeft: '9.6px', paddingRight: '9.6px' }}>
    <button>Back</button><div className="study-reader-topbar__identity" style={{ paddingLeft: '5.6px', paddingRight: '5.6px' }}>
      <h1>Rehras Sahib</h1><button className="study-reader-length-control" style={{ paddingLeft: '8px', paddingRight: '8px', border: '1px solid' }}><span>Bani length</span><strong>Long</strong></button>
    </div><div className="study-reader-topbar__actions"><button>Appearance</button><button>More</button></div>
  </div><article>Scripture remains below the measured header.</article></div>
}

function rect(width: number, height = 0): DOMRect {
  return { x: 0, y: 0, top: 0, left: 0, right: width, bottom: height, width, height, toJSON: () => ({}) }
}
async function frames() {
  await act(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))) })
}
function resizeObserved(selector = '.study-reader-topbar') {
  const target = document.querySelector(selector)!
  geometry.observers.forEach(callback => callback([{ target }]))
}

beforeEach(() => {
  Object.assign(geometry, { width: 390, title: 120, label: 70, value: 25, normalHeight: 108, expandedHeight: 184, top: 0, observers: [] })
  disconnect = vi.fn()
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: (entries: Array<{ target: Element }>) => void) { geometry.observers.push(callback) }
    observe() {}
    disconnect = disconnect
  })
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
    return this.classList.contains('study-reader-topbar') ? geometry.width : 0
  })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('study-reader-topbar') ? rect(geometry.width, this.dataset.reflow === 'true' ? geometry.expandedHeight : geometry.normalHeight) : rect(0)
  })
  vi.spyOn(document, 'createRange').mockImplementation(() => {
    let selected: Node | null = null
    return {
      selectNodeContents(node: Node) { selected = node },
      getBoundingClientRect: () => rect(selected instanceof HTMLElement && selected.tagName === 'H1' ? geometry.title
        : selected instanceof HTMLElement && selected.tagName === 'STRONG' ? geometry.value : geometry.label),
    } as unknown as Range
  })
  fontsDescriptor = Object.getOwnPropertyDescriptor(document, 'fonts')
  fonts = Object.assign(new EventTarget(), { ready: Promise.resolve() })
  Object.defineProperty(document, 'fonts', { configurable: true, value: fonts })
  vi.mocked(captureReaderAnchor).mockClear()
  vi.mocked(restoreReaderAnchor).mockClear()
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  if (fontsDescriptor) Object.defineProperty(document, 'fonts', fontsDescriptor)
  else Reflect.deleteProperty(document, 'fonts')
})

test('retains the normal header arrangement when full title and whole length labels fit', () => {
  const { getByTestId } = render(<Harness />)
  const page = getByTestId('measured-reader')
  expect(page.querySelector('.study-reader-topbar')).toHaveAttribute('data-reflow', 'false')
  expect(page.style.getPropertyValue('--study-reader-topbar-height')).toBe('108px')
  expect(restoreReaderAnchor).not.toHaveBeenCalled()
})

test('reflows cramped enlarged text and reserves its actual expanded height instead of a guessed fixed height', () => {
  Object.assign(geometry, { width: 320, title: 205, label: 140, value: 50, normalHeight: 216, expandedHeight: 244 })
  const { getByTestId } = render(<Harness />)
  const page = getByTestId('measured-reader')
  expect(page.querySelector('.study-reader-topbar')).toHaveAttribute('data-reflow', 'true')
  expect(page.style.getPropertyValue('--study-reader-topbar-height')).toBe('244px')
  expect(page.querySelector('h1')).toHaveTextContent('Rehras Sahib')
})

test('returns to the normal arrangement after widening without getting stuck in a reflow/resize loop', async () => {
  Object.assign(geometry, { width: 320, title: 205, label: 140, expandedHeight: 244 })
  const { getByTestId } = render(<Harness />)
  const page = getByTestId('measured-reader')
  expect(page.querySelector('.study-reader-topbar')).toHaveAttribute('data-reflow', 'true')
  geometry.width = 760
  act(() => resizeObserved())
  await frames()
  expect(page.querySelector('.study-reader-topbar')).toHaveAttribute('data-reflow', 'false')
  expect(page.style.getPropertyValue('--study-reader-topbar-height')).toBe('108px')
  act(() => resizeObserved())
  await frames()
  expect(page.style.getPropertyValue('--study-reader-topbar-height')).toBe('108px')
})

test('late font growth updates reserved space while retaining a deep scripture anchor below the new header', async () => {
  geometry.top = 900
  const { getByTestId } = render(<Harness />)
  await frames()
  vi.mocked(restoreReaderAnchor).mockClear()
  geometry.title = 300
  geometry.expandedHeight = 260
  act(() => fonts.dispatchEvent(new Event('loadingdone')))
  await frames()
  expect(getByTestId('measured-reader').style.getPropertyValue('--study-reader-topbar-height')).toBe('260px')
  expect(restoreReaderAnchor).toHaveBeenLastCalledWith({ key: 'source-G:31', fraction: .2, viewportTop: 276 })
})

test('does not move a deep reading while a modal owns focus and scroll restoration', async () => {
  geometry.top = 900
  const { getByTestId } = render(<Harness />)
  await frames()
  vi.mocked(restoreReaderAnchor).mockClear()
  const page = getByTestId('measured-reader')
  page.setAttribute('aria-hidden', 'true')
  geometry.title = 300
  act(() => resizeObserved())
  await frames()
  expect(page.style.getPropertyValue('--study-reader-topbar-height')).toBe('184px')
  expect(restoreReaderAnchor).not.toHaveBeenCalled()
})

test('disconnects observers and discards queued font/resize measurements after leaving the reader', async () => {
  const { unmount } = render(<Harness />)
  act(() => resizeObserved())
  unmount()
  geometry.top = 900
  act(() => fonts.dispatchEvent(new Event('loadingdone')))
  await frames()
  expect(disconnect).toHaveBeenCalledOnce()
  expect(restoreReaderAnchor).not.toHaveBeenCalled()
})

test('ignores mobile browser height-only resizes during a deep reading', async () => {
  geometry.top = 900
  render(<Harness />)
  await frames()
  vi.mocked(document.createRange).mockClear()
  vi.mocked(captureReaderAnchor).mockClear()
  vi.mocked(restoreReaderAnchor).mockClear()
  act(() => {
    window.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new Event('resize'))
  })
  await frames()
  expect(document.createRange).not.toHaveBeenCalled()
  expect(captureReaderAnchor).not.toHaveBeenCalled()
  expect(restoreReaderAnchor).not.toHaveBeenCalled()
})

test('ignores scripture height changes but still measures a new header width', async () => {
  geometry.top = 900
  const { getByTestId } = render(<Harness />)
  await frames()
  vi.mocked(document.createRange).mockClear()
  vi.mocked(captureReaderAnchor).mockClear()
  act(() => resizeObserved('[data-testid="measured-reader"]'))
  await frames()
  expect(document.createRange).not.toHaveBeenCalled()
  expect(captureReaderAnchor).not.toHaveBeenCalled()

  geometry.width = 280
  act(() => window.dispatchEvent(new Event('resize')))
  await frames()
  expect(document.createRange).toHaveBeenCalled()
  expect(getByTestId('measured-reader').style.getPropertyValue('--study-reader-topbar-height')).toBe('184px')
})

test('does not scan scripture anchors when a repeated header measurement leaves layout unchanged', async () => {
  geometry.top = 900
  render(<Harness />)
  await frames()
  vi.mocked(captureReaderAnchor).mockClear()
  vi.mocked(restoreReaderAnchor).mockClear()
  act(() => resizeObserved())
  await frames()
  expect(captureReaderAnchor).not.toHaveBeenCalled()
  expect(restoreReaderAnchor).not.toHaveBeenCalled()
})
