import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, realpath, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { extname, resolve, sep } from 'node:path'
import { createFreshEvidenceDirectory, parseBrowserFlags } from './qa-utils.mjs'

// This suite deliberately has only three path arguments and one known browser.
const args = process.argv.slice(2)
for (let index = 0; index < args.length; index += 2) {
  if (!['--runtime', '--app', '--out'].includes(args[index])) {
    throw new Error(`Unknown stress-check flag: ${args[index]}`)
  }
}
const flags = parseBrowserFlags(args)
const runtime = await realpath(flags.runtime)
const app = await realpath(flags.app)
await readFile(resolve(runtime, 'package.json'))
await readFile(resolve(app, 'index.html'))
const output = await createFreshEvidenceDirectory(flags.out, [runtime, app])
const executablePath = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
const purpose = 'repeated-verified-lines-layout-stress-not-a-real-reading'
const limits = { width: 1080, minimumHeight: 1350, maximumHeight: 8192, gurmukhiFontFloor: 42, supportFontFloor: 32 }
const report = {
  purpose,
  engine: 'chromium',
  generatedAt: new Date().toISOString(),
  status: 'running',
  expectedCounts: { exports: 45, oversizedRejections: 1 },
  limits,
  pngRetention: 'none',
  exports: [],
  oversizedRejections: [],
  errors: [],
}
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' }
const insideApp = file => file.startsWith(app + sep)
const server = createServer(async (request, response) => {
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405).end()
      return
    }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    const candidate = resolve(app, `.${pathname === '/' ? '/index.html' : pathname}`)
    // Check both lexical and resolved paths; symlinked files cannot escape app.
    if (!insideApp(candidate)) { response.writeHead(403).end(); return }
    const file = await realpath(candidate)
    if (!insideApp(file)) { response.writeHead(403).end(); return }
    const bytes = await readFile(file)
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' })
    response.end(request.method === 'HEAD' ? undefined : bytes)
  } catch { response.writeHead(404).end() }
})

