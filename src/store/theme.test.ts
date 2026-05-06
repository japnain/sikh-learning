import { describe, expect, test, vi, beforeEach } from 'vitest'

function setSystemDarkPreference(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? matches : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })),
  })
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

async function loadThemeModule(options: { systemDark?: boolean; storedDark?: boolean } = {}) {
  vi.resetModules()
  localStorage.clear()
  resetThemeDocument()
  setSystemDarkPreference(options.systemDark ?? false)

  if (typeof options.storedDark === 'boolean') {
    localStorage.setItem('sikh-theme', JSON.stringify({
      state: { dark: options.storedDark },
      version: 0,
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
