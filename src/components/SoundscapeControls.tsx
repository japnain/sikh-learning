import { Link } from 'react-router-dom'
import type { FocusContext, UiLocale } from '../types'
import { IconChevronDown, IconChevronUp, IconMusic, IconPause, IconPlay } from './icons'
import { usePersistentDisclosure } from '../hooks/usePersistentDisclosure'
import {
  FOCUS_PRESETS,
  SOUND_LIBRARY_TARGETS,
  SOUNDS,
  useMusicStore,
} from '../store/music'
import { useLocaleStore } from '../store/locale'

const CATEGORY_LABELS: Record<UiLocale, Record<keyof typeof SOUND_LIBRARY_TARGETS, string>> = {
  en: {
    rain: 'Storm',
    water: 'Water',
    wind: 'Study',
    night: 'Fireside',
    sanctuary: 'Hearth',
  },
  pa: {
    rain: 'ਤੂਫ਼ਾਨ',
    water: 'ਪਾਣੀ',
    wind: 'ਅਧਿਐਨ',
    night: 'ਅੰਗੀਠੀ',
    sanctuary: 'ਚੁੱਲ੍ਹਾ',
  },
  hi: {
    rain: 'तूफ़ान',
    water: 'पानी',
    wind: 'अध्ययन',
    night: 'अंगीठी',
    sanctuary: 'चूल्हा',
  },
}

const CONTEXT_LABELS: Record<UiLocale, Record<FocusContext, string>> = {
  en: {
    study: 'Study',
    review: 'Review',
  },
  pa: {
    study: 'ਅਧਿਐਨ',
    review: 'ਦੁਹਰਾਈ',
  },
  hi: {
    study: 'अध्ययन',
    review: 'रिव्यू',
  },
}

