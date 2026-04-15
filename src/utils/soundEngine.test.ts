import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  __getSoundEngineSnapshotForTests,
  __resetSoundEngineForTests,
  playSound,
  setMasterVolume,
  stopSound,
  syncSoundPlayback,
} from './soundEngine'

async function settlePlayback(duration = 1400) {
  await Promise.resolve()
  await vi.advanceTimersByTimeAsync(duration)
}

beforeEach(() => {
  vi.useFakeTimers()
  __resetSoundEngineForTests()
})

afterEach(() => {
  vi.useRealTimers()
})

test('switching sounds stops the previous audio deterministically', async () => {
  playSound('gentle-rain')
  await settlePlayback()
  const firstAudio = __getSoundEngineSnapshotForTests().activeAudio

  playSound('forest-canopy')
  await settlePlayback()
  const snapshot = __getSoundEngineSnapshotForTests()

  expect(snapshot.activeSoundId).toBe('forest-canopy')
  expect(snapshot.activeAudio).not.toBe(firstAudio)
  expect(firstAudio?.paused).toBe(true)
})

test('volume changes apply directly to the active audio instance and zero stays muted', async () => {
  playSound('gentle-rain')
  await settlePlayback()

  setMasterVolume(0.35)
  expect(__getSoundEngineSnapshotForTests().activeAudio?.volume).toBe(0.35)

  setMasterVolume(0)
  expect(__getSoundEngineSnapshotForTests().activeAudio?.volume).toBe(0)
})

test('stopSound clears the active audio instance', async () => {
  playSound('gentle-rain')
  await settlePlayback()
  const activeAudio = __getSoundEngineSnapshotForTests().activeAudio

  stopSound()

  const snapshot = __getSoundEngineSnapshotForTests()
  expect(snapshot.activeAudio).toBe(null)
  expect(snapshot.activeSoundId).toBe(null)
  expect(activeAudio?.paused).toBe(true)
  expect(activeAudio?.currentTime).toBe(0)
})

test('syncing playback applies sound switches and volume updates in one pass', async () => {
  syncSoundPlayback({ selectedSoundId: 'gentle-rain', isPlaying: true, volume: 0.2 })
  await settlePlayback()

  syncSoundPlayback({ selectedSoundId: 'forest-canopy', isPlaying: true, volume: 0.85 })
  await settlePlayback()

  const snapshot = __getSoundEngineSnapshotForTests()
  expect(snapshot.activeSoundId).toBe('forest-canopy')
  expect(snapshot.activeAudio?.volume).toBe(0.85)
})

test('stopping playback does not let stale sessions revive after timers settle', async () => {
  playSound('gentle-rain')
  await settlePlayback(200)

  stopSound(false)
  await settlePlayback()

  const snapshot = __getSoundEngineSnapshotForTests()
  expect(snapshot.activeSoundId).toBe(null)
  expect(snapshot.activeAudio).toBe(null)
})

test('fallback failure leaves the engine fully stopped', async () => {
  const RejectingAudio = class {
    src = ''
    preload = 'auto'
    loop = false
    volume = 1
    currentTime = 0
    paused = true

    play() {
      this.paused = false
      return Promise.reject(new Error('unavailable'))
    }

    pause() {
      this.paused = true
    }
  }

  const originalAudio = globalThis.Audio
  Object.defineProperty(globalThis, 'Audio', {
    value: RejectingAudio,
    configurable: true,
  })

  try {
    playSound('gentle-rain')
    await settlePlayback(200)

    const snapshot = __getSoundEngineSnapshotForTests()
    expect(snapshot.activeSoundId).toBe(null)
    expect(snapshot.activeAudio).toBe(null)
  } finally {
    Object.defineProperty(globalThis, 'Audio', {
      value: originalAudio,
      configurable: true,
    })
  }
})
