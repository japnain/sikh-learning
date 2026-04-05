import { useState, useEffect, useRef } from 'react'
import { fetchAudio } from '../api/banidb'
import { useRecitationStore } from '../store/recitation'
import { IconPlay, IconPause } from './icons'

interface Props {
  shabadId: number
}

const SPEEDS = [0.8, 1, 1.25]

export default function AudioPlayer({ shabadId }: Props) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const {
    currentShabadId,
    currentTime,
    playbackRate,
    playing,
    setCurrentShabad,
    setCurrentTime,
    setPlaybackRate,
    setPlaying,
  } = useRecitationStore()

  const isActive = currentShabadId === shabadId

  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.playbackRate = playbackRate
  }, [playbackRate])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !isActive) return
    if (Math.abs(audio.currentTime - currentTime) > 1) {
      audio.currentTime = currentTime
    }
  }, [currentTime, isActive])

  const loadIfNeeded = async () => {
    if (audioUrl) return audioUrl
    setLoading(true)
    try {
      const url = await fetchAudio(shabadId)
      setAudioUrl(url)
      return url
    } finally {
      setLoading(false)
    }
  }

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio) return

    const url = await loadIfNeeded()
    if (!url) return

    if (!isActive) {
      setCurrentShabad(shabadId)
      audio.currentTime = 0
    }

    if (isActive && playing) {
      audio.pause()
      setPlaying(false)
      return
    }

    try {
      audio.playbackRate = playbackRate
      await audio.play()
      setCurrentShabad(shabadId)
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handlePause = () => {
      if (isActive) setPlaying(false)
    }
    const handleEnded = () => {
      if (isActive) {
        setPlaying(false)
        setCurrentTime(0)
      }
    }
    const handleTimeUpdate = () => {
      if (isActive) setCurrentTime(audio.currentTime)
    }

    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    return () => {
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [isActive, setCurrentTime, setPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!isActive) {
      audio.pause()
      return
    }
    if (playing) {
      void audio.play().catch(() => setPlaying(false))
    } else {
      audio.pause()
    }
  }, [isActive, playing, setPlaying])

  return (
    <div className="rounded-2xl bg-parchment/55 dark:bg-dark-surface/70 border border-sand/10 dark:border-dark-text/10 px-3 py-3">
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="none" />}
      {!audioUrl && <audio ref={audioRef} preload="none" />}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => void toggle()}
          className="flex items-center gap-2 font-sans text-xs text-gold dark:text-gold-light min-h-[44px] min-w-[44px] active:scale-95 transition-transform duration-150"
          aria-label={isActive && playing ? 'Pause recitation' : 'Play recitation'}
        >
          {isActive && playing ? <IconPause size={16} /> : <IconPlay size={16} />}
          <span>{loading ? 'Loading...' : isActive && playing ? 'Pause' : 'Listen'}</span>
        </button>

        <div className="flex items-center gap-1">
          {SPEEDS.map(speed => {
            const selected = playbackRate === speed
            return (
              <button
                key={speed}
                onClick={() => setPlaybackRate(speed)}
                className={`rounded-full px-2 py-1 font-sans text-[10px] transition-colors duration-300 ${
                  selected
                    ? 'bg-saffron text-white'
                    : 'bg-parchment-card dark:bg-dark-card text-ink/45 dark:text-dark-text/45'
                }`}
              >
                {speed}x
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
