import path from 'node:path'
import {
  copyEpubAsset,
  countWords,
  htmlToText,
  inspectEpub,
  publishCuratedWork,
  readEpubFile,
  resolveProjectPath,
  sha256File,
  writeJson,
} from '../lib/curated-epub.mjs'

const WORK_ID = 'panth-prakash-english'
const PROFILE_VERSION = 'panth-prakash-english-v6'
const MAX_BLOCK_CHARACTERS = 560
const SOURCE_TOC_TITLE_FALLBACKS = new Map([
  [3, 'First Sikh Guni'],
])

const PUBLICATION_PROFILES = [
  {
    id: 'volume-1',
    title: 'Sri Gur Panth Prakash — Volume I',
    shortTitle: 'Volume I',
    sourceFileName: 'vol1.epub',
    volume: 1,
    episodeRange: [1, 81],
    firstReadableSourcePage: 47,
    lastReadableSourcePage: 535,
    printPageOffset: 44,
    isbn: '81-85815-28-3',
    publishedYear: 2006,
    expectedSourcePageCount: 573,
    expectedReadablePageCount: 245,
  },
  {
    id: 'volume-2',
    title: 'Sri Gur Panth Prakash — Volume II',
    shortTitle: 'Volume II',
    sourceFileName: 'vol2.epub',
    volume: 2,
    episodeRange: [82, 169],
    firstReadableSourcePage: 57,
    lastReadableSourcePage: 839,
    printPageOffset: 54,
    isbn: '81-85815-31-3',
    publishedYear: 2010,
    expectedSourcePageCount: 840,
    expectedReadablePageCount: 392,
  },
]

const COMMON_METER = '(?:Dohra|Chaupai|Chopai|Sortha|Soratha|Chhand|Pauri|Ardil|Jhoolna|Swaiyya|Savaiyya|Kundliya|Kundhiya|Kabitt|Kabit|Baint|Shabad)'
const DISTINCTIVE_METER = '(?:Tirbhange\\s+Chhand|Khial\\s+Patshahi\\s+Tenth|Kundliya\\s+Chhand)'
const METER_PATTERN = `(?:\\b${DISTINCTIVE_METER}(?:\\s*\\d+)?\\s*:|\\b${COMMON_METER}(?:\\s*\\d+)?\\s*:|\\bSri\\s*Mukh(?:wak|vak)\\s*Sloka(?:\\s*\\d+)?\\s*:?)`

function meterRegex(flags = 'gi') {
  return new RegExp(METER_PATTERN, flags)
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim()
}

function normalizeMeterLabel(text) {
  const label = normalizeWhitespace(text)
    .replace(/\d+\s*:?\s*$/, '')
    .replace(/\s*:\s*$/, '')
    .trim()
  return `${label}:`
}

function stripRunningHeader(text) {
  let cleaned = normalizeWhitespace(text)
  if (!/^Sri Gur Panth Prakash\b/i.test(cleaned)) return cleaned
  cleaned = cleaned.replace(/^Sri Gur Panth Prakash\b\s*/i, '')
  cleaned = cleaned.replace(/^(?:\d{1,4}|[ivxlcdm]+|All)\s+/i, '')
  return cleaned.trim()
}

