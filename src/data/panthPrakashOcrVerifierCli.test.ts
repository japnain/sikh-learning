import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { execFileSync } from 'node:child_process'
import { gzipSync } from 'node:zlib'
import { expect, test } from 'vitest'

const PROJECT_ROOT = process.cwd()
const SCRIPT_PATH = path.join(PROJECT_ROOT, 'scripts/library/verify-panth-prakash-ocr.mjs')

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

test('Panth Prakash OCR verifier reports native page coverage without treating manual summaries as failed OCR', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'panth-ocr-fixture-'))
  const workRoot = path.join(tempRoot, 'work')
  const pagesRoot = path.join(workRoot, 'pages')
  const vol1Path = path.join(tempRoot, 'vol1.txt.gz')
  const vol2Path = path.join(tempRoot, 'vol2.txt.gz')
  const jsonOut = path.join(tempRoot, 'audit.json')
  const csvOut = path.join(tempRoot, 'review.csv')

  fs.mkdirSync(pagesRoot, { recursive: true })
  fs.writeFileSync(
    vol1Path,
    gzipSync('Guru Panth Prakash clean English line for page one. Banda Singh source verse supports the manual page.'),
  )
  fs.writeFileSync(vol2Path, gzipSync('Volume two placeholder text.'))

  writeJson(path.join(workRoot, 'work.json'), {
    id: 'panth-prakash-english',
    totalPages: 2,
  })
  writeJson(path.join(workRoot, 'pages.json'), [
    {
      pageNumber: 1,
      volume: 1,
      sourcePageNumber: 1,
      title: 'Direct page',
      path: '/pages/1.json',
    },
    {
      pageNumber: 2,
      volume: 1,
      sourcePageNumber: 2,
      title: 'Manual page',
      path: '/pages/2.json',
    },
  ])
  writeJson(path.join(workRoot, 'episodes.json'), [
    {
      episodeNumber: 1,
      title: 'Fixture episode',
      startPage: 1,
      endPage: 2,
      volume: 1,
    },
  ])
  writeJson(path.join(pagesRoot, '1.json'), {
    workId: 'panth-prakash-english',
    pageNumber: 1,
    volume: 1,
    sourcePageNumber: 1,
    title: 'Direct page',
    blocks: [{ id: 'paragraph-1', type: 'paragraph', text: 'Guru Panth Prakash clean English line for page one.' }],
    rawBlocks: [{ id: 'raw-line-1', type: 'line', text: 'Guru Panth Prakash clean English line for page one.' }],
    quality: 'clean',
    review: { status: 'machine-cleaned' },
  })
  writeJson(path.join(pagesRoot, '2.json'), {
    workId: 'panth-prakash-english',
    pageNumber: 2,
    volume: 1,
    sourcePageNumber: 2,
    title: 'Manual page',
    blocks: [{ id: 'manual-2-1', type: 'paragraph', text: 'A readable app summary explains the Banda Singh moment. (1–2)' }],
    rawBlocks: [{ id: 'raw-line-1', type: 'line', text: 'Banda Singh source verse supports the manual page.' }],
    quality: 'readable',
    review: { status: 'machine-cleaned' },
  })

  execFileSync('node', [
    SCRIPT_PATH,
    '--work-root',
    workRoot,
    '--vol1',
    vol1Path,
    '--vol2',
    vol2Path,
    '--json-out',
    jsonOut,
    '--csv-out',
    csvOut,
    '--ngram-size',
    '4',
  ], { cwd: PROJECT_ROOT, stdio: 'pipe' })

  const audit = JSON.parse(fs.readFileSync(jsonOut, 'utf8'))
  const csv = fs.readFileSync(csvOut, 'utf8')

  expect(audit.summary.totalPages).toBe(2)
  expect(audit.summary.directPages).toBe(1)
  expect(audit.summary.manualPages).toBe(1)
  expect(audit.summary.directCriticalPages).toBe(0)
  expect(audit.reviewQueue).toEqual([])
  expect(csv).toContain('pageNumber,volume,sourcePageNumber,category,score,title')
})
