import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  __getSoundEngineSnapshotForTests,
  __resetSoundEngineForTests,
  playSound,
  setMasterVolume,
  stopSound,
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

  stopSound()
  await settlePlayback(700)

  const snapshot = __getSoundEngineSnapshotForTests()
  expect(snapshot.activeAudio).toBe(null)
  expect(snapshot.activeSoundId).toBe(null)
})
