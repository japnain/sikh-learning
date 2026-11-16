#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { installDeterministicFixtures, resolveBrowserExecutable } from './browser-fixtures.mjs'

// Isolated browser storage and controlled provider responses only. This journey
// does not sign in, contact a real account, or alter a user's existing routine.
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4187'
const output = path.resolve(process.env.QA_OUTPUT_DIR || 'tmp/daily-more-acceptance')
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

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
}

async function assertLayout(page, scope, name) {
  await settle(page)
  const measurement = await page.locator(scope).evaluate(root => {
    const bounds = root.getBoundingClientRect()
    const controls = [...root.querySelectorAll('button,a,select,input,summary')]
      .filter(control => {
        const style = getComputedStyle(control)
        return control.getClientRects().length && style.visibility !== 'hidden'
          && style.display !== 'none' && control.getAttribute('type') !== 'hidden'
      }).map(control => {
        const rect = control.getBoundingClientRect()
        return { name: control.getAttribute('aria-label') || control.textContent.trim().slice(0, 70),
          width: rect.width, height: rect.height, left: rect.left, right: rect.right }
      })
    return { documentWidth: document.documentElement.scrollWidth, viewport: innerWidth,
      height: bounds.height, left: bounds.left, right: bounds.right, controls }
  })
  assert(measurement.documentWidth <= measurement.viewport + 2, `${name}: no document horizontal overflow`)
  assert(measurement.left >= -2 && measurement.right <= measurement.viewport + 2, `${name}: surface fits viewport`)
  for (const control of measurement.controls) {
    assert(control.width >= 43.9 && control.height >= 43.9,
      `${name}: ${control.name} has a 44px target (${control.width}×${control.height})`)
    assert(control.left >= -2 && control.right <= measurement.viewport + 2, `${name}: ${control.name} fits horizontally`)
  }
  return measurement
}

async function closePanel(page, opener, panel) {
  await panel.getByRole('button', { name: 'Close settings', exact: true }).click()
  await panel.waitFor({ state: 'hidden' })
  await page.waitForFunction(testId => document.activeElement?.getAttribute('data-testid') === testId, opener)
}

async function readSavedRoutine(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('sikh-nitnem')).state)
}

