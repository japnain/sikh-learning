import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const THEME_STORAGE_KEY = 'sikh-theme'
export const LIGHT_THEME_COLOR = '#e5dfd2'
export const DARK_THEME_COLOR = '#111923'
export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemeState {
  dark: boolean
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  setDark: (next: boolean) => void
  toggle: () => void
}

type PersistedThemeState = {
  state?: {
    dark?: unknown
    mode?: unknown
  }
  dark?: unknown
  mode?: unknown
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

const systemThemeQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null

function resolveDark(mode: ThemeMode): boolean {
  return mode === 'system' ? (systemThemeQuery?.matches ?? false) : mode === 'dark'
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
  const mode = readStoredThemeMode(storage)
  return mode === null || mode === 'system' ? null : mode === 'dark'
}

export function readStoredThemeMode(storage = getBrowserStorage()): ThemeMode | null {
  if (!storage) return null

  try {
    const stored = storage.getItem(THEME_STORAGE_KEY)
    if (!stored) return null

    const parsed = JSON.parse(stored) as PersistedThemeState
    const mode = parsed.state?.mode ?? parsed.mode
    if (isThemeMode(mode)) return mode
    const value = parsed.state?.dark ?? parsed.dark
    return typeof value === 'boolean' ? (value ? 'dark' : 'light') : null
  } catch {
    return null
  }
}

export function getInitialDarkPreference(): boolean {
  return resolveDark(readStoredThemeMode() ?? 'system')
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
const initialMode = readStoredThemeMode() ?? 'system'
applyThemeToDocument(initialDark)

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      dark: initialDark,
      mode: initialMode,
      setMode: (mode) => {
        const dark = resolveDark(mode)
        applyThemeToDocument(dark)
        set({ mode, dark })
      },
      setDark: (next) => set(() => {
        applyThemeToDocument(next)
        return { dark: next, mode: next ? 'dark' : 'light' }
      }),
      toggle: () => set(state => {
        const next = !state.dark
        applyThemeToDocument(next)
        return { dark: next, mode: next ? 'dark' : 'light' }
      }),
    }),
    {
      name: THEME_STORAGE_KEY,
      version: 1,
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as { mode?: unknown; dark?: unknown }
        const mode = isThemeMode(state.mode)
          ? state.mode
          : typeof state.dark === 'boolean' ? (state.dark ? 'dark' : 'light') : 'system'
        return { mode, dark: resolveDark(mode) }
      },
      merge: (persistedState, currentState) => {
        const state = (persistedState ?? {}) as { mode?: unknown; dark?: unknown }
        const mode = isThemeMode(state.mode) ? state.mode : currentState.mode
        return { ...currentState, mode, dark: resolveDark(mode) }
      },
      onRehydrateStorage: () => (state) => {
        applyThemeToDocument(state?.dark ?? getInitialDarkPreference())
      },
    }
  )
)

const handleSystemThemeChange = (event: MediaQueryListEvent) => {
  if (useThemeStore.getState().mode !== 'system') return
  applyThemeToDocument(event.matches)
  useThemeStore.setState({ dark: event.matches })
}

if (systemThemeQuery?.addEventListener) {
  systemThemeQuery.addEventListener('change', handleSystemThemeChange)
} else {
  systemThemeQuery?.addListener?.(handleSystemThemeChange)
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (systemThemeQuery?.removeEventListener) systemThemeQuery.removeEventListener('change', handleSystemThemeChange)
    else systemThemeQuery?.removeListener?.(handleSystemThemeChange)
  })
}
