import fs from 'node:fs'
import path from 'node:path'
import { beforeEach, expect, test } from 'vitest'
import {
  configureLibraryRepositoryLoader,
  loadLibraryManifest,
  loadLibraryWorkCatalog,
  loadLibraryPage,
  resetLibraryRepositoryCache,
} from './libraryRepository'

const PROJECT_ROOT = process.cwd()

function readPublicLibraryJson(resourcePath: string) {
  const normalizedPath = resourcePath.startsWith('/')
    ? resourcePath.slice(1)
    : resourcePath
  const filePath = path.join(PROJECT_ROOT, 'public', normalizedPath.replace(/^data\/library\//, 'data/library/'))
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

beforeEach(() => {
  resetLibraryRepositoryCache()
})

test('loads the published library manifest and work catalog', async () => {
  const manifest = await loadLibraryManifest()
  const catalog = await loadLibraryWorkCatalog()

  expect(manifest.searchIndexPath).toBe('/data/library/search-index.json')
  expect(catalog.works.some(work => work.id === 'panth-prakash-english')).toBe(true)
  expect(catalog.workById['panth-prakash-english']?.title).toMatch(/Panth Prakash/i)
})

test('loads a page payload for Panth Prakash English', async () => {
  const page = await loadLibraryPage('panth-prakash-english', 1)

  expect(page).not.toBeNull()
  expect(page?.workId).toBe('panth-prakash-english')
  expect(page?.pageNumber).toBe(1)
  expect(page?.blocks.length).toBeGreaterThan(0)
})

test('episode 19 repaired pages keep readable editorial summaries for the Chamkaur sequence', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 165),
    loadLibraryPage('panth-prakash-english', 167),
    loadLibraryPage('panth-prakash-english', 169),
    loadLibraryPage('panth-prakash-english', 171),
    loadLibraryPage('panth-prakash-english', 173),
    loadLibraryPage('panth-prakash-english', 175),
  ])

  const requiredPhrases = [
    'sacrifice of the elder Sahibzadas',
    'the Singhs were left with almost no food or water',
    'Sahibzada Jujhar Singh',
    'Guru resolved to entrust the Khalsa with guruship',
    'The Guru placed his kalgi and garments on Sant Singh',
    'Machhiwara',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('episode 6 repaired pages keep readable editorial summaries for the eastern udasi sequence', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 85),
    loadLibraryPage('panth-prakash-english', 87),
  ])

  const requiredPhrases = [
    'Bengal and Kamrup',
    'Mardana',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('episode 7 repaired pages keep readable editorial summaries for the western udasi sequence', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 89),
    loadLibraryPage('panth-prakash-english', 91),
  ])

  const requiredPhrases = [
    'prophet of both the Hindus and the Muslims',
    'Mardana\'s pilgrimage to Madina',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('episode 8 repaired pages keep readable editorial summaries for the northern udasi sequence', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 93),
    loadLibraryPage('panth-prakash-english', 95),
  ])

  const requiredPhrases = [
    'mountainous northern regions',
    'Delhi emperor',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('episode 13 repaired pages keep readable editorial summaries for the tenth guru sequence', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 117),
    loadLibraryPage('panth-prakash-english', 119),
  ])

  const requiredPhrases = [
    'Guru Gobind Singh',
    'Khalsa Panth',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('episode 14 repaired pages keep readable editorial summaries for the khalsa-autonomy sequence', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 121),
    loadLibraryPage('panth-prakash-english', 123),
    loadLibraryPage('panth-prakash-english', 125),
    loadLibraryPage('panth-prakash-english', 127),
  ])

  const requiredPhrases = [
    'Guru Tegh Bahadur',
    'poor and marginalized communities',
    'khande-di-pahul',
    'Panj Pyare',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 1 repaired pages keep readable editorial summaries for episodes 15, 17, and 18', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 129),
    loadLibraryPage('panth-prakash-english', 131),
    loadLibraryPage('panth-prakash-english', 133),
    loadLibraryPage('panth-prakash-english', 147),
    loadLibraryPage('panth-prakash-english', 149),
    loadLibraryPage('panth-prakash-english', 151),
    loadLibraryPage('panth-prakash-english', 153),
    loadLibraryPage('panth-prakash-english', 155),
    loadLibraryPage('panth-prakash-english', 157),
    loadLibraryPage('panth-prakash-english', 159),
    loadLibraryPage('panth-prakash-english', 161),
    loadLibraryPage('panth-prakash-english', 163),
  ])

  const requiredPhrases = [
    'Panj Pyare',
    'shared bowl and one discipline',
    'Khalsa spread quickly',
    'Anandpur Sahib',
    'treachery of masands',
    'Mata Gujri',
    'letters are sent and armies are ordered',
    'siege tightened',
    'written disclaimer',
    'Khalsa would not abandon Sikhi',
    'Sarsa',
    'Chamkaur',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 2 repaired pages keep readable editorial summaries for episodes 20 through 24', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 177),
    loadLibraryPage('panth-prakash-english', 179),
    loadLibraryPage('panth-prakash-english', 181),
    loadLibraryPage('panth-prakash-english', 183),
    loadLibraryPage('panth-prakash-english', 185),
    loadLibraryPage('panth-prakash-english', 187),
    loadLibraryPage('panth-prakash-english', 189),
    loadLibraryPage('panth-prakash-english', 191),
    loadLibraryPage('panth-prakash-english', 193),
    loadLibraryPage('panth-prakash-english', 195),
    loadLibraryPage('panth-prakash-english', 197),
    loadLibraryPage('panth-prakash-english', 199),
    loadLibraryPage('panth-prakash-english', 201),
    loadLibraryPage('panth-prakash-english', 203),
    loadLibraryPage('panth-prakash-english', 205),
    loadLibraryPage('panth-prakash-english', 207),
    loadLibraryPage('panth-prakash-english', 209),
    loadLibraryPage('panth-prakash-english', 211),
    loadLibraryPage('panth-prakash-english', 213),
  ])

  const requiredPhrases = [
    'blue robe disguise',
    'fasting pir',
    'Lakhmir',
    'Brahmin cook',
    'Mata Gujri',
    'younger Sahibzadas',
    'news of the younger Sahibzadas',
    'Mitar Pyare',
    'Lakhmir\'s betrayal',
    'Kapura',
    'water and provisions',
    'Muktsar',
    'Majhail',
    'permission for martyrdom',
    'forty Singhs',
    'torn disclaimer',
    'Dalla',
    'Bathinda',
    'khande-di-pahul',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 3 repaired pages keep readable editorial summaries for early Banda episodes', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 222),
    loadLibraryPage('panth-prakash-english', 224),
    loadLibraryPage('panth-prakash-english', 226),
    loadLibraryPage('panth-prakash-english', 228),
    loadLibraryPage('panth-prakash-english', 230),
    loadLibraryPage('panth-prakash-english', 232),
    loadLibraryPage('panth-prakash-english', 234),
    loadLibraryPage('panth-prakash-english', 236),
    loadLibraryPage('panth-prakash-english', 238),
    loadLibraryPage('panth-prakash-english', 240),
    loadLibraryPage('panth-prakash-english', 242),
    loadLibraryPage('panth-prakash-english', 244),
    loadLibraryPage('panth-prakash-english', 248),
    loadLibraryPage('panth-prakash-english', 250),
    loadLibraryPage('panth-prakash-english', 252),
    loadLibraryPage('panth-prakash-english', 254),
    loadLibraryPage('panth-prakash-english', 256),
    loadLibraryPage('panth-prakash-english', 258),
    loadLibraryPage('panth-prakash-english', 260),
    loadLibraryPage('panth-prakash-english', 262),
    loadLibraryPage('panth-prakash-english', 264),
    loadLibraryPage('panth-prakash-english', 266),
  ])

  const requiredPhrases = [
    'Dadu Duar',
    'Jait Ram',
    'Narain Das',
    'secret pothi',
    'occult powers',
    'Jait Ram repeatedly warns the Guru',
    'moving carriage and an elaborately arranged resting place',
    'submits at the Guru',
    'Guru\'s servant and Sikh',
    'punish Sirhind',
    'Majha Sikhs',
    'Banda seeks sovereignty apart from the Khalsa',
    'Vahiguru',
    'offering is dismissed as too small',
    'barkat',
    'revenue-claiming authority',
    'pays revenue for Banda',
    'letters across Punjab',
    'banjaras',
    'Aali Singh',
    'Vahiguru',
    'Kapoori',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 4 repaired pages keep readable editorial summaries for Banda mid-campaign episodes', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 270),
    loadLibraryPage('panth-prakash-english', 272),
    loadLibraryPage('panth-prakash-english', 274),
    loadLibraryPage('panth-prakash-english', 276),
    loadLibraryPage('panth-prakash-english', 278),
    loadLibraryPage('panth-prakash-english', 280),
    loadLibraryPage('panth-prakash-english', 284),
    loadLibraryPage('panth-prakash-english', 286),
    loadLibraryPage('panth-prakash-english', 288),
    loadLibraryPage('panth-prakash-english', 290),
    loadLibraryPage('panth-prakash-english', 300),
    loadLibraryPage('panth-prakash-english', 302),
    loadLibraryPage('panth-prakash-english', 304),
  ])

  const requiredPhrases = [
    'Sadhaura',
    'Episode 37',
    'thousand soldiers',
    'Khawaja Khijar',
    'trench battle',
    'Sher Muhammad',
    'noncombatants started deserting',
    'Baaj Singh and Sham Singh',
    'Wazir Khan ordered a gunner',
    'Chappar Chiri',
    'Phagwara',
    'Panipat to Pathankot',
    'Ali Singh',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 5 repaired pages keep readable editorial summaries for hill-state campaigns', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 312),
    loadLibraryPage('panth-prakash-english', 314),
    loadLibraryPage('panth-prakash-english', 316),
    loadLibraryPage('panth-prakash-english', 318),
    loadLibraryPage('panth-prakash-english', 320),
    loadLibraryPage('panth-prakash-english', 322),
    loadLibraryPage('panth-prakash-english', 324),
    loadLibraryPage('panth-prakash-english', 326),
    loadLibraryPage('panth-prakash-english', 328),
    loadLibraryPage('panth-prakash-english', 330),
    loadLibraryPage('panth-prakash-english', 332),
    loadLibraryPage('panth-prakash-english', 334),
    loadLibraryPage('panth-prakash-english', 336),
    loadLibraryPage('panth-prakash-english', 338),
    loadLibraryPage('panth-prakash-english', 340),
    loadLibraryPage('panth-prakash-english', 342),
    loadLibraryPage('panth-prakash-english', 344),
    loadLibraryPage('panth-prakash-english', 346),
  ])

  const requiredPhrases = [
    'Kahilur',
    'paras',
    'single combat',
    'Baghard Singh',
    'Angad',
    'Kahloor force',
    'Mandi wazir',
    'Khawaja Khijar',
    'five Singhs',
    'Bajjar Singh',
    'nakib',
    'Sidh Sain',
    'Jajowal',
    'Abhraj Singh',
    'iron cage',
    'flying cage',
    'Mandi boundary',
    'Chamba',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 6 repaired pages keep readable editorial summaries for later Banda campaigns', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 352),
    loadLibraryPage('panth-prakash-english', 354),
    loadLibraryPage('panth-prakash-english', 356),
    loadLibraryPage('panth-prakash-english', 358),
    loadLibraryPage('panth-prakash-english', 360),
    loadLibraryPage('panth-prakash-english', 362),
    loadLibraryPage('panth-prakash-english', 364),
    loadLibraryPage('panth-prakash-english', 374),
    loadLibraryPage('panth-prakash-english', 376),
    loadLibraryPage('panth-prakash-english', 378),
    loadLibraryPage('panth-prakash-english', 380),
    loadLibraryPage('panth-prakash-english', 386),
    loadLibraryPage('panth-prakash-english', 388),
    loadLibraryPage('panth-prakash-english', 390),
    loadLibraryPage('panth-prakash-english', 392),
    loadLibraryPage('panth-prakash-english', 394),
    loadLibraryPage('panth-prakash-english', 396),
    loadLibraryPage('panth-prakash-english', 398),
    loadLibraryPage('panth-prakash-english', 400),
    loadLibraryPage('panth-prakash-english', 402),
    loadLibraryPage('panth-prakash-english', 404),
    loadLibraryPage('panth-prakash-english', 406),
    loadLibraryPage('panth-prakash-english', 408),
    loadLibraryPage('panth-prakash-english', 410),
    loadLibraryPage('panth-prakash-english', 412),
    loadLibraryPage('panth-prakash-english', 414),
    loadLibraryPage('panth-prakash-english', 416),
    loadLibraryPage('panth-prakash-english', 418),
    loadLibraryPage('panth-prakash-english', 420),
    loadLibraryPage('panth-prakash-english', 422),
  ])

  const requiredPhrases = [
    'Bahadur Shah',
    'Mughals will be trapped in their homes',
    'Qurans in hand',
    'feet leave marks',
    'conciliatory letter',
    'Lahore',
    'Panipat',
    'Shamas Khan',
    'hidden Singhs',
    'shams al-Din',
    'Bhai Nand Lal',
    'Guru Mother',
    'randi',
    'separate panth',
    'red dress',
    'turning from the Guru’s power',
    'Gurdaspur',
    'Asalam Khan',
    'Lahore',
    'Baisno panth',
    'Himmat Khan',
    'vakils',
    'money and rank',
    'Ali Ali',
    'fixed residence',
    'Banda’s Sikhs',
    'parvano shah',
    'Baj Singh',
    'garib niyane',
    'bhali buri tum sang nibahon',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 7 repaired pages keep readable editorial summaries for late Banda and factional episodes', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 436),
    loadLibraryPage('panth-prakash-english', 438),
    loadLibraryPage('panth-prakash-english', 440),
    loadLibraryPage('panth-prakash-english', 442),
    loadLibraryPage('panth-prakash-english', 444),
    loadLibraryPage('panth-prakash-english', 454),
    loadLibraryPage('panth-prakash-english', 456),
    loadLibraryPage('panth-prakash-english', 458),
    loadLibraryPage('panth-prakash-english', 460),
    loadLibraryPage('panth-prakash-english', 466),
    loadLibraryPage('panth-prakash-english', 468),
    loadLibraryPage('panth-prakash-english', 470),
    loadLibraryPage('panth-prakash-english', 476),
    loadLibraryPage('panth-prakash-english', 478),
    loadLibraryPage('panth-prakash-english', 480),
    loadLibraryPage('panth-prakash-english', 482),
    loadLibraryPage('panth-prakash-english', 484),
    loadLibraryPage('panth-prakash-english', 486),
    loadLibraryPage('panth-prakash-english', 488),
    loadLibraryPage('panth-prakash-english', 490),
    loadLibraryPage('panth-prakash-english', 492),
    loadLibraryPage('panth-prakash-english', 494),
    loadLibraryPage('panth-prakash-english', 496),
    loadLibraryPage('panth-prakash-english', 498),
  ])

  const requiredPhrases = [
    'hour to fight and die',
    'blood reddening the earth',
    'hunger and scarcity',
    'Harishchandra',
    'Kali’s food',
    'surrender arms',
    'iron cage',
    'destruction of the oppressive Turks',
    'Farukhsiyar',
    'severed head',
    'Jammu',
    'Sodhi line',
    'Tat Khalsa',
    'blue dress',
    'Bandais grow alarmed',
    'Kahan Singh',
    'Mughal support',
    'half the offerings',
    'written slips',
    'phatç gurâ kî',
    'Lahora Singh Kalal',
    'Akal Takht',
    'Mani Singh',
    'Episode 74',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 8 repaired pages keep readable editorial summaries for later misl and martyrdom episodes', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 506),
    loadLibraryPage('panth-prakash-english', 508),
    loadLibraryPage('panth-prakash-english', 510),
    loadLibraryPage('panth-prakash-english', 512),
    loadLibraryPage('panth-prakash-english', 514),
    loadLibraryPage('panth-prakash-english', 524),
    loadLibraryPage('panth-prakash-english', 526),
    loadLibraryPage('panth-prakash-english', 528),
    loadLibraryPage('panth-prakash-english', 530),
    loadLibraryPage('panth-prakash-english', 644),
    loadLibraryPage('panth-prakash-english', 646),
    loadLibraryPage('panth-prakash-english', 648),
    loadLibraryPage('panth-prakash-english', 650),
    loadLibraryPage('panth-prakash-english', 652),
    loadLibraryPage('panth-prakash-english', 656),
    loadLibraryPage('panth-prakash-english', 658),
    loadLibraryPage('panth-prakash-english', 660),
  ])

  const requiredPhrases = [
    'Bahadur Shah visited Sirhind',
    'Sri Guru Hargobind Singh fathered five respectable sons',
    'occupied the Guru’s seat',
    'saint Gurbakhsh Dass',
    'house made in brick and mortar',
    'Kharak Singh',
    'five Gursikhs',
    'assurance in black and white',
    'gave birth to a son',
    'Tara Singh',
    'Sahib Rai',
    'accept death rather than hiding',
    'battle readiness',
    'affirming shahidi',
    'môman khan dî chardhâî',
    'ghalyô môman khan phaujdar',
    'main tau ab murd pavaun lahaura',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 9 repaired pages keep readable editorial summaries for episodes 86 and 87', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 662),
    loadLibraryPage('panth-prakash-english', 664),
    loadLibraryPage('panth-prakash-english', 666),
    loadLibraryPage('panth-prakash-english', 668),
    loadLibraryPage('panth-prakash-english', 670),
    loadLibraryPage('panth-prakash-english', 672),
    loadLibraryPage('panth-prakash-english', 674),
    loadLibraryPage('panth-prakash-english', 676),
    loadLibraryPage('panth-prakash-english', 678),
  ])

  const requiredPhrases = [
    'Ghumanda, an Uppal Jat by caste',
    'A friendly Pathan came running on horseback',
    'stood in a circle with their backs towards each other',
    'Bhima Singh in a mood of chivalrous ecstasy',
    'Mansa Ram and Daya Ram',
    'twenty two companions',
    'A few among these Randhawas joined the Khalsa Panth',
    'get the Randhawa Singhs massacred',
    'fourteen Sikh elders',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 10 repaired pages keep readable editorial summaries for episodes 88 and 89', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 680),
    loadLibraryPage('panth-prakash-english', 682),
    loadLibraryPage('panth-prakash-english', 684),
    loadLibraryPage('panth-prakash-english', 686),
    loadLibraryPage('panth-prakash-english', 688),
    loadLibraryPage('panth-prakash-english', 690),
    loadLibraryPage('panth-prakash-english', 692),
    loadLibraryPage('panth-prakash-english', 694),
    loadLibraryPage('panth-prakash-english', 696),
    loadLibraryPage('panth-prakash-english', 698),
    loadLibraryPage('panth-prakash-english', 700),
    loadLibraryPage('panth-prakash-english', 702),
  ])

  const requiredPhrases = [
    'Nawab Kapoor Singh',
    'kasam kurân bahu bâr uthâvhi',
    'sabh k6 ik than langar karvavai',
    'Episode 89',
    'planted a Haidri flag',
    'one thousand soldiers from Delhi',
    'divided themselves into four contingents',
    'laid a siege to the Mansion',
    'survived this invasion',
    'strength increased to one thousand',
    'The Singhs suddenly pounced upon them unawares',
    'Episode 90',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 11 repaired pages keep readable editorial summaries for episode 90 and the transition into episode 91', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 704),
    loadLibraryPage('panth-prakash-english', 706),
    loadLibraryPage('panth-prakash-english', 708),
    loadLibraryPage('panth-prakash-english', 710),
    loadLibraryPage('panth-prakash-english', 712),
    loadLibraryPage('panth-prakash-english', 714),
    loadLibraryPage('panth-prakash-english', 716),
    loadLibraryPage('panth-prakash-english', 718),
    loadLibraryPage('panth-prakash-english', 720),
    loadLibraryPage('panth-prakash-english', 722),
  ])

  const requiredPhrases = [
    'Subeg Singh to carry the proposal',
    'robes and documents of nawabship',
    'martial congregation',
    'Guru has promised true sovereignty',
    'fresh scar that visibly testifies to his courage',
    'presents the robe of honor to Kapoor Singh',
    'Whatever money entered the Sikh coffers',
    'reorganize into a few contingents',
    'five contingents, each marked by its own standard',
    'Now follows the episode of Jassa Singh',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 12 repaired pages keep readable editorial summaries for episodes 91 through 93', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 724),
    loadLibraryPage('panth-prakash-english', 728),
    loadLibraryPage('panth-prakash-english', 730),
    loadLibraryPage('panth-prakash-english', 732),
    loadLibraryPage('panth-prakash-english', 734),
    loadLibraryPage('panth-prakash-english', 736),
    loadLibraryPage('panth-prakash-english', 738),
    loadLibraryPage('panth-prakash-english', 740),
    loadLibraryPage('panth-prakash-english', 742),
    loadLibraryPage('panth-prakash-english', 744),
  ])

  const requiredPhrases = [
    'assigned to distribute feed to the horses',
    'Ala Singh joined the fraternity of the Khalsa Panth',
    'The town where Guru’s two Sahibzadas were executed',
    'occupied the five main entrances to the city',
    'restored the sacred pool to its original glory',
    'take control of the offerings at Amritsar',
    'preservation of faith for a Sikh is a rare phenomenon',
    'ten thousand rupees tax',
    'Mani Singh prohibited all surety',
    'dismembered limb by limb',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 13 repaired pages keep readable editorial summaries for episodes 93 through 96', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 746),
    loadLibraryPage('panth-prakash-english', 748),
    loadLibraryPage('panth-prakash-english', 750),
    loadLibraryPage('panth-prakash-english', 752),
    loadLibraryPage('panth-prakash-english', 754),
    loadLibraryPage('panth-prakash-english', 756),
    loadLibraryPage('panth-prakash-english', 758),
    loadLibraryPage('panth-prakash-english', 760),
    loadLibraryPage('panth-prakash-english', 762),
    loadLibraryPage('panth-prakash-english', 764),
    loadLibraryPage('panth-prakash-english', 766),
    loadLibraryPage('panth-prakash-english', 768),
  ])

  const requiredPhrases = [
    'joint by joint',
    'greater than Mansur',
    'Nikhas Chowk Lahore',
    'Nadir Shah reaches Lahore',
    'thorn removes a thorn',
    'Takht-e-Taus worth nine crores',
    'seventy thousand killed in Delhi',
    'each Singh fights a hundred',
    'after Nadir left for Kabul',
    'hiding in ravines and forests',
    'written proclamation across Lahore',
    'Massa Ranghar desecrated the Darbar Sahib',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 14 repaired pages keep readable editorial summaries for episodes 97 and 98', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 770),
    loadLibraryPage('panth-prakash-english', 772),
    loadLibraryPage('panth-prakash-english', 774),
    loadLibraryPage('panth-prakash-english', 776),
    loadLibraryPage('panth-prakash-english', 778),
    loadLibraryPage('panth-prakash-english', 780),
    loadLibraryPage('panth-prakash-english', 782),
    loadLibraryPage('panth-prakash-english', 784),
    loadLibraryPage('panth-prakash-english', 786),
    loadLibraryPage('panth-prakash-english', 788),
    loadLibraryPage('panth-prakash-english', 790),
    loadLibraryPage('panth-prakash-english', 792),
  ])

  const requiredPhrases = [
    'Zakaria Khan’s proclamation',
    'desecration of Harmandir Sahib',
    'Sukha Singh joins Mehtab Singh',
    'disguised as revenue officials',
    'family of Massa Ranghar',
    'Mehtab Singh Bhangoo',
    'Mehtab Singh’s son',
    'Natha Khehra escapes with Rai Singh',
    'supporters of Massa Ranghar attack',
    'Natha’s bow breaks',
    'woman carries him in a basket',
    'Bota Singh mocked as an impostor',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 15 repaired pages keep readable editorial summaries for the Chhota Ghallughara aftermath and Ram Rauni opening', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 1000),
    loadLibraryPage('panth-prakash-english', 1002),
    loadLibraryPage('panth-prakash-english', 1004),
    loadLibraryPage('panth-prakash-english', 1006),
    loadLibraryPage('panth-prakash-english', 1008),
    loadLibraryPage('panth-prakash-english', 1010),
    loadLibraryPage('panth-prakash-english', 1012),
    loadLibraryPage('panth-prakash-english', 1014),
    loadLibraryPage('panth-prakash-english', 1016),
    loadLibraryPage('panth-prakash-english', 1018),
    loadLibraryPage('panth-prakash-english', 1020),
    loadLibraryPage('panth-prakash-english', 1022),
  ])

  const requiredPhrases = [
    'crossing into Majha',
    'betrayal by the hill chiefs',
    'reached Kiratpur in disguise',
    'Basoli jail and severed heads',
    'the word Guru was forbidden',
    'divine punishment was decreed',
    'Mir Mannu hid his father\'s death',
    'thrown into a sewage pit',
    'better to die near the Guru\'s shrines',
    'Singhs themselves served as masons',
    'Dina Beg with Kaura Mal',
    'better to die fighting than flee in disgrace',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 16 repaired pages keep readable editorial summaries for Ram Rauni, Kaura Mal, and Ahmad Shah Abdali', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 1024),
    loadLibraryPage('panth-prakash-english', 1026),
    loadLibraryPage('panth-prakash-english', 1028),
    loadLibraryPage('panth-prakash-english', 1030),
    loadLibraryPage('panth-prakash-english', 1034),
    loadLibraryPage('panth-prakash-english', 1036),
    loadLibraryPage('panth-prakash-english', 1038),
    loadLibraryPage('panth-prakash-english', 1040),
    loadLibraryPage('panth-prakash-english', 1042),
    loadLibraryPage('panth-prakash-english', 1044),
    loadLibraryPage('panth-prakash-english', 1046),
    loadLibraryPage('panth-prakash-english', 1048),
  ])

  const requiredPhrases = [
    'Mughals blocked every entrance',
    'petition sent by arrow',
    'Kaura Mal as a devout Sikh ally',
    'beheaded Shah Nawaz',
    'Najib Khan Ruhela invites Abdali',
    'Dewan Kaura Mal invites the Singhs',
    'Sukha Singh crosses the Ravi',
    'chooses martyrdom over retreat',
    'retreat towards Lahore',
    'move towards Majha',
    'Ghazi-ud-Din',
    'alliance with Wadbhag Singh',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 17 repaired pages keep readable editorial summaries for the Dina Beg settlement and the Maratha transition', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 1050),
    loadLibraryPage('panth-prakash-english', 1052),
    loadLibraryPage('panth-prakash-english', 1054),
    loadLibraryPage('panth-prakash-english', 1056),
    loadLibraryPage('panth-prakash-english', 1058),
    loadLibraryPage('panth-prakash-english', 1060),
    loadLibraryPage('panth-prakash-english', 1062),
    loadLibraryPage('panth-prakash-english', 1064),
    loadLibraryPage('panth-prakash-english', 1066),
  ])

  const requiredPhrases = [
    'written assurance',
    'Dina Beg prepared his contingent',
    'green leaves on their headgear',
    'Karam Singh of Paijgarh',
    'do not pursue the fleeing enemy',
    'Jalandhar appealed to Dina Beg',
    'secret petition to Jassa Singh',
    'one lakh rupees and karah parshad',
    'one and a quarter lakh',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 18 repaired pages keep readable editorial summaries for the Marathas, Sadiq Beg, and Gazdi transition', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 1068),
    loadLibraryPage('panth-prakash-english', 1070),
    loadLibraryPage('panth-prakash-english', 1072),
    loadLibraryPage('panth-prakash-english', 1074),
    loadLibraryPage('panth-prakash-english', 1076),
    loadLibraryPage('panth-prakash-english', 1078),
    loadLibraryPage('panth-prakash-english', 1080),
    loadLibraryPage('panth-prakash-english', 1082),
  ])

  const requiredPhrases = [
    'oath on the holy Koran',
    'turned back and fired on the Marathas',
    'Marathas captured Dina Beg',
    'twenty thousand Singhs',
    'fortified circular camp',
    'delay in ransom would bring renewed plunder',
    'Gazdi asked Gang Bhat for praise',
    'three ministers and a Kandhari sovereign',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 19 repaired pages keep readable editorial summaries for the Bangar, Mit Singh, and Mir Mannu transition', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 1085),
    loadLibraryPage('panth-prakash-english', 1087),
    loadLibraryPage('panth-prakash-english', 1090),
    loadLibraryPage('panth-prakash-english', 1092),
    loadLibraryPage('panth-prakash-english', 1094),
    loadLibraryPage('panth-prakash-english', 1096),
    loadLibraryPage('panth-prakash-english', 1098),
    loadLibraryPage('panth-prakash-english', 1100),
  ])

  const requiredPhrases = [
    'Jahan Khan kept chasing the Khalsa Singhs',
    'the second elephant did not crush Hattoo Singh',
    'Jaipur sent envoys to the Singhs',
    'troops from Lahore and Sirhind arrived',
    'the place came to be known as Shahid Ganj',
    'Pandori in the Majha area',
    'better half then persuades him',
    'feet got entangled in the stirrup',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 20 repaired pages keep readable editorial summaries for Mathura, Koel, and the Ghallughara opening', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 1104),
    loadLibraryPage('panth-prakash-english', 1106),
    loadLibraryPage('panth-prakash-english', 1108),
    loadLibraryPage('panth-prakash-english', 1110),
    loadLibraryPage('panth-prakash-english', 1112),
    loadLibraryPage('panth-prakash-english', 1114),
    loadLibraryPage('panth-prakash-english', 1116),
    loadLibraryPage('panth-prakash-english', 1118),
    loadLibraryPage('panth-prakash-english', 1120),
    loadLibraryPage('panth-prakash-english', 1122),
  ])

  const requiredPhrases = [
    'a book that dealt with the art of breaking forts',
    'Seven days having been wasted',
    'A forty feet high wall',
    'several thousand musketeers on the top',
    'Now as came the turn of the Sikhs',
    'the Khalsa remained inexhaustible',
    'the Singhs would steal their horses and get lost',
    'The Singhs had not even loaded their muskets by then',
    'Towards the Malwa region should they move their contingents',
    'the Sikh caravans must be accompanied by a warrior chief',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 21 repaired pages keep readable editorial summaries for the central Ghallughara caravan battle', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 1124),
    loadLibraryPage('panth-prakash-english', 1126),
    loadLibraryPage('panth-prakash-english', 1128),
    loadLibraryPage('panth-prakash-english', 1130),
    loadLibraryPage('panth-prakash-english', 1132),
    loadLibraryPage('panth-prakash-english', 1134),
    loadLibraryPage('panth-prakash-english', 1136),
    loadLibraryPage('panth-prakash-english', 1138),
    loadLibraryPage('panth-prakash-english', 1140),
    loadLibraryPage('panth-prakash-english', 1142),
  ])

  const requiredPhrases = [
    "Sham Singh's contingent",
    'Ahmad Shah Abdali himself attacked the Singhs',
    'Abdali divided it into two parts',
    'attack the Singhs instead of invading the caravan',
    'Gurmukh Singh made Jassa Singh mount his own horse',
    'Full twenty two wounds did Jassa Singh receive',
    'many a Singh foot soldiers did he mount on these',
    'The caravan carried two copies of holy Guru Granth Sahib',
    'The Singhs guarded the caravan from both the flanks',
    'Which were known by the names of Kutabo-Brahmini',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 22 repaired pages keep readable editorial summaries for the Ghallughara aftermath and the Brar rift opening', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 1144),
    loadLibraryPage('panth-prakash-english', 1146),
    loadLibraryPage('panth-prakash-english', 1148),
    loadLibraryPage('panth-prakash-english', 1152),
    loadLibraryPage('panth-prakash-english', 1154),
    loadLibraryPage('panth-prakash-english', 1156),
    loadLibraryPage('panth-prakash-english', 1158),
  ])

  const requiredPhrases = [
    'protect the Sikh caravan even at the cost of their lives',
    'the author records the number his eyewitness father told',
    'the entire Khalsa Panth might accept his leadership',
    'threatened the Singhs to eliminate them by inviting the Mughals',
    'the Brars of Binjhu declared war',
    'fifteen hundred horses',
    'Resolving to disguise themselves in the guise of Gilja Pathans',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 23 repaired pages keep readable editorial summaries for the Brar submission, Kapoora Brar, and Morinda transition', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 1160),
    loadLibraryPage('panth-prakash-english', 1162),
    loadLibraryPage('panth-prakash-english', 1164),
    loadLibraryPage('panth-prakash-english', 1166),
    loadLibraryPage('panth-prakash-english', 1168),
    loadLibraryPage('panth-prakash-english', 1170),
    loadLibraryPage('panth-prakash-english', 1172),
    loadLibraryPage('panth-prakash-english', 1174),
    loadLibraryPage('panth-prakash-english', 1176),
    loadLibraryPage('panth-prakash-english', 1178),
  ])

  const requiredPhrases = [
    'Pathan disguise',
    'took pahul and joined the Panth',
    'we are servants of the Turks',
    'year of great massacre',
    'thirsty Singhs went to Morinda for water',
    'the Ranghars opened a volley of fire',
    'Many misls turned back at the drum beat',
    'Charat Singh made a bold declaration',
    'Jaani Khan and Maani Khan',
    'Those who had taken refuge in Hindu households',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 24 repaired pages keep readable editorial summaries for Kasur and the Dileramian transition', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 1180),
    loadLibraryPage('panth-prakash-english', 1182),
    loadLibraryPage('panth-prakash-english', 1184),
    loadLibraryPage('panth-prakash-english', 1186),
    loadLibraryPage('panth-prakash-english', 1188),
    loadLibraryPage('panth-prakash-english', 1190),
    loadLibraryPage('panth-prakash-english', 1192),
    loadLibraryPage('panth-prakash-english', 1194),
    loadLibraryPage('panth-prakash-english', 1196),
    loadLibraryPage('panth-prakash-english', 1198),
  ])

  const requiredPhrases = [
    'sovereignty had already been granted to the Khalsa by their Guru',
    'There arrived a Brahmin from the city of Kasur',
    'the Singhs were in minority as compared to the Pathans',
    'the whole congregation moved to listen to the Guru\'s word at random',
    'Khalsa march did he order early in the morning',
    'A Sikh traveler from Kasur happened to pass by them',
    'At midday noon should the Khalsa Singhs enter the city of Kasur',
    'Then did the Khalsa order looting and plundering of Kasur',
    'Reminding the Khalsa about his wife\'s captivity under the Pathans',
    'They had the audacity to capture Jassa Singh Ahluwalia',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 25 repaired pages keep readable editorial summaries for the Dileram treasure betrayal and Doaba occupation opening', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 1200),
    loadLibraryPage('panth-prakash-english', 1202),
    loadLibraryPage('panth-prakash-english', 1204),
    loadLibraryPage('panth-prakash-english', 1206),
    loadLibraryPage('panth-prakash-english', 1208),
    loadLibraryPage('panth-prakash-english', 1210),
    loadLibraryPage('panth-prakash-english', 1212),
    loadLibraryPage('panth-prakash-english', 1214),
    loadLibraryPage('panth-prakash-english', 1216),
    loadLibraryPage('panth-prakash-english', 1218),
    loadLibraryPage('panth-prakash-english', 1220),
  ])

  const requiredPhrases = [
    'transferred all their assets to Kasur',
    'divide the plunder in equal parts',
    "Begum Noor Jahan's jewels",
    'the more greedy did Maali Singh become',
    "wealth gained by breaking one's vow",
    'Jassa Singh chalked out a strategy',
    'smearing his head with curd',
    'vacate the Doaba region',
    'Dina Beg had an agreement with the Singhs',
    'thousands of Singhs arrived',
    'occupied villages in the Doaba region',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 26 repaired pages keep readable editorial summaries for Taruna Dal expansion, Sar Buland Khan, and the Sirhind opening', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 1224),
    loadLibraryPage('panth-prakash-english', 1226),
    loadLibraryPage('panth-prakash-english', 1228),
    loadLibraryPage('panth-prakash-english', 1230),
    loadLibraryPage('panth-prakash-english', 1232),
    loadLibraryPage('panth-prakash-english', 1234),
    loadLibraryPage('panth-prakash-english', 1236),
    loadLibraryPage('panth-prakash-english', 1238),
    loadLibraryPage('panth-prakash-english', 1240),
    loadLibraryPage('panth-prakash-english', 1242),
  ])

  const requiredPhrases = [
    'the Lahore administration could no longer collect revenue',
    'besieged Gujranwala with artillery',
    'warnings of an approaching Khalsa force',
    'Charat Singh crossed the Jhelum',
    'a huge ransom was demanded',
    'even Ahmad Shah\'s uncle had been taken',
    'Sirhind was exposed because its officer was away',
    'Keeping all his war drums in the rear guard',
    'The location where wounded Zain Khan had fallen',
    'innocent infants had been beheaded here',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 27 repaired pages keep readable editorial summaries for the Sirhind memorial and post-Sirhind territorial settlements', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 1244),
    loadLibraryPage('panth-prakash-english', 1246),
    loadLibraryPage('panth-prakash-english', 1248),
    loadLibraryPage('panth-prakash-english', 1250),
    loadLibraryPage('panth-prakash-english', 1252),
    loadLibraryPage('panth-prakash-english', 1254),
    loadLibraryPage('panth-prakash-english', 1256),
    loadLibraryPage('panth-prakash-english', 1258),
  ])

  const requiredPhrases = [
    'a single memorial shrine should be established',
    'a memorial be built at the precise place',
    'The Panth gathered there in ceremony',
    'hear, read and pray at the shrine',
    'Rupees eighty thousands had he paid in public view',
    'Buddha Dal Singhs opined that the Khalsa must march towards Delhi',
    'the force returned toward Jind and Karnal',
    'the Pathans of Malerkotla are explicitly spared',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 28 repaired pages keep readable editorial summaries for the Nihang Gurbakhsh Singh martyrdom sequence', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 1264),
    loadLibraryPage('panth-prakash-english', 1266),
    loadLibraryPage('panth-prakash-english', 1268),
    loadLibraryPage('panth-prakash-english', 1270),
    loadLibraryPage('panth-prakash-english', 1272),
    loadLibraryPage('panth-prakash-english', 1274),
    loadLibraryPage('panth-prakash-english', 1276),
    loadLibraryPage('panth-prakash-english', 1280),
    loadLibraryPage('panth-prakash-english', 1282),
    loadLibraryPage('panth-prakash-english', 1284),
    loadLibraryPage('panth-prakash-english', 1286),
    loadLibraryPage('panth-prakash-english', 1288),
  ])

  const requiredPhrases = [
    'Wherever there is a war being waged',
    'families of the Sikhs started deserting in panic',
    'fatal wedding expedition',
    'five verses of Anand Sahib',
    'Standing before the Guru in Harmandir Sahib',
    'A step taken ahead upholds a Singh\'s dignity',
    'Company of the Khalsa is what they craved for',
    'Instantly his head was severed from his body',
    'With folded hands did Gurbakhsh Singh pray to God',
    'All the Martyrs corpses were piled up on a single pyre',
    'That he must take birth again to be with Khalsa Panth',
    'The whole Khalsa Panth would abide by his command',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 29 repaired pages keep readable editorial summaries for the Jawahar Mal and Abdali retreat sequence', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 1290),
    loadLibraryPage('panth-prakash-english', 1292),
    loadLibraryPage('panth-prakash-english', 1294),
    loadLibraryPage('panth-prakash-english', 1296),
    loadLibraryPage('panth-prakash-english', 1298),
    loadLibraryPage('panth-prakash-english', 1300),
    loadLibraryPage('panth-prakash-english', 1302),
    loadLibraryPage('panth-prakash-english', 1304),
    loadLibraryPage('panth-prakash-english', 1306),
    loadLibraryPage('panth-prakash-english', 1308),
    loadLibraryPage('panth-prakash-english', 1310),
  ])

  const requiredPhrases = [
    'send his representatives to the Khalsa Panth',
    'young Khalsa Singhs had joined the Jat chief',
    'Calling an assembly of Rajputs, Marathas and Brars',
    'Ragho Malhar',
    'never barter his family\'s reputation',
    'Najibu-ud-Daula proceeded to pay a visit',
    'He conferred the title of a Raja',
    'Day and night did the Singhs keep a vigil',
    'Impossible indeed it became for them to reach Kabul',
    'S. Charat Singh begged the Khalsa to take on Abdali',
    'the almighty God had supported the Singhs',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 30 repaired pages keep readable editorial summaries for Abdali aftermath, Mughal polemic, and the opening of Sham Singh\'s misl', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 1312),
    loadLibraryPage('panth-prakash-english', 1314),
    loadLibraryPage('panth-prakash-english', 1316),
    loadLibraryPage('panth-prakash-english', 1318),
    loadLibraryPage('panth-prakash-english', 1320),
    loadLibraryPage('panth-prakash-english', 1322),
    loadLibraryPage('panth-prakash-english', 1324),
    loadLibraryPage('panth-prakash-english', 1326),
    loadLibraryPage('panth-prakash-english', 1328),
  ])

  const requiredPhrases = [
    'God had supported the Singhs',
    'Khalsa Panth existed at the time of Aurangzeb',
    'Fully did he believe in the narrator\'s version',
    'heard it from my own mother',
    'Never would a Singh eat alone',
    'At Tarauri did Karora Singh die',
    'reach his fort at the earliest',
    'capture S. Baghel Singh',
    'Nobody vacated an occupied territory without a fight',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 31 repaired pages keep readable editorial summaries for the Patiala battle resolution and the Delhi benefaction opening', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 1330),
    loadLibraryPage('panth-prakash-english', 1332),
    loadLibraryPage('panth-prakash-english', 1334),
    loadLibraryPage('panth-prakash-english', 1336),
    loadLibraryPage('panth-prakash-english', 1338),
    loadLibraryPage('panth-prakash-english', 1340),
    loadLibraryPage('panth-prakash-english', 1342),
    loadLibraryPage('panth-prakash-english', 1344),
    loadLibraryPage('panth-prakash-english', 1346),
    loadLibraryPage('panth-prakash-english', 1348),
  ])

  const requiredPhrases = [
    'Now he must keep patience for five ten days',
    'With what face would they retreat at that stage',
    'The sun seemed to have been eclipsed by the rising dust',
    'Malwa forces got uprooted on both the battle fronts',
    'The Fort gates did they shut',
    'Both Majhail and Malwai Singhs constituted a Singh fraternity',
    'offer to Baghel Singh for adoption',
    'There is a town known as Luhari Jalalabad',
    'With the (aggrieved) Brahmin leading them from the front',
    'the underground cellar',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 32 repaired pages keep readable editorial summaries for the Delhi shrines, imperial meeting, and sugarcane demonstration', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 1350),
    loadLibraryPage('panth-prakash-english', 1352),
    loadLibraryPage('panth-prakash-english', 1354),
    loadLibraryPage('panth-prakash-english', 1356),
    loadLibraryPage('panth-prakash-english', 1360),
    loadLibraryPage('panth-prakash-english', 1362),
    loadLibraryPage('panth-prakash-english', 1364),
    loadLibraryPage('panth-prakash-english', 1366),
    loadLibraryPage('panth-prakash-english', 1370),
    loadLibraryPage('panth-prakash-english', 1372),
  ])

  const requiredPhrases = [
    'daughter of the Khalsa Panth',
    'accepted her as their own daughter',
    'Begum Samru',
    'put up his camp at Subzi Mandi',
    'site of Rakab Ganj',
    'old water-carrier woman',
    'Without arms never does a Singh lift his foot',
    'Never should any butcher be seen around on that day',
    'field of sugarcane crop across the river (Yamuna)',
    'plunged deep into the river Yamuna',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 33 repaired pages keep readable editorial summaries for the Deegh settlement and the early Malwa episodes', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 1374),
    loadLibraryPage('panth-prakash-english', 1376),
    loadLibraryPage('panth-prakash-english', 1378),
    loadLibraryPage('panth-prakash-english', 1380),
    loadLibraryPage('panth-prakash-english', 1382),
    loadLibraryPage('panth-prakash-english', 1384),
    loadLibraryPage('panth-prakash-english', 1386),
    loadLibraryPage('panth-prakash-english', 1388),
    loadLibraryPage('panth-prakash-english', 1390),
    loadLibraryPage('panth-prakash-english', 1392),
  ])

  const requiredPhrases = [
    'jai suraj mal gheriyo dik ghumarhi mahi',
    'sayam singh utth khaloyo',
    'timai panth gur giljai galvayo',
    'Malwa\'s forests',
    'Bhai Behlo',
    'Vaisakhi festival',
    'Bhai Bhagtu offered them shelter',
    'jahangir kai ja pau pâi',
    'bhagatâ kahi ab ôt nahin aurai',
    'kahi môhan ham dillî javain',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 34 repaired pages keep readable editorial summaries for the late Malwa and Sham Singh closing sequence', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 1394),
    loadLibraryPage('panth-prakash-english', 1396),
    loadLibraryPage('panth-prakash-english', 1398),
    loadLibraryPage('panth-prakash-english', 1400),
    loadLibraryPage('panth-prakash-english', 1404),
    loadLibraryPage('panth-prakash-english', 1406),
    loadLibraryPage('panth-prakash-english', 1408),
    loadLibraryPage('panth-prakash-english', 1410),
    loadLibraryPage('panth-prakash-english', 1412),
    loadLibraryPage('panth-prakash-english', 1414),
    loadLibraryPage('panth-prakash-english', 1416),
  ])

  const requiredPhrases = [
    'A lease deed for one lakh acres',
    'Carrying a bowl of curd',
    'With a sovereign rule was Phool invested',
    'Two sons were born in his family',
    'Ala Singh narrated his tale of woe',
    'they must not put up a camp in close vicinity',
    'The Khalsa emblems did the Singhs unfurl',
    'Many a horse did he present as gifts to Singhs',
    'instantly did he return to the Panth',
    'There used to sit S. Sham Singh in this hospice',
    'gur panth parkâsh bhayô ych púran',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 35 repaired pages keep readable editorial summaries for the Khalsa sovereignty and martyrdom sequence', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 617),
    loadLibraryPage('panth-prakash-english', 618),
    loadLibraryPage('panth-prakash-english', 619),
    loadLibraryPage('panth-prakash-english', 620),
    loadLibraryPage('panth-prakash-english', 621),
    loadLibraryPage('panth-prakash-english', 622),
    loadLibraryPage('panth-prakash-english', 624),
    loadLibraryPage('panth-prakash-english', 625),
    loadLibraryPage('panth-prakash-english', 626),
  ])

  const requiredPhrases = [
    'written assurance for the Panth',
    'Punjab would come into the hands of the Singhs',
    'the line of Gurus after Guru Nanak',
    'people sheltered by such a Lord cannot be defeated',
    'the Guru had already granted them patishahi',
    'compared to Guru Nanak establishing Angad',
    'Bhai Mani Singh as the model Sikh',
    'the ideal nihang as fearless in battle',
    'Guru and Sikh cannot be separated',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 36 repaired pages keep readable editorial summaries for the Bota Singh and Sukha Singh opening sequence', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 794),
    loadLibraryPage('panth-prakash-english', 796),
    loadLibraryPage('panth-prakash-english', 798),
    loadLibraryPage('panth-prakash-english', 800),
    loadLibraryPage('panth-prakash-english', 802),
    loadLibraryPage('panth-prakash-english', 804),
    loadLibraryPage('panth-prakash-english', 806),
    loadLibraryPage('panth-prakash-english', 808),
    loadLibraryPage('panth-prakash-english', 810),
    loadLibraryPage('panth-prakash-english', 812),
    loadLibraryPage('panth-prakash-english', 814),
  ])

  const requiredPhrases = [
    'Bota Singh wrote a letter',
    'staffs, stones, and spears',
    'opened a heavy shower of bullets',
    'Now hear the story of Sukha Singh',
    'jumped into a deep well',
    'die fighting the Mughals',
    'contributed the entire booty to the community kitchen',
    'ex-communicated by the Khalsa Panth',
    'proceeded on an expedition towards Delhi',
    'fight only when they are armed with their small firearms',
    'Charat Singh felt extremely outraged',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 37 repaired pages keep readable editorial summaries for the Parol and Kathuha massacre retreat sequence', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 980),
    loadLibraryPage('panth-prakash-english', 982),
    loadLibraryPage('panth-prakash-english', 984),
    loadLibraryPage('panth-prakash-english', 986),
    loadLibraryPage('panth-prakash-english', 988),
    loadLibraryPage('panth-prakash-english', 990),
    loadLibraryPage('panth-prakash-english', 992),
    loadLibraryPage('panth-prakash-english', 994),
    loadLibraryPage('panth-prakash-english', 996),
    loadLibraryPage('panth-prakash-english', 998),
  ])

  const requiredPhrases = [
    'towards Basohali',
    'river flowing in full torrent and flood',
    'dug trenches and underground bunkers',
    'five rupees for each Sikh’s head',
    'heavy security cordon around him',
    'The battle raged partly on the mountains',
    'reassemble in the Majha region',
    'strongest Mughal defences',
    'called the public with a beat of drum',
    'make-shift boats of reeds and grass',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 38 repaired pages keep readable editorial summaries for the Bhai Taru Singh, Nawab, and Jassu transition sequence', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 940),
    loadLibraryPage('panth-prakash-english', 942),
    loadLibraryPage('panth-prakash-english', 944),
    loadLibraryPage('panth-prakash-english', 946),
    loadLibraryPage('panth-prakash-english', 948),
    loadLibraryPage('panth-prakash-english', 950),
    loadLibraryPage('panth-prakash-english', 952),
    loadLibraryPage('panth-prakash-english', 954),
    loadLibraryPage('panth-prakash-english', 956),
    loadLibraryPage('panth-prakash-english', 958),
  ])

  const requiredPhrases = [
    'restore the twelve villages',
    'touched by Bhai Taru Singh’s shoe',
    'the urinary blockage got cleared',
    'Subeg Singh summoned to the royal court',
    'The gallows dismantled',
    'ask for his funeral pyre to be prepared',
    'planting a flag post in memory of Bhai Taru Singh',
    'Shah Nawaz seized power',
    'steal horses from the sleeping Mughals',
    'main highways to Delhi, Lahore, and Peshawar',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 39 repaired pages keep readable editorial summaries for the Babur-to-Taru-Singh transition sequence', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 898),
    loadLibraryPage('panth-prakash-english', 900),
    loadLibraryPage('panth-prakash-english', 902),
    loadLibraryPage('panth-prakash-english', 904),
    loadLibraryPage('panth-prakash-english', 906),
    loadLibraryPage('panth-prakash-english', 908),
    loadLibraryPage('panth-prakash-english', 910),
    loadLibraryPage('panth-prakash-english', 912),
  ])

  const requiredPhrases = [
    "Guru Nanak's heavenly dharamsal",
    'Sovereignty over India belonged to Guru Nanak',
    "fall at Guru Nanak's feet",
    'seven handfuls of bhang',
    'a boon can be withdrawn',
    'the Mughal rulers broke their covenant',
    'keep the faith till his last breath',
    'listen now to the second tale of Mehtab Singh',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 40 repaired pages keep readable editorial summaries for the Mehtab, Taru Singh, and Nawab affliction sequence', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 916),
    loadLibraryPage('panth-prakash-english', 918),
    loadLibraryPage('panth-prakash-english', 920),
    loadLibraryPage('panth-prakash-english', 922),
    loadLibraryPage('panth-prakash-english', 924),
    loadLibraryPage('panth-prakash-english', 926),
    loadLibraryPage('panth-prakash-english', 928),
    loadLibraryPage('panth-prakash-english', 930),
    loadLibraryPage('panth-prakash-english', 932),
    loadLibraryPage('panth-prakash-english', 934),
    loadLibraryPage('panth-prakash-english', 936),
    loadLibraryPage('panth-prakash-english', 938),
  ])

  const requiredPhrases = [
    'execution on the spoked wheel',
    'Would never convert to Islam',
    'ordered the barbers to shave off his sacred hair',
    'The rule of the Mughals would not last long',
    'The Nawab developed a blockage in his urinary tract',
    'The spirits of martyred Singhs',
    'Singhs alone could uplift the curse meted out by a Singh',
    'The Khalsa Panth alone could be the sole arbiter of his fate',
    'Khalsa Panth alone being empowered to annul that curse',
    'Wherever the five Singhs prayed together with folded hands',
    'The Singhs became desperate to launch an attack on Lahore',
    'Divine Guru and Khalsa were synonymous with each other',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 41 repaired pages keep readable editorial summaries for the Jaspat Rai aftermath and the opening of the Parol-Kathuha massacre', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 960),
    loadLibraryPage('panth-prakash-english', 962),
    loadLibraryPage('panth-prakash-english', 964),
    loadLibraryPage('panth-prakash-english', 966),
    loadLibraryPage('panth-prakash-english', 968),
    loadLibraryPage('panth-prakash-english', 970),
    loadLibraryPage('panth-prakash-english', 972),
    loadLibraryPage('panth-prakash-english', 974),
    loadLibraryPage('panth-prakash-english', 976),
    loadLibraryPage('panth-prakash-english', 978),
  ])

  const requiredPhrases = [
    'the Singhs laid waste around Lahore',
    'we have no enmity with you, only with the Turks',
    'The memory of Bhai Mani Singh\'s dismemberment was revived',
    'Lakhpat Rai laid his turban at the Nawab\'s feet',
    'whoever bore the name Singh was to be killed',
    'Somvati Amavas',
    'Multan and Bahawalpur',
    'The true Khalsa remained',
    'thickets were burned',
    'Food and water failed',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 42 repaired pages keep readable editorial summaries for Daulat Khan, Babur, and Guru Nanak\'s court sequence', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 878),
    loadLibraryPage('panth-prakash-english', 880),
    loadLibraryPage('panth-prakash-english', 882),
    loadLibraryPage('panth-prakash-english', 884),
    loadLibraryPage('panth-prakash-english', 886),
    loadLibraryPage('panth-prakash-english', 888),
    loadLibraryPage('panth-prakash-english', 890),
    loadLibraryPage('panth-prakash-english', 892),
    loadLibraryPage('panth-prakash-english', 894),
    loadLibraryPage('panth-prakash-english', 896),
  ])

  const requiredPhrases = [
    'would never return to the Pathans',
    'small men cannot accomplish great tasks',
    'seek Guru Nanak\'s permission',
    'let us go and see him',
    'Daulat Khan dismounted and bowed at the Guru\'s feet',
    'Mardana is told to play the rabab',
    'mercy or wrath from God',
    'the great Hindu pir',
    'he came because he was called',
    'The gate opens when he invokes satnam',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 43 repaired pages keep readable editorial summaries for the Bhai Taru Singh martyrdom and Babur opening sequence', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 858),
    loadLibraryPage('panth-prakash-english', 860),
    loadLibraryPage('panth-prakash-english', 862),
    loadLibraryPage('panth-prakash-english', 864),
    loadLibraryPage('panth-prakash-english', 866),
    loadLibraryPage('panth-prakash-english', 868),
    loadLibraryPage('panth-prakash-english', 870),
    loadLibraryPage('panth-prakash-english', 872),
    loadLibraryPage('panth-prakash-english', 874),
    loadLibraryPage('panth-prakash-english', 876),
  ])

  const requiredPhrases = [
    'Episode 106 opens with Bhai Taru Singh',
    'the hidden Singhs were still being fed',
    'Taru Singh of village Poolha',
    'the Bhardana Sikhs wanted to free him',
    'the Gurus had given their own heads for the Panth',
    'one sheath cannot hold two swords',
    'Episode 107 opens with the Sakhi of Babur',
    'Daulat Khan\'s wives received Guru Nanak\'s blessing',
    'Daulat Khan fled toward Eminabad',
    'Daulat Khan urged Guru Nanak to take the throne of Hindustan',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 44 repaired pages keep readable editorial summaries for the lion cave, Subeg Singh, and Bhai Taru Singh transition sequence', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 838),
    loadLibraryPage('panth-prakash-english', 840),
    loadLibraryPage('panth-prakash-english', 842),
    loadLibraryPage('panth-prakash-english', 844),
    loadLibraryPage('panth-prakash-english', 846),
    loadLibraryPage('panth-prakash-english', 848),
    loadLibraryPage('panth-prakash-english', 850),
    loadLibraryPage('panth-prakash-english', 852),
    loadLibraryPage('panth-prakash-english', 854),
    loadLibraryPage('panth-prakash-english', 856),
  ])

  const requiredPhrases = [
    'the Singhs hide by day and move by night',
    'the cave is betrayed to the Mughals',
    'the Singhs block the opening against smoke and fire',
    'Episode 105 opens with Subeg Singh Jambar',
    'Subeg Singh refuses to convert',
    'the nawab has Subeg Singh\'s young son tortured',
    'The Gurus themselves surrendered their sons for the Panth',
    'the child is revived and pressed toward conversion',
    'Subeg Singh asks to see the boy closely',
    'the child firmly rejects the nawab\'s kalma',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 45 repaired pages keep readable editorial summaries for the Sukha Singh duel, Amritsar challenge, and Mehtab Kot transition sequence', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 816),
    loadLibraryPage('panth-prakash-english', 818),
    loadLibraryPage('panth-prakash-english', 820),
    loadLibraryPage('panth-prakash-english', 824),
    loadLibraryPage('panth-prakash-english', 826),
    loadLibraryPage('panth-prakash-english', 828),
    loadLibraryPage('panth-prakash-english', 830),
    loadLibraryPage('panth-prakash-english', 832),
    loadLibraryPage('panth-prakash-english', 834),
    loadLibraryPage('panth-prakash-english', 836),
  ])

  const requiredPhrases = [
    'Sukha Singh turns the insult into a vow to defend Khalsa honor',
    'Sukha Singh refuses to let the Pathan leave alive',
    'Sukha Singh seizes a fallen knife and kills the Pathan',
    'Karma Chhina proposes single combat when the fort can no longer save him',
    'the Mughals forbid Sikhs to bathe at Amritsar',
    'he would bathe in the broad daylight',
    'The Mughals were dumbfounded to witness such a scene',
    'they should not spare anyone with unshorn hair',
    'Mughal troops ran in all four directions',
    'The Singhs greeted the night as one greets a sunrise',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 46 repaired pages keep readable editorial summaries for Ahmad Shah, Charhat Singh, and the Hindal-to-Tara Singh transition sequence', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 628),
    loadLibraryPage('panth-prakash-english', 629),
    loadLibraryPage('panth-prakash-english', 631),
    loadLibraryPage('panth-prakash-english', 632),
    loadLibraryPage('panth-prakash-english', 636),
    loadLibraryPage('panth-prakash-english', 638),
    loadLibraryPage('panth-prakash-english', 642),
  ])

  const requiredPhrases = [
    'Ahmad Shah asks who plundered him',
    'blessings that he would become sovereign',
    'Gurdit Singh Giani citation',
    'The poor man comes to the Guru\'s langar',
    'He could not maintain and preserve the Guru\'s rare gift',
    'Declared themselves to be Niranjanias instead of Guru\'s Sikhs',
    'Listen to the episode of Tara Singh',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 47 repaired pages keep readable editorial summaries for the Binod Singh, Gulab Rai, martyrdom test, and Gangu Shah sequence', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 500),
    loadLibraryPage('panth-prakash-english', 502),
    loadLibraryPage('panth-prakash-english', 504),
    loadLibraryPage('panth-prakash-english', 516),
    loadLibraryPage('panth-prakash-english', 518),
    loadLibraryPage('panth-prakash-english', 520),
    loadLibraryPage('panth-prakash-english', 522),
    loadLibraryPage('panth-prakash-english', 532),
    loadLibraryPage('panth-prakash-english', 534),
    loadLibraryPage('panth-prakash-english', 536),
  ])

  const requiredPhrases = [
    'These two veterans invaded Banda Singh along with the Mughals',
    'she prayed to be blessed with two sons',
    'the whole congregation went into peels of laughter',
    'how the title martyr became associated with the Singhs',
    'many ran away from the congregation',
    'Majhail Singhs competed to offer their heads',
    'Episode 80 opens with Mehar Singh',
    'Gangu Shah as a poor hawker',
    'asked to be blessed with the status of a Hundiwal financier',
    'his face had turned blackish',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 48 repaired pages keep readable editorial summaries for the Gurdas Nangal collapse, Banda Singh capture, and Farukhsiyar aftermath sequence', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 424),
    loadLibraryPage('panth-prakash-english', 426),
    loadLibraryPage('panth-prakash-english', 430),
    loadLibraryPage('panth-prakash-english', 432),
    loadLibraryPage('panth-prakash-english', 434),
    loadLibraryPage('panth-prakash-english', 446),
    loadLibraryPage('panth-prakash-english', 448),
    loadLibraryPage('panth-prakash-english', 452),
    loadLibraryPage('panth-prakash-english', 462),
    loadLibraryPage('panth-prakash-english', 464),
    loadLibraryPage('panth-prakash-english', 474),
  ])

  const requiredPhrases = [
    'special royal proclamation',
    'could not reload their guns',
    'attack and capture Banda Singh\'s fort',
    'opened the gates with swords drawn',
    'two bullets in each musket',
    'complete the one lakh and a quarter',
    'hunger had reduced them to skeletons',
    'Episode of Banda Singh\'s Capture',
    'dragged behind a horse',
    'sakhi of Banda\'s disappearance',
    'Where did the Khalsa stay',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 49 repaired pages keep readable editorial summaries for the opening invocation, Guru Nanak transitions, and Aurangzeb opening sequence', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 44),
    loadLibraryPage('panth-prakash-english', 45),
    loadLibraryPage('panth-prakash-english', 46),
    loadLibraryPage('panth-prakash-english', 59),
    loadLibraryPage('panth-prakash-english', 69),
    loadLibraryPage('panth-prakash-english', 81),
    loadLibraryPage('panth-prakash-english', 83),
    loadLibraryPage('panth-prakash-english', 97),
    loadLibraryPage('panth-prakash-english', 99),
    loadLibraryPage('panth-prakash-english', 101),
    loadLibraryPage('panth-prakash-english', 103),
  ])

  const requiredPhrases = [
    'Khalsa sovereignty is real and divinely grounded',
    'hinge between the prefatory defense and Episode 1',
    'Sri Gur Panth Prakash',
    'write the Sikh origin truthfully for London',
    'Guru Nanak teaches Satinam and Kartar Purakh',
    'Baba Nanak resolves to ferry the world across',
    'the eastern udasi begins',
    'the Delhi sovereignty would not endure',
    'writers had confused sakhi with gosht',
    'the lamp-to-lamp succession of the Gurus',
    'Aurangzeb hardens his rule into forced Islamization',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 50 repaired pages keep readable editorial summaries for the southward move, Banda transitions, and early Sirhind campaigns', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 218),
    loadLibraryPage('panth-prakash-english', 246),
    loadLibraryPage('panth-prakash-english', 268),
    loadLibraryPage('panth-prakash-english', 282),
    loadLibraryPage('panth-prakash-english', 292),
    loadLibraryPage('panth-prakash-english', 294),
    loadLibraryPage('panth-prakash-english', 296),
    loadLibraryPage('panth-prakash-english', 306),
    loadLibraryPage('panth-prakash-english', 308),
    loadLibraryPage('panth-prakash-english', 310),
  ])

  const requiredPhrases = [
    'Aurangzeb had expired',
    'collective Will of the Khalsa',
    'written message through these captured spies',
    'camel-loaded guns',
    'did not ransack the city of Sirhind',
    'written orders to the Payal thana',
    'Surviving Pathans fled toward Delhi and Lahore',
    'Banda then blesses him with another pair of twin sons',
    'Banda promises to give him teeth',
    'Banda turns toward the hills',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 51 repaired pages keep readable editorial summaries for the Chamba, Mughal command, and Tat Khalsa transition sequence', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 348),
    loadLibraryPage('panth-prakash-english', 350),
    loadLibraryPage('panth-prakash-english', 366),
    loadLibraryPage('panth-prakash-english', 368),
    loadLibraryPage('panth-prakash-english', 370),
    loadLibraryPage('panth-prakash-english', 372),
    loadLibraryPage('panth-prakash-english', 382),
    loadLibraryPage('panth-prakash-english', 384),
  ])

  const requiredPhrases = [
    'stone horse in the stream',
    'Reports carried to Bahadur Shah',
    'Bahadur Shah died on the road',
    'must not oppose the House of Nanak',
    'rumor of Banda’s capture',
    'night march from Lohgarh',
    'letter under the Guru’s seal',
    'I am no longer the Guru’s Sikh',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('wave 52 repaired pages keep readable editorial summaries for the closing index and volume-two dedication pages', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 575),
    loadLibraryPage('panth-prakash-english', 579),
  ])

  const requiredPhrases = [
    'closing index page',
    'Dedicated to Dr Kharak Singh',
  ]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.quality).toBe('readable')
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.every(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => /[A-Za-z]{4,}/.test(block.text))).toBe(true)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
  })
})

