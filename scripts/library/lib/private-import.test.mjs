import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { assertPrivateOutput, importPrivateBooks, validatePrivateMetadata } from '../import-private-books.mjs'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jE4cAAAAASUVORK5CYII='

function fixture(root, mode = 'text', extras = {}) {
  const file = path.join(root, 'source.epub')
  const names = mode === 'pages' ? ['first', 'second', 'third'] : ['first', 'notes']
  const entries = {
    mimetype: 'application/epub+zip',
    'META-INF/container.xml': '<container><rootfiles><rootfile full-path="EPUB/book.opf"/></rootfiles></container>',
    'EPUB/book.opf': `<package><manifest>
      <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
      <item id="cover" href="image.png" media-type="image/png" properties="cover-image"/>
      ${names.map(name => `<item id="${name}" href="${name}.xhtml" media-type="application/xhtml+xml"/>`).join('')}
      </manifest><spine>${names.map(name => `<itemref idref="${name}"/>`).join('')}</spine></package>`,
    'EPUB/nav.xhtml': `<html><body><nav>${names.map(name => `<a href="${name}.xhtml">${name} section</a>`).join('')}</nav></body></html>`,
    'EPUB/first.xhtml': `<html><body><h1 id="opening">A heading</h1>
      <p onclick="doBadThing()">A sentence with a <a href="notes.xhtml#n1">note</a>.</p>
      <div class="poem"><p>First verse line<br/>Second verse line</p></div>
      <blockquote><p>A retained quotation.</p></blockquote>
      <ul><li>First item</li><li>Second item</li></ul>
      <table><tr><th>Label</th><th>Value</th></tr><tr><td>A</td><td>B</td></tr></table>
      <p><img src="image.png" alt="A diagram"/></p>
      <script>SECRET_EXECUTABLE</script><iframe src="https://example.invalid/">SECRET_FRAME</iframe>
      </body></html>`,
    'EPUB/notes.xhtml': '<html><body><aside id="n1" epub:type="footnote">The retained note. <a href="first.xhtml#opening">Return</a></aside></body></html>',
    ...extras,
  }
  if (mode === 'pages') names.forEach(name => { entries[`EPUB/${name}.xhtml`] = '<html><body><svg><image xlink:href="image.png"/></svg></body></html>' })
  Object.assign(entries, extras)
  const request = { file, entries, png: PNG }
  execFileSync('python3', ['-c', 'import base64,json,sys,zipfile\nr=json.load(sys.stdin)\nwith zipfile.ZipFile(r["file"],"w",zipfile.ZIP_DEFLATED) as z:\n for name,value in r["entries"].items(): z.writestr(name,value)\n z.writestr("EPUB/image.png",base64.b64decode(r["png"]))'], { input: JSON.stringify(request) })
  return file
}

function manifest(root, file, extra = {}) {
  const target = path.join(root, 'batch.json')
  fs.writeFileSync(target, JSON.stringify({ books: [{ id: 'sample-work', title: 'Sample Work', authors: ['Sample Author'], category: 'Sample category', description: 'A fixture', language: 'en', files: [{ path: file, format: 'epub' }], ...extra }] }))
  return target
}

function read(file) { return JSON.parse(fs.readFileSync(file, 'utf8')) }

