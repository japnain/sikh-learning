import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { formatFindings } from './secret-scan.mjs'
import { resolveRepositoryOwner, scanPublicArtifacts } from './public-artifact-privacy.mjs'

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

test('derives repository owner from supported CI metadata or a locally parsed Git remote', () => {
  const noGit = () => { throw new Error('Git should not be needed') }
  assert.equal(resolveRepositoryOwner({ env: { GITHUB_REPOSITORY: 'Project-Owner/reader' }, readRemote: noGit }), 'project-owner')
  assert.equal(resolveRepositoryOwner({ env: { VERCEL_GIT_REPO_OWNER: 'Project-Owner' }, readRemote: noGit }), 'project-owner')
  for (const remote of [
    'https://github.com/Project-Owner/reader.git',
    ['https://username:', 'private-token', '@github.com/Project-Owner/reader.git'].join(''),
    'git@github.com:Project-Owner/reader.git',
    'ssh://git@github.com/Project-Owner/reader.git',
  ]) {
    assert.equal(resolveRepositoryOwner({ env: {}, readRemote: () => remote }), 'project-owner')
  }
  assert.equal(resolveRepositoryOwner({ env: {}, readRemote: () => 'https://github.com.example.org/project-owner/reader' }), null)
  assert.equal(resolveRepositoryOwner({ env: {}, readRemote: () => '/private/local/repository' }), null)
  assert.equal(resolveRepositoryOwner({ env: { GITHUB_REPOSITORY: 'invalid/extra/segments', VERCEL_GIT_REPO_OWNER: 'invalid/value' }, readRemote: () => '' }), null)
  assert.equal(resolveRepositoryOwner({ env: {}, readRemote: () => { throw new Error('private Git error') } }), null)
})

test('blocks exact-owner GitHub and raw-content links in app output, including escaped bundle URLs', t => {
  const root = buildTree(t, {
    'assets/support.js': 'const support = "https://github.com/private-maintainer/reader/issues/new";',
    'index.html': '<a href="//github.com/private-maintainer">Project</a>',
    'assets/raw.js': 'const image = "https://raw.githubusercontent.com/private-maintainer/reader/main/cover.png";',
    'assets/escaped.js': 'const support = "https:\\/\\/github.com\\/PRIVATE-MAINTAINER\\/reader/issues/new";',
    'assets/unicode.js': 'const support = "https:\\u002f\\u002fgithub.com\\u002fprivate-maintainer\\u002freader";',
    'assets/hex.js': 'const support = "https://g\\x69thub.com/private-maintainer/reader";',
    'licenses/runtime.js': 'const support = "https://www.github.com/private-maintainer/reader";',
    'assets/upstream.js': 'const a = "https://github.com/upstream/library"; const b = "https://github.com/private-maintainer-tools/library"; const c = "https://github.com.example.org/private-maintainer/reader";',
    'licenses/credits.html': '<p>Required credit: https://github.com/private-maintainer/original</p>',
  })
  const result = scanPublicArtifacts(root, { repositoryOwner: 'private-maintainer' })
  assert.equal(result.repositoryOwnerCheck, 'enabled')
  assert.equal(result.findings.length, 7)
  assert(result.findings.every(finding => finding.kind === 'repository-owner-link'))
  assert(!formatFindings(result.findings).includes('private-maintainer'))
  assert.equal(fs.readFileSync(path.join(root, 'licenses/credits.html'), 'utf8'), '<p>Required credit: https://github.com/private-maintainer/original</p>')
})

test('reports unavailable owner coverage explicitly and accepts an owner without Git metadata', t => {
  const root = buildTree(t, { 'assets/support.js': 'const support = "https://github.com/private-maintainer/reader";' })
  const unavailable = scanPublicArtifacts(root, { repositoryOwner: null })
  assert.equal(unavailable.repositoryOwnerCheck, 'unavailable')
  assert.deepEqual(unavailable.findings, [])
  const configured = scanPublicArtifacts(root, { repositoryOwner: 'private-maintainer' })
  assert.equal(configured.repositoryOwnerCheck, 'enabled')
  assert.equal(configured.findings[0].kind, 'repository-owner-link')
  assert.throws(() => scanPublicArtifacts(root, { repositoryOwner: 'invalid/private/value' }), /^Error: The repository owner option is invalid\.$/)
})

test('CLI owner-link findings redact identity, remote credentials and filesystem paths', t => {
  const root = buildTree(t, { 'assets/support.js': 'const support = "https://github.com/private-maintainer/reader/issues/new";' })
  const script = fileURLToPath(new URL('./public-artifact-privacy.mjs', import.meta.url))
  const result = spawnSync(process.execPath, [script, root], {
    encoding: 'utf8', cwd: root,
    env: { ...process.env, GITHUB_REPOSITORY: 'private-maintainer/reader', VERCEL_GIT_REPO_OWNER: '' },
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /repository-owner-link \(value redacted\)/)
  assert(!result.stderr.includes('private-maintainer'))
  assert(!result.stderr.includes(root))
  const missing = spawnSync(process.execPath, [script, root], {
    encoding: 'utf8', cwd: root,
    env: { ...process.env, GITHUB_REPOSITORY: '', VERCEL_GIT_REPO_OWNER: '' },
  })
  assert.equal(missing.status, 0)
  assert.match(missing.stdout, /Repository-owner link check unavailable/)
  assert(!missing.stderr.includes(root))
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
