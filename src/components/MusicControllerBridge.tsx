import { useEffect } from 'react'
import { useMusicStore } from '../store/music'
import { playSound, setMasterVolume, stopSound } from '../utils/soundEngine'

export default function MusicControllerBridge() {
  const selectedSoundId = useMusicStore(state => state.selectedSoundId)
  const isPlaying = useMusicStore(state => state.isPlaying)
  const volume = useMusicStore(state => state.volume)

  useEffect(() => {
    setMasterVolume(volume)
  }, [volume])

  useEffect(() => {
    if (isPlaying && selectedSoundId) {
      playSound(selectedSoundId)
      return
    }

    stopSound()
  }, [isPlaying, selectedSoundId])

  return null
}
