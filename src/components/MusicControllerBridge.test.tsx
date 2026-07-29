import { act, render } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import { useMusicStore } from '../store/music'
import MusicControllerBridge from './MusicControllerBridge'

const soundEngineMocks = vi.hoisted(() => ({
  failureListener: null as ((failure: { soundId: string }) => void) | null,
  syncSoundPlayback: vi.fn(),
  unsubscribe: vi.fn(),
}))

vi.mock('../utils/soundEngine', () => ({
  syncSoundPlayback: soundEngineMocks.syncSoundPlayback,
  subscribeToSoundPlaybackFailures: vi.fn((listener: (failure: { soundId: string }) => void) => {
    soundEngineMocks.failureListener = listener
    return soundEngineMocks.unsubscribe
  }),
}))

beforeEach(() => {
  soundEngineMocks.failureListener = null
  soundEngineMocks.syncSoundPlayback.mockReset()
  soundEngineMocks.unsubscribe.mockReset()
  useMusicStore.setState({
    selectedSoundId: 'gentle-rain',
    selectedPresetId: null,
    isPlaying: true,
    playbackError: null,
    volume: 0.6,
  })
})

test('stops the visible playback state when the audio engine exhausts its sources', () => {
  const view = render(<MusicControllerBridge />)

  expect(soundEngineMocks.failureListener).not.toBe(null)

  act(() => {
    soundEngineMocks.failureListener?.({ soundId: 'gentle-rain' })
  })

  expect(useMusicStore.getState()).toMatchObject({
    selectedSoundId: 'gentle-rain',
    isPlaying: false,
    playbackError: 'unavailable',
  })

  view.unmount()
  expect(soundEngineMocks.unsubscribe).toHaveBeenCalledOnce()
})
