import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, writeFile, realpath } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { extname, resolve, sep } from 'node:path'
import { browserCoverage, createFreshEvidenceDirectory, parseBrowserFlags } from './qa-utils.mjs'

const flags = parseBrowserFlags(process.argv.slice(2))
const coverage = browserCoverage(flags)
const app = await realpath(flags.app)
const fromRuntime = createRequire(resolve(flags.runtime, 'package.json'))
const playwright = await import(fromRuntime.resolve('playwright-core'))
const { chromium, webkit } = playwright.default ?? playwright
const engine = flags.engine
const output = await createFreshEvidenceDirectory(flags.out, [app])
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png' }
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    const file = resolve(app, `.${pathname === '/' ? '/index.html' : pathname}`)
    if (!file.startsWith(app + sep)) { response.writeHead(403).end(); return }
    const bytes = await readFile(file)
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }).end(bytes)
  } catch { response.writeHead(404).end() }
})
await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done) })
let browser
const report = {
  engine,
  suite: coverage.suite,
  expectedCounts: { exports: coverage.exports, typography: coverage.typography, composer: coverage.composer },
  generatedAt: new Date().toISOString(),
  status: 'running', exports: [], typography: [], composer: [],
}
try {
  browser = engine === 'webkit'
    ? await webkit.launch({ headless: true })
    : await chromium.launch({ headless: true, executablePath: flags.executable || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Boolean(window.hukamnamaQA))
  const ids = await page.evaluate(() => window.hukamnamaQA.assetIds)
  assert.equal(ids.length, 14)
  const persist = async (result, name) => {
    const { base64, layout, ...metadata } = result
    assert.equal(result.pageCount, 1)
    assert.equal(result.mime, 'image/png')
    const png = Buffer.from(base64, 'base64')
    assert.equal(png.readUInt32BE(16), 1080)
    assert.equal(png.readUInt32BE(20), result.height)
    assert.ok(result.height >= 1350 && result.height <= 8192)
    await page.evaluate(async base64 => {
      const image = new Image()
      image.src = 'data:image/png;base64,' + base64
      await image.decode()
      if (image.naturalWidth !== 1080 || !image.naturalHeight) throw new Error('PNG decode failed')
    }, base64)
    if (flags.keep === 'all' || name.endsWith('interior-audience') || name.startsWith('typography-')) {
      await writeFile(resolve(output, name + '.png'), png)
    }
    return metadata
  }
  for (const [kind, count] of [['short', 3], ['medium', 7], ['long', 13]]) {
    for (const artworkId of flags['ui-only'] ? [] : [null, ...ids]) {
      const result = await page.evaluate(options => window.hukamnamaQA.renderCase(options), { kind, artworkId })
      assert.deepEqual(result.orderedIds, Array.from({ length: count }, (_, index) => `ang-683-${index + 1}`))
      assert.equal(result.layout.sections.some(section => section.role === 'meaning'), kind !== 'short')
      report.exports.push(await persist(result, `${kind}-${artworkId || 'none'}`))
    }
    const broadUi = flags['ui-only'] || flags['ui-all']
    const locales = broadUi ? ['en', 'pa', 'hi'] : ['en']
    const modes = broadUi ? [
      { id: 'desktop-light', width: 1440, height: 1000 },
      { id: 'phone-light', width: 390, height: 844 },
      { id: 'phone-dark', width: 390, height: 844, dark: true },
      { id: 'reflow-200', width: 320, height: 568, scale: 2 },
    ] : [{ id: 'phone-light', width: 390, height: 844 }]
    for (const locale of locales) for (const mode of modes) {
    await page.setViewportSize({ width: mode.width, height: mode.height })
    await page.emulateMedia({ colorScheme: mode.dark ? 'dark' : 'light' })
    await page.evaluate(mode => {
      document.documentElement.classList.toggle('dark', Boolean(mode.dark))
      document.documentElement.dataset.theme = mode.dark ? 'dark' : 'light'
      document.documentElement.style.fontSize = mode.scale === 2 ? '200%' : ''
    }, mode)
    if (broadUi) {
      await page.getByLabel('Interface language').selectOption(locale)
      await page.evaluate(locale => { document.documentElement.lang = locale }, locale)
    }
    await page.getByRole('button', { name: kind === 'long' ? 'Long complete' : `${kind[0].toUpperCase() + kind.slice(1)} excerpt`, exact: true }).click()
    const opener = page.getByRole('button', { name: 'Open share composer', exact: true })
    await opener.click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor({ state: 'visible' })
    const shareLabel = { en: 'Share image', pa: 'ਤਸਵੀਰ ਸਾਂਝੀ ਕਰੋ', hi: 'छवि साझा करें' }[locale]
    const share = dialog.getByRole('button', { name: shareLabel, exact: true })
    await page.waitForFunction(element => !element.disabled, await share.elementHandle())
    assert.equal(await dialog.getByRole('radio').count(), 15)
    assert.equal(await dialog.getByRole('radio', { checked: true }).inputValue(), 'interior-audience')
    await page.addScriptTag({ path: fromRuntime.resolve('axe-core/axe.min.js') })
    const violations = await page.evaluate(async () => (await window.axe.run(document.querySelector('[role="dialog"]'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
    })).violations.map(item => item.id))
    assert.deepEqual(violations, [])
    const metrics = await dialog.evaluate(element => ({ width: element.getBoundingClientRect().width, viewport: innerWidth, scroll: element.scrollWidth, client: element.clientWidth }))
    assert.ok(metrics.width <= metrics.viewport && metrics.scroll <= metrics.client + 1)
    if (locale === 'en' && mode.id === 'phone-light') {
      await page.screenshot({ path: resolve(output, `composer-${kind}.png`), fullPage: true })
    }
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    await page.waitForFunction(element => document.activeElement === element, await opener.elementHandle())
    report.composer.push({ kind, locale, mode: mode.id, violations, metrics })
    console.log(`${engine}: ${kind}-${locale}-${mode.id} composer passed`)
    }
  }
  for (const script of flags['ui-only'] ? [] : ['pa', 'hi']) {
    const result = await page.evaluate(options => window.hukamnamaQA.renderTypographySample(options), { script })
    assert.equal(result.purpose, 'typography-test-not-scripture')
    assert.equal(result.fontLoaded, true)
    report.typography.push(await persist(result, `typography-${script}-not-scripture`))
  }
  assert.deepEqual(errors, [])
  assert.equal(report.exports.length, coverage.exports, 'Export suite coverage is incomplete')
  assert.equal(report.typography.length, coverage.typography, 'Bundled-font suite coverage is incomplete')
  assert.equal(report.composer.length, coverage.composer, 'Composer suite coverage is incomplete')
  report.errors = errors
  report.status = 'passed'
  console.log(`${engine}: ${report.exports.length} complete exports, ${report.composer.length} composer journeys, ${report.typography.length} bundled font samples passed`)
} catch (error) {
  report.status = 'failed'
  report.failure = error.message
  throw error
} finally {
  await writeFile(resolve(output, 'browser-report.json'), JSON.stringify(report, null, 2))
  await browser?.close()
  await new Promise(done => server.close(done))
}
