import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const sourceRoot = path.join(projectRoot, 'public', 'data', 'learn')
const targetRoot = path.join(projectRoot, 'dist', 'data', 'learn')

const requiredFiles = [
  'home-summary.json',
  'manifest.json',
  path.join('lists', 'collections.json'),
  path.join('lists', 'daily-guidance.json'),
  path.join('lists', 'shabad-deep-dives.json'),
  path.join('lists', 'topic-guides.json'),
]

const requiredDetailDirs = [
  path.join('details', 'collection'),
  path.join('details', 'daily-guidance'),
  path.join('details', 'shabad-deep-dive'),
  path.join('details', 'topic-guide'),
]

function assertExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Missing ${label}: ${targetPath}`)
  }
}

function countJsonFiles(directory) {
  let count = 0

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      count += countJsonFiles(entryPath)
      continue
    }
    if (entry.isFile() && entry.name.endsWith('.json')) {
      count += 1
    }
  }

  return count
}

assertExists(sourceRoot, 'Learn source directory')

fs.mkdirSync(path.join(projectRoot, 'dist', 'data'), { recursive: true })
fs.rmSync(targetRoot, { recursive: true, force: true })
fs.cpSync(sourceRoot, targetRoot, { recursive: true })

for (const file of requiredFiles) {
  assertExists(path.join(targetRoot, file), `required Learn asset "${file}"`)
}

for (const detailDir of requiredDetailDirs) {
  const absoluteDetailDir = path.join(targetRoot, detailDir)
  assertExists(absoluteDetailDir, `required Learn detail directory "${detailDir}"`)

  const jsonCount = countJsonFiles(absoluteDetailDir)
  if (jsonCount < 1) {
    throw new Error(`Expected JSON detail files in ${absoluteDetailDir}`)
  }
}

const copiedJsonCount = countJsonFiles(targetRoot)
console.log(`[learn-assets] copied ${copiedJsonCount} JSON files into ${path.relative(projectRoot, targetRoot)}`)
