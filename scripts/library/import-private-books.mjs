#!/usr/bin/env node
/**
 * Trusted, offline private-library staging importer. Never publishes to the app.
 * Usage: node scripts/library/import-private-books.mjs --manifest /private/batch.json --out /private/build
 * The private manifest is { books: [{ id, title, authors: [], description, category,
 * language, files: [{ path, format: 'epub'|'pdf', primary?: true }], coverPath? }] }.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../..')
const VERSION = 'private-import-v1'
const MAX_FILE = 128 * 1024 * 1024
const MAX_DOCUMENT = 16 * 1024 * 1024
const MAX_PAGES = 10000
const ID = /^[a-z0-9][a-z0-9_-]{0,95}$/
const UNSAFE = 'script,style,template,noscript,iframe,object,embed,canvas,form,input,button,video,audio'
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const text = value => String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim()
const json = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })

function canonicalFuturePath(value) {
  let existing = path.resolve(value)
  const missing = []
  while (!fs.existsSync(existing)) { missing.unshift(path.basename(existing)); existing = path.dirname(existing) }
  return path.join(fs.realpathSync(existing), ...missing)
}

export function assertPrivateOutput(directory) {
  const out = canonicalFuturePath(directory)
  const relative = path.relative(fs.realpathSync(REPO), out)
  if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== '..')) {
    throw new Error('Private output must be outside the application repository')
  }
  return out
}

function parseArgs(argv) {
  const args = {}
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]
    if (!['--manifest', '--out'].includes(key) || !argv[index + 1]) throw new Error('Expected --manifest <file> --out <directory>')
    args[key.slice(2)] = argv[index + 1]
  }
  if (!args.manifest || !args.out) throw new Error('Expected --manifest <file> --out <directory>')
  return args
}

function bytesOf(file) {
  const stat = fs.statSync(file)
  if (!stat.isFile() || stat.size > MAX_FILE || stat.size === 0) throw new Error('Source is empty, oversized, or not a regular file')
  return fs.readFileSync(file)
}

function imageType(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return ['image/png', 'png']
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return ['image/jpeg', 'jpg']
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return ['image/webp', 'webp']
  if (bytes.toString('ascii', 4, 8) === 'ftyp' && /avif|avis/.test(bytes.toString('ascii', 8, 24))) return ['image/avif', 'avif']
  return null
}

function parseDocument(source, xml = false) {
  // No resources, runScripts or external entity fetching is enabled.
  if (xml) return new JSDOM(source, { contentType: 'application/xml' })
  // EPUB XHTML allows self-closing non-void elements (<title/>, <a/>). Parsing
  // those directly as HTML can consume the entire following reading body.
  try {
    const dom = new JSDOM(source, { contentType: 'application/xhtml+xml' })
    if (dom.window.document.body) return dom
    dom.window.close()
  } catch { /* Some older EPUBs contain HTML entities or malformed XHTML. */ }
  return new JSDOM(source.replace(/<title\b([^>]*?)\/\s*>/gi, '<title$1></title>'), { contentType: 'text/html' })
}

function elements(document, localName) { return [...document.getElementsByTagName('*')].filter(el => el.localName === localName) }

function localReference(current, reference) {
  if (!reference || /^[a-z][a-z\d+.-]*:/i.test(reference) || reference.startsWith('//') || reference.includes('\\')) return null
  const [rawPath, rawAnchor] = reference.split('#', 2)
  let decoded
  let anchor
  try { decoded = decodeURIComponent(rawPath.split('?', 1)[0]); anchor = rawAnchor ? decodeURIComponent(rawAnchor) : undefined } catch { return null }
  if (decoded.startsWith('/') || decoded.includes('\\') || decoded.includes('\0')) return null
  const file = decoded ? path.posix.normalize(path.posix.join(path.posix.dirname(current), decoded)) : current
  if (file === '..' || file.startsWith('../') || file.startsWith('/')) return null
  return { file, anchor }
}

function readSource(root, files, name) {
  if (!files.has(name)) throw new Error('EPUB references a missing document')
  const bytes = bytesOf(path.join(root, name))
  if (bytes.length > MAX_DOCUMENT) throw new Error('EPUB document exceeds the parsing limit')
  return bytes.toString('utf8')
}

