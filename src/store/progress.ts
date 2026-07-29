import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LibraryReaderLocator, StudiedEntry } from '../types'
import { getUpdatedStreak } from '../utils/streak'
import { queueActivityEvent } from './activityEvents'

export interface Session {
  scriptureId: string
  resumePath: string
  resumeVerseId?: number
  readerLocator?: LibraryReaderLocator
  updatedAt: string
}

interface ProgressState {
  studied: StudiedEntry[]
  reviewQueue: string[]
  lastStudied: string | null
  streak: number
  currentSession: Session | null
  markStudied: (id: string) => void
  addToReview: (id: string) => void
  updateSession: (session: Session) => void
  clearSession: () => void
  recordSwipeToday: () => void
}

const READING_HISTORY_LIMIT = 50

type LegacySession = {
  scriptureId: string
  lastCardIndex: number
}

function parseSessionScriptureIdParts(scriptureId: string | null | undefined): { source: string | null; ang: number | null } {
  if (!scriptureId) return { source: null, ang: null }

  const parts = scriptureId.split('-')
  if (parts.length < 2) return { source: null, ang: null }

  return {
    source: parts[0] ?? null,
    ang: Number(parts[1]) || null,
  }
}

function buildLegacyResumePath(scriptureId: string | null | undefined): string | null {
  const { source, ang } = parseSessionScriptureIdParts(scriptureId)
  if (!source || !ang) return null
  return `/study?source=${source}&ang=${ang}`
}

function isRetiredPanthPrakashResumePath(path: string | null | undefined) {
  return Boolean(path?.startsWith('/library/panth-prakash-english/page/')
    || path?.startsWith('/library/panth-prakash-english/episode/'))
}

export function parseSessionScriptureId(scriptureId: string | null | undefined): { source: string | null; ang: number | null } {
  return parseSessionScriptureIdParts(scriptureId)
}

export function buildSessionResumePath(session: Session | null | undefined): string | null {
  if (!session) return null

  const basePath = session.resumePath || buildLegacyResumePath(session.scriptureId)
  if (!basePath) return null
  if (isRetiredPanthPrakashResumePath(basePath)) return null

  if (session.readerLocator?.locations.blockId) {
    const pathWithoutHash = basePath.split('#')[0]
    return `${pathWithoutHash}#${encodeURIComponent(session.readerLocator.locations.blockId)}`
  }

  if (!session.resumeVerseId) {
    return basePath
  }

  const [pathname, rawSearch = ''] = basePath.split('?')
  const params = new URLSearchParams(rawSearch)

  if (!params.has('verseId')) {
    params.set('resumeVerseId', String(session.resumeVerseId))
  }

  const nextSearch = params.toString()
  return nextSearch ? `${pathname}?${nextSearch}` : pathname
}

function normalizeSession(session: Session | LegacySession | null | undefined): Session | null {
  if (!session || typeof session !== 'object') return null

  if (typeof session.scriptureId !== 'string' || !session.scriptureId.trim()) {
    return null
  }

  if ('resumePath' in session && typeof session.resumePath === 'string' && session.resumePath.trim()) {
    if (isRetiredPanthPrakashResumePath(session.resumePath)) return null

    const resumeVerseId = typeof session.resumeVerseId === 'number' && session.resumeVerseId > 0
      ? session.resumeVerseId
      : undefined
    const updatedAt = typeof session.updatedAt === 'string' && session.updatedAt.trim()
      ? session.updatedAt
      : new Date().toISOString()
    const readerLocator = session.readerLocator
      && typeof session.readerLocator.href === 'string'
      && typeof session.readerLocator.locations?.totalProgression === 'number'
      ? session.readerLocator
      : undefined

    return {
      scriptureId: session.scriptureId,
      resumePath: session.resumePath,
      ...(resumeVerseId ? { resumeVerseId } : {}),
      ...(readerLocator ? { readerLocator } : {}),
      updatedAt,
    }
  }

  const legacyResumePath = buildLegacyResumePath(session.scriptureId)
  if (!legacyResumePath) return null

  return {
    scriptureId: session.scriptureId,
    resumePath: legacyResumePath,
    updatedAt: new Date().toISOString(),
  }
}

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      studied: [],
      reviewQueue: [],
      lastStudied: null,
      streak: 0,
      currentSession: null,

      markStudied: (id) => set(state => ({
        studied: [...state.studied.filter(s => s.id !== id), { id, swipedAt: new Date().toISOString() }]
          .slice(-READING_HISTORY_LIMIT),
        reviewQueue: state.reviewQueue.filter(r => r !== id),
      })),

      addToReview: (id) => set(state => ({
        reviewQueue: state.reviewQueue.includes(id) ? state.reviewQueue : [...state.reviewQueue, id],
      })),

      updateSession: (session) => set({ currentSession: session }),

      clearSession: () => set({ currentSession: null }),

      recordSwipeToday: () => {
        const occurredAt = new Date().toISOString()
        let nextStreak = 0
        let nextLastStudied: string | null = null
        set(state => {
          const today = todayLocal()
          const updated = getUpdatedStreak({ streak: state.streak, lastStudied: state.lastStudied }, today)
          nextStreak = updated.streak
          nextLastStudied = updated.lastStudied
          return updated
        })
        queueActivityEvent('study.swipe-recorded', {
          streak: nextStreak,
          lastStudied: nextLastStudied,
        }, occurredAt)
      },
    }),
    {
      name: 'sikh-progress',
      version: 3,
      migrate: (persistedState) => {
        const state = (persistedState as Partial<ProgressState> | undefined) ?? {}

        return {
          ...state,
          studied: Array.isArray(state.studied)
            ? state.studied.slice(-READING_HISTORY_LIMIT)
            : [],
          currentSession: normalizeSession(state.currentSession as Session | LegacySession | null | undefined),
        }
      },
    }
  )
)
