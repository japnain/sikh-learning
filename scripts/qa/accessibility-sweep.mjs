#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { once } from 'node:events'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import process from 'node:process'
import { chromium } from 'playwright-core'

const require = createRequire(import.meta.url)
const AXE_SOURCE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const BASE_URL = process.env.QA_A11Y_BASE_URL ?? 'http://127.0.0.1:4186'
const SERVER_MODE = process.env.QA_A11Y_SERVER_MODE === 'preview' ? 'preview' : 'dev'
const SCAN_TIMEOUT_MS = Number(process.env.QA_A11Y_SCAN_TIMEOUT_MS) || 45_000
const SWEEP_SCOPE = process.env.QA_A11Y_SCOPE ?? 'all'
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const HUKAMNAMA_SHARE_ROUTE = '/study?hukamnamaDate=2026-04-05'
const ROUTES = [
  '/',
  '/banis',
  '/study?shabadId=544&verseId=7718',
  '/study?hukamnamaDate=2026-04-05',
  '/study?source=G&ang=183',
  '/library',
  '/library/panth-prakash-english',
  '/library/panth-prakash-english/chapters/episode-001-the-episode-about-the-origin-of-the-khalsa',
  '/nitnem/customize',
  '/banis/amrit-keertan',
  '/banis/amrit-keertan/1',
  '/banis/rehat',
  '/banis/rehat/1',
  '/vocab',
  '/more',
  '/support',
  '/privacy',
]
const MODES = [
  { id: 'phone-light', viewport: { width: 390, height: 844 }, dark: false },
  { id: 'desktop-light', viewport: { width: 1440, height: 900 }, dark: false },
  { id: 'tablet-dark', viewport: { width: 834, height: 1112 }, dark: true },
]
const SHARE_COMPOSER_MODES = [
  { id: 'share-phone-light', viewport: { width: 390, height: 844 }, dark: false, textScale: 1 },
  { id: 'share-phone-dark', viewport: { width: 390, height: 844 }, dark: true, textScale: 1 },
  { id: 'share-reflow-200', viewport: { width: 320, height: 568 }, dark: false, textScale: 2 },
]
const CHROME_CANDIDATES = [
  process.env.CHROME_EXECUTABLE,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)

function delay(duration) {
  return new Promise(resolve => setTimeout(resolve, duration))
}