try {
  for (const config of matrix) {
    const context = await browser.newContext({ viewport: { width: config.width, height: config.height },
      colorScheme: config.dark ? 'dark' : 'light', reducedMotion: 'reduce', timezoneId: 'America/Toronto', serviceWorkers: 'block' })
    const fixture = await installDeterministicFixtures(context, base, { distinctBaniLengths: true })
    await context.addInitScript(({ dark, scale }) => {
      // Guard initialization so the reload assertions exercise actual persistence.
      if (!localStorage.getItem('qa-daily-more-seeded')) {
        localStorage.setItem('qa-daily-more-seeded', '1')
        sessionStorage.setItem('splash-shown', '1')
        localStorage.setItem('sikh-onboarding', JSON.stringify({ state: { hasCompletedOnboarding: true, isOnboardingOpen: false }, version: 0 }))
        localStorage.setItem('sikh-ui-locale', JSON.stringify({ state: { locale: 'en' }, version: 0 }))
        localStorage.setItem('sikh-theme', JSON.stringify({ state: { dark, mode: dark ? 'dark' : 'light' }, version: 0 }))
        localStorage.setItem('sikh-nitnem', JSON.stringify({ state: {
          selectedIds: ['japji-sahib', 'rehras-sahib'], completedIds: ['japji-sahib'], completedDate: '2026-04-05',
          weeklyDayGoal: 7, completionTrackingEnabled: true,
        }, version: 5 }))
        localStorage.setItem('sikh-sundar-gutka-lengths', JSON.stringify({ state: { lengths: {
          'chaupai-sahib': 'short', 'rehras-sahib': 'short', aarti: 'short', 'kirtan-sohila': 'short',
        } }, version: 2 }))
      }
      const style = document.createElement('style')
      style.textContent = `html { font-size: ${100 * scale}% !important; scroll-behavior: auto !important; }`
      document.addEventListener('DOMContentLoaded', () => document.head.append(style), { once: true })
    }, config)
    const page = await context.newPage()
    lastPage = page
    page.setDefaultTimeout(15000)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const key = `${config.width}-${config.dark ? 'dark' : 'light'}-${config.scale * 100}`
    console.log(`START daily-more-${key}`)
    await page.goto(new URL('/more', base).href, { waitUntil: 'domcontentloaded' })
    await page.getByTestId('page-more').waitFor()
    const overview = await assertLayout(page, '[data-testid="page-more"]', `more-${key}`)
    assert(overview.height < (config.scale === 1 ? 1100 : 2600), `more-${key}: overview remains compact (measured ${Math.round(overview.height)}px)`)
    assert.equal(await page.getByRole('dialog').count(), 0, 'Detailed settings are closed on arrival')
    assert.equal(await page.getByTestId('personal-data-panel').count(), 0, 'Backup detail is not dumped into the overview')
    await page.screenshot({ path: path.join(output, `more-${key}.png`), fullPage: true })

    for (const name of ['appearance', 'reader', 'sound', 'backup', 'about']) {
      const opener = `more-open-${name}`
      await page.getByTestId(opener).click()
      const panel = page.getByTestId(`more-${name}-sheet`)
      await panel.waitFor()
      await assertLayout(page, `[data-testid="more-${name}-sheet"]`, `more-${name}-${key}`)
      if (name === 'appearance') {
        assert.equal(await panel.getByTestId('more-app-language').count(), 1, 'App language remains reachable')
        assert.equal(await panel.getByTestId('more-home-artwork').count(), 1, 'Home artwork remains reachable')
      }
      if (name === 'reader') {
        await panel.getByRole('button', { name: 'Reading support', exact: true }).click()
        await panel.getByRole('button', { name: 'Read', exact: true }).click()
        assert.equal(await panel.getByRole('button', { name: 'Read', exact: true }).getAttribute('aria-pressed'), 'true')
        await assertLayout(page, '[data-testid="more-reader-sheet"]', `reader-support-${key}`)
        await panel.getByRole('button', { name: 'Sources', exact: true }).click()
        await assertLayout(page, '[data-testid="more-reader-sheet"]', `reader-sources-${key}`)
        await panel.getByRole('button', { name: 'Layout', exact: true }).click()
      }
      if (name === 'backup') {
        assert.equal(await panel.getByRole('button', { name: 'Download backup', exact: true }).count(), 1)
        assert.equal(await panel.getByRole('button', { name: 'Restore from a file', exact: true }).count(), 1)
      }
      await closePanel(page, opener, panel)
    }
    if (await page.getByTestId('more-open-account').count()) {
      await page.getByTestId('more-open-account').click()
      await page.locator('[data-ai-surface="cloud-sync-panel"]').waitFor()
      await closePanel(page, 'more-open-account', page.getByTestId('more-account-sheet'))
    }

    await page.getByTestId('more-open-nitnem-customize').click()
    await page.getByTestId('nitnem-customize-panel').waitFor()
    await assertLayout(page, '[data-testid="nitnem-customize-panel"]', `customizer-${key}`)
    const addTrigger = page.getByRole('button', { name: 'Add a bani', exact: true })
    const addPosition = await addTrigger.boundingBox()
    const firstPosition = await page.getByTestId('nitnem-ritual-item').first().boundingBox()
    assert(addPosition.y < firstPosition.y, 'Adding a bani is available above the selected routine')
    await addTrigger.click()
    const picker = page.getByTestId('nitnem-selection')
    await picker.waitFor()
    await assertLayout(page, '[data-testid="nitnem-selection"]', `picker-${key}`)
    await picker.getByRole('searchbox', { name: 'Search available banis' }).fill('Ardas')
    await picker.getByRole('button', { name: 'Add Ardaas', exact: true }).click()
    assert.equal(await picker.getByRole('button', { name: 'Add Ardaas', exact: true }).count(), 0, 'Selected bani cannot be added twice')
    await picker.getByRole('searchbox', { name: 'Search available banis' }).fill('Chandi Di Vaar')
    await picker.getByLabel('Browse by category').selectOption('dasam')
    assert.equal(await picker.getByRole('button', { name: 'Add Vaar Sri Bhagauti Ji Ki', exact: true }).count(), 1, 'Alias and category resolve the actual existing reading')
    await picker.getByRole('searchbox', { name: 'Search available banis' }).fill('zzzzno-such-bani')
    await picker.getByRole('button', { name: 'Clear search and filters', exact: true }).click()
    assert.equal(await picker.getByLabel('Browse by category').inputValue(), 'all')
    await picker.getByRole('button', { name: 'Done', exact: true }).click()
    await picker.waitFor({ state: 'hidden' })
    assert.deepEqual((await readSavedRoutine(page)).selectedIds, ['japji-sahib', 'rehras-sahib'], 'Add is only a draft')
    await page.getByRole('button', { name: 'Move Ardaas up', exact: true }).click()
    await page.getByRole('button', { name: 'Remove Japji Sahib from Daily Nitnem', exact: true }).click()
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await page.getByLabel('Edit Rehras Sahib', { exact: true }).click()
    const length = page.getByLabel('Rehras Sahib length', { exact: true })
    await length.locator('option[value="long"]').waitFor({ state: 'attached' })
    await length.selectOption('long')
    await page.screenshot({ path: path.join(output, `customizer-${key}.png`), fullPage: true })
    await page.getByRole('button', { name: 'Save routine', exact: true }).click()
    await page.getByTestId('page-more').waitFor()
    assert.equal(new URL(page.url()).pathname, '/more', 'Save returns to the originating More page')
    assert.deepEqual((await readSavedRoutine(page)).selectedIds, ['japji-sahib', 'ardaas', 'rehras-sahib'])
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('sikh-sundar-gutka-lengths')).state.lengths['rehras-sahib']), 'long')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByTestId('page-more').waitFor()
    await page.getByTestId('more-open-nitnem-customize').click()
    await page.getByTestId('nitnem-customize-panel').waitFor()
    assert.deepEqual(await page.locator('.nitnem-editor-bani-name').allTextContents(), ['Japji Sahib', 'Ardaas', 'Rehras Sahib'], 'Saved order survives reload')
    await page.getByRole('button', { name: 'Move Ardaas up', exact: true }).click()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    const discard = page.getByRole('dialog', { name: 'Discard changes?', exact: true })
    await discard.getByRole('button', { name: 'Discard', exact: true }).click()
    await page.getByTestId('page-more').waitFor()
    assert.deepEqual((await readSavedRoutine(page)).selectedIds, ['japji-sahib', 'ardaas', 'rehras-sahib'], 'Cancel discards the unsaved reorder')

    await page.goto(new URL('/nitnem/customize#nitnem-continuity', base).href, { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Your weekly goal', { exact: true }).waitFor({ state: 'visible' })
    await page.getByLabel('Your weekly goal', { exact: true }).selectOption('3')
    // Browser reload confirms beforeunload; the app must still recover the draft.
    page.once('dialog', dialog => dialog.accept())
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByText('Your unsaved draft is restored. Save to keep it, or Cancel to discard it.', { exact: true }).waitFor()
    assert.equal(await page.getByLabel('Your weekly goal', { exact: true }).inputValue(), '3')
    assert.equal((await readSavedRoutine(page)).weeklyDayGoal, 7, 'Recovering a draft does not commit it')
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.getByRole('button', { name: 'Discard', exact: true }).click()
    fixture.assertNoUnexpectedRequests()
    assert.deepEqual(errors, [], `daily-more-${key}: no unhandled page errors`)
    results.push({ config, overviewHeight: overview.height, checks: [
      'compact More index', '44px controls and no horizontal overflow', 'settings sheet navigation and focus return',
      'reader sections and Read mode', 'catalog aliases and category filters', 'add, reorder, remove, undo and save',
      'saved routine and exact length survive reload', 'cancel discards changes', 'weekly-goal deep link and draft recovery',
    ] })
    await context.close()
    console.log(`PASS daily-more-${key}`)
  }
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ results }, null, 2))
} catch (error) {
  if (lastPage && !lastPage.isClosed()) await lastPage.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {})
  throw error
} finally {
  await browser.close()
}
