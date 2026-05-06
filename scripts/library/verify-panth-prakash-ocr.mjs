#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const DEFAULTS = {
  workRoot: 'public/data/library/works/panth-prakash-english',
  ngramSize: 6,
  directThreshold: 70,
  criticalThreshold: 30,
  jsonOut: 'tmp/panth-prakash-ocr-audit.json',
  csvOut: 'tmp/panth-prakash-ocr-review-queue.csv',
}

function parseArgs(argv) {
  const args = { ...DEFAULTS, failOnReview: false, failOnStructural: false, expectedEpisodes: 0 }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    if (key === 'fail-on-review') {
      args.failOnReview = true
      continue
    }
    if (key === 'fail-on-structural') {
      args.failOnStructural = true
      continue
    }
    const value = argv[index + 1]
    if (value === undefined) throw new Error(`Missing value for --${key}`)
    index += 1
    switch (key) {
      case 'work-root':
        args.workRoot = value
        break
      case 'vol1':
        args.vol1 = value
        break
      case 'vol2':
        args.vol2 = value
        break
      case 'json-out':
        args.jsonOut = value
        break
      case 'csv-out':
        args.csvOut = value
        break
      case 'ngram-size':
        args.ngramSize = Number(value)
        break
      case 'direct-threshold':
        args.directThreshold = Number(value)
        break
      case 'critical-threshold':
        args.criticalThreshold = Number(value)
        break
      case 'expected-episodes':
        args.expectedEpisodes = Number(value)
        break
      default:
        throw new Error(`Unknown option --${key}`)
    }
  }
  if (!args.vol1 || !args.vol2) {
    throw new Error('Usage: node scripts/library/verify-panth-prakash-ocr.mjs --vol1 <volume1.txt.gz> --vol2 <volume2.txt.gz> [--work-root <path>] [--json-out <path>] [--csv-out <path>]')
  }
  if (!Number.isInteger(args.ngramSize) || args.ngramSize < 2) throw new Error('--ngram-size must be an integer >= 2')
  return args
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function readGzipText(filePath) {
  return zlib.gunzipSync(fs.readFileSync(filePath)).toString('utf8')
}

