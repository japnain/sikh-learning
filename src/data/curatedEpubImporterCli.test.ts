import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

const PROJECT_ROOT = process.cwd()
const IMPORTER_PATH = path.join(PROJECT_ROOT, 'scripts/library/import-curated-epub.mjs')
const SOURCE_EPUB = path.join(
  PROJECT_ROOT,
  'public/data/library/works/panth-prakash-english/assets/volume-1.epub'
)

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
}

function sha256(filePath: string) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

function writeText(filePath: string, value: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, value)
}

function createSemanticEpub(tempRoot: string, navigationKind: 'epub3' | 'ncx') {
  const sourceRoot = path.join(tempRoot, `semantic-epub-${navigationKind}-source`)
  const epubPath = path.join(tempRoot, `semantic-book-${navigationKind}.epub`)
  writeText(path.join(sourceRoot, 'mimetype'), 'application/epub+zip')
  writeText(path.join(sourceRoot, 'META-INF/container.xml'), `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`)
  writeText(path.join(sourceRoot, 'EPUB/package.opf'), `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">semantic-test</dc:identifier>
    <dc:title>Semantic Test Book</dc:title>
    <dc:creator>Test Author</dc:creator>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    ${navigationKind === 'epub3'
      ? '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>'
      : '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>'}
    <item id="chapter-one" href="text/chapter-one.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter-two" href="text/chapter-two.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine${navigationKind === 'ncx' ? ' toc="ncx"' : ''}>
    <itemref idref="chapter-one"/>
    <itemref idref="chapter-two"/>
  </spine>
</package>`)
  if (navigationKind === 'epub3') {
    writeText(path.join(sourceRoot, 'EPUB/nav.xhtml'), `<!doctype html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <body><nav epub:type="toc"><ol>
    <li><a href="text/chapter-one.xhtml#opening">The First Teaching</a></li>
    <li><a href="text/chapter-two.xhtml">A Better Second Title</a></li>
  </ol></nav></body>
</html>`)
  } else {
    writeText(path.join(sourceRoot, 'EPUB/toc.ncx'), `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <navMap>
    <navPoint id="one" playOrder="1"><navLabel><text>The First Teaching</text></navLabel><content src="text/chapter-one.xhtml#opening"/></navPoint>
    <navPoint id="two" playOrder="2"><navLabel><text>A Better Second Title</text></navLabel><content src="text/chapter-two.xhtml"/></navPoint>
  </navMap>
</ncx>`)
  }
  writeText(path.join(sourceRoot, 'EPUB/text/chapter-one.xhtml'), `<!doctype html>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Generic internal title</title></head><body>
  <script>window.bad = true</script>
  <h1 id="opening">Internal Heading</h1>
  <p onclick="alert('nope')">A first paragraph with <em>inline emphasis</em>.</p>
  <blockquote><p>A quotation that stays plain and safe.</p></blockquote>
  <div class="poem"><p>Verse line one<br/>Verse line two</p></div>
</body></html>`)
  writeText(path.join(sourceRoot, 'EPUB/text/chapter-two.xhtml'), `<!doctype html>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Unhelpful internal title</title></head><body>
  <p>The second chapter body.</p>
</body></html>`)

  execFileSync('zip', ['-X', '-q', epubPath, 'mimetype'], { cwd: sourceRoot })
  execFileSync('zip', ['-X', '-q', '-r', epubPath, 'META-INF', 'EPUB'], { cwd: sourceRoot })
  return epubPath
}

