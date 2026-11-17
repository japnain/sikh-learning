#!/usr/bin/env node
/**
 * Export exact BaniDB readings through the application's real normalizer.
 * This command never fetches, publishes, substitutes scripture, or reads secrets.
 * Acquire official raw responses separately, then run:
 * node scripts/shabados/verify-existing-readings.mjs --raw-dir /tmp/raw --out-dir /tmp/export
 * Optional --ids 9,21,22,23; --source-revision <immutable revision>.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const LENGTHS = new Set(['short', 'medium', 'long', 'extralong'])
export const sha256 = value => createHash('sha256').update(value).digest('hex')

export function flattenReading(reading) {
  assert.ok(Array.isArray(reading?.entries) && reading.entries.length, 'A reading needs entries')
  return reading.entries.flatMap(entry => {
    assert.ok(Array.isArray(entry.lines) && entry.lines.length, `Missing lines: ${entry.id}`)
    return entry.lines.map(line => ({
      entryId: entry.id,
      source: entry.source,
      page: entry.ang,
      verseId: line.verseId ?? null,
      shabadId: line.shabadId ?? null,
      text: line.gurmukhi,
      header: Boolean(line.isHeader),
      headerLevel: line.headerLevel ?? null,
    }))
  })
}

/**
 * A conservative content gate only. Equal text is NOT an identifier crosswalk.
 * Imported candidates must also carry independently established line provenance.
 * No Unicode normalization, whitespace stripping, header removal or fuzzy match.
 */
export function compareExactSequence(reference, candidate) {
  const left = flattenReading(reference)
  const right = flattenReading(candidate)
  const count = Math.max(left.length, right.length)
  for (let index = 0; index < count; index += 1) {
    const a = left[index]
    const b = right[index]
    if (!a || !b || a.text !== b.text || a.header !== b.header || a.headerLevel !== b.headerLevel) {
      return { equivalent: false, reason: !a || !b ? 'line-count' : 'text-or-heading', index, referenceLines: left.length, candidateLines: right.length }
    }
  }
  return { equivalent: true, referenceLines: left.length, candidateLines: right.length, requiresIdentityAndEditionReview: true }
}

export function parseOptions(argv) {
  const options = { sourceRevision: 'banidb-2026-11-12-normalization-2' }
  const allowed = new Map([['--raw-dir', 'rawDir'], ['--out-dir', 'outDir'], ['--ids', 'ids'], ['--source-revision', 'sourceRevision'], ['--shabados-index', 'shabadosIndex'], ['--shabados-assemblies', 'shabadosAssemblies']])
  for (let index = 0; index < argv.length; index += 2) {
    const key = allowed.get(argv[index])
    assert.ok(key && argv[index + 1] && !argv[index + 1].startsWith('--'), `Unknown or incomplete option: ${argv[index]}`)
    options[key] = argv[index + 1]
  }
  assert.ok(options.rawDir && options.outDir, '--raw-dir and --out-dir are required')
  options.rawDir = resolve(options.rawDir)
  options.outDir = resolve(options.outDir)
  assert.notEqual(options.rawDir, options.outDir, 'Raw inputs and normalized output must have different directories')
  assert.match(options.sourceRevision, /^[a-zA-Z0-9._-]{1,100}$/, 'Invalid source revision')
  assert.equal(Boolean(options.shabadosIndex), Boolean(options.shabadosAssemblies), 'Both Shabad OS audit inputs are required together')
  if (options.ids) {
    assert.match(options.ids, /^\d+(,\d+)*$/, 'IDs must be comma-separated positive integers')
    options.ids = [...new Set(options.ids.split(',').map(Number))]
    assert.ok(options.ids.every(id => Number.isSafeInteger(id) && id > 0), 'Invalid bani ID')
  }
  return options
}

// These pairings select candidates for inspection only. They never establish
// content equivalence and must never be consumed as a runtime ID crosswalk.
const SHABADOS_CANDIDATE_IDS = {
  AKUS: 29, ANND: 10, ARDS: 24, ARTI: 22, ARTL: 22, ASKV: 90,
  BNCP: 9, BRMH: 27, BVAK: 33, CDDV: 13, CPDT: 9, JAAP: 4,
  JAPJ: 2, LAVA: 11, OANK: 35, RGMA: 38, RHRS: 21, RHRT: 21,
  RKSD: 46, SGST: 34, SHLA: 23, SHPD: 5, SHZR: 3, SKMI: 31,
  SLK9: 30, TPDK: 7, TPSS: 6,
}

