import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { SOUNDS } from '../store/music'
import {
  __getSoundEngineSnapshotForTests,
  __resetSoundEngineForTests,
  playSound,
  setMasterVolume,
  stopSound,
  subscribeToSoundPlaybackFailures,
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

test('pausing during a track switch cancels the queued track and silences the fading audio immediately', async () => {
  playSound('gentle-rain')
  await settlePlayback()
  const firstAudio = __getSoundEngineSnapshotForTests().activeAudio
  playSound('forest-canopy')
  await settlePlayback(100)
  stopSound()
  expect(firstAudio?.paused).toBe(true)
  await settlePlayback()
  expect(__getSoundEngineSnapshotForTests().activeSoundId).toBeNull()
  expect(vi.getTimerCount()).toBe(0)
})

test('rapid switches and pause leave no untracked audio or delayed starts', async () => {
  playSound('gentle-rain')
  await settlePlayback()
  const firstAudio = __getSoundEngineSnapshotForTests().activeAudio
  playSound('forest-canopy')
  await settlePlayback(100)
  playSound('sea-waves')
  await settlePlayback(100)
  const latestAudio = __getSoundEngineSnapshotForTests().activeAudio
  stopSound()
  expect(firstAudio?.paused).toBe(true)
  expect(latestAudio?.paused).toBe(true)
  await settlePlayback()
  expect(__getSoundEngineSnapshotForTests().activeSoundId).toBeNull()
  expect(vi.getTimerCount()).toBe(0)
})

test('an immediate pause cancels an earlier soft stop fade', async () => {
  playSound('gentle-rain')
  await settlePlayback()
  const audio = __getSoundEngineSnapshotForTests().activeAudio
  stopSound(false)
  stopSound()
  expect(audio?.paused).toBe(true)
  expect(vi.getTimerCount()).toBe(0)
})

test.each(['resolve', 'reject'] as const)('a stale play promise that %ss cannot stop the latest play of the same sound', async outcome => {
  const pending: Array<{ resolve: () => void; reject: () => void }> = []
  class DeferredAudio {
    loop = false
    preload = 'auto'
    volume = 1
    currentTime = 0
    paused = true
    play() {
      this.paused = false
      return new Promise<void>((resolve, reject) => pending.push({ resolve, reject: () => reject(new Error('cancelled')) }))
    }
    pause() { this.paused = true }
  }
  const originalAudio = globalThis.Audio
  Object.defineProperty(globalThis, 'Audio', { value: DeferredAudio, configurable: true })
  try {
    playSound('gentle-rain')
    const audio = __getSoundEngineSnapshotForTests().activeAudio
    playSound('gentle-rain')
    pending[1].resolve()
    await settlePlayback()
    pending[0][outcome]()
    await settlePlayback()
    expect(__getSoundEngineSnapshotForTests().activeAudio).toBe(audio)
    expect(audio?.paused).toBe(false)
    expect(audio?.volume).toBe(0.6)
  } finally {
    stopSound()
    Object.defineProperty(globalThis, 'Audio', { value: originalAudio, configurable: true })
  }
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

test('a cloud playback failure retries the local copy once without interrupting the selected sound', async () => {
  const sound = SOUNDS.find(entry => entry.id === 'gentle-rain')!
  const originalSources = { src: sound.src, fallbackSrc: sound.fallbackSrc }
  const cloudSrc = 'https://naamras-qa.supabase.co/storage/v1/object/public/naamras-audio/ambient/gentle-rain.mp3'
  const localSrc = '/audio/ambient/gentle-rain.mp3'
  const requestedSources: string[] = []
  const onPlaybackFailure = vi.fn()
  const unsubscribe = subscribeToSoundPlaybackFailures(onPlaybackFailure)
  const originalAudio = globalThis.Audio

  class CloudFallbackAudio {
    src: string
    preload = 'auto'
    loop = false
    volume = 1
    currentTime = 0
    paused = true

    constructor(src: string) {
      this.src = src
      requestedSources.push(src)
    }

    play() {
      this.paused = false
      return this.src === cloudSrc ? Promise.reject(new Error('cloud unavailable')) : Promise.resolve()
    }

    pause() { this.paused = true }
  }

  Object.assign(sound, { src: cloudSrc, fallbackSrc: localSrc })
  Object.defineProperty(globalThis, 'Audio', { value: CloudFallbackAudio, configurable: true })

  try {
    playSound(sound.id)
    await settlePlayback()
    const snapshot = __getSoundEngineSnapshotForTests()
    expect(requestedSources).toEqual([cloudSrc, localSrc])
    expect(snapshot.activeSoundId).toBe(sound.id)
    expect(snapshot.activeAudio?.src).toBe(localSrc)
    expect(snapshot.activeAudio?.paused).toBe(false)
    expect(onPlaybackFailure).not.toHaveBeenCalled()
  } finally {
    stopSound()
    unsubscribe()
    Object.assign(sound, originalSources)
    Object.defineProperty(globalThis, 'Audio', { value: originalAudio, configurable: true })
  }
})

test('fallback failure leaves the engine fully stopped', async () => {
  const onPlaybackFailure = vi.fn()
  const unsubscribe = subscribeToSoundPlaybackFailures(onPlaybackFailure)
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
    expect(onPlaybackFailure).toHaveBeenCalledOnce()
    expect(onPlaybackFailure).toHaveBeenCalledWith({ soundId: 'gentle-rain' })
  } finally {
    unsubscribe()
    Object.defineProperty(globalThis, 'Audio', {
      value: originalAudio,
      configurable: true,
    })
  }
})
