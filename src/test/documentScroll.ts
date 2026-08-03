import { vi } from 'vitest'

interface DocumentScrollOptions {
  top?: number
  viewportHeight?: number
  scrollHeight?: number
}

function restoreDescriptor(
  target: object,
  property: PropertyKey,
  descriptor: PropertyDescriptor | undefined
) {
  if (descriptor) {
    Object.defineProperty(target, property, descriptor)
  } else {
    Reflect.deleteProperty(target, property)
  }
}

export function mockDocumentScroll({
  top = 0,
  viewportHeight = 800,
  scrollHeight = 2400,
}: DocumentScrollOptions = {}) {
  const root = document.documentElement
  const body = document.body
  const originalDescriptors = {
    scrollY: Object.getOwnPropertyDescriptor(window, 'scrollY'),
    innerHeight: Object.getOwnPropertyDescriptor(window, 'innerHeight'),
    rootClientHeight: Object.getOwnPropertyDescriptor(root, 'clientHeight'),
    rootScrollHeight: Object.getOwnPropertyDescriptor(root, 'scrollHeight'),
    bodyScrollHeight: Object.getOwnPropertyDescriptor(body, 'scrollHeight'),
  }
  let currentTop = top
  let currentScrollHeight = scrollHeight

  const syncTop = (nextTop: number) => {
    currentTop = nextTop
    root.scrollTop = nextTop
    body.scrollTop = nextTop
  }

  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    get: () => currentTop,
  })
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: viewportHeight,
  })
  Object.defineProperty(root, 'clientHeight', {
    configurable: true,
    get: () => viewportHeight,
  })
  Object.defineProperty(root, 'scrollHeight', {
    configurable: true,
    get: () => currentScrollHeight,
  })
  Object.defineProperty(body, 'scrollHeight', {
    configurable: true,
    get: () => currentScrollHeight,
  })
  syncTop(top)

  const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(
    ((optionsOrX: ScrollToOptions | number, y?: number) => {
      const nextTop = typeof optionsOrX === 'number'
        ? (y ?? currentTop)
        : (optionsOrX.top ?? currentTop)
      syncTop(nextTop)
    }) as typeof window.scrollTo
  )

  return {
    root,
    scrollTo,
    getTop: () => currentTop,
    setTop: syncTop,
    setScrollHeight: (nextHeight: number) => {
      currentScrollHeight = nextHeight
    },
    restore: () => {
      scrollTo.mockRestore()
      syncTop(0)
      restoreDescriptor(window, 'scrollY', originalDescriptors.scrollY)
      restoreDescriptor(window, 'innerHeight', originalDescriptors.innerHeight)
      restoreDescriptor(root, 'clientHeight', originalDescriptors.rootClientHeight)
      restoreDescriptor(root, 'scrollHeight', originalDescriptors.rootScrollHeight)
      restoreDescriptor(body, 'scrollHeight', originalDescriptors.bodyScrollHeight)
    },
  }
}
