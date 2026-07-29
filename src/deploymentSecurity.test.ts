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
