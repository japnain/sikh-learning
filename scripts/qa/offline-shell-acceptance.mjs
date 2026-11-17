import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { resolveBrowserExecutable } from './browser-fixtures.mjs'

// Fault-injected production-build check, using only an isolated guest profile
// and synthetic local readings. No provider/account requests are permitted.
const dist = path.resolve(process.env.QA_SHELL_DIST || 'dist')
const expected = process.env.QA_SHELL_EXPECT_STATUS || 'shell-unavailable'
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'naamras-shell-qa-'))
const started = Date.now()
let stage = 'starting'
let page
const pageErrors = []
const requestFailures = []
function step(value, detail = {}) {
  stage = value
  console.log(JSON.stringify({ step: stage, elapsedMs: Date.now() - started, ...detail }))
}
async function diagnostics(reason) {
  const visible = page && !page.isClosed() ? await Promise.race([
    page.evaluate(() => ({
      route: location.pathname,
      readiness: [...document.querySelectorAll('[data-offline-status]')].map(element => ({ status: element.dataset.offlineStatus, text: element.textContent })),
      dialogs: [...document.querySelectorAll('[role="dialog"]')].map(element => ({ label: element.getAttribute('aria-label'), text: element.textContent?.slice(0, 500) })),
      body: document.body.innerText.slice(0, 1800),
    })).catch(error => ({ diagnosticError: error.message })),
    new Promise(resolve => setTimeout(() => resolve({ diagnosticError: 'DOM inspection timed out' }), 2_000)),
  ]) : { page: 'not open' }
  console.error(JSON.stringify({ reason, stage, elapsedMs: Date.now() - started, pageErrors, requestFailures: requestFailures.slice(-12), visible }, null, 2))
}
const timeout = setTimeout(() => {
  void diagnostics('Offline shell QA timed out').finally(() => process.exit(1))
}, 90_000)
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  let file = path.resolve(dist, `.${pathname}`)
  if (!file.startsWith(`${dist}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(dist, 'index.html')
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }
  response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' })
  fs.createReadStream(file).pipe(response)
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
step('static server ready', { dist, expected })
let context
try {
  const options = { executablePath: resolveBrowserExecutable(), headless: true, serviceWorkers: 'block', viewport: { width: 390, height: 844 } }
  step('launching isolated browser')
  context = await chromium.launchPersistentContext(profile, options)
  context.setDefaultTimeout(10_000)
  context.setDefaultNavigationTimeout(15_000)
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort('blockedbyclient'))
  await context.addInitScript(() => {
    sessionStorage.setItem('splash-shown', '1')
    localStorage.setItem('sikh-onboarding', JSON.stringify({ state: { hasCompletedOnboarding: true, isOnboardingOpen: false, presentationMode: 'overlay', learningLevel: 'beginner', audience: 'adult', learningGoal: 'read' }, version: 0 }))
    localStorage.setItem('sikh-nitnem', JSON.stringify({ state: { selectedIds: ['japji-sahib'] }, version: 5 }))
    for (const [id, source, length] of [[2, 'G', null], [4, 'D', null], [6, 'D', null], [9, 'D', 'short'], [10, 'G', null], [21, 'G', 'short'], [23, 'G', 'short']]) {
      localStorage.setItem(`naamras-bani-reading-v1:${id}:${length || 'default'}`, JSON.stringify({
        entries: [{ id: `bani-${id}-1-1`, scripture: source === 'G' ? 'SGGS' : 'DG', source, ang: 1, gurmukhi: 'Synthetic offline fixture', transliteration: '', translation_en: '', translation_pa: '', translation_hi: '', words: [] }],
        availableLengths: length ? [length] : [], resolvedLength: length,
      }))
    }
  })
  page = context.pages()[0]
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('requestfailed', request => requestFailures.push({ method: request.method(), path: new URL(request.url()).pathname, error: request.failure()?.errorText }))
  step('opening routine editor')
  await page.goto(`${origin}/nitnem/customize#nitnem-continuity`, { waitUntil: 'domcontentloaded' })
  step('waiting for shell readiness result')
  await page.locator(`[data-offline-status="${expected}"]`).waitFor({ timeout: 40_000 })
  const result = await page.locator('[data-offline-status]').evaluate(element => ({ status: element.dataset.offlineStatus, text: element.textContent }))
  step('observed readiness result', result)
  assert.equal(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), 0)
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('naamras-bani-reading-v1:2:default')).entries[0].gurmukhi), 'Synthetic offline fixture')
  if (expected === 'shell-unavailable') {
    assert.match(result.text, /offline reopening is not ready/)
    step('retrying shell preparation')
    await page.locator('[data-offline-status="shell-unavailable"]').getByRole('button', { name: 'Try again', exact: true }).click()
    await page.locator('[data-offline-status="preparing"]').waitFor({ timeout: 5_000 })
    step('retry entered preparing')
  }
  step('closing first browser')
  await context.close()
  step('launching cold offline browser')
  context = await chromium.launchPersistentContext(profile, { ...options, offline: true })
  page = context.pages()[0]
  step('attempting offline deep link')
  let coldError = ''
  try { await page.goto(`${origin}/nitnem/customize?cold=1`, { timeout: 10_000 }) } catch (error) { coldError = String(error).split('\n')[0] }
  assert.match(coldError, /ERR_INTERNET_DISCONNECTED/)
  console.log(JSON.stringify({ dist, ...result, workers: 0, retainedText: true, coldRestart: coldError }, null, 2))
  step('all assertions passed')
} catch (error) {
  await diagnostics(error.stack || String(error))
  throw error
} finally {
  step('closing QA resources')
  await context?.close()
  server.closeAllConnections()
  await new Promise(resolve => server.close(resolve))
  fs.rmSync(profile, { recursive: true, force: true })
  clearTimeout(timeout)
  step('cleanup complete')
}
