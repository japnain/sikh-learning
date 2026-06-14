#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const WORK_ID = 'panth-prakash-english'
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const DEFAULTS = {
  workRoot: 'public/data/library/works/panth-prakash-english',
  libraryRoot: 'public/data/library',
  seedPath: 'scripts/library/panth-prakash-episodes.seed.json',
}

function parseArgs(argv) {
  const args = { ...DEFAULTS }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const value = argv[index + 1]
    if (!value) throw new Error(`Missing value for --${key}`)
    index += 1
    switch (key) {
      case 'vol1-epub':
        args.vol1Epub = value
        break
      case 'vol2-epub':
        args.vol2Epub = value
        break
      case 'vol1-text':
        args.vol1Text = value
        break
      case 'vol2-text':
        args.vol2Text = value
        break
      case 'work-root':
        args.workRoot = value
        break
      case 'library-root':
        args.libraryRoot = value
        break
      case 'seed-path':
        args.seedPath = value
        break
      default:
        throw new Error(`Unknown option --${key}`)
    }
  }

  if (!args.vol1Epub || !args.vol2Epub) {
    throw new Error('Usage: node scripts/library/import-panth-prakash-epubs.mjs --vol1-epub <vol1.epub> --vol2-epub <vol2.epub> [--vol1-text <vol1.txt> --vol2-text <vol2.txt>]')
  }

  return args
}

function resolveProjectPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(PROJECT_ROOT, filePath)
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(resolveProjectPath(filePath), 'utf8'))
}

function readReferenceText(filePath) {
  const resolvedPath = resolveProjectPath(filePath)
  const stat = fs.statSync(resolvedPath)

  if (stat.isDirectory() || /\.rtf(?:d)?$/i.test(resolvedPath)) {
    return execFileSync('textutil', ['-convert', 'txt', '-stdout', resolvedPath], {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 64,
    })
  }

  return fs.readFileSync(resolvedPath, 'utf8')
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function listEpubFiles(epubPath) {
  return execFileSync('unzip', ['-Z1', epubPath], { encoding: 'utf8' })
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

function readEpubFile(epubPath, fileName) {
  return execFileSync('unzip', ['-p', epubPath, fileName], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 16,
  })
}

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
}

