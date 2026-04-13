#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { chromium, devices } from 'playwright-core'

const FIXED_APP_NOW = '2026-04-11T09:00:00.000Z'
const FIXED_APP_DATE = '2026-04-11'
const BASE_URL = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173'
const REPORT_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Toronto',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date())

const OUTPUT_ROOT = path.resolve('output/qa', REPORT_DATE)
const REPORT_PATH = path.resolve('docs/qa', `${REPORT_DATE}-ai-bug-sweep.md`)
const DESKTOP_VIEWPORT = { width: 1440, height: 980 }
const MOBILE_DEVICE = devices['iPhone 14'] ?? devices['iPhone 13']
const CHROME_CANDIDATES = [
  process.env.CHROME_EXECUTABLE,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
].filter(Boolean)

const GENERIC_FAILURE_PATTERNS = [
  /loading failed/i,
  /page error/i,
  /something went wrong/i,
  /learn repository request failed/i,
  /QA (?:fail|empty|slow) fault injected/i,
  /BaniDB .* error/i,
]

function sanitizeFileName(value) {
  return value.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function ensureDir(targetPath) {
  await fs.mkdir(targetPath, { recursive: true })
}

async function resolveChromeExecutable() {
  for (const candidate of CHROME_CANDIDATES) {
    if (candidate && await exists(candidate)) {
      return candidate
    }
  }

  throw new Error('No supported Chrome/Chromium executable was found. Set CHROME_EXECUTABLE to continue.')
}

async function readFirstCollectionId() {
  const manifestPath = path.resolve('public/data/learn/manifest.json')
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
  const collectionsPath = path.resolve('public', manifest.listPaths.collections.replace(/^\//, ''))
  const collections = JSON.parse(await fs.readFile(collectionsPath, 'utf8'))
  return collections[0]?.id ?? null
}

function getOnboardingState(mode = 'complete') {
  if (mode === 'first-run') {
    return {
      hasCompletedOnboarding: false,
      isOnboardingOpen: true,
      presentationMode: 'first-run',
      learningLevel: 'beginner',
      audience: 'adult',
      learningGoal: 'read',
    }
  }

  if (mode === 'overlay') {
    return {
      hasCompletedOnboarding: true,
      isOnboardingOpen: true,
      presentationMode: 'overlay',
      learningLevel: 'beginner',
      audience: 'adult',
      learningGoal: 'read',
    }
  }

  return {
    hasCompletedOnboarding: true,
    isOnboardingOpen: false,
    presentationMode: 'overlay',
    learningLevel: 'beginner',
    audience: 'adult',
    learningGoal: 'read',
  }
}

function createScenarioPath(pathname, qaControls) {
  if (!qaControls) return pathname

  const [basePath, existingQuery = ''] = pathname.split('?')
  const params = new URLSearchParams(existingQuery)

  if (qaControls.fail?.length) params.set('qaFail', qaControls.fail.join(','))
  if (qaControls.empty?.length) params.set('qaEmpty', qaControls.empty.join(','))
  if (qaControls.slow?.length) params.set('qaSlow', qaControls.slow.join(','))

  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

function getViewportConfig(mode) {
  if (mode === 'mobile' && MOBILE_DEVICE) {
    return {
      ...MOBILE_DEVICE,
      viewport: MOBILE_DEVICE.viewport,
    }
  }

  return {
    viewport: DESKTOP_VIEWPORT,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  }
}

function createStoragePayload(scenario) {
  return {
    onboarding: getOnboardingState(scenario.onboarding ?? 'complete'),
    qaControls: scenario.qaControls ?? null,
  }
}

async function startDevServer() {
  if (process.env.QA_SKIP_DEV_SERVER === '1') {
    return { process: null, logs: [] }
  }

  const logs = []
  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      FORCE_COLOR: '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout.on('data', chunk => {
    logs.push(chunk.toString())
  })
  child.stderr.on('data', chunk => {
    logs.push(chunk.toString())
  })

  await waitForServer(BASE_URL, child)
  return { process: child, logs }
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 45_000
  while (Date.now() < deadline) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) {
      throw new Error(`Dev server exited early with code ${child.exitCode}.`)
    }

    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Keep polling until the server is up.
    }

    await new Promise(resolve => setTimeout(resolve, 500))
  }

  throw new Error(`Timed out waiting for dev server at ${url}.`)
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2))
}

