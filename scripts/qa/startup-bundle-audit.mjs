#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import ts from 'typescript'

// Measure the entire static startup graph, including shared chunks. Lazy route
// chunks are excluded; changes must fit a deliberate, reviewable transfer budget.
export const STARTUP_BUDGETS = { javascriptGzip: 190 * 1024, cssGzip: 36 * 1024, javascriptRaw: 650 * 1024, cssRaw: 210 * 1024 }

export function inspectStartupBundle(distDirectory = 'dist', budgets = STARTUP_BUDGETS) {
  const root = path.resolve(distDirectory)
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  const failures = []
  const entry = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)
  if (!entry) throw new Error('The production module entry could not be identified.')
  const assetNames = fs.readdirSync(path.join(root, 'assets'))
  if (!assetNames.some(name => /^vendor-backend-.*\.js$/.test(name))) failures.push('The lazy cloud backend chunk is missing.')
  const seeds = [...html.matchAll(/(?:src|href)="([^\"]+\.(?:js|css))"/g)].map(match => match[1])
  const visited = new Set()
  const totals = { javascriptGzip: 0, cssGzip: 0, javascriptRaw: 0, cssRaw: 0 }
  const assets = []
  const queue = seeds.map(name => path.resolve(root, name.replace(/^\/+/, '')))

  while (queue.length) {
    const absolute = queue.shift()
    if (visited.has(absolute)) continue
    visited.add(absolute)
    if (!absolute.startsWith(`${root}${path.sep}`)) throw new Error('An initial asset escapes the build directory.')
    const bytes = fs.readFileSync(absolute)
    const relative = path.relative(root, absolute)
    const kind = absolute.endsWith('.css') ? 'css' : 'javascript'
    totals[`${kind}Raw`] += bytes.length
    totals[`${kind}Gzip`] += gzipSync(bytes).length
    assets.push(relative)
    if (/^vendor-backend-.*\.js$/.test(path.basename(absolute))) failures.push(`Supabase entered the static startup graph: ${relative}`)
    if (kind !== 'javascript') continue
    // Parse declarations: strings and dynamic imports must not be mistaken for
    // eager dependencies. TypeScript is an existing direct development dependency.
    const source = ts.createSourceFile(absolute, bytes.toString('utf8'), ts.ScriptTarget.Latest, false, ts.ScriptKind.JS)
    for (const statement of source.statements) {
      if (!(ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement))) continue
      const specifier = statement.moduleSpecifier
      if (!specifier || !ts.isStringLiteral(specifier)) continue
      const name = specifier.text
      if (name.startsWith('.') && /\.(?:js|css)$/.test(name)) queue.push(path.resolve(path.dirname(absolute), name))
    }
  }

  for (const [metric, limit] of Object.entries(budgets)) {
    if (totals[metric] > limit) failures.push(`${metric}: ${(totals[metric] / 1024).toFixed(1)} KiB exceeds ${(limit / 1024).toFixed(1)} KiB budget.`)
  }
  return { totals, budgets, assets: assets.sort(), failures }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = inspectStartupBundle(process.argv[2] ?? 'dist')
    for (const [metric, bytes] of Object.entries(report.totals)) console.log(`[startup] ${metric}: ${(bytes / 1024).toFixed(1)} / ${(report.budgets[metric] / 1024).toFixed(1)} KiB`)
    if (report.failures.length) {
      report.failures.forEach(failure => console.error(`Startup bundle audit failed: ${failure}`))
      process.exitCode = 1
    } else console.log(`Startup bundle audit passed: ${report.assets.length} initial assets within budget; Supabase remains lazy.`)
  } catch (error) {
    console.error(`Startup bundle audit failed: ${error.message}`)
    process.exitCode = 1
  }
}
