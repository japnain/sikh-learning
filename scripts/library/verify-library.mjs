#!/usr/bin/env node
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const projectRoot = path.resolve(import.meta.dirname, '../..')
const libraryRoot = path.join(projectRoot, 'public/data/library')
const allowedBlockTypes = new Set(['line', 'heading', 'invocation', 'meter', 'verse', 'paragraph', 'note'])
const errors = []

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function publicPath(urlPath) {
  if (!urlPath?.startsWith('/')) throw new Error(`Expected a public URL path, received ${urlPath}`)
  return path.join(projectRoot, 'public', urlPath)
}

function requireFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing ${label}: ${filePath}`)
    return false
  }
  return true
}

function sha256(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

const manifest = readJson(path.join(libraryRoot, 'manifest.json'))
const catalogPath = publicPath(manifest.workCatalogPath)
if (!requireFile(catalogPath, 'work catalog')) process.exit(1)
const works = readJson(catalogPath)
const workIds = new Set()

for (const work of works) {
  if (workIds.has(work.id)) errors.push(`Duplicate work ID: ${work.id}`)
  workIds.add(work.id)

  if (work.searchIndexPath) requireFile(publicPath(work.searchIndexPath), `${work.id} search index`)
  if (work.provenancePath) requireFile(publicPath(work.provenancePath), `${work.id} provenance`)
  if (!work.chapterIndexPath || !requireFile(publicPath(work.chapterIndexPath), `${work.id} chapter index`)) continue

  const chapterIndex = readJson(publicPath(work.chapterIndexPath))
  if (work.totalChapters !== undefined && work.totalChapters !== chapterIndex.length) {
    errors.push(`${work.id}: totalChapters=${work.totalChapters}, index=${chapterIndex.length}`)
  }
  const chapterIds = new Set()
  chapterIndex.forEach((entry, index) => {
    if (chapterIds.has(entry.id)) errors.push(`${work.id}: duplicate chapter ID ${entry.id}`)
    chapterIds.add(entry.id)
    if (!requireFile(publicPath(entry.path), `${work.id}/${entry.id}`)) return
    const chapter = readJson(publicPath(entry.path))
    if (chapter.id !== entry.id) errors.push(`${work.id}/${entry.id}: payload ID mismatch`)
    if (chapter.chapterNumber !== entry.chapterNumber) errors.push(`${work.id}/${entry.id}: chapter number mismatch`)
    if (index > 0 && chapter.previousChapterId !== chapterIndex[index - 1].id) errors.push(`${work.id}/${entry.id}: previousChapterId mismatch`)
    if (index < chapterIndex.length - 1 && chapter.nextChapterId !== chapterIndex[index + 1].id) errors.push(`${work.id}/${entry.id}: nextChapterId mismatch`)
    if (!Array.isArray(chapter.pages) || chapter.pages.length === 0) errors.push(`${work.id}/${entry.id}: no readable pages`)

    const blockIds = new Set()
    for (const page of chapter.pages ?? []) {
      if (!page.fileName || !page.sourceHref) errors.push(`${work.id}/${entry.id}: page ${page.sourcePageNumber} lacks source href metadata`)
      for (const block of page.blocks ?? []) {
        if (blockIds.has(block.id)) errors.push(`${work.id}/${entry.id}: duplicate block ID ${block.id}`)
        blockIds.add(block.id)
        if (!allowedBlockTypes.has(block.type)) errors.push(`${work.id}/${entry.id}: unsupported block type ${block.type}`)
        if (!block.text?.trim()) errors.push(`${work.id}/${entry.id}: empty block ${block.id}`)
        if (/<\/?(?:script|iframe|object|embed)\b/i.test(block.text ?? '')) errors.push(`${work.id}/${entry.id}: unsafe markup in ${block.id}`)
      }
    }
  })

  for (const publication of work.publications ?? []) {
    if (!publication.epubPath) continue
    const epubPath = publicPath(publication.epubPath)
    if (!requireFile(epubPath, `${work.id}/${publication.id} EPUB asset`)) continue
    if (publication.checksumSha256 && sha256(epubPath) !== publication.checksumSha256) {
      errors.push(`${work.id}/${publication.id}: EPUB checksum mismatch`)
    }
  }

  if (work.id === 'panth-prakash-english') {
    const validationPath = path.join(libraryRoot, 'works', work.id, 'validation.json')
    const validation = readJson(validationPath)
    if (validation.status !== 'passed') errors.push(`${work.id}: generated validation is ${validation.status}`)
    if (work.totalSourcePages !== 1413) errors.push(`${work.id}: expected 1413 raw source pages`)
    if (work.readablePages !== 637) errors.push(`${work.id}: expected 637 readable English pages`)
    if (chapterIndex.length !== 169) errors.push(`${work.id}: expected 169 episodes`)
    if (chapterIndex.filter(chapter => chapter.publicationId === 'volume-1').length !== 81) errors.push(`${work.id}: expected 81 Volume I episodes`)
    if (chapterIndex.filter(chapter => chapter.publicationId === 'volume-2').length !== 88) errors.push(`${work.id}: expected 88 Volume II episodes`)
    chapterIndex.forEach((chapter, index) => {
      const expectedId = `episode-${String(index + 1).padStart(3, '0')}`
      if (chapter.id !== expectedId) errors.push(`${work.id}: expected ${expectedId}, received ${chapter.id}`)
    })
  }
}

if (errors.length) {
  console.error(`Library verification failed with ${errors.length} error(s):`)
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log(`Library verification passed for ${works.length} work(s).`)
