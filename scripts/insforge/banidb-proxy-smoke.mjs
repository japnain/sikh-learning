import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..', '..')
const PUBLIC_BANIDB_ORIGIN = 'https://api.banidb.com'

const SAMPLE_REQUESTS = [
  { label: 'banis-index', path: '/v2/banis' },
  { label: 'bani-detail', path: '/v2/banis/21' },
  { label: 'shabad-detail', path: '/v2/shabads/1' },
  { label: 'ang-page', path: '/v2/angs/1/G' },
  { label: 'search', path: '/v2/search/waheguru', query: { searchtype: 3, source: 'all' } },
  { label: 'amrit-keertan-index', path: '/v2/amritkeertan' },
  { label: 'amrit-keertan-header', path: '/v2/amritkeertan/index/1' },
  { label: 'hukamnama-latest', path: '/v2/hukamnamas' },
  { label: 'hukamnama-dated', path: '/v2/hukamnamas/2026/04/05' },
]

function trimTrailingSlashes(value) {
  return value.replace(/\/+$/, '')
}

function loadEnvFile(filePath) {
  return fs.readFile(filePath, 'utf8')
    .then(contents => {
      for (const rawLine of contents.split(/\r?\n/)) {
        const line = rawLine.trim()
        if (!line || line.startsWith('#')) continue

        const separator = line.indexOf('=')
        if (separator === -1) continue

        const key = line.slice(0, separator).trim()
        let value = line.slice(separator + 1).trim()
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }

        if (!(key in process.env)) {
          process.env[key] = value
        }
      }
    })
    .catch(() => {})
}

function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function deriveFunctionsUrl(baseUrl) {
  const url = new URL(baseUrl)
  if (url.hostname.includes('.functions.insforge.app')) {
    return trimTrailingSlashes(url.origin)
  }

  const [appKey] = url.hostname.split('.')
  if (!appKey) {
    throw new Error(`Unable to derive functions URL from ${baseUrl}`)
  }

  return `https://${appKey}.functions.insforge.app`
}

function buildUrl(origin, pathName, query) {
  const url = new URL(pathName, origin)

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null) continue
    url.searchParams.set(key, String(value))
  }

  return url
}

async function readJson(response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Expected JSON but received: ${text.slice(0, 300)}`)
  }
}

async function fetchDirect(requestSpec) {
  const url = buildUrl(PUBLIC_BANIDB_ORIGIN, requestSpec.path, requestSpec.query)
  const response = await fetch(url)
  const json = await readJson(response)

  return {
    body: json,
    status: response.status,
  }
}

async function fetchProxy(proxyEndpoint, requestSpec) {
  const response = await fetch(proxyEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      path: requestSpec.path,
      query: requestSpec.query,
    }),
  })

  const json = await readJson(response)
  return {
    body: json,
    status: response.status,
  }
}

async function main() {
  await loadEnvFile(path.join(repoRoot, '.env.local'))
  await loadEnvFile(path.join(repoRoot, '.env'))

  const baseUrl = requireEnv('VITE_INSFORGE_URL')
  const functionsUrl = trimTrailingSlashes(
    process.env.VITE_INSFORGE_FUNCTIONS_URL?.trim() || deriveFunctionsUrl(baseUrl)
  )
  const banidbFunction = process.env.VITE_INSFORGE_BANIDB_FUNCTION?.trim() || 'banidb-proxy'
  const proxyEndpoint = `${functionsUrl}/${banidbFunction.replace(/^\/+/, '')}`

  for (const requestSpec of SAMPLE_REQUESTS) {
    const [direct, proxy] = await Promise.all([
      fetchDirect(requestSpec),
      fetchProxy(proxyEndpoint, requestSpec),
    ])

    assert.equal(proxy.status, direct.status, `${requestSpec.label}: status mismatch`)
    assert.deepEqual(proxy.body, direct.body, `${requestSpec.label}: body mismatch`)

    console.log(`ok ${requestSpec.label}`)
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
