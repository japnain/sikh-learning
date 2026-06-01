import { beforeEach, expect, test } from 'vitest'
import { hasQaFault, withQaControl } from './runtime'

beforeEach(() => {
  window.localStorage.clear()
  window.history.replaceState({}, '', '/')
})

test('reads fail controls from the query string', async () => {
  window.history.replaceState({}, '', '/?qaFail=home-search')

  expect(hasQaFault('fail', 'home-search')).toBe(true)
  await expect(withQaControl('home-search', async () => 'ok')).rejects.toMatchObject({
    name: 'QaFaultError',
  })
})

test('reads empty controls from localStorage', async () => {
  window.localStorage.setItem('naamras:qa-controls', JSON.stringify({
    empty: ['study-ang'],
  }))

  const value = await withQaControl('study-ang', async () => 'loaded', {
    emptyValue: 'empty',
  })

  expect(value).toBe('empty')
})

test('falls through to the wrapped loader without controls', async () => {
  const value = await withQaControl('study-ang', async () => 'loaded')
  expect(value).toBe('loaded')
})
