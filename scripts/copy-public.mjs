import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(root, 'public')
const distDir = path.join(root, 'dist')
const stableCachedAssets = [
  'manifest.webmanifest',
  'favicon.svg',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'share-redirect.js',
]

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

function collectPrecacheAssets(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap(entry => {
      const relativePath = path.posix.join(prefix, entry.name)
      const absolutePath = path.join(directory, entry.name)
      if (entry.isDirectory()) return collectPrecacheAssets(absolutePath, relativePath)
      return /\.(?:css|js|svg|woff2?)$/i.test(entry.name) ? [`/${relativePath}`] : []
    })
}

const serviceWorkerPath = path.join(distDir, 'sw.js')
if (fs.existsSync(serviceWorkerPath)) {
  const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8')
  const serviceWorkerSource = fs.readFileSync(serviceWorkerPath, 'utf8')
  const precacheAssets = collectPrecacheAssets(path.join(distDir, 'assets'), 'assets')
  const buildHash = createHash('sha256')
    .update(indexHtml)
    .update(serviceWorkerSource)
    .update(JSON.stringify(precacheAssets))

  for (const relativePath of stableCachedAssets) {
    const stableAssetPath = path.join(distDir, relativePath)
    if (!fs.existsSync(stableAssetPath)) continue
    buildHash.update(relativePath)
    buildHash.update(fs.readFileSync(stableAssetPath))
  }

  const buildVersion = buildHash.digest('hex').slice(0, 12)
  const generatedServiceWorker = serviceWorkerSource
    .replace('__NAAMRAS_BUILD_VERSION__', buildVersion)
    .replace('/* __NAAMRAS_PRECACHE_ASSETS__ */ []', JSON.stringify(precacheAssets))
  const generatedPath = `${serviceWorkerPath}.generated`
  fs.writeFileSync(generatedPath, generatedServiceWorker)
  fs.renameSync(generatedPath, serviceWorkerPath)
}