function pageFiles(epub) {
  return epub.files
    .map(fileName => {
      const match = fileName.match(/(?:^|\/)page_(\d+)\.html$/i)
      return match ? { fileName, sourcePageNumber: Number(match[1]) } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.sourcePageNumber - b.sourcePageNumber)
}

function extractPublication(epubPath, profile) {
  const epub = inspectEpub(epubPath)
  const sourcePages = pageFiles(epub)
  const sourcePageByNumber = new Map(sourcePages.map(page => [page.sourcePageNumber, page]))
  const pages = []

  for (let sourcePageNumber = profile.firstReadableSourcePage; sourcePageNumber <= profile.lastReadableSourcePage; sourcePageNumber += 2) {
    const sourcePage = sourcePageByNumber.get(sourcePageNumber)
    if (!sourcePage) throw new Error(`${profile.id} is missing required readable page ${sourcePageNumber}`)
    const html = readEpubFile(epubPath, sourcePage.fileName)
    const text = stripRunningHeader(htmlToText(html))
    if (!text) throw new Error(`${profile.id} readable page ${sourcePageNumber} has no text`)
    pages.push({
      publicationId: profile.id,
      volume: profile.volume,
      sourcePageNumber,
      fileName: sourcePage.fileName,
      sourceHref: sourcePage.fileName,
      printPageNumber: sourcePageNumber - profile.printPageOffset,
      text,
    })
  }

  return {
    profile,
    epub,
    sourcePageCount: sourcePages.length,
    pages,
  }
}

function splitEpisodes(publications) {
  const episodes = []
  let currentEpisode = null
  let expectedEpisodeNumber = 1

  for (const publication of publications) {
    for (const page of publication.pages) {
      const matches = Array.from(page.text.matchAll(/\bEpisode\s+(\d{1,3})\b/gi))
      const accepted = []
      for (const match of matches) {
        const episodeNumber = Number(match[1])
        if (episodeNumber !== expectedEpisodeNumber) continue
        accepted.push({ index: match.index, episodeNumber })
        expectedEpisodeNumber += 1
      }

      let cursor = 0
      for (const marker of accepted) {
        const precedingText = normalizeWhitespace(page.text.slice(cursor, marker.index))
        if (currentEpisode && precedingText) currentEpisode.fragments.push({ ...page, text: precedingText })

        currentEpisode = {
          episodeNumber: marker.episodeNumber,
          publicationId: page.publicationId,
          volume: page.volume,
          fragments: [],
        }
        episodes.push(currentEpisode)
        cursor = marker.index
      }

      const remainingText = normalizeWhitespace(page.text.slice(cursor))
      if (currentEpisode && remainingText) currentEpisode.fragments.push({ ...page, text: remainingText })
    }
  }

  if (expectedEpisodeNumber !== 170) {
    throw new Error(`Expected episode markers 1–169; the next marker was ${expectedEpisodeNumber}`)
  }
  return episodes
}

function splitLongText(text, maximum = MAX_BLOCK_CHARACTERS) {
  const chunks = []
  let remainder = normalizeWhitespace(text)
  while (remainder.length > maximum) {
    const window = remainder.slice(0, maximum)
    const boundaries = [window.lastIndexOf('. '), window.lastIndexOf('? '), window.lastIndexOf('! '), window.lastIndexOf('; '), window.lastIndexOf(', '), window.lastIndexOf(' ')]
    const boundary = Math.max(...boundaries)
    const end = boundary >= Math.floor(maximum * 0.55)
      ? boundary + (/[.!?;,]/.test(window[boundary]) ? 1 : 0)
      : maximum
    chunks.push(remainder.slice(0, end).trim())
    remainder = remainder.slice(end).trim()
  }
  if (remainder) chunks.push(remainder)
  return chunks
}

function linesForVerse(text, number) {
  const withoutNumber = number
    ? text.replace(new RegExp(`\\s*\\(\\s*${number}\\s*\\)\\s*$`), '')
    : text
  const lines = withoutNumber
    .split(/(?<=[,;.!?])\s+(?=[A-Z("'\[])/)
    .map(line => line.trim())
    .filter(Boolean)
  return lines.length > 1 ? lines : undefined
}

function classifyResidual(text, forceHeading = false) {
  if (forceHeading || /^Episode\s+\d+\b/i.test(text) || /^Rest of the Episode\b/i.test(text)) return 'heading'
  if (/^\([^()]+\)$/.test(text) && text.length < 240) return 'note'
  return 'paragraph'
}

function openingHeadingBoundary(text) {
  const firstMeter = meterRegex('i').exec(text)
  const firstVerseEnd = /\(\s*\d{1,3}\s*\)/.exec(text)
  if (firstMeter && (!firstVerseEnd || firstMeter.index < firstVerseEnd.index)) return firstMeter.index

  const colonBoundary = /\)\s*:\s+(?=[A-Z])/.exec(text)
  if (colonBoundary && (!firstVerseEnd || colonBoundary.index < firstVerseEnd.index)) {
    return colonBoundary.index + colonBoundary[0].length
  }
  const readerBoundary = /\)\s+(?=Dear devout readers\b)/i.exec(text)
  if (readerBoundary && (!firstVerseEnd || readerBoundary.index < firstVerseEnd.index)) {
    return readerBoundary.index + readerBoundary[0].length
  }
  return null
}

function semanticBlocks(sourceText, forceOpeningHeading) {
  let text = normalizeWhitespace(sourceText)
  const blocks = []
  if (forceOpeningHeading) {
    const boundary = openingHeadingBoundary(text)
    if (boundary !== null && boundary > 0) {
      blocks.push({ type: 'heading', text: normalizeWhitespace(text.slice(0, boundary)) })
      text = normalizeWhitespace(text.slice(boundary))
      forceOpeningHeading = false
    }
  }
  const events = []
  for (const match of text.matchAll(meterRegex())) {
    events.push({ type: 'meter', index: match.index, end: match.index + match[0].length, text: normalizeMeterLabel(match[0]) })
  }
  for (const match of text.matchAll(/\(\s*(\d{1,3})\s*\)/g)) {
    events.push({ type: 'verse-end', index: match.index, end: match.index + match[0].length, number: match[1] })
  }
  events.sort((a, b) => a.index - b.index || (a.type === 'meter' ? -1 : 1))

  let cursor = 0
  let openingResidual = forceOpeningHeading

  const pushTextBlock = (source, type, number = undefined) => {
    const normalized = normalizeWhitespace(source)
    if (!normalized) return
    const chunks = splitLongText(normalized)
    chunks.forEach((chunk, index) => {
      const isLast = index === chunks.length - 1
      blocks.push({
        type,
        text: chunk,
        ...(type === 'verse' ? { lines: linesForVerse(chunk, isLast ? number : undefined) } : {}),
        ...(type === 'verse' && isLast && number ? { number } : {}),
      })
    })
  }

  for (const event of events) {
    if (event.index < cursor) continue
    if (event.type === 'meter') {
      const residual = normalizeWhitespace(text.slice(cursor, event.index))
      if (residual) {
        pushTextBlock(residual, classifyResidual(residual, openingResidual))
        openingResidual = false
      }
      blocks.push({ type: 'meter', text: event.text })
      cursor = event.end
      continue
    }

    const verse = normalizeWhitespace(text.slice(cursor, event.end))
    if (verse) {
      pushTextBlock(verse, 'verse', event.number)
      openingResidual = false
    }
    cursor = event.end
  }

  const trailing = normalizeWhitespace(text.slice(cursor))
  if (trailing) pushTextBlock(trailing, classifyResidual(trailing, openingResidual))
  return blocks
}

function titleFromOpening(openingText, episodeNumber) {
  const boundary = openingHeadingBoundary(openingText)
  let heading = normalizeWhitespace(boundary === null ? openingText : openingText.slice(0, boundary))
  heading = heading.replace(new RegExp(`^Episode\\s+${episodeNumber}\\b\\s*`, 'i'), '')
  if (episodeNumber === 1) {
    heading = heading.replace(/^Ik Onkar Satguru Prasad Sri Waheguru ji ki Fateh Now Sri Gur Panth Prakash Granth\s*/i, '')
  }
  const parentheticalTitle = heading.match(/^\(([^()]+)\)\s*:?$/)
  if (parentheticalTitle) heading = parentheticalTitle[1]
  heading = heading
    .replace(/\s+\([^()]+\)\s*:?\s*$/, '')
    .replace(/\s+\[[^\]]+\]\s*:?\s*$/, '')
    .replace(/\s*[:;.-]+\s*$/, '')
    .trim()
  if (!heading || heading.toLowerCase() === `episode ${episodeNumber}`) {
    return SOURCE_TOC_TITLE_FALLBACKS.get(episodeNumber) ?? `Episode ${episodeNumber}`
  }
  heading = heading
    .replace(/^Now\s+(?:I\s+)?(?:Narrate|Follows?)\s+/i, '')
    .replace(/^(?:(?:The|An|Another|Next)\s+)?Episode\s+(?:About|of|at)\s+(?:the\s+)?/i, '')
    .replace(/(?<=[A-Za-z])\d+\b/g, '')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/\s*&\s*/g, ' and ')
    .replace(/\s+/g, ' ')
    .trim()

  const subtitleStart = heading.indexOf(' (')
  if (subtitleStart >= 48) heading = heading.slice(0, subtitleStart).trim()
  heading = `${heading.charAt(0).toUpperCase()}${heading.slice(1)}`
  if (heading.length <= 112) return heading
  const shortened = heading.slice(0, 112)
  const wordBoundary = shortened.lastIndexOf(' ')
  return `${shortened.slice(0, wordBoundary > 78 ? wordBoundary : 112).trim()}…`
}

function buildChapters(episodeDrafts) {
  let startPosition = 1
  const chapters = episodeDrafts.map(draft => {
    const id = `episode-${String(draft.episodeNumber).padStart(3, '0')}`
    const pages = draft.fragments.map((fragment, pageIndex) => {
      const rawBlocks = semanticBlocks(fragment.text, pageIndex === 0)
      const identifiedBlocks = rawBlocks.map((block, blockIndex) => ({
        id: `${id}-p${fragment.sourcePageNumber}-b${String(blockIndex + 1).padStart(3, '0')}`,
        ...block,
        ...(block.lines ? { lines: block.lines } : {}),
      }))
      const openingBlock = identifiedBlocks[0]
      const blocks = pageIndex === 0 && openingBlock?.type === 'heading'
        ? draft.episodeNumber === 1
          ? [
              {
                ...openingBlock,
                type: 'invocation',
                text: 'Ik Onkar Satguru Prasad Sri Waheguru ji ki Fateh',
              },
              ...identifiedBlocks.slice(1),
            ]
          : identifiedBlocks.slice(1)
        : identifiedBlocks
      return {
        sourcePageNumber: fragment.sourcePageNumber,
        fileName: fragment.fileName,
        sourceHref: fragment.sourceHref,
        printPageNumber: fragment.printPageNumber,
        blocks,
      }
    })
    const chapterText = pages.flatMap(page => page.blocks.map(block => block.text)).join(' ')
    const wordCount = countWords(chapterText)
    const charCount = chapterText.length
    const chapter = {
      workId: WORK_ID,
      id,
      chapterNumber: draft.episodeNumber,
      episodeNumber: draft.episodeNumber,
      kind: 'episode',
      title: titleFromOpening(draft.fragments[0]?.text ?? '', draft.episodeNumber),
      volume: draft.volume,
      publicationId: draft.publicationId,
      startSourcePage: pages[0]?.sourcePageNumber ?? 0,
      endSourcePage: pages.at(-1)?.sourcePageNumber ?? 0,
      wordCount,
      charCount,
      startPosition,
      pages,
      source: {
        type: 'epub',
        fileName: draft.publicationId === 'volume-1' ? 'vol1.epub' : 'vol2.epub',
      },
    }
    startPosition += wordCount
    return chapter
  })

  chapters.forEach((chapter, index) => {
    if (chapters[index - 1]) chapter.previousChapterId = chapters[index - 1].id
    if (chapters[index + 1]) chapter.nextChapterId = chapters[index + 1].id
  })
  return chapters
}

function chapterSearchEntry(chapter) {
  const searchText = [chapter.title, ...chapter.pages.flatMap(page => page.blocks.map(block => block.text))]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  const firstVerse = chapter.pages.flatMap(page => page.blocks).find(block => block.type === 'verse')?.text
  return {
    workId: WORK_ID,
    chapterId: chapter.id,
    chapterNumber: chapter.chapterNumber,
    episodeNumber: chapter.episodeNumber,
    kind: chapter.kind,
    volume: chapter.volume,
    publicationId: chapter.publicationId,
    title: chapter.title,
    startSourcePage: chapter.startSourcePage,
    endSourcePage: chapter.endSourcePage,
    pageCount: chapter.pages.length,
    path: `/library/${WORK_ID}/chapters/${chapter.id}`,
    snippet: (firstVerse ?? searchText).slice(0, 260).trim(),
    searchText,
  }
}

function uniqueReadablePages(chapters) {
  return new Set(chapters.flatMap(chapter => chapter.pages.map(page => `${chapter.publicationId}:${page.sourcePageNumber}`)))
}

export function importPanthPrakashEnglish({ vol1Epub, vol2Epub, libraryRoot = 'public/data/library' }) {
  const sourcePaths = [resolveProjectPath(vol1Epub), resolveProjectPath(vol2Epub)]
  sourcePaths.forEach(sourcePath => {
    if (!sourcePath || !path.extname(sourcePath).match(/^\.epub$/i)) throw new Error(`Expected an EPUB file: ${sourcePath}`)
  })
  const generatedAt = new Date().toISOString()
  const extracted = PUBLICATION_PROFILES.map((profile, index) => extractPublication(sourcePaths[index], profile))
  const episodeDrafts = splitEpisodes(extracted)
  const chapters = buildChapters(episodeDrafts)
  const workRoot = path.join(resolveProjectPath(libraryRoot), 'works', WORK_ID)

  const publications = extracted.map((publication, index) => {
    const profile = publication.profile
    const sourcePath = sourcePaths[index]
    const archivedFileName = `${profile.id}.epub`
    const archivedPath = path.join(workRoot, 'assets', archivedFileName)
    const asset = copyEpubAsset(sourcePath, archivedPath)
    return {
      id: profile.id,
      title: profile.title,
      shortTitle: profile.shortTitle,
      volume: profile.volume,
      episodeRange: profile.episodeRange,
      sourceFileName: profile.sourceFileName,
      epubPath: `/data/library/works/${WORK_ID}/assets/${archivedFileName}`,
      checksumSha256: asset.checksumSha256,
      isbn: profile.isbn,
      publishedYear: profile.publishedYear,
      sourcePageCount: publication.sourcePageCount,
      readablePageCount: publication.pages.length,
      firstChapterId: `episode-${String(profile.episodeRange[0]).padStart(3, '0')}`,
      mediaType: 'application/epub+zip',
      byteLength: asset.byteLength,
    }
  })

  const rawSourcePages = extracted.reduce((sum, publication) => sum + publication.sourcePageCount, 0)
  const readablePageKeys = uniqueReadablePages(chapters)
  const totalCharacters = chapters.reduce((sum, chapter) => sum + chapter.charCount, 0)
  const revision = `${PROFILE_VERSION}-${publications.map(publication => publication.checksumSha256.slice(0, 8)).join('-')}`
  const work = {
    id: WORK_ID,
    title: 'Sri Gur Panth Prakash',
    shortTitle: 'Panth Prakash',
    description: 'The English translation of Rattan Singh Bhangoo’s Sri Gur Panth Prakash, presented as one continuous 169-episode work across two source volumes.',
    language: 'en',
    source: 'epub',
    revision,
    contributors: [
      { name: 'Rattan Singh Bhangoo', role: 'author' },
      { name: 'Kulwant Singh', role: 'translator' },
      { name: 'Institute of Sikh Studies', role: 'publisher' },
    ],
    publications,
    editionNote: 'Reader edition generated from the English-facing pages in the supplied bilingual EPUB volumes. Episode boundaries come from the numbered headings in the body text.',
    sourceQualityNote: 'The source EPUBs were generated with automated character recognition and contain OCR errors. This reader preserves the source wording, removes running headers, and excludes the corrupted source-language/transliteration pages from the default English reading sequence.',
    totalPages: rawSourcePages,
    totalSourcePages: rawSourcePages,
    readablePages: readablePageKeys.size,
    totalCharacters,
    totalChapters: chapters.length,
    provenancePath: `/data/library/works/${WORK_ID}/provenance.json`,
    searchIndexPath: `/data/library/works/${WORK_ID}/search-index.json`,
    episodeIndexPath: `/data/library/works/${WORK_ID}/episodes.json`,
    chapterIndexPath: `/data/library/works/${WORK_ID}/chapters.json`,
    chapterPathTemplate: `/data/library/works/${WORK_ID}/chapters/:chapterId.json`,
    validationPath: `/data/library/works/${WORK_ID}/validation.json`,
  }

  const allBlocks = chapters.flatMap(chapter => chapter.pages.flatMap(page => page.blocks))
  const emptyEpisodes = chapters.filter(chapter => chapter.charCount === 0).map(chapter => chapter.episodeNumber)
  const episodeNumbers = chapters.map(chapter => chapter.episodeNumber)
  const missingEpisodes = Array.from({ length: 169 }, (_value, index) => index + 1).filter(number => !episodeNumbers.includes(number))
  const oversizedBlocks = allBlocks.filter(block => block.text.length > 600)
  const volumeEpisodeCounts = Object.fromEntries(PUBLICATION_PROFILES.map(profile => [profile.id, chapters.filter(chapter => chapter.publicationId === profile.id).length]))
  const checksumMatches = publications.every((publication, index) => publication.checksumSha256 === sha256File(sourcePaths[index]))
  const sourceCountsMatch = extracted.every(publication => publication.sourcePageCount === publication.profile.expectedSourcePageCount)
  const readableCountsMatch = extracted.every(publication => publication.pages.length === publication.profile.expectedReadablePageCount)
  const passed = chapters.length === 169
    && emptyEpisodes.length === 0
    && missingEpisodes.length === 0
    && rawSourcePages === 1413
    && readablePageKeys.size === 637
    && volumeEpisodeCounts['volume-1'] === 81
    && volumeEpisodeCounts['volume-2'] === 88
    && oversizedBlocks.length === 0
    && checksumMatches
    && sourceCountsMatch
    && readableCountsMatch

  const validation = {
    status: passed ? 'passed' : 'failed',
    generatedAt,
    profile: PROFILE_VERSION,
    source: {
      rawPageCount: rawSourcePages,
      readableEnglishPageCount: readablePageKeys.size,
      sourceCountsMatch,
      readableCountsMatch,
      archivedChecksumsMatch: checksumMatches,
      volumes: extracted.map((publication, index) => ({
        publicationId: publication.profile.id,
        sourceFileName: publications[index].sourceFileName,
        checksumSha256: publications[index].checksumSha256,
        sourcePageCount: publication.sourcePageCount,
        readablePageCount: publication.pages.length,
        readableRange: {
          first: publication.profile.firstReadableSourcePage,
          last: publication.profile.lastReadableSourcePage,
          step: 2,
        },
      })),
    },
    episodes: {
      total: chapters.length,
      volumeEpisodeCounts,
      missing: missingEpisodes,
      empty: emptyEpisodes,
      sharedBoundaryPages: [
        { publicationId: 'volume-1', sourcePageNumber: 215, episodes: [25, 26] },
        { publicationId: 'volume-2', sourcePageNumber: 507, episodes: [128, 129] },
        { publicationId: 'volume-2', sourcePageNumber: 511, episodes: [131, 132] },
      ],
    },
    semantics: {
      totalBlocks: allBlocks.length,
      headings: allBlocks.filter(block => block.type === 'heading').length,
      meters: allBlocks.filter(block => block.type === 'meter').length,
      verses: allBlocks.filter(block => block.type === 'verse').length,
      paragraphs: allBlocks.filter(block => block.type === 'paragraph').length,
      notes: allBlocks.filter(block => block.type === 'note').length,
      invocations: allBlocks.filter(block => block.type === 'invocation').length,
      largestBlockCharacters: Math.max(0, ...allBlocks.map(block => block.text.length)),
      blocksOver600Characters: oversizedBlocks.map(block => block.id),
    },
  }

  const searchIndex = {
    works: [{
      id: WORK_ID,
      title: work.title,
      aliases: ['Sri Gur Panth Prakash', 'Panth Prakash', 'Pracheen Panth Prakash', 'Prachin Panth Prakash'],
    }],
    chapters: chapters.map(chapterSearchEntry),
    metadata: {
      panthPrakash: {
        totalChapters: chapters.length,
        totalEpisodes: chapters.length,
        totalSourcePages: rawSourcePages,
        readablePages: readablePageKeys.size,
        source: 'epub',
        generatedAt,
      },
    },
  }
  const provenance = {
    workId: WORK_ID,
    profile: PROFILE_VERSION,
    generatedAt,
    generatedFrom: publications.map(publication => ({
      publicationId: publication.id,
      sourceFileName: publication.sourceFileName,
      checksumSha256: publication.checksumSha256,
      archivedEpubPath: publication.epubPath,
    })),
    selection: {
      purpose: 'English reader edition',
      rules: [
        'Volume I retains odd-numbered EPUB source pages 47 through 535 inclusive.',
        'Volume II retains odd-numbered EPUB source pages 57 through 839 inclusive.',
        'Preliminary matter, references, indexes, and corrupted source-language/transliteration facing pages are excluded from the default reading sequence.',
        'Episodes split on sequential in-body Episode 1 through Episode 169 headings; repeated “contd.” headings remain inside their episode.',
      ],
    },
    transformations: [
      'HTML tags and executable markup removed.',
      'Whitespace normalized and running Sri Gur Panth Prakash page headers removed.',
      'Source wording and OCR spellings retained without silent correction.',
      'Meter labels, numbered verses, headings, notes, and residual prose represented as semantic blocks.',
      'Long blocks split at punctuation or whitespace for readable layout without changing word order.',
      'Redundant “Episode about/of” wording removed from display titles; body text remains unchanged.',
      'Episode 3 has no descriptive heading in the body; its display title is taken from the source volume’s contents page.',
    ],
    locatorPolicy: 'Chapter startPosition is the one-based cumulative word position. Page locators retain publication ID, EPUB source href, source page number, and printed page number.',
  }

  const result = publishCuratedWork({
    libraryRoot,
    work,
    chapters,
    searchIndex,
    provenance,
    validation,
  })
  writeJson(path.join(result.workRoot, 'episodes.json'), chapters.map(chapter => ({
    episodeNumber: chapter.episodeNumber,
    title: chapter.title,
    startPage: chapter.startSourcePage,
    endPage: chapter.endSourcePage,
    volume: chapter.volume,
    chapterId: chapter.id,
  })))

  if (!passed) throw new Error(`Panth Prakash validation failed. See ${path.join(result.workRoot, 'validation.json')}`)
  return { work, chapters, validation, provenance }
}