function resolveChromeExecutable() {
  const executable = CHROME_CANDIDATES.find(candidate => fs.existsSync(candidate))
  if (!executable) {
    throw new Error('No supported Chrome/Chromium executable was found. Set CHROME_EXECUTABLE to continue.')
  }
  return executable
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 45_000

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Accessibility dev server exited early with code ${child.exitCode}.`)
    }

    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Keep polling until Vite is ready.
    }

    await delay(400)
  }

  throw new Error(`Timed out waiting for accessibility dev server at ${url}.`)
}

async function startDevServer() {
  if (process.env.QA_A11Y_SKIP_DEV_SERVER === '1') return null

  const serverUrl = new URL(BASE_URL)
  const port = serverUrl.port || (serverUrl.protocol === 'https:' ? '443' : '80')
  const child = spawn('npm', ['run', SERVER_MODE, '--', '--host', serverUrl.hostname, '--port', port, '--strictPort'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      FORCE_COLOR: '0',
      VITE_NAAMRAS_BANIDB_MOCK: 'true',
    },
    stdio: 'ignore',
  })

  await waitForServer(BASE_URL, child)
  return child
}

async function stopDevServer(child) {
  if (!child || child.exitCode !== null) return

  child.kill('SIGTERM')
  await Promise.race([once(child, 'exit'), delay(3_000)])
  if (child.exitCode === null) child.kill('SIGKILL')
}

async function preparePage(page, route) {
  await page.goto(new URL(route, BASE_URL).toString(), {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })
  await page.locator('[data-testid="route-fallback"]').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {})

  if (route.startsWith('/study')) {
    await page.locator('[data-page="study"][data-ai-state="ready"]').waitFor({ state: 'visible', timeout: 15_000 })
  } else {
    await page.locator('[data-page]').first().waitFor({ state: 'visible', timeout: 10_000 })
  }

  await page.waitForTimeout(300)
  await page.addScriptTag({ content: AXE_SOURCE })
}

async function scanPage(page) {
  return page.evaluate(async ({ tags, timeoutMs }) => {
    let timeoutId
    const timeout = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error(`Axe scan exceeded ${timeoutMs}ms.`)), timeoutMs)
    })

    const result = await Promise.race([
      window.axe.run(document, {
        runOnly: { type: 'tag', values: tags },
        resultTypes: ['violations'],
      }),
      timeout,
    ]).finally(() => window.clearTimeout(timeoutId))

    return result.violations.map(rule => ({
      id: rule.id,
      impact: rule.impact,
      help: rule.help,
      nodeCount: rule.nodes.length,
      targets: rule.nodes.slice(0, 8).map(node => node.target.join(' ')),
    }))
  }, { tags: WCAG_TAGS, timeoutMs: SCAN_TIMEOUT_MS })
}

async function createAuditContext(browser, mode) {
  const context = await browser.newContext({
    viewport: mode.viewport,
    colorScheme: mode.dark ? 'dark' : 'light',
    reducedMotion: 'reduce',
  })

  await context.addInitScript(({ dark }) => {
    localStorage.clear()
    sessionStorage.clear()
    sessionStorage.setItem('splash-shown', '1')
    localStorage.setItem('sikh-onboarding', JSON.stringify({
      state: {
        hasCompletedOnboarding: true,
        isOnboardingOpen: false,
        presentationMode: 'overlay',
        learningLevel: 'beginner',
        audience: 'adult',
        learningGoal: 'read',
      },
      version: 0,
    }))
    localStorage.setItem('sikh-theme', JSON.stringify({ state: { dark }, version: 0 }))
  }, { dark: mode.dark })

  return context
}

async function scanMode(browser, mode) {
  const failures = []
  const context = await createAuditContext(browser, mode)
  const page = await context.newPage()

  try {
    for (const route of ROUTES) {
      const startedAt = Date.now()

      await preparePage(page, route)
      const violations = await scanPage(page)
      if (violations.length > 0) failures.push({ mode: mode.id, route, violations })

      const durationSeconds = ((Date.now() - startedAt) / 1000).toFixed(1)
      console.log(`[a11y] ${mode.id} ${route} (${durationSeconds}s)`)
    }
  } finally {
    await page.close()
    await context.close()
  }

  return failures
}

function formatFailure(error) {
  return error instanceof Error ? error.message : String(error)
}

async function waitForButtonEnabled(page, locator, label) {
  const element = await locator.elementHandle()
  if (!element) throw new Error(`${label} did not render.`)

  try {
    await page.waitForFunction(
      button => button instanceof HTMLButtonElement && !button.disabled,
      element,
      { timeout: 20_000 }
    )
  } catch {
    throw new Error(`${label} did not become enabled after the share image finished rendering.`)
  } finally {
    await element.dispose()
  }
}

async function assertActionableControl(locator, label, viewport) {
  if (!await locator.isVisible()) throw new Error(`${label} is not visible.`)
  if (!await locator.isEnabled()) throw new Error(`${label} is not enabled.`)

  // WCAG reflow permits vertical scrolling. Bring each action into view first so
  // this catches controls that cannot be reached, rather than controls that are
  // simply below the initial fold at 200% text.
  await locator.scrollIntoViewIfNeeded()

  const box = await locator.boundingBox()
  if (
    !box
    || box.width < 1
    || box.height < 1
    || box.x < -1
    || box.y < -1
    || box.x + box.width > viewport.width + 1
    || box.y + box.height > viewport.height + 1
  ) {
    const geometry = box
      ? `x=${box.x.toFixed(1)}, y=${box.y.toFixed(1)}, width=${box.width.toFixed(1)}, height=${box.height.toFixed(1)}`
      : 'no rendered box'
    throw new Error(`${label} could not be brought inside the ${viewport.width}x${viewport.height} viewport (${geometry}).`)
  }

  await locator.click({ trial: true })
}

async function assertFocusReturnedToStudyShare(page) {
  try {
    await page.waitForFunction(
      () => document.activeElement?.getAttribute('data-a11y-focus-return') === 'study-share',
      undefined,
      { timeout: 2_000 }
    )
  } catch {
    const activeElement = await page.evaluate(() => {
      const active = document.activeElement
      if (!(active instanceof HTMLElement)) return 'none'
      const name = active.getAttribute('aria-label') || active.textContent?.trim() || ''
      const identity = [active.tagName.toLowerCase(), active.id ? `#${active.id}` : '', active.className ? `.${String(active.className).trim().replace(/\s+/g, '.')}` : ''].join('')
      return name ? `${identity} (${name.slice(0, 80)})` : identity
    })
    throw new Error(`focus returned to ${activeElement || 'an unidentified element'} instead of the exact Study share trigger.`)
  }
}

