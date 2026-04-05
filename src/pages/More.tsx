import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMusicStore, SOUNDS } from '../store/music'
import { useLanguageStore } from '../store/language'
import { playSound, stopSound, setMasterVolume } from '../utils/soundEngine'
import { IconMusic, IconArrowRight } from '../components/icons'

export default function More() {
  const navigate = useNavigate()
  const { currentSound, playing, volume, setSound, setPlaying, setVolume } = useMusicStore()
  const { hindiMode, toggleHindi, fontSize, setFontSize } = useLanguageStore()

  useEffect(() => {
    if (playing && currentSound) {
      playSound(currentSound)
      setMasterVolume(volume)
    } else {
      stopSound()
    }
    return () => stopSound()
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
          <p className="font-sans text-xs text-gold dark:text-gold-light uppercase tracking-wide">Background Music</p>
        </div>
        <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 mb-4">
          Play ambient sounds while studying. Music continues as you navigate the app.
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
      </div>

      {/* Language & Display */}
      <div className="bg-parchment-low dark:bg-dark-surface rounded-2xl p-4 mb-6 transition-colors duration-300 shadow-card animate-slide-up stagger-2">
        <p className="font-sans text-xs text-gold dark:text-gold-light uppercase tracking-wide mb-4">Language & Display</p>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-sans text-sm text-ink dark:text-dark-text">Hindi script</p>
            <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 mt-0.5">
              {hindiMode ? 'Showing Devanagari instead of Gurmukhi' : 'Showing Gurmukhi script'}
            </p>
          </div>
          <button
            onClick={toggleHindi}
            className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${hindiMode ? 'bg-gold' : 'bg-sand/30 dark:bg-dark-text/20'}`}
          >
            <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${hindiMode ? 'translate-x-5' : ''}`} />
          </button>
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
            <span lang={hindiMode ? 'hi' : 'pa-Guru'} className={`${hindiMode ? 'font-sans' : 'font-gurmukhi'} text-gold dark:text-gold-light`} style={{ fontSize: `${fontSize}px` }}>
              ੴ
            </span>
            <span className="font-sans text-[10px] text-ink/40 dark:text-dark-text/40">Large</span>
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
          Tap any word while studying to see its meaning and save it to your vocabulary. Tap a card to see the translation.
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
