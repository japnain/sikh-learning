import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mockDocumentScroll } from '../test/documentScroll'

let scroll: ReturnType<typeof mockDocumentScroll>
beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
  sessionStorage.clear()
  scroll = mockDocumentScroll({ top: 480, scrollHeight: 3000 })
})
afterEach(() => {
  scroll.restore()
  vi.useRealTimers()
  document.getElementById('discovery-target')?.remove()
})

describe('discovery handoffs', () => {
  test('restores scroll and keyboard focus once after the app route resets', async () => {
    const { rememberDiscoveryReturn, restoreDiscoveryReturn } = await import('./discoveryReturn')
    const button = document.createElement('button')
    button.id = 'discovery-target'
    document.body.append(button)
    rememberDiscoveryReturn('/banis?collection=sources&sourceOpen=sggs', button.id)
    scroll.setTop(0)
    const cancel = restoreDiscoveryReturn('/banis?collection=sources&sourceOpen=sggs')
    await vi.runAllTimersAsync()
    expect(scroll.getTop()).toBe(480)
    expect(button).toHaveFocus()
    scroll.setTop(100)
    restoreDiscoveryReturn('/banis?collection=sources&sourceOpen=sggs')
    await vi.runAllTimersAsync()
    expect(scroll.getTop()).toBe(100)
    cancel()
  })

  test('a cancelled first effect does not consume the return hint', async () => {
    const { rememberDiscoveryReturn, restoreDiscoveryReturn } = await import('./discoveryReturn')
    rememberDiscoveryReturn('/banis?collection=books')
    scroll.setTop(0)
    restoreDiscoveryReturn('/banis?collection=books')()
    restoreDiscoveryReturn('/banis?collection=books')
    await vi.runAllTimersAsync()
    expect(scroll.getTop()).toBe(480)
  })

  test('respects user navigation instead of pulling them back later', async () => {
    const { rememberDiscoveryReturn, restoreDiscoveryReturn } = await import('./discoveryReturn')
    rememberDiscoveryReturn('/banis?collection=stories')
    scroll.setTop(0)
    const cancel = restoreDiscoveryReturn('/banis?collection=stories')
    document.dispatchEvent(new Event('pointerdown'))
    await vi.runAllTimersAsync()
    expect(scroll.getTop()).toBe(0)
    cancel()
  })

  test('ignores corrupt, external and expired persisted hints', async () => {
    sessionStorage.setItem('naamras-discovery-return-v1', JSON.stringify([
      { path: '/banis', top: 700, focusId: null, savedAt: Date.now() - 31 * 60 * 1000 },
      { path: '/banis?collection=sources', top: -5, focusId: null, savedAt: Date.now() },
      { path: '//evil.example', top: 300, focusId: null, savedAt: Date.now() },
    ]))
    const { restoreDiscoveryReturn } = await import('./discoveryReturn')
    restoreDiscoveryReturn('/banis')
    restoreDiscoveryReturn('/banis?collection=sources')
    restoreDiscoveryReturn('//evil.example')
    await vi.runAllTimersAsync()
    expect(scroll.getTop()).toBe(480)
  })
})
