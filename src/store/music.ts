import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  FocusContext,
  FocusPreset,
  FocusPresetId,
  SoundCategory,
} from '../types'

export interface Sound {
  id: string
  name: string
  icon: string
  src: string
  category: SoundCategory
  description: string
  energy: 1 | 2 | 3
  recommendedContexts: FocusContext[]
  qualityApproved: boolean
}

export const SOUND_LIBRARY_TARGETS: Record<SoundCategory, number> = {
  rain: 3,
  water: 4,
  wind: 2,
  night: 2,
  sanctuary: 3,
}

export const SOUNDS: Sound[] = [
  {
    id: 'gentle-rain',
    name: 'Gentle Rain',
    icon: '🌧️',
    src: '/audio/ambient/gentle-rain.mp3',
    category: 'rain',
    description: 'A steady warm rain bed for quiet repetition and low-friction focus.',
    energy: 1,
    recommendedContexts: ['learn', 'study', 'review'],
    qualityApproved: true,
  },
  {
    id: 'forest-canopy',
    name: 'Forest Canopy',
    icon: '🌿',
    src: '/audio/ambient/forest-canopy.mp3',
    category: 'wind',
    description: 'Soft canopy movement that keeps the room feeling open without pulling attention.',
    energy: 2,
    recommendedContexts: ['study', 'review'],
    qualityApproved: true,
  },
  {
    id: 'mountain-stream',
    name: 'Mountain Stream',
    icon: '🏞️',
    src: '/audio/ambient/mountain-stream.mp3',
    category: 'water',
    description: 'Clear moving water for long reading blocks and deep concentration.',
    energy: 2,
    recommendedContexts: ['learn', 'study'],
    qualityApproved: true,
  },
  {
    id: 'sea-waves',
    name: 'Sea Waves',
    icon: '🌊',
    src: '/audio/ambient/sea-waves.mp3',
    category: 'water',
    description: 'Wide slow wave motion that settles pacing during extended passages.',
    energy: 1,
    recommendedContexts: ['study', 'review'],
    qualityApproved: true,
  },
  {
    id: 'night-meadow',
    name: 'Night Meadow',
    icon: '🌙',
    src: '/audio/ambient/night-meadow.mp3',
    category: 'night',
    description: 'A dim nocturnal texture for evening study and low-stimulation review.',
    energy: 1,
    recommendedContexts: ['study', 'review'],
    qualityApproved: true,
  },
  {
    id: 'temple-fountain',
    name: 'Temple Fountain',
    icon: '⛩️',
    src: '/audio/ambient/temple-fountain.mp3',
    category: 'sanctuary',
    description: 'A contained water-and-space bed that feels centered and devotional.',
    energy: 1,
    recommendedContexts: ['learn', 'study'],
    qualityApproved: true,
  },
]

export const FOCUS_PRESETS: FocusPreset[] = [
  {
    id: 'settle',
    name: 'Settle',
    description: 'Ease into the session with a softer sanctuary bed.',
    soundId: 'temple-fountain',
    recommendedContexts: ['learn', 'study'],
    defaultVolume: 0.5,
  },
  {
    id: 'focus',
    name: 'Focus',
    description: 'Use steady moving water for extended reading concentration.',
    soundId: 'mountain-stream',
    recommendedContexts: ['learn', 'study', 'review'],
    defaultVolume: 0.55,
  },
  {
    id: 'night',
    name: 'Night',
    description: 'Lower the stimulation for late and quiet review windows.',
    soundId: 'night-meadow',
    recommendedContexts: ['study', 'review'],
    defaultVolume: 0.42,
  },
]

function findPresetBySoundId(soundId: string | null): FocusPreset | null {
  if (!soundId) return null
  return FOCUS_PRESETS.find(preset => preset.soundId === soundId) ?? null
}

interface MusicState {
  selectedSoundId: string | null
  selectedPresetId: FocusPresetId | null
  isPlaying: boolean
  volume: number
  selectSound: (id: string | null) => void
  toggleSound: (id: string) => void
  playSelected: () => void
  stopPlayback: () => void
  activatePreset: (presetId: FocusPresetId) => void
  setPreset: (presetId: FocusPresetId | null) => void
  setVolume: (v: number) => void
}

type PersistedMusicState = Partial<Pick<MusicState, 'selectedSoundId' | 'selectedPresetId' | 'volume'>>

export const useMusicStore = create<MusicState>()(
  persist(
    (set) => ({
      selectedSoundId: null,
      selectedPresetId: null,
      isPlaying: false,
      volume: 0.6,
      selectSound: (id) => set(() => ({
        selectedSoundId: id,
        selectedPresetId: id ? findPresetBySoundId(id)?.id ?? null : null,
      })),
      toggleSound: (id) => set(state => {
        if (state.selectedSoundId === id) {
          return { isPlaying: !state.isPlaying }
        }

        return {
          selectedSoundId: id,
          selectedPresetId: findPresetBySoundId(id)?.id ?? null,
          isPlaying: true,
        }
      }),
      playSelected: () => set(state => (state.selectedSoundId ? { isPlaying: true } : state)),
      stopPlayback: () => set({ isPlaying: false }),
      activatePreset: (presetId) => {
        const preset = FOCUS_PRESETS.find(entry => entry.id === presetId)
        if (!preset) return

        set({
          selectedPresetId: presetId,
          selectedSoundId: preset.soundId,
          volume: preset.defaultVolume,
          isPlaying: true,
        })
      },
      setPreset: (presetId) => {
        if (!presetId) {
          set({ selectedPresetId: null })
          return
        }

        const preset = FOCUS_PRESETS.find(entry => entry.id === presetId)
        if (!preset) return

        set({
          selectedPresetId: presetId,
          selectedSoundId: preset.soundId,
        })
      },
      setVolume: (v) => set({ volume: v }),
    }),
    {
      name: 'sikh-music',
      version: 2,
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as PersistedMusicState | undefined),
        isPlaying: false,
      }),
      partialize: (state) => ({
        selectedSoundId: state.selectedSoundId,
        selectedPresetId: state.selectedPresetId,
        volume: state.volume,
      }),
      migrate: (persistedState, version) => {
        const persisted = (persistedState ?? {}) as PersistedMusicState

        if (version < 2) {
          return {
            selectedSoundId: persisted.selectedSoundId ?? null,
            selectedPresetId: findPresetBySoundId(persisted.selectedSoundId ?? null)?.id ?? null,
            volume: persisted.volume ?? 0.6,
          }
        }

        return {
          selectedSoundId: persisted.selectedSoundId ?? null,
          selectedPresetId: persisted.selectedPresetId
            ?? findPresetBySoundId(persisted.selectedSoundId ?? null)?.id
            ?? null,
          volume: persisted.volume ?? 0.6,
        }
      },
    }
  )
)
