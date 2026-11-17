#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

// Two real production builds, actual public scripture responses, and an isolated
// guest profile. Keep an old tab alive while deploying the new build, then prove
// downloads, cache repair, old-tab lazy imports, and cold offline reading work.
const oldDist = path.resolve(process.env.QA_OLD_DIST || '')
const newDist = path.resolve(process.env.QA_NEW_DIST || 'dist')
const output = path.resolve(process.env.QA_OUTPUT_DIR || 'tmp/offline-upgrade-acceptance')
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'naamras-upgrade-qa-'))
const packCache = 'naamras-bani-downloads-v1'
const downloadTimeout = Number(process.env.QA_DOWNLOAD_TIMEOUT_MS || 120_000)
const candidates = [process.env.CHROME_EXECUTABLE,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', chromium.executablePath()]
const executablePath = candidates.find(candidate => candidate && fs.existsSync(candidate))
assert(process.env.QA_OLD_DIST, 'Set QA_OLD_DIST to a previous production build.')
assert(executablePath, 'Install Chromium or set CHROME_EXECUTABLE.')
assert(Number.isFinite(downloadTimeout) && downloadTimeout >= 30_000, 'Invalid download timeout.')
for (const directory of [oldDist, newDist]) {
  assert(fs.existsSync(path.join(directory, 'index.html')), `Missing production index: ${directory}`)
  assert(fs.existsSync(path.join(directory, 'sw.js')), `Missing production service worker: ${directory}`)
}
const buildVersion = directory => fs.readFileSync(path.join(directory, 'sw.js'), 'utf8').match(/const CACHE_VERSION = ['"]([^'"]+)['"]/)?.[1]
const oldVersion = buildVersion(oldDist)
const newVersion = buildVersion(newDist)
assert(oldVersion && newVersion && oldVersion !== newVersion, 'Use two distinct generated production builds.')
const newShell = `naamras-app-shell-${newVersion}`
const oldShell = `naamras-app-shell-${oldVersion}`
const savedLengths = { 'chaupai-sahib': 'long', 'kirtan-sohila': 'extralong' }
const expected = {
  9: { id: 'chaupai-sahib', name: 'Chaupai Sahib', source: 'D', start: 1386, end: 1388, counts: { short: 104, medium: 130, long: 173 } },
  23: { id: 'kirtan-sohila', name: 'Kirtan Sohila', source: 'G', start: 12, end: 13, counts: { short: 54, medium: 61, long: 86, extralong: 145 } },
}
const results = { oldVersion, newVersion, steps: [], downloads: [], offline: [], http: [], pageErrors: [], assetFailures: [] }
let serving = oldDist
let context
let page
let oldPage
let serverClosed = false
let stage = 'starting'
const started = Date.now()
fs.mkdirSync(output, { recursive: true })

function step(name, detail = {}) {
  stage = name
  const entry = { step: name, elapsedMs: Date.now() - started, ...detail }
  results.steps.push(entry)
  console.log(JSON.stringify(entry))
}

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  let file = path.resolve(serving, `.${pathname}`)
  if (!file.startsWith(`${serving}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    // A missing hashed asset is a real 404, never a successful HTML fallback.
    if (pathname.startsWith('/assets/') || path.extname(pathname)) {
      response.writeHead(404, { 'Cache-Control': 'no-store' })
      response.end('Not found')
      return
    }
    file = path.join(serving, 'index.html')
  }
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json',
    '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' }
  response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' })
  fs.createReadStream(file).pipe(response)
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const totalDeadline = setTimeout(() => {
  fs.writeFileSync(path.join(output, 'timeout.json'), JSON.stringify({ stage, elapsedMs: Date.now() - started, results }, null, 2))
  console.error(`Offline upgrade QA timed out during ${stage}`)
  process.exit(1)
}, 600_000)

async function closeServer() {
  if (serverClosed) return
  serverClosed = true
  server.closeAllConnections()
  await new Promise(resolve => server.close(resolve))
}

function attachPage(target) {
  if (target.__upgradeQaAttached) return
  target.__upgradeQaAttached = true
  target.on('pageerror', error => results.pageErrors.push(error.message))
  target.on('response', response => {
    const url = new URL(response.url())
    if (url.pathname === '/rest/v1/scripture_reading_packs') {
      results.http.push({ status: response.status(), reading: url.searchParams.get('reading_key'), variant: url.searchParams.get('variant') })
    }
    if (url.origin === origin && url.pathname.startsWith('/assets/') && response.status() >= 400) {
      results.assetFailures.push({ path: url.pathname, status: response.status() })
    }
  })
}

async function launch(offline) {
  context = await chromium.launchPersistentContext(profile, { executablePath, headless: true, offline,
    serviceWorkers: 'allow', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', colorScheme: 'light', timezoneId: 'America/Toronto' })
  context.setDefaultTimeout(30_000)
  context.setDefaultNavigationTimeout(45_000)
  context.on('page', attachPage)
  await context.route('https://*.supabase.co/**', route => {
    const request = route.request()
    const pathname = new URL(request.url()).pathname
    if (['/rest/v1/', '/auth/v1/', '/storage/v1/'].some(prefix => pathname.startsWith(prefix))
      && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      results.pageErrors.push(`Blocked unexpected ${request.method()} ${pathname}`)
      return route.abort('blockedbyclient')
    }
    return route.continue()
  })
  await context.addInitScript(({ siteOrigin, lengths }) => {
    if (location.origin !== siteOrigin) return
    const workerIds = new WeakMap()
    let nextWorkerId = 1
    const describe = worker => {
      if (!worker) return null
      if (!workerIds.has(worker)) workerIds.set(worker, nextWorkerId++)
      return { id: workerIds.get(worker), state: worker.state, scriptURL: worker.scriptURL }
    }
    const trace = []
    window.__qaWorkerTrace = trace
    const watched = new WeakSet()
    const watch = worker => {
      if (!worker || watched.has(worker)) return
      watched.add(worker)
      trace.push({ at: performance.now(), event: 'worker observed', worker: describe(worker) })
      worker.addEventListener('statechange', () => trace.push({ at: performance.now(), event: 'statechange', worker: describe(worker) }))
    }
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      trace.push({ at: performance.now(), event: 'controllerchange', worker: describe(navigator.serviceWorker.controller) })
      watch(navigator.serviceWorker.controller)
    })
    void navigator.serviceWorker.ready.then(registration => {
      window.__qaWorkerSnapshot = () => ({ active: describe(registration.active), waiting: describe(registration.waiting),
        installing: describe(registration.installing), controller: describe(navigator.serviceWorker.controller) })
      const record = event => {
        trace.push({ at: performance.now(), event, ...window.__qaWorkerSnapshot() })
        for (const worker of [registration.active, registration.waiting, registration.installing]) watch(worker)
      }
      record('registration ready')
      registration.addEventListener('updatefound', () => record('updatefound'))
    })
    sessionStorage.setItem('splash-shown', '1')
    if (localStorage.getItem('qa-offline-upgrade-seeded')) return
    localStorage.setItem('qa-offline-upgrade-seeded', '1')
    localStorage.setItem('sikh-onboarding', JSON.stringify({ state: { hasCompletedOnboarding: true, isOnboardingOpen: false }, version: 0 }))
    localStorage.setItem('sikh-ui-locale', JSON.stringify({ state: { locale: 'en' }, version: 0 }))
    localStorage.setItem('sikh-theme', JSON.stringify({ state: { dark: false, mode: 'light' }, version: 0 }))
    localStorage.setItem('sikh-language', JSON.stringify({ state: { fontSize: 22, scriptMode: 'gurmukhi', larivaar: false,
      showVishraam: true, meaningLanguage: 'en', showTransliteration: false }, version: 0 }))
    localStorage.setItem('sikh-sundar-gutka-lengths', JSON.stringify({ state: { lengths }, version: 2 }))
    localStorage.setItem('naamras-reader-presentation', 'read')
  }, { siteOrigin: origin, lengths: savedLengths })
  page = context.pages()[0] || await context.newPage()
  attachPage(page)
}

async function openDownloads(target) {
  await target.goto(`${origin}/downloads`, { waitUntil: 'domcontentloaded' })
  const panel = target.getByTestId('bani-downloads')
  await panel.waitFor({ state: 'visible' })
  if (!await panel.evaluate(element => element.open)) await panel.locator('summary').click()
  await target.waitForFunction(() => {
    const select = document.querySelector('[data-testid="bani-downloads"] select')
    return select && !select.disabled && select.options.length > 0
  })
  return panel
}

async function readPack(target, key, raw = false) {
  return target.evaluate(async ({ cacheName, readingKey, returnRaw }) => {
    const cache = await caches.open(cacheName)
    const response = await cache.match(`https://naamras.local/__naamras-downloads/packs/${encodeURIComponent(readingKey)}`)
    if (!response) throw new Error(`Missing downloaded pack: ${readingKey}`)
    const body = await response.text()
    if (returnRaw) return body
    const { payload, sha256 } = JSON.parse(body)
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)))
    const actual = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
    if (actual !== sha256) throw new Error(`Corrupt downloaded pack: ${readingKey}`)
    return payload
  }, { cacheName: packCache, readingKey: key, returnRaw: raw })
}

