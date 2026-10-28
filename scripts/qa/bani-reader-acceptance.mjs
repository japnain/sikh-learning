#!/usr/bin/env node
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { installDeterministicFixtures, resolveBrowserExecutable } from './browser-fixtures.mjs'

/** Self-contained: serialize this function for DevTools, or pass it to page.evaluate. */
export function measureBaniReaderUi() {
  const selectors = [
    '.home-masthead :is(a,button)', '.home-nitnem-entry', '.home-daily :is(a,button)',
    '.home-daily-sheet :is(a,button)', '.study-reader-topbar :is(a,button)',
    '.reader-dock:not([hidden]) :is(a,button)', '.bani-length-sheet :is(button,input,summary)',
    '.bani-find :is(button,input)', '.reader-finish :is(a,button)',
    '.study-reader-sections-sheet :is(button,input)', '.study-reader-settings-sheet :is(button,input,select)',
  ]
  const describe = element => ({
    tag: element.tagName.toLowerCase(), id: element.id || undefined,
    testId: element.getAttribute('data-testid') || undefined,
    name: (element.getAttribute('aria-label') || element.textContent || '').replace(/\s+/gu, ' ').trim().slice(0, 100),
  })
  const hidden = element => Boolean(element.closest('[hidden],[inert],[aria-hidden="true"]'))
    || getComputedStyle(element).display === 'none' || getComputedStyle(element).visibility === 'hidden'
  const box = element => {
    const rect = element.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom }
  }
  const issues = []
  const warnings = []
  const controls = []
  const root = document.documentElement
  const viewport = { width: root.clientWidth, height: window.visualViewport?.height ?? innerHeight }
  const documentWidth = Math.max(root.scrollWidth, document.body.scrollWidth)
  if (documentWidth > viewport.width + 2) issues.push({ kind: 'document-horizontal-overflow', documentWidth, viewportWidth: viewport.width })
  for (const control of document.querySelectorAll(selectors.join(','))) {
    if (!(control instanceof HTMLElement) || hidden(control)) continue
    // Cards outside the rail's viewport are deliberately scrollable, not clipped UI.
    // Inspect the browsed card; focus/navigation checks reveal the others separately.
    const railCard = control.closest('[data-nitnem-card]')
    if (railCard && railCard.getAttribute('data-testid') !== 'home-nitnem-active-reading') continue
    // Unselected names can sit outside the horizontal Folio index viewport.
    // The Home journey selects every name by keyboard and checks its full bounds
    // and ancestors while selected. Keep all clipping checks for the selected
    // name, and for indexes that are not actually horizontally scrollable.
    const index = control.closest('.home-daily-index[role="tablist"]')
    if (index && control.matches('[role="tab"][aria-selected="false"]')
      && ['auto', 'scroll'].includes(getComputedStyle(index).overflowX)
      && index.scrollWidth > index.clientWidth + 2) continue
    const label = control instanceof HTMLInputElement && ['radio', 'checkbox'].includes(control.type)
      ? control.closest('label') : null
    const target = label ?? control
    const bounds = box(target)
    if (!bounds.width || !bounds.height) continue
    const identity = describe(control)
    controls.push({ ...identity, ...bounds })
    if (bounds.width < 43.9 || bounds.height < 43.9) warnings.push({ kind: 'small-core-target-review-spacing', control: identity, ...bounds })
    let canScrollVertically = false
    for (let ancestor = target.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor)
      const clip = box(ancestor)
      if (!clip.width || !clip.height) continue
      if (['auto', 'scroll'].includes(style.overflowY) && ancestor.scrollHeight > ancestor.clientHeight + 2) canScrollVertically = true
      if (['hidden', 'clip'].includes(style.overflowX)
        && (bounds.x < clip.x - 2 || bounds.right > clip.right + 2)) {
        issues.push({ kind: 'control-clipped-horizontally', control: identity, ancestor: describe(ancestor), controlBox: bounds, ancestorBox: clip })
        break
      }
      if (!canScrollVertically && ['hidden', 'clip'].includes(style.overflowY)
        && (bounds.y < clip.y - 2 || bounds.bottom > clip.bottom + 2)) {
        issues.push({ kind: 'control-clipped-vertically', control: identity, ancestor: describe(ancestor), controlBox: bounds, ancestorBox: clip })
        break
      }
    }
  }
  const scrollRegions = [...document.querySelectorAll('.bani-length-sheet__scroll,.home-daily-sheet-list,.study-reader-settings-sheet__scroll,.study-reader-sections-sheet__scroll')]
    .filter(element => element instanceof HTMLElement && !hidden(element)).map(element => {
      const region = { ...describe(element), ...box(element), clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }
      if (getComputedStyle(element).overflowY !== 'visible' && element.clientHeight < 44 && element.scrollHeight > element.clientHeight + 2) {
        issues.push({ kind: 'scroll-body-too-short-for-a-control', region })
      }
      return region
    })
  const active = document.activeElement
  const focus = active instanceof HTMLElement && active !== document.body ? { ...describe(active), hidden: hidden(active), ...box(active) } : null
  if (focus?.hidden) issues.push({ kind: 'focused-control-hidden-or-inert', focus })
  return {
    rootFontPx: Number.parseFloat(getComputedStyle(root).fontSize), viewport, documentWidth,
    focus, controls, scrollRegions, issues, warnings,
  }
}

