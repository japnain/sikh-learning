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
  const progressById = new Map([
    ['japji-sahib', 0.42],
    ['rehras-sahib', 0.18],
    ['anand-sahib', 0.11],
    ['amrit-keertan', 0.08],
  ])

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
      progress: progressById.get(id) ?? 0,
    })
  }

  readings.push(
    {
      id: 'hukamnama',
      title: 'Hukamnama',
      subtitle: 'Daily reflection with source context and saved progress',
      category: 'Today',
      source: 'SGGS · BaniDB',
      progress: 0,
    },
    {
      id: 'rehat-maryada',
      title: 'Rehat Maryada',
      subtitle: 'Structured sections with reading progress and source notes',
      category: 'Rehat',
      source: 'SGPC',
      progress: 0,
    },
    {
      id: 'panth-prakash',
      title: 'Panth Prakash',
      subtitle: 'English volumes, episodes, and saved reading position',
      category: 'Library',
      source: 'Panthic Library',
      progress: 0.28,
    },
    {
      id: 'scripture-search',
      title: 'Scripture Search',
      subtitle: 'BaniDB-backed search route for shabad and ang lookup',
      category: 'Search',
      source: 'BaniDB v2',
      progress: 0,
    }
  )

  return readings
}

const catalog = {
  generatedAt: new Date().toISOString(),
  readings: parseBanis(),
}

fs.writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`)
console.log(`Generated ${path.relative(root, outputPath)} with ${catalog.readings.length} readings.`)
