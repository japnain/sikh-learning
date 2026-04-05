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
  currentSound: string | null
  playing: boolean
  volume: number
  setSound: (id: string | null) => void
  setPlaying: (playing: boolean) => void
  setVolume: (v: number) => void
}

export const useMusicStore = create<MusicState>()(
  persist(
    (set) => ({
      currentSound: null,
      playing: false,
      volume: 0.6,
      setSound: (id) => set({ currentSound: id, playing: id !== null }),
      setPlaying: (playing) => set({ playing }),
      setVolume: (v) => set({ volume: v }),
    }),
    { name: 'sikh-music', partialize: (s) => ({ currentSound: s.currentSound, volume: s.volume }) }
  )
)
