import { act, render } from '@testing-library/react'
import ReaderHeader from './ReaderHeader'

let width: number
let height: number
let rootFontSize: string
let resizeHeader: () => void
let disconnect: ReturnType<typeof vi.fn>

function Harness() {
  return <div data-testid="reader-page"><ReaderHeader
    title="Japji Sahib"
    heading
    back={<button>Back</button>}
    actions={<button>Appearance</button>}
  /></div>
}

beforeEach(() => {
  width = 390
  height = 140
  rootFontSize = document.documentElement.style.fontSize
  document.documentElement.style.fontSize = '16px'
  disconnect = vi.fn()
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { resizeHeader = callback }
    observe() {}
    disconnect = disconnect
  })
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
    return this.matches('.reader-header') ? width : 0
  })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return { x: 0, y: 0, top: 0, left: 0, right: width, bottom: height, width, height, toJSON: () => ({}) }
  })
})

afterEach(() => {
  document.documentElement.style.fontSize = rootFontSize
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('does not remeasure or mutate the header while mobile viewport height changes', () => {
  const { getByTestId } = render(<Harness />)
  const page = getByTestId('reader-page')
  const header = page.querySelector('header')!
  const attributes = new MutationObserver(() => {})
  attributes.observe(header, { attributes: true })
  const setProperty = vi.spyOn(page.style, 'setProperty')
  vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockClear()
  act(() => {
    window.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new Event('resize'))
  })
  expect(HTMLElement.prototype.getBoundingClientRect).not.toHaveBeenCalled()
  expect(setProperty).not.toHaveBeenCalled()
  expect(attributes.takeRecords()).toHaveLength(0)
  attributes.disconnect()
})

test('observes real header height changes without rewriting unchanged attributes or measurements', () => {
  const { getByTestId } = render(<Harness />)
  const page = getByTestId('reader-page')
  const header = page.querySelector('header')!
  const attributes = new MutationObserver(() => {})
  attributes.observe(header, { attributes: true })
  const setProperty = vi.spyOn(page.style, 'setProperty')
  act(() => resizeHeader())
  expect(setProperty).not.toHaveBeenCalled()
  expect(attributes.takeRecords()).toHaveLength(0)
  height = 184
  act(() => resizeHeader())
  expect(page.style.getPropertyValue('--reader-header-height')).toBe('184px')
  expect(setProperty).toHaveBeenCalledOnce()
  attributes.disconnect()
})

test('retains browser text enlargement and width change measurement', () => {
  const { getByTestId, unmount } = render(<Harness />)
  const page = getByTestId('reader-page')
  const header = page.querySelector('header')!
  act(() => {
    document.documentElement.style.fontSize = '32px'
    height = 216
    window.dispatchEvent(new Event('resize'))
  })
  expect(header).toHaveAttribute('data-enlarged-text', 'true')
  expect(page.style.getPropertyValue('--reader-header-height')).toBe('216px')
  act(() => {
    width = 844
    height = 108
    window.dispatchEvent(new Event('resize'))
  })
  expect(page.style.getPropertyValue('--reader-header-height')).toBe('108px')
  unmount()
  expect(disconnect).toHaveBeenCalledOnce()
  vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockClear()
  act(() => window.dispatchEvent(new Event('resize')))
  expect(HTMLElement.prototype.getBoundingClientRect).not.toHaveBeenCalled()
})
