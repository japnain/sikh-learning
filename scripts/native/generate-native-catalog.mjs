import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../..')

const outputPath = path.join(root, 'ios/App/NaamRasNative/NativeCatalog.json')

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'))
}

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

function learnItem(item, category, summaryKeys) {
  const summary = summaryKeys
    .map(key => item[key])
    .find(value => typeof value === 'string' && value.trim().length > 0)

  return {
    id: item.id,
    title: item.shortTitle || item.title,
    category,
    summary: summary || 'Saved study item with source-linked guidance.',
  }
}

function parseLearnItems() {
  const topics = readJson('public/data/learn/lists/topic-guides.json')
  const shabads = readJson('public/data/learn/lists/shabad-deep-dives.json')
  const guidance = readJson('public/data/learn/lists/daily-guidance.json')
  const collections = readJson('public/data/learn/lists/collections.json')
  const works = readJson('public/data/library/works.json')

  return [
    ...topics.map(item => learnItem(item, 'Topic', ['centralInsight', 'issueStatement'])),
    ...shabads.map(item => learnItem(item, 'Shabad', ['summary', 'whyItMatters'])),
    ...guidance.map(item => learnItem(item, 'Daily Guidance', ['summary', 'takeaway'])),
    ...collections.map(item => learnItem(item, 'Collection', ['description', 'subtitle'])),
    ...works.map(item => learnItem(item, 'Library', ['description'])),
    {
      id: 'vocab-review',
      title: 'Review saved words',
      category: 'Vocab',
      summary: 'Bring saved words back at a steady review pace with pronunciation and meaning.',
    },
  ]
}

const catalog = {
  generatedAt: new Date().toISOString(),
  readings: parseBanis(),
  learnItems: parseLearnItems(),
}

fs.writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`)
console.log(`Generated ${path.relative(root, outputPath)} with ${catalog.readings.length} readings and ${catalog.learnItems.length} learn items.`)
