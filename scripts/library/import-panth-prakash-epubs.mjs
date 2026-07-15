#!/usr/bin/env node
import { importPanthPrakashEnglish } from './profiles/panth-prakash-english.mjs'

function parseArgs(argv) {
  const args = { libraryRoot: 'public/data/library' }
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index]
    if (!option.startsWith('--')) continue
    const value = argv[index + 1]
    if (!value) throw new Error(`Missing value for ${option}`)
    index += 1
    switch (option) {
      case '--vol1-epub':
        args.vol1Epub = value
        break
      case '--vol2-epub':
        args.vol2Epub = value
        break
      case '--library-root':
        args.libraryRoot = value
        break
      case '--vol1-text':
      case '--vol2-text':
      case '--work-root':
      case '--seed-path':
        console.warn(`${option} is no longer used; episode boundaries now come from the EPUB body headings.`)
        break
      default:
        throw new Error(`Unknown option ${option}`)
    }
  }

  if (!args.vol1Epub || !args.vol2Epub) {
    throw new Error([
      'Usage: node scripts/library/import-panth-prakash-epubs.mjs',
      '  --vol1-epub <vol1.epub> --vol2-epub <vol2.epub>',
      '  [--library-root <path>]',
    ].join('\n'))
  }
  return args
}

const args = parseArgs(process.argv.slice(2))
const result = importPanthPrakashEnglish(args)

console.log(`Imported ${result.chapters.length} Panth Prakash episodes from two EPUB publications.`)
console.log(`Readable English source pages: ${result.work.readablePages}`)
console.log(`Raw EPUB source pages retained in provenance: ${result.work.totalSourcePages}`)
console.log(`Semantic blocks: ${result.validation.semantics.totalBlocks}`)