function normalizedText(element) {
  const clone = element.cloneNode(true)
  clone.querySelectorAll?.(UNSAFE).forEach(el => el.remove())
  clone.querySelectorAll?.('img,svg').forEach(el => el.remove())
  clone.querySelectorAll?.('br').forEach(el => el.replaceWith(clone.ownerDocument.createTextNode('\n')))
  clone.querySelectorAll?.('p,li,div,blockquote,tr').forEach(el => {
    el.before(clone.ownerDocument.createTextNode('\n'))
    el.after(clone.ownerDocument.createTextNode('\n'))
  })
  return text(clone.textContent).split('\n').map(line => line.replace(/[\t ]+/g, ' ').trim()).filter(Boolean).join('\n')
}

function contextType(element, fallback) {
  for (let el = element; el; el = el.parentElement) {
    const context = `${el.getAttribute('class') ?? ''} ${el.getAttribute('epub:type') ?? ''} ${el.getAttribute('role') ?? ''}`
    if (/footnote|endnote|rearnote|doc-footnote/.test(context)) return 'note'
    if (/\b(poem|poetry|verse|stanza|linegroup)\b/.test(context)) return 'verse'
  }
  return fallback
}

function checkSvgFidelity(svg, warnings) {
  const all = [svg, ...svg.querySelectorAll('*')]
  if (all.some(el => !['svg', 'g', 'image', 'title', 'desc'].includes(el.localName))) warnings.add('Embedded vector artwork or text requires review')
  if (!svg.querySelector('image')) warnings.add('Embedded vector artwork requires review')
  if (all.some(el => ['transform', 'clip-path', 'mask', 'filter'].some(attribute => el.hasAttribute(attribute))
    || (el.hasAttribute('opacity') && el.getAttribute('opacity') !== '1')
    || /transform|clip|mask|filter|opacity/.test(el.getAttribute('style') ?? ''))) warnings.add('SVG transformation or clipping requires review')
  const viewBox = (svg.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number)
  const hasViewBox = viewBox.length === 4 && viewBox.every(Number.isFinite)
  if (hasViewBox && (viewBox[0] !== 0 || viewBox[1] !== 0)) warnings.add('SVG image placement requires review')
  for (const image of svg.querySelectorAll('image')) {
    const x = image.getAttribute('x') ?? '0'
    const y = image.getAttribute('y') ?? '0'
    if (Number(x) !== 0 || Number(y) !== 0) warnings.add('SVG image placement requires review')
    if (hasViewBox && ['width', 'height'].some((attribute, index) => image.hasAttribute(attribute)
      && Number(image.getAttribute(attribute)) !== viewBox[index + 2])) warnings.add('SVG image placement requires review')
    if (image.getAttribute('preserveAspectRatio') === 'none') warnings.add('SVG image scaling requires review')
  }
}

export function validatePrivateMetadata(book) {
  const validString = (value, maximum) => typeof value === 'string' && value.length <= maximum
  if (!ID.test(book.id) || !validString(book.title, 500) || !book.title
    || (book.subtitle !== undefined && !validString(book.subtitle, 1000))
    || !Array.isArray(book.authors) || !book.authors.length || book.authors.length > 50 || !book.authors.every(value => validString(value, 300))
    || (book.contributors !== undefined && (!Array.isArray(book.contributors) || book.contributors.length > 50 || !book.contributors.every(value => validString(value, 300))))
    || !validString(book.description, 10000) || !validString(book.category, 200) || !validString(book.language, 50)
    || !Array.isArray(book.contents) || book.contents.length > MAX_PAGES
    || book.contents.some(entry => !ID.test(entry.id) || !validString(entry.title, 1000)
      || (entry.page !== undefined && (!Number.isInteger(entry.page) || entry.page < 1 || entry.page > MAX_PAGES)))
    || (book.pageCount !== undefined && (!Number.isInteger(book.pageCount) || book.pageCount < 1 || book.pageCount > MAX_PAGES))) {
    throw new Error('Generated book metadata exceeds the private gateway contract bounds')
  }
}

function createWriter(out, bookId, editionVersion) {
  const assets = new Map()
  const directory = path.join(out, 'assets', bookId)
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 })
  return {
    assets,
    add(bytes, contentType, extension) {
      if (!bytes.length || bytes.length > MAX_FILE) throw new Error('Generated asset exceeds allowed size')
      const checksum = sha(bytes)
      const id = `a_${sha(`${bookId}:${contentType}:${checksum}`).slice(0, 40)}`
      if (!assets.has(id)) {
        const destination = path.join(directory, `${id}.${extension}`)
        fs.writeFileSync(destination, bytes, { mode: 0o600 })
        assets.set(id, { id, bookId, objectKey: `${bookId}/${editionVersion}/${id}.${extension}`, contentType, size: bytes.length, checksum, path: destination })
      }
      return id
    },
  }
}