const SOUND_TEXT: Record<UiLocale, Record<string, { name: string; description: string }>> = {
  en: {
    'gentle-rain': {
      name: 'Heavy Thunderstorm',
      description: 'Dense rain and low thunder for immersive focus without melody or speech.',
    },
    'forest-canopy': {
      name: 'Library Ambience',
      description: 'A calm study-room bed with subtle room tone and quiet movement for reading sessions.',
    },
    'mountain-stream': {
      name: 'Harbor Drift',
      description: 'Open harbor water and distant shore movement for steady, spacious concentration.',
    },
    'sea-waves': {
      name: 'Deep Ocean Waves',
      description: 'Slow repeating surf that settles pacing during longer passages.',
    },
    'night-meadow': {
      name: 'Fireside Crackle',
      description: 'Soft fireplace crackle that keeps evening study warm and low-distraction.',
    },
    'temple-fountain': {
      name: 'Fireplace Glow',
      description: 'A closer hearth bed for quiet repetition, reflection, and slower sessions.',
    },
  },
  pa: {
    'gentle-rain': {
      name: 'ਭਾਰੀ ਤੂਫ਼ਾਨੀ ਮੀਂਹ',
      description: 'ਬਿਨਾਂ ਧੁਨ ਜਾਂ ਬੋਲਾਂ ਦੇ ਡੂੰਘੇ ਧਿਆਨ ਲਈ ਘਣਾ ਮੀਂਹ ਅਤੇ ਹੌਲੀ ਗਰਜ।',
    },
    'forest-canopy': {
      name: 'ਲਾਇਬ੍ਰੇਰੀ ਮਾਹੌਲ',
      description: 'ਪੜ੍ਹਾਈ ਦੌਰਾਨ ਲਈ ਨਰਮ ਕਮਰੇ ਦੀ ਆਵਾਜ਼ ਅਤੇ ਹੌਲੀ ਹਿਲਚਲ ਵਾਲਾ ਸ਼ਾਂਤ ਮਾਹੌਲ।',
    },
    'mountain-stream': {
      name: 'ਬੰਦਰਗਾਹ ਦਾ ਰੁਖ',
      description: 'ਧਿਆਨ ਲਈ ਖੁੱਲ੍ਹੇ ਪਾਣੀ ਅਤੇ ਦੂਰਲੇ ਕੰਢੇ ਦੀ ਹੌਲੀ ਹਿਲਚਲ।',
    },
    'sea-waves': {
      name: 'ਡੂੰਘੀਆਂ ਸਮੁੰਦਰੀ ਲਹਿਰਾਂ',
      description: 'ਲੰਬੇ ਪਾਠ ਦੌਰਾਨ ਰਫ਼ਤਾਰ ਸੰਭਾਲਣ ਲਈ ਹੌਲੀ ਮੁੜ ਆਉਂਦੀ ਸਰਫ਼ ਧੁਨ।',
    },
    'night-meadow': {
      name: 'ਅੰਗੀਠੀ ਦੀ ਕਰਕੜਾਹਟ',
      description: 'ਸ਼ਾਮ ਦੇ ਅਧਿਐਨ ਨੂੰ ਗਰਮ ਅਤੇ ਬਿਨਾਂ ਵਿਘਨ ਰੱਖਣ ਲਈ ਨਰਮ ਅੰਗੀਠੀ ਧੁਨ।',
    },
    'temple-fountain': {
      name: 'ਫਾਇਰਪਲੇਸ ਦੀ ਗਰਮੀ',
      description: 'ਸ਼ਾਂਤ ਦੁਹਰਾਈ, ਮਨਨ ਅਤੇ ਹੌਲੇ ਸੈਸ਼ਨਾਂ ਲਈ ਨੇੜਲੀ ਅੱਗ ਦੀ ਪਿਛੋਕੜ।',
    },
  },
  hi: {
    'gentle-rain': {
      name: 'भारी गरज के साथ बारिश',
      description: 'बिना धुन या बोल के गहरे ध्यान के लिए घनी बारिश और हल्की गरज।',
    },
    'forest-canopy': {
      name: 'लाइब्रेरी माहौल',
      description: 'पढ़ाई के लिए शांत कमरे की ध्वनि और हल्की गतिविधि वाला संतुलित माहौल।',
    },
    'mountain-stream': {
      name: 'बंदरगाह की लय',
      description: 'स्थिर और खुले एकाग्र ध्यान के लिए पानी और दूर के किनारे की हल्की गति।',
    },
    'sea-waves': {
      name: 'गहरे सागर की लहरें',
      description: 'लंबे पाठ के दौरान गति को स्थिर करने वाली धीमी लौटती हुई लहरें।',
    },
    'night-meadow': {
      name: 'अंगीठी की चटख',
      description: 'शाम के अध्ययन को गर्म और कम-विघ्न रखने वाली नरम आग की ध्वनि।',
    },
    'temple-fountain': {
      name: 'फायरप्लेस की गर्माहट',
      description: 'शांत दोहराव, मनन और धीमे सत्रों के लिए पास की आग की पृष्ठभूमि।',
    },
  },
}

