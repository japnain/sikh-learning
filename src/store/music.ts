import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Sound {
  id: string
  name: string
  icon: string
  src: string
}

export const SOUNDS: Sound[] = [
  { id: 'gentle-rain', name: 'Gentle Rain', icon: '🌧️', src: '/audio/ambient/gentle-rain.mp3' },
  { id: 'forest-canopy', name: 'Forest Canopy', icon: '🌿', src: '/audio/ambient/forest-canopy.mp3' },
  { id: 'mountain-stream', name: 'Mountain Stream', icon: '🏞️', src: '/audio/ambient/mountain-stream.mp3' },
  { id: 'sea-waves', name: 'Sea Waves', icon: '🌊', src: '/audio/ambient/sea-waves.mp3' },
  { id: 'night-meadow', name: 'Night Meadow', icon: '🌙', src: '/audio/ambient/night-meadow.mp3' },
  { id: 'temple-fountain', name: 'Temple Fountain', icon: '⛩️', src: '/audio/ambient/temple-fountain.mp3' },
]

interface MusicState {
  selectedSoundId: string | null
  isPlaying: boolean
  volume: number
  selectSound: (id: string | null) => void
  playSelected: () => void
  stopPlayback: () => void
  toggleSound: (id: string) => void
  setVolume: (v: number) => void
}

export const useMusicStore = create<MusicState>()(
  persist(
    (set) => ({
      selectedSoundId: null,
      isPlaying: false,
      volume: 0.6,
      selectSound: (id) => set({ selectedSoundId: id }),
      playSelected: () => set(state => (state.selectedSoundId ? { isPlaying: true } : state)),
      stopPlayback: () => set({ isPlaying: false }),
      toggleSound: (id) => set(state => {
        if (state.selectedSoundId === id) {
          return { isPlaying: !state.isPlaying }
        }

        return {
          selectedSoundId: id,
          isPlaying: true,
        }
      }),
      setVolume: (v) => set({ volume: v }),
    }),
    {
      name: 'sikh-music',
      partialize: (s) => ({ selectedSoundId: s.selectedSoundId, volume: s.volume }),
    }
  )
)