let browser
try {
  const fromRuntime = createRequire(resolve(runtime, 'package.json'))
  const playwright = await import(fromRuntime.resolve('playwright-core'))
  const { chromium } = playwright.default ?? playwright
  await new Promise((done, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', done)
  })
  const origin = `http://127.0.0.1:${server.address().port}`
  browser = await chromium.launch({ headless: true, executablePath })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.origin === origin) return route.continue()
    report.errors.push(`Blocked external request: ${url.href}`)
    return route.abort()
  })
  const page = await context.newPage()
  page.on('pageerror', error => report.errors.push(error.message))
  await page.goto(origin, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Boolean(window.hukamnamaQA))
  const { ids, sourceLines } = await page.evaluate(() => ({
    ids: window.hukamnamaQA.assetIds,
    sourceLines: window.hukamnamaQA.fixture('long').passageLines,
  }))
  assert.equal(ids.length, 14)
  assert.equal(new Set(ids).size, 14)
  assert.equal(sourceLines.length, 13)
  assert.deepEqual(sourceLines.map(line => line.id), Array.from({ length: 13 }, (_, index) => `ang-683-${index + 1}`))
  assert.ok(sourceLines.every(line => line.gurmukhi.trim() && line.meaning?.trim()))
  report.artworkIds = [null, ...ids]
  report.fixture = { source: 'Exact 13 verified Ang 683 fixture lines repeated with unique test IDs', realReading: false }

  const repeatLines = (count, withMeaning) => Array.from({ length: count }, (_, index) => ({
    ...sourceLines[index % sourceLines.length],
    id: `stress-${count}-${withMeaning ? 'meaning' : 'gurmukhi'}-${index + 1}`,
    meaning: withMeaning ? sourceLines[index % sourceLines.length].meaning : null,
    transliteration: null,
  }))

  for (const [count, withMeaning] of [[30, true], [40, true], [40, false]]) {
    const lines = repeatLines(count, withMeaning)
    for (const artworkId of [null, ...ids]) {
      const started = Date.now()
      const result = await page.evaluate(async ({ artworkId, lines }) => {
        const result = await window.hukamnamaQA.renderCase({ kind: 'long', artworkId, lines })
        const image = new Image()
        image.src = 'data:image/png;base64,' + result.base64
        await image.decode()
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Text measurement context unavailable')
        let maximumWidthOverflow = 0
        for (const section of result.layout.sections) {
          const style = section.style
          context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`
          for (const line of section.lines) {
            maximumWidthOverflow = Math.max(maximumWidthOverflow, context.measureText(line).width - section.width)
          }
        }
        return { ...result, decodedWidth: image.naturalWidth, decodedHeight: image.naturalHeight, maximumWidthOverflow }
      }, { artworkId, lines })
      const png = Buffer.from(result.base64, 'base64')
      assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      assert.equal(result.pageCount, 1)
      assert.equal(result.mime, 'image/png')
      assert.equal(result.width, limits.width)
      assert.equal(png.readUInt32BE(16), limits.width)
      assert.equal(png.readUInt32BE(20), result.height)
      assert.equal(result.decodedWidth, result.width)
      assert.equal(result.decodedHeight, result.height)
      assert.equal(png.length, result.bytes)
      assert.ok(result.height > 1920 && result.height <= limits.maximumHeight)
      assert.equal(result.layout.width, result.width)
      assert.equal(result.layout.height, result.height)
      assert.deepEqual(result.orderedIds, lines.map(line => line.id))
      assert.deepEqual(result.layout.sourceLineIds, lines.map(line => line.id))
      assert.equal(result.layout.selection.mode, 'complete')
      assert.equal(result.layout.selection.includedLineCount, count)
      assert.equal(result.layout.selection.totalLineCount, count)
      assert.equal(result.layout.fit.atReadabilityFloor, true)
      assert.ok(result.layout.fit.fontSizes.gurmukhi >= limits.gurmukhiFontFloor)
      assert.deepEqual(result.layout.fit.supportRoles, withMeaning ? ['meaning'] : [])
      if (withMeaning) assert.ok(result.layout.fit.fontSizes.meaning >= limits.supportFontFloor)
      const normalize = value => value.replace(/\s+/gu, ' ').trim()
      const body = result.layout.body
      assert.ok(body.x >= 0 && body.y >= 0 && body.x + body.width <= result.width && body.y + body.height <= result.height)
      assert.ok(result.maximumWidthOverflow <= 1, 'Actual text width exceeds its reading column')
      for (const [index, line] of lines.entries()) {
        const sections = result.layout.sections.filter(section => section.sourceLineId === line.id)
        assert.deepEqual(sections.map(section => section.role), withMeaning ? ['gurmukhi', 'meaning'] : ['gurmukhi'])
        for (const section of sections) {
          assert.equal(normalize(section.lines.join(' ')), normalize(line[section.role]))
          assert.ok(section.x >= body.x && section.y >= body.y)
          assert.ok(section.x + section.width <= body.x + body.width + 1)
          assert.ok(section.y + section.height <= body.y + body.height + 1)
          if (section.role !== 'gurmukhi') assert.ok(section.style.fontSize >= limits.supportFontFloor)
          else if (!line.isHeader) assert.ok(section.style.fontSize >= limits.gurmukhiFontFloor)
        }
        assert.equal(result.layout.sourceLineIds[index], line.id)
      }
      report.exports.push({
        count, support: withMeaning ? 'verified-English-meaning' : 'Gurmukhi-only', artworkId,
        width: result.width, height: result.height, bytes: result.bytes,
        orderedIds: result.orderedIds, fontSizes: result.layout.fit.fontSizes,
        maximumWidthOverflow: result.maximumWidthOverflow, decoded: true,
        milliseconds: Date.now() - started,
      })
      console.log(`chromium stress: ${count}-${withMeaning ? 'meaning' : 'gurmukhi'}-${artworkId || 'none'} passed`)
    }
  }

  const oversized = await page.evaluate(async lines => {
    const original = HTMLCanvasElement.prototype.toBlob
    let encodeCalls = 0
    HTMLCanvasElement.prototype.toBlob = function (...args) {
      encodeCalls += 1
      return original.apply(this, args)
    }
    try {
      const result = await window.hukamnamaQA.renderCase({ kind: 'long', artworkId: 'interior-audience', lines })
      return { rejected: false, outputProduced: Boolean(result.base64), encodeCalls }
    } catch (error) {
      return {
        rejected: true, outputProduced: false, encodeCalls,
        error: { name: error.name, code: error.code, message: error.message, requiredHeight: error.requiredHeight, maximumHeight: error.maximumHeight },
      }
    } finally {
      HTMLCanvasElement.prototype.toBlob = original
    }
  }, repeatLines(300, true))
  assert.equal(oversized.rejected, true)
  assert.equal(oversized.outputProduced, false)
  assert.equal(oversized.encodeCalls, 0)
  assert.equal(oversized.error.name, 'HukamnamaImageTooLongError')
  assert.equal(oversized.error.code, 'hukamnama-image-too-long')
  assert.equal(oversized.error.maximumHeight, limits.maximumHeight)
  assert.ok(oversized.error.requiredHeight > limits.maximumHeight)
  report.oversizedRejections.push({ count: 300, ...oversized })
  assert.equal(report.exports.length, report.expectedCounts.exports)
  assert.equal(report.oversizedRejections.length, report.expectedCounts.oversizedRejections)
  assert.deepEqual(report.errors, [])
  report.counts = { exports: report.exports.length, oversizedRejections: report.oversizedRejections.length }
  report.status = 'passed'
  console.log('chromium stress: 45 complete encoded/decoded exports and 1 safe oversized rejection passed')
} catch (error) {
  report.status = 'failed'
  report.failure = { name: error.name, message: error.message, code: error.code }
  process.exitCode = 1
} finally {
  report.completedAt = new Date().toISOString()
  report.counts ??= { exports: report.exports.length, oversizedRejections: report.oversizedRejections.length }
  try {
    await writeFile(resolve(output, 'stress-report.json'), JSON.stringify(report, null, 2))
  } finally {
    await browser?.close()
    if (server.listening) await new Promise(done => server.close(done))
  }
}