const PRESET_TEXT: Record<UiLocale, Record<string, { name: string; description: string }>> = {
  en: {
    settle: {
      name: 'Settle',
      description: 'Ease into the session with a warm fireplace bed.',
    },
    focus: {
      name: 'Focus',
      description: 'Use open harbor water for steady reading concentration.',
    },
    night: {
      name: 'Night',
      description: 'Keep late review quiet with a softer fireside crackle.',
    },
  },
  pa: {
    settle: {
      name: 'ਥਿਰ ਹੋਵੋ',
      description: 'ਗਰਮ ਫਾਇਰਪਲੇਸ ਧੁਨ ਨਾਲ ਸੈਸ਼ਨ ਵਿੱਚ ਆਰਾਮ ਨਾਲ ਉਤਰੋ।',
    },
    focus: {
      name: 'ਧਿਆਨ',
      description: 'ਪੜ੍ਹਾਈ ਦੇ ਧਿਆਨ ਲਈ ਖੁੱਲ੍ਹੇ ਬੰਦਰਗਾਹ ਪਾਣੀ ਦੀ ਧੁਨ ਵਰਤੋ।',
    },
    night: {
      name: 'ਰਾਤ',
      description: 'ਦੇਰ ਦੀ ਦੁਹਰਾਈ ਲਈ ਨਰਮ ਅੰਗੀਠੀ ਧੁਨ ਰੱਖੋ।',
    },
  },
  hi: {
    settle: {
      name: 'स्थिर',
      description: 'गरम फायरप्लेस ध्वनि के साथ सत्र में धीरे उतरें।',
    },
    focus: {
      name: 'एकाग्र',
      description: 'स्थिर पढ़ाई के लिए खुले बंदरगाह के पानी की ध्वनि चुनें।',
    },
    night: {
      name: 'रात',
      description: 'देर के रिव्यू के लिए नरम अंगीठी की ध्वनि रखें।',
    },
  },
}

