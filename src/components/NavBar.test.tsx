import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NavBar from './NavBar'

test('renders the 4-tab product nav', () => {
  render(<MemoryRouter><NavBar /></MemoryRouter>)
  expect(screen.getByTestId('primary-nav')).toHaveAttribute('aria-label', 'Primary navigation')
  expect(screen.getByTestId('nav-tab-home')).toBeInTheDocument()
  expect(screen.getByTestId('nav-tab-read')).toBeInTheDocument()
  expect(screen.getByTestId('nav-tab-saved')).toBeInTheDocument()
  expect(screen.getByTestId('nav-tab-more')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Read' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Saved' })).toBeInTheDocument()
  const moreLink = screen.getByRole('link', { name: 'More settings and information' })
  expect(moreLink).toBeInTheDocument()
  expect(moreLink).toHaveTextContent('More — More settings and information')
})

test('keeps curated book routes inside the Read navigation flow', () => {
  render(
    <MemoryRouter initialEntries={['/library/panth-prakash-english/chapters/episode-001-the-episode-about-the-origin-of-the-khalsa']}>
      <NavBar />
    </MemoryRouter>
  )

  expect(screen.getByTestId('nav-tab-read')).toHaveAttribute('aria-current', 'page')
  expect(screen.getByTestId('nav-tab-saved')).not.toHaveAttribute('aria-current')
})

test('uses Saved as the canonical shelf destination', () => {
  render(
    <MemoryRouter initialEntries={['/saved']}>
      <NavBar />
    </MemoryRouter>
  )

  expect(screen.getByTestId('nav-tab-saved')).toHaveAttribute('href', '/saved')
  expect(screen.getByTestId('nav-tab-saved')).toHaveAttribute('aria-current', 'page')
  expect(screen.getByTestId('nav-tab-read')).not.toHaveAttribute('aria-current')
})

test('keeps vocabulary review inside the Saved navigation flow', () => {
  render(
    <MemoryRouter initialEntries={['/vocab']}>
      <NavBar />
    </MemoryRouter>
  )

  expect(screen.getByTestId('nav-tab-saved')).toHaveAttribute('aria-current', 'page')
  expect(screen.getByTestId('nav-tab-home')).not.toHaveAttribute('aria-current')
})

test('keeps Nitnem customization inside the Home navigation flow', () => {
  render(
    <MemoryRouter initialEntries={['/nitnem/customize']}>
      <NavBar />
    </MemoryRouter>
  )

  expect(screen.getByTestId('nav-tab-home')).toHaveAttribute('aria-current', 'page')
  expect(screen.getByTestId('nav-tab-more')).not.toHaveAttribute('aria-current')
})

