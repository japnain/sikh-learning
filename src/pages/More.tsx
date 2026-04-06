import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMusicStore, SOUNDS } from '../store/music'
import { useLanguageStore } from '../store/language'
import { useOnboardingStore } from '../store/onboarding'
import { playSound, setMasterVolume, stopSound } from '../utils/soundEngine'
import {
  ENGLISH_SOURCE_LABELS,
  LEARNING_LEVEL_LABELS,
  LINE_SPACING_LABELS,
  MEANING_LANGUAGE_LABELS,
  SCRIPT_MODE_LABELS,
  TEXT_ALIGNMENT_LABELS,
} from '../utils/translations'
import { renderScriptText } from '../utils/readerDisplay'
import { IconArrowRight, IconMusic } from '../components/icons'

export default function More() {
  const navigate = useNavigate()
  const { currentSound, playing, volume, setSound, setPlaying, setVolume } = useMusicStore()
  const {
    scriptMode,
    setScriptMode,
    showTransliteration,
    setShowTransliteration,
    meaningLanguage,
    setMeaningLanguage,
    fontSize,
    setFontSize,
    englishSource,
    setEnglishSource,
    larivaar,
    setLarivaar,
    showVishraam,
    setShowVishraam,
    lineSpacing,
    setLineSpacing,
    textAlign,
    setTextAlign,
  } = useLanguageStore()
  const { learningLevel, setLearningLevel, resetOnboarding } = useOnboardingStore()

  useEffect(() => {
    if (playing && currentSound) {
      playSound(currentSound)
      setMasterVolume(volume)
    } else {
      stopSound()
    }
  }, [currentSound, playing, volume])

  useEffect(() => {
    setMasterVolume(volume)
  }, [volume])

  const handleToggle = (id: string) => {
    if (currentSound === id && playing) {
      stopSound()
      setSound(null)
      setPlaying(false)
    } else {
      setSound(id)
      setPlaying(true)
    }
  }

  return (
    <div className="page-shell animate-fade-in">
      <div className="mb-5">
        <p className="eyebrow">More</p>
        <h1 className="font-display text-4xl text-ink dark:text-dark-text leading-none mt-2">Set the tone of the app.</h1>
        <p className="font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65 mt-3">
          The defaults here shape Home, Study, Hukamnama, and Learn. The app should feel deliberate, calm, and consistent every time you open it.
        </p>
      </div>

      <section className="hero-surface p-5 mb-5">
        <p className="eyebrow">Product Promise</p>
        <p className="font-display text-3xl leading-none text-ink dark:text-dark-text mt-2">
          Read Gurbani daily. Understand it better. Grow into it steadily.
        </p>
        <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-3 max-w-[34ch]">
          Nitnem is being shaped as a mobile-first reading and learning companion, not a generic utility dashboard.
        </p>
      </section>

      <section className="section-shell p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <IconMusic size={14} className="text-gold dark:text-gold-light" />
          <p className="eyebrow">Ambient Audio</p>
        </div>
        <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 mb-4">
          Ambient recordings are optional atmosphere. Recitation remains intentionally marked as coming soon until there is a real source.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {SOUNDS.map(sound => {
            const isActive = currentSound === sound.id && playing
            return (
              <button
                key={sound.id}
                onClick={() => handleToggle(sound.id)}
                className={`flex items-center gap-2 p-3 rounded-2xl border min-h-[52px] transition-all duration-300 active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron shadow-gold'
                    : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                }`}
              >
                <span className="text-lg">{sound.icon}</span>
                <span className="font-sans text-xs font-medium">{sound.name}</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="font-sans text-xs text-ink/50 dark:text-dark-text/50">Vol</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            className="flex-1 h-1 accent-gold"
          />
        </div>
      </section>

      <section className="section-shell-quiet p-4 mb-5">
        <p className="eyebrow mb-4">Reader Defaults</p>

        <div className="mb-5">
          <p className="font-sans text-sm text-ink dark:text-dark-text mb-2">Reading script</p>
          <div className="grid grid-cols-2 gap-2">
            {(['gurmukhi', 'devanagari'] as const).map(mode => {
              const selected = scriptMode === mode
              return (
                <button
                  key={mode}
                  onClick={() => setScriptMode(mode)}
                  className={`rounded-2xl px-3 py-3 font-sans text-xs font-medium min-h-[44px] transition-all duration-300 ${
                    selected
                      ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                      : 'bg-white/70 dark:bg-dark-card text-ink/70 dark:text-dark-text/70 border border-sand/15 dark:border-dark-text/10'
                  }`}
                >
                  {SCRIPT_MODE_LABELS[mode]}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mb-5">
          <div className="flex justify-between mb-1">
            <p className="font-sans text-sm text-ink dark:text-dark-text">Script size</p>
            <span className="font-sans text-xs text-ink/50 dark:text-dark-text/50">{fontSize}px</span>
          </div>
          <input
            type="range"
            min="16"
            max="34"
            step="2"
            value={fontSize}
            onChange={e => setFontSize(Number(e.target.value))}
            className="w-full h-1 accent-gold"
          />
          <div className="flex justify-between mt-2">
            <span className="font-sans text-[10px] text-ink/40 dark:text-dark-text/40">Small</span>
            <span
              lang={scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'}
              className={`${scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'} text-gold dark:text-gold-light`}
              style={{ fontSize: `${fontSize}px` }}
            >
              {renderScriptText('ੴ', scriptMode)}
            </span>
            <span className="font-sans text-[10px] text-ink/40 dark:text-dark-text/40">Large</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            onClick={() => setShowTransliteration(!showTransliteration)}
            aria-label="Toggle transliteration"
            className={`rounded-2xl px-3 py-3 font-sans text-xs font-medium min-h-[48px] ${
              showTransliteration
                ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                : 'bg-white/70 dark:bg-dark-card text-ink dark:text-dark-text border border-sand/15 dark:border-dark-text/10'
            }`}
          >
            Transliteration {showTransliteration ? 'On' : 'Off'}
          </button>
          <button
            onClick={() => setLarivaar(!larivaar)}
            className={`rounded-2xl px-3 py-3 font-sans text-xs font-medium min-h-[48px] ${
              larivaar
                ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                : 'bg-white/70 dark:bg-dark-card text-ink dark:text-dark-text border border-sand/15 dark:border-dark-text/10'
            }`}
          >
            Larivaar {larivaar ? 'On' : 'Off'}
          </button>
          <button
            onClick={() => setShowVishraam(!showVishraam)}
            className={`rounded-2xl px-3 py-3 font-sans text-xs font-medium min-h-[48px] ${
              showVishraam
                ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                : 'bg-white/70 dark:bg-dark-card text-ink dark:text-dark-text border border-sand/15 dark:border-dark-text/10'
            }`}
          >
            Vishraam {showVishraam ? 'On' : 'Off'}
          </button>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(TEXT_ALIGNMENT_LABELS).map(([key, label]) => {
              const selected = textAlign === key
              return (
                <button
                  key={key}
                  onClick={() => setTextAlign(key as typeof textAlign)}
                  className={`rounded-2xl px-2 py-3 font-sans text-xs font-medium min-h-[48px] ${
                    selected
                      ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                      : 'bg-white/70 dark:bg-dark-card text-ink dark:text-dark-text border border-sand/15 dark:border-dark-text/10'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mb-5">
          <p className="font-sans text-sm text-ink dark:text-dark-text mb-2">Meaning language</p>
          <div className="grid grid-cols-4 gap-2">
            {(['none', 'en', 'pa', 'hi'] as const).map(option => {
              const selected = meaningLanguage === option
              return (
                <button
                  key={option}
                  onClick={() => setMeaningLanguage(option)}
                  className={`rounded-2xl px-2 py-3 border min-h-[48px] font-sans text-xs font-medium ${
                    selected
                      ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                      : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                  }`}
                >
                  {MEANING_LANGUAGE_LABELS[option]}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mb-5">
          <p className="font-sans text-sm text-ink dark:text-dark-text mb-2">Line spacing</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(LINE_SPACING_LABELS).map(([key, label]) => {
              const selected = lineSpacing === key
              return (
                <button
                  key={key}
                  onClick={() => setLineSpacing(key as typeof lineSpacing)}
                  className={`rounded-2xl px-3 py-3 border min-h-[48px] font-sans text-xs font-medium ${
                    selected
                      ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                      : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="font-sans text-sm text-ink dark:text-dark-text mb-2">English translation</p>
          <div className="grid gap-2">
            {Object.entries(ENGLISH_SOURCE_LABELS).map(([key, label]) => {
              const selected = englishSource === key
              return (
                <button
                  key={key}
                  onClick={() => setEnglishSource(key as typeof englishSource)}
                  className={`w-full flex items-center justify-between rounded-2xl px-3 py-3 border min-h-[48px] ${
                    selected
                      ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                      : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                  }`}
                >
                  <span className="font-sans text-sm font-medium">{label}</span>
                  <span className="font-sans text-[10px] uppercase tracking-[0.18em] opacity-70">
                    {selected ? 'Selected' : 'Tap to use'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="section-shell p-4 mb-5">
        <p className="eyebrow mb-3">Learning Level</p>
        <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mb-3">
          This changes what Home recommends first and how Learn frames the path ahead.
        </p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(['beginner', 'familiar', 'daily-reader'] as const).map(level => {
            const selected = learningLevel === level
            return (
              <button
                key={level}
                onClick={() => setLearningLevel(level)}
                className={`rounded-2xl px-2 py-3 border min-h-[48px] font-sans text-xs font-medium ${
                  selected
                    ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                    : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                }`}
              >
                {LEARNING_LEVEL_LABELS[level]}
              </button>
            )
          })}
        </div>
        <button
          onClick={resetOnboarding}
          className="font-sans text-xs text-saffron dark:text-saffron-light underline underline-offset-2"
        >
          Re-open first setup on Home
        </button>
      </section>

      <section className="section-shell-quiet p-4 mb-5">
        <p className="eyebrow mb-3">Grow</p>
        <button
          onClick={() => navigate('/learn')}
          className="w-full flex items-center justify-between section-shell px-4 py-4 min-h-[52px]"
        >
          <div className="text-left">
            <p className="font-sans text-sm font-medium text-ink dark:text-dark-text">Open Learn</p>
            <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 mt-0.5">
              Letters, recognition drills, Gurbani bridge, and mastery tracking
            </p>
          </div>
          <IconArrowRight size={16} className="text-gold dark:text-gold-light" />
        </button>
      </section>

      <section className="section-shell p-4">
        <p className="eyebrow mb-3">About</p>
        <p className="font-sans text-sm text-ink/70 dark:text-dark-text/70">
          Nitnem is a Sikh scripture reading and learning app shaped around three pillars: Read, Understand, and Grow.
        </p>
        <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 mt-2">
          Scripture data is sourced from BaniDB v2. Recitation remains intentionally disabled until a working source exists.
        </p>
      </section>
    </div>
  )
}