const SOUNDSCAPE_COPY: Record<UiLocale, {
  eyebrow: string
  compactReady: (context: string, soundName: string) => string
  compactFallback: (context: string) => string
  fullBody: string
  fullLibrary: string
  bundled: (count: number, total: number) => string
  presetReady: (presetName: string) => string
  defaultReady: string
  defaultSummary: string
  volume: string
  collapse: string
  expand: string
  play: string
  pause: string
  playing: string
  selected: string
  playbackUnavailable: string
  shipped: (count: number, target: number) => string
}> = {
  en: {
    eyebrow: 'Study Soundscapes',
    compactReady: (context, soundName) => `${soundName} is ready for ${context.toLowerCase()}.`,
    compactFallback: context => `Pick a quieter bed for ${context.toLowerCase()} without pulling focus away from Gurbani.`,
    fullBody: 'Ambient focus beds only. No melody, no vocals, no sharp transients, and no spoken overlap.',
    fullLibrary: 'Full library',
    bundled: (count, total) => `${count}/${total} bundled`,
    presetReady: presetName => `${presetName} preset ready`,
    defaultReady: 'Focus preset ready',
    defaultSummary: 'Choose a preset or an individual ambient track below.',
    volume: 'Volume',
    collapse: 'Collapse soundscapes',
    expand: 'Expand soundscapes',
    play: 'Play soundscape',
    pause: 'Pause soundscape',
    playing: 'Playing',
    selected: 'Selected',
    playbackUnavailable: 'This sound could not be played. Check your connection and try again.',
    shipped: (count, target) => `${count}/${target} shipped`,
  },
  pa: {
    eyebrow: 'ਅਧਿਐਨ ਸਾਊਂਡਸਕੇਪ',
    compactReady: (context, soundName) => `${soundName} ${context.toLowerCase()} ਲਈ ਤਿਆਰ ਹੈ।`,
    compactFallback: context => `${context.toLowerCase()} ਲਈ ਹੌਲਾ ਪਿਛੋਕੜ ਚੁਣੋ ਜੋ ਗੁਰਬਾਣੀ ਤੋਂ ਧਿਆਨ ਨਾ ਖਿੱਚੇ।`,
    fullBody: 'ਕੇਵਲ ਧਿਆਨ ਲਈ ਆਸ-ਪਾਸ ਦੀਆਂ ਧੁਨਾਂ। ਨਾ ਕੋਈ ਧੁਨ, ਨਾ ਗਾਇਕੀ, ਨਾ ਤੀਖੇ ਝਟਕੇ, ਨਾ ਬੋਲੀ ਮਿਲਾਵਟ।',
    fullLibrary: 'ਪੂਰੀ ਲਾਇਬ੍ਰੇਰੀ',
    bundled: (count, total) => `${count}/${total} ਸ਼ਾਮਲ`,
    presetReady: presetName => `${presetName} ਪ੍ਰੀਸੈਟ ਤਿਆਰ`,
    defaultReady: 'ਧਿਆਨ ਪ੍ਰੀਸੈਟ ਤਿਆਰ',
    defaultSummary: 'ਹੇਠਾਂ ਤੋਂ ਪ੍ਰੀਸੈਟ ਜਾਂ ਇਕੱਲਾ ਐਂਬੀਅਂਟ ਟਰੈਕ ਚੁਣੋ।',
    volume: 'ਆਵਾਜ਼',
    collapse: 'ਸਾਊਂਡਸਕੇਪ ਸਿਮਟਾਓ',
    expand: 'ਸਾਊਂਡਸਕੇਪ ਖੋਲ੍ਹੋ',
    play: 'ਸਾਊਂਡਸਕੇਪ ਚਲਾਓ',
    pause: 'ਸਾਊਂਡਸਕੇਪ ਰੋਕੋ',
    playing: 'ਚੱਲ ਰਿਹਾ',
    selected: 'ਚੁਣਿਆ',
    playbackUnavailable: 'ਇਹ ਧੁਨ ਨਹੀਂ ਚੱਲ ਸਕੀ। ਆਪਣਾ ਇੰਟਰਨੈੱਟ ਕਨੈਕਸ਼ਨ ਜਾਂਚੋ ਅਤੇ ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    shipped: (count, target) => `${count}/${target} ਸ਼ਾਮਲ`,
  },
  hi: {
    eyebrow: 'अध्ययन साउंडस्केप',
    compactReady: (context, soundName) => `${soundName} ${context.toLowerCase()} के लिए तैयार है।`,
    compactFallback: context => `${context.toLowerCase()} के लिए शांत पृष्ठभूमि चुनें जो गुरबाणी से ध्यान न खींचे।`,
    fullBody: 'सिर्फ एकाग्रता के लिए वातावरण। न धुन, न स्वर, न तेज़ ट्रांज़िएंट, न बोली का ओवरलैप।',
    fullLibrary: 'पूरी लाइब्रेरी',
    bundled: (count, total) => `${count}/${total} शामिल`,
    presetReady: presetName => `${presetName} प्रीसेट तैयार`,
    defaultReady: 'फोकस प्रीसेट तैयार',
    defaultSummary: 'नीचे से कोई प्रीसेट या एकल एम्बिएंट ट्रैक चुनें।',
    volume: 'आवाज़',
    collapse: 'साउंडस्केप समेटें',
    expand: 'साउंडस्केप खोलें',
    play: 'साउंडस्केप चलाएँ',
    pause: 'साउंडस्केप रोकें',
    playing: 'चल रहा',
    selected: 'चुना गया',
    playbackUnavailable: 'यह ध्वनि नहीं चल सकी। अपना इंटरनेट कनेक्शन जाँचें और फिर कोशिश करें।',
    shipped: (count, target) => `${count}/${target} शामिल`,
  },
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
  storageKey?: string | null
  defaultExpanded?: boolean
}

