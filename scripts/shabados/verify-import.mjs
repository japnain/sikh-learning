#!/usr/bin/env node
/** Validate generated corpus against the actual frontend reader adapter. */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'

if (!process.argv[2]) throw new Error('Usage: node scripts/shabados/verify-import.mjs /path/to/generated/packs')
const directory = resolve(process.argv[2])
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'error' })
try {
  const { isShabadosBaniReading } = await server.ssrLoadModule('/src/api/shabados.ts')
  const { getLineMeaningDetails } = await server.ssrLoadModule('/src/utils/readerDisplay.ts')
  const { useLanguageStore } = await server.ssrLoadModule('/src/store/language.ts')
  useLanguageStore.setState({ punjabiSource: 'ss', hindiSource: 'ss' })
  for (const id of ['ALHN', 'ANN6', 'MDVI', 'RGMA']) {
    const pack = JSON.parse(await readFile(resolve(directory, `${id}.json`), 'utf8'))
    if (!isShabadosBaniReading(pack, id)) throw new Error(`${id}: failed the actual application pack validator`)
    const lines = pack.entries.flatMap(entry => entry.lines)
    if (new Set(lines.map(line => line.providerLineId)).size !== lines.length) throw new Error(`${id}: duplicate reader anchors`)
    let english = 0
    let punjabi = 0
    for (const line of lines) {
      const en = getLineMeaningDetails(line, 'en', 'bdb')
      const pa = getLineMeaningDetails(line, 'pa', 'bdb')
      if (en.text) {
        english += 1
        if (!['ms', 'ssk'].includes(en.actualSource)) throw new Error(`${id}: English attribution mismatch`)
      }
      if (pa.text) {
        punjabi += 1
        if (!['ss', 'ft', 'ms'].includes(pa.actualSource)) throw new Error(`${id}: Punjabi attribution mismatch`)
      }
    }
    console.log(JSON.stringify({ id, valid: true, lines: lines.length, uniqueAnchors: lines.length, english, punjabi }))
  }
} finally {
  await server.close()
}
