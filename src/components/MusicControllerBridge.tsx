import { useEffect } from 'react'
import { useMusicStore } from '../store/music'
import {
  subscribeToSoundPlaybackFailures,
  syncSoundPlayback,
} from '../utils/soundEngine'

export default function MusicControllerBridge() {
  const selectedSoundId = useMusicStore(state => state.selectedSoundId)
  const isPlaying = useMusicStore(state => state.isPlaying)
  const volume = useMusicStore(state => state.volume)

  useEffect(() => {
    syncSoundPlayback({ selectedSoundId, isPlaying, volume })
  }, [isPlaying, selectedSoundId, volume])

  useEffect(() => subscribeToSoundPlaybackFailures(() => {
    useMusicStore.getState().reportPlaybackFailure()
  }), [])

  return null
}
