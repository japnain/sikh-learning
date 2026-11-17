import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { auditShabadosCandidates, compareExactSequence, exportReadings, flattenReading, parseOptions, sha256 } from './verify-existing-readings.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const reading = lines => ({ entries: [{ id: 'test-entry', source: 'G', ang: 1, lines }] })

test('content comparison refuses missing/reordered lines and changed headings', () => {
  const baseline = reading([{ gurmukhi: 'ਅ', isHeader: true, headerLevel: 1 }, { gurmukhi: 'ਬ' }, { gurmukhi: 'ਅ' }])
  assert.equal(compareExactSequence(baseline, reading([{ gurmukhi: 'ਅ', isHeader: true, headerLevel: 1 }, { gurmukhi: 'ਅ' }, { gurmukhi: 'ਬ' }])).equivalent, false)
  assert.equal(compareExactSequence(baseline, reading([{ gurmukhi: 'ਅ' }, { gurmukhi: 'ਬ' }, { gurmukhi: 'ਅ' }])).equivalent, false)
  assert.equal(compareExactSequence(baseline, reading([{ gurmukhi: 'ਅ', isHeader: true, headerLevel: 1 }, { gurmukhi: 'ਬ' }])).reason, 'line-count')
})

test('identical text is not claimed to establish an edition or identity crosswalk', () => {
  const baseline = reading([{ gurmukhi: 'ਸੋਚੈ ਸੋਚਿ ਨ ਹੋਵਈ ॥', verseId: 3 }])
  const otherProvider = reading([{ gurmukhi: 'ਸੋਚੈ ਸੋਚਿ ਨ ਹੋਵਈ ॥', verseId: 999 }])
  assert.deepEqual(compareExactSequence(baseline, otherProvider), { equivalent: true, referenceLines: 1, candidateLines: 1, requiresIdentityAndEditionReview: true })
  assert.equal(compareExactSequence(baseline, reading([{ gurmukhi: 'ਸੋਚੈ. ਸੋਚਿ ਨ ਹੋਵਈ ॥' }])).equivalent, false)
})

test('row fingerprint retains entry, page, line identity and exact string bytes', () => {
  const a = reading([{ gurmukhi: 'ਅ  ਬ', verseId: 1 }])
  const b = reading([{ gurmukhi: 'ਅ ਬ', verseId: 1 }])
  assert.notEqual(sha256(JSON.stringify(flattenReading(a))), sha256(JSON.stringify(flattenReading(b))))
  assert.equal(flattenReading(a)[0].entryId, 'test-entry')
})

test('CLI accepts explicit fixture paths and rejects invalid IDs or overwrite of raw inputs', () => {
  assert.deepEqual(parseOptions(['--raw-dir', '/tmp/raw', '--out-dir', '/tmp/out', '--ids', '9,21,9']).ids, [9, 21])
  assert.throws(() => parseOptions(['--raw-dir', '/tmp/raw', '--out-dir', '/tmp/raw']))
  assert.throws(() => parseOptions(['--raw-dir', '/tmp/raw', '--out-dir', '/tmp/out', '--ids', '../2']))
  assert.throws(() => parseOptions(['--raw-dir', '/tmp/raw', '--out-dir', '/tmp/out', '--source-revision', '../other']))
  assert.throws(() => parseOptions(['--raw-dir', '/tmp/raw', '--out-dir', '/tmp/out', '--shabados-index', '/tmp/index']))
})

test('matching candidate text remains unapproved and missing upstream lines are reported', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'naamras-mapping-check-'))
  try {
    await writeFile(join(temp, 'reading.json'), JSON.stringify(reading([{ gurmukhi: 'ਅ' }])))
    await writeFile(join(temp, 'index.jsonl'), JSON.stringify({ lineId: 'line-a', text: 'ਅ', assetId: 'primary-a' }) + '\n')
    await writeFile(join(temp, 'assemblies.json'), JSON.stringify({ sourceRevision: 'fixture', assemblies: [
      { baniId: 'JAPJ', lines: [{ lineId: 'line-a', sectionOrder: 0, lineOrder: 0 }] },
      { baniId: 'AKUS', lines: [{ lineId: 'missing-line', sectionOrder: 0, lineOrder: 0 }] },
    ] }))
    const manifest = { sourceRevision: 'fixture', readings: [2, 29, 3].map(baniDbId => ({ baniDbId, variants: [{ variant: 'default', path: 'reading.json', orderedSequenceSha256: 'fixture' }] })) }
    const report = await auditShabadosCandidates(manifest, { outDir: temp, shabadosIndex: join(temp, 'index.jsonl'), shabadosAssemblies: join(temp, 'assemblies.json') })
    assert.deepEqual(report.approvedMappings, [])
    assert.equal(report.comparisons[0].status, 'text-sequence-equal-needs-edition-heading-and-identity-review')
    assert.equal(report.comparisons[0].approved, false)
    assert.equal(report.comparisons[1].status, 'missing-primary-text')
    assert.deepEqual(report.comparisons[1].missingIds, ['missing-line'])
    assert.deepEqual(report.noNamedCandidate, [3])
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

test('real Japji fixture is exported through the production normalizer with exact byte verification', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'naamras-export-check-'))
  const rawDir = join(temp, 'raw')
  const outDir = join(temp, 'out')
  await mkdir(rawDir)
  const raw = await readFile(join(root, 'src/test/fixtures/bani-sections/japji-banidb-2026-10-31.json'))
  await writeFile(join(rawDir, '2.json'), raw)
  try {
    const manifest = await exportReadings({ rawDir, outDir, ids: [2], sourceRevision: 'fixture-japji' })
    assert.deepEqual(manifest.failures, [])
    assert.equal(manifest.readings.length, 1)
    assert.equal(manifest.complete, false, 'A sample must not claim whole-catalogue coverage')
    const item = manifest.readings[0]
    assert.equal(item.rawSha256, sha256(raw))
    assert.deepEqual(item.availableLengths, [])
    assert.equal(item.variants.length, 1)
    const exported = await readFile(join(outDir, item.variants[0].path))
    const value = JSON.parse(exported)
    assert.equal(value.normalizationRevision, 2)
    assert.equal(value.entries.length, 8)
    assert.equal(flattenReading(value).length, 385)
    assert.equal(value.entries[0].id, 'bani-2-1-0')
    assert.equal(item.variants[0].sha256, sha256(exported))
    assert.equal(item.variants[0].bytes, exported.byteLength)
    assert.equal(item.variants[0].variant, 'default')
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})