export default function SoundscapeControls({
  context,
  variant = 'compact',
  storageKey = null,
  defaultExpanded = variant === 'full',
}: SoundscapeControlsProps) {
  const locale = useLocaleStore(state => state.locale)
  const copy = SOUNDSCAPE_COPY[locale]
  const categoryLabels = CATEGORY_LABELS[locale]
  const contextLabels = CONTEXT_LABELS[locale]
  const selectedSoundId = useMusicStore(state => state.selectedSoundId)
  const selectedPresetId = useMusicStore(state => state.selectedPresetId)
  const isPlaying = useMusicStore(state => state.isPlaying)
  const playbackError = useMusicStore(state => state.playbackError)
  const volume = useMusicStore(state => state.volume)
  const activatePreset = useMusicStore(state => state.activatePreset)
  const playSelected = useMusicStore(state => state.playSelected)
  const setVolume = useMusicStore(state => state.setVolume)
  const stopPlayback = useMusicStore(state => state.stopPlayback)
  const toggleSound = useMusicStore(state => state.toggleSound)
  const [isExpanded, setIsExpanded] = usePersistentDisclosure(storageKey, defaultExpanded)

  const visibleSounds = SOUNDS.filter(sound => sound.recommendedContexts.includes(context))
  const selectedSound = SOUNDS.find(sound => sound.id === selectedSoundId) ?? null
  const selectedPreset = FOCUS_PRESETS.find(preset => preset.id === selectedPresetId) ?? null
  const targetLibraryCount = Object.values(SOUND_LIBRARY_TARGETS).reduce((sum, count) => sum + count, 0)
  const panelId = `soundscape-panel-${context}-${variant}`

  const selectedSoundText = selectedSound ? SOUND_TEXT[locale][selectedSound.id] ?? SOUND_TEXT.en[selectedSound.id] : null
  const selectedPresetText = selectedPreset ? PRESET_TEXT[locale][selectedPreset.id] ?? PRESET_TEXT.en[selectedPreset.id] : null

  const summaryTitle = selectedSoundText?.name
    ?? (selectedPresetText ? copy.presetReady(selectedPresetText.name) : copy.defaultReady)
  const summaryBody = selectedSoundText?.description
    ?? selectedPresetText?.description
    ?? copy.defaultSummary

  const headerBody = variant === 'compact'
    ? (
      selectedSoundText
        ? copy.compactReady(contextLabels[context], selectedSoundText.name)
        : copy.compactFallback(contextLabels[context])
    )
    : copy.fullBody

  const groupedSounds = Object.entries(categoryLabels).map(([category, label]) => ({
    category,
    label,
    shipped: SOUNDS.filter(sound => sound.category === category),
    target: SOUND_LIBRARY_TARGETS[category as keyof typeof SOUND_LIBRARY_TARGETS],
  }))

  const handlePlaybackToggle = () => {
    if (!selectedSoundId) {
      activatePreset('focus')
      return
    }

    if (isPlaying) {
      stopPlayback()
      return
    }

    playSelected()
  }

  const details = variant === 'compact' ? (
    <div id={panelId} hidden={!isExpanded}>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {FOCUS_PRESETS.map(preset => {
          const selected = selectedPresetId === preset.id
          const presetText = PRESET_TEXT[locale][preset.id] ?? PRESET_TEXT.en[preset.id]

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => activatePreset(preset.id)}
              className={`min-h-[56px] rounded-lg border px-3 py-3 text-left ${
                selected
                  ? 'border-saffron bg-saffron text-white'
                  : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
              }`}
            >
              <p className="font-sans text-[11px] uppercase tracking-[0.18em]">{presetText.name}</p>
              <p className={`mt-1 font-sans text-[11px] leading-4 ${selected ? 'text-white/80' : 'text-ink/68 dark:text-dark-text/64'}`}>
                {presetText.description}
              </p>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/68 dark:text-dark-text/64">
          {copy.volume}
        </span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={event => setVolume(Number(event.target.value))}
          className="h-1 flex-1 accent-gold"
          aria-label={copy.volume}
        />
      </div>
    </div>
  ) : (
    <div id={panelId} hidden={!isExpanded}>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {FOCUS_PRESETS.map(preset => {
          const selected = selectedPresetId === preset.id
          const presetText = PRESET_TEXT[locale][preset.id] ?? PRESET_TEXT.en[preset.id]

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => activatePreset(preset.id)}
              className={`min-h-[60px] rounded-lg px-3 py-3 text-left ${
                selected
                  ? 'bg-saffron text-white'
                  : 'section-shell-quiet text-ink dark:text-dark-text'
              }`}
            >
              <p className="font-sans text-xs font-semibold uppercase tracking-[0.16em]">{presetText.name}</p>
              <p className={`mt-1 font-sans text-[11px] leading-4 ${selected ? 'text-white/80' : 'text-ink/68 dark:text-dark-text/64'}`}>
                {presetText.description}
              </p>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="font-sans text-xs text-ink/68 dark:text-dark-text/64">{copy.volume}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={event => setVolume(Number(event.target.value))}
          className="h-1 flex-1 accent-gold"
          aria-label={copy.volume}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {groupedSounds.map(group => (
          <div key={group.category} className="section-shell-quiet px-3 py-3">
            <p className="font-sans text-xs font-semibold text-ink dark:text-dark-text">{group.label}</p>
            <p className="mt-1 font-sans text-[11px] text-ink/68 dark:text-dark-text/64">
              {copy.shipped(group.shipped.length, group.target)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {visibleSounds.map(sound => {
          const selected = selectedSoundId === sound.id
          const active = selected && isPlaying
          const soundText = SOUND_TEXT[locale][sound.id] ?? SOUND_TEXT.en[sound.id]
          return (
            <button
              key={sound.id}
              type="button"
              onClick={() => toggleSound(sound.id)}
              className={`w-full rounded-lg border px-4 py-4 text-left ${
                active
                  ? 'border-saffron bg-saffron text-white'
                  : selected
                    ? 'bg-saffron/8 dark:bg-saffron/12 border-saffron/25 text-ink dark:text-dark-text'
                    : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-sans text-sm font-semibold">
                    {soundText.name}
                    {active ? ` · ${copy.playing}` : selected ? ` · ${copy.selected}` : ''}
                  </p>
                  <p className={`mt-1 font-sans text-xs leading-5 ${active ? 'text-white/80' : 'text-ink/68 dark:text-dark-text/64'}`}>
                    {soundText.description}
                  </p>
                  <p className={`mt-2 font-sans text-[11px] uppercase tracking-[0.18em] ${active ? 'text-white/75' : 'text-gold-dark dark:text-gold-light'}`}>
                    {categoryLabels[sound.category]}
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
    </div>
  )

  return (
    <section className={variant === 'compact' ? 'section-shell-quiet p-4' : 'section-shell p-4'}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <IconMusic size={14} className="text-gold-dark dark:text-gold-light" />
            <p className="eyebrow">{copy.eyebrow}</p>
          </div>
          <p className={`mt-2 font-sans text-sm ${variant === 'compact' ? 'text-ink dark:text-dark-text' : 'text-ink/68 dark:text-dark-text/70'}`}>
            {headerBody}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {variant === 'compact' ? (
            <Link to="/more" className="font-sans text-xs text-gold-dark dark:text-gold-light underline underline-offset-2">
              {copy.fullLibrary}
            </Link>
          ) : (
            <span className="chip-pill">{copy.bundled(SOUNDS.length, targetLibraryCount)}</span>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(open => !open)}
            aria-expanded={isExpanded}
            aria-controls={panelId}
            aria-label={isExpanded ? copy.collapse : copy.expand}
            className="icon-surface min-h-[40px] min-w-[40px] text-gold-dark dark:text-gold-light"
          >
            {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-sand/15 bg-white/70 px-4 py-4 dark:border-dark-text/10 dark:bg-dark-card">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">
              {summaryTitle}
            </p>
            <p className="mt-1 font-sans text-xs text-ink/68 dark:text-dark-text/64">
              {summaryBody}
            </p>
          </div>
          <button
            type="button"
            onClick={handlePlaybackToggle}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-saffron text-white"
            aria-label={isPlaying ? copy.pause : copy.play}
          >
            {isPlaying ? <IconPause size={14} /> : <IconPlay size={14} />}
          </button>
        </div>
        {playbackError ? (
          <p
            role="alert"
            className="mt-3 font-sans text-xs leading-5 text-red-700 dark:text-red-300"
          >
            {copy.playbackUnavailable}
          </p>
        ) : null}
      </div>

      {details}
    </section>
  )
}