function createAssertionError(message) {
  const error = new Error(message)
  error.name = 'AssertionError'
  return error
}

async function ensureVisible(page, selector, description, timeout = 12_000) {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout })
  } catch {
    throw createAssertionError(`Expected ${description} (${selector}) to become visible.`)
  }
}

async function assertNoGenericFailureCopy(page) {
  const text = await page.locator('body').innerText().catch(() => '')
  for (const pattern of GENERIC_FAILURE_PATTERNS) {
    if (pattern.test(text)) {
      throw createAssertionError(`Unexpected failure copy matched ${pattern}.`)
    }
  }
}

function shouldRecordConsoleMessage(message) {
  const text = message.text()
  if (message.type() !== 'error') return false
  if (text === 'Failed to load resource: the server responded with a status of 401 ()') return false
  if (/vite connected|download the react devtools/i.test(text)) return false
  return true
}

function shouldRecordRequestFailure(request) {
  const url = request.url()
  if (/\/@vite\/client|__vite_ping|favicon\.ico/i.test(url)) return false
  return ['document', 'script', 'xhr', 'fetch'].includes(request.resourceType())
}

async function runScenario(browser, scenario) {
  const context = await browser.newContext(getViewportConfig(scenario.viewport))
  const storagePayload = createStoragePayload(scenario)

  await context.addInitScript(({ fixedNow, storage }) => {
    const applyState = () => {
      if (!window.localStorage || !window.sessionStorage) return
      window.localStorage.clear()
      window.sessionStorage.clear()
      window.sessionStorage.setItem('splash-shown', '1')
      window.localStorage.setItem('sikh-onboarding', JSON.stringify({
        state: storage.onboarding,
        version: 0,
      }))
      if (storage.qaControls) {
        window.localStorage.setItem('naamras:qa-controls', JSON.stringify(storage.qaControls))
      }
    }

    try {
      applyState()
    } catch {
      // Ignore storage access on non-http documents.
    }

    const fixedTimestamp = new Date(fixedNow).valueOf()
    const RealDate = Date
    class MockDate extends RealDate {
      constructor(...args) {
        if (args.length === 0) {
          super(fixedTimestamp)
        } else {
          super(...args)
        }
      }

      static now() {
        return fixedTimestamp
      }
    }

    window.Date = MockDate
  }, {
    fixedNow: FIXED_APP_NOW,
    storage: storagePayload,
  })

  const page = await context.newPage()
  const consoleErrors = []
  const pageErrors = []
  const requestFailures = []
  const notes = []

  page.on('console', message => {
    if (shouldRecordConsoleMessage(message)) {
      consoleErrors.push({
        type: message.type(),
        text: message.text(),
      })
    }
  })

  page.on('pageerror', error => {
    pageErrors.push(error.message)
  })

  page.on('requestfailed', request => {
    if (shouldRecordRequestFailure(request)) {
      requestFailures.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        failure: request.failure()?.errorText ?? 'unknown failure',
      })
    }
  })

  const scenarioPath = createScenarioPath(scenario.path, scenario.qaControls)
  const targetUrl = new URL(scenarioPath, BASE_URL).toString()

  let assertionError = null

  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.locator('[data-testid="splash-screen"]').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {})
    await scenario.run({ page, notes, baseUrl: BASE_URL })
    await assertNoGenericFailureCopy(page)
  } catch (error) {
    assertionError = error
  }

  const screenshotPath = path.join(OUTPUT_ROOT, `${sanitizeFileName(scenario.id)}.png`)
  const logPath = path.join(OUTPUT_ROOT, `${sanitizeFileName(scenario.id)}.json`)

  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {})
  await writeJson(logPath, {
    id: scenario.id,
    title: scenario.title,
    url: page.url(),
    consoleErrors,
    pageErrors,
    requestFailures,
    notes,
  })

  await context.close()

  const errors = []
  if (assertionError) {
    errors.push(assertionError instanceof Error ? assertionError.message : String(assertionError))
  }
  if (pageErrors.length) {
    errors.push(`Captured ${pageErrors.length} page error(s).`)
  }
  if (consoleErrors.length) {
    errors.push(`Captured ${consoleErrors.length} console error(s).`)
  }
  if (requestFailures.length) {
    errors.push(`Captured ${requestFailures.length} failed request(s).`)
  }

  return {
    id: scenario.id,
    title: scenario.title,
    status: errors.length === 0 ? 'passed' : 'failed',
    url: targetUrl,
    notes,
    errors,
    screenshotPath,
    logPath,
  }
}

