import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const walk = dir => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]) : []

export function verifyFontNotices(root, { built = false } = {}) {
  const manifestPath = path.join(root, 'public/licenses/fonts.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const errors = []
  const entries = manifest.fonts
  if (manifest.version !== 1 || !Array.isArray(entries)) throw new Error('Unsupported font inventory')
  const declared = new Set(entries.map(entry => entry.file))
  const fonts = walk(path.join(root, 'src/assets/fonts')).filter(file => /\.(woff2?|ttf|otf)$/i.test(file))
  for (const file of fonts) {
    const relative = path.relative(root, file).split(path.sep).join('/')
    if (!declared.has(relative)) errors.push(`Unregistered application font: ${relative}`)
  }
  const css = fs.readFileSync(path.join(root, 'src/index.css'), 'utf8')
  for (const match of css.matchAll(/url\(['"]?(\.\/assets\/fonts\/[^)'"\s]+)/g)) {
    if (!declared.has(`src/${match[1].slice(2)}`)) errors.push(`Unregistered CSS font: ${match[1]}`)
  }
  if (declared.size !== entries.length) errors.push('Duplicate font inventory entry')
  const builtFiles = built ? walk(path.join(root, 'dist/assets')) : []
  const builtHashes = new Set(builtFiles.filter(file => /\.(woff2?|ttf|otf)$/i.test(file)).map(file => hash(fs.readFileSync(file))))
  for (const entry of entries) {
    const fontPath = path.join(root, entry.file)
    const noticePath = path.join(root, 'public', entry.notice)
    if (!fs.existsSync(fontPath) || hash(fs.readFileSync(fontPath)) !== entry.sha256) errors.push(`Font bytes changed: ${entry.file}`)
    if (!entry.version || !entry.copyright || !entry.licenseSource?.startsWith('https://') || !entry.source?.startsWith('https://')) errors.push(`Incomplete font provenance: ${entry.file}`)
    if (entry.license !== 'OFL-1.1') errors.push(`Unreviewed font license: ${entry.file}`)
    if (!fs.existsSync(noticePath)) { errors.push(`Missing font notice: ${entry.notice}`); continue }
    const notice = fs.readFileSync(noticePath)
    if (hash(notice) !== entry.noticeSha256 || !notice.toString().includes(entry.copyright) || !notice.toString().includes('SIL OPEN FONT LICENSE Version 1.1')) errors.push(`Font notice changed or incomplete: ${entry.notice}`)
    if (built) {
      if (!builtHashes.has(entry.sha256)) errors.push(`Font absent from build: ${entry.file}`)
      const builtNotice = path.join(root, 'dist', entry.notice)
      if (!fs.existsSync(builtNotice) || hash(fs.readFileSync(builtNotice)) !== entry.noticeSha256) errors.push(`Notice absent or changed in build: ${entry.notice}`)
    }
  }
  if (built) for (const file of ['fonts.json', 'index.html']) {
    const source = path.join(root, 'public/licenses', file)
    const target = path.join(root, 'dist/licenses', file)
    if (!fs.existsSync(target) || hash(fs.readFileSync(source)) !== hash(fs.readFileSync(target))) errors.push(`Missing or changed built license access: ${file}`)
  }
  return { fonts: entries.length, errors }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
  const result = verifyFontNotices(root, { built: process.argv.includes('--built') })
  if (result.errors.length) { console.error(result.errors.join('\n')); process.exitCode = 1 }
  else console.log(`Font notices verified: ${result.fonts} application fonts${process.argv.includes('--built') ? ', including production artifacts' : ''}.`)
}
