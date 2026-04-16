import { expect, test } from 'vitest'
import { getRouterBasename, normalizeBasePath, resolveAppPath } from './basePath'

test('normalizes app base paths for routed deployments', () => {
  expect(normalizeBasePath(undefined)).toBe('/')
  expect(normalizeBasePath('/')).toBe('/')
  expect(normalizeBasePath('/naamras')).toBe('/naamras/')
  expect(normalizeBasePath('naamras')).toBe('/naamras/')
})

test('derives a router basename only when the app is mounted below root', () => {
  expect(getRouterBasename('/')).toBeUndefined()
  expect(getRouterBasename('/naamras/')).toBe('/naamras')
  expect(getRouterBasename('naamras')).toBe('/naamras')
})

test('resolves app asset paths against the deployed base path', () => {
  expect(resolveAppPath('/data/learn/manifest.json', '/')).toBe('/data/learn/manifest.json')
  expect(resolveAppPath('/data/learn/manifest.json', '/naamras/')).toBe('/naamras/data/learn/manifest.json')
  expect(resolveAppPath('data/learn/manifest.json', '/naamras/')).toBe('/naamras/data/learn/manifest.json')
  expect(resolveAppPath('https://cdn.example.com/manifest.json', '/naamras/')).toBe('https://cdn.example.com/manifest.json')
})
