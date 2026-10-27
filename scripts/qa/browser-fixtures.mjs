import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { chromium } from 'playwright-core'

// Load the existing fixture corpus without shipping mock data in the production bundle.
const fixturePath = fileURLToPath(new URL('../../src/supabase/banidbMock.ts', import.meta.url))
const fixtureCode = ts.transpileModule(fs.readFileSync(fixturePath, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
const { getMockBanidbResponse } = await import(`data:text/javascript;base64,${Buffer.from(fixtureCode).toString('base64')}`)

export function resolveBrowserExecutable() {
  const candidates = [process.env.CHROME_EXECUTABLE,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    chromium.executablePath(),
  ]
  const executable = candidates.find(candidate => candidate && fs.existsSync(candidate))
  assert(executable, 'Install Chromium with npx playwright-core install chromium, or set CHROME_EXECUTABLE.')
  return executable
}

export function deterministicProviderResponse(requestUrl, postData, method = 'GET', { longHukamnama = false, distinctBaniLengths = false } = {}) {
  const url = new URL(requestUrl)
  const knownProvider = url.hostname === 'api.banidb.com' || url.pathname.startsWith('/__banidb/v2/')
    || url.pathname.endsWith('/banidb-proxy') || (url.hostname === 'backend.searchgurbani.com' && url.pathname === '/api/res/mahan-kosh/view')
  if (knownProvider && method === 'OPTIONS') return { status: 204, data: null }
  let providerPath = url.hostname === 'api.banidb.com' ? `${url.pathname}${url.search}`
    : url.pathname.startsWith('/__banidb/v2/') ? `${url.pathname.replace('/__banidb', '')}${url.search}` : null
  let query
  if (url.pathname.endsWith('/banidb-proxy')) {
    try { const input = JSON.parse(postData || '{}'); providerPath = input.path; query = input.query } catch { return { status: 400, data: { error: 'Invalid QA proxy request' } } }
  }
  if (providerPath) {
    // Keep daily-Hukamnama content aligned with the controlled browser clock.
    if (providerPath === '/v2/hukamnamas') providerPath = '/v2/hukamnamas/2026/04/05'
    const data = getMockBanidbResponse(providerPath, query)
    // Keep the chooser-transition case deterministic with an opt-in Short
    // subset. This changes synthetic QA data only, never shipped scripture.
    if (distinctBaniLengths && providerPath === '/v2/banis/21' && data?.verses?.length > 1) {
      data.verses[1].existsSGPC = 0
    }
    // Synthetic repetitions are confined to the deep-reader layout case. They
    // provide enough scrollable content to exercise the persistent header with unique keys.
    if (longHukamnama && providerPath.startsWith('/v2/hukamnamas') && data?.shabads?.[0]?.verses?.length) {
      const template = data.shabads[0].verses[0]
      data.shabads[0].verses = Array.from({ length: 18 }, (_, index) => ({ ...template, verseId: 900_000 + index }))
    }
    return { status: data === null ? 404 : 200, data: data ?? { error: `No deterministic BaniDB fixture for ${providerPath}` } }
  }
  if (url.hostname === 'backend.searchgurbani.com' && url.pathname === '/api/res/mahan-kosh/view') {
    const word = url.searchParams.get('keyword') ?? ''
    return { status: 200, data: { lines: word === 'ੴ' ? [{
      ID: 1, srch: 'ੴ', translit: 'ik oankaar', word: 'ੴ', roman: 'ik oankar', hindi: 'इक ओंकार',
      description: 'ਇੱਕ ਅਕਾਲ ਪੁਰਖ.', roman_desc: null, hindi_desc: 'एक अकाल पुरुष।',
    }] : [] } }
  }
  return null
}

/** Production-preview requests are intercepted here, independent of build-time VITE_* flags.
 * Call with a context created using serviceWorkers: 'block' so every provider fetch is routed.
 */
export async function installDeterministicFixtures(context, baseUrl, options = {}) {
  const origin = new URL(baseUrl).origin
  const unexpected = []
  let providerRequests = 0
  await context.addInitScript(() => {
    const OriginalDate = Date
    const fixedNow = OriginalDate.parse('2026-04-05T12:00:00.000Z')
    class QaDate extends OriginalDate {
      constructor(...args) { super(...(args.length ? args : [fixedNow])) }
      static now() { return fixedNow }
    }
    globalThis.Date = QaDate
  })
  await context.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const response = deterministicProviderResponse(request.url(), request.postData(), request.method(), options)
    if (response) {
      providerRequests += 1
      if (![200, 204].includes(response.status)) unexpected.push(`${request.method()} ${url.origin}${url.pathname}: missing fixture`)
      await route.fulfill({ status: response.status, contentType: 'application/json', body: response.status === 204 ? '' : JSON.stringify(response.data), headers: {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
      } })
      return
    }
    if (url.origin === origin) { await route.continue(); return }
    unexpected.push(`${request.method()} ${url.origin}${url.pathname}`)
    await route.abort('blockedbyclient')
  })
  return {
    get providerRequests() { return providerRequests },
    assertNoUnexpectedRequests() { assert.deepEqual(unexpected, [], 'QA attempted an unmocked external request or unsupported provider endpoint') },
  }
}