async function checkHomeNitnemIndex(page, layout, checks) {
  const index = page.getByTestId('home-nitnem-folio').getByRole('tablist')
  await index.waitFor({ state: 'visible' })
  const tabs = index.getByRole('tab')
  const names = await tabs.evaluateAll(elements => elements.map(element => ({
    id: element.id, name: element.getAttribute('aria-label')?.trim(), baniId: element.getAttribute('data-nitnem-id'),
  })))
  assert(names.length > 0 && names.every(tab => tab.id && tab.name && tab.baniId), 'Every Folio tab has an identity and accessible bani name.')
  assert.equal(new Set(names.map(tab => tab.id)).size, names.length, 'Folio tab identities are unique.')
  await index.scrollIntoViewIfNeeded()
  await index.getByRole('tab', { selected: true }).focus()
  const measurements = []
  const inspectSelected = async expected => {
    await page.waitForFunction(({ id, baniId }) => {
      const selected = document.querySelector('.home-daily-index [role="tab"][aria-selected="true"]')
      const panel = document.querySelector('[data-testid="home-nitnem-active-reading"]')
      return selected?.id === id && document.activeElement === selected
        && panel?.getAttribute('data-nitnem-id') === baniId && panel.getAttribute('aria-labelledby') === id
    }, expected)
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const bounds = await index.evaluate(element => {
      const selected = element.querySelector('[role="tab"][aria-selected="true"]')
      const tab = selected.getBoundingClientRect()
      const rail = element.getBoundingClientRect()
      return { id: selected.id, left: tab.left, right: tab.right, top: tab.top, bottom: tab.bottom,
        railLeft: rail.left, railRight: rail.right, railTop: rail.top, railBottom: rail.bottom }
    })
    assert(bounds.left >= bounds.railLeft - 2 && bounds.right <= bounds.railRight + 2
      && bounds.top >= bounds.railTop - 2 && bounds.bottom <= bounds.railBottom + 2,
    `Selected Folio name ${expected.name} is fully revealed inside its index: ${JSON.stringify(bounds)}`)
    const selectedLayout = await page.evaluate(measureBaniReaderUi)
    layout.issues.push(...selectedLayout.issues.map(issue => ({ ...issue, selectedFolioName: expected.name })))
    measurements.push({ name: expected.name, ...bounds })
  }
  await page.keyboard.press('End')
  await inspectSelected(names.at(-1))
  await page.keyboard.press('Home')
  await inspectSelected(names[0])
  const nextKey = await index.getAttribute('aria-orientation') === 'vertical' ? 'ArrowDown' : 'ArrowRight'
  for (const tab of names.slice(1)) {
    await page.keyboard.press(nextKey)
    await inspectSelected(tab)
  }
  await page.keyboard.press('Home')
  await inspectSelected(names[0])
  checks.push(`All ${names.length} named Folio tabs are keyboard reachable with End, Home and ${nextKey}; each selected tab stays fully inside its index, updates its reading pane, and passes the complete clipping probe.`)
  return measurements
}