function normalizeText(text) {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(text) {
  const normalized = normalizeText(text)
  return normalized ? normalized.split(' ').filter(token => token.length > 1) : []
}

function ngrams(tokens, size) {
  const output = new Set()
  for (let index = 0; index <= tokens.length - size; index += 1) {
    output.add(tokens.slice(index, index + size).join(' '))
  }
  return output
}

function scoreAgainstReference(text, referenceNgrams, size) {
  const pageNgrams = ngrams(tokenize(text), size)
  if (pageNgrams.size === 0) return { percent: null, matched: 0, total: 0 }
  let matched = 0
  pageNgrams.forEach(ngram => {
    if (referenceNgrams.has(ngram)) matched += 1
  })
  return {
    percent: Number(((matched / pageNgrams.size) * 100).toFixed(1)),
    matched,
    total: pageNgrams.size,
  }
}

function blockText(blocks) {
  return (blocks ?? []).map(block => block?.text ?? '').join(' ')
}

function isManualPage(page) {
  return (page.blocks ?? []).some(block => String(block?.id ?? '').startsWith('manual-'))
}

function resolvePagePath(workRoot, pageEntry) {
  if (!pageEntry.path) return path.join(workRoot, 'pages', `${pageEntry.pageNumber}.json`)
  const pagesSuffix = pageEntry.path.match(/\/pages\/[^/]+\.json$/)?.[0]
  if (pagesSuffix) return path.join(workRoot, pagesSuffix)
  return path.isAbsolute(pageEntry.path) ? pageEntry.path : path.join(workRoot, pageEntry.path)
}

function addReview(queue, row) {
  queue.push({
    pageNumber: row.pageNumber ?? null,
    volume: row.volume ?? null,
    sourcePageNumber: row.sourcePageNumber ?? null,
    episodeNumber: row.episodeNumber ?? null,
    category: row.category,
    score: row.score ?? null,
    title: row.title ?? '',
    detail: row.detail ?? '',
  })
}

function validateStructure({ work, pageIndex, episodes, workRoot, expectedEpisodes, reviewQueue }) {
  const structuralErrors = []
  const pageByNumber = new Map(pageIndex.map(page => [page.pageNumber, page]))

  if (work.totalPages !== pageIndex.length) {
    structuralErrors.push(`work.json totalPages ${work.totalPages} does not match pages.json length ${pageIndex.length}`)
  }

  pageIndex.forEach((page, index) => {
    const expectedPageNumber = index + 1
    if (page.pageNumber !== expectedPageNumber) {
      structuralErrors.push(`pages.json page ${index + 1} is numbered ${page.pageNumber}, expected ${expectedPageNumber}`)
    }
    const pagePath = resolvePagePath(workRoot, page)
    if (!fs.existsSync(pagePath)) {
      structuralErrors.push(`missing page JSON for app page ${page.pageNumber}: ${pagePath}`)
      addReview(reviewQueue, { ...page, category: 'missing_page_json', detail: pagePath })
    }
  })

  if (expectedEpisodes > 0 && episodes.length !== expectedEpisodes) {
    structuralErrors.push(`episodes.json has ${episodes.length} episodes, expected ${expectedEpisodes}`)
  }

  if (expectedEpisodes > 0) {
    episodes.forEach((episode, index) => {
      const expectedEpisode = index + 1
      if (episode.episodeNumber !== expectedEpisode) {
        structuralErrors.push(`episode index ${index + 1} is numbered ${episode.episodeNumber}, expected ${expectedEpisode}`)
      }
    })
  }

  episodes.forEach(episode => {
    if (episode.startPage > episode.endPage) {
      structuralErrors.push(`episode ${episode.episodeNumber} starts after it ends`)
    }
    const startPage = pageByNumber.get(episode.startPage)
    const endPage = pageByNumber.get(episode.endPage)
    if (!startPage || !endPage) {
      structuralErrors.push(`episode ${episode.episodeNumber} points to missing page range ${episode.startPage}-${episode.endPage}`)
      return
    }
    const episodePages = pageIndex.filter(page => page.pageNumber >= episode.startPage && page.pageNumber <= episode.endPage)
    if (!episodePages.every(page => page.volume === episode.volume)) {
      structuralErrors.push(`episode ${episode.episodeNumber} crosses a volume boundary at ${episode.startPage}-${episode.endPage}`)
    }
    if (startPage.volume !== episode.volume || endPage.volume !== episode.volume) {
      structuralErrors.push(`episode ${episode.episodeNumber} start/end pages do not match volume ${episode.volume}`)
    }
  })

  const byVolume = new Map()
  episodes.forEach(episode => byVolume.set(episode.volume, [...(byVolume.get(episode.volume) ?? []), episode]))
  Array.from(byVolume.entries()).forEach(([volume, volumeEpisodes]) => {
    for (let index = 1; index < volumeEpisodes.length; index += 1) {
      const previous = volumeEpisodes[index - 1]
      const current = volumeEpisodes[index]
      if (current.startPage !== previous.endPage + 1) {
        structuralErrors.push(`volume ${volume} episode ${current.episodeNumber} begins at ${current.startPage}; previous episode ${previous.episodeNumber} ends at ${previous.endPage}`)
      }
    }
  })

  structuralErrors.forEach(error => {
    addReview(reviewQueue, { category: 'structural_error', detail: error })
  })

  return structuralErrors
}

function writeCsv(filePath, rows) {
  const header = ['pageNumber', 'volume', 'sourcePageNumber', 'category', 'score', 'title', 'detail']
  const escape = value => {
    const text = value === null || value === undefined ? '' : String(value)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const content = [header.join(','), ...rows.map(row => header.map(key => escape(row[key])).join(','))].join('\n') + '\n'
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
}

function auditCorpus(options) {
  const workRoot = path.resolve(options.workRoot)
  const work = readJson(path.join(workRoot, 'work.json'))
  const pageIndex = readJson(path.join(workRoot, 'pages.json'))
  const episodesPath = path.join(workRoot, 'episodes.json')
  const episodes = fs.existsSync(episodesPath) ? readJson(episodesPath) : []

  const referenceByVolume = {
    1: ngrams(tokenize(readGzipText(options.vol1)), options.ngramSize),
    2: ngrams(tokenize(readGzipText(options.vol2)), options.ngramSize),
  }

  const reviewQueue = []
  const structuralErrors = validateStructure({
    work,
    pageIndex,
    episodes,
    workRoot,
    expectedEpisodes: options.expectedEpisodes,
    reviewQueue,
  })

  const pageReports = []
  let manualPages = 0
  let directPages = 0
  let directBelowTargetPages = 0
  let directCriticalPages = 0
  let manualWithoutRawSourcePages = 0

  pageIndex.forEach(pageEntry => {
    const pagePath = resolvePagePath(workRoot, pageEntry)
    if (!fs.existsSync(pagePath)) return
    const page = readJson(pagePath)
    const manual = isManualPage(page)
    const displayText = blockText(page.blocks)
    const rawText = blockText(page.rawBlocks)
    const reference = referenceByVolume[page.volume]
    const displayScore = reference ? scoreAgainstReference(displayText, reference, options.ngramSize) : { percent: null, matched: 0, total: 0 }
    const rawScore = reference ? scoreAgainstReference(rawText, reference, options.ngramSize) : { percent: null, matched: 0, total: 0 }

    if (manual) manualPages += 1
    else directPages += 1

    if (manual && (!page.rawBlocks || page.rawBlocks.length === 0)) {
      manualWithoutRawSourcePages += 1
      addReview(reviewQueue, {
        ...pageEntry,
        category: 'manual_without_raw_source',
        score: rawScore.percent,
        title: page.title,
        detail: 'manual display page has no rawBlocks to preserve source provenance',
      })
    }

    if (!manual) {
      if (displayScore.percent === null || displayScore.percent < options.directThreshold) {
        directBelowTargetPages += 1
        addReview(reviewQueue, {
          ...pageEntry,
          category: displayScore.percent !== null && displayScore.percent < options.criticalThreshold ? 'direct_critical' : 'direct_below_target',
          score: displayScore.percent,
          title: page.title,
          detail: `display OCR overlap ${displayScore.percent ?? 'n/a'}% below target ${options.directThreshold}%`,
        })
      }
      if (displayScore.percent === null || displayScore.percent < options.criticalThreshold) {
        directCriticalPages += 1
      }
    }

    pageReports.push({
      pageNumber: page.pageNumber,
      volume: page.volume,
      sourcePageNumber: page.sourcePageNumber,
      title: page.title,
      manual,
      quality: page.quality ?? null,
      reviewStatus: page.review?.status ?? null,
      displayScore,
      rawScore,
    })
  })

  const audit = {
    generatedAt: new Date().toISOString(),
    workRoot,
    options: {
      ngramSize: options.ngramSize,
      directThreshold: options.directThreshold,
      criticalThreshold: options.criticalThreshold,
      expectedEpisodes: options.expectedEpisodes,
    },
    summary: {
      totalPages: pageIndex.length,
      totalEpisodes: episodes.length,
      manualPages,
      directPages,
      directBelowTargetPages,
      directCriticalPages,
      manualWithoutRawSourcePages,
      structuralErrors: structuralErrors.length,
      reviewQueueItems: reviewQueue.length,
    },
    structuralErrors,
    reviewQueue,
    pages: pageReports,
  }

  return audit
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  const audit = auditCorpus(options)

  fs.mkdirSync(path.dirname(path.resolve(options.jsonOut)), { recursive: true })
  fs.writeFileSync(path.resolve(options.jsonOut), JSON.stringify(audit, null, 2) + '\n')
  writeCsv(path.resolve(options.csvOut), audit.reviewQueue)

  console.log(`Panth Prakash OCR audit written:`)
  console.log(`  JSON: ${path.resolve(options.jsonOut)}`)
  console.log(`  CSV:  ${path.resolve(options.csvOut)}`)
  console.log(`  pages=${audit.summary.totalPages} episodes=${audit.summary.totalEpisodes} direct=${audit.summary.directPages} manual=${audit.summary.manualPages}`)
  console.log(`  structuralErrors=${audit.summary.structuralErrors} directCritical=${audit.summary.directCriticalPages} directBelowTarget=${audit.summary.directBelowTargetPages} manualWithoutRaw=${audit.summary.manualWithoutRawSourcePages}`)

  if (options.failOnStructural && audit.summary.structuralErrors > 0) process.exitCode = 2
  else if (options.failOnReview && audit.reviewQueue.length > 0) process.exitCode = 1
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isCli) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

export {
  auditCorpus,
  normalizeText,
  tokenize,
  ngrams,
  scoreAgainstReference,
}
