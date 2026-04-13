import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getLocalAmbientSoundSrc, resolveAmbientSoundSrc } from '../insforge/audio'
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
  fallbackSrc?: string
  category: SoundCategory
  description: string
  energy: 1 | 2 | 3
  recommendedContexts: FocusContext[]
  qualityApproved: boolean
}

export const SOUND_LIBRARY_TARGETS: Record<SoundCategory, number> = {
  rain: 1,
  water: 2,
  wind: 1,
  night: 1,
  sanctuary: 1,
}

export const SOUNDS: Sound[] = [
  {
    id: 'gentle-rain',
    name: 'Heavy Thunderstorm',
    icon: '⛈️',
    src: resolveAmbientSoundSrc('gentle-rain.mp3'),
    fallbackSrc: getLocalAmbientSoundSrc('gentle-rain.mp3'),
    category: 'rain',
    description: 'Dense rain and low thunder for immersive focus without melody or speech.',
    energy: 2,
    recommendedContexts: ['study', 'review'],
    qualityApproved: true,
  },
  {
    id: 'forest-canopy',
    name: 'Library Ambience',
    icon: '📚',
    src: resolveAmbientSoundSrc('forest-canopy.mp3'),
    fallbackSrc: getLocalAmbientSoundSrc('forest-canopy.mp3'),
    category: 'wind',
    description: 'A calm study-room bed with subtle room tone and quiet movement for reading sessions.',
    energy: 1,
    recommendedContexts: ['study', 'review'],
    qualityApproved: true,
  },
  {
    id: 'mountain-stream',
    name: 'Harbor Drift',
    icon: '⚓',
    src: resolveAmbientSoundSrc('mountain-stream.mp3'),
    fallbackSrc: getLocalAmbientSoundSrc('mountain-stream.mp3'),
    category: 'water',
    description: 'Open harbor water and distant shore movement for steady, spacious concentration.',
    energy: 2,
    recommendedContexts: ['learn', 'study'],
    qualityApproved: true,
  },
  {
    id: 'sea-waves',
    name: 'Deep Ocean Waves',
    icon: '🌊',
    src: resolveAmbientSoundSrc('sea-waves.mp3'),
    fallbackSrc: getLocalAmbientSoundSrc('sea-waves.mp3'),
    category: 'water',
    description: 'Slow repeating surf that settles pacing during longer passages.',
    energy: 1,
    recommendedContexts: ['study', 'review'],
    qualityApproved: true,
  },
  {
    id: 'night-meadow',
    name: 'Fireside Crackle',
    icon: '🔥',
    src: resolveAmbientSoundSrc('night-meadow.mp3'),
    fallbackSrc: getLocalAmbientSoundSrc('night-meadow.mp3'),
    category: 'night',
    description: 'Soft fireplace crackle that keeps evening study warm and low-distraction.',
    energy: 1,
    recommendedContexts: ['study', 'review'],
    qualityApproved: true,
  },
  {
    id: 'temple-fountain',
    name: 'Fireplace Glow',
    icon: '🪵',
    src: resolveAmbientSoundSrc('temple-fountain.mp3'),
    fallbackSrc: getLocalAmbientSoundSrc('temple-fountain.mp3'),
    category: 'sanctuary',
    description: 'A closer hearth bed for quiet repetition, reflection, and slower sessions.',
    energy: 1,
    recommendedContexts: ['learn', 'study'],
    qualityApproved: true,
  },
]

export const FOCUS_PRESETS: FocusPreset[] = [
  {
    id: 'settle',
    name: 'Settle',
    description: 'Ease into the session with a warm fireplace bed.',
    soundId: 'temple-fountain',
    recommendedContexts: ['learn', 'study'],
    defaultVolume: 0.5,
  },
  {
    id: 'focus',
    name: 'Focus',
    description: 'Use open harbor water for steady reading concentration.',
    soundId: 'mountain-stream',
    recommendedContexts: ['learn', 'study', 'review'],
    defaultVolume: 0.55,
  },
  {
    id: 'night',
    name: 'Night',
    description: 'Keep late review quiet with a softer fireside crackle.',
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
