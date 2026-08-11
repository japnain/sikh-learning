import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'

const PROJECT_ROOT = process.cwd()

test('the production service worker provides an offline shell without forcing an in-session reload', () => {
  const worker = fs.readFileSync(path.join(PROJECT_ROOT, 'public', 'sw.js'), 'utf8')
  const registration = fs.readFileSync(path.join(PROJECT_ROOT, 'src', 'utils', 'serviceWorker.ts'), 'utf8')

  expect(worker).toContain("caches.match('/',")
  expect(worker).toContain('ignoreVary: true')
  expect(worker).toContain("request.mode === 'navigate'")
  expect(worker).toContain("url.origin !== self.location.origin")
  expect(worker).toContain("url.pathname.startsWith('/api/')")
  expect(worker).not.toContain('skipWaiting')
  expect(worker).not.toContain('SKIP_WAITING')
  expect(registration).not.toContain("window.addEventListener('pagehide'")
  expect(registration).not.toContain('SKIP_WAITING')
  expect(registration).toContain("updateViaCache: 'none'")
  expect(registration).not.toContain('window.location.reload')
})

test('a new worker installs only after every required app-shell asset succeeds', () => {
  const worker = fs.readFileSync(path.join(PROJECT_ROOT, 'public', 'sw.js'), 'utf8')

  expect(worker).toContain("const REQUIRED_ASSETS = ['/', ...BUILD_ASSETS]")
  expect(worker).toContain('await Promise.all([...new Set(REQUIRED_ASSETS)]')
  expect(worker).toContain('throw new Error(`Unable to precache required asset: ${path}`)')
  expect(worker).toContain('await Promise.allSettled([...new Set(OPTIONAL_ASSETS)]')
})

test('stable public assets revalidate and participate in the generated cache version', () => {
  const worker = fs.readFileSync(path.join(PROJECT_ROOT, 'public', 'sw.js'), 'utf8')
  const generator = fs.readFileSync(path.join(PROJECT_ROOT, 'scripts', 'copy-public.mjs'), 'utf8')

  expect(worker).toContain('async function networkFirstStableAsset(request)')
  expect(worker).toContain('event.respondWith(networkFirstStableAsset(request))')
  expect(worker).toMatch(/url\.pathname\.startsWith\('\/assets\/'\)[\s\S]{0,160}cacheFirstAsset\(request\)/)
  expect(generator).toContain('.update(JSON.stringify(precacheAssets))')
  expect(generator).toContain('buildHash.update(relativePath)')
  expect(generator).toContain('buildHash.update(fs.readFileSync(stableAssetPath))')

  for (const stableAsset of [
    'manifest.webmanifest',
    'favicon.svg',
    'icons/apple-touch-icon.png',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'share-redirect.js',
  ]) {
    expect(generator).toContain(`'${stableAsset}'`)
  }
})

test('the web manifest remains installable as a standalone application', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(PROJECT_ROOT, 'public', 'manifest.webmanifest'), 'utf8'),
  ) as { display: string; start_url: string; scope: string; icons: unknown[] }

  expect(manifest.display).toBe('standalone')
  expect(manifest.start_url).toBe('/')
  expect(manifest.scope).toBe('/')
  expect(manifest.icons).toHaveLength(2)
})
