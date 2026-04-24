#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { chromium, devices } from 'playwright-core'

const FIXED_APP_NOW = '2026-04-11T09:00:00.000Z'
const FIXED_APP_DATE = '2026-04-11'
const BASE_URL = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173'
const QA_INSFORGE_URL = 'https://naamras-qa.insforge.app'
const QA_INSFORGE_FUNCTIONS_URL = 'https://naamras-qa.functions.insforge.app'
const QA_BANIDB_PROXY_URL = `${QA_INSFORGE_FUNCTIONS_URL}/banidb-proxy`
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

function buildSource(id, english, pageNo = null) {
  return { id, sourceId: id, english, pageNo }
}

function buildRaag(english, raagId = 1) {
  return { raagId, english }
}

function buildWriter(english, writerId = 1) {
  return { writerId, english }
}

function createTranslation(english, gurmukhi = english) {
  return {
    en: {
      bdb: english,
      ms: english,
      ssk: english,
    },
    hi: { ss: english },
    pu: { ss: { unicode: gurmukhi }, ft: { unicode: gurmukhi } },
  }
}

function createScriptureVerse({
  verseId,
  shabadId,
  text,
  pageNo,
  translation,
  transliteration = 'ik oa(n)kaar satigur prasaadh',
  source = 'G',
}) {
  return {
    verseId,
    shabadId,
    verse: { unicode: text },
    larivaar: { unicode: text.replace(/\s+/g, '') },
    transliteration: { english: transliteration },
    translation: createTranslation(translation, text),
    pageNo,
    source: buildSource(source, source === 'D' ? 'Dasam Granth' : 'Sri Guru Granth Sahib Ji', pageNo),
    raag: buildRaag(source === 'D' ? 'Dasam Bani' : 'Raag Asa', source === 'D' ? 201 : 31),
    writer: buildWriter(source === 'D' ? 'Guru Gobind Singh Ji' : 'Guru Arjan Dev Ji', source === 'D' ? 701 : 501),
  }
}

function createQaShabadResponse(shabadId = 544, pageNo = 183) {
  return {
    shabadInfo: {
      shabadId,
      pageNo,
      source: { sourceId: 'G', english: 'Sri Guru Granth Sahib Ji', pageNo },
      raag: { english: 'Raag Asa', raagId: 31 },
      writer: { english: 'Guru Arjan Dev Ji', writerId: 501 },
    },
    verses: [
      {
        ...createScriptureVerse({
          verseId: 7718,
          shabadId,
          text: 'ੴ ਸਤਿ ਨਾਮੁ',
          pageNo,
          translation: 'One Creator, the Name is Truth.',
        }),
        words: [
          {
            word: { unicode: 'ੴ' },
            transliteration: { english: 'ikOankaar' },
            translation: {
              en: { bdb: 'One Universal Creator' },
              hi: { ss: 'एक ओंकार' },
              pu: { ss: { unicode: 'ਇੱਕ ਅਕਾਲ ਪੁਰਖ' }, ft: { unicode: 'ਇਕ ਅਕਾਲ ਪੁਰਖ' } },
            },
          },
          {
            word: { unicode: 'ਸਤਿ' },
            transliteration: { english: 'sat' },
            translation: {
              en: { bdb: 'Truth' },
              hi: { ss: 'सत्य' },
              pu: { ss: { unicode: 'ਸੱਚ' }, ft: { unicode: 'ਸਤਿ' } },
            },
          },
        ],
      },
      {
        ...createScriptureVerse({
          verseId: 7719,
          shabadId,
          text: 'ਕਰਤਾ ਪੁਰਖੁ ਨਿਰਭਉ',
          pageNo,
          translation: 'Creative Being, without fear.',
          transliteration: 'karataa purakh nirabhau',
        }),
        words: [],
      },
    ],
  }
}

