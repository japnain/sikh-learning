import { useEffect } from 'react'
import { useMusicStore, SOUNDS } from '../store/music'
import { playSound, stopSound, setMasterVolume } from '../utils/soundEngine'

export default function More() {
  const { currentSound, playing, volume, setSound, setPlaying, setVolume } = useMusicStore()

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
    <div className="p-4 max-w-md mx-auto min-h-screen bg-parchment dark:bg-dark-bg transition-colors duration-300">
      <h1 className="font-sans font-semibold text-lg text-ink dark:text-dark-text mb-6 mt-4">More</h1>

      {/* Background Music */}
      <div className="bg-parchment-low dark:bg-dark-surface rounded-2xl p-4 mb-6 transition-colors duration-300">
        <p className="font-sans text-xs text-saffron dark:text-saffron-light uppercase tracking-wide mb-3">Background Music</p>
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
                className={`flex items-center gap-2 p-3 rounded-xl border min-h-[52px] transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                    : 'bg-parchment-card dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                }`}
              >
                <span className="text-lg">{sound.icon}</span>
                <span className="font-sans text-xs font-medium">{sound.name}</span>
              </button>
            )
          })}
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3">
          <span className="font-sans text-xs text-ink/50 dark:text-dark-text/50">Vol</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            className="flex-1 h-1 accent-saffron"
          />
        </div>
      </div>

      {/* Language Info */}
      <div className="bg-parchment-low dark:bg-dark-surface rounded-2xl p-4 mb-6 transition-colors duration-300">
        <p className="font-sans text-xs text-saffron dark:text-saffron-light uppercase tracking-wide mb-3">Languages</p>
        <p className="font-sans text-sm text-ink/70 dark:text-dark-text/70">
          Tap any card in Study mode to flip it. Use the <strong>EN</strong> / <strong>HI</strong> / <strong>PA</strong> buttons to switch between English, Hindi, and Punjabi translations.
        </p>
      </div>

      {/* About */}
      <div className="bg-parchment-low dark:bg-dark-surface rounded-2xl p-4 mb-6 transition-colors duration-300">
        <p className="font-sans text-xs text-saffron dark:text-saffron-light uppercase tracking-wide mb-3">About</p>
        <p className="font-sans text-sm text-ink/70 dark:text-dark-text/70">
          Nitnem is a Sikh scripture learning app. All scripture data is sourced from BaniDB — an open-source Gurbani database.
        </p>
        <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 mt-2">
          Powered by BaniDB v2 API
        </p>
      </div>
    </div>
  )
}