test('private output can never be placed inside the repository, including via a symlink', () => {
  assert.throws(() => assertPrivateOutput(path.join(REPO, 'public/private-books')), /outside/)
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'private-output-'))
  try {
    fs.symlinkSync(REPO, path.join(root, 'alias'))
    assert.throws(() => assertPrivateOutput(path.join(root, 'alias/assets')), /outside/)
    assert.equal(assertPrivateOutput(path.join(root, 'safe')), path.join(fs.realpathSync(root), 'safe'))
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('text EPUB preserves order, diagrams, poems, lists, tables and internal note links as inert data', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'private-semantic-'))
  try {
    const epub = fixture(root)
    const out = path.join(root, 'build')
    await importPrivateBooks({ manifest: manifest(root, epub), out })
    const [book] = read(path.join(out, 'catalogue.json'))
    const assets = read(path.join(out, 'assets.json'))
    assert.equal(book.status, 'needs_review')
    assert.equal(book.metadata.renderer, 'chapters')
    assert.deepEqual(book.metadata.contents.map(c => c.title), ['first section', 'notes section'])
    const first = read(assets.find(a => a.id === book.metadata.contents[0].assetId).path)
    assert.deepEqual(first.blocks.map(b => b.type), ['heading','paragraph','verse','quote','list','table','image'])
    assert.equal(first.blocks[2].text, 'First verse line\nSecond verse line')
    assert.deepEqual(first.blocks[4].items, ['First item','Second item'])
    assert.deepEqual(first.blocks[5].rows, [['Label','Value'],['A','B']])
    assert.deepEqual(first.blocks[1].links, [{ text: 'note', targetChapterId: 'chapter-0002', targetAnchor: 'chapter-0002-b00001' }])
    assert.equal(first.blocks[0].anchor, 'opening')
    assert.equal(first.blocks[6].alt, 'A diagram')
    assert.doesNotMatch(JSON.stringify(first), /SECRET_|onclick|https:/)
    const notes = read(assets.find(a => a.id === book.metadata.contents[1].assetId).path)
    assert.equal(notes.blocks[0].type, 'note')
    assert.equal(notes.blocks[0].anchor, 'n1')
    assert.equal(assets.filter(a => a.contentType === 'application/epub+zip').length, 1)
    const search = read(assets.find(a => a.id === book.metadata.searchAssetId).path)
    assert.equal(search.chapters.length, 2)
    assert.ok(search.chapters[0].blocks.some(block => block.text.includes('First verse line\nSecond verse line')))
    assert.ok(search.chapters[0].blocks.some(block => block.text.includes('Label | Value')))
    assert.doesNotMatch(JSON.stringify(search), /SECRET_|onclick|https:/)
    for (const asset of assets) {
      assert.equal(fs.statSync(asset.path).size, asset.size)
      assert.match(asset.checksum, /^[a-f0-9]{64}$/)
      assert.match(asset.id, /^a_[a-f0-9]{40}$/)
    }
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('image-only EPUB retains every ordered page including SVG image wrappers', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'private-pages-'))
  try {
    const out = path.join(root, 'build')
    await importPrivateBooks({ manifest: manifest(root, fixture(root, 'pages')), out })
    const [book] = read(path.join(out, 'catalogue.json'))
    assert.equal(book.metadata.renderer, 'pages')
    assert.equal(book.metadata.pageCount, 3)
    assert.equal(book.metadata.searchAssetId, undefined)
    assert.deepEqual(book.metadata.contents.map(c => c.page), [1,2,3])
    assert.ok(book.metadata.contents.every(c => c.assetId))
    // Repeated page images remain repeated in reading order while asset bytes deduplicate.
    assert.equal(new Set(book.metadata.contents.map(c => c.assetId)).size, 1)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('unsafe ZIP paths and missing spine resources fail instead of producing incomplete ready books', async () => {
  for (const extras of [{ '../escaped.txt': 'bad' }, { 'EPUB/book.opf': '<package><manifest><item id="missing" href="missing.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="missing"/></spine></package>' }]) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'private-invalid-'))
    try {
      const epub = fixture(root, 'text', extras)
      await assert.rejects(importPrivateBooks({ manifest: manifest(root, epub), out: path.join(root, 'build') }))
      assert.equal(fs.existsSync(path.join(root, 'escaped.txt')), false)
      assert.equal(fs.existsSync(path.join(root, 'build/catalogue.json')), false)
    } finally { fs.rmSync(root, { recursive: true, force: true }) }
  }
})

