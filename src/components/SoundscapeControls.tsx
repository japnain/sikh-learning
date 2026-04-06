import { Link } from 'react-router-dom'
import type { FocusContext } from '../types'
import { IconMusic, IconPause, IconPlay } from './icons'
import {
  FOCUS_PRESETS,
  SOUND_LIBRARY_TARGETS,
  SOUNDS,
  useMusicStore,
} from '../store/music'

const CATEGORY_LABELS = {
  rain: 'Rain',
  water: 'Water',
  wind: 'Wind',
  night: 'Night',
  sanctuary: 'Sanctuary',
} as const

const CONTEXT_LABELS: Record<FocusContext, string> = {
  learn: 'Learn',
  study: 'Study',
  review: 'Review',
}

function EnergyDots({ energy }: { energy: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {[1, 2, 3].map(step => (
        <span
          key={step}
          className={`h-1.5 w-4 rounded-full ${step <= energy ? 'bg-gold dark:bg-gold-light' : 'bg-sand/20 dark:bg-dark-text/15'}`}
        />
      ))}
    </div>
  )
}

interface SoundscapeControlsProps {
  context: FocusContext
  variant?: 'compact' | 'full'
}

export default function SoundscapeControls({
  context,
  variant = 'compact',
}: SoundscapeControlsProps) {
  const selectedSoundId = useMusicStore(state => state.selectedSoundId)
  const selectedPresetId = useMusicStore(state => state.selectedPresetId)
  const isPlaying = useMusicStore(state => state.isPlaying)
  const volume = useMusicStore(state => state.volume)
  const activatePreset = useMusicStore(state => state.activatePreset)
  const playSelected = useMusicStore(state => state.playSelected)
  const setVolume = useMusicStore(state => state.setVolume)
  const stopPlayback = useMusicStore(state => state.stopPlayback)
  const toggleSound = useMusicStore(state => state.toggleSound)

  const visibleSounds = SOUNDS.filter(sound => sound.recommendedContexts.includes(context))
  const selectedSound = SOUNDS.find(sound => sound.id === selectedSoundId) ?? null
  const targetLibraryCount = Object.values(SOUND_LIBRARY_TARGETS).reduce((sum, count) => sum + count, 0)

  if (variant === 'compact') {
    return (
      <section className="section-shell-quiet p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <IconMusic size={14} className="text-gold dark:text-gold-light" />
              <p className="eyebrow">Study Soundscapes</p>
            </div>
            <p className="mt-2 font-sans text-sm text-ink dark:text-dark-text">
              {selectedSound
                ? `${selectedSound.name} is ready for ${CONTEXT_LABELS[context].toLowerCase()}.`
                : `Pick a quieter bed for ${CONTEXT_LABELS[context].toLowerCase()} without pulling focus away from Gurbani.`}
            </p>
          </div>
          <Link to="/more" className="font-sans text-xs text-gold dark:text-gold-light underline underline-offset-2">
            Full library
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {FOCUS_PRESETS.map(preset => {
            const selected = selectedPresetId === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => activatePreset(preset.id)}
                className={`rounded-2xl border px-3 py-3 text-left min-h-[56px] ${
                  selected
                    ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                    : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                }`}
              >
                <p className="font-sans text-[11px] uppercase tracking-[0.18em]">{preset.name}</p>
                <p className={`mt-1 font-sans text-[11px] leading-4 ${selected ? 'text-white/80' : 'text-ink/55 dark:text-dark-text/55'}`}>
                  {preset.description}
                </p>
              </button>
            )
          })}
        </div>

        <div className="mt-4 rounded-[22px] border border-sand/15 bg-white/70 px-4 py-4 dark:border-dark-text/10 dark:bg-dark-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">
                {selectedSound?.name ?? 'No sound selected'}
              </p>
              <p className="mt-1 font-sans text-xs text-ink/55 dark:text-dark-text/55">
                {selectedSound?.description ?? `Current shipped library: ${SOUNDS.length}/${targetLibraryCount} approved slots.`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!selectedSoundId) {
                  activatePreset('focus')
                  return
                }
                if (isPlaying) {
                  stopPlayback()
                  return
                }
                playSelected()
              }}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-gradient-to-r from-saffron to-saffron-light text-white"
              aria-label={isPlaying ? 'Pause soundscape' : 'Play soundscape'}
            >
              {isPlaying ? <IconPause size={14} /> : <IconPlay size={14} />}
            </button>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45">
              Vol
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={event => setVolume(Number(event.target.value))}
              className="h-1 flex-1 accent-gold"
              aria-label="Adjust soundscape volume"
            />
          </div>
        </div>
      </section>
    )
  }

  const groupedSounds = Object.entries(CATEGORY_LABELS).map(([category, label]) => ({
    category,
    label,
    shipped: SOUNDS.filter(sound => sound.category === category),
    target: SOUND_LIBRARY_TARGETS[category as keyof typeof SOUND_LIBRARY_TARGETS],
  }))

  return (
    <section className="section-shell p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <IconMusic size={14} className="text-gold dark:text-gold-light" />
            <p className="eyebrow">Study Soundscapes</p>
          </div>
          <p className="mt-2 font-sans text-sm text-ink/65 dark:text-dark-text/65">
            Natural ambient beds only. No melody, no vocals, no sharp transients, and no fake recitation overlap.
          </p>
        </div>
        <span className="chip-pill">{SOUNDS.length}/{targetLibraryCount} bundled</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {FOCUS_PRESETS.map(preset => {
          const selected = selectedPresetId === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => activatePreset(preset.id)}
              className={`rounded-2xl px-3 py-3 text-left min-h-[60px] ${
                selected
                  ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                  : 'section-shell-quiet text-ink dark:text-dark-text'
              }`}
            >
              <p className="font-sans text-xs font-semibold uppercase tracking-[0.16em]">{preset.name}</p>
              <p className={`mt-1 font-sans text-[11px] leading-4 ${selected ? 'text-white/80' : 'text-ink/55 dark:text-dark-text/55'}`}>
                {preset.description}
              </p>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (!selectedSoundId) {
              activatePreset('focus')
              return
            }
            if (isPlaying) {
              stopPlayback()
              return
            }
            playSelected()
          }}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-gradient-to-r from-saffron to-saffron-light text-white"
          aria-label={isPlaying ? 'Pause soundscape' : 'Play soundscape'}
        >
          {isPlaying ? <IconPause size={14} /> : <IconPlay size={14} />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">
            {selectedSound?.name ?? 'Focus preset ready'}
          </p>
          <p className="mt-1 font-sans text-xs text-ink/55 dark:text-dark-text/55">
            {selectedSound?.description ?? 'Choose a preset or an individual field recording below.'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="font-sans text-xs text-ink/50 dark:text-dark-text/50">Volume</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={event => setVolume(Number(event.target.value))}
          className="h-1 flex-1 accent-gold"
          aria-label="Adjust soundscape volume"
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {groupedSounds.map(group => (
          <div key={group.category} className="section-shell-quiet px-3 py-3">
            <p className="font-sans text-xs font-semibold text-ink dark:text-dark-text">{group.label}</p>
            <p className="mt-1 font-sans text-[11px] text-ink/50 dark:text-dark-text/50">
              {group.shipped.length}/{group.target} shipped
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {visibleSounds.map(sound => {
          const selected = selectedSoundId === sound.id
          const active = selected && isPlaying
          return (
            <button
              key={sound.id}
              type="button"
              onClick={() => toggleSound(sound.id)}
              className={`w-full rounded-[24px] border px-4 py-4 text-left ${
                active
                  ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                  : selected
                    ? 'bg-saffron/8 dark:bg-saffron/12 border-saffron/25 text-ink dark:text-dark-text'
                    : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-sans text-sm font-semibold">
                    {sound.name}
                    {active ? ' · Playing' : selected ? ' · Selected' : ''}
                  </p>
                  <p className={`mt-1 font-sans text-xs leading-5 ${active ? 'text-white/80' : 'text-ink/55 dark:text-dark-text/55'}`}>
                    {sound.description}
                  </p>
                  <p className={`mt-2 font-sans text-[11px] uppercase tracking-[0.18em] ${active ? 'text-white/75' : 'text-gold dark:text-gold-light'}`}>
                    {CATEGORY_LABELS[sound.category]}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-lg">{sound.icon}</span>
                  <EnergyDots energy={sound.energy} />
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