describe('stable navigation geometry while scrolling', () => {
  let width: number
  let height: number
  let labelWidth: number
  let desktop: boolean
  let media: EventTarget
  let viewport: EventTarget
  let frames: Map<number, FrameRequestCallback>
  let nextFrame: number
  let fontsDescriptor: PropertyDescriptor | undefined
  let resolveFonts: () => void
  let observers: Array<{
    callback: ResizeObserverCallback
    targets: Set<Element>
    disconnect: ReturnType<typeof vi.fn>
  }>

  function notifyResize(target: Element) {
    observers.filter(observer => observer.targets.has(target)).forEach(observer => {
      observer.callback([{ target } as ResizeObserverEntry], {} as ResizeObserver)
    })
  }

  function flushFrame() {
    act(() => {
      const callbacks = [...frames.values()]
      frames.clear()
      callbacks.forEach(callback => callback(0))
    })
  }

  beforeEach(() => {
    width = 390
    height = 84
    labelWidth = 40
    desktop = false
    nextFrame = 0
    frames = new Map()
    observers = []
    media = new EventTarget()
    Object.defineProperty(media, 'matches', { get: () => desktop })
    viewport = new EventTarget()
    vi.stubGlobal('visualViewport', viewport)
    vi.spyOn(window, 'matchMedia').mockReturnValue(media as MediaQueryList)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      const id = ++nextFrame
      frames.set(id, callback)
      return id
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })
    vi.stubGlobal('ResizeObserver', class {
      record: typeof observers[number]
      constructor(callback: ResizeObserverCallback) {
        this.record = { callback, targets: new Set(), disconnect: vi.fn() }
        observers.push(this.record)
      }
      observe(target: Element) { this.record.targets.add(target) }
      disconnect() { this.record.disconnect() }
    })
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
      return this.classList.contains('app-nav') ? width : 0
    })
    vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(function (this: Element) {
      return this.classList.contains('app-nav-tab__label') ? labelWidth : 0
    })
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const expanded = this.querySelector('.app-nav')?.getAttribute('data-expanded-labels') === 'true'
      const measuredHeight = height + (expanded && !desktop ? 70 : 0)
      return {
        x: 0, y: 0, top: 0, left: 0, right: width, bottom: measuredHeight,
        width, height: measuredHeight, toJSON: () => ({}),
      }
    })
    fontsDescriptor = Object.getOwnPropertyDescriptor(document, 'fonts')
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: new Promise<void>(resolve => { resolveFonts = resolve }) },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    if (fontsDescriptor) Object.defineProperty(document, 'fonts', fontsDescriptor)
    else Reflect.deleteProperty(document, 'fonts')
  })

  test('does no layout work when browser chrome repeatedly changes the viewport height', () => {
    render(<MemoryRouter><NavBar /></MemoryRouter>)
    flushFrame()
    const setProperty = vi.spyOn(document.documentElement.style, 'setProperty')
    const styles = vi.spyOn(window, 'getComputedStyle')
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockClear()
    vi.mocked(window.requestAnimationFrame).mockClear()

    act(() => {
      for (let index = 0; index < 8; index += 1) {
        window.dispatchEvent(new Event('resize'))
        viewport.dispatchEvent(new Event('resize'))
      }
    })
    flushFrame()

    expect(styles).not.toHaveBeenCalled()
    expect(HTMLElement.prototype.getBoundingClientRect).not.toHaveBeenCalled()
    expect(window.requestAnimationFrame).not.toHaveBeenCalled()
    expect(setProperty).not.toHaveBeenCalled()
    expect(document.documentElement.style.getPropertyValue('--nav-stack-height')).toBe('84px')
  })

  test('batches actual bar resizing and changes reserved space only when its height changes', () => {
    render(<MemoryRouter><NavBar /></MemoryRouter>)
    const stack = screen.getByTestId('nav-stack')
    const nav = screen.getByTestId('primary-nav')
    const attributes = new MutationObserver(() => {})
    attributes.observe(nav, { attributes: true })
    const setProperty = vi.spyOn(document.documentElement.style, 'setProperty')
    vi.mocked(window.requestAnimationFrame).mockClear()
    expect(observers.some(observer => observer.targets.has(stack))).toBe(true)

    act(() => {
      notifyResize(stack)
      notifyResize(stack)
      notifyResize(stack)
    })
    expect(window.requestAnimationFrame).toHaveBeenCalledOnce()
    flushFrame()
    expect(setProperty).not.toHaveBeenCalled()
    expect(attributes.takeRecords()).toHaveLength(0)

    // The home-indicator inset can grow even when all four labels still fit.
    height = 112
    act(() => notifyResize(stack))
    flushFrame()
    expect(document.documentElement.style.getPropertyValue('--nav-stack-height')).toBe('112px')
    expect(setProperty).toHaveBeenCalledExactlyOnceWith('--nav-stack-height', '112px')
    expect(attributes.takeRecords()).toHaveLength(0)
    attributes.disconnect()
  })

  test('responds to text growth and width changes without repeatedly toggling label layout', () => {
    render(<MemoryRouter><NavBar /></MemoryRouter>)
    const stack = screen.getByTestId('nav-stack')
    const nav = screen.getByTestId('primary-nav')
    const labels = [...nav.querySelectorAll('.app-nav-tab__label')]
    expect(labels).toHaveLength(4)
    labels.forEach(label => expect(observers.some(observer => observer.targets.has(label))).toBe(true))

    labelWidth = 110
    act(() => notifyResize(labels[0]))
    flushFrame()
    expect(nav).toHaveAttribute('data-expanded-labels', 'true')
    expect(document.documentElement.style.getPropertyValue('--nav-stack-height')).toBe('154px')

    const attributes = new MutationObserver(() => {})
    attributes.observe(nav, { attributes: true })
    const setProperty = vi.spyOn(document.documentElement.style, 'setProperty')
    act(() => notifyResize(stack))
    flushFrame()
    expect(attributes.takeRecords()).toHaveLength(0)
    expect(setProperty).not.toHaveBeenCalled()

    width = 760
    act(() => notifyResize(stack))
    flushFrame()
    expect(nav).toHaveAttribute('data-expanded-labels', 'false')
    expect(document.documentElement.style.getPropertyValue('--nav-stack-height')).toBe('84px')
    attributes.disconnect()
  })

  test('releases bottom space for the desktop rail and restores it on returning to mobile', () => {
    render(<MemoryRouter><NavBar /></MemoryRouter>)
    expect(document.documentElement.style.getPropertyValue('--nav-stack-height')).toBe('84px')

    desktop = true
    height = 320
    act(() => media.dispatchEvent(new Event('change')))
    flushFrame()
    expect(document.documentElement.style.getPropertyValue('--nav-stack-height')).toBe('0px')

    desktop = false
    height = 112
    act(() => media.dispatchEvent(new Event('change')))
    flushFrame()
    expect(document.documentElement.style.getPropertyValue('--nav-stack-height')).toBe('112px')
  })

  test('disconnects observation and cancels pending measurements after leaving primary navigation', async () => {
    const { unmount } = render(<MemoryRouter><NavBar /></MemoryRouter>)
    act(() => notifyResize(screen.getByTestId('nav-stack')))
    expect(frames.size).toBe(1)
    unmount()
    expect(frames.size).toBe(0)
    observers.forEach(observer => expect(observer.disconnect).toHaveBeenCalledOnce())
    expect(document.documentElement.style.getPropertyValue('--nav-stack-height')).toBe('0px')
    const setProperty = vi.spyOn(document.documentElement.style, 'setProperty')
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockClear()
    vi.mocked(window.requestAnimationFrame).mockClear()

    await act(async () => {
      media.dispatchEvent(new Event('change'))
      viewport.dispatchEvent(new Event('resize'))
      resolveFonts()
      await Promise.resolve()
    })
    flushFrame()
    expect(window.requestAnimationFrame).not.toHaveBeenCalled()
    expect(HTMLElement.prototype.getBoundingClientRect).not.toHaveBeenCalled()
    expect(setProperty).not.toHaveBeenCalled()
  })
})