test('external images never become fetches or generated image assets and are flagged for review', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'private-remote-'))
  try {
    const epub = fixture(root, 'text', { 'EPUB/notes.xhtml': '<html><body><p>A safe note.</p><img src="https://example.invalid/tracker.png"/></body></html>' })
    const out = path.join(root, 'build')
    await importPrivateBooks({ manifest: manifest(root, epub), out })
    const report = read(path.join(out, 'import-report.json'))
    assert.ok(report.books[0].checks.warnings.includes('An external or missing image was excluded'))
    assert.doesNotMatch(JSON.stringify(read(path.join(out, 'assets.json'))), /https:/)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('a scan EPUB with even one native text block keeps that text instead of switching to image-only pages', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'private-hybrid-'))
  try {
    const epub = fixture(root, 'pages', { 'EPUB/first.xhtml': '<html><body><p>A native copyright note.</p><img src="image.png"/></body></html>' })
    const out = path.join(root, 'build')
    await importPrivateBooks({ manifest: manifest(root, epub), out })
    const [book] = read(path.join(out, 'catalogue.json'))
    const assets = read(path.join(out, 'assets.json'))
    assert.equal(book.metadata.renderer, 'chapters')
    assert.equal(book.metadata.contents.length, 3)
    const first = read(assets.find(asset => asset.id === book.metadata.contents[0].assetId).path)
    assert.equal(first.blocks[0].text, 'A native copyright note.')
    assert.equal(first.blocks[1].type, 'image')
    await assert.rejects(importPrivateBooks({ manifest: manifest(root, epub, { renderer: 'pages' }), out: path.join(root, 'forced') }), /omit native source text/)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('linked manifest XHTML notes outside the spine are imported after ordered reading content', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'private-auxiliary-'))
  try {
    const epub = fixture(root, 'text', { 'EPUB/book.opf': `<package><manifest>
      <item id="first" href="first.xhtml" media-type="application/xhtml+xml"/>
      <item id="notes" href="notes.xhtml" media-type="application/xhtml+xml"/>
      <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
      </manifest><spine><itemref idref="first"/></spine></package>` })
    const out = path.join(root, 'build')
    await importPrivateBooks({ manifest: manifest(root, epub), out })
    const [book] = read(path.join(out, 'catalogue.json'))
    const assets = read(path.join(out, 'assets.json'))
    assert.equal(book.metadata.contents.length, 2)
    const first = read(assets.find(asset => asset.id === book.metadata.contents[0].assetId).path)
    const notes = read(assets.find(asset => asset.id === book.metadata.contents[1].assetId).path)
    assert.equal(first.blocks[1].links[0].targetChapterId, notes.id)
    assert.equal(first.blocks[1].links[0].targetAnchor, notes.blocks[0].id)
    assert.match(notes.blocks[0].text, /retained note/)
    assert.equal(read(path.join(out, 'import-report.json')).books[0].checks.auxiliaryDocuments, 1)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('mixed SVG overlays and image transformations are explicit review findings', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'private-svg-review-'))
  try {
    const epub = fixture(root, 'pages', { 'EPUB/first.xhtml': '<html><body><svg viewBox="0 0 100 100"><g transform="translate(5 5)"><image xlink:href="image.png" width="80" height="90"/><text>An annotation</text><path d="M0 0 L20 20"/></g></svg></body></html>' })
    const out = path.join(root, 'build')
    await importPrivateBooks({ manifest: manifest(root, epub), out })
    const report = read(path.join(out, 'import-report.json')).books[0]
    assert.equal(report.status, 'needs_review')
    assert.ok(report.checks.warnings.includes('Embedded vector artwork or text requires review'))
    assert.ok(report.checks.warnings.includes('SVG transformation or clipping requires review'))
    assert.ok(report.checks.warnings.includes('SVG image placement requires review'))
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('generated metadata cannot exceed gateway bounds', () => {
  const metadata = { id: 'sample', title: 'Example', authors: ['Author'], description: '', category: 'Examples', language: 'en', contents: [{ id: 'page-1', title: 'Beginning', page: 1 }], pageCount: 10000 }
  assert.doesNotThrow(() => validatePrivateMetadata(metadata))
  for (const invalid of [{ ...metadata, pageCount: 10001 }, { ...metadata, title: 'x'.repeat(501) }, { ...metadata, authors: Array(51).fill('Author') }, { ...metadata, contents: [{ id: 'page-1', title: 'Beginning', page: 10001 }] }]) {
    assert.throws(() => validatePrivateMetadata(invalid), /gateway contract bounds/)
  }
})

test('XHTML self-closing title and anchor tags cannot swallow the body', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'private-xhtml-'))
  try {
    const epub = fixture(root, 'text', { 'EPUB/first.xhtml': '<html xmlns="http://www.w3.org/1999/xhtml"><head><title/></head><body><h1><a id="opening"/>A complete heading</h1><p>A retained body sentence.</p><p><a href="notes.xhtml#n1">Note</a></p></body></html>' })
    const out = path.join(root, 'build')
    await importPrivateBooks({ manifest: manifest(root, epub), out })
    const [book] = read(path.join(out, 'catalogue.json'))
    const assets = read(path.join(out, 'assets.json'))
    const first = read(assets.find(asset => asset.id === book.metadata.contents[0].assetId).path)
    assert.equal(first.blocks[0].text, 'A complete heading')
    assert.equal(first.blocks[1].text, 'A retained body sentence.')
    assert.equal(first.blocks[2].links[0].targetChapterId, book.metadata.contents[1].id)
    assert.equal(read(path.join(out, 'import-report.json')).books[0].checks.emptySpineDocuments, 0)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('image-only documents split into bounded page sections while native outline and page anchors survive', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'private-page-sections-'))
  try {
    const epub = fixture(root, 'pages', {
      'EPUB/first.xhtml': '<html><body><p><a id="p1"></a><img src="image.png"/></p><p><a id="p2"></a><img src="image.png"/></p><p><a id="p3"></a><img src="image.png"/></p></body></html>',
      'EPUB/second.xhtml': '<html><body><p><a href="first.xhtml#p2">Second page</a></p></body></html>',
    })
    const out = path.join(root, 'build')
    await importPrivateBooks({ manifest: manifest(root, epub), out })
    const [book] = read(path.join(out, 'catalogue.json'))
    const assets = read(path.join(out, 'assets.json'))
    assert.equal(book.metadata.renderer, 'chapters')
    assert.equal(book.metadata.contents.length, 5)
    const chapters = book.metadata.contents.map(entry => read(assets.find(asset => asset.id === entry.assetId).path))
    assert.ok(chapters.every(chapter => chapter.blocks.filter(block => block.type === 'image').length <= 1))
    const outline = chapters.find(chapter => chapter.blocks[0].text === 'Second page')
    assert.ok(outline)
    assert.equal(outline.blocks[0].links[0].targetChapterId, chapters[1].id)
    assert.equal(outline.blocks[0].links[0].targetAnchor, chapters[1].blocks[0].id)
    assert.equal(read(path.join(out, 'import-report.json')).books[0].checks.warnings.length, 0)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})
