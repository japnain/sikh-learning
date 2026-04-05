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

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  localStorage.clear()
})
afterAll(() => server.close())
