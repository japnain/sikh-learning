#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { installDeterministicFixtures, resolveBrowserExecutable } from './browser-fixtures.mjs'

// Uses controlled provider fixtures and an isolated browser. It never changes a real user's account.
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4195'
const output = path.resolve(process.env.QA_OUTPUT_DIR || 'tmp/reader-nitnem-polish')
const readerPath = '/study?source=G&ang=1&startAng=1&endAng=8&bani=Japji+Sahib&baniDbId=2&exactBani=1&baniId=japji-sahib'
const matrix = [
  { width: 320, height: 568, dark: false, scale: 1 },
  { width: 390, height: 844, dark: true, scale: 1 },
  { width: 320, height: 568, dark: true, scale: 2 },
  { width: 1440, height: 1000, dark: false, scale: 1 },
]
const results = []
let lastPage
fs.mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ executablePath: resolveBrowserExecutable(), headless: true })
const settle = page => page.evaluate(async () => {
  await Promise.race([document.fonts.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Fonts did not settle within 10 seconds')), 10000))])
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
})

function inspectReader() {
  const header = document.querySelector('[data-reader-header="persistent"]')
  const rect = header.getBoundingClientRect()
  const style = getComputedStyle(header)
  const title = header.querySelector('.reader-header__title')
  return {
    position: style.position, top: rect.top, bottom: rect.bottom, opacity: style.opacity,
    visible: style.visibility !== 'hidden' && style.display !== 'none',
    width: innerWidth, documentWidth: document.documentElement.scrollWidth,
    bottomDock: Boolean(document.querySelector('.reader-dock,.reader-controls-reveal')),
    headerControls: [...header.querySelectorAll('button,a')].filter(el => el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== 'hidden').map(el => {
      const r = el.getBoundingClientRect()
      return { label: el.getAttribute('aria-label') || el.textContent, x: r.x, right: r.right, y: r.y, bottom: r.bottom, width: r.width, height: r.height }
    }),
    scrollY,
    titleFont: title ? getComputedStyle(title).fontFamily : null,
    titleSize: title ? parseFloat(getComputedStyle(title).fontSize) : null,
  }
}

function assertReader(measurement, name) {
  assert(measurement.visible && Number(measurement.opacity) > .95, `${name}: header stays visible`)
  assert(['sticky', 'fixed'].includes(measurement.position), `${name}: header remains at the top`)
  assert(measurement.top >= -1 && measurement.top < 80, `${name}: header remains in viewport`)
  assert(!measurement.bottomDock, `${name}: no disappearing bottom dock/reveal control`)
  assert(measurement.titleFont?.includes('Plus Jakarta Sans'), `${name}: shared sans-serif English reader heading`)
  assert(measurement.documentWidth <= measurement.width + 2, `${name}: no document horizontal overflow`)
  for (const c of measurement.headerControls) {
    assert(c.x >= -2 && c.right <= measurement.width + 2, `${name}: header control ${c.label} fits horizontally`)
    assert(c.width >= 43.9 && c.height >= 43.9, `${name}: header control ${c.label} retains 44px target (${c.width}×${c.height})`)
  }
}

async function prepare(config, fixtureOptions = {}) {
  const context = await browser.newContext({ viewport: config, colorScheme: config.dark ? 'dark' : 'light',
    reducedMotion: 'reduce', timezoneId: 'America/Toronto', serviceWorkers: 'block' })
  const fixture = await installDeterministicFixtures(context, base, fixtureOptions)
  await context.addInitScript(({ dark }) => {
    sessionStorage.setItem('splash-shown', '1')
    localStorage.setItem('sikh-onboarding', JSON.stringify({ state: { hasCompletedOnboarding: true, isOnboardingOpen: false }, version: 0 }))
    localStorage.setItem('sikh-ui-locale', JSON.stringify({ state: { locale: 'en' }, version: 0 }))
    localStorage.setItem('sikh-theme', JSON.stringify({ state: { dark, mode: dark ? 'dark' : 'light' }, version: 0 }))
    localStorage.setItem('sikh-language', JSON.stringify({ state: { fontSize: 22, meaningLanguage: 'en', showTransliteration: false }, version: 0 }))
    localStorage.setItem('naamras-reader-presentation', 'read')
  }, config)
  const page = await context.newPage()
  lastPage = page
  page.setDefaultTimeout(15000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  return { context, page, fixture, errors }
}

async function visit(page, target, scale) {
  await page.goto(new URL(target, base).href, { waitUntil: 'domcontentloaded' })
  await page.addStyleTag({ content: `html { font-size:${100 * scale}% !important;scroll-behavior:auto!important }` })
  await settle(page)
}

function visibleScriptureAnchor() {
  const lines = [...document.querySelectorAll('[data-reader-anchor]')]
    .filter(line => line.dataset.lineKind !== 'header' && line.dataset.readerStructural !== 'true')
  const header = document.querySelector('[data-reader-header="persistent"]')
  const top = Math.max(header.getBoundingClientRect().bottom + parseFloat(getComputedStyle(document.documentElement).fontSize),
    parseFloat(getComputedStyle(lines[0]).scrollMarginTop) || 0)
  return lines.find(line => line.getBoundingClientRect().bottom > top + 1 && line.getBoundingClientRect().top < innerHeight)?.dataset.readerAnchor
}

try {
  for (const config of process.env.QA_CASES === 'features' ? [] : matrix) {
    const { context, page, fixture, errors } = await prepare(config)
    const key = `${config.width}-${config.dark ? 'dark' : 'light'}-${config.scale * 100}`
    for (const [kind, target, ready, content, appearance] of [
      ['bani', readerPath, '[data-page="study"][data-ai-state="ready"]', '#study-reading-content', '[data-ai-action="open-reader-settings"]'],
      ['story', '/stories/bhai-lalo', '.story-reader-content', '.story-reader-content', '.story-appearance-trigger'],
      ['book', '/library/panth-prakash-english/chapters/episode-001', '[data-testid="panth-chapter-text"]', '[data-testid="panth-chapter-text"]', '[aria-label="Reading appearance"]'],
    ]) {
      console.log(`START ${kind}-${key}`)
      await visit(page, target, config.scale)
      await page.locator(ready).waitFor()
      await settle(page)
      const initial = await page.evaluate(inspectReader)
      assertReader(initial, `${kind}-${key}-top`)
      await page.evaluate(() => window.scrollTo({ top: Math.min(1500, document.documentElement.scrollHeight - innerHeight - 100), behavior: 'instant' }))
      await settle(page)
      await page.locator(content).dispatchEvent('click')
      await settle(page)
      const scrolled = await page.evaluate(inspectReader)
      assertReader(scrolled, `${kind}-${key}-scrolled-and-tapped`)
      if (kind === 'bani') {
        const header = page.locator('[data-reader-header="persistent"]')
        await header.getByRole('radio', { name: 'Study', exact: true }).check()
        assert.equal(await page.locator('[data-page="study"]').getAttribute('data-reader-presentation'), 'study')
        await header.getByRole('radio', { name: 'Read', exact: true }).check()
        assert.equal(await page.locator('[data-page="study"]').getAttribute('data-reader-presentation'), 'read')
      }
      await page.locator(appearance).click()
      await page.getByRole('dialog').waitFor()
      await page.keyboard.press('Escape')
      await page.getByRole('dialog').waitFor({ state: 'hidden' })
      await settle(page)
      assertReader(await page.evaluate(inspectReader), `${kind}-${key}-after-appearance`)
      await page.screenshot({ path: path.join(output, `${kind}-${key}.png`) })
      results.push({ kind, config, initial, scrolled, checks: ['persistent header after deep scroll and content tap', 'no bottom dock', '44px header targets', 'appearance opens and closes from header', ...(kind === 'bani' ? ['Read/Study selected in persistent header'] : [])] })
      console.log(`PASS ${kind}-${key}`)
    }
    console.log(`START nitnem-${key}`)
    await visit(page, '/', config.scale)
    const active = page.getByTestId('home-nitnem-active-reading')
    await active.waitFor()
    console.log(`STEP nitnem-${key}: ready`)
    await page.locator('.home-daily-rail').scrollIntoViewIfNeeded()
    const firstId = await active.getAttribute('data-nitnem-id')
    await page.getByRole('button', { name: 'Next bani', exact: true }).click()
    await page.waitForFunction(first => document.querySelector('[data-testid="home-nitnem-active-reading"]')?.getAttribute('data-nitnem-id') !== first, firstId)
    console.log(`STEP nitnem-${key}: next`)
    await page.getByRole('button', { name: 'Previous bani', exact: true }).click()
    await page.waitForFunction(first => document.querySelector('[data-testid="home-nitnem-active-reading"]')?.getAttribute('data-nitnem-id') === first, firstId)
    console.log(`STEP nitnem-${key}: previous`)
    const rail = page.locator('.home-daily-rail')
    await rail.focus()
    await page.keyboard.press('End')
    await page.waitForFunction(() => document.querySelector('[data-testid="home-nitnem-active-reading"]')?.getAttribute('data-nitnem-index') === '6')
    await page.keyboard.press('Home')
    await page.waitForFunction(() => document.querySelector('[data-testid="home-nitnem-active-reading"]')?.getAttribute('data-nitnem-index') === '0')
    console.log(`STEP nitnem-${key}: keyboard`)
    await active.getByRole('button', { name: /^Mark complete:/ }).click()
    await active.getByRole('button', { name: /^Undo completion:/ }).waitFor()
    assert.equal(await active.getAttribute('data-nitnem-id'), firstId, 'Completion preserves browsed card')
    await active.getByRole('button', { name: /^Undo completion:/ }).click()
    await active.getByRole('button', { name: /^Mark complete:/ }).waitFor()
    console.log(`STEP nitnem-${key}: undo`)
    await page.getByRole('button', { name: 'All 7 banis', exact: true }).click()
    const sheet = page.getByTestId('home-nitnem-all')
    await sheet.waitFor()
    assert.equal(await sheet.locator('li[data-nitnem-id]').count(), 7)
    await sheet.getByRole('button', { name: 'Close your banis' }).click()
    await sheet.waitFor({ state: 'hidden' })
    const layout = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth }))
    assert(layout.documentWidth <= layout.width + 2, `${key}: Home horizontal overflow`)
    await page.locator('.home-daily').scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(output, `nitnem-${key}.png`) })
    results.push({ kind: 'nitnem', config, checks: ['next/previous arrows', 'End/Home keyboard navigation', 'completion/undo preserve browsed card', 'seven-row all-banis sheet opens/closes', 'no document horizontal overflow'] })
    console.log(`PASS nitnem-${key}`)
    assert.deepEqual(errors, [], `${key}: no unhandled page exceptions`)
    fixture.assertNoUnexpectedRequests()
    await context.close()
  }
  // Follow the adjustable-bani flow end-to-end, then edit the saved routine.
  {
    console.log('START nitnem-length-customization')
    const config = { width: 390, height: 844, dark: false, scale: 1 }
    const { context, page, fixture, errors } = await prepare(config, { distinctBaniLengths: true })
    await visit(page, '/', 1)
    await page.getByTestId('home-nitnem-carousel').waitFor()
    const rail = page.locator('.home-daily-rail')
    await rail.focus()
    await page.keyboard.press('End')
    await page.waitForFunction(() => document.querySelector('[data-testid="home-nitnem-active-reading"]')?.getAttribute('data-nitnem-id') === 'kirtan-sohila')
    await page.keyboard.press('ArrowLeft')
    await page.waitForFunction(() => document.querySelector('[data-testid="home-nitnem-active-reading"]')?.getAttribute('data-nitnem-id') === 'rehras-sahib')
    await page.getByTestId('home-nitnem-active-reading').getByTestId('bani-length-control').click()
    const lengths = page.getByTestId('bani-length-sheet')
    await lengths.waitFor()
    await lengths.locator('input[type="radio"][value="medium"]').check()
    await lengths.locator('button[type="submit"]').click()
    await page.waitForURL(url => url.pathname === '/study' && url.searchParams.get('sgLength') === 'medium')
    await page.locator('[data-page="study"][data-ai-state="ready"]').waitFor()
    await page.locator('[data-reader-header="persistent"] [data-reader-back]').click()
    await page.waitForURL(url => url.pathname === '/')
    await page.waitForFunction(() => document.querySelector('[data-testid="home-nitnem-active-reading"]')?.getAttribute('data-nitnem-id') === 'rehras-sahib')
    assert.match(await page.getByTestId('home-nitnem-active-reading').getByRole('link', { name: /reading: Rehras Sahib/ }).getAttribute('href'), /sgLength=medium/)
    await page.getByTestId('home-nitnem-manage').click()
    await page.getByTestId('nitnem-ritual-order').waitFor()
    await page.getByLabel('Edit Japji Sahib', { exact: true }).click()
    await page.getByRole('button', { name: 'Move Japji Sahib down', exact: true }).click()
    assert.match(await page.getByTestId('nitnem-ritual-item').first().innerText(), /Jaap Sahib/)
    await page.getByRole('button', { name: 'Save routine', exact: true }).click()
    await page.waitForURL(url => url.pathname === '/')
    assert.equal(await page.locator('[data-nitnem-card]').first().getAttribute('data-nitnem-id'), 'jaap-sahib')
    await page.getByTestId('home-nitnem-manage').click()
    await page.getByRole('switch').click()
    await page.getByRole('button', { name: 'Save routine', exact: true }).click()
    await page.waitForURL(url => url.pathname === '/')
    await page.getByTestId('home-nitnem-carousel').waitFor()
    assert.equal(await page.locator('.home-daily-complete').count(), 0, 'Tracking off removes completion actions without removing reading')
    assert.equal(await page.locator('[data-nitnem-card]').count(), 7)
    await page.screenshot({ path: path.join(output, 'nitnem-tracking-off.png') })
    fixture.assertNoUnexpectedRequests()
    assert.deepEqual(errors, [])
    results.push({ kind: 'nitnem-length-customization', checks: ['medium Rehras preview/application opens exact reader', 'Back returns to correct browsed card and current length', 'custom reorder persists into carousel', 'tracking can be disabled while all readings remain available'] })
    await context.close()
    console.log('PASS nitnem-length-customization')
  }
  {
    console.log('START deep-scripture-anchor')
    const config = { width: 390, height: 844, dark: false, scale: 1 }
    const { context, page, fixture, errors } = await prepare(config, { longHukamnama: true })
    await visit(page, '/study?hukamnamaDate=2026-04-05', 1)
    await page.locator('[data-page="study"][data-ai-state="ready"]').waitFor()
    await settle(page)
    await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }))
    await settle(page)
    const deepScroll = await page.evaluate(() => ({ scrollY, maximum: document.documentElement.scrollHeight - innerHeight }))
    assert(deepScroll.scrollY >= Math.min(1499, deepScroll.maximum - 1) && deepScroll.scrollY >= 500,
      `Long scripture fixture actually scrolls deeply: ${JSON.stringify(deepScroll)}`)
    await page.locator('#study-reading-content').dispatchEvent('click')
    assertReader(await page.evaluate(inspectReader), 'deep-scripture-tap')
    const anchor = await page.evaluate(visibleScriptureAnchor)
    assert(anchor, 'A scripture line is visible below the persistent header')
    const header = page.locator('[data-reader-header="persistent"]')
    await header.getByRole('radio', { name: 'Study', exact: true }).check()
    await settle(page)
    assert.equal(await page.evaluate(visibleScriptureAnchor), anchor, 'Read → Study preserves the visible scripture line')
    await header.locator('[data-ai-action="open-reader-settings"]').click()
    await page.getByRole('dialog').waitFor()
    await page.getByRole('slider').fill('30')
    await page.keyboard.press('Escape')
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    await settle(page)
    assert.equal(await page.evaluate(visibleScriptureAnchor), anchor, 'Appearance reflow preserves the visible scripture line')
    await header.getByRole('radio', { name: 'Read', exact: true }).check()
    await settle(page)
    assert.equal(await page.evaluate(visibleScriptureAnchor), anchor, 'Study → Read preserves the visible scripture line')
    await header.locator('.study-reader-section-trigger').click()
    await page.getByTestId('study-reader-sections-sheet').waitFor()
    await page.keyboard.press('Escape')
    await page.getByTestId('study-reader-sections-sheet').waitFor({ state: 'hidden' })
    await settle(page)
    assert.equal(await page.evaluate(visibleScriptureAnchor), anchor, 'Opening and closing Contents preserves the reading position')
    await page.screenshot({ path: path.join(output, 'deep-scripture-anchor.png') })
    fixture.assertNoUnexpectedRequests()
    assert.deepEqual(errors, [])
    results.push({ kind: 'deep-scripture-anchor', anchor, deepScroll, checks: ['deep scripture scroll and content tap keep header visible', 'Read/Study preserve the visible scripture line in both directions', 'font size reflow preserves the visible scripture line', 'Contents remains reachable and closing preserves position'] })
    await context.close()
    console.log('PASS deep-scripture-anchor')
  }
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ passed: results.length, results }, null, 2))
  console.log(`PASS ${results.length} reader/carousel scenarios; evidence: ${output}`)
} catch (error) {
  if (lastPage && !lastPage.isClosed()) {
    await lastPage.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {})
    fs.writeFileSync(path.join(output, 'failure.txt'), await lastPage.locator('body').innerText().catch(() => 'Page unavailable'))
  }
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ passed: results.length, error: String(error.stack || error), results }, null, 2))
  throw error
} finally { await browser.close() }
