import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { verifyFontNotices } from './font-notices.mjs'

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'naamras-font-notices-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  for (const directory of ['src/assets/fonts', 'public/licenses', 'dist/assets', 'dist/licenses']) fs.mkdirSync(path.join(root, directory), { recursive: true })
  const font = Buffer.from('synthetic font bytes')
  const notice = Buffer.from('Copyright Example\nSIL OPEN FONT LICENSE Version 1.1')
  const hash = data => createHash('sha256').update(data).digest('hex')
  const manifest = { version: 1, fonts: [{ file: 'src/assets/fonts/test.woff2', sha256: hash(font), version: 'Version 1.0', copyright: 'Copyright Example', source: 'https://example.org/font', licenseSource: 'https://example.org/OFL', license: 'OFL-1.1', notice: 'licenses/test-OFL.txt', noticeSha256: hash(notice) }] }
  fs.writeFileSync(path.join(root, 'src/assets/fonts/test.woff2'), font)
  fs.writeFileSync(path.join(root, 'src/index.css'), "@font-face{src:url('./assets/fonts/test.woff2')}")
  fs.writeFileSync(path.join(root, 'dist/assets/test-hash.woff2'), font)
  for (const prefix of ['public/licenses', 'dist/licenses']) {
    fs.writeFileSync(path.join(root, prefix, 'test-OFL.txt'), notice)
    fs.writeFileSync(path.join(root, prefix, 'fonts.json'), JSON.stringify(manifest))
    fs.writeFileSync(path.join(root, prefix, 'index.html'), '<h1>Font licenses</h1>')
  }
  return root
}

test('source and built files retain font and notice fingerprints', t => {
  const root = fixture(t)
  assert.deepEqual(verifyFontNotices(root, { built: true }).errors, [])
})
test('an added font cannot silently miss the notice inventory', t => {
  const root = fixture(t)
  fs.writeFileSync(path.join(root, 'src/assets/fonts/new.woff2'), 'new')
  assert.match(verifyFontNotices(root).errors.join('\n'), /Unregistered application font/)
})
test('missing production notice and changed font bytes fail packaging', t => {
  const root = fixture(t)
  fs.unlinkSync(path.join(root, 'dist/licenses/test-OFL.txt'))
  fs.writeFileSync(path.join(root, 'src/assets/fonts/test.woff2'), 'changed')
  const errors = verifyFontNotices(root, { built: true }).errors.join('\n')
  assert.match(errors, /Font bytes changed/)
  assert.match(errors, /Notice absent or changed in build/)
})
test('a missing notice index cannot pass the production gate', t => {
  const root = fixture(t)
  fs.unlinkSync(path.join(root, 'dist/licenses/index.html'))
  assert.match(verifyFontNotices(root, { built: true }).errors.join('\n'), /Missing or changed built license access/)
})