function getQaBanidbResponse(url) {
  if (url.pathname === '/v2/banis') {
    return [
      { ID: 2, gurmukhiUni: 'ਜਪੁਜੀ ਸਾਹਿਬ', transliterations: { english: 'japujee saahib' } },
      { ID: 21, gurmukhiUni: 'ਰਹਰਾਸਿ ਸਾਹਿਬ', transliterations: { english: 'raharaas saahib' } },
      { ID: 22, gurmukhiUni: 'ਆਰਤੀ', transliterations: { english: 'aaratee' } },
      { ID: 23, gurmukhiUni: 'ਸੋਹਿਲਾ ਸਾਹਿਬ', transliterations: { english: 'sohilaa saahib' } },
      { ID: 24, gurmukhiUni: 'ਅਰਦਾਸ', transliterations: { english: 'aradhaas' } },
    ]
  }

  if (url.pathname === '/v2/amritkeertan') {
    return {
      headers: [
        {
          HeaderID: 1,
          GurmukhiUni: 'ਦੁਇ ਕਰ ਜੋੜਿ ਕਰਉ ਅਰਦਾਸਿ ॥',
          Transliterations: { en: 'dhui kar joR karau aradhaas ||' },
        },
      ],
    }
  }

  if (url.pathname.startsWith('/v2/amritkeertan/index/')) {
    return {
      index: [
        {
          ShabadID: 816,
          GurmukhiUni: 'ਡੰਡਉਤਿ ਬੰਦਨ ਅਨਿਕ ਬਾਰ ਸਰਬ ਕਲਾ ਸਮਰਥ ॥',
          Transliterations: { en: 'dda(n)ddaut ba(n)dhan anik baar sarab kalaa samarath ||' },
          SourceEnglish: 'Sri Guru Granth Sahib Ji',
          SourceID: 'G',
          RaagEnglish: 'Raag Gauree',
          RaagID: 17,
          PageNo: 65,
        },
      ],
    }
  }

  const angMatch = url.pathname.match(/^\/v2\/angs\/([^/]+)\/([^/]+)$/)
  if (angMatch) {
    const [, ang, source] = angMatch
    const pageNo = Number(ang) || 1
    return {
      page: [
        createScriptureVerse({
          verseId: pageNo * 10 + 1,
          shabadId: pageNo,
          text: 'ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥',
          pageNo,
          source,
          translation: 'By the grace of the True Guru.',
        }),
        createScriptureVerse({
          verseId: pageNo * 10 + 2,
          shabadId: pageNo,
          text: 'ਹਰਿ ਜੁਗੁ ਜੁਗੁ ਭਗਤ ਉਪਾਇਆ ਪੈਜ ਰਖਦਾ ਆਇਆ ਰਾਮ ਰਾਜੇ ॥',
          pageNo,
          source,
          translation: 'The Divine protects devotion through every age.',
          transliteration: 'har jug jug bhagat upaiaa',
        }),
      ],
    }
  }

  const shabadMatch = url.pathname.match(/^\/v2\/shabads\/([^/]+)$/)
  if (shabadMatch) {
    return createQaShabadResponse(Number(shabadMatch[1]) || 544, 183)
  }

  if (url.pathname.startsWith('/v2/search/')) {
    const searchQuery = decodeURIComponent(url.pathname.replace('/v2/search/', '')).toLowerCase()
    const searchType = url.searchParams.get('searchtype')

    if (searchQuery === 'death') {
      return {
        verses: searchType === '3' || searchType === '4'
          ? [
              createScriptureVerse({
                verseId: 101,
                shabadId: 51,
                text: 'ਮਰਣੁ ਨ ਮੰਦਾ ਲੋਕਾ ਆਖੀਐ ਜੇ ਮਰਿ ਜਾਣੈ ਐਸਾ ਕੋਇ ॥',
                pageNo: 935,
                translation: 'Death is not called bad when one knows how to die.',
                transliteration: 'maran na mandhaa lokaa aakheeai je mar jaanai aisaa koi',
              }),
            ]
          : [],
      }
    }

    return {
      verses: [
        createScriptureVerse({
          verseId: 100,
          shabadId: 50,
          text: 'ਵਾਹਿਗੁਰੂ ਵਾਹਿਗੁਰੂ',
          pageNo: 1402,
          translation: 'Waaheguru, Waaheguru',
          transliteration: 'vaahiguroo vaahiguroo',
        }),
      ],
    }
  }

  const datedHukamnamaMatch = url.pathname.match(/^\/v2\/hukamnamas(?:\/\d{4}\/\d{2}\/\d{2})?$/)
  if (datedHukamnamaMatch) {
    return {
      isLatest: true,
      date: { gregorian: { year: 2026, month: 4, date: 5 } },
      shabads: [
        {
          shabadInfo: {
            shabadId: 2591,
            pageNo: 680,
            source: { sourceId: 'G', english: 'Sri Guru Granth Sahib Ji' },
            raag: { english: 'Raag Dhanaasree' },
            writer: { english: 'Guru Arjan Dev Ji' },
          },
          verses: [
            createScriptureVerse({
              verseId: 29344,
              shabadId: 2591,
              text: 'ਜਤਨ ਕਰੈ ਮਾਨੁਖ ਡਹਕਾਵੈ ਓਹੁ ਅੰਤਰਜਾਮੀ ਜਾਨੈ ॥',
              pageNo: 680,
              translation: 'People try to deceive others, but the Inner-knower knows everything.',
              transliteration: 'jatan karai maanukh ddahakaavai',
            }),
          ],
        },
      ],
    }
  }

  const koshSearchMatch = url.pathname.match(/^\/v2\/kosh\/search\/(.+)$/)
  if (koshSearchMatch) {
    const normalized = decodeURIComponent(koshSearchMatch[1])
    return normalized === 'ੴ'
      ? [{ id: 1, word: 'ik oankar', wordUni: 'ੴ', definition: 'One Creator', definitionUni: 'ਇੱਕ ਕਰਤਾ ਪੁਰਖ' }]
      : []
  }

  const koshMatch = url.pathname.match(/^\/v2\/kosh\/(.+)$/)
  if (koshMatch) {
    const normalized = decodeURIComponent(koshMatch[1])
    return normalized === 'ੴ'
      ? [{ id: 1, word: 'ik oankar', wordUni: 'ੴ' }]
      : []
  }

  if (url.pathname === '/v2/rehats') {
    return { maryadas: [{ rehatID: 1, rehatName: 'Sikh Rehat Maryada', alphabet: 'S' }] }
  }

  const rehatChapterContentMatch = url.pathname.match(/^\/v2\/rehats\/(\d+)\/chapters\/(\d+)$/)
  if (rehatChapterContentMatch) {
    return {
      chapters: [
        {
          chapterID: Number(rehatChapterContentMatch[2]),
          chapterName: 'Daily Discipline',
          chapterContent: '<p>Amritvela, nitnem, seva, and simran remain central.</p>',
          alphabet: 'D',
        },
      ],
    }
  }

  if (/^\/v2\/rehats\/\d+$/.test(url.pathname)) {
    return { chapters: [{ chapterID: 11, chapterName: 'Daily Discipline', alphabet: 'D' }] }
  }

  return null
}

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
      VITE_INSFORGE_URL: QA_INSFORGE_URL,
      VITE_INSFORGE_FUNCTIONS_URL: QA_INSFORGE_FUNCTIONS_URL,
      VITE_INSFORGE_BANIDB_FUNCTION: 'banidb-proxy',
      VITE_NAAMRAS_BANIDB_MOCK: 'true',
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

