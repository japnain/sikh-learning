import { SOUNDS } from '../store/music'

let activeAudio: HTMLAudioElement | null = null
let activeSoundId: string | null = null
let targetVolume = 0.6
const fadeTimers = new Set<number>()

function clearFadeTimers() {
  for (const timer of fadeTimers) {
    window.clearInterval(timer)
  }
  fadeTimers.clear()
}

function fadeTo(audio: HTMLAudioElement, nextVolume: number, onDone?: () => void) {
  const step = nextVolume > audio.volume ? 0.05 : -0.05
  const timer = window.setInterval(() => {
    const reachedTarget = step > 0 ? audio.volume >= nextVolume : audio.volume <= nextVolume
    if (reachedTarget) {
      audio.volume = Math.max(0, Math.min(1, nextVolume))
      window.clearInterval(timer)
      fadeTimers.delete(timer)
      onDone?.()
      return
    }

    const candidate = Number((audio.volume + step).toFixed(3))
    if ((step > 0 && candidate > nextVolume) || (step < 0 && candidate < nextVolume)) {
      audio.volume = nextVolume
    } else {
      audio.volume = Math.max(0, Math.min(1, candidate))
    }
  }, 50)
  fadeTimers.add(timer)
}

export function playSound(id: string): void {
  const sound = SOUNDS.find(entry => entry.id === id)
  if (!sound) return
  clearFadeTimers()

  if (activeAudio && activeSoundId === id) {
    activeAudio.loop = true
    void activeAudio.play()
    fadeTo(activeAudio, targetVolume)
    return
  }

  const nextAudio = new Audio(sound.src)
  nextAudio.loop = true
  nextAudio.preload = 'auto'
  nextAudio.volume = 0

  const previousAudio = activeAudio
  activeAudio = nextAudio
  activeSoundId = id

  void nextAudio.play().then(() => {
    fadeTo(nextAudio, targetVolume)
  }).catch(() => {
    if (activeAudio === nextAudio) {
      activeAudio = null
      activeSoundId = null
    }
  })

  if (previousAudio) {
    fadeTo(previousAudio, 0, () => {
      previousAudio.pause()
      previousAudio.currentTime = 0
    })
  }
}

export function stopSound(): void {
  if (!activeAudio) return
  clearFadeTimers()
  const audioToStop = activeAudio
  activeAudio = null
  activeSoundId = null
  fadeTo(audioToStop, 0, () => {
    audioToStop.pause()
    audioToStop.currentTime = 0
  })
}

export function setMasterVolume(v: number): void {
  targetVolume = Math.max(0, Math.min(1, v))
  if (activeAudio) {
    activeAudio.volume = targetVolume
  }
}
