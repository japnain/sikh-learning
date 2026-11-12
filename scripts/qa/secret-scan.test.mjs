import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
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

function sourceFixture(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'naamras-source-privacy-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  execFileSync('git', ['init', '-q'], { cwd: root })
  for (const [file, content] of Object.entries(files)) {
    const absolute = path.join(root, file)
    fs.mkdirSync(path.dirname(absolute), { recursive: true })
    fs.writeFileSync(absolute, content)
  }
  // A historical log remains tracked even after *.log is added to .gitignore.
  execFileSync('git', ['add', '-f', ...Object.keys(files)], { cwd: root })
  return root
}

test('detects ignored-but-tracked QA logs and developer plans using the Git inventory', t => {
  const root = sourceFixture(t, {
    '.gitignore': '*.log\n',
    'docs/qa/application-tests.log': 'Starting tests\n RUN /Users/build-user/project\n',
    'docs/plans/reader.md': 'Working checkout: /home/build-user/project\n',
    '.hermes/state.json': JSON.stringify({ checkout: 'C:\\Users\\build-user\\project' }),
    'notes.md': 'Source: \\/Users\\/build-user\\/source.epub\n',
  })
  fs.writeFileSync(path.join(root, 'untracked.log'), '/Users/other-user/private\n')
  const findings = scanTrackedFiles(root).findings
  assert.equal(findings.length, 4)
  assert(findings.every(finding => finding.kind === 'developer-home-path'))
  assert(findings.some(finding => finding.file === 'docs/qa/application-tests.log' && finding.line === 2))
  const report = formatFindings(findings)
  assert(!report.includes('build-user'))
  assert(!report.includes('untracked.log'))
})

test('preserves upstream attribution and synthetic code fixtures without weakening credential checks', t => {
  const attribution = 'Upstream example home: /home/upstream-user\nCopyright Example Authors'
  const root = sourceFixture(t, {
    'scripts/qa/example.test.mjs': 'const pathFixture = "/Users/synthetic-user/project";',
    'scripts/qa/fixtures/home-path.json': JSON.stringify({ source: '/home/synthetic-user/project' }),
    'public/licenses/font-OFL.txt': attribution,
    'vendor/upstream/README.md': attribution,
    'docs/THIRD-PARTY-NOTICES.md': attribution,
    'docs/README.md': 'Use $HOME/project or a path relative to the repository.\n',
    'scripts/qa/unsafe.test.mjs': ['sb', 'secret', 'x'.repeat(30)].join('_'),
  })
  assert.deepEqual(scanTrackedFiles(root).findings.map(finding => finding.kind), ['supabase-secret-key'])
  assert.equal(fs.readFileSync(path.join(root, 'public/licenses/font-OFL.txt'), 'utf8'), attribution)
})

test('source scan CLI fails on developer home paths and prints only redacted locations', t => {
  const root = sourceFixture(t, { 'docs/qa/build.log': 'Build path: /Users/build-user/private/project\n' })
  const script = fileURLToPath(new URL('./secret-scan.mjs', import.meta.url))
  const result = spawnSync(process.execPath, [script, root], { encoding: 'utf8' })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /docs\/qa\/build.log:1: developer-home-path \(value redacted\)/)
  assert(!result.stderr.includes('build-user'))
  assert(!result.stderr.includes(root))
})
