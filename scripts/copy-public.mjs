import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(root, 'public')
const distDir = path.join(root, 'dist')

fs.mkdirSync(distDir, { recursive: true })

const source = `${publicDir}/.`
let result = spawnSync('/bin/cp', ['-Rl', source, distDir], {
  cwd: root,
  stdio: 'inherit',
})

if (result.status !== 0) {
  result = spawnSync('/bin/cp', ['-Rc', source, distDir], {
    cwd: root,
    stdio: 'inherit',
  })
}

if (result.status !== 0) {
  result = spawnSync('/bin/cp', ['-R', source, distDir], {
    cwd: root,
    stdio: 'inherit',
  })
}

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
