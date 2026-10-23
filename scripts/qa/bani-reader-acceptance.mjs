#!/usr/bin/env node
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

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
  const executablePath = [process.env.CHROME_EXECUTABLE,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ].find(candidate => candidate && fs.existsSync(candidate))
  if (!executablePath) throw new Error('Set CHROME_EXECUTABLE to an available Chromium executable.')
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
      colorScheme: dark ? 'dark' : 'light', reducedMotion: 'reduce' })
    await context.addInitScript(({ locale, dark }) => {
      sessionStorage.setItem('splash-shown', '1')
      localStorage.setItem('sikh-onboarding', JSON.stringify({ state: { hasCompletedOnboarding: true, isOnboardingOpen: false, presentationMode: 'overlay' }, version: 0 }))
      localStorage.setItem('sikh-ui-locale', JSON.stringify({ state: { locale }, version: 0 }))
      localStorage.setItem('sikh-theme', JSON.stringify({ state: { dark, mode: dark ? 'dark' : 'light' }, version: 0 }))
      localStorage.setItem('sikh-language', JSON.stringify({ state: { fontSize: 34, meaningLanguage: 'none', showTransliteration: false }, version: 0 }))
      localStorage.setItem('naamras-reader-presentation', 'read')
    }, { locale, dark })
    const page = await context.newPage()
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.locator('[data-page]').first().waitFor({ state: 'visible', timeout: 20_000 })
    if (surface !== 'home') await page.locator('[data-page="study"][data-ai-state="ready"]').waitFor({ state: 'visible', timeout: 30_000 })
    await page.addStyleTag({ content: `html { font-size: ${textScale * 100}% !important; }` })
    await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))) })
    if (surface === 'length') {
      await page.getByTestId('study-reader-topbar').getByTestId('bani-length-control').click()
      await page.getByTestId('bani-length-sheet').waitFor({ state: 'visible' })
    } else if (surface === 'find') {
      await page.locator('.study-reader-section-trigger').click()
      await page.getByTestId('study-reader-sections-sheet').waitFor({ state: 'visible' })
      await page.getByRole('searchbox').fill(locale === 'en' ? 'naam' : 'ਨਾਮ')
    } else if (surface === 'finish') await page.getByTestId('reader-finish-panel').scrollIntoViewIfNeeded()
    await page.addScriptTag({ content: axeSource })
    const layout = await page.evaluate(measureBaniReaderUi)
    const violations = await page.evaluate(async () => (await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'],
    })).violations.map(rule => ({ id: rule.id, impact: rule.impact, help: rule.help, targets: rule.nodes.map(node => node.target) })))
    const report = { url, surface, locale, theme: dark ? 'dark' : 'light', textScale, checkedAt: new Date().toISOString(), layout, violations }
    if (args.has('--output')) {
      const output = path.resolve(args.get('--output'))
      fs.mkdirSync(path.dirname(output), { recursive: true })
      fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`)
      await page.screenshot({ path: output.replace(/\.json$/u, '') + '.png', fullPage: surface === 'home' })
    }
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
    if (layout.issues.length || violations.length || layout.rootFontPx < 15.9 * textScale) process.exitCode = 1
    await context.close()
  } finally { await browser.close() }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { process.stderr.write(`${error instanceof Error ? error.stack : error}\n`); process.exitCode = 1 })
}
