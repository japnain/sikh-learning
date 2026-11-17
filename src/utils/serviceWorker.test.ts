import { afterEach, beforeEach, expect, test, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('PROD', true)
  vi.stubEnv('BASE_URL', '/')
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks() })

test('registers when loaded after the document load event and only starts once', async () => {
  vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete')
  const registration = Object.assign(new EventTarget(), { waiting: null })
  const register = vi.fn().mockResolvedValue(registration)
  vi.stubGlobal('navigator', { serviceWorker: { register } })
  const { registerNaamRasServiceWorker } = await import('./serviceWorker')
  registerNaamRasServiceWorker()
  registerNaamRasServiceWorker()
  expect(register).toHaveBeenCalledExactlyOnceWith('/sw.js', { scope: '/', updateViaCache: 'none' })
})

test('waits for document load when registration starts during initial loading', async () => {
  vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading')
  const registration = Object.assign(new EventTarget(), { waiting: null })
  const register = vi.fn().mockResolvedValue(registration)
  vi.stubGlobal('navigator', { serviceWorker: { register } })
  const { registerNaamRasServiceWorker } = await import('./serviceWorker')
  registerNaamRasServiceWorker()
  expect(register).not.toHaveBeenCalled()
  window.dispatchEvent(new Event('load'))
  expect(register).toHaveBeenCalledExactlyOnceWith('/sw.js', { scope: '/', updateViaCache: 'none' })
})