function toReportLink(targetPath) {
  return path.relative(path.dirname(REPORT_PATH), targetPath).replaceAll(path.sep, '/')
}

function formatScenarioLine(result) {
  return `- ${result.status === 'passed' ? 'PASS' : 'FAIL'}: ${result.title}`
}

function buildReport(results, environment) {
  const failures = results.filter(result => result.status === 'failed')
  const lines = [
    '# NaamRas AI Bug Sweep',
    '',
    `Date: ${REPORT_DATE}`,
    '',
    'Environment:',
    `- Local dev server: ${BASE_URL}`,
    `- Fixed in-app clock: ${FIXED_APP_NOW}`,
    `- Browser: ${environment.browser}`,
    `- Build baseline: ${environment.buildStatus}`,
    `- Vitest baseline: ${environment.vitestStatus}`,
    '',
    'Scenario Summary:',
    ...results.map(formatScenarioLine),
    '',
  ]

  if (failures.length === 0) {
    lines.push('Findings:', '- No blocking issues were detected in this sweep.', '')
  } else {
    lines.push('Findings:', '')
    failures.forEach((failure, index) => {
      lines.push(`${index + 1}. ${failure.title}`)
      lines.push(`   - Route: \`${failure.url.replace(BASE_URL, '') || '/'}\``)
      lines.push(`   - Expected: ${failure.notes[0] ?? 'Expected the route to stay interactive and free of uncaught failures.'}`)
      lines.push(`   - Actual: ${failure.errors.join(' ')}`)
      lines.push(`   - Screenshot: [${path.basename(failure.screenshotPath)}](${toReportLink(failure.screenshotPath)})`)
      lines.push(`   - Log: [${path.basename(failure.logPath)}](${toReportLink(failure.logPath)})`)
      lines.push('')
    })
  }

  lines.push('Artifacts:')
  lines.push(`- Screenshots and logs: \`${OUTPUT_ROOT}\``)
  lines.push(`- Generated report: \`${REPORT_PATH}\``)
  lines.push('')

  return lines.join('\n')
}

