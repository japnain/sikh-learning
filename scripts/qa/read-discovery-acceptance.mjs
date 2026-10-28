#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { installDeterministicFixtures, resolveBrowserExecutable } from './browser-fixtures.mjs'

// Exercise the production UI with isolated storage and controlled provider data.
// Run against a built preview: QA_BASE_URL=http://127.0.0.1:4199 node scripts/qa/read-discovery-acceptance.mjs
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4199'
const output = path.resolve(process.env.QA_OUTPUT_DIR || 'tmp/read-discovery-acceptance')
const selected = new Set((process.env.QA_CASES || '').split(',').filter(Boolean))
const results = []
const bookPath = '/library/panth-prakash-english/chapters/episode-001'
const baniPath = '/study?source=G&ang=1&startAng=1&endAng=8&bani=Japji+Sahib&baniDbId=2&exactBani=1&baniId=japji-sahib'
fs.mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ executablePath: resolveBrowserExecutable(), headless: true })
let currentPage

async function settle(page) {
  await page.evaluate(async () => {
    await Promise.race([document.fonts.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Fonts did not settle')), 10000))])
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
}

async function prepare({ locale = 'en', width = 390, height = 844, dark = false, scale = 1 } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: dark ? 'dark' : 'light',
    reducedMotion: 'reduce', timezoneId: 'America/Toronto', serviceWorkers: 'block' })
  const fixture = await installDeterministicFixtures(context, base)
  await context.addInitScript(({ locale, dark, scale }) => {
    sessionStorage.setItem('splash-shown', '1')
    localStorage.setItem('sikh-onboarding', JSON.stringify({ state: { hasCompletedOnboarding: true, isOnboardingOpen: false }, version: 0 }))
    localStorage.setItem('sikh-ui-locale', JSON.stringify({ state: { locale }, version: 0 }))
    localStorage.setItem('sikh-theme', JSON.stringify({ state: { dark, mode: dark ? 'dark' : 'light' }, version: 0 }))
    localStorage.setItem('naamras-reader-presentation', 'read')
    const applyScale = () => {
      document.documentElement.style.setProperty('font-size', `${100 * scale}%`, 'important')
      document.documentElement.style.setProperty('scroll-behavior', 'auto', 'important')
    }
    if (document.documentElement) applyScale()
    else document.addEventListener('DOMContentLoaded', applyScale, { once: true })
  }, { locale, dark, scale })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  currentPage = page
  return { page, context, fixture, errors }
}

async function visit(page, route, ready = '[data-page="banis"]') {
  await page.goto(new URL(route, base).href, { waitUntil: 'domcontentloaded' })
  await page.locator(ready).waitFor()
  await settle(page)
}

async function fits(page, label) {
  const metrics = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }))
  assert(metrics.content <= metrics.width + 2, `${label}: no page-wide horizontal overflow (${metrics.content}/${metrics.width})`)
}

async function shot(page, name) {
  await settle(page)
  await fits(page, name)
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: false })
}

async function run(name, config, test) {
  if (selected.size && !selected.has(name.split('-')[0]) && !selected.has(name)) return
  console.log(`START ${name}`)
  const state = await prepare(config)
  try {
    const details = await test(state)
    state.fixture.assertNoUnexpectedRequests()
    assert.deepEqual(state.errors, [], `${name}: no uncaught browser exceptions`)
    results.push({ name, config, status: 'passed', ...details })
    console.log(`PASS ${name}`)
  } catch (error) {
    await state.page.screenshot({ path: path.join(output, `failure-${name}.png`), fullPage: false }).catch(() => {})
    results.push({ name, config, status: 'failed', url: state.page.url(), error: error instanceof Error ? error.stack : String(error) })
    console.error(`FAIL ${name}: ${error instanceof Error ? error.stack : String(error)}`)
  } finally {
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2))
    await state.context.close()
  }
}

