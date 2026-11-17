#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

// Real public reading requests, isolated local storage, no signed-in account.
// Run against a production build served over HTTPS (or a localhost preview).
// Unlike deterministic UI fixtures, this suite allows the production service
// worker and actually restarts a temporary browser profile without networking.
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4187'
const output = path.resolve(process.env.QA_OUTPUT_DIR || 'tmp/offline-bani-acceptance')
const downloadTimeout = Number(process.env.QA_DOWNLOAD_TIMEOUT_MS || 1_200_000)
const packCache = 'naamras-bani-downloads-v1'
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'naamras-offline-qa-'))
const candidates = [process.env.CHROME_EXECUTABLE,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', chromium.executablePath()]
const executablePath = candidates.find(candidate => candidate && fs.existsSync(candidate))
assert(executablePath, 'Install Chromium with npx playwright-core install chromium, or set CHROME_EXECUTABLE.')
assert(Number.isFinite(downloadTimeout) && downloadTimeout >= 30_000, 'Use a valid QA_DOWNLOAD_TIMEOUT_MS.')
assert(['https:', 'http:'].includes(new URL(base).protocol), 'QA_BASE_URL must be an HTTP(S) preview.')

const expectedLengths = {
  9: { id: 'chaupai-sahib', name: 'Chaupai Sahib', source: 'D', start: 1386, end: 1388, counts: { short: 104, medium: 130, long: 173 } },
  21: { id: 'rehras-sahib', name: 'Rehras Sahib', source: 'G', start: 8, end: 12, counts: { short: 306, medium: 337, long: 439, extralong: 521 } },
  22: { id: 'aarti', name: 'Aarti', source: 'G', start: 663, end: 663, counts: { short: 61, medium: 82, long: 230 } },
  23: { id: 'kirtan-sohila', name: 'Kirtan Sohila', source: 'G', start: 12, end: 13, counts: { short: 54, medium: 61, long: 86, extralong: 145 } },
}
const shabadosCounts = { ALHN: 135, ANN6: 41, MDVI: 169, RGMA: 231 }
const savedLengths = { 'chaupai-sahib': 'long', 'rehras-sahib': 'long', aarti: 'medium', 'kirtan-sohila': 'extralong' }
const results = { download: null, offline: [], visuals: [], http: [], errors: [] }
let context
let page
fs.mkdirSync(output, { recursive: true })

function routeFor(id, length) {
  const bani = expectedLengths[id]
  return `/study?${new URLSearchParams({ source: bani.source, ang: String(bani.start), startAng: String(bani.start),
    endAng: String(bani.end), bani: bani.name, baniDbId: String(id), exactBani: '1', baniId: bani.id, sgLength: length })}`
}

async function launch(offline) {
  context = await chromium.launchPersistentContext(profile, { executablePath, headless: true,
    viewport: { width: 390, height: 844 }, colorScheme: 'light', reducedMotion: 'reduce',
    timezoneId: 'America/Toronto', serviceWorkers: 'allow', offline })
  context.setDefaultTimeout(30_000)
  context.setDefaultNavigationTimeout(45_000)
  await context.addInitScript(origin => {
    if (location.origin === origin) sessionStorage.setItem('splash-shown', '1')
  }, new URL(base).origin)
  context.on('page', attachPage)
  // Keep the test from submitting mutations even if the app regresses. This
  // does not mock responses or intercept service-worker Cache API storage.
  await context.route('https://*.supabase.co/**', route => {
    const request = route.request()
    const url = new URL(request.url())
    if (['/rest/v1/', '/auth/v1/', '/storage/v1/'].some(prefix => url.pathname.startsWith(prefix))
      && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      results.errors.push(`Blocked unexpected ${request.method()} ${url.pathname}`)
      return route.abort('blockedbyclient')
    }
    return route.continue()
  })
  page = context.pages()[0] || await context.newPage()
  attachPage(page)
  return page
}

function attachPage(target) {
  if (target.__offlineQaAttached) return
  target.__offlineQaAttached = true
  target.on('pageerror', error => results.errors.push(error.message))
  target.on('response', response => {
    const url = new URL(response.url())
    if (url.pathname === '/rest/v1/scripture_reading_packs') {
      results.http.push({ status: response.status(), reading: url.searchParams.get('reading_key'),
        variant: url.searchParams.get('variant'), catalogue: !url.searchParams.has('reading_key') })
    }
  })
}

async function settle() {
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
}

async function openDownloads() {
  await page.goto(new URL('/banis?collection=banis', base).href, { waitUntil: 'domcontentloaded' })
  const panel = page.getByTestId('bani-downloads')
  await panel.waitFor({ state: 'visible' })
  if (!await panel.evaluate(element => element.open)) await panel.locator('summary').click()
  return panel
}

async function readPack(key) {
  return page.evaluate(async ({ cacheName, readingKey }) => {
    const cache = await caches.open(cacheName)
    const response = await cache.match(`https://naamras.local/__naamras-downloads/packs/${encodeURIComponent(readingKey)}`)
    if (!response) throw new Error(`Missing saved pack: ${readingKey}`)
    return (await response.json()).payload
  }, { cacheName: packCache, readingKey: key })
}

async function verifyDisplayed(reading, label) {
  const expected = reading.entries.flatMap(entry => (entry.lines || []).map((line, index) => ({
    anchor: `${entry.id}:${index}`, verse: String(line.verseId), header: Boolean(line.isHeader), text: line.gurmukhi,
  })))
  await page.locator('[data-testid="page-study"][data-ai-state="ready"]').waitFor()
  await page.waitForFunction(count => document.querySelectorAll('[data-testid="study-line"]').length === count, expected.length)
  const actual = await page.getByTestId('study-line').evaluateAll(elements => elements.map(element => ({
    anchor: element.getAttribute('data-reader-anchor'), verse: element.getAttribute('data-verse-id'),
    header: element.getAttribute('data-line-kind') === 'header',
    text: element.querySelector('[data-testid="study-gurbani-line"]')?.textContent || '',
  })))
  assert.deepEqual(actual.map(({ anchor, verse, header }) => ({ anchor, verse, header })),
    expected.map(({ anchor, verse, header }) => ({ anchor, verse, header })), `${label}: ordered anchors and headings match downloaded source`)
  const normalize = text => text.replace(/\s+/gu, ' ').trim()
  assert.deepEqual(actual.map(line => normalize(line.text)), expected.map(line => normalize(line.text)),
    `${label}: every rendered Gurmukhi row, including opening/ending, matches its saved source`)
  return expected
}

async function measure(name, selector) {
  await settle()
  const layout = await page.locator(selector).evaluate(root => {
    const rect = root.getBoundingClientRect()
    const controls = [...root.querySelectorAll('button,select,summary')].filter(element => {
      const style = getComputedStyle(element)
      return element.getClientRects().length && !element.closest('[hidden],[inert],[aria-hidden="true"]')
        && style.visibility !== 'hidden' && style.display !== 'none'
    }).map(element => {
      const box = element.getBoundingClientRect()
      return { name: element.getAttribute('aria-label') || element.textContent.trim().slice(0, 70),
        left: box.left, right: box.right, width: box.width, height: box.height }
    })
    return { viewport: innerWidth, documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      left: rect.left, right: rect.right, controls }
  })
  assert(layout.documentWidth <= layout.viewport + 2, `${name}: no horizontal document overflow`)
  assert(layout.left >= -2 && layout.right <= layout.viewport + 2, `${name}: surface fits viewport`)
  for (const control of layout.controls) {
    assert(control.height >= 43.9, `${name}: control height at least 44px: ${control.name}`)
    assert(control.left >= -2 && control.right <= layout.viewport + 2, `${name}: control fits horizontally: ${control.name}`)
  }
  results.visuals.push({ name, ...layout })
}

try {
  await launch(false)
  await context.addInitScript(lengths => {
    if (localStorage.getItem('qa-offline-bani-seeded')) return
    localStorage.setItem('qa-offline-bani-seeded', '1')
    localStorage.setItem('sikh-onboarding', JSON.stringify({ state: { hasCompletedOnboarding: true, isOnboardingOpen: false }, version: 0 }))
    localStorage.setItem('sikh-ui-locale', JSON.stringify({ state: { locale: 'en' }, version: 0 }))
    localStorage.setItem('sikh-theme', JSON.stringify({ state: { dark: false, mode: 'light' }, version: 0 }))
    localStorage.setItem('sikh-language', JSON.stringify({ state: { fontSize: 22, scriptMode: 'gurmukhi', larivaar: false,
      showVishraam: true, meaningLanguage: 'en', showTransliteration: false }, version: 0 }))
    localStorage.setItem('sikh-sundar-gutka-lengths', JSON.stringify({ state: { lengths }, version: 2 }))
    localStorage.setItem('naamras-reader-presentation', 'read')
    localStorage.setItem('naamras-reading-places', JSON.stringify({ state: { places: { 'source:G': {
      scriptureId: 'SGGS', resumePath: '/study?source=G&ang=77', updatedAt: '2026-11-15T00:00:00.000Z',
    } } }, version: 1 }))
  }, savedLengths)
  const panel = await openDownloads()
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="bani-downloads"] option').length === 108)
  const before = await page.evaluate(() => Object.fromEntries(['sikh-sundar-gutka-lengths', 'naamras-reading-places']
    .map(key => [key, localStorage.getItem(key)])))
  await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.ready).active && navigator.serviceWorker.controller))
  await panel.getByRole('button', { name: 'Download all available', exact: true }).click()
  await panel.getByRole('button', { name: 'Available banis downloaded', exact: true }).waitFor({ timeout: downloadTimeout })
  assert.equal(await panel.locator('.bani-downloads__saved > li').count(), 6, 'The catalogue keeps a bounded preview')
  await panel.getByRole('button', { name: 'Show all downloads (108)', exact: true }).click()
  assert.equal(await panel.locator('.bani-downloads__saved > li').count(), 108, 'All 108 readings are available in the expanded manager')
  const after = await page.evaluate(() => Object.fromEntries(['sikh-sundar-gutka-lengths', 'naamras-reading-places']
    .map(key => [key, localStorage.getItem(key)])))
  assert.deepEqual(after, before, 'Downloading the catalogue preserves default lengths and reading places byte-for-byte')
  const inventory = await page.evaluate(async cacheName => {
    const cache = await caches.open(cacheName)
    const records = []
    for (const request of await cache.keys()) {
      if (!new URL(request.url).pathname.startsWith('/__naamras-downloads/packs/')) continue
      const { payload, sha256 } = await (await cache.match(request)).json()
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)))
      const actual = [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('')
      if (actual !== sha256) throw new Error(`Corrupt pack ${payload.key}`)
      records.push({ key: payload.key, lengths: payload.availableLengths, counts: Object.fromEntries(Object.entries(payload.readings)
        .map(([length, reading]) => [length, reading.entries.reduce((sum, entry) => sum + (entry.lines?.length || 0), 0)])) })
    }
    return records.sort((a, b) => a.key.localeCompare(b.key))
  }, packCache)
  assert.equal(inventory.length, 108)
  for (const [id, expected] of Object.entries(expectedLengths)) {
    const pack = inventory.find(item => item.key === `banidb:${id}`)
    assert.deepEqual(pack?.counts, expected.counts, `All exact lengths and row counts downloaded for ${expected.name}`)
    assert.deepEqual(pack.lengths, Object.keys(expected.counts))
  }
  for (const [id, count] of Object.entries(shabadosCounts)) {
    assert.deepEqual(inventory.find(item => item.key === `shabados:${id}`)?.counts, { default: count })
  }
  results.download = { readings: inventory.length, storedVersions: inventory.reduce((sum, item) => sum + Object.keys(item.counts).length, 0),
    preservedPreferences: true, inventory }
  assert.equal(results.download.storedVersions, 118, 'Every distinct available version is stored')
  assert(results.http.some(request => request.catalogue && request.status === 200), 'Actual public HTTP catalogue request succeeds')
  // The hosted catalogue has 122 rows. Four default rows resolve to short,
  // so the download manager correctly reuses those rather than fetching them twice.
  assert.equal(results.http.filter(request => !request.catalogue && request.status === 200).length, 118,
    'All 118 distinct real hosted payload requests succeeded')
  await measure('downloads-390-light-online', '[data-testid="bani-downloads"]')
  await panel.scrollIntoViewIfNeeded()
  await page.screenshot({ path: path.join(output, 'downloads-390-light-online.png') })
  console.log('PASS real HTTP: 108 downloads / 118 distinct versions; source integrity and existing preferences preserved')

  // Close the entire browser, not merely reload a still-live page. Cache Storage
  // and the installed service worker must survive this persistent-profile restart.
  await context.close()
  context = null
  await launch(true)
  await page.goto(new URL(routeFor(21, 'long'), base).href, { waitUntil: 'domcontentloaded' })
  assert.equal(await page.evaluate(() => navigator.onLine), false, 'Browser restarted with networking disabled')
  await verifyDisplayed((await readPack('banidb:21')).readings.long, 'Rehras after cold offline restart')

  for (const [id, bani] of Object.entries(expectedLengths)) {
    const pack = await readPack(`banidb:${id}`)
    await page.goto(new URL(routeFor(id, Object.keys(bani.counts)[0]), base).href, { waitUntil: 'domcontentloaded' })
    for (const length of Object.keys(bani.counts)) {
      await page.getByTestId('study-reader-opening').getByTestId('bani-length-control').click()
      const sheet = page.getByTestId('bani-length-sheet')
      await sheet.locator(`input[type="radio"][value="${length}"]`).check()
      const remember = sheet.getByRole('checkbox', { name: 'Use for my Nitnem', exact: true })
      assert.equal(await remember.isChecked(), false)
      await sheet.locator('button[type="submit"]').click()
      await sheet.waitFor({ state: 'hidden' })
      await verifyDisplayed(pack.readings[length], `${bani.name} ${length} offline`)
      assert.equal(new URL(page.url()).searchParams.get('sgLength'), length)
      results.offline.push({ bani: bani.name, length, rows: bani.counts[length], orderedSourceMatch: true })
    }
  }
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('sikh-sundar-gutka-lengths')).state.lengths),
    savedLengths, 'Every offline length switch leaves the saved defaults unchanged')

  for (const [id, count] of Object.entries(shabadosCounts)) {
    await page.goto(new URL(`/study?shabadosBani=${id}&source=G`, base).href, { waitUntil: 'domcontentloaded' })
    await verifyDisplayed((await readPack(`shabados:${id}`)).readings.default, `${id} offline`)
    results.offline.push({ shabados: id, rows: count, orderedSourceMatch: true })
  }

  await page.goto(new URL('/study?shabadosBani=ALHN&source=G&bani=Alahnia', base).href, { waitUntil: 'domcontentloaded' })
  const alahnia = (await readPack('shabados:ALHN')).readings.default
  await verifyDisplayed(alahnia, 'Alahnia before saving')
  const target = alahnia.entries.flatMap(entry => entry.lines.map(line => ({ ...line, source: entry.source })))
    .filter(line => !line.isHeader && line.gurmukhi.trim().length > 20)[20]
  assert(target, 'Alahnia includes a body line away from the opening for a meaningful saved-position check')
  const targetLine = page.locator(`[data-testid="study-line"][data-verse-id="${target.verseId}"]`)
  await targetLine.scrollIntoViewIfNeeded()
  // This context uses a mouse; reveal the same hover affordance a pointer user sees.
  await targetLine.hover()
  await targetLine.getByRole('button', { name: /Open verse actions/ }).click()
  await page.getByRole('button', { name: 'Bookmark', exact: true }).click()
  await page.waitForFunction(verse => {
    const raw = JSON.parse(localStorage.getItem('sikh-bookmarks') || '[]')
    return (Array.isArray(raw) ? raw : raw.state?.bookmarks || []).some(item => item.verseId === verse)
  }, target.verseId)
  const bookmark = await page.evaluate(verse => {
    const raw = JSON.parse(localStorage.getItem('sikh-bookmarks') || '[]')
    return (Array.isArray(raw) ? raw : raw.state?.bookmarks || raw.items || []).find(item => item.verseId === verse)
  }, target.verseId)
  assert(bookmark?.returnPath?.includes('shabadosBani=ALHN'), 'Bookmark uses the source-scoped route')
  assert.equal(bookmark.shabadId, undefined, 'Local verse anchor must never be treated as a BaniDB shabad')
  await page.getByRole('button', { name: 'Contents', exact: true }).first().click()
  await page.getByRole('searchbox', { name: 'Find within this bani', exact: true }).fill(target.gurmukhi)
  const hit = page.locator('.bani-find__results button').first()
  await hit.waitFor({ state: 'visible' })
  await hit.click()
  await page.getByRole('button', { name: 'Continue here', exact: true }).click()
  await page.waitForFunction(verse => {
    const places = JSON.parse(localStorage.getItem('naamras-reading-places') || '{}').state?.places
    return places?.['shabados:ALHN']?.resumeVerseId === verse
  }, target.verseId)
  const savedPlace = await page.evaluate(() => JSON.parse(localStorage.getItem('naamras-reading-places')).state.places['shabados:ALHN'])
  const resumedPath = new URL(savedPlace.resumePath, base)
  resumedPath.searchParams.set('resumeVerseId', String(savedPlace.resumeVerseId))
  await page.close()
  page = await context.newPage()
  await page.goto(resumedPath.href, { waitUntil: 'domcontentloaded' })
  await verifyDisplayed(alahnia, 'Alahnia saved-place offline reopen')
  await page.waitForFunction(verse => {
    const element = document.querySelector(`[data-testid="study-line"][data-verse-id="${verse}"]`)
    if (!element) return false
    const rect = element.getBoundingClientRect()
    return rect.bottom > 0 && rect.top < innerHeight
  }, target.verseId)
  await page.goto(new URL('/saved', base).href, { waitUntil: 'domcontentloaded' })
  const savedLink = page.locator('a[href*="shabadosBani=ALHN"]')
  await savedLink.first().waitFor({ state: 'visible' })
  await savedLink.first().click()
  await verifyDisplayed(alahnia, 'Saved shelf reopening Shabad OS offline')
  results.offline.push({ bookmark: true, contentsFind: true, savedPlace: true, savedShelf: true, verse: target.verseId })

  for (const width of [390, 1440]) {
    for (const dark of [false, true]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 })
      await page.evaluate(value => localStorage.setItem('sikh-theme', JSON.stringify({ state: { dark: value, mode: value ? 'dark' : 'light' }, version: 0 })), dark)
      const key = `${width}-${dark ? 'dark' : 'light'}`
      const downloads = await openDownloads()
      await downloads.getByText('108 downloaded', { exact: true }).waitFor()
      await measure(`downloads-${key}-offline`, '[data-testid="bani-downloads"]')
      await downloads.scrollIntoViewIfNeeded()
      await page.screenshot({ path: path.join(output, `downloads-${key}-offline.png`) })
      await page.goto(new URL(routeFor(21, 'long'), base).href, { waitUntil: 'domcontentloaded' })
      await verifyDisplayed((await readPack('banidb:21')).readings.long, `Rehras visual ${key}`)
      await measure(`reader-${key}`, '[data-testid="study-reader-topbar"]')
      await page.screenshot({ path: path.join(output, `reader-${key}-offline.png`) })
      await page.getByTestId('study-reader-opening').getByTestId('bani-length-control').click()
      await page.getByTestId('bani-length-sheet').waitFor({ state: 'visible' })
      await measure(`length-sheet-${key}`, '[data-testid="bani-length-sheet"]')
      await page.screenshot({ path: path.join(output, `length-${key}-offline.png`) })
      await page.getByRole('button', { name: 'Close bani length', exact: true }).click()
    }
  }
  assert.deepEqual(results.errors, [], 'No unhandled page errors or attempted backend writes')
  results.passed = true
  console.log('PASS cold offline restart, all 14 named length switches, four Shabad OS readings, bookmark/contents/resume, and mobile/desktop light/dark layouts')
} catch (error) {
  results.passed = false
  results.failure = error instanceof Error ? error.message : String(error)
  if (page && !page.isClosed()) await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {})
  throw error
} finally {
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(results, null, 2))
  if (context) await context.close()
  fs.rmSync(profile, { recursive: true, force: true })
}
