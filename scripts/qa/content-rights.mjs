import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const walk = dir => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]) : []
const relative = (root, file) => path.relative(root, file).split(path.sep).join('/')

// Deliberately conservative: review all source art, even when a bundle may tree-shake it.
// Vendor PDF.js and application fonts have their own bundled license inventories.
export function contentFiles(root) {
  return [
    ...walk(path.join(root, 'src/assets')).filter(file => /\.(png|jpe?g|webp|avif|svg)$/i.test(file)),
    ...walk(path.join(root, 'public')).filter(file => !file.includes(`${path.sep}vendor${path.sep}`) && !file.includes(`${path.sep}licenses${path.sep}`) && /\.(png|jpe?g|webp|avif|svg|mp3|wav|ogg|epub)$/i.test(file)),
    ...walk(path.join(root, 'public/data')).filter(file => /\.json$/i.test(file)),
    ...walk(path.join(root, 'scripts/shabados/definitions')).filter(file => /\.toml$/i.test(file)),
  ].map(file => relative(root, file)).sort()
}

export function verifyContentRights(root, { inventoryOnly = false } = {}) {
  const register = JSON.parse(fs.readFileSync(path.join(root, 'docs/content-rights-register.json'), 'utf8'))
  if (register.version !== 1 || !Array.isArray(register.entries)) throw new Error('Unsupported rights register')
  const errors = []
  const declared = new Map()
  const unresolved = []
  for (const entry of register.entries) {
    for (const file of entry.files ?? []) {
      if (declared.has(file.path)) errors.push(`Duplicate content registration: ${file.path}`)
      declared.set(file.path, entry.id)
      const local = path.join(root, file.path)
      if (!fs.existsSync(local) || digest(fs.readFileSync(local)) !== file.sha256) errors.push(`Content changed or missing: ${file.path}`)
    }
    if (entry.status !== 'approved') unresolved.push(entry.id)
    if (entry.status === 'approved' && (!entry.source || !entry.creator || !entry.license || !entry.evidence || !entry.reviewedAt || entry.distribution?.web !== true || entry.distribution?.offline !== true || entry.distribution?.transformation !== true || !entry.attribution)) errors.push(`Incomplete approval evidence: ${entry.id}`)
  }
  for (const file of contentFiles(root)) if (!declared.has(file)) errors.push(`Unregistered distribution content: ${file}`)
  for (const id of ['provider-banidb', 'provider-shabados']) if (!register.entries.some(entry => entry.id === id)) errors.push(`Missing provider distribution review: ${id}`)
  if (!inventoryOnly && unresolved.length) errors.push(`Release blocked: ${unresolved.length} content decisions remain unresolved or blocked (${unresolved.slice(0, 10).join(', ')}${unresolved.length > 10 ? ', …' : ''}). See docs/content-rights-register.json for every decision.`)
  return { entries: register.entries.length, files: declared.size, unresolved: unresolved.length, errors }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
  const inventoryOnly = process.argv.includes('--inventory-only')
  const result = verifyContentRights(root, { inventoryOnly })
  if (result.errors.length) { console.error(result.errors.join('\n')); process.exitCode = 1 }
  else console.log(`Rights ${inventoryOnly ? 'inventory' : 'release'} check: ${result.entries} entries, ${result.files} files, ${result.unresolved} unresolved. Inventory success is not distribution approval.`)
}
