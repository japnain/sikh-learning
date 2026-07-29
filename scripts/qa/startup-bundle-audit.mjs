#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const DIST_DIR = path.resolve('dist')
const ASSETS_DIR = path.join(DIST_DIR, 'assets')
const INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html')
const BACKEND_CHUNK_PATTERN = /^vendor-backend-.*\.js$/

function fail(message) {
  console.error(`Startup bundle audit failed: ${message}`)
  process.exitCode = 1
}

if (!fs.existsSync(INDEX_HTML_PATH)) {
  fail('dist/index.html does not exist. Run the production build first.')
} else {
  const indexHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf8')
  const backendChunks = fs.existsSync(ASSETS_DIR)
    ? fs.readdirSync(ASSETS_DIR).filter(file => BACKEND_CHUNK_PATTERN.test(file))
    : []

  if (backendChunks.length === 0) {
    fail('the lazy cloud runtime backend chunk is missing from the production output.')
  }

  const preloadedBackendChunks = backendChunks.filter(file => (
    indexHtml.includes(`rel="modulepreload" crossorigin href="/assets/${file}"`)
    || indexHtml.includes(`rel="modulepreload" href="/assets/${file}"`)
  ))

  if (preloadedBackendChunks.length > 0) {
    fail(`Supabase is in the initial preload graph: ${preloadedBackendChunks.join(', ')}`)
  }

  const entryMatch = indexHtml.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)
  if (!entryMatch) {
    fail('the production module entry could not be identified.')
  } else {
    const entryPath = path.join(DIST_DIR, entryMatch[1].replace(/^\/+/, ''))
    const entrySource = fs.readFileSync(entryPath, 'utf8')
    const staticallyImportedBackendChunks = backendChunks.filter(file => (
      entrySource.includes(`from"./${file}"`)
      || entrySource.includes(`from'./${file}'`)
    ))

    if (staticallyImportedBackendChunks.length > 0) {
      fail(`the app entry statically imports Supabase: ${staticallyImportedBackendChunks.join(', ')}`)
    }
  }

  if (process.exitCode !== 1) {
    console.log(
      `Startup bundle audit passed: ${backendChunks.join(', ')} remains lazy and is not module-preloaded.`
    )
  }
}
