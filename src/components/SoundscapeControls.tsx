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
    rain: 'Rain',
    water: 'Water',
    wind: 'Wind',
    night: 'Night',
    sanctuary: 'Sanctuary',
  },
  pa: {
    rain: 'ਮੀਂਹ',
    water: 'ਪਾਣੀ',
    wind: 'ਹਵਾ',
    night: 'ਰਾਤ',
    sanctuary: 'ਸੰਭਾਲਿਆ ਸਥਾਨ',
  },
  hi: {
    rain: 'बारिश',
    water: 'पानी',
    wind: 'हवा',
    night: 'रात',
    sanctuary: 'शांत स्थान',
  },
}

const CONTEXT_LABELS: Record<UiLocale, Record<FocusContext, string>> = {
  en: {
    learn: 'Learn',
    study: 'Study',
    review: 'Review',
  },
  pa: {
    learn: 'ਸਿੱਖੋ',
    study: 'ਅਧਿਐਨ',
    review: 'ਦੁਹਰਾਈ',
  },
  hi: {
    learn: 'लर्न',
    study: 'अध्ययन',
    review: 'रिव्यू',
  },
}

const SOUND_TEXT: Record<UiLocale, Record<string, { name: string; description: string }>> = {
  en: {
    'gentle-rain': {
      name: 'Gentle Rain',
      description: 'A steady warm rain bed for quiet repetition and low-friction focus.',
    },
    'forest-canopy': {
      name: 'Forest Canopy',
      description: 'Soft canopy movement that keeps the room feeling open without pulling attention.',
    },
    'mountain-stream': {
      name: 'Mountain Stream',
      description: 'Clear moving water for long reading blocks and deep concentration.',
    },
    'sea-waves': {
      name: 'Sea Waves',
      description: 'Wide slow wave motion that settles pacing during extended passages.',
    },
    'night-meadow': {
      name: 'Night Meadow',
      description: 'A dim nocturnal texture for evening study and low-stimulation review.',
    },
    'temple-fountain': {
      name: 'Temple Fountain',
      description: 'A contained water-and-space bed that feels centered and devotional.',
    },
  },
  pa: {
    'gentle-rain': {
      name: 'ਹੌਲਾ ਮੀਂਹ',
      description: 'ਸ਼ਾਂਤ ਦੁਹਰਾਈ ਅਤੇ ਹਲਕੇ ਧਿਆਨ ਲਈ ਇਕਸਾਰ ਗਰਮ ਮੀਂਹ ਦੀ ਪਿਛੋਕੜ।',
    },
    'forest-canopy': {
      name: 'ਜੰਗਲ ਛਤਰ',
      description: 'ਨਰਮ ਹਵਾ ਜੋ ਧਿਆਨ ਖਿੱਚੇ ਬਿਨਾਂ ਖੁੱਲ੍ਹਾ ਅਹਿਸਾਸ ਬਣਾਈ ਰੱਖੇ।',
    },
    'mountain-stream': {
      name: 'ਪਹਾੜੀ ਚੋਆ',
      description: 'ਲੰਬੇ ਪਾਠ ਅਤੇ ਡੂੰਘੇ ਧਿਆਨ ਲਈ ਸਾਫ਼ ਵਗਦਾ ਪਾਣੀ।',
    },
    'sea-waves': {
      name: 'ਸਮੁੰਦਰੀ ਲਹਿਰਾਂ',
      description: 'ਲੰਬੇ ਪਾਠ ਦੌਰਾਨ ਰਫ਼ਤਾਰ ਨੂੰ ਨਰਮ ਕਰਨ ਵਾਲੀ ਵਿਸ਼ਾਲ ਹੌਲੀ ਲਹਿਰ।',
    },
    'night-meadow': {
      name: 'ਰਾਤ ਦਾ ਮੈਦਾਨ',
      description: 'ਸ਼ਾਮ ਦੇ ਅਧਿਐਨ ਅਤੇ ਹਲਕੀ ਦੁਹਰਾਈ ਲਈ ਮੰਦ ਰਾਤੀ ਝਲਕ।',
    },
    'temple-fountain': {
      name: 'ਅੰਗਨ ਫੁਹਾਰਾ',
      description: 'ਕੇਂਦਰਿਤ ਅਤੇ ਭਗਤੀਮਈ ਲੱਗਣ ਵਾਲੀ ਨਰਮ ਜਲ-ਧੁਨ।',
    },
  },
  hi: {
    'gentle-rain': {
      name: 'हल्की बारिश',
      description: 'शांत दोहराव और हल्के ध्यान के लिए स्थिर गर्म बारिश की परत।',
    },
    'forest-canopy': {
      name: 'वन छाया',
      description: 'नरम पत्तों की हलचल जो ध्यान खींचे बिना स्थान को खुला रखे।',
    },
    'mountain-stream': {
      name: 'पहाड़ी धारा',
      description: 'लंबे पाठ और गहरे एकाग्र अध्ययन के लिए साफ बहता पानी।',
    },
    'sea-waves': {
      name: 'समुद्री लहरें',
      description: 'लंबे पाठ के दौरान गति को नरम करने वाली चौड़ी धीमी लहरें।',
    },
    'night-meadow': {
      name: 'रात का मैदान',
      description: 'शाम के अध्ययन और कम-उत्तेजना रिव्यू के लिए मंद रात्रि वातावरण।',
    },
    'temple-fountain': {
      name: 'मंदिर फव्वारा',
      description: 'एक सधा हुआ जल-और-स्थान वातावरण जो केंद्रित और भक्तिपूर्ण लगे।',
    },
  },
}

