import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const THEME_STORAGE_KEY = 'sikh-theme'
export const LIGHT_THEME_COLOR = '#f2f1e9'
export const DARK_THEME_COLOR = '#070c0e'

export interface ThemeState {
  dark: boolean
  setDark: (next: boolean) => void
  toggle: () => void
}

type PersistedThemeState = {
  state?: {
    dark?: unknown
  }
  dark?: unknown
}

function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function readStoredDarkPreference(storage = getBrowserStorage()): boolean | null {
  if (!storage) return null

  try {
    const stored = storage.getItem(THEME_STORAGE_KEY)
    if (!stored) return null

    const parsed = JSON.parse(stored) as PersistedThemeState
    const value = parsed.state?.dark ?? parsed.dark
    return typeof value === 'boolean' ? value : null
  } catch {
    return null
  }
}

export function getInitialDarkPreference(): boolean {
  const stored = readStoredDarkPreference()
  if (stored !== null) return stored

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyThemeToDocument(dark: boolean, documentRef = typeof document === 'undefined' ? null : document) {
  if (!documentRef) return

  const root = documentRef.documentElement
  root.classList.toggle('dark', dark)
  root.dataset.theme = dark ? 'dark' : 'light'
  root.style.colorScheme = dark ? 'dark' : 'light'

  const themeColorMeta = documentRef.querySelector('meta[name="theme-color"]')
  themeColorMeta?.setAttribute('content', dark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR)
}

const initialDark = getInitialDarkPreference()
applyThemeToDocument(initialDark)

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      dark: initialDark,
      setDark: (next) => set(() => {
        applyThemeToDocument(next)
        return { dark: next }
      }),
      toggle: () => set(state => {
        const next = !state.dark
        applyThemeToDocument(next)
        return { dark: next }
      }),
    }),
    {
      name: THEME_STORAGE_KEY,
      onRehydrateStorage: () => (state) => {
        applyThemeToDocument(state?.dark ?? getInitialDarkPreference())
      },
    }
  )
)
