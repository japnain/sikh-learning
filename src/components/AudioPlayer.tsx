import { useEffect, useId, useRef, useState } from 'react'
import { fetchAudio } from '../api/banidb'
import { useLocaleStore } from '../store/locale'
import { useRecitationStore } from '../store/recitation'
import type { UiLocale } from '../types'
import { IconPause, IconPlay } from './icons'

interface Props {
  shabadId: number
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const

const AUDIO_COPY: Record<UiLocale, {
  title: string
  description: string
  loading: string
  unavailable: string
  error: string
  play: string
  pause: string
  back: string
  forward: string
  seek: string
  speed: string
}> = {
  en: {
    title: 'Gurbani recitation',
    description: 'Sacred recitation for this shabad. Ambient soundscapes are controlled separately.',
    loading: 'Finding recitation…',
    unavailable: 'Recitation is not available for this shabad yet.',
    error: 'The recitation could not be played.',
    play: 'Play recitation',
    pause: 'Pause recitation',
    back: 'Go back 15 seconds',
    forward: 'Go forward 15 seconds',
    seek: 'Recitation position',
    speed: 'Playback speed',
  },
  pa: {
    title: 'ਗੁਰਬਾਣੀ ਪਾਠ',
    description: 'ਇਸ ਸ਼ਬਦ ਦਾ ਪਵਿੱਤਰ ਪਾਠ। ਆਲੇ-ਦੁਆਲੇ ਦੀਆਂ ਧੁਨਾਂ ਵੱਖਰੇ ਤੌਰ ਤੇ ਚਲਦੀਆਂ ਹਨ।',
    loading: 'ਪਾਠ ਲੱਭਿਆ ਜਾ ਰਿਹਾ ਹੈ…',
    unavailable: 'ਇਸ ਸ਼ਬਦ ਦਾ ਪਾਠ ਹਾਲੇ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।',
    error: 'ਪਾਠ ਚਲਾਇਆ ਨਹੀਂ ਜਾ ਸਕਿਆ।',
    play: 'ਪਾਠ ਚਲਾਓ',
    pause: 'ਪਾਠ ਰੋਕੋ',
    back: '੧੫ ਸਕਿੰਟ ਪਿੱਛੇ',
    forward: '੧੫ ਸਕਿੰਟ ਅੱਗੇ',
    seek: 'ਪਾਠ ਦੀ ਥਾਂ',
    speed: 'ਪਾਠ ਦੀ ਰਫ਼ਤਾਰ',
  },
  hi: {
    title: 'गुरबाणी पाठ',
    description: 'इस शबद का पवित्र पाठ। परिवेश की ध्वनियाँ अलग से नियंत्रित होती हैं।',
    loading: 'पाठ खोजा जा रहा है…',
    unavailable: 'इस शबद का पाठ अभी उपलब्ध नहीं है।',
    error: 'पाठ चलाया नहीं जा सका।',
    play: 'पाठ चलाएँ',
    pause: 'पाठ रोकें',
    back: '15 सेकंड पीछे',
    forward: '15 सेकंड आगे',
    seek: 'पाठ की स्थिति',
    speed: 'पाठ की गति',
  },
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const wholeSeconds = Math.floor(seconds)
  const minutes = Math.floor(wholeSeconds / 60)
  return `${minutes}:${String(wholeSeconds % 60).padStart(2, '0')}`
}

export default function AudioPlayer({ shabadId }: Props) {
  const locale = useLocaleStore(state => state.locale)
  const copy = AUDIO_COPY[locale]
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const seekId = useId()
  const [request, setRequest] = useState<{
    shabadId: number
    status: 'loading' | 'ready'
    url: string | null
    failed: boolean
  }>(() => ({ shabadId, status: 'loading', url: null, failed: false }))
  const [durationState, setDurationState] = useState(() => ({ shabadId, value: 0 }))
  const [playbackError, setPlaybackError] = useState(() => ({ shabadId, value: false }))
  const currentShabadId = useRecitationStore(state => state.currentShabadId)
  const currentTime = useRecitationStore(state => state.currentTime)
  const playbackRate = useRecitationStore(state => state.playbackRate)
  const playing = useRecitationStore(state => state.playing)
  const setCurrentShabad = useRecitationStore(state => state.setCurrentShabad)
  const setCurrentTime = useRecitationStore(state => state.setCurrentTime)
  const setPlaybackRate = useRecitationStore(state => state.setPlaybackRate)
  const setPlaying = useRecitationStore(state => state.setPlaying)
  const isPlaying = currentShabadId === shabadId && playing
  const requestMatches = request.shabadId === shabadId
  const audioUrl = requestMatches ? request.url : null
  const loading = !requestMatches || request.status === 'loading'
  const duration = durationState.shabadId === shabadId ? durationState.value : 0
  const displayTime = currentShabadId === shabadId ? currentTime : 0
  const error = (requestMatches && request.failed)
    || (playbackError.shabadId === shabadId && playbackError.value)
      ? copy.error
      : null

  useEffect(() => {
    let cancelled = false

    void fetchAudio(shabadId).then(url => {
      if (cancelled) return
      setRequest({ shabadId, status: 'ready', url, failed: false })
    }).catch(() => {
      if (cancelled) return
      setRequest({ shabadId, status: 'ready', url: null, failed: true })
    })

    return () => {
      cancelled = true
    }
  }, [shabadId])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.playbackRate = playbackRate
  }, [audioUrl, playbackRate])

  useEffect(() => {
    if (currentShabadId === shabadId) return
    audioRef.current?.pause()
  }, [currentShabadId, shabadId])

  useEffect(() => () => {
    if (useRecitationStore.getState().currentShabadId === shabadId) {
      setPlaying(false)
    }
  }, [setPlaying, shabadId])

  const handleLoadedMetadata = () => {
    const audio = audioRef.current
    if (!audio) return

    const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0
    const stored = useRecitationStore.getState()
    const resumeAt = stored.currentShabadId === shabadId
      ? Math.min(stored.currentTime, nextDuration || stored.currentTime)
      : 0

    setDurationState({ shabadId, value: nextDuration })
    audio.playbackRate = stored.playbackRate
    if (resumeAt > 0) audio.currentTime = resumeAt
  }

  const handleTogglePlayback = async () => {
    const audio = audioRef.current
    if (!audio || !audioUrl) return

    if (isPlaying) {
      audio.pause()
      setPlaying(false)
      return
    }

    if (useRecitationStore.getState().currentShabadId !== shabadId) {
      setCurrentShabad(shabadId)
    }

    setPlaybackError({ shabadId, value: false })
    audio.playbackRate = playbackRate

    try {
      await audio.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
      setPlaybackError({ shabadId, value: true })
    }
  }

  const seekTo = (seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    const nextTime = Math.max(0, Math.min(seconds, duration || seconds))
    if (useRecitationStore.getState().currentShabadId !== shabadId) {
      setCurrentShabad(shabadId)
    }
    audio.currentTime = nextTime
    setCurrentTime(nextTime)
  }

  const handleSkip = (offset: number) => {
    const audio = audioRef.current
    if (!audio || !audioUrl) return
    seekTo(audio.currentTime + offset)
  }

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate)
    if (audioRef.current) audioRef.current.playbackRate = rate
  }

  return (
    <section className="gurbani-audio-player" aria-labelledby={`${seekId}-title`} data-testid="gurbani-audio-player">
      <div className="gurbani-audio-player__heading">
        <div>
          <p id={`${seekId}-title`} className="gurbani-audio-player__title">{copy.title}</p>
          <p className="gurbani-audio-player__description">{copy.description}</p>
        </div>
        <span className="gurbani-audio-player__source" aria-hidden="true">BaniDB</span>
      </div>

      {loading ? (
        <p role="status" className="gurbani-audio-player__state">{copy.loading}</p>
      ) : !audioUrl ? (
        <p className="gurbani-audio-player__state">{error ?? copy.unavailable}</p>
      ) : (
        <>
          <audio
            ref={audioRef}
            src={audioUrl}
            preload="none"
            onLoadedMetadata={handleLoadedMetadata}
            onDurationChange={handleLoadedMetadata}
            onTimeUpdate={event => {
              const nextTime = event.currentTarget.currentTime
              if (useRecitationStore.getState().currentShabadId === shabadId) {
                setCurrentTime(nextTime)
              }
            }}
            onPlay={() => {
              if (useRecitationStore.getState().currentShabadId !== shabadId) {
                setCurrentShabad(shabadId)
              }
              setPlaying(true)
            }}
            onPause={() => {
              if (useRecitationStore.getState().currentShabadId === shabadId) {
                setPlaying(false)
              }
            }}
            onEnded={() => {
              if (useRecitationStore.getState().currentShabadId === shabadId) {
                setPlaying(false)
              }
            }}
            onError={() => {
              if (useRecitationStore.getState().currentShabadId === shabadId) {
                setPlaying(false)
              }
              setPlaybackError({ shabadId, value: true })
            }}
            data-testid="gurbani-recitation-audio"
          />

          <div className="gurbani-audio-player__timeline">
            <label htmlFor={seekId} className="sr-only">{copy.seek}</label>
            <input
              id={seekId}
              type="range"
              min="0"
              max={duration > 0 ? duration : 1}
              step="0.1"
              value={Math.min(displayTime, duration > 0 ? duration : 1)}
              disabled={duration <= 0}
              onChange={event => seekTo(Number(event.target.value))}
              aria-valuetext={`${formatTime(displayTime)} / ${formatTime(duration)}`}
            />
            <div className="gurbani-audio-player__time" aria-hidden="true">
              <span>{formatTime(displayTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="gurbani-audio-player__controls">
            <button type="button" onClick={() => handleSkip(-15)} aria-label={copy.back}>
              <span aria-hidden="true">−15</span>
            </button>
            <button
              type="button"
              onClick={handleTogglePlayback}
              aria-label={isPlaying ? copy.pause : copy.play}
              className="gurbani-audio-player__play"
            >
              {isPlaying ? <IconPause size={18} /> : <IconPlay size={18} />}
            </button>
            <button type="button" onClick={() => handleSkip(15)} aria-label={copy.forward}>
              <span aria-hidden="true">+15</span>
            </button>
            <label className="gurbani-audio-player__speed">
              <span>{copy.speed}</span>
              <select
                value={playbackRate}
                onChange={event => handleSpeedChange(Number(event.target.value))}
                aria-label={copy.speed}
              >
                {PLAYBACK_RATES.map(rate => (
                  <option key={rate} value={rate}>{rate}×</option>
                ))}
              </select>
            </label>
          </div>

          {error ? <p role="alert" className="gurbani-audio-player__error">{error}</p> : null}
        </>
      )}
    </section>
  )
}