async function main() {
  const args = new Map(process.argv.slice(2).map(argument => {
    const separator = argument.indexOf('=')
    return separator < 0 ? [argument, 'true'] : [argument.slice(0, separator), argument.slice(separator + 1)]
  }))
  if (args.has('--print-probe')) {
    process.stdout.write(`(${measureBaniReaderUi.toString()})`)
    return
  }
  const url = args.get('--url')
  if (!url) {
    process.stdout.write('Use --print-probe for a browser-evaluable function, or --url=http://127.0.0.1:PORT/ [--surface=home|reader|length|find|finish] [--locale=en|pa|hi] [--theme=light|dark] [--width=320] [--height=568] [--text-scale=2] [--output=/absolute/report.json].\n')
    return
  }
  const { chromium } = await import('playwright-core')
  const require = createRequire(import.meta.url)
  const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
  const executablePath = resolveBrowserExecutable()
  const deterministic = args.has('--deterministic') || process.env.QA_DETERMINISTIC === '1'
  const locale = args.get('--locale') ?? 'en'
  const dark = args.get('--theme') === 'dark'
  const textScale = Number(args.get('--text-scale') ?? 2)
  const surface = args.get('--surface') ?? 'reader'
  if (!['en', 'pa', 'hi'].includes(locale) || !['home', 'reader', 'length', 'find', 'finish'].includes(surface)
    || ![1, 2].includes(textScale)) throw new Error('Use a supported locale, surface and text scale (1 or 2).')
  // Launch a separate temporary profile; never attach to the user's or another agent's browser.
  const browser = await chromium.launch({ executablePath, headless: true })
  try {
    const context = await browser.newContext({ viewport: { width: Number(args.get('--width') ?? 320), height: Number(args.get('--height') ?? 568) },
      colorScheme: dark ? 'dark' : 'light', reducedMotion: 'reduce', timezoneId: 'America/Toronto', serviceWorkers: deterministic ? 'block' : 'allow' })
    const fixtures = deterministic ? await installDeterministicFixtures(context, url) : null
    await context.addInitScript(({ locale, dark }) => {
      sessionStorage.setItem('splash-shown', '1')
      localStorage.setItem('sikh-onboarding', JSON.stringify({ state: { hasCompletedOnboarding: true, isOnboardingOpen: false, presentationMode: 'overlay' }, version: 0 }))
      localStorage.setItem('sikh-ui-locale', JSON.stringify({ state: { locale }, version: 0 }))
      localStorage.setItem('sikh-theme', JSON.stringify({ state: { dark, mode: dark ? 'dark' : 'light' }, version: 0 }))
      localStorage.setItem('sikh-language', JSON.stringify({ state: { fontSize: 34, meaningLanguage: 'none', showTransliteration: false }, version: 0 }))
      localStorage.setItem('naamras-reader-presentation', 'read')
    }, { locale, dark })
    const page = await context.newPage()
    const pageErrors = []
    const checks = []
    let indexNavigation
    page.on('pageerror', error => pageErrors.push(error.message))
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.locator('[data-page]').first().waitFor({ state: 'visible', timeout: 20_000 })
    if (surface !== 'home') await page.locator('[data-page="study"][data-ai-state="ready"]').waitFor({ state: 'visible', timeout: 30_000 })
    else await page.getByTestId('home-hukamnama-card').waitFor({ state: 'visible', timeout: 30_000 })
    await page.addStyleTag({ content: `html { font-size: ${textScale * 100}% !important; }` })
    await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))) })
    if (surface === 'length') {
      await page.getByTestId('study-reader-topbar').getByTestId('bani-length-control').click()
      await page.getByTestId('bani-length-sheet').waitFor({ state: 'visible' })
    } else if (surface === 'find') {
      await page.locator('.study-reader-section-trigger').click()
      await page.getByTestId('study-reader-sections-sheet').waitFor({ state: 'visible' })
      await page.getByRole('searchbox').fill(deterministic ? locale === 'en' ? 'satigur' : 'ਸਤਿਗੁਰ' : locale === 'en' ? 'naam' : 'ਨਾਮ')
      await page.locator('.bani-find__results button').first().waitFor({ state: 'visible' })
    } else if (surface === 'finish') await page.getByTestId('reader-finish-panel').scrollIntoViewIfNeeded()
    await page.addScriptTag({ content: axeSource })
    const layout = await page.evaluate(measureBaniReaderUi)
    const violations = await page.evaluate(async () => (await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'],
    })).violations.map(rule => ({ id: rule.id, impact: rule.impact, help: rule.help, targets: rule.nodes.map(node => node.target) })))
    const output = args.has('--output') ? path.resolve(args.get('--output')) : null
    if (output) {
      fs.mkdirSync(path.dirname(output), { recursive: true })
      await page.screenshot({ path: output.replace(/\.json$/u, '') + '.png', fullPage: surface === 'home' })
    }
    if (surface === 'find') {
      await page.locator('.bani-find__results button').first().click()
      await page.getByTestId('study-reader-sections-sheet').waitFor({ state: 'hidden' })
      await page.locator('[data-page="study"][data-ai-state="ready"]').waitFor({ state: 'visible' })
      checks.push('Find returns a matching line; selecting it closes the sheet and returns to the reader.')
    } else if (surface === 'length') {
      await page.getByTestId('bani-length-sheet').locator('input[type="radio"][value="short"]').check()
      await page.getByTestId('bani-length-sheet').locator('button[type="submit"]').click()
      await page.getByTestId('bani-length-sheet').waitFor({ state: 'hidden' })
      await page.waitForURL(current => current.searchParams.get('sgLength') === 'short')
      await page.locator('[data-page="study"][data-ai-state="ready"]').waitFor({ state: 'visible' })
      checks.push('Changing medium to short applies verified reading text and updates the route.')
    } else if (surface === 'home') {
      indexNavigation = await checkHomeNitnemIndex(page, layout, checks)
      await page.getByTestId('home-hero-primary-action').click()
      await page.locator('[data-page="study"][data-ai-state="ready"]').waitFor({ state: 'visible' })
      checks.push('The daily Hukamnama action opens a ready reader.')
    }
    fixtures?.assertNoUnexpectedRequests()
    assert.deepEqual(pageErrors, [], 'No unhandled browser exceptions.')
    const report = { deterministic, providerRequests: fixtures?.providerRequests, url, surface, locale, theme: dark ? 'dark' : 'light', textScale, checkedAt: new Date().toISOString(), checks, pageErrors, layout, indexNavigation, violations }
    if (output) fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`)
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
    if (layout.issues.length || violations.length || layout.rootFontPx < 15.9 * textScale) process.exitCode = 1
    await context.close()
  } finally { await browser.close() }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { process.stderr.write(`${error instanceof Error ? error.stack : error}\n`); process.exitCode = 1 })
}
