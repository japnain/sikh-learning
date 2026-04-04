import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Sound {
  id: string
  name: string
  icon: string
}

export const SOUNDS: Sound[] = [
  { id: 'fireplace', name: 'Fireplace', icon: '🔥' },
  { id: 'thunderstorm', name: 'Thunderstorm', icon: '⛈️' },
  { id: 'ocean-waves', name: 'Ocean Waves', icon: '🌊' },
  { id: 'forest-campfire', name: 'Forest Campfire', icon: '🏕️' },
  { id: 'wind-chimes', name: 'Wind Chimes', icon: '🎐' },
  { id: 'night-garden', name: 'Night Garden', icon: '🌙' },
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
