import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const vitestCli = path.join(root, 'node_modules', 'vitest', 'vitest.mjs')

function collectTests(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(directory, entry.name)

    if (entry.isDirectory()) return collectTests(entryPath)

    return /\.(test|spec)\.(ts|tsx)$/.test(entry.name)
      ? [path.relative(root, entryPath)]
      : []
  })
}

const allTests = collectTests(path.join(root, 'src')).sort()
const assigned = new Set()

function take(name, predicate) {
  const files = allTests.filter(file => !assigned.has(file) && predicate(file))
  files.forEach(file => assigned.add(file))
  return { name, files }
}

const batches = [
  take('core stores, API, utils, QA, and content', file => (
    file.startsWith('src/store/')
    || file.startsWith('src/api/')
    || file.startsWith('src/utils/')
    || file.startsWith('src/qa/')
    || file.startsWith('src/content/')
    || file === 'src/branding.test.ts'
  )),
  take('data catalog support', file => (
    file.startsWith('src/data/')
    && file !== 'src/data/libraryRepository.test.ts'
    && file !== 'src/data/panthPrakashLibraryIntegrity.test.ts'
  )),
  take('pages and readers', file => file.startsWith('src/pages/')),
  take('components, hooks, and app shell', file => (
    file.startsWith('src/components/')
    || file.startsWith('src/hooks/')
    || file === 'src/App.test.tsx'
  )),
  take('Panth Prakash repository integrity', file => file === 'src/data/libraryRepository.test.ts'),
  take('native library file integrity', file => file === 'src/data/panthPrakashLibraryIntegrity.test.ts'),
]

const unassigned = allTests.filter(file => !assigned.has(file))
if (unassigned.length > 0) {
  batches.push({ name: 'miscellaneous tests', files: unassigned })
}

for (const batch of batches) {
  if (batch.files.length === 0) continue

  console.log(`\n[vitest] ${batch.name} (${batch.files.length} files)`)
  const result = spawnSync(process.execPath, [
    vitestCli,
    'run',
    ...batch.files,
    '--no-file-parallelism',
  ], {
    cwd: root,
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