function pdfMetadata(file, temp) {
  const cover = path.join(temp, 'pdf-cover.jpg')
  if (process.platform === 'darwin') {
    const result = execFileSync('swift', ['-module-cache-path', path.join(os.tmpdir(), 'naamras-swift-module-cache'), path.join(HERE, 'lib/private-pdf-metadata.swift'), file, cover], {
      encoding: 'utf8', timeout: 120000, maxBuffer: 1024 * 1024,
      env: { ...process.env, CLANG_MODULE_CACHE_PATH: path.join(os.tmpdir(), 'naamras-swift-module-cache') },
    })
    return { ...JSON.parse(result), cover }
  }
  const program = `import fitz,json,sys\ndoc=fitz.open(sys.argv[1])\nassert not doc.is_encrypted and len(doc)>0\npage=doc[0]\npage.get_pixmap(matrix=fitz.Matrix(480/page.rect.width,480/page.rect.width),alpha=False).save(sys.argv[2])\nprint(json.dumps({'pageCount':len(doc),'outline':[{'title':r[1],'page':r[2]} for r in doc.get_toc()]}))`
  const result = execFileSync('python3', ['-c', program, file, cover], { encoding: 'utf8', timeout: 120000 })
  return { ...JSON.parse(result), cover }
}

function importPdf(file, writer, temp) {
  const bytes = bytesOf(file)
  if (!bytes.subarray(0, 1024).includes(Buffer.from('%PDF-'))) throw new Error('PDF signature was not found')
  const primaryAssetId = writer.add(bytes, 'application/pdf', 'pdf')
  const info = pdfMetadata(file, temp)
  if (!Number.isInteger(info.pageCount) || info.pageCount < 1 || info.pageCount > MAX_PAGES) throw new Error('Invalid PDF page count')
  const coverAssetId = writer.add(bytesOf(info.cover), 'image/jpeg', 'jpg')
  const contents = info.outline.length ? info.outline.map((item, index) => ({ id: `section-${index + 1}`, title: text(item.title).slice(0, 1000), page: item.page })) : [{ id: 'page-1', title: 'Beginning', page: 1 }]
  return { renderer: 'pdf', primaryAssetId, coverAssetId, pageCount: info.pageCount, contents, checks: { pageCount: info.pageCount, outlineCount: info.outline.length } }
}

