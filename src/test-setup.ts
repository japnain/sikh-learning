import '@testing-library/jest-dom'
import { server } from './test/msw-server'

const storage = new Map<string, string>()
const localStorageMock: Storage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => {
    storage.set(key, value)
  },
  removeItem: key => {
    storage.delete(key)
  },
  clear: () => {
    storage.clear()
  },
  key: index => Array.from(storage.keys())[index] ?? null,
  get length() {
    return storage.size
  },
}

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
})

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

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  localStorage.clear()
})
afterAll(() => server.close())
