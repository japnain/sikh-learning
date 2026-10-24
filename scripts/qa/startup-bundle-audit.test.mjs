import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { inspectStartupBundle } from './startup-bundle-audit.mjs'

function fixture(run) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'naamras-startup-'))
  mkdirSync(path.join(root, 'assets'))
  writeFileSync(path.join(root, 'index.html'), '<script type="module" src="/assets/index.js"></script><link rel="stylesheet" href="/assets/index.css">')
  writeFileSync(path.join(root, 'assets/index.css'), 'body { color: black }')
  writeFileSync(path.join(root, 'assets/vendor-backend-test.js'), 'export const backend = true')
  const write = (name, source) => writeFileSync(path.join(root, 'assets', name), source)
  try { run(root, write) } finally { rmSync(root, { recursive: true, force: true }) }
}

test('counts transitive static chunks once and excludes lazy imports', () => fixture((root, write) => {
  write('index.js', 'import { x } from "./shared.js"; import("./vendor-backend-test.js"); console.log(x)')
  write('shared.js', 'export { x } from "./leaf.js";')
  write('leaf.js', 'export const x = 1;')
  const result = inspectStartupBundle(root)
  assert.deepEqual(result.failures, [])
  assert.deepEqual(result.assets, ['assets/index.css', 'assets/index.js', 'assets/leaf.js', 'assets/shared.js'])
}))

test('fails on a transitive eager backend import and on byte budgets', () => fixture((root, write) => {
  write('index.js', 'import "./shared.js";')
  write('shared.js', 'export { backend } from "./vendor-backend-test.js";')
  const result = inspectStartupBundle(root, { javascriptGzip: 1, cssGzip: 1, javascriptRaw: 1, cssRaw: 1 })
  assert(result.failures.some(value => value.includes('Supabase entered')))
  assert(result.failures.some(value => value.includes('javascriptGzip')))
  assert(result.failures.some(value => value.includes('cssRaw')))
}))
