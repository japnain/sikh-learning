import { SOUNDS } from '../store/music'

interface PlaybackSession {
  id: number
  soundId: string
  audio: HTMLAudioElement | null
  fadeTimer: ReturnType<typeof globalThis.setTimeout> | null
}

const engineState: {
  session: PlaybackSession | null
  targetVolume: number
  commandToken: number
  nextSessionId: number
} = {
  session: null,
  targetVolume: 0.6,
  commandToken: 0,
  nextSessionId: 0,
}

export interface SoundPlaybackFailure {
  soundId: string
}

const playbackFailureListeners = new Set<(failure: SoundPlaybackFailure) => void>()

export function subscribeToSoundPlaybackFailures(
  listener: (failure: SoundPlaybackFailure) => void,
): () => void {
  playbackFailureListeners.add(listener)
  return () => playbackFailureListeners.delete(listener)
}

function reportPlaybackFailure(soundId: string) {
  playbackFailureListeners.forEach(listener => listener({ soundId }))
}

function clampVolume(value: number) {
  return Math.max(0, Math.min(1, value))
}

function cleanupAudio(audio: HTMLAudioElement) {
  audio.pause()
  audio.currentTime = 0
}

function clearSessionFade(session: PlaybackSession) {
  if (session.fadeTimer !== null) {
    globalThis.clearTimeout(session.fadeTimer)
    session.fadeTimer = null
  }
}

function cleanupSession(session: PlaybackSession) {
  clearSessionFade(session)

  if (session.audio) {
    cleanupAudio(session.audio)
    session.audio = null
  }
}

function fadeSessionTo(session: PlaybackSession, nextVolume: number, onDone?: () => void) {
  clearSessionFade(session)

  const audio = session.audio
  if (!audio) {
    onDone?.()
    return
  }

  const clampedTarget = clampVolume(nextVolume)
  if (audio.volume === clampedTarget) {
    onDone?.()
    return
  }

  const step = clampedTarget > audio.volume ? 0.05 : -0.05
  const tick = () => {
    if (session.audio !== audio) {
      clearSessionFade(session)
      return
    }

    const reachedTarget = step > 0 ? audio.volume >= clampedTarget : audio.volume <= clampedTarget
    if (reachedTarget) {
      audio.volume = clampedTarget
      session.fadeTimer = null
      onDone?.()
      return
    }

    const candidate = Number((audio.volume + step).toFixed(3))
    if ((step > 0 && candidate > clampedTarget) || (step < 0 && candidate < clampedTarget)) {
      audio.volume = clampedTarget
    } else {
      audio.volume = clampVolume(candidate)
    }

    session.fadeTimer = globalThis.setTimeout(tick, 50)
  }

  session.fadeTimer = globalThis.setTimeout(tick, 50)
}

function updateTargetVolume(v: number, options?: { applyToSession?: PlaybackSession | null }) {
  engineState.targetVolume = clampVolume(v)

  const targetSession = options?.applyToSession
  if (!targetSession?.audio) return

  clearSessionFade(targetSession)
  targetSession.audio.volume = engineState.targetVolume
}

function startSoundPlayback(id: string, commandToken: number) {
  const sound = SOUNDS.find(entry => entry.id === id)
  if (!sound) return

  const session: PlaybackSession = {
    id: ++engineState.nextSessionId,
    soundId: id,
    audio: null,
    fadeTimer: null,
  }

  engineState.session = session

  const trySource = (src: string, allowFallback: boolean) => {
    const nextAudio = new Audio(src)
    nextAudio.loop = true
    nextAudio.preload = 'auto'
    nextAudio.volume = 0
    session.audio = nextAudio

    void nextAudio.play()
      .then(() => {
        if (commandToken !== engineState.commandToken || engineState.session !== session || session.audio !== nextAudio) {
          cleanupAudio(nextAudio)
          return
        }

        fadeSessionTo(session, engineState.targetVolume)
      })
      .catch(() => {
        cleanupAudio(nextAudio)

        if (commandToken !== engineState.commandToken || engineState.session !== session || session.audio !== nextAudio) {
          return
        }

        if (allowFallback && sound.fallbackSrc && sound.fallbackSrc !== src) {
          session.audio = null
          trySource(sound.fallbackSrc, false)
          return
        }

        session.audio = null
        engineState.session = null
        reportPlaybackFailure(id)
      })
  }

  trySource(sound.src, true)
}

export function playSound(id: string): void {
  if (!SOUNDS.some(entry => entry.id === id)) return

  engineState.commandToken += 1
  const commandToken = engineState.commandToken
  const activeSession = engineState.session

  if (activeSession && activeSession.soundId === id) {
    clearSessionFade(activeSession)

    const audio = activeSession.audio
    if (!audio) {
      cleanupSession(activeSession)
      engineState.session = null
      startSoundPlayback(id, commandToken)
      return
    }

    audio.loop = true
    void audio.play()
      .then(() => {
        if (commandToken !== engineState.commandToken || engineState.session !== activeSession || activeSession.audio !== audio) {
          cleanupAudio(audio)
          return
        }

        fadeSessionTo(activeSession, engineState.targetVolume)
      })
      .catch(() => {
        cleanupSession(activeSession)
        if (engineState.session === activeSession) {
          engineState.session = null
        }

        if (commandToken === engineState.commandToken) {
          startSoundPlayback(id, commandToken)
        }
      })
    return
  }

  if (activeSession) {
    engineState.session = null
    fadeSessionTo(activeSession, 0, () => {
      cleanupSession(activeSession)

      if (commandToken === engineState.commandToken) {
        startSoundPlayback(id, commandToken)
      }
    })
    return
  }

  startSoundPlayback(id, commandToken)
}

export function stopSound(immediate: boolean = true): void {
  const activeSession = engineState.session
  if (!activeSession) return

  engineState.commandToken += 1
  engineState.session = null

  if (immediate) {
    cleanupSession(activeSession)
    return
  }

  fadeSessionTo(activeSession, 0, () => {
    cleanupSession(activeSession)
  })
}

export function setMasterVolume(v: number): void {
  updateTargetVolume(v, { applyToSession: engineState.session })
}

export function syncSoundPlayback(nextState: {
  selectedSoundId: string | null
  isPlaying: boolean
  volume: number
}) {
  const activeSession = engineState.session
  const shouldApplyVolumeToActiveSession = Boolean(
    activeSession
      && nextState.isPlaying
      && nextState.selectedSoundId
      && activeSession.soundId === nextState.selectedSoundId
  )

  updateTargetVolume(nextState.volume, {
    applyToSession: shouldApplyVolumeToActiveSession ? activeSession : null,
  })

  if (nextState.isPlaying && nextState.selectedSoundId) {
    playSound(nextState.selectedSoundId)
    return
  }

  stopSound()
}

export function __resetSoundEngineForTests(): void {
  engineState.commandToken = 0
  engineState.nextSessionId = 0
  engineState.targetVolume = 0.6

  if (engineState.session) {
    cleanupSession(engineState.session)
  }

  engineState.session = null
}

export function __getSoundEngineSnapshotForTests(): {
  activeAudio: HTMLAudioElement | null
  activeSoundId: string | null
  targetVolume: number
} {
  return {
    activeAudio: engineState.session?.audio ?? null,
    activeSoundId: engineState.session?.soundId ?? null,
    targetVolume: engineState.targetVolume,
  }
}