function attributeFallbackText(attrs) {
  const text = decodeEntities(attrs)
    .replace(/\b(?:class|id|style|href|src|alt|title|lang|xml:lang|xmlns|epub:[\w-]+)\s*=\s*"[^"]*"/gi, ' ')
    .replace(/=""|=''/g, ' ')
    .replace(/[="'<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!/[A-Za-z]/.test(text)) return ''
  return text
}

function htmlToParagraphs(html, sourcePageNumber) {
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html
  const withMalformedTagText = body
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(p|div|li|h[1-6])\b([^>]*)\/>/gi, (_match, _tag, attrs) => `\n${attributeFallbackText(attrs)}\n`)
    .replace(/<(p|div|li|h[1-6])\b([^>]*)>/gi, (_match, _tag, attrs) => {
      const fallback = attributeFallbackText(attrs)
      return fallback ? `\n${fallback} ` : '\n'
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')

  return decodeEntities(withMalformedTagText)
    .split(/\n+/)
    .map(line => cleanParagraph(line, sourcePageNumber))
    .filter(Boolean)
}

function cleanParagraph(text, sourcePageNumber) {
  return text
    .replace(/\s+/g, ' ')
    .replace(new RegExp(`^Page\\s+${sourcePageNumber}\\b\\s*`, 'i'), '')
    .replace(/^Page\s+\d+\b\s*/i, '')
    .replace(/^(?:[ivxlcdm]+|\d+)\s+Sri Gur Panth Prakash\s+/i, '')
    .replace(/^Sri Gur Panth Prakash\s+(?:[ivxlcdm]+|\d+)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function classifyBlock(text, index) {
  if (index === 0 && text.length < 120 && /^(?:contents|preface|foreword|introduction|episode|\(?vol|sri gur)/i.test(text)) {
    return 'heading'
  }
  if (text.length < 90 && /^(?:episode|chapter|preface|foreword|introduction|acknowledgement|contents|references|index)\b/i.test(text)) {
    return 'heading'
  }
  if (/\b(?:Dohra|Chaupai|Savaiyya|Kabitt|Pauri|Soratha)\s*:/i.test(text)) {
    return 'line'
  }
  return 'paragraph'
}

function extractVolume(epubPath, volume) {
  const files = listEpubFiles(epubPath)
  const pageFiles = files
    .map(fileName => {
      const match = fileName.match(/^EPUB\/page_(\d+)\.html$/)
      return match ? { fileName, sourcePageNumber: Number(match[1]) } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.sourcePageNumber - b.sourcePageNumber)

  const pages = new Map()
  for (const page of pageFiles) {
    const html = readEpubFile(epubPath, page.fileName)
    const paragraphs = htmlToParagraphs(html, page.sourcePageNumber)
    const blocks = paragraphs.map((text, index) => ({
      id: `v${volume}-p${page.sourcePageNumber}-${index + 1}`,
      type: classifyBlock(text, index),
      text,
    }))

    if (blocks.length > 0) {
      pages.set(page.sourcePageNumber, {
        sourcePageNumber: page.sourcePageNumber,
        fileName: page.fileName,
        blocks,
      })
    }
  }

  return {
    volume,
    fileName: path.basename(epubPath),
    pages,
    minPage: pageFiles[0]?.sourcePageNumber ?? 0,
    maxPage: pageFiles.at(-1)?.sourcePageNumber ?? 0,
  }
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42)
}

function chapterPages(volumeData, startSourcePage, endSourcePage) {
  const output = []
  for (let sourcePageNumber = startSourcePage; sourcePageNumber <= endSourcePage; sourcePageNumber += 1) {
    const page = volumeData.pages.get(sourcePageNumber)
    if (page) output.push(page)
  }
  return output
}

function episodeSourcePage(volume, globalPageNumber) {
  if (volume === 1) return globalPageNumber >= 45 ? globalPageNumber - 1 : globalPageNumber
  return globalPageNumber - 575
}

function searchTextForChapter(chapter) {
  return [
    chapter.title,
    ...chapter.pages.flatMap(page => page.blocks.map(block => block.text)),
  ].join(' ').replace(/\s+/g, ' ').trim()
}

function buildSnippet(searchText) {
  return searchText.slice(0, 260).trim()
}

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds)
}

function removeUnreferencedChapterFiles(chaptersRoot, chapterIds) {
  const expectedFiles = new Set(chapterIds.map(chapterId => `${chapterId}.json`))
  if (!fs.existsSync(chaptersRoot)) return
  let removed = 0

  for (const fileName of fs.readdirSync(chaptersRoot)) {
    if (!fileName.endsWith('.json')) continue
    if (expectedFiles.has(fileName)) continue
    fs.rmSync(path.join(chaptersRoot, fileName), { force: true })
    removed += 1
  }

  return removed
}

function removeUnreferencedChapterFilesUntilStable(chaptersRoot, chapterIds) {
  let stablePasses = 0

  for (let pass = 0; pass < 8 && stablePasses < 3; pass += 1) {
    const removed = removeUnreferencedChapterFiles(chaptersRoot, chapterIds)
    stablePasses = removed === 0 ? stablePasses + 1 : 0
    if (stablePasses < 3) sleep(250)
  }
}

function buildValidationReport({ volumes, chapters, textPaths }) {
  const report = {
    status: textPaths.every(Boolean) ? 'validated' : 'skipped-missing-full-text',
    generatedAt: new Date().toISOString(),
    volumes: volumes.map(volume => ({
      volume: volume.volume,
      epubPagesWithText: volume.pages.size,
      firstSourcePage: volume.minPage,
      lastSourcePage: volume.maxPage,
    })),
    chapters: {
      total: chapters.length,
      empty: chapters.filter(chapter => chapter.pages.length === 0).map(chapter => chapter.id),
    },
    fullText: [],
  }

  for (const [index, textPath] of textPaths.entries()) {
    if (!textPath) {
      report.fullText.push({
        volume: index + 1,
        provided: false,
      })
      continue
    }

    const fullText = readReferenceText(textPath).replace(/\s+/g, ' ').trim()
    const epubText = Array.from(volumes[index].pages.values())
      .flatMap(page => page.blocks.map(block => block.text))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    const sample = epubText.split(/\s+/).filter(Boolean).slice(0, 200)
    const matched = sample.filter(token => fullText.toLowerCase().includes(token.toLowerCase())).length
    report.fullText.push({
      volume: index + 1,
      provided: true,
      referenceFile: path.basename(textPath),
      fullTextCharacters: fullText.length,
      epubTextCharacters: epubText.length,
      leadingSampleTokenCoverage: sample.length ? Number(((matched / sample.length) * 100).toFixed(1)) : 0,
    })
  }

  return report
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const workRoot = resolveProjectPath(args.workRoot)
  const libraryRoot = resolveProjectPath(args.libraryRoot)
  const chaptersRoot = path.join(workRoot, 'chapters')
  const seed = readJson(args.seedPath)
  const vol1 = extractVolume(resolveProjectPath(args.vol1Epub), 1)
  const vol2 = extractVolume(resolveProjectPath(args.vol2Epub), 2)
  const volumes = new Map([[1, vol1], [2, vol2]])

  fs.rmSync(chaptersRoot, { recursive: true, force: true })
  fs.mkdirSync(chaptersRoot, { recursive: true })

  const chapterDrafts = [
    {
      id: 'vol-1-front-matter',
      kind: 'front-matter',
      title: 'Volume I Front Matter',
      volume: 1,
      startSourcePage: vol1.minPage,
      endSourcePage: Math.max(vol1.minPage, episodeSourcePage(1, seed.find(entry => entry.volume === 1)?.startPage ?? 48) - 1),
    },
    {
      id: 'vol-2-front-matter',
      kind: 'front-matter',
      title: 'Volume II Front Matter',
      volume: 2,
      startSourcePage: vol2.minPage,
      endSourcePage: Math.max(vol2.minPage, episodeSourcePage(2, seed.find(entry => entry.volume === 2)?.startPage ?? 632) - 1),
    },
    ...seed.map(entry => {
      const startSourcePage = episodeSourcePage(entry.volume, entry.startPage)
      const endSourcePage = episodeSourcePage(entry.volume, entry.endPage)
      return {
        id: `episode-${String(entry.episodeNumber).padStart(3, '0')}-${slugify(entry.title)}`,
        kind: 'episode',
        episodeNumber: entry.episodeNumber,
        title: entry.title.replace(/\s+/g, ' ').trim(),
        volume: entry.volume,
        startSourcePage,
        endSourcePage,
      }
    }),
  ].sort((a, b) => a.volume - b.volume || a.startSourcePage - b.startSourcePage || (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0))

  const chapters = chapterDrafts.map((draft, index) => {
    const volumeData = volumes.get(draft.volume)
    if (!volumeData) throw new Error(`Missing volume ${draft.volume}`)
    const pages = chapterPages(volumeData, draft.startSourcePage, draft.endSourcePage)
    return {
      workId: WORK_ID,
      id: draft.id,
      chapterNumber: index + 1,
      ...(draft.episodeNumber ? { episodeNumber: draft.episodeNumber } : {}),
      kind: draft.kind,
      title: draft.title,
      volume: draft.volume,
      startSourcePage: draft.startSourcePage,
      endSourcePage: draft.endSourcePage,
      pages,
      source: {
        type: 'epub',
        fileName: volumeData.fileName,
      },
    }
  })

  chapters.forEach((chapter, index) => {
    const payload = {
      ...chapter,
      ...(chapters[index - 1] ? { previousChapterId: chapters[index - 1].id } : {}),
      ...(chapters[index + 1] ? { nextChapterId: chapters[index + 1].id } : {}),
    }
    writeJson(path.join(chaptersRoot, `${chapter.id}.json`), payload)
  })
  removeUnreferencedChapterFilesUntilStable(chaptersRoot, chapters.map(chapter => chapter.id))

  const chapterIndex = chapters.map(chapter => ({
    id: chapter.id,
    chapterNumber: chapter.chapterNumber,
    ...(chapter.episodeNumber ? { episodeNumber: chapter.episodeNumber } : {}),
    kind: chapter.kind,
    title: chapter.title,
    volume: chapter.volume,
    startSourcePage: chapter.startSourcePage,
    endSourcePage: chapter.endSourcePage,
    pageCount: chapter.pages.length,
    path: `/data/library/works/${WORK_ID}/chapters/${chapter.id}.json`,
  }))

  writeJson(path.join(workRoot, 'chapters.json'), chapterIndex)
  writeJson(path.join(workRoot, 'work.json'), {
    id: WORK_ID,
    title: 'Sri Gur Panth Prakash',
    shortTitle: 'Panth Prakash',
    description: 'English translation of Sri Gur Panth Prakash by Rattan Singh Bhangoo, converted from the supplied EPUB volumes for a continuous chapter reader.',
    language: 'en',
    source: 'epub',
    totalPages: vol1.pages.size + vol2.pages.size,
    totalSourcePages: vol1.pages.size + vol2.pages.size,
    totalChapters: chapters.length,
    provenancePath: `/data/library/works/${WORK_ID}/provenance.json`,
    chapterIndexPath: `/data/library/works/${WORK_ID}/chapters.json`,
    chapterPathTemplate: `/data/library/works/${WORK_ID}/chapters/:chapterId.json`,
  })
  writeJson(path.join(workRoot, 'provenance.json'), {
    workId: WORK_ID,
    generatedFrom: [
      path.basename(args.vol1Epub),
      path.basename(args.vol2Epub),
    ],
    sourceType: 'epub',
    chapterSeedPath: args.seedPath,
    validation: args.vol1Text && args.vol2Text ? 'full-text-reference' : 'epub-only; full text not provided',
  })

  const searchChapters = chapters.map(chapter => {
    const searchText = searchTextForChapter(chapter)
    return {
      workId: WORK_ID,
      chapterId: chapter.id,
      chapterNumber: chapter.chapterNumber,
      ...(chapter.episodeNumber ? { episodeNumber: chapter.episodeNumber } : {}),
      kind: chapter.kind,
      volume: chapter.volume,
      title: chapter.title,
      startSourcePage: chapter.startSourcePage,
      endSourcePage: chapter.endSourcePage,
      pageCount: chapter.pages.length,
      path: `/library/${WORK_ID}/chapters/${chapter.id}`,
      snippet: buildSnippet(searchText),
      searchText,
    }
  })

  writeJson(path.join(libraryRoot, 'works.json'), [
    {
      id: WORK_ID,
      title: 'Sri Gur Panth Prakash',
      shortTitle: 'Panth Prakash',
      description: 'English translation of Sri Gur Panth Prakash by Rattan Singh Bhangoo, covering volumes 1 and 2.',
      language: 'en',
      source: 'epub',
      totalPages: vol1.pages.size + vol2.pages.size,
      totalSourcePages: vol1.pages.size + vol2.pages.size,
      totalChapters: chapters.length,
      provenancePath: `/data/library/works/${WORK_ID}/provenance.json`,
      chapterIndexPath: `/data/library/works/${WORK_ID}/chapters.json`,
      chapterPathTemplate: `/data/library/works/${WORK_ID}/chapters/:chapterId.json`,
    },
  ])
  writeJson(path.join(libraryRoot, 'manifest.json'), {
    version: '2.0.0',
    generatedAt: new Date().toISOString(),
    workCatalogPath: '/data/library/works.json',
    searchIndexPath: '/data/library/search-index.json',
  })
  writeJson(path.join(libraryRoot, 'search-index.json'), {
    works: [{
      id: WORK_ID,
      title: 'Sri Gur Panth Prakash',
      aliases: ['Sri Gur Panth Prakash', 'Panth Prakash', 'Pracheen Panth Prakash', 'Prachin Panth Prakash'],
    }],
    chapters: searchChapters,
    metadata: {
      panthPrakash: {
        totalChapters: chapters.length,
        totalEpisodes: seed.length,
        totalSourcePages: vol1.pages.size + vol2.pages.size,
        source: 'epub',
        generatedAt: new Date().toISOString(),
      },
    },
  })
  writeJson(path.join(workRoot, 'validation.json'), buildValidationReport({
    volumes: [vol1, vol2],
    chapters,
    textPaths: [args.vol1Text, args.vol2Text],
  }))

  console.log(`Imported ${chapters.length} Panth Prakash chapters from EPUB.`)
  console.log(`Volume 1 pages with text: ${vol1.pages.size}`)
  console.log(`Volume 2 pages with text: ${vol2.pages.size}`)
  if (!args.vol1Text || !args.vol2Text) {
    console.log('Full-text validation skipped because vol1/vol2 text files were not provided.')
  }
}

main()
