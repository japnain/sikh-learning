import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import test from 'node:test'
import { formatFindings, scanText, scanTrackedFiles } from './secret-scan.mjs'

test('blocks privileged and public configuration keys without exposing their values', () => {
  const fixtures = [
    ['supabase-secret-key', ['sb', 'secret', 'x'.repeat(30)].join('_')],
    ['supabase-publishable-key', ['sb', 'publishable', 'x'.repeat(30)].join('_')],
    ['github-token', 'gh' + 'p_' + 'x'.repeat(36)],
    ['aws-access-id', 'AK' + 'IA' + 'X'.repeat(16)],
    ['google-api-key', 'AI' + 'za' + 'x'.repeat(35)],
    ['resend-api-key', 'r' + 'e_' + 'x'.repeat(32)],
    ['private-key', '-----BEGIN ' + 'PRIVATE KEY-----'],
    ['credential-url', 'postgresql://user:' + 'x'.repeat(20) + '@host/database'],
  ]
  for (const [kind, value] of fixtures) {
    const results = scanText('configuration.txt', '\n' + value)
    assert(results.some(result => result.kind === kind && result.line === 2))
    assert(!formatFindings(results).includes(value))
  }
})

test('detects legacy Supabase JWT roles but allows ordinary placeholder configuration', () => {
  for (const role of ['anon', 'service_role']) {
    const token = [
      Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url'),
      Buffer.from(JSON.stringify({ iss: 'supabase', role })).toString('base64url'),
      'notarealsignature',
    ].join('.')
    assert.equal(scanText('legacy.env', token)[0].kind, 'supabase-legacy-api-key')
  }
  assert.deepEqual(scanText('.env.example', 'VITE_SUPABASE_ANON_KEY=\nSUPABASE_URL=https://example.supabase.co'), [])
  assert.deepEqual(scanText('unit.test.ts', "const key = 'test-anon-key'"), [])
})

test('scans every tracked file including tests, blocks private env names, and ignores untracked local config', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'naamras-secret-scan-'))
  try {
    execFileSync('git', ['init', '-q'], { cwd: root })
    fs.writeFileSync(path.join(root, '.env.example'), 'EXAMPLE=')
    fs.writeFileSync(path.join(root, '.env.production'), 'PUBLIC_URL=https://example.com')
    fs.writeFileSync(path.join(root, 'suspicious.test.ts'), ['sb', 'secret', 'x'.repeat(30)].join('_'))
    fs.writeFileSync(path.join(root, 'private.env.local'), ['sb', 'secret', 'y'.repeat(30)].join('_'))
    execFileSync('git', ['add', '.env.example', '.env.production', 'suspicious.test.ts'], { cwd: root })
    const result = scanTrackedFiles(root)
    assert.equal(result.scanned, 3)
    assert.deepEqual(result.findings.map(finding => finding.kind).sort(), ['supabase-secret-key', 'tracked-environment-file'])
    assert(!formatFindings(result.findings).includes('private.env.local'))
    fs.rmSync(path.join(root, '.env.production'))
    assert(!scanTrackedFiles(root).findings.some(finding => finding.kind === 'tracked-environment-file'))
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
