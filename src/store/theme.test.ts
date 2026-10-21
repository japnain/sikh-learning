import { describe, expect, test, vi, beforeEach } from 'vitest'

let systemDark = false
let systemListeners = new Set<(event: MediaQueryListEvent) => void>()
function setSystemDarkPreference(matches: boolean) {
  systemDark = matches
  systemListeners = new Set()
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      get matches() { return query === '(prefers-color-scheme: dark)' ? systemDark : false },
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: (_type: string, handler: (event: MediaQueryListEvent) => void) => systemListeners.add(handler),
      removeEventListener: (_type: string, handler: (event: MediaQueryListEvent) => void) => systemListeners.delete(handler),
      dispatchEvent: () => false,
    })),
  })
}

function changeSystemDarkPreference(matches: boolean) {
  systemDark = matches
  systemListeners.forEach(listener => listener({ matches } as MediaQueryListEvent))
}

function resetThemeDocument() {
  const root = document.documentElement
  root.className = ''
  root.removeAttribute('data-theme')
  root.style.colorScheme = ''

  document.querySelector('meta[name="theme-color"]')?.remove()
  const meta = document.createElement('meta')
  meta.setAttribute('name', 'theme-color')
  document.head.appendChild(meta)
}

async function loadThemeModule(options: { systemDark?: boolean; storedDark?: boolean; storedMode?: 'light' | 'dark' | 'system' } = {}) {
  vi.resetModules()
  localStorage.clear()
  resetThemeDocument()
  setSystemDarkPreference(options.systemDark ?? false)

  if (typeof options.storedDark === 'boolean' || options.storedMode) {
    localStorage.setItem('sikh-theme', JSON.stringify({
      state: { dark: options.storedDark, ...(options.storedMode ? { mode: options.storedMode } : {}) },
      version: options.storedMode ? 1 : 0,
    }))
  }

  return import('./theme')
}

describe('theme store', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  test('stored dark preference wins over system preference', async () => {
    const { useThemeStore, DARK_THEME_COLOR } = await loadThemeModule({
      systemDark: false,
      storedDark: true,
    })

    expect(useThemeStore.getState().dark).toBe(true)
    expect(useThemeStore.getState().mode).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', DARK_THEME_COLOR)
  })

  test('system dark preference is used when nothing is stored', async () => {
    const { useThemeStore } = await loadThemeModule({ systemDark: true })

    expect(useThemeStore.getState().dark).toBe(true)
    expect(document.documentElement).toHaveClass('dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(useThemeStore.getState().mode).toBe('system')
  })

  test('stored System resolves against the current OS instead of its old dark boolean', async () => {
    const { useThemeStore } = await loadThemeModule({ systemDark: true, storedDark: false, storedMode: 'system' })
    expect(useThemeStore.getState()).toMatchObject({ mode: 'system', dark: true })
    changeSystemDarkPreference(false)
    expect(useThemeStore.getState().dark).toBe(false)
    expect(document.documentElement).not.toHaveClass('dark')
  })

  test('explicit Light survives migration and ignores subsequent OS changes', async () => {
    const { useThemeStore } = await loadThemeModule({ systemDark: true, storedDark: false })
    expect(useThemeStore.getState()).toMatchObject({ mode: 'light', dark: false })
    changeSystemDarkPreference(false)
    changeSystemDarkPreference(true)
    expect(useThemeStore.getState().dark).toBe(false)
    useThemeStore.getState().setMode('system')
    expect(useThemeStore.getState().dark).toBe(true)
    expect(JSON.parse(localStorage.getItem('sikh-theme')!).state.mode).toBe('system')
  })

  test('setDark and toggle update the document theme contract', async () => {
    const { useThemeStore, DARK_THEME_COLOR, LIGHT_THEME_COLOR } = await loadThemeModule({ systemDark: false })

    useThemeStore.getState().setDark(true)

    expect(useThemeStore.getState().dark).toBe(true)
    expect(document.documentElement).toHaveClass('dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', DARK_THEME_COLOR)

    useThemeStore.getState().toggle()

    expect(useThemeStore.getState().dark).toBe(false)
    expect(document.documentElement).not.toHaveClass('dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(document.documentElement.style.colorScheme).toBe('light')
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', LIGHT_THEME_COLOR)
  })
})
