import { useState, useEffect, useRef } from 'react'
import { fetchAudio } from '../api/banidb'
import { IconPlay, IconPause } from './icons'

interface Props {
  shabadId: number
}

export default function AudioPlayer({ shabadId }: Props) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    setLoading(true)
    setPlaying(false)
    fetchAudio(shabadId)
      .then(url => setAudioUrl(url))
      .finally(() => setLoading(false))
  }, [shabadId])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio || !audioUrl) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    }
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onEnd = () => setPlaying(false)
    audio.addEventListener('ended', onEnd)
    return () => audio.removeEventListener('ended', onEnd)
  }, [audioUrl])

  if (loading || !audioUrl) return null

  return (
    <div className="flex items-center gap-2 px-1 mb-1">
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="none" />}
      <button
        onClick={toggle}
        className="flex items-center gap-2 font-sans text-xs text-gold dark:text-gold-light min-h-[44px] min-w-[44px] justify-center active:scale-95 transition-transform duration-150"
        aria-label={playing ? 'Pause recitation' : 'Play recitation'}
      >
        {playing ? <IconPause size={16} /> : <IconPlay size={16} />}
        <span>{playing ? 'Pause' : 'Listen'}</span>
      </button>
    </div>
  )
}
