import { SOUNDS } from '../store/music'

let activeAudio: HTMLAudioElement | null = null
let activeSoundId: string | null = null
let targetVolume = 0.6
let fadeTimer: ReturnType<typeof globalThis.setTimeout> | null = null
let transitionId = 0

function clampVolume(value: number) {
  return Math.max(0, Math.min(1, value))
}

function clearFadeTimer() {
  if (fadeTimer !== null) {
    globalThis.clearTimeout(fadeTimer)
    fadeTimer = null
  }
}

function cleanupAudio(audio: HTMLAudioElement) {
  audio.pause()
  audio.currentTime = 0
}

function fadeTo(audio: HTMLAudioElement, nextVolume: number, onDone?: () => void) {
  clearFadeTimer()

  const clampedTarget = clampVolume(nextVolume)
  const step = clampedTarget > audio.volume ? 0.05 : -0.05
  const tick = () => {
    const reachedTarget = step > 0 ? audio.volume >= clampedTarget : audio.volume <= clampedTarget
    if (reachedTarget) {
      audio.volume = clampedTarget
      fadeTimer = null
      onDone?.()
      return
    }

    const candidate = Number((audio.volume + step).toFixed(3))
    if ((step > 0 && candidate > clampedTarget) || (step < 0 && candidate < clampedTarget)) {
      audio.volume = clampedTarget
    } else {
      audio.volume = clampVolume(candidate)
    }

    fadeTimer = globalThis.setTimeout(tick, 50)
  }

  fadeTimer = globalThis.setTimeout(tick, 50)
}

function startSoundPlayback(id: string, currentTransitionId: number) {
  const sound = SOUNDS.find(entry => entry.id === id)
  if (!sound) return

  const nextAudio = new Audio(sound.src)
  nextAudio.loop = true
  nextAudio.preload = 'auto'
  nextAudio.volume = 0

  activeAudio = nextAudio
  activeSoundId = id

  void nextAudio.play()
    .then(() => {
      if (currentTransitionId !== transitionId) {
        cleanupAudio(nextAudio)
        return
      }
      fadeTo(nextAudio, targetVolume)
    })
    .catch(() => {
      if (activeAudio === nextAudio) {
        cleanupAudio(nextAudio)
        activeAudio = null
        activeSoundId = null
      }
    })
}

export function playSound(id: string): void {
  if (!SOUNDS.some(entry => entry.id === id)) return
  clearFadeTimer()
  transitionId += 1
  const currentTransitionId = transitionId

  if (activeAudio && activeSoundId === id) {
    activeAudio.loop = true
    activeAudio.volume = targetVolume === 0 ? 0 : activeAudio.volume
    void activeAudio.play()
    fadeTo(activeAudio, targetVolume)
    return
  }

  if (activeAudio) {
    const previousAudio = activeAudio
    activeAudio = null
    activeSoundId = null
    fadeTo(previousAudio, 0, () => {
      cleanupAudio(previousAudio)
      if (currentTransitionId === transitionId) {
        startSoundPlayback(id, currentTransitionId)
      }
    })
    return
  }

  startSoundPlayback(id, currentTransitionId)
}

export function stopSound(immediate: boolean = true): void {
  if (!activeAudio) return
  clearFadeTimer()
  transitionId += 1
  const audioToStop = activeAudio
  activeAudio = null
  activeSoundId = null

  if (immediate) {
    cleanupAudio(audioToStop)
    return
  }

  fadeTo(audioToStop, 0, () => {
    cleanupAudio(audioToStop)
  })
}

export function setMasterVolume(v: number): void {
  targetVolume = clampVolume(v)
  clearFadeTimer()
  if (activeAudio) {
    activeAudio.volume = targetVolume
  }
}

export function __resetSoundEngineForTests(): void {
  clearFadeTimer()
  if (activeAudio) {
    cleanupAudio(activeAudio)
  }
  activeAudio = null
  activeSoundId = null
  targetVolume = 0.6
}

export function __getSoundEngineSnapshotForTests(): {
  activeAudio: HTMLAudioElement | null
  activeSoundId: string | null
  targetVolume: number
} {
  return {
    activeAudio,
    activeSoundId,
    targetVolume,
  }
}
