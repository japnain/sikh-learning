#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const baseUrl = process.env.QA_BROWSER_BASE_URL ?? 'http://127.0.0.1:4187'
const reportDirectory = path.resolve(process.env.QA_BROWSER_OUTPUT ?? path.join(root, 'tmp/browser-acceptance'))
const skipServer = process.env.QA_BROWSER_SKIP_SERVER === '1'
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

async function run(script, args = [], environment = {}) {
  const child = spawn(process.execPath, [path.join(root, script), ...args], {
    cwd: root, stdio: 'inherit', env: { ...process.env, QA_DETERMINISTIC: '1', ...environment },
  })
  const [code, signal] = await once(child, 'exit')
  if (code !== 0) throw new Error(`${script} failed (${signal ?? code}).`)
}

async function waitForServer(child) {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) throw new Error(`Preview exited with code ${child.exitCode}.`)
    try { if ((await fetch(baseUrl, { signal: AbortSignal.timeout(1500) })).ok) return } catch { /* wait for preview */ }
    await delay(200)
  }
  throw new Error(`Preview did not become ready at ${baseUrl}.`)
}

async function main() {
  if (!skipServer && !fs.existsSync(path.join(root, 'dist/index.html'))) throw new Error('Run npm run build before production browser acceptance.')
  fs.mkdirSync(reportDirectory, { recursive: true })
  const url = new URL(baseUrl)
  let server
  const failures = []
  // Each journey owns isolated browser storage. Finish the independent journeys
  // so one stale selector does not hide failures elsewhere in the same CI run.
  const check = async (script, args = [], environment = {}) => {
    try { await run(script, args, environment) }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(message)
      console.error(message)
    }
  }
  try {
    if (!skipServer) {
      server = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'preview', '--host', url.hostname, '--port', url.port || '4187', '--strictPort', '--configLoader', 'runner'], { cwd: root, stdio: ['ignore', 'inherit', 'inherit'] })
      await waitForServer(server)
    }
    const baseReader = '/study?source=G&ang=1&startAng=1&endAng=8&bani=Japji+Sahib&baniDbId=2&exactBani=1&baniId=japji-sahib'
    const lengthReader = '/study?source=G&ang=8&startAng=8&endAng=12&bani=Rehras+Sahib&baniDbId=21&exactBani=1&baniId=rehras-sahib&sgLength=medium'
    const cases = [
      ['home', 'en', 'light', 1], ['home', 'pa', 'dark', 2],
      ['reader', 'en', 'light', 1], ['reader', 'hi', 'dark', 2],
      ['length', 'en', 'light', 2], ['length', 'pa', 'dark', 2],
      ['find', 'en', 'light', 2], ['find', 'hi', 'dark', 2],
      ['finish', 'en', 'light', 1],
    ]
    for (const [surface, locale, theme, scale] of cases) {
      const route = surface === 'home' ? '/' : surface === 'length' ? lengthReader : baseReader
      await check('scripts/qa/bani-reader-acceptance.mjs', [
        `--url=${new URL(route, baseUrl).href}`, `--surface=${surface}`, `--locale=${locale}`,
        `--theme=${theme}`, `--text-scale=${scale}`, '--width=320', '--height=568', '--deterministic',
        `--output=${path.join(reportDirectory, `bani-${surface}-${locale}-${theme}-${scale}.json`)}`,
      ])
    }
    await check('scripts/qa/stories-reader-acceptance.mjs', [
      `--url=${baseUrl}`, '--published-only', '--deterministic', `--output=${path.join(reportDirectory, 'stories/acceptance.json')}`,
    ])
    await check('scripts/qa/reader-nitnem-polish.mjs', [], {
      QA_BASE_URL: baseUrl,
      QA_OUTPUT_DIR: path.join(reportDirectory, 'reader-nitnem'),
      QA_CASES: '',
    })
    await check('scripts/qa/read-discovery-acceptance.mjs', [], {
      QA_BASE_URL: baseUrl,
      QA_OUTPUT_DIR: path.join(reportDirectory, 'read-discovery'),
      QA_CASES: '',
    })
    await check('scripts/qa/daily-more-acceptance.mjs', [], {
      QA_BASE_URL: baseUrl,
      QA_OUTPUT_DIR: path.join(reportDirectory, 'daily-more'),
    })
    if (failures.length) throw new Error(`Production browser acceptance failed (${failures.length} journeys):\n${failures.join('\n')}`)
    console.log(`Production browser acceptance passed: ${cases.length} Bani/Home surfaces, published Stories, persistent reader/Folio journeys, Read discovery, and Daily/More journeys.`)
  } finally {
    if (server && server.exitCode === null) {
      server.kill('SIGTERM')
      await Promise.race([once(server, 'exit'), delay(3000)])
      if (server.exitCode === null) server.kill('SIGKILL')
    }
  }
}

main().catch(error => { console.error(error instanceof Error ? error.stack : error); process.exitCode = 1 })