async function download(target, key) {
  const panel = target.getByTestId('bani-downloads')
  await panel.getByLabel('Choose a bani to download', { exact: true }).selectOption(key)
  await panel.getByRole('button', { name: /^(Download bani|Update download)$/ }).click()
  await target.waitForFunction(() => {
    const panel = document.querySelector('[data-testid="bani-downloads"]')
    return panel && !panel.querySelector('progress')
      && (panel.querySelector('[role="alert"]') || panel.querySelector('[role="status"]')?.textContent?.includes('Download complete'))
  }, undefined, { timeout: downloadTimeout })
  assert.equal(await panel.locator('[role="alert"]').count(), 0, `Download ${key}: ${await panel.locator('[role="alert"]').allTextContents()}`)
  const pack = await readPack(target, key)
  const counts = Object.fromEntries(Object.entries(pack.readings).map(([length, reading]) => [length,
    reading.entries.reduce((sum, entry) => sum + (entry.lines?.length || 0), 0)]))
  results.downloads.push({ key, counts, checksumVerified: true })
  step('download complete', { key, counts })
  return pack
}

function routeFor(id, length) {
  const bani = expected[id]
  return `/study?${new URLSearchParams({ source: bani.source, ang: String(bani.start), startAng: String(bani.start),
    endAng: String(bani.end), bani: bani.name, baniDbId: String(id), exactBani: '1', baniId: bani.id, sgLength: length })}`
}

