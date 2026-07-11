import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../..')

const outputPath = path.join(root, 'ios/App/NaamRasNative/NativeCatalog.json')

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function stringField(body, name) {
  const match = body.match(new RegExp(`${name}: '((?:\\\\'|[^'])*)'`))
  return match ? match[1].replace(/\\'/g, "'") : ''
}

function numberField(body, name) {
  const match = body.match(new RegExp(`${name}: (\\d+)`))
  return match ? Number(match[1]) : null
}

function parseBanis() {
  const source = readText('src/data/banis.ts')
  const baniMatcher = /(?:exactBani|browseOnlyBani)\(\{([^}]+)\}\)/g
  const readings = []
  let match
  while ((match = baniMatcher.exec(source))) {
    const body = match[1]
    const id = stringField(body, 'id')
    const title = stringField(body, 'name')
    const category = stringField(body, 'category') || 'Banis'
    const sourceCode = stringField(body, 'scripture')
    const startAng = numberField(body, 'startAng')
    const endAng = numberField(body, 'endAng')
    const description = stringField(body, 'description')
    const baniDbId = numberField(body, 'baniDbId')
    const range = startAng && endAng
      ? (startAng === endAng ? `Ang ${startAng}` : `Ang ${startAng}-${endAng}`)
      : 'Browse'

    readings.push({
      id,
      title,
      subtitle: `${sourceCode || 'Source'} ${range} · ${description}`,
      category,
      source: baniDbId ? `${sourceCode} · BaniDB #${baniDbId}` : `${sourceCode} · Browse`,
      baniDbId,
      progress: 0,
    })
  }

  const availableReadings = readings.filter(reading => reading.baniDbId !== null)
  const ids = availableReadings.map(reading => reading.baniDbId)
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index)
  if (duplicateIds.length > 0) {
    throw new Error(`Duplicate BaniDB ids in native catalog: ${[...new Set(duplicateIds)].join(', ')}`)
  }

  return availableReadings
}

const catalog = {
  readings: parseBanis(),
}

fs.writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`)
console.log(`Generated ${path.relative(root, outputPath)} with ${catalog.readings.length} readings.`)
