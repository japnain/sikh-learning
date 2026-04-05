import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface RecitationState {
  currentShabadId: number | null
  currentTime: number
  playbackRate: number
  playing: boolean
  setCurrentShabad: (shabadId: number | null) => void
  setCurrentTime: (seconds: number) => void
  setPlaybackRate: (rate: number) => void
  setPlaying: (playing: boolean) => void
}

export const useRecitationStore = create<RecitationState>()(
  persist(
    (set, get) => ({
      currentShabadId: null,
      currentTime: 0,
      playbackRate: 1,
      playing: false,
      setCurrentShabad: (shabadId) => set({
        currentShabadId: shabadId,
        currentTime: get().currentShabadId === shabadId ? get().currentTime : 0,
        playing: false,
      }),
      setCurrentTime: (currentTime) => set({ currentTime }),
      setPlaybackRate: (playbackRate) => set({ playbackRate }),
      setPlaying: (playing) => set({ playing }),
    }),
    {
      name: 'sikh-recitation',
      partialize: (state) => ({
        currentShabadId: state.currentShabadId,
        currentTime: state.currentTime,
        playbackRate: state.playbackRate,
      }),
    }
  )
)