try {
  for (const [locale, digits, open] of [['en', '123', 'Open'], ['pa', '੧੨੩', 'ਖੋਲ੍ਹੋ'], ['hi', '१२३', 'खोलें']]) {
    await run(`source-${locale}`, { locale, width: 390, dark: locale !== 'en' }, async ({ page }) => {
      await visit(page, '/banis?collection=sources')
      await page.locator('#source-sggs-toggle').click()
      const input = page.locator('#source-sggs-jump')
      await input.fill('1431')
      await input.locator('..').getByRole('button', { name: open, exact: true }).click()
      await page.locator('#source-sggs-jump-error').waitFor()
      assert.equal(await input.getAttribute('aria-invalid'), 'true', 'Out-of-range numbers stay in the browser with an accessible error')
      await input.fill(digits)
      await input.locator('..').getByRole('button', { name: open, exact: true }).click()
      await page.locator('[data-page="study"][data-ai-state="ready"]').waitFor()
      assert.equal(new URL(page.url()).searchParams.get('ang'), '123')
      assert.equal(new URL(page.url()).searchParams.get('source'), 'G')
      // The persistent reader's first control is its Back link/button.
      await page.locator('[data-reader-header="persistent"] > :first-child').click()
      await page.locator('#source-sggs-123').waitFor()
      await page.waitForFunction(() => document.activeElement?.id === 'source-sggs-123')
      const params = new URL(page.url()).searchParams
      assert.equal(params.get('collection'), 'sources')
      assert.equal(params.get('sourceOpen'), 'sggs')
      assert.equal(params.get('sourcePage-sggs'), '3')
      await shot(page, `source-return-${locale}`)
      // Ordinary number links also keep the selected number page on browser Back.
      await page.locator('#source-sggs-124').click()
      await page.locator('[data-page="study"][data-ai-state="ready"]').waitFor()
      await page.goBack()
      await page.locator('#source-sggs-124').waitFor()
      await page.waitForFunction(() => document.activeElement?.id === 'source-sggs-124')
      return { checks: ['localized invalid number error', 'native numeral exact lookup', 'reader Back restores collection, expansion, number page and focus', 'browser Back restores focused number'] }
    })
  }

  await run('search-collections', { width: 390 }, async ({ page }) => {
    await visit(page, '/banis?collection=stories')
    const input = page.locator('#banis-search')
    const scope = page.getByRole('group', { name: 'Result type', exact: true })
    const chooseScope = async (label, value) => {
      await scope.getByRole('button', { name: label, exact: true }).click()
      await page.waitForFunction(({ label, value }) => {
        const selected = [...document.querySelectorAll('[aria-label="Result type"] button')]
          .find(button => button.textContent === label)
        return selected?.getAttribute('aria-pressed') === 'true'
          && (new URL(location.href).searchParams.get('scope') ?? 'all') === value
      }, { label, value })
    }
    await chooseScope('Stories', 'stories')
    await input.fill('Lalo')
    const stories = page.getByTestId('banis-search-story-results')
    await stories.locator('[data-read-launch]').first().waitFor()
    const searchUrl = page.url()
    assert.equal(new URL(searchUrl).searchParams.get('scope'), 'stories', 'Typing preserves the selected scope before opening a result')
    assert.equal(new URL(searchUrl).searchParams.get('query'), 'Lalo', 'The search URL is saved before opening a result')
    await stories.locator('[data-read-launch]').first().click()
    await page.locator('.story-reader-content').waitFor()
    await page.locator('[data-reader-header="persistent"] > :first-child').click()
    await input.waitFor()
    assert.equal(new URL(page.url()).pathname, new URL(searchUrl).pathname, 'Story Back returns to Read')
    assert.deepEqual([...new URL(page.url()).searchParams].sort(), [...new URL(searchUrl).searchParams].sort(), 'Story Back keeps every search parameter')
    assert.equal(await input.inputValue(), 'Lalo')
    assert.equal(await scope.getByRole('button', { name: 'Stories', exact: true }).getAttribute('aria-pressed'), 'true')
    await page.locator('#read-tab-books').click()
    await page.getByTestId('read-books-browser').waitFor()
    assert.equal(await input.inputValue(), '', 'Selecting a collection exits the search')
    await page.getByRole('button', { name: 'Return to “Lalo”', exact: true }).click()
    await stories.locator('[data-read-launch]').first().waitFor()
    assert.equal(await input.inputValue(), 'Lalo', 'The previous search can be recovered from another collection')
    await chooseScope('Books', 'books')
    await input.fill('Panth Prakash')
    await page.getByTestId('banis-search-library-results').locator('[data-read-launch]').first().waitFor()
    assert.equal(await stories.count(), 0, 'Books scope excludes Story results')
    await chooseScope('Gurbani', 'gurbani')
    await input.fill('Japji')
    await page.getByTestId('banis-search-app-results').locator('[data-read-launch]').first().waitFor()
    assert.equal(await page.getByTestId('banis-search-library-results').count(), 0, 'Gurbani scope excludes book results')
    await chooseScope('All', 'all')
    await input.fill('Lalo')
    await stories.locator('[data-read-launch]').first().waitFor()
    await shot(page, 'search-all')
    await page.getByRole('button', { name: 'Back to browsing', exact: true }).click()
    await page.getByTestId('read-books-browser').waitFor()
    assert.equal(await page.locator('#read-tab-books').getAttribute('aria-selected'), 'true')
    return { checks: ['story search and reader return', 'collection exit and query recovery', 'All/Gurbani/Books/Stories scopes', 'collection remains selected after search'] }
  })

  await run('continuity-book-bani', { width: 390 }, async ({ page }) => {
    await visit(page, '/banis?collection=books')
    await page.locator('#read-book-panth-prakash-english').click()
    await page.getByTestId('panth-library-home').waitFor()
    await page.locator('.epub-primary-action').click()
    await page.getByTestId('panth-chapter-text').waitFor()
    assert.equal(new URL(page.url()).pathname, bookPath)
    await settle(page)
    await page.waitForFunction(() => Boolean(JSON.parse(localStorage.getItem('naamras-reading-places') || '{}').state?.places?.['book:panth-prakash-english']?.readerLocator?.locations?.blockId))
    const initialBlock = await page.evaluate(() => JSON.parse(localStorage.getItem('naamras-reading-places')).state.places['book:panth-prakash-english'].readerLocator.locations.blockId)
    const blocks = page.locator('[data-reader-block]')
    const target = blocks.nth(Math.min(12, await blocks.count() - 1))
    await target.evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }))
    await page.waitForFunction(initialBlock => {
      const savedBlock = JSON.parse(localStorage.getItem('naamras-reading-places') || '{}').state?.places?.['book:panth-prakash-english']?.readerLocator?.locations?.blockId
      return scrollY > 0 && savedBlock && savedBlock !== initialBlock
    }, initialBlock)
    await page.locator('[data-testid="panth-reader-topbar"] > a').click()
    // Reader Back keeps the original collection origin through the book overview.
    await page.getByTestId('read-books-browser').waitFor()
    assert.equal(new URL(page.url()).pathname, '/banis')
    assert.equal(new URL(page.url()).searchParams.get('collection'), 'books')
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('naamras-reading-places')).state.places['book:panth-prakash-english'])
    assert(before.readerLocator.locations.blockId, 'A real book scroll saves a block locator')
    await visit(page, baniPath, '[data-page="study"][data-ai-state="ready"]')
    await page.evaluate(() => window.scrollTo({ top: 350, behavior: 'instant' }))
    await visit(page, '/banis?collection=books')
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('naamras-reading-places')).state.places['book:panth-prakash-english'])
    assert.equal(saved.resumePath, before.resumePath, 'Opening a bani does not replace the book route')
    assert.equal(saved.readerLocator.locations.blockId, before.readerLocator.locations.blockId, 'Opening a bani does not replace the book block')
    const expected = `${bookPath}#${encodeURIComponent(before.readerLocator.locations.blockId)}`
    const resume = page.locator('[id="read-continue-book:panth-prakash-english"]')
    await resume.waitFor()
    assert.equal(await resume.getAttribute('href'), expected)
    await resume.click()
    await page.getByTestId('panth-chapter-text').waitFor()
    assert.equal(new URL(page.url()).hash, `#${before.readerLocator.locations.blockId}`)
    await page.reload()
    await page.getByTestId('panth-chapter-text').waitFor()
    await settle(page)
    await page.waitForFunction(blockId => {
      const position = document.getElementById(blockId)?.getBoundingClientRect()
      return position && position.top < innerHeight && position.bottom > 0
    }, before.readerLocator.locations.blockId)
    await shot(page, 'book-resume-after-bani-and-refresh')
    return { checks: ['book catalog → book → chapter', 'scroll saves genuine block locator', 'bani leaves book continuity intact', 'Read Continue restores saved block after refresh'], savedBlock: before.readerLocator.locations.blockId }
  })

  for (const config of [{ width: 320, height: 568, dark: false, scale: 1 }, { width: 390, height: 844, dark: true, scale: 1 }, { width: 320, height: 568, dark: true, scale: 2 }, { width: 1440, height: 1000, dark: false, scale: 1 }]) {
    const key = `${config.width}-${config.dark ? 'dark' : 'light'}-${config.scale * 100}`
    await run(`layout-${key}`, config, async ({ page }) => {
      await visit(page, '/banis')
      await page.locator('#read-tab-banis').focus()
      await page.keyboard.press('ArrowRight')
      await page.waitForFunction(() => document.activeElement?.id === 'read-tab-sources'
        && document.activeElement.getAttribute('aria-selected') === 'true')
      await page.keyboard.press('End')
      await page.waitForFunction(() => document.activeElement?.id === 'read-tab-stories'
        && document.activeElement.getAttribute('aria-selected') === 'true')
      await page.keyboard.press('Home')
      await page.waitForFunction(() => document.activeElement?.id === 'read-tab-banis'
        && document.activeElement.getAttribute('aria-selected') === 'true')
      for (const [collection, ready] of [['banis', '[data-testid="banis-featured-flow"]'], ['sources', '#source-sggs-toggle'], ['books', '#read-book-panth-prakash-english'], ['stories', '.story-card']]) {
        await page.locator(`#read-tab-${collection}`).click()
        await page.locator(ready).first().waitFor()
        await page.locator(`#read-tab-${collection}`).scrollIntoViewIfNeeded()
        await shot(page, `read-${collection}-${key}`)
        assert.equal(await page.locator(`#read-tab-${collection}`).getAttribute('aria-selected'), 'true')
      }
      return { checks: ['all four collections render', 'keyboard arrows/Home/End choose and focus collections', 'no horizontal overflow at configured width and text scale'] }
    })
    await run(`rehat-${key}`, config, async ({ page }) => {
      await visit(page, '/banis/rehat/1/chapters/11', '[data-testid="rehat-chapter-content"]')
      const header = page.getByTestId('rehat-reader-header')
      await header.getByRole('button', { name: 'Rehat contents', exact: true }).click()
      const contents = page.getByTestId('rehat-contents-sheet')
      await contents.waitFor()
      assert.equal(await contents.locator('a[aria-current="page"]').textContent(), 'Daily Discipline•')
      await shot(page, `rehat-contents-${key}`)
      await page.keyboard.press('Escape')
      await contents.waitFor({ state: 'hidden' })
      await header.getByRole('button', { name: 'Find in chapter', exact: true }).click()
      const find = page.getByTestId('rehat-chapter-text-search')
      await find.fill('simran')
      await page.getByTestId('rehat-chapter-content').locator('mark').waitFor()
      assert.match(await page.getByTestId('rehat-find-controls').textContent(), /1 of 1 matches/)
      await settle(page)
      const findLayout = await page.evaluate(() => {
        const header = document.querySelector('[data-testid="rehat-reader-header"]').getBoundingClientRect()
        const buttons = [...document.querySelectorAll('.rehat-find-controls button')].map(button => {
          const rect = button.getBoundingClientRect()
          return { label: button.getAttribute('aria-label') || button.textContent, top: rect.top, width: rect.width, height: rect.height }
        })
        return { headerBottom: header.bottom, viewportHeight: innerHeight, buttons }
      })
      assert.equal(findLayout.buttons.length, 3, 'Find exposes previous, next and clear controls')
      for (const button of findLayout.buttons) {
        assert(button.width >= 43.9 && button.height >= 43.9,
          `${key}: Find ${button.label} retains a 44×44px touch target (${button.width}×${button.height})`)
        assert(Math.abs(button.top - findLayout.buttons[0].top) <= 1,
          `${key}: all three Find controls share one row`)
      }
      assert(findLayout.viewportHeight - findLayout.headerBottom >= findLayout.viewportHeight * 0.45,
        `${key}: open Find leaves at least 45% of the viewport for reading (header bottom ${findLayout.headerBottom}/${findLayout.viewportHeight})`)
      await shot(page, `rehat-find-${key}`)
      await header.getByRole('button', { name: 'Find in chapter', exact: true }).click()
      await header.getByRole('button', { name: 'Reading appearance', exact: true }).click()
      const appearance = page.getByTestId('rehat-appearance-sheet')
      await appearance.getByRole('button', { name: 'Increase text size', exact: true }).click()
      assert.equal(await appearance.locator('output').textContent(), '105%')
      await shot(page, `rehat-appearance-${key}`)
      await page.keyboard.press('Escape')
      await appearance.waitFor({ state: 'hidden' })
      await page.reload()
      await page.getByTestId('rehat-chapter-content').waitFor()
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('sikh-epub-reader-preferences')).state.fontScale), 1.05)
      await shot(page, `rehat-reader-${key}`)
      return { checks: ['shared persistent reader header', 'contents exposes selected chapter', 'Find highlights chapter match', 'Find controls share one row with 44px targets', 'open Find preserves at least 45% viewport reading area', 'appearance saves across refresh', 'no horizontal overflow'], findLayout }
    })
  }

  for (const [locale, retry] of [['en', 'Try again'], ['pa', 'ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ'], ['hi', 'फिर कोशिश करें']]) {
    await run(`retry-${locale}`, { locale, width: 390 }, async ({ page, context }) => {
      let fail = true
      let failedRequests = 0
      await context.route('**/data/library/works.json', route => {
        if (fail) { failedRequests += 1; return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Controlled QA failure"}' }) }
        return route.fallback()
      })
      await visit(page, '/banis?collection=books')
      const catalog = page.getByTestId('read-books-browser')
      const button = catalog.getByRole('button', { name: retry, exact: true })
      await button.waitFor()
      assert(failedRequests > 0, 'The catalog recovery state follows a real failed fetch')
      await shot(page, `book-retry-${locale}`)
      fail = false
      await button.click()
      await page.locator('#read-book-panth-prakash-english').waitFor()
      assert.equal(await button.count(), 0, 'Successful retry replaces recovery UI with the book catalog')
      return { checks: ['localized catalog failure and retry', 'successful retry restores actual book catalog'], failedRequests }
    })
  }

  assert(results.length > 0, 'QA_CASES did not match any Read acceptance journeys')
  const failed = results.filter(result => result.status === 'failed')
  assert.equal(failed.length, 0, `Read acceptance failures: ${failed.map(result => result.name).join(', ')}`)
  console.log(`Read discovery acceptance passed: ${results.length} journeys. Evidence: ${output}`)
} catch (error) {
  results.push({ status: 'failed', error: error instanceof Error ? error.stack : String(error) })
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2))
  if (currentPage && !currentPage.isClosed()) await currentPage.screenshot({ path: path.join(output, 'failure.png'), fullPage: false }).catch(() => {})
  throw error
} finally { await browser.close() }