async function assertNoHorizontalOverflow(page) {
  const measurements = await page.evaluate(() => {
    const root = document.documentElement
    const body = document.body
    const dialog = document.querySelector('[data-testid="share-highlight-sheet"]')
    const scrollRegion = dialog?.querySelector('.share-highlight__scroll')
    if (!(dialog instanceof HTMLElement)) return null

    const dialogRect = dialog.getBoundingClientRect()
    return {
      viewportWidth: root.clientWidth,
      documentWidth: Math.max(root.scrollWidth, body.scrollWidth),
      dialogLeft: dialogRect.left,
      dialogRight: dialogRect.right,
      scrollClientWidth: scrollRegion instanceof HTMLElement ? scrollRegion.clientWidth : null,
      scrollWidth: scrollRegion instanceof HTMLElement ? scrollRegion.scrollWidth : null,
    }
  })

  if (!measurements) throw new Error('The share composer dialog was not available for reflow checks.')
  if (measurements.documentWidth > measurements.viewportWidth + 1) {
    throw new Error(
      `The share composer causes document-level horizontal overflow (${measurements.documentWidth}px > ${measurements.viewportWidth}px).`
    )
  }
  if (measurements.dialogLeft < -1 || measurements.dialogRight > measurements.viewportWidth + 1) {
    throw new Error(
      `The share composer escapes the viewport (${measurements.dialogLeft.toFixed(1)}px to ${measurements.dialogRight.toFixed(1)}px).`
    )
  }
  if (
    measurements.scrollClientWidth !== null
    && measurements.scrollWidth !== null
    && measurements.scrollWidth > measurements.scrollClientWidth + 1
  ) {
    throw new Error(
      `The share composer content has unintended horizontal overflow (${measurements.scrollWidth}px > ${measurements.scrollClientWidth}px).`
    )
  }
}

async function scanShareComposerMode(browser, mode) {
  const failures = []
  const checkErrors = []
  let violations = []
  const context = await createAuditContext(browser, mode)
  const page = await context.newPage()
  const startedAt = Date.now()
  const recordCheck = async (label, check) => {
    try {
      await check()
    } catch (error) {
      checkErrors.push(`${label}: ${formatFailure(error)}`)
    }
  }

  try {
    await preparePage(page, HUKAMNAMA_SHARE_ROUTE)

    if (mode.textScale === 2) {
      await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      const rootFontSize = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).fontSize))
      if (rootFontSize < 31.5) throw new Error(`The 200% reflow mode resolved to only ${rootFontSize}px text.`)
    }

    const reducedMotion = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
    if (!reducedMotion) throw new Error('The share composer was not tested with reduced motion enabled.')

    const shareTrigger = page.locator('[data-ai-action="study-share"]')
    await shareTrigger.waitFor({ state: 'visible', timeout: 15_000 })
    await shareTrigger.evaluate(element => element.setAttribute('data-a11y-focus-return', 'study-share'))
    await shareTrigger.click()

    const dialog = page.getByRole('dialog', { name: 'Share highlight' })
    await dialog.waitFor({ state: 'visible', timeout: 15_000 })
    const closeButton = dialog.getByRole('button', { name: 'Close share image', exact: true })
    const shareButton = dialog.getByRole('button', { name: 'Share image', exact: true })
    const saveButton = dialog.getByRole('button', { name: /^(?:Save|Download) image$/ })
    const copyButton = dialog.getByRole('button', { name: /^Copy(?: full)? text$/ })

    await recordCheck('Share readiness', () => waitForButtonEnabled(page, shareButton, 'Share image'))
    await recordCheck('Save readiness', () => waitForButtonEnabled(page, saveButton, 'Save image control'))
    await recordCheck('Horizontal reflow', () => assertNoHorizontalOverflow(page))
    await recordCheck('Close action', () => assertActionableControl(closeButton, 'Close share image', mode.viewport))
    await recordCheck('Share action', () => assertActionableControl(shareButton, 'Share image', mode.viewport))
    await recordCheck('Save action', () => assertActionableControl(saveButton, 'Save image control', mode.viewport))
    await recordCheck('Copy action', () => assertActionableControl(copyButton, 'Copy text control', mode.viewport))

    await recordCheck('Open-dialog axe scan', async () => {
      violations = await scanPage(page)
    })

    await page.keyboard.press('Escape')
    await recordCheck('Escape close', () => dialog.waitFor({ state: 'hidden', timeout: 10_000 }))
    await recordCheck('Escape focus return', () => assertFocusReturnedToStudyShare(page))
  } catch (error) {
    checkErrors.push(`Composer setup: ${formatFailure(error)}`)
  } finally {
    const durationSeconds = ((Date.now() - startedAt) / 1000).toFixed(1)
    console.log(`[a11y] ${mode.id} ${HUKAMNAMA_SHARE_ROUTE}#share-composer (${durationSeconds}s)`)
    await page.close()
    await context.close()
  }

  if (checkErrors.length > 0 || violations.length > 0) {
    failures.push({
      mode: mode.id,
      route: `${HUKAMNAMA_SHARE_ROUTE}#share-composer`,
      error: checkErrors.join('\n  '),
      violations,
    })
  }

  return failures
}

