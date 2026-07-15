#!/usr/bin/env node
import path from 'node:path'
import {
  copyEpubAsset,
  countWords,
  htmlToSemanticTextBlocks,
  htmlToText,
  inspectEpub,
  publishCuratedWork,
  readEpubFile,
  resolveProjectPath,
  sha256File,
  slugify,
} from './lib/curated-epub.mjs'

function parseArgs(argv) {
  const args = {
    language: 'en',
    libraryRoot: 'public/data/library',
    publicationId: 'edition-1',
  }
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index]
    if (!option.startsWith('--')) continue
    const value = argv[index + 1]
    if (!value) throw new Error(`Missing value for ${option}`)
    index += 1
    const key = option.slice(2).replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase())
    args[key] = value
  }

  if (!args.epub || !args.workId || !args.title) {
    throw new Error([
      'Usage: node scripts/library/import-curated-epub.mjs',
      '  --epub <book.epub> --work-id <stable-id> --title <title>',
      '  [--short-title <title> --description <text> --language <code>]',
      '  [--publication-id <stable-id> --library-root <path>]',
      '',
      'Use import-panth-prakash-epubs.mjs for the bilingual Panth Prakash profile.',
    ].join('\n'))
  }
  return args
}

function splitGenericText(text) {
  const chunks = []
  let remainder = text.trim()
  while (remainder.length > 0) {
    if (remainder.length <= 560) {
      chunks.push(remainder)
      break
    }
    const window = remainder.slice(0, 560)
    const boundary = Math.max(window.lastIndexOf('. '), window.lastIndexOf('? '), window.lastIndexOf('! '), window.lastIndexOf('; '), window.lastIndexOf(' '))
    const end = boundary > 280 ? boundary + (/[.!?;]/.test(window[boundary]) ? 1 : 0) : 560
    chunks.push(remainder.slice(0, end).trim())
    remainder = remainder.slice(end).trim()
  }
  return chunks.filter(Boolean)
}

function buildGenericBlocks(segments, idPrefix) {
  let blockNumber = 0
  return segments.flatMap(segment => splitGenericText(segment.text).map(text => {
    blockNumber += 1
    return {
      id: `${idPrefix}-b${String(blockNumber).padStart(3, '0')}`,
      type: segment.type,
      text,
    }
  }))
}

