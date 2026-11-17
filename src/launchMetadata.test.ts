import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

test('installed launch uses the documented paper fallback and valid icon dimensions', () => {
  const root = process.cwd()
  const manifest = JSON.parse(readFileSync(resolve(root, 'public/manifest.webmanifest'), 'utf8'))
  const html = readFileSync(resolve(root, 'index.html'), 'utf8')
  const tokens = readFileSync(resolve(root, 'src/styles/tokens.css'), 'utf8')
  const lightColor = tokens.match(/--theme-color:\s*(#[\da-f]+);/i)?.[1]
  expect(lightColor).toBeDefined()
  expect(manifest.background_color).toBe(lightColor)
  expect(manifest.theme_color).toBe(lightColor)
  expect(html).toContain(`var lightThemeColor = '${lightColor}'`)
  expect(html).toContain(`<meta name="theme-color" content="${lightColor}"`)
  for (const icon of manifest.icons) {
    const bytes = readFileSync(resolve(root, 'public', icon.src.slice(1)))
    expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`).toBe(icon.sizes)
  }
})