describe('generic curated EPUB importer CLI', () => {
  test.each(['epub3', 'ncx'] as const)('uses %s navigation labels and preserves safe semantic text blocks', navigationKind => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'naamras-semantic-epub-'))
    const libraryRoot = path.join(tempRoot, 'library')

    try {
      const epubPath = createSemanticEpub(tempRoot, navigationKind)
      execFileSync(process.execPath, [
        IMPORTER_PATH,
        '--epub', epubPath,
        '--work-id', 'semantic-book',
        '--title', 'Semantic Book',
        '--library-root', libraryRoot,
      ], { cwd: PROJECT_ROOT, encoding: 'utf8' })

      const chapterIndex = readJson<Array<{ id: string; title: string; path: string }>>(
        path.join(libraryRoot, 'works/semantic-book/chapters.json')
      )
      expect(chapterIndex).toHaveLength(2)
      expect(chapterIndex.map(chapter => chapter.title)).toEqual([
        'The First Teaching',
        'A Better Second Title',
      ])
      expect(chapterIndex.map(chapter => chapter.id)).toEqual([
        'section-001-the-first-teaching',
        'section-002-a-better-second-title',
      ])

      const firstChapter = readJson<{
        pages: Array<{ blocks: Array<{ id: string; type: string; text: string }> }>
      }>(path.join(libraryRoot, chapterIndex[0].path.replace(/^\/data\/library\//, '')))
      const blocks = firstChapter.pages[0].blocks
      expect(blocks.map(block => block.type)).toEqual(['heading', 'paragraph', 'note', 'verse'])
      expect(blocks.map(block => block.text)).toEqual([
        'Internal Heading',
        'A first paragraph with inline emphasis.',
        'A quotation that stays plain and safe.',
        'Verse line one\nVerse line two',
      ])
      expect(JSON.stringify(blocks)).not.toMatch(/<|onclick|script|window\.bad/)
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  test('adds a future EPUB without replacing existing works and emits only safe reader JSON', () => {
    const libraryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'naamras-epub-import-'))
    const existingWork = {
      id: 'existing-work',
      title: 'Existing Library Work',
      shortTitle: 'Existing',
      source: 'epub',
      revision: 'leave-me-alone',
    }
    const existingSearchChapter = {
      workId: 'existing-work',
      chapterId: 'chapter-001',
      title: 'Existing chapter',
    }
    const existingSentinel = path.join(libraryRoot, 'works/existing-work/keep.txt')

    try {
      writeJson(path.join(libraryRoot, 'works.json'), [existingWork])
      writeJson(path.join(libraryRoot, 'search-index.json'), {
        works: [{ id: existingWork.id, title: existingWork.title, aliases: [existingWork.title] }],
        chapters: [existingSearchChapter],
      })
      fs.mkdirSync(path.dirname(existingSentinel), { recursive: true })
      fs.writeFileSync(existingSentinel, 'preserved')

      const output = execFileSync(process.execPath, [
        IMPORTER_PATH,
        '--epub', SOURCE_EPUB,
        '--work-id', 'future-book',
        '--title', 'Future Book',
        '--short-title', 'Future',
        '--description', 'A future curated EPUB used to verify additive imports.',
        '--publication-id', 'first-edition',
        '--library-root', libraryRoot,
      ], {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 8,
      })

      expect(output).toMatch(/Imported \d+ sections for Future Book/i)
      expect(fs.readFileSync(existingSentinel, 'utf8')).toBe('preserved')

      const works = readJson<Array<Record<string, unknown>>>(path.join(libraryRoot, 'works.json'))
      expect(works).toHaveLength(2)
      expect(works.find(work => work.id === existingWork.id)).toEqual(existingWork)
      const importedWork = works.find(work => work.id === 'future-book') as {
        publications: Array<{ checksumSha256: string; epubPath: string }>
        chapterIndexPath: string
        searchIndexPath: string
        totalChapters: number
      }
      expect(importedWork).toEqual(expect.objectContaining({
        chapterIndexPath: '/data/library/works/future-book/chapters.json',
        searchIndexPath: '/data/library/works/future-book/search-index.json',
      }))
      expect(importedWork.totalChapters).toBeGreaterThan(500)

      const archivedEpub = path.join(libraryRoot, 'works/future-book/assets/first-edition.epub')
      expect(fs.existsSync(archivedEpub)).toBe(true)
      expect(sha256(archivedEpub)).toBe(sha256(SOURCE_EPUB))
      expect(importedWork.publications[0]).toEqual(expect.objectContaining({
        checksumSha256: sha256(SOURCE_EPUB),
        epubPath: '/data/library/works/future-book/assets/first-edition.epub',
      }))

      const chapterIndex = readJson<Array<{ id: string; path: string }>>(
        path.join(libraryRoot, 'works/future-book/chapters.json')
      )
      const workSearch = readJson<{ chapters: Array<{ workId: string; chapterId: string }> }>(
        path.join(libraryRoot, 'works/future-book/search-index.json')
      )
      expect(chapterIndex).toHaveLength(importedWork.totalChapters)
      expect(workSearch.chapters).toHaveLength(chapterIndex.length)
      expect(workSearch.chapters.every(chapter => chapter.workId === 'future-book')).toBe(true)
      expect(workSearch.chapters.map(chapter => chapter.chapterId)).toEqual(chapterIndex.map(chapter => chapter.id))

      const allBlocks = chapterIndex.flatMap(chapter => {
        const chapterPath = path.join(
          libraryRoot,
          chapter.path.replace(/^\/data\/library\//, '')
        )
        const payload = readJson<{
          pages: Array<{
            blocks: Array<Record<string, unknown> & { id: string; type: string; text: string }>
          }>
        }>(chapterPath)
        return payload.pages.flatMap(page => page.blocks)
      })
      expect(allBlocks.length).toBeGreaterThan(chapterIndex.length)
      expect(allBlocks.every(block => Object.keys(block).every(key => ['id', 'type', 'text'].includes(key)))).toBe(true)
      expect(allBlocks.every(block => typeof block.text === 'string' && block.text.length <= 560)).toBe(true)
      expect(allBlocks.every(block => !/<(?:script|style|iframe|object|embed|img|svg)\b/i.test(block.text))).toBe(true)
      expect(allBlocks.every(block => !/\bon\w+\s*=|javascript:/i.test(block.text))).toBe(true)

      const globalSearch = readJson<{
        works: Array<{ id: string }>
        chapters?: Array<{ workId: string; chapterId: string }>
      }>(path.join(libraryRoot, 'search-index.json'))
      expect(globalSearch.works.map(work => work.id).sort()).toEqual(['existing-work', 'future-book'])
      expect(globalSearch.chapters).toEqual([existingSearchChapter])
      expect(globalSearch.chapters?.some(chapter => chapter.workId === 'future-book')).toBe(false)
    } finally {
      fs.rmSync(libraryRoot, { recursive: true, force: true })
    }
  })
})
