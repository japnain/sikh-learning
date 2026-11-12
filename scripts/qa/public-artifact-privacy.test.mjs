import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { formatFindings } from './secret-scan.mjs'
import { scanPublicArtifacts } from './public-artifact-privacy.mjs'

function buildTree(t, files = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'naamras-public-artifacts-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  for (const [file, contents] of Object.entries({ 'index.html': '<!doctype html><title>NaamRas</title>', ...files })) {
    const absolute = path.join(root, file)
    fs.mkdirSync(path.dirname(absolute), { recursive: true })
    fs.writeFileSync(absolute, contents)
  }
  return root
}

function legacyKey(role) {
  return [
    Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url'),
    Buffer.from(JSON.stringify({ iss: 'supabase', role })).toString('base64url'),
    'notarealsignature',
  ].join('.')
}

test('allows browser configuration, brand contact and intact third-party attribution', t => {
  const license = 'Copyright Example Authors <maintainer@gmail.com>\nPermission is hereby granted...'
  const root = buildTree(t, {
    'assets/app.js': `const publicKey = '${['sb', 'publishable', 'x'.repeat(30)].join('_')}'; const legacy = '${legacyKey('anon')}'; const support = 'support@naamras.xyz';`,
    'index.html': '<a href="mailto:support@naamras.xyz">Support</a>',
    'licenses/font-OFL.txt': license,
    'licenses/credits.html': '<p>Author: maintainer@gmail.com</p>',
    'THIRD-PARTY-NOTICES.html': '<p>Author: maintainer@hotmail.com</p>',
  })
  assert.deepEqual(scanPublicArtifacts(root).findings, [])
  assert.equal(fs.readFileSync(path.join(root, 'licenses/font-OFL.txt'), 'utf8'), license)
})

test('blocks copied private files and source maps anywhere in the publish tree', t => {
  const root = buildTree(t, {
    '.env.example': 'VITE_EXAMPLE=',
    'nested/.env.production': 'EXAMPLE=value',
    '.git/config': '[core]',
    '.git-credentials': 'placeholder',
    'keys/id_ed25519': Buffer.from([1, 0, 2]),
    'keys/identity.p12': Buffer.from([1, 0, 2]),
    'assets/chunk.js.map': '{"version":3}',
  })
  const findings = scanPublicArtifacts(root).findings
  assert.equal(findings.filter(finding => finding.kind === 'public-environment-file').length, 2)
  assert.equal(findings.filter(finding => finding.kind === 'public-git-metadata').length, 2)
  assert.equal(findings.filter(finding => finding.kind === 'public-credential-file').length, 2)
  assert.equal(findings.filter(finding => finding.kind === 'public-source-map').length, 1)
})

test('blocks Unix, Windows and escaped home paths in runtime code and copied JSON', t => {
  const root = buildTree(t, {
    'assets/app.js': 'const source = "/Users/build-user/project/src.ts";',
    'data/provenance.json': JSON.stringify({ source: '/home/build-user/private/source.epub' }),
    'assets/windows.js': JSON.stringify({ source: 'C:\\Users\\build-user\\project\\src.ts' }),
    'assets/escaped.js': 'const source = "\\/Users\\/build-user\\/project";',
    'assets/theme.css': '/* built from /root/private/theme.css */',
  })
  const findings = scanPublicArtifacts(root).findings.filter(finding => finding.kind === 'filesystem-home-path')
  assert.equal(findings.length, 5)
  assert(!formatFindings(findings).includes('build-user'))
})

test('blocks common consumer contacts in JS/HTML, without licensing-path loopholes', t => {
  const root = buildTree(t, {
    'assets/contact.js': 'const a = "reader@gmail.com";\nconst b = "reader@proton.me";',
    'help.html': '<a href="mailto:reader@icloud.com">Contact</a>',
    'licenses/runtime.js': 'const contact = "reader@hotmail.com";',
    'assets/allowed.js': 'const contact = "team@example.org"; const unrelated = "reader@gmail.com.example.org";',
  })
  const findings = scanPublicArtifacts(root).findings
  assert.equal(findings.length, 4)
  assert(findings.every(finding => finding.kind === 'consumer-email-address'))
  assert(!formatFindings(findings).includes('reader@'))
})

test('uses shared credential detection but permits no privileged Supabase key', t => {
  const secret = ['sb', 'secret', 'x'.repeat(30)].join('_')
  const privateHeader = '-----BEGIN ' + 'PRIVATE KEY-----'
  const root = buildTree(t, {
    'assets/app.js': `const privileged = '${secret}'; const serviceRole = '${legacyKey('service_role')}';`,
    'licenses/unsafe.txt': privateHeader,
    'assets/github.js': 'const token = "' + 'gh' + 'p_' + 'x'.repeat(36) + '";',
  })
  const findings = scanPublicArtifacts(root).findings
  assert.deepEqual(findings.map(finding => finding.kind).sort(), ['github-token', 'private-key', 'supabase-secret-key', 'supabase-service-role-key'])
  assert(!formatFindings(findings).includes(secret))
  assert(!formatFindings(findings).includes(privateHeader))
})

test('blocks inline source maps and source map references', t => {
  const root = buildTree(t, {
    'assets/app.js': '//# sourceMappingURL=data:application/json;base64,e30=',
    'assets/app.css': '/*# sourceMappingURL=style.css.map */',
  })
  assert.equal(scanPublicArtifacts(root).findings.filter(finding => finding.kind === 'source-map-reference').length, 2)
})

test('fails closed for absent builds and rejects symlinks without following them', t => {
  const root = buildTree(t)
  fs.symlinkSync(root, path.join(root, 'cycle'))
  assert.deepEqual(scanPublicArtifacts(root).findings.map(finding => finding.kind), ['public-symbolic-link'])
  fs.unlinkSync(path.join(root, 'index.html'))
  assert.throws(() => scanPublicArtifacts(root), /no index.html/)
  assert.throws(() => scanPublicArtifacts(path.join(root, 'missing')), /missing or is not a regular directory/)
})

test('CLI returns failure and redacts leaked values', t => {
  const root = buildTree(t, { 'assets/contact.js': 'const email = "reader@gmail.com";' })
  const script = fileURLToPath(new URL('./public-artifact-privacy.mjs', import.meta.url))
  const result = spawnSync(process.execPath, [script, root], { encoding: 'utf8' })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /assets\/contact.js:1: consumer-email-address \(value redacted\)/)
  assert(!result.stderr.includes('reader@gmail.com'))
  assert(!result.stderr.includes(root))
})
