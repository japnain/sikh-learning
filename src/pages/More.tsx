import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMusicStore, SOUNDS } from '../store/music'
import { useLanguageStore } from '../store/language'
import { playSound, stopSound, setMasterVolume } from '../utils/soundEngine'
import { ENGLISH_SOURCE_LABELS, MEANING_LANGUAGE_LABELS, SCRIPT_MODE_LABELS } from '../utils/translations'
import { renderScriptText } from '../utils/readerDisplay'
import { IconMusic, IconArrowRight } from '../components/icons'

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
  } = useLanguageStore()

  useEffect(() => {
    if (playing && currentSound) {
      playSound(currentSound)
      setMasterVolume(volume)
    } else {
      stopSound()
    }
  }, [currentSound, playing])

  useEffect(() => {
    setMasterVolume(volume)
  }, [volume])

  const handleToggle = (id: string) => {
    if (currentSound === id && playing) {
      setPlaying(false)
    } else {
      setSound(id)
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto min-h-screen bg-parchment dark:bg-dark-bg transition-colors duration-300 animate-fade-in">
      <h1 className="font-sans font-semibold text-lg text-ink dark:text-dark-text mb-6 mt-4">More</h1>

      {/* Background Music */}
      <div className="bg-parchment-low dark:bg-dark-surface rounded-2xl p-4 mb-6 transition-colors duration-300 shadow-card dark:shadow-gold animate-slide-up stagger-1">
        <div className="flex items-center gap-2 mb-3">
          <IconMusic size={14} className="text-gold dark:text-gold-light" />
          <p className="font-sans text-xs text-gold dark:text-gold-light uppercase tracking-wide">Ambient Audio</p>
        </div>
        <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 mb-4">
          Play bundled ambient recordings while studying. Audio keeps playing as you move around the app.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {SOUNDS.map(sound => {
            const isActive = currentSound === sound.id && playing
            return (
              <button
                key={sound.id}
                onClick={() => handleToggle(sound.id)}
                className={`flex items-center gap-2 p-3 rounded-xl border min-h-[52px] transition-all duration-300 active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron shadow-gold'
                    : 'bg-parchment-card dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
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
            type="range" min="0" max="1" step="0.05" value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            className="flex-1 h-1 accent-gold"
          />
        </div>
        <p className="font-sans text-[10px] text-ink/40 dark:text-dark-text/40 mt-3">
          Recordings sourced from BigSoundBank under CC0/public-domain terms.
        </p>
      </div>

      {/* Language & Display */}
      <div className="bg-parchment-low dark:bg-dark-surface rounded-2xl p-4 mb-6 transition-colors duration-300 shadow-card animate-slide-up stagger-2">
        <p className="font-sans text-xs text-gold dark:text-gold-light uppercase tracking-wide mb-4">Language & Display</p>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-sans text-sm text-ink dark:text-dark-text">Reading script</p>
            <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 mt-0.5">
              {scriptMode === 'devanagari' ? 'Showing Devanagari while keeping Gurbani line order' : 'Showing the original Gurmukhi script'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 w-44">
            {(['gurmukhi', 'devanagari'] as const).map(mode => {
              const selected = scriptMode === mode
              return (
                <button
                  key={mode}
                  onClick={() => setScriptMode(mode)}
                  className={`rounded-xl px-3 py-2 font-sans text-xs font-medium min-h-[42px] transition-all duration-300 ${
                    selected
                      ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                      : 'bg-parchment-card dark:bg-dark-card text-ink/70 dark:text-dark-text/70 border border-sand/15 dark:border-dark-text/10'
                  }`}
                >
                  {SCRIPT_MODE_LABELS[mode]}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <p className="font-sans text-sm text-ink dark:text-dark-text">Script size</p>
            <span className="font-sans text-xs text-ink/50 dark:text-dark-text/50">{fontSize}px</span>
          </div>
          <input
            type="range" min="16" max="34" step="2" value={fontSize}
            onChange={e => setFontSize(Number(e.target.value))}
            className="w-full h-1 accent-gold"
          />
          <div className="flex justify-between mt-1">
            <span className="font-sans text-[10px] text-ink/40 dark:text-dark-text/40">Small</span>
            <span lang={scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'} className={`${scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'} text-gold dark:text-gold-light`} style={{ fontSize: `${fontSize}px` }}>
              {renderScriptText('ੴ', scriptMode)}
            </span>
            <span className="font-sans text-[10px] text-ink/40 dark:text-dark-text/40">Large</span>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-sand/15 dark:border-dark-text/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-sans text-sm text-ink dark:text-dark-text">Transliteration</p>
              <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 mt-0.5">
                {showTransliteration ? 'Showing romanized transliteration in Study' : 'Keeping the reader focused on Gurbani and meanings'}
              </p>
            </div>
            <button
              onClick={() => setShowTransliteration(!showTransliteration)}
              aria-label="Toggle transliteration"
              className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${showTransliteration ? 'bg-gold' : 'bg-sand/30 dark:bg-dark-text/20'}`}
            >
              <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${showTransliteration ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <p className="font-sans text-sm text-ink dark:text-dark-text mb-1">Meaning language</p>
          <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 mb-3">
            Show one meaning at a time so the reader stays clean on mobile.
          </p>

          <div className="grid grid-cols-4 gap-2 mb-5">
            {(['none', 'en', 'pa', 'hi'] as const).map(option => {
              const selected = meaningLanguage === option
              return (
                <button
                  key={option}
                  onClick={() => setMeaningLanguage(option)}
                  className={`rounded-xl px-2 py-3 border min-h-[48px] font-sans text-xs font-medium transition-all duration-300 active:scale-95 ${
                    selected
                      ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                      : 'bg-parchment-card dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                  }`}
                >
                  {MEANING_LANGUAGE_LABELS[option]}
                </button>
              )
            })}
          </div>

          <p className="font-sans text-sm text-ink dark:text-dark-text mb-1">English translation</p>
          <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 mb-3">
            Choose which English source appears in Study, Home, and Hukamnama.
          </p>

          <div className="grid gap-2">
            {Object.entries(ENGLISH_SOURCE_LABELS).map(([key, label]) => {
              const selected = englishSource === key
              return (
                <button
                  key={key}
                  onClick={() => setEnglishSource(key as typeof englishSource)}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-3 border min-h-[48px] transition-all duration-300 active:scale-95 ${
                    selected
                      ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                      : 'bg-parchment-card dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
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
      </div>

      {/* Learn Gurmukhi */}
      <div className="bg-parchment-low dark:bg-dark-surface rounded-2xl p-4 mb-6 transition-colors duration-300 shadow-card animate-slide-up stagger-3">
        <p className="font-sans text-xs text-gold dark:text-gold-light uppercase tracking-wide mb-3">Learn</p>
        <button
          onClick={() => navigate('/learn')}
          className="w-full flex items-center justify-between bg-parchment-card dark:bg-dark-card rounded-xl p-4 border border-sand/15 dark:border-gold/10 min-h-[52px] transition-all duration-300 active:scale-[0.98]"
        >
          <div className="text-left">
            <p className="font-sans text-sm font-medium text-ink dark:text-dark-text">ਪੈਂਤੀ · Gurmukhi Alphabet</p>
            <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 mt-0.5">Learn all 35 letters with examples from Gurbani</p>
          </div>
          <IconArrowRight size={16} className="text-gold dark:text-gold-light" />
        </button>
      </div>

      {/* Tips */}
      <div className="bg-parchment-low dark:bg-dark-surface rounded-2xl p-4 mb-6 transition-colors duration-300 shadow-card animate-slide-up stagger-4">
        <p className="font-sans text-xs text-gold dark:text-gold-light uppercase tracking-wide mb-3">Tips</p>
        <p className="font-sans text-sm text-ink/70 dark:text-dark-text/70">
          Tap any Gurbani word while studying to see its meaning and save it to your vocabulary. The same script, transliteration, and meaning defaults now stay synced between this screen and the reader.
        </p>
      </div>

      {/* About */}
      <div className="bg-parchment-low dark:bg-dark-surface rounded-2xl p-4 mb-6 transition-colors duration-300 shadow-card animate-slide-up stagger-5">
        <p className="font-sans text-xs text-gold dark:text-gold-light uppercase tracking-wide mb-3">About</p>
        <p className="font-sans text-sm text-ink/70 dark:text-dark-text/70">
          Nitnem is a Sikh scripture learning app. All scripture data is sourced from BaniDB — an open-source Gurbani database.
        </p>
        <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 mt-2">Powered by BaniDB v2 API</p>
      </div>
    </div>
  )
}
