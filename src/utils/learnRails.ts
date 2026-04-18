import type { LearnContentKind, LearnTab, TopicScenarioKey } from '../types'

export interface LearnRailChip {
  id: string
  label: string
  targetId: string
}

export const LEARN_SURFACE_RAIL: Array<{ id: LearnTab; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'topics', label: 'Topics' },
  { id: 'shabads', label: 'Shabads' },
  { id: 'saved', label: 'Saved' },
]

export const LEARN_SUBSECTION_RAILS: Record<LearnTab, LearnRailChip[]> = {
  today: [
    { id: 'today-continue', label: 'Continue', targetId: 'learn-today-continue' },
    { id: 'today-surface', label: 'Today', targetId: 'learn-today-surface' },
    { id: 'today-fresh-guidance', label: 'Fresh', targetId: 'learn-today-fresh-guidance' },
    { id: 'today-doors', label: 'Doors', targetId: 'learn-today-doors' },
    { id: 'today-paths', label: 'Paths', targetId: 'learn-today-paths' },
  ],
  topics: [
    { id: 'topics-search', label: 'Search', targetId: 'learn-topics-search' },
    { id: 'topics-all-topics', label: 'All Topics', targetId: 'learn-topics-all' },
  ],
  shabads: [
    { id: 'shabads-filters', label: 'Filters', targetId: 'learn-shabads-filters' },
    { id: 'shabads-all', label: 'All Shabads', targetId: 'learn-shabads-all' },
  ],
  saved: [
    { id: 'saved-overview', label: 'Overview', targetId: 'learn-saved-overview' },
    { id: 'saved-items', label: 'Saved Items', targetId: 'learn-saved-items' },
  ],
}

export const LEARN_DETAIL_RAILS = {
  'today-guidance': [
    { id: 'today-guidance-excerpt', label: 'Excerpt', targetId: 'learn-detail-guidance-excerpt' },
    { id: 'today-guidance-shabad', label: 'Shabad', targetId: 'learn-detail-guidance-shabad' },
    { id: 'today-guidance-takeaway', label: 'Takeaway', targetId: 'learn-detail-guidance-takeaway' },
    { id: 'today-guidance-life', label: 'Life', targetId: 'learn-detail-guidance-life' },
  ],
  'today-topic': [
    { id: 'today-topic-insight', label: 'Insight', targetId: 'learn-detail-topic-insight' },
    { id: 'today-topic-excerpts', label: 'Excerpts', targetId: 'learn-detail-topic-excerpts' },
    { id: 'today-topic-reflection', label: 'Reflection', targetId: 'learn-detail-topic-reflection' },
    { id: 'today-topic-action', label: 'Action', targetId: 'learn-detail-topic-action' },
  ],
  'today-shabad': [
    { id: 'today-shabad-summary', label: 'Summary', targetId: 'learn-detail-shabad-summary' },
    { id: 'today-shabad-structure', label: 'Structure', targetId: 'learn-detail-shabad-structure' },
    { id: 'today-shabad-lines', label: 'Lines', targetId: 'learn-detail-shabad-lines' },
  ],
  'today-collection': [
    { id: 'today-collection-overview', label: 'Overview', targetId: 'learn-detail-collection-overview' },
    { id: 'today-collection-guidance', label: 'Guidance', targetId: 'learn-detail-collection-guidance' },
    { id: 'today-collection-topics', label: 'Topics', targetId: 'learn-detail-collection-topics' },
    { id: 'today-collection-shabads', label: 'Shabads', targetId: 'learn-detail-collection-shabads' },
  ],
  'topics-topic': [
    { id: 'topics-topic-scenarios', label: 'Scenarios', targetId: 'learn-detail-topic-scenarios' },
    { id: 'topics-topic-insight', label: 'Insight', targetId: 'learn-detail-topic-insight' },
    { id: 'topics-topic-excerpts', label: 'Excerpts', targetId: 'learn-detail-topic-excerpts' },
    { id: 'topics-topic-reflection', label: 'Reflection', targetId: 'learn-detail-topic-reflection' },
    { id: 'topics-topic-action', label: 'Action', targetId: 'learn-detail-topic-action' },
  ],
  'shabads-shabad': [
    { id: 'shabads-shabad-summary', label: 'Summary', targetId: 'learn-detail-shabad-summary' },
    { id: 'shabads-shabad-structure', label: 'Structure', targetId: 'learn-detail-shabad-structure' },
    { id: 'shabads-shabad-lines', label: 'Lines', targetId: 'learn-detail-shabad-lines' },
  ],
} as const satisfies Record<string, LearnRailChip[]>

export type LearnDetailRailKey = keyof typeof LEARN_DETAIL_RAILS

export function isLearnTab(value: string | null): value is LearnTab {
  return value === 'today' || value === 'topics' || value === 'shabads' || value === 'saved'
}

export function getLearnActiveTab(search: string): LearnTab {
  const params = new URLSearchParams(search)
  return isLearnTab(params.get('tab')) ? params.get('tab') as LearnTab : 'today'
}

export function getLearnDetailRailKey(tab: LearnTab, detail: string | null): LearnDetailRailKey | null {
  if (tab === 'today') {
    if (detail === 'guidance') return 'today-guidance'
    if (detail === 'topic') return 'today-topic'
    if (detail === 'shabad') return 'today-shabad'
    if (detail === 'collection') return 'today-collection'
    return null
  }

  if (tab === 'topics' && detail === 'topic') {
    return 'topics-topic'
  }

  if (tab === 'shabads' && detail === 'shabad') {
    return 'shabads-shabad'
  }

  return null
}

export function getLearnDetailRail(tab: LearnTab, detail: string | null): LearnRailChip[] {
  const key = getLearnDetailRailKey(tab, detail)
  return key ? LEARN_DETAIL_RAILS[key] : []
}

export function getLearnDetailRailByKey(key: LearnDetailRailKey | null): LearnRailChip[] {
  return key ? LEARN_DETAIL_RAILS[key] : []
}

export function getLearnRouteScrollTargetId({
  tab,
}: {
  tab: LearnTab
  detail?: string | null
  hasTopicParam?: boolean
  hasShabadParam?: boolean
  hasCollectionParam?: boolean
}): string | null {
  void tab
  return null
}

export function buildLearnTabPath(tab: LearnTab): string {
  return tab === 'today' ? '/learn' : `/learn?tab=${tab}`
}

export function buildLearnDetailPath(
  kind: LearnContentKind,
  id: string,
  from?: string,
  scenarioKey?: Exclude<TopicScenarioKey, 'overview'> | null
): string {
  const basePath =
    kind === 'topic-guide'
      ? `/learn/topics/${id}`
      : kind === 'shabad-deep-dive'
      ? `/learn/shabads/${id}`
      : kind === 'daily-guidance'
      ? `/learn/guidance/${id}`
      : `/learn/collections/${id}`

  const params = new URLSearchParams()
  if (from) {
    params.set('from', from)
  }
  if (kind === 'topic-guide' && scenarioKey) {
    params.set('scenario', scenarioKey)
  }

  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}
