import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { expect, it } from 'vitest'
import { buildRaagFineProfilesA, SHABAD_UNITS_A, type RaagFineACapture } from './raag-fine-a-profile-generator'
import { CATALOG_BANI_SECTION_PROFILES } from '../../src/content/baniSections/catalogProfiles'

// Explicit opt-in runner only; this file is outside the normal app test suite.
it('writes reviewed raag A metadata and its complete source-boundary ledger', () => {
  expect(process.env.UPDATE_RAAG_FINE_A_PROFILES).toBe('1')
  const sourcePath = 'scripts/qa/fixtures/bani-structure-snapshots-20261101.json.gz'
  const sourceBytes = fs.readFileSync(sourcePath)
  const captures = (JSON.parse(gunzipSync(sourceBytes).toString('utf8')) as { readings: RaagFineACapture[] }).readings
  const profiles = buildRaagFineProfilesA(captures)
  const body = profiles.map(profile => `  ${JSON.stringify(profile)},`).join('\n')
  fs.writeFileSync('src/content/baniSections/raagFineProfilesA.ts', [
    "import type { BaniSectionProfile } from './profileTypes'", '',
    '// Reviewed navigation metadata; original scripture is never replaced or parsed here.',
    '// Source review: docs/qa/raag-fine-a-structure-review-20261102.md',
    '// Regenerate: UPDATE_RAAG_FINE_A_PROFILES=1 npx vitest run --config scripts/qa/raag-fine-a.vitest.config.ts --configLoader runner',
    'export const RAAG_FINE_PROFILES_A: readonly BaniSectionProfile[] = [', body, ']', '',
  ].join('\n'))
  const readings = profiles.map(profile => {
    const rows = captures.find(capture => capture.baniDbId === profile.baniDbId)!.payload.verses
    const indices = new Map(rows.map((row, index) => [row.verse.verseId, index]))
    const baseline = CATALOG_BANI_SECTION_PROFILES.find(candidate => candidate.baniDbId === profile.baniDbId)!
    const groups = profile.sections.map((section, index) => {
      const start = indices.get(section.startVerseId)!
      const end = index + 1 < profile.sections.length ? indices.get(profile.sections[index + 1].startVerseId)! : rows.length
      const children = section.children ?? [{ ...section, startVerseId: section.excerptVerseId ?? section.startVerseId }]
      const units = children.map((child, childIndex) => {
        const first = indices.get(child.startVerseId)!
        const next = childIndex + 1 < children.length ? indices.get(children[childIndex + 1].startVerseId)! : end
        const knownEnd = SHABAD_UNITS_A[section.startVerseId]?.[childIndex]?.[1]
        const last = knownEnd !== undefined ? indices.get(knownEnd)!
          : rows.slice(first, next).map((row, offset) => ({ row, index: first + offset }))
            .filter(({ row }) => row.header === 0).at(-1)!.index
        return { startVerseId: child.startVerseId, endVerseId: rows[last].verse.verseId,
          excerptVerseId: child.excerptVerseId ?? child.startVerseId, kind: child.kind,
          ...(child.number === undefined ? {} : { number: child.number }),
          opening: rows[first].verse.verse.unicode, closing: rows[last].verse.verse.unicode,
          startRowIndex: first, endRowIndex: last,
          navigationRangeLastVerseId: rows[next - 1].verse.verseId }
      })
      const original = baseline.sections.find(candidate => candidate.startVerseId === section.startVerseId)
      return { startVerseId: section.startVerseId, excerptVerseId: section.excerptVerseId ?? section.startVerseId,
        startRowIndex: start, endRowIndex: end - 1, rowCount: end - start,
        ...(original ? { originalParentId: original.id } : { id: section.id }),
        ...(section.label ? { label: section.label } : {}),
        prefaceBodyVerseIds: rows.slice(start, units[0].startRowIndex)
          .filter(row => row.header === 0 && row.verse.verseId !== section.startVerseId).map(row => row.verse.verseId),
        units }
    })
    return { baniDbId: profile.baniDbId, fingerprint: profile.fingerprint, normalizedRowCount: rows.length,
      originalParentCount: baseline.sections.length, rootCount: groups.length,
      childCount: profile.sections.reduce((n, section) => n + (section.children?.length ?? 0), 0),
      leafCount: groups.reduce((n, group) => n + group.units.length, 0), groups }
  })
  fs.writeFileSync('scripts/qa/fixtures/raag-fine-boundaries-a-20261102.json', JSON.stringify({
    schemaVersion: 1, reviewedAt: '2026-11-02', sourcePath,
    sourceSha256: createHash('sha256').update(sourceBytes).digest('hex'),
    description: 'Reviewed selection-local IDs and inclusive body spans. Ordered navigation ranges may also include following mangals; scripture rows remain unchanged. Shabad ordinals are parent-local navigation order, not canonical hymn numbering.',
    evidence: 'docs/qa/raag-fine-a-structure-review-20261102.md', readings,
  }, null, 2) + '\n')
})