export async function auditShabadosCandidates(manifest, options) {
  const primaryById = new Map()
  const input = createInterface({ input: createReadStream(options.shabadosIndex), crlfDelay: Infinity })
  for await (const line of input) {
    if (!line.trim()) continue
    const primary = JSON.parse(line)
    assert.equal(typeof primary.lineId, 'string', 'Invalid primary line ID')
    assert.equal(typeof primary.text, 'string', 'Invalid primary text')
    assert.ok(!primaryById.has(primary.lineId), `Ambiguous primary edition for ${primary.lineId}`)
    primaryById.set(primary.lineId, primary)
  }
  const source = JSON.parse(await readFile(options.shabadosAssemblies, 'utf8'))
  assert.ok(typeof source.sourceRevision === 'string' && Array.isArray(source.assemblies), 'Invalid assemblies export')
  const report = {
    schemaVersion: 1, generatedAt: new Date().toISOString(),
    banidbSourceRevision: manifest.sourceRevision, shabadosSourceRevision: source.sourceRevision,
    policy: 'Exact ordered text comparison only; no punctuation removal, fuzzy matching, line omission or inferred global IDs. Text equality still requires edition, headings and identity review.',
    approvedMappings: [], comparisons: [], noNamedCandidate: [],
  }
  const records = new Map(manifest.readings.map(record => [record.baniDbId, record]))
  const candidateIds = new Set()
  for (const assembly of source.assemblies) {
    const baniDbId = SHABADOS_CANDIDATE_IDS[assembly.baniId]
    const record = records.get(baniDbId)
    if (!record) continue
    candidateIds.add(baniDbId)
    const references = [...assembly.lines].sort((a, b) => a.sectionOrder - b.sectionOrder || a.lineOrder - b.lineOrder)
    const missingIds = references.filter(ref => !primaryById.has(ref.lineId)).map(ref => ref.lineId)
    const candidate = references.map(ref => primaryById.get(ref.lineId))
    for (const variant of record.variants) {
      const reading = JSON.parse(await readFile(join(options.outDir, variant.path), 'utf8'))
      const original = flattenReading(reading)
      let firstDifference = null
      if (!missingIds.length) {
        for (let index = 0; index < Math.max(original.length, candidate.length); index += 1) {
          if (original[index]?.text !== candidate[index]?.text) {
            firstDifference = index
            break
          }
        }
      }
      report.comparisons.push({
        baniDbId, variant: variant.variant, shabadosBaniId: assembly.baniId,
        referenceLineCount: original.length, candidateLineCount: candidate.length,
        missingIds, firstDifference,
        status: missingIds.length ? 'missing-primary-text'
          : firstDifference === null ? 'text-sequence-equal-needs-edition-heading-and-identity-review'
            : 'different-ordered-text',
        referenceSha256: variant.orderedSequenceSha256,
        candidateSha256: missingIds.length ? null : sha256(JSON.stringify(candidate)),
        approved: false,
      })
    }
  }
  report.noNamedCandidate = manifest.readings.filter(record => !candidateIds.has(record.baniDbId)).map(record => record.baniDbId)
  report.noNamedCandidateMeaning = 'No selected ready-made assembly in this snapshot; this is not a claim that the scripture is absent from the larger Shabad OS corpus.'
  await writeAtomic(join(options.outDir, 'shabados-mapping-audit.json'), JSON.stringify(report, null, 2))
  return report
}

async function writeAtomic(path, contents) {
  await mkdir(dirname(path), { recursive: true })
  const staging = `${path}.staging-${process.pid}`
  await writeFile(staging, contents, { flag: 'w' })
  await rename(staging, path)
}

