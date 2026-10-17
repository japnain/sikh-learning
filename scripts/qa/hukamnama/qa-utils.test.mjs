import assert from 'node:assert/strict'
import { mkdtemp, mkdir, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { browserCoverage, createFreshEvidenceDirectory, parseBrowserFlags, prepareEvidenceDirectory } from './qa-utils.mjs'

const required = ['--runtime', '/qa/runtime', '--app', '/qa/app', '--out', '/qa/evidence']

test('explicit false preserves the full export/font suite and smoke UI coverage', () => {
  const flags = parseBrowserFlags([...required, '--ui-only', 'false', '--ui-all', 'false'])
  assert.equal(flags['ui-only'], false)
  assert.equal(flags['ui-all'], false)
  assert.deepEqual(browserCoverage(flags), { suite: 'exports-fonts-and-smoke-ui', exports: 45, typography: 2, composer: 3 })
})

test('full UI and UI-only suites have distinct explicit coverage expectations', () => {
  assert.deepEqual(browserCoverage(parseBrowserFlags([...required, '--ui-all', 'true'])), {
    suite: 'exports-fonts-and-full-ui', exports: 45, typography: 2, composer: 36,
  })
  assert.deepEqual(browserCoverage(parseBrowserFlags([...required, '--ui-only', 'true'])), {
    suite: 'ui-only', exports: 0, typography: 0, composer: 36,
  })
})

test('reject unknown, missing, duplicate, positional, and invalid flag values', () => {
  for (const extra of [
    ['--unknown', 'true'], ['--ui-only'], ['--ui-only', '--keep', 'all'],
    ['--ui-only', 'yes'], ['--ui-only', ''], ['--engine', 'firefox'],
    ['--keep', 'everything'], ['--executable', 'relative-browser'],
    ['--out', '/qa/other'], ['extra'], ['--ui-only', 'true', '--ui-all', 'true'],
  ]) assert.throws(() => parseBrowserFlags([...required, ...extra]), undefined, JSON.stringify(extra))
  assert.throws(() => parseBrowserFlags(['--runtime', '/qa/runtime', '--app', '/qa/app']), /--out/)
  assert.throws(() => parseBrowserFlags(['--runtime', 'relative', '--app', '/qa/app', '--out', '/qa/out']), /absolute/)
})

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'hukamnama-qa-utils-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const app = join(directory, 'app')
  await mkdir(app)
  return { directory, app }
}

test('creates only a new canonical evidence leaf, including missing parents', async t => {
  const { directory, app } = await fixture(t)
  const output = await prepareEvidenceDirectory(app, join(directory, 'evidence', 'run-one'))
  assert.equal(output, join(await realpath(directory), 'evidence', 'run-one'))
  assert.equal((await stat(output)).isDirectory(), true)
})

test('rejects existing empty/nonempty evidence directories and files without overwrite', async t => {
  const { directory, app } = await fixture(t)
  const output = join(directory, 'existing')
  await mkdir(output)
  await assert.rejects(createFreshEvidenceDirectory(output, [app]), /fresh directory/)
  await writeFile(join(output, 'sentinel'), 'preserve')
  await assert.rejects(createFreshEvidenceDirectory(output, [app]), /fresh directory/)
  const file = join(directory, 'existing-file')
  await writeFile(file, 'preserve')
  await assert.rejects(createFreshEvidenceDirectory(file, [app]), /fresh directory/)
})

test('rejects the input itself, input descendants, and input ancestors', async t => {
  const { directory, app } = await fixture(t)
  for (const output of [app, join(app, 'evidence'), directory]) {
    await assert.rejects(createFreshEvidenceDirectory(output, [app]), /overlap/)
  }
})

test('resolves symlink aliases before rejecting input overlap or existing output', async t => {
  const { directory, app } = await fixture(t)
  const appAlias = join(directory, 'app-alias')
  await symlink(app, appAlias, 'dir')
  await assert.rejects(createFreshEvidenceDirectory(join(appAlias, 'evidence'), [app]), /overlap/)
  await assert.rejects(createFreshEvidenceDirectory(app, [appAlias]), /overlap/)
  const ancestorAlias = join(directory, 'root-alias')
  await symlink(directory, ancestorAlias, 'dir')
  await assert.rejects(createFreshEvidenceDirectory(ancestorAlias, [app]), /overlap/)
  const existing = join(directory, 'existing')
  await mkdir(existing)
  const evidenceAlias = join(directory, 'evidence-alias')
  await symlink(existing, evidenceAlias, 'dir')
  await assert.rejects(createFreshEvidenceDirectory(evidenceAlias, [app]), /fresh directory/)
})

test('rejects a dangling output symlink and validates every input path', async t => {
  const { directory, app } = await fixture(t)
  const dangling = join(directory, 'dangling')
  await symlink(join(directory, 'missing-target'), dangling, 'dir')
  await assert.rejects(createFreshEvidenceDirectory(join(dangling, 'run'), [app]), { code: 'ENOENT' })
  await assert.rejects(createFreshEvidenceDirectory(join(directory, 'new'), [app, join(directory, 'missing-input')]), { code: 'ENOENT' })
  await assert.rejects(createFreshEvidenceDirectory('relative', [app]), /absolute/)
  await assert.rejects(createFreshEvidenceDirectory(join(directory, 'new'), []), /absolute/)
})