function documentTitle(html, chapterNumber, navigationTitle) {
  if (navigationTitle) return navigationTitle
  const heading = html.match(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/i)?.[1]
  const title = heading ?? html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  const cleaned = title ? htmlToText(title) : ''
  return cleaned && !/^page\s+\d+$/i.test(cleaned)
    ? cleaned
    : `Section ${chapterNumber}`
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const generatedAt = new Date().toISOString()
  const epub = inspectEpub(args.epub)
  const workRoot = path.join(resolveProjectPath(args.libraryRoot), 'works', args.workId)
  const assetRelativePath = `/data/library/works/${args.workId}/assets/${args.publicationId}.epub`
  const assetPath = path.join(workRoot, 'assets', `${args.publicationId}.epub`)
  const asset = copyEpubAsset(args.epub, assetPath)
  const readableDocuments = epub.spine.filter(item => /(?:xhtml|html)/i.test(item.mediaType ?? '') && epub.files.includes(item.fullPath))
  const navigationTitles = new Map()
  for (const entry of epub.toc) {
    if (!navigationTitles.has(entry.fullPath)) navigationTitles.set(entry.fullPath, entry.title)
  }

  let startPosition = 1
  const chapters = []
  for (const item of readableDocuments) {
    const html = readEpubFile(args.epub, item.fullPath)
    const segments = htmlToSemanticTextBlocks(html)
    if (!segments.length) continue
    const chapterNumber = chapters.length + 1
    const title = documentTitle(html, chapterNumber, navigationTitles.get(item.fullPath))
    const id = `section-${String(chapterNumber).padStart(3, '0')}-${slugify(title)}`
    const blocks = buildGenericBlocks(segments, `${id}-p1`)
    const chapterText = blocks.map(block => block.text).join(' ')
    const wordCount = countWords(chapterText)
    const charCount = chapterText.length
    chapters.push({
      workId: args.workId,
      id,
      chapterNumber,
      kind: 'episode',
      title,
      volume: 1,
      publicationId: args.publicationId,
      startSourcePage: chapterNumber,
      endSourcePage: chapterNumber,
      wordCount,
      charCount,
      startPosition,
      pages: [{
        sourcePageNumber: chapterNumber,
        fileName: item.fullPath,
        sourceHref: item.fullPath,
        blocks,
      }],
      source: {
        type: 'epub',
        fileName: path.basename(args.epub),
      },
    })
    startPosition += wordCount
  }

  chapters.forEach((chapter, index) => {
    if (chapters[index - 1]) chapter.previousChapterId = chapters[index - 1].id
    if (chapters[index + 1]) chapter.nextChapterId = chapters[index + 1].id
  })

  const sourcePageCount = readableDocuments.length
  const totalCharacters = chapters.reduce((sum, chapter) => sum + chapter.charCount, 0)
  const checksum = sha256File(args.epub)
  const revision = checksum.slice(0, 16)
  const work = {
    id: args.workId,
    title: args.title,
    shortTitle: args.shortTitle ?? args.title,
    description: args.description ?? epub.metadata.description ?? `${args.title}, imported from a curated EPUB.`,
    language: args.language ?? epub.metadata.language ?? 'en',
    source: 'epub',
    revision,
    contributors: epub.metadata.creator ? [{ name: epub.metadata.creator, role: 'author' }] : [],
    publications: [{
      id: args.publicationId,
      title: args.title,
      shortTitle: args.shortTitle ?? args.title,
      volume: 1,
      sourceFileName: path.basename(args.epub),
      epubPath: assetRelativePath,
      checksumSha256: asset.checksumSha256,
      sourcePageCount,
      readablePageCount: chapters.length,
      firstChapterId: chapters[0]?.id,
      mediaType: 'application/epub+zip',
      byteLength: asset.byteLength,
    }],
    sourceQualityNote: 'This edition preserves text extracted from the supplied EPUB. It has not received a line-by-line editorial review.',
    totalPages: sourcePageCount,
    totalSourcePages: sourcePageCount,
    readablePages: chapters.length,
    totalCharacters,
    totalChapters: chapters.length,
    provenancePath: `/data/library/works/${args.workId}/provenance.json`,
    searchIndexPath: `/data/library/works/${args.workId}/search-index.json`,
    chapterIndexPath: `/data/library/works/${args.workId}/chapters.json`,
    chapterPathTemplate: `/data/library/works/${args.workId}/chapters/:chapterId.json`,
  }
  const searchChapters = chapters.map(chapter => {
    const searchText = [chapter.title, ...chapter.pages.flatMap(page => page.blocks.map(block => block.text))].join(' ')
    return {
      workId: args.workId,
      chapterId: chapter.id,
      chapterNumber: chapter.chapterNumber,
      kind: chapter.kind,
      volume: chapter.volume,
      publicationId: chapter.publicationId,
      title: chapter.title,
      startSourcePage: chapter.startSourcePage,
      endSourcePage: chapter.endSourcePage,
      pageCount: chapter.pages.length,
      path: `/library/${args.workId}/chapters/${chapter.id}`,
      snippet: searchText.slice(0, 260).trim(),
      searchText,
    }
  })

  publishCuratedWork({
    libraryRoot: args.libraryRoot,
    work,
    chapters,
    searchIndex: {
      works: [{ id: args.workId, title: args.title, aliases: [args.title, args.shortTitle].filter(Boolean) }],
      chapters: searchChapters,
    },
    provenance: {
      workId: args.workId,
      profile: 'generic-curated-epub',
      generatedAt,
      generatedFrom: [{
        sourceFileName: path.basename(args.epub),
        checksumSha256: checksum,
        archivedEpubPath: assetRelativePath,
      }],
      transformations: ['EPUB spine order retained', 'markup reduced to safe semantic text blocks', 'source wording retained'],
    },
    validation: {
      status: chapters.length ? 'passed' : 'failed',
      generatedAt,
      sourceFiles: 1,
      sourceDocuments: sourcePageCount,
      chapters: chapters.length,
      emptyChapters: chapters.filter(chapter => chapter.charCount === 0).map(chapter => chapter.id),
      archivedChecksumMatches: checksum === asset.checksumSha256,
    },
  })

  if (!chapters.length) throw new Error('The EPUB spine did not contain any readable HTML documents.')
  console.log(`Imported ${chapters.length} sections for ${args.title}.`)
  console.log(`Archived source: ${path.relative(process.cwd(), assetPath)} (${asset.checksumSha256})`)
}

main()