async function verifyDisplayed(target, reading, label) {
  const expectedLines = reading.entries.flatMap(entry => (entry.lines || []).map((line, index) => ({
    anchor: `${entry.id}:${index}`, verse: String(line.verseId), header: Boolean(line.isHeader), text: line.gurmukhi,
  })))
  await target.locator('[data-testid="page-study"][data-ai-state="ready"]').waitFor()
  await target.waitForFunction(count => document.querySelectorAll('[data-testid="study-line"]').length === count, expectedLines.length)
  const actual = await target.getByTestId('study-line').evaluateAll(elements => elements.map(element => ({
    anchor: element.getAttribute('data-reader-anchor'), verse: element.getAttribute('data-verse-id'),
    header: element.getAttribute('data-line-kind') === 'header', text: element.querySelector('[data-testid="study-gurbani-line"]')?.textContent || '',
  })))
  const normalize = lines => lines.map(line => ({ ...line, text: line.text.replace(/\s+/gu, ' ').trim() }))
  assert.deepEqual(normalize(actual), normalize(expectedLines), `${label}: every source row, heading, opening and ending is preserved`)
  results.offline.push({ label, rows: actual.length, orderedSourceMatch: true })
  step('offline reading verified', { label, rows: actual.length })
}

async function removeShellEntry(entry) {
  const removed = await page.evaluate(async ({ cacheName, asset }) => (await caches.open(cacheName)).delete(asset), { cacheName: newShell, asset: entry })
  assert.equal(removed, true, `Evicted existing shell entry: ${entry}`)
  step('simulated partial shell eviction', { entry })
}

async function assertShellEntry(entry) {
  assert.equal(await page.evaluate(async ({ cacheName, asset }) => Boolean((await (await caches.open(cacheName)).match(asset))?.ok),
    { cacheName: newShell, asset: entry }), true, `Repaired shell entry: ${entry}`)
}