async function main() {
  if (!['all', 'routes', 'share-composer'].includes(SWEEP_SCOPE)) {
    throw new Error('QA_A11Y_SCOPE must be one of: all, routes, share-composer.')
  }

  const server = await startDevServer()
  let browser = null
  const failures = []

  try {
    browser = await chromium.launch({
      executablePath: resolveChromeExecutable(),
      headless: process.env.QA_HEADLESS !== '0',
    })

    const requestedConcurrency = Number(process.env.QA_A11Y_CONCURRENCY) || 2

    if (SWEEP_SCOPE !== 'share-composer') {
      const concurrency = Math.max(1, Math.min(requestedConcurrency, MODES.length))
      const modeQueue = [...MODES]
      const modeFailures = await Promise.all(Array.from({ length: concurrency }, async () => {
        const workerFailures = []

        while (modeQueue.length > 0) {
          const mode = modeQueue.shift()
          if (!mode) break
          workerFailures.push(...await scanMode(browser, mode))
        }

        return workerFailures
      }))

      failures.push(...modeFailures.flat())
    }

    if (SWEEP_SCOPE !== 'routes') {
      const concurrency = Math.max(1, Math.min(requestedConcurrency, SHARE_COMPOSER_MODES.length))
      const modeQueue = [...SHARE_COMPOSER_MODES]
      const composerFailures = await Promise.all(Array.from({ length: concurrency }, async () => {
        const workerFailures = []

        while (modeQueue.length > 0) {
          const mode = modeQueue.shift()
          if (!mode) break
          workerFailures.push(...await scanShareComposerMode(browser, mode))
        }

        return workerFailures
      }))

      failures.push(...composerFailures.flat())
    }
  } finally {
    await browser?.close()
    await stopDevServer(server)
  }

  if (failures.length === 0) {
    const routeChecks = SWEEP_SCOPE === 'share-composer' ? 0 : ROUTES.length * MODES.length
    const composerChecks = SWEEP_SCOPE === 'routes' ? 0 : SHARE_COMPOSER_MODES.length
    console.log(
      `Accessibility sweep passed ${routeChecks} WCAG 2.2 AA route checks and ${composerChecks} open Hukamnama share-composer checks.`
    )
    return
  }

  console.error(`${failures.length} accessibility check(s) failed:`)
  for (const failure of failures) {
    console.error(`- ${failure.mode} ${failure.route}`)
    if (failure.error) console.error(`  ${failure.error}`)
    for (const violation of failure.violations) {
      console.error(`  ${violation.id} (${violation.impact ?? 'unknown'}): ${violation.nodeCount} node(s) - ${violation.help}`)
      for (const target of violation.targets) console.error(`    ${target}`)
    }
  }
  process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error))
  process.exitCode = 1
})
