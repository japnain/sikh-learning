import '@testing-library/jest-dom'
import fs from 'node:fs'
import path from 'node:path'
import './test-storage'
import { configureLearnRepositoryLoader, resetLearnRepositoryCache } from './data/learnRepository'
import { server } from './test/msw-server'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

Object.defineProperty(window.navigator, 'standalone', {
  value: false,
  configurable: true,
})

Object.defineProperty(globalThis, 'requestAnimationFrame', {
  value: (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0),
  configurable: true,
  writable: true,
})

Object.defineProperty(globalThis, 'cancelAnimationFrame', {
  value: (id: number) => window.clearTimeout(id),
  configurable: true,
  writable: true,
})

class MockAudioContext {
  state = 'running'
  currentTime = 0
  sampleRate = 44100
  destination = {}

  resume() {
    return Promise.resolve()
  }

  createGain() {
    return {
      gain: { value: 1 },
      connect: () => {},
      disconnect: () => {},
    }
  }

  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {},
      loop: false,
    }
  }

  createOscillator() {
    return {
      type: 'sine',
      frequency: {
        value: 0,
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {},
    }
  }

  createBiquadFilter() {
    return {
      type: 'lowpass',
      frequency: {
        value: 0,
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
      },
      Q: { value: 0 },
      connect: () => {},
      disconnect: () => {},
    }
  }

  createBuffer() {
    return {
      getChannelData: () => new Float32Array(1),
    }
  }

  decodeAudioData() {
    return Promise.resolve({})
  }
}

Object.defineProperty(window, 'AudioContext', {
  value: MockAudioContext,
  configurable: true,
})

Object.defineProperty(window, 'webkitAudioContext', {
  value: MockAudioContext,
  configurable: true,
})

class MockAudio {
  src = ''
  preload = 'auto'
  loop = false
  volume = 1
  currentTime = 0
  paused = true

  play() {
    this.paused = false
    return Promise.resolve()
  }

  pause() {
    this.paused = true
  }

  addEventListener() {}
  removeEventListener() {}
}

Object.defineProperty(globalThis, 'Audio', {
  value: MockAudio,
  configurable: true,
})

Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: () => Promise.resolve(),
})

Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: () => {},
})

Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: () => {},
})

class MockIntersectionObserver {
  constructor(_callback: IntersectionObserverCallback) {}

  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return []
  }
}

Object.defineProperty(globalThis, 'IntersectionObserver', {
  configurable: true,
  writable: true,
  value: MockIntersectionObserver,
})

class MockResizeObserver {
  constructor(_callback: ResizeObserverCallback) {}

  disconnect() {}
  observe() {}
  unobserve() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  writable: true,
  value: MockResizeObserver,
})

const PROJECT_ROOT = process.cwd()

configureLearnRepositoryLoader(async (resourcePath) => {
  const normalizedPath = resourcePath.startsWith('/')
    ? resourcePath.slice(1)
    : resourcePath
  const filePath = path.join(PROJECT_ROOT, 'public', normalizedPath.replace(/^data\/learn\//, 'data/learn/'))
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
})

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  localStorage.clear()
  sessionStorage.clear()
  vi.clearAllTimers()
  vi.useRealTimers()
  resetLearnRepositoryCache()
  configureLearnRepositoryLoader(async (resourcePath) => {
    const normalizedPath = resourcePath.startsWith('/')
      ? resourcePath.slice(1)
      : resourcePath
    const filePath = path.join(PROJECT_ROOT, 'public', normalizedPath.replace(/^data\/learn\//, 'data/learn/'))
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  })
})
afterAll(() => server.close())
