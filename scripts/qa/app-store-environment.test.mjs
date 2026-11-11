import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, test } from 'node:test'
import { getAppStoreEnvironmentChecks } from './app-store-environment.mjs'

let root
let savedEnv
const publicConfig = 'VITE_SUPPORT_URL=https://naamras.xyz/support\nVITE_PRIVACY_URL=https://naamras.xyz/privacy\n'

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'naamras-native-env-'))
  savedEnv = { ...process.env }
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('VITE_')) delete process.env[key]
  }
})

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('VITE_')) delete process.env[key]
  }
  for (const [key, value] of Object.entries(savedEnv)) {
    if (key.startsWith('VITE_')) process.env[key] = value
  }
  rmSync(root, { recursive: true, force: true })
})

test('missing environment files produce configuration failures without throwing', () => {
  const checks = getAppStoreEnvironmentChecks(root)
  assert.deepEqual(checks.map(check => check.ok), [false, false, true])
})

test('ignored production local configuration works without a tracked env file', () => {
  writeFileSync(join(root, '.env.production.local'), publicConfig)
  assert(getAppStoreEnvironmentChecks(root).every(check => check.ok))
})

test('production local overrides generic files and shell values take precedence', () => {
  writeFileSync(join(root, '.env'), 'VITE_SUPPORT_URL=https://wrong.example\nVITE_PRIVACY_URL=https://wrong.example\n')
  writeFileSync(join(root, '.env.production.local'), publicConfig)
  assert(getAppStoreEnvironmentChecks(root).every(check => check.ok))
  process.env.VITE_SUPPORT_URL = 'https://override.example'
  assert.equal(getAppStoreEnvironmentChecks(root)[0].ok, false)
})

test('backend or diagnostics from any loaded source blocks native release without logging values', () => {
  writeFileSync(join(root, '.env.production.local'), publicConfig)
  writeFileSync(join(root, '.env.local'), 'VITE_SUPABASE_ANON_KEY=private-test-value\n')
  process.env.VITE_DIAGNOSTICS_ENDPOINT = 'https://private-test-endpoint.example'
  const check = getAppStoreEnvironmentChecks(root)[2]
  assert.equal(check.ok, false)
  assert.match(check.detail, /VITE_SUPABASE_ANON_KEY/)
  assert.match(check.detail, /VITE_DIAGNOSTICS_ENDPOINT/)
  assert(!JSON.stringify(check).includes('private-test'))
})

test('explicit empty shell overrides keep backend configuration disabled', () => {
  writeFileSync(join(root, '.env.production.local'), `${publicConfig}VITE_SUPABASE_URL=https://example.supabase.co\nVITE_SUPABASE_ANON_KEY=test-key\n`)
  process.env.VITE_SUPABASE_URL = ''
  process.env.VITE_SUPABASE_ANON_KEY = ''
  assert(getAppStoreEnvironmentChecks(root).every(check => check.ok))
})
