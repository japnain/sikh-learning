import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

test('index metadata uses the NaamRas brand', () => {
  const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')

  expect(indexHtml).toContain('<meta name="apple-mobile-web-app-title" content="NaamRas" />')
  expect(indexHtml).toContain('<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />')
  expect(indexHtml).toContain('<meta name="apple-mobile-web-app-status-bar-style" content="black" />')
  expect(indexHtml).not.toContain('apple-mobile-web-app-status-bar-style" content="black-translucent"')
  expect(indexHtml).toContain('<title>NaamRas</title>')
  expect(indexHtml).toContain('NaamRas is a premium Gurbani reading app')
})

test('web manifest uses the NaamRas brand', () => {
  const manifest = JSON.parse(
    readFileSync(resolve(process.cwd(), 'public/manifest.webmanifest'), 'utf8')
  ) as {
    name: string
    short_name: string
    description: string
  }

  expect(manifest.name).toBe('NaamRas')
  expect(manifest.short_name).toBe('NaamRas')
  expect(manifest.description).toMatch(/NaamRas is a premium Gurbani reading app/i)
})