test('premium contents pages keep curated editorial outlines and browse links for both Panth Prakash volumes', async () => {
  const pages = await Promise.all([
    loadLibraryPage('panth-prakash-english', 5),
    loadLibraryPage('panth-prakash-english', 581),
    loadLibraryPage('panth-prakash-english', 582),
  ])

  const expectedTitles = [
    'Contents (Volume I)',
    'Contents (Volume II)',
    'Contents (Volume II, continued)',
  ]

  const requiredPhrases = [
    'Dialogue Between Baba Nanak and Kaliyuga',
    'Invasion of Moman Khan',
    'occupation and handing over of Sirhind',
  ]

  const requiredNavLabels = [
    'The opening Banda Bahadur sequence',
    'Nadar Shah, Zakaria Khan, Mehtab Singh, and Sukha Singh',
    'Kasur, Dileramian, Doaba, Taruna Dal, and Sirhind',
  ]

  const requiredNavTargets = [221, 759, 1181]

  pages.forEach((page, index) => {
    expect(page).not.toBeNull()
    expect(page?.title).toBe(expectedTitles[index])
    expect(page?.quality).toBe('clean')
    expect(page?.episode).toBeUndefined()
    expect(page?.blocks.length).toBeGreaterThan(0)
    expect(page?.blocks.some(block => block.id.startsWith(`manual-${page?.pageNumber}-`))).toBe(true)
    expect(page?.blocks.some(block => block.type === 'heading')).toBe(true)
    expect(page?.blocks.some(block => block.type === 'paragraph')).toBe(true)
    expect(page?.blocks.some(block => block.text.includes(requiredPhrases[index]))).toBe(true)
    expect(page?.editorialNavigation?.some(link => link.label === requiredNavLabels[index] && link.pageNumber === requiredNavTargets[index])).toBe(true)
  })
})

test('can swap in a filesystem-backed loader for tests', async () => {
  configureLibraryRepositoryLoader(async (resourcePath) => readPublicLibraryJson(resourcePath))
  resetLibraryRepositoryCache()

  const manifest = await loadLibraryManifest()
  expect(manifest.workCatalogPath).toBe('/data/library/works.json')
})