try {
  step('launching previous build', { origin })
  await launch(false)
  oldPage = page
  await openDownloads(oldPage)
  await oldPage.waitForFunction(async () => Boolean((await navigator.serviceWorker.ready).active && navigator.serviceWorker.controller))
  const originalPack = await download(oldPage, 'banidb:2')
  const originalBytes = await readPack(oldPage, 'banidb:2', true)
  assert((await oldPage.evaluate(() => caches.keys())).includes(oldShell), 'The old shell really installed')
  const originalDocument = await oldPage.evaluate(() => [...document.querySelectorAll('script[type="module"][src]')].map(node => node.src))

  // Leave the old Downloads page open and its Study chunk unexecuted.
  serving = newDist
  page = await context.newPage()
  await openDownloads(page)
  step('new page loaded beside old tab')
  await page.evaluate(async () => { await (await navigator.serviceWorker.ready).update() })
  // Pin an installed candidate across multiple turns of the event loop so an
  // overlapping registration update cannot look like a stable waiting worker.
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready
    const started = performance.now()
    let candidate = null
    let stableSince = 0
    while (performance.now() - started < 60_000) {
      const waiting = registration.waiting
      if (waiting?.state === 'installed') {
        if (waiting !== candidate) { candidate = waiting; stableSince = performance.now() }
        if (performance.now() - stableSince >= 300) return
      } else { candidate = null; stableSince = 0 }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw new Error(`No stable waiting worker: ${JSON.stringify({ snapshot: window.__qaWorkerSnapshot?.(), trace: window.__qaWorkerTrace })}`)
  })
  const beforeRecovery = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready
    const before = window.__qaWorkerSnapshot?.()
    const activeWorker = registration.active
    const waitingWorker = registration.waiting
    const assets = [...document.querySelectorAll('script[type="module"][src],link[rel="stylesheet"][href]')]
      .map(node => new URL(node.src || node.href)).filter(url => url.origin === location.origin).map(url => url.pathname)
    const reply = await new Promise(resolve => {
      const channel = new MessageChannel()
      const timer = setTimeout(() => { channel.port1.close(); resolve({ ready: false, legacyTimeout: true }) }, 2_000)
      channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data) }
      activeWorker.postMessage({ type: 'NAAMRAS_CHECK_OFFLINE_READER', assets }, [channel.port2])
    })
    return { active: registration.active?.state, waiting: registration.waiting?.state, reply, assets,
      before, after: window.__qaWorkerSnapshot?.(), activeUnchanged: registration.active === activeWorker,
      waitingUnchanged: registration.waiting === waitingWorker, workerEvents: window.__qaWorkerTrace,
      cacheNames: await caches.keys(), modules: [...document.querySelectorAll('script[type="module"][src]')].map(node => node.src) }
  })
  results.beforeRecovery = beforeRecovery
  results.oldPageBeforeRecovery = await oldPage.evaluate(async () => ({ snapshot: window.__qaWorkerSnapshot?.(),
    workerEvents: window.__qaWorkerTrace, cacheNames: await caches.keys(), url: location.href,
    modules: [...document.querySelectorAll('script[type="module"][src]')].map(node => node.src) }))
  step('captured pre-recovery worker state', { before: beforeRecovery.before, after: beforeRecovery.after, reply: beforeRecovery.reply })
  assert.equal(beforeRecovery.active, 'activated')
  assert.equal(beforeRecovery.waiting, 'installed')
  assert.equal(beforeRecovery.activeUnchanged, true, 'Old active worker remains active throughout the failure probe')
  assert.equal(beforeRecovery.waitingUnchanged, true, 'The same installed update remains waiting throughout the failure probe')
  assert.equal(beforeRecovery.reply.ready, false, 'Old active worker rejects the new page before recovery')
  step('reproduced old worker blocking new page')
  const chaupai = await download(page, 'banidb:9')
  assert.deepEqual(Object.fromEntries(Object.entries(chaupai.readings).map(([key, value]) => [key,
    value.entries.reduce((sum, entry) => sum + (entry.lines?.length || 0), 0)])), expected[9].counts)
  await page.waitForFunction(async () => !(await navigator.serviceWorker.ready).waiting)
  assert.equal(await readPack(page, 'banidb:2', true), originalBytes, 'Upgrade preserves old verified download byte-for-byte')
  const cachesAfterUpgrade = await page.evaluate(() => caches.keys())
  assert(cachesAfterUpgrade.includes(oldShell), 'Keep the old shell while the old tab still needs its lazy assets')
  assert(cachesAfterUpgrade.includes(newShell), 'New shell is installed')
  assert.deepEqual(await oldPage.evaluate(() => [...document.querySelectorAll('script[type="module"][src]')].map(node => node.src)),
    originalDocument, 'Upgrade never reloads the open old document')

  // Delete a lazy JS asset from the required cache. Download must repair the
  // complete shell, even if normal runtime fetches could conceal the missing entry.
  const lazyAsset = await page.evaluate(async cacheName => (await (await caches.open(cacheName)).keys())
    .map(request => new URL(request.url).pathname).find(asset => /\/Study-[^/]+\.js$/.test(asset)), newShell)
  assert(lazyAsset, 'Study lazy module is in the required shell')
  await removeShellEntry(lazyAsset)
  const alahnia = await download(page, 'shabados:ALHN')
  await assertShellEntry(lazyAsset)
  assert.equal(alahnia.readings.default.entries.reduce((sum, entry) => sum + (entry.lines?.length || 0), 0), 135)
  await removeShellEntry('/')
  const sohila = await download(page, 'banidb:23')
  await assertShellEntry('/')
  assert.deepEqual(Object.fromEntries(Object.entries(sohila.readings).map(([key, value]) => [key,
    value.entries.reduce((sum, entry) => sum + (entry.lines?.length || 0), 0)])), expected[23].counts)
  results.partialShellRepair = { lazyModule: true, document: true }
  assert.equal(await readPack(page, 'banidb:2', true), originalBytes, 'Repair preserves prior verified downloads')
  await page.getByTestId('bani-downloads').scrollIntoViewIfNeeded()
  await page.screenshot({ path: path.join(output, 'downloads-after-upgrade.png') })

  await context.setOffline(true)
  await oldPage.getByTestId('bani-downloads').getByRole('button', { name: 'Read: Japji Sahib', exact: true }).click()
  await verifyDisplayed(oldPage, originalPack.readings.default, 'Old open tab lazy reader after update')
  results.oldTabPreserved = true
  assert.deepEqual(results.assetFailures, [], 'No missing hashed assets in either open version')

  step('closing browser for cold offline restart')
  await context.close()
  context = null
  await closeServer()
  step('HTTP server stopped before cold offline launch')
  await launch(true)
  await page.goto(`${origin}${routeFor(9, 'short')}`, { waitUntil: 'domcontentloaded' })
  assert.equal(await page.evaluate(() => navigator.onLine), false)
  for (const [id, bani] of Object.entries(expected)) {
    const pack = await readPack(page, `banidb:${id}`)
    await page.goto(`${origin}${routeFor(id, Object.keys(bani.counts)[0])}`, { waitUntil: 'domcontentloaded' })
    for (const length of Object.keys(bani.counts)) {
      await page.getByTestId('study-reader-opening').getByTestId('bani-length-control').click()
      const sheet = page.getByTestId('bani-length-sheet')
      await sheet.locator(`input[type="radio"][value="${length}"]`).check()
      assert.equal(await sheet.getByRole('checkbox', { name: 'Use for my Nitnem', exact: true }).isChecked(), false)
      await sheet.locator('button[type="submit"]').click()
      await sheet.waitFor({ state: 'hidden' })
      await verifyDisplayed(page, pack.readings[length], `${bani.name} ${length} after cold offline restart`)
      assert.equal(new URL(page.url()).searchParams.get('sgLength'), length)
    }
  }
  await page.goto(`${origin}/study?shabadosBani=ALHN&source=G&bani=Alahnia`, { waitUntil: 'domcontentloaded' })
  await verifyDisplayed(page, (await readPack(page, 'shabados:ALHN')).readings.default, 'Shabad OS after cold offline restart')
  await page.screenshot({ path: path.join(output, 'reader-cold-offline.png') })
  await page.goto(`${origin}/study?source=G&ang=1&startAng=1&endAng=8&bani=Japji+Sahib&baniDbId=2&exactBani=1&baniId=japji-sahib`, { waitUntil: 'domcontentloaded' })
  await verifyDisplayed(page, (await readPack(page, 'banidb:2')).readings.default, 'Pre-update download after cold offline restart')
  assert.equal(await readPack(page, 'banidb:2', true), originalBytes)
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('sikh-sundar-gutka-lengths')).state.lengths), savedLengths,
    'Downloading, upgrading, repairing, and switching lengths preserve saved default lengths')
  assert(results.http.some(item => item.status === 200 && item.reading), 'Downloaded real hosted scripture responses')
  assert.deepEqual(results.pageErrors, [], 'No unhandled page errors or unexpected backend mutations')
  results.passed = true
  step('all upgrade and offline assertions passed')
} catch (error) {
  results.passed = false
  results.failure = error instanceof Error ? error.stack : String(error)
  results.failedStage = stage
  if (page && !page.isClosed()) {
    await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {})
    results.failurePage = await page.evaluate(async () => ({ url: location.href, text: document.body.innerText.slice(0, 3000),
      snapshot: window.__qaWorkerSnapshot?.(), workerEvents: window.__qaWorkerTrace, cacheNames: await caches.keys(),
      modules: [...document.querySelectorAll('script[type="module"][src]')].map(node => node.src) })).catch(() => null)
    if (oldPage && !oldPage.isClosed()) results.failureOldPage = await oldPage.evaluate(() => ({ url: location.href,
      snapshot: window.__qaWorkerSnapshot?.(), workerEvents: window.__qaWorkerTrace })).catch(() => null)
  }
  throw error
} finally {
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(results, null, 2))
  if (context) await context.close()
  await closeServer()
  fs.rmSync(profile, { recursive: true, force: true })
  clearTimeout(totalDeadline)
}