function importEpub(file, writer, temp, requestedRenderer) {
  const extracted = path.join(temp, 'epub')
  const extraction = JSON.parse(execFileSync('python3', [path.join(HERE, 'lib/private-epub-extract.py'), file, extracted], { encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024 }))
  const files = new Set(extraction.files)
  const warnings = new Set()
  const container = parseDocument(readSource(extracted, files, 'META-INF/container.xml'), true)
  const opfPath = elements(container.window.document, 'rootfile')[0]?.getAttribute('full-path')
  container.window.close()
  if (!opfPath || !files.has(opfPath)) throw new Error('EPUB package location is missing')
  const packageDOM = parseDocument(readSource(extracted, files, opfPath), true)
  const packageDoc = packageDOM.window.document
  const manifest = new Map(elements(packageDoc, 'item').map(el => {
    const resolved = localReference(opfPath, el.getAttribute('href'))
    return [el.getAttribute('id'), { file: resolved?.file, media: el.getAttribute('media-type'), properties: el.getAttribute('properties') ?? '' }]
  }))
  const spine = elements(packageDoc, 'itemref').map(el => {
    const item = manifest.get(el.getAttribute('idref'))
    if (!item) throw new Error('EPUB spine references a missing manifest item')
    return item
  })
  if (!spine.length || spine.length > 5000) throw new Error('EPUB has no usable bounded spine')
  const coverId = elements(packageDoc, 'meta').find(el => el.getAttribute('name') === 'cover')?.getAttribute('content')
  const coverItem = [...manifest.values()].find(item => /\bcover-image\b/.test(item.properties)) ?? manifest.get(coverId)
  packageDOM.window.close()
  const spineDocuments = spine.filter(item => /(?:xhtml|html|svg)/i.test(item.media ?? '')).map((item, index) => ({ ...item, chapterId: `chapter-${String(index + 1).padStart(4, '0')}` }))
  if (!spineDocuments.length) throw new Error('EPUB has no supported reading documents')
  if (spineDocuments.length !== spine.length) warnings.add('A spine item uses an unsupported document type')
  const chapterByFile = new Map()
  for (const item of spineDocuments) if (!chapterByFile.has(item.file)) chapterByFile.set(item.file, item.chapterId)
  const manifestByFile = new Map([...manifest.values()].filter(item => item.file).map(item => [item.file, item]))
  let auxiliaryDocuments = 0
  function registerReference(currentFile, href) {
    const resolved = localReference(currentFile, href)
    if (!resolved || chapterByFile.has(resolved.file)) return resolved
    const target = manifestByFile.get(resolved.file)
    if (target && /(?:xhtml|html)/i.test(target.media ?? '')) {
      if (spineDocuments.length >= 5000) throw new Error('Linked EPUB documents exceed the import limit')
      const chapterId = `chapter-${String(spineDocuments.length + 1).padStart(4, '0')}`
      spineDocuments.push({ ...target, chapterId })
      chapterByFile.set(target.file, chapterId)
      auxiliaryDocuments += 1
    } else warnings.add('A local reference targets unsupported or missing content')
    return resolved
  }
  const navigation = new Map()
  for (const item of manifest.values()) {
    if (!item.file || (!/\bnav\b/.test(item.properties) && item.media !== 'application/x-dtbncx+xml')) continue
    const dom = parseDocument(readSource(extracted, files, item.file), item.media === 'application/x-dtbncx+xml')
    try {
      const entries = item.media === 'application/x-dtbncx+xml'
        ? elements(dom.window.document, 'navPoint').map(el => ({ href: elements(el, 'content')[0]?.getAttribute('src'), label: elements(el, 'text')[0]?.textContent }))
        : [...dom.window.document.querySelectorAll('nav a[href]')].map(el => ({ href: el.getAttribute('href'), label: el.textContent }))
      for (const entry of entries) {
        const resolved = localReference(item.file, entry.href)
        if (resolved && !navigation.has(resolved.file)) navigation.set(resolved.file, text(entry.label))
      }
    } finally { dom.window.close() }
  }
  const imageCache = new Map()
  function addImage(current, href) {
    const resolved = localReference(current, href)
    if (!resolved || !files.has(resolved.file)) { warnings.add('An external or missing image was excluded'); return null }
    if (imageCache.has(resolved.file)) return imageCache.get(resolved.file)
    const bytes = bytesOf(path.join(extracted, resolved.file))
    const type = imageType(bytes)
    if (!type) { warnings.add('An unsupported image requires review'); return null }
    const id = writer.add(bytes, ...type)
    imageCache.set(resolved.file, id)
    return id
  }
  let coverAssetId = coverItem?.file ? addImage(opfPath, path.posix.relative(path.posix.dirname(opfPath), coverItem.file)) : undefined
  const chapters = []
  const pages = []
  const anchorTargets = new Map()
  let totalWords = 0
  let emptySpineDocuments = 0
  for (const item of spineDocuments) {
    const dom = parseDocument(readSource(extracted, files, item.file))
    try {
      const document = dom.window.document
      const body = document.body
      body.querySelectorAll(UNSAFE).forEach(el => el.remove())
      body.querySelectorAll('svg').forEach(el => checkSvgFidelity(el, warnings))
      body.querySelectorAll('a[href]').forEach(el => registerReference(item.file, el.getAttribute('href')))
      const chapterId = item.chapterId
      const title = (navigation.get(item.file) || text(body.querySelector('h1,h2,h3')?.textContent) || text(document.title) || `Section ${chapters.length + 1}`).slice(0, 1000)
      const blocks = []
      const pendingAnchors = []
      function linksFor(element) {
        return [...element.querySelectorAll('a[href]')].flatMap(link => {
          const resolved = localReference(item.file, link.getAttribute('href'))
          const targetChapterId = resolved && chapterByFile.get(resolved.file)
          return targetChapterId ? [{ text: text(link.textContent) || 'Reference', targetChapterId, ...(resolved.anchor ? { targetAnchor: resolved.anchor } : {}) }] : []
        })
      }
      function pushBlock(block, element) {
        const anchor = element?.getAttribute('id') || element?.getAttribute('name')
        const links = element ? linksFor(element) : []
        const id = `${chapterId}-b${String(blocks.length + 1).padStart(5, '0')}`
        for (const targetAnchor of pendingAnchors.splice(0)) if (!anchorTargets.has(`${chapterId}#${targetAnchor}`)) anchorTargets.set(`${chapterId}#${targetAnchor}`, id)
        for (const target of element ? [element, ...element.querySelectorAll('[id],a[name]')] : []) {
          const targetAnchor = target.getAttribute('id') || target.getAttribute('name')
          if (targetAnchor && !anchorTargets.has(`${chapterId}#${targetAnchor}`)) anchorTargets.set(`${chapterId}#${targetAnchor}`, id)
        }
        blocks.push({ id, ...block, ...(anchor ? { anchor } : {}), ...(links.length ? { links } : {}) })
      }
      function recordContainerAnchors(element, startingBlock) {
        const target = blocks[startingBlock]
        for (const source of [element, ...element.querySelectorAll('[id],a[name]')]) {
          const targetAnchor = source.getAttribute('id') || source.getAttribute('name')
          if (!targetAnchor || anchorTargets.has(`${chapterId}#${targetAnchor}`)) continue
          if (target) anchorTargets.set(`${chapterId}#${targetAnchor}`, target.id)
          else pendingAnchors.push(targetAnchor)
        }
      }
      function imageElement(element) {
        const href = element.getAttribute('src') || element.getAttribute('href') || element.getAttribute('xlink:href')
        const assetId = addImage(item.file, href)
        if (assetId) {
          pushBlock({ type: 'image', assetId, alt: text(element.getAttribute('alt')) || 'Book illustration' }, element)
          pages.push({ id: `page-${pages.length + 1}`, title: `Page ${pages.length + 1}`, page: pages.length + 1, assetId })
          coverAssetId ??= assetId
        }
      }
      function walk(element) {
        if (element.nodeType === 3) {
          const value = text(element.textContent).replace(/\s+/g, ' ')
          if (value) pushBlock({ type: 'paragraph', text: value })
          return
        }
        if (element.nodeType !== 1) return
        const tag = element.localName.toLowerCase()
        const startingBlock = blocks.length
        if (tag === 'img' || tag === 'image') { imageElement(element); return }
        if (tag === 'svg') {
          const images = [...element.querySelectorAll('image')]
          if (!images.length) warnings.add('Embedded vector artwork requires review')
          images.forEach(imageElement)
          recordContainerAnchors(element, startingBlock)
          return
        }
        if (tag === 'table') {
          const rows = [...element.querySelectorAll('tr')].map(row => [...row.children].filter(cell => ['td','th'].includes(cell.localName)).map(normalizedText)).filter(row => row.length)
          if (rows.length) pushBlock({ type: 'table', rows }, element)
          element.querySelectorAll('img,image').forEach(imageElement)
          recordContainerAnchors(element, startingBlock)
          return
        }
        if (tag === 'ul' || tag === 'ol') {
          const items = [...element.children].filter(el => el.localName === 'li').map(normalizedText).filter(Boolean)
          if (items.length) pushBlock({ type: 'list', items, ordered: tag === 'ol', ...(tag === 'ol' && /^\d+$/.test(element.getAttribute('start') ?? '') ? { start: Number(element.getAttribute('start')) } : {}) }, element)
          element.querySelectorAll('img,image').forEach(imageElement)
          recordContainerAnchors(element, startingBlock)
          return
        }
        if (/^h[1-6]$/.test(tag) || ['p','blockquote','pre','aside','figcaption','dt','dd','li'].includes(tag)) {
          const value = normalizedText(element)
          if (value) {
            const type = /^h[1-6]$/.test(tag) ? 'heading' : contextType(element, tag === 'blockquote' ? 'quote' : tag === 'aside' ? 'note' : tag === 'pre' ? 'verse' : 'paragraph')
            pushBlock({ type, text: value, ...(type === 'heading' ? { level: Number(tag[1]) } : {}) }, element)
          }
          element.querySelectorAll('img,image').forEach(imageElement)
          recordContainerAnchors(element, startingBlock)
          return
        }
        for (const child of element.childNodes) walk(child)
        recordContainerAnchors(element, startingBlock)
      }
      walk(body)
      totalWords += blocks.reduce((count, block) => count + text(block.text || block.items?.join(' ') || block.rows?.flat().join(' ')).split(/\s+/u).filter(Boolean).length, 0)
      if (!blocks.length) { emptySpineDocuments += 1; continue }
      chapters.push({ id: chapterId, title, blocks })
    } finally { dom.window.close() }
  }
  if (!chapters.length) throw new Error('EPUB extraction produced no readable content')
  const importedChapterIds = new Set(chapters.map(chapter => chapter.id))
  for (const chapter of chapters) for (const block of chapter.blocks) if (block.links) {
    block.links = block.links.filter(link => {
      if (importedChapterIds.has(link.targetChapterId)) return true
      warnings.add('An internal reference targets an empty reading document')
      return false
    })
  }
  for (const chapter of chapters) for (const block of chapter.blocks) for (const link of block.links ?? []) {
    if (link.targetAnchor) {
      const target = anchorTargets.get(`${link.targetChapterId}#${link.targetAnchor}`)
      if (target) link.targetAnchor = target
      else { delete link.targetAnchor; warnings.add('An internal reference could only be mapped to its chapter') }
    }
  }
  const retainedDocuments = chapters.length
  // A scanned book can contain hundreds of page images in a single spine
  // document followed by a native-text outline. Keep that outline, but make
  // each image-only page its own section so reading never loads the whole scan.
  const splitChapters = chapters.flatMap(chapter => chapter.blocks.length > 1 && chapter.blocks.every(block => block.type === 'image')
    ? chapter.blocks.map((block, index) => ({ id: `${chapter.id}-page-${String(index + 1).padStart(4, '0')}`, title: `Page ${index + 1}`, blocks: [block] }))
    : [chapter])
  const chapterForBlock = new Map(splitChapters.flatMap(chapter => chapter.blocks.map(block => [block.id, chapter.id])))
  const firstSplitChapter = new Map(chapters.map(chapter => [chapter.id, chapterForBlock.get(chapter.blocks[0].id)]))
  for (const chapter of splitChapters) for (const block of chapter.blocks) for (const link of block.links ?? []) {
    link.targetChapterId = (link.targetAnchor && chapterForBlock.get(link.targetAnchor)) || firstSplitChapter.get(link.targetChapterId) || link.targetChapterId
  }
  chapters.splice(0, chapters.length, ...splitChapters)
  const pageBased = requestedRenderer === 'pages' || (requestedRenderer !== 'chapters' && pages.length >= 3 && totalWords === 0)
  if (pageBased && !pages.length) throw new Error('Page renderer requested without any image pages')
  if (pageBased && totalWords > 0) throw new Error('Page-only rendering would omit native source text; use chapters to preserve it')
  const contents = pageBased ? pages : chapters.map(chapter => ({ id: chapter.id, title: chapter.title, assetId: writer.add(Buffer.from(JSON.stringify(chapter)), 'application/json', 'json') }))
  const searchAssetId = !pageBased && totalWords > 0 ? writer.add(Buffer.from(JSON.stringify({ chapters: chapters.map(chapter => ({ id: chapter.id, title: chapter.title, blocks: chapter.blocks.flatMap(block => {
    const value = text(block.text || block.items?.join('\n') || block.rows?.map(row => row.join(' | ')).join('\n'))
    return value ? [{ id: block.id, text: value }] : []
  }) })) })), 'application/json', 'json') : undefined
  return {
    renderer: pageBased ? 'pages' : 'chapters', coverAssetId, contents,
    ...(searchAssetId ? { searchAssetId } : {}),
    ...(pageBased ? { pageCount: pages.length } : {}),
    checks: { spineDocuments: spine.length, auxiliaryDocuments, retainedDocuments, readingSections: chapters.length, emptySpineDocuments, extractedWords: totalWords, imageCount: pages.length, warnings: [...warnings] },
  }
}

