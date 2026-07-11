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
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
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
  const child = spawn('npm', ['run', 'dev', '--', '--host', serverUrl.hostname, '--port', port, '--strictPort'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      FORCE_COLOR: '0',
      VITE_NAAMRAS_BANIDB_MOCK: 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
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
  return page.evaluate(async tags => {
    const result = await window.axe.run(document, {
      runOnly: { type: 'tag', values: tags },
      resultTypes: ['violations'],
    })

    return result.violations.map(rule => ({
      id: rule.id,
      impact: rule.impact,
      help: rule.help,
      nodeCount: rule.nodes.length,
      targets: rule.nodes.slice(0, 8).map(node => node.target.join(' ')),
    }))
  }, WCAG_TAGS)
}

async function main() {
  const server = await startDevServer()
  let browser = null
  const failures = []

  try {
    browser = await chromium.launch({
      executablePath: resolveChromeExecutable(),
      headless: process.env.QA_HEADLESS !== '0',
    })

    for (const mode of MODES) {
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

      for (const route of ROUTES) {
        const page = await context.newPage()

        try {
          await preparePage(page, route)
          const violations = await scanPage(page)
          if (violations.length > 0) failures.push({ mode: mode.id, route, violations })
        } finally {
          await page.close()
        }
      }

      await context.close()
    }
  } finally {
    await browser?.close()
    await stopDevServer(server)
  }

  if (failures.length === 0) {
    console.log(`Accessibility sweep passed ${ROUTES.length * MODES.length} WCAG 2.2 AA route checks.`)
    return
  }

  console.error(`${failures.length} accessibility route check(s) failed:`)
  for (const failure of failures) {
    console.error(`- ${failure.mode} ${failure.route}`)
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
