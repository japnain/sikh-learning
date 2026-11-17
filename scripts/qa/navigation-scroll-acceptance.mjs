#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium, webkit } from 'playwright-core'
import { installDeterministicFixtures, resolveBrowserExecutable } from './browser-fixtures.mjs'

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4187'
const output = path.resolve(process.env.QA_OUTPUT_DIR || 'tmp/navigation-scroll-acceptance')
const engine = process.env.QA_BROWSER_ENGINE || 'chromium'
assert(['chromium', 'webkit'].includes(engine), 'QA_BROWSER_ENGINE must be chromium or webkit')
const browser = await (engine === 'webkit' ? webkit : chromium).launch({ headless: true,
  ...(engine === 'chromium' ? { executablePath: resolveBrowserExecutable() } : {}) })
const results = []
const scrolledTabs = new Set()
let lastPage
fs.mkdirSync(output, { recursive: true })

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    for (let frame = 0; frame < 4; frame++) await new Promise(resolve => requestAnimationFrame(resolve))
  })
}
async function measure(page) {
  await settle(page)
  return page.evaluate(() => {
    const nav = document.querySelector('[data-testid="nav-stack"]').getBoundingClientRect()
    const shell = document.querySelector('#main-content .page-shell[data-page]')
    const visibleChildren = [...shell.children].filter(child => child.getClientRects().length
      && !['fixed', 'absolute'].includes(getComputedStyle(child).position))
    return { height: nav.height, gap: innerHeight - nav.bottom, left: nav.left, right: nav.right, top: nav.top,
      reserved: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-stack-height')),
      padding: parseFloat(getComputedStyle(shell).paddingBottom),
      contentBottom: Math.max(...visibleChildren.map(child => child.getBoundingClientRect().bottom)),
      scrollY, maxScroll: Math.max(0, document.documentElement.scrollHeight - innerHeight),
      controls: [...document.querySelectorAll('[data-testid="primary-nav"] a')].map(control => {
        const rect = control.getBoundingClientRect()
        return { top: innerHeight - rect.top, bottom: innerHeight - rect.bottom, width: rect.width, height: rect.height }
      }) }
  })
}
function pinned(value, label, baseline) {
  assert(Math.abs(value.gap) <= 1, `${label}: navigation touches viewport bottom (${value.gap}px gap)`)
  assert(value.reserved >= value.height - 1 && value.reserved <= value.height + 1, `${label}: actual navigation height is reserved`)
  assert(value.padding >= value.height, `${label}: final content has navigation clearance`)
  value.controls.forEach((control, index) => {
    assert(control.width >= 44 && control.height >= 44, `${label}: tab ${index} retains a 44px target`)
    if (baseline) for (const key of ['top', 'bottom', 'height']) {
      assert(Math.abs(control[key] - baseline.controls[index][key]) <= 1, `${label}: tab ${index} ${key} moved relative to viewport bottom`)
    }
  })
  if (baseline) assert(Math.abs(value.height - baseline.height) <= 1, `${label}: navigation height remains stable`)
}
async function scrollToEdge(page, bottom) {
  const viewport = page.viewportSize()
  await page.mouse.move(viewport.width / 2, viewport.height / 2)
  await page.mouse.wheel(0, (bottom ? 1 : -1) * 100000)
  await page.waitForFunction(atBottom => atBottom
    ? scrollY >= document.documentElement.scrollHeight - innerHeight - 2 : scrollY <= 2, bottom)
}
async function contextFor({ width, height, scale = 1, standalone = false }) {
  const context = await browser.newContext({ viewport: { width, height }, screen: { width: 390, height: 844 },
    reducedMotion: 'reduce', serviceWorkers: 'block', timezoneId: 'America/Toronto' })
  const fixture = await installDeterministicFixtures(context, base)
  await context.addInitScript(({ scale, standalone }) => {
    if (standalone) {
      Object.defineProperty(navigator, 'standalone', { configurable: true, value: true })
      // Resizing browser chrome changes the viewport, not the physical screen.
      // Playwright otherwise updates screen dimensions with setViewportSize.
      Object.defineProperties(screen, {
        width: { configurable: true, get: () => 390 },
        height: { configurable: true, get: () => 844 },
      })
    }
    sessionStorage.setItem('splash-shown', '1')
    localStorage.setItem('sikh-onboarding', JSON.stringify({ state: { hasCompletedOnboarding: true, isOnboardingOpen: false }, version: 0 }))
    localStorage.setItem('sikh-ui-locale', JSON.stringify({ state: { locale: 'en' }, version: 0 }))
    localStorage.setItem('sikh-bookmarks', JSON.stringify(Array.from({ length: 12 }, (_, index) => ({
      id: `qa-navigation-${index}`, type: 'verse', title: `Saved navigation fixture ${index + 1}`, source: 'G',
      ang: index + 1, verseId: index + 1, savedAt: '2026-04-05T12:00:00.000Z',
    }))))
    document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.style.setProperty('font-size', `${100 * scale}%`, 'important')
      document.documentElement.style.setProperty('scroll-behavior', 'auto', 'important')
      document.documentElement.style.setProperty('--safe-area-bottom', '0px')
    }, { once: true })
  }, { scale, standalone })
  const page = await context.newPage()
  lastPage = page
  page.setDefaultTimeout(15000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  return { context, fixture, page, errors }
}