const PRESET_TEXT: Record<UiLocale, Record<string, { name: string; description: string }>> = {
  en: {
    settle: {
      name: 'Settle',
      description: 'Ease into the session with a softer sanctuary bed.',
    },
    focus: {
      name: 'Focus',
      description: 'Use steady moving water for extended reading concentration.',
    },
    night: {
      name: 'Night',
      description: 'Lower the stimulation for late and quiet review windows.',
    },
  },
  pa: {
    settle: {
      name: 'ਥਿਰ ਹੋਵੋ',
      description: 'ਹੌਲੇ ਸੰਭਾਲੂ ਸਾਊਂਡ ਨਾਲ ਸੈਸ਼ਨ ਵਿੱਚ ਆਰਾਮ ਨਾਲ ਉਤਰੋ।',
    },
    focus: {
      name: 'ਧਿਆਨ',
      description: 'ਲੰਬੇ ਪਾਠ ਲਈ ਵਗਦੇ ਪਾਣੀ ਦੀ ਸਥਿਰ ਧੁਨ ਵਰਤੋ।',
    },
    night: {
      name: 'ਰਾਤ',
      description: 'ਦੇਰ ਦੀ ਸ਼ਾਂਤ ਦੁਹਰਾਈ ਲਈ ਉਤੇਜਨਾ ਘਟਾਓ।',
    },
  },
  hi: {
    settle: {
      name: 'स्थिर',
      description: 'नरम शांत वातावरण के साथ सत्र में धीरे उतरें।',
    },
    focus: {
      name: 'एकाग्र',
      description: 'लंबे पाठ के लिए स्थिर बहते पानी की ध्वनि चुनें।',
    },
    night: {
      name: 'रात',
      description: 'देर और शांत रिव्यू के लिए उत्तेजना कम करें।',
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
  shipped: (count: number, target: number) => string
}> = {
  en: {
    eyebrow: 'Study Soundscapes',
    compactReady: (context, soundName) => `${soundName} is ready for ${context.toLowerCase()}.`,
    compactFallback: context => `Pick a quieter bed for ${context.toLowerCase()} without pulling focus away from Gurbani.`,
    fullBody: 'Natural ambient beds only. No melody, no vocals, no sharp transients, and no fake recitation overlap.',
    fullLibrary: 'Full library',
    bundled: (count, total) => `${count}/${total} bundled`,
    presetReady: presetName => `${presetName} preset ready`,
    defaultReady: 'Focus preset ready',
    defaultSummary: 'Choose a preset or an individual field recording below.',
    volume: 'Volume',
    collapse: 'Collapse soundscapes',
    expand: 'Expand soundscapes',
    play: 'Play soundscape',
    pause: 'Pause soundscape',
    playing: 'Playing',
    selected: 'Selected',
    shipped: (count, target) => `${count}/${target} shipped`,
  },
  pa: {
    eyebrow: 'ਅਧਿਐਨ ਸਾਊਂਡਸਕੇਪ',
    compactReady: (context, soundName) => `${soundName} ${context.toLowerCase()} ਲਈ ਤਿਆਰ ਹੈ।`,
    compactFallback: context => `${context.toLowerCase()} ਲਈ ਹੌਲਾ ਪਿਛੋਕੜ ਚੁਣੋ ਜੋ ਗੁਰਬਾਣੀ ਤੋਂ ਧਿਆਨ ਨਾ ਖਿੱਚੇ।`,
    fullBody: 'ਕੇਵਲ ਕੁਦਰਤੀ ਆਸ-ਪਾਸ ਦੀਆਂ ਧੁਨਾਂ। ਨਾ ਕੋਈ ਧੁਨ, ਨਾ ਗਾਇਕੀ, ਨਾ ਤੀਖੇ ਝਟਕੇ, ਨਾ ਝੂਠੀ ਪਾਠ-ਆਵਾਜ਼ ਮਿਲਾਵਟ।',
    fullLibrary: 'ਪੂਰੀ ਲਾਇਬ੍ਰੇਰੀ',
    bundled: (count, total) => `${count}/${total} ਸ਼ਾਮਲ`,
    presetReady: presetName => `${presetName} ਪ੍ਰੀਸੈਟ ਤਿਆਰ`,
    defaultReady: 'ਧਿਆਨ ਪ੍ਰੀਸੈਟ ਤਿਆਰ',
    defaultSummary: 'ਹੇਠਾਂ ਤੋਂ ਪ੍ਰੀਸੈਟ ਜਾਂ ਇਕੱਲੀ ਫ਼ੀਲਡ ਰਿਕਾਰਡਿੰਗ ਚੁਣੋ।',
    volume: 'ਆਵਾਜ਼',
    collapse: 'ਸਾਊਂਡਸਕੇਪ ਸਿਮਟਾਓ',
    expand: 'ਸਾਊਂਡਸਕੇਪ ਖੋਲ੍ਹੋ',
    play: 'ਸਾਊਂਡਸਕੇਪ ਚਲਾਓ',
    pause: 'ਸਾਊਂਡਸਕੇਪ ਰੋਕੋ',
    playing: 'ਚੱਲ ਰਿਹਾ',
    selected: 'ਚੁਣਿਆ',
    shipped: (count, target) => `${count}/${target} ਸ਼ਾਮਲ`,
  },
  hi: {
    eyebrow: 'अध्ययन साउंडस्केप',
    compactReady: (context, soundName) => `${soundName} ${context.toLowerCase()} के लिए तैयार है।`,
    compactFallback: context => `${context.toLowerCase()} के लिए शांत पृष्ठभूमि चुनें जो गुरबाणी से ध्यान न खींचे।`,
    fullBody: 'सिर्फ प्राकृतिक वातावरण। न धुन, न स्वर, न तेज़ ट्रांज़िएंट, न कृत्रिम पाठ ओवरलैप।',
    fullLibrary: 'पूरी लाइब्रेरी',
    bundled: (count, total) => `${count}/${total} शामिल`,
    presetReady: presetName => `${presetName} प्रीसेट तैयार`,
    defaultReady: 'फोकस प्रीसेट तैयार',
    defaultSummary: 'नीचे से कोई प्रीसेट या एकल फील्ड रिकॉर्डिंग चुनें।',
    volume: 'आवाज़',
    collapse: 'साउंडस्केप समेटें',
    expand: 'साउंडस्केप खोलें',
    play: 'साउंडस्केप चलाएँ',
    pause: 'साउंडस्केप रोकें',
    playing: 'चल रहा',
    selected: 'चुना गया',
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
              className={`rounded-2xl border px-3 py-3 text-left min-h-[56px] ${
                selected
                  ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                  : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
              }`}
            >
              <p className="font-sans text-[11px] uppercase tracking-[0.18em]">{presetText.name}</p>
              <p className={`mt-1 font-sans text-[11px] leading-4 ${selected ? 'text-white/80' : 'text-ink/55 dark:text-dark-text/55'}`}>
                {presetText.description}
              </p>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45">
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
              className={`rounded-2xl px-3 py-3 text-left min-h-[60px] ${
                selected
                  ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                  : 'section-shell-quiet text-ink dark:text-dark-text'
              }`}
            >
              <p className="font-sans text-xs font-semibold uppercase tracking-[0.16em]">{presetText.name}</p>
              <p className={`mt-1 font-sans text-[11px] leading-4 ${selected ? 'text-white/80' : 'text-ink/55 dark:text-dark-text/55'}`}>
                {presetText.description}
              </p>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="font-sans text-xs text-ink/50 dark:text-dark-text/50">{copy.volume}</span>
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
            <p className="mt-1 font-sans text-[11px] text-ink/50 dark:text-dark-text/50">
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
                    {soundText.name}
                    {active ? ` · ${copy.playing}` : selected ? ` · ${copy.selected}` : ''}
                  </p>
                  <p className={`mt-1 font-sans text-xs leading-5 ${active ? 'text-white/80' : 'text-ink/55 dark:text-dark-text/55'}`}>
                    {soundText.description}
                  </p>
                  <p className={`mt-2 font-sans text-[11px] uppercase tracking-[0.18em] ${active ? 'text-white/75' : 'text-gold dark:text-gold-light'}`}>
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
            <IconMusic size={14} className="text-gold dark:text-gold-light" />
            <p className="eyebrow">{copy.eyebrow}</p>
          </div>
          <p className={`mt-2 font-sans text-sm ${variant === 'compact' ? 'text-ink dark:text-dark-text' : 'text-ink/68 dark:text-dark-text/70'}`}>
            {headerBody}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {variant === 'compact' ? (
            <Link to="/more" className="font-sans text-xs text-gold dark:text-gold-light underline underline-offset-2">
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
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full border border-sand/15 bg-white/60 text-gold transition-colors duration-300 dark:border-dark-text/10 dark:bg-dark-card/60 dark:text-gold-light"
          >
            {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-sand/15 bg-white/70 px-4 py-4 dark:border-dark-text/10 dark:bg-dark-card">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">
              {summaryTitle}
            </p>
            <p className="mt-1 font-sans text-xs text-ink/55 dark:text-dark-text/55">
              {summaryBody}
            </p>
          </div>
          <button
            type="button"
            onClick={handlePlaybackToggle}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-gradient-to-r from-saffron to-saffron-light text-white"
            aria-label={isPlaying ? copy.pause : copy.play}
          >
            {isPlaying ? <IconPause size={14} /> : <IconPlay size={14} />}
          </button>
        </div>
      </div>

      {details}
    </section>
  )
}