function thumbnailCover(result, writer, temp) {
  const asset = writer.assets.get(result.coverAssetId)
  if (!asset || process.platform !== 'darwin') return
  const target = path.join(temp, 'shelf-cover.png')
  try {
    execFileSync('sips', ['-Z', '640', '-s', 'format', 'png', asset.path, '--out', target], { stdio: 'ignore', timeout: 30000 })
    const bytes = bytesOf(target)
    if (imageType(bytes)?.[0] === 'image/png' && bytes.length < asset.size) result.coverAssetId = writer.add(bytes, 'image/png', 'png')
  } catch {
    result.checks.warnings ??= []
    result.checks.warnings.push('Cover thumbnail could not be reduced; original retained')
  }
}

export async function importPrivateBooks({ manifest: manifestPath, out: output }) {
  const out = assertPrivateOutput(output)
  const manifest = JSON.parse(fs.readFileSync(path.resolve(manifestPath), 'utf8'))
  if (!Array.isArray(manifest.books) || manifest.books.length < 1 || manifest.books.length > 500) throw new Error('Manifest requires 1–500 books')
  const ids = new Set()
  fs.mkdirSync(out, { recursive: true, mode: 0o700 })
  const books = []
  const assets = []
  const reports = []
  for (const [sortOrder, entry] of manifest.books.entries()) {
    if (!ID.test(entry.id) || ids.has(entry.id)) throw new Error('Invalid or duplicate book ID')
    ids.add(entry.id)
    if (!text(entry.title) || !Array.isArray(entry.authors) || !entry.authors.length || !text(entry.category) || !Array.isArray(entry.files) || !entry.files.length) throw new Error('Book metadata is incomplete')
    const sourceFiles = entry.files.map(file => ({ ...file, path: path.resolve(path.dirname(path.resolve(manifestPath)), file.path) }))
    if (sourceFiles.filter(file => file.primary).length > 1) throw new Error('A book can have only one primary source')
    const sourceInfo = sourceFiles.map(file => {
      if (!['epub', 'pdf'].includes(file.format)) throw new Error('Only EPUB and PDF sources are supported')
      const bytes = bytesOf(file.path)
      if (file.format === 'pdf' && !bytes.subarray(0, 1024).includes(Buffer.from('%PDF-'))) throw new Error('A PDF source has an invalid signature')
      if (file.format === 'epub' && bytes.toString('binary', 0, 2) !== 'PK') throw new Error('An EPUB source has an invalid signature')
      return { ...file, bytes, checksum: sha(bytes) }
    })
    const primary = sourceInfo.find(file => file.primary) ?? sourceInfo.find(file => file.format === 'epub') ?? sourceInfo[0]
    const editionVersion = `v_${sha(`${VERSION}:${primary.checksum}:${entry.renderer ?? 'auto'}`).slice(0, 24)}`
    const writer = createWriter(out, entry.id, editionVersion)
    const sources = sourceInfo.map(file => ({ format: file.format, checksum: file.checksum, size: file.bytes.length, assetId: writer.add(file.bytes, file.format === 'pdf' ? 'application/pdf' : 'application/epub+zip', file.format) }))
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'naamras-private-import-'))
    try {
      const result = primary.format === 'pdf' ? importPdf(primary.path, writer, temp) : importEpub(primary.path, writer, temp, entry.renderer)
      if (entry.coverPath) {
        const cover = bytesOf(path.resolve(path.dirname(path.resolve(manifestPath)), entry.coverPath))
        const type = imageType(cover)
        if (!type) throw new Error('Explicit cover must be a supported raster image')
        result.coverAssetId = writer.add(cover, ...type)
      }
      thumbnailCover(result, writer, temp)
      const { checks, ...rendering } = result
      const metadata = {
        id: entry.id, title: text(entry.title), ...(entry.subtitle ? { subtitle: text(entry.subtitle) } : {}),
        authors: entry.authors.map(text), ...(entry.contributors ? { contributors: entry.contributors.map(text) } : {}),
        description: text(entry.description), category: text(entry.category), language: text(entry.language || 'en'),
        formats: [...new Set(sourceInfo.map(file => file.format))], editionVersion, ...rendering,
      }
      validatePrivateMetadata(metadata)
      books.push({ id: entry.id, metadata, status: 'needs_review', sortOrder })
      assets.push(...writer.assets.values())
      reports.push({ id: entry.id, status: 'needs_review', sources, primaryFormat: primary.format, checks })
    } finally { fs.rmSync(temp, { recursive: true, force: true }) }
  }
  json(path.join(out, 'catalogue.json'), books)
  json(path.join(out, 'assets.json'), assets)
  json(path.join(out, 'import-report.json'), { importerVersion: VERSION, bookCount: books.length, assetCount: assets.length, bytes: assets.reduce((sum, asset) => sum + asset.size, 0), books: reports })
  return { bookCount: books.length, assetCount: assets.length, output: out }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await importPrivateBooks(parseArgs(process.argv.slice(2))))) }
  catch (error) { console.error(error instanceof Error ? error.message : 'Private import failed'); process.exitCode = 1 }
}
