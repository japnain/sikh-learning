import type { LibraryEpisodeIndexEntry, LibraryPageIndexEntry, LibraryPagePayload, LibrarySearchIndex, LibraryTextBlock, LibraryPageTextState } from '../types'

export type PanthPrakashArcId =
  | 'origins'
  | 'guru-period'
  | 'banda-singh-bahadur'
  | 'persecution-and-martyrdom'
  | 'afghan-lahore-conflicts'
  | 'sikh-rule'

export interface PanthPrakashEpisodeEditorial {
  displayTitle?: string
  arc: PanthPrakashArcId
  arcLabel: string
  summary?: string
  whyItMatters?: string
  people?: string[]
  places?: string[]
  dates?: string[]
  relatedEpisodeNumbers?: number[]
}

const ARC_RULES: Array<{ id: PanthPrakashArcId; label: string; maxEpisode: number }> = [
  { id: 'origins', label: 'Origins and early Gurus', maxEpisode: 12 },
  { id: 'guru-period', label: 'Guru period', maxEpisode: 31 },
  { id: 'banda-singh-bahadur', label: 'Banda Singh Bahadur', maxEpisode: 62 },
  { id: 'persecution-and-martyrdom', label: 'Persecution and martyrdom', maxEpisode: 115 },
  { id: 'afghan-lahore-conflicts', label: 'Afghan and Lahore conflicts', maxEpisode: 158 },
  { id: 'sikh-rule', label: 'Sikh rule and later Panth', maxEpisode: 169 },
]

