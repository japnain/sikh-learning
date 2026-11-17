import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { verifyContentRights } from './content-rights.mjs'

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'naamras-rights-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true })
  fs.mkdirSync(path.join(root, 'public/audio'), { recursive: true })
  const data = Buffer.from('synthetic audio bytes')
  fs.writeFileSync(path.join(root, 'public/audio/example.mp3'), data)
  const entries = [
    { id: 'audio', status: 'unresolved', files: [{ path: 'public/audio/example.mp3', sha256: createHash('sha256').update(data).digest('hex') }] },
    { id: 'provider-banidb', status: 'unresolved', files: [] },
    { id: 'provider-shabados', status: 'unresolved', files: [] },
  ]
  const write = () => fs.writeFileSync(path.join(root, 'docs/content-rights-register.json'), JSON.stringify({ version: 1, entries }))
  write()
  return { root, entries, write }
}

test('a complete inventory does not approve unresolved public distribution', t => {
  const { root } = fixture(t)
  assert.deepEqual(verifyContentRights(root, { inventoryOnly: true }).errors, [])
  assert.match(verifyContentRights(root).errors.join('\n'), /Release blocked: 3/)
})
test('new assets and changed bytes require a new review', t => {
  const { root } = fixture(t)
  fs.writeFileSync(path.join(root, 'public/audio/new.mp3'), 'new')
  fs.writeFileSync(path.join(root, 'public/audio/example.mp3'), 'replacement')
  const errors = verifyContentRights(root, { inventoryOnly: true }).errors.join('\n')
  assert.match(errors, /Unregistered distribution content/)
  assert.match(errors, /Content changed or missing/)
})
test('an approved label without permission scope is rejected', t => {
  const { root, entries, write } = fixture(t)
  entries[0].status = 'approved'
  write()
  assert.match(verifyContentRights(root, { inventoryOnly: true }).errors.join('\n'), /Incomplete approval evidence/)
})
test('a withheld label cannot bypass the release gate', t => {
  const { root, entries, write } = fixture(t)
  entries.forEach(entry => { entry.status = 'withheld' })
  write()
  assert.match(verifyContentRights(root).errors.join('\n'), /Release blocked/)
})
test('provider distribution obligations cannot be dropped from the register', t => {
  const { root, entries, write } = fixture(t)
  entries.pop()
  write()
  assert.match(verifyContentRights(root, { inventoryOnly: true }).errors.join('\n'), /Missing provider distribution review/)
})