async function main() {
  await ensureDir(OUTPUT_ROOT)

  const chromeExecutable = await resolveChromeExecutable()
  const collectionId = await readFirstCollectionId()
  if (!collectionId) {
    throw new Error('Could not resolve a Learn collection id for the QA route matrix.')
  }

  const scenarios = [
    {
      id: 'home-desktop',
      title: 'Home desktop route',
      viewport: 'desktop',
      path: '/',
      run: async ({ page, notes }) => {
        notes.push('Expected the Home route shell and guidance surface to render in a ready state.')
        await ensureVisible(page, '[data-page="home"][data-ai-state="ready"]', 'the Home page shell')
        await ensureVisible(page, '[data-ai-surface="home-guidance"]', 'the Home guidance surface')
      },
    },
    {
      id: 'home-search-failure',
      title: 'Home smart search degraded state',
      viewport: 'desktop',
      path: '/',
      qaControls: { fail: ['home-search'] },
      run: async ({ page, notes }) => {
        notes.push('Expected Home smart search to degrade cleanly without raw error text.')
        await ensureVisible(page, '[data-page="home"]', 'the Home page shell')
        await page.getByTestId('home-smart-search-input').fill('stress')
        await ensureVisible(page, '[data-testid="home-smart-search-results"][data-ai-state="degraded"][data-ai-error="home-search"]', 'the Home smart-search degraded state')
      },
    },
    {
      id: 'read-desktop',
      title: 'Read desktop route',
      viewport: 'desktop',
      path: '/banis',
      run: async ({ page, notes }) => {
        notes.push('Expected the Read route shell and quick-find surface to load.')
        await ensureVisible(page, '[data-page="banis"][data-ai-state="ready"]', 'the Read page shell')
        await ensureVisible(page, '[data-ai-surface="read-smart-search"]', 'the Read smart-search surface')
      },
    },
    {
      id: 'read-search-failure',
      title: 'Read smart search degraded state',
      viewport: 'desktop',
      path: '/banis',
      qaControls: { fail: ['read-search'] },
      run: async ({ page, notes }) => {
        notes.push('Expected Read smart search to surface a degraded state instead of pretending the result set is empty.')
        await ensureVisible(page, '[data-page="banis"]', 'the Read page shell')
        await page.locator('#banis-search').fill('waheguru')
        await ensureVisible(page, '[data-ai-surface="read-smart-search"][data-ai-state="degraded"][data-ai-error="read-search"]', 'the Read smart-search degraded state')
      },
    },
    {
      id: 'read-search-empty',
      title: 'Read smart search empty state',
      viewport: 'desktop',
      path: '/banis',
      qaControls: { empty: ['read-search'] },
      run: async ({ page, notes }) => {
        notes.push('Expected Read smart search to render a deterministic empty state when the search backend returns no results.')
        await ensureVisible(page, '[data-page="banis"]', 'the Read page shell')
        await page.locator('#banis-search').fill('waheguru')
        await ensureVisible(page, '[data-ai-surface="read-smart-search"][data-ai-state="empty"]', 'the Read smart-search empty state')
      },
    },
    {
      id: 'study-hukamnama',
      title: 'Study Hukamnama route',
      viewport: 'desktop',
      path: '/study?hukamnamaDate=2026-04-05',
      run: async ({ page, notes }) => {
        notes.push('Expected the Hukamnama reader to load into a ready study surface.')
        await ensureVisible(page, '[data-page="study"][data-ai-flow="hukamnama"][data-ai-state="ready"]', 'the Hukamnama study surface')
      },
    },
    {
      id: 'study-hukamnama-slow',
      title: 'Study Hukamnama slow-load state',
      viewport: 'desktop',
      path: '/study?hukamnamaDate=2026-04-05',
      qaControls: { slow: ['study-hukamnama'] },
      run: async ({ page, notes }) => {
        notes.push('Expected the Hukamnama reader to show a loading state before recovering to ready.')
        await ensureVisible(page, '[data-ai-surface="study-reader"][data-ai-state="loading"][data-ai-flow="hukamnama"]', 'the Hukamnama loading state')
        await ensureVisible(page, '[data-page="study"][data-ai-flow="hukamnama"][data-ai-state="ready"]', 'the Hukamnama ready state', 20_000)
      },
    },
    {
      id: 'study-ang',
      title: 'Study ang route',
      viewport: 'desktop',
      path: '/study?source=G&ang=183',
      run: async ({ page, notes }) => {
        notes.push('Expected the ang reader to load in a ready study surface.')
        await ensureVisible(page, '[data-page="study"][data-ai-flow="ang"][data-ai-state="ready"]', 'the ang study surface')
      },
    },
    {
      id: 'study-ang-failure',
      title: 'Study ang degraded state',
      viewport: 'desktop',
      path: '/study?source=G&ang=183',
      qaControls: { fail: ['study-ang'] },
      run: async ({ page, notes }) => {
        notes.push('Expected the ang reader to surface a degraded card instead of a dead-end page error.')
        await ensureVisible(page, '[data-ai-surface="study-reader"][data-ai-state="degraded"]', 'the ang degraded state')
      },
    },
    {
      id: 'study-exact-word-popover',
      title: 'Study exact-result word popover flow',
      viewport: 'desktop',
      path: '/study?shabadId=544&verseId=7718',
      run: async ({ page, notes }) => {
        notes.push('Expected a word tap inside the exact-result reader to open the word popover without routing away.')
        await ensureVisible(page, '[data-page="study"][data-ai-flow="exact-shabad"][data-ai-state="ready"]', 'the exact-result study surface')
        await page.locator('[data-testid="study-line"]').first().locator('button[lang]').first().click()
        await ensureVisible(page, '[data-ai-surface="word-popover"]', 'the word popover')
      },
    },
    {
      id: 'study-mahankosh-failure',
      title: 'Study word popover Mahankosh degraded state',
      viewport: 'desktop',
      path: '/study?shabadId=544&verseId=7718',
      qaControls: { fail: ['mahankosh'] },
      run: async ({ page, notes }) => {
        notes.push('Expected Mahankosh lookup failures to stay inside the word popover and render a degraded sub-surface.')
        await ensureVisible(page, '[data-page="study"][data-ai-flow="exact-shabad"][data-ai-state="ready"]', 'the exact-result study surface')
        await page.locator('[data-testid="study-line"]').first().locator('button[lang]').first().click()
        await ensureVisible(page, '[data-ai-surface="mahankosh-popover"][data-ai-state="degraded"]', 'the Mahankosh degraded state')
      },
    },
    {
      id: 'learn-hub',
      title: 'Learn hub route',
      viewport: 'desktop',
      path: '/learn',
      run: async ({ page, notes }) => {
        notes.push('Expected the Learn hub route shell to load in a ready state.')
        await ensureVisible(page, '[data-page="learn"][data-ai-surface="learn-hub"][data-ai-state="ready"]', 'the Learn hub shell')
      },
    },
    {
      id: 'learn-hub-failure',
      title: 'Learn hub degraded state',
      viewport: 'desktop',
      path: '/learn',
      qaControls: { fail: ['learn-catalog'] },
      run: async ({ page, notes }) => {
        notes.push('Expected Learn catalog failures to show the shared degraded surface.')
        await ensureVisible(page, '[data-testid="page-learn-error"]', 'the Learn hub degraded state')
      },
    },
    {
      id: 'learn-topic-detail',
      title: 'Learn topic detail route',
      viewport: 'desktop',
      path: '/learn/topics/topic-anxiety?from=topics',
      run: async ({ page, notes }) => {
        notes.push('Expected the topic detail shell to render in a ready state.')
        await ensureVisible(page, '[data-page="learn-detail"][data-ai-surface="learn-detail-shell"][data-ai-state="ready"]', 'the Learn detail shell')
      },
    },
    {
      id: 'learn-topic-detail-empty',
      title: 'Learn topic detail empty state',
      viewport: 'desktop',
      path: '/learn/topics/topic-qa-empty?from=topics',
      qaControls: { empty: ['learn-detail'] },
      run: async ({ page, notes }) => {
        notes.push('Expected an empty Learn detail lookup to render the shared empty state.')
        await ensureVisible(page, '[data-ai-surface="learn-topic-detail"][data-ai-state="empty"]', 'the Learn topic empty state')
      },
    },
    {
      id: 'learn-shabad-detail',
      title: 'Learn shabad detail route',
      viewport: 'desktop',
      path: '/learn/shabads/shabad-hukam-inside-everything?from=shabads',
      run: async ({ page, notes }) => {
        notes.push('Expected the shabad detail shell to render in a ready state.')
        await ensureVisible(page, '[data-page="learn-detail"][data-ai-surface="learn-detail-shell"][data-ai-state="ready"]', 'the Learn shabad detail shell')
      },
    },
    {
      id: 'learn-guidance-detail',
      title: 'Learn guidance detail route',
      viewport: 'desktop',
      path: '/learn/guidance/guidance-hukam?from=today',
      run: async ({ page, notes }) => {
        notes.push('Expected the guidance detail shell to render in a ready state.')
        await ensureVisible(page, '[data-page="learn-detail"][data-ai-surface="learn-detail-shell"][data-ai-state="ready"]', 'the Learn guidance detail shell')
      },
    },
    {
      id: 'learn-collection-detail',
      title: 'Learn collection detail route',
      viewport: 'desktop',
      path: `/learn/collections/${collectionId}?from=today`,
      run: async ({ page, notes }) => {
        notes.push('Expected the collection detail shell to render in a ready state.')
        await ensureVisible(page, '[data-page="learn-detail"][data-ai-surface="learn-detail-shell"][data-ai-state="ready"]', 'the Learn collection detail shell')
      },
    },
    {
      id: 'library-desktop',
      title: 'Library desktop route',
      viewport: 'desktop',
      path: '/library',
      run: async ({ page, notes }) => {
        notes.push('Expected the Library route shell to load without route-level failures.')
        await ensureVisible(page, '[data-page="library"][data-ai-state="ready"]', 'the Library page shell')
      },
    },
    {
      id: 'more-desktop',
      title: 'More desktop route',
      viewport: 'desktop',
      path: '/more',
      run: async ({ page, notes }) => {
        notes.push('Expected the More route and cloud-sync panel to render without route-level failures.')
        await ensureVisible(page, '[data-page="more"][data-ai-state="ready"]', 'the More page shell')
        await ensureVisible(page, '[data-ai-surface="cloud-sync-panel"]', 'the cloud-sync panel')
      },
    },
    {
      id: 'more-bootstrap-failure',
      title: 'More cloud-sync bootstrap degraded state',
      viewport: 'desktop',
      path: '/more',
      qaControls: { fail: ['insforge-bootstrap'] },
      run: async ({ page, notes }) => {
        notes.push('Expected InsForge bootstrap failures to degrade the cloud-sync panel instead of crashing the route.')
        await ensureVisible(page, '[data-page="more"]', 'the More page shell')
        await ensureVisible(page, '[data-ai-surface="cloud-sync-panel"][data-ai-state="degraded"][data-ai-error="insforge-bootstrap"]', 'the cloud-sync degraded state')
      },
    },
    {
      id: 'vocab-desktop',
      title: 'Vocab desktop route',
      viewport: 'desktop',
      path: '/vocab',
      run: async ({ page, notes }) => {
        notes.push('Expected the Vocab route shell to render its empty-state variant cleanly.')
        await ensureVisible(page, '[data-page="vocab"]', 'the Vocab page shell')
      },
    },
    {
      id: 'onboarding-first-run-mobile',
      title: 'Onboarding first-run mobile route',
      viewport: 'mobile',
      onboarding: 'first-run',
      path: '/',
      run: async ({ page, notes }) => {
        notes.push('Expected first-run onboarding to render with its dedicated route shell and auth surface.')
        await ensureVisible(page, '[data-page="onboarding"][data-ai-surface="onboarding"][data-ai-state="ready"]', 'the first-run onboarding shell')
        await page.getByRole('button', { name: /^Continue$/i }).click()
        await ensureVisible(page, '[data-ai-surface="onboarding-auth"]', 'the onboarding auth surface')
      },
    },
    {
      id: 'onboarding-overlay-mobile',
      title: 'Onboarding overlay mobile route',
      viewport: 'mobile',
      onboarding: 'overlay',
      path: '/',
      run: async ({ page, notes }) => {
        notes.push('Expected overlay onboarding to render with its overlay route shell and auth surface.')
        await ensureVisible(page, '[data-page="onboarding-overlay"][data-ai-surface="onboarding-overlay"][data-ai-state="ready"]', 'the onboarding overlay shell')
        await page.getByRole('button', { name: /^Continue$/i }).click()
        await ensureVisible(page, '[data-ai-surface="onboarding-auth"]', 'the onboarding auth surface')
      },
    },
    {
      id: 'mobile-nav-flow',
      title: 'Persistent mobile navigation flow',
      viewport: 'mobile',
      path: '/',
      run: async ({ page, notes }) => {
        notes.push('Expected the persistent mobile nav to move between Home, Read, and More without broken primary actions.')
        await ensureVisible(page, '[data-page="home"]', 'the Home page shell')
        await page.locator('[data-ai-action="nav-read"]').click()
        await ensureVisible(page, '[data-page="banis"]', 'the Read page shell after nav')
        await page.locator('[data-ai-action="nav-more"]').click()
        await ensureVisible(page, '[data-page="more"]', 'the More page shell after nav')
      },
    },
  ]

  const server = await startDevServer()
  const browser = await chromium.launch({
    executablePath: chromeExecutable,
    headless: process.env.QA_HEADLESS !== '0',
  })

  const results = []
  let buildStatus = 'not run by sweep'
  let vitestStatus = 'not run by sweep'

  try {
    for (const scenario of scenarios) {
      const result = await runScenario(browser, scenario)
      results.push(result)
      const statusLabel = result.status === 'passed' ? 'PASS' : 'FAIL'
      console.log(`[${statusLabel}] ${scenario.title}`)
    }
  } finally {
    await browser.close()
    if (server.process) {
      server.process.kill('SIGTERM')
    }
    const serverLogPath = path.join(OUTPUT_ROOT, 'dev-server.log')
    await fs.writeFile(serverLogPath, server.logs.join(''))
  }

  buildStatus = 'run before sweep'
  vitestStatus = 'run before sweep'

  const report = buildReport(results, {
    browser: path.basename(chromeExecutable),
    buildStatus,
    vitestStatus,
  })
  await fs.writeFile(REPORT_PATH, report)

  const failedCount = results.filter(result => result.status === 'failed').length
  console.log(`Report written to ${REPORT_PATH}`)
  if (failedCount > 0) {
    console.error(`${failedCount} scenario(s) reported issues.`)
    process.exitCode = 1
  }
}

main().catch(async error => {
  await ensureDir(OUTPUT_ROOT).catch(() => {})
  const failurePath = path.join(OUTPUT_ROOT, 'runner-error.txt')
  await fs.writeFile(failurePath, error instanceof Error ? error.stack ?? error.message : String(error))
  console.error(error)
  process.exitCode = 1
})
