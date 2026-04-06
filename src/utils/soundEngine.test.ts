import { beforeEach, expect, test } from 'vitest'
import {
  __getSoundEngineSnapshotForTests,
  __resetSoundEngineForTests,
  playSound,
  setMasterVolume,
  stopSound,
} from './soundEngine'

beforeEach(() => {
  __resetSoundEngineForTests()
})

test('switching sounds stops the previous audio deterministically', async () => {
  playSound('gentle-rain')
  await Promise.resolve()
  const firstAudio = __getSoundEngineSnapshotForTests().activeAudio

  playSound('forest-canopy')
  await Promise.resolve()
  const snapshot = __getSoundEngineSnapshotForTests()

  expect(snapshot.activeSoundId).toBe('forest-canopy')
  expect(snapshot.activeAudio).not.toBe(firstAudio)
  expect(firstAudio?.paused).toBe(true)
})

test('volume changes apply directly to the active audio instance and zero stays muted', async () => {
  playSound('gentle-rain')
  await Promise.resolve()

  setMasterVolume(0.35)
  expect(__getSoundEngineSnapshotForTests().activeAudio?.volume).toBe(0.35)

  setMasterVolume(0)
  expect(__getSoundEngineSnapshotForTests().activeAudio?.volume).toBe(0)
})

test('stopSound clears the active audio instance', async () => {
  playSound('gentle-rain')
  await Promise.resolve()

  stopSound()

  const snapshot = __getSoundEngineSnapshotForTests()
  expect(snapshot.activeAudio).toBe(null)
  expect(snapshot.activeSoundId).toBe(null)
})