const EPISODE_OVERRIDES: Record<number, Partial<PanthPrakashEpisodeEditorial>> = {
  1: {
    displayTitle: 'Origins of the Khalsa narrative',
    summary: 'The opening episode frames the origin of the Khalsa and sets up Panth Prakash as a historical, devotional, and communal memory text.',
    whyItMatters: 'This is the doorway into the whole work: the reader needs to understand that later battles and martyrdoms are being read through the origin story of the Khalsa Panth.',
    people: ['Guru Nanak', 'Guru Gobind Singh'],
    relatedEpisodeNumbers: [11, 15],
  },
  15: {
    displayTitle: 'Creation of the Khalsa Panth',
    summary: 'The episode turns from lineage and persecution into the formal creation of the Khalsa discipline.',
    whyItMatters: 'It gives the reader the institutional and spiritual foundation for the later resistance narratives.',
    people: ['Guru Gobind Singh', 'Panj Pyare'],
    places: ['Anandpur Sahib'],
    relatedEpisodeNumbers: [14, 16],
  },
  19: {
    displayTitle: 'Sacrifice of the elder Sahibzadas at Chamkaur',
    summary: 'The Chamkaur sequence reaches the sacrifice of the elder Sahibzadas and the Guru’s departure toward Machhiwara.',
    whyItMatters: 'This is one of the central martyrdom moments that shapes the emotional and theological memory of the text.',
    people: ['Guru Gobind Singh', 'Sahibzada Ajit Singh', 'Sahibzada Jujhar Singh'],
    places: ['Chamkaur', 'Machhiwara'],
    relatedEpisodeNumbers: [18, 20],
  },
  20: {
    displayTitle: 'Guru Gobind Singh at Machhiwara',
    summary: 'The narrative follows Guru Gobind Singh through the Machhiwara passage after the Anandpur and Chamkaur crisis.',
    people: ['Guru Gobind Singh', 'Pathan brothers'],
    places: ['Machhiwara'],
    relatedEpisodeNumbers: [18, 19, 21],
  },
  52: {
    displayTitle: 'The Chamba miracle and Banda Singh Bahadur’s reception',
    summary: 'A short Chamba hinge episode where marvel, local reception, and alliance-building shift the Banda Singh Bahadur arc forward.',
    whyItMatters: 'The episode shows Banda Singh Bahadur’s campaign becoming a regional political force rather than only a military movement.',
    people: ['Banda Singh Bahadur'],
    places: ['Chamba'],
    relatedEpisodeNumbers: [51, 53],
  },
  27: {
    displayTitle: 'Banda Singh Bahadur enters the narrative',
    summary: 'The first Banda Bahadur episode introduces the figure who will carry the Khalsa struggle into a new militant and political phase.',
    whyItMatters: 'It marks the transition from the Guru Gobind Singh cycle into the Banda Singh Bahadur campaign.',
    people: ['Banda Singh Bahadur', 'Guru Gobind Singh'],
    relatedEpisodeNumbers: [26, 28],
  },
  31: {
    displayTitle: 'Banda Singh Bahadur’s next movement',
    summary: 'The damaged source title is replaced in the app layer with a readable guide title for this Banda Singh Bahadur transition episode.',
    whyItMatters: 'This keeps the episode browser usable while preserving the original extracted title in source data.',
    people: ['Banda Singh Bahadur'],
    relatedEpisodeNumbers: [30, 32],
  },
  37: {
    displayTitle: 'The death of Wazir Khan',
    summary: 'The campaign reaches the confrontation with Wazir Khan, a major turning point in Banda Singh Bahadur’s arc.',
    whyItMatters: 'Wazir Khan’s death connects the Banda campaign with the memory of Sirhind and the martyrdom of the younger Sahibzadas.',
    people: ['Banda Singh Bahadur', 'Wazir Khan'],
    places: ['Sirhind'],
    relatedEpisodeNumbers: [35, 36, 40],
  },
  115: {
    displayTitle: 'The killing of Jassu / Jadu Rai after Bhai Taru Singh’s martyrdom',
    summary: 'This episode belongs to the Lahore persecution cycle and follows the aftermath of Bhai Taru Singh’s martyrdom in the same historical pressure field.',
    whyItMatters: 'The episode keeps the reader inside the moral and political world around Lahore, where the text links state violence, Sikh resistance, and retributive justice after Bhai Taru Singh.',
    people: ['Bhai Taru Singh', 'Jassu / Jadu Rai', 'Nawab Khan Bahadur'],
    places: ['Lahore'],
    dates: ['Bikrami Samvat 1802, as stated in the text'],
    relatedEpisodeNumbers: [114, 116],
  },
  100: {
    displayTitle: 'Bhai Sukha Singh’s bravery',
    summary: 'The Sukha Singh cycle foregrounds individual courage and Sikh initiative under hostile political conditions.',
    whyItMatters: 'It prepares the reader for a run of episodes where personal bravery carries the historical memory forward.',
    people: ['Bhai Sukha Singh'],
    relatedEpisodeNumbers: [101, 102, 103],
  },
  112: {
    displayTitle: 'Bhai Taru Singh’s martyrdom',
    summary: 'A major martyrdom episode centered on Bhai Taru Singh and the Lahore state’s violence against Sikh devotion.',
    whyItMatters: 'This is one of the best-known martyrdom moments in the later Panth Prakash narrative and deserves special reader context.',
    people: ['Bhai Taru Singh', 'Nawab Khan Bahadur'],
    places: ['Lahore'],
    relatedEpisodeNumbers: [107, 110, 114, 115],
  },
  116: {
    displayTitle: 'The Chhota Ghallughara at Parol and Kathuha',
    summary: 'The episode opens the massacre sequence around Parol and Kathuha, a key moment of collective trauma in the text.',
    whyItMatters: 'It moves the reader from individual martyrdom into the memory of mass violence against the Panth.',
    places: ['Parol', 'Kathuha'],
    relatedEpisodeNumbers: [115, 117],
  },
  117: {
    displayTitle: 'Counting the Singhs after the massacre',
    summary: 'This episode records the aftermath and head count of Singhs killed after the massacre sequence.',
    whyItMatters: 'The cleaned title makes the casualty-accounting function legible without mutating the damaged extracted heading.',
    relatedEpisodeNumbers: [116, 118],
  },
  119: {
    displayTitle: 'Ram Rauni and the Sikh defensive position',
    summary: 'The Ram Rauni episode follows the formation and defense of a key Sikh position in Amritsar.',
    whyItMatters: 'It links survival under pressure with the emergence of Sikh institutional and military space.',
    places: ['Ram Rauni', 'Amritsar'],
    relatedEpisodeNumbers: [118, 120],
  },
  120: {
    displayTitle: 'Kaura Mal and the Sikh alliance',
    summary: 'The Kaura Mal episodes show political collaboration, patronage, and military support around the Sikh struggle.',
    whyItMatters: 'They help explain how the Panth survived through shifting alliances as well as battlefield courage.',
    people: ['Kaura Mal'],
    relatedEpisodeNumbers: [119, 121],
  },
  123: {
    displayTitle: 'Ahmad Shah, Sukha Singh, and the Afghan pressure',
    summary: 'The narrative turns toward Afghan pressure and the Sikh response around Ahmad Shah and Sukha Singh.',
    whyItMatters: 'This starts one of the large late arcs about Afghan imperial power and Sikh resilience.',
    people: ['Ahmad Shah', 'Sukha Singh'],
    relatedEpisodeNumbers: [122, 124],
  },
  169: {
    displayTitle: 'Bunga of Sardar Sham Singh and the return of Biru Singh',
    summary: 'The closing episode turns on loyalty, defection, return, and the magnetic pull of the Panth in the later Sikh-rule narrative.',
    people: ['Sardar Sham Singh', 'Biru Singh'],
    relatedEpisodeNumbers: [168],
  },
}