export async function exportReadings(options) {
  const { createServer } = await import('vite')
  const originalFetch = globalThis.fetch
  let activeRaw = null
  let activeId = null
  // A narrow response boundary keeps production normalization in use without
  // exposing credentials or allowing this offline audit to access the network.
  globalThis.fetch = async (input, init) => {
    let path = new URL(typeof input === 'string' || input instanceof URL ? input : input.url).pathname
    if (init?.body) path = JSON.parse(String(init.body)).path
    assert.equal(path, `/v2/banis/${activeId}`, `Unexpected fixture request: ${path}`)
    assert.ok(activeRaw, 'No active raw fixture')
    return new Response(activeRaw, { status: 200, headers: { 'content-type': 'application/json' } })
  }
  let vite
  const manifest = {
    schemaVersion: 1, provider: 'banidb', sourceRevision: options.sourceRevision,
    generatedAt: new Date().toISOString(), origin: 'https://api.banidb.com/v2/banis',
    normalizer: { entryPoint: 'src/api/banidb.ts#fetchBani', normalizationRevision: 2, files: {} },
    readings: [], failures: [], mappingPolicy: 'Retain BaniDB content until whole-sequence, identity and edition mapping are independently verified.',
  }
  try {
    for (const path of ['src/api/banidb.ts', 'src/utils/sundarGutkaLength.ts', 'src/utils/baniReadingValidation.ts', 'src/data/banis.ts']) {
      manifest.normalizer.files[path] = sha256(await readFile(join(ROOT, path)))
    }
    vite = await createServer({
      root: ROOT, configFile: false, envDir: false, mode: 'test', logLevel: 'error',
      server: { middlewareMode: true, hmr: false, ws: false, watch: null },
      appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] },
      define: {
        'import.meta.env.VITE_SUPABASE_URL': '""',
        'import.meta.env.VITE_SUPABASE_ANON_KEY': '""',
        'import.meta.env.VITE_NAAMRAS_BANIDB_MOCK': '"false"',
        'import.meta.env.VITE_NAAMRAS_BANIDB_DIRECT_FALLBACK': '"true"',
        'import.meta.env.VITE_NAAMRAS_BANIDB_PUBLIC_ORIGIN': '"https://api.banidb.com"',
      },
    })
    const { fetchBani } = await vite.ssrLoadModule('/src/api/banidb.ts')
    const { isExactBaniReading } = await vite.ssrLoadModule('/src/utils/baniReadingValidation.ts')
    const { READ_BANIDB_CATALOG_IDS, READ_EXACT_BANIS } = await vite.ssrLoadModule('/src/data/banis.ts')
    const titles = new Map(READ_EXACT_BANIS.map(bani => [bani.baniDbId, bani.name]))
    titles.set(24, 'Ardaas')
    const ids = options.ids ?? READ_BANIDB_CATALOG_IDS
    assert.ok(ids.every(id => READ_BANIDB_CATALOG_IDS.includes(id)), 'Requested ID is outside the current exact catalogue')
    manifest.catalogueCount = READ_BANIDB_CATALOG_IDS.length
    manifest.requestedCount = ids.length
    for (const id of ids) {
      try {
        activeId = id
        activeRaw = await readFile(join(options.rawDir, `${id}.json`), 'utf8')
        const raw = JSON.parse(activeRaw)
        assert.ok(Array.isArray(raw.verses) && raw.verses.length, `Empty raw response for bani ${id}`)
        const defaultReading = await fetchBani(id)
        assert.ok(isExactBaniReading(defaultReading, id), `Invalid normalized default reading for bani ${id}`)
        assert.ok(defaultReading.availableLengths.every(length => LENGTHS.has(length)), 'Unknown length')
        assert.equal(new Set(defaultReading.availableLengths).size, defaultReading.availableLengths.length, 'Duplicate length')
        const record = {
          readingKey: `banidb:${id}`, baniDbId: id, title: titles.get(id),
          rawSha256: sha256(activeRaw), rawBytes: Buffer.byteLength(activeRaw), rawRows: raw.verses.length,
          availableLengths: defaultReading.availableLengths, defaultLength: defaultReading.resolvedLength,
          variants: [],
        }
        for (const length of [null, ...defaultReading.availableLengths]) {
          const reading = length === null ? defaultReading : await fetchBani(id, length)
          assert.ok(isExactBaniReading(reading, id, length), `Invalid reading for ${id}/${length ?? 'default'}`)
          assert.deepEqual(reading.availableLengths, record.availableLengths, 'Available lengths changed within one raw fixture')
          if (length !== null) assert.equal(reading.resolvedLength, length, 'Requested length was substituted')
          const rows = flattenReading(reading)
          const payload = JSON.stringify(reading)
          const variant = length ?? 'default'
          const path = join(options.outDir, 'normalized', String(id), `${variant}.json`)
          await writeAtomic(path, payload)
          assert.equal(sha256(await readFile(path)), sha256(payload), 'Written payload checksum mismatch')
          record.variants.push({
            variant, requestedLength: length, resolvedLength: reading.resolvedLength,
            path: relative(options.outDir, path).split('\\').join('/'),
            sha256: sha256(payload), bytes: Buffer.byteLength(payload),
            entries: reading.entries.length, lines: rows.length, headers: rows.filter(row => row.header).length,
            orderedSequenceSha256: sha256(JSON.stringify(rows)),
            opening: rows[0], ending: rows.at(-1),
          })
        }
        manifest.readings.push(record)
      } catch (error) {
        manifest.failures.push({ baniDbId: id, message: error instanceof Error ? error.message : String(error) })
      }
    }
    manifest.totalVariants = manifest.readings.reduce((sum, reading) => sum + reading.variants.length, 0)
    manifest.totalPayloadBytes = manifest.readings.reduce((sum, reading) => sum + reading.variants.reduce((subtotal, variant) => subtotal + variant.bytes, 0), 0)
    manifest.complete = manifest.failures.length === 0 && manifest.readings.length === manifest.catalogueCount
    await writeAtomic(join(options.outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
    if (options.shabadosIndex && options.shabadosAssemblies) await auditShabadosCandidates(manifest, options)
    return manifest
  } finally {
    globalThis.fetch = originalFetch
    await vite?.close()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const manifest = await exportReadings(parseOptions(process.argv.slice(2)))
  console.log(JSON.stringify({ readings: manifest.readings.length, variants: manifest.totalVariants, bytes: manifest.totalPayloadBytes, complete: manifest.complete, failures: manifest.failures }, null, 2))
  if (manifest.failures.length) process.exitCode = 1
}
