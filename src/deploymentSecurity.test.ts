import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'

interface VercelHeader {
  key: string
  value: string
}

interface VercelConfig {
  headers: Array<{
    source: string
    headers: VercelHeader[]
  }>
  rewrites: Array<{
    source: string
    destination: string
  }>
}

const PROJECT_ROOT = process.cwd()

test('deployment config applies the production security policy without breaking required services', () => {
  const config = JSON.parse(
    fs.readFileSync(path.join(PROJECT_ROOT, 'vercel.json'), 'utf8')
  ) as VercelConfig
  const headers = new Map(
    config.headers.flatMap(rule => rule.headers.map(header => [header.key, header.value] as const))
  )

  expect(headers.get('Strict-Transport-Security')).toContain('max-age=')
  expect(headers.get('X-Content-Type-Options')).toBe('nosniff')
  expect(headers.get('X-Frame-Options')).toBe('DENY')
  expect(headers.get('Referrer-Policy')).toBe('no-referrer')
  expect(headers.get('Permissions-Policy')).toContain('camera=()')
  expect(headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin')
  expect(headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate')
  expect(headers.get('Service-Worker-Allowed')).toBe('/')

  const policy = headers.get('Content-Security-Policy') ?? ''
  const scriptDirective = policy.split(';').find(directive => directive.trim().startsWith('script-src'))
  expect(scriptDirective).toContain("'self'")
  expect(scriptDirective).not.toContain("'unsafe-inline'")
  expect(policy).toContain("connect-src 'self' https://api.banidb.com")
  expect(policy).toContain('https://*.supabase.co')
  expect(policy).toContain('wss://*.supabase.co')
  expect(policy).toContain("media-src 'self' blob: https:")
  expect(policy).toContain("frame-ancestors 'none'")
  expect(policy).toContain("default-src 'self'")
  expect(policy).toContain("base-uri 'self'")
  expect(policy).toContain("object-src 'none'")
  expect(policy).toContain("form-action 'self'")
  expect(policy).toContain("worker-src 'self' blob:")
  expect(policy).toContain('upgrade-insecure-requests')

  expect(config.rewrites).toContainEqual({
    source: '/(.*)',
    destination: '/index.html',
  })
  const catchAllIndex = config.rewrites.findIndex(rule => rule.source === '/(.*)')
  expect(config.rewrites.findIndex(rule => rule.source === '/h/:date')).toBeLessThan(catchAllIndex)
  expect(config.rewrites.findIndex(rule => rule.source === '/p/:shabadId/:ang')).toBeLessThan(catchAllIndex)
})

test('the CSP hash matches the inline theme bootstrap exactly', () => {
  const html = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf8')
  const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
  expect(inlineScript).toBeTruthy()

  const expectedHash = crypto
    .createHash('sha256')
    .update(inlineScript ?? '')
    .digest('base64')
  const config = JSON.parse(
    fs.readFileSync(path.join(PROJECT_ROOT, 'vercel.json'), 'utf8')
  ) as VercelConfig
  const policy = config.headers
    .flatMap(rule => rule.headers)
    .find(header => header.key === 'Content-Security-Policy')
    ?.value ?? ''

  expect(policy).toContain(`'sha256-${expectedHash}'`)
})

test('robots advertises a real sitemap containing only canonical public routes', () => {
  const robots = fs.readFileSync(path.join(PROJECT_ROOT, 'public', 'robots.txt'), 'utf8')
  const sitemap = fs.readFileSync(path.join(PROJECT_ROOT, 'public', 'sitemap.xml'), 'utf8')
  const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1])

  expect(robots).toContain('Sitemap: https://naamras.xyz/sitemap.xml')
  expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
  expect(locations.length).toBeGreaterThan(0)
  expect(locations.every(location => location?.startsWith('https://naamras.xyz/'))).toBe(true)
  expect(locations.every(location => !location?.includes('?'))).toBe(true)
  expect(locations).not.toContain('https://naamras.xyz/saved')
})

test('the public AI discovery document identifies NaamRas and links to canonical pages', () => {
  const llms = fs.readFileSync(path.join(PROJECT_ROOT, 'public', 'llms.txt'), 'utf8')

  expect(llms).toMatch(/^# NaamRas\n/)
  expect(llms).toContain('[Read and search](https://naamras.xyz/banis)')
  expect(llms).toContain('[Privacy and sources](https://naamras.xyz/privacy)')
  expect(llms).not.toContain('localhost')
})