const PRIORITIZED_CONTEXT_EPISODES = [
  1, 12, 15, 17, 18, 19, 20, 23, 24, 27, 28, 31, 35, 37, 40, 52, 62, 85, 100, 107, 112, 115, 116, 119, 120, 123, 124, 125, 158, 169,
]

const EPISODE_TITLE_OVERRIDES: Record<number, string> = Object.fromEntries(
  Object.entries(EPISODE_OVERRIDES)
    .filter(([, value]) => Boolean(value.displayTitle))
    .map(([key, value]) => [Number(key), value.displayTitle!]),
) as Record<number, string>

function cleanGeneratedEpisodeTitle(title: string, episodeNumber: number) {
  const normalized = title
    .replace(/\s+/g, ' ')
    .replace(/\.\s*;?$/, '')
    .replace(/\.{2,}\s*$/g, '')
    .replace(/\s+\.\.\.?\s*$/g, '')
    .trim()

  if (/^\d+$/.test(normalized)) return `Episode ${episodeNumber}`

  return normalized
    .replace(/^The\s+Episode\s+About\s+/i, '')
    .replace(/^Episode\s+About\s+/i, '')
    .replace(/^Another\s+Episode\s+About\s+/i, '')
    .replace(/^Another\s+Episode\s*/i, 'Additional episode: ')
    .replace(/\bNea\b/i, '')
    .replace(/\bMm\b/i, '')
    .replace(/\bTs\b/i, '')
    .replace(/\bnd\b$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getPanthPrakashPrioritizedContextEpisodes() {
  return PRIORITIZED_CONTEXT_EPISODES
}

function buildFallbackSummary(episodeNumber: number, _title: string, arcLabel: string) {
  return `Episode ${episodeNumber} belongs to the ${arcLabel.toLowerCase()} arc and is presented with a cleaned guide title so the reader can follow the narrative without changing the source extraction.`
}

function buildFallbackWhyItMatters(arcLabel: string) {
  return `This episode helps readers place the page-level text inside the broader ${arcLabel.toLowerCase()} movement of Panth Prakash.`
}

export function getPanthPrakashArc(episodeNumber: number) {
  return ARC_RULES.find(rule => episodeNumber <= rule.maxEpisode) ?? ARC_RULES[ARC_RULES.length - 1]
}

export function getPanthPrakashArcOptions() {
  return ARC_RULES.map(rule => ({ id: rule.id, label: rule.label }))
}

export function getPanthPrakashEpisodeEditorial(episode: LibraryEpisodeIndexEntry | { number: number; title: string; startPage: number; endPage: number } | null | undefined): PanthPrakashEpisodeEditorial | null {
  if (!episode) return null
  const episodeNumber = 'episodeNumber' in episode ? episode.episodeNumber : episode.number
  const arc = getPanthPrakashArc(episodeNumber)
  const sourceTitle = episode.title
  const displayTitle = EPISODE_TITLE_OVERRIDES[episodeNumber] ?? cleanGeneratedEpisodeTitle(sourceTitle, episodeNumber)
  const override = EPISODE_OVERRIDES[episodeNumber] ?? {}
  return {
    arc: arc.id,
    arcLabel: arc.label,
    summary: buildFallbackSummary(episodeNumber, displayTitle, arc.label),
    whyItMatters: buildFallbackWhyItMatters(arc.label),
    ...override,
    displayTitle,
  }
}

export function getPanthPrakashEpisodeDisplayTitle(episode: LibraryEpisodeIndexEntry | { number: number; title: string; startPage: number; endPage: number }) {
  const episodeNumber = 'episodeNumber' in episode ? episode.episodeNumber : episode.number
  return EPISODE_TITLE_OVERRIDES[episodeNumber] ?? cleanGeneratedEpisodeTitle(episode.title, episodeNumber)
}

export interface PanthPrakashEditionDebtReport {
  totalPages: number
  pagesMissingSourceMapping: number
  reviewStatusLabel: string
  secondaryStatusLabel?: string
  nextActions: string[]
}

export function buildPanthPrakashEditionDebtReport(pageIndex: LibraryPageIndexEntry[], searchIndex?: LibrarySearchIndex): PanthPrakashEditionDebtReport {
  const pagesMissingSourceMapping = searchIndex?.metadata?.panthPrakash?.pagesMissingSourceMapping
    ?? pageIndex.filter(page => !page.sourcePageNumber || page.sourcePageNumber <= 0).length
  const panthMetadata = searchIndex?.metadata?.panthPrakash

  if (panthMetadata) {
    return {
      totalPages: panthMetadata.totalPages,
      pagesMissingSourceMapping,
      reviewStatusLabel: `${panthMetadata.editorialReconstructionPages} editorial reconstruction pages with raw source retained`,
      secondaryStatusLabel: `${panthMetadata.sourceBackedPages} source-backed reading pages`,
      nextActions: [
        'Review reconstruction pages episode-by-episode against retained raw OCR/source scans',
        'Promote source-backed pages to reviewed only after human spot-checking',
        'Keep source-page chips and raw OCR available as the provenance layer behind the clean reader',
      ],
    }
  }

  return {
    totalPages: pageIndex.length,
    pagesMissingSourceMapping,
    reviewStatusLabel: `${pageIndex.length} machine-cleaned pages awaiting human review`,
    nextActions: [
      'Human-review machine-cleaned pages before using verified-edition language',
      'Convert retained asterisk and uncertainty markers into fuller source notes over time',
      'Spot-check scan-page mappings against the original PDFs during scholarly review',
    ],
  }
}

export type PanthPrakashTextState = LibraryPageTextState

export function getPanthPrakashTextState(page: LibraryPagePayload, blocks: LibraryTextBlock[]): PanthPrakashTextState {
  const joined = blocks.map(block => block.text).join(' ')
  const hasManualBlocks = blocks.some(block => block.id.startsWith('manual-'))
  if (/contents/i.test(page.title)) return 'contents-navigation'
  if (hasManualBlocks || /This page|The page|This opening contents page|This first contents page|This continuation page/i.test(joined)) return 'editorial-reconstruction'
  if (page.quality === 'clean') return 'cleaned-ocr'
  return 'source-translation'
}

export function getPanthPrakashTextStateLabel(state: PanthPrakashTextState) {
  return ({
    'source-translation': 'Source translation',
    'cleaned-ocr': 'Cleaned OCR',
    'editorial-reconstruction': 'Editorial reconstruction',
    'contents-navigation': 'Contents navigation',
  } as const)[state]
}

export interface PanthPrakashSourceApparatusEntry {
  id: string
  label: string
}

export function buildPanthPrakashSourceApparatus(blocks: LibraryTextBlock[]): PanthPrakashSourceApparatusEntry[] {
  const entries: PanthPrakashSourceApparatusEntry[] = []
  const meters = new Set<string>()
  const verseMarkers = new Set<string>()
  let hasAsterisk = false
  let hasQuestion = false

  for (const block of blocks) {
    const meter = block.text.match(/\b(Dohra|Chaupai)\b/i)?.[1]
    if (meter) meters.add(meter[0].toUpperCase() + meter.slice(1).toLowerCase())
    for (const marker of Array.from(block.text.matchAll(/\((\d+)\)/g))) {
      verseMarkers.add(marker[1])
    }
    if (block.text.includes('*')) hasAsterisk = true
    if (block.text.includes('?')) hasQuestion = true
  }

  for (const meter of Array.from(meters)) entries.push({ id: `meter-${meter.toLowerCase()}`, label: `Verse meter: ${meter}` })
  for (const marker of Array.from(verseMarkers)) entries.push({ id: `verse-${marker}`, label: `Verse marker: ${marker}` })
  if (hasAsterisk) entries.push({ id: 'asterisk', label: 'Asterisk marker retained from source/OCR apparatus' })
  if (hasQuestion) entries.push({ id: 'question', label: 'Question mark retained where the reading is uncertain' })
  return entries
}
