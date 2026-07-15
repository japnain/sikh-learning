import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

export function resolveProjectPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(PROJECT_ROOT, filePath)
}

export function readJson(filePath, fallback = undefined) {
  const resolvedPath = resolveProjectPath(filePath)
  if (!fs.existsSync(resolvedPath)) return fallback
  return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'))
}

export function writeJson(filePath, value) {
  const resolvedPath = resolveProjectPath(filePath)
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true })
  fs.writeFileSync(resolvedPath, `${JSON.stringify(value, null, 2)}\n`)
}

export function listEpubFiles(epubPath) {
  return execFileSync('unzip', ['-Z1', resolveProjectPath(epubPath)], { encoding: 'utf8' })
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

export function readEpubFile(epubPath, fileName) {
  return execFileSync('unzip', ['-p', resolveProjectPath(epubPath), fileName], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 32,
  })
}

export function decodeEntities(text) {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
}

function attributeFallbackText(attributes) {
  const text = decodeEntities(attributes)
    .replace(/\b(?:class|id|style|href|src|alt|title|lang|xml:lang|xmlns|epub:[\w-]+)\s*=\s*"[^"]*"/gi, ' ')
    .replace(/=""|=''/g, ' ')
    .replace(/[="'<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return /[A-Za-z]/.test(text) ? text : ''
}

export function htmlToText(html) {
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html
  const text = body
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(p|div|li|h[1-6])\b([^>]*)\/>/gi, (_match, _tag, attributes) => ` ${attributeFallbackText(attributes)} `)
    .replace(/<(p|div|li|h[1-6])\b([^>]*)>/gi, (_match, _tag, attributes) => {
      const fallback = attributeFallbackText(attributes)
      return fallback ? ` ${fallback} ` : ' '
    })
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')

  return decodeEntities(text).replace(/\s+/g, ' ').trim()
}

function normalizeExtractedText(text) {
  return text
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.replace(/[\t\f\v ]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim()
}

function parseInertDocument(source, contentType = 'text/html') {
  try {
    return new JSDOM(source, { contentType }).window.document
  } catch {
    return new JSDOM(source).window.document
  }
}

function semanticBlockType(element) {
  const tagName = element.localName.toLowerCase()
  if (/^h[1-6]$/.test(tagName)) return 'heading'
  if (['blockquote', 'pre', 'aside'].includes(tagName)) return 'note'

  let context = ''
  for (let current = element; current; current = current.parentElement) {
    context += ` ${current.getAttribute('class') ?? ''}`
    context += ` ${current.getAttribute('epub:type') ?? ''}`
    context += ` ${current.getAttribute('role') ?? ''}`
    if (current.localName.toLowerCase() === 'body') break
  }

  if (/\b(?:footnote|endnote|rearnote|sidebar|annotation|note)\b/i.test(context)) return 'note'
  if (/\b(?:verse|poem|poetry|stanza|linegroup|line-group)\b/i.test(context)) return 'verse'
  return 'paragraph'
}

/**
 * Reduces an XHTML reading-order document to inert, typed text segments. The
 * browser never receives source markup: only these plain strings are published.
 */
export function htmlToSemanticTextBlocks(html) {
  const document = parseInertDocument(html)
  const body = document.body ?? document.documentElement
  if (!body) return []

  body.querySelectorAll('script, style, template, noscript, iframe, object, embed, svg, canvas')
    .forEach(element => element.remove())
  body.querySelectorAll('br').forEach(element => element.replaceWith(document.createTextNode('\n')))

  const atomicSelector = 'h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, aside, dt, dd, figcaption, caption'
  const segments = []
  for (const element of body.querySelectorAll(atomicSelector)) {
    if (element.parentElement?.closest(atomicSelector)) continue
    const text = normalizeExtractedText(element.textContent ?? '')
    if (!text) continue
    segments.push({ type: semanticBlockType(element), text })
  }

  if (segments.length) return segments
  const fallbackText = htmlToText(html)
  return fallbackText ? [{ type: 'paragraph', text: fallbackText }] : []
}

export function sha256File(filePath) {
  return createHash('sha256').update(fs.readFileSync(resolveProjectPath(filePath))).digest('hex')
}

export function copyEpubAsset(sourcePath, destinationPath) {
  const source = resolveProjectPath(sourcePath)
  const destination = resolveProjectPath(destinationPath)
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  if (path.resolve(source) !== path.resolve(destination)) fs.copyFileSync(source, destination)
  return {
    checksumSha256: sha256File(destination),
    byteLength: fs.statSync(destination).size,
  }
}

export function removeUnreferencedJsonFiles(directoryPath, expectedIds) {
  const directory = resolveProjectPath(directoryPath)
  if (!fs.existsSync(directory)) return
  const expected = new Set(expectedIds.map(id => `${id}.json`))
  for (const fileName of fs.readdirSync(directory)) {
    if (fileName.endsWith('.json') && !expected.has(fileName)) {
      fs.rmSync(path.join(directory, fileName), { force: true })
    }
  }
}

function mergeById(items, replacement) {
  const next = (Array.isArray(items) ? items : []).filter(item => item?.id !== replacement.id)
  next.push(replacement)
  return next.sort((a, b) => String(a.title ?? a.id).localeCompare(String(b.title ?? b.id)))
}

/**
 * Publishes one generated work without disturbing any other work in the catalog.
 * Profiles own extraction and editorial rules; this function owns stable paths,
 * catalog merging, and the lightweight global search registry.
 */
export function publishCuratedWork({
  libraryRoot = 'public/data/library',
  work,
  chapters,
  searchIndex,
  provenance,
  validation,
}) {
  const resolvedLibraryRoot = resolveProjectPath(libraryRoot)
  const workRoot = path.join(resolvedLibraryRoot, 'works', work.id)
  const chaptersRoot = path.join(workRoot, 'chapters')
  fs.mkdirSync(chaptersRoot, { recursive: true })

  for (const chapter of chapters) {
    writeJson(path.join(chaptersRoot, `${chapter.id}.json`), chapter)
  }
  removeUnreferencedJsonFiles(chaptersRoot, chapters.map(chapter => chapter.id))

  const chapterIndex = chapters.map(({ pages: _pages, source: _source, previousChapterId: _previous, nextChapterId: _next, ...entry }) => ({
    ...entry,
    pageCount: _pages.length,
    path: `/data/library/works/${work.id}/chapters/${entry.id}.json`,
  }))

  writeJson(path.join(workRoot, 'chapters.json'), chapterIndex)
  writeJson(path.join(workRoot, 'work.json'), work)
  writeJson(path.join(workRoot, 'search-index.json'), searchIndex)
  writeJson(path.join(workRoot, 'provenance.json'), provenance)
  writeJson(path.join(workRoot, 'validation.json'), validation)

  const catalogPath = path.join(resolvedLibraryRoot, 'works.json')
  const catalog = readJson(catalogPath, [])
  writeJson(catalogPath, mergeById(catalog, work))

  const globalSearchPath = path.join(resolvedLibraryRoot, 'search-index.json')
  const previousGlobalSearch = readJson(globalSearchPath, {}) ?? {}
  const globalWorkEntry = searchIndex.works.find(entry => entry.id === work.id) ?? {
    id: work.id,
    title: work.title,
    aliases: [work.title, work.shortTitle].filter(Boolean),
  }
  const otherChapters = (previousGlobalSearch.chapters ?? []).filter(entry => entry.workId !== work.id)
  const otherPages = (previousGlobalSearch.pages ?? []).filter(entry => entry.workId !== work.id)
  const otherEpisodes = (previousGlobalSearch.episodes ?? []).filter(entry => entry.workId !== work.id)
  const metadata = { ...(previousGlobalSearch.metadata ?? {}) }
  if (searchIndex.metadata?.panthPrakash) metadata.panthPrakash = searchIndex.metadata.panthPrakash

  writeJson(globalSearchPath, {
    works: mergeById(previousGlobalSearch.works, globalWorkEntry),
    ...(otherPages.length ? { pages: otherPages } : {}),
    ...(otherEpisodes.length ? { episodes: otherEpisodes } : {}),
    ...(otherChapters.length ? { chapters: otherChapters } : {}),
    ...(Object.keys(metadata).length ? { metadata } : {}),
  })

  writeJson(path.join(resolvedLibraryRoot, 'manifest.json'), {
    version: '3.0.0',
    generatedAt: validation.generatedAt,
    workCatalogPath: '/data/library/works.json',
    searchIndexPath: '/data/library/search-index.json',
  })

  return { workRoot, chapterIndex }
}

function parseAttributes(source) {
  const attributes = {}
  for (const match of source.matchAll(/([\w:.-]+)\s*=\s*["']([^"']*)["']/g)) {
    attributes[match[1]] = decodeEntities(match[2])
  }
  return attributes
}

function safeDecodeUriComponent(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function resolveZipPath(baseFile, href) {
  const decodedHref = safeDecodeUriComponent(href)
  return decodedHref.startsWith('/')
    ? path.posix.normalize(decodedHref.slice(1))
    : path.posix.normalize(path.posix.join(path.posix.dirname(baseFile), decodedHref))
}

function resolveNavigationHref(baseFile, href) {
  const normalizedHref = decodeEntities(href).trim()
  if (!normalizedHref || /^[a-z][a-z\d+.-]*:/i.test(normalizedHref)) return undefined
  const hashIndex = normalizedHref.indexOf('#')
  const resourceHref = (hashIndex >= 0 ? normalizedHref.slice(0, hashIndex) : normalizedHref)
    .replace(/\?.*$/, '')
  const fragment = hashIndex >= 0
    ? safeDecodeUriComponent(normalizedHref.slice(hashIndex + 1)) || undefined
    : undefined
  return {
    href: normalizedHref,
    fullPath: resourceHref ? resolveZipPath(baseFile, resourceHref) : baseFile,
    ...(fragment ? { fragment } : {}),
  }
}

function parseEpub3Navigation(source, navPath) {
  const document = parseInertDocument(source, 'application/xhtml+xml')
  const navElements = Array.from(document.getElementsByTagNameNS('*', 'nav'))
  const tocNav = navElements.find(element => {
    const type = `${element.getAttribute('epub:type') ?? ''} ${element.getAttribute('type') ?? ''}`
    return /\btoc\b/i.test(type)
  }) ?? navElements[0]
  if (!tocNav) return []

  const entries = []
  for (const anchor of tocNav.querySelectorAll('a[href]')) {
    const title = normalizeExtractedText(anchor.textContent ?? '').replace(/\s+/g, ' ')
    const target = resolveNavigationHref(navPath, anchor.getAttribute('href') ?? '')
    if (title && target) entries.push({ title, ...target })
  }
  return entries
}

function childByLocalName(element, localName) {
  const expectedName = localName.toLowerCase()
  return Array.from(element.children).find(child => child.localName.toLowerCase() === expectedName)
}

function descendantByLocalName(element, localName) {
  const expectedName = localName.toLowerCase()
  return Array.from(element.getElementsByTagName('*'))
    .find(child => child.localName.toLowerCase() === expectedName)
}

function parseNcxNavigation(source, ncxPath) {
  const document = parseInertDocument(source, 'application/xml')
  const entries = []
  const navPoints = Array.from(document.getElementsByTagName('*'))
    .filter(element => element.localName.toLowerCase() === 'navpoint')
  for (const navPoint of navPoints) {
    const label = childByLocalName(navPoint, 'navLabel')
    const labelText = label ? descendantByLocalName(label, 'text') : undefined
    const content = childByLocalName(navPoint, 'content')
    const title = normalizeExtractedText(labelText?.textContent ?? '').replace(/\s+/g, ' ')
    const target = resolveNavigationHref(ncxPath, content?.getAttribute('src') ?? '')
    if (title && target) entries.push({ title, ...target })
  }
  return entries
}

export function inspectEpub(epubPath) {
  const resolvedEpubPath = resolveProjectPath(epubPath)
  const files = listEpubFiles(resolvedEpubPath)
  const container = readEpubFile(resolvedEpubPath, 'META-INF/container.xml')
  const packagePath = parseAttributes(container.match(/<rootfile\b([^>]*)\/?\s*>/i)?.[1] ?? '')['full-path']
  if (!packagePath) throw new Error(`EPUB has no package rootfile: ${epubPath}`)

  const packageDocument = readEpubFile(resolvedEpubPath, packagePath)
  const manifest = new Map()
  for (const match of packageDocument.matchAll(/<item\b([^>]*)\/?\s*>/gi)) {
    const attributes = parseAttributes(match[1])
    if (!attributes.id || !attributes.href) continue
    manifest.set(attributes.id, {
      id: attributes.id,
      href: attributes.href,
      mediaType: attributes['media-type'],
      properties: attributes.properties ?? '',
      fullPath: resolveZipPath(packagePath, attributes.href),
    })
  }

  const spine = []
  for (const match of packageDocument.matchAll(/<itemref\b([^>]*)\/?\s*>/gi)) {
    const attributes = parseAttributes(match[1])
    const item = manifest.get(attributes.idref)
    if (item) spine.push(item)
  }

  const spineAttributes = parseAttributes(packageDocument.match(/<spine\b([^>]*)>/i)?.[1] ?? '')
  const epub3NavItem = Array.from(manifest.values()).find(item =>
    item.properties.split(/\s+/).includes('nav')
  )
  const ncxItem = manifest.get(spineAttributes.toc) ?? Array.from(manifest.values()).find(item =>
    item.mediaType === 'application/x-dtbncx+xml'
  )
  let toc = []
  if (epub3NavItem && files.includes(epub3NavItem.fullPath)) {
    toc = parseEpub3Navigation(readEpubFile(resolvedEpubPath, epub3NavItem.fullPath), epub3NavItem.fullPath)
  }
  if (!toc.length && ncxItem && files.includes(ncxItem.fullPath)) {
    toc = parseNcxNavigation(readEpubFile(resolvedEpubPath, ncxItem.fullPath), ncxItem.fullPath)
  }

  const metadata = {}
  for (const field of ['title', 'creator', 'language', 'publisher', 'identifier', 'description']) {
    const value = packageDocument.match(new RegExp(`<dc:${field}\\b[^>]*>([\\s\\S]*?)<\\/dc:${field}>`, 'i'))?.[1]
    if (value) metadata[field] = decodeEntities(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
  }

  return {
    epubPath: resolvedEpubPath,
    files,
    packagePath,
    metadata,
    manifest,
    spine,
    toc,
  }
}

export function slugify(text, fallback = 'section') {
  return text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56) || fallback
}

export function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length
}