try {
  for (const config of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 320, height: 568, scale: 2 }]) {
    const { context, fixture, page, errors } = await contextFor(config)
    const key = `${config.width}-${config.scale || 1}x`
    await page.goto(base, { waitUntil: 'domcontentloaded' })
    for (const [tab, surface] of [['home', 'home'], ['read', 'banis'], ['saved', 'library'], ['more', 'more']]) {
      await page.getByTestId(`nav-tab-${tab}`).click()
      await page.getByTestId(`page-${surface}`).waitFor()
      const baseline = await measure(page)
      pinned(baseline, `${key}-${tab}`)
      for (const inset of [0, 34, 0]) {
        await page.evaluate(value => document.documentElement.style.setProperty('--safe-area-bottom', `${value}px`), inset)
        await scrollToEdge(page, true)
        const bottom = await measure(page)
        pinned(bottom, `${key}-${tab}-inset${inset}-down`, baseline)
        if (bottom.scrollY > 0) scrolledTabs.add(tab)
        assert(bottom.contentBottom <= bottom.top + 1, `${key}-${tab}: last content clears the navigation at page end`)
        await scrollToEdge(page, false)
        pinned(await measure(page), `${key}-${tab}-inset${inset}-up`, baseline)
      }
      for (const height of [config.height + 80, config.height]) {
        await page.setViewportSize({ width: config.width, height })
        pinned(await measure(page), `${key}-${tab}-height${height}`, baseline)
      }
      results.push({ key, tab, height: baseline.height, checks: ['wheel scrolling', 'safe-area changes', 'height-only resizing', 'final content clearance'] })
    }
    await page.setViewportSize({ width: config.height, height: config.width })
    pinned(await measure(page), `${key}-landscape`)
    await page.setViewportSize({ width: config.width, height: config.height })
    pinned(await measure(page), `${key}-portrait-return`)
    await page.setViewportSize({ width: 1280, height: 900 })
    const desktop = await measure(page)
    assert.equal(desktop.reserved, 0, `${key}: desktop rail removes bottom reservation`)
    assert(desktop.left >= 0 && desktop.right < 300 && desktop.top >= 0, `${key}: desktop rail stays at the side`)
    await page.screenshot({ path: path.join(output, `navigation-${key}.png`) })
    fixture.assertNoUnexpectedRequests()
    assert.deepEqual(errors, [], `${key}: no page errors`)
    await context.close()
  }
  assert.equal(scrolledTabs.size, 4, 'Every tab is exercised with actual scrolling in the viewport matrix')
  const { context, fixture, page, errors } = await contextFor({ width: 390, height: 785, standalone: true })
  await page.goto(new URL('/more', base).href, { waitUntil: 'domcontentloaded' })
  await page.getByTestId('page-more').waitFor()
  const loss = name => page.evaluate(property => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(property)), name)
  const baseline = await measure(page)
  assert.equal(await loss('--nav-viewport-loss'), 59, 'Navigation captures the initial standalone screen loss')
  assert.equal(await loss('--ios-standalone-viewport-loss'), 59, 'Other fixed surfaces start with the measured loss')
  for (const height of [844, 755, 785]) {
    await page.setViewportSize({ width: 390, height })
    pinned(await measure(page), `standalone-height${height}`, baseline)
    assert.equal(await loss('--nav-viewport-loss'), 59, 'Height-only changes preserve the navigation correction')
    assert.equal(await loss('--ios-standalone-viewport-loss'), 844 - height, 'Other fixed surfaces retain responsive viewport correction')
  }
  await page.setViewportSize({ width: 844, height: 369 })
  await page.evaluate(() => dispatchEvent(new Event('orientationchange')))
  pinned(await measure(page), 'standalone-landscape')
  assert.equal(await loss('--nav-viewport-loss'), 21, 'Orientation change refreshes navigation correction')
  assert.equal(await loss('--ios-standalone-viewport-loss'), 21, 'Other fixed surfaces refresh after rotation')
  fixture.assertNoUnexpectedRequests()
  assert.deepEqual(errors, [])
  await context.close()
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ engine, results, standalone: 'passed' }, null, 2))
  console.log(`PASS navigation scrolling: ${results.length} route/viewport journeys plus standalone orientation`)
} catch (error) {
  if (lastPage && !lastPage.isClosed()) await lastPage.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {})
  throw error
} finally { await browser.close() }