async function fulfillJson(route, value, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(value),
  })
}

async function installQaNetworkMocks(page) {
  await page.route(`${QA_INSFORGE_URL}/api/auth/**`, async route => {
    const request = route.request()
    const url = new URL(request.url())

    if (url.pathname === '/api/auth/public-config') {
      await fulfillJson(route, { oAuthProviders: ['google', 'apple', 'github'] })
      return
    }

    if (url.pathname === '/api/auth/refresh') {
      await fulfillJson(route, {})
      return
    }

    if (url.pathname === '/api/auth/sessions/current') {
      await fulfillJson(route, { user: null })
      return
    }

    if (url.pathname.startsWith('/api/auth/oauth/')) {
      await fulfillJson(route, { authUrl: `${BASE_URL}/?qaOAuth=mock` })
      return
    }

    if (url.pathname === '/api/auth/logout') {
      await route.fulfill({ status: 204 })
      return
    }

    await fulfillJson(route, { error: 'QA InsForge auth endpoint is not mocked.' }, 404)
  })

  await page.route(QA_BANIDB_PROXY_URL, async route => {
    const request = route.request()
    const body = request.postDataJSON()

    if (!body || typeof body.path !== 'string') {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Request body must include a string path.' }),
      })
      return
    }

    const url = new URL(body.path, 'https://api.banidb.com')
    if (body.query && typeof body.query === 'object' && !Array.isArray(body.query)) {
      for (const [key, value] of Object.entries(body.query)) {
        if (value === undefined || value === null) continue
        url.searchParams.set(key, String(value))
      }
    }

    const data = getQaBanidbResponse(url)
    await route.fulfill({
      status: data ? 200 : 404,
      contentType: 'application/json',
      body: JSON.stringify(data ?? { error: 'Not found.' }),
    })
  })

  await page.route(`${QA_INSFORGE_FUNCTIONS_URL}/merge-local-state`, async route => {
    const request = route.request()
    const body = request.postDataJSON()
    await fulfillJson(route, {
      mergedAt: FIXED_APP_NOW,
      snapshot: body?.snapshot ?? null,
      acknowledgedEventIds: [],
    })
  })

  await page.route('https://backend.searchgurbani.com/api/res/mahan-kosh/view**', async route => {
    const url = new URL(route.request().url())
    const keyword = url.searchParams.get('keyword') ?? ''
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        lines: keyword === 'ੴ'
          ? [
              {
                ID: 1,
                srch: 'ੴ',
                translit: 'ik oankaar',
                word: 'ੴ',
                roman: 'ik oankar',
                hindi: 'इक ओंकार',
                description: 'ਇੱਕ ਅਕਾਲ ਪੁਰਖ.',
                roman_desc: 'ik akaal purakh.',
                hindi_desc: 'एक अकाल पुरुष।',
              },
            ]
          : [],
      }),
    })
  })
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
  await installQaNetworkMocks(page)
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
      id: 'home-quiet-start',
      title: 'Home quiet start without route cards',
      viewport: 'desktop',
      path: '/',
      run: async ({ page, notes }) => {
        notes.push('Expected Home to keep search/resume cards out of the first reading path.')
        await ensureVisible(page, '[data-page="home"]', 'the Home page shell')
        if (await page.getByTestId('home-smart-search').count() > 0) {
          throw createAssertionError('Home smart-search card should not render.')
        }
        if (await page.getByText('Resume Reading', { exact: true }).count() > 0) {
          throw createAssertionError('Home resume-reading card should not render.')
        }
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
      id: 'read-auto-romanized',
      title: 'Read auto search includes romanized text',
      viewport: 'desktop',
      path: '/banis',
      run: async ({ page, notes }) => {
        notes.push('Expected Auto search to find Roman-letter meaning/transliteration matches without opening Refine.')
        await ensureVisible(page, '[data-page="banis"]', 'the Read page shell')
        await page.locator('#banis-search').fill('death')
        await ensureVisible(page, 'text=Death is not called bad', 'the auto-search Roman-letter result')
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
